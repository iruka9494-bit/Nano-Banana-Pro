
import React, { useState, useEffect } from 'react';
import { X, Key, ShieldCheck, Zap, AlertCircle, RefreshCw, ExternalLink, ShieldAlert, CheckCircle2, ChevronRight } from 'lucide-react';
import { testApiKeyConnection } from '../services/geminiService';

interface KeyManagerModalProps {
  onClose: () => void;
  onKeyChange: () => void;
}

export const KeyManagerModal: React.FC<KeyManagerModalProps> = ({ onClose, onKeyChange }) => {
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const handleOpenSelect = async () => {
    try {
      await (window as any).aistudio.openSelectKey();
      onKeyChange(); // Notify parent that key might have changed
      setTestResult(null); // Reset test on change
    } catch (e) {
      console.error(e);
    }
  };

  const runDiagnostic = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testApiKeyConnection();
      setTestResult(result);
    } catch (e) {
      setTestResult({ success: false, message: "진단 중 예상치 못한 오류 발생", details: "네트워크 연결 상태를 확인해 주세요." });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-banana-500/10 rounded-lg">
              <ShieldCheck className="w-5 h-5 text-banana-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-none">외장 키 관리 센터</h2>
              <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">AI Studio Key Manager</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-blue-500/10 rounded-md mt-0.5">
                <Key className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-200">플랫폼 통합 보안 관리</p>
                <p className="text-xs text-slate-500 leading-relaxed mt-1">
                  API 키는 앱 내부에 저장되지 않으며, Google AI Studio 플랫폼의 외장 관리 시스템을 통해 안전하게 암호화되어 관리됩니다.
                </p>
              </div>
            </div>
          </div>

          {/* Diagnostic Result */}
          {testResult && (
            <div className={`p-4 rounded-xl border animate-fade-in ${testResult.success ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
              <div className="flex items-start gap-3">
                {testResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
                )}
                <div className="flex-1">
                  <p className={`text-sm font-bold ${testResult.success ? 'text-green-400' : 'text-red-400'}`}>
                    {testResult.message}
                  </p>
                  {testResult.details && (
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{testResult.details}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-1 gap-3">
            <button 
              onClick={handleOpenSelect}
              className="w-full flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-xl transition-all group"
            >
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-banana-500 group-hover:rotate-180 transition-transform duration-500" />
                <div className="text-left">
                  <p className="text-sm font-bold text-white">API 키 변경/연결</p>
                  <p className="text-[10px] text-slate-500">다른 결제 프로젝트 키 선택</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600 group-hover:translate-x-1 transition-transform" />
            </button>

            <button 
              onClick={runDiagnostic}
              disabled={isTesting}
              className={`w-full flex items-center justify-center p-4 rounded-xl font-bold text-sm transition-all gap-2 shadow-lg ${isTesting ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-banana-500 to-banana-600 text-slate-950 hover:scale-[1.02] active:scale-95 shadow-banana-500/20'}`}
            >
              {isTesting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
              실시간 연결 진단 수행
            </button>
          </div>

          {/* Billing Link */}
          <div className="pt-2 text-center">
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-banana-400 transition-colors"
            >
              결제 및 할당량 관리 <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
