import { auth } from '@/lib/auth';
import { getTestResultsForTutorStudents } from '@/lib/db';
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
  score_type: string | null;
  act_english_score: number | null;
  act_reading_score: number | null;
  act_science_score: number | null;
  created_at: string;
  student_name: string;
}

export default async function TutorTestResultsPage() {
  const session = await auth();
  const tutorId = session!.user.id;

  const rawResults = await getTestResultsForTutorStudents(tutorId);
  const results = rawResults as unknown as TestResult[];

  // Group by student name
  const byStudent = new Map<string, TestResult[]>();
  for (const r of results) {
    const list = byStudent.get(r.student_name) ?? [];
    list.push(r);
    byStudent.set(r.student_name, list);
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="eyebrow-sky mb-3">Tutor Portal</div>
        <h1 className="portal-section-title">Student Test Results</h1>
        <p className="text-sm mt-2" style={{ color: 'var(--slate)' }}>
          Practice test scores for all your assigned students.
        </p>
      </div>

      {results.length === 0 ? (
        <div className="portal-card flex flex-col items-center justify-center py-20 text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'rgba(168,203,222,0.15)', border: '1px solid rgba(168,203,222,0.25)' }}
          >
            <BarChart2 className="h-6 w-6" style={{ color: 'var(--sky-deeper)' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--charcoal)' }}>
            No test results yet
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--mist)' }}>
            Results will appear here once admin uploads scores for your students.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {Array.from(byStudent.entries()).map(([studentName, studentResults]) => (
            <div key={studentName}>
              <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--charcoal)' }}>
                {studentName}
                <span className="ml-2 text-xs font-normal" style={{ color: 'var(--mist)' }}>
                  {studentResults.length} {studentResults.length === 1 ? 'result' : 'results'}
                </span>
              </h2>
              <div className="space-y-4">
                {studentResults.map((r) => (
                  <div key={r.id} className="portal-card p-6">
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
                              background: 'rgba(168,203,222,0.15)',
                              border: '1px solid rgba(168,203,222,0.3)',
                              color: 'var(--sky-deeper)',
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
                          style={{ background: 'rgba(168,203,222,0.15)', border: '1px solid rgba(168,203,222,0.3)', minWidth: 80 }}
                        >
                          <span className="text-2xl font-bold" style={{ color: 'var(--sky-deeper)', lineHeight: 1 }}>
                            {r.total_score}
                          </span>
                          <span className="text-xs font-medium mt-0.5" style={{ color: 'var(--mist)' }}>{r.score_type === 'act' ? 'Composite' : 'Total'}</span>
                        </div>
                      )}
                    </div>

                    {r.score_type === 'act' ? (
                      <div className="flex gap-3 flex-wrap mb-4">
                        {r.act_english_score != null && (
                          <div
                            className="flex items-center gap-2 rounded-lg px-4 py-2"
                            style={{ background: 'rgba(168,203,222,0.12)', border: '1px solid rgba(168,203,222,0.25)' }}
                          >
                            <span className="text-sm font-bold" style={{ color: 'var(--sky-deeper)' }}>{r.act_english_score}</span>
                            <span className="text-xs" style={{ color: 'var(--slate)' }}>English</span>
                          </div>
                        )}
                        {r.math_score != null && (
                          <div
                            className="flex items-center gap-2 rounded-lg px-4 py-2"
                            style={{ background: 'rgba(168,203,222,0.12)', border: '1px solid rgba(168,203,222,0.25)' }}
                          >
                            <span className="text-sm font-bold" style={{ color: 'var(--sky-deeper)' }}>{r.math_score}</span>
                            <span className="text-xs" style={{ color: 'var(--slate)' }}>Math</span>
                          </div>
                        )}
                        {r.act_reading_score != null && (
                          <div
                            className="flex items-center gap-2 rounded-lg px-4 py-2"
                            style={{ background: 'rgba(168,203,222,0.12)', border: '1px solid rgba(168,203,222,0.25)' }}
                          >
                            <span className="text-sm font-bold" style={{ color: 'var(--sky-deeper)' }}>{r.act_reading_score}</span>
                            <span className="text-xs" style={{ color: 'var(--slate)' }}>Reading</span>
                          </div>
                        )}
                        {r.act_science_score != null && (
                          <div
                            className="flex items-center gap-2 rounded-lg px-4 py-2"
                            style={{ background: 'rgba(168,203,222,0.12)', border: '1px solid rgba(168,203,222,0.25)' }}
                          >
                            <span className="text-sm font-bold" style={{ color: 'var(--sky-deeper)' }}>{r.act_science_score}</span>
                            <span className="text-xs" style={{ color: 'var(--slate)' }}>Science</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      (r.math_score != null || r.reading_writing_score != null) && (
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
                      )
                    )}

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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
