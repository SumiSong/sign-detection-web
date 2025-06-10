# 🤟 Hand Gesture Sign Language Translator

> MediaPipe와 React를 이용한 실시간 수어 인식 및 데이터 수집 프로젝트

## 📁 프로젝트 구조

이 프로젝트는 손 제스처를 기반으로 **실시간 수어 예측**을 수행하며, 학습 데이터를 손쉽게 **녹화 및 JSON으로 저장**할 수 있는 기능도 함께 제공합니다.

- `/submit` : 실시간 수어 데이터를 AI 서버로 전송하여 예측 결과를 받아오는 페이지
- `/` : 손 좌표 데이터를 수집하여 JSON 파일로 저장할 수 있는 데이터 생성 페이지

---

## 🚀 주요 기능

### 1. 실시간 수어 예측 (`/submit`)
- MediaPipe Hands를 통해 손 좌표 실시간 추출
- 좌표 데이터를 `POST /ai/predict` 로 전송
- 서버에서 응답받은 예측 결과를 화면에 표시
- `/health` 엔드포인트를 통해 서버 상태 사전 확인

### 2. 수어 학습용 데이터 생성 (`/`)
- 녹화 시작 타이머 및 프레임 수 지정 기능
- 최대 프레임 수 만큼 좌표 자동 기록
- 기록된 데이터는 JSON 형식으로 다운로드 가능

---

## 🧠 사용 기술

- **React 18**
- **MediaPipe Hands (via @mediapipe/hands)**
- **TypeScript**
- **Axios**
- **React Router v6**
- **CSS Module**

---

## ⚙️ 설치 및 실행 방법

```bash
# 1. 리포지토리 클론
git clone https://github.com/your-id/your-repo.git
cd your-repo

# 2. 의존성 설치
npm update

# 3. 실행
npm run dev
