import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import { format } from 'date-fns';
import { BarChart2, FileText } from 'lucide-react';

interface TestResult {
  id: string;
  test_name: string;
  test_date: string;
  total_score: number | null;
  math_score: number | null;
  reading_writing_score: number | null;
  notes: string | null;
  pdf_url: string | null;
  created_at: string;
}

export default async function StudentTestResultsPage() {
  const session = await auth();
  const userId = session!.user.id;

  const results = await sql`
    SELECT id, test_name, test_date, total_score, math_score, reading_writing_score, notes, pdf_url, created_at
    FROM test_results
    WHERE student_id = ${userId}
    ORDER BY test_date DESC
  `;

  const rows = results as unknown as TestResult[];

  return (
    <div className="space-y-8">
      <div>
        <div className="eyebrow-rose mb-3">Student Portal</div>
        <h1 className="portal-section-title">Test Results</h1>
        <p className="text-sm mt-2" style={{ color: 'var(--slate)' }}>
          Your practice test scores and progress over time.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="portal-card flex flex-col items-center justify-center py-20 text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'var(--rose-ultra)', border: '1px solid rgba(224,166,175,0.25)' }}
          >
            <BarChart2 className="h-6 w-6" style={{ color: 'var(--rose-deeper)' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--charcoal)' }}>
            No test results yet
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--mist)' }}>
            Your tutor will upload results after each practice test.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-xs font-medium mb-2" style={{ color: 'var(--mist)' }}>
            {rows.length} {rows.length === 1 ? 'result' : 'results'}
          </div>
          {rows.map((r) => (
            <div key={r.id} className="portal-card p-6">
              {/* Header row */}
              <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--charcoal)' }}>{r.test_name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--mist)' }}>
                    {format(new Date(r.test_date), 'MMMM d, yyyy')}
                  </p>
                  {r.pdf_url && (
                    <a
                      href={r.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold rounded-lg px-3 py-1.5"
                      style={{
                        background: 'var(--rose-ultra)',
                        border: '1px solid rgba(224,166,175,0.3)',
                        color: 'var(--rose-deeper)',
                        textDecoration: 'none',
                      }}
                    >
                      <FileText size={12} />
                      View Score Report
                    </a>
                  )}
                </div>
                {r.total_score != null && (
                  <div
                    className="flex flex-col items-center justify-center rounded-xl px-5 py-2"
                    style={{ background: 'var(--rose-ultra)', border: '1px solid rgba(224,166,175,0.3)', minWidth: 80 }}
                  >
                    <span className="text-2xl font-bold" style={{ color: 'var(--rose-deeper)', lineHeight: 1 }}>
                      {r.total_score}
                    </span>
                    <span className="text-xs font-medium mt-0.5" style={{ color: 'var(--mist)' }}>Total</span>
                  </div>
                )}
              </div>

              {/* Score breakdown */}
              {(r.math_score != null || r.reading_writing_score != null) && (
                <div className="flex gap-3 flex-wrap mb-4">
                  {r.math_score != null && (
                    <div
                      className="flex items-center gap-2 rounded-lg px-4 py-2"
                      style={{ background: 'rgba(168,203,222,0.12)', border: '1px solid rgba(168,203,222,0.25)' }}
                    >
                      <span className="text-sm font-bold" style={{ color: 'var(--sky-deeper)' }}>{r.math_score}</span>
                      <span className="text-xs" style={{ color: 'var(--slate)' }}>Math</span>
                    </div>
                  )}
                  {r.reading_writing_score != null && (
                    <div
                      className="flex items-center gap-2 rounded-lg px-4 py-2"
                      style={{ background: 'rgba(168,203,222,0.12)', border: '1px solid rgba(168,203,222,0.25)' }}
                    >
                      <span className="text-sm font-bold" style={{ color: 'var(--sky-deeper)' }}>{r.reading_writing_score}</span>
                      <span className="text-xs" style={{ color: 'var(--slate)' }}>Reading &amp; Writing</span>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              {r.notes && (
                <div
                  className="rounded-lg px-4 py-3"
                  style={{ background: 'var(--frost)', border: '1px solid var(--fog)' }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--mist)' }}>Notes</p>
                  <p className="text-sm" style={{ color: 'var(--charcoal)' }}>{r.notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
