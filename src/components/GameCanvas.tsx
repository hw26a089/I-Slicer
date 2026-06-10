import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameMode, FoodEnemy, Particle, Splat, FloatingText, ScoreEntry, BladeStyle, BladeShape, SplitHalf, EnemyType } from '../types';
import { Sound } from '../utils/audio';

const FOOD_POOL = [
  { emoji: '🍎', name: 'りんご', color: '#ef4444', score: 10, type: 'STANDARD' },
  { emoji: '🍏', name: '青りんご', color: '#22c55e', score: 12, type: 'STANDARD' },
  { emoji: '🍉', name: 'スイカ', color: '#f43f5e', score: 25, type: 'SPLITTER' }, // Splits into pieces
  { emoji: '🍌', name: 'バナナ', color: '#eab308', score: 15, type: 'SPEEDY' },  // Zips quickly
  { emoji: '🍊', name: 'みかん', color: '#f97316', score: 10, type: 'STANDARD' },
  { emoji: '🍓', name: 'いちご', color: '#ec4899', score: 18, type: 'SPEEDY' },
  { emoji: '🍍', name: 'パイナップル', color: '#eab308', score: 40, type: 'ARMORED' }, // Requires 2-3 hits
  { emoji: '🥝', name: 'キウイ', color: '#84cc16', score: 20, type: 'STANDARD' },
  { emoji: '🍔', name: 'バーガー', color: '#b45309', score: 50, type: 'BOSS' },     // Giant boss
  { emoji: '🍕', name: 'ピザ', color: '#f97316', score: 45, type: 'BOSS' },         // Giant boss
  { emoji: '🍩', name: 'ドーナツ', color: '#db2777', score: 20, type: 'STANDARD' },
  { emoji: '🧁', name: 'カビケーキ', color: '#a855f7', score: -30, type: 'ROTTEN' }, // Rotten🧁
  { emoji: '💣', name: '爆弾', color: '#3f3f46', score: -100, type: 'BOMB' }, // Bomb 💣
];

interface GameCanvasProps {
  mode: GameMode;
  style: BladeStyle;
  shape: BladeShape;
  isPaused: boolean;
  onGameOver: (score: number, maxCombo: number, bosses: number) => void;
  onStatsUpdate: (score: number, combo: number, lives: number, time: number, isChanceTime?: boolean) => void;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  mode,
  style,
  shape,
  isPaused,
  onGameOver,
  onStatsUpdate,
  difficulty,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game Loop states
  const [highScore, setHighScore] = useState<number>(() => {
    return Number(localStorage.getItem(`i-slicer-highscore-${mode}`) || '0');
  });

  // Game variables references (to keep the draw loops fast without React lag)
  const stateRef = useRef({
    score: 0,
    slicedCount: 0,
    lives: mode === 'SURVIVAL' ? 3 : 99,
    timeRemaining: mode === 'ARCADE' ? 60 : 0,
    enemies: [] as FoodEnemy[],
    splitHalves: [] as SplitHalf[],
    particles: [] as Particle[],
    splats: [] as Splat[],
    floatingTexts: [] as FloatingText[],
    comboCount: 0,
    maxCombo: 0,
    bossesDefeated: 0,
    lastFrameTime: 0,
    spawnTimer: 0,
    bossSpawnTimer: 0,
    keyboardX: window.innerWidth / 2, // keyboard coordinate
    keyboardY: window.innerHeight / 2,
    keyboardVelocity: { x: 0, y: 0 },
    // Chance Time & Explosion Shake details
    isChanceTime: false,
    chanceTimeTimer: 0,
    chanceTimeCooldown: 20, // starts off cooldown 20s
    shakeTime: 0,
  });

  // Pointer tracking for "I" blade
  const pointerTrail = useRef<{ x: number; y: number; time: number }[]>([]);
  const pointerSpeed = useRef<number>(0);
  const pointerAngle = useRef<number>(0);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  const isMouseActive = useRef<boolean>(false);
  const keysActive = useRef<{ [key: string]: boolean }>({});

  const isGameOverState = useRef<boolean>(false);

  // Setup sound on load or resume
  useEffect(() => {
    Sound.init();
    return () => {
      Sound.stopBgm();
    };
  }, []);

  // Update high score helper
  const handleScoreSubtype = (currentScore: number) => {
    if (currentScore > highScore) {
      setHighScore(currentScore);
      localStorage.setItem(`i-slicer-highscore-${mode}`, currentScore.toString());
    }
  };

  // Sound sync trigger for UI changes
  useEffect(() => {
    if (isPaused) {
      Sound.stopBgm();
    } else if (!isGameOverState.current) {
      Sound.startBgm();
    }
  }, [isPaused]);

  // Handle difficulties
  const getSpawnInterval = () => {
    if (stateRef.current.isChanceTime) {
      return 350; // fast spam!
    }
    const base = mode === 'ZEN' ? 2200 : 1500;
    if (difficulty === 'EASY') return base * 1.3;
    if (difficulty === 'HARD') return base * 0.7;
    return base;
  };

  // Spawn foods
  const spawnFood = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.width;
    const height = canvas.height;
    const state = stateRef.current;

