import React, { useEffect, useRef, useState } from 'react';
import type { Results, NormalizedLandmarkList } from '@mediapipe/holistic';
import { Holistic } from '@mediapipe/holistic';
import { Camera } from '@mediapipe/camera_utils';

type Coord = [number, number];

const MediapipeCanvas: React.FC = () => {
    const videoRef = useRef<HTMLVideoElement>(null);      //비디오
    const canvasRef = useRef<HTMLCanvasElement>(null);    //출력할 캔버스

    //얘는 좌표 state임
    const [coords, setCoords] = useState<Record<string, Coord>>({
        face_keypoints_2d: [0, 0],
        pose_keypoints_2d: [0, 0],
        hand_left_keypoints_2d: [0, 0],
        hand_right_keypoints_2d: [0, 0],
    });
    // ㅁ에서 x,y를 뽑아내는 함수
    const getFirstXY = (ㅁ?: NormalizedLandmarkList): Coord => {
        if (!ㅁ || ㅁ.length === 0) return [0, 0];
        const x = Math.round(ㅁ[0].x * 1280);
        const y = Math.round(ㅁ[0].y * 720);
        return [x, y];
    };
    // 위에 함수에서 뽑은거로 state 업데이트하기
    const handleResults = (results: Results) => {
        const face = getFirstXY(results.faceLandmarks);
        const pose = getFirstXY(results.poseLandmarks);
        const left = getFirstXY(results.leftHandLandmarks);
        const right = getFirstXY(results.rightHandLandmarks);

        setCoords({
            face_keypoints_2d: face,
            pose_keypoints_2d: pose,
            hand_left_keypoints_2d: left,
            hand_right_keypoints_2d: right,
        });
        //캔버스에 그리기
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx || !videoRef.current) return;

        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);   //전 프레임 지우고
        ctx.drawImage(videoRef.current, 0, 0, ctx.canvas.width, ctx.canvas.height); //새로 그리기
    };
    // 이거 안하면 메모리 누수남
    const holisticRef = useRef<Holistic | null>(null);
    const cameraRef = useRef<Camera | null>(null);

    useEffect(() => {
        if (!videoRef.current) return;
        // holisticRef.current 없으면 새로 생성
        if (!holisticRef.current) {
            const holistic = new Holistic({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`,
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
        // 카메라 관련
        if (!cameraRef.current) {
            const camera = new Camera(videoRef.current, {
                onFrame: async () => {
                    await holisticRef.current?.send({ image: videoRef.current! });
                },
                width: 1280,
                height: 720,
            });
            camera.start();
            cameraRef.current = camera;
        }
        // 페이지 언마운트되면 정지
        return () => {
            cameraRef.current?.stop();
            holisticRef.current?.close();
        };
    }, []);


    return (
        <div>
            <video ref={videoRef} style={{ display: 'none' }} playsInline width={1280} height={720} />
            <canvas ref={canvasRef} width={1280} height={720} />
            <div style={{ padding: '1em' }}>
                {Object.entries(coords).map(([key, [x, y]]) => (
                    <div key={key}>
                        {key}: [{x}, {y}]
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MediapipeCanvas;
