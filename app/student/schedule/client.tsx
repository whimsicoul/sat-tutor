'use client';

import { useState, useMemo } from 'react';
import {
  startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isSameDay,
  format, addMonths, subMonths, parseISO,
} from 'date-fns';
import {
  ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock,
  Download, ExternalLink, Calendar, FileText, X, GraduationCap, Plus, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { getGoogleCalendarUrl } from '@/lib/calendar';
import type { SessionRow, SessionProblemSet } from './page';

interface SatDate {
  id: string;
  test_date: string;
  created_at: string;
}

function MeetingRequestForm({ onRequested }: { onRequested: (session: SessionRow) => void }) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !time) return;
    setSubmitting(true);
    try {
      const proposedTime = new Date(`${date}T${time}`).toISOString();
      const res = await fetch('/api/student/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposedTime }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? 'Failed to submit request.');
        return;
      }
      const newSession = await res.json();
      onRequested({
        id: newSession.id,
        proposed_time: newSession.proposed_time,
        status: 'pending',
        created_at: newSession.created_at,
        tutor_name: newSession.tutor_name ?? '',
        problem_sets: [],
        series_id: null,
        series_end_date: null,
        recurrence_rule: null,
      });
      setDate(''); setTime('');
      toast.success('Meeting request submitted! Your tutor will review it.');
    } catch {
      toast.error('Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="portal-card p-6" style={{ borderLeft: '3px solid var(--sky)' }}>
      <div className="flex items-center gap-2 mb-4">
        <Calendar size={16} style={{ color: 'var(--sky-deeper)' }} />
        <h2 className="text-sm font-semibold" style={{ color: 'var(--charcoal)' }}>Request a Meeting</h2>
      </div>
      <p className="text-xs mb-4" style={{ color: 'var(--mist)' }}>
        Propose a date and time — your tutor and admin will be notified to approve.
      </p>
      <form onSubmit={handleSubmit} className="flex items-end gap-3 flex-wrap">
        <div style={{ flex: '1 1 160px', minWidth: 160 }}>
          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--mist)' }}>Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            style={{
              width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem',
              border: '1px solid var(--fog)', background: 'var(--white)', color: 'var(--charcoal)',
              fontFamily: "'Syne', sans-serif", outline: 'none',
            }}
          />
        </div>
        <div style={{ flex: '1 1 140px', minWidth: 140 }}>
          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--mist)' }}>Time</label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
            style={{
              width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem',
              border: '1px solid var(--fog)', background: 'var(--white)', color: 'var(--charcoal)',
              fontFamily: "'Syne', sans-serif", outline: 'none',
            }}
          />
        </div>
        <button
          type="submit"
          disabled={submitting || !date || !time}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold"
          style={{
            background: submitting || !date || !time ? 'var(--fog)' : 'rgba(168,203,222,0.5)',
            color: submitting || !date || !time ? 'var(--mist)' : 'var(--sky-deeper)',
            border: '1px solid rgba(168,203,222,0.4)',
            cursor: submitting || !date || !time ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <Plus size={14} />
          {submitting ? 'Requesting…' : 'Request Meeting'}
        </button>
      </form>
    </div>
  );
}

