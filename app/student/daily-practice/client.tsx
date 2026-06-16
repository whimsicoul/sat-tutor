'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TodayAssignment } from './page';
import AnnotationCanvas from '@/components/shared/AnnotationCanvas';
import type { Annotations } from '@/types/annotations';

const CHOICES = ['A', 'B', 'C', 'D'] as const;
type Choice = (typeof CHOICES)[number];

interface GradeResult {
  problemId: string;
  isCorrect: boolean;
  correctAnswer: string;
}

export default function StudentDailyPracticeClient({
  assignments: initial,
}: {
  assignments: TodayAssignment[];
}) {
  const alreadySubmitted = initial.length > 0 && initial.every((a) => a.submitted_at !== null);

  const [currentIdx, setCurrentIdx] = useState(0);

  const [answers, setAnswers] = useState<Record<string, Choice>>(() => {
    const pre: Record<string, Choice> = {};
    for (const a of initial) {
      if (a.student_answer) pre[a.problem_id] = a.student_answer as Choice;
    }
    return pre;
  });

  const [gradeMap, setGradeMap] = useState<Record<string, GradeResult>>(() => {
    if (!alreadySubmitted) return {};
    const m: Record<string, GradeResult> = {};
    for (const a of initial) {
      if (a.student_answer && a.is_correct !== null) {
        m[a.problem_id] = {
          problemId: a.problem_id,
          isCorrect: a.is_correct,
          correctAnswer: '',
        };
      }
    }
    return m;
  });

  const [submitted, setSubmitted] = useState(alreadySubmitted);
  const [submitting, setSubmitting] = useState(false);

  const allAnswered = initial.length > 0 && initial.every((a) => answers[a.problem_id]);
  const isLastProblem = currentIdx === initial.length - 1;

  async function handleSubmit() {
    if (!allAnswered) return;
    setSubmitting(true);
    try {
      const payload = initial.map((a) => ({
        assignmentId: a.assignment_id,
        problemId: a.problem_id,
        studentAnswer: answers[a.problem_id],
      }));

      const res = await fetch('/api/daily-practice/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: payload }),
      });

      if (res.status === 409) {
        toast.error("You've already submitted today's problems.");
        setSubmitted(true);
        return;
      }
      if (!res.ok) throw new Error((await res.json()).error || 'Submission failed');

      const { results } = await res.json() as { results: GradeResult[] };
      const map: Record<string, GradeResult> = {};
      for (const r of results) map[r.problemId] = r;
      setGradeMap(map);
      setSubmitted(true);

      const correct = results.filter((r) => r.isCorrect).length;
      toast.success(`${correct}/${results.length} correct!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  const choiceLabel = (a: TodayAssignment, c: Choice) => {
    const map = { A: a.choice_a, B: a.choice_b, C: a.choice_c, D: a.choice_d };
    return map[c];
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="eyebrow-rose mb-3">Student Portal</div>
        <h1 className="portal-section-title">☀️ Daily Practice</h1>
        <p className="text-sm mt-2" style={{ color: 'var(--slate)' }}>
          {submitted
            ? "Here are your results for today. Incorrect answers will be reviewed at your next session."
            : "Answer all 5 problems, then submit. Results are auto-graded."}
        </p>
      </div>

      {initial.length === 0 ? (
        <div className="portal-card flex flex-col items-center justify-center py-20 text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'var(--rose-ultra)', border: '1px solid rgba(224,166,175,0.25)' }}
          >
            <span style={{ fontSize: 24 }}>☀️</span>
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--charcoal)' }}>
            No problems available yet
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--mist)' }}>
            Check back soon — your tutor is adding problems to the pool.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Progress indicator */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: 'var(--slate)' }}>
              Problem {currentIdx + 1} of {initial.length}
            </span>
            <div className="flex items-center gap-1.5">
              {initial.map((a, i) => {
                const isCurrent = i === currentIdx;
                const isAnswered = !!answers[a.problem_id];
                return (
                  <button
                    key={a.problem_id}
                    onClick={() => setCurrentIdx(i)}
                    title={`Problem ${i + 1}`}
                    style={{
                      width: isCurrent ? 20 : 10,
                      height: 10,
                      borderRadius: isCurrent ? 5 : '50%',
                      background: isCurrent
                        ? 'var(--rose-deeper)'
                        : isAnswered
                        ? 'var(--sky-deeper)'
                        : 'var(--fog)',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Current problem card */}
          {(() => {
            const a = initial[currentIdx];
            const idx = currentIdx;
            const grade = gradeMap[a.problem_id];
            const isCorrect = grade?.isCorrect;

            let cardBorder = '1px solid var(--fog)';
            if (submitted && grade) {
              cardBorder = isCorrect
                ? '1px solid rgba(22,163,74,0.4)'
                : '1px solid rgba(224,166,175,0.6)';
            }

            let cardBg = 'var(--white)';
            if (submitted && grade && !isCorrect) cardBg = 'rgba(224,166,175,0.06)';
            if (submitted && grade && isCorrect) cardBg = 'rgba(22,163,74,0.04)';

            return (
              <div
                key={a.problem_id}
                className="portal-card p-5"
                style={{ border: cardBorder, background: cardBg }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-semibold mt-0.5"
                    style={{
                      background: 'rgba(77,143,174,0.12)',
                      color: 'var(--sky-deeper)',
                      border: '1px solid rgba(77,143,174,0.22)',
                    }}
                  >
                    {String(idx + 1).padStart(2, '0')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      {a.question_image_url ? (
                        (() => {
                          const w = a.image_width_px || 1836;
                          const h = a.image_height_px || 1134;
                          const top = a.crop_top_px || 0;
                          const bottom = a.crop_bottom_px || 0;
                          const visibleHeight = Math.max(1, h - top - bottom);
                          return (
                            <div
                              className="w-full rounded border overflow-hidden relative"
                              style={{ borderColor: 'var(--fog)', aspectRatio: `${w} / ${visibleHeight}` }}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={a.question_image_url!}
                                alt="Math question"
                                className="absolute left-0 w-full"
                                style={{ top: 0, transform: `translateY(-${(top / h * 100).toFixed(4)}%)` }}
                              />
                              <AnnotationCanvas
                                context="daily_practice"
                                assignmentId={a.assignment_id}
                                initialAnnotations={(a.annotations ?? []) as Annotations}
                              />
                            </div>
                          );
                        })()
                      ) : (
                        <p className="text-sm font-medium leading-snug" style={{ color: 'var(--charcoal)' }}>
                          {a.question}
                        </p>
                      )}
                      {submitted && grade && !a.question_image_url && (
                        <div className="shrink-0 mt-0.5">
                          {isCorrect ? (
                            <CheckCircle className="h-5 w-5" style={{ color: '#16a34a' }} />
                          ) : (
                            <XCircle className="h-5 w-5" style={{ color: 'var(--rose-deeper)' }} />
                          )}
                        </div>
                      )}
                    </div>

                    {submitted && grade && a.question_image_url && (
                      <div className="mt-2 flex justify-end">
                        {isCorrect ? (
                          <CheckCircle className="h-5 w-5" style={{ color: '#16a34a' }} />
                        ) : (
                          <XCircle className="h-5 w-5" style={{ color: 'var(--rose-deeper)' }} />
                        )}
                      </div>
                    )}

                    {a.category && (
                      <p className="text-xs mt-1" style={{ color: 'var(--mist)' }}>{a.category}</p>
                    )}

                    <div className="mt-3 space-y-2">
                      {CHOICES.map((c) => {
                        const isSelected = answers[a.problem_id] === c;
                        const isCorrectChoice = submitted && grade?.correctAnswer === c;
                        const isWrongSelected = submitted && isSelected && !isCorrect;

                        let optBg = 'transparent';
                        if (!submitted && isSelected) optBg = 'rgba(168,203,222,0.18)';
                        if (submitted && isCorrectChoice) optBg = 'rgba(22,163,74,0.1)';
                        if (submitted && isWrongSelected) optBg = 'rgba(224,166,175,0.18)';

                        let optBorder = '1px solid var(--fog)';
                        if (!submitted && isSelected) optBorder = '1px solid rgba(77,143,174,0.4)';
                        if (submitted && isCorrectChoice) optBorder = '1px solid rgba(22,163,74,0.4)';
                        if (submitted && isWrongSelected) optBorder = '1px solid rgba(224,166,175,0.5)';

                        return (
                          <label
                            key={c}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all"
                            style={{
                              background: optBg,
                              border: optBorder,
                              cursor: submitted ? 'default' : 'pointer',
                            }}
                          >
                            <input
                              type="radio"
                              name={a.problem_id}
                              value={c}
                              checked={isSelected}
                              disabled={submitted}
                              onChange={() => {
                                if (!submitted) {
                                  setAnswers((prev) => ({ ...prev, [a.problem_id]: c }));
                                }
                              }}
                              className="shrink-0"
                            />
                            <span
                              className="text-sm"
                              style={{
                                color: submitted && isCorrectChoice
                                  ? '#16a34a'
                                  : submitted && isWrongSelected
                                  ? 'var(--rose-deeper)'
                                  : 'var(--charcoal)',
                                fontWeight: submitted && (isCorrectChoice || isWrongSelected) ? 600 : 400,
                              }}
                            >
                              <strong>{c}.</strong>{a.question_image_url ? null : ` ${choiceLabel(a, c)}`}
                            </span>
                          </label>
                        );
                      })}
                    </div>

                    {submitted && grade && !isCorrect && (
                      <p className="mt-2 text-xs font-semibold" style={{ color: '#16a34a' }}>
                        Correct answer: {grade.correctAnswer}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Navigation */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
              disabled={currentIdx === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: 'transparent',
                border: '1px solid var(--fog)',
                color: currentIdx === 0 ? 'var(--cloud)' : 'var(--slate)',
                cursor: currentIdx === 0 ? 'default' : 'pointer',
                opacity: currentIdx === 0 ? 0.5 : 1,
              }}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>

            {isLastProblem && !submitted ? (
              <Button
                onClick={handleSubmit}
                disabled={!allAnswered || submitting}
                style={{
                  background: allAnswered ? 'var(--rose-deeper)' : undefined,
                  color: allAnswered ? 'white' : undefined,
                  border: 'none',
                }}
              >
                {submitting ? 'Submitting…' : allAnswered ? 'Submit All Answers' : `Answer all ${initial.length} problems to submit`}
              </Button>
            ) : (
              <button
                onClick={() => setCurrentIdx((i) => Math.min(initial.length - 1, i + 1))}
                disabled={isLastProblem}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: isLastProblem ? 'transparent' : 'var(--rose-deeper)',
                  border: isLastProblem ? '1px solid var(--fog)' : 'none',
                  color: isLastProblem ? 'var(--cloud)' : 'white',
                  cursor: isLastProblem ? 'default' : 'pointer',
                  opacity: isLastProblem ? 0.5 : 1,
                }}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>

          {submitted && isLastProblem && (
            <div
              className="rounded-xl px-5 py-4 text-center"
              style={{ background: 'var(--frost)', border: '1px solid var(--fog)' }}
            >
              <p className="text-sm font-semibold" style={{ color: 'var(--charcoal)' }}>
                {Object.values(gradeMap).filter((g) => g.isCorrect).length > 0 || initial.some((a) => a.is_correct)
                  ? `${Object.values(gradeMap).filter((g) => g.isCorrect).length || initial.filter((a) => a.is_correct).length}/${initial.length} correct today`
                  : 'Submitted'}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--mist)' }}>
                Incorrect problems will be reviewed at your next tutoring session.
              </p>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
