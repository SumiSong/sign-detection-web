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
    const [msg, setMsg] = useState<string[]>([]);
    const [isServerOpen, setIsServerOpen] = useState('loading');
    const [msgColor, setMsgColor] = useState('black');
    const isSendToServerRef = useRef(isSendToServer);
    const handsRef = useRef<ReturnType<typeof setHands> | null>(null);
    const cameraRef = useRef<ReturnType<typeof setCamera> | null>(null);
    const lastMsgRef = useRef('');
    useEffect(() => {
        lastMsgRef.current = msg[msg.length - 1];
    }, [msg]);
    useEffect(() => {

        isSendToServerRef.current = isSendToServer;
    }, [isSendToServer])

    const lastSentRef = useRef<number>(0);
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

        if (left.length === 0 && right.length === 0) return;

        if (left.length === 0) left = Array(42).fill(0);
        if (right.length === 0) right = Array(42).fill(0);

        const now = Date.now();
        const sendInterval = 1000;

        if (isSendToServerRef.current && now - lastSentRef.current > sendInterval) {
            lastSentRef.current = now;
            axios.post('http://localhost:5000/ai/predict', { left, right }, {
                headers: {
                    'Content-Type': 'application/json',
                },
            })
                .then(res => {
                    if (res.data) {
                        if (res.data+' ' !== lastMsgRef.current) {
                            
                            switch (res.data) {
                                case '검정': setMsgColor('black'); break;
                                case '파랑': setMsgColor('blue'); break;
                                case '내려쓰기': setMsg(p => ([...p, '내려쓰기 '])); break;

                                default: setMsg(p => ([...p, res.data+' ']));
                            }
                        }
                    }
                })
                .catch(err => {
                    console.error('서버 전송 실패:', err);
                    if (err.message === 'Network Error') {
                        // setMsg(`서버가 켜져있는지 확인하세요. 응답 메세지 : ${err.message}`);
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
    useEffect(() => {
        const serverCheck = async () => {
            try {
                const res = await axios.get('http://localhost:5000/health');
                setIsServerOpen('ok');
            } catch (err) {
                setIsServerOpen('close');
            }

        }
        serverCheck()
    }, [])
    const sendServer = () => {

        setIsSendToServer(p => !p);
    }
    return (
        <div className={s.container}>
            <h1>실시간 수어 번역하기</h1>
            <p style={{
                fontSize: 12,
                color: isServerOpen === 'loading' ? 'yellow' : isServerOpen === 'close' ? 'red' : 'green'
            }}>{isServerOpen === 'loading' ? '상태 체크 중..' : isServerOpen === 'close' ? 'AI가 자고 있어요.' : '준비 완료'}</p>
            {/* <div style={{ marginBottom: 20 }}>{msg}</div> */}
            <div className={s.canvasResult}>
                <div className={s.canvasWrapper}>
                    <canvas ref={canvasRef} width={1280} height={720} />
                </div>
                <section className={s.resultContainer}>
                <h3>결과</h3>
                <div className={s.result} style={{color:msgColor}}>
                    {
                        msg.map((m, i)=>(
                            m==='내려쓰기 '?<br key={i}/>:<span key={i}>{m}</span>
                        ))
                    }
                </div>
                </section>
            </div>

            <div className={s.buttonsWrapper}>
                <button className={s.button} onClick={sendServer}>
                    {isSendToServer ? '그만하기' : '수어 번역하기'}
                </button>
            </div>
            <button onClick={() => nav('/')}>데이터 만들러가기</button>

            <video ref={videoRef} style={{ display: 'none' }} />
        </div >
    )
}

export default DataSend;