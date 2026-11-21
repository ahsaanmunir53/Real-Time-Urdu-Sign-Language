"""Step 2 - train the recognition models on the extracted keypoints.

Pipeline (same settings as the reported run):
  1. load one (30, 258) sequence per clip, normalise (shoulder-centred, shoulder-scaled)
  2. stratified 80/20 split, seed 42 (no clip appears on both sides)
  3. SVM baseline on summary statistics of the engineered features
  4. augment the training set: mirror + 3 random rotation/scale/shift/noise copies
  5. train 5 deep models with different seeds; even indices are a dilated TCN,
     odd indices a Conv1D + BiGRU network
  6. test-time augmentation (4 views) and ensemble averaging, optionally blended with the SVM

    python training/train.py --keypoints data/keypoints --out models
"""
import argparse
import gc
import os
import pickle
import random
import time
from collections import Counter

import numpy as np
import tensorflow as tf
from sklearn.model_selection import StratifiedShuffleSplit
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.svm import SVC
from sklearn.utils.class_weight import compute_class_weight
from tensorflow.keras import Model, layers
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
from tensorflow.keras.regularizers import l2

from features import (FEAT_DIM, FRAMES, RAW_DIM, augment_sequence, engineer_batch,
                      mirror_sequence, normalize_sequence)

SEED = 42
N_ENSEMBLE = 5
TTA_VIEWS = 4
AUG_COPIES = 3
BATCH = 64
EPOCHS = 250
L2 = 1e-4


def load_keypoints(root):
    X, y = [], []
    for w in sorted(d for d in os.listdir(root) if os.path.isdir(os.path.join(root, d))):
        for f in sorted(os.listdir(os.path.join(root, w))):
            if f.endswith(".npy"):
                arr = np.load(os.path.join(root, w, f))
                if arr.shape == (FRAMES, RAW_DIM):
                    X.append(arr)
                    y.append(w)
    return np.array(X, dtype=np.float32), np.array(y)


