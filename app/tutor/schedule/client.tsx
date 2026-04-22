'use client';

import { useState, useMemo } from 'react';
import {
  startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isSameDay,
  format, addMonths, subMonths, parseISO,
} from 'date-fns';
import {
  ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock,
  Download, ExternalLink, Send, FileText, X, Edit2, Save, Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { getGoogleCalendarUrl } from '@/lib/calendar';
import type { TutorSessionRow, TutorProblemSet, StudentOption, TutorAllProblemSet } from './page';

// ── helpers ────────────────────────────────────────────────────────────────

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

function skyFocus(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = 'var(--sky)';
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(168,203,222,0.15)';
}
function skyBlur(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = 'var(--fog)';
  e.currentTarget.style.boxShadow = 'none';
}

// Generate 15-minute time slot options (96 per day)
const TIME_SLOTS: { label: string; value: string }[] = (() => {
  const slots = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hh = h % 12 === 0 ? 12 : h % 12;
      const mm = m.toString().padStart(2, '0');
      const ampm = h < 12 ? 'AM' : 'PM';
      const value = `${h.toString().padStart(2, '0')}:${mm}`;
      slots.push({ label: `${hh}:${mm} ${ampm}`, value });
    }
  }
  return slots;
})();

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_ABBR = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

// ── ProblemSetsBlock ────────────────────────────────────────────────────────

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

// ── Main component ──────────────────────────────────────────────────────────

