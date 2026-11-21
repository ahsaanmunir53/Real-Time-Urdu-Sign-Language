# Real-Time Urdu Sign Language Recognition

Recognition of isolated Urdu Sign Language (USL) words from an ordinary camera, using
MediaPipe Holistic skeletal keypoints and temporal deep networks. The repository also
includes a web application with real-time camera recognition (sign → text) and a
3D-avatar dictionary (text → sign).

## Description

Urdu Sign Language is the main sign language of Pakistan's deaf community, but it has
very few annotated datasets or working tools. This project:

- records a **self-curated USL dataset**: 33 words, 1,795 video clips, 13 signers ([DATASET.md](DATASET.md));
- turns every clip into a sequence of **MediaPipe Holistic keypoints** (30 frames × 258 values);
- engineers a **271-dimensional per-frame representation**: normalised positions, velocities and hand–face distances;
- trains **temporal convolution / BiGRU networks**.

The best single model (`models/model_3.keras`) reaches **89.42% top-1 accuracy** and
**88.35% macro F1** on 359 held-out test clips. A five-model ensemble with test-time
augmentation reaches 88.86%.

## Dataset information

- 33 isolated Urdu words, 1,795 clips (median 58 per word), recorded by 13 volunteer signers.
- This repository contains a **sample of 15 clips** (15 different words) in
  [`dataset_sample/`](dataset_sample). Each clip comes as a video, a keypoint CSV and a
  metadata row with the Urdu label, a Roman transliteration and the English meaning.
- **The complete dataset will be made available on acceptance of the paper.**
- Collection protocol, file format and the full class list are in [DATASET.md](DATASET.md).

## Code information

```
training/
  features.py           keypoint extraction, normalisation, 271-feature engineering, augmentation
  extract_keypoints.py  step 1: videos -> one (30, 258) keypoint sequence per clip
  train.py              step 2: split, SVM baseline, augmentation, 5-model ensemble, TTA
  evaluate.py           step 3: accuracy, macro F1, classification report, confusion matrix
  requirements.txt
models/
  model_3.keras         best model (Conv1D + BiGRU), input (30, 271), 33 classes
  label_encoder.pkl     class index -> Urdu word
ml_model/               Flask inference API used by the web app (same feature pipeline)
ml_api_lite/            TensorFlow Lite version of the API for low-memory hosting
backend/                Node.js / Express API
frontend/               React web app (camera recognition, 3D avatar dictionary)
dataset_sample/         15 sample clips (videos, keypoint CSVs, metadata.csv)
docs/                   deployment and local setup notes for the web app
```

## Requirements

- Python 3.10–3.12. TensorFlow 2.19 has no Python 3.13 build.
- `tensorflow==2.19.0`, `mediapipe==0.10.14`, `protobuf==4.25.3`, `opencv-python-headless`,
  `numpy`, `scikit-learn`, `tqdm`, `matplotlib` (see `training/requirements.txt`).
- MediaPipe 0.10.14 needs `protobuf<5`, and TensorFlow 2.19 accepts 4.25.x. Keep these versions pinned.
- A GPU is recommended for training (we used a Google Colab T4). Evaluation runs on a CPU.
- The web app also needs Node.js 18+.

## Usage instructions

```bash
git clone https://github.com/ahsaanmunir53/Real-Time-Urdu-Sign-Language.git
cd Real-Time-Urdu-Sign-Language
python -m venv venv && source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r training/requirements.txt
```

Arrange the videos as `data/videos/<word>/<clip>.mp4`, with one folder per word, and run:

```bash
cd training
python extract_keypoints.py --videos ../data/videos --out ../data/keypoints
python train.py    --keypoints ../data/keypoints --out ../models
python evaluate.py --keypoints ../data/keypoints --model ../models/model_3.keras \
                   --encoder ../models/label_encoder.pkl --out ../results
```

Load the trained model directly:

```python
import pickle, numpy as np, tensorflow as tf
from training.features import normalize_sequence, engineer

model = tf.keras.models.load_model("models/model_3.keras")
le = pickle.load(open("models/label_encoder.pkl", "rb"))
seq = np.loadtxt("dataset_sample/keypoints/S01_acha.csv", delimiter=",", skiprows=1)  # (30, 258)
probs = model.predict(engineer(normalize_sequence(seq.astype("float32")))[None], verbose=0)[0]
print(le.classes_[probs.argmax()], probs.max())
```

To run the web app (camera recognition and avatar dictionary), see
[docs/LOCAL_SETUP.txt](docs/LOCAL_SETUP.txt).

## Methodology

1. **Keypoints.** MediaPipe Holistic runs on 30 frames sampled evenly from each clip. Each frame gives 258 values: pose 33×4, plus 21×3 for each hand. Missing parts are stored as zeros.
2. **Normalisation.** Landmarks are centred on the mid-shoulder point and divided by shoulder width, which removes the effect of signer position and camera distance.
3. **Feature engineering.**
   - Leg landmarks and the unreliable z coordinate are dropped, leaving 134 position values.
   - The frame-to-frame velocity of each value is added (134 more).
   - Three distances are added: left wrist to right wrist, and each wrist to the nose.
   - The result is 271 features per frame.
4. **Split.** Stratified 80/20 with seed 42: 1,436 training clips and 359 test clips, with no clip in both sets.
5. **Augmentation (training only).**
   - Horizontal mirroring, which also swaps the left and right body parts.
   - Three random copies with rotation (±0.15 rad), scaling (±8%), shift (±0.03) and Gaussian noise (σ = 0.008).
6. **Models.**
   - Five networks are trained with different seeds:
     - a dilated temporal convolution network (dilations 1, 2, 4);
     - a Conv1D front end followed by a bidirectional GRU (96 units).
   - Both use global average and max pooling, then a dense layer of 128 units with dropout.
   - Training uses Adam (learning rate 1e-3), class-balanced weights, early stopping on validation accuracy and learning-rate reduction on plateau.
7. **Inference.** A single model, or an ensemble averaged over four test-time views (original, mirrored and two lightly augmented), optionally blended with an RBF-SVM on summary statistics.

| Setting | Top-1 accuracy |
|---|---|
| Best single model (`model_3`, Conv1D + BiGRU) | **89.42%** (macro F1 88.35%) |
| Five-model ensemble + TTA + SVM blend | 88.86% |

Most of the remaining errors fall between words with related meanings: *zaheen / smart / hoshiyar*
and *tez / jaldi / der se*. The test split is clip-level, not signer-independent. We plan a
signer-independent evaluation as future work.

## Citation

If you use this code or dataset, please cite our paper. The full reference will be added
here once the paper is published.

## License and contribution

- Code: [MIT License](LICENSE).
- Dataset sample: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- Issues and pull requests are welcome. Please describe the change and include the steps you used to test it.
