import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { HAND_CONNECTIONS, type Results } from "@mediapipe/hands"

const drawCanvas = (ctx: CanvasRenderingContext2D, result: Results) => {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  ctx.save();
  ctx.setTransform(-1, 0, 0, 1, width, 0); // 좌우 반전 단축 표현
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(result.image, 0, 0, width, height);
  if (result.multiHandLandmarks) {
    for (const landmark of result.multiHandLandmarks) {
      drawConnectors(ctx, landmark, HAND_CONNECTIONS, { color: '#00F00', lineWidth: 5 });
      drawLandmarks(ctx, landmark, { color: '#FF0000', lineWidth: 1, radius: 5 });
    }
  }
  ctx.restore();

}
export default drawCanvas;