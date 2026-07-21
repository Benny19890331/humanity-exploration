import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, LazyMotion, MotionConfig, domAnimation, m, useReducedMotion } from 'motion/react';
import { questions } from './data/questions';
import { TestResult } from './components/TestResult';
import { Question } from './components/Question';

type TransitionDirection = 'forward' | 'backward';

const INTRO_DURATION = 4200;
const INTRO_STORAGE_KEY = 'humanity-exploration-intro-seen-v3';

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

function shouldShowIntro() {
  try {
    return window.sessionStorage.getItem(INTRO_STORAGE_KEY) !== '1';
  } catch {
    return true;
  }
}

function App() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [direction, setDirection] = useState<TransitionDirection>('forward');
  const [showIntro, setShowIntro] = useState(shouldShowIntro);
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

    const introTimer = window.setTimeout(dismissIntro, prefersReducedMotion ? 80 : INTRO_DURATION);
    return () => window.clearTimeout(introTimer);
  }, [dismissIntro, prefersReducedMotion, showIntro]);

  useEffect(() => () => {
    if (pointerFrame.current !== null) window.cancelAnimationFrame(pointerFrame.current);
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
        setIsComplete(true);
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

  const progress = isComplete ? 100 : ((currentQuestion + 1) / questions.length) * 100;
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
