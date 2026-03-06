import cv2
import numpy as np
import mediapipe as mp

mp_holistic = mp.solutions.holistic
mp_drawing = mp.solutions.drawing_utils

def extract_keypoints(results):
    pose = np.zeros(132)
    left_hand = np.zeros(63)
    right_hand = np.zeros(63)

    if results.pose_landmarks:
        pose_landmarks = results.pose_landmarks.landmark
        pose = np.array([[lm.x, lm.y, lm.z, lm.visibility] for lm in pose_landmarks]).flatten()
    if results.left_hand_landmarks:
        left_hand = np.array([[lm.x, lm.y, lm.z] for lm in results.left_hand_landmarks.landmark]).flatten()
    if results.right_hand_landmarks:
        right_hand = np.array([[lm.x, lm.y, lm.z] for lm in results.right_hand_landmarks.landmark]).flatten()

    return np.concatenate([pose, left_hand, right_hand])

def extract_keypoints_from_video(video_path, num_frames=30):
    print("🔍 Attempting to open video:", video_path)
    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        print("❌ Failed to open video.")
        return None

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    print("🎞️ Total frames in video:", total_frames)

    if total_frames < num_frames:
        print(f"⚠️ Not enough frames ({total_frames}) to extract {num_frames} keypoints.")
        cap.release()
        return None

    # Uniformly select frame indices
    frame_indices = np.linspace(0, total_frames - 1, num=num_frames, dtype=int)
    frame_id = 0
    keypoints_sequence = []

    with mp_holistic.Holistic(static_image_mode=False,
                              model_complexity=1,
                              enable_segmentation=False,
                              refine_face_landmarks=False) as holistic:
        for i in range(total_frames):
            ret, frame = cap.read()
            if not ret:
                print(f"⚠️ Failed to read frame {i}.")
                continue

            if i in frame_indices:
                image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = holistic.process(image)
                keypoints = extract_keypoints(results)

                if keypoints.shape != (258,):
                    print(f"❌ Invalid keypoint shape at frame {i}: {keypoints.shape}")
                    cap.release()
                    return None

                keypoints_sequence.append(keypoints)
                frame_id += 1

            if frame_id == num_frames:
                break

    cap.release()

    if len(keypoints_sequence) != num_frames:
        print(f"❌ Only {len(keypoints_sequence)} valid keypoint frames extracted. Expected {num_frames}.")
        return None

    print("✅ Successfully extracted keypoints for 30 frames.")
    return np.array(keypoints_sequence)
