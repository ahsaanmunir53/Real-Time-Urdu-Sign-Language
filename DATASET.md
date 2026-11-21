# Self-curated Urdu Sign Language (USL) dataset

Public Urdu Sign Language data for isolated words is very limited, so we recorded our own
dataset for this study. This repository contains a **sample of 20 clips** (one clip each
from 20 different signs) so that reviewers can see the format and quality of the data.
**The complete dataset will be made available on acceptance of the paper.**

## Overview

| Item | Value |
|---|---|
| Type | Isolated-word sign videos (RGB), self-recorded |
| Language | Urdu Sign Language (Pakistan) |
| Classes | 33 Urdu words (list below) |
| Clips | 1,795 in total (median 58 clips per class) |
| Signers | 15–20 volunteers |
| Format | One video per clip, one folder per word |
| Consent | All signers gave permission for their recordings to be used and shared for research |

## How the data was collected

1. **Vocabulary.** We chose 33 commonly used Urdu words: descriptive words (e.g. *achha*
   "good", *khatarnak* "dangerous") and the responses *haan* "yes" and *nahin* "no".
   The list includes groups of words with related meanings, such as speed
   (*tez*, *jaldi*, *der se*) and cleverness (*zaheen*, *smart*, *hoshiyar*). These groups
   are deliberately hard to tell apart.
2. **Recording.** Volunteer signers performed each word in front of a standard RGB camera.
   Each clip contains exactly one sign.
3. **Organisation.** Clips are stored as `Videos/<word>/<clip>.mp4`, and each clip is renamed
   to `<word>_NN.mp4`.
4. **Keypoint extraction** (`training/extract_keypoints.py`).
   - Each clip is processed with MediaPipe Holistic.
   - 30 frames are sampled evenly across the clip.
   - Each frame gives 258 values: 33 pose landmarks × (x, y, z, visibility), plus 21 landmarks per hand × (x, y, z).
   - Each video produces exactly one sequence, and frames are never mixed between clips.
5. **Pre-processing** (`training/features.py`).
   - Landmarks are centred on the mid-shoulder point and scaled by shoulder width.
   - The legs and the z coordinate are dropped.
   - Frame-to-frame velocity is added, together with three distances: wrist to wrist, and each wrist to the nose.
   - The result is 271 features per frame.
6. **Split.** A stratified 80/20 split with seed 42 gives 1,436 training clips and 359 test clips.
   No clip appears in both sets. Augmentation (mirroring, small rotation, scale, shift and noise)
   is applied only to the training set.

## Sample in this repository (`dataset_sample/`)

```
dataset_sample/
├── metadata.csv         one row per sample: label (Urdu, Roman, English), files, notes
├── videos/              S01_acha.mp4 ... S20_ghair_mulki.mp4   (original RGB clips)
└── keypoints/           S01_acha.csv ... S20_ghair_mulki.csv   (30 rows x 258 columns)
```

Each keypoint CSV has one row per sampled frame. Its columns are named after the landmarks:
`pose_0_x, pose_0_y, pose_0_z, pose_0_v, …, lh_20_z, rh_0_x, …, rh_20_z`. A hand that is not
visible in a frame is stored as zeros.

| ID | Urdu | Roman | English | Why it is included |
|---|---|---|---|---|
| S01 | اچھا | acha | good | common everyday word |
| S02 | ہاں | haan | yes | yes / no pair |
| S03 | نہیں | nahin | no | yes / no pair |
| S04 | خطرناک | khatarnak | dangerous | opposite of *mehfooz* |
| S05 | محفوظ | mehfooz | safe | opposite of *khatarnak* |
| S06 | خبردار | khabardar | beware | warning sign |
| S07 | تیز | tez | fast | speed group (often confused) |
| S08 | جلدی | jaldi | quickly | speed group (often confused) |
| S09 | دیر سے | der se | late | speed group, two-word sign |
| S10 | ذہین | zaheen | intelligent | cleverness group (often confused) |
| S11 | سمارٹ | smart | smart | cleverness group (often confused) |
| S12 | ہوشیار | hoshiyar | clever | cleverness group (often confused) |
| S13 | بھاری | bhari | heavy | descriptive word |
| S14 | سستا | sasta | cheap | descriptive word |
| S15 | نیا | naya | new | descriptive word |
| S16 | دور | door | far | descriptive word |
| S17 | صحت مند | sehatmand | healthy | two-word sign |
| S18 | پرامن | pur-aman | peaceful | descriptive word |
| S19 | لاجواب | lajawab | excellent | descriptive word |
| S20 | غیر ملکی | ghair mulki | foreign | two-word sign |

## All 33 classes

انتہائی (extreme) · اچھا (good) · اہم (important) · بھاری (heavy) · تیار (ready) ·
تیز (fast) · جلدی (quickly) · خبردار (beware) · خطرناک (dangerous) · خوفناک (frightening) ·
دلچسپ (interesting) · دور (far) · دیر سے (late) · ذہین (intelligent) · سستا (cheap) ·
سمارٹ (smart) · شور (noise) · صحت مند (healthy) · غیر ملکی (foreign) · لاجواب (excellent) ·
محتاط (careful) · محفوظ (safe) · مضحکہ خیز (funny) · مہذب (polite) · نہیں (no) · نیا (new) ·
پاگل (crazy) · پرامن (peaceful) · پرجوش (excited) · کم (less) · گونگا (mute) · ہاں (yes) ·
ہوشیار (clever)

## Access to the full dataset

The full dataset (all 1,795 videos and extracted keypoints) will be published with a DOI
on acceptance of the paper. Until then it is available to the editor and reviewers on request.

## License

The sample data is released under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Please cite the paper if you use it.
