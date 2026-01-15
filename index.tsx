
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log("Index.tsx loaded. Initializing...");

// Vercel/GitHub 배포 환경에서 API 키를 동적으로 주입하기 위한 폴리필 (2차 안전장치)
if (typeof window !== 'undefined') {
  const win = window as any;
  if (!win.process) win.process = { env: {} };
  if (!win.process.env) win.process.env = {};
  
  // 로컬 스토리지에 저장된 키가 있다면 우선적으로 로드하여 환경변수에 주입
  try {
    const savedKey = localStorage.getItem('GEMINI_API_KEY');
    if (savedKey) {
      console.log("Restoring API Key from storage...");
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

try {
  console.log("Creating React Root...");
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log("React Render triggered.");
} catch (err) {
  console.error("Critical Render Error:", err);
  rootElement.innerHTML = `
    <div style="height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#020617; color:#f87171; text-align:center; padding:20px;">
      <h1 style="font-size:24px; margin-bottom:16px;">Application Error</h1>
      <p>Failed to initialize application.</p>
      <p style="font-size:12px; color:#666; margin-top:10px;">See console for details.</p>
    </div>
  `;
}
