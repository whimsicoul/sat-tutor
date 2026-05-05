'use client';

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft, ChevronLeft, ChevronRight, BookOpen, Layers,
  Lock, Eye, EyeOff,
} from 'lucide-react';
import type { FlowStep, FlowPage, FlowPosition, FlowAnswerKey } from './page';

const CHOICES = ['A', 'B', 'C', 'D'] as const;
type Choice = typeof CHOICES[number];

interface ResponseState {
  selectedAnswer: Choice | null;
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

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
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

      {/* Step content */}
      {currentStep.type === 'instruction' ? (
        <InstructionStep step={currentStep} />
      ) : (
        <ProblemsStep step={currentStep} worksheetId={worksheet.id} />
      )}

      {/* Step navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--fog)' }}>
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
    <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--fog)' }}>
      <iframe
        src={step.pdf_url}
        style={{ width: '100%', height: 620, display: 'block' }}
        title={step.title}
      />
    </div>
  );
}

// ── Problems step ─────────────────────────────────────────────────────────────

function ProblemsStep({ step, worksheetId }: { step: FlowStep; worksheetId: string }) {
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
              selectedAnswer={state.selectedAnswer}
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
