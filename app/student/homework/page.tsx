import { auth } from '@/lib/auth';
import { getHomeworkByStudent } from '@/lib/db';
import { FileText, BookOpen } from 'lucide-react';
import { format } from 'date-fns';

export default async function StudentHomeworkPage() {
  const session = await auth();
  const userId = session!.user.id;

  const homework = await getHomeworkByStudent(userId);

  return (
    <div className="space-y-8">
      <div>
        <div className="eyebrow-rose mb-3">Student Portal</div>
        <h1 className="portal-section-title">Homework</h1>
        <p className="text-sm mt-2" style={{ color: 'var(--slate)' }}>
          Independent practice assigned by your tutor. Complete each set on the scheduled day.
        </p>
      </div>

      {homework.length === 0 ? (
        <div className="portal-card flex flex-col items-center justify-center py-20 text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'var(--rose-ultra)', border: '1px solid rgba(224,166,175,0.25)' }}
          >
            <FileText className="h-6 w-6" style={{ color: 'var(--rose-deeper)' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--charcoal)' }}>
            No homework assigned yet
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--mist)' }}>
            Check back after your next session.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-xs font-medium mb-4" style={{ color: 'var(--mist)' }}>
            {homework.length} {homework.length === 1 ? 'assignment' : 'assignments'}
          </div>

          {homework.map((hw, idx) => (
            <div
              key={hw.id as string}
              className="portal-card hover-rose-border flex items-center gap-5 p-5 transition-all"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-semibold"
                style={{ background: 'rgba(77,143,174,0.12)', color: 'var(--sky-deeper)', border: '1px solid rgba(77,143,174,0.22)' }}
              >
                {String(idx + 1).padStart(2, '0')}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--charcoal)' }}>
                  {hw.title as string}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--mist)' }}>
                  Assigned by {hw.assigned_by_name as string} · Do on {format(new Date(hw.scheduled_date as string), 'MMM d, yyyy')}
                </p>
              </div>

              <a
                href={hw.problem_pdf_url as string}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all shrink-0"
                style={{
                  background: 'var(--sky)',
                  color: 'var(--charcoal)',
                  textDecoration: 'none',
                }}
              >
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Open</span>
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
