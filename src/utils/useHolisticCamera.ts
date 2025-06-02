import { useEffect, useRef } from 'react';
import { Holistic } from '@mediapipe/holistic';
import { Camera } from '@mediapipe/camera_utils';
import axios from 'axios';
import type { Results, NormalizedLandmarkList } from '@mediapipe/holistic';
import type { CoordsMap } from '../type';

const getFirstXY = (list?: NormalizedLandmarkList): [number, number] => {
    if (!list || list.length === 0) return [0, 0];
    return [
        Math.round(list[0].x * 1280),
        Math.round(list[0].y * 720),
    ];
};

const isSameCoord = (a: [number, number], b: [number, number]) =>
    a[0] === b[0] && a[1] === b[1];

const useHolisticCamera = (
    videoRef: React.RefObject<HTMLVideoElement | null>,
    canvasRef: React.RefObject<HTMLCanvasElement | null>,
    coords: CoordsMap,
    setCoords: React.Dispatch<React.SetStateAction<CoordsMap>>,
    isSendDataReady: boolean
) => {
    const motionBuffer = useRef<CoordsMap[]>([]);
    const stillCount = useRef<number>(0);
    const prevMotionRef = useRef<CoordsMap | null>(null);
    const MIN_MOTION_FRAMES = 10;
    const STILL_FRAMES_TO_END = 8;
    const STILL_THRESHOLD = 0.01;

    const isMotionless = (prev: CoordsMap, curr: CoordsMap): boolean => {
        const a = Object.values(prev).flat();
        const b = Object.values(curr).flat();
        const diff = a.map((v, i) => Math.abs(v - b[i]));
        const avgDiff = diff.reduce((sum, v) => sum + v, 0) / diff.length;
        return avgDiff < STILL_THRESHOLD;
    };
    const holisticRef = useRef<Holistic | null>(null);
    const cameraRef = useRef<Camera | null>(null);
    const prevCoordsRef = useRef<CoordsMap | null>(null);
    const coordsRef = useRef<CoordsMap>(coords);
    useEffect(() => {
        coordsRef.current = coords;
    }, [coords]);
    useEffect(() => {
        if (!isSendDataReady) return;
        const interval = setInterval(() => {
            console.log("길이 체크:",
                coordsRef.current.face_keypoints_2d.length,
                coordsRef.current.pose_keypoints_2d.length,
                coordsRef.current.hand_left_keypoints_2d.length,
                coordsRef.current.hand_right_keypoints_2d.length
            );

            axios.post('http://localhost:5000/ai/predict', { coords: coordsRef.current })
                .then(res => console.log('서버 응답:', res.data))
                .catch(err => console.error('전송 실패:', err));
        }, 1000);

        return () => {
            clearInterval(interval);
            console.log('전송 중지');
        };
    }, [isSendDataReady]);
    // 추출 유틸
    const extractXY = (list: NormalizedLandmarkList | undefined, count: number): number[] => {
        if (!list) return Array(count * 2).fill(0);
        return list.slice(0, count).flatMap(p => [p.x, p.y]);
    };

    const handleResults = (results: Results) => {
        const extractXY = (list: NormalizedLandmarkList | undefined, count: number): number[] => {
            if (!list) return Array(count * 2).fill(0);
            return list.slice(0, count).flatMap(p => [p.x, p.y]);
        };

        const face = extractXY(results.faceLandmarks, 70);       // 140
        const pose = extractXY(results.poseLandmarks, 25);       // 50
        const left = extractXY(results.leftHandLandmarks, 21);   // 42
        const right = extractXY(results.rightHandLandmarks, 21); // 42

        const newCoords: CoordsMap = {
            face_keypoints_2d: face,
            pose_keypoints_2d: pose,
            hand_left_keypoints_2d: left,
            hand_right_keypoints_2d: right,
        };

        // 상태 업데이트
        coordsRef.current = newCoords;
        setCoords(newCoords);

        // ⬇️ 움직임 기반 시퀀스 예측 로직
        const prev = prevMotionRef.current;
        if (prev && isMotionless(prev, newCoords)) {
            stillCount.current += 1;
        } else {
            stillCount.current = 0;
        }
        prevMotionRef.current = newCoords;

        motionBuffer.current.push(newCoords);

        if (
            stillCount.current >= STILL_FRAMES_TO_END &&
            motionBuffer.current.length >= MIN_MOTION_FRAMES
        ) {
            const seq = [...motionBuffer.current];
            motionBuffer.current = [];
            stillCount.current = 0;

            axios
                .post('http://localhost:5000/ai/sequence_predict', {
                    sequence: seq,
                })
                .then((res) => {
                    console.log('🔮 시퀀스 예측 결과:', res.data);
                })
                .catch((err) => console.error('❌ 예측 실패:', err));
        }

        // ⬇️ 캔버스에 점 그리기
        const canvas = canvasRef.current;
        const video = videoRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !video) return;

        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.drawImage(video, 0, 0, ctx.canvas.width, ctx.canvas.height);

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

        drawAllDots(ctx, results.faceLandmarks, 'green');
        drawAllDots(ctx, results.poseLandmarks, 'red');
        drawAllDots(ctx, results.leftHandLandmarks, 'blue');
        drawAllDots(ctx, results.rightHandLandmarks, 'purple');
    };



    useEffect(() => {
        let isMounted = true;

        const setupCamera = async () => {
            const video = videoRef.current;
            if (!video || !isMounted) return;

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: 1280,
                    height: 720,
                    frameRate: { ideal: 60, max: 60 },
                    facingMode: 'user',
                },
            });

            if (!isMounted) {
                stream.getTracks().forEach((t) => t.stop());
                return;
            }

            video.srcObject = stream;
            await video.play();

            if (!holisticRef.current) {
                const holistic = new Holistic({
                    locateFile: (file) =>
                        `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`,
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
                const camera = new Camera(video, {
                    onFrame: async () => {
                        await holisticRef.current?.send({ image: video });
                    },
                    width: 1280,
                    height: 720,
                });
                camera.start();
                cameraRef.current = camera;
            }
        };

        setupCamera();

        return () => {
            isMounted = false;
            cameraRef.current?.stop();
            holisticRef.current?.close();

            const video = videoRef.current;
            const tracks = video?.srcObject instanceof MediaStream
                ? video.srcObject.getTracks()
                : [];
            tracks.forEach((track) => track.stop());
        };
    }, []);
};

export default useHolisticCamera;