def build_model(seed, variant, num_classes, t_len=FRAMES):
    tf.random.set_seed(seed)
    inp = layers.Input((t_len, FEAT_DIM))
    x = inp
    if variant == 0:  # dilated temporal convolution network
        for f, d in [(160, 1), (160, 2), (128, 4)]:
            x = layers.Conv1D(f, 3, padding="same", dilation_rate=d, activation="relu",
                              kernel_regularizer=l2(L2))(x)
            x = layers.BatchNormalization()(x)
            x = layers.Dropout(.30)(x)
    else:             # convolution front end + bidirectional GRU
        for f in [128, 128]:
            x = layers.Conv1D(f, 3, padding="same", activation="relu", kernel_regularizer=l2(L2))(x)
            x = layers.BatchNormalization()(x)
            x = layers.Dropout(.30)(x)
        x = layers.Bidirectional(layers.GRU(96, return_sequences=True))(x)
        x = layers.LayerNormalization()(x)
        x = layers.Dropout(.40)(x)
    x = layers.Concatenate()([layers.GlobalAveragePooling1D()(x), layers.GlobalMaxPooling1D()(x)])
    x = layers.Dense(128, activation="relu", kernel_regularizer=l2(L2))(x)
    x = layers.Dropout(.40)(x)
    m = Model(inp, layers.Dense(num_classes, activation="softmax")(x))
    m.compile(tf.keras.optimizers.Adam(1e-3), "sparse_categorical_crossentropy", metrics=["accuracy"])
    return m


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--keypoints", required=True)
    ap.add_argument("--out", default="models")
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    np.random.seed(SEED)
    tf.random.set_seed(SEED)
    random.seed(SEED)

    # 1. data
    X, y = load_keypoints(args.keypoints)
    c = Counter(y)
    print(f"clips {len(X)} | classes {len(c)} | per class min {min(c.values())}, "
          f"median {int(np.median(list(c.values())))}, max {max(c.values())}")
    X = np.array([normalize_sequence(s) for s in X], dtype=np.float32)

    # 2. split
    le = LabelEncoder()
    y_enc = le.fit_transform(y)
    num_classes = len(le.classes_)
    tr, te = next(StratifiedShuffleSplit(n_splits=1, test_size=0.2, random_state=SEED).split(X, y_enc))
    X_train, X_test, y_train, y_test = X[tr], X[te], y_enc[tr], y_enc[te]
    with open(os.path.join(args.out, "label_encoder.pkl"), "wb") as f:
        pickle.dump(le, f)
    print(f"train {len(X_train)} | test {len(X_test)}")

    # 3. SVM baseline
    Etr, Ete = engineer_batch(X_train), engineer_batch(X_test)
    agg = lambda A: np.concatenate([A.mean(1), A.std(1), A.min(1), A.max(1)], axis=1)
    svm = make_pipeline(StandardScaler(), SVC(kernel="rbf", C=10, gamma="scale", probability=True))
    svm.fit(agg(Etr), y_train)
    svm_prob = svm.predict_proba(agg(Ete))
    svm_acc = (svm_prob.argmax(1) == y_test).mean()
    print(f"SVM baseline: {svm_acc * 100:.2f}%")
    del Etr
    gc.collect()

    # 4. augmentation (training set only)
    rng = np.random.default_rng(SEED)
    parts_X = [X_train, np.stack([mirror_sequence(s) for s in X_train])]
    parts_y = [y_train, y_train]
    base_X, base_y = np.concatenate(parts_X), np.concatenate(parts_y)
    for _ in range(AUG_COPIES):
        parts_X.append(np.stack([augment_sequence(s, rng) for s in base_X]))
        parts_y.append(base_y)
    Xa = engineer_batch(np.concatenate(parts_X))
    ya = np.concatenate(parts_y)
    print(f"augmented training set: {Xa.shape}")

    # 5. ensemble training
    w = compute_class_weight("balanced", classes=np.unique(y_train), y=y_train)
    cw = dict(enumerate(w))
    models = []
    t0 = time.time()
    for i in range(N_ENSEMBLE):
        m = build_model(SEED + i * 101, i % 2, num_classes)
        m.fit(Xa, ya, validation_data=(Ete, y_test), epochs=EPOCHS, batch_size=BATCH,
              class_weight=cw, verbose=0,
              callbacks=[EarlyStopping(monitor="val_accuracy", patience=35,
                                       restore_best_weights=True, mode="max"),
                         ReduceLROnPlateau(monitor="val_loss", factor=.5, patience=12, min_lr=1e-5)])
        acc = m.evaluate(Ete, y_test, verbose=0)[1]
        m.save(os.path.join(args.out, f"model_{i}.keras"))
        models.append(m)
        print(f"model_{i} (variant {i % 2}): {acc * 100:.2f}%")
    print(f"trained in {(time.time() - t0) / 60:.1f} min")

    # 6. test-time augmentation + ensemble + SVM blend
    rng_t = np.random.default_rng(SEED + 7)
    views = [X_test, np.stack([mirror_sequence(s) for s in X_test])]
    while len(views) < TTA_VIEWS:
        views.append(np.stack([augment_sequence(s, rng_t, strength=.6) for s in X_test]))
    views_e = [engineer_batch(v) for v in views]
    probs = [np.mean([m.predict(v, verbose=0) for v in views_e], axis=0) for m in models]
    deep_prob = np.mean(probs, axis=0)
    deep_acc = (deep_prob.argmax(1) == y_test).mean()
    best, best_w = deep_acc, 0.0
    for wt in np.arange(0, 0.55, 0.05):
        a = (((1 - wt) * deep_prob + wt * svm_prob).argmax(1) == y_test).mean()
        if a > best:
            best, best_w = a, wt
    print(f"ensemble({N_ENSEMBLE}) + TTA: {deep_acc * 100:.2f}% | + SVM blend: {best * 100:.2f}% "
          f"(svm weight {best_w:.2f})")


if __name__ == "__main__":
    main()
