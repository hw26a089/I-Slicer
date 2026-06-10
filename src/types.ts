export type GameMode = 'ARCADE' | 'SURVIVAL' | 'ZEN';

export interface ScoreEntry {
  name: string;
  score: number;
  combo: number;
  mode: GameMode;
  date: string;
}

export type EnemyType = 'STANDARD' | 'ARMORED' | 'SPEEDY' | 'SPLITTER' | 'BOSS' | 'ROTTEN' | 'BOMB';

export interface FoodEnemy {
  id: string;
  type: EnemyType;
  emoji: string;
  name: string;
  color: string; // Used for juice particles
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  rotationSpeed: number;
  health: number;
  maxHealth: number;
  isSliced: boolean;
  sliceAngle?: number;
  sliceProgress?: number; // for tracking split animation
  points: number;
}

export interface SplitHalf {
  id: string;
  emoji: string;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  rotationSpeed: number;
  scaleX: number; // to flip/split halves
  opacity: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  radius: number;
  alpha: number;
  decay: number;
  gravity?: number;
  isJuice?: boolean; // splat on background
}

export interface Splat {
  id: string;
  x: number;
  y: number;
  color: string;
  radius: number;
  alpha: number;
  scale: number;
}

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  size: number;
  vy: number;
  alpha: number;
}

export interface ComboTracker {
  count: number;
  timer: number; // resets after inactivity
  maxCombo: number;
}

export type BladeStyle = 'NEON' | 'SAMURAI' | 'PLASMA' | 'SABER' | 'GLITCH';
export type BladeShape = 'DEFAULT' | 'L' | 'X';

export interface GameStats {
  score: number;
  slicedCount: number;
  comboCount: number;
  maxCombo: number;
  bossesDefeated: number;
  lives: number;
  timeRemaining: number; // for Arcade
}
