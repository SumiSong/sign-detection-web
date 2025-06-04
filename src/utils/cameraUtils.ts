import { Camera } from "@mediapipe/camera_utils";
import type { Hands } from "@mediapipe/hands";

const setCamera = (video:HTMLVideoElement, hands:Hands, width:number, height:number) => {
    const camera = new Camera(video, {onFrame: ()=>onFrame(hands, video), width: width, height:height});
    camera.start();
    return camera;
}
let isProcessing = false;
const onFrame = async (hands: Hands, video:HTMLVideoElement) => {
    if(isProcessing) return;
    isProcessing = true;
    await hands.send({image:video});
    isProcessing = false;
}

export default setCamera;