import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, LazyMotion, MotionConfig, domAnimation, m, useReducedMotion } from 'motion/react';
import { questions } from './data/questions';
import { TestResult } from './components/TestResult';
import { Question } from './components/Question';

type TransitionDirection = 'forward' | 'backward';

const INTRO_DURATION = 4200;
const CELEBRATION_DURATION = 3000;
const FIREWORK_BURST_DURATION = 900;
const FIREWORK_ATLAS_COLUMNS = 5;
const FIREWORK_ATLAS_FRAME_SIZE = 240;
const FIREWORK_FRAME_COUNT = 45;
const INTRO_STORAGE_KEY = 'humanity-exploration-intro-seen-v3';
const fireworkAtlasUrl = `${import.meta.env.BASE_URL}firework-atlas.webp`;
const fireworkTones = ['purple', 'gold', 'red', 'blue'] as const;
const fireworkTint = {
  purple: { color: '#b26cff', strength: 0.62, glow: 'rgba(178, 108, 255, 0.82)' },
  gold: { color: '#ffd76e', strength: 0.12, glow: 'rgba(255, 211, 104, 0.84)' },
  red: { color: '#ef476f', strength: 0.56, glow: 'rgba(239, 71, 111, 0.8)' },
  blue: { color: '#4c9dff', strength: 0.58, glow: 'rgba(76, 157, 255, 0.82)' },
} as const;

const screenVariants = {
  enter: (direction: TransitionDirection) => ({
    opacity: 0,
    x: direction === 'forward' ? 18 : -18,
  }),
  center: {
    opacity: 1,
    x: 0,
    transition: { type: 'spring' as const, bounce: 0, duration: 0.36 },
  },
  exit: (direction: TransitionDirection) => ({
    opacity: 0,
    x: direction === 'forward' ? -12 : 12,
    transition: { type: 'spring' as const, bounce: 0, duration: 0.18 },
  }),
};

const progressTransition = { type: 'spring' as const, bounce: 0, duration: 0.4 };

function createShuffleSeed() {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0];
  }

  return Math.floor(Math.random() * 0x100000000);
}

function shouldShowIntro() {
  try {
    return window.sessionStorage.getItem(INTRO_STORAGE_KEY) !== '1';
  } catch {
    return true;
  }
}

interface CelebrationProps {
  atlas: HTMLImageElement | null;
  fireworks: FireworkBurst[];
  reducedMotion: boolean;
}

type FireworkTone = (typeof fireworkTones)[number];

interface FireworkBurst {
  delay: number;
  id: number;
  rotation: number;
  sizeRatio: number;
  tone: FireworkTone;
  xRatio: number;
  yRatio: number;
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * Math.max(0, max - min);
}

function createRandomFireworks(): FireworkBurst[] {
  const viewportWidth = typeof window === 'undefined' ? 1200 : Math.max(window.innerWidth, 320);
  const viewportHeight = typeof window === 'undefined' ? 800 : Math.max(window.innerHeight, 480);
  const isNarrow = viewportWidth <= 640;
  const burstCount = isNarrow ? 8 : 10;
  const maximumDelay = CELEBRATION_DURATION - FIREWORK_BURST_DURATION - 80;
  const minSize = isNarrow
    ? Math.max(124, Math.min(156, viewportWidth * 0.35))
    : Math.max(176, Math.min(230, Math.min(viewportWidth, viewportHeight) * 0.24));
  const maxSize = isNarrow
    ? Math.max(minSize, Math.min(194, viewportWidth * 0.47))
    : Math.max(minSize, Math.min(320, Math.min(viewportWidth, viewportHeight) * 0.35));
  const bursts: FireworkBurst[] = [];

  Array.from({ length: burstCount }).forEach((_, index) => {
    const size = Math.round(randomBetween(minSize, maxSize));
    const halfSize = size / 2;
    const edgePadding = isNarrow ? 8 : 18;
    const minX = halfSize + edgePadding;
    const maxX = Math.max(minX, viewportWidth - halfSize - edgePadding);
    const minY = halfSize + edgePadding;
    const maxY = Math.max(minY, viewportHeight - halfSize - edgePadding);
    let x = randomBetween(minX, maxX);
    let y = randomBetween(minY, maxY);

    for (let attempt = 0; attempt < 16; attempt += 1) {
      const overlaps = bursts.some((burst) => {
        const distance = Math.hypot(x - burst.x, y - burst.y);
        return distance < (size + burst.size) * 0.3;
      });

      if (!overlaps) break;
      x = randomBetween(minX, maxX);
      y = randomBetween(minY, maxY);
    }

    bursts.push({
      delay: Math.round((maximumDelay * index) / Math.max(1, burstCount - 1)),
      id: index,
      rotation: randomBetween(-7, 7),
      sizeRatio: size / Math.min(viewportWidth, viewportHeight),
      tone: fireworkTones[index % fireworkTones.length],
      xRatio: x / viewportWidth,
      yRatio: y / viewportHeight,
    });
  });

  return bursts;
}

