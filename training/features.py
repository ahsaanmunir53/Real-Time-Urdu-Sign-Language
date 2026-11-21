"""Keypoint extraction, normalisation, feature engineering and augmentation.

Every function here is shared by training (train.py), evaluation (evaluate.py)
and the inference API (ml_model/sign_model_api.py). Changing one of them means
the saved models no longer match, so keep them in sync.

Per-frame layout of the raw MediaPipe Holistic vector (258 values):
    pose        33 landmarks x (x, y, z, visibility) = 132   -> [0:132]
    left hand   21 landmarks x (x, y, z)             =  63   -> [132:195]
    right hand  21 landmarks x (x, y, z)             =  63   -> [195:258]
Missing parts (hand out of frame, etc.) are filled with zeros.
"""
import numpy as np

FRAMES = 30                 # frames sampled per clip
RAW_DIM = 258
POSE_KEEP = list(range(25))  # upper-body pose landmarks (legs and feet dropped)
COORDS = 2                   # keep x, y; z from a single RGB camera is unreliable
N_STATIC = len(POSE_KEEP) * COORDS + 21 * COORDS + 21 * COORDS   # 134
FEAT_DIM = N_STATIC * 2 + 3                                       # 271

VIDEO_EXTS = (".mp4", ".mov", ".avi", ".mkv", ".m4v", ".webm")

# left/right pose landmark pairs, swapped when a clip is mirrored
POSE_SWAP = [(1, 4), (2, 5), (3, 6), (7, 8), (9, 10), (11, 12), (13, 14), (15, 16),
             (17, 18), (19, 20), (21, 22), (23, 24), (25, 26), (27, 28), (29, 30), (31, 32)]


# ---------------------------------------------------------------- extraction
def landmarks_to_vec(res):
    """One MediaPipe Holistic result -> 258-value vector."""
    if res.pose_landmarks:
        pose = np.array([[l.x, l.y, l.z, l.visibility] for l in res.pose_landmarks.landmark]).flatten()
    else:
        pose = np.zeros(33 * 4)
    lh = (np.array([[l.x, l.y, l.z] for l in res.left_hand_landmarks.landmark]).flatten()
          if res.left_hand_landmarks else np.zeros(21 * 3))
    rh = (np.array([[l.x, l.y, l.z] for l in res.right_hand_landmarks.landmark]).flatten()
          if res.right_hand_landmarks else np.zeros(21 * 3))
    return np.concatenate([pose, lh, rh]).astype(np.float32)


def extract_video(path, holistic, n_frames=FRAMES):
    """Video file -> (n_frames, 258). Frames are sampled evenly across this one clip."""
    import cv2
    cap = cv2.VideoCapture(path)
    frames = []
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        frames.append(frame)
    cap.release()
    if not frames:
        return None
    idx = np.linspace(0, len(frames) - 1, n_frames).round().astype(int)
    out = np.zeros((n_frames, RAW_DIM), dtype=np.float32)
    for i, fi in enumerate(idx):
        rgb = cv2.cvtColor(frames[fi], cv2.COLOR_BGR2RGB)
        out[i] = landmarks_to_vec(holistic.process(rgb))
    return out


# ------------------------------------------------------------- normalisation
def normalize_sequence(seq):
    """Centre every frame on the mid-shoulder point and scale by shoulder width."""
    out = seq.copy()
    for t in range(out.shape[0]):
        fr = out[t]
        if not np.any(fr):
            continue
        pose = fr[:132].reshape(33, 4)
        lh = fr[132:195].reshape(21, 3)
        rh = fr[195:258].reshape(21, 3)
        if np.any(pose[:, :3]):
            center = (pose[11, :3] + pose[12, :3]) / 2.0
            scale = np.linalg.norm(pose[11, :3] - pose[12, :3]) or 1.0
            pose[:, :3] = (pose[:, :3] - center) / scale
            if np.any(lh):
                lh[:] = (lh - center) / scale
            if np.any(rh):
                rh[:] = (rh - center) / scale
        out[t] = np.concatenate([pose.flatten(), lh.flatten(), rh.flatten()])
    return np.nan_to_num(out)


# ------------------------------------------------------- feature engineering
def engineer(seq):
    """(T, 258) normalised -> (T, 271): positions + frame-to-frame velocity + 3 distances.

    The distances are left wrist to right wrist, left wrist to nose, right wrist to nose.
    """
    T = seq.shape[0]
    pose = seq[:, :132].reshape(T, 33, 4)[:, POSE_KEEP, :COORDS]
    lh = seq[:, 132:195].reshape(T, 21, 3)[:, :, :COORDS]
    rh = seq[:, 195:258].reshape(T, 21, 3)[:, :, :COORDS]
    static = np.concatenate([pose.reshape(T, -1), lh.reshape(T, -1), rh.reshape(T, -1)], axis=1)
    vel = np.empty_like(static)
    vel[0] = 0
    vel[1:] = static[1:] - static[:-1]
    lw, rw, nose = lh[:, 0, :], rh[:, 0, :], seq[:, :COORDS]
    dist = np.stack([np.linalg.norm(lw - rw, axis=1),
                     np.linalg.norm(lw - nose, axis=1),
                     np.linalg.norm(rw - nose, axis=1)], axis=1)
    return np.concatenate([static, vel, dist], axis=1).astype(np.float32)


def engineer_batch(A):
    out = np.empty((len(A), A.shape[1], FEAT_DIM), dtype=np.float32)
    for i in range(len(A)):
        out[i] = engineer(A[i])
    return out


# --------------------------------------------------------------- augmentation
def mirror_sequence(seq):
    """Horizontal flip: negate x and swap left/right body parts and hands."""
    T = seq.shape[0]
    p = seq[:, :132].reshape(T, 33, 4).copy()
    l = seq[:, 132:195].reshape(T, 21, 3).copy()
    r = seq[:, 195:258].reshape(T, 21, 3).copy()
    p[..., 0] *= -1
    l[..., 0] *= -1
    r[..., 0] *= -1
    for a, b in POSE_SWAP:
        p[:, [a, b]] = p[:, [b, a]]
    return np.concatenate([p.reshape(T, 132), r.reshape(T, 63), l.reshape(T, 63)], axis=1).astype(np.float32)


def augment_sequence(seq, rng, strength=1.0):
    """Small random rotation, scaling, shift and Gaussian noise (missing points stay zero)."""
    T = seq.shape[0]
    p = seq[:, :132].reshape(T, 33, 4).copy()
    l = seq[:, 132:195].reshape(T, 21, 3).copy()
    r = seq[:, 195:258].reshape(T, 21, 3).copy()
    ang = rng.uniform(-.15, .15) * strength
    ca, sa = np.cos(ang), np.sin(ang)
    sc = 1 + rng.uniform(-.08, .08) * strength
    jx, jy = rng.uniform(-.03, .03, 2) * strength

    def xf(a):
        x, y = a[..., 0], a[..., 1]
        nz = (x != 0) | (y != 0)
        a[..., 0] = np.where(nz, (ca * x - sa * y) * sc + jx, 0.0)
        a[..., 1] = np.where(nz, (sa * x + ca * y) * sc + jy, 0.0)

    xf(p)
    xf(l)
    xf(r)
    s = np.concatenate([p.reshape(T, 132), l.reshape(T, 63), r.reshape(T, 63)], axis=1)
    noise = rng.normal(0, .008 * strength, s.shape).astype(np.float32) * (s != 0)
    return (s + noise).astype(np.float32)
