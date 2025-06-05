// HandDetector.tsx

import React, { useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import { Hands } from '@mediapipe/hands';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { Camera } from '@mediapipe/camera_utils';

const MAX_IMAGE_WIDTH = 1920;
const MAX_IMAGE_HEIGHT = 1080;

const HandDetector: React.FC = () => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.5,
      modelComplexity: 1,
    });

    hands.onResults(onResults);

    if (
      typeof webcamRef.current !== 'undefined' &&
      webcamRef.current !== null &&
      webcamRef.current.video !== null
    ) {
      const camera = new Camera(webcamRef.current.video!, {
        onFrame: async () => {
          if (webcamRef.current?.video) {
            await hands.send({ image: webcamRef.current.video });
          }
        },
        width: 640,
        height: 480,
      });
      camera.start();
    }

    return () => {
      hands.close();
    };
  }, []);

const onResults = async (results: any) => {
  const canvasElement = canvasRef.current;
  const canvasCtx = canvasElement?.getContext('2d');
  canvasCtx?.clearRect(0, 0, canvasElement.width, canvasElement.height);

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    for (let handIndex = 0; handIndex < results.multiHandLandmarks.length; handIndex++) {
      const landmarks = results.multiHandLandmarks[handIndex];
      const handedness = results.multiHandedness?.[handIndex]?.label || `Hand${handIndex + 1}`; // "Left" or "Right"

      // 랜드마크 그리기
      drawLandmarks(canvasCtx!, landmarks, { color: handedness === "Left" ? '#00FF00' : '#0000FF', lineWidth: 2 });
      drawConnectors(canvasCtx!, landmarks, Hands.HAND_CONNECTIONS, {
        color: '#FF0000',
        lineWidth: 2,
      });

      // === 정규화된 x, y 값만 추출해서 LSTM 입력형식으로 변환 ===
      const normalizedXY: number[] = [];
      for (let i = 0; i < landmarks.length; i++) {
        const x = landmarks[i].x * MAX_IMAGE_WIDTH;
        const y = landmarks[i].y * MAX_IMAGE_HEIGHT;
        const normX = x / MAX_IMAGE_WIDTH;
        const normY = y / MAX_IMAGE_HEIGHT;
        normalizedXY.push(normX, normY);
      }

      // Flask로 전송 (좌/우 구분 포함)
      try {
        await fetch('http://localhost:5000/predict', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            hand: handedness, // "Left" or "Right"
            frame: normalizedXY,
          }),
        });
      } catch (error) {
        console.error(`Error sending ${handedness} hand to Flask:`, error);
      }
    }
  }
};


  return (
    <div>
      <Webcam
        ref={webcamRef}
        style={{
          width: 640,
          height: 480,
          position: 'absolute',
        }}
      />
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        style={{
          position: 'absolute',
        }}
      />
    </div>
  );
};

export default HandDetector;
