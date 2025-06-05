import type { Landmark, Results } from '@mediapipe/hands';
import { useCallback, useEffect, useRef, useState } from 'react';
import drawCanvas from './utils/drawUtils';
import setCamera from './utils/cameraUtils';
import setHands from './utils/handsUtils';
import s from './App.module.css';

const App = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // MediaPipe Hands 인스턴스를 보관할 ref
  const handsRef = useRef<ReturnType<typeof setHands> | null>(null);
  // 카메라 인스턴스를 보관할 ref (setCamera 반환값)
  const cameraRef = useRef<ReturnType<typeof setCamera> | null>(null);
  // 카운트다운 interval ID를 보관할 ref
  const intervalRef = useRef<number | null>(null);

  const [leftHand, setLeftHand] = useState<Landmark[]>([]);
  const [rightHand, setRightHand] = useState<Landmark[]>([]);
  // 녹화된 프레임(좌표)들을 누적해서 저장
  const [frames, setFrames] = useState<{ left: number[]; right: number[] }[]>([]);
  const [frameCount, setFrameCount] = useState(0);
  const [maxFrame, setMaxFrame] = useState<number>(0);
  const [isRecord, setIsRecord] = useState(false);
  const [count, setCount] = useState(3);

  // ref를 사용해서 onResult 내부에서 최신 값을 읽어올 수 있도록 함
  const frameCountRef = useRef(frameCount);
  const isRecordRef = useRef(isRecord);
  const maxFrameRef = useRef(maxFrame);

  // 상태가 바뀔 때마다 ref에 동기화
  useEffect(() => {
    maxFrameRef.current = maxFrame;
  }, [maxFrame]);

  useEffect(() => {
    frameCountRef.current = frameCount; // +1 제거
  }, [frameCount]);

  useEffect(() => {
    isRecordRef.current = isRecord;
  }, [isRecord]);

  // MediaPipe 결과를 받아서 canvas에 그리고, 녹화 중이라면 frames에 저장
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

  // 컴포넌트 마운트 시에 MediaPipe Hands와 카메라를 설정
  useEffect(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;

    // 1. MediaPipe Hands 생성 및 콜백 등록
    const hands = setHands();
    handsRef.current = hands;
    hands.onResults(onResult);

    // 2. 카메라(웹캠) 설정
    const camera = setCamera(video, hands, 1280, 720);
    cameraRef.current = camera;

    // 언마운트 시 cleanup
    return () => {
      // 카메라 스트림 중지
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }

      // Hands 인스턴스 정리
      if (handsRef.current) {
        // MediaPipe Hands 내부 리소스 해제
        // @ts-ignore
        if (typeof handsRef.current.close === 'function') {
          // hands.close() 메서드가 있으면 호출
          handsRef.current.close();
        }
        handsRef.current = null;
      }

      // interval clear
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [onResult]);

  // 녹화 버튼 클릭 처리
  const handleRecord = () => {
    if (isRecord) {
      // 녹화 중지
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
    <div>
      <h1>{isRecord ? '녹화 중' : `녹화 시작까지 : ${count}`}</h1>
      <div className={s.dataInput}>
        <div>몇 개 데이터 생성하세요?</div>
        <input
          value={maxFrame}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaxFrame(Number(e.target.value))}
          placeholder="몇 개 만드십니까?"
        />
      </div>
      <div className={s.dataButton}>
        <button onClick={handleRecord}>녹화 {isRecord ? '중지' : '시작'}</button>
        <button
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
      <video ref={videoRef} style={{ display: 'none' }} />
      <canvas ref={canvasRef} width={1280} height={720} />
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
    </div>
  );
};

export default App;
