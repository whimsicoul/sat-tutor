'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { BreakfastResult } from './page';

export default function AdminBreakfastResultsClient({
  results,
}: {
  results: BreakfastResult[];
}) {
  const studentNames = Array.from(new Set(results.map((r) => r.student_name))).sort();
  const [filterStudent, setFilterStudent] = useState('all');
  const [detailResult, setDetailResult] = useState<BreakfastResult | null>(null);

  const filtered = filterStudent === 'all'
    ? results
    : results.filter((r) => r.student_name === filterStudent);

  const byStudent = filtered.reduce<Record<string, BreakfastResult[]>>((acc, r) => {
    (acc[r.student_name] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/breakfast-problems">
          <button
            className="w-8 h-8 flex items-center justify-center rounded-lg"
            style={{ background: 'var(--frost)', border: '1px solid var(--fog)', color: 'var(--slate)', cursor: 'pointer' }}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        </Link>
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "'Cormorant Garamond', serif", color: 'var(--charcoal)' }}
          >
            Breakfast Problems — Results
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--mist)' }}>
            {results.length} response{results.length !== 1 ? 's' : ''} across all students
          </p>
        </div>
      </div>

      {/* Filter */}
      {studentNames.length > 1 && (
        <select
          value={filterStudent}
          onChange={(e) => setFilterStudent(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{ minWidth: 200 }}
        >
          <option value="all">All students</option>
          {studentNames.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      )}

      {filtered.length === 0 ? (
        <div className="portal-card flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm font-semibold" style={{ color: 'var(--charcoal)' }}>No results yet</p>
          <p className="text-xs mt-1" style={{ color: 'var(--mist)' }}>Students haven&apos;t submitted any answers.</p>
        </div>
      ) : (
        Object.entries(byStudent).map(([studentName, rows]) => {
          const byDate = rows.reduce<Record<string, BreakfastResult[]>>((acc, r) => {
            (acc[r.assigned_date] ??= []).push(r);
            return acc;
          }, {});

          return (
            <div key={studentName} className="portal-card overflow-hidden p-0">
              <div
                className="px-5 py-3 flex items-center justify-between"
                style={{ borderBottom: '1px solid var(--fog)', background: 'var(--frost)' }}
              >
                <p className="text-sm font-semibold" style={{ color: 'var(--charcoal)' }}>
                  {studentName}
                </p>
                <span className="text-xs" style={{ color: 'var(--mist)' }}>
                  {rows.filter((r) => r.is_correct).length}/{rows.length} correct
                </span>
              </div>

              {Object.entries(byDate)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([date, dateRows]) => (
                  <div key={date}>
                    <div
                      className="px-5 py-2 text-xs font-semibold"
                      style={{ color: 'var(--slate)', borderBottom: '1px solid var(--fog)', background: 'rgba(245,247,250,0.5)' }}
                    >
                      {format(new Date(date), 'EEEE, MMM d, yyyy')}
                    </div>
                    {dateRows.map((r, i) => (
                      <div
                        key={r.id}
                        onClick={() => setDetailResult(r)}
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
                              <> · Correct: <strong style={{ color: '#16a34a' }}>{r.correct_answer}</strong></>
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

      {/* ── Detail Modal ─── */}
      <Dialog
        open={detailResult !== null}
        onOpenChange={(open) => { if (!open) setDetailResult(null); }}
      >
        <DialogContent style={{ maxWidth: 580 }}>
          {detailResult && (
            <>
              <DialogHeader>
                <DialogTitle>Problem Detail</DialogTitle>
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
                  <span className="text-xs" style={{ color: 'var(--mist)' }}>
                    {format(new Date(detailResult.assigned_date), 'MMM d, yyyy')}
                  </span>
                </div>
              </DialogHeader>

              {detailResult.question_image_url && (() => {
                const w = detailResult.image_width_px || 1836;
                const h = detailResult.image_height_px || 1134;
                const top = detailResult.crop_top_px || 0;
                const bottom = detailResult.crop_bottom_px || 0;
                const visibleHeight = Math.max(1, h - top - bottom);
                return (
                  <div
                    className="w-full rounded-md border overflow-hidden relative"
                    style={{ borderColor: 'var(--fog)', aspectRatio: `${w} / ${visibleHeight}` }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={detailResult.question_image_url!}
                      alt="Problem"
                      className="absolute left-0 w-full"
                      style={{ top: 0, transform: `translateY(-${(top / h * 100).toFixed(4)}%)` }}
                    />
                  </div>
                );
              })()}

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
        </DialogContent>
      </Dialog>
    </div>
  );
}
