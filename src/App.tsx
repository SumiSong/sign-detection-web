// src/components/HandSequence.tsx

import React, { useRef, useEffect } from 'react';
import axios from 'axios';
import { Hands, Results, NormalizedLandmarkList } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

interface HandSequenceProps {
  /**
   * 서버로 전송할 URL.
   */
  serverUrl?: string;
}

const HandSequence: React.FC<HandSequenceProps> = ({
  serverUrl = 'http://localhost:5000/ai/sequence_predict',
}) => {
  // 1) DOM 참조
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 193프레임 분량의 84차원 벡터 버퍼
  const sequenceRef = useRef<number[][]>([]);
  // 마지막 수집 시각(ms)
  const lastCollectTimeRef = useRef<number>(0);
  // 30fps → 프레임 간격 약 33.333ms
  const FRAME_INTERVAL = 1000 / 30;

  useEffect(() => {
    if (!videoRef.current) return;

    // Mediapipe Hands 인스턴스 생성
    const hands = new Hands({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    hands.onResults(onResults);

    // Camera 연결
    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        if (videoRef.current) {
          await hands.send({ image: videoRef.current });
        }
      },
      width: 640,
      height: 480,
    });
    camera.start();

    return () => {
      camera.stop();
      hands.close();
    };
  }, []);

  // Mediapipe 결과 처리
  const onResults = (results: Results) => {
    // 화면에 현재 프레임 표시
    drawHands(results);

    const now = Date.now();
    // 30fps로 정확히 맞춰 수집: 마지막 수집 이후 33.333ms 지났을 때만 수집
    if (now - lastCollectTimeRef.current < FRAME_INTERVAL) {
      return;
    }
    lastCollectTimeRef.current = now;

    // 손 랜드마크 & 손 구분 정보
    const multiLandmarks: NormalizedLandmarkList[] = results.multiHandLandmarks || [];
    const multiHandedness = results.multiHandedness || [];

    let leftLandmarks: NormalizedLandmarkList | null = null;
    let rightLandmarks: NormalizedLandmarkList | null = null;

    for (let i = 0; i < multiHandedness.length; i++) {
      const label = multiHandedness[i].label;
      if (label === 'Left') leftLandmarks = multiLandmarks[i];
      else if (label === 'Right') rightLandmarks = multiLandmarks[i];
    }

    if (!leftLandmarks)
      leftLandmarks = Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 }));
    if (!rightLandmarks)
      rightLandmarks = Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 }));

    // 0~1 정규화 값을 그대로 사용하여 84차원 배열 생성
    const frame84: number[] = [];
    leftLandmarks.forEach((lm) => {
      frame84.push(lm.x, lm.y);
    });
    rightLandmarks.forEach((lm) => {
      frame84.push(lm.x, lm.y);
    });
    // frame84.length === 84

    const seq = sequenceRef.current;
    seq.push(frame84);

    if (seq.length === 193) {
      console.log('193프레임 모임 → 서버 전송');
      sendToServer(seq);
      sequenceRef.current = []; // 버퍼 초기화
    }
  };

  // 서버 전송
  const sendToServer = (seq: number[][]) => {
    const payload = { sequence: seq.map((arr) => [...arr]) };
    axios
      .post(serverUrl!, payload, {
        headers: { 'Content-Type': 'application/json' },
      })
      .then((response) => {
        console.log('서버 응답:', response.data);
      })
      .catch((error) => {
        console.error('전송 에러:', error);
      });
  };

  // Canvas에 손 랜드마크 그리기
  const drawHands = (results: Results) => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;
    const canvasCtx = canvasElement.getContext('2d');
    if (!canvasCtx) return;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    if (results.multiHandLandmarks) {
      for (const landmarks of results.multiHandLandmarks) {
        for (let i = 0; i < landmarks.length; i++) {
          const x = landmarks[i].x * canvasElement.width;
          const y = landmarks[i].y * canvasElement.height;
          canvasCtx.beginPath();
          canvasCtx.arc(x, y, 4, 0, 2 * Math.PI);
          canvasCtx.fillStyle = 'red';
          canvasCtx.fill();
        }
      }
    }

    canvasCtx.restore();
  };

  return (
    <div style={{ position: 'relative', width: 640, height: 480 }}>
      <video
        ref={videoRef}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 640,
          height: 480,
          objectFit: 'cover',
        }}
        autoPlay
        playsInline
        muted
      />
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};

export default HandSequence;
  