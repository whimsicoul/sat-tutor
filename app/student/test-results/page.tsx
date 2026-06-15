import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import { satToAct, actToSat } from '@/lib/concordance';
import { format } from 'date-fns';
import { BarChart2, FileText, ArrowLeftRight } from 'lucide-react';

interface TestResult {
  id: string;
  test_name: string;
  test_date: string;
  total_score: number | null;
  math_score: number | null;
  reading_writing_score: number | null;
  notes: string | null;
  notes_visible_to_student: boolean;
  pdf_url: string | null;
  score_type: string | null;
  act_english_score: number | null;
  act_reading_score: number | null;
  act_science_score: number | null;
  created_at: string;
}

export default async function StudentTestResultsPage() {
  const session = await auth();
  const userId = session!.user.id;

  const results = await sql`
    SELECT id, test_name, test_date, total_score, math_score, reading_writing_score,
           notes, notes_visible_to_student, pdf_url, score_type, act_english_score, act_reading_score, act_science_score, created_at
    FROM test_results
    WHERE student_id = ${userId}
    ORDER BY test_date DESC
  `;

  const rows = results as unknown as TestResult[];

  const bestSat = rows
    .filter(r => r.score_type === 'sat' && r.total_score != null)
    .sort((a, b) => (b.total_score ?? 0) - (a.total_score ?? 0))[0] ?? null;

  const bestAct = rows
    .filter(r => r.score_type === 'act' && r.total_score != null)
    .sort((a, b) => (b.total_score ?? 0) - (a.total_score ?? 0))[0] ?? null;

  const showComparison = bestSat != null || bestAct != null;

  let satEquivAct: number | null = null;
  let actEquivSat: number | null = null;
  let betterTest: 'sat' | 'act' | 'equal' | null = null;

  if (bestSat && bestAct) {
    satEquivAct = satToAct(bestSat.total_score!);
    actEquivSat = actToSat(bestAct.total_score!);
    const diff = (bestAct.total_score ?? 0) - satEquivAct;
    if (diff > 1) betterTest = 'act';
    else if (diff < -1) betterTest = 'sat';
    else betterTest = 'equal';
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="eyebrow-rose mb-3">Student Portal</div>
        <h1 className="portal-section-title">Test Results</h1>
        <p className="text-sm mt-2" style={{ color: 'var(--slate)' }}>
          Your practice test scores and progress over time.
        </p>
      </div>

      {/* SAT vs ACT Comparison */}
      {showComparison && (
        <div className="portal-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--rose-ultra)', border: '1px solid rgba(224,166,175,0.25)' }}
            >
              <ArrowLeftRight className="h-4 w-4" style={{ color: 'var(--rose-deeper)' }} />
            </div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--charcoal)' }}>
              SAT vs ACT Comparison
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            {/* SAT card */}
            <div
              className="rounded-xl p-4"
              style={{
                background: bestSat && betterTest === 'sat' ? 'rgba(224,166,175,0.15)' : 'var(--frost)',
                border: bestSat && betterTest === 'sat'
                  ? '1.5px solid rgba(224,166,175,0.5)'
                  : '1px solid var(--fog)',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--mist)' }}>SAT</span>
                {betterTest === 'sat' && (
                  <span
                    className="text-xs font-semibold rounded-full px-2.5 py-0.5"
                    style={{ background: 'var(--rose-ultra)', color: 'var(--rose-deeper)', border: '1px solid rgba(224,166,175,0.4)' }}
                  >
                    Stronger
                  </span>
                )}
              </div>
              {bestSat ? (
                <>
                  <p className="text-3xl font-bold mb-1" style={{ color: 'var(--charcoal)' }}>
                    {bestSat.total_score}
                    <span className="text-sm font-normal ml-1" style={{ color: 'var(--mist)' }}>/1600</span>
                  </p>
                  {satEquivAct != null && (
                    <p className="text-xs" style={{ color: 'var(--slate)' }}>
                      Equivalent ACT: <span className="font-semibold">{satEquivAct}</span>
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm" style={{ color: 'var(--mist)' }}>No SAT score on file yet.</p>
              )}
            </div>

            {/* ACT card */}
            <div
              className="rounded-xl p-4"
              style={{
                background: bestAct && betterTest === 'act' ? 'rgba(168,203,222,0.15)' : 'var(--frost)',
                border: bestAct && betterTest === 'act'
                  ? '1.5px solid rgba(168,203,222,0.5)'
                  : '1px solid var(--fog)',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--mist)' }}>ACT</span>
                {betterTest === 'act' && (
                  <span
                    className="text-xs font-semibold rounded-full px-2.5 py-0.5"
                    style={{ background: 'rgba(168,203,222,0.2)', color: 'var(--sky-deeper)', border: '1px solid rgba(168,203,222,0.4)' }}
                  >
                    Stronger
                  </span>
                )}
              </div>
              {bestAct ? (
                <>
                  <p className="text-3xl font-bold mb-1" style={{ color: 'var(--charcoal)' }}>
                    {bestAct.total_score}
                    <span className="text-sm font-normal ml-1" style={{ color: 'var(--mist)' }}>/36</span>
                  </p>
                  {actEquivSat != null && (
                    <p className="text-xs" style={{ color: 'var(--slate)' }}>
                      Equivalent SAT: <span className="font-semibold">{actEquivSat}</span>
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm" style={{ color: 'var(--mist)' }}>No ACT score on file yet.</p>
              )}
            </div>
          </div>

          {/* Recommendation banner */}
          <div
            className="rounded-lg px-4 py-3 text-sm"
            style={{ background: 'var(--frost)', border: '1px solid var(--fog)', color: 'var(--slate)' }}
          >
            {betterTest === 'sat' && bestSat && satEquivAct != null && bestAct && (
              <>
                Your SAT score of <strong>{bestSat.total_score}</strong> is equivalent to an ACT of <strong>{satEquivAct}</strong>, which is higher than your actual ACT score of <strong>{bestAct.total_score}</strong>. You&apos;re performing relatively stronger on the <strong>SAT</strong>.
              </>
            )}
            {betterTest === 'act' && bestAct && actEquivSat != null && bestSat && (
              <>
                Your ACT score of <strong>{bestAct.total_score}</strong> is equivalent to an SAT of <strong>{actEquivSat}</strong>, which is higher than your actual SAT score of <strong>{bestSat.total_score}</strong>. You&apos;re performing relatively stronger on the <strong>ACT</strong>.
              </>
            )}
            {betterTest === 'equal' && bestSat && bestAct && (
              <>
                Your SAT and ACT scores are roughly equivalent on the concordance scale. Both tests suit you equally well.
              </>
            )}
            {!bestSat && bestAct && (
              <>
                Once your SAT score is uploaded, this section will show you which test you&apos;re performing stronger on.
              </>
            )}
            {bestSat && !bestAct && (
              <>
                Once your ACT score is uploaded, this section will show you which test you&apos;re performing stronger on.
              </>
            )}
          </div>
        </div>
      )}

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
                    <span className="text-xs font-medium mt-0.5" style={{ color: 'var(--mist)' }}>{r.score_type === 'act' ? 'Composite' : 'Total'}</span>
                  </div>
                )}
              </div>

              {/* Score breakdown */}
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

              {/* Notes — only shown when admin has made them visible */}
              {r.notes && r.notes_visible_to_student && (
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
