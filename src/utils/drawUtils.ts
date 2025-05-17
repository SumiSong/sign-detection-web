import type { Results, NormalizedLandmark } from '@mediapipe/holistic';

function drawLandmarks(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[] | undefined,
  color: string,
  width: number
) {
  if (!landmarks) return;

  ctx.fillStyle = color;
  for (const landmark of landmarks) {
    const x = landmark.x * ctx.canvas.width;
    const y = landmark.y * ctx.canvas.height;

    ctx.beginPath();
    ctx.arc(x, y, width, 0, 2 * Math.PI);
    ctx.fill();
  }
}

export function drawKeypoints(results: Results, canvas: HTMLCanvasElement, video: HTMLVideoElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  drawLandmarks(ctx, results.poseLandmarks, 'red', 5);
  drawLandmarks(ctx, results.faceLandmarks, 'green', 2);
  drawLandmarks(ctx, results.leftHandLandmarks, 'blue', 5);
  drawLandmarks(ctx, results.rightHandLandmarks, 'purple', 5);
}
