import * as faceapi from "face-api.js";

const MODEL_URL = "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js/weights";
const SIMILARITY_THRESHOLD = 0.45;

let modelsLoaded = false;

export async function loadFaceModels() {
  if (modelsLoaded) return;
  await Promise.all([
    faceapi.nets.tinyFaceDetector.load(MODEL_URL),
    faceapi.nets.faceLandmark68Net.load(MODEL_URL),
    faceapi.nets.faceRecognitionNet.load(MODEL_URL),
  ]);
  modelsLoaded = true;
}

export async function detectFace(videoEl: HTMLVideoElement) {
  const result = await faceapi
    .detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.3 }))
    .withFaceLandmarks()
    .withFaceDescriptor();
  return result;
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export type LivenessDirection = "trái" | "phải" | "lên" | "xuống";
const DIRECTION_MAP: LivenessDirection[] = ["trái", "phải", "lên", "xuống"];

function getNoseRatio(detection: faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }>) {
  const box = detection.detection.box;
  const noseTip = detection.landmarks.getNose()[3];

  const cx = noseTip.x - box.x;
  const cy = noseTip.y - box.y;

  const ratioX = cx / box.width;
  const ratioY = cy / box.height;

  return { x: ratioX, y: ratioY };
}

async function waitForDirection(
  videoEl: HTMLVideoElement,
  direction: LivenessDirection,
  signal: AbortSignal
): Promise<void> {
  const TIMEOUT_MS = 12000;
  const startTime = Date.now();

  return new Promise<void>((resolve, reject) => {
    const check = async () => {
      if (signal.aborted) return reject(new DOMException("Aborted", "AbortError"));
      if (Date.now() - startTime > TIMEOUT_MS) {
        return reject(new Error("Quá thời gian chờ. Vui lòng thử lại."));
      }

      try {
        const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.3 });
        const detection = await faceapi
          .detectSingleFace(videoEl, options)
          .withFaceLandmarks();

        if (!detection) {
          await sleep(200);
          return check();
        }

        const { x, y } = getNoseRatio(detection);
        let passed = false;

        switch (direction) {
          case "trái":
            passed = x > 0.6;
            break;
          case "phải":
            passed = x < 0.4;
            break;
          case "lên":
            passed = y < 0.45;
            break;
          case "xuống":
            passed = y > 0.58;
            break;
        }

        if (passed) resolve();
        else {
          await sleep(300);
          check();
        }
      } catch {
        await sleep(300);
        check();
      }
    };
    check();
  });
}

export async function performLivenessCheck(
  videoEl: HTMLVideoElement,
  onStep: (direction: LivenessDirection) => void,
  signal: AbortSignal
): Promise<void> {
  for (const dir of DIRECTION_MAP) {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    onStep(dir);
    await waitForDirection(videoEl, dir, signal);
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

export function isMatch(stored: number[], incoming: number[]): boolean {
  return cosineSimilarity(stored, incoming) >= SIMILARITY_THRESHOLD;
}