function SatDatesSection({ initialDates }: { initialDates: SatDate[] }) {
  const [dates, setDates] = useState(initialDates);
  const [newDate, setNewDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newDate) return;
    setSaving(true);
    try {
      const res = await fetch('/api/student/sat-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testDate: newDate }),
      });
      if (!res.ok) throw new Error('Failed');
      const row: SatDate = await res.json();
      setDates((prev) => [...prev, row].sort((a, b) => a.test_date.localeCompare(b.test_date)));
      setNewDate('');
      toast.success('SAT date added.');
    } catch {
      toast.error('Failed to add SAT date.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/student/sat-dates/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      setDates((prev) => prev.filter((d) => d.id !== id));
      toast.success('SAT date removed.');
    } catch {
      toast.error('Failed to remove SAT date.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="portal-card p-6" style={{ borderLeft: '3px solid var(--rose)' }}>
      <div className="flex items-center gap-2 mb-4">
        <GraduationCap size={16} style={{ color: 'var(--rose-deeper)' }} />
        <h2 className="text-sm font-semibold" style={{ color: 'var(--charcoal)' }}>Official SAT Test Dates</h2>
      </div>

      {dates.length === 0 && (
        <p className="text-xs mb-4" style={{ color: 'var(--mist)' }}>No SAT dates added yet. Add your exam date below.</p>
      )}

      {dates.length > 0 && (
        <div className="flex flex-col gap-2 mb-4">
          {dates.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between rounded-lg px-4 py-2"
              style={{ background: 'var(--rose-ultra)', border: '1px solid rgba(224,166,175,0.3)' }}
            >
              <span className="text-sm font-semibold" style={{ color: 'var(--rose-deeper)' }}>
                {format(new Date(d.test_date + 'T12:00:00'), 'MMMM d, yyyy')}
              </span>
              <button
                onClick={() => handleDelete(d.id)}
                disabled={deletingId === d.id}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mist)', padding: 4, borderRadius: 6, opacity: deletingId === d.id ? 0.5 : 1 }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--rose-deeper)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--mist)'; }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleAdd} className="flex items-center gap-2">
        <input
          type="date"
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
          required
          style={{
            flex: 1, padding: '0.5rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem',
            border: '1px solid var(--fog)', background: 'var(--white)', color: 'var(--charcoal)',
            fontFamily: "'Syne', sans-serif", outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={saving || !newDate}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold"
          style={{
            background: saving || !newDate ? 'var(--fog)' : 'var(--rose)',
            color: saving || !newDate ? 'var(--mist)' : 'var(--charcoal)',
            border: 'none', cursor: saving || !newDate ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
          }}
        >
          <Plus size={14} />
          Add Date
        </button>
      </form>
    </div>
  );
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'var(--sky)',
  approved: '#4ade80',
  denied: 'var(--cloud)',
};

function rruleLabel(rule: string | null | undefined): string {
  if (!rule) return 'recurring';
  if (/FREQ=WEEKLY.*INTERVAL=2/.test(rule) || /INTERVAL=2.*FREQ=WEEKLY/.test(rule)) return 'biweekly';
  if (/FREQ=WEEKLY/.test(rule)) return 'weekly';
  if (/FREQ=MONTHLY/.test(rule)) return 'monthly';
  return 'recurring';
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function ProblemSetsBlock({ problemSets }: { problemSets: SessionProblemSet[] }) {
  if (problemSets.length === 0) return null;
  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--fog)' }}>
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--mist)', marginBottom: 6 }}>
        Problem Sheets
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {problemSets.map((ps) => (
          <a
            key={ps.id}
            href={ps.problem_pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12,
              color: 'var(--sky-deeper)', textDecoration: 'none',
              background: 'rgba(168,203,222,0.10)', border: '1px solid rgba(168,203,222,0.25)',
              borderRadius: 6, padding: '3px 10px', width: 'fit-content',
            }}
          >
            <FileText size={12} />
            {ps.title}
            <ExternalLink size={10} />
          </a>
        ))}
      </div>
    </div>
  );
}

