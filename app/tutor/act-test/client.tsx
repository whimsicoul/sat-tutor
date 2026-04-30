'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import type { ActResult } from './page';

const SECTION_LABELS: Record<string, string> = {
  english: 'English',
  math: 'Math',
  reading: 'Reading',
  science: 'Science',
};

const SECTION_TOTALS: Record<string, number> = {
  english: 75,
  math: 60,
  reading: 40,
  science: 40,
};

export default function TutorActTestClient({ results }: { results: ActResult[] }) {
  const studentNames = Array.from(new Set(results.map(r => r.student_name))).sort();
  const [filterStudent, setFilterStudent] = useState('all');
  const [filterSection, setFilterSection] = useState('all');

  const filtered = results.filter(r => {
    if (filterStudent !== 'all' && r.student_name !== filterStudent) return false;
    if (filterSection !== 'all' && r.section !== filterSection) return false;
    if (!r.completed_at) return false;
    return true;
  });

  // Group by student
  const byStudent = filtered.reduce<Record<string, ActResult[]>>((acc, r) => {
    (acc[r.student_name] ??= []).push(r);
    return acc;
  }, {});

  const completedCount = results.filter(r => r.completed_at).length;
  const inProgressCount = results.filter(r => !r.completed_at).length;

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 8 }}>
        ACT Practice Test Results
      </h1>
      <p style={{ color: 'var(--mist)', fontSize: 14, marginBottom: 28 }}>
        View ACT practice test scores for your students.
      </p>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Completed Attempts', value: completedCount },
          { label: 'In Progress', value: inProgressCount },
          { label: 'Students', value: studentNames.length },
        ].map(stat => (
          <div key={stat.label} style={{ flex: 1, padding: '16px 20px', background: 'var(--white)', border: '1px solid var(--fog)', borderRadius: 10 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--charcoal)', fontFamily: "'Cormorant Garamond', serif" }}>{stat.value}</div>
            <div style={{ fontSize: 12, color: 'var(--mist)', marginTop: 2, fontFamily: "'Syne', sans-serif", textTransform: 'uppercase', letterSpacing: '0.07em' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <select
          value={filterStudent}
          onChange={e => setFilterStudent(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--fog)', fontFamily: "'Syne', sans-serif", fontSize: 13, color: 'var(--charcoal)' }}
        >
          <option value="all">All Students</option>
          {studentNames.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <select
          value={filterSection}
          onChange={e => setFilterSection(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--fog)', fontFamily: "'Syne', sans-serif", fontSize: 13, color: 'var(--charcoal)' }}
        >
          <option value="all">All Sections</option>
          {Object.entries(SECTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {Object.keys(byStudent).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--mist)', fontSize: 14 }}>
          No completed ACT attempts yet.
        </div>
      ) : (
        Object.entries(byStudent).sort(([a], [b]) => a.localeCompare(b)).map(([studentName, studentResults]) => (
          <div key={studentName} style={{ marginBottom: 28, background: 'var(--white)', border: '1px solid var(--fog)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--fog)', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 600, color: 'var(--charcoal)' }}>{studentName}</span>
              <span style={{ fontSize: 12, color: 'var(--mist)' }}>{studentResults.length} attempt{studentResults.length !== 1 ? 's' : ''}</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  {['Section', 'Date', 'Score', 'Percent', 'Duration'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, color: 'var(--mist)', fontFamily: "'Syne', sans-serif", textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 500, borderBottom: '1px solid var(--fog)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {studentResults
                  .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
                  .map(r => {
                    const pct = r.total_questions > 0 ? Math.round((r.correct_count / r.total_questions) * 100) : 0;
                    const durationMs = r.completed_at
                      ? new Date(r.completed_at).getTime() - new Date(r.started_at).getTime()
                      : null;
                    const durationStr = durationMs != null
                      ? `${Math.floor(durationMs / 60000)}m ${Math.floor((durationMs % 60000) / 1000)}s`
                      : '—';
                    const pctColor = pct >= 80 ? '#4a9e4a' : pct >= 60 ? '#e08c4a' : '#c94040';
                    return (
                      <tr key={r.attempt_id} style={{ borderBottom: '1px solid var(--fog)' }}>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--charcoal)', fontFamily: "'Syne', sans-serif" }}>
                          {SECTION_LABELS[r.section] ?? r.section}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--slate)', fontFamily: "'Syne', sans-serif" }}>
                          {format(new Date(r.started_at), 'MMM d, yyyy')}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--charcoal)', fontFamily: "'Syne', sans-serif", fontWeight: 600 }}>
                          {r.correct_count}/{r.total_questions > 0 ? r.total_questions : (SECTION_TOTALS[r.section] ?? '?')}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 600,
                            fontFamily: "'Syne', sans-serif",
                            background: `${pctColor}18`,
                            color: pctColor,
                          }}>
                            {pct}%
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--mist)', fontFamily: "'Syne', sans-serif" }}>
                          {durationStr}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}
