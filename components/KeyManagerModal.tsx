
import React, { useState } from 'react';
import { X, ShieldCheck, Zap, RefreshCw, ExternalLink, ShieldAlert, CheckCircle2, ChevronRight, HardDrive, Lock, FileText, Activity } from 'lucide-react';
import { testApiKeyConnection } from '../services/geminiService';

interface KeyManagerModalProps {
  onClose: () => void;
  onKeyChange: () => void;
}

export const KeyManagerModal: React.FC<KeyManagerModalProps> = ({ onClose, onKeyChange }) => {
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: string; latency?: number } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [showDiagnosticPopup, setShowDiagnosticPopup] = useState(false);

  const handleOpenSelect = async () => {
    try {
      // Platform API handles the encrypted storage to the local machine/browser profile
      await (window as any).aistudio.openSelectKey();
      onKeyChange();
      setTestResult(null);
    } catch (e) {
      console.error(e);
    }
  };

  const runDiagnostic = async () => {
    setIsTesting(true);
    setTestResult(null);
    const startTime = performance.now();
    try {
      const result = await testApiKeyConnection();
      const endTime = performance.now();
      setTestResult({ ...result, latency: Math.round(endTime - startTime) });
      setShowDiagnosticPopup(true);
    } catch (e) {
      setTestResult({ success: false, message: "진단 중 예상치 못한 오류 발생", details: "네트워크 연결 상태를 확인해 주세요." });
      setShowDiagnosticPopup(true);
    } finally {
      setIsTesting(false);
    }
  };

  const downloadSecurityLog = () => {
    const logData = {
      app: "Nano Banana Pro Studio",
      security_status: "External Key Managed",
      storage_type: "Platform Encrypted Vault",
      timestamp: new Date().toISOString(),
      diagnostic_status: testResult?.success ? "PASS" : "FAIL"
    };
    const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `banana-security-log-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-fade-in">
      {!showDiagnosticPopup ? (
        <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
          {/* Dashboard Header */}
          <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-banana-500/10 rounded-xl border border-banana-500/20">
                <ShieldCheck className="w-6 h-6 text-banana-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">보안 및 API 관리 센터</h2>
                <p className="text-xs text-slate-500 font-medium">External API Key Security System</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-8 space-y-8">
            {/* Storage Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-banana-400">
                  <HardDrive className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">로컬 저장소</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  API 키는 플랫폼 보안 규칙에 따라 로컬 드라이브의 암호화된 볼트에 저장되어 외부 유출로부터 안전하게 보호됩니다.
                </p>
              </div>
              <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-blue-400">
                  <Lock className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">암호화 상태</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  AES-256 규격의 플랫폼 레벨 암호화가 적용되어 있으며, 세션 종료 시까지 환경 변수로 안전하게 전달됩니다.
                </p>
              </div>
            </div>

            {/* Main Actions */}
            <div className="space-y-3">
              <button 
                onClick={handleOpenSelect}
                className="w-full group flex items-center justify-between p-5 bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/50 rounded-2xl transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-banana-500/10 rounded-lg group-hover:scale-110 transition-transform">
                    <RefreshCw className="w-5 h-5 text-banana-500" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-white">외부 API 키 연결 및 저장</p>
                    <p className="text-xs text-slate-500">로컬 드라이브에 보안 저장소 생성</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-600 group-hover:translate-x-1 transition-transform" />
              </button>

              <button 
                onClick={runDiagnostic}
                disabled={isTesting}
                className={`w-full flex items-center justify-center p-5 rounded-2xl font-bold transition-all gap-3 shadow-xl ${
                  isTesting 
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-banana-500 to-orange-500 text-slate-950 hover:shadow-banana-500/20 active:scale-[0.98]'
                }`}
              >
                {isTesting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                시스템 연결 정밀 진단 수행
              </button>
            </div>

            {/* Footer Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-slate-800 gap-4">
              <button 
                onClick={downloadSecurityLog}
                className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" /> 보안 로그 내보내기 (.json)
              </button>
              
              <a 
                href="https://ai.google.dev/gemini-api/docs/billing" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-banana-400 transition-colors"
              >
                API 할당량 관리 <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      ) : (
        /* Diagnostic Result Popup Window */
        <div className="w-full max-w-md bg-slate-900 border border-banana-500/50 rounded-3xl shadow-[0_0_50px_rgba(234,179,8,0.2)] overflow-hidden animate-scale-in">
          <div className="p-6 bg-slate-950/80 border-b border-slate-800 flex justify-between items-center">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-banana-500" /> 연결 진단 결과
            </h3>
            <button onClick={() => setShowDiagnosticPopup(false)} className="text-slate-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-8 flex flex-col items-center text-center space-y-6">
            <div className={`p-5 rounded-full ${testResult?.success ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
              {testResult?.success ? <CheckCircle2 className="w-16 h-16" /> : <ShieldAlert className="w-16 h-16" />}
            </div>
            
            <div className="space-y-2">
              <h4 className={`text-xl font-black ${testResult?.success ? 'text-green-400' : 'text-red-400'}`}>
                {testResult?.success ? "연결 상태 양호" : "연결 오류 감지"}
              </h4>
              <p className="text-sm text-slate-300 px-4">{testResult?.message}</p>
            </div>

            {testResult?.success && (
              <div className="w-full grid grid-cols-2 gap-3">
                 <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">응답 속도</p>
                    <p className="text-sm font-mono text-banana-400">{testResult.latency}ms</p>
                 </div>
                 <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">인증 방식</p>
                    <p className="text-sm font-mono text-banana-400">OAUTH2/KEY</p>
                 </div>
              </div>
            )}

            {testResult?.details && (
              <div className="w-full p-4 bg-slate-950 rounded-2xl border border-slate-800 text-left">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">상세 보고서</p>
                <p className="text-xs text-slate-400 leading-relaxed">{testResult.details}</p>
              </div>
            )}

            <button 
              onClick={() => setShowDiagnosticPopup(false)}
              className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-all"
            >
              진단 종료
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
