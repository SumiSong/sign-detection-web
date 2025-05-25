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
            console.log('전송 중:', coordsRef.current.face_keypoints_2d);
            axios.post('http://localhost:5000/ai/keypoints', { coordsRef })
                .then(res => console.log('서버 응답:', res.data))
                .catch(err => console.error('전송 실패:', err));
        }, 33);

        return () => {
            clearInterval(interval);
            console.log('전송 중지');
        };
    }, [isSendDataReady]);
    const handleResults = (results: Results) => {
        const face = getFirstXY(results.faceLandmarks);
        const pose = getFirstXY(results.poseLandmarks);
        const left = getFirstXY(results.leftHandLandmarks);
        const right = getFirstXY(results.rightHandLandmarks);

        const newCoords: CoordsMap = {
            face_keypoints_2d: face,
            pose_keypoints_2d: pose,
            hand_left_keypoints_2d: left,
            hand_right_keypoints_2d: right,
        };

        const prev = prevCoordsRef.current;
        if (!prev || Object.keys(newCoords).some(key => !isSameCoord(newCoords[key as keyof CoordsMap], prev[key as keyof CoordsMap]))) {
            prevCoordsRef.current = newCoords;
            setCoords(newCoords);
        }

        const ctx = canvasRef.current?.getContext('2d');
        const video = videoRef.current;
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
                ctx.beginPath();
                ctx.arc(lm.x * ctx.canvas.width, lm.y * ctx.canvas.height, 4, 0, 2 * Math.PI);
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
