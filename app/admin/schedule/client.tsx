'use client';

import { useState, useMemo, useEffect } from 'react';
import { Calendar, dateFnsLocalizer, Views, type View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { AdminSession, UserOption } from './page';

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
  resource: AdminSession;
  color: string;
}

function EventComponent({ event }: { event: CalEvent }) {
  const [showTip, setShowTip] = useState(false);
  const s = event.resource;
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
        </div>
      )}
    </div>
  );
}

export default function ScheduleClient({
  sessions: initial,
  tutors,
  students,
}: {
  sessions: AdminSession[];
  tutors: UserOption[];
  students: UserOption[];
}) {
  const [mounted, setMounted] = useState(false);
  const [sessions, setSessions] = useState<AdminSession[]>(initial);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [view, setView] = useState<View>(Views.WEEK);
  const [date, setDate] = useState(() => new Date());

  useEffect(() => { setMounted(true); }, []);
  const [saving, setSaving] = useState(false);

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

  // Unique tutor IDs for color assignment
  const tutorIds = useMemo(
    () => Array.from(new Set(sessions.map((s) => s.tutor_id))),
    [sessions]
  );

  const events = useMemo<CalEvent[]>(
    () =>
      sessions.map((s) => {
        const start = new Date(s.proposed_time);
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        const color = getTutorColor(s.tutor_id, tutorIds);
        return { id: s.id, title: `${s.tutor_name} → ${s.student_name}`, start, end, resource: s, color };
      }),
    [sessions, tutorIds]
  );

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

  async function handleCreate() {
    if (!form.tutorId || !form.studentId || !form.date || !form.time) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
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
        const tutor = tutors.find((t) => t.id === form.tutorId);
        const student = students.find((s) => s.id === form.studentId);
        newSessions = [{
          ...created,
          tutor_id: form.tutorId,
          tutor_name: tutor?.name ?? '',
          student_id: form.studentId,
          student_name: student?.name ?? '',
        }];
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
        const { sessions: created } = await res.json() as { sessions: Record<string, unknown>[] };
        const tutor = tutors.find((t) => t.id === form.tutorId);
        const student = students.find((s) => s.id === form.studentId);
        newSessions = created.map((s) => ({
          ...(s as Omit<AdminSession, 'tutor_id' | 'tutor_name' | 'student_id' | 'student_name'>),
          tutor_id: form.tutorId,
          tutor_name: tutor?.name ?? '',
          student_id: form.studentId,
          student_name: student?.name ?? '',
          status: (s.status as AdminSession['status']) ?? 'pending',
          id: s.id as string,
          proposed_time: s.proposed_time as string,
        }));
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
        <button
          onClick={() => setDialogOpen(true)}
          className="btn-sky"
          style={{ gap: 8 }}
        >
          <Plus size={16} /> New Session
        </button>
      </div>

      {/* Tutor color legend */}
      {tutorIds.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
          {tutors.filter((t) => tutorIds.includes(t.id)).map((tutor) => (
            <div key={tutor.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--slate)', fontFamily: "'Syne', sans-serif" }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: getTutorColor(tutor.id, tutorIds), flexShrink: 0 }} />
              {tutor.name}
            </div>
          ))}
        </div>
      )}

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
            eventPropGetter={eventPropGetter as (event: object) => object}
            components={components as object}
            style={{ height: '100%' }}
            popup
          />
        )}
      </div>

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
