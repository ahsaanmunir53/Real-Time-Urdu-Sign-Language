"""Step 1 - extract MediaPipe Holistic keypoints from the video dataset.

Input : VIDEO_ROOT/<word>/<clip>.mp4   (one folder per sign)
Output: KP_ROOT/<word>/<clip>.npy      (one (30, 258) array per clip)

Each video becomes exactly one sequence; frames are never mixed between clips.
Already-extracted clips are skipped, so the script can be re-run safely.

    python training/extract_keypoints.py --videos data/videos --out data/keypoints
"""
import argparse
import os

import mediapipe as mp
import numpy as np
from tqdm import tqdm

from features import VIDEO_EXTS, extract_video


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--videos", required=True, help="folder with one sub-folder per sign")
    ap.add_argument("--out", required=True, help="where the .npy keypoint files are written")
    args = ap.parse_args()

    words = sorted(d for d in os.listdir(args.videos) if os.path.isdir(os.path.join(args.videos, d)))
    done = skipped = failed = 0
    with mp.solutions.holistic.Holistic(static_image_mode=False,
                                        min_detection_confidence=0.5,
                                        min_tracking_confidence=0.5) as holistic:
        for w in tqdm(words, desc="signs"):
            src = os.path.join(args.videos, w)
            dst = os.path.join(args.out, w)
            os.makedirs(dst, exist_ok=True)
            for v in sorted(os.listdir(src)):
                if not v.lower().endswith(VIDEO_EXTS):
                    continue
                out_path = os.path.join(dst, os.path.splitext(v)[0] + ".npy")
                if os.path.exists(out_path):
                    skipped += 1
                    continue
                try:
                    seq = extract_video(os.path.join(src, v), holistic)
                    if seq is None:
                        failed += 1
                        continue
                    np.save(out_path, seq)
                    done += 1
                except Exception as e:  # keep going on a single bad file
                    failed += 1
                    print(f"  failed {w}/{v}: {e}")
    print(f"extracted {done} | already done {skipped} | failed {failed}")


if __name__ == "__main__":
    main()
