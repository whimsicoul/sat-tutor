'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Coffee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BreakfastResult, LastSessionDate } from './page';

export default function TutorBreakfastClient({
  results,
  lastSessionDates,
}: {
  results: BreakfastResult[];
  lastSessionDates: LastSessionDate[];
}) {
  const lastSessionMap = new Map(
    lastSessionDates.map((l) => [l.student_id, l.last_session_date])
  );

  const studentNames = Array.from(new Set(results.map((r) => r.student_name))).sort();
  const [filterStudent, setFilterStudent] = useState('all');
  const [sinceLastSession, setSinceLastSession] = useState(false);

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
                        className="px-5 py-3 flex items-start gap-3"
                        style={{
                          borderBottom: i < dateRows.length - 1 ? '1px solid var(--fog)' : 'none',
                          background: r.is_correct ? 'transparent' : 'rgba(224,166,175,0.07)',
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
    </div>
  );
}
