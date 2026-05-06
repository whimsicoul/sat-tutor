'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, ChevronLeft, ChevronRight, BookOpen, Layers,
} from 'lucide-react';
import type { FlowStep } from '@/app/student/worksheets/[id]/page';

export default function TutorWorksheetViewClient({
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
        <Link href="/tutor/schedule" className="text-sm underline" style={{ color: 'var(--sky-deeper)' }}>
          Back to Schedule
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
        href="/tutor/schedule"
        className="inline-flex items-center gap-1.5 text-xs font-semibold transition-colors"
        style={{ color: 'var(--mist)', textDecoration: 'none' }}
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Schedule
      </Link>

      {/* Title + tutor badge */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 700, color: 'var(--charcoal)' }}>
            {worksheet.title}
          </h1>
          <span style={{
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
            padding: '2px 8px', borderRadius: 10,
            background: 'rgba(168,203,222,0.14)', color: 'var(--sky-deeper)',
            border: '1px solid rgba(168,203,222,0.3)',
          }}>
            Tutor View
          </span>
        </div>

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
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--mist)' }}>
          Step {currentStepIdx + 1} of {totalSteps}
        </span>
        {currentStep.stage_label && (
          <>
            <span style={{ color: 'var(--fog)' }}>·</span>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12,
              background: currentStep.type === 'instruction' ? 'rgba(168,203,222,0.14)' : 'rgba(224,166,175,0.14)',
              color: currentStep.type === 'instruction' ? 'var(--sky-deeper)' : 'var(--rose-deeper)',
              border: `1px solid ${currentStep.type === 'instruction' ? 'rgba(168,203,222,0.3)' : 'rgba(224,166,175,0.3)'}`,
            }}>
              {currentStep.stage_label}
            </span>
          </>
        )}
      </div>

      {/* Step content */}
      <TutorStepView step={currentStep} />

      {/* Navigation */}
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
            background: currentStepIdx === totalSteps - 1 ? 'var(--fog)' : 'var(--sky)',
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

function TutorStepView({ step }: { step: FlowStep }) {
  if (!step.pdf_url) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, border: '1px dashed var(--fog)', borderRadius: 14, color: 'var(--mist)', fontSize: 13 }}>
        No PDF uploaded for this step yet.
      </div>
    );
  }
  return (
    <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--fog)' }}>
      <iframe
        src={step.pdf_url}
        style={{ width: '100%', height: 700, display: 'block' }}
        title={step.title}
      />
    </div>
  );
}
