import React, { useCallback, useEffect, useRef, useState } from 'react';
import { questions } from './data/questions';
import { TestResult } from './components/TestResult';
import { Question } from './components/Question';

type TransitionPhase = 'idle' | 'exit' | 'enter';
type TransitionDirection = 'forward' | 'backward';
type MotionPermissionState = 'granted' | 'denied' | 'prompt';

type PermissionedDeviceOrientationEvent = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<MotionPermissionState>;
};

const EXIT_DURATION = 220;
const ENTER_DURATION = 500;
const INTRO_DURATION = 4200;
const INTRO_STORAGE_KEY = 'humanity-exploration-intro-seen-v3';

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

  useEffect(() => {
    const experience = experienceRef.current;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;

    if (!experience || reducedMotion || !coarsePointer || !('DeviceOrientationEvent' in window)) {
      return;
    }

    let isListening = false;
    let animationFrame: number | null = null;
    let baseBeta: number | null = null;
    let baseGamma: number | null = null;
    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;

    const clamp = (value: number) => Math.max(-1, Math.min(1, value));
    const angleDelta = (value: number, base: number) => ((value - base + 540) % 360) - 180;

    const renderMotion = () => {
      currentX += (targetX - currentX) * 0.14;
      currentY += (targetY - currentY) * 0.14;

      const intensity = Math.min(1, Math.hypot(currentX, currentY));
      experience.style.setProperty('--gyro-stream-x', `${(currentX * 14).toFixed(2)}px`);
      experience.style.setProperty('--gyro-stream-y', `${(currentY * 10).toFixed(2)}px`);
      experience.style.setProperty('--gyro-stream-x-inverse', `${(currentX * -9).toFixed(2)}px`);
      experience.style.setProperty('--gyro-stream-y-inverse', `${(currentY * -7).toFixed(2)}px`);
      experience.style.setProperty('--gyro-stream-rotate', `${(currentX * 1.15).toFixed(2)}deg`);
      experience.style.setProperty('--gyro-stream-rotate-inverse', `${(currentX * -0.72).toFixed(2)}deg`);
      experience.style.setProperty('--gyro-aurora-x', `${(currentX * 5).toFixed(2)}px`);
      experience.style.setProperty('--gyro-aurora-y', `${(currentY * 4).toFixed(2)}px`);
      experience.style.setProperty('--gyro-light-brightness', (1 + intensity * 0.08).toFixed(3));

      if (Math.abs(targetX - currentX) > 0.002 || Math.abs(targetY - currentY) > 0.002) {
        animationFrame = window.requestAnimationFrame(renderMotion);
      } else {
        animationFrame = null;
      }
    };

    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (event.beta === null || event.gamma === null) return;

      if (baseBeta === null || baseGamma === null) {
        baseBeta = event.beta;
        baseGamma = event.gamma;
        experience.dataset.gyro = 'active';
        return;
      }

      targetX = clamp(angleDelta(event.gamma, baseGamma) / 18);
      targetY = clamp(angleDelta(event.beta, baseBeta) / 24);

      if (animationFrame === null) {
        animationFrame = window.requestAnimationFrame(renderMotion);
      }
    };

    const resetBaseline = () => {
      baseBeta = null;
      baseGamma = null;
      targetX = 0;
      targetY = 0;
      if (animationFrame === null) {
        animationFrame = window.requestAnimationFrame(renderMotion);
      }
    };

    const enableMotion = () => {
      if (isListening) return;
      isListening = true;
      window.addEventListener('deviceorientation', handleOrientation, { passive: true });
      window.addEventListener('orientationchange', resetBaseline, { passive: true });
    };

    const orientationEvent = window.DeviceOrientationEvent as PermissionedDeviceOrientationEvent;
    const requestPermission = orientationEvent.requestPermission;

    const requestMotionOnGesture = () => {
      if (typeof requestPermission !== 'function') return;
      void requestPermission.call(orientationEvent)
        .then(permission => {
          if (permission === 'granted') enableMotion();
        })
        .catch(() => {
          // Motion remains optional when the user or browser declines access.
        });
    };

    if (typeof requestPermission === 'function') {
      window.addEventListener('pointerup', requestMotionOnGesture, { once: true, passive: true });
    } else {
      enableMotion();
    }

    return () => {
      window.removeEventListener('pointerup', requestMotionOnGesture);
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('orientationchange', resetBaseline);
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
      delete experience.dataset.gyro;
    };
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
      setShowIntro(true);
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
