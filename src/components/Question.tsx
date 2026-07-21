import React, { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { m } from 'motion/react';
import { QuestionType } from '../types';

interface QuestionProps {
  question: QuestionType;
  onAnswer: (answer: number) => void;
  onPrevious: () => void;
  currentNumber: number;
  total: number;
  showPrevious: boolean;
  shuffleSeed: number;
}

function hashOption(text: string, seed: number) {
  let hash = seed * 2654435761;
  for (let index = 0; index < text.length; index += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  }
  return hash >>> 0;
}

export function Question({
  question,
  onAnswer,
  onPrevious,
  currentNumber,
  total,
  showPrevious,
  shuffleSeed,
}: QuestionProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const shuffledOptions = useMemo(() => {
    const questionSeed = (shuffleSeed ^ Math.imul(currentNumber, 0x9e3779b1)) >>> 0;

    return question.options
      .map((option, originalIndex) => ({ option, originalIndex }))
      .sort((first, second) => (
        hashOption(first.option.text, questionSeed) - hashOption(second.option.text, questionSeed)
      ));
  }, [question, currentNumber, shuffleSeed]);

  const handleOptionPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--spot-x', `${event.clientX - bounds.left}px`);
    event.currentTarget.style.setProperty('--spot-y', `${event.clientY - bounds.top}px`);
  };

  const chooseOption = (value: number, originalIndex: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(originalIndex);
    onAnswer(value);
  };

  return (
    <section className="question-screen" aria-live="polite">
      <div className="question-topline">
        <div className="question-count">
          問題 {currentNumber} / {total}
        </div>
        {showPrevious && (
          <m.button
            onClick={onPrevious}
            className="previous-button"
            whileHover={{ x: -1 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.14 }}
          >
            <ArrowLeft aria-hidden="true" />
            上一題
          </m.button>
        )}
      </div>

      <h2>{question.text}</h2>

      <div className="option-stack">
        {shuffledOptions.map(({ option, originalIndex }, displayIndex) => (
          <m.button
            key={originalIndex}
            onClick={() => chooseOption(option.value, originalIndex)}
            onPointerMove={handleOptionPointerMove}
            className={`liquid-option ${selectedOption === originalIndex ? 'is-selected' : ''}`}
            disabled={selectedOption !== null}
            style={{ '--option-order': displayIndex } as React.CSSProperties}
            whileHover={{ y: -1, scale: 1.002 }}
            whileTap={{ y: 0, scale: 0.988 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.14 }}
          >
            <span className="option-reflection" aria-hidden="true" />
            <span className="option-text">{option.text}</span>
            <span className="option-arrow" aria-hidden="true">→</span>
          </m.button>
        ))}
      </div>
    </section>
  );
}
