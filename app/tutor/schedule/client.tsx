'use client';

import { useState } from 'react';
import { Calendar, CheckCircle, XCircle, Clock, Download, ExternalLink, Send, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { getGoogleCalendarUrl } from '@/lib/calendar';
import type { TutorSessionRow, TutorProblemSet, StudentOption } from './page';

function ProblemSetsBlock({ problemSets }: { problemSets: TutorProblemSet[] }) {
  if (problemSets.length === 0) return null;
  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--fog)' }}>
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--mist)', marginBottom: 6 }}>
        Problem Sheets
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {problemSets.map((ps) => (
          <div key={ps.id} style={{ display: 'flex', gap: 4 }}>
            <a
              href={ps.problem_pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12,
                color: 'var(--sky-deeper)', textDecoration: 'none',
                background: 'rgba(168,203,222,0.10)', border: '1px solid rgba(168,203,222,0.25)',
                borderRadius: 6, padding: '3px 10px',
              }}
            >
              <FileText size={12} /> {ps.title} <ExternalLink size={10} />
            </a>
            {ps.answer_pdf_url && (
              <a
                href={ps.answer_pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12,
                  color: 'var(--rose-deeper)', textDecoration: 'none',
                  background: 'rgba(224,166,175,0.10)', border: '1px solid rgba(224,166,175,0.25)',
                  borderRadius: 6, padding: '3px 10px',
                }}
              >
                Answers <ExternalLink size={10} />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  icon: Clock,        cls: 'status-pending'  },
  approved: { label: 'Approved', icon: CheckCircle,  cls: 'status-approved' },
  denied:   { label: 'Declined', icon: XCircle,      cls: 'status-denied'   },
};

const inputStyle = {
  width: '100%',
  padding: '0.625rem 0.875rem',
  borderRadius: '0.5rem',
  fontSize: '0.875rem',
  outline: 'none',
  background: 'var(--white)',
  border: '1px solid var(--fog)',
  color: 'var(--charcoal)',
  fontFamily: "'Syne', sans-serif",
  transition: 'border-color 0.15s, box-shadow 0.15s',
};

export default function TutorScheduleClient({
  sessions: initial,
  students,
}: {
  sessions: TutorSessionRow[];
  students: StudentOption[];
}) {
  const [sessions, setSessions] = useState(initial);
  const [studentId, setStudentId] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [proposing, setProposing] = useState(false);

  async function handlePropose(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId || !dateTime) { toast.error('Please fill all fields.'); return; }
    setProposing(true);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, proposedTime: new Date(dateTime).toISOString() }),
      });
      if (!res.ok) throw new Error('Failed');
      const newSession = await res.json();
      const student = students.find((s) => s.id === studentId);
      setSessions((prev) => [{ ...newSession, student_name: student?.name ?? '' }, ...prev]);
      setStudentId(''); setDateTime('');
      toast.success('Session proposed! The student has been notified.');
    } catch {
      toast.error('Failed to propose session.');
    } finally {
      setProposing(false);
    }
  }

  async function downloadICS(id: string) {
    const res = await fetch(`/api/sessions/${id}/ics`);
    if (!res.ok) { toast.error('Failed to generate calendar file.'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'session.ics'; a.click();
    URL.revokeObjectURL(url);
  }

  const grouped = {
    pending: sessions.filter((s) => s.status === 'pending'),
    approved: sessions.filter((s) => s.status === 'approved'),
    denied: sessions.filter((s) => s.status === 'denied'),
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <div className="eyebrow-sky mb-3">Tutor Portal</div>
        <h1 className="portal-section-title">Schedule</h1>
        <p className="text-sm mt-2" style={{ color: 'var(--slate)' }}>
          Propose sessions and track student responses.
        </p>
      </div>

      {/* Propose form */}
      <div className="portal-card-sky p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(168,203,222,0.2)', border: '1px solid rgba(168,203,222,0.3)' }}
          >
            <Send className="h-3.5 w-3.5" style={{ color: 'var(--sky-deeper)' }} />
          </div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--charcoal)' }}>
            Propose a New Session
          </h2>
        </div>

        <form onSubmit={handlePropose} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label
                className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                style={{ color: 'var(--mist)' }}
              >
                Student
              </label>
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
                style={{ ...inputStyle, appearance: 'none' as const }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--sky)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(168,203,222,0.15)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--fog)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <option value="">Select a student</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label
                className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                style={{ color: 'var(--mist)' }}
              >
                Date &amp; Time
              </label>
              <input
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                required
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--sky)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(168,203,222,0.15)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--fog)'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={proposing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: proposing ? 'var(--fog)' : 'var(--sky)',
              color: proposing ? 'var(--mist)' : 'var(--charcoal)',
              border: 'none',
              cursor: proposing ? 'not-allowed' : 'pointer',
            }}
          >
            <Calendar className="h-4 w-4" />
            {proposing ? 'Proposing…' : 'Propose Session'}
          </button>
        </form>
      </div>

      {/* Sessions */}
      {sessions.length === 0 ? (
        <div className="portal-card flex flex-col items-center justify-center py-16 text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'var(--sky-ultra)', border: '1px solid rgba(168,203,222,0.25)' }}
          >
            <Calendar className="h-6 w-6" style={{ color: 'var(--sky-deeper)' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--charcoal)' }}>
            No sessions proposed yet
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--mist)' }}>
            Use the form above to propose your first session.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {(['pending', 'approved', 'denied'] as const).map((status) => {
            const list = grouped[status];
            if (list.length === 0) return null;
            const cfg = STATUS_CONFIG[status];
            const Icon = cfg.icon;

            return (
              <div key={status} className="space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${cfg.cls}`}
                  >
                    <Icon className="h-3 w-3" />
                    {cfg.label}
                    <span className="ml-0.5 opacity-65">· {list.length}</span>
                  </span>
                </div>

                {list.map((s) => {
                  const dt = new Date(s.proposed_time);
                  const gcUrl = getGoogleCalendarUrl({
                    title: 'SAT Tutoring Session',
                    start: dt,
                    durationMinutes: 60,
                  });

                  return (
                    <div
                      key={s.id}
                      className="portal-card px-5 py-4"
                      style={{
                        borderLeft: status === 'pending' ? '3px solid var(--sky)' : undefined,
                      }}
                    >
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold" style={{ color: 'var(--charcoal)' }}>
                            {format(dt, 'EEEE, MMMM d, yyyy')}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--mist)' }}>
                            {format(dt, 'h:mm a')} · {s.student_name}
                          </p>
                        </div>
                        {s.status === 'approved' && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => downloadICS(s.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                              style={{
                                background: 'var(--frost)',
                                color: 'var(--slate)',
                                border: '1px solid var(--fog)',
                                cursor: 'pointer',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--sky-pale)'; e.currentTarget.style.color = 'var(--sky-deeper)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--frost)'; e.currentTarget.style.color = 'var(--slate)'; }}
                            >
                              <Download className="h-3.5 w-3.5" />
                              .ics
                            </button>
                            <a
                              href={gcUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                              style={{
                                background: 'var(--frost)',
                                color: 'var(--slate)',
                                border: '1px solid var(--fog)',
                                textDecoration: 'none',
                              }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'var(--sky-pale)'; (e.currentTarget as HTMLAnchorElement).style.color = 'var(--sky-deeper)'; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'var(--frost)'; (e.currentTarget as HTMLAnchorElement).style.color = 'var(--slate)'; }}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Google Cal
                            </a>
                          </div>
                        )}
                      </div>
                      <ProblemSetsBlock problemSets={s.problem_sets} />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
