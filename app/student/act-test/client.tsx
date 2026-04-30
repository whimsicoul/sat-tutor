'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import type { PastResult } from './page';

const SECTIONS = [
  { key: 'english',  label: 'English',  questions: 50, minutes: 35 },
  { key: 'math',     label: 'Math',     questions: 45, minutes: 50 },
  { key: 'reading',  label: 'Reading',  questions: 36, minutes: 40 },
  { key: 'science',  label: 'Science',  questions: 40, minutes: 40 },
] as const;

type SectionKey = typeof SECTIONS[number]['key'];

interface PageData {
  id: string;
  section: string;
  page_number: number;
  image_url: string;
}

interface BubblePosition {
  id: string;
  section: string;
  page_number: number;
  question_number: number;
  choice: string;
  x_percent: number;
  y_percent: number;
}

interface GradeResult {
  questionNumber: number;
  isCorrect: boolean;
  isScored: boolean;
  correctAnswer: string;
  reportingCategory: string | null;
}

type SubcategoryMap = Record<string, { correct: number; total: number }>;

type ViewState =
  | { mode: 'home' }
  | { mode: 'taking'; section: SectionKey; attemptId: string; startedAt: string; pages: PageData[]; bubbles: BubblePosition[] }
  | { mode: 'results'; section: SectionKey; score: number; total: number; scaleScore: number; subcategories: SubcategoryMap; results: GradeResult[]; answers: Record<number, string>; compositeScore: number | null };