export default function TutorScheduleClient({
  sessions: initial,
  students,
  allProblemSets,
}: {
  sessions: TutorSessionRow[];
  students: StudentOption[];
  allProblemSets: TutorAllProblemSet[];
}) {
  const [sessions, setSessions] = useState(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initial.map((s: any) => ({ ...s, proposed_time: s.proposed_time instanceof Date ? s.proposed_time.toISOString() : s.proposed_time }))
  );
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedSession, setSelectedSession] = useState<TutorSessionRow | null>(null);

  // Propose modal
  const [showPropose, setShowPropose] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [proposing, setProposing] = useState(false);

  // Recurring
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurType, setRecurType] = useState<'weekly' | 'custom'>('weekly');
  const [customDays, setCustomDays] = useState<number[]>([]);
  const [endDate, setEndDate] = useState('');

  // Problem set editing
  const [editingPs, setEditingPs] = useState(false);
  const [psSelection, setPsSelection] = useState<string[]>([]);
  const [savingPs, setSavingPs] = useState(false);

  // ── Calendar grid ──────────────────────────────────────────────────────

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const sessionsByDay = useMemo(() => {
    const map: Record<string, TutorSessionRow[]> = {};
    for (const s of sessions) {
      const key = format(parseISO(s.proposed_time), 'yyyy-MM-dd');
      if (!map[key]) map[key] = [];
      map[key].push(s);
    }
    return map;
  }, [sessions]);

  // ── Day selection ──────────────────────────────────────────────────────

  function handleDayClick(day: Date) {
    const key = format(day, 'yyyy-MM-dd');
    const daySessions = sessionsByDay[key] ?? [];
    if (daySessions.length === 0) return;
    setSelectedDay(day);
    setSelectedSession(daySessions[0]);
    setEditingPs(false);
  }

  function selectSession(s: TutorSessionRow) {
    setSelectedSession(s);
    setEditingPs(false);
  }

  function closePanel() {
    setSelectedDay(null);
    setSelectedSession(null);
    setEditingPs(false);
  }

  // ── Problem set editing ────────────────────────────────────────────────

  function startEditingPs(s: TutorSessionRow) {
    setPsSelection(s.problem_sets.map((p) => p.id));
    setEditingPs(true);
  }

  async function savePs() {
    if (!selectedSession) return;
    setSavingPs(true);
    try {
      const res = await fetch(`/api/sessions/${selectedSession.id}/problem-sets`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemSetIds: psSelection }),
      });
      if (!res.ok) throw new Error('Failed');

      // Update local state
      const updatedPs = allProblemSets
        .filter((p) => psSelection.includes(p.id))
        .map((p) => ({ id: p.id, title: p.title, problem_pdf_url: p.problem_pdf_url, answer_pdf_url: p.answer_pdf_url }));

      setSessions((prev) =>
        prev.map((s) => s.id === selectedSession.id ? { ...s, problem_sets: updatedPs } : s)
      );
      setSelectedSession((prev) => prev ? { ...prev, problem_sets: updatedPs } : prev);
      setEditingPs(false);
      toast.success('Problem sets updated.');
    } catch {
      toast.error('Failed to update problem sets.');
    } finally {
      setSavingPs(false);
    }
  }

  // ── Propose session ────────────────────────────────────────────────────

  async function handlePropose(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId || !date || !time) { toast.error('Please fill all fields.'); return; }
    setProposing(true);
    try {
      const proposedTime = new Date(`${date}T${time}`).toISOString();

      if (isRecurring) {
        const days = recurType === 'weekly'
          ? [new Date(`${date}T${time}`).getDay()]
          : customDays;

        if (days.length === 0) { toast.error('Select at least one day.'); setProposing(false); return; }

        const byday = days.map((d) => DAY_ABBR[d]).join(',');
        const [h, m] = time.split(':');
        const recurrenceRule = `FREQ=WEEKLY;BYDAY=${byday};BYHOUR=${h};BYMINUTE=${m}`;

        const res = await fetch('/api/sessions/recurring', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId, startDate: date, time, recurrenceRule, endDate: endDate || null }),
        });
        if (!res.ok) throw new Error('Failed');
        const newSessions = await res.json();
        const student = students.find((s) => s.id === studentId);
        setSessions((prev) => [
          ...newSessions.map((s: TutorSessionRow) => ({ ...s, student_name: student?.name ?? '', problem_sets: [] })),
          ...prev,
        ]);
        toast.success(`${newSessions.length} recurring sessions proposed!`);
      } else {
        const res = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId, proposedTime }),
        });
        if (!res.ok) throw new Error('Failed');
        const newSession = await res.json();
        const student = students.find((s) => s.id === studentId);
        setSessions((prev) => [{ ...newSession, student_name: student?.name ?? '', problem_sets: [] }, ...prev]);
        toast.success('Session proposed! The student has been notified.');
      }

      setStudentId(''); setDate(''); setTime('09:00');
      setIsRecurring(false); setRecurType('weekly'); setCustomDays([]); setEndDate('');
      setShowPropose(false);
    } catch {
      toast.error('Failed to propose session.');
    } finally {
      setProposing(false);
    }
  }

  // ── ICS download ───────────────────────────────────────────────────────

  async function downloadICS(id: string) {
    const res = await fetch(`/api/sessions/${id}/ics`);
    if (!res.ok) { toast.error('Failed to generate calendar file.'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'session.ics'; a.click();
    URL.revokeObjectURL(url);
  }

  // ── Filtered sessions for selected day ────────────────────────────────

  const daySessions = selectedDay
    ? (sessionsByDay[format(selectedDay, 'yyyy-MM-dd')] ?? [])
    : [];

  // ── Relevant problem sets for selected session (same student) ──────────
  const relevantPs = selectedSession
    ? allProblemSets.filter((p) => p.student_id === selectedSession.student_id)
    : [];

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="eyebrow-sky mb-3">Tutor Portal</div>
          <h1 className="portal-section-title">Schedule</h1>
          <p className="text-sm mt-2" style={{ color: 'var(--slate)' }}>
            View your sessions and manage problem set assignments.
          </p>
        </div>
        <button
          onClick={() => setShowPropose(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ background: 'var(--sky)', color: 'var(--charcoal)', border: 'none', cursor: 'pointer' }}
        >
          <Plus className="h-4 w-4" />
          Propose Session
        </button>
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
                  background: isSelected ? 'rgba(168,203,222,0.12)' : 'transparent',
                  cursor: daySess.length > 0 ? 'pointer' : 'default',
                  transition: 'background 0.1s',
                  opacity: inMonth ? 1 : 0.35,
                }}
                onMouseEnter={(e) => { if (daySess.length > 0) (e.currentTarget as HTMLDivElement).style.background = isSelected ? 'rgba(168,203,222,0.18)' : 'rgba(168,203,222,0.06)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = isSelected ? 'rgba(168,203,222,0.12)' : 'transparent'; }}
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
                    background: isToday ? 'var(--sky-deeper)' : 'transparent',
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
                      {format(parseISO(s.proposed_time), 'h:mm a')} {s.student_name.split(' ')[0]}
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

      {/* Day detail panel */}
      {selectedDay && (
        <div className="portal-card-sky p-6">
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
                    onClick={() => selectSession(s)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: selectedSession?.id === s.id ? 600 : 400,
                      background: selectedSession?.id === s.id ? 'var(--sky)' : 'var(--frost)',
                      color: selectedSession?.id === s.id ? 'var(--charcoal)' : 'var(--slate)',
                      border: '1px solid var(--fog)',
                      cursor: 'pointer',
                    }}
                  >
                    {s.status === 'approved' && s.series_id
                      ? `Recurring · ${s.student_name.split(' ')[0]}`
                      : `${format(parseISO(s.proposed_time), 'h:mm a')} · ${s.student_name.split(' ')[0]}`}
                  </button>
                ))}
              </div>
            );
          })()}

          {selectedSession && (
            <div>
              {/* Session info */}
              <div className="flex items-center gap-4 flex-wrap mb-4">
                <div className="flex-1">
                  {selectedSession.status === 'approved' && selectedSession.series_id ? (
                    <p className="text-sm font-semibold" style={{ color: 'var(--charcoal)' }}>
                      Approved {rruleLabel(selectedSession.recurrence_rule)} session with {selectedSession.student_name}
                      {selectedSession.series_end_date
                        ? ` until ${format(new Date(selectedSession.series_end_date), 'MMM d, yyyy')}`
                        : ''}
                    </p>
                  ) : (
                    <p className="text-sm font-semibold" style={{ color: 'var(--charcoal)' }}>
                      {format(parseISO(selectedSession.proposed_time), 'h:mm a')} · {selectedSession.student_name}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 mt-1">
                    {selectedSession.status === 'pending' && <Clock size={12} style={{ color: 'var(--sky-deeper)' }} />}
                    {selectedSession.status === 'approved' && <CheckCircle size={12} style={{ color: '#16a34a' }} />}
                    {selectedSession.status === 'denied' && <XCircle size={12} style={{ color: 'var(--cloud)' }} />}
                    <span className="text-xs capitalize" style={{ color: 'var(--mist)' }}>{selectedSession.status}</span>
                  </div>
                </div>
                {selectedSession.status === 'approved' && (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => downloadICS(selectedSession.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: 'var(--frost)', color: 'var(--slate)', border: '1px solid var(--fog)', cursor: 'pointer' }}
                    >
                      <Download size={13} /> .ics
                    </button>
                    <a
                      href={getGoogleCalendarUrl({ title: 'SAT Tutoring Session', start: parseISO(selectedSession.proposed_time), durationMinutes: 60 })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: 'var(--frost)', color: 'var(--slate)', border: '1px solid var(--fog)', textDecoration: 'none' }}
                    >
                      <ExternalLink size={13} /> Google Cal
                    </a>
                  </div>
                )}
              </div>

              {/* Problem sets section */}
              {!editingPs ? (
                <div>
                  <ProblemSetsBlock problemSets={selectedSession.problem_sets} />
                  <button
                    onClick={() => startEditingPs(selectedSession)}
                    className="flex items-center gap-1.5 mt-3 text-xs font-semibold"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sky-deeper)' }}
                  >
                    <Edit2 size={12} />
                    {selectedSession.problem_sets.length === 0 ? 'Assign problem sets' : 'Edit problem sets'}
                  </button>
                </div>
              ) : (
                <div style={{ marginTop: 12 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--mist)', marginBottom: 8 }}>
                    Assign Problem Sets
                  </p>
                  {relevantPs.length === 0 ? (
                    <p className="text-xs" style={{ color: 'var(--mist)' }}>No problem sets found for this student.</p>
                  ) : (
                    <div className="space-y-2" style={{ maxHeight: 200, overflowY: 'auto' }}>
                      {relevantPs.map((ps) => (
                        <label
                          key={ps.id}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}
                        >
                          <input
                            type="checkbox"
                            checked={psSelection.includes(ps.id)}
                            onChange={(e) => {
                              setPsSelection((prev) =>
                                e.target.checked ? [...prev, ps.id] : prev.filter((id) => id !== ps.id)
                              );
                            }}
                          />
                          <span style={{ color: 'var(--charcoal)' }}>{ps.title}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={savePs}
                      disabled={savingPs}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: 'var(--sky)', color: 'var(--charcoal)', border: 'none', cursor: savingPs ? 'not-allowed' : 'pointer' }}
                    >
                      <Save size={12} /> {savingPs ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={() => setEditingPs(false)}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: 'var(--frost)', color: 'var(--slate)', border: '1px solid var(--fog)', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Propose session modal */}
      {showPropose && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowPropose(false); }}
        >
          <div
            className="portal-card-sky"
            style={{ width: '100%', maxWidth: 500, padding: 28, maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(168,203,222,0.2)', border: '1px solid rgba(168,203,222,0.3)' }}
                >
                  <Send className="h-3.5 w-3.5" style={{ color: 'var(--sky-deeper)' }} />
                </div>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--charcoal)' }}>
                  Propose a Session
                </h2>
              </div>
              <button onClick={() => setShowPropose(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mist)' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handlePropose} className="space-y-4">
              {/* Student */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--mist)' }}>Student</label>
                <select
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  required
                  style={{ ...inputStyle, appearance: 'none' as const }}
                  onFocus={skyFocus}
                  onBlur={skyBlur}
                >
                  <option value="">Select a student</option>
                  {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {/* Date + Time */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--mist)' }}>Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    style={inputStyle}
                    onFocus={skyFocus}
                    onBlur={skyBlur}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--mist)' }}>Time</label>
                  <select
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                    style={{ ...inputStyle, appearance: 'none' as const }}
                    onFocus={skyFocus}
                    onBlur={skyBlur}
                  >
                    {TIME_SLOTS.map((slot) => (
                      <option key={slot.value} value={slot.value}>{slot.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Recurring toggle */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--charcoal)' }}>
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                  />
                  <span className="font-medium">Recurring session</span>
                </label>
              </div>

              {/* Recurring options */}
              {isRecurring && (
                <div className="space-y-3" style={{ paddingLeft: 0 }}>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--mist)' }}>Repeat</label>
                    <div className="flex gap-3">
                      {(['weekly', 'custom'] as const).map((t) => (
                        <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: 'var(--charcoal)' }}>
                          <input
                            type="radio"
                            name="recurType"
                            value={t}
                            checked={recurType === t}
                            onChange={() => setRecurType(t)}
                          />
                          {t === 'weekly' ? 'Weekly (same day)' : 'Custom days'}
                        </label>
                      ))}
                    </div>
                  </div>

                  {recurType === 'custom' && (
                    <div>
                      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--mist)' }}>Days</label>
                      <div className="flex gap-2 flex-wrap">
                        {WEEKDAYS.map((d, i) => (
                          <label
                            key={d}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
                              padding: '4px 10px', borderRadius: 20, fontSize: 12,
                              background: customDays.includes(i) ? 'var(--sky)' : 'var(--frost)',
                              border: '1px solid var(--fog)',
                              color: customDays.includes(i) ? 'var(--charcoal)' : 'var(--slate)',
                              fontWeight: customDays.includes(i) ? 600 : 400,
                            }}
                          >
                            <input
                              type="checkbox"
                              style={{ display: 'none' }}
                              checked={customDays.includes(i)}
                              onChange={(e) => {
                                setCustomDays((prev) =>
                                  e.target.checked ? [...prev, i] : prev.filter((x) => x !== i)
                                );
                              }}
                            />
                            {d}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--mist)' }}>End Date <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      style={inputStyle}
                      onFocus={skyFocus}
                      onBlur={skyBlur}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={proposing}
                className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: proposing ? 'var(--fog)' : 'var(--sky)',
                  color: proposing ? 'var(--mist)' : 'var(--charcoal)',
                  border: 'none',
                  cursor: proposing ? 'not-allowed' : 'pointer',
                }}
              >
                <Send className="h-4 w-4" />
                {proposing ? 'Proposing…' : isRecurring ? 'Propose Recurring Sessions' : 'Propose Session'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
