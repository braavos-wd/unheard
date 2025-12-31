
import React from 'react';
import { FundraisingProposal } from '../types';

interface Props {
  initiatives: FundraisingProposal[];
}

const ArchiveView: React.FC<Props> = ({ initiatives }) => {
  const funded = initiatives.filter(i => i.status === 'funded' || i.raised >= i.target);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <header className="mb-20 text-center">
        <span className="font-mono text-[10px] uppercase tracking-[0.8em] text-serene block mb-4">The Hall of Resonance</span>
        <h2 className="text-7xl font-bold uppercase tracking-tighter leading-none mb-6">Archive of <br/> the Unheard</h2>
        <p className="text-dim font-mono text-xs uppercase tracking-widest max-w-xl mx-auto">Tangible manifestations of collective intent. Initiatives that the city tried to ignore, but the sanctuary made real.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1px bg-border brutalist-border">
        {funded.length === 0 ? (
          <div className="col-span-full p-32 bg-white text-center">
             <p className="font-mono text-sm text-dim uppercase italic">No initiatives have ascended yet. The Crucible awaits your validation.</p>
          </div>
        ) : (
          funded.map(item => (
            <div key={item.id} className="bg-white p-12 group hover:bg-accent hover:text-white transition-all cursor-crosshair">
              <div className="flex justify-between items-start mb-8">
                <span className="text-[9px] font-mono border border-current px-3 py-1 uppercase tracking-widest">Ascended</span>
                <span className="text-[9px] font-mono opacity-50 uppercase tracking-widest">Est. {new Date().getFullYear()}</span>
              </div>
              <h3 className="text-3xl font-bold uppercase tracking-tighter mb-6 leading-none">{item.title}</h3>
              <p className="text-sm font-sans leading-relaxed mb-12 opacity-70 italic">"{item.description}"</p>
              
              <div className="space-y-4">
                 <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest">
                   <span>Resonance Depth</span>
                   <span className="text-serene font-bold">100% Manifested</span>
                 </div>
                 <div className="h-0.5 bg-current/10 w-full">
                   <div className="h-full bg-serene w-full"></div>
                 </div>
              </div>

              <button className="mt-12 w-full py-4 border border-current font-mono text-[10px] uppercase tracking-[0.3em] hover:bg-white hover:text-accent transition-all">
                View Manifest
              </button>
            </div>
          ))
        )}
      </div>

      <footer className="mt-32 p-16 brutalist-border border-dashed text-center bg-surface">
         <h4 className="text-xl font-bold uppercase tracking-tighter mb-4">Total Manifested Wealth</h4>
         <div className="text-5xl font-bold font-mono text-accent">
           {funded.reduce((acc, i) => acc + i.raised, 0).toLocaleString()} <span className="text-sm opacity-50">CRED</span>
         </div>
      </footer>
    </div>
  );
};

export default ArchiveView;