function FireworkCanvas({ atlas, fireworks }: Pick<CelebrationProps, 'atlas' | 'fireworks'>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!atlas || !canvas) return;

    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return;

    const scratch = document.createElement('canvas');
    scratch.width = FIREWORK_ATLAS_FRAME_SIZE;
    scratch.height = FIREWORK_ATLAS_FRAME_SIZE;
    const scratchContext = scratch.getContext('2d', { alpha: true });
    if (!scratchContext) return;

    let width = 0;
    let height = 0;
    let animationFrame = 0;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);

    const resizeCanvas = () => {
      width = Math.max(window.innerWidth, 320);
      height = Math.max(window.innerHeight, 480);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas, { passive: true });
    const startedAt = performance.now();

    const draw = (now: number) => {
      const elapsed = now - startedAt;
      context.clearRect(0, 0, width, height);

      fireworks.forEach((firework) => {
        const localTime = elapsed - firework.delay;
        if (localTime < 0 || localTime > FIREWORK_BURST_DURATION) return;

        const progress = Math.min(1, localTime / FIREWORK_BURST_DURATION);
        const frameIndex = Math.min(FIREWORK_FRAME_COUNT - 1, Math.floor(progress * FIREWORK_FRAME_COUNT));
        const sourceX = (frameIndex % FIREWORK_ATLAS_COLUMNS) * FIREWORK_ATLAS_FRAME_SIZE;
        const sourceY = Math.floor(frameIndex / FIREWORK_ATLAS_COLUMNS) * FIREWORK_ATLAS_FRAME_SIZE;
        const shortSide = Math.min(width, height);
        const size = firework.sizeRatio * shortSide;
        const halfSize = size / 2;
        const edgePadding = width <= 640 ? 8 : 18;
        const x = Math.min(width - halfSize - edgePadding, Math.max(halfSize + edgePadding, firework.xRatio * width));
        const y = Math.min(height - halfSize - edgePadding, Math.max(halfSize + edgePadding, firework.yRatio * height));
        const fadeIn = Math.min(1, progress / 0.07);
        const fadeOut = progress > 0.84 ? Math.max(0, (1 - progress) / 0.16) : 1;
        const opacity = fadeIn * fadeOut;
        const scale = 0.82 + 0.2 * (1 - Math.pow(1 - progress, 3));
        const tint = fireworkTint[firework.tone];

        scratchContext.clearRect(0, 0, FIREWORK_ATLAS_FRAME_SIZE, FIREWORK_ATLAS_FRAME_SIZE);
        scratchContext.globalAlpha = 1;
        scratchContext.globalCompositeOperation = 'source-over';
        scratchContext.drawImage(
          atlas,
          sourceX,
          sourceY,
          FIREWORK_ATLAS_FRAME_SIZE,
          FIREWORK_ATLAS_FRAME_SIZE,
          0,
          0,
          FIREWORK_ATLAS_FRAME_SIZE,
          FIREWORK_ATLAS_FRAME_SIZE,
        );
        scratchContext.globalCompositeOperation = 'source-atop';
        scratchContext.globalAlpha = tint.strength;
        scratchContext.fillStyle = tint.color;
        scratchContext.fillRect(0, 0, FIREWORK_ATLAS_FRAME_SIZE, FIREWORK_ATLAS_FRAME_SIZE);
        scratchContext.globalAlpha = 1;
        scratchContext.globalCompositeOperation = 'source-over';

        context.save();
        context.globalAlpha = opacity;
        context.translate(x, y);
        context.rotate((firework.rotation * Math.PI) / 180);
        context.scale(scale, scale);
        context.shadowBlur = Math.min(22, size * 0.09);
        context.shadowColor = tint.glow;
        context.drawImage(scratch, -halfSize, -halfSize, size, size);
        context.restore();
      });

      if (elapsed < CELEBRATION_DURATION) {
        animationFrame = window.requestAnimationFrame(draw);
      }
    };

    animationFrame = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [atlas, fireworks]);

  return <canvas ref={canvasRef} className="firework-canvas" aria-hidden="true" />;
}

