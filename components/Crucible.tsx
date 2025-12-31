
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
    <div className="animate-in fade-in duration-700">
      <div className="mb-16 border-b border-border pb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-6xl font-bold tracking-tighter uppercase mb-4 leading-none">The Crucible</h2>
          <p className="text-sm text-dim max-w-lg font-mono uppercase tracking-widest">Democratic validation for sanctuary initiatives.</p>
        </div>
        <div className="text-left md:text-right p-6 brutalist-border bg-surface">
          <span className="text-[10px] font-mono text-dim uppercase block mb-1">Active Voting Impact</span>
          <span className="text-2xl font-bold font-mono tracking-tighter text-serene">{userWeight}X Power</span>
          <div className="mt-2 text-[8px] font-mono text-dim uppercase">Scale: 1.0 + (Aura/1000)</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {proposals.map(proposal => {
          const totalVotes = proposal.votes.for + proposal.votes.against;
          const forPercent = totalVotes > 0 ? Math.round((proposal.votes.for / totalVotes) * 100) : 0;
          const fundingPercent = Math.round((proposal.raised / proposal.target) * 100);
          const isPlaceholder = proposal.title.includes('[PLACEHOLDER]');

          return (
            <div key={proposal.id} className="brutalist-border bg-white flex flex-col group hover:shadow-2xl transition-all duration-500 relative">
              {isPlaceholder && (
                <div className="absolute top-0 left-0 bg-yellow-400 text-accent font-mono text-[8px] font-black px-4 py-1 uppercase z-20 shadow-sm">
                  Placeholder / Simulation
                </div>
              )}
              
              <div className="p-10 flex-1">
                <div className="flex justify-between items-start mb-8">
                  <span className={`text-[10px] font-mono border px-4 py-1.5 uppercase tracking-[0.2em] font-bold ${
                    proposal.status === 'active' ? 'border-serene text-serene bg-serene/5' : 'border-border text-dim'
                  }`}>
                    {proposal.status}
                  </span>
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-dim uppercase block mb-1">Goal</span>
                    <span className="font-bold text-xl tracking-tighter">{proposal.target} {proposal.currency}</span>
                  </div>
                </div>

                <h3 className="text-3xl font-bold uppercase tracking-tighter mb-6 group-hover:text-serene transition-colors leading-none">
                  {proposal.title.replace('[PLACEHOLDER] ', '')}
                </h3>
                <p className="text-base text-dim leading-relaxed mb-12 h-20 overflow-hidden line-clamp-3 italic">"{proposal.description}"</p>

                {/* Voting Bar */}
                <div className="space-y-3 mb-10">
                  <div className="flex justify-between text-[10px] font-mono uppercase tracking-[0.3em] text-dim">
                    <span>Validation Index</span>
                    <span className="text-accent font-bold">{forPercent}% Consensus</span>
                  </div>
                  <div className="h-1 bg-surface w-full overflow-hidden">
                    <div className="h-full bg-accent transition-all duration-1000" style={{ width: `${forPercent}%` }}></div>
                  </div>
                </div>

                {/* Funding Bar */}
                <div className="space-y-3">
                  <div className="flex justify-between text-[10px] font-mono uppercase tracking-[0.3em] text-dim">
                    <span>Funding Bridge</span>
                    <span className="text-serene font-bold">{fundingPercent}% Pledged</span>
                  </div>
                  <div className="h-2 bg-surface w-full overflow-hidden">
                    <div className="h-full bg-serene transition-all duration-1000" style={{ width: `${fundingPercent}%` }}></div>
                  </div>
                </div>
              </div>

              <div className="border-t border-border grid grid-cols-2">
                <button 
                  onClick={() => handleVote(proposal.id, 'for')}
                  className="py-6 font-mono text-[11px] font-bold uppercase tracking-widest border-r border-border hover:bg-surface transition-all flex flex-col items-center gap-1"
                >
                  Validate
                  <span className="text-[8px] text-serene opacity-60">+{userWeight} IMPACT</span>
                </button>
                <button 
                  onClick={() => handleVote(proposal.id, 'against')}
                  className="py-6 font-mono text-[11px] font-bold uppercase tracking-widest text-dim hover:bg-red-50 hover:text-red-500 transition-all flex flex-col items-center gap-1"
                >
                  Reject
                  <span className="text-[8px] opacity-40">VOID INTENT</span>
                </button>
              </div>

              <button className="w-full py-6 bg-accent text-white font-mono text-xs uppercase tracking-[0.4em] font-bold hover:bg-zinc-800 disabled:opacity-20 transition-all">
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