const SUBCATEGORY_LABELS: Record<string, string> = {
  POW: 'Production of Writing',
  KLA: 'Knowledge of Language',
  CSE: 'Conventions of Standard English',
  IES: 'Integrating Essential Skills',
  A: 'Algebra',
  F: 'Functions',
  G: 'Geometry',
  N: 'Number & Quantity',
  S: 'Statistics & Probability',
  KID: 'Key Ideas & Details',
  CS: 'Craft & Structure',
  IKI: 'Integration of Knowledge & Ideas',
  IOD: 'Interpretation of Data',
  SIN: 'Scientific Investigation',
  EMI: 'Evaluation of Models & Inferences',
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getBestScoreForSection(section: string, pastResults: PastResult[]) {
  const sectionResults = pastResults.filter(r => r.section === section && r.total_questions > 0);
  if (!sectionResults.length) return null;
  return Math.max(...sectionResults.map(r => Math.round((r.correct_count / r.total_questions) * 100)));
}

export default function StudentActTestClient({ pastResults }: { pastResults: PastResult[] }) {
  const [view, setView] = useState<ViewState>({ mode: 'home' });
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Submit answers (called manually or when timer hits 0)
  const submitAnswers = useCallback(async (
    attemptId: string,
    section: SectionKey,
    currentAnswers: Record<number, string>
  ) => {
    stopTimer();
    setLoading(true);
    try {
      const payload = Object.entries(currentAnswers).map(([qn, ans]) => ({
        questionNumber: Number(qn),
        answer: ans,
      }));
      const res = await fetch('/api/act-test/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId, section, answers: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submit failed');
      setView({
        mode: 'results',
        section,
        score: data.score,
        total: data.total,
        scaleScore: data.scaleScore,
        subcategories: data.subcategories ?? {},
        results: data.results,
        answers: currentAnswers,
        compositeScore: data.compositeScore ?? null,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to submit');
    } finally {
      setLoading(false);
    }
  }, [stopTimer]);

  // Start timer when entering test mode
  useEffect(() => {
    if (view.mode !== 'taking') { stopTimer(); return; }
    const sectionMeta = SECTIONS.find(s => s.key === view.section)!;
    const limitSeconds = sectionMeta.minutes * 60;
    const elapsed = Math.floor((Date.now() - new Date(view.startedAt).getTime()) / 1000);
    const remaining = Math.max(0, limitSeconds - elapsed);
    setTimeLeft(remaining);

    if (remaining === 0) {
      submitAnswers(view.attemptId, view.section, answers);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          submitAnswers(view.attemptId, view.section, answers);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return stopTimer;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.mode]);

  async function handleStartSection(sectionKey: SectionKey) {
    setLoading(true);
    try {
      const startRes = await fetch('/api/act-test/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: sectionKey }),
      });
      const startData = await startRes.json();
      if (!startRes.ok) throw new Error(startData.error || 'Failed to start');

      const dataRes = await fetch(`/api/act-test/section-data?section=${sectionKey}`);
      const sectionData = await dataRes.json();
      if (!dataRes.ok) throw new Error(sectionData.error || 'Failed to load section data');

      setAnswers({});
      setView({
        mode: 'taking',
        section: sectionKey,
        attemptId: startData.attemptId,
        startedAt: startData.startedAt,
        pages: sectionData.pages,
        bubbles: sectionData.bubbles,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error starting section');
    } finally {
      setLoading(false);
    }
  }

  function handleBubbleClick(questionNumber: number, choice: string) {
    setAnswers(prev => ({ ...prev, [questionNumber]: choice }));
  }

  if (view.mode === 'home') {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 8px' }}>ACT Practice Test</h1>
          <p style={{ color: 'var(--muted-foreground, #666)', margin: 0 }}>
            Select a section to begin. Each section is timed to match the real ACT.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 40 }}>
          {SECTIONS.map(s => {
            const best = getBestScoreForSection(s.key, pastResults);
            return (
              <div
                key={s.key}
                style={{
                  border: '1px solid var(--border, #e2e8f0)',
                  borderRadius: 12,
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted-foreground, #666)' }}>
                    {s.questions} questions · {s.minutes} min
                  </div>
                </div>
                {best !== null && (
                  <div style={{ fontSize: 13, color: '#16a34a', fontWeight: 600 }}>
                    Best: {best}%
                  </div>
                )}
                <button
                  onClick={() => handleStartSection(s.key)}
                  disabled={loading}
                  style={{
                    background: 'var(--primary, #2563eb)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 0',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    fontSize: 14,
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  {loading ? 'Loading…' : 'Start'}
                </button>
              </div>
            );
          })}
        </div>

        {pastResults.length > 0 && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Past Attempts</h2>
            <div style={{ border: '1px solid var(--border, #e2e8f0)', borderRadius: 8, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: 'var(--muted, #f8fafc)' }}>
                    {['Section', 'Score', 'Date'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid var(--border, #e2e8f0)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pastResults.map(r => (
                    <tr key={r.attempt_id} style={{ borderBottom: '1px solid var(--border, #e2e8f0)' }}>
                      <td style={{ padding: '10px 16px', textTransform: 'capitalize' }}>{r.section}</td>
                      <td style={{ padding: '10px 16px' }}>
                        {r.correct_count}/{r.total_questions}
                        {r.total_questions > 0 && (
                          <span style={{ color: 'var(--muted-foreground, #666)', marginLeft: 6 }}>
                            ({Math.round((r.correct_count / r.total_questions) * 100)}%)
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 16px', color: 'var(--muted-foreground, #666)' }}>
                        {new Date(r.completed_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (view.mode === 'taking') {
    const sectionMeta = SECTIONS.find(s => s.key === view.section)!;
    const isLowTime = timeLeft <= 300;

    // Group bubbles by page
    const bubblesByPage = view.bubbles.reduce<Record<number, BubblePosition[]>>((acc, b) => {
      if (!acc[b.page_number]) acc[b.page_number] = [];
      acc[b.page_number].push(b);
      return acc;
    }, {});

    const totalAnswered = Object.keys(answers).length;
    const totalQuestions = sectionMeta.questions;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>
        {/* Sticky header */}
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'var(--background, #fff)',
          borderBottom: '1px solid var(--border, #e2e8f0)',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}>
          <div style={{ fontWeight: 700, fontSize: 16, textTransform: 'capitalize' }}>
            ACT — {view.section} ({sectionMeta.questions}Q)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 13, color: 'var(--muted-foreground, #666)' }}>
              {totalAnswered}/{totalQuestions} answered
            </span>
            <span style={{
              fontFamily: 'monospace',
              fontWeight: 700,
              fontSize: 18,
              color: isLowTime ? '#dc2626' : 'inherit',
            }}>
              {formatTime(timeLeft)}
            </span>
            <button
              onClick={() => submitAnswers(view.attemptId, view.section, answers)}
              disabled={loading}
              style={{
                background: '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 20px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </div>

        {/* Scrollable page content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {view.pages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted-foreground, #666)' }}>
              <p style={{ fontSize: 16, marginBottom: 8 }}>No pages uploaded for this section yet.</p>
              <p style={{ fontSize: 14 }}>An admin needs to upload page images before students can take this section.</p>
            </div>
          ) : (
            view.pages.map(page => (
              <div key={page.page_number} style={{ position: 'relative', marginBottom: 32, maxWidth: 900, margin: '0 auto 32px' }}>
                <img
                  src={page.image_url}
                  alt={`Page ${page.page_number}`}
                  style={{ width: '100%', display: 'block', borderRadius: 4, border: '1px solid var(--border, #e2e8f0)' }}
                />
                {/* Bubbles overlaid on image */}
                {(bubblesByPage[page.page_number] ?? []).map(bubble => {
                  const selected = answers[bubble.question_number] === bubble.choice;
                  return (
                    <button
                      key={bubble.id}
                      onClick={() => handleBubbleClick(bubble.question_number, bubble.choice)}
                      title={`Q${bubble.question_number} ${bubble.choice}`}
                      style={{
                        position: 'absolute',
                        left: `${bubble.x_percent}%`,
                        top: `${bubble.y_percent}%`,
                        transform: 'translate(-50%, -50%)',
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        border: selected ? '2px solid #2563eb' : '2px solid #94a3b8',
                        background: selected ? '#2563eb' : 'rgba(255,255,255,0.85)',
                        color: selected ? '#fff' : '#334155',
                        fontSize: 10,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                        lineHeight: 1,
                        boxShadow: selected ? '0 0 0 3px rgba(37,99,235,0.3)' : '0 1px 3px rgba(0,0,0,0.2)',
                        transition: 'all 0.1s',
                        zIndex: 2,
                      }}
                    >
                      {bubble.choice}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // Results view
  if (view.mode === 'results') {
    const sectionMeta = SECTIONS.find(s => s.key === view.section)!;
    const scaleColor = view.scaleScore >= 24 ? '#16a34a' : view.scaleScore >= 18 ? '#d97706' : '#dc2626';

    return (
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        {/* Composite banner */}
        {view.compositeScore !== null && (
          <div style={{
            background: 'rgba(37,99,235,0.08)',
            border: '1px solid rgba(37,99,235,0.25)',
            borderRadius: 10,
            padding: '14px 20px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <span style={{ fontSize: 22 }}>🎉</span>
            <div>
              <div style={{ fontWeight: 700, color: '#1d4ed8', fontSize: 15 }}>
                ACT Composite Score: {view.compositeScore} / 36
              </div>
              <div style={{ fontSize: 13, color: '#3b82f6', marginTop: 2 }}>
                All three required sections complete — score posted to your Test Results!
              </div>
            </div>
          </div>
        )}

        {/* Score card */}
        <div style={{
          border: '1px solid var(--border, #e2e8f0)',
          borderRadius: 12,
          padding: 32,
          marginBottom: 24,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 14, color: 'var(--muted-foreground, #666)', textTransform: 'capitalize', marginBottom: 8 }}>
            ACT {view.section} — Results
          </div>
          <div style={{ fontSize: 64, fontWeight: 800, color: scaleColor, lineHeight: 1 }}>
            {view.scaleScore}
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted-foreground, #666)', marginTop: 4 }}>
            Scale score (1–36)
          </div>
          <div style={{ fontSize: 16, color: 'var(--muted-foreground, #666)', marginTop: 8 }}>
            {view.score} / {view.total} scored questions correct
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
            <button
              onClick={() => setView({ mode: 'home' })}
              style={{
                background: 'var(--primary, #2563eb)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 24px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Back to Sections
            </button>
            <button
              onClick={() => handleStartSection(view.section)}
              disabled={loading}
              style={{
                background: 'transparent',
                color: 'var(--primary, #2563eb)',
                border: '1px solid var(--primary, #2563eb)',
                borderRadius: 8,
                padding: '10px 24px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              Retake
            </button>
          </div>
        </div>

        {/* Subcategory breakdown */}
        {Object.keys(view.subcategories).length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Score by Category</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {Object.entries(view.subcategories).map(([cat, { correct, total }]) => {
                const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
                const color = pct >= 70 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626';
                return (
                  <div key={cat} style={{
                    border: '1px solid var(--border, #e2e8f0)',
                    borderRadius: 8,
                    padding: '10px 16px',
                    minWidth: 160,
                    flex: '1 1 160px',
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground, #888)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                      {cat}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted-foreground, #666)', marginBottom: 6 }}>
                      {SUBCATEGORY_LABELS[cat] ?? cat}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 16, color }}>
                      {correct}/{total}
                      <span style={{ fontWeight: 400, fontSize: 13, color: 'var(--muted-foreground, #666)', marginLeft: 6 }}>
                        ({pct}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Per-question breakdown */}
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Answer Review</h2>
        <div style={{ border: '1px solid var(--border, #e2e8f0)', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: 'var(--muted, #f8fafc)' }}>
                {['Q#', 'Your Answer', 'Correct', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid var(--border, #e2e8f0)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: sectionMeta.questions }, (_, i) => i + 1).map(qn => {
                const result = view.results.find(r => r.questionNumber === qn);
                const isScored = result?.isScored ?? true;
                const studentAns = view.answers[qn] ?? '–';
                const correct = isScored ? (result?.correctAnswer ?? '?') : '—';
                const isCorrect = result?.isCorrect ?? false;
                const unanswered = !view.answers[qn];
                return (
                  <tr key={qn} style={{
                    borderBottom: '1px solid var(--border, #e2e8f0)',
                    background: !isScored ? 'rgba(148,163,184,0.05)' : unanswered ? 'transparent' : isCorrect ? 'rgba(22,163,74,0.05)' : 'rgba(220,38,38,0.05)',
                  }}>
                    <td style={{ padding: '8px 16px', fontWeight: 600, color: !isScored ? 'var(--muted-foreground, #999)' : 'inherit' }}>{qn}</td>
                    <td style={{ padding: '8px 16px', color: !isScored ? 'var(--muted-foreground, #999)' : unanswered ? 'var(--muted-foreground, #666)' : isCorrect ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                      {unanswered ? '–' : studentAns}
                    </td>
                    <td style={{ padding: '8px 16px', color: !isScored ? 'var(--muted-foreground, #999)' : 'inherit' }}>{correct}</td>
                    <td style={{ padding: '8px 16px' }}>
                      {!isScored
                        ? <span style={{ fontSize: 11, color: 'var(--muted-foreground, #999)', fontStyle: 'italic' }}>Not Scored</span>
                        : unanswered ? '–'
                        : isCorrect
                          ? <span style={{ color: '#16a34a', fontSize: 16 }}>✓</span>
                          : <span style={{ color: '#dc2626', fontSize: 16 }}>✗</span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return null;
}
