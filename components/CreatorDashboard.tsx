
import React, { useState } from 'react';
// Corrected import: BlogPulse was not exported from types, EchoEntry is the correct type.
import { User, EchoEntry } from '../types';
import { geminiService } from '../services/gemini';

interface Props {
  user: User;
  onPublish: (pulse: EchoEntry) => void;
}

const CreatorDashboard: React.FC<Props> = ({ user, onPublish }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [draft, setDraft] = useState({ title: '', content: '' });

  const handleRecord = async () => {
    if (isRecording) {
      setIsRecording(false);
      setIsProcessing(true);
      // Simulate recording and sending to Gemini
      setTimeout(async () => {
        const result = await geminiService.transcribeAndFormat("fake-audio-data");
        setDraft(result);
        setIsProcessing(false);
      }, 2000);
    } else {
      setIsRecording(true);
    }
  };

  const publish = () => {
    if (!draft.title || !draft.content) return;
    const pulse: EchoEntry = {
      id: `p-${Date.now()}`,
      authorId: user.id,
      authorName: user.name,
      title: draft.title,
      content: draft.content,
      timestamp: Date.now(),
      stats: { reads: 0, plays: 0, likes: 0 },
      comments: []
    };
    onPublish(pulse);
    setDraft({ title: '', content: '' });
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="brutalist-card p-8 mb-8 border-dashed">
        <h3 className="text-sm font-mono text-dim uppercase mb-6 tracking-widest text-center">Capture Aura Pulse</h3>
        
        <div className="flex justify-center gap-8 mb-12">
          <button 
            onClick={handleRecord}
            className={`w-24 h-24 rounded-full border flex flex-col items-center justify-center transition-all ${
              isRecording ? 'border-red-600 bg-red-600/10' : 'border-zinc-700 hover:border-accent'
            }`}
          >
            <div className={`w-8 h-8 ${isRecording ? 'bg-red-600 rounded-sm scale-75 animate-pulse' : 'bg-white rounded-full'}`}></div>
            <span className="text-[8px] font-mono uppercase mt-2 tracking-tighter">
              {isRecording ? 'STOP' : 'VOICE'}
            </span>
          </button>

          <div className="w-px h-24 bg-zinc-900"></div>

          <button className="w-24 h-24 border border-zinc-700 hover:border-accent flex flex-col items-center justify-center transition-all">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span className="text-[8px] font-mono uppercase mt-2 tracking-tighter">UPLOAD</span>
          </button>
        </div>

        {isProcessing && (
          <div className="text-center font-mono text-[10px] text-accent animate-pulse uppercase">
            Gemini is distilling your voice into an Aura...
          </div>
        )}

        <div className="space-y-6 mt-8">
          <input 
            type="text"
            placeholder="PULSE TITLE..."
            value={draft.title}
            onChange={(e) => setDraft({...draft, title: e.target.value})}
            className="w-full bg-transparent border-b border-zinc-800 py-2 font-mono text-lg outline-none focus:border-accent transition-colors uppercase"
          />
          <textarea 
            placeholder="YOUR THOUGHTS..."
            rows={8}
            value={draft.content}
            onChange={(e) => setDraft({...draft, content: e.target.value})}
            className="w-full bg-transparent border-b border-zinc-800 py-2 font-sans outline-none focus:border-accent transition-colors resize-none"
          />
          <button 
            onClick={publish}
            disabled={!draft.title}
            className="w-full py-4 border border-accent text-accent font-mono uppercase tracking-widest hover:bg-white hover:text-black transition-all disabled:opacity-20"
          >
            Broadcast to Chronos
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreatorDashboard;
