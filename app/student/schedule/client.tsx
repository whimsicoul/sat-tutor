'use client';

import { useState, useMemo } from 'react';
import {
  startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isSameDay,
  format, addMonths, subMonths, parseISO,
} from 'date-fns';
import {
  ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock,
  Download, ExternalLink, Calendar, X, GraduationCap, Plus, Trash2, BookOpen,
  Check, Minus,
} from 'lucide-react';
import { toast } from 'sonner';
import { getGoogleCalendarUrl } from '@/lib/calendar';
import type { SessionRow, DailyPracticeDay, NextSession } from './page';

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
      const proposedTime = `${date}T${time}:00`;
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
        proposed_time: proposedTime,
        status: newSession.status ?? 'approved',
        created_at: newSession.created_at,
        tutor_name: newSession.tutor_name ?? '',
        series_id: null,
        series_end_date: null,
        recurrence_rule: null,
      });
      setDate(''); setTime('');
      toast.success('Session scheduled!');
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
        Pick a date and time to schedule a session with your tutor.
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


export default function StudentScheduleClient({
  sessions: initial,
  satDates,
  dailyPracticeDays = [],
  nextSession = null,
}: {
  sessions: SessionRow[];
  satDates: SatDate[];
  dailyPracticeDays?: DailyPracticeDay[];
  nextSession?: NextSession | null;
}) {
  const [sessions, setSessions] = useState(initial);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [sessionPopup, setSessionPopup] = useState<SessionRow | null>(null);
  const [deletingSession, setDeletingSession] = useState(false);
  const [dailyPracticePopupDay, setDailyPracticePopupDay] = useState<string | null>(null);

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

  const satDatesByDay = useMemo(() => {
    const set = new Set<string>();
    for (const d of satDates) set.add(d.test_date);
    return set;
  }, [satDates]);

  const dailyPracticeByDay = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const b of dailyPracticeDays) map[b.date] = b.completed;
    return map;
  }, [dailyPracticeDays]);

  async function handleDeleteSession(id: string) {
    setDeletingSession(true);
    try {
      const res = await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      setSessions((prev) => prev.filter((s) => s.id !== id));
      setSessionPopup(null);
      toast.success('Session deleted.');
    } catch {
      toast.error('Failed to delete session.');
    } finally {
      setDeletingSession(false);
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

      {/* Next session bar */}
      {nextSession ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 18px',
            borderRadius: 10,
            background: 'rgba(168,203,222,0.1)',
            border: '1px solid rgba(168,203,222,0.3)',
          }}
        >
          <Calendar size={15} style={{ color: 'var(--sky-deeper)', flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: 13 }}>
            <span style={{ fontWeight: 600, color: 'var(--charcoal)' }}>Next Session</span>
            <span style={{ color: 'var(--slate)', marginLeft: 8 }}>
              with {nextSession.tutor_name} · {format(parseISO(nextSession.proposed_time), "EEEE, MMMM d 'at' h:mm a")}
            </span>
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              padding: '3px 10px',
              borderRadius: 20,
              flexShrink: 0,
              color: nextSession.status === 'approved'
                ? 'var(--sky-deeper)'
                : nextSession.status === 'denied'
                ? '#991B1B'
                : 'var(--rose-deeper)',
              background: nextSession.status === 'approved'
                ? 'rgba(168,203,222,0.2)'
                : nextSession.status === 'denied'
                ? '#FEF2F2'
                : 'rgba(224,166,175,0.2)',
            }}
          >
            {nextSession.status}
          </span>
        </div>
      ) : null}

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
            const hasSat = satDatesByDay.has(key);
            const inMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, new Date());
            const hasDailyPractice = key in dailyPracticeByDay;
            const dailyPracticeComplete = hasDailyPractice && dailyPracticeByDay[key];

            return (
              <div
                key={key}
                style={{
                  minHeight: 108,
                  padding: '6px 8px',
                  borderRight: '1px solid var(--fog)',
                  borderBottom: '1px solid var(--fog)',
                  background: 'transparent',
                  transition: 'background 0.1s',
                  opacity: inMonth ? 1 : 0.35,
                }}
              >
                <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginBottom: 4 }}>
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
                    }}
                  >
                    {format(day, 'd')}
                  </span>
                  {dailyPracticeComplete && (
                    <div style={{
                      position: 'absolute', top: -3, right: -9,
                      width: 13, height: 13, borderRadius: '50%',
                      background: '#16a34a',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '1.5px solid white',
                    }}>
                      <Check size={8} color="white" strokeWidth={3} />
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {daySess.slice(0, 2).map((s) => (
                    <div
                      key={s.id}
                      onClick={(e) => { e.stopPropagation(); setSessionPopup(s); }}
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
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = '0.75'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = '1'; }}
                    >
                      {format(parseISO(s.proposed_time), 'h:mm a')}
                    </div>
                  ))}
                  {daySess.length > 2 && (
                    <span style={{ fontSize: 9, color: 'var(--mist)', paddingLeft: 5 }}>+{daySess.length - 2} more</span>
                  )}
                  {hasSat && (
                    <div
                      style={{
                        fontSize: 10,
                        lineHeight: 1.3,
                        padding: '1px 5px',
                        borderRadius: 4,
                        background: 'rgba(168,95,106,0.15)',
                        color: 'var(--rose-deeper)',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      SAT
                    </div>
                  )}
                  {hasDailyPractice && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setDailyPracticePopupDay(key);
                      }}
                      style={{
                        fontSize: 10,
                        lineHeight: 1.3,
                        padding: '2px 5px',
                        borderRadius: 4,
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 3,
                        background: dailyPracticeComplete ? 'rgba(74,222,128,0.15)' : 'rgba(251,191,36,0.12)',
                        color: dailyPracticeComplete ? '#15803d' : '#92400e',
                        border: `1px solid ${dailyPracticeComplete ? 'rgba(74,222,128,0.35)' : 'rgba(251,191,36,0.35)'}`,
                        whiteSpace: 'nowrap',
                        userSelect: 'none',
                      }}
                    >
                      <span>☀️</span>
                      {dailyPracticeComplete ? '☀️ Daily Practice ✓' : '☀️ Daily Practice'}
                    </div>
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

      {/* Daily Practice popup */}
      {dailyPracticePopupDay && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={() => setDailyPracticePopupDay(null)}
        >
          <div
            className="portal-card"
            style={{ maxWidth: 340, width: '90%', padding: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>☀️</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--charcoal)' }}>☀️ Daily Practice</span>
              </div>
              <button onClick={() => setDailyPracticePopupDay(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mist)' }}>
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: 13, color: 'var(--slate)', marginBottom: 12 }}>
              {format(parseISO(dailyPracticePopupDay), 'EEEE, MMMM d, yyyy')}
            </p>

            {dailyPracticeByDay[dailyPracticePopupDay] ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#15803d', fontSize: 13, marginBottom: 20 }}>
                <CheckCircle size={14} />
                <span>All problems completed for this day!</span>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--mist)', marginBottom: 20 }}>
                Your daily practice problems are ready.
              </p>
            )}

            <a
              href="/student/daily-practice"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: 'rgba(168,203,222,0.4)', color: 'var(--sky-deeper)',
                border: '1px solid rgba(168,203,222,0.4)', textDecoration: 'none',
              }}
            >
              Go to Daily Practice
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      )}

      {/* Session popup */}
      {sessionPopup && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={() => setSessionPopup(null)}
        >
          <div
            className="portal-card"
            style={{ maxWidth: 400, width: '92%', padding: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={16} style={{ color: 'var(--sky-deeper)' }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--charcoal)' }}>Tutoring Session</span>
              </div>
              <button onClick={() => setSessionPopup(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mist)' }}>
                <X size={16} />
              </button>
            </div>

            {/* Date / tutor / recurrence */}
            <p style={{ fontSize: 13, color: 'var(--slate)', marginBottom: 4 }}>
              {sessionPopup.status === 'approved' && sessionPopup.series_id
                ? `${rruleLabel(sessionPopup.recurrence_rule)} · with ${sessionPopup.tutor_name}`
                : `with ${sessionPopup.tutor_name} · ${format(parseISO(sessionPopup.proposed_time), "EEEE, MMMM d 'at' h:mm a")}`}
            </p>
            {sessionPopup.status === 'approved' && sessionPopup.series_id && sessionPopup.series_end_date && (
              <p style={{ fontSize: 12, color: 'var(--mist)', marginBottom: 4 }}>
                Until {format(new Date(sessionPopup.series_end_date), 'MMM d, yyyy')}
              </p>
            )}

            {/* Status badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 20 }}>
              {sessionPopup.status === 'pending' && <Clock size={12} style={{ color: 'var(--sky-deeper)' }} />}
              {sessionPopup.status === 'approved' && <CheckCircle size={12} style={{ color: '#16a34a' }} />}
              {sessionPopup.status === 'denied' && <XCircle size={12} style={{ color: 'var(--cloud)' }} />}
              <span style={{ fontSize: 12, color: 'var(--mist)', textTransform: 'capitalize' }}>{sessionPopup.status}</span>
            </div>

            {/* Worksheet section */}
            <div style={{ borderTop: '1px solid var(--fog)', paddingTop: 16, marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--mist)', marginBottom: 10 }}>
                Worksheet
              </p>
              {sessionPopup.worksheet ? (
                <>
                  {/* Completion status */}
                  {sessionPopup.worksheetStatus === 'completed' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#15803d', fontSize: 13, marginBottom: 12 }}>
                      <CheckCircle size={14} />
                      <span>Worksheet completed!</span>
                    </div>
                  ) : sessionPopup.worksheetStatus === 'started' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 12, color: 'var(--sky-deeper)' }}>
                      <Minus size={14} />
                      <span>In progress — keep going!</span>
                    </div>
                  ) : (
                    <p style={{ fontSize: 13, color: 'var(--mist)', marginBottom: 12 }}>
                      Your worksheet is ready for this session.
                    </p>
                  )}
                  <a
                    href={`/student/worksheets/${sessionPopup.worksheet.id}`}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      background: 'rgba(168,203,222,0.4)', color: 'var(--sky-deeper)',
                      border: '1px solid rgba(168,203,222,0.4)', textDecoration: 'none',
                    }}
                  >
                    <BookOpen size={13} />
                    Go to Worksheet
                    <ExternalLink size={12} />
                  </a>
                </>
              ) : (
                <p style={{ fontSize: 13, color: 'var(--mist)' }}>
                  Come back later to see the worksheet for this session.
                </p>
              )}
            </div>

            {/* Calendar export + delete */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {sessionPopup.status === 'approved' && (
                  <>
                    <button
                      onClick={() => downloadICS(sessionPopup.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '5px 10px', borderRadius: 7, fontSize: 12, fontWeight: 500,
                        background: 'var(--frost)', color: 'var(--slate)', border: '1px solid var(--fog)', cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--rose-ultra)'; e.currentTarget.style.color = 'var(--rose-deeper)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--frost)'; e.currentTarget.style.color = 'var(--slate)'; }}
                    >
                      <Download size={12} /> .ics
                    </button>
                    <a
                      href={getGoogleCalendarUrl({
                        title: 'SAT Tutoring Session',
                        start: parseISO(sessionPopup.proposed_time),
                        durationMinutes: 60,
                      })}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '5px 10px', borderRadius: 7, fontSize: 12, fontWeight: 500,
                        background: 'var(--frost)', color: 'var(--slate)', border: '1px solid var(--fog)', textDecoration: 'none',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'var(--rose-ultra)'; (e.currentTarget as HTMLAnchorElement).style.color = 'var(--rose-deeper)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'var(--frost)'; (e.currentTarget as HTMLAnchorElement).style.color = 'var(--slate)'; }}
                    >
                      <ExternalLink size={12} /> Google Cal
                    </a>
                  </>
                )}
              </div>
              <button
                onClick={() => handleDeleteSession(sessionPopup.id)}
                disabled={deletingSession}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '5px 10px', borderRadius: 7, fontSize: 12, fontWeight: 500,
                  background: 'rgba(239,68,68,0.08)', color: '#EF4444',
                  border: '1px solid rgba(239,68,68,0.2)', cursor: deletingSession ? 'not-allowed' : 'pointer',
                  opacity: deletingSession ? 0.6 : 1,
                }}
              >
                <Trash2 size={12} />
                {deletingSession ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
