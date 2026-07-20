import React, { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { QuestionType } from '../types';

interface QuestionProps {
  question: QuestionType;
  onAnswer: (answer: number) => void;
  onPrevious: () => void;
  currentNumber: number;
  total: number;
  showPrevious: boolean;
  disabled: boolean;
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
  disabled,
}: QuestionProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const shuffledOptions = useMemo(() => {
    return question.options
      .map((option, originalIndex) => ({ option, originalIndex }))
      .sort((first, second) => (
        hashOption(first.option.text, currentNumber) - hashOption(second.option.text, currentNumber)
      ));
  }, [question, currentNumber]);

  const handleOptionPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--spot-x', `${event.clientX - bounds.left}px`);
    event.currentTarget.style.setProperty('--spot-y', `${event.clientY - bounds.top}px`);
  };

  const chooseOption = (value: number, originalIndex: number) => {
    if (disabled || selectedOption !== null) return;
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
          <button
            onClick={onPrevious}
            className="previous-button"
            disabled={disabled}
          >
            <ArrowLeft aria-hidden="true" />
            上一題
          </button>
        )}
      </div>

      <h2>{question.text}</h2>

      <div className="option-stack">
        {shuffledOptions.map(({ option, originalIndex }, displayIndex) => (
          <button
            key={originalIndex}
            onClick={() => chooseOption(option.value, originalIndex)}
            onPointerMove={handleOptionPointerMove}
            className={`liquid-option ${selectedOption === originalIndex ? 'is-selected' : ''}`}
            disabled={disabled || selectedOption !== null}
            style={{ '--option-order': displayIndex } as React.CSSProperties}
          >
            <span className="option-reflection" aria-hidden="true" />
            <span className="option-text">{option.text}</span>
            <span className="option-arrow" aria-hidden="true">→</span>
          </button>
        ))}
      </div>
    </section>
  );
}
