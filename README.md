# Guardian-AI: IoT-Based Smart Surveillance System

Guardian-AI is an AI-powered surveillance and real-time crime alert system that
turns an ordinary camera into an intelligent security monitor. It analyses live
video with YOLOv8 and OpenCV, detects security threats automatically, and alerts
authorized operators through a web dashboard.

## Features
- Live video analysis using Python, OpenCV and YOLOv8
- Detection of weapons (knife, gun), intrusion, violence, suspicious activity
  and persons
- Class-specific confidence thresholds, 3-frame verification and alert cooldown
  to reduce false positives
- Alerts and incidents stored in Firebase Firestore
- Secure operator login, registration, email verification and password recovery
  (Firebase Authentication)
- Web dashboard with live camera feed, alert feed and system status
- Camera management (add, edit, delete) with map-based location selection
- Incident map with routing to the incident location
- Camera heartbeat (last seen) monitoring

## Tech Stack
Python, Flask, OpenCV, YOLOv8 (Ultralytics), Firebase (Firestore and
Authentication), HTML, CSS, JavaScript, Google Maps

## How It Works
Camera -> Frame capture (OpenCV) -> YOLOv8 detection -> Threshold and
consecutive-frame check -> Alert saved to Firebase -> Dashboard updates in
real time

## Applications
Homes, schools and colleges, offices, industries, warehouses, parking areas
and other secure locations.

## Future Scope
Multi-camera support, facial recognition, ANPR, mobile apps, SMS/push
notifications, edge AI deployment, and additional IoT sensors (smoke, gas, fire).

## Author
Shweta Rakesh Pandya, BSc Computer Science, Model College, Dombivli
(University of Mumbai)
Guide: Prof. Vishal Khedkar
