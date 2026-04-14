'use client';

import { useState, useMemo } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import type { AdminSession, UserOption } from './page';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales: { 'en-US': enUS },
});

// Distinct colors per tutor
const TUTOR_COLORS = [
  '#8BB5AE', '#E0A6AF', '#6A9E96', '#CC8A95', '#5B9E94',
  '#D4858F', '#7DADA5', '#E8B0BA', '#4E908A', '#C87F8A',
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
    s.status === 'approved' ? '#8BB5AE' :
    s.status === 'denied'   ? '#F87171' : '#E0A6AF';

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
            background: '#1F1F1F',
            color: '#F0F2F5',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 12,
            pointerEvents: 'none',
            zIndex: 9999,
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            whiteSpace: 'nowrap',
            minWidth: 190,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            {s.tutor_name} → {s.student_name}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>
            {format(new Date(s.proposed_time), "EEE MMM d, h:mm a")}
          </div>
          <div style={{ marginTop: 5, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: statusColor }}>
            {s.status}
          </div>
          {s.series_id && (
            <div style={{ marginTop: 3, fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>Recurring series</div>
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
  const [sessions, setSessions] = useState<AdminSession[]>(initial);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [view, setView] = useState<View>(Views.WEEK);
  const [date, setDate] = useState(new Date());
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
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 700, color: '#1F1F1F', margin: 0 }}>
            Schedule
          </h1>
          <p style={{ color: '#4A4F5A', marginTop: 6, fontSize: 15, fontFamily: "'Syne', sans-serif" }}>
            All sessions across tutors and students
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} style={{ background: '#1F1F1F', color: '#F0F2F5', gap: 6, fontFamily: "'Syne', sans-serif" }}>
          <Plus size={16} /> New Session
        </Button>
      </div>

      {/* Tutor color legend */}
      {tutorIds.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
          {tutors.filter((t) => tutorIds.includes(t.id)).map((tutor) => (
            <div key={tutor.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#4A4F5A', fontFamily: "'Syne', sans-serif" }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: getTutorColor(tutor.id, tutorIds), flexShrink: 0 }} />
              {tutor.name}
            </div>
          ))}
        </div>
      )}

      {/* Calendar */}
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #D5D9E1',
          boxShadow: '0 1px 4px rgba(31,31,31,0.06)',
          overflow: 'hidden',
          height: 680,
        }}
      >
        <style>{`
          .rbc-toolbar { padding: 16px 20px; border-bottom: 1px solid #D5D9E1; }
          .rbc-toolbar button { font-family: 'Syne', sans-serif; font-size: 13px; color: #1F1F1F; border-color: #D5D9E1; }
          .rbc-toolbar button.rbc-active { background: #1F1F1F; color: #F0F2F5; border-color: #1F1F1F; }
          .rbc-toolbar-label { font-family: 'Cormorant Garamond', serif; font-size: 17px; font-weight: 600; color: #1F1F1F; }
          .rbc-header { font-size: 12px; font-weight: 600; color: #4A4F5A; text-transform: uppercase; letter-spacing: 0.06em; padding: 8px 0; }
          .rbc-today { background: rgba(139,181,174,0.08) !important; }
          .rbc-event { border: none !important; overflow: visible !important; }
          .rbc-show-more { color: #8BB5AE; font-size: 12px; }
        `}</style>
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
      </div>

      {/* New session dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent style={{ maxWidth: 480 }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Cormorant Garamond', serif" }}>New Session</DialogTitle>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
            <div>
              <Label>Tutor</Label>
              <Select value={form.tutorId} onValueChange={(v) => setForm((f) => ({ ...f, tutorId: v ?? '' }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select tutor…" /></SelectTrigger>
                <SelectContent>
                  {tutors.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Student</Label>
              <Select value={form.studentId} onValueChange={(v) => setForm((f) => ({ ...f, studentId: v ?? '' }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select student…" /></SelectTrigger>
                <SelectContent>
                  {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Time</Label>
                <Input type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Recurrence</Label>
              <Select
                value={form.recurrence}
                onValueChange={(v) => setForm((f) => ({ ...f, recurrence: (v ?? 'none') as 'none' | 'weekly' | 'biweekly' }))}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">One-time</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Biweekly (every 2 weeks)</SelectItem>
                </SelectContent>
              </Select>
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
            <Button onClick={handleCreate} disabled={saving} style={{ background: '#1F1F1F', color: '#F0F2F5', fontFamily: "'Syne', sans-serif" }}>
              {saving ? 'Creating…' : form.recurrence === 'none' ? 'Create Session' : 'Create Recurring'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
