'use client';

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ArrowLeft, Eye, EyeOff, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

const CHOICES = ['A', 'B', 'C', 'D'] as const;
type Choice = (typeof CHOICES)[number];

interface Question {
  id: string;
  question_number: number;
  stem: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  passage: string | null;
}

interface ResponseState {
  selectedAnswer: Choice | null;
  eliminatedChoices: Choice[];
}

interface AnswerKeyEntry {
  question_number: number;
  correct_answer: string;
}

function choiceText(q: Question, c: Choice): string {
  return { A: q.choice_a, B: q.choice_b, C: q.choice_c, D: q.choice_d }[c];
}

export default function ProblemSetClient({
  problemSet,
  questions,
  initialResponses,
}: {
  problemSet: { id: string; title: string; problemPdfUrl: string; hasAnswerKey: boolean };
  questions: Question[];
  initialResponses: { question_number: number; selected_answer: string | null; eliminated_choices: string[] }[];
}) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [responses, setResponses] = useState<Record<number, ResponseState>>(() => {
    const map: Record<number, ResponseState> = {};
    for (const r of initialResponses) {
      map[r.question_number] = {
        selectedAnswer: (r.selected_answer as Choice) ?? null,
        eliminatedChoices: (r.eliminated_choices ?? []) as Choice[],
      };
    }
    return map;
  });
  const [answerKey, setAnswerKey] = useState<Record<number, string> | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const saveTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const current = questions[currentIdx];
  const currentResponse = responses[current?.question_number] ?? { selectedAnswer: null, eliminatedChoices: [] };
  const answeredCount = Object.values(responses).filter((r) => r.selectedAnswer !== null).length;

  const saveResponse = useCallback((questionNumber: number, state: ResponseState) => {
    clearTimeout(saveTimers.current[questionNumber]);
    saveTimers.current[questionNumber] = setTimeout(() => {
      fetch(`/api/problem-sets/${problemSet.id}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionNumber,
          selectedAnswer: state.selectedAnswer,
          eliminatedChoices: state.eliminatedChoices,
        }),
      }).catch(() => { /* silent — auto-save failure shouldn't interrupt the student */ });
    }, 300);
  }, [problemSet.id]);

  function selectAnswer(c: Choice) {
    if (revealed) return;
    setResponses((prev) => {
      const existing = prev[current.question_number] ?? { selectedAnswer: null, eliminatedChoices: [] };
      const next = {
        ...existing,
        selectedAnswer: existing.selectedAnswer === c ? null : c,
      };
      saveResponse(current.question_number, next);
      return { ...prev, [current.question_number]: next };
    });
  }

  function toggleEliminate(c: Choice) {
    if (revealed) return;
    setResponses((prev) => {
      const existing = prev[current.question_number] ?? { selectedAnswer: null, eliminatedChoices: [] };
      const isEliminated = existing.eliminatedChoices.includes(c);
      const next = {
        ...existing,
        eliminatedChoices: isEliminated
          ? existing.eliminatedChoices.filter((x) => x !== c)
          : [...existing.eliminatedChoices, c],
      };
      saveResponse(current.question_number, next);
      return { ...prev, [current.question_number]: next };
    });
  }

  async function revealAnswerKey() {
    if (revealing || revealed) return;
    setRevealing(true);
    try {
      const res = await fetch(`/api/problem-sets/${problemSet.id}/reveal`);
      if (!res.ok) throw new Error('No answer key available');
      const data = await res.json() as { answerKey: AnswerKeyEntry[] };
      const map: Record<number, string> = {};
      for (const entry of data.answerKey) map[entry.question_number] = entry.correct_answer;
      setAnswerKey(map);
      setRevealed(true);
    } catch {
      toast.error('Answer key not available for this problem set.');
    } finally {
      setRevealing(false);
    }
  }

  if (!current) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm" style={{ color: 'var(--mist)' }}>No questions found.</p>
        <Link href="/student/problem-sets" className="mt-4 text-sm underline" style={{ color: 'var(--rose-deeper)' }}>
          Back to Problem Sets
        </Link>
      </div>
    );
  }

  const correctAnswer = answerKey?.[current.question_number];

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <Link
          href="/student/problem-sets"
          className="inline-flex items-center gap-1.5 text-xs font-semibold mb-4 transition-colors"
          style={{ color: 'var(--mist)', textDecoration: 'none' }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Problem Sets
        </Link>
        <div className="eyebrow-rose mb-2">Student Portal</div>
        <h1 className="portal-section-title text-xl">{problemSet.title}</h1>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold" style={{ color: 'var(--mist)' }}>
            Progress
          </span>
          <span className="text-xs font-semibold" style={{ color: 'var(--rose-deeper)' }}>
            {answeredCount} / {questions.length} answered
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--fog)' }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${(answeredCount / questions.length) * 100}%`, background: 'var(--rose-deeper)' }}
          />
        </div>
      </div>

      {/* Question navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
          disabled={currentIdx === 0}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
          style={{
            background: currentIdx === 0 ? 'var(--fog)' : 'var(--frost)',
            color: currentIdx === 0 ? 'var(--cloud)' : 'var(--charcoal)',
            border: '1px solid var(--fog)',
            cursor: currentIdx === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </button>

        <span className="text-sm font-semibold" style={{ color: 'var(--charcoal)' }}>
          Question {current.question_number} of {questions.length}
        </span>

        <button
          onClick={() => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))}
          disabled={currentIdx === questions.length - 1}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
          style={{
            background: currentIdx === questions.length - 1 ? 'var(--fog)' : 'var(--frost)',
            color: currentIdx === questions.length - 1 ? 'var(--cloud)' : 'var(--charcoal)',
            border: '1px solid var(--fog)',
            cursor: currentIdx === questions.length - 1 ? 'not-allowed' : 'pointer',
          }}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Question card */}
      <div
        className="portal-card p-6 space-y-5"
        style={{
          border: revealed
            ? correctAnswer === currentResponse.selectedAnswer
              ? '1px solid rgba(22,163,74,0.4)'
              : '1px solid rgba(224,166,175,0.5)'
            : undefined,
        }}
      >
        {/* Passage */}
        {current.passage && (
          <div
            className="p-4 rounded-lg text-sm leading-relaxed"
            style={{ background: 'var(--frost)', border: '1px solid var(--fog)', color: 'var(--charcoal)' }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--mist)' }}>Passage</p>
            <p style={{ whiteSpace: 'pre-wrap' }}>{current.passage}</p>
          </div>
        )}

        {/* Question stem */}
        <p className="text-sm font-medium leading-relaxed" style={{ color: 'var(--charcoal)' }}>
          <span className="font-bold">{current.question_number}.</span> {current.stem}
        </p>

        {/* Choices */}
        <div className="space-y-2">
          {CHOICES.map((c) => {
            const isSelected = currentResponse.selectedAnswer === c;
            const isEliminated = currentResponse.eliminatedChoices.includes(c);
            const isCorrect = revealed && correctAnswer === c;
            const isWrong = revealed && isSelected && correctAnswer !== c;

            let bg = 'transparent';
            let border = '1px solid var(--fog)';
            let textColor = 'var(--charcoal)';

            if (!revealed) {
              if (isSelected) { bg = 'rgba(168,203,222,0.18)'; border = '1px solid rgba(77,143,174,0.4)'; }
            } else {
              if (isCorrect) { bg = 'rgba(22,163,74,0.1)'; border = '1px solid rgba(22,163,74,0.4)'; textColor = '#15803d'; }
              else if (isWrong) { bg = 'rgba(224,166,175,0.18)'; border = '1px solid rgba(224,166,175,0.5)'; textColor = 'var(--rose-deeper)'; }
            }

            return (
              <div key={c} className="flex items-center gap-2">
                <button
                  onClick={() => selectAnswer(c)}
                  disabled={revealed}
                  className="flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all"
                  style={{ background: bg, border, cursor: revealed ? 'default' : 'pointer' }}
                >
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{
                      background: isSelected && !revealed
                        ? 'rgba(77,143,174,0.25)'
                        : isCorrect ? 'rgba(22,163,74,0.2)'
                        : isWrong ? 'rgba(224,166,175,0.3)'
                        : 'var(--fog)',
                      color: isCorrect ? '#15803d' : isWrong ? 'var(--rose-deeper)' : 'var(--charcoal)',
                    }}
                  >
                    {c}
                  </span>
                  <span
                    className="text-sm"
                    style={{
                      color: textColor,
                      fontWeight: isCorrect || isWrong ? 600 : 400,
                      textDecoration: isEliminated && !revealed ? 'line-through' : 'none',
                      opacity: isEliminated && !revealed ? 0.45 : 1,
                    }}
                  >
                    {choiceText(current, c)}
                  </span>
                </button>

                {/* Eliminate button */}
                {!revealed && (
                  <button
                    onClick={() => toggleEliminate(c)}
                    title={isEliminated ? 'Un-eliminate' : 'Eliminate this choice'}
                    className="w-7 h-7 flex items-center justify-center rounded text-xs font-bold transition-all shrink-0"
                    style={{
                      background: isEliminated ? 'rgba(224,166,175,0.2)' : 'transparent',
                      border: isEliminated ? '1px solid rgba(224,166,175,0.4)' : '1px solid var(--fog)',
                      color: isEliminated ? 'var(--rose-deeper)' : 'var(--cloud)',
                      cursor: 'pointer',
                      textDecoration: isEliminated ? 'line-through' : 'none',
                    }}
                  >
                    {c}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Revealed feedback */}
        {revealed && correctAnswer && (
          <div
            className="mt-1 px-3 py-2 rounded-lg text-xs font-semibold"
            style={{
              background: currentResponse.selectedAnswer === correctAnswer
                ? 'rgba(22,163,74,0.08)'
                : 'rgba(224,166,175,0.1)',
              color: currentResponse.selectedAnswer === correctAnswer ? '#15803d' : 'var(--rose-deeper)',
              border: `1px solid ${currentResponse.selectedAnswer === correctAnswer ? 'rgba(22,163,74,0.25)' : 'rgba(224,166,175,0.3)'}`,
            }}
          >
            {currentResponse.selectedAnswer === correctAnswer
              ? 'Correct!'
              : `Correct answer: ${correctAnswer}`}
          </div>
        )}
      </div>

      {/* Question dot navigator */}
      <div className="flex flex-wrap gap-1.5 justify-center">
        {questions.map((q, i) => {
          const resp = responses[q.question_number];
          const isAnswered = !!resp?.selectedAnswer;
          const isCurrent = i === currentIdx;
          let dotBg = 'var(--fog)';
          if (isCurrent) dotBg = 'var(--rose-deeper)';
          else if (isAnswered) dotBg = 'rgba(224,166,175,0.5)';
          return (
            <button
              key={q.question_number}
              onClick={() => setCurrentIdx(i)}
              title={`Question ${q.question_number}`}
              className="w-6 h-6 rounded text-xs font-semibold transition-all"
              style={{ background: dotBg, color: isCurrent ? 'white' : 'var(--charcoal)', border: 'none', cursor: 'pointer' }}
            >
              {q.question_number}
            </button>
          );
        })}
      </div>

      {/* Footer actions */}
      <div className="flex items-center gap-3 pt-2">
        {problemSet.hasAnswerKey && !revealed && (
          <button
            onClick={revealAnswerKey}
            disabled={revealing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: 'var(--rose)',
              color: 'var(--charcoal)',
              border: 'none',
              cursor: revealing ? 'not-allowed' : 'pointer',
              opacity: revealing ? 0.7 : 1,
            }}
          >
            <Eye className="h-4 w-4" />
            {revealing ? 'Loading key…' : 'Reveal Answer Key'}
          </button>
        )}

        {revealed && (
          <div
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'rgba(22,163,74,0.1)', color: '#15803d', border: '1px solid rgba(22,163,74,0.25)' }}
          >
            <EyeOff className="h-4 w-4" />
            Answer key revealed
          </div>
        )}

        <a
          href={problemSet.problemPdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: 'rgba(168,203,222,0.12)',
            color: 'var(--sky-deeper)',
            border: '1px solid rgba(168,203,222,0.3)',
            textDecoration: 'none',
          }}
        >
          <BookOpen className="h-4 w-4" />
          View PDF
        </a>
      </div>
    </div>
  );
}
