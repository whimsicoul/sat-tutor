'use client';

import { useState, useMemo, useEffect } from 'react';
import { Calendar, dateFnsLocalizer, Views, type View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { toast } from 'sonner';
import { Plus, Trash2, BookOpen } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { AdminSession, UserOption, AdminSatDate } from './page';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales: { 'en-US': enUS },
});

// Distinct colors per tutor — rose/sky alternating palette
const TUTOR_COLORS = [
  '#A8CBDE', '#E0A6AF', '#7AAEC7', '#C8838E', '#5B9DB8',
  '#D4858F', '#6BBAD6', '#E8B0BA', '#4D8FAE', '#C87F8A',
];

function getTutorColor(tutorId: string, tutorIds: string[]) {
  const idx = tutorIds.indexOf(tutorId);
  return TUTOR_COLORS[idx % TUTOR_COLORS.length];
}

interface CalEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource?: AdminSession;
  color: string;
  type: 'session' | 'sat';
}

function EventComponent({ event }: { event: CalEvent }) {
  const [showTip, setShowTip] = useState(false);

  if (event.type === 'sat') {
    return (
      <div style={{ fontSize: 11, padding: '1px 4px', fontWeight: 600, cursor: 'pointer' }}>
        🗓 SAT — {event.title}
      </div>
    );
  }

  const s = event.resource!;
  const statusColor =
    s.status === 'approved' ? 'var(--sky-deeper)' :
    s.status === 'denied'   ? '#EF4444' : 'var(--rose-deeper)';

  return (
    <div
      style={{ position: 'relative', fontSize: 11, padding: '1px 4px', cursor: 'pointer' }}
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
    >
      <span style={{ fontWeight: 600 }}>{s.tutor_name}</span> → {s.student_name}
      {showTip && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: '110%',
            transform: 'translateX(-50%)',
            background: 'var(--white)',
            color: 'var(--charcoal)',
            borderRadius: 10,
            padding: '10px 14px',
            fontSize: 12,
            pointerEvents: 'none',
            zIndex: 30,
            boxShadow: '0 4px 20px rgba(26,29,35,0.14)',
            whiteSpace: 'nowrap',
            minWidth: 190,
            border: '1px solid var(--fog)',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4, fontFamily: "'Syne', sans-serif" }}>
            {s.tutor_name} → {s.student_name}
          </div>
          <div style={{ color: 'var(--slate)', fontSize: 11, fontFamily: "'Syne', sans-serif" }}>
            {format(new Date(s.proposed_time), "EEE MMM d, h:mm a")}
          </div>
          <div style={{ marginTop: 5, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: statusColor, fontFamily: "'Syne', sans-serif" }}>
            {s.status}
          </div>
          {s.series_id && (
            <div style={{ marginTop: 3, fontSize: 10, color: 'var(--mist)', fontFamily: "'Syne', sans-serif" }}>Recurring series</div>
          )}
          <div style={{ marginTop: 5, fontSize: 10, color: 'var(--mist)', fontFamily: "'Syne', sans-serif" }}>
            Click to manage worksheet
          </div>
        </div>
      )}
    </div>
  );
}

