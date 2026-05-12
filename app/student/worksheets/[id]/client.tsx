'use client';

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft, ChevronLeft, ChevronRight, BookOpen, Layers,
  Lock, Eye, EyeOff,
} from 'lucide-react';
import type { FlowStep, FlowPage, FlowPosition, FlowAnswerKey, FlowProblem } from './page';
import PdfReader from '@/components/shared/PdfReader';
import { checkOpenEndedAnswer } from '@/lib/utils';

const CHOICES = ['A', 'B', 'C', 'D'] as const;
type Choice = typeof CHOICES[number];

interface ResponseState {
  selectedAnswer: string | null;
  eliminatedChoices: Choice[];
}

export default function WorksheetFlowClient({
  worksheet,
  steps,
}: {
  worksheet: { id: string; title: string };
  steps: FlowStep[];
}) {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  if (steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <p className="text-sm" style={{ color: 'var(--mist)' }}>This worksheet has no steps yet.</p>
        <Link href="/student/worksheets" className="text-sm underline" style={{ color: 'var(--rose-deeper)' }}>
          Back to Worksheets
        </Link>
      </div>
    );
  }

  const currentStep = steps[currentStepIdx];
  const totalSteps = steps.length;

  const isInstruction = currentStep.type === 'instruction';

  return (
    <div style={{ width: '100%' }}>
      {/* Constrained header area */}
      <div className="space-y-4 max-w-3xl mx-auto" style={{ marginBottom: 24 }}>
        {/* Back nav */}
        <Link
          href="/student/worksheets"
          className="inline-flex items-center gap-1.5 text-xs font-semibold transition-colors"
          style={{ color: 'var(--mist)', textDecoration: 'none' }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Worksheets
        </Link>

        {/* Worksheet title */}
        <div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 4 }}>
            {worksheet.title}
          </h1>

          {/* Step progress indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            {steps.map((step, idx) => (
              <button
                key={step.id}
                onClick={() => setCurrentStepIdx(idx)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 10px',
                  borderRadius: 20,
                  border: `1px solid ${idx === currentStepIdx ? (step.type === 'instruction' ? 'rgba(168,203,222,0.5)' : 'rgba(224,166,175,0.5)') : 'var(--fog)'}`,
                  background: idx === currentStepIdx ? (step.type === 'instruction' ? 'rgba(168,203,222,0.12)' : 'rgba(224,166,175,0.12)') : 'transparent',
                  color: idx === currentStepIdx ? 'var(--charcoal)' : 'var(--mist)',
                  fontSize: 11,
                  fontWeight: idx === currentStepIdx ? 700 : 500,
                  cursor: 'pointer',
                  fontFamily: "'Syne', sans-serif",
                  transition: 'all 0.12s',
                }}
              >
                {step.type === 'instruction' ? <BookOpen size={10} /> : <Layers size={10} />}
                {idx + 1}. {step.title}
              </button>
            ))}
          </div>
        </div>

        {/* Step header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--mist)' }}>
              Step {currentStepIdx + 1} of {totalSteps}
            </span>
            {currentStep.stage_label && (
              <>
                <span style={{ color: 'var(--fog)' }}>·</span>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: currentStep.type === 'instruction' ? 'rgba(168,203,222,0.14)' : 'rgba(224,166,175,0.14)',
                  color: currentStep.type === 'instruction' ? 'var(--sky-deeper)' : 'var(--rose-deeper)',
                  border: `1px solid ${currentStep.type === 'instruction' ? 'rgba(168,203,222,0.3)' : 'rgba(224,166,175,0.3)'}`,
                }}>
                  {currentStep.stage_label}
                </span>
              </>
            )}
            {currentStep.type === 'problems' && currentStep.locked_nav && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--mist)', padding: '2px 6px', borderRadius: 8, border: '1px solid var(--fog)', background: 'var(--frost)' }}>
                <Lock size={9} /> Page locked
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Step content — full-width for instructions, constrained for problems */}
      <div className={isInstruction ? '' : 'max-w-3xl mx-auto'}>
        {isInstruction ? (
          <InstructionStep step={currentStep} />
        ) : (
          <ProblemsStep step={currentStep} worksheetId={worksheet.id} />
        )}
      </div>

      {/* Step navigation */}
      <div className="max-w-3xl mx-auto" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, marginTop: 16, borderTop: '1px solid var(--fog)' }}>
        <button
          onClick={() => setCurrentStepIdx((i) => Math.max(0, i - 1))}
          disabled={currentStepIdx === 0}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 9, border: '1px solid var(--fog)',
            background: currentStepIdx === 0 ? 'transparent' : 'var(--frost)',
            color: currentStepIdx === 0 ? 'var(--fog)' : 'var(--slate)',
            fontSize: 13, fontWeight: 600, cursor: currentStepIdx === 0 ? 'default' : 'pointer',
            fontFamily: "'Syne', sans-serif",
          }}
        >
          <ChevronLeft size={15} /> Previous Step
        </button>
        <span style={{ fontSize: 12, color: 'var(--mist)', fontWeight: 500 }}>
          {currentStepIdx + 1} / {totalSteps}
        </span>
        <button
          onClick={() => setCurrentStepIdx((i) => Math.min(totalSteps - 1, i + 1))}
          disabled={currentStepIdx === totalSteps - 1}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 9, border: 'none',
            background: currentStepIdx === totalSteps - 1 ? 'var(--fog)' : 'var(--rose)',
            color: currentStepIdx === totalSteps - 1 ? 'var(--mist)' : 'var(--charcoal)',
            fontSize: 13, fontWeight: 600, cursor: currentStepIdx === totalSteps - 1 ? 'default' : 'pointer',
            fontFamily: "'Syne', sans-serif",
          }}
        >
          Next Step <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

