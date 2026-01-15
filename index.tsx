
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Vercel/GitHub 배포 환경에서 API 키를 동적으로 주입하기 위한 폴리필
if (typeof window !== 'undefined') {
  const win = window as any;
  // process 객체가 없으면 생성
  if (!win.process) {
    win.process = { env: {} };
  }
  // process.env가 없으면 생성
  if (!win.process.env) {
    win.process.env = {};
  }
  
  // 로컬 스토리지에 저장된 키가 있다면 우선적으로 로드하여 환경변수에 주입
  try {
    const savedKey = localStorage.getItem('GEMINI_API_KEY');
    if (savedKey) {
      win.process.env.API_KEY = savedKey;
    }
  } catch (e) {
    console.warn("Local storage access failed", e);
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
