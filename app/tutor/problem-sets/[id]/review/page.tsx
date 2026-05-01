import { auth } from '@/lib/auth';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle, MinusCircle } from 'lucide-react';
import { getProblemSetById, getProblemSetResponsesForReview } from '@/lib/db';

const CHOICES = ['A', 'B', 'C', 'D'] as const;
type Choice = (typeof CHOICES)[number];

function choiceText(row: ReviewRow, c: Choice): string {
  return { A: row.choice_a, B: row.choice_b, C: row.choice_c, D: row.choice_d }[c];
}

interface ReviewRow {
  question_number: number;
  stem: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  passage: string | null;
  selected_answer: string | null;
  eliminated_choices: string[] | null;
  correct_answer: string | null;
}

export default async function TutorProblemSetReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ studentId?: string }>;
}) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || (role !== 'tutor' && role !== 'admin')) notFound();

  const { id } = await params;
  const { studentId } = await searchParams;

  const ps = await getProblemSetById(id);
  if (!ps) notFound();
  if (role === 'tutor' && ps.tutor_id !== session.user.id) notFound();

  const effectiveStudentId = studentId ?? (ps.student_id as string);
  const rows = (await getProblemSetResponsesForReview(id, effectiveStudentId)) as unknown as ReviewRow[];

  const hasAnswerKey = rows.some((r) => r.correct_answer !== null);
  const answeredRows = rows.filter((r) => r.selected_answer !== null);
  const correctRows = hasAnswerKey ? answeredRows.filter((r) => r.selected_answer === r.correct_answer) : [];

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <Link
          href="/tutor/problem-sets"
          className="inline-flex items-center gap-1.5 text-xs font-semibold mb-4 transition-colors"
          style={{ color: 'var(--mist)', textDecoration: 'none' }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Problem Sets
        </Link>
        <div className="eyebrow-sky mb-2">Tutor Portal · Review</div>
        <h1 className="portal-section-title">{ps.title as string}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--slate)' }}>
          Student: {ps.student_name as string}
        </p>
      </div>

      {/* Score summary */}
      <div
        className="portal-card p-5 flex items-center gap-6 flex-wrap"
        style={{ borderColor: 'rgba(168,203,222,0.3)', background: 'rgba(168,203,222,0.06)' }}
      >
        <div className="text-center">
          <p className="text-2xl font-bold" style={{ color: 'var(--charcoal)' }}>
            {answeredRows.length}<span className="text-base font-normal text-gray-400"> / {rows.length}</span>
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--mist)' }}>Questions answered</p>
        </div>

        {hasAnswerKey && (
          <>
            <div className="w-px h-10 self-stretch" style={{ background: 'var(--fog)' }} />
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: '#15803d' }}>
                {correctRows.length}<span className="text-base font-normal text-gray-400"> / {answeredRows.length}</span>
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--mist)' }}>Correct</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: 'var(--rose-deeper)' }}>
                {answeredRows.length - correctRows.length}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--mist)' }}>Incorrect</p>
            </div>
          </>
        )}

        {!hasAnswerKey && (
          <p className="text-xs" style={{ color: 'var(--mist)' }}>
            No answer key uploaded — showing student selections only.
          </p>
        )}
      </div>

      {/* Per-question breakdown */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--mist)' }}>
          Question Breakdown
        </h2>

        {rows.length === 0 && (
          <div className="portal-card py-12 text-center">
            <p className="text-sm" style={{ color: 'var(--mist)' }}>No questions extracted for this problem set.</p>
          </div>
        )}

        {rows.map((row) => {
          const isAnswered = row.selected_answer !== null;
          const isCorrect = hasAnswerKey && isAnswered && row.selected_answer === row.correct_answer;
          const isWrong = hasAnswerKey && isAnswered && row.selected_answer !== row.correct_answer;
          const eliminated = (row.eliminated_choices ?? []) as string[];

          let borderColor = 'var(--fog)';
          if (isCorrect) borderColor = 'rgba(22,163,74,0.3)';
          else if (isWrong) borderColor = 'rgba(224,166,175,0.4)';

          return (
            <div
              key={row.question_number}
              className="portal-card p-5"
              style={{ border: `1px solid ${borderColor}` }}
            >
              <div className="flex items-start gap-3">
                {/* Status icon */}
                <div className="shrink-0 mt-0.5">
                  {!isAnswered && <MinusCircle className="h-5 w-5" style={{ color: 'var(--cloud)' }} />}
                  {isCorrect && <CheckCircle className="h-5 w-5" style={{ color: '#16a34a' }} />}
                  {isWrong && <XCircle className="h-5 w-5" style={{ color: 'var(--rose-deeper)' }} />}
                  {isAnswered && !hasAnswerKey && (
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: 'rgba(168,203,222,0.2)', color: 'var(--sky-deeper)' }}
                    >
                      {row.selected_answer}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--mist)' }}>
                    Q{row.question_number}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--charcoal)' }}>
                    {row.stem}
                  </p>

                  {/* Choices */}
                  <div className="mt-3 grid grid-cols-2 gap-1.5">
                    {CHOICES.map((c) => {
                      const isSelected = row.selected_answer === c;
                      const isCorrectChoice = hasAnswerKey && row.correct_answer === c;
                      const isEliminated = eliminated.includes(c);

                      let bg = 'transparent';
                      let border = '1px solid var(--fog)';
                      let textCol = 'var(--charcoal)';

                      if (isCorrectChoice) { bg = 'rgba(22,163,74,0.08)'; border = '1px solid rgba(22,163,74,0.3)'; textCol = '#15803d'; }
                      else if (isSelected && !isCorrectChoice) { bg = 'rgba(224,166,175,0.12)'; border = '1px solid rgba(224,166,175,0.4)'; textCol = 'var(--rose-deeper)'; }

                      return (
                        <div
                          key={c}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
                          style={{ background: bg, border }}
                        >
                          <span
                            className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                            style={{ background: 'var(--fog)', color: textCol }}
                          >
                            {c}
                          </span>
                          <span
                            className="text-xs truncate"
                            style={{
                              color: textCol,
                              fontWeight: isSelected || isCorrectChoice ? 600 : 400,
                              textDecoration: isEliminated && !isSelected ? 'line-through' : 'none',
                              opacity: isEliminated && !isSelected ? 0.5 : 1,
                            }}
                          >
                            {choiceText(row, c)}
                          </span>
                          {isSelected && (
                            <span className="shrink-0 ml-auto text-xs" style={{ color: textCol }}>
                              ← student
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {!isAnswered && (
                    <p className="text-xs mt-2" style={{ color: 'var(--cloud)' }}>Not yet answered</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
