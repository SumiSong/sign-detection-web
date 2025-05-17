export function drawKeypoints(results, canvas, video) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const draw = (landmarks, color) => {
    if (!landmarks) return;
    ctx.fillStyle = color;
    for (let i = 0; i < landmarks.length; i++) {
      const x = landmarks[i].x * canvas.width;
      const y = landmarks[i].y * canvas.height;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fill();
    }
  };

  draw(results.poseLandmarks, 'red');
  draw(results.faceLandmarks, 'green');
  draw(results.leftHandLandmarks, 'blue');
  draw(results.rightHandLandmarks, 'purple');
}
