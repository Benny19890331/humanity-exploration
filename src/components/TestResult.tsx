import React, { useMemo } from 'react';
import { getPersonalityType } from '../utils/results';

interface TestResultProps {
  answers: number[];
}

export function TestResult({ answers }: TestResultProps) {
  const result = useMemo(() => getPersonalityType(answers), [answers]);

  return (
    <section className="test-result" aria-live="polite">
      <h2>測驗結果</h2>
      <div className="result-portrait-wrap">
        <span className="portrait-halo" aria-hidden="true" />
        <img
          src={result.imageUrl}
          alt={result.type}
          className="result-portrait"
        />
      </div>
      <h3>你是 {result.type}</h3>

      <div className="result-copy">
        <h4>什麼是{result.type.replace(/[大]/, '')}？</h4>
        <p>{result.description}</p>
      </div>
    </section>
  );
}
