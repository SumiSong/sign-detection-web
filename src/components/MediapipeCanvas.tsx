import React, { useRef, useState } from 'react';
import VideoFeed from './VideoFeed';
import CoordinateDisplay from './CoordinateDisplay';
import type { CoordsMap } from '../type';
import useHolisticCamera from '../utils/useHolisticCamera';

const MediapipeCanvas: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [coords, setCoords] = useState<CoordsMap>({
    face_keypoints_2d: [0, 0],
    pose_keypoints_2d: [0, 0],
    hand_left_keypoints_2d: [0, 0],
    hand_right_keypoints_2d: [0, 0],
  });
  const [isSendDataReady, setIsSendDataReady] = useState(false);

  useHolisticCamera(videoRef, canvasRef, coords, setCoords, isSendDataReady);

  return (
    <div>
      <button onClick={() => setIsSendDataReady(!isSendDataReady)}>
        {isSendDataReady ? '전송 중지' : '서버 전송 시작'}
      </button>
      <VideoFeed videoRef={videoRef} canvasRef={canvasRef} />
      <CoordinateDisplay coords={coords} />
    </div>
  );
};

export default MediapipeCanvas;
