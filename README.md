# Mediapipe Coordinate Sender

웹캠을 통해 실시간으로 얼굴, 포즈, 양손의 키포인트를 추출하고, 해당 좌표를 Flask 서버로 주기적으로 전송하는 React + MediaPipe 기반 프로젝트입니다.

## 주요 기능

- **MediaPipe Holistic**을 활용한 얼굴 / 포즈 / 손 좌표 추출
- 실시간 영상에서 keypoint 좌표 시각화 (캔버스 렌더링)
- 버튼 클릭으로 좌표 전송 시작 / 중지 제어
- `axios`로 Flask 서버에 30ms 간격으로 좌표 데이터 전송
- `1280x720`, `60fps`로 제한된 웹캠 스트리밍

---

## 프로젝트 구조
App.tsx # 루트
MediapipeCanvas.tsx # 메인 컴포넌트
VideoFeed.tsx # 비디오 + 캔버스 렌더링
CoordinateDisplay.tsx # 좌표 텍스트 출력
useHolisticCamera.ts # MediaPipe 처리 및 전송
types.ts # 좌표 타입 정의

## 설치 및 실행

```bash
npm update
npm run dev
```

⚠️ 서버는 로컬 Flask 백엔드가 http://localhost:5000/ai/keypoints 엔드포인트를 갖고 있어야 합니다.

- React 19

- TypeScript

- MediaPipe Holistic

- Axios

- HTML5 Webcam API (getUserMedia)

- Canvas API

## 전송 데이터 예시
```json
{
  "coords": {
    "face_keypoints_2d": [123, 456],
    "pose_keypoints_2d": [789, 321],
    "hand_left_keypoints_2d": [100, 200],
    "hand_right_keypoints_2d": [300, 400]
  }
}
```
