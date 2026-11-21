"""Step 3 - evaluate a trained model on the held-out test split (no retraining).

Rebuilds the exact test split used in training (stratified 80/20, seed 42) and writes
a classification report, a confusion matrix and per-class accuracy.

    python training/evaluate.py --keypoints data/keypoints --model models/model_3.keras \
        --encoder models/label_encoder.pkl --out results
"""
import argparse
import os
import pickle

import numpy as np
import tensorflow as tf
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.model_selection import StratifiedShuffleSplit

from features import engineer_batch, normalize_sequence
from train import SEED, load_keypoints


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--keypoints", required=True)
    ap.add_argument("--model", default="models/model_3.keras")
    ap.add_argument("--encoder", default="models/label_encoder.pkl")
    ap.add_argument("--out", default="results")
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)

    X, y = load_keypoints(args.keypoints)
    X = np.array([normalize_sequence(s) for s in X], dtype=np.float32)
    with open(args.encoder, "rb") as f:
        le = pickle.load(f)
    y_enc = le.transform(y)
    _, te = next(StratifiedShuffleSplit(n_splits=1, test_size=0.2, random_state=SEED).split(X, y_enc))

    model = tf.keras.models.load_model(args.model)
    pred = model.predict(engineer_batch(X[te]), verbose=0).argmax(1)
    y_test = y_enc[te]

    acc = accuracy_score(y_test, pred)
    f1 = f1_score(y_test, pred, average="macro")
    report = classification_report(y_test, pred, target_names=le.classes_, digits=4, zero_division=0)
    print(f"test clips {len(te)} | top-1 accuracy {acc * 100:.2f}% | macro F1 {f1 * 100:.2f}%")
    with open(os.path.join(args.out, "classification_report.txt"), "w", encoding="utf-8") as f:
        f.write(f"top-1 accuracy {acc:.4f}\nmacro F1 {f1:.4f}\n\n{report}")
    cm = confusion_matrix(y_test, pred)
    np.savetxt(os.path.join(args.out, "confusion_matrix.csv"), cm, fmt="%d", delimiter=",")

    try:
        import matplotlib.pyplot as plt
        fig, ax = plt.subplots(figsize=(12, 10))
        ax.imshow(cm, cmap="Blues")
        ax.set_xlabel("predicted class index")
        ax.set_ylabel("true class index")
        ax.set_title(f"Confusion matrix ({len(le.classes_)} classes)")
        fig.tight_layout()
        fig.savefig(os.path.join(args.out, "confusion_matrix.png"), dpi=200)
    except ImportError:
        pass
    print(f"saved to {args.out}/")


if __name__ == "__main__":
    main()
