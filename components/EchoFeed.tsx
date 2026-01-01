import React, { useState, useRef } from 'react';
import { EchoEntry, User, Comment } from '../types';
import { geminiService } from '../services/gemini';
import { db } from '../services/db';

interface Props {
  echoes: EchoEntry[];
  currentUser: User;
  onFollow: (authorId: string) => void;
}

const EchoFeed: React.FC<Props> = ({ echoes, currentUser, onFollow }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isNarrating, setIsNarrating] = useState(false);
  const [pulseText, setPulseText] = useState('');
  const audioCtx = useRef<AudioContext | null>(null);
  const currentSource = useRef<AudioBufferSourceNode | null>(null);

  const expandedEcho = echoes.find(e => e.id === expandedId);

  const handleListen = async (text: string) => {
    if (isNarrating) {
      currentSource.current?.stop();
      setIsNarrating(false);
      return;
    }

    setIsNarrating(true);
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    try {
      const source = await geminiService.playSpeech(text, audioCtx.current);
      if (source) {
        currentSource.current = source;
        source.onended = () => setIsNarrating(false);
      }
    } catch (err) {
      console.error("Speech playback failed", err);
      setIsNarrating(false);
    }
  };

  const handleSendPulse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pulseText.trim() || !expandedEcho) return;

    const newPulse: Comment = {
      id: `c-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      text: pulseText,
      timestamp: Date.now(),
      likes: 0
    };

    db.addComment(expandedEcho.id, newPulse);
    setPulseText('');
  };

  const closeEcho = () => {
    currentSource.current?.stop();
    setIsNarrating(false);
    setExpandedId(null);
  };

  return (
    <div className="max-w-2xl mx-auto px-2">
      <div className="space-y-6 sm:space-y-12">
        {echoes.map((echo) => {
          const isFollowing = currentUser.following?.includes(echo.authorId);
          return (
            <div 
              key={echo.id}
              onClick={() => setExpandedId(echo.id)}
              className="brutalist-border bg-white p-6 sm:p-10 cursor-pointer group hover:bg-surface transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[9px] sm:text-[10px] font-mono text-dim uppercase tracking-widest">
                  <span className="font-bold text-accent">{echo.authorName}</span>
                  {isFollowing && <span className="text-serene font-bold hidden sm:inline">[ RESONANCE BOND ]</span>}
                  <span className="hidden sm:inline">•</span>
                  <span>{new Date(echo.timestamp).toLocaleDateString()}</span>
                </div>
                {echo.authorId !== currentUser.id && echo.authorId !== 'system' && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onFollow(echo.authorId); }}
                    className={`text-[8px] font-mono uppercase tracking-widest border px-2 py-1 transition-all ${
                      isFollowing ? 'bg-serene text-white border-serene' : 'border-dim text-dim hover:border-accent hover:text-accent'
                    }`}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                )}
              </div>
              
              <h2 className="text-xl sm:text-3xl font-bold uppercase tracking-tighter mb-4 sm:mb-6 group-hover:text-serene transition-colors leading-none">
                {echo.title}
              </h2>
              
              <p className="text-sm text-dim leading-relaxed line-clamp-3">
                {echo.content}
              </p>

              <footer className="mt-6 sm:mt-10 pt-4 sm:pt-6 border-t border-border flex items-center gap-6 sm:gap-10 text-[9px] sm:text-[10px] font-mono text-dim uppercase tracking-widest">
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  {echo.stats.reads}
                </span>
                <span className="flex items-center gap-1.5">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                   {echo.comments?.length || 0}
                </span>
              </footer>
            </div>
          );
        })}
      </div>

      {expandedId && expandedEcho && (
        <div className="fixed inset-0 z-[1000] bg-white overflow-y-auto animate-in fade-in duration-300">
           <div className="max-w-3xl mx-auto px-6 py-12 sm:py-20">
             <button 
               onClick={(e) => { e.stopPropagation(); closeEcho(); }}
               className="fixed top-6 right-6 sm:top-8 sm:right-8 text-dim hover:text-accent font-mono text-[10px] uppercase tracking-tighter z-[1001] bg-white/80 p-2 border border-border sm:border-transparent"
             >
               [ Close Echo ]
             </button>
             
             <article>
               <header className="mb-10 sm:mb-16 border-l-4 sm:border-l-8 border-accent pl-4 sm:pl-8">
                 <div className="flex items-center gap-4 text-[10px] sm:text-xs font-mono text-serene uppercase tracking-widest mb-4">
                   <span>Journey Log: {expandedEcho.authorName}</span>
                 </div>
                 <h1 className="text-3xl sm:text-6xl font-bold uppercase tracking-tighter leading-tight sm:leading-[0.85] mb-6 sm:mb-8 break-words">
                   {expandedEcho.title}
                 </h1>
                 <div className="text-[10px] font-mono text-dim uppercase">
                   Published {new Date(expandedEcho.timestamp).toLocaleTimeString()} • {Math.ceil(expandedEcho.content.split(' ').length / 200)} min read
                 </div>
               </header>

               <div className="prose prose-zinc prose-lg sm:prose-xl max-w-none text-accent/90 whitespace-pre-wrap font-sans leading-relaxed mb-20 sm:mb-32">
                 {expandedEcho.content}
               </div>

               <section className="mt-20 pt-10 sm:pt-16 border-t-2 border-accent">
                  <div className="flex items-center justify-between mb-8 sm:mb-10">
                    <h3 className="font-mono text-[10px] sm:text-xs uppercase tracking-widest text-dim font-bold">Community Resonance</h3>
                    {isNarrating && (
                      <div className="flex gap-1 items-end h-4">
                        {[0,1,2,1,0].map((h, i) => (
                          <div key={i} className="w-1 bg-serene animate-pulse" style={{ height: `${(h+1)*25}%`, animationDelay: `${i*0.1}s` }}></div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-12 sm:mb-16">
                    <button className="py-4 sm:py-6 border-2 border-accent hover:bg-accent hover:text-white transition-all font-mono text-xs sm:text-sm uppercase tracking-widest font-bold">
                      Echo Support
                    </button>
                    <button 
                      onClick={() => handleListen(expandedEcho.content)}
                      className={`py-4 sm:py-6 border-2 transition-all font-mono text-xs sm:text-sm uppercase tracking-widest font-bold ${
                        isNarrating ? 'bg-serene text-white border-serene' : 'border-border hover:border-serene text-serene'
                      }`}
                    >
                      {isNarrating ? 'Stop Narrator' : 'Listen to Journey'}
                    </button>
                  </div>

                  <form onSubmit={handleSendPulse} className="mb-12 sm:mb-20">
                     <div className="relative group">
                        <input 
                          type="text"
                          value={pulseText}
                          onChange={(e) => setPulseText(e.target.value)}
                          placeholder="Send an anonymous support pulse..."
                          className="w-full bg-surface border-b-2 border-border p-4 sm:p-6 font-sans text-base sm:text-lg outline-none focus:border-serene transition-all"
                        />
                        <button 
                          type="submit"
                          className="absolute right-3 bottom-3 sm:right-4 sm:bottom-4 p-2 text-serene hover:text-accent transition-colors"
                        >
                           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                        </button>
                     </div>
                  </form>

                  <div className="space-y-4 sm:space-y-8 pb-20">
                    {expandedEcho.comments?.map(comment => (
                      <div key={comment.id} className="brutalist-border p-4 sm:p-8 bg-surface/50">
                        <div className="flex justify-between items-start mb-2 sm:mb-3">
                          <span className="text-[8px] sm:text-[10px] font-mono text-serene uppercase tracking-widest font-bold">Bonded Soul</span>
                          <span className="text-[8px] sm:text-[9px] font-mono text-dim uppercase">{new Date(comment.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-xs sm:text-sm text-accent italic">"{comment.text}"</p>
                      </div>
                    ))}
                  </div>
               </section>
             </article>
           </div>
        </div>
      )}
    </div>
  );
};

export default EchoFeed;