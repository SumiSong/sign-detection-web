import type { Landmark, Results } from '@mediapipe/hands';
import { useCallback, useEffect, useRef, useState } from 'react';
import drawCanvas from './utils/drawUtils';
import setCamera from './utils/cameraUtils';
import setHands from './utils/handsUtils';
import s from './App.module.css';

const App = () => {

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [leftHand, setLeftHand] = useState<Landmark[]>([]);
  const [rightHand, setRightHand] = useState<Landmark[]>([]);
  const [frames, setFrames] = useState<{ left: number[]; right: number[] }[]>([]);

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

    setFrames(prev => [...prev, { left, right }]);
  }, []);


  useEffect(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const hands = setHands();
    hands.onResults(onResult);
    const camera = setCamera(video, hands, 1280, 720);
    return () => { camera.stop(); canvasRef.current = null; }
  }, [])

  return (
    <div>
      <video ref={videoRef} style={{ display: 'none' }} />
      <canvas ref={canvasRef} width={1280} height={720} />
      <button onClick={() => {
        const blob = new Blob([JSON.stringify(frames, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `landmarks_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }}>JSON 저장</button>
      <div className={s.landmarksContainer}>
        <div className={s.leftHandContainer}>
          <div>왼손</div>
          <div className={s.left}>
            {
              leftHand.map((p, i) => (
                <div key={i} className={s.leftHand}>
                  <div>{i} X : {p.x.toFixed(3)}</div>
                  <div>{i} Y : {p.y.toFixed(3)}</div>
                </div>
              ))
            }
          </div>
        </div>
        <div className={s.rightHandContainer}>
          <div>오른손</div>
          <div className={s.right}>
            {
              rightHand.map((p, i) => (
                <div key={i} className={s.rightHand}>
                  <div>{i} X : {p.x.toFixed(3)}</div>
                  <div>{i} Y : {p.y.toFixed(3)}</div>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  )
}

export default App;