// ── Instruction step ──────────────────────────────────────────────────────────

function InstructionStep({ step }: { step: FlowStep }) {
  if (!step.pdf_url) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, border: '1px dashed var(--fog)', borderRadius: 14, color: 'var(--mist)', fontSize: 13 }}>
        No instruction PDF uploaded for this step yet.
      </div>
    );
  }
  return (
    <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--fog)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      <PdfReader url={step.pdf_url} title={step.title} />
    </div>
  );
}

// ── Problems step ─────────────────────────────────────────────────────────────

function ProblemsStep({ step, worksheetId }: { step: FlowStep; worksheetId: string }) {
  if (step.problems.length > 0) {
    return <PdfProblemsStep step={step} worksheetId={worksheetId} />;
  }
  return <LegacyProblemsStep step={step} worksheetId={worksheetId} />;
}

// ── PDF-import problems step ──────────────────────────────────────────────────

function PdfProblemsStep({ step, worksheetId }: { step: FlowStep; worksheetId: string }) {
  const problems = step.problems.slice().sort((a, b) => a.question_number - b.question_number);
  const [currentQIdx, setCurrentQIdx] = useState(0);

  const currentProblem = problems[currentQIdx] as FlowProblem | undefined;

  const letterMap: Record<number, Choice> = { 1: 'A', 2: 'B', 3: 'C', 4: 'D' };

  // Responses keyed by question_number
  const [responses, setResponses] = useState<Record<number, ResponseState>>(() => {
    const map: Record<number, ResponseState> = {};
    for (const r of step.initialResponses) {
      map[r.question_number] = {
        selectedAnswer: r.selected_answer ?? null,
        eliminatedChoices: (r.eliminated_choices ?? []) as Choice[],
      };
    }
    return map;
  });

  const [reviewMode, setReviewMode] = useState(false);
  const [expandedWrong, setExpandedWrong] = useState<number | null>(null);

  const allAnswered = problems.every(
    (p) => responses[p.question_number]?.selectedAnswer != null,
  );

  const saveTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const saveResponse = useCallback((questionNumber: number, state: ResponseState) => {
    clearTimeout(saveTimers.current[questionNumber]);
    saveTimers.current[questionNumber] = setTimeout(() => {
      fetch(`/api/worksheets/${worksheetId}/steps/${step.id}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionNumber,
          selectedAnswer: state.selectedAnswer,
          eliminatedChoices: state.eliminatedChoices,
        }),
      }).catch(() => undefined);
    }, 300);
  }, [worksheetId, step.id]);

  function selectAnswer(questionNumber: number, choice: Choice) {
    setResponses((prev) => {
      const existing = prev[questionNumber] ?? { selectedAnswer: null, eliminatedChoices: [] };
      const next = { ...existing, selectedAnswer: existing.selectedAnswer === choice ? null : choice };
      saveResponse(questionNumber, next);
      return { ...prev, [questionNumber]: next };
    });
  }

  function setOpenEndedAnswer(questionNumber: number, value: string) {
    setResponses((prev) => {
      const existing = prev[questionNumber] ?? { selectedAnswer: null, eliminatedChoices: [] };
      const next = { ...existing, selectedAnswer: value || null };
      saveResponse(questionNumber, next);
      return { ...prev, [questionNumber]: next };
    });
  }

  if (!currentProblem) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, border: '1px dashed var(--fog)', borderRadius: 14, color: 'var(--mist)', fontSize: 13 }}>
        No questions available.
      </div>
    );
  }

  if (reviewMode) {
    return (
      <ReviewSummary
        problems={problems}
        responses={responses}
        onExit={() => { setReviewMode(false); setCurrentQIdx(0); }}
        expandedWrong={expandedWrong}
        setExpandedWrong={setExpandedWrong}
      />
    );
  }

  const questionPositions = step.positions.filter(
    (p) => Math.floor(p.question_number / 10) === currentProblem.question_number,
  );

  const state = responses[currentProblem.question_number] ?? { selectedAnswer: null, eliminatedChoices: [] };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Question image with positioned bubbles */}
      <div style={{ position: 'relative', width: '100%', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--fog)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={currentProblem.question_image_url} alt={`Question ${currentProblem.question_number}`} style={{ display: 'block', width: '100%' }} />

        {currentProblem.question_type !== 'open_ended' && (
          <>
            {questionPositions.map((pos) => {
              const letter = letterMap[pos.question_number % 10];
              if (!letter) return null;
              const isSelected = state.selectedAnswer === letter;

              const border = isSelected ? '2.5px solid var(--rose-deeper)' : '2px solid rgba(0,0,0,0.18)';
              const bg = isSelected ? 'rgba(224,166,175,0.22)' : 'transparent';

              return (
                <div
                  key={pos.id}
                  onClick={() => selectAnswer(currentProblem.question_number, letter)}
                  style={{
                    position: 'absolute',
                    left: `${Number(pos.x_percent)}%`,
                    top: `${Number(pos.y_percent)}%`,
                    transform: 'translate(-50%, -50%)',
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    border,
                    background: bg,
                    cursor: 'pointer',
                    transition: 'all 0.1s',
                  }}
                />
              );
            })}

            {/* Fallback: if no positioned bubbles, show a floating ABCD row */}
            {questionPositions.length === 0 && (
              <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6, background: 'rgba(255,255,255,0.92)', padding: '4px 10px', borderRadius: 20, border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
                {CHOICES.map((c) => {
                  const isSelected = state.selectedAnswer === c;
                  const border = isSelected ? '2.5px solid var(--rose-deeper)' : '2px solid rgba(0,0,0,0.18)';
                  const bg = isSelected ? 'rgba(224,166,175,0.22)' : 'transparent';
                  return (
                    <button key={c} onClick={() => selectAnswer(currentProblem.question_number, c)} style={{ width: 28, height: 28, borderRadius: '50%', border, background: bg, cursor: 'pointer', transition: 'all 0.1s' }} />
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Open-ended text input */}
      {currentProblem.question_type === 'open_ended' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="text"
            maxLength={20}
            placeholder="Type your answer…"
            value={state.selectedAnswer ?? ''}
            onChange={(e) => setOpenEndedAnswer(currentProblem.question_number, e.target.value)}
            style={{
              padding: '9px 14px',
              borderRadius: 9,
              border: '1px solid var(--fog)',
              background: 'var(--white)',
              color: 'var(--charcoal)',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "'Syne', sans-serif",
              outline: 'none',
              width: 200,
            }}
          />
          <span style={{ fontSize: 11, color: 'var(--mist)' }}>max 20 characters</span>
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <button
          onClick={() => setCurrentQIdx((i) => Math.max(0, i - 1))}
          disabled={currentQIdx === 0}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, border: '1px solid var(--fog)', background: currentQIdx === 0 ? 'transparent' : 'var(--frost)', color: currentQIdx === 0 ? 'var(--fog)' : 'var(--slate)', fontSize: 12, fontWeight: 600, cursor: currentQIdx === 0 ? 'default' : 'pointer', fontFamily: "'Syne', sans-serif" }}
        >
          <ChevronLeft size={14} /> Prev
        </button>

        <span style={{ fontSize: 12, color: 'var(--mist)', fontWeight: 500 }}>
          Q{currentProblem.question_number} ({currentQIdx + 1} / {problems.length})
        </span>

        <button
          onClick={() => setCurrentQIdx((i) => Math.min(problems.length - 1, i + 1))}
          disabled={currentQIdx === problems.length - 1}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, border: 'none', background: currentQIdx === problems.length - 1 ? 'var(--fog)' : 'var(--rose)', color: currentQIdx === problems.length - 1 ? 'var(--mist)' : 'var(--charcoal)', fontSize: 12, fontWeight: 600, cursor: currentQIdx === problems.length - 1 ? 'default' : 'pointer', fontFamily: "'Syne', sans-serif" }}
        >
          Next <ChevronRight size={14} />
        </button>
      </div>

      {/* Review Answers gate */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, paddingTop: 4 }}>
        <button
          onClick={() => { setReviewMode(true); setExpandedWrong(null); }}
          disabled={!allAnswered}
          style={{
            padding: '10px 32px',
            borderRadius: 9,
            border: 'none',
            background: allAnswered ? 'var(--rose)' : 'var(--fog)',
            color: allAnswered ? 'var(--charcoal)' : 'var(--mist)',
            fontSize: 13,
            fontWeight: 700,
            cursor: allAnswered ? 'pointer' : 'not-allowed',
            fontFamily: "'Syne', sans-serif",
            transition: 'all 0.12s',
          }}
        >
          Review Answers
        </button>
        {!allAnswered && (
          <p style={{ fontSize: 11, color: 'var(--mist)', margin: 0 }}>
            Answer all {problems.length} question{problems.length !== 1 ? 's' : ''} to review
          </p>
        )}
      </div>
    </div>
  );
}

// ── Review summary ────────────────────────────────────────────────────────────

function ReviewSummary({
  problems,
  responses,
  onExit,
  expandedWrong,
  setExpandedWrong,
}: {
  problems: FlowProblem[];
  responses: Record<number, ResponseState>;
  onExit: () => void;
  expandedWrong: number | null;
  setExpandedWrong: (n: number | null) => void;
}) {
  const wrongProblems = problems.filter((p) => {
    const selected = responses[p.question_number]?.selectedAnswer;
    if (!selected) return true;
    if (p.question_type === 'open_ended') {
      return !checkOpenEndedAnswer(selected, p.accepted_answers ?? []);
    }
    return selected !== p.correct_answer;
  });
  const correctCount = problems.length - wrongProblems.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700, color: 'var(--charcoal)', margin: 0 }}>
          Review
        </h2>
        <button
          onClick={onExit}
          style={{ fontSize: 12, color: 'var(--mist)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: "'Syne', sans-serif" }}
        >
          Back to questions
        </button>
      </div>

      {/* Score chip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
          background: 'rgba(22,163,74,0.1)', color: '#15803d',
          border: '1px solid rgba(22,163,74,0.25)',
        }}>
          {correctCount} / {problems.length} correct
        </span>
        {wrongProblems.length === 0 && (
          <span style={{ fontSize: 13, color: '#15803d', fontWeight: 600 }}>
            Perfect score!
          </span>
        )}
      </div>

      {/* Wrong questions list */}
      {wrongProblems.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--mist)' }}>No mistakes to review.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: 12, color: 'var(--mist)', margin: 0 }}>
            {wrongProblems.length} question{wrongProblems.length !== 1 ? 's' : ''} to review:
          </p>

          {wrongProblems.map((p) => {
            const selected = responses[p.question_number]?.selectedAnswer ?? '—';
            const isExpanded = expandedWrong === p.question_number;
            const isOE = p.question_type === 'open_ended';

            return (
              <div key={p.id} style={{
                borderRadius: 10,
                border: '1px solid rgba(239,68,68,0.25)',
                background: 'rgba(239,68,68,0.04)',
                overflow: 'hidden',
              }}>
                {/* Collapsed header */}
                <button
                  onClick={() => setExpandedWrong(isExpanded ? null : p.question_number)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: "'Syne', sans-serif", textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--charcoal)' }}>
                      Q{p.question_number}
                    </span>
                    <span style={{ fontSize: 11, color: '#b91c1c' }}>
                      Your answer: <strong>{selected}</strong>
                    </span>
                    <span style={{ fontSize: 11, color: '#15803d' }}>
                      {isOE
                        ? `Accepted: ${(p.accepted_answers ?? []).join(', ')}`
                        : `Correct: ${p.correct_answer ?? '—'}`}
                    </span>
                  </div>
                  <ChevronRight
                    size={13}
                    style={{ flexShrink: 0, transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', color: 'var(--mist)' }}
                  />
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid rgba(239,68,68,0.15)', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.question_image_url}
                      alt={`Question ${p.question_number}`}
                      style={{ display: 'block', width: '100%', borderRadius: 8 }}
                    />

                    {/* Answer comparison */}
                    <div style={{ display: 'flex', gap: 10 }}>
                      <div style={{ flex: 1, padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: '#b91c1c', margin: '0 0 2px' }}>YOUR ANSWER</p>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#b91c1c', margin: 0 }}>{selected}</p>
                      </div>
                      <div style={{ flex: 1, padding: '8px 12px', borderRadius: 8, background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)' }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: '#15803d', margin: '0 0 2px' }}>
                          {isOE ? 'ACCEPTED ANSWERS' : 'CORRECT ANSWER'}
                        </p>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#15803d', margin: 0 }}>
                          {isOE ? (p.accepted_answers ?? []).join(', ') : (p.correct_answer ?? '—')}
                        </p>
                      </div>
                    </div>

                    {/* Explanation image */}
                    {p.explanation_image_url && (
                      <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(22,163,74,0.2)' }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: '#15803d', padding: '6px 10px 0', margin: 0 }}>
                          EXPLANATION
                        </p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.explanation_image_url} alt="Explanation" style={{ display: 'block', width: '100%' }} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Legacy (image-upload) problems step ──────────────────────────────────────

function LegacyProblemsStep({ step, worksheetId }: { step: FlowStep; worksheetId: string }) {
  const [pages] = useState<FlowPage[]>(step.pages);
  const [positions] = useState<FlowPosition[]>(step.positions);
  const [currentPageIdx, setCurrentPageIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [revealedKey, setRevealedKey] = useState<Record<number, string>>({});

  const [responses, setResponses] = useState<Record<number, ResponseState>>(() => {
    const map: Record<number, ResponseState> = {};
    for (const r of step.initialResponses) {
      map[r.question_number] = {
        selectedAnswer: (r.selected_answer as Choice) ?? null,
        eliminatedChoices: (r.eliminated_choices ?? []) as Choice[],
      };
    }
    return map;
  });

  const saveTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const saveResponse = useCallback((questionNumber: number, state: ResponseState) => {
    clearTimeout(saveTimers.current[questionNumber]);
    saveTimers.current[questionNumber] = setTimeout(() => {
      fetch(`/api/worksheets/${worksheetId}/steps/${step.id}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionNumber,
          selectedAnswer: state.selectedAnswer,
          eliminatedChoices: state.eliminatedChoices,
        }),
      }).catch(() => undefined);
    }, 300);
  }, [worksheetId, step.id]);

  function selectAnswer(questionNumber: number, choice: Choice) {
    if (revealed) return;
    setResponses((prev) => {
      const existing = prev[questionNumber] ?? { selectedAnswer: null, eliminatedChoices: [] };
      const next = { ...existing, selectedAnswer: existing.selectedAnswer === choice ? null : choice };
      saveResponse(questionNumber, next);
      return { ...prev, [questionNumber]: next };
    });
  }

  async function revealAnswers() {
    if (revealing || revealed) return;
    setRevealing(true);
    try {
      const res = await fetch(`/api/worksheets/${worksheetId}/steps/${step.id}/reveal`);
      if (!res.ok) throw new Error('No answer key');
      const { answerKey } = await res.json() as { answerKey: FlowAnswerKey[] };
      const map: Record<number, string> = {};
      for (const e of answerKey) map[e.question_number] = e.correct_answer;
      setRevealedKey(map);
      setRevealed(true);
    } catch {
      toast.error('Answer key not available for this step.');
    } finally {
      setRevealing(false);
    }
  }

  if (pages.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, border: '1px dashed var(--fog)', borderRadius: 14, color: 'var(--mist)', fontSize: 13 }}>
        No problem pages uploaded for this step yet.
      </div>
    );
  }

  const currentPage = pages[currentPageIdx];
  const positionsOnPage = positions.filter((p) => p.page_number === currentPage.page_number);
  const questionsOnPage = Array.from(new Set(positionsOnPage.map((p) => p.question_number))).sort((a, b) => a - b);

  const allAnsweredOnPage = questionsOnPage.every((qNum) => responses[qNum]?.selectedAnswer !== null && responses[qNum]?.selectedAnswer !== undefined);
  const canAdvancePage = !step.locked_nav || allAnsweredOnPage;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Page image with bubble overlay */}
      <div style={{ position: 'relative', width: '100%', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--fog)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={currentPage.image_url} alt={`Page ${currentPage.page_number}`} style={{ display: 'block', width: '100%' }} />

        {/* Render answer bubbles for each question on this page */}
        {positionsOnPage.map((pos) => {
          const state = responses[pos.question_number] ?? { selectedAnswer: null, eliminatedChoices: [] };
          const correctAnswer = revealedKey[pos.question_number];
          return (
            <AnswerBubbleRow
              key={pos.id}
              questionNumber={pos.question_number}
              xPercent={Number(pos.x_percent)}
              yPercent={Number(pos.y_percent)}
              selectedAnswer={state.selectedAnswer as Choice | null}
              correctAnswer={correctAnswer ?? null}
              revealed={revealed}
              onSelect={(choice) => selectAnswer(pos.question_number, choice)}
            />
          );
        })}
      </div>

      {/* Page navigation + reveal */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <button
          onClick={() => setCurrentPageIdx((i) => Math.max(0, i - 1))}
          disabled={currentPageIdx === 0}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '7px 14px', borderRadius: 8, border: '1px solid var(--fog)',
            background: currentPageIdx === 0 ? 'transparent' : 'var(--frost)',
            color: currentPageIdx === 0 ? 'var(--fog)' : 'var(--slate)',
            fontSize: 12, fontWeight: 600, cursor: currentPageIdx === 0 ? 'default' : 'pointer',
            fontFamily: "'Syne', sans-serif",
          }}
        >
          <ChevronLeft size={14} /> Prev Page
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--mist)', fontWeight: 500 }}>
            Page {currentPageIdx + 1} of {pages.length}
          </span>
          {step.answerKey.length > 0 && (
            <button
              onClick={revealAnswers}
              disabled={revealing}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '5px 12px', borderRadius: 8,
                border: '1px solid rgba(224,166,175,0.4)',
                background: revealed ? 'rgba(224,166,175,0.14)' : 'transparent',
                color: 'var(--rose-deeper)',
                fontSize: 11, fontWeight: 600, cursor: 'pointer',
                fontFamily: "'Syne', sans-serif",
              }}
            >
              {revealed ? <Eye size={11} /> : <EyeOff size={11} />}
              {revealing ? 'Loading…' : revealed ? 'Answers shown' : 'Reveal Answers'}
            </button>
          )}
        </div>

        <button
          onClick={() => { if (canAdvancePage) setCurrentPageIdx((i) => Math.min(pages.length - 1, i + 1)); }}
          disabled={currentPageIdx === pages.length - 1}
          title={!canAdvancePage ? 'Answer all questions on this page first' : undefined}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '7px 14px', borderRadius: 8, border: 'none',
            background: currentPageIdx === pages.length - 1 ? 'var(--fog)' : (!canAdvancePage ? 'var(--fog)' : 'var(--rose)'),
            color: (currentPageIdx === pages.length - 1 || !canAdvancePage) ? 'var(--mist)' : 'var(--charcoal)',
            fontSize: 12, fontWeight: 600,
            cursor: (currentPageIdx === pages.length - 1 || !canAdvancePage) ? 'not-allowed' : 'pointer',
            fontFamily: "'Syne', sans-serif",
            opacity: !canAdvancePage && currentPageIdx < pages.length - 1 ? 0.6 : 1,
          }}
        >
          Next Page <ChevronRight size={14} />
        </button>
      </div>

      {step.locked_nav && !allAnsweredOnPage && currentPageIdx < pages.length - 1 && (
        <p style={{ fontSize: 11, color: 'var(--mist)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <Lock size={10} /> Answer all questions on this page to continue
        </p>
      )}
    </div>
  );
}