    // --- Chance Time Active spawns ---
    if (state.isChanceTime) {
      // Spawn 1-3 items at once at extreme frequencies
      const count = Math.floor(Math.random() * 2) + 2; // 2 or 3 items
      for (let i = 0; i < count; i++) {
        const isGiantBurger = Math.random() < 0.45; // 45% chance of giant burger!
        let startX = width * (0.15 + Math.random() * 0.7);
        let startY = height + 40;
        let vx = (width / 2 - startX) * 0.015 + (Math.random() - 0.5) * 5;
        let vy = -Math.sqrt(height * 0.05) - 3 - Math.random() * 5;

        if (isGiantBurger) {
          const isPizza = Math.random() > 0.5;
          const emoji = isPizza ? '🍕' : '🍔';
          const name = isPizza ? '巨大ピザ' : '巨大バーガー';
          
          state.enemies.push({
            id: Math.random().toString(),
            type: 'BOSS',
            emoji,
            name,
            color: '#b45309',
            x: startX,
            y: startY,
            vx,
            vy,
            radius: 70, // giant burger!
            rotation: Math.random() * Math.PI,
            rotationSpeed: (Math.random() - 0.5) * 0.1,
            health: 1, // one slice only during chance time!
            maxHealth: 1,
            isSliced: false,
            points: 100, // worth 100 points!
          });
        } else {
          // Normal foods pool (exclude boss, bomb and Rotten)
          const pool = FOOD_POOL.filter(f => f.type !== 'BOSS' && f.type !== 'BOMB' && f.type !== 'ROTTEN');
          const item = pool[Math.floor(Math.random() * pool.length)];
          const scaleRadius = item.type === 'ROTTEN' ? 24 : item.type === 'SPLITTER' ? 38 : 30;

          state.enemies.push({
            id: Math.random().toString(),
            type: item.type as EnemyType,
            emoji: item.emoji,
            name: item.name,
            color: item.color,
            x: startX,
            y: startY,
            vx,
            vy,
            radius: scaleRadius,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.09,
            health: 1,
            maxHealth: 1,
            isSliced: false,
            points: item.score * 2, // Double points!
          });
        }
      }
      return;
    }

    // --- Standard Spawns (Non Chance Time) ---
    const isBossDue = mode !== 'ZEN' && state.score > 200 && state.bossSpawnTimer <= 0;

    if (isBossDue) {
      state.bossSpawnTimer = 35; // cooldown between bosses (seconds)
      const isPizza = Math.random() > 0.5;
      const emoji = isPizza ? '🍕' : '🍔';
      const name = isPizza ? '巨大ピザ' : '巨大バーガー';

      Sound.playBossSiren();

      // Spawn warnings
      state.floatingTexts.push({
        id: Math.random().toString(),
        text: `⚠️ BOSS: ${name} ⚠️`,
        x: width / 2,
        y: height / 2 - 100,
        color: '#f43f5e',
        size: 38,
        vy: -0.5,
        alpha: 1,
      });

      const bossEnemy: FoodEnemy = {
        id: Math.random().toString(),
        type: 'BOSS',
        emoji,
        name,
        color: '#f97316',
        x: width / 2,
        y: height + 100,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -Math.sqrt(height * 0.05) - (difficulty === 'HARD' ? 3 : 1), // jumps high
        radius: 80,
        rotation: 0,
        rotationSpeed: 0.015,
        health: difficulty === 'HARD' ? 12 : difficulty === 'EASY' ? 6 : 8,
        maxHealth: difficulty === 'HARD' ? 12 : difficulty === 'EASY' ? 6 : 8,
        isSliced: false,
        points: 150,
      };
      state.enemies.push(bossEnemy);
      return;
    }

