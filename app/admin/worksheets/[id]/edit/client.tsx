'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { UploadButton } from '@uploadthing/react';
import type { OurFileRouter } from '@/lib/uploadthing';
import {
  ArrowLeft, Plus, Trash2, Image as ImageIcon, ChevronUp, ChevronDown,
  BookOpen, Layers, Lock, Unlock, Key, GripVertical, FileText, ChevronLeft, ChevronRight,
} from 'lucide-react';
import type { WsStep, WsPage, WsPosition, WsAnswerKeyEntry, WsProblem } from './page';

// ── Shared styles ─────────────────────────────────────────────────────────────

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

const sectionHead: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--mist)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: 12,
};

// ── Main component ────────────────────────────────────────────────────────────

export default function WorksheetBuilderClient({
  worksheet,
  initialSteps,
}: {
  worksheet: { id: string; title: string };
  initialSteps: WsStep[];
}) {
  const [steps, setSteps] = useState<WsStep[]>(initialSteps);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(
    initialSteps[0]?.id ?? null,
  );
  const [addingStep, setAddingStep] = useState(false);
  const [newStepType, setNewStepType] = useState<'instruction' | 'problems'>('problems');
  const [newStepTitle, setNewStepTitle] = useState('');
  const [creatingStep, setCreatingStep] = useState(false);

  const selectedStep = steps.find((s) => s.id === selectedStepId) ?? null;
  const wsId = worksheet.id;

  // ── Step management ───────────────────────────────────────────────────────

  async function handleAddStep() {
    if (!newStepTitle.trim()) { toast.error('Step title required'); return; }
    setCreatingStep(true);
    try {
      const res = await fetch(`/api/admin/worksheets/${wsId}/steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newStepTitle.trim(), type: newStepType }),
      });
      if (!res.ok) throw new Error('Failed to create step');
      const { step } = await res.json() as { step: Omit<WsStep, 'pages' | 'positions' | 'answerKey'> };
      const full: WsStep = { ...step, type: step.type as 'instruction' | 'problems', pages: [], positions: [], answerKey: [], problems: [] };
      setSteps((prev) => [...prev, full]);
      setSelectedStepId(full.id);
      setAddingStep(false);
      setNewStepTitle('');
      toast.success('Step added');
    } catch {
      toast.error('Failed to add step');
    } finally {
      setCreatingStep(false);
    }
  }

  async function handleDeleteStep(stepId: string) {
    if (!confirm('Delete this step and all its content?')) return;
    const res = await fetch(`/api/admin/worksheets/${wsId}/steps/${stepId}`, { method: 'DELETE' });
    if (!res.ok) { toast.error('Delete failed'); return; }
    const remaining = steps.filter((s) => s.id !== stepId);
    setSteps(remaining);
    setSelectedStepId(remaining[0]?.id ?? null);
    toast.success('Step deleted');
  }

  async function moveStep(stepId: string, direction: 'up' | 'down') {
    const idx = steps.findIndex((s) => s.id === stepId);
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === steps.length - 1)) return;
    const newSteps = [...steps];
    const swap = direction === 'up' ? idx - 1 : idx + 1;
    [newSteps[idx], newSteps[swap]] = [newSteps[swap], newSteps[idx]];
    const reordered = newSteps.map((s, i) => ({ ...s, step_order: i + 1 }));
    setSteps(reordered);
    await fetch(`/api/admin/worksheets/${wsId}/steps`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedStepIds: reordered.map((s) => s.id) }),
    });
  }

  function updateStepLocal(stepId: string, patch: Partial<WsStep>) {
    setSteps((prev) => prev.map((s) => s.id === stepId ? { ...s, ...patch } : s));
  }

  // ── Step field save ───────────────────────────────────────────────────────

  async function saveStepField(stepId: string, field: Record<string, unknown>) {
    const res = await fetch(`/api/admin/worksheets/${wsId}/steps/${stepId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(field),
    });
    if (!res.ok) toast.error('Save failed');
    return res.ok;
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1200, margin: '0 auto', fontFamily: "'Syne', sans-serif" }}>
      {/* Header */}
      <Link href="/admin/worksheets" style={{ textDecoration: 'none' }}>
        <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--fog)', background: 'var(--frost)', cursor: 'pointer', fontSize: 13, color: 'var(--slate)', marginBottom: 20, fontFamily: "'Syne', sans-serif" }}>
          <ArrowLeft size={14} /> Back to Worksheets
        </button>
      </Link>

      <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 4 }}>
        {worksheet.title}
      </h1>
      <p style={{ color: 'var(--mist)', fontSize: 13, marginBottom: 28 }}>
        {steps.length} {steps.length === 1 ? 'step' : 'steps'} — drag to reorder, click to edit
      </p>

      {/* Two-panel layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24, alignItems: 'start' }}>

        {/* ── LEFT: Step sidebar ── */}
        <div>
          <p style={sectionHead}>Steps</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {steps.map((step, idx) => (
              <div
                key={step.id}
                onClick={() => setSelectedStepId(step.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: `1px solid ${selectedStepId === step.id ? 'rgba(224,166,175,0.5)' : 'var(--fog)'}`,
                  background: selectedStepId === step.id ? 'rgba(224,166,175,0.08)' : 'var(--white)',
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                }}
              >
                <GripVertical size={13} style={{ color: 'var(--fog)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--mist)' }}>
                      {step.step_order}.
                    </span>
                    {step.type === 'instruction'
                      ? <BookOpen size={11} style={{ color: 'var(--sky-deeper)' }} />
                      : <Layers size={11} style={{ color: 'var(--rose-deeper)' }} />}
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--charcoal)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {step.title}
                    </span>
                  </div>
                  {step.stage_label && (
                    <span style={{ fontSize: 10, color: 'var(--mist)' }}>{step.stage_label}</span>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); moveStep(step.id, 'up'); }}
                    disabled={idx === 0}
                    style={{ border: 'none', background: 'none', cursor: idx === 0 ? 'default' : 'pointer', color: idx === 0 ? 'var(--fog)' : 'var(--mist)', padding: 1, display: 'flex', alignItems: 'center' }}
                  >
                    <ChevronUp size={12} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); moveStep(step.id, 'down'); }}
                    disabled={idx === steps.length - 1}
                    style={{ border: 'none', background: 'none', cursor: idx === steps.length - 1 ? 'default' : 'pointer', color: idx === steps.length - 1 ? 'var(--fog)' : 'var(--mist)', padding: 1, display: 'flex', alignItems: 'center' }}
                  >
                    <ChevronDown size={12} />
                  </button>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteStep(step.id); }}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--cloud)', padding: 2, display: 'flex', alignItems: 'center', flexShrink: 0 }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#991B1B'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--cloud)'; }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}

            {/* Add step UI */}
            {addingStep ? (
              <div style={{ padding: 12, border: '1px dashed rgba(168,203,222,0.5)', borderRadius: 10, background: 'rgba(168,203,222,0.04)' }}>
                <p style={labelStyle}>Step Type</p>
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  {(['instruction', 'problems'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setNewStepType(t)}
                      style={{
                        flex: 1,
                        padding: '6px 0',
                        borderRadius: 7,
                        border: `1px solid ${newStepType === t ? (t === 'instruction' ? 'rgba(168,203,222,0.5)' : 'rgba(224,166,175,0.5)') : 'var(--fog)'}`,
                        background: newStepType === t ? (t === 'instruction' ? 'rgba(168,203,222,0.12)' : 'rgba(224,166,175,0.12)') : 'transparent',
                        color: newStepType === t ? 'var(--charcoal)' : 'var(--mist)',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: "'Syne', sans-serif",
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                      }}
                    >
                      {t === 'instruction' ? <BookOpen size={11} /> : <Layers size={11} />}
                      {t === 'instruction' ? 'Instruction' : 'Problems'}
                    </button>
                  ))}
                </div>
                <p style={labelStyle}>Title</p>
                <input
                  value={newStepTitle}
                  onChange={(e) => setNewStepTitle(e.target.value)}
                  placeholder={newStepType === 'instruction' ? 'e.g. Intro Reading' : 'e.g. Warm-Up Problems'}
                  style={{ ...inputStyle, marginBottom: 10 }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddStep(); }}
                  autoFocus
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => { setAddingStep(false); setNewStepTitle(''); }}
                    style={{ flex: 1, padding: '6px 0', borderRadius: 7, border: '1px solid var(--fog)', background: 'transparent', color: 'var(--slate)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Syne', sans-serif" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddStep}
                    disabled={creatingStep}
                    style={{ flex: 1, padding: '6px 0', borderRadius: 7, border: 'none', background: 'var(--rose)', color: 'var(--charcoal)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Syne', sans-serif" }}
                  >
                    {creatingStep ? '…' : 'Add'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingStep(true)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 0', borderRadius: 10, border: '1px dashed rgba(168,203,222,0.4)', background: 'rgba(168,203,222,0.04)', color: 'var(--sky-deeper)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Syne', sans-serif' " }}
              >
                <Plus size={13} /> Add Step
              </button>
            )}
          </div>
        </div>

        {/* ── RIGHT: Step editor ── */}
        <div>
          {selectedStep ? (
            selectedStep.type === 'instruction'
              ? (
                <InstructionStepEditor
                  step={selectedStep}
                  onUpdate={(patch) => updateStepLocal(selectedStep.id, patch)}
                  onSaveField={saveStepField}
                />
              )
              : (
                <ProblemsStepEditor
                  step={selectedStep}
                  wsId={wsId}
                  onUpdate={(patch) => updateStepLocal(selectedStep.id, patch)}
                  onSaveField={saveStepField}
                />
              )
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, border: '1px dashed var(--fog)', borderRadius: 14, color: 'var(--mist)', fontSize: 13 }}>
              Select a step to edit it, or add your first step.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── PDF Import Tab ────────────────────────────────────────────────────────────

type PdfPhase = 'crop' | 'bubbles' | 'answerkey';

interface CropRect { x: number; y: number; w: number; h: number }

function PdfImportTab({
  wsId,
  stepId,
  problems,
  positions,
  onProblemsChange,
  onPositionsChange,
}: {
  wsId: string;
  stepId: string;
  problems: WsProblem[];
  positions: WsPosition[];
  onProblemsChange: (p: WsProblem[]) => void;
  onPositionsChange: (p: WsPosition[]) => void;
}) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<unknown>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [phase, setPhase] = useState<PdfPhase>('crop');

  // Crop state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [croppingProblem, setCroppingProblem] = useState(false);

  // Bubble placement state
  const [bubbleQIdx, setBubbleQIdx] = useState(0);
  const [placingBubbleLetter, setPlacingBubbleLetter] = useState<string | null>(null);

  // Answer key state
  const [akQIdx, setAkQIdx] = useState(0);
  const [akEdits, setAkEdits] = useState<Record<number, { letter: string; expUrl: string | null }>>({});
  const [akCropRect, setAkCropRect] = useState<CropRect | null>(null);
  const [akDragStart, setAkDragStart] = useState<{ x: number; y: number } | null>(null);
  const [savingAk, setSavingAk] = useState<number | null>(null);

  // Load pdf.js and render current page whenever pdfDoc or currentPage changes
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    const doc = pdfDoc as { getPage: (n: number) => Promise<unknown> };
    let cancelled = false;
    (async () => {
      const page = await doc.getPage(currentPage) as {
        getViewport: (opts: { scale: number }) => { width: number; height: number };
        render: (ctx: unknown) => { promise: Promise<void> };
      };
      if (cancelled) return;
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = canvasRef.current!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d')!;
      await page.render({ canvasContext: ctx, viewport }).promise;
    })();
    return () => { cancelled = true; };
  }, [pdfDoc, currentPage]);

  async function loadPdf(url: string) {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
    const doc = await pdfjsLib.getDocument(url).promise;
    setPdfDoc(doc);
    setTotalPages(doc.numPages);
    setCurrentPage(1);
    setCropRect(null);
  }

  function getCanvasRelativeRect(e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = e.currentTarget.width / rect.width;
    const scaleY = e.currentTarget.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function onCropMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const pos = getCanvasRelativeRect(e);
    setDragStart(pos);
    setCropRect(null);
  }

  function onCropMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!dragStart || !canvasRef.current) return;
    const pos = getCanvasRelativeRect(e);
    const x = Math.min(dragStart.x, pos.x);
    const y = Math.min(dragStart.y, pos.y);
    const w = Math.abs(pos.x - dragStart.x);
    const h = Math.abs(pos.y - dragStart.y);
    setCropRect({ x, y, w, h });
  }

  function onCropMouseUp() {
    setDragStart(null);
  }

  async function cropAndUpload(rect: CropRect): Promise<string | null> {
    if (!canvasRef.current) return null;
    const src = canvasRef.current;
    const off = document.createElement('canvas');
    off.width = rect.w;
    off.height = rect.h;
    const ctx = off.getContext('2d')!;
    ctx.drawImage(src, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
    const blob = await new Promise<Blob | null>((resolve) => off.toBlob(resolve, 'image/png'));
    if (!blob) return null;
    const formData = new FormData();
    formData.append('file', new File([blob], 'crop.png', { type: 'image/png' }));
    const res = await fetch('/api/admin/worksheets/upload-crop', { method: 'POST', body: formData });
    if (!res.ok) return null;
    const { url } = await res.json() as { url: string };
    return url;
  }

  async function handleAddQuestion() {
    if (!cropRect || cropRect.w < 10 || cropRect.h < 10) { toast.error('Draw a selection first'); return; }
    setCroppingProblem(true);
    try {
      const url = await cropAndUpload(cropRect);
      if (!url) { toast.error('Upload failed'); return; }
      const nextNum = problems.length > 0 ? Math.max(...problems.map((p) => p.question_number)) + 1 : 1;
      const res = await fetch(`/api/admin/worksheets/${wsId}/steps/${stepId}/problems`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionNumber: nextNum, questionImageUrl: url }),
      });
      if (!res.ok) { toast.error('Failed to save question'); return; }
      const { problem } = await res.json() as { problem: WsProblem };
      onProblemsChange([...problems, problem]);
      setCropRect(null);
      toast.success(`Question ${nextNum} added`);
    } catch {
      toast.error('Failed to add question');
    } finally {
      setCroppingProblem(false);
    }
  }

  async function handleDeleteProblem(problemId: string, qNum: number) {
    if (!confirm(`Delete question ${qNum}?`)) return;
    const res = await fetch(`/api/admin/worksheets/${wsId}/steps/${stepId}/problems`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ problemId }),
    });
    if (!res.ok) { toast.error('Delete failed'); return; }
    onProblemsChange(problems.filter((p) => p.id !== problemId));
    toast.success(`Question ${qNum} deleted`);
  }

  // Bubble placement on cropped question image
  async function handleBubbleImageClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!placingBubbleLetter) return;
    const problem = problems[bubbleQIdx];
    if (!problem) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((e.clientY - rect.top) / rect.height) * 100;
    const questionNumber = problem.question_number;
    const letterMap: Record<string, number> = { A: 1, B: 2, C: 3, D: 4 };
    const encodedQNum = questionNumber * 10 + (letterMap[placingBubbleLetter] ?? 0);
    const res = await fetch(`/api/admin/worksheets/${wsId}/steps/${stepId}/positions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionNumber: encodedQNum, pageNumber: questionNumber, xPercent, yPercent }),
    });
    if (!res.ok) { toast.error('Failed to place bubble'); return; }
    const { position } = await res.json() as { position: WsPosition };
    onPositionsChange([...positions.filter((p) => p.question_number !== encodedQNum), position]);
    toast.success(`Placed ${placingBubbleLetter} on Q${questionNumber}`);
  }

  async function handleSaveAnswerKey(problem: WsProblem) {
    const edit = akEdits[problem.question_number];
    if (!edit?.letter) { toast.error('Select a correct answer first'); return; }
    setSavingAk(problem.question_number);
    try {
      const res = await fetch(`/api/admin/worksheets/${wsId}/steps/${stepId}/problems`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionNumber: problem.question_number,
          correctAnswer: edit.letter,
          explanationImageUrl: edit.expUrl ?? null,
        }),
      });
      if (!res.ok) { toast.error('Save failed'); return; }
      const { problem: updated } = await res.json() as { problem: WsProblem };
      onProblemsChange(problems.map((p) => p.id === updated.id ? updated : p));
      toast.success(`Answer key saved for Q${problem.question_number}`);
    } catch {
      toast.error('Save failed');
    } finally {
      setSavingAk(null);
    }
  }

  async function handleCropExplanation(problem: WsProblem) {
    if (!akCropRect || akCropRect.w < 10 || akCropRect.h < 10) { toast.error('Draw a selection on the PDF first'); return; }
    const url = await cropAndUpload(akCropRect);
    if (!url) { toast.error('Upload failed'); return; }
    setAkEdits((prev) => ({ ...prev, [problem.question_number]: { ...prev[problem.question_number], letter: prev[problem.question_number]?.letter ?? '', expUrl: url } }));
    setAkCropRect(null);
    toast.success('Explanation image cropped');
  }

  const bubbleProblem = problems[bubbleQIdx] ?? null;
  const akProblem = problems[akQIdx] ?? null;

  const getPositionsForProblem = (qNum: number) =>
    positions.filter((p) => Math.floor(p.question_number / 10) === qNum);

  const letterFromEncoded = (encoded: number) => {
    const letterMap: Record<number, string> = { 1: 'A', 2: 'B', 3: 'C', 4: 'D' };
    return letterMap[encoded % 10] ?? '?';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Phase selector */}
      <div style={{ display: 'flex', gap: 8 }}>
        {(['crop', 'bubbles', 'answerkey'] as PdfPhase[]).map((p) => {
          const labels: Record<PdfPhase, string> = { crop: '1. Crop Questions', bubbles: '2. Place Bubbles', answerkey: '3. Answer Key' };
          return (
            <button
              key={p}
              onClick={() => setPhase(p)}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "'Syne', sans-serif",
                border: `1px solid ${phase === p ? 'rgba(224,166,175,0.5)' : 'var(--fog)'}`,
                background: phase === p ? 'rgba(224,166,175,0.12)' : 'var(--frost)',
                color: phase === p ? 'var(--charcoal)' : 'var(--mist)',
                cursor: 'pointer',
              }}
            >
              {labels[p]}
            </button>
          );
        })}
      </div>

      {/* ── Phase 1: Crop Questions ── */}
      {phase === 'crop' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!pdfUrl ? (
            <div style={{ border: '2px dashed rgba(168,203,222,0.4)', borderRadius: 10, padding: 24, background: 'rgba(168,203,222,0.04)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <FileText size={28} style={{ color: 'var(--sky-deeper)', opacity: 0.6 }} />
              <p style={{ fontSize: 13, color: 'var(--mist)', textAlign: 'center' }}>Upload the PDF to start cropping questions</p>
              <UploadButton<OurFileRouter, 'pdfUploader'>
                endpoint="pdfUploader"
                onClientUploadComplete={async (files) => {
                  if (!files[0]) return;
                  const url = files[0].ufsUrl ?? files[0].url;
                  setPdfUrl(url);
                  await loadPdf(url);
                  toast.success('PDF loaded');
                }}
                onUploadError={(e) => { toast.error(`Upload error: ${e.message}`); }}
                appearance={{ button: 'bg-[#A8CBDE] text-[#1A1D23] text-xs font-semibold py-2 px-4 rounded-lg font-[Syne]' }}
              />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 20, alignItems: 'start' }}>
              {/* PDF canvas */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{ border: '1px solid var(--fog)', background: 'var(--frost)', borderRadius: 7, padding: '4px 10px', cursor: currentPage === 1 ? 'default' : 'pointer', color: 'var(--mist)', display: 'flex', alignItems: 'center' }}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span style={{ fontSize: 12, color: 'var(--slate)', fontWeight: 600 }}>Page {currentPage} / {totalPages}</span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    style={{ border: '1px solid var(--fog)', background: 'var(--frost)', borderRadius: 7, padding: '4px 10px', cursor: currentPage === totalPages ? 'default' : 'pointer', color: 'var(--mist)', display: 'flex', alignItems: 'center' }}
                  >
                    <ChevronRight size={14} />
                  </button>
                  <button
                    onClick={() => { setPdfUrl(null); setPdfDoc(null); setTotalPages(0); setCropRect(null); }}
                    style={{ marginLeft: 'auto', fontSize: 11, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Syne', sans-serif" }}
                  >
                    Change PDF
                  </button>
                </div>

                <p style={{ fontSize: 11, color: 'var(--mist)', margin: 0 }}>
                  Click and drag on the PDF to select a question region, then click <strong>Add Question</strong>.
                </p>

                {/* Canvas with selection overlay */}
                <div style={{ position: 'relative', width: '100%', border: '1px solid var(--fog)', borderRadius: 10, overflow: 'hidden', userSelect: 'none' }}>
                  <canvas
                    ref={canvasRef}
                    style={{ display: 'block', width: '100%', cursor: 'crosshair' }}
                    onMouseDown={onCropMouseDown}
                    onMouseMove={onCropMouseMove}
                    onMouseUp={onCropMouseUp}
                  />
                  {cropRect && cropRect.w > 4 && canvasRef.current && (
                    <div
                      style={{
                        position: 'absolute',
                        left: `${(cropRect.x / canvasRef.current.width) * 100}%`,
                        top: `${(cropRect.y / canvasRef.current.height) * 100}%`,
                        width: `${(cropRect.w / canvasRef.current.width) * 100}%`,
                        height: `${(cropRect.h / canvasRef.current.height) * 100}%`,
                        border: '2px solid rgba(168,203,222,0.9)',
                        background: 'rgba(168,203,222,0.15)',
                        pointerEvents: 'none',
                      }}
                    />
                  )}
                </div>

                <button
                  onClick={handleAddQuestion}
                  disabled={croppingProblem || !cropRect}
                  style={{
                    alignSelf: 'flex-start',
                    padding: '8px 20px',
                    borderRadius: 8,
                    border: 'none',
                    background: cropRect ? 'var(--rose)' : 'var(--fog)',
                    color: 'var(--charcoal)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: cropRect ? 'pointer' : 'default',
                    fontFamily: "'Syne', sans-serif",
                  }}
                >
                  {croppingProblem ? 'Adding…' : '+ Add Question'}
                </button>
              </div>

              {/* Questions list */}
              <div>
                <p style={sectionHead}>Cropped Questions ({problems.length})</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 600, overflowY: 'auto' }}>
                  {problems.sort((a, b) => a.question_number - b.question_number).map((prob) => (
                    <div key={prob.id} style={{ border: '1px solid var(--fog)', borderRadius: 8, overflow: 'hidden', background: 'var(--frost)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--charcoal)' }}>Q{prob.question_number}</span>
                        <button
                          onClick={() => handleDeleteProblem(prob.id, prob.question_number)}
                          style={{ marginLeft: 'auto', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--cloud)', padding: 2, display: 'flex', alignItems: 'center' }}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={prob.question_image_url} alt={`Q${prob.question_number}`} style={{ display: 'block', width: '100%' }} />
                    </div>
                  ))}
                  {problems.length === 0 && <p style={{ fontSize: 11, color: 'var(--cloud)', textAlign: 'center', padding: 16 }}>No questions yet — crop from the PDF</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Phase 2: Place Bubbles ── */}
      {phase === 'bubbles' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {problems.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--mist)', textAlign: 'center', padding: 32 }}>Crop questions first in the &quot;Crop Questions&quot; phase.</p>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={() => setBubbleQIdx((i) => Math.max(0, i - 1))}
                  disabled={bubbleQIdx === 0}
                  style={{ border: '1px solid var(--fog)', background: 'var(--frost)', borderRadius: 7, padding: '4px 10px', cursor: bubbleQIdx === 0 ? 'default' : 'pointer', color: 'var(--mist)', display: 'flex', alignItems: 'center' }}
                >
                  <ChevronLeft size={14} />
                </button>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--charcoal)' }}>
                  Q{bubbleProblem?.question_number} ({bubbleQIdx + 1} / {problems.length})
                </span>
                <button
                  onClick={() => setBubbleQIdx((i) => Math.min(problems.length - 1, i + 1))}
                  disabled={bubbleQIdx === problems.length - 1}
                  style={{ border: '1px solid var(--fog)', background: 'var(--frost)', borderRadius: 7, padding: '4px 10px', cursor: bubbleQIdx === problems.length - 1 ? 'default' : 'pointer', color: 'var(--mist)', display: 'flex', alignItems: 'center' }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>

              {bubbleProblem && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 16, alignItems: 'start' }}>
                  <div>
                    <p style={{ fontSize: 11, color: 'var(--mist)', marginBottom: 8 }}>
                      Select a letter to place, then click on the question image to position it.
                    </p>
                    <div
                      onClick={handleBubbleImageClick}
                      style={{ position: 'relative', width: '100%', cursor: placingBubbleLetter ? 'crosshair' : 'default', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--fog)' }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={bubbleProblem.question_image_url} alt={`Q${bubbleProblem.question_number}`} style={{ display: 'block', width: '100%' }} />
                      {getPositionsForProblem(bubbleProblem.question_number).map((pos) => (
                        <div
                          key={pos.id}
                          style={{
                            position: 'absolute',
                            left: `${pos.x_percent}%`,
                            top: `${pos.y_percent}%`,
                            transform: 'translate(-50%, -50%)',
                            background: 'rgba(224,166,175,0.9)',
                            border: '2px solid #fff',
                            borderRadius: '50%',
                            width: 24,
                            height: 24,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 10,
                            fontWeight: 700,
                            color: '#1A1D23',
                            fontFamily: "'Syne', sans-serif",
                            pointerEvents: 'none',
                          }}
                        >
                          {letterFromEncoded(pos.question_number)}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <p style={sectionHead}>Select letter to place</p>
                    {['A', 'B', 'C', 'D'].map((letter) => {
                      const placed = getPositionsForProblem(bubbleProblem.question_number)
                        .some((p) => letterFromEncoded(p.question_number) === letter);
                      return (
                        <button
                          key={letter}
                          onClick={() => setPlacingBubbleLetter((l) => l === letter ? null : letter)}
                          style={{
                            padding: '8px 0',
                            borderRadius: 8,
                            border: `1px solid ${placingBubbleLetter === letter ? 'rgba(224,166,175,0.5)' : placed ? 'rgba(21,128,61,0.4)' : 'var(--fog)'}`,
                            background: placingBubbleLetter === letter ? 'rgba(224,166,175,0.15)' : placed ? 'rgba(21,128,61,0.08)' : 'var(--frost)',
                            color: placed ? '#15803d' : 'var(--charcoal)',
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontFamily: "'Syne', sans-serif",
                          }}
                        >
                          {letter} {placed ? '✓' : ''}
                        </button>
                      );
                    })}
                    {getPositionsForProblem(bubbleProblem.question_number).map((pos) => (
                      <div key={pos.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--slate)' }}>
                        <span style={{ fontWeight: 600 }}>{letterFromEncoded(pos.question_number)}</span>
                        <span style={{ color: 'var(--mist)' }}>({pos.x_percent.toFixed(0)}%, {pos.y_percent.toFixed(0)}%)</span>
                        <button
                          onClick={async () => {
                            const res = await fetch(`/api/admin/worksheets/${wsId}/steps/${stepId}/positions`, {
                              method: 'DELETE',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ positionId: pos.id }),
                            });
                            if (res.ok) onPositionsChange(positions.filter((p) => p.id !== pos.id));
                          }}
                          style={{ marginLeft: 'auto', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--cloud)', padding: 1, display: 'flex', alignItems: 'center' }}
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Phase 3: Answer Key ── */}
      {phase === 'answerkey' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {problems.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--mist)', textAlign: 'center', padding: 32 }}>Crop questions first.</p>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={() => setAkQIdx((i) => Math.max(0, i - 1))}
                  disabled={akQIdx === 0}
                  style={{ border: '1px solid var(--fog)', background: 'var(--frost)', borderRadius: 7, padding: '4px 10px', cursor: akQIdx === 0 ? 'default' : 'pointer', color: 'var(--mist)', display: 'flex', alignItems: 'center' }}
                >
                  <ChevronLeft size={14} />
                </button>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--charcoal)' }}>
                  Q{akProblem?.question_number} ({akQIdx + 1} / {problems.length})
                </span>
                <button
                  onClick={() => setAkQIdx((i) => Math.min(problems.length - 1, i + 1))}
                  disabled={akQIdx === problems.length - 1}
                  style={{ border: '1px solid var(--fog)', background: 'var(--frost)', borderRadius: 7, padding: '4px 10px', cursor: akQIdx === problems.length - 1 ? 'default' : 'pointer', color: 'var(--mist)', display: 'flex', alignItems: 'center' }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>

              {akProblem && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
                  {/* Left: question image + letter selector */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <p style={sectionHead}>Question {akProblem.question_number}</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={akProblem.question_image_url} alt={`Q${akProblem.question_number}`} style={{ display: 'block', width: '100%', borderRadius: 8, border: '1px solid var(--fog)' }} />

                    <div>
                      <p style={{ ...sectionHead, marginBottom: 8 }}>Correct Answer</p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {['A', 'B', 'C', 'D'].map((letter) => {
                          const current = akEdits[akProblem.question_number]?.letter ?? akProblem.correct_answer ?? '';
                          return (
                            <button
                              key={letter}
                              onClick={() => setAkEdits((prev) => ({ ...prev, [akProblem.question_number]: { ...prev[akProblem.question_number], letter, expUrl: prev[akProblem.question_number]?.expUrl ?? null } }))}
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                border: `1px solid ${current === letter ? 'var(--rose-deeper)' : 'var(--fog)'}`,
                                background: current === letter ? 'var(--rose)' : 'var(--frost)',
                                color: 'var(--charcoal)',
                                fontSize: 13,
                                fontWeight: 700,
                                cursor: 'pointer',
                                fontFamily: "'Syne', sans-serif",
                              }}
                            >
                              {letter}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Existing explanation */}
                    {(akEdits[akProblem.question_number]?.expUrl ?? akProblem.explanation_image_url) && (
                      <div>
                        <p style={{ ...sectionHead, marginBottom: 6 }}>Explanation Image</p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={akEdits[akProblem.question_number]?.expUrl ?? akProblem.explanation_image_url!}
                          alt="explanation"
                          style={{ display: 'block', width: '100%', borderRadius: 8, border: '1px solid var(--fog)' }}
                        />
                      </div>
                    )}

                    <button
                      onClick={() => handleSaveAnswerKey(akProblem)}
                      disabled={savingAk === akProblem.question_number}
                      style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--rose)', color: 'var(--charcoal)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Syne', sans-serif", alignSelf: 'flex-start' }}
                    >
                      {savingAk === akProblem.question_number ? 'Saving…' : 'Save Answer Key'}
                    </button>
                  </div>

                  {/* Right: PDF to crop explanation */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <p style={sectionHead}>Crop Explanation from PDF</p>
                    {!pdfUrl ? (
                      <div style={{ border: '2px dashed rgba(168,203,222,0.4)', borderRadius: 10, padding: 16, background: 'rgba(168,203,222,0.04)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <p style={{ fontSize: 11, color: 'var(--mist)', textAlign: 'center' }}>Upload or re-load the PDF to crop the explanation</p>
                        <UploadButton<OurFileRouter, 'pdfUploader'>
                          endpoint="pdfUploader"
                          onClientUploadComplete={async (files) => {
                            if (!files[0]) return;
                            const url = files[0].ufsUrl ?? files[0].url;
                            setPdfUrl(url);
                            await loadPdf(url);
                            toast.success('PDF loaded');
                          }}
                          onUploadError={(e) => { toast.error(`Upload error: ${e.message}`); }}
                          appearance={{ button: 'bg-[#A8CBDE] text-[#1A1D23] text-xs font-semibold py-1.5 px-3 rounded-lg font-[Syne]' }}
                        />
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            style={{ border: '1px solid var(--fog)', background: 'var(--frost)', borderRadius: 7, padding: '3px 8px', cursor: currentPage === 1 ? 'default' : 'pointer', color: 'var(--mist)', display: 'flex', alignItems: 'center' }}
                          >
                            <ChevronLeft size={12} />
                          </button>
                          <span style={{ fontSize: 11, color: 'var(--slate)', fontWeight: 600 }}>Page {currentPage} / {totalPages}</span>
                          <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            style={{ border: '1px solid var(--fog)', background: 'var(--frost)', borderRadius: 7, padding: '3px 8px', cursor: currentPage === totalPages ? 'default' : 'pointer', color: 'var(--mist)', display: 'flex', alignItems: 'center' }}
                          >
                            <ChevronRight size={12} />
                          </button>
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--mist)', margin: 0 }}>
                          Drag to select the explanation region, then click <strong>Crop Explanation</strong>.
                        </p>
                        <div style={{ position: 'relative', width: '100%', border: '1px solid var(--fog)', borderRadius: 8, overflow: 'hidden', userSelect: 'none' }}>
                          <canvas
                            ref={canvasRef}
                            style={{ display: 'block', width: '100%', cursor: 'crosshair' }}
                            onMouseDown={(e) => { const p = getCanvasRelativeRect(e); setAkDragStart(p); setAkCropRect(null); }}
                            onMouseMove={(e) => {
                              if (!akDragStart) return;
                              const pos = getCanvasRelativeRect(e);
                              setAkCropRect({ x: Math.min(akDragStart.x, pos.x), y: Math.min(akDragStart.y, pos.y), w: Math.abs(pos.x - akDragStart.x), h: Math.abs(pos.y - akDragStart.y) });
                            }}
                            onMouseUp={() => setAkDragStart(null)}
                          />
                          {akCropRect && akCropRect.w > 4 && canvasRef.current && (
                            <div
                              style={{
                                position: 'absolute',
                                left: `${(akCropRect.x / canvasRef.current.width) * 100}%`,
                                top: `${(akCropRect.y / canvasRef.current.height) * 100}%`,
                                width: `${(akCropRect.w / canvasRef.current.width) * 100}%`,
                                height: `${(akCropRect.h / canvasRef.current.height) * 100}%`,
                                border: '2px solid rgba(224,166,175,0.9)',
                                background: 'rgba(224,166,175,0.15)',
                                pointerEvents: 'none',
                              }}
                            />
                          )}
                        </div>
                        <button
                          onClick={() => handleCropExplanation(akProblem)}
                          disabled={!akCropRect}
                          style={{
                            alignSelf: 'flex-start',
                            padding: '7px 16px',
                            borderRadius: 8,
                            border: 'none',
                            background: akCropRect ? 'var(--rose)' : 'var(--fog)',
                            color: 'var(--charcoal)',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: akCropRect ? 'pointer' : 'default',
                            fontFamily: "'Syne', sans-serif",
                          }}
                        >
                          Crop Explanation
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Instruction Step Editor ───────────────────────────────────────────────────

function InstructionStepEditor({
  step,
  onUpdate,
  onSaveField,
}: {
  step: WsStep;
  onUpdate: (patch: Partial<WsStep>) => void;
  onSaveField: (stepId: string, field: Record<string, unknown>) => Promise<boolean>;
}) {
  const [title, setTitle] = useState(step.title);
  const [stageLabel, setStageLabel] = useState(step.stage_label ?? '');
  const [savingMeta, setSavingMeta] = useState(false);

  async function saveMeta() {
    setSavingMeta(true);
    const ok = await onSaveField(step.id, { title, stageLabel: stageLabel || null });
    if (ok) {
      onUpdate({ title, stage_label: stageLabel || null });
      toast.success('Saved');
    }
    setSavingMeta(false);
  }

  return (
    <div style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--fog)', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Type badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: 'var(--sky-deeper)', background: 'rgba(168,203,222,0.14)', border: '1px solid rgba(168,203,222,0.3)', padding: '3px 10px', borderRadius: 20 }}>
          <BookOpen size={11} /> Instruction Step
        </span>
      </div>

      {/* Title + stage label */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <label style={labelStyle}>Step Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={inputStyle}
            placeholder="e.g. Introduction to Quadratics"
          />
        </div>
        <div>
          <label style={labelStyle}>Stage Label</label>
          <input
            value={stageLabel}
            onChange={(e) => setStageLabel(e.target.value)}
            style={inputStyle}
            placeholder="e.g. Review Together"
          />
        </div>
      </div>

      <button
        onClick={saveMeta}
        disabled={savingMeta}
        style={{ alignSelf: 'flex-start', padding: '7px 18px', borderRadius: 8, border: 'none', background: 'var(--rose)', color: 'var(--charcoal)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Syne', sans-serif" }}
      >
        {savingMeta ? 'Saving…' : 'Save Title & Label'}
      </button>

      {/* PDF upload */}
      <div>
        <label style={labelStyle}>Instruction PDF</label>
        {step.pdf_url ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(168,203,222,0.08)', border: '1px solid rgba(168,203,222,0.3)', borderRadius: 8, fontSize: 13 }}>
              <BookOpen size={14} style={{ color: 'var(--sky-deeper)' }} />
              <span style={{ flex: 1, color: 'var(--charcoal)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>PDF uploaded</span>
              <a href={step.pdf_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--sky-deeper)', textDecoration: 'none', fontWeight: 600 }}>
                View ↗
              </a>
              <button
                onClick={async () => {
                  const ok = await onSaveField(step.id, { pdfUrl: null });
                  if (ok) onUpdate({ pdf_url: null });
                }}
                style={{ fontSize: 11, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Syne', sans-serif" }}
              >
                Remove
              </button>
            </div>
            {/* Embedded preview */}
            <iframe
              src={step.pdf_url}
              style={{ width: '100%', height: 520, borderRadius: 10, border: '1px solid var(--fog)' }}
              title="Instruction PDF preview"
            />
          </div>
        ) : (
          <div style={{ border: '2px dashed rgba(168,203,222,0.4)', borderRadius: 10, padding: 20, background: 'rgba(168,203,222,0.04)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <p style={{ fontSize: 12, color: 'var(--mist)', textAlign: 'center' }}>
              Upload the instruction PDF that students will read for this step
            </p>
            <UploadButton<OurFileRouter, 'pdfUploader'>
              endpoint="pdfUploader"
              onClientUploadComplete={async (files) => {
                if (!files[0]) return;
                const url = files[0].ufsUrl ?? files[0].url;
                const ok = await onSaveField(step.id, { pdfUrl: url });
                if (ok) {
                  onUpdate({ pdf_url: url });
                  toast.success('PDF uploaded');
                }
              }}
              onUploadError={(e) => { toast.error(`Upload error: ${e.message}`); }}
              appearance={{ button: 'bg-[#A8CBDE] text-[#1A1D23] text-xs font-semibold py-2 px-4 rounded-lg font-[Syne]' }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Problems Step Editor ──────────────────────────────────────────────────────

type ProblemsTab = 'pages' | 'answerkey' | 'pdfimport';

function ProblemsStepEditor({
  step,
  wsId,
  onUpdate,
  onSaveField,
}: {
  step: WsStep;
  wsId: string;
  onUpdate: (patch: Partial<WsStep>) => void;
  onSaveField: (stepId: string, field: Record<string, unknown>) => Promise<boolean>;
}) {
  const [tab, setTab] = useState<ProblemsTab>('pages');
  const [title, setTitle] = useState(step.title);
  const [stageLabel, setStageLabel] = useState(step.stage_label ?? '');
  const [lockedNav, setLockedNav] = useState(step.locked_nav);
  const [savingMeta, setSavingMeta] = useState(false);

  const [pages, setPages] = useState<WsPage[]>(step.pages);
  const [positions, setPositions] = useState<WsPosition[]>(step.positions);
  const [answerKey, setAnswerKey] = useState<WsAnswerKeyEntry[]>(step.answerKey);
  const [problems, setProblems] = useState<WsProblem[]>(step.problems);
  const [activePage, setActivePage] = useState<number>(step.pages[0]?.page_number ?? 1);
  const [placingQuestion, setPlacingQuestion] = useState<number | null>(null);
  const [keyEdits, setKeyEdits] = useState<Record<number, string>>({});
  const [savingKey, setSavingKey] = useState(false);

  const stepId = step.id;

  async function saveMeta() {
    setSavingMeta(true);
    const ok = await onSaveField(stepId, { title, stageLabel: stageLabel || null, lockedNav });
    if (ok) {
      onUpdate({ title, stage_label: stageLabel || null, locked_nav: lockedNav });
      toast.success('Saved');
    }
    setSavingMeta(false);
  }

  async function handleDeletePage(pageId: string, pageNumber: number) {
    if (!confirm(`Delete page ${pageNumber}?`)) return;
    const res = await fetch(`/api/admin/worksheets/${wsId}/steps/${stepId}/pages/${pageId}`, { method: 'DELETE' });
    if (!res.ok) { toast.error('Delete failed'); return; }
    setPages((prev) => prev.filter((p) => p.id !== pageId));
    toast.success('Page deleted');
  }

  const handleImageClick = useCallback(async (e: React.MouseEvent<HTMLDivElement>, pageNumber: number) => {
    if (placingQuestion === null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((e.clientY - rect.top) / rect.height) * 100;

    const res = await fetch(`/api/admin/worksheets/${wsId}/steps/${stepId}/positions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionNumber: placingQuestion, pageNumber, xPercent, yPercent }),
    });
    if (!res.ok) { toast.error('Failed to place marker'); return; }
    const { position } = await res.json() as { position: WsPosition };
    setPositions((prev) => [...prev.filter((p) => p.question_number !== placingQuestion), position]);
    toast.success(`Placed Q${placingQuestion}`);

    const placed = positions.map((p) => p.question_number);
    const maxQ = Math.max(placingQuestion, ...placed);
    const nextQ = placingQuestion + 1;
    setPlacingQuestion(nextQ <= maxQ + 1 ? nextQ : null);
  }, [placingQuestion, wsId, stepId, positions]);

  async function handleDeletePosition(positionId: string, qNum: number) {
    const res = await fetch(`/api/admin/worksheets/${wsId}/steps/${stepId}/positions`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ positionId }),
    });
    if (!res.ok) { toast.error('Failed to remove marker'); return; }
    setPositions((prev) => prev.filter((p) => p.id !== positionId));
    toast.success(`Removed Q${qNum}`);
  }

  function getKeyValue(qNum: number): string {
    if (qNum in keyEdits) return keyEdits[qNum];
    return answerKey.find((k) => k.question_number === qNum)?.correct_answer ?? '';
  }

  async function handleSaveAnswerKey() {
    const allQNums = Array.from(
      new Set([...answerKey.map((k) => k.question_number), ...Object.keys(keyEdits).map(Number)]),
    ).sort((a, b) => a - b);
    const entries = allQNums
      .map((qNum) => ({ questionNumber: qNum, correctAnswer: getKeyValue(qNum).toUpperCase() }))
      .filter((e) => /^[A-D]$/.test(e.correctAnswer));
    if (entries.length === 0) { toast.error('No valid answers to save'); return; }
    setSavingKey(true);
    try {
      const res = await fetch(`/api/admin/worksheets/${wsId}/steps/${stepId}/answer-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
      });
      if (!res.ok) throw new Error('Save failed');
      setAnswerKey(entries.map((e) => ({ id: '', step_id: stepId, question_number: e.questionNumber, correct_answer: e.correctAnswer })));
      setKeyEdits({});
      toast.success(`Saved ${entries.length} answers`);
    } catch {
      toast.error('Save failed');
    } finally {
      setSavingKey(false);
    }
  }

  const activePageData = pages.find((p) => p.page_number === activePage);
  const positionsOnActivePage = positions.filter((p) => p.page_number === activePage);

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '7px 16px',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "'Syne', sans-serif",
    border: 'none',
    cursor: 'pointer',
    background: active ? 'var(--rose)' : 'var(--frost)',
    color: active ? 'var(--charcoal)' : 'var(--mist)',
    transition: 'all 0.15s',
  });

  return (
    <div style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--fog)', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Type badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: 'var(--rose-deeper)', background: 'rgba(224,166,175,0.14)', border: '1px solid rgba(224,166,175,0.3)', padding: '3px 10px', borderRadius: 20 }}>
          <Layers size={11} /> Problems Step
        </span>
      </div>

      {/* Meta fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <label style={labelStyle}>Step Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} placeholder="e.g. Warm-Up Problems" />
        </div>
        <div>
          <label style={labelStyle}>Stage Label</label>
          <input value={stageLabel} onChange={(e) => setStageLabel(e.target.value)} style={inputStyle} placeholder="e.g. Student Work" />
        </div>
      </div>

      {/* Locked nav toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={() => setLockedNav((v) => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: `1px solid ${lockedNav ? 'rgba(224,166,175,0.5)' : 'var(--fog)'}`, background: lockedNav ? 'rgba(224,166,175,0.1)' : 'transparent', color: lockedNav ? 'var(--rose-deeper)' : 'var(--mist)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Syne', sans-serif" }}
        >
          {lockedNav ? <Lock size={12} /> : <Unlock size={12} />}
          {lockedNav ? 'Locked navigation' : 'Free navigation'}
        </button>
        <span style={{ fontSize: 11, color: 'var(--mist)' }}>
          {lockedNav ? 'Student must answer all questions on a page before advancing' : 'Student can freely move between pages'}
        </span>
      </div>

      <button
        onClick={saveMeta}
        disabled={savingMeta}
        style={{ alignSelf: 'flex-start', padding: '7px 18px', borderRadius: 8, border: 'none', background: 'var(--rose)', color: 'var(--charcoal)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Syne', sans-serif" }}
      >
        {savingMeta ? 'Saving…' : 'Save Settings'}
      </button>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--fog)', paddingTop: 16 }}>
        <button style={tabStyle(tab === 'pages')} onClick={() => setTab('pages')}>
          <ImageIcon size={12} style={{ display: 'inline', marginRight: 4 }} />Pages & Bubbles
        </button>
        <button style={tabStyle(tab === 'answerkey')} onClick={() => setTab('answerkey')}>
          <Key size={12} style={{ display: 'inline', marginRight: 4 }} />Answer Key
        </button>
        <button style={tabStyle(tab === 'pdfimport')} onClick={() => setTab('pdfimport')}>
          <FileText size={12} style={{ display: 'inline', marginRight: 4 }} />PDF Import
        </button>
      </div>

      {/* ── Pages & Bubbles tab ── */}
      {tab === 'pages' && (
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 20 }}>
          {/* Left: page list + upload */}
          <div>
            <p style={sectionHead}>Pages ({pages.length})</p>
            <div style={{ border: '2px dashed rgba(168,203,222,0.4)', borderRadius: 10, padding: 12, background: 'rgba(168,203,222,0.04)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <p style={{ fontSize: 11, color: 'var(--mist)', textAlign: 'center' }}>Upload a page image</p>
              <UploadButton<OurFileRouter, 'imageUploader'>
                endpoint="imageUploader"
                onClientUploadComplete={async (res) => {
                  if (!res[0]) return;
                  const pageNum = parseInt(prompt('Page number?') ?? '0', 10);
                  if (!pageNum || pageNum < 1) { toast.error('Invalid page number'); return; }
                  const r = await fetch(`/api/admin/worksheets/${wsId}/steps/${stepId}/pages`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pageNumber: pageNum, imageUrl: res[0].ufsUrl }),
                  });
                  if (!r.ok) { toast.error('Failed to save page'); return; }
                  const { page } = await r.json() as { page: WsPage };
                  setPages((prev) => [...prev.filter((p) => p.page_number !== page.page_number), page].sort((a, b) => a.page_number - b.page_number));
                  setActivePage(page.page_number);
                  toast.success(`Page ${page.page_number} uploaded`);
                }}
                onUploadError={(e) => { toast.error(`Upload error: ${e.message}`); }}
                appearance={{ button: 'bg-[#A8CBDE] text-[#1A1D23] text-xs font-semibold py-1.5 px-3 rounded-lg font-[Syne]' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {pages.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setActivePage(p.page_number)}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${activePage === p.page_number ? 'rgba(224,166,175,0.5)' : 'var(--fog)'}`, background: activePage === p.page_number ? 'rgba(224,166,175,0.06)' : 'var(--white)' }}
                >
                  <ImageIcon size={12} style={{ color: 'var(--mist)', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--charcoal)', flex: 1 }}>Page {p.page_number}</span>
                  <span style={{ fontSize: 10, color: '#15803d', fontWeight: 600 }}>
                    {positions.filter((pos) => pos.page_number === p.page_number).length}Q
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeletePage(p.id, p.page_number); }}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--cloud)', padding: 2, display: 'flex', alignItems: 'center' }}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
              {pages.length === 0 && <p style={{ fontSize: 11, color: 'var(--cloud)', textAlign: 'center', padding: 10 }}>No pages yet</p>}
            </div>

            {/* Placement control */}
            {pages.length > 0 && (
              <div style={{ marginTop: 16, padding: 12, borderRadius: 10, border: '1px solid var(--fog)', background: 'var(--frost)' }}>
                <p style={{ ...sectionHead, marginBottom: 8 }}>Place Question</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="number"
                    min={1}
                    value={placingQuestion ?? ''}
                    onChange={(e) => setPlacingQuestion(e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="Q#"
                    style={{ ...inputStyle, width: 60 }}
                  />
                  {placingQuestion !== null ? (
                    <span style={{ fontSize: 11, color: 'var(--charcoal)', fontWeight: 600 }}>
                      Click on page to place Q{placingQuestion}
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--mist)' }}>Enter a question number</span>
                  )}
                </div>
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 140, overflowY: 'auto' }}>
                  {positions.sort((a, b) => a.question_number - b.question_number).map((pos) => (
                    <div key={pos.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--slate)' }}>
                      <span style={{ fontWeight: 600, color: 'var(--charcoal)', minWidth: 28 }}>Q{pos.question_number}</span>
                      <span style={{ color: 'var(--mist)' }}>p{pos.page_number} ({pos.x_percent.toFixed(0)}%,{pos.y_percent.toFixed(0)}%)</span>
                      <button
                        onClick={() => handleDeletePosition(pos.id, pos.question_number)}
                        style={{ marginLeft: 'auto', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--cloud)', padding: 1, display: 'flex', alignItems: 'center' }}
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                  {positions.length === 0 && <p style={{ fontSize: 11, color: 'var(--cloud)', textAlign: 'center' }}>No markers yet</p>}
                </div>
              </div>
            )}
          </div>

          {/* Right: page image with bubble overlay */}
          <div>
            {activePageData ? (
              <div>
                <p style={{ ...sectionHead, marginBottom: 8 }}>
                  Page {activePage} {placingQuestion !== null ? `— click to place Q${placingQuestion}` : ''}
                </p>
                <div
                  onClick={(e) => handleImageClick(e, activePage)}
                  style={{ position: 'relative', width: '100%', cursor: placingQuestion !== null ? 'crosshair' : 'default', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--fog)' }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={activePageData.image_url} alt={`Page ${activePage}`} style={{ display: 'block', width: '100%' }} />
                  {positionsOnActivePage.map((pos) => (
                    <div
                      key={pos.id}
                      style={{
                        position: 'absolute',
                        left: `${pos.x_percent}%`,
                        top: `${pos.y_percent}%`,
                        transform: 'translate(-50%, -50%)',
                        background: 'rgba(224,166,175,0.9)',
                        border: '2px solid #fff',
                        borderRadius: '50%',
                        width: 24,
                        height: 24,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#1A1D23',
                        fontFamily: "'Syne', sans-serif",
                        pointerEvents: 'none',
                      }}
                    >
                      {pos.question_number}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, border: '1px dashed var(--fog)', borderRadius: 10, color: 'var(--mist)', fontSize: 13 }}>
                {pages.length === 0 ? 'Upload a page image to get started' : 'Select a page from the left'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PDF Import tab ── */}
      {tab === 'pdfimport' && (
        <PdfImportTab
          wsId={wsId}
          stepId={stepId}
          problems={problems}
          positions={positions}
          onProblemsChange={setProblems}
          onPositionsChange={setPositions}
        />
      )}

      {/* ── Answer Key tab ── */}
      {tab === 'answerkey' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <p style={sectionHead}>Answer Key</p>
            <button
              onClick={handleSaveAnswerKey}
              disabled={savingKey}
              style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: 'var(--rose)', color: 'var(--charcoal)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Syne', sans-serif" }}
            >
              {savingKey ? 'Saving…' : 'Save Answer Key'}
            </button>
          </div>

          {positions.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--mist)', textAlign: 'center', padding: 32 }}>
              Place question bubbles on the pages first, then set answers here.
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
              {Array.from(new Set(positions.map((p) => p.question_number))).sort((a, b) => a - b).map((qNum) => (
                <div key={qNum} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: '1px solid var(--fog)', borderRadius: 8, background: 'var(--frost)' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--charcoal)', minWidth: 28 }}>Q{qNum}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {['A', 'B', 'C', 'D'].map((letter) => {
                      const val = getKeyValue(qNum);
                      return (
                        <button
                          key={letter}
                          onClick={() => setKeyEdits((prev) => ({ ...prev, [qNum]: val === letter ? '' : letter }))}
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            border: `1px solid ${val === letter ? 'var(--rose-deeper)' : 'var(--fog)'}`,
                            background: val === letter ? 'var(--rose)' : 'transparent',
                            color: val === letter ? 'var(--charcoal)' : 'var(--mist)',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontFamily: "'Syne', sans-serif",
                          }}
                        >
                          {letter}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
