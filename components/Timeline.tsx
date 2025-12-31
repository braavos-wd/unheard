
import React, { useState } from 'react';
// Corrected import: BlogPulse was not exported from types, EchoEntry is the correct type.
import { EchoEntry } from '../types';

const Timeline: React.FC<{ pulses: EchoEntry[] }> = ({ pulses }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const expandedPulse = pulses.find(p => p.id === expandedId);

  return (
    <div className="relative pl-8 sm:pl-16">
      <div className="chronos-line"></div>
      
      <div className="space-y-16">
        {pulses.map((pulse) => (
          <div key={pulse.id} className="relative">
            <div className="pulse-dot"></div>
            
            <div 
              onClick={() => setExpandedId(pulse.id)}
              className="brutalist-border bg-white p-8 cursor-pointer group"
            >
              <div className="flex items-center gap-4 mb-3">
                <span className="text-[10px] font-mono text-dim uppercase">{pulse.authorName}</span>
                <span className="text-border">|</span>
                <span className="text-[10px] font-mono text-dim uppercase">{new Date(pulse.timestamp).toLocaleDateString()}</span>
              </div>
              
              <h2 className="text-2xl font-bold uppercase tracking-tighter mb-4 group-hover:text-serene transition-colors">
                {pulse.title}
              </h2>
              
              <p className="text-sm text-dim leading-relaxed line-clamp-2 max-w-xl">
                {pulse.content}
              </p>

              <footer className="mt-8 pt-4 border-t border-border flex items-center gap-8 text-[10px] font-mono text-dim uppercase tracking-widest">
                <span className="flex items-center gap-2">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  {pulse.stats.reads} Readings
                </span>
                <span className="flex items-center gap-2">
                   <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                   {pulse.stats.likes} Support
                </span>
              </footer>
            </div>
          </div>
        ))}
      </div>

      {expandedId && expandedPulse && (
        <div className="reflection-expanded animate-in slide-in-from-bottom duration-300">
           <button 
             onClick={() => setExpandedId(null)}
             className="fixed top-8 right-8 text-dim hover:text-accent font-mono text-xs uppercase tracking-tighter"
           >
             [ Exit Reflection ]
           </button>
           
           <article className="max-w-2xl mx-auto">
             <header className="mb-12">
               <span className="text-xs font-mono text-serene uppercase tracking-widest mb-4 block">Author: {expandedPulse.authorName}</span>
               <h1 className="text-5xl font-bold uppercase tracking-tighter leading-[0.9] mb-8">
                 {expandedPulse.title}
               </h1>
               <div className="h-1 w-24 bg-accent"></div>
             </header>

             <div className="prose prose-zinc max-w-none text-lg leading-relaxed text-accent/80 whitespace-pre-wrap font-sans">
               {expandedPulse.content}
             </div>

             <section className="mt-20 pt-10 border-t border-border">
                <h3 className="font-mono text-xs uppercase tracking-widest mb-6">Supportive Presence</h3>
                <div className="flex gap-4">
                  <button className="flex-1 py-4 border border-accent hover:bg-accent hover:text-white transition-all font-mono text-xs uppercase">
                    Like Reflection
                  </button>
                  <button className="flex-1 py-4 border border-border hover:border-serene text-serene font-mono text-xs uppercase">
                    Listen (AI Narrator)
                  </button>
                </div>
             </section>
           </article>
        </div>
      )}
    </div>
  );
};

export default Timeline;
