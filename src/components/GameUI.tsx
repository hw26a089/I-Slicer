import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Clock, 
  Heart, 
  Swords, 
  Award, 
  Trophy, 
  Gamepad2, 
  Info,
  Sparkles,
  RefreshCw,
  Gauge
} from 'lucide-react';
import { GameMode, BladeStyle, BladeShape, ScoreEntry } from '../types';
import { Sound } from '../utils/audio';

interface GameUIProps {
  score: number;
  combo: number;
  lives: number;
  timeRemaining: number;
  mode: GameMode;
  style: BladeStyle;
  shape: BladeShape;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  isPaused: boolean;
  isPlaying: boolean;
  isGameOver: boolean;
  gameOverStats: { score: number; maxCombo: number; bosses: number } | null;
  onStartGame: (mode: GameMode, style: BladeStyle, shape: BladeShape, difficulty: 'EASY' | 'MEDIUM' | 'HARD') => void;
  onPauseToggle: () => void;
  onRestart: () => void;
  onStyleChange: (style: BladeStyle) => void;
  onShapeChange: (shape: BladeShape) => void;
  isChanceTime?: boolean;
}

export const GameUI: React.FC<GameUIProps> = ({
  score,
  combo,
  lives,
  timeRemaining,
  mode,
  style,
  shape,
  difficulty,
  isPaused,
  isPlaying,
  isGameOver,
  gameOverStats,
  onStartGame,
  onPauseToggle,
  onRestart,
  onStyleChange,
  onShapeChange,
  isChanceTime = false,
}) => {
  // Menu configuration states
  const [selectedMode, setSelectedMode] = useState<GameMode>('ARCADE');
  const [selectedStyle, setSelectedStyle] = useState<BladeStyle>('NEON');
  const [selectedShape, setSelectedShape] = useState<BladeShape>('DEFAULT');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    return localStorage.getItem('i-slicer-muted') === 'true';
  });

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>([]);
  const [playerName, setPlayerName] = useState<string>('プレイヤーI');
  const [scoreSubmitted, setScoreSubmitted] = useState<boolean>(false);

  // Sync mute audio engine state
  useEffect(() => {
    Sound.setMute(isMuted);
  }, [isMuted]);

  // Load Leaderboards
  const loadLeaderboards = () => {
    const raw = localStorage.getItem('i-slicer-leaderboard');
    if (raw) {
      try {
        setLeaderboard(JSON.parse(raw));
      } catch (e) {
        setLeaderboard([]);
      }
    } else {
      // Default local mock setup if empty
      const defaultScores: ScoreEntry[] = [
        { name: 'SliceMaster', score: 1200, combo: 8, mode: 'ARCADE', date: '2026-06-01' },
         { name: 'FruitNinjaI', score: 850, combo: 6, mode: 'ARCADE', date: '2026-06-03' },
        { name: 'SaberUser', score: 620, combo: 5, mode: 'SURVIVAL', date: '2026-06-05' }
      ];
      localStorage.setItem('i-slicer-leaderboard', JSON.stringify(defaultScores));
      setLeaderboard(defaultScores);
    }
  };

  useEffect(() => {
    loadLeaderboards();
  }, []);

  const handleMuteToggle = () => {
    const nextVal = !isMuted;
    setIsMuted(nextVal);
    Sound.setMute(nextVal);
  };

  const handleStartClicked = () => {
    Sound.playLevelUp(); // sleek arpeggio chime
    onStartGame(selectedMode, selectedStyle, selectedShape, selectedDifficulty);
  };

  const handleSaveScore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameOverStats || scoreSubmitted) return;

    const newEntry: ScoreEntry = {
      name: playerName.trim() || 'Anonymous',
      score: gameOverStats.score,
      combo: gameOverStats.maxCombo,
      mode: mode,
      date: new Date().toISOString().split('T')[0],
    };

    const updated = [...leaderboard, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 8); // Keep top 8

    localStorage.setItem('i-slicer-leaderboard', JSON.stringify(updated));
    setLeaderboard(updated);
    setScoreSubmitted(true);
    Sound.playLevelUp();
  };

  // Helper skin descriptive strings
  const getStyleLabel = (s: BladeStyle) => {
    switch(s) {
      case 'NEON': return 'サイバー・ネオン';
      case 'SAMURAI': return '名刀・斬鉄';
      case 'PLASMA': return 'ヴォイド・プラズマ';
      case 'SABER': return 'ライセーバー';
      case 'GLITCH': return 'グリッチ・エラー';
    }
  };

  const getShapeLabel = (s: BladeShape) => {
    switch(s) {
      case 'DEFAULT': return 'スタンダード';
      case 'L': return 'L-ブレード';
      case 'X': return 'X-ブレード';
    }
  };

  const currentModeLeaderboard = leaderboard.filter(e => e.mode === selectedMode);

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-4 font-sans select-none">
      
      {/* Golden Pulse Border Overlay during Chance Time */}
      {isChanceTime && isPlaying && !isGameOver && (
        <div className="absolute inset-0 pointer-events-none border-[6px] border-amber-400/80 animate-pulse shadow-[inset_0_0_40px_rgba(251,191,36,0.35)] z-10 transition-all duration-300" />
      )}
      
      {/* 1. TOP HEADER HUD (Active Play State only) */}
      <div className="w-full flex justify-between items-center transition-opacity pointer-events-auto">
        {isPlaying && !isGameOver ? (
          <div className="w-full flex justify-between items-start bg-transparent py-2 px-2">
            {/* Left: Immersive Current Score */}
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-[0.3em] text-blue-400 font-bold mb-1 font-mono">Current Score</span>
              <span className={`text-5xl font-black italic tracking-tighter font-mono transition-all duration-300 ${isChanceTime ? 'text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.8)] animate-pulse' : 'text-white'}`}>
                {String(score).padStart(6, '0')}
              </span>
              {isChanceTime && (
                <div className="mt-2 flex items-center gap-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-widest uppercase animate-bounce w-fit">
                  <Sparkles className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                  CHANCE TIME! 2X POINTS & NO BOMBS!
                </div>
              )}
            </div>
            
            {/* Right Group: Best Score & Lives/Timer */}
            <div className="flex gap-4 items-center">
              {/* Best Score Counter */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 p-3 rounded-xl flex flex-col items-center min-w-[110px]">
                <span className="text-[9px] uppercase tracking-widest text-white/50 font-mono">Best Score</span>
                <span className="text-xl font-black text-white font-mono">
                  {String(localStorage.getItem(`i-slicer-highscore-${mode}`) || '0').padStart(6, '0')}
                </span>
              </div>

              {/* Survival Mode: Immersive glowing red life indicators */}
              {mode === 'SURVIVAL' && (
                <div className="bg-red-500/10 backdrop-blur-md border border-red-500/20 p-3 rounded-xl flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className={`w-3 h-3 rounded-full transition-all duration-300 ${lives >= 1 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-white/15'}`} />
                    <div className={`w-3 h-3 rounded-full transition-all duration-300 ${lives >= 2 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-white/15'}`} />
                    <div className={`w-3 h-3 rounded-full transition-all duration-300 ${lives >= 3 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-white/15'}`} />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-tighter text-red-400 font-mono">Lives</span>
                  {lives > 3 && <span className="text-xs text-red-400 font-black">+{lives - 3}</span>}
                </div>
              )}

              {/* Arcade Mode Timer: Green glowing card */}
              {mode === 'ARCADE' && (
                <div className="bg-emerald-500/10 backdrop-blur-md border border-emerald-500/20 p-2.5 px-4 rounded-xl flex flex-col justify-center min-w-[90px]">
                  <span className="text-[9px] uppercase tracking-widest text-emerald-400 font-mono">Time Left</span>
                  <span className="text-xl font-black font-mono text-emerald-300 text-center">{Math.ceil(timeRemaining)}s</span>
                </div>
              )}

              {/* Zen Mode Decor */}
              {mode === 'ZEN' && (
                <div className="bg-cyan-500/10 backdrop-blur-md border border-cyan-500/20 p-3 px-4 rounded-xl flex items-center">
                  <span className="text-xs uppercase font-black text-cyan-300 font-mono">🌸 ZEN MODE</span>
                </div>
              )}

              {/* Pause & Audio Buttons */}
              <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-1.5 rounded-xl ml-2">
                <button
                  onClick={handleMuteToggle}
                  className="p-1.5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                  title="音量切り替え"
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <div className="w-px h-5 bg-white/10 mx-1" />
                <button
                  onClick={onPauseToggle}
                  className="p-1.5 hover:bg-cyan-500 hover:text-black text-zinc-300 rounded-lg transition-all cursor-pointer"
                  title="PAUSE"
                >
                  <Pause className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Mute widget on generic screens */
          <div className="w-full flex justify-end pointer-events-auto py-2">
            <button
              onClick={handleMuteToggle}
              className="p-2.5 bg-zinc-950/70 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors cursor-pointer shadow-lg shadow-black/40"
            >
              {isMuted ? <VolumeX className="w-5 h-5 text-red-500" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>
        )}
      </div>

      {/* 2. MAIN CENTER MENU MODAL (AnimatePresence) */}
      <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-center items-center pointer-events-none">
        <AnimatePresence>
          
          {/* A. Generic Start Menu Container */}
          {!isPlaying && !isGameOver && (
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: -15 }}
              className="pointer-events-auto bg-zinc-950/90 border border-zinc-800 p-6 md:p-8 rounded-2xl shadow-2xl max-w-lg w-full flex flex-col gap-6 backdrop-blur-xl"
            >
              {/* BRAND LOGO SLICER */}
              <div className="text-center">
                <div className="relative inline-block mb-1">
                  {/* Huge 'I' sword blade */}
                  <span className="text-7xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 via-emerald-400 to-cyan-500 drop-shadow-[0_0_20px_rgba(0,255,255,0.4)] px-3 animate-pulse">
                    I
                  </span>
                  <div className="absolute bottom-2 right-1/2 translate-x-1/2 bg-red-500 text-white font-black text-[10px] tracking-widest px-2.5 py-0.5 rounded-full rotate-[-8deg] shadow-lg border border-red-400">
                    SLICER
                  </div>
                </div>
                <h1 className="text-xs uppercase tracking-widest font-mono text-zinc-400">
                  迫り来る食べ物系の敵を「I」で斬る!
                </h1>
              </div>

              {/* GAME STYLING GUIDE / HOWTO */}
              <div className="bg-zinc-900/50 border border-zinc-800/80 p-3 rounded-lg text-xs text-zinc-400 flex gap-2.5">
                <Info className="w-5 h-5 text-cyan-400 shrink-0" />
                <div>
                  <p className="font-semibold text-zinc-200 mb-0.5">【遊び方】</p>
                  画面を<b>ドラッグ/スワイプして「I」の剣で食材を斬る</b>、または<b>【W/A/S/D・矢印キー】</b>で「I」を直接走査して斬り裂くことができます！
                </div>
              </div>

              {/* UPGRADED TABS AND SETTLEMENTS */}
              <div className="space-y-4">
                {/* 1. GAME MODE SELECTION */}
                <div className="space-y-2">
                  <label className="block text-xs font-mono font-bold text-zinc-400">
                    🎮 ゲームモード:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'ARCADE', name: '⏱️ ARCADE', desc: '60秒でハイスコア' },
                      { value: 'SURVIVAL', name: '❤️ SURVIVAL', desc: '3ライフで生き残り' },
                      { value: 'ZEN', name: '🌸 ZEN', desc: '無限・障害物なし' },
                    ].map(m => (
                      <button
                        key={m.value}
                        onClick={() => {
                          setSelectedMode(m.value as GameMode);
                          Sound.playSwoosh(15);
                        }}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          selectedMode === m.value
                            ? 'bg-cyan-950/60 border-cyan-500/80 text-cyan-300 shadow-md shadow-cyan-500/10'
                            : 'bg-zinc-900/30 border-zinc-800 text-zinc-400 hover:bg-zinc-900/60'
                        }`}
                      >
                        <div className="text-xs font-bold mb-0.5">{m.name}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. DIFFICULTY SELECTOR */}
                <div className="space-y-2">
                  <label className="block text-xs font-mono font-bold text-zinc-400 flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5" />
                    難易度指定:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['EASY', 'MEDIUM', 'HARD'] as const).map(d => (
                      <button
                        key={d}
                        onClick={() => {
                          setSelectedDifficulty(d);
                          Sound.playSwoosh(12);
                        }}
                        className={`px-3 py-2 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                          selectedDifficulty === d
                            ? d === 'HARD'
                              ? 'bg-red-950/60 border border-red-500/70 text-red-400'
                              : d === 'EASY'
                              ? 'bg-emerald-950/60 border border-emerald-500/70 text-emerald-400'
                              : 'bg-cyan-950/60 border border-cyan-500/70 text-cyan-400'
                            : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:brightness-110'
                        }`}
                      >
                        {d === 'EASY' ? 'かんたん' : d === 'MEDIUM' ? '普通' : 'むずかしい 💀'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. CORE BLADE STYLE & SHAPE */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-mono font-bold text-zinc-400">
                      ⚔️ ブレードスタイル:
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {(['NEON', 'SAMURAI', 'PLASMA', 'SABER', 'GLITCH'] as BladeStyle[]).map(s => {
                        const active = selectedStyle === s;
                        let bg = '';
                        switch (s) {
                          case 'NEON': bg = active ? 'border-cyan-500/80 shadow-cyan-500/10 text-cyan-300 bg-cyan-950/40' : ''; break;
                          case 'SAMURAI': bg = active ? 'border-zinc-400/80 shadow-zinc-500/10 text-zinc-200 bg-zinc-800/60' : ''; break;
                          case 'PLASMA': bg = active ? 'border-pink-500/80 shadow-pink-500/10 text-pink-300 bg-pink-950/40' : ''; break;
                          case 'SABER': bg = active ? 'border-lime-500/80 shadow-lime-500/10 text-lime-300 bg-lime-950/40' : ''; break;
                          case 'GLITCH': bg = active ? 'border-red-500/80 shadow-red-500/10 text-cyan-300 bg-red-950/40' : ''; break;
                        }
                        return (
                          <button
                            key={s}
                            onClick={() => {
                              setSelectedStyle(s);
                              onStyleChange(s);
                              Sound.playSwoosh(22);
                            }}
                            className={`py-2 px-1 rounded-lg border text-[10px] font-bold font-mono transition-all text-center cursor-pointer truncate ${
                              active ? bg : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                            }`}
                            title={getStyleLabel(s)}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-mono font-bold text-zinc-400">
                      🗡️ ブレードシェイプ:
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['DEFAULT', 'L', 'X'] as BladeShape[]).map(sh => {
                        const active = selectedShape === sh;
                        return (
                          <button
                            key={sh}
                            onClick={() => {
                              setSelectedShape(sh);
                              onShapeChange(sh);
                              Sound.playSwoosh(22);
                            }}
                            className={`py-2 px-1 rounded-lg border text-[10px] font-bold font-mono transition-all text-center cursor-pointer ${
                              active ? 'border-amber-500/80 shadow-amber-500/10 text-amber-300 bg-amber-950/40' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                            }`}
                            title={getShapeLabel(sh)}
                          >
                            {sh}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* BOTTOM: LOCAL LEADERS TAB & SUBMIT PLAY BUTTON */}
              <div className="flex flex-col gap-3 pt-2">
                <button
                  onClick={handleStartClicked}
                  className="w-full bg-gradient-to-r from-cyan-500 to-emerald-500 hover:brightness-110 active:scale-95 text-black font-black text-base py-3.5 rounded-xl transition-all flex justify-center items-center gap-2 shadow-xl shadow-cyan-500/20 pointer-events-auto cursor-pointer"
                >
                  <Play className="w-5 h-5 fill-black" />
                  スライス開始！
                </button>

                {/* Miniature Local leaderboard preview */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-xs">
                  <div className="flex justify-between items-center mb-2 font-mono text-zinc-400 border-b border-zinc-900 pb-1">
                    <span className="flex items-center gap-1">
                      <Trophy className="w-3.5 h-3.5 text-amber-500" />
                      ランキング ({selectedMode})
                    </span>
                    <span className="text-[10px] text-zinc-600">Top 5</span>
                  </div>
                  {currentModeLeaderboard.length === 0 ? (
                    <div className="text-center text-zinc-600 py-2 font-mono text-[10px]">
                      まだスコアはありません。ハイスコアを作ろう！
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-24 overflow-y-auto">
                      {currentModeLeaderboard.slice(0, 5).map((e, idx) => (
                        <div key={idx} className="flex justify-between items-center font-mono">
                          <span className="text-zinc-400">
                            <span className="text-zinc-600 mr-1.5">#{idx + 1}</span>
                            {e.name}
                          </span>
                          <span className="font-bold text-cyan-400 gap-2 flex">
                            <span>{e.score}</span>
                            <span className="text-zinc-600 text-[10px]">({e.combo}C)</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </motion.div>
          )}

          {/* B. PAUSE STATE PANEL OVERLAY */}
          {isPlaying && isPaused && !isGameOver && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="pointer-events-auto bg-zinc-950/95 border border-zinc-800 p-8 rounded-2xl shadow-2xl max-w-sm w-full flex flex-col gap-5 text-center backdrop-blur-xl"
            >
              <h2 className="text-2xl font-bold font-mono text-zinc-200 tracking-wider">一時停止中</h2>
              <p className="text-xs text-zinc-500 font-mono">
                「I」ブレードで食べ物を断ち切る準備をしてください。
              </p>

              <div className="flex flex-col gap-2.5">
                <button
                  onClick={onPauseToggle}
                  className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-3 rounded-lg transition-colors cursor-pointer"
                >
                  ゲームを再開
                </button>
                <button
                  onClick={onRestart}
                  className="w-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-200 py-2.5 rounded-lg text-xs font-semibold cursor-pointer flex justify-center items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  最初からやり直す
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-red-900/20 border border-red-900/50 hover:bg-red-900/40 text-red-400 py-2.5 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  ホームに戻る
                </button>
              </div>
            </motion.div>
          )}

          {/* C. GAME OVER SCREEN WITH SCOREBOARDS */}
          {isGameOver && gameOverStats && (
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="pointer-events-auto bg-zinc-950/95 border border-zinc-800 p-6 md:p-8 rounded-2xl shadow-2xl max-w-md w-full flex flex-col gap-5 backdrop-blur-xl"
            >
              <div className="text-center">
                <div className="inline-block bg-red-950/60 text-red-500 border border-red-900/50 text-xs font-black px-4 py-1 rounded-full mb-3 uppercase tracking-widest font-mono shadow-md">
                  GAME OVER
                </div>
                <h2 className="text-3xl font-black font-mono text-zinc-100 tracking-tight">結果発表</h2>
              </div>

              {/* GAME STATS DISPLAY */}
              <div className="grid grid-cols-3 gap-2 bg-zinc-900/40 border border-zinc-800 p-3.5 rounded-xl text-center">
                <div>
                  <div className="text-[10px] text-zinc-500 font-mono">スコア</div>
                  <div className="text-2xl font-extrabold font-mono text-cyan-400">
                    {gameOverStats.score}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 font-mono">最大コンボ</div>
                  <div className="text-2xl font-extrabold font-mono text-amber-400">
                    {gameOverStats.maxCombo}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 font-mono">倒したボス</div>
                  <div className="text-2xl font-extrabold font-mono text-red-400">
                    {gameOverStats.bosses}
                  </div>
                </div>
              </div>

              {/* LOCAL LEADERBOARD SUBMISSION */}
              {!scoreSubmitted ? (
                <form onSubmit={handleSaveScore} className="bg-zinc-900/20 border border-zinc-800/80 p-3.5 rounded-xl flex flex-col gap-2.5">
                  <label className="block text-[11px] font-mono font-bold text-zinc-400">
                    ✒️ ランキングにお名前を追加しますか？
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={playerName}
                      maxLength={12}
                      onChange={e => setPlayerName(e.target.value)}
                      placeholder="プレイヤー名を入力"
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-cyan-500/80 font-semibold"
                    />
                    <button
                      type="submit"
                      className="bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs px-4 rounded-lg transition-colors cursor-pointer"
                    >
                      保存
                    </button>
                  </div>
                </form>
              ) : (
                <div className="bg-emerald-950/40 border border-emerald-900/50 px-4 py-2 rounded-xl text-xs font-semibold text-emerald-400 text-center font-mono">
                  ✓ スコアを記録しました！
                </div>
              )}

              {/* MINI LEADERBOARD FOR MODE */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs font-mono">
                <div className="flex items-center gap-1 mb-2 text-zinc-400 border-b border-zinc-900 pb-1 font-bold">
                  <Award className="w-4 h-4 text-amber-500" />
                  現在のモードのベストレコード
                </div>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {leaderboard
                    .filter(e => e.mode === mode)
                    .slice(0, 5)
                    .map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center font-semibold">
                        <span className="text-zinc-400">
                          <span className="text-zinc-600 mr-2">#{idx+1}</span>
                          {item.name}
                        </span>
                        <span className="text-cyan-400">
                          {item.score} <span className="text-zinc-600 text-[10px]">({item.combo}C)</span>
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* BACK TO MAIN MENU OR REPLAY BUTTONS */}
              <div className="flex gap-2.5">
                <button
                  onClick={onRestart}
                  className="flex-1 bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-black font-black py-3 rounded-lg transition-all flex justify-center items-center gap-1.5 text-xs cursor-pointer shadow-md shadow-cyan-600/10"
                >
                  <RefreshCw className="w-4 h-4" />
                  もう一度プレイ！
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 py-3 rounded-lg text-xs font-bold cursor-pointer"
                >
                  ホームに戻る
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* 2.5 BOTTOM IMMERSIVE HUD BAR (Active Play State only) */}
      {isPlaying && !isGameOver && (
        <div className="w-full flex items-end justify-between transition-all duration-300 pointer-events-auto mt-auto pb-4 px-2">
          <div className="flex flex-col gap-2">
            {combo >= 2 ? (
              <div className="flex items-center gap-2 bg-blue-500/20 px-4 py-1.5 rounded-full border border-blue-500/30 w-fit">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
                <span className="text-xs font-bold uppercase tracking-widest text-blue-300">Combo x{combo}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/10 w-fit">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">🗡️ スライス待機中</span>
              </div>
            )}
            <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-600 via-cyan-400 to-green-400 shadow-[0_0_10px_rgba(34,211,238,0.5)] transition-all duration-300"
                style={{ 
                  width: mode === 'ARCADE' 
                    ? `${Math.max(0, Math.min(100, (timeRemaining / 60) * 100))}%` 
                    : mode === 'SURVIVAL'
                    ? `${Math.max(10, Math.min(100, (score % 250) / 2.5))}%`
                    : '100%' 
                }}
              />
            </div>
          </div>

          <div className="text-right pointer-events-none">
             <div className="text-white/40 text-[10px] uppercase tracking-[0.4em] mb-2 font-mono">System Status</div>
             <div className="flex gap-4 bg-zinc-950/60 border border-zinc-800 p-2.5 rounded-lg">
                <div className="flex flex-col text-left">
                  <span className="text-white/60 text-[8px] uppercase font-mono">Latency</span>
                  <span className="font-mono text-xs text-green-400">{(12 + (score % 4)).toFixed(0)}MS</span>
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-white/60 text-[8px] uppercase font-mono">Refresh</span>
                  <span className="font-mono text-xs">120HZ</span>
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-white/60 text-[8px] uppercase font-mono">BLADE</span>
                  <span className="font-mono text-[9px] text-cyan-400 uppercase">{getStyleLabel(style)} / {getShapeLabel(shape)}</span>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* 3. BOTTOM FOOTER DECORATIVES (Floating instructions if not playing) */}
      <div className="w-full text-center transition-opacity py-2">
        {!isPlaying && (
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-1 pointer-events-auto">
            © 2026 I-Slicer • Web Audio Synth powered • WASD/Arrows compliant
          </div>
        )}
      </div>

    </div>
  );
};
