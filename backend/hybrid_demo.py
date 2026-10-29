import cv2
import requests
import time
from ultralytics import YOLO
import firebase_admin
from firebase_admin import credentials, firestore

# ========== 1. PUT YOUR KEYS HERE ==========
ROBOFLOW_API_KEY = " yTpay5EcTZnc9SzA8zVT"
ROBOFLOW_URL = "https://detect.roboflow.com/violence-detection-nbx24/1"
FIREBASE_KEY_FILE = "guardianai-key.json" # path to your firebase json
# ===========================================

# ========== 2. INIT EVERYTHING ==========
print("[INIT] Loading Local Model...")
model = YOLO("best.pt") # your trained sit/stand/fall model

print("[INIT] Connecting Firebase...")
FIREBASE_KEY_FILE = "guardianai-key.json"
cred = credentials.Certificate(FIREBASE_KEY_FILE)
firebase_admin.initialize_app(cred)
db = firestore.client()

# GUARDIAN-AI: Original DroidCam input — kept for later
# cap = cv2.VideoCapture(1)

# GUARDIAN-AI: Temporary test-video input
cap = cv2.VideoCapture("test_video.mp4")

#CAMERA_IP="xxx.xxx.xx.
#CAMERA_USERNAME="admin"
#CAMERA_PASSWORD="Rayat@123"
#cap=cv2.VideoCapture (f"rtsp://{CAMERA_USERNAME}:{CAMERA_PASSWORD}@{CAMERA_IP}:554/Streaming/Channels/101")

# reduce webcam resolution to improve FPS and reduce lag
cap.set(cv2.CAP_PROP_FRAME_WIDTH,640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT,480)

last_api_call = 0
API_CALL_INTERVAL = 5 # call roboflow every 5 seconds to save credits
# ===========================================

print("[START] Guardian AI Running. Press 'q' to quit")

while True:
    ret, frame = cap.read()
    if not ret: break

    # 1. LOCAL MODEL: sit/stand/fall - Green boxes
    results = model(frame, conf=0.4, verbose=False)
    annotated_frame = results[0].plot() # draws green boxes

    # 2. ROBOFLOW API: violence/fight - Red boxes every 5 sec
    if time.time() - last_api_call > API_CALL_INTERVAL:
        last_api_call = time.time()
        cv2.imwrite("temp.jpg", frame)

        try:
            with open("temp.jpg", "rb") as image_file:
                res = requests.post(
                    ROBOFLOW_URL,
                    params={"api_key": ROBOFLOW_API_KEY},
                    files={"file": image_file},
                    timeout=15
                )

            api_data = res.json()

            print("[ROBOFLOW]", api_data)

            # Draw red boxes for violence
            for pred in api_data.get("predictions", []):
                x = int(pred["x"])
                y = int(pred["y"])
                w = int(pred["width"])
                h = int(pred["height"])

                x1, y1 = x - w // 2, y - h // 2
                x2, y2 = x + w // 2, y + h // 2

                confidence = float(pred["confidence"])
                label = f"violence {confidence:.2f}"

                cv2.rectangle(
                    annotated_frame,
                    (x1, y1),
                    (x2, y2),
                    (0, 0, 255),
                    2
                )

                cv2.putText(
                    annotated_frame,
                    label,
                    (x1, y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.5,
                    (0, 0, 255),
                    2
                )

                # 3. FIREBASE: Save alert if violence confidence > 50%
                if confidence > 0.5:
                    db.collection("alerts").add({
                        "type": "violence",
                        "confidence": confidence,
                        "timestamp": firestore.SERVER_TIMESTAMP,
                        "location": "Classroom Cam 1"
                    })

                    print(
                        f"[FIREBASE] ALERT SAVED: violence - {confidence:.2f}"
                    )

        except requests.exceptions.Timeout:
            print("[WARN] Roboflow API timed out. Skipping this frame.")

        except Exception as e:
            print("[ERROR] Roboflow API failed:", e)

    # 4. SHOW WINDOW
    cv2.imshow("Guardian AI - Green=Local Red=API", annotated_frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
print("[STOP] Guardian AI Stopped")
