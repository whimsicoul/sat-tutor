import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getWorksheetsByStudent } from '@/lib/db';
import Link from 'next/link';
import { format } from 'date-fns';
import { Layers, Play } from 'lucide-react';

export default async function StudentWorksheetsPage() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) redirect('/login');

  const worksheets = await getWorksheetsByStudent(user.id);

  return (
    <div className="space-y-8">
      <div>
        <div className="eyebrow-rose mb-3">Student Portal</div>
        <h1 className="portal-section-title">Worksheets</h1>
        <p className="text-sm mt-2" style={{ color: 'var(--slate)' }}>
          Work through your assigned worksheets step by step.
        </p>
      </div>

      {(worksheets as unknown[]).length === 0 ? (
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
        <div className="space-y-3">
          <div className="text-xs font-medium mb-4" style={{ color: 'var(--mist)' }}>
            {(worksheets as unknown[]).length} {(worksheets as unknown[]).length === 1 ? 'worksheet' : 'worksheets'} assigned
          </div>
          {(worksheets as { id: string; title: string; student_name: string; created_by_name: string; step_count: number | string; created_at: string }[]).map((w, idx) => (
            <div
              key={w.id}
              className="portal-card hover-rose-border flex items-center gap-5 p-5 transition-all"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-semibold"
                style={{ background: 'rgba(224,166,175,0.14)', color: 'var(--rose-deeper)', border: '1px solid rgba(224,166,175,0.25)' }}
              >
                {String(idx + 1).padStart(2, '0')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--charcoal)' }}>
                  {w.title}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--mist)' }}>
                  {w.step_count} {Number(w.step_count) === 1 ? 'step' : 'steps'} · assigned {format(new Date(w.created_at), 'MMM d, yyyy')}
                </p>
              </div>
              <Link
                href={`/student/worksheets/${w.id}`}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all shrink-0"
                style={{ background: 'var(--rose)', color: 'var(--charcoal)', textDecoration: 'none' }}
              >
                <Play className="h-4 w-4" />
                <span className="hidden sm:inline">Start</span>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
