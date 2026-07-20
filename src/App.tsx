import React, { useCallback, useEffect, useRef, useState } from 'react';
import { questions } from './data/questions';
import { TestResult } from './components/TestResult';
import { Question } from './components/Question';

type TransitionPhase = 'idle' | 'exit' | 'enter';
type TransitionDirection = 'forward' | 'backward';

const EXIT_DURATION = 220;
const ENTER_DURATION = 500;
const INTRO_DURATION = 4200;
const INTRO_STORAGE_KEY = 'humanity-exploration-intro-seen-v2';

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
  const [phase, setPhase] = useState<TransitionPhase>('enter');
  const [direction, setDirection] = useState<TransitionDirection>('forward');
  const [showIntro, setShowIntro] = useState(shouldShowIntro);
  const timers = useRef<number[]>([]);
  const experienceRef = useRef<HTMLDivElement>(null);

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

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const introTimer = window.setTimeout(dismissIntro, reduceMotion ? 80 : INTRO_DURATION);
    return () => window.clearTimeout(introTimer);
  }, [dismissIntro, showIntro]);

  useEffect(() => {
    const timer = window.setTimeout(() => setPhase('idle'), ENTER_DURATION);
    timers.current.push(timer);
    return () => timers.current.forEach(window.clearTimeout);
  }, []);

  const transitionTo = useCallback((next: () => void, nextDirection: TransitionDirection) => {
    if (phase !== 'idle') return;

    setDirection(nextDirection);
    setPhase('exit');

    const swapTimer = window.setTimeout(() => {
      next();
      setPhase('enter');

      const settleTimer = window.setTimeout(() => setPhase('idle'), ENTER_DURATION);
      timers.current.push(settleTimer);
    }, EXIT_DURATION);

    timers.current.push(swapTimer);
  }, [phase]);

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
    }, 'backward');
  }, [transitionTo]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = experienceRef.current?.getBoundingClientRect();
    if (!bounds || !experienceRef.current) return;

    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;
    experienceRef.current.style.setProperty('--pointer-x', `${x}%`);
    experienceRef.current.style.setProperty('--pointer-y', `${y}%`);
  }, []);

  const progress = isComplete ? 100 : ((currentQuestion + 1) / questions.length) * 100;
  const screenClassName = `screen-transition transition-${phase} ${direction}`;
  const logoUrl = `${import.meta.env.BASE_URL}rich-team-logo-transparent.png`;

  return (
    <div className="experience" ref={experienceRef} onPointerMove={handlePointerMove}>
      {showIntro && (
        <div className="intro-overlay" aria-label="Rich Team 品牌開場">
          <span className="intro-glow intro-glow-one" aria-hidden="true" />
          <span className="intro-glow intro-glow-two" aria-hidden="true" />
          <div className="intro-logo-vessel">
            <span className="intro-orbit" aria-hidden="true" />
            <span className="intro-logo-glint" aria-hidden="true" />
            <img src={logoUrl} alt="Rich Team Elite Group" className="intro-logo" />
          </div>
          <button
            type="button"
            className="intro-dismiss"
            onClick={dismissIntro}
            aria-label="略過開場動畫"
          />
        </div>
      )}

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
            <span className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="progress-orb" style={{ left: `${progress}%` }} />
        </div>

        <main className="glass-stage">
          <div className="glass-refraction" aria-hidden="true" />
          <div className={screenClassName}>
            {!isComplete ? (
              <Question
                key={currentQuestion}
                question={questions[currentQuestion]}
                onAnswer={handleAnswer}
                onPrevious={handlePrevious}
                currentNumber={currentQuestion + 1}
                total={questions.length}
                showPrevious={currentQuestion > 0}
                disabled={phase !== 'idle'}
              />
            ) : (
              <div className="result-screen">
                <TestResult answers={answers} />
                <button
                  onClick={handleRestart}
                  className="liquid-action restart-button"
                  disabled={phase !== 'idle'}
                >
                  <span>重新測試</span>
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
