/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { GameUI } from './components/GameUI';
import { GameMode, BladeStyle, BladeShape } from './types';

export default function App() {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);

  // Active game stat feeds from canvas engine
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(1);
  const [lives, setLives] = useState<number>(3);
  const [timeRemaining, setTimeRemaining] = useState<number>(60);
  const [isChanceTime, setIsChanceTime] = useState<boolean>(false);

  // Active settings
  const [mode, setMode] = useState<GameMode>('ARCADE');
  const [style, setStyle] = useState<BladeStyle>('NEON');
  const [shape, setShape] = useState<BladeShape>('DEFAULT');
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');

  // Endgame stats
  const [gameOverStats, setGameOverStats] = useState<{ score: number; maxCombo: number; bosses: number } | null>(null);
  const [restartCount, setRestartCount] = useState<number>(0);

  const handleStatsUpdate = useCallback((
    currentScore: number,
    currentCombo: number,
    currentLives: number,
    currentTime: number,
    chanceActive?: boolean
  ) => {
    setScore(currentScore);
    setCombo(currentCombo);
    setLives(currentLives);
    setTimeRemaining(currentTime);
    if (chanceActive !== undefined) {
      setIsChanceTime(chanceActive);
    }
  }, []);

  const handleStartGame = useCallback((
    chosenMode: GameMode,
    chosenStyle: BladeStyle,
    chosenShape: BladeShape,
    chosenDifficulty: 'EASY' | 'MEDIUM' | 'HARD'
  ) => {
    setMode(chosenMode);
    setStyle(chosenStyle);
    setShape(chosenShape);
    setDifficulty(chosenDifficulty);

    // Reset scores & lives
    setScore(0);
    setCombo(1);
    setLives(chosenMode === 'SURVIVAL' ? 3 : 99);
    setTimeRemaining(chosenMode === 'ARCADE' ? 60 : 0);

    setIsGameOver(false);
    setGameOverStats(null);
    setIsPaused(false);
    setIsPlaying(true);
    setIsChanceTime(false);
    setRestartCount(prev => prev + 1);
  }, []);

  const handleGameOver = useCallback((
    finalScore: number,
    maxCombo: number,
    bosses: number
  ) => {
    setGameOverStats({ score: finalScore, maxCombo, bosses });
    setIsGameOver(true);
  }, []);

  const handlePauseToggle = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  const handleRestart = useCallback(() => {
    // Re-launch with existing mode and settings
    handleStartGame(mode, style, shape, difficulty);
  }, [mode, style, shape, difficulty, handleStartGame]);

  const handleStyleChange = useCallback((newStyle: BladeStyle) => {
    setStyle(newStyle);
  }, []);

  const handleShapeChange = useCallback((newShape: BladeShape) => {
    setShape(newShape);
  }, []);

  return (
    <main className="w-screen h-screen relative bg-[#050505] text-white font-sans overflow-hidden select-none touch-none bg-[radial-gradient(circle_at_50%_50%,#121226_0%,#050505_100%)]">
      
      {/* Immersive UI neon glow atmospheres */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Cyan neon glowing orb (top left) */}
        <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-blue-600/15 rounded-full blur-[120px]" />
        {/* Emerald neon glowing orb (bottom right) */}
        <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-emerald-600/15 rounded-full blur-[120px]" />
        
        {/* Subtle tech grid sparks */}
        <div className="absolute inset-0 opacity-[0.035]" style={{
          backgroundImage: `radial-gradient(ellipse at center, #06b6d4 1.5px, transparent 1.5px)`,
          backgroundSize: `44px 44px`
        }} />
      </div>

      {/* 1. Play state Canvas Layer */}
      {isPlaying && (
        <GameCanvas
          key={`${mode}-${difficulty}-${style}-${shape}-${restartCount}`} // re-mount fresh canvas on restart/mode-change
          mode={mode}
          style={style}
          shape={shape}
          difficulty={difficulty}
          isPaused={isPaused}
          onGameOver={handleGameOver}
          onStatsUpdate={handleStatsUpdate}
        />
      )
}

      {/* 3. Global HUD / UI menus Overlay */}
      <GameUI
        score={score}
        combo={combo}
        lives={lives}
        timeRemaining={timeRemaining}
        mode={mode}
        style={style}
        shape={shape}
        difficulty={difficulty}
        isPaused={isPaused}
        isPlaying={isPlaying}
        isGameOver={isGameOver}
        gameOverStats={gameOverStats}
        onStartGame={handleStartGame}
        onPauseToggle={handlePauseToggle}
        onRestart={handleRestart}
        onStyleChange={handleStyleChange}
        onShapeChange={handleShapeChange}
        isChanceTime={isChanceTime}
      />

    </main>
  );
}
