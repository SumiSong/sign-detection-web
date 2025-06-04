import { Hands } from "@mediapipe/hands";

const setHands = () => {
    const hands = new Hands({locateFile: (f)=>`https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`})
    hands.setOptions({maxNumHands:2, modelComplexity:1, selfieMode:false});
    return hands;
}

export default setHands;