
import React, { useState } from 'react';
import { Key, X, ShieldCheck, Check, Loader2, AlertCircle } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface KeyManagerModalProps {
  onClose: () => void;
  onKeyChange: () => void;
}

export const KeyManagerModal: React.FC<KeyManagerModalProps> = ({ onClose, onKeyChange }) => {
  const [keyInput, setKeyInput] = useState(process.env.API_KEY || '');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'none' | 'success' | 'fail'>('none');

  const handleTestConnection = async () => {
    if (!keyInput.trim()) return;
    setIsTesting(true);
    setTestResult('none');
    
    try {
      // 임시 인스턴스로 연결 테스트
      const ai = new GoogleGenAI({ apiKey: keyInput.trim() });
      await ai.models.generateContent({
        model: 'gemini-3-flash-lite-latest',
        contents: 'Hi',
      });
      setTestResult('success');
    } catch (e) {
      console.error(e);
      setTestResult('fail');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    const cleanKey = keyInput.trim();
    if (!cleanKey) {
      localStorage.removeItem('GEMINI_API_KEY');
      (window as any).process.env.API_KEY = '';
    } else {
      localStorage.setItem('GEMINI_API_KEY', cleanKey);
      (window as any).process.env.API_KEY = cleanKey;
    }
    onKeyChange();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#111827] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-[#111827]">
          <div className="flex items-center gap-2 text-pink-500 font-bold">
            <Key className="w-5 h-5" />
            <span>API Key 설정 (External)</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg text-slate-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <p className="text-slate-400 text-sm leading-relaxed">
            Google AI Studio에서 발급받은 API Key를 입력하세요.<br />
            키는 서버로 전송되지 않으며, 브라우저 로컬 스토리지에 암호화(난독화)되어 저장됩니다.
          </p>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">
              GOOGLE GEMINI API KEY
            </label>
            <div className="relative">
              <textarea
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="AIza..."
                className="w-full h-24 bg-black border border-slate-800 rounded-xl p-4 text-slate-200 placeholder-slate-700 focus:border-pink-500 outline-none transition-all resize-none font-mono text-sm"
              />
            </div>
          </div>

          {testResult === 'success' && (
            <div className="flex items-center gap-2 text-green-500 text-xs bg-green-500/10 p-3 rounded-lg border border-green-500/20">
              <Check className="w-4 h-4" /> 연결 테스트 성공! 유효한 API 키입니다.
            </div>
          )}
          {testResult === 'fail' && (
            <div className="flex items-center gap-2 text-red-500 text-xs bg-red-500/10 p-3 rounded-lg border border-red-500/20">
              <AlertCircle className="w-4 h-4" /> 연결 테스트 실패. 키를 확인해 주세요.
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleTestConnection}
              disabled={isTesting || !keyInput}
              className="flex-1 py-4 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm transition-all disabled:opacity-50"
            >
              {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              연결 테스트
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-4 bg-pink-600 hover:bg-pink-500 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-pink-600/20 active:scale-95"
            >
              저장 및 닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