export default function ScheduleClient({
  sessions: initial,
  tutors,
  students,
  satDates: initialSatDates = [],
}: {
  sessions: AdminSession[];
  tutors: UserOption[];
  students: UserOption[];
  satDates?: AdminSatDate[];
}) {
  const [mounted, setMounted] = useState(false);
  const [sessions, setSessions] = useState<AdminSession[]>(initial);
  const [satDates, setSatDates] = useState<AdminSatDate[]>(initialSatDates);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [satDialogOpen, setSatDialogOpen] = useState(false);
  const [view, setView] = useState<View>(Views.WEEK);
  const [date, setDate] = useState(() => new Date());

  useEffect(() => { setMounted(true); }, []);
  const [saving, setSaving] = useState(false);
  const [satSaving, setSatSaving] = useState(false);
  const [satForm, setSatForm] = useState({ studentId: '', testDate: '' });

  const [form, setForm] = useState<{
    tutorId: string;
    studentId: string;
    date: string;
    time: string;
    recurrence: 'none' | 'weekly' | 'biweekly';
    endDate: string;
  }>({
    tutorId: '',
    studentId: '',
    date: '',
    time: '',
    recurrence: 'none',
    endDate: '',
  });

  async function handleCreateSatDate() {
    if (!satForm.studentId || !satForm.testDate) {
      toast.error('Please select a student and date');
      return;
    }
    setSatSaving(true);
    try {
      const res = await fetch('/api/admin/sat-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: satForm.studentId, testDate: satForm.testDate }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      const created = await res.json();
      const student = students.find((s) => s.id === satForm.studentId);
      setSatDates((prev) => [...prev, { ...created, test_date: satForm.testDate, student_id: satForm.studentId, student_name: student?.name ?? '' }]);
      setSatDialogOpen(false);
      setSatForm({ studentId: '', testDate: '' });
      toast.success('SAT date added');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error adding SAT date');
    } finally {
      setSatSaving(false);
    }
  }

  // Session detail modal state
  const [detailSession, setDetailSession] = useState<AdminSession | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailDeleting, setDetailDeleting] = useState(false);
  const [seriesDeleting, setSeriesDeleting] = useState(false);

  // Worksheet picker state
  const [availableWorksheets, setAvailableWorksheets] = useState<{ id: string; title: string }[]>([]);
  const [selectedWorksheetId, setSelectedWorksheetId] = useState<string>('');
  const [worksheetSaving, setWorksheetSaving] = useState(false);

  // SAT date detail dialog
  const [satDetailOpen, setSatDetailOpen] = useState(false);
  const [satDetailDate, setSatDetailDate] = useState<AdminSatDate | null>(null);
  const [satNotes, setSatNotes] = useState('');
  const [satNotesSaving, setSatNotesSaving] = useState(false);
  const [satDeleting, setSatDeleting] = useState(false);

  // Unique tutor IDs for color assignment
  const tutorIds = useMemo(
    () => Array.from(new Set(sessions.map((s) => s.tutor_id))),
    [sessions]
  );

  const events = useMemo<CalEvent[]>(() => {
    const sessionEvents: CalEvent[] = sessions.map((s) => {
      const start = new Date(s.proposed_time);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      const color = getTutorColor(s.tutor_id, tutorIds);
      return { id: s.id, title: `${s.tutor_name} → ${s.student_name}`, start, end, resource: s, color, type: 'session' as const };
    });

    const satEvents: CalEvent[] = satDates.map((d) => {
      const day = new Date(d.test_date + 'T00:00:00');
      return { id: `sat-${d.id}`, title: d.student_name, start: day, end: day, color: '#A85F6A', type: 'sat' as const };
    });

    return [...sessionEvents, ...satEvents];
  }, [sessions, tutorIds, satDates]);

  const eventPropGetter = (event: CalEvent) => ({
    style: {
      backgroundColor: event.color,
      borderColor: event.color,
      color: '#fff',
      borderRadius: 5,
      fontSize: 12,
      fontWeight: 500,
    },
  });

  const components = useMemo(
    () => ({ event: EventComponent as React.ComponentType<{ event: CalEvent }> }),
    []
  );

  async function handleSelectEvent(event: CalEvent) {
    if (event.type === 'sat') {
      const satDate = satDates.find((d) => `sat-${d.id}` === event.id);
      if (satDate) handleSelectSatDate(satDate);
      return;
    }
    if (event.type !== 'session' || !event.resource) return;
    setDetailSession(event.resource);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const wsRes = await fetch(`/api/admin/sessions/${event.resource.id}/worksheet`);
      if (wsRes.ok) {
        const { attached, available } = await wsRes.json() as {
          attached: { id: string; title: string } | null;
          available: { id: string; title: string }[];
        };
        setAvailableWorksheets(available);
        setSelectedWorksheetId(attached?.id ?? '');
      }
    } catch {
      toast.error('Failed to load session details');
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleDeleteSeries() {
    if (!detailSession?.series_id) return;
    setSeriesDeleting(true);
    try {
      const res = await fetch(`/api/admin/session-series/${detailSession.series_id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete series');
      const { seriesId } = await res.json() as { seriesId: string };
      setSessions((prev) => prev.filter((s) => s.series_id !== seriesId));
      setDetailOpen(false);
      toast.success('Recurring series deleted');
    } catch {
      toast.error('Failed to delete series');
    } finally {
      setSeriesDeleting(false);
    }
  }

  function handleSelectSatDate(satDate: AdminSatDate) {
    setSatDetailDate(satDate);
    setSatNotes(satDate.notes ?? '');
    setSatDetailOpen(true);
  }

  async function handleSaveSatNotes() {
    if (!satDetailDate) return;
    setSatNotesSaving(true);
    try {
      const res = await fetch(`/api/admin/sat-dates/${satDetailDate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: satNotes || null }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setSatDates((prev) => prev.map((d) => d.id === satDetailDate.id ? { ...d, notes: satNotes || null } : d));
      setSatDetailDate((prev) => prev ? { ...prev, notes: satNotes || null } : prev);
      toast.success('Notes saved');
    } catch {
      toast.error('Failed to save notes');
    } finally {
      setSatNotesSaving(false);
    }
  }

  async function handleDeleteSatDate() {
    if (!satDetailDate) return;
    setSatDeleting(true);
    try {
      const res = await fetch(`/api/admin/sat-dates/${satDetailDate.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setSatDates((prev) => prev.filter((d) => d.id !== satDetailDate.id));
      setSatDetailOpen(false);
      toast.success('SAT date deleted');
    } catch {
      toast.error('Failed to delete SAT date');
    } finally {
      setSatDeleting(false);
    }
  }

  async function handleDeleteSession() {
    if (!detailSession) return;
    setDetailDeleting(true);
    try {
      const res = await fetch(`/api/admin/sessions/${detailSession.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setSessions((prev) => prev.filter((s) => s.id !== detailSession.id));
      setDetailOpen(false);
      toast.success('Session deleted');
    } catch {
      toast.error('Failed to delete session');
    } finally {
      setDetailDeleting(false);
    }
  }

  async function handleSaveWorksheet() {
    if (!detailSession) return;
    setWorksheetSaving(true);
    try {
      const res = await fetch(`/api/admin/sessions/${detailSession.id}/worksheet`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worksheetId: selectedWorksheetId || null }),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success(selectedWorksheetId ? 'Worksheet assigned.' : 'Worksheet removed.');
    } catch {
      toast.error('Failed to update worksheet.');
    } finally {
      setWorksheetSaving(false);
    }
  }

  async function handleCreate() {
    if (!form.tutorId || !form.studentId || !form.date || !form.time) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      const tutor = tutors.find((t) => t.id === form.tutorId);
      const student = students.find((s) => s.id === form.studentId);
      let newSessions: AdminSession[] = [];

      if (form.recurrence === 'none') {
        const proposedTime = new Date(`${form.date}T${form.time}`).toISOString();
        const res = await fetch('/api/admin/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tutorId: form.tutorId, studentId: form.studentId, proposedTime }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
        const created = await res.json();
        newSessions = [{ ...created, tutor_id: form.tutorId, tutor_name: tutor?.name ?? '', student_id: form.studentId, student_name: student?.name ?? '' }];
        toast.success('Session created');
      } else {
        const res = await fetch('/api/admin/session-series', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tutorId: form.tutorId,
            studentId: form.studentId,
            recurrence: form.recurrence,
            startDate: form.date,
            endDate: form.endDate || undefined,
            time: form.time,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
        const { sessions: created } = await res.json() as { sessions: AdminSession[] };
        newSessions = created.map((s) => ({ ...s, tutor_id: form.tutorId, tutor_name: tutor?.name ?? '', student_id: form.studentId, student_name: student?.name ?? '' }));
        toast.success(`${newSessions.length} recurring sessions created`);
      }

      setSessions((prev) => [...prev, ...newSessions]);
      setDialogOpen(false);
      setForm({ tutorId: '', studentId: '', date: '', time: '', recurrence: 'none', endDate: '' });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error creating session');
    } finally {
      setSaving(false);
    }
  }

  const statusColor =
    detailSession?.status === 'approved' ? 'var(--sky-deeper)' :
    detailSession?.status === 'denied'   ? '#EF4444' : 'var(--rose-deeper)';

  return (
    <div style={{ padding: '40px 48px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 34, fontWeight: 700, color: 'var(--charcoal)', margin: 0, letterSpacing: '-0.025em' }}>
            Schedule
          </h1>
          <p style={{ color: 'var(--slate)', marginTop: 6, fontSize: 15, fontFamily: "'Syne', sans-serif" }}>
            All sessions across tutors and students
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setSatDialogOpen(true)}
            className="btn-sky"
            style={{ gap: 8, background: 'rgba(168,93,106,0.12)', color: 'var(--rose-deeper)', border: '1px solid rgba(168,93,106,0.25)' }}
          >
            <Plus size={16} /> New SAT Date
          </button>
          <button
            onClick={() => setDialogOpen(true)}
            className="btn-sky"
            style={{ gap: 8 }}
          >
            <Plus size={16} /> New Session
          </button>
        </div>
      </div>

      {/* Calendar legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--slate)', fontFamily: "'Syne', sans-serif" }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: '#A85F6A', flexShrink: 0 }} />
          SAT Test Date
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--slate)', fontFamily: "'Syne', sans-serif" }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: '#4D8FAE', flexShrink: 0 }} />
          Homework
        </div>
        {tutorIds.length > 0 && tutors.filter((t) => tutorIds.includes(t.id)).map((tutor) => (
          <div key={tutor.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--slate)', fontFamily: "'Syne', sans-serif" }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: getTutorColor(tutor.id, tutorIds), flexShrink: 0 }} />
            {tutor.name}
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div
        style={{
          background: 'var(--white)',
          borderRadius: 14,
          border: '1px solid var(--fog)',
          boxShadow: '0 2px 8px rgba(26,29,35,0.04)',
          overflow: 'hidden',
          height: 680,
        }}
      >
        {/* eslint-disable-next-line react/no-danger */}
        <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: `
          .rbc-toolbar { padding: 16px 20px; border-bottom: 1px solid var(--fog, #E2E7EF); }
          .rbc-toolbar button { font-family: 'Syne', sans-serif; font-size: 13px; color: var(--charcoal, #1A1D23); border-color: var(--fog, #E2E7EF); border-radius: 8px; }
          .rbc-toolbar button.rbc-active { background: var(--sky, #A8CBDE); color: var(--charcoal, #1A1D23); border-color: var(--sky, #A8CBDE); }
          .rbc-toolbar-label { font-family: 'Cormorant Garamond', serif; font-size: 17px; font-weight: 600; color: var(--charcoal, #1A1D23); }
          .rbc-header { font-size: 12px; font-weight: 700; color: var(--mist, #8A91A0); text-transform: uppercase; letter-spacing: 0.08em; padding: 8px 0; }
          .rbc-today { background: rgba(168,203,222,0.1) !important; }
          .rbc-event { border: none !important; overflow: visible !important; border-radius: 6px !important; }
          .rbc-show-more { color: var(--rose-deeper, #A85F6A); font-size: 12px; font-weight: 600; }
        ` }} />
        {mounted && (
          <Calendar
            localizer={localizer}
            events={events}
            view={view}
            onView={setView}
            date={date}
            onNavigate={setDate}
            onSelectEvent={(event) => handleSelectEvent(event as CalEvent)}
            eventPropGetter={eventPropGetter as (event: object) => object}
            components={components as object}
            style={{ height: '100%' }}
            popup
          />
        )}
      </div>


      {/* Session detail / problem sheets dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent style={{ maxWidth: 500 }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Cormorant Garamond', serif", color: 'var(--charcoal)', letterSpacing: '-0.02em' }}>
              Session Details
            </DialogTitle>
          </DialogHeader>

          {detailSession && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 4 }}>
              {/* Session info */}
              <div style={{ background: 'var(--frost)', borderRadius: 10, padding: '12px 14px', border: '1px solid var(--fog)' }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--charcoal)', fontFamily: "'Syne', sans-serif", marginBottom: 4 }}>
                  {detailSession.tutor_name} → {detailSession.student_name}
                </div>
                <div style={{ fontSize: 13, color: 'var(--slate)', fontFamily: "'Syne', sans-serif", marginBottom: 6 }}>
                  {format(new Date(detailSession.proposed_time), "EEEE, MMMM d, yyyy 'at' h:mm a")}
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: statusColor, fontFamily: "'Syne', sans-serif" }}>
                  {detailSession.status}
                </span>
              </div>

              {/* Worksheet */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--mist)', fontFamily: "'Syne', sans-serif", marginBottom: 10 }}>
                  Worksheet
                </div>
                {detailLoading ? (
                  <div style={{ fontSize: 13, color: 'var(--mist)', fontFamily: "'Syne', sans-serif", padding: '8px 0' }}>Loading…</div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <BookOpen size={14} style={{ color: 'var(--slate)', flexShrink: 0 }} />
                    <select
                      value={selectedWorksheetId}
                      onChange={(e) => setSelectedWorksheetId(e.target.value)}
                      style={{ flex: 1, padding: '0.4rem 0.6rem', borderRadius: '0.5rem', fontSize: '0.8rem', border: '1px solid var(--fog)', background: 'var(--white)', color: 'var(--charcoal)', fontFamily: "'Syne', sans-serif" }}
                    >
                      <option value="">None</option>
                      {availableWorksheets.map((w) => (
                        <option key={w.id} value={w.id}>{w.title}</option>
                      ))}
                    </select>
                    <Button
                      onClick={handleSaveWorksheet}
                      disabled={worksheetSaving || detailLoading}
                      style={{ background: 'var(--sky)', color: 'var(--charcoal)', border: 'none', fontFamily: "'Syne', sans-serif", fontSize: 12, padding: '6px 14px', height: 'auto' }}
                    >
                      {worksheetSaving ? 'Saving…' : 'Save'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="mt-4" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                variant="outline"
                onClick={handleDeleteSession}
                disabled={detailDeleting || detailLoading}
                style={{ color: '#EF4444', borderColor: 'rgba(239,68,68,0.3)', gap: 6 }}
              >
                <Trash2 size={14} />
                {detailDeleting ? 'Deleting…' : 'Delete'}
              </Button>
              {detailSession?.series_id && (
                <Button
                  variant="outline"
                  onClick={handleDeleteSeries}
                  disabled={seriesDeleting || detailLoading}
                  style={{ color: '#EF4444', borderColor: 'rgba(239,68,68,0.3)', gap: 6 }}
                >
                  <Trash2 size={14} />
                  {seriesDeleting ? 'Deleting…' : 'Delete series'}
                </Button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SAT date detail dialog */}
      <Dialog open={satDetailOpen} onOpenChange={setSatDetailOpen}>
        <DialogContent style={{ maxWidth: 420 }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Cormorant Garamond', serif", color: 'var(--charcoal)', letterSpacing: '-0.02em' }}>
              SAT Test Date
            </DialogTitle>
          </DialogHeader>

          {satDetailDate && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 4 }}>
              <div style={{ background: 'var(--frost)', borderRadius: 10, padding: '12px 14px', border: '1px solid var(--fog)' }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--charcoal)', fontFamily: "'Syne', sans-serif", marginBottom: 2 }}>
                  {satDetailDate.student_name}
                </div>
                <div style={{ fontSize: 13, color: 'var(--slate)', fontFamily: "'Syne', sans-serif" }}>
                  {format(new Date(satDetailDate.test_date + 'T12:00:00'), 'EEEE, MMMM d, yyyy')}
                </div>
              </div>

              <div>
                <Label style={{ fontFamily: "'Syne', sans-serif", fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--mist)', fontWeight: 700 }}>
                  Notes
                </Label>
                <textarea
                  value={satNotes}
                  onChange={(e) => setSatNotes(e.target.value)}
                  placeholder="Add notes about this test date…"
                  rows={4}
                  style={{
                    display: 'block',
                    width: '100%',
                    marginTop: 6,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--fog)',
                    background: 'var(--white)',
                    fontSize: 13,
                    color: 'var(--charcoal)',
                    fontFamily: "'Syne', sans-serif",
                    resize: 'vertical',
                    outline: 'none',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--sky)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(168,203,222,0.15)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--fog)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
            </div>
          )}

          <DialogFooter className="mt-4" style={{ justifyContent: 'space-between' }}>
            <Button
              variant="outline"
              onClick={handleDeleteSatDate}
              disabled={satDeleting}
              style={{ color: '#EF4444', borderColor: 'rgba(239,68,68,0.3)', gap: 6 }}
            >
              <Trash2 size={14} />
              {satDeleting ? 'Deleting…' : 'Delete'}
            </Button>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="outline" onClick={() => setSatDetailOpen(false)}>Close</Button>
              <Button
                onClick={handleSaveSatNotes}
                disabled={satNotesSaving}
                style={{ background: 'var(--sky)', color: 'var(--charcoal)', fontFamily: "'Syne', sans-serif", border: 'none' }}
              >
                {satNotesSaving ? 'Saving…' : 'Save Notes'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New SAT date dialog */}
      <Dialog open={satDialogOpen} onOpenChange={setSatDialogOpen}>
        <DialogContent style={{ maxWidth: 400 }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Cormorant Garamond', serif", color: 'var(--charcoal)', letterSpacing: '-0.02em' }}>New SAT Test Date</DialogTitle>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
            <div>
              <Label>Student</Label>
              <select
                value={satForm.studentId}
                onChange={(e) => setSatForm((f) => ({ ...f, studentId: e.target.value }))}
                style={{ display: 'block', width: '100%', marginTop: 4, height: 32, padding: '0 8px', borderRadius: 8, border: '1px solid var(--fog)', background: 'transparent', fontSize: 14, color: 'var(--charcoal)', cursor: 'pointer', fontFamily: "'Syne', sans-serif" }}
              >
                <option value="">Select student…</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Test Date</Label>
              <Input type="date" value={satForm.testDate} onChange={(e) => setSatForm((f) => ({ ...f, testDate: e.target.value }))} className="mt-1" />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setSatDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreateSatDate}
              disabled={satSaving}
              style={{ background: 'var(--sky)', color: 'var(--charcoal)', fontFamily: "'Syne', sans-serif", border: 'none' }}
            >
              {satSaving ? 'Saving…' : 'Add SAT Date'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New session dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen} modal={false}>
        <DialogContent style={{ maxWidth: 480 }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Cormorant Garamond', serif", color: 'var(--charcoal)', letterSpacing: '-0.02em' }}>New Session</DialogTitle>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
            <div>
              <Label>Tutor</Label>
              <select
                value={form.tutorId}
                onChange={(e) => setForm((f) => ({ ...f, tutorId: e.target.value }))}
                style={{ display: 'block', width: '100%', marginTop: 4, height: 32, padding: '0 8px', borderRadius: 8, border: '1px solid var(--fog)', background: 'transparent', fontSize: 14, color: 'var(--charcoal)', cursor: 'pointer', fontFamily: "'Syne', sans-serif" }}
              >
                <option value="">Select tutor…</option>
                {tutors.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Student</Label>
              <select
                value={form.studentId}
                onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
                style={{ display: 'block', width: '100%', marginTop: 4, height: 32, padding: '0 8px', borderRadius: 8, border: '1px solid var(--fog)', background: 'transparent', fontSize: 14, color: 'var(--charcoal)', cursor: 'pointer', fontFamily: "'Syne', sans-serif" }}
              >
                <option value="">Select student…</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Time</Label>
                <select
                  value={form.time}
                  onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                  style={{ display: 'block', width: '100%', marginTop: 4, height: 32, padding: '0 8px', borderRadius: 8, border: '1px solid var(--fog)', background: 'transparent', fontSize: 14, color: 'var(--charcoal)', cursor: 'pointer', fontFamily: "'Syne', sans-serif" }}
                >
                  <option value="">Select time…</option>
                  {Array.from({ length: 96 }, (_, i) => {
                    const h = Math.floor(i / 4);
                    const m = (i % 4) * 15;
                    const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                    const hour12 = h % 12 === 0 ? 12 : h % 12;
                    const label = `${hour12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
                    return <option key={value} value={value}>{label}</option>;
                  })}
                </select>
              </div>
            </div>
            <div>
              <Label>Recurrence</Label>
              <select
                value={form.recurrence}
                onChange={(e) => setForm((f) => ({ ...f, recurrence: e.target.value as 'none' | 'weekly' | 'biweekly' }))}
                style={{ display: 'block', width: '100%', marginTop: 4, height: 32, padding: '0 8px', borderRadius: 8, border: '1px solid var(--fog)', background: 'transparent', fontSize: 14, color: 'var(--charcoal)', cursor: 'pointer', fontFamily: "'Syne', sans-serif" }}
              >
                <option value="none">One-time</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Biweekly (every 2 weeks)</option>
              </select>
            </div>
            {form.recurrence !== 'none' && (
              <div>
                <Label>
                  End Date{' '}
                  <span style={{ color: '#8A9099', fontWeight: 400 }}>(leave blank for 6 months)</span>
                </Label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} className="mt-1" />
              </div>
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving} style={{ background: 'var(--sky)', color: 'var(--charcoal)', fontFamily: "'Syne', sans-serif", border: 'none' }}>
              {saving ? 'Creating…' : form.recurrence === 'none' ? 'Create Session' : 'Create Recurring'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
