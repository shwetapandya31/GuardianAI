import os
import time
import threading
from flask import Flask, Response
import cv2
from ultralytics import YOLO
import firebase_admin
from firebase_admin import credentials, firestore

app = Flask(__name__)

# Resolve model path relative to backend folder
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "weights.pt")

print(f"[INIT] Loading YOLO model from: {MODEL_PATH}")
model = YOLO(MODEL_PATH)

# Firebase Admin Initialization
db = None

try:
    if not firebase_admin._apps:
        key_path = os.path.join(BASE_DIR, "guardianai-key.json")
        if os.path.exists(key_path):
            cred = credentials.Certificate(key_path)
            firebase_admin.initialize_app(cred)
            print(f"[INIT] Connected Firebase Admin from {key_path}")
        else:
            print(f"[WARN] Firebase key file not found at {key_path}")
    db = firestore.client() if firebase_admin._apps else None
except Exception as err:
    print(f"[ERROR] Firebase Admin initialization failed: {err}")


def resolve_active_camera_doc():
    """
    Dynamically resolves the active camera document from the real Firestore 'cameras' collection.
    1. Inspects all camera documents for a streamUrl/stream_url matching local backend server markers
       ('8000', 'video_feed', '127.0.0.1', 'localhost').
    2. If no stream URL matches, selects the first enabled camera document in the collection.
    3. If no enabled camera exists, falls back to the first available camera document in 'cameras'.
    Returns (doc_id, camera_data_dict) tuple, or (None, None) if no camera document is found.
    """
    if not db:
        return None, None
    try:
        docs = list(db.collection("cameras").stream())
        if not docs:
            return None, None

        server_markers = ["8000", "video_feed", "127.0.0.1", "localhost"]

        # Strategy 1: Match camera document by stream URL
        for doc in docs:
            data = doc.to_dict() or {}
            stream_url = str(data.get("streamUrl") or data.get("stream_url") or "")
            if any(marker in stream_url for marker in server_markers):
                return doc.id, data

        # Strategy 2: Match any camera document where enabled is not False
        for doc in docs:
            data = doc.to_dict() or {}
            if data.get("enabled") is not False:
                return doc.id, data

        # Strategy 3: Select first available camera document
        first_doc = docs[0]
        return first_doc.id, (first_doc.to_dict() or {})

    except Exception as e:
        print(f"[WARN] Error resolving active camera document from Firestore: {e}")
        return None, None


# Background heartbeat thread updating camera document's lastSeen timestamp
def start_heartbeat():
    def heartbeat_loop():
        while True:
            try:
                if db:
                    doc_id, _ = resolve_active_camera_doc()
                    if doc_id:
                        doc_ref = db.collection("cameras").document(doc_id)
                        doc_ref.set({"lastSeen": firestore.SERVER_TIMESTAMP}, merge=True)
                    else:
                        print("[HEARTBEAT WARN] No active camera document resolved in Firestore 'cameras' collection.")
            except Exception as e:
                print(f"[HEARTBEAT WARN] {e}")
            time.sleep(7)

    t = threading.Thread(target=heartbeat_loop, daemon=True)
    t.start()


start_heartbeat()


# Helper to trigger Firestore alert document creation
def trigger_firestore_alert(cls_name: str, conf_val: float):
    if not db:
        print(f"[WARN] Cannot write alert for '{cls_name}' — Firebase not initialized.")
        return

    doc_id, camera_data = resolve_active_camera_doc()
    if not doc_id or not camera_data:
        print(f"[ALERT WARN] Cannot write alert for '{cls_name}' — No active camera document resolved in Firestore 'cameras' collection.")
        return

    try:
        # Extract camera details dynamically from actual Firestore camera document
        cam_id = camera_data.get("cameraId") or camera_data.get("camera_id") or doc_id
        lat = camera_data.get("latitude") if camera_data.get("latitude") is not None else camera_data.get("lat")
        lng = camera_data.get("longitude") if camera_data.get("longitude") is not None else camera_data.get("lng")

        readable_class = cls_name.replace("-", " ").capitalize()
        message = f"{readable_class} detected"

        alert_data = {
            "camera_id": cam_id,
            "cameraId": cam_id,
            "camera_doc_id": doc_id,
            "type": cls_name,
            "confidence": round(float(conf_val), 2),
            "timestamp": firestore.SERVER_TIMESTAMP,
            "status": "New",
            "message": message,
        }

        # Include location coordinates if real values exist in the camera document (no fake values!)
        if lat is not None:
            alert_data["lat"] = float(lat)
            alert_data["latitude"] = float(lat)
        if lng is not None:
            alert_data["lng"] = float(lng)
            alert_data["longitude"] = float(lng)

        db.collection("alerts").add(alert_data)
        print(f"[FIREBASE ALERT] Created alert document for '{cls_name}' with confidence {conf_val:.2f} (Camera: {cam_id}, Doc: {doc_id})")
    except Exception as e:
        print(f"[FIREBASE ALERT ERROR] Failed to create alert for '{cls_name}': {e}")


