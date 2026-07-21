import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, LazyMotion, MotionConfig, domAnimation, m, useReducedMotion } from 'motion/react';
import { questions } from './data/questions';
import { TestResult } from './components/TestResult';
import { Question } from './components/Question';

type TransitionDirection = 'forward' | 'backward';

const INTRO_DURATION = 4200;
const CELEBRATION_DURATION = 3000;
const INTRO_STORAGE_KEY = 'humanity-exploration-intro-seen-v3';
const fireworkGifUrl = `${import.meta.env.BASE_URL}firework-transparent.gif`;
const fireworkTones = ['purple', 'gold', 'red', 'blue'] as const;

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
  reducedMotion: boolean;
}

type FireworkTone = (typeof fireworkTones)[number];

interface FireworkBurst {
  delay: number;
  id: number;
  rotation: number;
  size: number;
  tone: FireworkTone;
  x: number;
  y: number;
}

interface GifFireworkProps {
  delay: number;
  index: number;
  rotation: number;
  size: number;
  tone: FireworkTone;
  x: number;
  y: number;
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * Math.max(0, max - min);
}

function createRandomFireworks(): FireworkBurst[] {
  const viewportWidth = typeof window === 'undefined' ? 1200 : Math.max(window.innerWidth, 320);
  const viewportHeight = typeof window === 'undefined' ? 800 : Math.max(window.innerHeight, 480);
  const isNarrow = viewportWidth <= 640;
  const minSize = isNarrow
    ? Math.max(132, Math.min(168, viewportWidth * 0.38))
    : Math.max(190, Math.min(250, Math.min(viewportWidth, viewportHeight) * 0.27));
  const maxSize = isNarrow
    ? Math.max(minSize, Math.min(210, viewportWidth * 0.52))
    : Math.max(minSize, Math.min(340, Math.min(viewportWidth, viewportHeight) * 0.39));
  const delays = [0, 100, 220, 360, 520];
  const bursts: FireworkBurst[] = [];

  delays.forEach((delay, index) => {
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
      delay,
      id: index,
      rotation: randomBetween(-7, 7),
      size,
      tone: fireworkTones[index % fireworkTones.length],
      x: Math.round(x),
      y: Math.round(y),
    });
  });

  return bursts;
}

function GifFirework({ delay, index, rotation, size, tone, x, y }: GifFireworkProps) {
  const [isVisible, setIsVisible] = useState(delay === 0);

  useEffect(() => {
    if (delay === 0) return;
    const timer = window.setTimeout(() => setIsVisible(true), delay);
    return () => window.clearTimeout(timer);
  }, [delay]);

  if (!isVisible) return null;

  const remainingDuration = (CELEBRATION_DURATION - delay) / 1000;

  return (
    <span
      className={`firework-gif-anchor firework-gif-anchor-${tone}`}
      style={{ left: x, top: y, width: size }}
      aria-hidden="true"
    >
      <m.img
        src={`${fireworkGifUrl}#burst-${index}`}
        alt=""
        className={`firework-gif firework-gif-${tone}`}
        initial={{ opacity: 0, rotate: rotation - 2, scale: 0.76 }}
        animate={{ opacity: [0, 1, 1, 0.12], rotate: rotation, scale: [0.76, 1, 1.035] }}
        transition={{ duration: remainingDuration, times: [0, 0.07, 0.86, 1], ease: 'linear' }}
      />
    </span>
  );
}

function Celebration({ reducedMotion }: CelebrationProps) {
  const [fireworks] = useState(createRandomFireworks);

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

      {!reducedMotion && fireworks.map((firework, index) => (
        <GifFirework {...firework} index={index} key={firework.id} />
      ))}
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
            {showCelebration && <Celebration reducedMotion={Boolean(prefersReducedMotion)} />}
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