// ── Answer bubble row ─────────────────────────────────────────────────────────

function AnswerBubbleRow({
  questionNumber,
  xPercent,
  yPercent,
  selectedAnswer,
  correctAnswer,
  revealed,
  onSelect,
}: {
  questionNumber: number;
  xPercent: number;
  yPercent: number;
  selectedAnswer: Choice | null;
  correctAnswer: string | null;
  revealed: boolean;
  onSelect: (c: Choice) => void;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: `${xPercent}%`,
        top: `${yPercent}%`,
        transform: 'translateY(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 3,
        background: 'rgba(255,255,255,0.92)',
        borderRadius: 20,
        padding: '2px 6px',
        border: '1px solid rgba(0,0,0,0.1)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
      }}
    >
      <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--mist)', marginRight: 2, fontFamily: "'Syne', sans-serif" }}>
        {questionNumber}
      </span>
      {CHOICES.map((c) => {
        const isSelected = selectedAnswer === c;
        const isCorrect = revealed && correctAnswer === c;
        const isWrong = revealed && isSelected && correctAnswer !== c;

        let bg = 'transparent';
        let border = '1px solid var(--fog)';
        let color = 'var(--mist)';

        if (isCorrect) { bg = 'rgba(22,163,74,0.18)'; border = '1.5px solid #16a34a'; color = '#15803d'; }
        else if (isWrong) { bg = 'rgba(239,68,68,0.18)'; border = '1.5px solid #ef4444'; color = '#b91c1c'; }
        else if (isSelected) { bg = 'var(--rose)'; border = '1.5px solid var(--rose-deeper)'; color = 'var(--charcoal)'; }

        return (
          <button
            key={c}
            onClick={() => onSelect(c)}
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              border,
              background: bg,
              color,
              fontSize: 10,
              fontWeight: 700,
              cursor: revealed ? 'default' : 'pointer',
              fontFamily: "'Syne', sans-serif",
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.1s',
            }}
          >
            {c}
          </button>
        );
      })}
    </div>
  );
}