# Class-specific confidence thresholds to eliminate false positives
CLASS_THRESHOLDS = {
    "gun": 0.75,
    "knife": 0.75,
    "violence": 0.50,
    "suspicious": 0.50,
    "intrusion": 0.50,
    "snatcher": 0.50,
    "person": 0.40,
    "bike-scooter-car": 0.40,
    "normal": 0.50,
    "alert": 0.50,
}
DEFAULT_THRESHOLD = 0.50
REQUIRED_CONSECUTIVE_FRAMES = 3
ALERT_COOLDOWN_SECONDS = 20
NON_ALERT_CLASSES = {"normal"}

# DroidCam camera
cap = cv2.VideoCapture(1)

# Set resolution
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)


def generate_frames():
    consecutive_counts = {}
    last_alert_timestamps = {}

    while True:
        success, frame = cap.read()

        if not success:
            break

        # Run YOLO detection with base threshold (0.25) to evaluate custom thresholds
        results = model(frame, conf=0.25, verbose=False)
        result = results[0]

        filtered_indices = []
        detected_classes_this_frame = set()
        highest_conf_this_frame = {}

        if result.boxes is not None and len(result.boxes) > 0:
            for i, box in enumerate(result.boxes):
                cls_id = int(box.cls[0].item())
                cls_name = model.names.get(cls_id, "").lower().strip()
                conf = float(box.conf[0].item())

                threshold = CLASS_THRESHOLDS.get(cls_name, DEFAULT_THRESHOLD)

                if conf >= threshold:
                    filtered_indices.append(i)
                    detected_classes_this_frame.add(cls_name)
                    if cls_name not in highest_conf_this_frame or conf > highest_conf_this_frame[cls_name]:
                        highest_conf_this_frame[cls_name] = conf

        # Plot only bounding boxes that pass their class-specific threshold
        if len(filtered_indices) > 0:
            annotated_frame = result[filtered_indices].plot()
        else:
            annotated_frame = frame.copy()

        # Update consecutive frame counters & check for verified incidents
        now_time = time.time()
        for cls_name in detected_classes_this_frame:
            consecutive_counts[cls_name] = consecutive_counts.get(cls_name, 0) + 1

            # When verified (3 consecutive frames) and not normal, check cooldown & create alert
            if (
                consecutive_counts[cls_name] >= REQUIRED_CONSECUTIVE_FRAMES
                and cls_name not in NON_ALERT_CLASSES
            ):
                last_alert = last_alert_timestamps.get(cls_name, 0)
                if now_time - last_alert >= ALERT_COOLDOWN_SECONDS:
                    last_alert_timestamps[cls_name] = now_time
                    conf_val = highest_conf_this_frame.get(cls_name, 0.50)
                    trigger_firestore_alert(cls_name, conf_val)

        # Reset counts for classes not detected in this frame
        for cls_name in list(consecutive_counts.keys()):
            if cls_name not in detected_classes_this_frame:
                consecutive_counts[cls_name] = 0

        # Convert frame to JPEG
        success, buffer = cv2.imencode(".jpg", annotated_frame)

        if not success:
            continue

        frame_bytes = buffer.tobytes()

        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n"
            + frame_bytes
            + b"\r\n"
        )


@app.route("/")
def home():
    return "Guardian-AI Camera Server is running"


@app.route("/video_feed")
def video_feed():
    return Response(
        generate_frames(),
        mimetype="multipart/x-mixed-replace; boundary=frame"
    )


if __name__ == "__main__":
    print("[START] Guardian-AI Camera Server with AI Overlay")
    print("[INFO] Open http://127.0.0.1:8000/video_feed")
    app.run(host="0.0.0.0", port=8000, debug=False)