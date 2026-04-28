'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Coffee, Pencil, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { BreakfastResult, LastSessionDate } from './page';

interface EditDraft {
  question: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_answer: string;
  answer_explanation: string;
  category: string;
}

export default function TutorBreakfastClient({
  results,
  lastSessionDates,
}: {
  results: BreakfastResult[];
  lastSessionDates: LastSessionDate[];
}) {
  const router = useRouter();
  const lastSessionMap = new Map(
    lastSessionDates.map((l) => [l.student_id, l.last_session_date])
  );

  const studentNames = Array.from(new Set(results.map((r) => r.student_name))).sort();
  const [filterStudent, setFilterStudent] = useState('all');
  const [sinceLastSession, setSinceLastSession] = useState(false);

  // Detail modal state
  const [detailResult, setDetailResult] = useState<BreakfastResult | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<EditDraft | null>(null);

  let filtered = filterStudent === 'all'
    ? results
    : results.filter((r) => r.student_name === filterStudent);

  if (sinceLastSession) {
    filtered = filtered.filter((r) => {
      const lastDate = lastSessionMap.get(r.student_id);
      if (!lastDate) return true;
      return r.assigned_date > lastDate;
    });
  }

  const byStudent = filtered.reduce<Record<string, BreakfastResult[]>>((acc, r) => {
    (acc[r.student_name] ??= []).push(r);
    return acc;
  }, {});

  function openDetail(r: BreakfastResult) {
    setDetailResult(r);
    setIsEditing(false);
    setDraft(null);
  }

  function enterEditMode() {
    if (!detailResult) return;
    setDraft({
      question:           detailResult.question,
      choice_a:           detailResult.choice_a,
      choice_b:           detailResult.choice_b,
      choice_c:           detailResult.choice_c,
      choice_d:           detailResult.choice_d,
      correct_answer:     detailResult.correct_answer,
      answer_explanation: detailResult.answer_explanation ?? '',
      category:           detailResult.category ?? '',
    });
    setIsEditing(true);
  }

  async function handleSave() {
    if (!detailResult || !draft) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/breakfast-problems/${detailResult.problem_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...draft,
          answer_explanation: draft.answer_explanation || null,
          category: draft.category || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
      toast.success('Problem updated.');
      setDetailResult((prev) => prev ? {
        ...prev,
        ...draft,
        answer_explanation: draft.answer_explanation || null,
        category: draft.category || null,
      } : prev);
      setIsEditing(false);
      setDraft(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="eyebrow-sky mb-3">Tutor Portal</div>
        <h1 className="portal-section-title">Breakfast Problems</h1>
        <p className="text-sm mt-2" style={{ color: 'var(--slate)' }}>
          Review your students&apos; daily practice results. Use the filter to focus on work since the last session.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {studentNames.length > 1 && (
          <select
            value={filterStudent}
            onChange={(e) => setFilterStudent(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all">All students</option>
            {studentNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        )}
        <Button
          variant={sinceLastSession ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSinceLastSession((v) => !v)}
          style={
            sinceLastSession
              ? { background: 'var(--sky-deeper)', color: 'white', border: 'none' }
              : {}
          }
        >
          Since last session
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="portal-card flex flex-col items-center justify-center py-20 text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'rgba(168,203,222,0.14)', border: '1px solid rgba(168,203,222,0.25)' }}
          >
            <Coffee className="h-6 w-6" style={{ color: 'var(--sky-deeper)' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--charcoal)' }}>
            No results yet
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--mist)' }}>
            {sinceLastSession
              ? 'No breakfast problems submitted since the last session.'
              : "Your students haven't submitted any answers yet."}
          </p>
        </div>
      ) : (
        Object.entries(byStudent).map(([studentName, rows]) => {
          const byDate = rows.reduce<Record<string, BreakfastResult[]>>((acc, r) => {
            (acc[r.assigned_date] ??= []).push(r);
            return acc;
          }, {});

          const incorrectCount = rows.filter((r) => !r.is_correct).length;

          return (
            <div key={studentName} className="portal-card overflow-hidden p-0">
              <div
                className="px-5 py-3 flex items-center justify-between"
                style={{ borderBottom: '1px solid var(--fog)', background: 'var(--frost)' }}
              >
                <p className="text-sm font-semibold" style={{ color: 'var(--charcoal)' }}>
                  {studentName}
                </p>
                <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--mist)' }}>
                  {incorrectCount > 0 && (
                    <span
                      className="px-2 py-0.5 rounded font-semibold"
                      style={{ background: 'rgba(224,166,175,0.18)', color: 'var(--rose-deeper)', border: '1px solid rgba(224,166,175,0.3)' }}
                    >
                      {incorrectCount} to review
                    </span>
                  )}
                  <span>{rows.filter((r) => r.is_correct).length}/{rows.length} correct</span>
                </div>
              </div>

              {Object.entries(byDate)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([date, dateRows]) => (
                  <div key={date}>
                    <div
                      className="px-5 py-2 text-xs font-semibold"
                      style={{
                        color: 'var(--slate)',
                        borderBottom: '1px solid var(--fog)',
                        background: 'rgba(245,247,250,0.5)',
                      }}
                    >
                      {format(new Date(date), 'EEEE, MMM d, yyyy')}
                    </div>
                    {dateRows.map((r, i) => (
                      <div
                        key={r.id}
                        onClick={() => openDetail(r)}
                        className="px-5 py-3 flex items-start gap-3 cursor-pointer"
                        style={{
                          borderBottom: i < dateRows.length - 1 ? '1px solid var(--fog)' : 'none',
                          background: r.is_correct ? 'transparent' : 'rgba(224,166,175,0.07)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = r.is_correct
                            ? 'rgba(0,0,0,0.03)'
                            : 'rgba(224,166,175,0.14)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = r.is_correct
                            ? 'transparent'
                            : 'rgba(224,166,175,0.07)';
                        }}
                      >
                        <div className="mt-0.5 shrink-0">
                          {r.is_correct ? (
                            <CheckCircle className="h-4 w-4" style={{ color: '#16a34a' }} />
                          ) : (
                            <XCircle className="h-4 w-4" style={{ color: 'var(--rose-deeper)' }} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm" style={{ color: 'var(--charcoal)' }}>{r.question}</p>
                          <p className="text-xs mt-1" style={{ color: 'var(--mist)' }}>
                            Answered: <strong>{r.student_answer}</strong>
                            {!r.is_correct && (
                              <>
                                {' '}· Correct:{' '}
                                <strong style={{ color: '#16a34a' }}>{r.correct_answer}</strong>
                              </>
                            )}
                            {r.category && <> · {r.category}</>}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          );
        })
      )}

      {/* ── Detail / Edit Modal ─── */}
      <Dialog
        open={detailResult !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailResult(null);
            setIsEditing(false);
            setDraft(null);
          }
        }}
      >
        <DialogContent style={{ maxWidth: 580 }}>
          {detailResult && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle>Problem Detail</DialogTitle>
                  {!isEditing && (
                    <button
                      onClick={enterEditMode}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded"
                      style={{ color: 'var(--sky-deeper)', background: 'rgba(77,143,174,0.1)', border: '1px solid rgba(77,143,174,0.2)' }}
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {detailResult.category && (
                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--frost)', color: 'var(--slate)', border: '1px solid var(--fog)' }}>
                      {detailResult.category}
                    </span>
                  )}
                  <span className="text-xs" style={{ color: 'var(--mist)' }}>
                    {detailResult.student_name} answered{' '}
                    <strong style={{ color: detailResult.is_correct ? '#16a34a' : 'var(--rose-deeper)' }}>
                      {detailResult.student_answer}
                    </strong>
                    {!detailResult.is_correct && (
                      <> · Correct: <strong style={{ color: '#16a34a' }}>{detailResult.correct_answer}</strong></>
                    )}
                  </span>
                </div>
              </DialogHeader>

              {/* ── View mode ─── */}
              {!isEditing && (
                <>
                  {detailResult.question_image_url && (
                    <div
                      className="w-full overflow-hidden rounded-md border"
                      style={{
                        borderColor: 'var(--fog)',
                        height:
                          detailResult.image_height_px != null &&
                          detailResult.crop_top_px != null &&
                          detailResult.crop_bottom_px != null
                            ? detailResult.image_height_px - detailResult.crop_top_px - detailResult.crop_bottom_px
                            : 'auto',
                      }}
                    >
                      <img
                        src={detailResult.question_image_url}
                        alt="Problem"
                        style={{
                          width: '100%',
                          transform: `translateY(-${detailResult.crop_top_px ?? 0}px)`,
                          display: 'block',
                        }}
                      />
                    </div>
                  )}

                  <p className="text-sm font-medium leading-snug" style={{ color: 'var(--charcoal)' }}>
                    {detailResult.question}
                  </p>

                  <div className="space-y-2">
                    {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                      const key = `choice_${letter.toLowerCase()}` as keyof BreakfastResult;
                      const isCorrect = detailResult.correct_answer === letter;
                      const isStudentWrong = !detailResult.is_correct && detailResult.student_answer === letter;
                      return (
                        <div
                          key={letter}
                          className="flex items-start gap-2 px-3 py-2 rounded-lg text-sm"
                          style={{
                            background: isCorrect
                              ? 'rgba(22,163,74,0.08)'
                              : isStudentWrong
                              ? 'rgba(224,166,175,0.18)'
                              : 'var(--frost)',
                            border: isCorrect
                              ? '1px solid rgba(22,163,74,0.35)'
                              : isStudentWrong
                              ? '1px solid rgba(224,166,175,0.5)'
                              : '1px solid var(--fog)',
                            color: isCorrect ? '#16a34a' : isStudentWrong ? 'var(--rose-deeper)' : 'var(--charcoal)',
                            fontWeight: isCorrect || isStudentWrong ? 600 : 400,
                          }}
                        >
                          <strong>{letter}.</strong>
                          <span className="flex-1">{detailResult[key] as string}</span>
                          {isCorrect && <span className="text-xs ml-auto shrink-0">Correct</span>}
                          {isStudentWrong && <span className="text-xs ml-auto shrink-0">Student picked</span>}
                        </div>
                      );
                    })}
                  </div>

                  {detailResult.answer_explanation && (
                    <div
                      className="rounded-lg px-3 py-2 text-sm"
                      style={{ background: 'var(--frost)', border: '1px solid var(--fog)' }}
                    >
                      <p className="text-xs font-semibold mb-1" style={{ color: 'var(--slate)' }}>Explanation</p>
                      <p style={{ color: 'var(--charcoal)' }}>{detailResult.answer_explanation}</p>
                    </div>
                  )}

                  <DialogFooter showCloseButton />
                </>
              )}

              {/* ── Edit mode ─── */}
              {isEditing && draft && (
                <>
                  <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                    <div>
                      <label className="text-xs font-semibold" style={{ color: 'var(--slate)' }}>Question</label>
                      <Textarea
                        className="mt-1"
                        value={draft.question}
                        onChange={(e) => setDraft((d) => d ? { ...d, question: e.target.value } : d)}
                      />
                    </div>
                    {(['a', 'b', 'c', 'd'] as const).map((letter) => (
                      <div key={letter}>
                        <label className="text-xs font-semibold" style={{ color: 'var(--slate)' }}>
                          Choice {letter.toUpperCase()}
                        </label>
                        <Input
                          className="mt-1"
                          value={draft[`choice_${letter}` as keyof EditDraft]}
                          onChange={(e) => setDraft((d) => d ? { ...d, [`choice_${letter}`]: e.target.value } : d)}
                        />
                      </div>
                    ))}
                    <div>
                      <label className="text-xs font-semibold" style={{ color: 'var(--slate)' }}>Correct Answer</label>
                      <select
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={draft.correct_answer}
                        onChange={(e) => setDraft((d) => d ? { ...d, correct_answer: e.target.value } : d)}
                      >
                        {['A', 'B', 'C', 'D'].map((l) => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold" style={{ color: 'var(--slate)' }}>Answer Explanation</label>
                      <Textarea
                        className="mt-1"
                        placeholder="Optional explanation for tutors…"
                        value={draft.answer_explanation}
                        onChange={(e) => setDraft((d) => d ? { ...d, answer_explanation: e.target.value } : d)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold" style={{ color: 'var(--slate)' }}>Category</label>
                      <select
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={draft.category}
                        onChange={(e) => setDraft((d) => d ? { ...d, category: e.target.value } : d)}
                      >
                        <option value="">None</option>
                        <option value="Math">Math</option>
                        <option value="Reading and Writing">Reading and Writing</option>
                      </select>
                    </div>
                  </div>

                  <DialogFooter>
                    <button
                      onClick={() => { setIsEditing(false); setDraft(null); }}
                      disabled={saving}
                      className="text-sm px-4 py-2 rounded-md border"
                      style={{ borderColor: 'var(--fog)', color: 'var(--slate)' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-2 text-sm px-4 py-2 rounded-md"
                      style={{ background: 'var(--sky-deeper)', color: 'white' }}
                    >
                      {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                  </DialogFooter>
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
