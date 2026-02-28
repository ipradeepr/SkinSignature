import * as faceapi from 'face-api.js';

export async function loadFaceApiModels() {
  await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
  await faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models');
}

export async function detectLips(video: HTMLVideoElement) {
  const detections = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks(true);
  if (!detections || !detections.landmarks) return null;
  // Lips points: 48-67 (outer and inner lips)
  const lips = detections.landmarks.positions.slice(48, 68);
  return lips;
}
