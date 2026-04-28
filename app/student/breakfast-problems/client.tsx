'use client';

import { useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { Coffee, CheckCircle, XCircle, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import type { TodayAssignment } from './page';

const CHOICES = ['A', 'B', 'C', 'D'] as const;
type Choice = (typeof CHOICES)[number];

interface GradeResult {
  problemId: string;
  isCorrect: boolean;
  correctAnswer: string;
}

export default function StudentBreakfastClient({
  assignments: initial,
}: {
  assignments: TodayAssignment[];
}) {
  const alreadySubmitted = initial.length > 0 && initial.every((a) => a.submitted_at !== null);

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
  const [flaggingProblemId, setFlaggingProblemId] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState('');
  const [flagging, setFlagging] = useState(false);
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());

  const allAnswered = initial.length > 0 && initial.every((a) => answers[a.problem_id]);

  async function handleSubmit() {
    if (!allAnswered) return;
    setSubmitting(true);
    try {
      const payload = initial.map((a) => ({
        assignmentId: a.assignment_id,
        problemId: a.problem_id,
        studentAnswer: answers[a.problem_id],
      }));

      const res = await fetch('/api/breakfast-problems/submit', {
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

  async function handleFlag() {
    if (!flaggingProblemId) return;
    setFlagging(true);
    try {
      const res = await fetch('/api/breakfast-problems/flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemId: flaggingProblemId, reason: flagReason || null }),
      });
      if (!res.ok) throw new Error('Flag failed');
      setFlaggedIds((prev) => new Set([...prev, flaggingProblemId]));
      toast.success("Problem flagged — your tutor will review it.");
      setFlaggingProblemId(null);
      setFlagReason('');
    } catch {
      toast.error('Could not submit flag. Please try again.');
    } finally {
      setFlagging(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="eyebrow-rose mb-3">Student Portal</div>
        <h1 className="portal-section-title">Breakfast Problems</h1>
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
            <Coffee className="h-6 w-6" style={{ color: 'var(--rose-deeper)' }} />
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
          {initial.map((a, idx) => {
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
                        <div
                          className="w-full rounded border overflow-hidden relative"
                          style={{ borderColor: 'var(--fog)' }}
                        >
                          <Image
                            src={a.question_image_url}
                            alt="Math question"
                            width={800}
                            height={400}
                            className="w-full"
                            style={{ marginTop: '-220px', display: 'block' }}
                          />
                        </div>
                      ) : (
                        <p className="text-sm font-medium leading-snug" style={{ color: 'var(--charcoal)' }}>
                          {a.question}
                        </p>
                      )}
                      <div className="shrink-0 flex items-center gap-1 mt-0.5">
                        {submitted && grade && !a.question_image_url && (
                          isCorrect ? (
                            <CheckCircle className="h-5 w-5" style={{ color: '#16a34a' }} />
                          ) : (
                            <XCircle className="h-5 w-5" style={{ color: 'var(--rose-deeper)' }} />
                          )
                        )}
                        <button
                          onClick={() => { setFlaggingProblemId(a.problem_id); setFlagReason(''); }}
                          title="Flag this problem"
                          className="flex items-center justify-center w-7 h-7 rounded transition-all"
                          style={{
                            background: flaggedIds.has(a.problem_id) ? '#FEE2E2' : 'transparent',
                            border: flaggedIds.has(a.problem_id) ? '1px solid #FECACA' : '1px solid transparent',
                            color: flaggedIds.has(a.problem_id) ? '#991B1B' : 'var(--cloud)',
                            cursor: 'pointer',
                          }}
                        >
                          <Flag className="h-3.5 w-3.5" />
                        </button>
                      </div>
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
          })}

          {!submitted && (
            <Button
              onClick={handleSubmit}
              disabled={!allAnswered || submitting}
              className="w-full mt-2"
              style={{
                background: allAnswered ? 'var(--rose-deeper)' : undefined,
                color: allAnswered ? 'white' : undefined,
                border: 'none',
              }}
            >
              {submitting ? 'Submitting…' : allAnswered ? 'Submit All Answers' : `Answer all ${initial.length} problems to submit`}
            </Button>
          )}

          {submitted && (
            <div
              className="rounded-xl px-5 py-4 text-center"
              style={{ background: 'var(--frost)', border: '1px solid var(--fog)' }}
            >
              <p className="text-sm font-semibold" style={{ color: 'var(--charcoal)' }}>
                {Object.values(gradeMap).filter((g) => g.isCorrect).length > 0 || initial.some((a) => a.is_correct)
                  ? `${Object.values(gradeMap).filter((g) => g.isCorrect).length || initial.filter((a) => a.is_correct).length}/${initial.length} correct today`
                  : "Submitted"}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--mist)' }}>
                Incorrect problems will be reviewed at your next tutoring session.
              </p>
            </div>
          )}
        </div>
      )}

      <Dialog
        open={flaggingProblemId !== null}
        onOpenChange={(open) => { if (!open) { setFlaggingProblemId(null); setFlagReason(''); } }}
      >
        <DialogContent style={{ maxWidth: 400 }}>
          <DialogHeader>
            <DialogTitle>Flag this problem</DialogTitle>
          </DialogHeader>
          <p className="text-sm" style={{ color: 'var(--slate)' }}>
            Let your tutor know something&apos;s confusing. Leave a note or just flag it.
          </p>
          <Textarea
            placeholder="Optional: What's confusing? (e.g. &quot;I don't understand the wording&quot;)"
            value={flagReason}
            onChange={(e) => setFlagReason(e.target.value)}
            className="resize-none"
            rows={3}
          />
          <DialogFooter>
            <button
              onClick={handleFlag}
              disabled={flagging}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: 'var(--rose-deeper)',
                color: 'white',
                border: 'none',
                cursor: flagging ? 'not-allowed' : 'pointer',
                opacity: flagging ? 0.7 : 1,
              }}
            >
              <Flag className="h-3.5 w-3.5" />
              {flagging ? 'Flagging…' : 'Submit Flag'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
