import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, LazyMotion, MotionConfig, domAnimation, m, useReducedMotion } from 'motion/react';
import { questions } from './data/questions';
import { TestResult } from './components/TestResult';
import { Question } from './components/Question';

type TransitionDirection = 'forward' | 'backward';

const INTRO_DURATION = 4200;
const CELEBRATION_DURATION = 3000;
const INTRO_STORAGE_KEY = 'humanity-exploration-intro-seen-v3';

const fireworkBursts = [
  { x: '50%', y: '38%', color: '#f4c34f', accent: '#fff0a6', delay: 0.04, distance: 154 },
  { x: '21%', y: '29%', color: '#a668ff', accent: '#e5c8ff', delay: 0.3, distance: 106 },
  { x: '79%', y: '30%', color: '#3f8cff', accent: '#b7dcff', delay: 0.56, distance: 112 },
  { x: '27%', y: '69%', color: '#ef3f58', accent: '#ffb0ad', delay: 0.84, distance: 112 },
  { x: '73%', y: '68%', color: '#f4c34f', accent: '#fff0a6', delay: 1.08, distance: 118 },
  { x: '50%', y: '57%', color: '#a668ff', accent: '#e5c8ff', delay: 1.3, distance: 132 },
  { x: '13%', y: '52%', color: '#3f8cff', accent: '#b7dcff', delay: 1.52, distance: 88 },
  { x: '87%', y: '53%', color: '#ef3f58', accent: '#ffb0ad', delay: 1.7, distance: 90 },
];

const fireworkRayAngles = Array.from({ length: 20 }, (_, index) => ((index * 360) / 20) + (index % 2 ? 2.6 : 0));
const fireworkEmberAngles = Array.from({ length: 16 }, (_, index) => ((index * 360) / 16) + 7);
const celebrationStars = Array.from({ length: 28 }, (_, index) => ({
  x: `${6 + ((index * 37) % 88)}%`,
  y: `${8 + ((index * 53) % 82)}%`,
  delay: `${0.08 + (index % 9) * 0.16}s`,
  color: ['#a668ff', '#f4c34f', '#ef3f58', '#3f8cff'][index % 4],
}));

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

function Celebration({ reducedMotion }: CelebrationProps) {
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

      {!reducedMotion && celebrationStars.map((star, index) => (
        <span
          className="celebration-star"
          style={{
            left: star.x,
            top: star.y,
            '--star-delay': star.delay,
            '--star-color': star.color,
          } as React.CSSProperties}
          aria-hidden="true"
          key={`${star.x}-${star.y}-${index}`}
        />
      ))}

      {!reducedMotion && fireworkBursts.map((burst, burstIndex) => (
        <span
          className="firework-burst"
          style={{
            left: burst.x,
            top: burst.y,
            '--burst-color': burst.color,
            '--burst-accent': burst.accent,
            '--burst-delay': `${burst.delay}s`,
          } as React.CSSProperties}
          aria-hidden="true"
          key={`${burst.x}-${burst.y}`}
        >
          <span className="firework-core" />
          <span className="firework-ring firework-ring-outer" />
          <span className="firework-ring firework-ring-inner" />

          {fireworkRayAngles.map((angle, particleIndex) => {
            const radians = (angle * Math.PI) / 180;
            const distance = burst.distance * (particleIndex % 4 === 0 ? 1 : particleIndex % 3 === 0 ? 0.86 : 0.72);
            const x = Math.cos(radians) * distance;
            const y = Math.sin(radians) * distance;

            return (
              <span
                className="firework-ray"
                style={{
                  '--particle-x': `${x}px`,
                  '--particle-y': `${y}px`,
                  '--particle-rotation': `${angle + 90}deg`,
                  '--particle-delay': `${burst.delay + particleIndex * 0.006}s`,
                  '--particle-length': `${particleIndex % 4 === 0 ? 28 : 20}px`,
                } as React.CSSProperties}
                key={`ray-${burstIndex}-${angle}`}
              />
            );
          })}

          {fireworkEmberAngles.map((angle, particleIndex) => {
            const radians = (angle * Math.PI) / 180;
            const distance = burst.distance * (particleIndex % 3 === 0 ? 0.66 : 0.48);

            return (
              <span
                className="firework-ember"
                style={{
                  '--particle-x': `${Math.cos(radians) * distance}px`,
                  '--particle-y': `${Math.sin(radians) * distance}px`,
                  '--particle-delay': `${burst.delay + 0.08 + particleIndex * 0.01}s`,
                } as React.CSSProperties}
                key={`ember-${burstIndex}-${angle}`}
              />
            );
          })}
        </span>
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
