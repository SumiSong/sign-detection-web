import type { Landmark, Results } from '@mediapipe/hands';
import { useCallback, useEffect, useRef, useState } from 'react';
import drawCanvas from './utils/drawUtils';
import setCamera from './utils/cameraUtils';
import setHands from './utils/handsUtils';
import axios from 'axios';
import s from './DataCreate.module.css';
import { useNavigate } from 'react-router-dom';

const DataCreate = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handsRef = useRef<ReturnType<typeof setHands> | null>(null);
  const cameraRef = useRef<ReturnType<typeof setCamera> | null>(null);
  const intervalRef = useRef<number | null>(null);
  const nav = useNavigate();
  const [leftHand, setLeftHand] = useState<Landmark[]>([]);
  const [rightHand, setRightHand] = useState<Landmark[]>([]);
  const [frames, setFrames] = useState<{ left: number[]; right: number[] }[]>([]);
  const [frameCount, setFrameCount] = useState(0);
  const [maxFrame, setMaxFrame] = useState<number>(0);
  const [isRecord, setIsRecord] = useState(false);
  const [count, setCount] = useState(3);

  const frameCountRef = useRef(frameCount);
  const isRecordRef = useRef(isRecord);
  const maxFrameRef = useRef(maxFrame);

  useEffect(() => {
    maxFrameRef.current = maxFrame;
  }, [maxFrame]);

  useEffect(() => {
    frameCountRef.current = frameCount;
  }, [frameCount]);

  useEffect(() => {
    isRecordRef.current = isRecord;
  }, [isRecord]);

  const onResult = useCallback((results: Results) => {
    const canvasCtx = canvasRef.current?.getContext('2d');
    if (!canvasCtx) return;

    drawCanvas(canvasCtx, results);

    if (!results.multiHandLandmarks || !results.multiHandedness) return;

    let left: number[] = [];
    let right: number[] = [];

    results.multiHandedness.forEach((hand, i) => {
      const label = hand.label;
      const landmarks = results.multiHandLandmarks![i];
      const xy = landmarks.flatMap(p => [p.x, p.y]);

      if (label === 'Left') {
        setLeftHand(landmarks);
        left = xy;
      } else if (label === 'Right') {
        setRightHand(landmarks);
        right = xy;
      }
    });

    if (left.length === 0) left = Array(42).fill(0);
    if (right.length === 0) right = Array(42).fill(0);

    if (isRecordRef.current) {
      if (frameCountRef.current >= maxFrameRef.current) {
        console.log('중지');
        setIsRecord(false);
      } else {
        console.log('기록 중');
        setFrameCount(p => p + 1);
        setFrames(prev => [...prev, { left, right }]);
      }
    }
  }, []);

  useEffect(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;

    const hands = setHands();
    handsRef.current = hands;
    hands.onResults(onResult);

    const camera = setCamera(video, hands, 1280, 720);
    cameraRef.current = camera;

    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }

      if (handsRef.current) {
        if (typeof handsRef.current.close === 'function') {
          handsRef.current.close();
        }
        handsRef.current = null;
      }
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [onResult]);

  const handleRecord = () => {
    if (isRecord) {
      setIsRecord(false);

      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setFrameCount(0);
      setCount(3);
    } else {
      setFrames([]);
      setFrameCount(0);

      setCount(3);
      let sec = 3;
      intervalRef.current = window.setInterval(() => {
        sec -= 1;
        setCount(sec);
        if (sec === 0) {
          if (intervalRef.current !== null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setIsRecord(true);
        }
      }, 1000);
    }
  };

  return (
    <div className={s.container}>
      <h1 className={s.heading}>{isRecord ? '녹화 중' : `녹화 시작까지 : ${count}`}</h1>

      <div className={s.canvasWrapper}>
        <canvas ref={canvasRef} width={1280} height={720} />
      </div>

      <div className={s.inputWrapper}>
        <label htmlFor="frame-input">데이터 몇 개 만드세요?</label>
        <input
          id="frame-input"
          className={s.input}
          value={maxFrame}
          onChange={(e) => setMaxFrame(Number(e.target.value))}
          placeholder="예: 100"
        />
      </div>

      <div className={s.buttonsWrapper}>
        <button className={s.button} onClick={handleRecord}>
          녹화 {isRecord ? '중지' : '시작'}
        </button>
        <button
          className={s.button}
          onClick={() => {
            const blob = new Blob([JSON.stringify(frames, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `landmarks_${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          JSON 저장
        </button>
      </div>
      <button style={{
        marginBottom:20
      }} onClick={() => nav('/submit')}>서버 테스트 하러가기</button>

      <video ref={videoRef} style={{ display: 'none' }} />
      <div className={s.landmarksContainer}>
        <div className={s.leftHandContainer}>
          <div>왼손</div>
          <div className={s.left}>
            {leftHand.map((p, i) => (
              <div key={i} className={s.leftHand}>
                <div>{i} X : {p.x.toFixed(3)}</div>
                <div>{i} Y : {p.y.toFixed(3)}</div>
              </div>
            ))}
          </div>
        </div>
        <div className={s.rightHandContainer}>
          <div>오른손</div>
          <div className={s.right}>
            {rightHand.map((p, i) => (
              <div key={i} className={s.rightHand}>
                <div>{i} X : {p.x.toFixed(3)}</div>
                <div>{i} Y : {p.y.toFixed(3)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div >
  );
};

export default DataCreate;