export default function StudentScheduleClient({
  sessions: initial,
  satDates,
}: {
  sessions: SessionRow[];
  satDates: SatDate[];
}) {
  const [sessions, setSessions] = useState(initial);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedSession, setSelectedSession] = useState<SessionRow | null>(null);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const sessionsByDay = useMemo(() => {
    const map: Record<string, SessionRow[]> = {};
    for (const s of sessions) {
      const key = format(parseISO(s.proposed_time), 'yyyy-MM-dd');
      if (!map[key]) map[key] = [];
      map[key].push(s);
    }
    return map;
  }, [sessions]);

  function handleDayClick(day: Date) {
    const key = format(day, 'yyyy-MM-dd');
    const daySess = sessionsByDay[key] ?? [];
    if (daySess.length === 0) return;
    setSelectedDay(day);
    setSelectedSession(daySess[0]);
  }

  function closePanel() {
    setSelectedDay(null);
    setSelectedSession(null);
  }

  const daySessions = selectedDay
    ? (sessionsByDay[format(selectedDay, 'yyyy-MM-dd')] ?? [])
    : [];

  async function updateStatus(id: string, status: 'approved' | 'denied') {
    const res = await fetch(`/api/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) { toast.error('Failed to update session status.'); return; }
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
    if (selectedSession?.id === id) {
      setSelectedSession((prev) => prev ? { ...prev, status } : prev);
    }
    toast.success(status === 'approved' ? 'Session approved!' : 'Session declined.');
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="eyebrow-rose mb-3">Student Portal</div>
        <h1 className="portal-section-title">Schedule</h1>
        <p className="text-sm mt-2" style={{ color: 'var(--slate)' }}>
          View your upcoming tutoring sessions and attached materials.
        </p>
      </div>

      {/* Calendar */}
      <div className="portal-card p-0 overflow-hidden">
        {/* Month navigation */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--fog)' }}
        >
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)', padding: 4, borderRadius: 6 }}
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-semibold" style={{ color: 'var(--charcoal)' }}>
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)', padding: 4, borderRadius: 6 }}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Weekday headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--fog)' }}>
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              style={{
                padding: '8px 0',
                textAlign: 'center',
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--mist)',
              }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {calendarDays.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const daySess = sessionsByDay[key] ?? [];
            const inMonth = isSameMonth(day, currentMonth);
            const isSelected = selectedDay && isSameDay(day, selectedDay);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={key}
                onClick={() => handleDayClick(day)}
                style={{
                  minHeight: 72,
                  padding: '6px 8px',
                  borderRight: '1px solid var(--fog)',
                  borderBottom: '1px solid var(--fog)',
                  background: isSelected ? 'rgba(224,166,175,0.12)' : 'transparent',
                  cursor: daySess.length > 0 ? 'pointer' : 'default',
                  transition: 'background 0.1s',
                  opacity: inMonth ? 1 : 0.35,
                }}
                onMouseEnter={(e) => { if (daySess.length > 0) (e.currentTarget as HTMLDivElement).style.background = isSelected ? 'rgba(224,166,175,0.18)' : 'rgba(224,166,175,0.06)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = isSelected ? 'rgba(224,166,175,0.12)' : 'transparent'; }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    fontSize: 12,
                    fontWeight: isToday ? 700 : 400,
                    color: isToday ? 'var(--white)' : inMonth ? 'var(--charcoal)' : 'var(--cloud)',
                    background: isToday ? 'var(--rose-deeper)' : 'transparent',
                    marginBottom: 4,
                  }}
                >
                  {format(day, 'd')}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {daySess.slice(0, 3).map((s) => (
                    <div
                      key={s.id}
                      style={{
                        fontSize: 10,
                        lineHeight: 1.3,
                        padding: '1px 5px',
                        borderRadius: 4,
                        background: STATUS_COLOR[s.status] + '22',
                        color: s.status === 'approved' ? '#15803d' : s.status === 'denied' ? 'var(--slate)' : 'var(--sky-deeper)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {format(parseISO(s.proposed_time), 'h:mm a')}
                    </div>
                  ))}
                  {daySess.length > 3 && (
                    <span style={{ fontSize: 9, color: 'var(--mist)', paddingLeft: 5 }}>+{daySess.length - 3} more</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Empty state — no sessions at all */}
      {sessions.length === 0 && (
        <div className="portal-card flex flex-col items-center justify-center py-16 text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'var(--rose-ultra)', border: '1px solid rgba(224,166,175,0.25)' }}
          >
            <Calendar className="h-6 w-6" style={{ color: 'var(--rose-deeper)' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--charcoal)' }}>
            No sessions scheduled yet
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--mist)' }}>
            Your tutor will propose sessions here, or you can request one below.
          </p>
        </div>
      )}

      {/* Meeting Request Form */}
      <MeetingRequestForm onRequested={(newSession) => setSessions((prev) => [newSession, ...prev])} />

      {/* SAT Test Dates */}
      <SatDatesSection initialDates={satDates} />

      {/* Day detail panel */}
      {selectedDay && (
        <div className="portal-card p-6" style={{ borderLeft: '3px solid var(--rose)' }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--charcoal)' }}>
              {format(selectedDay, 'EEEE, MMMM d, yyyy')}
              <span className="ml-2 text-xs font-normal" style={{ color: 'var(--mist)' }}>
                {daySessions.length} session{daySessions.length !== 1 ? 's' : ''}
              </span>
            </h2>
            <button
              onClick={closePanel}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mist)' }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Session tabs if multiple — collapse approved recurring series into one tab */}
          {(() => {
            const seenSeries = new Set<string>();
            const displaySessions = daySessions.filter((s) => {
              if (s.status === 'approved' && s.series_id) {
                if (seenSeries.has(s.series_id)) return false;
                seenSeries.add(s.series_id);
              }
              return true;
            });
            return displaySessions.length > 1 && (
              <div className="flex gap-2 mb-4 flex-wrap">
                {displaySessions.map((s) => (
                  <button
                    key={s.series_id && s.status === 'approved' ? `series-${s.series_id}` : s.id}
                    onClick={() => setSelectedSession(s)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: selectedSession?.id === s.id ? 600 : 400,
                      background: selectedSession?.id === s.id ? 'var(--rose)' : 'var(--frost)',
                      color: selectedSession?.id === s.id ? 'var(--charcoal)' : 'var(--slate)',
                      border: '1px solid var(--fog)',
                      cursor: 'pointer',
                    }}
                  >
                    {s.status === 'approved' && s.series_id
                      ? `Recurring · ${format(parseISO(s.proposed_time), 'h:mm a')}`
                      : format(parseISO(s.proposed_time), 'h:mm a')}
                  </button>
                ))}
              </div>
            );
          })()}

          {selectedSession && (
            <div>
              {/* Session info */}
              <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                <div>
                  {selectedSession.status === 'approved' && selectedSession.series_id ? (
                    <p className="text-sm font-semibold" style={{ color: 'var(--charcoal)' }}>
                      Approved {rruleLabel(selectedSession.recurrence_rule)} session with {selectedSession.tutor_name}
                      {selectedSession.series_end_date
                        ? ` until ${format(new Date(selectedSession.series_end_date), 'MMM d, yyyy')}`
                        : ''}
                    </p>
                  ) : (
                    <p className="text-sm font-semibold" style={{ color: 'var(--charcoal)' }}>
                      {format(parseISO(selectedSession.proposed_time), 'h:mm a')} · with {selectedSession.tutor_name}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 mt-1">
                    {selectedSession.status === 'pending' && <Clock size={12} style={{ color: 'var(--sky-deeper)' }} />}
                    {selectedSession.status === 'approved' && <CheckCircle size={12} style={{ color: '#16a34a' }} />}
                    {selectedSession.status === 'denied' && <XCircle size={12} style={{ color: 'var(--cloud)' }} />}
                    <span className="text-xs capitalize" style={{ color: 'var(--mist)' }}>{selectedSession.status}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {selectedSession.status === 'pending' && (
                    <>
                      <button
                        onClick={() => updateStatus(selectedSession.id, 'approved')}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                        style={{
                          background: 'rgba(168,203,222,0.18)',
                          color: 'var(--sky-deeper)',
                          border: '1px solid rgba(168,203,222,0.4)',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(168,203,222,0.3)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(168,203,222,0.18)'; }}
                      >
                        <CheckCircle className="h-4 w-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => updateStatus(selectedSession.id, 'denied')}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                        style={{
                          background: 'transparent',
                          color: 'var(--rose-deeper)',
                          border: '1px solid rgba(224,166,175,0.4)',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--rose-ultra)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <XCircle className="h-4 w-4" />
                        Decline
                      </button>
                    </>
                  )}
                  {selectedSession.status === 'approved' && (
                    <>
                      <button
                        onClick={() => downloadICS(selectedSession.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={{
                          background: 'var(--frost)',
                          color: 'var(--slate)',
                          border: '1px solid var(--fog)',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--rose-ultra)'; e.currentTarget.style.color = 'var(--rose-deeper)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--frost)'; e.currentTarget.style.color = 'var(--slate)'; }}
                      >
                        <Download className="h-3.5 w-3.5" />
                        .ics
                      </button>
                      <a
                        href={getGoogleCalendarUrl({
                          title: 'SAT Tutoring Session',
                          start: parseISO(selectedSession.proposed_time),
                          durationMinutes: 60,
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={{
                          background: 'var(--frost)',
                          color: 'var(--slate)',
                          border: '1px solid var(--fog)',
                          textDecoration: 'none',
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'var(--rose-ultra)'; (e.currentTarget as HTMLAnchorElement).style.color = 'var(--rose-deeper)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'var(--frost)'; (e.currentTarget as HTMLAnchorElement).style.color = 'var(--slate)'; }}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Google Cal
                      </a>
                    </>
                  )}
                </div>
              </div>

              <ProblemSetsBlock problemSets={selectedSession.problem_sets} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
