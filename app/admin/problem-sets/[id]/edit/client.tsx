'use client';

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { UploadButton } from '@uploadthing/react';
import type { OurFileRouter } from '@/lib/uploadthing';
import {
  ArrowLeft, Plus, Pencil, Trash2, Image as ImageIcon, X, Check,
  ChevronLeft, ChevronRight, MapPin, Key,
} from 'lucide-react';
import type { PsQuestion, PsPage, PsPosition, PsAnswerKeyEntry } from './page';

// ── Crop sub-components (mirrors breakfast problem editor) ────────────────────

function CroppedPreview({
  imageUrl, imageWidthPx, imageHeightPx, cropTop, cropBottom,
}: { imageUrl: string; imageWidthPx: number; imageHeightPx: number; cropTop: number; cropBottom: number }) {
  const w = imageWidthPx || 1836;
  const h = imageHeightPx || 1134;
  const top = Math.max(0, cropTop);
  const bottom = Math.max(0, cropBottom);
  const visibleHeight = Math.max(1, h - top - bottom);
  return (
    <div className="w-full rounded border overflow-hidden relative" style={{ borderColor: 'var(--fog)', aspectRatio: `${w} / ${visibleHeight}` }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt="Cropped preview" className="absolute left-0 w-full"
        style={{ top: 0, transform: `translateY(-${(top / h * 100).toFixed(4)}%)` }} />
    </div>
  );
}

function FullImageWithLines({
  imageUrl, imageHeightPx, cropTop, cropBottom,
}: { imageUrl: string; imageHeightPx: number; cropTop: number; cropBottom: number }) {
  const h = imageHeightPx || 1134;
  const topPct = (Math.max(0, cropTop) / h * 100).toFixed(2) + '%';
  const bottomPct = (Math.max(0, cropBottom) / h * 100).toFixed(2) + '%';
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt="Full image" style={{ width: '100%', display: 'block', borderRadius: 4 }} />
      <div style={{ position: 'absolute', top: topPct, left: 0, right: 0, height: 2, background: 'rgba(77,143,174,0.85)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: bottomPct, left: 0, right: 0, height: 2, background: 'rgba(224,166,175,0.85)', pointerEvents: 'none' }} />
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

type EditorTab = 'questions' | 'pages' | 'answerkey';

interface QuestionDraft {
  question_number: number;
  stem: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  passage: string;
  question_image_url: string;
  crop_top_px: number;
  crop_bottom_px: number;
  image_width_px: number;
  image_height_px: number;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  borderRadius: '0.5rem',
  fontSize: '0.8125rem',
  border: '1px solid var(--fog)',
  background: 'var(--white)',
  color: 'var(--charcoal)',
  fontFamily: "'Syne', sans-serif",
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.6875rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--mist)',
  marginBottom: '0.375rem',
};

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ProblemSetEditorClient({
  problemSet,
  initialQuestions,
  initialPages,
  initialPositions,
  initialAnswerKey,
}: {
  problemSet: { id: string; title: string; questionCount: number; extractionStatus: string; answerKeyStatus: string };
  initialQuestions: PsQuestion[];
  initialPages: PsPage[];
  initialPositions: PsPosition[];
  initialAnswerKey: PsAnswerKeyEntry[];
}) {
  const [tab, setTab] = useState<EditorTab>('questions');
  const [questions, setQuestions] = useState<PsQuestion[]>(initialQuestions);
  const [pages, setPages] = useState<PsPage[]>(initialPages);
  const [positions, setPositions] = useState<PsPosition[]>(initialPositions);
  const [answerKey, setAnswerKey] = useState<PsAnswerKeyEntry[]>(initialAnswerKey);

  // ── Question edit modal state ─────────────────────────────────────────────
  const [editingQuestion, setEditingQuestion] = useState<PsQuestion | null>(null);
  const [isNewQuestion, setIsNewQuestion] = useState(false);
  const [draft, setDraft] = useState<QuestionDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingCrop, setSavingCrop] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // ── Bubble placement state ────────────────────────────────────────────────
  const [activePage, setActivePage] = useState<number>(1);
  const [placingQuestion, setPlacingQuestion] = useState<number | null>(null);

  // ── Answer key edit state ─────────────────────────────────────────────────
  const [keyEdits, setKeyEdits] = useState<Record<number, string>>({});
  const [savingKey, setSavingKey] = useState(false);

  const psId = problemSet.id;

  // ─────────────────────────────────────────────────────────────────────────
  // TAB 1: QUESTIONS
  // ─────────────────────────────────────────────────────────────────────────

  function openNewQuestion() {
    const nextNum = questions.length > 0 ? Math.max(...questions.map(q => q.question_number)) + 1 : 1;
    setIsNewQuestion(true);
    setEditingQuestion(null);
    setDraft({
      question_number: nextNum,
      stem: '', choice_a: '', choice_b: '', choice_c: '', choice_d: '',
      passage: '', question_image_url: '', crop_top_px: 0, crop_bottom_px: 0,
      image_width_px: 0, image_height_px: 0,
    });
  }

  function openEditQuestion(q: PsQuestion) {
    setIsNewQuestion(false);
    setEditingQuestion(q);
    setDraft({
      question_number: q.question_number,
      stem: q.stem,
      choice_a: q.choice_a,
      choice_b: q.choice_b,
      choice_c: q.choice_c,
      choice_d: q.choice_d,
      passage: q.passage ?? '',
      question_image_url: q.question_image_url ?? '',
      crop_top_px: q.crop_top_px ?? 0,
      crop_bottom_px: q.crop_bottom_px ?? 0,
      image_width_px: q.image_width_px ?? 0,
      image_height_px: q.image_height_px ?? 0,
    });
  }

  function closeModal() {
    setEditingQuestion(null);
    setDraft(null);
    setIsNewQuestion(false);
  }

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    if (!draft) return;
    const img = e.currentTarget;
    setDraft(d => d ? { ...d, image_width_px: img.naturalWidth, image_height_px: img.naturalHeight } : d);
  }

  async function handleSaveQuestion() {
    if (!draft) return;
    if (!draft.stem || !draft.choice_a || !draft.choice_b || !draft.choice_c || !draft.choice_d) {
      toast.error('Fill in the question stem and all four choices.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        stem: draft.stem,
        choice_a: draft.choice_a,
        choice_b: draft.choice_b,
        choice_c: draft.choice_c,
        choice_d: draft.choice_d,
        passage: draft.passage || null,
        question_image_url: draft.question_image_url || null,
        crop_top_px: draft.question_image_url ? draft.crop_top_px : null,
        crop_bottom_px: draft.question_image_url ? draft.crop_bottom_px : null,
        image_width_px: draft.question_image_url ? draft.image_width_px : null,
        image_height_px: draft.question_image_url ? draft.image_height_px : null,
      };

      if (isNewQuestion) {
        const res = await fetch(`/api/admin/problem-sets/${psId}/questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionNumber: draft.question_number, ...payload }),
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
        const { question } = await res.json() as { question: PsQuestion };
        setQuestions(prev => [...prev.filter(q => q.question_number !== question.question_number), question]
          .sort((a, b) => a.question_number - b.question_number));
        toast.success(`Question ${question.question_number} added.`);
      } else if (editingQuestion) {
        const res = await fetch(`/api/admin/problem-sets/${psId}/questions/${editingQuestion.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
        const { question } = await res.json() as { question: PsQuestion };
        setQuestions(prev => prev.map(q => q.id === question.id ? question : q));
        toast.success(`Question ${question.question_number} saved.`);
      }
      closeModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveCrop() {
    if (!draft || !editingQuestion) return;
    setSavingCrop(true);
    try {
      const res = await fetch(`/api/admin/problem-sets/${psId}/questions/${editingQuestion.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crop_top_px: draft.crop_top_px,
          crop_bottom_px: draft.crop_bottom_px,
          image_width_px: draft.image_width_px,
          image_height_px: draft.image_height_px,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      const { question } = await res.json() as { question: PsQuestion };
      setQuestions(prev => prev.map(q => q.id === question.id ? question : q));
      setEditingQuestion(question);
      toast.success('Crop saved.');
    } catch {
      toast.error('Failed to save crop.');
    } finally {
      setSavingCrop(false);
    }
  }

  async function handleDeleteQuestion(q: PsQuestion) {
    if (!confirm(`Delete Question ${q.question_number}? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/problem-sets/${psId}/questions/${q.id}`, { method: 'DELETE' });
    if (!res.ok) { toast.error('Delete failed.'); return; }
    setQuestions(prev => prev.filter(x => x.id !== q.id));
    toast.success(`Question ${q.question_number} deleted.`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TAB 2: PAGE IMAGES + BUBBLE PLACEMENT
  // ─────────────────────────────────────────────────────────────────────────

  async function handleDeletePage(pageId: string, pageNumber: number) {
    if (!confirm(`Delete page ${pageNumber}?`)) return;
    const res = await fetch(`/api/admin/problem-sets/${psId}/pages`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageId }),
    });
    if (!res.ok) { toast.error('Delete failed.'); return; }
    setPages(prev => prev.filter(p => p.id !== pageId));
    toast.success('Page deleted.');
  }

  const handleImageClick = useCallback(async (e: React.MouseEvent<HTMLDivElement>, pageNumber: number) => {
    if (placingQuestion === null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((e.clientY - rect.top) / rect.height) * 100;

    const res = await fetch(`/api/admin/problem-sets/${psId}/positions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionNumber: placingQuestion, pageNumber, xPercent, yPercent }),
    });
    if (!res.ok) { toast.error('Failed to place marker.'); return; }
    const { position } = await res.json() as { position: PsPosition };
    setPositions(prev => [...prev.filter(p => p.question_number !== placingQuestion), position]);
    toast.success(`Placed Q${placingQuestion}`);

    // Auto-advance to next question
    const nextQ = placingQuestion + 1;
    const maxQ = questions.length > 0 ? Math.max(...questions.map(q => q.question_number)) : placingQuestion;
    setPlacingQuestion(nextQ <= maxQ ? nextQ : null);
  }, [placingQuestion, psId, questions]);

  async function handleDeletePosition(positionId: string, qNum: number) {
    const res = await fetch(`/api/admin/problem-sets/${psId}/positions`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ positionId }),
    });
    if (!res.ok) { toast.error('Failed to remove marker.'); return; }
    setPositions(prev => prev.filter(p => p.id !== positionId));
    toast.success(`Removed marker for Q${qNum}`);
  }

  const activePageData = pages.find(p => p.page_number === activePage);
  const positionsOnActivePage = positions.filter(p => p.page_number === activePage);

  // ─────────────────────────────────────────────────────────────────────────
  // TAB 3: ANSWER KEY
  // ─────────────────────────────────────────────────────────────────────────

  function getKeyValue(qNum: number): string {
    if (qNum in keyEdits) return keyEdits[qNum];
    return answerKey.find(k => k.question_number === qNum)?.correct_answer ?? '';
  }

  async function handleSaveAnswerKey() {
    const entries = questions.map(q => ({
      questionNumber: q.question_number,
      correctAnswer: getKeyValue(q.question_number),
    })).filter(e => /^[A-D]$/i.test(e.correctAnswer));

    if (entries.length === 0) { toast.error('No valid answers to save.'); return; }
    setSavingKey(true);
    try {
      const res = await fetch(`/api/admin/problem-sets/${psId}/answer-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
      const saved = entries.map(e => ({ question_number: e.questionNumber, correct_answer: e.correctAnswer.toUpperCase() }));
      setAnswerKey(prev => {
        const untouched = prev.filter(k => !entries.some(e => e.questionNumber === k.question_number));
        return [...untouched, ...saved].sort((a, b) => a.question_number - b.question_number);
      });
      setKeyEdits({});
      toast.success(`Saved ${entries.length} answers.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSavingKey(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 18px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "'Syne', sans-serif",
    border: 'none',
    cursor: 'pointer',
    background: active ? 'var(--rose)' : 'var(--frost)',
    color: active ? 'var(--charcoal)' : 'var(--mist)',
    transition: 'all 0.15s',
  });

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <Link href="/admin/problem-sets" style={{ textDecoration: 'none' }}>
        <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--fog)', background: 'var(--frost)', cursor: 'pointer', fontSize: 13, color: 'var(--slate)', marginBottom: 20, fontFamily: "'Syne', sans-serif" }}>
          <ArrowLeft size={14} /> Back to Problem Sets
        </button>
      </Link>

      <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 4 }}>
        Edit: {problemSet.title}
      </h1>
      <p style={{ color: 'var(--mist)', fontSize: 13, marginBottom: 28 }}>
        {questions.length} questions · {positions.length} positioned · answer key {problemSet.answerKeyStatus === 'done' ? 'ready' : 'not set'}
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
        <button style={tabStyle(tab === 'questions')} onClick={() => setTab('questions')}>Questions</button>
        <button style={tabStyle(tab === 'pages')} onClick={() => setTab('pages')}>Page Images</button>
        <button style={tabStyle(tab === 'answerkey')} onClick={() => setTab('answerkey')}>Answer Key</button>
      </div>

      {/* ── TAB 1: QUESTIONS ─────────────────────────────────────────────── */}
      {tab === 'questions' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--mist)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              All Questions ({questions.length})
            </h2>
            <button
              onClick={openNewQuestion}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--rose)', color: 'var(--charcoal)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Syne', sans-serif" }}
            >
              <Plus size={14} /> Add Question
            </button>
          </div>

          {questions.length === 0 && (
            <div className="portal-card" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--mist)', fontSize: 13 }}>
              No questions yet. Click "Add Question" or upload a problem set PDF to auto-extract.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {questions.map(q => (
              <div key={q.id} className="portal-card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(224,166,175,0.14)', border: '1px solid rgba(224,166,175,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--rose-deeper)', flexShrink: 0 }}>
                  {q.question_number}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--charcoal)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {q.stem || <span style={{ color: 'var(--cloud)', fontStyle: 'italic' }}>No stem</span>}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--mist)', marginTop: 2 }}>
                    {q.question_image_url ? '📷 Image question' : `A: ${q.choice_a.slice(0, 30)}…`}
                  </p>
                </div>
                {positions.some(p => p.question_number === q.question_number) && (
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#15803d', background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.2)', padding: '2px 7px', borderRadius: 12 }}>positioned</span>
                )}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => openEditQuestion(q)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(168,203,222,0.4)', background: 'rgba(168,203,222,0.1)', color: 'var(--sky-deeper)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Syne', sans-serif" }}>
                    <Pencil size={12} /> Edit
                  </button>
                  <button onClick={() => handleDeleteQuestion(q)} style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid transparent', background: 'transparent', color: 'var(--cloud)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#991B1B'; e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.borderColor = '#FECACA'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--cloud)'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 2: PAGE IMAGES + BUBBLE PLACEMENT ────────────────────────── */}
      {tab === 'pages' && (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 24 }}>
          {/* Left panel: upload + page list */}
          <div>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--mist)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
              Pages ({pages.length})
            </h2>

            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: 'var(--slate)', marginBottom: 8 }}>
                Upload a page image, then click on it to mark where each question appears.
              </p>
              <div style={{ border: '2px dashed rgba(168,203,222,0.4)', borderRadius: 10, padding: 12, background: 'rgba(168,203,222,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <p style={{ fontSize: 11, color: 'var(--mist)', textAlign: 'center' }}>Upload image + enter page number</p>
                <UploadButton<OurFileRouter, 'imageUploader'>
                  endpoint="imageUploader"
                  onClientUploadComplete={async (res) => {
                    if (!res[0]) return;
                    const pageNum = parseInt(prompt('Page number for this image?') ?? '0', 10);
                    if (!pageNum || pageNum < 1) { toast.error('Invalid page number.'); return; }
                    const r = await fetch(`/api/admin/problem-sets/${psId}/pages`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ pageNumber: pageNum, imageUrl: res[0].ufsUrl }),
                    });
                    if (!r.ok) { toast.error('Failed to save page.'); return; }
                    const { page } = await r.json() as { page: PsPage };
                    setPages(prev => [...prev.filter(p => p.page_number !== page.page_number), page].sort((a, b) => a.page_number - b.page_number));
                    setActivePage(page.page_number);
                    toast.success(`Page ${page.page_number} uploaded.`);
                  }}
                  onUploadError={e => { toast.error(`Upload error: ${e.message}`); }}
                  appearance={{ button: 'bg-[#A8CBDE] text-[#1A1D23] text-xs font-semibold py-2 px-4 rounded-lg font-[Syne]' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {pages.map(p => (
                <div key={p.id} onClick={() => setActivePage(p.page_number)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${activePage === p.page_number ? 'rgba(224,166,175,0.5)' : 'var(--fog)'}`, background: activePage === p.page_number ? 'rgba(224,166,175,0.08)' : 'var(--white)' }}>
                  <ImageIcon size={13} style={{ color: 'var(--mist)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--charcoal)', flex: 1 }}>Page {p.page_number}</span>
                  <span style={{ fontSize: 10, color: '#15803d', fontWeight: 600 }}>
                    {positions.filter(pos => pos.page_number === p.page_number).length}Q
                  </span>
                  <button onClick={e => { e.stopPropagation(); handleDeletePage(p.id, p.page_number); }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--cloud)', padding: 2, display: 'flex', alignItems: 'center' }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              {pages.length === 0 && <p style={{ fontSize: 12, color: 'var(--cloud)', textAlign: 'center', padding: 12 }}>No pages yet.</p>}
            </div>

            {/* Question selector for placement */}
            {pages.length > 0 && (
              <div style={{ marginTop: 20, padding: 12, borderRadius: 10, border: '1px solid var(--fog)', background: 'var(--frost)' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--mist)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  Place Question
                </p>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    type="number"
                    min={1}
                    value={placingQuestion ?? ''}
                    onChange={e => setPlacingQuestion(parseInt(e.target.value) || null)}
                    placeholder="Q#"
                    style={{ ...inputStyle, width: 60 }}
                  />
                  <button
                    onClick={() => setPlacingQuestion(null)}
                    style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--fog)', background: 'var(--white)', fontSize: 12, cursor: 'pointer', color: 'var(--slate)', fontFamily: "'Syne', sans-serif" }}
                  >
                    Cancel
                  </button>
                </div>
                {placingQuestion !== null && (
                  <p style={{ fontSize: 11, color: 'var(--rose-deeper)', marginTop: 6, fontWeight: 600 }}>
                    Click on the image to place Q{placingQuestion}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right panel: image + overlay */}
          <div>
            {activePageData ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <button onClick={() => setActivePage(p => Math.max(1, p - 1))} disabled={activePage <= 1} style={{ border: '1px solid var(--fog)', background: 'var(--frost)', borderRadius: 6, padding: '4px 8px', cursor: activePage <= 1 ? 'not-allowed' : 'pointer' }}>
                    <ChevronLeft size={14} />
                  </button>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--charcoal)' }}>Page {activePage}</span>
                  <button onClick={() => setActivePage(p => Math.min(pages[pages.length - 1]?.page_number ?? 1, p + 1))} style={{ border: '1px solid var(--fog)', background: 'var(--frost)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>
                    <ChevronRight size={14} />
                  </button>
                </div>

                {/* Clickable image with overlaid position markers */}
                <div
                  onClick={e => handleImageClick(e, activePage)}
                  style={{ position: 'relative', width: '100%', cursor: placingQuestion !== null ? 'crosshair' : 'default', border: `2px solid ${placingQuestion !== null ? 'rgba(224,166,175,0.6)' : 'var(--fog)'}`, borderRadius: 8, overflow: 'hidden' }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={activePageData.image_url} alt={`Page ${activePage}`} style={{ width: '100%', display: 'block' }} />

                  {/* Position markers */}
                  {positionsOnActivePage.map(pos => (
                    <div
                      key={pos.id}
                      style={{
                        position: 'absolute',
                        left: `${pos.x_percent}%`,
                        top: `${pos.y_percent}%`,
                        transform: 'translate(-50%, -50%)',
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        background: 'rgba(224,166,175,0.9)',
                        border: '2px solid white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        fontWeight: 700,
                        color: 'var(--charcoal)',
                        cursor: 'pointer',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                        zIndex: 10,
                      }}
                      onClick={e => { e.stopPropagation(); handleDeletePosition(pos.id, pos.question_number); }}
                      title={`Q${pos.question_number} — click to remove`}
                    >
                      {pos.question_number}
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: 'var(--mist)', marginTop: 6 }}>
                  {placingQuestion !== null
                    ? `Click to place Q${placingQuestion}. Click an existing marker to remove it.`
                    : 'Select a question number on the left, then click to place it on the image.'}
                </p>
              </div>
            ) : (
              <div className="portal-card" style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--mist)', fontSize: 13 }}>
                {pages.length === 0 ? 'Upload a page image to get started.' : 'Select a page on the left.'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: ANSWER KEY ────────────────────────────────────────────── */}
      {tab === 'answerkey' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--mist)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Answer Key
            </h2>
            <button
              onClick={handleSaveAnswerKey}
              disabled={savingKey}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none', background: savingKey ? 'var(--fog)' : 'var(--rose)', color: savingKey ? 'var(--cloud)' : 'var(--charcoal)', fontSize: 13, fontWeight: 600, cursor: savingKey ? 'not-allowed' : 'pointer', fontFamily: "'Syne', sans-serif" }}
            >
              <Key size={14} />
              {savingKey ? 'Saving…' : 'Save Answer Key'}
            </button>
          </div>

          {questions.length === 0 ? (
            <div className="portal-card" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--mist)', fontSize: 13 }}>
              Add questions first, then set their correct answers here.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
              {questions.map(q => {
                const val = getKeyValue(q.question_number);
                const isSet = /^[A-D]$/i.test(val);
                const isDirty = q.question_number in keyEdits;
                return (
                  <div key={q.question_number} style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${isDirty ? 'rgba(224,166,175,0.5)' : isSet ? 'rgba(22,163,74,0.3)' : 'var(--fog)'}`, background: isDirty ? 'rgba(224,166,175,0.06)' : isSet ? 'rgba(22,163,74,0.04)' : 'var(--white)' }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--mist)', marginBottom: 6 }}>Q{q.question_number}</p>
                    <input
                      value={val}
                      maxLength={1}
                      onChange={e => setKeyEdits(prev => ({ ...prev, [q.question_number]: e.target.value.toUpperCase() }))}
                      placeholder="—"
                      style={{ ...inputStyle, textAlign: 'center', fontWeight: 700, fontSize: 16, padding: '6px', color: isSet ? '#15803d' : 'var(--charcoal)' }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── QUESTION EDIT MODAL ───────────────────────────────────────────── */}
      {draft && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div style={{ background: 'var(--white)', borderRadius: 16, width: '100%', maxWidth: 860, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid var(--fog)' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--charcoal)', fontFamily: "'Cormorant Garamond', serif" }}>
                {isNewQuestion ? 'Add Question' : `Edit Question ${editingQuestion?.question_number}`}
              </h2>
              <button onClick={closeModal} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--mist)', display: 'flex' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: 24 }}>
              {/* Question number (new only) */}
              {isNewQuestion && (
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Question Number</label>
                  <input type="number" min={1} value={draft.question_number}
                    onChange={e => setDraft(d => d ? { ...d, question_number: parseInt(e.target.value) || 1 } : d)}
                    style={{ ...inputStyle, width: 100 }} />
                </div>
              )}

              {/* Two-column layout when image exists */}
              {draft.question_image_url ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  {/* Left: crop tool */}
                  <div>
                    <p style={labelStyle}>Preview (cropped)</p>
                    <CroppedPreview
                      imageUrl={draft.question_image_url}
                      imageWidthPx={draft.image_width_px}
                      imageHeightPx={draft.image_height_px}
                      cropTop={draft.crop_top_px}
                      cropBottom={draft.crop_bottom_px}
                    />
                    <div style={{ marginTop: 12 }}>
                      <FullImageWithLines
                        imageUrl={draft.question_image_url}
                        imageHeightPx={draft.image_height_px}
                        cropTop={draft.crop_top_px}
                        cropBottom={draft.crop_bottom_px}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                      <div>
                        <label style={labelStyle}>Crop Top (px)</label>
                        <input type="number" min={0} value={draft.crop_top_px}
                          onChange={e => setDraft(d => d ? { ...d, crop_top_px: Math.max(0, parseInt(e.target.value) || 0) } : d)}
                          style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Crop Bottom (px)</label>
                        <input type="number" min={0} value={draft.crop_bottom_px}
                          onChange={e => setDraft(d => d ? { ...d, crop_bottom_px: Math.max(0, parseInt(e.target.value) || 0) } : d)}
                          style={inputStyle} />
                      </div>
                    </div>
                    {!isNewQuestion && (
                      <button onClick={handleSaveCrop} disabled={savingCrop} style={{ marginTop: 10, width: '100%', padding: '8px', borderRadius: 8, border: 'none', background: 'rgba(168,203,222,0.2)', color: 'var(--sky-deeper)', fontSize: 12, fontWeight: 600, cursor: savingCrop ? 'not-allowed' : 'pointer', fontFamily: "'Syne', sans-serif" }}>
                        {savingCrop ? 'Saving…' : 'Save Crop Only'}
                      </button>
                    )}
                    <button onClick={() => setDraft(d => d ? { ...d, question_image_url: '', crop_top_px: 0, crop_bottom_px: 0, image_width_px: 0, image_height_px: 0 } : d)}
                      style={{ marginTop: 6, width: '100%', padding: '6px', borderRadius: 8, border: '1px solid var(--fog)', background: 'transparent', color: 'var(--cloud)', fontSize: 12, cursor: 'pointer', fontFamily: "'Syne', sans-serif" }}>
                      Remove Image
                    </button>
                    {/* Hidden img to capture natural dimensions */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img ref={imageRef} src={draft.question_image_url} alt="" style={{ display: 'none' }} onLoad={onImageLoad} />
                  </div>

                  {/* Right: choices + answer */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <label style={labelStyle}>Question Stem</label>
                      <textarea value={draft.stem} onChange={e => setDraft(d => d ? { ...d, stem: e.target.value } : d)}
                        rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="What does the author suggest…" />
                    </div>
                    {(['a', 'b', 'c', 'd'] as const).map(c => (
                      <div key={c}>
                        <label style={labelStyle}>Choice {c.toUpperCase()}</label>
                        <input value={draft[`choice_${c}` as keyof QuestionDraft] as string}
                          onChange={e => setDraft(d => d ? { ...d, [`choice_${c}`]: e.target.value } : d)}
                          style={inputStyle} placeholder={`Choice ${c.toUpperCase()}`} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Text-only layout */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Passage (optional — shared reading text)</label>
                    <textarea value={draft.passage} onChange={e => setDraft(d => d ? { ...d, passage: e.target.value } : d)}
                      rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Paste passage text here if this question refers to a reading…" />
                  </div>
                  <div>
                    <label style={labelStyle}>Question Stem</label>
                    <textarea value={draft.stem} onChange={e => setDraft(d => d ? { ...d, stem: e.target.value } : d)}
                      rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="The question text…" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {(['a', 'b', 'c', 'd'] as const).map(c => (
                      <div key={c}>
                        <label style={labelStyle}>Choice {c.toUpperCase()}</label>
                        <input value={draft[`choice_${c}` as keyof QuestionDraft] as string}
                          onChange={e => setDraft(d => d ? { ...d, [`choice_${c}`]: e.target.value } : d)}
                          style={inputStyle} placeholder={`Choice ${c.toUpperCase()}`} />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label style={labelStyle}>Question Image URL (optional)</label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input value={draft.question_image_url} onChange={e => setDraft(d => d ? { ...d, question_image_url: e.target.value } : d)}
                        style={{ ...inputStyle, flex: 1 }} placeholder="https://…" />
                      <span style={{ fontSize: 11, color: 'var(--mist)', flexShrink: 0 }}>or upload →</span>
                      <UploadButton<OurFileRouter, 'imageUploader'>
                        endpoint="imageUploader"
                        onClientUploadComplete={res => {
                          if (res[0]) setDraft(d => d ? { ...d, question_image_url: res[0].ufsUrl } : d);
                        }}
                        onUploadError={e => { toast.error(`Upload error: ${e.message}`); }}
                        appearance={{ button: 'bg-[#E0A6AF] text-[#1A1D23] text-xs font-semibold py-1.5 px-3 rounded-lg font-[Syne]' }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px', borderTop: '1px solid var(--fog)' }}>
              <button onClick={closeModal} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--fog)', background: 'transparent', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'var(--slate)', fontFamily: "'Syne', sans-serif" }}>
                Cancel
              </button>
              <button onClick={handleSaveQuestion} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8, border: 'none', background: saving ? 'var(--fog)' : 'var(--rose)', color: saving ? 'var(--cloud)' : 'var(--charcoal)', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: "'Syne', sans-serif" }}>
                <Check size={14} />
                {saving ? 'Saving…' : 'Save Question'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
