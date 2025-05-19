import React, { useEffect, useRef, useState } from 'react';
import type { Results, NormalizedLandmarkList, NormalizedLandmark } from '@mediapipe/holistic';
import { Holistic } from '@mediapipe/holistic';
import { Camera } from '@mediapipe/camera_utils';

type Coord = [number, number];

const MediapipeCanvas: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);      //비디오
  const canvasRef = useRef<HTMLCanvasElement>(null);    //출력할 캔버스

  const [coords, setCoords] = useState<Record<string, Coord>>({
    face_keypoints_2d: [0, 0],
    pose_keypoints_2d: [0, 0],
    hand_left_keypoints_2d: [0, 0],
    hand_right_keypoints_2d: [0, 0],
  });

  // 첫 번째 keypoint만 state 저장용
  const getFirstXY = (list?: NormalizedLandmarkList): Coord => {
    if (!list || list.length === 0) return [0, 0];
    const x = Math.round(list[0].x * 1280);
    const y = Math.round(list[0].y * 720);
    return [x, y];
  };

  // keypoint 전체를 캔버스에 그림
  const drawAllDots = (
    ctx: CanvasRenderingContext2D,
    landmarks: NormalizedLandmarkList | undefined,
    color: string
  ) => {
    if (!landmarks) return;
    ctx.fillStyle = color;
    for (const lm of landmarks) {
      const x = lm.x * ctx.canvas.width;
      const y = lm.y * ctx.canvas.height;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  };

  const handleResults = (results: Results) => {
    const face = getFirstXY(results.faceLandmarks);
    const pose = getFirstXY(results.poseLandmarks);
    const left = getFirstXY(results.leftHandLandmarks);
    const right = getFirstXY(results.rightHandLandmarks);

    setCoords({
      face_keypoints_2d: face,
      pose_keypoints_2d: pose,
      hand_left_keypoints_2d: left,
      hand_right_keypoints_2d: right,
    });

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !videoRef.current) return;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.drawImage(videoRef.current, 0, 0, ctx.canvas.width, ctx.canvas.height);

    // 각 부위별 전체 keypoints를 그리고, 색은 다르게
    drawAllDots(ctx, results.faceLandmarks, 'green');
    drawAllDots(ctx, results.poseLandmarks, 'red');
    drawAllDots(ctx, results.leftHandLandmarks, 'blue');
    drawAllDots(ctx, results.rightHandLandmarks, 'purple');
  };

  const holisticRef = useRef<Holistic | null>(null);
  const cameraRef = useRef<Camera | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    if (!holisticRef.current) {
      const holistic = new Holistic({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`,
      });
      holistic.setOptions({
        modelComplexity: 1,
        refineFaceLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      holistic.onResults(handleResults);
      holisticRef.current = holistic;
    }

    if (!cameraRef.current) {
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          await holisticRef.current?.send({ image: videoRef.current! });
        },
        width: 1280,
        height: 720,
      });
      camera.start();
      cameraRef.current = camera;
    }

    return () => {
      cameraRef.current?.stop();
      holisticRef.current?.close();
    };
  }, []);

  return (
    <div>
      <video ref={videoRef} style={{ display: 'none' }} playsInline width={1280} height={720} />
      <canvas ref={canvasRef} width={1280} height={720} />
      <div style={{ padding: '1em' }}>
        {Object.entries(coords).map(([key, [x, y]]) => (
          <div key={key}>
            {key}: [{x}, {y}]
          </div>
        ))}
      </div>
    </div>
  );
};

export default MediapipeCanvas;