function Celebration({ atlas, fireworks, reducedMotion }: CelebrationProps) {
  return (
    <m.div
      className="celebration-overlay"
      role="status"
      aria-label="測驗完成，正在揭曉結果"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0.15 : 0.28 }}
    >
      <m.span
        className="celebration-glow"
        aria-hidden="true"
        initial={{ opacity: 0, scale: 0.72, x: '-50%', y: '-50%' }}
        animate={{
          opacity: reducedMotion ? [0, 0.5, 0] : [0, 0.72, 0.24, 0],
          scale: reducedMotion ? 1 : [0.72, 1.08, 1.18],
          x: '-50%',
          y: '-50%',
        }}
        transition={{ duration: reducedMotion ? 0.45 : 2.85, times: reducedMotion ? [0, 0.5, 1] : [0, 0.22, 0.72, 1], ease: 'easeOut' }}
      />

      {!reducedMotion && <FireworkCanvas atlas={atlas} fireworks={fireworks} />}
    </m.div>
  );
}

function App() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [direction, setDirection] = useState<TransitionDirection>('forward');
  const [showIntro, setShowIntro] = useState(shouldShowIntro);
  const [shuffleSeed, setShuffleSeed] = useState(createShuffleSeed);
  const [fireworks, setFireworks] = useState(createRandomFireworks);
  const [fireworkAtlas, setFireworkAtlas] = useState<HTMLImageElement | null>(null);
  const experienceRef = useRef<HTMLDivElement>(null);
  const pointerFrame = useRef<number | null>(null);
  const pointerPosition = useRef({ x: 0, y: 0 });
  const prefersReducedMotion = useReducedMotion();

  const dismissIntro = useCallback(() => {
    setShowIntro(false);
    try {
      window.sessionStorage.setItem(INTRO_STORAGE_KEY, '1');
    } catch {
      // The intro can still complete when storage is unavailable.
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const atlas = new Image();
    atlas.decoding = 'async';
    atlas.src = fireworkAtlasUrl;

    const markReady = () => {
      if (!cancelled) setFireworkAtlas(atlas);
    };

    atlas.decode().then(markReady).catch(() => {
      if (atlas.complete) markReady();
      else atlas.addEventListener('load', markReady, { once: true });
    });

    return () => {
      cancelled = true;
      atlas.removeEventListener('load', markReady);
    };
  }, []);

  useEffect(() => {
    if (!showIntro) return;

    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    experienceRef.current?.scrollTo(0, 0);

    const introTimer = window.setTimeout(dismissIntro, prefersReducedMotion ? 80 : INTRO_DURATION);
    return () => window.clearTimeout(introTimer);
  }, [dismissIntro, prefersReducedMotion, showIntro]);

  useEffect(() => {
    if (!showCelebration) return;

    const celebrationTimer = window.setTimeout(() => {
      setShowCelebration(false);
      setIsComplete(true);
    }, prefersReducedMotion ? 450 : CELEBRATION_DURATION);

    return () => window.clearTimeout(celebrationTimer);
  }, [prefersReducedMotion, showCelebration]);

  useEffect(() => () => {
    if (pointerFrame.current !== null) window.cancelAnimationFrame(pointerFrame.current);
  }, []);

  useEffect(() => {
    let previousTouchX = 0;
    let previousTouchY = 0;

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      previousTouchX = event.touches[0].clientX;
      previousTouchY = event.touches[0].clientY;
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;

      const currentTouch = event.touches[0];
      const deltaX = currentTouch.clientX - previousTouchX;
      const deltaY = currentTouch.clientY - previousTouchY;
      previousTouchX = currentTouch.clientX;
      previousTouchY = currentTouch.clientY;

      if (Math.abs(deltaY) <= Math.abs(deltaX)) return;

      const scroller = document.scrollingElement ?? document.documentElement;
      const maximumScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
      const isAtTop = scroller.scrollTop <= 0;
      const isAtBottom = scroller.scrollTop >= maximumScroll - 1;
      const isPullingPastTop = isAtTop && deltaY > 0;
      const isPullingPastBottom = isAtBottom && deltaY < 0;

      if (event.cancelable && (maximumScroll <= 1 || isPullingPastTop || isPullingPastBottom)) {
        event.preventDefault();
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  const transitionTo = useCallback((next: () => void, nextDirection: TransitionDirection) => {
    setDirection(nextDirection);
    next();
  }, []);

  const handleAnswer = useCallback((answer: number) => {
    transitionTo(() => {
      setAnswers(previous => [...previous, answer]);

      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(previous => previous + 1);
      } else {
        setShowCelebration(true);
      }
    }, 'forward');
  }, [currentQuestion, transitionTo]);

  const handlePrevious = useCallback(() => {
    if (currentQuestion === 0) return;

    transitionTo(() => {
      setCurrentQuestion(previous => previous - 1);
      setAnswers(previous => previous.slice(0, -1));
    }, 'backward');
  }, [currentQuestion, transitionTo]);

  const handleRestart = useCallback(() => {
    transitionTo(() => {
      setCurrentQuestion(0);
      setAnswers([]);
      setIsComplete(false);
      setShowCelebration(false);
      setShuffleSeed(createShuffleSeed());
      setFireworks(createRandomFireworks());
      setShowIntro(true);
    }, 'backward');
  }, [transitionTo]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!experienceRef.current) return;
    pointerPosition.current = { x: event.clientX, y: event.clientY };

    if (pointerFrame.current !== null) return;
    pointerFrame.current = window.requestAnimationFrame(() => {
      const experience = experienceRef.current;
      if (experience) {
        experience.style.setProperty('--pointer-x', `${pointerPosition.current.x}px`);
        experience.style.setProperty('--pointer-y', `${pointerPosition.current.y}px`);
      }
      pointerFrame.current = null;
    });
  }, []);

  const progress = isComplete || showCelebration ? 100 : ((currentQuestion + 1) / questions.length) * 100;
  const screenKey = isComplete ? 'result' : `question-${currentQuestion}`;
  const logoUrl = `${import.meta.env.BASE_URL}rich-team-logo-transparent.png`;

  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">
        <div className="experience" ref={experienceRef} onPointerMove={handlePointerMove}>
          <AnimatePresence>
            {showIntro && (
              <m.div
                className="intro-overlay"
                aria-label="Rich Team 品牌開場"
                initial={{ opacity: 1 }}
                animate={prefersReducedMotion ? { opacity: 1 } : { opacity: [1, 1, 0] }}
                exit={{ opacity: 0 }}
                transition={prefersReducedMotion
                  ? { duration: 0.08 }
                  : { duration: 4.2, times: [0, 0.8, 1], ease: 'linear' }}
              >
                <span className="intro-glow intro-glow-one" aria-hidden="true" />
                <span className="intro-glow intro-glow-two" aria-hidden="true" />
                <m.div
                  className="intro-logo-vessel"
                  initial={prefersReducedMotion ? { opacity: 1 } : {
                    opacity: 0,
                    x: '-115vw',
                    y: '32vh',
                    rotate: -16,
                    scale: 0.58,
                    filter: 'blur(10px)',
                  }}
                  animate={prefersReducedMotion ? { opacity: 1 } : {
                    opacity: [0, 1, 1, 1, 0],
                    x: ['-115vw', '2.5vw', '0vw', '0vw', '0vw'],
                    y: ['32vh', '-1vh', '0vh', '0vh', '-24vh'],
                    rotate: [-16, 2.2, 0, 0, 0],
                    scale: [0.58, 1.08, 1, 1, 0.56],
                    filter: ['blur(10px)', 'blur(0px)', 'blur(0px)', 'blur(0px)', 'blur(5px)'],
                  }}
                  transition={prefersReducedMotion ? { duration: 0 } : {
                    duration: 4.2,
                    times: [0, 0.26, 0.31, 0.79, 1],
                    ease: [[0.16, 1, 0.3, 1], [0.22, 1, 0.36, 1], 'linear', [0.32, 0, 0.67, 0]],
                  }}
                >
                  <span className="intro-orbit" aria-hidden="true" />
                  <span className="intro-logo-glint" aria-hidden="true" />
                  <img src={logoUrl} alt="Rich Team Elite Group" className="intro-logo" />
                </m.div>
                <button
                  type="button"
                  className="intro-dismiss"
                  onClick={dismissIntro}
                  aria-label="略過開場動畫"
                />
              </m.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showCelebration && (
              <Celebration
                atlas={fireworkAtlas}
                fireworks={fireworks}
                reducedMotion={Boolean(prefersReducedMotion)}
              />
            )}
          </AnimatePresence>

          <div className="atmosphere" aria-hidden="true">
            <span className="aurora aurora-one" />
            <span className="aurora aurora-two" />
            <span className="aurora aurora-three" />
            <span className="light-stream stream-one" />
            <span className="light-stream stream-two" />
            <span className="grain" />
            <span className="pointer-aura" />
          </div>

          <div className="shell">
            <header className="hero">
              <div className="brand-lockup">
                <div className="logo-vessel">
                  <span className="logo-glint" aria-hidden="true" />
                  <img src={logoUrl} alt="Rich Team Elite Group" className="brand-logo" />
                </div>
                <h1>人性探索測試</h1>
              </div>
            </header>

            <div className="progress-island" aria-hidden="true">
              <div className="progress-track">
                <m.span className="progress-fill" initial={false} animate={{ width: `${progress}%` }} transition={progressTransition} />
              </div>
              <m.span className="progress-orb" initial={false} animate={{ left: `${progress}%` }} transition={progressTransition} />
            </div>

            <main className="glass-stage">
              <div className="glass-refraction" aria-hidden="true" />
              <AnimatePresence initial={false} custom={direction} mode="wait">
                <m.div key={screenKey} className="screen-transition" custom={direction} variants={screenVariants} initial="enter" animate="center" exit="exit">
                  {!isComplete ? (
                    <Question
                      question={questions[currentQuestion]}
                      onAnswer={handleAnswer}
                      onPrevious={handlePrevious}
                      currentNumber={currentQuestion + 1}
                      total={questions.length}
                      showPrevious={currentQuestion > 0}
                      shuffleSeed={shuffleSeed}
                    />
                  ) : (
                    <div className="result-screen">
                      <TestResult answers={answers} />
                      <m.button
                        onClick={handleRestart}
                        className="liquid-action restart-button"
                        whileHover={{ y: -1 }}
                        whileTap={{ y: 0, scale: 0.985 }}
                        transition={{ type: 'spring', bounce: 0, duration: 0.14 }}
                      >
                        <span>重新測試</span>
                      </m.button>
                    </div>
                  )}
                </m.div>
              </AnimatePresence>
            </main>
          </div>
        </div>
      </MotionConfig>
    </LazyMotion>
  );
}

export default App;
