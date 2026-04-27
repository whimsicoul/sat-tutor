'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import type { BreakfastResult } from './page';

export default function AdminBreakfastResultsClient({
  results,
}: {
  results: BreakfastResult[];
}) {
  const studentNames = Array.from(new Set(results.map((r) => r.student_name))).sort();
  const [filterStudent, setFilterStudent] = useState('all');

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
    </div>
  );
}
