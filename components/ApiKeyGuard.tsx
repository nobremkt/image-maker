
import React, { useState, useEffect } from 'react';

interface ApiKeyGuardProps {
  children: React.ReactNode;
}

const ApiKeyGuard: React.FC<ApiKeyGuardProps> = ({ children }) => {
  const [hasKey, setHasKey] = useState<boolean | null>(null);

  useEffect(() => {
    checkKey();
  }, []);

  const checkKey = async () => {
    // Rely on globally available aistudio which is of type AIStudio. 
    // Using type casting to avoid local declaration conflicts.
    const selected = await (window as any).aistudio.hasSelectedApiKey();
    setHasKey(selected);
  };

  const handleOpenSelect = async () => {
    // Rely on globally available aistudio which is of type AIStudio.
    // Using type casting to avoid local declaration conflicts.
    await (window as any).aistudio.openSelectKey();
    // Guideline: Assume successful selection after triggering openSelectKey due to race condition.
    setHasKey(true);
  };

  if (hasKey === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black p-6 text-center">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-10 max-w-md w-full shadow-2xl space-y-6">
          <div className="w-16 h-16 bg-indigo-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white">API Key Required</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            To use high-quality video (Veo) and image (Gemini 3 Pro) generation, you must select a paid API key from a GCP project with billing enabled.
          </p>
          <div className="bg-zinc-950 rounded-xl p-4 border border-zinc-800 text-left">
            <p className="text-xs text-zinc-500 mb-2">Requirements:</p>
            <ul className="text-xs text-zinc-400 space-y-1 list-disc pl-4">
              <li>Paid Google Cloud Project</li>
              <li>Billing documentation: <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">ai.google.dev/gemini-api/docs/billing</a></li>
            </ul>
          </div>
          <button
            onClick={handleOpenSelect}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20"
          >
            Select API Key
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ApiKeyGuard;
