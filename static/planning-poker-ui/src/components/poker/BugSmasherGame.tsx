import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Bug, Zap, Trophy, Play, RotateCcw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

interface GameEntity {
  id: string;
  x: number;
  y: number;
  type: 'bug' | 'feature';
  createdAt: number;
}

interface PlayerScore {
  id: string;
  name: string;
  score: number;
  avatar?: string;
}

export function BugSmasherGame() {
  const [isOpen, setIsOpen] = useState(false);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'finished'>('idle');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [entities, setEntities] = useState<GameEntity[]>([]);
  const [leaderboard, setLeaderboard] = useState<PlayerScore[]>([
    { id: '2', name: 'Sarah Chen', score: 12, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop' },
    { id: '3', name: 'Mike Ross', score: 8, avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop' },
  ]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout>();
  const spawnerRef = useRef<NodeJS.Timeout>();

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setTimeLeft(30);
    setEntities([]);
    
    // Game Loop
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
      
      // Mock opponent scoring
      if (Math.random() > 0.7) {
        setLeaderboard(prev => prev.map(p => ({
          ...p,
          score: p.score + (Math.random() > 0.5 ? 1 : 0)
        })).sort((a, b) => b.score - a.score));
      }
    }, 1000);

    // Spawner
    spawnerRef.current = setInterval(() => {
      spawnEntity();
    }, 600);
  };

  const endGame = () => {
    setGameState('finished');
    clearInterval(timerRef.current);
    clearInterval(spawnerRef.current);
    
    // Update leaderboard with current user
    setLeaderboard(prev => {
      const newScores = [...prev, { id: '1', name: 'You', score: score }];
      return newScores.sort((a, b) => b.score - a.score);
    });
  };

  const spawnEntity = () => {
    if (!containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    const padding = 40;
    
    const newEntity: GameEntity = {
      id: Math.random().toString(36).substr(2, 9),
      x: Math.random() * (width - padding * 2) + padding,
      y: Math.random() * (height - padding * 2) + padding,
      type: Math.random() > 0.8 ? 'feature' : 'bug', // 20% chance of feature
      createdAt: Date.now(),
    };

    setEntities(prev => [...prev, newEntity]);

    // Auto remove after 2s
    setTimeout(() => {
      setEntities(prev => prev.filter(e => e.id !== newEntity.id));
    }, 2000);
  };

  const handleEntityClick = (id: string, type: 'bug' | 'feature') => {
    if (gameState !== 'playing') return;

    if (type === 'bug') {
      setScore(s => s + 1);
    } else {
      setScore(s => Math.max(0, s - 1)); // Penalty
    }
    setEntities(prev => prev.filter(e => e.id !== id));
  };

  // Cleanup
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      clearInterval(spawnerRef.current);
    };
  }, []);

  if (!isOpen) {
    return (
      <Card 
        className="border-slate-200 shadow-sm bg-gradient-to-r from-slate-50 to-indigo-50 cursor-pointer hover:border-indigo-300 transition-all group"
        onClick={() => setIsOpen(true)}
      >
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg border border-slate-200 text-[#DE350B] shadow-sm group-hover:scale-110 transition-transform">
              <Bug className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Bug Smasher Blitz</h3>
              <p className="text-xs text-slate-500">Waiting for others? Smash some bugs!</p>
            </div>
          </div>
          <Button size="sm" variant="ghost" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
            Play <Play className="w-4 h-4 ml-1 fill-current" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 shadow-md animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-[#DE350B]/10 rounded text-[#DE350B]">
            <Bug className="w-4 h-4" />
          </div>
          <h3 className="font-semibold text-slate-900">Bug Smasher Blitz</h3>
        </div>
        <div className="flex items-center gap-4">
          {gameState === 'playing' && (
            <>
              <div className="text-sm font-mono font-medium text-slate-600 bg-white px-2 py-1 rounded border border-slate-200">
                {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
              </div>
              <Badge variant="secondary" className="font-mono text-lg bg-indigo-50 text-indigo-700 border-indigo-100">
                Score: {score}
              </Badge>
            </>
          )}
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <CardContent className="p-0 relative min-h-[400px] bg-slate-50">
        {gameState === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-white/80 backdrop-blur-sm">
            <div className="text-center space-y-4 max-w-sm mx-auto p-6">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
                <Bug className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Ready to Smash?</h2>
              <p className="text-slate-500">
                Click the <span className="text-[#DE350B] font-bold">Red Bugs</span> for points. 
                Avoid the <span className="text-[#006644] font-bold">Green Features</span>!
              </p>
              <Button size="lg" onClick={startGame} className="w-full bg-[#0052CC] hover:bg-[#0047B3]">
                Start Game
              </Button>
            </div>
          </div>
        )}

        {gameState === 'finished' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-white/90 backdrop-blur-sm">
             <div className="w-full max-w-xs space-y-6">
               <div className="text-center">
                  <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-2" />
                  <h2 className="text-2xl font-bold text-slate-900">Game Over!</h2>
                  <p className="text-slate-500">You scored <span className="font-bold text-slate-900">{score}</span> points</p>
               </div>
               
               <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                 <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 text-xs font-medium text-slate-500 uppercase">
                   Session Leaderboard
                 </div>
                 {leaderboard.map((player, index) => (
                   <div key={player.id} className="flex items-center justify-between px-4 py-3 border-b border-slate-50 last:border-0">
                     <div className="flex items-center gap-3">
                       <span className="text-sm font-mono text-slate-400 w-4">#{index + 1}</span>
                       <Avatar className="w-6 h-6">
                         <AvatarImage src={player.avatar} />
                         <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                       </Avatar>
                       <span className={`text-sm ${player.id === '1' ? 'font-bold text-slate-900' : 'text-slate-600'}`}>
                         {player.name} {player.id === '1' && '(You)'}
                       </span>
                     </div>
                     <span className="font-mono font-bold text-slate-700">{player.score}</span>
                   </div>
                 ))}
               </div>

               <Button onClick={startGame} variant="outline" className="w-full">
                 <RotateCcw className="w-4 h-4 mr-2" /> Play Again
               </Button>
             </div>
          </div>
        )}

        {/* Game Area */}
        <div ref={containerRef} className="relative w-full h-[400px] overflow-hidden cursor-crosshair">
          <AnimatePresence>
            {entities.map((entity) => (
              <motion.button
                key={entity.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                style={{ 
                  left: entity.x, 
                  top: entity.y,
                  position: 'absolute' 
                }}
                onClick={() => handleEntityClick(entity.id, entity.type)}
                className={`
                  p-2 rounded-full shadow-sm transition-transform active:scale-90
                  ${entity.type === 'bug' 
                    ? 'bg-[#DE350B] text-white hover:bg-[#BF2600]' 
                    : 'bg-[#006644] text-white hover:bg-[#004D33]'
                  }
                `}
              >
                {entity.type === 'bug' ? <Bug className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
