import type { Landmark, Results } from '@mediapipe/hands';
import { useCallback, useEffect, useRef, useState } from 'react';
import drawCanvas from './utils/drawUtils';
import setCamera from './utils/cameraUtils';
import setHands from './utils/handsUtils';
import s from './App.module.css';
import axios from 'axios';

const App = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handsRef = useRef<ReturnType<typeof setHands> | null>(null);
  const cameraRef = useRef<ReturnType<typeof setCamera> | null>(null);
  const intervalRef = useRef<number | null>(null);

  const [leftHand, setLeftHand] = useState<Landmark[]>([]);
  const [rightHand, setRightHand] = useState<Landmark[]>([]);
  const [frames, setFrames] = useState<{ left: number[]; right: number[] }[]>([]);
  const [frameCount, setFrameCount] = useState(0);
  const [maxFrame, setMaxFrame] = useState<number>(0);
  const [isRecord, setIsRecord] = useState(false);
  const [count, setCount] = useState(3);
  const [isSendToServer, setIsSendToServer] = useState(false);
  const [msg, setMsg] = useState('이 곳에 메세지가 표시됩니다.');

  const frameCountRef = useRef(frameCount);
  const isRecordRef = useRef(isRecord);
  const maxFrameRef = useRef(maxFrame);
  const isSendToServerRef = useRef(isSendToServer);

  useEffect(() => {
    maxFrameRef.current = maxFrame;
  }, [maxFrame]);

  useEffect(() => {
    frameCountRef.current = frameCount;
  }, [frameCount]);

  useEffect(() => {
    isRecordRef.current = isRecord;
  }, [isRecord]);

  useEffect(() => {
    isSendToServerRef.current = isSendToServer;
  }, [isSendToServer])

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
    if (isSendToServerRef.current) {
      axios.post('http://localhost:8080/ai/predict', {left, right}, {
        headers: {
          'Content-Type': 'application/json',
        },
      })
        .then(res => {
          setMsg(res.data);
        })
        .catch(err => {
          console.error('서버 전송 실패:', err);
          if(err.message==='Network Error'){
            setMsg(`서버가 켜져있는지 확인하세요. 응답 메세지 : ${err.message}`);
          } else {
            setMsg(err.message);
          }
        });
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
  const sendServer = () => {
    setIsSendToServer(p => !p);

  }
  useEffect(() => {
    console.log(frames);

  }, [frames])

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
      <div>{msg}</div>
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
        <button onClick={sendServer}>{isSendToServer ? '그만 전송하기' : '서버로 전송하기'}</button>
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
