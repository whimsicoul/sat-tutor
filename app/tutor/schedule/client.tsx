'use client';

import { useState } from 'react';
import { Calendar, CheckCircle, XCircle, Clock, Download, ExternalLink, Send } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { getGoogleCalendarUrl } from '@/lib/calendar';
import type { TutorSessionRow, StudentOption } from './page';

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  icon: Clock,        cls: 'status-pending'  },
  approved: { label: 'Approved', icon: CheckCircle,  cls: 'status-approved' },
  denied:   { label: 'Declined', icon: XCircle,      cls: 'status-denied'   },
};

const inputStyle = {
  width: '100%',
  padding: '0.625rem 0.875rem',
  borderRadius: '0.375rem',
  fontSize: '0.875rem',
  outline: 'none',
  background: '#FFFFFF',
  border: '1px solid #D5D9E1',
  color: '#1F1F1F',
  fontFamily: "'Syne', sans-serif",
  transition: 'border-color 0.15s',
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
        <div className="flex items-center gap-2 mb-1">
          <div className="h-px w-6" style={{ background: '#8BB5AE' }} />
          <span
            className="text-xs tracking-widest uppercase font-medium"
            style={{ color: '#8BB5AE', fontFamily: "'Syne', sans-serif" }}
          >
            Tutor Portal
          </span>
        </div>
        <h1 className="portal-section-title">Schedule</h1>
        <p className="text-sm mt-1" style={{ color: '#4A4F5A', fontFamily: "'Syne', sans-serif" }}>
          Propose sessions and track student responses.
        </p>
      </div>

      {/* Propose form */}
      <div className="portal-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <div
            className="w-7 h-7 rounded flex items-center justify-center"
            style={{ background: '#F0F2F5', border: '1px solid #D5D9E1' }}
          >
            <Send className="h-3.5 w-3.5" style={{ color: '#8BB5AE' }} />
          </div>
          <h2
            className="text-sm font-semibold"
            style={{ color: '#1F1F1F', fontFamily: "'Syne', sans-serif" }}
          >
            Propose a New Session
          </h2>
        </div>

        <form onSubmit={handlePropose} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#8A9099', fontFamily: "'Syne', sans-serif" }}>
                Student
              </label>
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
                style={{ ...inputStyle, appearance: 'none' as const }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#8BB5AE'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#D5D9E1'; }}
              >
                <option value="">Select a student</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#8A9099', fontFamily: "'Syne', sans-serif" }}>
                Date &amp; Time
              </label>
              <input
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                required
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#8BB5AE'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#D5D9E1'; }}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={proposing}
            className="flex items-center gap-2 px-5 py-2.5 rounded text-sm font-semibold transition-all"
            style={{
              background: proposing ? '#D5D9E1' : '#1F1F1F',
              color: proposing ? '#8A9099' : '#F0F2F5',
              border: 'none',
              cursor: proposing ? 'not-allowed' : 'pointer',
              fontFamily: "'Syne', sans-serif",
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
            className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
            style={{ background: '#F0F2F5', border: '1px solid #D5D9E1' }}
          >
            <Calendar className="h-6 w-6" style={{ color: '#8BB5AE' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: '#1F1F1F', fontFamily: "'Syne', sans-serif" }}>
            No sessions proposed yet
          </p>
          <p className="text-xs mt-1" style={{ color: '#8A9099', fontFamily: "'Syne', sans-serif" }}>
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
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.cls}`}
                    style={{ fontFamily: "'Syne', sans-serif" }}
                  >
                    <Icon className="h-3 w-3" />
                    {cfg.label}
                    <span className="ml-0.5 opacity-70">· {list.length}</span>
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
                      className="portal-card flex items-center gap-4 px-5 py-4 flex-wrap"
                      style={{
                        borderLeft: status === 'pending' ? '3px solid #8BB5AE' : undefined,
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-semibold"
                          style={{ color: '#1F1F1F', fontFamily: "'Syne', sans-serif" }}
                        >
                          {format(dt, 'EEEE, MMMM d, yyyy')}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: '#8A9099', fontFamily: "'Syne', sans-serif" }}>
                          {format(dt, 'h:mm a')} · {s.student_name}
                        </p>
                      </div>
                      {s.status === 'approved' && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => downloadICS(s.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium"
                            style={{
                              background: '#F0F2F5',
                              color: '#1F1F1F',
                              border: '1px solid #D5D9E1',
                              cursor: 'pointer',
                              fontFamily: "'Syne', sans-serif",
                            }}
                          >
                            <Download className="h-3.5 w-3.5" />
                            .ics
                          </button>
                          <a
                            href={gcUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium"
                            style={{
                              background: '#F0F2F5',
                              color: '#1F1F1F',
                              border: '1px solid #D5D9E1',
                              textDecoration: 'none',
                              fontFamily: "'Syne', sans-serif",
                            }}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Google Cal
                          </a>
                        </div>
                      )}
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
