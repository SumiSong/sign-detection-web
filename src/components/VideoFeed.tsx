import React from 'react';

const VideoFeed: React.FC<{
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}> = ({ videoRef, canvasRef }) => (
  <>
    <video ref={videoRef} style={{ display: 'none' }} playsInline width={1280} height={720} />
    <canvas ref={canvasRef} width={1280} height={720} />
  </>
);

export default VideoFeed;