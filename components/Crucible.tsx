import React, { useState, useEffect } from 'react';
import { FundraisingProposal } from '../types';
import { db } from '../services/db';

const Crucible: React.FC = () => {
  const [proposals, setProposals] = useState<FundraisingProposal[]>([]);
  const user = db.getUser({} as any);
  
  // Dynamic weight calculation
  const userWeight = parseFloat((1 + (user.auraScore / 1000)).toFixed(2));

  useEffect(() => {
    setProposals(db.getProposals());
  }, []);

  const handleVote = (id: string, type: 'for' | 'against') => {
    const updated = db.updateProposal(id, type, userWeight);
    setProposals(updated);
  };

  return (
    <div className="animate-in fade-in duration-700 px-2 sm:px-4">
      <div className="mb-10 sm:mb-16 border-b border-border pb-8 sm:pb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tighter uppercase mb-4 leading-none">The Crucible</h2>
          <p className="text-[10px] sm:text-sm text-dim max-w-lg font-mono uppercase tracking-widest font-bold">Democratic validation for initiatives.</p>
        </div>
        <div className="w-full sm:w-auto text-left md:text-right p-4 sm:p-6 brutalist-border bg-surface">
          <span className="text-[9px] sm:text-[10px] font-mono text-dim uppercase block mb-1 font-bold">Your Voting Impact</span>
          <span className="text-xl sm:text-2xl font-bold font-mono tracking-tighter text-serene">{userWeight}X Power</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12">
        {proposals.map(proposal => {
          const totalVotes = proposal.votes.for + proposal.votes.against;
          const forPercent = totalVotes > 0 ? Math.round((proposal.votes.for / totalVotes) * 100) : 0;
          const fundingPercent = Math.round((proposal.raised / proposal.target) * 100);
          const isPlaceholder = proposal.title.includes('[PLACEHOLDER]');

          return (
            <div key={proposal.id} className="brutalist-border bg-white flex flex-col group hover:shadow-2xl transition-all duration-500 relative">
              {isPlaceholder && (
                <div className="absolute top-0 left-0 bg-yellow-400 text-accent font-mono text-[7px] sm:text-[8px] font-black px-3 py-1 uppercase z-20 shadow-sm">
                  Simulation
                </div>
              )}
              
              <div className="p-6 sm:p-10 flex-1">
                <div className="flex justify-between items-start mb-6 sm:mb-8">
                  <span className={`text-[8px] sm:text-[10px] font-mono border px-3 py-1 sm:py-1.5 uppercase tracking-widest font-black ${
                    proposal.status === 'active' ? 'border-serene text-serene bg-serene/5' : 'border-border text-dim'
                  }`}>
                    {proposal.status}
                  </span>
                  <div className="text-right">
                    <span className="text-[8px] sm:text-[10px] font-mono text-dim uppercase block mb-1">Goal</span>
                    <span className="font-bold text-lg sm:text-xl tracking-tighter">{proposal.target} {proposal.currency}</span>
                  </div>
                </div>

                <h3 className="text-xl sm:text-3xl font-bold uppercase tracking-tighter mb-4 sm:mb-6 group-hover:text-serene transition-colors leading-none">
                  {proposal.title.replace('[PLACEHOLDER] ', '')}
                </h3>
                <p className="text-sm sm:text-base text-dim leading-relaxed mb-8 sm:mb-12 h-20 overflow-hidden line-clamp-3 italic">"{proposal.description}"</p>

                <div className="space-y-3 mb-8 sm:mb-10">
                  <div className="flex justify-between text-[8px] sm:text-[10px] font-mono uppercase tracking-widest text-dim font-bold">
                    <span>Validation</span>
                    <span className="text-accent">{forPercent}% Consensus</span>
                  </div>
                  <div className="h-1 bg-surface w-full overflow-hidden">
                    <div className="h-full bg-accent transition-all duration-1000" style={{ width: `${forPercent}%` }}></div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-[8px] sm:text-[10px] font-mono uppercase tracking-widest text-dim font-bold">
                    <span>Funding</span>
                    <span className="text-serene">{fundingPercent}% Pledged</span>
                  </div>
                  <div className="h-2 bg-surface w-full overflow-hidden">
                    <div className="h-full bg-serene transition-all duration-1000" style={{ width: `${fundingPercent}%` }}></div>
                  </div>
                </div>
              </div>

              <div className="border-t border-border grid grid-cols-2">
                <button 
                  onClick={() => handleVote(proposal.id, 'for')}
                  className="py-4 sm:py-6 font-mono text-[9px] sm:text-[11px] font-black uppercase tracking-widest border-r border-border hover:bg-surface transition-all flex flex-col items-center gap-1"
                >
                  Validate
                  <span className="text-[7px] sm:text-[8px] text-serene opacity-60">+{userWeight} IMPACT</span>
                </button>
                <button 
                  onClick={() => handleVote(proposal.id, 'against')}
                  className="py-4 sm:py-6 font-mono text-[9px] sm:text-[11px] font-black uppercase tracking-widest text-dim hover:bg-red-50 hover:text-red-500 transition-all flex flex-col items-center gap-1"
                >
                  Reject
                  <span className="text-[7px] sm:text-[8px] opacity-40">VOID</span>
                </button>
              </div>

              <button className="w-full py-5 sm:py-6 bg-accent text-white font-mono text-[10px] sm:text-xs uppercase tracking-[0.4em] font-black hover:bg-zinc-800 transition-all">
                Pledge Contribution
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Crucible;