    // Standard multi-launch logic
    const count = Math.floor(Math.random() * (difficulty === 'HARD' ? 3 : 2)) + 1;
    for (let i = 0; i < count; i++) {
      // Pick random food (exclude boss and bombs naturally)
      const pool = FOOD_POOL.filter(f => f.type !== 'BOSS' && f.type !== 'BOMB');
      
      // Determine if this item is a bomb! (15%-25% chance, but only on Arcade/Survival)
      const isBomb = mode !== 'ZEN' && Math.random() < (difficulty === 'HARD' ? 0.25 : 0.15);
      const item = isBomb 
        ? (FOOD_POOL.find(f => f.type === 'BOMB') || { emoji: '💣', name: '爆弾', color: '#3f3f46', score: -100, type: 'BOMB' })
        : pool[Math.floor(Math.random() * pool.length)];

      // Fly from sides only (standard Fruit Ninja, no bottom spawn)
      const side = Math.random();
      let startX = 0;
      let startY = 0;
      let vx = 0;
      let vy = 0;

      if (side < 0.5) {
        // Fly from left wall toward center
        startX = -30;
        startY = height * (0.4 + Math.random() * 0.4);
        vx = 5 + Math.random() * 4;
        vy = -3 - Math.random() * 3;
      } else {
        // Fly from right wall toward center
        startX = width + 30;
        startY = height * (0.4 + Math.random() * 0.4);
        vx = -5 - Math.random() * 4;
        vy = -3 - Math.random() * 3;
      }

      // Speedy adjustment
      if (item.type === 'SPEEDY') {
        vx *= 1.4;
        vy *= 1.3;
      }

      const scaleRadius = item.type === 'ROTTEN' ? 24 : item.type === 'SPLITTER' ? 38 : item.type === 'BOMB' ? 32 : 30;

      const newEnemy: FoodEnemy = {
        id: Math.random().toString(),
        type: item.type as EnemyType,
        emoji: item.emoji,
        name: item.name,
        color: item.color,
        x: startX,
        y: startY,
        vx,
        vy,
        radius: scaleRadius,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.09,
        health: item.type === 'ARMORED' ? 2 : 1,
        maxHealth: item.type === 'ARMORED' ? 2 : 1,
        isSliced: false,
        points: item.score,
      };

      stateRef.current.enemies.push(newEnemy);
    }
  }, [difficulty, mode]);

  // Math Helper: Intersect segment with circle boundary
  const lineCircleIntersect = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    cx: number,
    cy: number,
    r: number
  ): boolean => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;

    if (lenSq === 0) {
      const rx = cx - x1;
      const ry = cy - y1;
      return rx * rx + ry * ry <= r * r;
    }

    let t = ((cx - x1) * dx + (cy - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const projX = x1 + t * dx;
    const projY = y1 + t * dy;

    const rx = cx - projX;
    const ry = cy - projY;

    return rx * rx + ry * ry <= r * r;
  };

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysActive.current[e.key.toLowerCase()] = true;
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(e.key.toLowerCase())) {
        isMouseActive.current = false; // prioritize key coords
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysActive.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Set up mouse & touch listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const trackPointer = (clientX: number, clientY: number, isActive: boolean) => {
      if (isPaused || isGameOverState.current) return;

      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      // No offset, let the knife position match the touch position directly for better accuracy
      const y = Math.max(0, clientY - rect.top);

      isMouseActive.current = isActive;

      if (!lastPointer.current) {
        lastPointer.current = { x, y };
      }

      const dx = x - lastPointer.current.x;
      const dy = y - lastPointer.current.y;
      pointerSpeed.current = Math.sqrt(dx * dx + dy * dy);

      if (pointerSpeed.current > 1) {
        pointerAngle.current = Math.atan2(dy, dx);
      }

      pointerTrail.current.push({ x, y, time: Date.now() });
      if (pointerTrail.current.length > 30) {
        pointerTrail.current.shift();
      }

      lastPointer.current = { x, y };

      // sound effects on major swipes
      if (pointerSpeed.current > 30 && Math.random() > 0.6) {
        Sound.playSwoosh(pointerSpeed.current);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      trackPointer(e.clientX, e.clientY, true);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isMouseActive.current || pointerTrail.current.length < 5) {
        trackPointer(e.clientX, e.clientY, isMouseActive.current || e.buttons > 0);
      }
    };

    const handleMouseUp = () => {
      isMouseActive.current = false;
      pointerTrail.current = [];
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches[0]) {
        trackPointer(e.touches[0].clientX, e.touches[0].clientY, true);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) {
        trackPointer(e.touches[0].clientX, e.touches[0].clientY, true);
      }
    };

    const handleTouchEnd = () => {
      isMouseActive.current = false;
      pointerTrail.current = [];
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isPaused]);

  // Main Canvas animation state engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let resizer: ResizeObserver;
    const handleResize = () => {
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };

    if (canvas.parentElement) {
      resizer = new ResizeObserver(() => handleResize());
      resizer.observe(canvas.parentElement);
    }
    handleResize();

    let animationFrameId: number;
    let accumulatedTime = 0;
    const stepTime = 1000 / 60; // 60fps simulation step

    // Initial state trigger
    const state = stateRef.current;
    state.score = 0;
    state.slicedCount = 0;
    state.lives = mode === 'SURVIVAL' ? 3 : 99;
    state.timeRemaining = mode === 'ARCADE' ? 60 : 0;
    state.lastFrameTime = performance.now();
    state.enemies = [];
    state.splitHalves = [];
    state.particles = [];
    state.splats = [];
    state.floatingTexts = [];
    state.comboCount = 0;
    state.maxCombo = 0;
    state.bossesDefeated = 0;
    state.bossSpawnTimer = 10; // boss in first 10 seconds of arcade
    isGameOverState.current = false;

    // Trigger initial stats
    onStatsUpdate(state.score, state.comboCount, state.lives, state.timeRemaining, state.isChanceTime);

    const updatePhysics = (dt: number) => {
      if (isPaused || isGameOverState.current) return;

      // Decrement shakeTime
      if (state.shakeTime > 0) {
        state.shakeTime -= dt;
      }

      // Chance Time state machine
      if (state.isChanceTime) {
        state.chanceTimeTimer -= dt / 1000;
        if (state.chanceTimeTimer <= 0) {
          state.isChanceTime = false;
          state.chanceTimeTimer = 0;
          state.chanceTimeCooldown = 25 + Math.random() * 20; // 25-45s cooldown
          
          state.floatingTexts.push({
            id: Math.random().toString(),
            text: `⌛ CHANCE TIME OVER ⌛`,
            x: canvas.width / 2,
            y: canvas.height / 2 - 100,
            color: '#a1a1aa',
            size: 26,
            vy: -1,
            alpha: 1,
          });
          onStatsUpdate(state.score, state.comboCount, state.lives, state.timeRemaining, false);
        }
      } else {
        state.chanceTimeCooldown -= dt / 1000;
        if (state.chanceTimeCooldown <= 0) {
          // 1.5% chance per second (simulation runs at 60 steps/sec)
          if (Math.random() < 0.015 / 60) {
            state.isChanceTime = true;
            state.chanceTimeTimer = 10; // 10 seconds of glorious sliced burgers!
            state.chanceTimeCooldown = 9999; // lock until done

            Sound.playLevelUp(); // play epic design level up tune

            state.floatingTexts.push({
              id: Math.random().toString(),
              text: `🌟 CHANCE TIME!! 🍔🍔🍔`,
              x: canvas.width / 2,
              y: canvas.height / 2 - 100,
              color: '#f59e0b',
              size: 44,
              vy: -0.5,
              alpha: 1,
            });
            onStatsUpdate(state.score, state.comboCount, state.lives, state.timeRemaining, true);
          }
        }
      }

      // Timer deduction for arcade
      if (mode === 'ARCADE') {
        state.timeRemaining -= dt / 1000;
        if (state.timeRemaining <= 0) {
          state.timeRemaining = 0;
          gameOverTrigger();
        }
      }

      state.bossSpawnTimer -= dt / 1000;

      // 1. Keyboard blade motion
      let moveX = 0;
      let moveY = 0;
      const speed = 12 * (difficulty === 'HARD' ? 1.2 : 1.0);
      if (keysActive.current['arrowup'] || keysActive.current['w']) moveY -= speed;
      if (keysActive.current['arrowdown'] || keysActive.current['s']) moveY += speed;
      if (keysActive.current['arrowleft'] || keysActive.current['a']) moveX -= speed;
      if (keysActive.current['arrowright'] || keysActive.current['d']) moveX += speed;

      if (moveX !== 0 || moveY !== 0) {
        state.keyboardVelocity = { x: moveX, y: moveY };
        state.keyboardX = Math.max(20, Math.min(canvas.width - 20, state.keyboardX + moveX));
        state.keyboardY = Math.max(20, Math.min(canvas.height - 20, state.keyboardY + moveY));

        pointerAngle.current = Math.atan2(moveY, moveX);
        pointerSpeed.current = Math.sqrt(moveX * moveX + moveY * moveY);

        pointerTrail.current.push({ x: state.keyboardX, y: state.keyboardY, time: Date.now() });
        if (pointerTrail.current.length > 25) pointerTrail.current.shift();
      } else {
        // Decelerate keyboard velocity
        state.keyboardVelocity.x *= 0.8;
        state.keyboardVelocity.y *= 0.8;
      }

      // 2. Clean old trails
      const now = Date.now();
      pointerTrail.current = pointerTrail.current.filter(p => now - p.time < 220);

      // 3. Spawns
      state.spawnTimer += dt;
      const spInterval = getSpawnInterval();
      if (state.spawnTimer >= spInterval) {
        state.spawnTimer = 0;
        spawnFood();
      }

      // 4. Update Fruits physics
      const GRAVITY = 0.22;
      let slicedThisFrame: FoodEnemy[] = [];

      state.enemies = state.enemies.filter(f => {
        // App mechanics
        f.x += f.vx;
        f.y += f.vy;
        f.vy += GRAVITY; // apply gravity
        f.rotation += f.rotationSpeed;

        // Spawn constant aesthetic trails for toxic mold vs burning fuse
        if (f.type === 'ROTTEN') {
          if (Math.random() < 0.25) {
            state.particles.push({
              id: Math.random().toString(),
              x: f.x + (Math.random() - 0.5) * f.radius * 0.8,
              y: f.y + (Math.random() - 0.5) * f.radius * 0.8,
              vx: (Math.random() - 0.5) * 1.5,
              vy: (Math.random() - 0.5) * 1.5 - 0.5,
              color: Math.random() > 0.45 ? '#22c55e' : '#a855f7', // Glowing toxic green and purple spores
              radius: 2 + Math.random() * 4,
              alpha: 0.9,
              decay: 0.02 + Math.random() * 0.02,
              isJuice: false,
            });
          }
        } else if (f.type === 'BOMB') {
          if (Math.random() < 0.4) {
            const angle = f.rotation - Math.PI / 4;
            const fuseX = f.x + Math.cos(angle) * (f.radius - 2);
            const fuseY = f.y + Math.sin(angle) * (f.radius - 2);
            state.particles.push({
              id: Math.random().toString(),
              x: fuseX,
              y: fuseY,
              vx: (Math.random() - 0.5) * 2 + f.vx * 0.3,
              vy: -1 - Math.random() * 1.5 + f.vy * 0.3,
              color: Math.random() > 0.5 ? '#f59e0b' : '#ef4444', // Orange or red fire fuse sparks
              radius: 1.5 + Math.random() * 2,
              alpha: 1,
              decay: 0.04 + Math.random() * 0.03,
              isJuice: false,
            });
          }
        }

        // In survival, falling past the screen without being sliced is ignored
        if (f.y > canvas.height + 120) {
          return false;
        }

        // --- Collision Check (Slash with "I" Blade) ---
        let collides = false;
        if (pointerTrail.current.length > 1) {
          // Iterate over active swipe path
          for (let i = 1; i < pointerTrail.current.length; i++) {
            const p1 = pointerTrail.current[i - 1];
            const p2 = pointerTrail.current[i];
            
            // Only check segments that are extremely fresh (within 80ms) to ensure tactical precision
            if (now - p2.time < 120) {
              // Check collision with a slightly wider "blade" of 6px thickness
              if (lineCircleIntersect(p1.x, p1.y, p2.x, p2.y, f.x, f.y, f.radius + 6)) {
                collides = true;
                break;
              }
            }
          }
        }

        if (collides && !f.isSliced) {
          f.health -= 1;

          // Sound slicing trigger
          Sound.playSlice();

          // Spawn juice splash, sparks
          spawnJuiceBurst(f.x, f.y, f.color);

          if (f.health <= 0) {
            f.isSliced = true;
            f.sliceAngle = pointerAngle.current;
            slicedThisFrame.push(f);
            return false;
          } else {
            // Shake armored items or bosses
            f.vx += (Math.random() - 0.5) * 4;
            f.vy -= 1.5;
            state.floatingTexts.push({
              id: Math.random().toString(),
              text: `${f.emoji} 硬い`,
              x: f.x,
              y: f.y - 40,
              color: '#fbbf24',
              size: 16,
              vy: -1.5,
              alpha: 1,
            });
          }
        }
        return true;
      });

      // 5. Handle Sliced Fruit Combos & Split physics creation
      if (slicedThisFrame.length > 0) {
        state.slicedCount += slicedThisFrame.length;

        slicedThisFrame.forEach(enemy => {
          // Check Bomb explosion
          if (enemy.type === 'BOMB') {
            Sound.playBomb();
            state.shakeTime = 600; // Trigger screen shake!

            // score deduction
            state.score = Math.max(0, state.score - 100);

            if (mode === 'SURVIVAL') {
              state.lives -= 1;
              Sound.playLifeLost();
              if (state.lives <= 0) gameOverTrigger();
            } else if (mode === 'ARCADE') {
              state.timeRemaining = Math.max(0, state.timeRemaining - 15); // lose 15 seconds!
            }

            state.floatingTexts.push({
              id: Math.random().toString(),
              text: '💥 爆弾起爆!!! BOMB EXPLOSION!',
              x: enemy.x,
              y: enemy.y,
              color: '#f97316',
              size: 28,
              vy: -2.5,
              alpha: 1,
            });

            // Splat dark fire burn marks
            createStaticSplat(enemy.x, enemy.y, 'rgba(25, 25, 25, 0.95)');
            createStaticSplat(enemy.x + 20, enemy.y - 12, 'rgba(239, 68, 68, 0.45)');

            // Flame sparks particles
            for (let i = 0; i < 35; i++) {
              const speedVal = 4 + Math.random() * 11;
              const angleVal = Math.random() * Math.PI * 2;
              const isFireColor = Math.random() > 0.45;
              const pColor = isFireColor ? (Math.random() > 0.5 ? '#f97316' : '#ef4444') : '#facc15';
              state.particles.push({
                id: Math.random().toString(),
                x: enemy.x,
                y: enemy.y,
                vx: Math.cos(angleVal) * speedVal,
                vy: Math.sin(angleVal) * speedVal,
                color: pColor,
                radius: 3 + Math.random() * 6,
                alpha: 1,
                decay: 0.02 + Math.random() * 0.025,
                isJuice: false,
              });
            }

            onStatsUpdate(state.score, state.comboCount, state.lives, state.timeRemaining, state.isChanceTime);
            return;
          }

          // Check rotten item penalisation
          if (enemy.type === 'ROTTEN') {
            Sound.playBomb();
            state.score += enemy.points; // subtracts
            if (state.score < 0) state.score = 0;

            if (mode === 'SURVIVAL') {
              state.lives -= 1;
              Sound.playLifeLost();
              if (state.lives <= 0) gameOverTrigger();
            } else if (mode === 'ARCADE') {
              // Time deduction removed!
            }

            state.floatingTexts.push({
              id: Math.random().toString(),
              text: '💀 カビ食品!! (Dirty!)',
              x: enemy.x,
              y: enemy.y,
              color: '#a855f7',
              size: 24,
              vy: -2,
              alpha: 1,
            });

            // Splat purple stain
            createStaticSplat(enemy.x, enemy.y, '#c084fc');
            return;
          }

          // Normal slicing points allocation
          state.score += enemy.points;

          // Split halves generation
          // Split item slides to left/right halves
          const angle = enemy.sliceAngle || 0;
          const orthX = Math.cos(angle + Math.PI / 2);
          const orthY = Math.sin(angle + Math.PI / 2);
          
          const pushForce = 3;

          // Half 1
          state.splitHalves.push({
            id: Math.random().toString(),
            emoji: enemy.emoji,
            color: enemy.color,
            x: enemy.x - orthX * 5,
            y: enemy.y - orthY * 5,
            vx: enemy.vx - orthX * pushForce,
            vy: enemy.vy - orthY * pushForce,
            radius: enemy.radius,
            rotation: enemy.rotation,
            rotationSpeed: enemy.rotationSpeed - 0.05,
            scaleX: 1,
            opacity: 1,
          });

          // Half 2
          state.splitHalves.push({
            id: Math.random().toString(),
            emoji: enemy.emoji,
            color: enemy.color,
            x: enemy.x + orthX * 5,
            y: enemy.y + orthY * 5,
            vx: enemy.vx + orthX * pushForce,
            vy: enemy.vy + orthY * pushForce,
            radius: enemy.radius,
            rotation: enemy.rotation + Math.PI,
            rotationSpeed: enemy.rotationSpeed + 0.05,
            scaleX: -1, // Flipped or reversed side
            opacity: 1,
          });

          // Add a background splat decal where it got sliced
          createStaticSplat(enemy.x, enemy.y, enemy.color);

          // If boss was defeated
          if (enemy.type === 'BOSS') {
            state.bossesDefeated += 1;
            Sound.playLevelUp();
            state.floatingTexts.push({
              id: Math.random().toString(),
              text: '🔥 BOSS DEFEATED +150! 🔥',
              x: enemy.x,
              y: enemy.y - 20,
              color: '#10b981',
              size: 32,
              vy: -2,
              alpha: 1,
            });

            // Spawn 5 fresh fruits popping from boss location!
            for (let b = 0; b < 5; b++) {
              const miniItem = FOOD_POOL[Math.floor(Math.random() * 8)];
              state.enemies.push({
                id: Math.random().toString(),
                type: 'STANDARD',
                emoji: miniItem.emoji,
                name: miniItem.name,
                color: miniItem.color,
                x: enemy.x + (Math.random() - 0.5) * 60,
                y: enemy.y + (Math.random() - 0.5) * 60,
                vx: (Math.random() - 0.5) * 10,
                vy: -5 - Math.random() * 5,
                radius: 26,
                rotation: Math.random() * Math.PI,
                rotationSpeed: 0.05,
                health: 1,
                maxHealth: 1,
                isSliced: false,
                points: miniItem.score,
              });
            }
          }
        });

        // Combo tracker
        if (slicedThisFrame.length >= 2) {
          state.comboCount = slicedThisFrame.length;
          if (state.comboCount > state.maxCombo) {
            state.maxCombo = state.comboCount;
          }

          Sound.playCombo(state.comboCount);

          // Standard multi-combo bonus
          const comboBonus = state.comboCount * 15;
          state.score += comboBonus;

          // Render beautiful combo texts
          const firstE = slicedThisFrame[0];
          state.floatingTexts.push({
            id: Math.random().toString(),
            text: `⚔️ ${state.comboCount} COMBO! (+${comboBonus}pts)`,
            x: firstE.x,
            y: firstE.y - 65,
            color: '#fbbf24',
            size: 24,
            vy: -2,
            alpha: 1,
          });
        }

        // Trigger updates
        onStatsUpdate(state.score, state.comboCount, state.lives, state.timeRemaining, state.isChanceTime);
        handleScoreSubtype(state.score);
      }

      // 6. Update Split halves physics
      state.splitHalves = state.splitHalves.filter(h => {
        h.x += h.vx;
        h.y += h.vy;
        h.vy += GRAVITY * 0.9;
        h.rotation += h.rotationSpeed;
        h.opacity -= 0.015;
        return h.opacity > 0 && h.y < canvas.height + 100;
      });

      // 7. Update Particles
      state.particles = state.particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.isJuice) {
          p.vy += GRAVITY * 0.5; // drip juice
        }
        p.alpha -= p.decay;
        return p.alpha > 0;
      });

      // 8. Update Splat Background decals
      state.splats = state.splats.filter(s => {
        s.alpha -= 0.003; // extremely slow dissolve
        return s.alpha > 0;
      });

      // 9. Update Floating Texts
      state.floatingTexts = state.floatingTexts.filter(t => {
        t.y += t.vy;
        t.alpha -= 0.012;
        return t.alpha > 0;
      });
    };

    // Spawn splashes in various trajectories
    const spawnJuiceBurst = (x: number, y: number, color: string) => {
      // 1. Splash droplets
      for (let i = 0; i < 15; i++) {
        const speedVal = 2 + Math.random() * 6;
        const angleVal = Math.random() * Math.PI * 2;
        state.particles.push({
          id: Math.random().toString(),
          x,
          y,
          vx: Math.cos(angleVal) * speedVal,
          vy: Math.sin(angleVal) * speedVal,
          color,
          radius: 2 + Math.random() * 6,
          alpha: 1,
          decay: 0.01 + Math.random() * 0.02,
          isJuice: true,
        });
      }

      // 2. White Slash sparks
      for (let i = 0; i < 8; i++) {
        const speedVal = 4 + Math.random() * 8;
        const angleVal = pointerAngle.current + (Math.random() - 0.5) * 1.2;
        state.particles.push({
          id: Math.random().toString(),
          x,
          y,
          vx: Math.cos(angleVal) * speedVal,
          vy: Math.sin(angleVal) * speedVal,
          color: '#ffffff',
          radius: 1.5 + Math.random() * 2,
          alpha: 1,
          decay: 0.03 + Math.random() * 0.03,
          isJuice: false,
        });
      }
    };

    // Draw static splat juices on backgrounds
    const createStaticSplat = (x: number, y: number, color: string) => {
      state.splats.push({
        id: Math.random().toString(),
        x,
        y,
        color,
        radius: 30 + Math.random() * 40,
        alpha: 0.8,
        scale: 0.1,
      });

      if (state.splats.length > 40) {
        state.splats.shift(); // keep canvas performance stellar
      }
    };

    // Game Over routing
    const gameOverTrigger = () => {
      if (isGameOverState.current) return;
      isGameOverState.current = true;
      Sound.stopBgm();
      Sound.playBomb(); // heavy rumble sound
      onGameOver(stateRef.current.score, stateRef.current.maxCombo, stateRef.current.bossesDefeated);
    };

    // --- DRAWING ENGINE ---
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Apply screen shake
      ctx.save();
      if (stateRef.current.shakeTime > 0) {
        const shakePower = 12;
        const dx = (Math.random() - 0.5) * shakePower;
        const dy = (Math.random() - 0.5) * shakePower;
        ctx.translate(dx, dy);
      }

      // A. Draw Juice Splats background layer (organic messy shapes)
      state.splats.forEach(s => {
        if (s.scale < 1.0) s.scale += 0.05; // pop splash in
        ctx.save();
        ctx.globalAlpha = s.alpha;
        ctx.fillStyle = s.color;

        // Draw asymmetric juice splat using multiple circular drops
        ctx.beginPath();
        const r = s.radius * s.scale;
        ctx.arc(s.x, s.y, r * 0.7, 0, Math.PI * 2);
        ctx.fill();

        // mini drops orbiting main splat
        ctx.beginPath();
        ctx.arc(s.x - r * 0.5, s.y + r * 0.2, r * 0.25, 0, Math.PI * 2);
        ctx.arc(s.x + r * 0.4, s.y - r * 0.3, r * 0.2, 0, Math.PI * 2);
        ctx.arc(s.x + r * 0.1, s.y + r * 0.5, r * 0.18, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // B. Draw juice particles
      state.particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // C. Draw active floating texts
      state.floatingTexts.forEach(t => {
        ctx.save();
        ctx.globalAlpha = t.alpha;
        ctx.fillStyle = t.color;
        ctx.font = `bold ${t.size}px "Space Grotesk", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // shadow glow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 4;
        
        ctx.fillText(t.text, t.x, t.y);
        ctx.restore();
      });

      // D. Draw unbroken fly food enemies
      state.enemies.forEach(f => {
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rotation);

        // Standard or armored/boss resizing
        let diameterFactor = f.radius * 2;
        ctx.font = `${diameterFactor}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Draw simple shadow backing for visual depth
        ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 6;

        // Custom glow backing for Rotten and Bomb types
        if (f.type === 'ROTTEN') {
          const pulse = Math.sin(Date.now() * 0.007) * 4 + 10;
          ctx.save();
          ctx.shadowColor = '#22c55e';
          ctx.shadowBlur = pulse + 5;
          ctx.beginPath();
          ctx.arc(0, 0, f.radius + 6, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(34, 197, 94, 0.8)';
          ctx.lineWidth = 4;
          ctx.stroke();

          ctx.strokeStyle = 'rgba(168, 85, 247, 0.7)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(0, 0, f.radius + 1.5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        } else if (f.type === 'BOMB') {
          const pulse = Math.sin(Date.now() * 0.015) * 5 + 12;
          ctx.save();
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = pulse + 6;
          ctx.beginPath();
          ctx.arc(0, 0, f.radius + 6, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.95)';
          ctx.lineWidth = 4;
          ctx.stroke();
          ctx.restore();
        }

        ctx.fillText(f.emoji, 0, 0);

        // Mold/Bomb Indicator badges
        if (f.type === 'ROTTEN') {
          ctx.save();
          ctx.rotate(-f.rotation); 
          ctx.translate(0, -f.radius - 18);
          
          const labelWidth = 75;
          const labelHeight = 16;
          
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetY = 0;
          
          ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 1.5;
          ctx.fillRect(-labelWidth/2, -labelHeight/2, labelWidth, labelHeight);
          ctx.strokeRect(-labelWidth/2, -labelHeight/2, labelWidth, labelHeight);
          
          ctx.fillStyle = '#22c55e';
          ctx.font = '900 8.5px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('☣️ カビ / MOLD', 0, 0.5);
          ctx.restore();
        } else if (f.type === 'BOMB') {
          ctx.save();
          ctx.rotate(-f.rotation);
          ctx.translate(0, -f.radius - 18);
          
          const labelWidth = 72;
          const labelHeight = 16;
          
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetY = 0;

          ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1.5;
          ctx.fillRect(-labelWidth/2, -labelHeight/2, labelWidth, labelHeight);
          ctx.strokeRect(-labelWidth/2, -labelHeight/2, labelWidth, labelHeight);
          
          ctx.fillStyle = '#ef4444';
          ctx.font = '900 8.5px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⚠️ BOMB / 爆弾', 0, 0.5);
          ctx.restore();
        }

        // Boss Health Bar overlay
        if (f.type === 'BOSS' && f.health < f.maxHealth) {
          ctx.restore(); // escape rotation for health bar
          ctx.save();
          ctx.translate(f.x, f.y - f.radius - 20);
          
          const barWidth = 100;
          const barHeight = 8;
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillRect(-barWidth/2, 0, barWidth, barHeight);
          
          const ratio = f.health / f.maxHealth;
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(-barWidth/2, 0, barWidth * ratio, barHeight);
          ctx.restore();
          ctx.save();
          ctx.translate(f.x, f.y);
          ctx.rotate(f.rotation);
        }

        ctx.restore();
      });

      // E. Draw split falling halves
      state.splitHalves.forEach(h => {
        ctx.save();
        ctx.translate(h.x, h.y);
        ctx.rotate(h.rotation);
        ctx.scale(h.scaleX, 1);

        // Chop drawing by clipping the canvas in half
        ctx.beginPath();
        ctx.rect(-h.radius * 1.5, -h.radius * 1.5, h.radius * 1.5, h.radius * 3);
        ctx.clip();

        // Output emoji half
        const size = h.radius * 2;
        ctx.font = `${size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = h.opacity;
        ctx.fillText(h.emoji, 0, 0);

        ctx.restore();
      });

      // F. Draw the "I" Blade & Blade Trail
      if (pointerTrail.current.length > 1) {
        // Render slice trail line styled based on skin preference
        ctx.save();
        
        switch (style) {
          case 'NEON':
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#00f0ff';
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 4;
            break;
          case 'SAMURAI':
            ctx.shadowBlur = 8;
            ctx.shadowColor = 'rgba(255,255,255,0.7)';
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 3;
            break;
          case 'PLASMA':
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#ec4899';
            ctx.strokeStyle = '#f472b6';
            ctx.lineWidth = 6;
            break;
          case 'SABER':
            ctx.shadowBlur = 25;
            ctx.shadowColor = '#22c55e';
            ctx.strokeStyle = '#a3e635';
            ctx.lineWidth = 5;
            break;
          case 'GLITCH':
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ff0055';
            ctx.strokeStyle = '#00ffcc';
            ctx.lineWidth = 4;
            break;
        }

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(pointerTrail.current[0].x, pointerTrail.current[0].y);
        for (let i = 1; i < pointerTrail.current.length; i++) {
          ctx.lineTo(pointerTrail.current[i].x, pointerTrail.current[i].y);
        }
        ctx.stroke();
        ctx.restore();

        // DRAW GHOSTS / SWIPE ECHOES OF "I" along path to give extreme satisfaction!
        const stepSkip = Math.max(1, Math.floor(pointerTrail.current.length / 4));
        for (let i = 0; i < pointerTrail.current.length; i += stepSkip) {
          const pt = pointerTrail.current[i];
          const ageRatio = i / pointerTrail.current.length; // newer is 1

          ctx.save();
          ctx.translate(pt.x, pt.y);
          ctx.rotate(pointerAngle.current + Math.PI / 2); // align vertical layout of "I" to motion

          // stretching factor based on movement speed
          const dragScale = 1.0 + Math.min(pointerSpeed.current * 0.02, 1.5);
          ctx.scale(1.0, dragScale);

          // Skin formatting
          applyStyleStyling(ctx, style, ageRatio);

          ctx.font = `bold ${28 + ageRatio * 16}px "Georgia", "Times New Roman", serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          // Draw "I" representing the player (or shape)
          ctx.fillText(shape === 'L' ? 'L' : shape === 'X' ? 'X' : 'I', 0, 0);
          ctx.restore();
        }
      }

      // Draw the active "I" Cursor head directly if keyboard or mouse hover is operating
      const latestCoord = pointerTrail.current[pointerTrail.current.length - 1];
      if (latestCoord && !isPaused && !isGameOverState.current) {
        ctx.save();
        ctx.translate(latestCoord.x, latestCoord.y);
        // Slowly spin when sitting idle, align on active movement
        const spinAngle = pointerSpeed.current < 2 
          ? (Date.now() * 0.005) 
          : (pointerAngle.current + Math.PI / 2);
        
        ctx.rotate(spinAngle);
        
        const dragScale = 1.0 + Math.min(pointerSpeed.current * 0.03, 1.8);
        ctx.scale(1.0, dragScale);

        applyStyleStyling(ctx, style, 1.0);

        ctx.font = `bold 54px "Georgia", "Times New Roman", serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Blade head drawing
        ctx.fillText(shape === 'L' ? 'L' : shape === 'X' ? 'X' : 'I', 0, 0);

        // Core central spark
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold 36px "Georgia", "Times New Roman", serif`;
        ctx.fillText(shape === 'L' ? 'L' : shape === 'X' ? 'X' : 'I', 0, 0);
        
        ctx.restore();
      }

      // Restore screen shake
      ctx.restore();
    };

    // Helper to format styles dynamically
    const applyStyleStyling = (c: CanvasRenderingContext2D, s: BladeStyle, alpha: number) => {
      c.globalAlpha = alpha;
      switch (s) {
        case 'NEON':
          c.shadowBlur = 12;
          c.shadowColor = '#00ffff';
          c.fillStyle = '#e0f7fa';
          break;
        case 'SAMURAI':
          c.shadowBlur = 5;
          c.shadowColor = '#64748b';
          c.fillStyle = '#f8fafc';
          break;
        case 'PLASMA':
          c.shadowBlur = 15;
          c.shadowColor = '#ec4899';
          c.fillStyle = '#fce7f3';
          break;
        case 'SABER':
          c.shadowBlur = 18;
          c.shadowColor = '#22c55e';
          c.fillStyle = '#f0fdf4';
          break;
        case 'GLITCH':
          // Red-Green offset chromatic anomaly style
          c.shadowBlur = 6;
          c.shadowColor = '#ff0055';
          c.fillStyle = Math.random() > 0.5 ? '#00f5ff' : '#ff0077';
          break;
      }
    };

    // Main robust RequestAnimationFrame loop with deterministic physics step
    const loop = (timestamp: number) => {
      let dt = timestamp - state.lastFrameTime;
      if (dt > 100) dt = 16.66; // shield against initial freeze frames

      state.lastFrameTime = timestamp;
      accumulatedTime += dt;

      while (accumulatedTime >= stepTime) {
        updatePhysics(stepTime);
        accumulatedTime -= stepTime;
      }

      draw();
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (resizer) {
        resizer.disconnect();
      }
    };
  }, [mode, style, shape, difficulty, isPaused, spawnFood]);

  return (
    <div className="relative w-full h-full select-none cursor-crosshair overflow-hidden touch-none">
      {/* High Score Floating Decal */}
      <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-mono text-zinc-400 border border-zinc-800 z-10 pointer-events-none">
        🏆 High: {highScore}
      </div>

      {/* Visual Canvas */}
      <canvas
        ref={canvasRef}
        id="game-viewport"
        className="block w-full h-full bg-zinc-950"
      />
    </div>
  );
};
