import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import { FileText, BookOpen } from 'lucide-react';
import { format } from 'date-fns';

export default async function StudentProblemSetsPage() {
  const session = await auth();
  const userId = session!.user.id;

  const problemSets = await sql`
    SELECT ps.id, ps.title, ps.problem_pdf_url, ps.created_at,
           u.name AS tutor_name
    FROM problem_sets ps
    JOIN users u ON u.id = ps.tutor_id
    WHERE ps.student_id = ${userId}
    ORDER BY ps.created_at DESC
  `;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="h-px w-6" style={{ background: '#8BB5AE' }} />
          <span
            className="text-xs tracking-widest uppercase font-medium"
            style={{ color: '#8BB5AE', fontFamily: "'Syne', sans-serif" }}
          >
            Student Portal
          </span>
        </div>
        <h1 className="portal-section-title">Problem Sets</h1>
        <p className="text-sm mt-1" style={{ color: '#4A4F5A', fontFamily: "'Syne', sans-serif" }}>
          Download and complete your assigned practice materials.
        </p>
      </div>

      {problemSets.length === 0 ? (
        <div
          className="portal-card flex flex-col items-center justify-center py-20 text-center"
        >
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
            style={{ background: '#F0F2F5', border: '1px solid #D5D9E1' }}
          >
            <FileText className="h-6 w-6" style={{ color: '#8BB5AE' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: '#1F1F1F', fontFamily: "'Syne', sans-serif" }}>
            No problem sets assigned yet
          </p>
          <p className="text-xs mt-1" style={{ color: '#8A9099', fontFamily: "'Syne', sans-serif" }}>
            Check back after your next session.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Count summary */}
          <div
            className="text-xs font-medium mb-4"
            style={{ color: '#8A9099', fontFamily: "'Syne', sans-serif" }}
          >
            {problemSets.length} {problemSets.length === 1 ? 'set' : 'sets'} assigned
          </div>

          {problemSets.map((ps, idx) => (
            <div
              key={ps.id as string}
              className="portal-card flex items-center gap-5 p-5 transition-all"
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              {/* Index badge */}
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-sm font-semibold"
                style={{
                  background: '#F0F2F5',
                  color: '#1F1F1F',
                  border: '1px solid #D5D9E1',
                  fontFamily: "'Syne', sans-serif",
                }}
              >
                {String(idx + 1).padStart(2, '0')}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-semibold truncate"
                  style={{ color: '#1F1F1F', fontFamily: "'Syne', sans-serif" }}
                >
                  {ps.title as string}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#8A9099', fontFamily: "'Syne', sans-serif" }}>
                  Assigned by {ps.tutor_name as string} · {format(new Date(ps.created_at as string), 'MMM d, yyyy')}
                </p>
              </div>

              {/* Action */}
              <a
                href={ps.problem_pdf_url as string}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-all shrink-0"
                style={{
                  background: '#1F1F1F',
                  color: '#F0F2F5',
                  fontFamily: "'Syne', sans-serif",
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
