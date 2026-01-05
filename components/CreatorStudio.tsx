import React, { useState, useRef } from 'react';
import { User, EchoEntry } from '../types';
import { geminiService } from '../services/gemini';
import { GoogleGenerativeAI } from "@google/generative-ai";

interface Props {
  user: User;
  onPublish: (e: EchoEntry) => void;
}

const CreatorStudio: React.FC<Props> = ({ user, onPublish }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [ritualPrompt, setRitualPrompt] = useState<string | null>(null);
  const [isGuiding, setIsGuiding] = useState(false);
  
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrame = useRef<number>(0);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks.current = [];
      mediaRecorder.current = new MediaRecorder(stream);
      
      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = async () => {
        setIsProcessing(true);
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1];
          const result = await geminiService.transcribeAndFormat(base64);
          setTitle(result.title);
          setContent(result.content);
          setIsProcessing(false);
        };
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      visualize(stream);
    } catch (err) {
      console.error("Mic access denied", err);
    }
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setIsRecording(false);
    if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
  };

  const visualize = (stream: MediaStream) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const draw = () => {
      animationFrame.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        ctx.fillStyle = `rgba(59, 130, 246, ${dataArray[i] / 255})`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };
    draw();
  };

  const getGuidePrompt = async () => {
    if (!content && !title) {
      setRitualPrompt("Start writing first, and I will mirror your thoughts.");
      return;
    }
    
    setIsGuiding(true);
    
    try {
      const apiKey = process.env.VITE_GOOGLE_API_KEY || '';
      const ai = new GoogleGenerativeAI(apiKey);
      const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const prompt = `User is writing a reflection: "${title} ${content}". 
      Act as a Zen Sanctuary Guide. Provide one short, soulful ritualistic prompt (max 20 words) 
      that helps them deepen this reflection. Avoid cliches.`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      setRitualPrompt(text || "Breathe. Your words have weight.");
    } catch (e) {
      console.error("Error generating guide prompt:", e);
      setRitualPrompt("Breathe. Your words have weight.");
    } finally {
      setIsGuiding(false);
    }
  };

  const publish = () => {
    if (!title || !content) return;
    onPublish({
      id: `e-${Date.now()}`,
      authorId: user.id,
      authorName: user.name,
      title,
      content,
      timestamp: Date.now(),
      stats: { reads: 0, plays: 0, likes: 0 },
      comments: []
    });
    setTitle('');
    setContent('');
    setRitualPrompt(null);
  };

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500 px-2 sm:px-4">
      <div className="flex flex-col lg:flex-row gap-8 sm:gap-12 mb-20 sm:mb-0">
        <div className="flex-1">
          <div className="mb-8 sm:mb-16">
            <h2 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tighter uppercase leading-none mb-4">Reflect</h2>
            <p className="text-[10px] sm:text-sm text-dim max-w-md font-mono uppercase tracking-widest font-bold">Voice-to-Resonance bridge active.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-12">
            <button 
              onClick={isRecording ? stopRecording : startRecording}
              className={`h-32 sm:h-48 brutalist-border relative overflow-hidden flex flex-col items-center justify-center gap-4 sm:gap-6 transition-all ${
                isRecording ? 'bg-serene/5 border-serene shadow-[0_0_30px_rgba(59,130,246,0.1)]' : 'bg-white hover:bg-surface'
              }`}
            >
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-30 pointer-events-none" />
              <div className={`w-8 h-8 sm:w-12 sm:h-12 border-2 rounded-full flex items-center justify-center relative z-10 ${isRecording ? 'border-serene animate-pulse' : 'border-accent'}`}>
                <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full ${isRecording ? 'bg-serene' : 'bg-accent'}`}></div>
              </div>
              <span className="font-mono text-[8px] sm:text-[10px] uppercase tracking-widest font-bold relative z-10">
                {isRecording ? 'Capturing...' : 'Voice Capture'}
              </span>
            </button>

            <div className="hidden md:flex brutalist-border bg-white p-6 sm:p-8 flex-col justify-center">
              <span className="text-[10px] font-mono text-dim uppercase mb-4 tracking-widest font-bold">Studio Atmosphere</span>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {['Quietude', 'Clarity', 'Raw Intensity', 'Healing'].map(m => (
                  <button key={m} className="py-2 border border-border font-mono text-[8px] sm:text-[9px] uppercase hover:border-accent transition-colors">
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6 sm:space-y-8 bg-white p-6 sm:p-12 brutalist-border relative">
            {isProcessing && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-md z-10 flex flex-col items-center justify-center text-center p-6">
                 <div className="w-10 h-10 sm:w-16 sm:h-16 border-4 border-serene border-t-transparent animate-spin rounded-full mb-6"></div>
                 <h4 className="text-lg sm:text-xl font-bold uppercase tracking-tighter mb-2">Distilling Frequency</h4>
                 <p className="font-mono text-[8px] sm:text-[10px] uppercase tracking-widest text-dim font-bold">Translating truth...</p>
              </div>
            )}

            <input 
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Reflective Title..."
              className="w-full bg-transparent text-xl sm:text-3xl font-bold uppercase tracking-tighter border-b-2 border-border pb-4 sm:pb-6 focus:border-accent outline-none transition-all placeholder:text-zinc-100"
            />
            
            <textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Speak your truth..."
              className="w-full bg-transparent text-base sm:text-xl font-sans leading-relaxed min-h-[300px] sm:min-h-[400px] outline-none resize-none"
            />

            <div className="pt-6 sm:pt-10 flex flex-col sm:flex-row justify-between items-center gap-6">
              <button 
                onClick={getGuidePrompt}
                className="w-full sm:w-auto font-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-serene font-black flex items-center justify-center gap-2 border-b border-serene sm:border-transparent"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                Ritual Guidance
              </button>
              <button 
                onClick={publish}
                disabled={!title || !content}
                className="w-full sm:w-auto px-10 sm:px-16 py-4 sm:py-5 bg-accent text-white font-mono text-[10px] sm:text-xs uppercase tracking-[0.3em] font-bold hover:bg-zinc-800 transition-all disabled:opacity-10 shadow-xl"
              >
                Publish Echo
              </button>
            </div>
          </div>
        </div>

        <div className="lg:w-80 pt-0 lg:pt-16">
           <div className="brutalist-border p-6 sm:p-10 bg-surface lg:sticky lg:top-32">
              <h3 className="text-[10px] font-mono uppercase tracking-[0.3em] mb-6 sm:mb-8 border-b border-border pb-4 font-black text-accent">Sanctuary Mirror</h3>
              
              {ritualPrompt ? (
                <div className="animate-in fade-in slide-in-from-top-4">
                  <p className="text-xs sm:text-sm italic text-accent leading-relaxed mb-8">
                    "{ritualPrompt}"
                  </p>
                  <button 
                    onClick={() => setRitualPrompt(null)}
                    className="text-[8px] sm:text-[9px] font-mono uppercase tracking-widest text-serene font-black border-b border-serene"
                  >
                    Acknowledged
                  </button>
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-6 text-[9px] sm:text-xs text-dim leading-relaxed font-mono uppercase tracking-widest font-bold">
                   {isGuiding ? (
                     <div className="animate-pulse">Consulting the deep archives...</div>
                   ) : (
                     <>
                       <p>Urban silence is a choice.</p>
                       <p>Voice capture strengthens resonance.</p>
                       <p>Aura: +10 on publish.</p>
                     </>
                   )}
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default CreatorStudio;