import { useCallback, useEffect, useRef, useState } from 'react';
import s from './DataSend.module.css';
import type { Results } from '@mediapipe/hands';
import setHands from './utils/handsUtils';
import setCamera from './utils/cameraUtils';
import drawCanvas from './utils/drawUtils';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const DataSend = () => {
    const nav = useNavigate();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isSendToServer, setIsSendToServer] = useState(false);
    const [msg, setMsg] = useState('이 곳에 메세지가 표시됩니다.');
    const [isServerOpen, setIsServerOpen] = useState('loading');
    const isSendToServerRef = useRef(isSendToServer);
    const handsRef = useRef<ReturnType<typeof setHands> | null>(null);
    const cameraRef = useRef<ReturnType<typeof setCamera> | null>(null);
    useEffect(() => {
        console.log('effect 작동');
        
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
                left = xy;
            } else if (label === 'Right') {
                right = xy;
            }
        });

        if (left.length === 0) left = Array(42).fill(0);
        if (right.length === 0) right = Array(42).fill(0);
        if (isSendToServerRef.current) {
            console.log('서버 호출');
            
            axios.post('http://localhost:5000/ai/predict', { left, right }, {
                headers: {
                    'Content-Type': 'application/json',
                },
            })
                .then(res => {
                    setMsg(res.data);
                })
                .catch(err => {
                    console.error('서버 전송 실패:', err);
                    if (err.message === 'Network Error') {
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
        };
    }, [onResult]);
    useEffect(()=>{
        const serverCheck = async () => {
            try{
                const res = await axios.get('http://localhost:5000/health');
                setIsServerOpen('ok');
            } catch(err){
                setIsServerOpen('close');
            }

        }
        serverCheck()
    },[])
    const sendServer = () => {
        console.log('sendServer 함수 호출 현재 상태 : ', isSendToServer);
        
        setIsSendToServer(p => !p);
    }
    return (
        <div className={s.container}>
            <h1>실시간 수어 번역하기</h1>
            <p style={{
                fontSize:12,
                color: isServerOpen==='loading'?'yellow':isServerOpen==='close'?'red':'green'
            }}>{isServerOpen==='loading'?'상태 체크 중..':isServerOpen==='close'?'AI가 자고 있어요.':'준비 완료'}</p>
            <div style={{marginBottom:20}}>{msg}</div>
            <div className={s.canvasWrapper}>
                <canvas ref={canvasRef} width={1280} height={720} />
            </div>

            <div className={s.buttonsWrapper}>
                <button className={s.button} onClick={sendServer}>
                    {isSendToServer ? '그만하기' : '수어 번역하기'}
                </button>
            </div>
            <button onClick={()=>nav('/')}>데이터 만들러가기</button>

            <video ref={videoRef} style={{ display: 'none' }} />
        </div >
    )
}

export default DataSend;