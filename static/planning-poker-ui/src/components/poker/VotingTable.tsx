import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Eye, RotateCcw, Check } from 'lucide-react';
import { Card } from '../ui/card';
import { motion, AnimatePresence } from 'motion/react';

interface Participant {
  id: string; // This should map to accountId
  name: string;
  avatar: string;
  accountId: string;
  connectionStatus?: 'online' | 'away' | 'offline';
}

interface VotingTableProps {
  votes: Record<string, string>;
  isRevealed: boolean;
  onReveal: () => void;
  finalEstimate: string | null;
  onSubmitEstimate: (val: string) => void;
  participants?: Participant[];
  isModerator?: boolean;
}

export function VotingTable({ votes, isRevealed, onReveal, finalEstimate, onSubmitEstimate, participants = [], isModerator = false }: VotingTableProps) {
  // Calculate stats if revealed
  const voteValues = Object.values(votes).filter(v => v !== '?' && v !== '☕').map(Number);
  const average = voteValues.length ? (voteValues.reduce((a, b) => a + b, 0) / voteValues.length).toFixed(1) : 0;
  
  const agreement = voteValues.every(v => v === voteValues[0]) && voteValues.length > 0;
  const [manualEstimate, setManualEstimate] = React.useState('');

  return (
    <div className="flex flex-col items-center w-full max-w-3xl gap-12">
      
      {/* Table Surface */}
      <div className="relative w-full aspect-[2/1] max-h-[300px] bg-indigo-50/50 rounded-full border-4 border-indigo-100 flex items-center justify-center">
        
        {/* Center Action / Result */}
        <div className="z-10 text-center">
          {!isRevealed ? (
            <div className="space-y-4">
              <div className="text-4xl font-bold text-indigo-900/20 tracking-widest">VOTING</div>
              {isModerator && (
                <Button 
                   size="lg" 
                   onClick={onReveal}
                   className="bg-[#0052CC] hover:bg-[#0047B3] shadow-lg shadow-blue-500/20"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Reveal Cards
                </Button>
              )}
              {!isModerator && (
                <div className="text-sm text-slate-500">Waiting for host to reveal</div>
              )}
            </div>
          ) : (
            <div className="animate-in zoom-in duration-300 space-y-2">
              {agreement && (
                 <div className="text-emerald-600 font-bold text-lg mb-2 animate-bounce">Agreement!</div>
              )}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-4 sm:gap-6 mt-2">
                <div className="text-center sm:text-left">
                  <div className="text-xs text-slate-500 uppercase tracking-[0.2em] font-semibold">Average</div>
                  <div className="text-5xl font-bold text-slate-900 leading-tight">{average}</div>
                </div>

                {!finalEstimate && isModerator && (
                  <div className="flex items-center gap-3 bg-white/70 border border-slate-200 rounded-full px-3 py-2 shadow-sm">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSubmitEstimate(String(Math.round(Number(average))))}
                      className="whitespace-nowrap"
                    >
                      Use Avg ({Math.round(Number(average))})
                    </Button>
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        className="w-20 h-8 text-sm border border-slate-200 rounded px-2 text-center bg-white" 
                        placeholder="Custom"
                        value={manualEstimate}
                        onChange={(e) => setManualEstimate(e.target.value)}
                      />
                      <Button size="sm" onClick={() => onSubmitEstimate(manualEstimate)} disabled={!manualEstimate}>
                        Apply
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {finalEstimate ? (
                 <div className="mt-4 flex items-center gap-2 bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full">
                    <Check className="w-4 h-4" />
                    Final: {finalEstimate}
                 </div>
              ) : (
                  <div className="mt-4 text-slate-500 text-sm">Waiting for moderator...</div>
              )}
            </div>
          )}
        </div>

        {/* Participants positioned around */}
        {participants.map((p, i) => {
          // Simple positioning logic
          // We need to distribute them around the circle.
          // Let's use simple absolute positioning based on index for now, 
          // or a better circular distribution if we had time.
          // Reusing the 4-position logic for now but making it dynamic?
          // Actually, let's just stick to the 4-position logic if count <= 4, 
          // otherwise we might need a better layout. 
          // For MVP, let's just map up to 8 spots or so.
          
          const total = participants.length;
          // Calculate angle
          const angle = (i * (360 / total)) + 90; // Start from bottom?
          // This is getting complex for CSS. Let's stick to the previous hardcoded positions if <= 4
          // or just use a simple grid if many.
          // The previous code had specific classes.
          
          const positions = [
            "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2", // 1
            "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2",   // 2
            "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2",    // 3
            "right-0 top-1/2 translate-x-1/2 -translate-y-1/2",    // 4
            // Add more just in case
            "bottom-0 right-1/4 translate-y-1/2",
            "bottom-0 left-1/4 translate-y-1/2",
          ];
          
          const posClass = positions[i] || positions[0]; // Fallback
          
          // We need to map vote by accountId or id
          const hasVoted = !!votes[p.accountId];
          const voteVal = votes[p.accountId];
          
          return (
            <div key={p.id} className={`absolute ${posClass} flex flex-col items-center gap-2`}>
              {/* The Card */}
              <div className="relative">
                 <AnimatePresence mode="wait">
                    {isRevealed && hasVoted ? (
                        <motion.div 
                            key="revealed"
                            initial={{ rotateY: 90 }}
                            animate={{ rotateY: 0 }}
                            className="w-10 h-14 bg-white border-2 border-[#0052CC] rounded shadow-sm flex items-center justify-center font-bold text-[#0052CC]"
                        >
                            {voteVal}
                        </motion.div>
                    ) : (
                        <div className={`
                            w-10 h-14 rounded border-2 transition-all duration-300 shadow-sm
                            ${hasVoted 
                                ? 'bg-[#0052CC] border-[#0052CC] -translate-y-2 shadow-md' 
                                : 'bg-slate-100 border-slate-200 border-dashed'
                            }
                        `}>
                            {hasVoted && <div className="w-full h-full flex items-center justify-center text-white/20 font-bold text-xs">?</div>}
                        </div>
                    )}
                 </AnimatePresence>
              </div>

              {/* Avatar */}
              <div className="flex flex-col items-center relative">
                 <div className="relative">
                     <Avatar className="w-8 h-8 border-2 border-white shadow-sm">
                        <AvatarImage src={p.avatar} />
                        <AvatarFallback className="bg-indigo-100 text-indigo-600 text-xs">{p.name.charAt(0)}</AvatarFallback>
                     </Avatar>
                     {p.connectionStatus && (
                         <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                             p.connectionStatus === 'online' ? 'bg-emerald-500' : 
                             p.connectionStatus === 'away' ? 'bg-amber-500' : 'bg-slate-300'
                         }`} />
                     )}
                 </div>
                 <span className="text-xs font-medium text-slate-600 bg-white/80 px-2 py-0.5 rounded-full backdrop-blur-sm mt-1">
                    {p.name}
                 </span>
              </div>
            </div>
          );
        })}
      </div>

      {isModerator && isRevealed && !finalEstimate && (
         <div className="w-full bg-slate-50 p-4 rounded-lg border border-slate-200 flex items-center justify-between animate-in slide-in-from-bottom-2">
            <div className="text-sm text-slate-600">
               Consensus suggested: <span className="font-bold text-slate-900">{average}</span>
            </div>
            <div className="flex items-center gap-2">
               <Button variant="ghost" size="sm" className="text-slate-500">
                 <RotateCcw className="w-4 h-4 mr-2" />
                 Re-vote
               </Button>
            </div>
         </div>
      )}
    </div>
  );
}
