import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getWorksheetsByStudent } from '@/lib/db';
import Link from 'next/link';
import { format } from 'date-fns';
import { AlertCircle, CheckCircle2, Layers, Play, RotateCcw } from 'lucide-react';

type Worksheet = {
  id: string;
  title: string;
  created_by_name: string;
  step_count: number | string;
  created_at: string;
  session_date?: string | null;
  is_completed: boolean;
  completed_at?: string | null;
};

// Deadline = start of the second day after the session date (UTC).
// e.g. session May 6 → deadline midnight May 8 → student has all of May 7.
function getDeadline(sessionDate: string): Date {
  const d = new Date(sessionDate);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 2));
}

function isLate(w: Worksheet): boolean {
  if (!w.session_date || !w.completed_at) return false;
  return new Date(w.completed_at) > getDeadline(w.session_date);
}

function WorksheetCard({
  w,
  idx,
  action,
  late = false,
}: {
  w: Worksheet;
  idx: number;
  action: 'start' | 'review';
  late?: boolean;
}) {
  return (
    <div className="portal-card hover-rose-border flex items-center gap-5 p-5 transition-all">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-semibold"
        style={{ background: 'rgba(224,166,175,0.14)', color: 'var(--rose-deeper)', border: '1px solid rgba(224,166,175,0.25)' }}
      >
        {String(idx + 1).padStart(2, '0')}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--charcoal)' }}>
            {w.title}
          </p>
          {late && (
            <span
              className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(192,57,43,0.1)', color: '#c0392b' }}
            >
              Late
            </span>
          )}
        </div>
        <p className="text-xs mt-0.5" style={{ color: 'var(--mist)' }}>
          {w.step_count} {Number(w.step_count) === 1 ? 'step' : 'steps'}
          {w.session_date
            ? ` · Session: ${format(new Date(w.session_date), 'MMM d, yyyy')}`
            : ` · Assigned ${format(new Date(w.created_at), 'MMM d, yyyy')}`}
        </p>
      </div>
      <Link
        href={`/student/worksheets/${w.id}`}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all shrink-0"
        style={{ background: 'var(--rose)', color: 'var(--charcoal)', textDecoration: 'none' }}
      >
        {action === 'review' ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        <span className="hidden sm:inline">{action === 'review' ? 'Review' : 'Start'}</span>
      </Link>
    </div>
  );
}

function SectionHeader({
  icon,
  label,
  count,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span style={{ color }}>{icon}</span>
      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color }}>
        {label}
      </span>
      <span
        className="ml-1 px-2 py-0.5 rounded-full text-xs font-semibold"
        style={{ background: 'rgba(224,166,175,0.14)', color: 'var(--mist)' }}
      >
        {count}
      </span>
    </div>
  );
}

export default async function StudentWorksheetsPage() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) redirect('/login');

  const worksheets = (await getWorksheetsByStudent(user.id)) as Worksheet[];

  const now = new Date();

  const overdue = worksheets.filter(
    (w) =>
      !w.is_completed &&
      w.session_date &&
      now > getDeadline(w.session_date),
  );

  const current = worksheets.filter(
    (w) =>
      !w.is_completed &&
      (!w.session_date || now <= getDeadline(w.session_date)),
  );

  const completed = worksheets.filter((w) => w.is_completed);

  return (
    <div className="space-y-8">
      <div>
        <div className="eyebrow-rose mb-3">Student Portal</div>
        <h1 className="portal-section-title">Worksheets</h1>
        <p className="text-sm mt-2" style={{ color: 'var(--slate)' }}>
          Work through your assigned worksheets step by step.
        </p>
      </div>

      {worksheets.length === 0 ? (
        <div className="portal-card flex flex-col items-center justify-center py-20 text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'var(--rose-ultra)', border: '1px solid rgba(224,166,175,0.25)' }}
          >
            <Layers className="h-6 w-6" style={{ color: 'var(--rose-deeper)' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--charcoal)' }}>
            No worksheets assigned yet
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--mist)' }}>
            Check back after your next session.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {overdue.length > 0 && (
            <div>
              <SectionHeader
                icon={<AlertCircle className="h-4 w-4" />}
                label="Overdue"
                count={overdue.length}
                color="#c0392b"
              />
              <div className="space-y-3">
                {overdue.map((w, idx) => (
                  <WorksheetCard key={w.id} w={w} idx={idx} action="start" />
                ))}
              </div>
            </div>
          )}

          {current.length > 0 && (
            <div>
              <SectionHeader
                icon={<Play className="h-4 w-4" />}
                label="Current"
                count={current.length}
                color="var(--rose-deeper)"
              />
              <div className="space-y-3">
                {current.map((w, idx) => (
                  <WorksheetCard key={w.id} w={w} idx={idx} action="start" />
                ))}
              </div>
            </div>
          )}

          {completed.length > 0 && (
            <div>
              <SectionHeader
                icon={<CheckCircle2 className="h-4 w-4" />}
                label="Completed"
                count={completed.length}
                color="var(--mist)"
              />
              <div className="space-y-3">
                {completed.map((w, idx) => (
                  <WorksheetCard key={w.id} w={w} idx={idx} action="review" late={isLate(w)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
