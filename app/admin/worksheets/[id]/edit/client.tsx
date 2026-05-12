'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { UploadButton } from '@uploadthing/react';
import type { OurFileRouter } from '@/lib/uploadthing';
import {
  ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown,
  BookOpen, Layers, Lock, Unlock, GripVertical, FileText, ChevronLeft, ChevronRight,
  PanelLeftClose, PanelLeftOpen, Sun,
} from 'lucide-react';
import type { WsStep, WsPosition, WsProblem } from './page';

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
  const [newStepType, setNewStepType] = useState<'instruction' | 'problems' | 'warm_up'>('problems');
  const [newStepTitle, setNewStepTitle] = useState('');
  const [creatingStep, setCreatingStep] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const selectedStep = steps.find((s) => s.id === selectedStepId) ?? null;
  const wsId = worksheet.id;

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
      const full: WsStep = { ...step, type: step.type as 'instruction' | 'problems' | 'warm_up', pages: [], positions: [], answerKey: [], problems: [] };
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

  async function saveStepField(stepId: string, field: Record<string, unknown>) {
    const res = await fetch(`/api/admin/worksheets/${wsId}/steps/${stepId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(field),
    });
    if (!res.ok) toast.error('Save failed');
    return res.ok;
  }

  const SIDEBAR_W = 260;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', fontFamily: "'Syne', sans-serif", overflow: 'hidden' }}>

      {/* ── Top header bar ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 20px',
        height: 52,
        borderBottom: '1px solid var(--fog)',
        background: 'var(--white)',
        flexShrink: 0,
        zIndex: 10,
      }}>
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--mist)', display: 'flex', alignItems: 'center', padding: 4, borderRadius: 6 }}
          title={sidebarOpen ? 'Hide steps panel' : 'Show steps panel'}
        >
          {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
        </button>

        <Link href="/admin/worksheets" style={{ textDecoration: 'none' }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 7, border: '1px solid var(--fog)', background: 'var(--frost)', cursor: 'pointer', fontSize: 12, color: 'var(--slate)', fontFamily: "'Syne', sans-serif" }}>
            <ArrowLeft size={13} /> Back
          </button>
        </Link>

        <div style={{ width: 1, height: 20, background: 'var(--fog)' }} />

        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 700, color: 'var(--charcoal)', margin: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {worksheet.title}
        </h1>

        {/* Step quick-switcher in header */}
        {steps.length > 0 && (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', overflowX: 'auto', maxWidth: 480 }}>
            {steps.map((step) => (
              <button
                key={step.id}
                onClick={() => setSelectedStepId(step.id)}
                title={step.title}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 10px',
                  borderRadius: 20,
                  border: `1px solid ${selectedStepId === step.id ? (step.type === 'instruction' ? 'rgba(168,203,222,0.6)' : 'rgba(224,166,175,0.6)') : 'var(--fog)'}`,
                  background: selectedStepId === step.id ? (step.type === 'instruction' ? 'rgba(168,203,222,0.14)' : 'rgba(224,166,175,0.14)') : 'transparent',
                  color: selectedStepId === step.id ? 'var(--charcoal)' : 'var(--mist)',
                  fontSize: 11,
                  fontWeight: selectedStepId === step.id ? 700 : 500,
                  cursor: 'pointer',
                  fontFamily: "'Syne', sans-serif",
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {step.type === 'instruction' ? <BookOpen size={10} /> : step.type === 'warm_up' ? <Sun size={10} /> : <Layers size={10} />}
                {step.step_order}. {step.title}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => setAddingStep(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 7, border: '1px dashed rgba(168,203,222,0.5)', background: 'rgba(168,203,222,0.06)', color: 'var(--sky-deeper)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Syne', sans-serif", flexShrink: 0 }}
        >
          <Plus size={13} /> Add Step
        </button>
      </div>

      {/* ── Body: sidebar + editor ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── LEFT: Steps sidebar ── */}
        {sidebarOpen && (
          <div style={{
            width: SIDEBAR_W,
            flexShrink: 0,
            borderRight: '1px solid var(--fog)',
            background: 'var(--white)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            padding: '16px 12px',
          }}>
            <p style={sectionHead}>Steps ({steps.length})</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {steps.map((step, idx) => (
                <div
                  key={step.id}
                  onClick={() => setSelectedStepId(step.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '9px 10px',
                    borderRadius: 10,
                    border: `1px solid ${selectedStepId === step.id ? (step.type === 'instruction' ? 'rgba(168,203,222,0.5)' : 'rgba(224,166,175,0.5)') : 'var(--fog)'}`,
                    background: selectedStepId === step.id ? (step.type === 'instruction' ? 'rgba(168,203,222,0.08)' : 'rgba(224,166,175,0.08)') : 'var(--white)',
                    cursor: 'pointer',
                    transition: 'all 0.12s',
                  }}
                >
                  <GripVertical size={12} style={{ color: 'var(--fog)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 1 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--mist)' }}>{step.step_order}.</span>
                      {step.type === 'instruction'
                        ? <BookOpen size={10} style={{ color: 'var(--sky-deeper)', flexShrink: 0 }} />
                        : step.type === 'warm_up'
                        ? <Sun size={10} style={{ color: '#f59e0b', flexShrink: 0 }} />
                        : <Layers size={10} style={{ color: 'var(--rose-deeper)', flexShrink: 0 }} />}
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--charcoal)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {step.title}
                      </span>
                    </div>
                    {step.stage_label && (
                      <span style={{ fontSize: 10, color: 'var(--mist)' }}>{step.stage_label}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
                    <button onClick={(e) => { e.stopPropagation(); moveStep(step.id, 'up'); }} disabled={idx === 0} style={{ border: 'none', background: 'none', cursor: idx === 0 ? 'default' : 'pointer', color: idx === 0 ? 'var(--fog)' : 'var(--mist)', padding: 1, display: 'flex', alignItems: 'center' }}>
                      <ChevronUp size={11} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); moveStep(step.id, 'down'); }} disabled={idx === steps.length - 1} style={{ border: 'none', background: 'none', cursor: idx === steps.length - 1 ? 'default' : 'pointer', color: idx === steps.length - 1 ? 'var(--fog)' : 'var(--mist)', padding: 1, display: 'flex', alignItems: 'center' }}>
                      <ChevronDown size={11} />
                    </button>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteStep(step.id); }}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--cloud)', padding: 2, display: 'flex', alignItems: 'center', flexShrink: 0 }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#991B1B'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--cloud)'; }}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}

              {/* Add step inline form */}
              {addingStep ? (
                <div style={{ padding: 12, border: '1px dashed rgba(168,203,222,0.5)', borderRadius: 10, background: 'rgba(168,203,222,0.04)', marginTop: 4 }}>
                  <p style={labelStyle}>Step Type</p>
                  <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
                    {([
                      { type: 'instruction', label: 'Read', icon: <BookOpen size={10} />, activeBorder: 'rgba(168,203,222,0.5)', activeBg: 'rgba(168,203,222,0.12)' },
                      { type: 'problems', label: 'Problems', icon: <Layers size={10} />, activeBorder: 'rgba(224,166,175,0.5)', activeBg: 'rgba(224,166,175,0.12)' },
                      { type: 'warm_up', label: 'Warm-Up', icon: <Sun size={10} />, activeBorder: 'rgba(251,191,36,0.5)', activeBg: 'rgba(251,191,36,0.12)' },
                    ] as const).map(({ type: t, label, icon, activeBorder, activeBg }) => (
                      <button key={t} onClick={() => setNewStepType(t)} style={{ flex: 1, padding: '5px 0', borderRadius: 7, border: `1px solid ${newStepType === t ? activeBorder : 'var(--fog)'}`, background: newStepType === t ? activeBg : 'transparent', color: newStepType === t ? 'var(--charcoal)' : 'var(--mist)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'Syne', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                        {icon}
                        {label}
                      </button>
                    ))}
                  </div>
                  <p style={labelStyle}>Title</p>
                  <input value={newStepTitle} onChange={(e) => setNewStepTitle(e.target.value)} placeholder={newStepType === 'instruction' ? 'e.g. Intro Reading' : 'e.g. Warm-Up'} style={{ ...inputStyle, marginBottom: 10 }} onKeyDown={(e) => { if (e.key === 'Enter') handleAddStep(); }} autoFocus />
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button onClick={() => { setAddingStep(false); setNewStepTitle(''); }} style={{ flex: 1, padding: '5px 0', borderRadius: 7, border: '1px solid var(--fog)', background: 'transparent', color: 'var(--slate)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: "'Syne', sans-serif" }}>Cancel</button>
                    <button onClick={handleAddStep} disabled={creatingStep} style={{ flex: 1, padding: '5px 0', borderRadius: 7, border: 'none', background: 'var(--rose)', color: 'var(--charcoal)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: "'Syne', sans-serif" }}>{creatingStep ? '…' : 'Add'}</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAddingStep(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '8px 0', borderRadius: 10, border: '1px dashed rgba(168,203,222,0.4)', background: 'rgba(168,203,222,0.04)', color: 'var(--sky-deeper)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Syne', sans-serif", marginTop: 4 }}>
                  <Plus size={12} /> Add Step
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── RIGHT: Step editor ── */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {selectedStep ? (
            selectedStep.type === 'instruction'
              ? (
                <InstructionStepEditor
                  key={selectedStep.id}
                  step={selectedStep}
                  onUpdate={(patch) => updateStepLocal(selectedStep.id, patch)}
                  onSaveField={saveStepField}
                />
              )
              : selectedStep.type === 'warm_up'
              ? (
                <WarmUpStepInfo key={selectedStep.id} step={selectedStep} onSaveField={saveStepField} />
              )
              : (
                <ProblemsStepEditor
                  key={selectedStep.id}
                  step={selectedStep}
                  wsId={wsId}
                  onUpdate={(patch) => updateStepLocal(selectedStep.id, patch)}
                  onSaveField={saveStepField}
                />
              )
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--mist)', fontSize: 13 }}>
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
  initialPdfUrl,
  onPdfUrlSave,
}: {
  wsId: string;
  stepId: string;
  problems: WsProblem[];
  positions: WsPosition[];
  onProblemsChange: (p: WsProblem[]) => void;
  onPositionsChange: (p: WsPosition[]) => void;
  initialPdfUrl: string | null;
  onPdfUrlSave: (url: string) => void;
}) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<unknown>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [phase, setPhase] = useState<PdfPhase>('crop');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [croppingProblem, setCroppingProblem] = useState(false);

  const [bubbleQIdx, setBubbleQIdx] = useState(0);
  const [placingBubbleLetter, setPlacingBubbleLetter] = useState<string | null>(null);

  const [akQIdx, setAkQIdx] = useState(0);
  const [akEdits, setAkEdits] = useState<Record<number, { letter: string; expUrl: string | null; questionType: 'multiple_choice' | 'open_ended'; acceptedAnswers: string }>>({});
  const [akCropRect, setAkCropRect] = useState<CropRect | null>(null);
  const [akDragStart, setAkDragStart] = useState<{ x: number; y: number } | null>(null);
  const [savingAk, setSavingAk] = useState<number | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!lightboxUrl) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightboxUrl(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxUrl]);

  const [autoImporting, setAutoImporting] = useState(false);
  const [autoImportResult, setAutoImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const autoImportInputRef = useRef<HTMLInputElement>(null);

  async function handleAutoImport(file: File) {
    setAutoImporting(true);
    setAutoImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/admin/worksheets/${wsId}/steps/${stepId}/auto-import`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json() as {
        imported?: number;
        skipped_parse?: { external_id: string; reason: string }[];
        failed_pages?: { page: number; external_id: string; reason: string }[];
        error?: string;
      };
      if (!res.ok) { toast.error(data.error ?? 'Auto-import failed'); return; }
      const skippedCount = (data.skipped_parse?.length ?? 0) + (data.failed_pages?.length ?? 0);
      setAutoImportResult({ imported: data.imported ?? 0, skipped: skippedCount });
      toast.success(`Auto-imported ${data.imported} question${(data.imported ?? 0) !== 1 ? 's' : ''}`);
      // Reload the step data by refreshing problems + positions via the parent
      const [probRes, posRes] = await Promise.all([
        fetch(`/api/admin/worksheets/${wsId}/steps/${stepId}/problems`),
        fetch(`/api/admin/worksheets/${wsId}/steps/${stepId}/positions`),
      ]);
      if (probRes.ok) {
        const { problems: newProblems } = await probRes.json() as { problems: WsProblem[] };
        onProblemsChange(newProblems);
      }
      if (posRes.ok) {
        const { positions: newPositions } = await posRes.json() as { positions: WsPosition[] };
        onPositionsChange(newPositions);
      }
      if ((data.imported ?? 0) > 0) setPhase('bubbles');
    } catch {
      toast.error('Auto-import failed');
    } finally {
      setAutoImporting(false);
    }
  }

  const [pdfZoom, setPdfZoom] = useState(1.5);
  const ZOOM_MIN = 0.25;
  const ZOOM_MAX = 3.0;
  const ZOOM_STEP = 0.25;

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
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = canvasRef.current!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d')!;
      await page.render({ canvasContext: ctx, viewport }).promise;
    })();
    return () => { cancelled = true; };
  }, [pdfDoc, currentPage]);

  useEffect(() => {
    setCropRect(null);
    setAkCropRect(null);
  }, [pdfZoom]);

  useEffect(() => {
    if (initialPdfUrl && !pdfDoc) {
      setPdfUrl(initialPdfUrl);
      loadPdf(initialPdfUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadPdf(url: string) {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
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
    const newPositions = [...positions.filter((p) => p.question_number !== encodedQNum), position];
    onPositionsChange(newPositions);
    toast.success(`Placed ${placingBubbleLetter} on Q${questionNumber}`);
    const letters = ['A', 'B', 'C', 'D'];
    const currentIdx = letters.indexOf(placingBubbleLetter);
    const nextLetter = letters.slice(currentIdx + 1).find((l) => {
      const enc = questionNumber * 10 + (letterMap[l] ?? 0);
      return !newPositions.some((p) => p.question_number === enc);
    }) ?? null;
    if (nextLetter) {
      setPlacingBubbleLetter(nextLetter);
    } else if (bubbleQIdx < problems.length - 1) {
      setBubbleQIdx((i) => i + 1);
      setPlacingBubbleLetter('A');
    } else {
      setPlacingBubbleLetter(null);
    }
  }

  function parseAcceptedAnswers(raw: string): string[] {
    return raw.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
  }

  async function handleSaveAllAnswers() {
    if (problems.length === 0) { toast.error('No questions to save'); return; }
    setSavingAk(-1);
    try {
      const results = await Promise.all(
        problems.map(async (p) => {
          const qType = akEdits[p.question_number]?.questionType ?? p.question_type ?? 'multiple_choice';
          const expUrl = akEdits[p.question_number]?.expUrl ?? p.explanation_image_url ?? null;
          const letter = qType === 'multiple_choice'
            ? (akEdits[p.question_number]?.letter ?? p.correct_answer ?? '').toUpperCase() || null
            : null;
          const rawAccepted = akEdits[p.question_number]?.acceptedAnswers ?? (p.accepted_answers ?? []).join('\n');
          const acceptedAnswers = qType === 'open_ended' ? parseAcceptedAnswers(rawAccepted) : [];
          const res = await fetch(`/api/admin/worksheets/${wsId}/steps/${stepId}/problems`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ questionNumber: p.question_number, correctAnswer: letter, explanationImageUrl: expUrl, questionType: qType, acceptedAnswers }),
          });
          if (!res.ok) throw new Error(`Q${p.question_number} failed`);
          const { problem: updated } = await res.json() as { problem: WsProblem };
          return updated;
        }),
      );
      onProblemsChange(problems.map((p) => results.find((u) => u.id === p.id) ?? p));
      toast.success(`Saved ${results.length} answers`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
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

  // Shared page navigation bar
  const PageNav = ({ small }: { small?: boolean }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button
        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
        disabled={currentPage === 1}
        style={{ border: '1px solid var(--fog)', background: 'var(--frost)', borderRadius: 7, padding: small ? '3px 8px' : '5px 12px', cursor: currentPage === 1 ? 'default' : 'pointer', color: 'var(--mist)', display: 'flex', alignItems: 'center' }}
      >
        <ChevronLeft size={small ? 12 : 14} />
      </button>
      <span style={{ fontSize: small ? 11 : 13, color: 'var(--slate)', fontWeight: 600, whiteSpace: 'nowrap' }}>
        Page {currentPage} / {totalPages}
      </span>
      <button
        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        disabled={currentPage === totalPages}
        style={{ border: '1px solid var(--fog)', background: 'var(--frost)', borderRadius: 7, padding: small ? '3px 8px' : '5px 12px', cursor: currentPage === totalPages ? 'default' : 'pointer', color: 'var(--mist)', display: 'flex', alignItems: 'center' }}
      >
        <ChevronRight size={small ? 12 : 14} />
      </button>
      <div style={{ width: 1, height: 18, background: 'var(--fog)', marginLeft: 2 }} />
      <button
        onClick={() => setPdfZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))}
        disabled={pdfZoom <= ZOOM_MIN}
        title="Zoom out"
        style={{ border: '1px solid var(--fog)', background: 'var(--frost)', borderRadius: 7, padding: small ? '3px 7px' : '4px 9px', cursor: pdfZoom <= ZOOM_MIN ? 'default' : 'pointer', color: 'var(--mist)', fontSize: small ? 14 : 16, fontWeight: 700, lineHeight: 1 }}
      >−</button>
      <span style={{ fontSize: small ? 11 : 12, color: 'var(--slate)', fontWeight: 600, minWidth: 38, textAlign: 'center', whiteSpace: 'nowrap' }}>
        {Math.round(pdfZoom * 100)}%
      </span>
      <button
        onClick={() => setPdfZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))}
        disabled={pdfZoom >= ZOOM_MAX}
        title="Zoom in"
        style={{ border: '1px solid var(--fog)', background: 'var(--frost)', borderRadius: 7, padding: small ? '3px 7px' : '4px 9px', cursor: pdfZoom >= ZOOM_MAX ? 'default' : 'pointer', color: 'var(--mist)', fontSize: small ? 14 : 16, fontWeight: 700, lineHeight: 1 }}
      >+</button>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Phase tabs */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 20px', borderBottom: '1px solid var(--fog)', background: 'var(--white)', flexShrink: 0 }}>
        {(['crop', 'bubbles', 'answerkey'] as PdfPhase[]).map((p) => {
          const labels: Record<PdfPhase, string> = { crop: '1. Crop Questions', bubbles: '2. Place Bubbles', answerkey: '3. Answer Key' };
          return (
            <button
              key={p}
              onClick={() => setPhase(p)}
              style={{
                padding: '6px 16px',
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
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
          {!pdfUrl ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
              {/* Manual crop flow */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '20px 28px', border: '1px solid var(--fog)', borderRadius: 12, background: 'var(--frost)' }}>
                <FileText size={32} style={{ color: 'var(--sky-deeper)', opacity: 0.5 }} />
                <p style={{ fontSize: 13, color: 'var(--mist)', margin: 0, fontWeight: 600 }}>Manual crop</p>
                <p style={{ fontSize: 12, color: 'var(--mist)', margin: 0, textAlign: 'center', maxWidth: 220 }}>Upload a PDF and crop each question by hand</p>
                <UploadButton<OurFileRouter, 'pdfUploader'>
                  endpoint="pdfUploader"
                  onClientUploadComplete={async (files) => {
                    if (!files[0]) return;
                    const url = files[0].ufsUrl ?? files[0].url;
                    setPdfUrl(url);
                    await loadPdf(url);
                    onPdfUrlSave(url);
                    toast.success('PDF loaded');
                  }}
                  onUploadError={(e) => { toast.error(`Upload error: ${e.message}`); }}
                  appearance={{ button: 'bg-[#A8CBDE] text-[#1A1D23] text-sm font-semibold py-2.5 px-6 rounded-lg font-[Syne]' }}
                />
              </div>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: 340 }}>
                <div style={{ flex: 1, height: 1, background: 'var(--fog)' }} />
                <span style={{ fontSize: 11, color: 'var(--mist)', fontWeight: 600 }}>OR</span>
                <div style={{ flex: 1, height: 1, background: 'var(--fog)' }} />
              </div>

              {/* Auto-import flow */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '20px 28px', border: '1px solid rgba(168,203,222,0.4)', borderRadius: 12, background: 'rgba(168,203,222,0.06)' }}>
                <Layers size={32} style={{ color: 'var(--sky-deeper)', opacity: 0.7 }} />
                <p style={{ fontSize: 13, color: 'var(--charcoal)', margin: 0, fontWeight: 600 }}>Auto-import Question Bank PDF</p>
                <p style={{ fontSize: 12, color: 'var(--mist)', margin: 0, textAlign: 'center', maxWidth: 260 }}>
                  Upload a College Board question bank PDF. Questions, bubbles, answers, and rationale are extracted automatically.
                </p>
                <input
                  ref={autoImportInputRef}
                  type="file"
                  accept=".pdf"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleAutoImport(f);
                    e.target.value = '';
                  }}
                />
                {autoImportResult && (
                  <p style={{ fontSize: 12, color: 'var(--sky-deeper)', margin: 0, fontWeight: 600 }}>
                    Imported {autoImportResult.imported} question{autoImportResult.imported !== 1 ? 's' : ''}
                    {autoImportResult.skipped > 0 ? ` (${autoImportResult.skipped} skipped)` : ''}
                  </p>
                )}
                <button
                  onClick={() => autoImportInputRef.current?.click()}
                  disabled={autoImporting}
                  style={{
                    padding: '8px 24px',
                    borderRadius: 8,
                    border: 'none',
                    background: autoImporting ? 'var(--fog)' : 'var(--sky-deeper)',
                    color: autoImporting ? 'var(--mist)' : 'var(--white)',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: autoImporting ? 'default' : 'pointer',
                    fontFamily: "'Syne', sans-serif",
                  }}
                >
                  {autoImporting ? 'Importing…' : 'Select PDF to Auto-Import'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
              {/* PDF canvas — takes maximum width */}
              <div style={{ flex: '1 1 0', overflow: 'auto', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--fog)' }}>
                {/* Toolbar above canvas */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', background: 'var(--white)', borderBottom: '1px solid var(--fog)', flexShrink: 0 }}>
                  <PageNav />
                  <span style={{ fontSize: 11, color: 'var(--mist)', flex: 1 }}>
                    Click and drag to select a question region
                  </span>
                  <button
                    onClick={handleAddQuestion}
                    disabled={croppingProblem || !cropRect}
                    style={{
                      padding: '6px 18px',
                      borderRadius: 8,
                      border: 'none',
                      background: cropRect ? 'var(--rose)' : 'var(--fog)',
                      color: 'var(--charcoal)',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: cropRect ? 'pointer' : 'default',
                      fontFamily: "'Syne', sans-serif",
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {croppingProblem ? 'Adding…' : '+ Add Question'}
                  </button>
                  <button
                    onClick={() => { setPdfUrl(null); setPdfDoc(null); setTotalPages(0); setCropRect(null); }}
                    style={{ fontSize: 11, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Syne', sans-serif", whiteSpace: 'nowrap' }}
                  >
                    Change PDF
                  </button>
                </div>

                {/* Canvas — fills remaining height, scrollable */}
                <div style={{ flex: 1, overflow: 'auto', padding: 0 }}>
                  <div style={{ transformOrigin: 'top left', transform: `scale(${pdfZoom})`, display: 'inline-block' }}>
                    <div style={{ position: 'relative', display: 'inline-block', userSelect: 'none' }}>
                      <canvas
                        ref={canvasRef}
                        style={{ display: 'block', cursor: 'crosshair' }}
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
                            background: 'rgba(168,203,222,0.18)',
                            pointerEvents: 'none',
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Questions list — fixed right panel */}
              <div style={{ width: 240, flexShrink: 0, overflowY: 'auto', padding: '12px', background: 'var(--frost)' }}>
                <p style={sectionHead}>Cropped ({problems.length})</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {problems.sort((a, b) => a.question_number - b.question_number).map((prob) => (
                    <div key={prob.id} style={{ border: '1px solid var(--fog)', borderRadius: 8, overflow: 'hidden', background: 'var(--white)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 8px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--charcoal)' }}>Q{prob.question_number}</span>
                        <button
                          onClick={() => handleDeleteProblem(prob.id, prob.question_number)}
                          style={{ marginLeft: 'auto', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--cloud)', padding: 2, display: 'flex', alignItems: 'center' }}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={prob.question_image_url} alt={`Q${prob.question_number}`} onClick={() => setLightboxUrl(prob.question_image_url)} style={{ display: 'block', width: '100%', cursor: 'zoom-in' }} />
                    </div>
                  ))}
                  {problems.length === 0 && <p style={{ fontSize: 11, color: 'var(--cloud)', textAlign: 'center', padding: 16 }}>No questions yet</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Phase 2: Place Bubbles ── */}
      {phase === 'bubbles' && (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {problems.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--mist)' }}>Crop questions first in the &quot;Crop Questions&quot; phase.</p>
            </div>
          ) : (
            <>
              {/* Bubble nav bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', background: 'var(--white)', borderBottom: '1px solid var(--fog)', flexShrink: 0 }}>
                <button onClick={() => setBubbleQIdx((i) => Math.max(0, i - 1))} disabled={bubbleQIdx === 0} style={{ border: '1px solid var(--fog)', background: 'var(--frost)', borderRadius: 7, padding: '4px 10px', cursor: bubbleQIdx === 0 ? 'default' : 'pointer', color: 'var(--mist)', display: 'flex', alignItems: 'center' }}>
                  <ChevronLeft size={14} />
                </button>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--charcoal)' }}>
                  Q{bubbleProblem?.question_number} ({bubbleQIdx + 1} / {problems.length})
                </span>
                <button onClick={() => setBubbleQIdx((i) => Math.min(problems.length - 1, i + 1))} disabled={bubbleQIdx === problems.length - 1} style={{ border: '1px solid var(--fog)', background: 'var(--frost)', borderRadius: 7, padding: '4px 10px', cursor: bubbleQIdx === problems.length - 1 ? 'default' : 'pointer', color: 'var(--mist)', display: 'flex', alignItems: 'center' }}>
                  <ChevronRight size={14} />
                </button>
                <span style={{ fontSize: 11, color: 'var(--mist)', flex: 1 }}>Select a letter, then click on the question image to position it</span>
              </div>

              {bubbleProblem && (
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
                  {/* Question image — fills space */}
                  <div style={{ flex: 1, overflow: 'auto' }}>
                    {(akEdits[bubbleProblem.question_number]?.questionType ?? bubbleProblem.question_type) === 'open_ended' ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 12 }}>
                        <div style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(168,203,222,0.12)', border: '1px solid rgba(168,203,222,0.4)', fontSize: 13, color: 'var(--sky-deeper)', fontWeight: 600 }}>
                          Open Ended — no bubbles needed
                        </div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={bubbleProblem.question_image_url} alt={`Q${bubbleProblem.question_number}`} style={{ maxWidth: '80%', borderRadius: 8, border: '1px solid var(--fog)' }} />
                      </div>
                    ) : (
                      <div
                        onClick={handleBubbleImageClick}
                        style={{ position: 'relative', width: '100%', cursor: placingBubbleLetter ? 'crosshair' : 'default', userSelect: 'none' }}
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
                              width: 28,
                              height: 28,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 11,
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
                    )}
                  </div>

                  {/* Letter controls — right panel */}
                  <div style={{ width: 160, flexShrink: 0, padding: '16px 12px', background: 'var(--frost)', borderLeft: '1px solid var(--fog)', display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
                    <p style={sectionHead}>Place Letter</p>
                    {['A', 'B', 'C', 'D'].map((letter) => {
                      const placed = getPositionsForProblem(bubbleProblem.question_number)
                        .some((p) => letterFromEncoded(p.question_number) === letter);
                      return (
                        <button
                          key={letter}
                          onClick={() => setPlacingBubbleLetter((l) => l === letter ? null : letter)}
                          style={{
                            padding: '10px 0',
                            borderRadius: 8,
                            border: `1px solid ${placingBubbleLetter === letter ? 'rgba(224,166,175,0.5)' : placed ? 'rgba(21,128,61,0.4)' : 'var(--fog)'}`,
                            background: placingBubbleLetter === letter ? 'rgba(224,166,175,0.15)' : placed ? 'rgba(21,128,61,0.08)' : 'var(--white)',
                            color: placed ? '#15803d' : 'var(--charcoal)',
                            fontSize: 14,
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontFamily: "'Syne', sans-serif",
                          }}
                        >
                          {letter} {placed ? '✓' : ''}
                        </button>
                      );
                    })}
                    <div style={{ borderTop: '1px solid var(--fog)', paddingTop: 8, marginTop: 4 }}>
                      {getPositionsForProblem(bubbleProblem.question_number).map((pos) => (
                        <div key={pos.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--slate)', marginBottom: 4 }}>
                          <span style={{ fontWeight: 600 }}>{letterFromEncoded(pos.question_number)}</span>
                          <span style={{ color: 'var(--mist)', fontSize: 10 }}>({pos.x_percent.toFixed(0)}%,{pos.y_percent.toFixed(0)}%)</span>
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
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Phase 3: Answer Key ── */}
      {phase === 'answerkey' && (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {problems.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--mist)' }}>Crop questions first.</p>
            </div>
          ) : (
            <>
              {/* Answer key nav bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', background: 'var(--white)', borderBottom: '1px solid var(--fog)', flexShrink: 0 }}>
                <button onClick={() => setAkQIdx((i) => Math.max(0, i - 1))} disabled={akQIdx === 0} style={{ border: '1px solid var(--fog)', background: 'var(--frost)', borderRadius: 7, padding: '4px 10px', cursor: akQIdx === 0 ? 'default' : 'pointer', color: 'var(--mist)', display: 'flex', alignItems: 'center' }}>
                  <ChevronLeft size={14} />
                </button>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--charcoal)' }}>
                  Q{akProblem?.question_number} ({akQIdx + 1} / {problems.length})
                </span>
                <button onClick={() => setAkQIdx((i) => Math.min(problems.length - 1, i + 1))} disabled={akQIdx === problems.length - 1} style={{ border: '1px solid var(--fog)', background: 'var(--frost)', borderRadius: 7, padding: '4px 10px', cursor: akQIdx === problems.length - 1 ? 'default' : 'pointer', color: 'var(--mist)', display: 'flex', alignItems: 'center' }}>
                  <ChevronRight size={14} />
                </button>
                {savingAk !== null && <span style={{ fontSize: 11, color: 'var(--mist)', marginLeft: 4 }}>Saving…</span>}
                <button
                  onClick={handleSaveAllAnswers}
                  disabled={savingAk !== null}
                  style={{ marginLeft: 'auto', padding: '6px 18px', borderRadius: 8, border: 'none', background: 'var(--rose)', color: 'var(--charcoal)', fontSize: 12, fontWeight: 600, cursor: savingAk !== null ? 'default' : 'pointer', fontFamily: "'Syne', sans-serif" }}
                >
                  {savingAk === -1 ? 'Saving…' : 'Save All Answers'}
                </button>
              </div>

              {akProblem && (
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
                  {/* Left: question image + answer selector */}
                  <div style={{ width: 240, flexShrink: 0, overflowY: 'auto', padding: 16, borderRight: '1px solid var(--fog)', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <p style={sectionHead}>Question {akProblem.question_number}</p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={akProblem.question_image_url} alt={`Q${akProblem.question_number}`} onClick={() => setLightboxUrl(akProblem.question_image_url)} style={{ display: 'block', width: '100%', borderRadius: 8, border: '1px solid var(--fog)', cursor: 'zoom-in' }} />
                    </div>
                    <div>
                      <p style={{ ...sectionHead, marginBottom: 8 }}>Question Type</p>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                        {(['multiple_choice', 'open_ended'] as const).map((qt) => {
                          const currentType = akEdits[akProblem.question_number]?.questionType ?? akProblem.question_type ?? 'multiple_choice';
                          return (
                            <button
                              key={qt}
                              onClick={() => setAkEdits((prev) => ({
                                ...prev,
                                [akProblem.question_number]: {
                                  letter: prev[akProblem.question_number]?.letter ?? akProblem.correct_answer ?? '',
                                  expUrl: prev[akProblem.question_number]?.expUrl ?? akProblem.explanation_image_url ?? null,
                                  acceptedAnswers: prev[akProblem.question_number]?.acceptedAnswers ?? (akProblem.accepted_answers ?? []).join('\n'),
                                  questionType: qt,
                                },
                              }))}
                              style={{
                                flex: 1,
                                padding: '6px 4px',
                                borderRadius: 7,
                                border: `1px solid ${currentType === qt ? (qt === 'multiple_choice' ? 'rgba(224,166,175,0.5)' : 'rgba(168,203,222,0.5)') : 'var(--fog)'}`,
                                background: currentType === qt ? (qt === 'multiple_choice' ? 'rgba(224,166,175,0.14)' : 'rgba(168,203,222,0.14)') : 'var(--frost)',
                                color: currentType === qt ? 'var(--charcoal)' : 'var(--mist)',
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: 'pointer',
                                fontFamily: "'Syne', sans-serif",
                              }}
                            >
                              {qt === 'multiple_choice' ? 'Multiple Choice' : 'Open Ended'}
                            </button>
                          );
                        })}
                      </div>

                      {(akEdits[akProblem.question_number]?.questionType ?? akProblem.question_type ?? 'multiple_choice') === 'multiple_choice' ? (
                        <>
                          <p style={{ ...sectionHead, marginBottom: 10 }}>Correct Answer</p>
                          <div style={{ display: 'flex', gap: 10 }}>
                            {['A', 'B', 'C', 'D'].map((letter) => {
                              const current = akEdits[akProblem.question_number]?.letter ?? akProblem.correct_answer ?? '';
                              return (
                                <button
                                  key={letter}
                                  onClick={async () => {
                                    const expUrl = akEdits[akProblem.question_number]?.expUrl ?? akProblem.explanation_image_url ?? null;
                                    const qType = akEdits[akProblem.question_number]?.questionType ?? akProblem.question_type ?? 'multiple_choice';
                                    const rawAccepted = akEdits[akProblem.question_number]?.acceptedAnswers ?? (akProblem.accepted_answers ?? []).join('\n');
                                    setAkEdits((prev) => ({ ...prev, [akProblem.question_number]: { ...prev[akProblem.question_number], letter, expUrl: prev[akProblem.question_number]?.expUrl ?? null, questionType: qType, acceptedAnswers: rawAccepted } }));
                                    setSavingAk(akProblem.question_number);
                                    try {
                                      const res = await fetch(`/api/admin/worksheets/${wsId}/steps/${stepId}/problems`, {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ questionNumber: akProblem.question_number, correctAnswer: letter, explanationImageUrl: expUrl, questionType: qType, acceptedAnswers: [] }),
                                      });
                                      if (res.ok) {
                                        const { problem: updated } = await res.json() as { problem: WsProblem };
                                        onProblemsChange(problems.map((p) => p.id === updated.id ? updated : p));
                                      }
                                    } finally {
                                      setSavingAk(null);
                                    }
                                  }}
                                  style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: '50%',
                                    border: `2px solid ${current === letter ? 'var(--rose-deeper)' : 'var(--fog)'}`,
                                    background: current === letter ? 'var(--rose)' : 'var(--frost)',
                                    color: 'var(--charcoal)',
                                    fontSize: 15,
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
                        </>
                      ) : (
                        <>
                          <p style={{ ...sectionHead, marginBottom: 6 }}>Accepted Answers</p>
                          <p style={{ fontSize: 10, color: 'var(--mist)', marginBottom: 6 }}>One per line or comma-separated</p>
                          <textarea
                            rows={4}
                            placeholder={'6/7\n0.857\n0.8571'}
                            value={akEdits[akProblem.question_number]?.acceptedAnswers ?? (akProblem.accepted_answers ?? []).join('\n')}
                            onChange={(e) => setAkEdits((prev) => ({
                              ...prev,
                              [akProblem.question_number]: {
                                letter: prev[akProblem.question_number]?.letter ?? '',
                                expUrl: prev[akProblem.question_number]?.expUrl ?? akProblem.explanation_image_url ?? null,
                                questionType: 'open_ended',
                                acceptedAnswers: e.target.value,
                              },
                            }))}
                            style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
                          />
                        </>
                      )}
                    </div>
                    {(akEdits[akProblem.question_number]?.expUrl ?? akProblem.explanation_image_url) && (
                      <div>
                        <p style={{ ...sectionHead, marginBottom: 6 }}>Explanation Image</p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={akEdits[akProblem.question_number]?.expUrl ?? akProblem.explanation_image_url!}
                          alt="explanation"
                          onClick={() => setLightboxUrl(akEdits[akProblem.question_number]?.expUrl ?? akProblem.explanation_image_url!)}
                          style={{ display: 'block', width: '100%', borderRadius: 8, border: '1px solid var(--fog)', cursor: 'zoom-in' }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Right: PDF to crop explanation */}
                  <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {!pdfUrl ? (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                        <p style={{ fontSize: 13, color: 'var(--mist)' }}>Upload or re-load the PDF to crop the explanation</p>
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
                          appearance={{ button: 'bg-[#A8CBDE] text-[#1A1D23] text-sm font-semibold py-2.5 px-6 rounded-lg font-[Syne]' }}
                        />
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', background: 'var(--white)', borderBottom: '1px solid var(--fog)', flexShrink: 0 }}>
                          <PageNav small />
                          <span style={{ fontSize: 11, color: 'var(--mist)', flex: 1 }}>Drag to select the explanation region</span>
                          <button
                            onClick={() => handleCropExplanation(akProblem)}
                            disabled={!akCropRect}
                            style={{ padding: '5px 14px', borderRadius: 7, border: 'none', background: akCropRect ? 'var(--rose)' : 'var(--fog)', color: 'var(--charcoal)', fontSize: 12, fontWeight: 600, cursor: akCropRect ? 'pointer' : 'default', fontFamily: "'Syne', sans-serif", whiteSpace: 'nowrap' }}
                          >
                            Crop Explanation
                          </button>
                        </div>
                        <div style={{ flex: 1, overflow: 'auto' }}>
                          <div style={{ transformOrigin: 'top left', transform: `scale(${pdfZoom})`, display: 'inline-block' }}>
                            <div style={{ position: 'relative', display: 'inline-block', userSelect: 'none' }}>
                              <canvas
                                ref={canvasRef}
                                style={{ display: 'block', cursor: 'crosshair' }}
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
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            style={{ position: 'absolute', top: 18, right: 22, background: 'none', border: 'none', color: 'white', fontSize: 28, cursor: 'pointer', lineHeight: 1 }}
            aria-label="Close"
          >
            ✕
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt="enlarged"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 10, boxShadow: '0 8px 48px rgba(0,0,0,0.5)', objectFit: 'contain' }}
          />
        </div>
      )}
    </div>
  );
}

// ── Warm-Up Step Info ─────────────────────────────────────────────────────────

function WarmUpStepInfo({
  step,
  onSaveField,
}: {
  step: WsStep;
  onSaveField: (stepId: string, field: Record<string, unknown>) => Promise<boolean>;
}) {
  const [title, setTitle] = useState(step.title);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto' }}>
      {/* Settings bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: '1px solid var(--fog)', background: 'var(--white)', flexShrink: 0, flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#b45309', background: 'rgba(251,191,36,0.14)', border: '1px solid rgba(251,191,36,0.3)', padding: '3px 10px', borderRadius: 20 }}>
          <Sun size={11} /> Warm-Up Step
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--mist)' }}>Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => { if (title.trim() && title !== step.title) onSaveField(step.id, { title: title.trim() }); }}
            style={{ padding: '4px 10px', borderRadius: 7, border: '1px solid var(--fog)', background: 'var(--frost)', fontSize: 12, fontWeight: 600, color: 'var(--charcoal)', fontFamily: "'Syne', sans-serif", outline: 'none', width: 200 }}
          />
        </div>
      </div>

      {/* Info */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 40, textAlign: 'center' }}>
        <Sun size={36} style={{ color: '#f59e0b', opacity: 0.7 }} />
        <div style={{ maxWidth: 440 }}>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, color: 'var(--charcoal)', margin: '0 0 8px' }}>
            Dynamic Warm-Up Step
          </h3>
          <p style={{ fontSize: 13, color: 'var(--mist)', lineHeight: 1.6, margin: 0 }}>
            When a student opens this worksheet, this step will automatically show all breakfast problems they answered incorrectly since their last worksheet was assigned. No configuration needed — the content is generated dynamically per student.
          </p>
        </div>
        <div style={{ fontSize: 12, color: 'var(--mist)', padding: '10px 16px', borderRadius: 10, border: '1px solid var(--fog)', background: 'var(--frost)', maxWidth: 360 }}>
          <strong style={{ color: 'var(--charcoal)' }}>If no mistakes exist</strong> — the step is skipped automatically.
          <br />
          <strong style={{ color: 'var(--charcoal)' }}>If no breakfast history</strong> — students see a prompt to complete breakfast problems first.
        </div>
      </div>
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Compact settings bar at top */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: '1px solid var(--fog)', background: 'var(--white)', flexShrink: 0, flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: 'var(--sky-deeper)', background: 'rgba(168,203,222,0.14)', border: '1px solid rgba(168,203,222,0.3)', padding: '3px 10px', borderRadius: 20 }}>
          <BookOpen size={11} /> Instruction Step
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ ...labelStyle, marginBottom: 0, whiteSpace: 'nowrap' }}>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ ...inputStyle, width: 200 }} placeholder="Step title" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ ...labelStyle, marginBottom: 0, whiteSpace: 'nowrap' }}>Stage</label>
          <input value={stageLabel} onChange={(e) => setStageLabel(e.target.value)} style={{ ...inputStyle, width: 160 }} placeholder="e.g. Review Together" />
        </div>
        <button
          onClick={saveMeta}
          disabled={savingMeta}
          style={{ padding: '6px 16px', borderRadius: 8, border: 'none', background: 'var(--rose)', color: 'var(--charcoal)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Syne', sans-serif", whiteSpace: 'nowrap' }}
        >
          {savingMeta ? 'Saving…' : 'Save'}
        </button>
      </div>

      {/* PDF — fills remaining height */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {step.pdf_url ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'rgba(168,203,222,0.06)', borderBottom: '1px solid rgba(168,203,222,0.2)', flexShrink: 0 }}>
              <BookOpen size={13} style={{ color: 'var(--sky-deeper)' }} />
              <span style={{ fontSize: 12, color: 'var(--charcoal)', flex: 1 }}>PDF uploaded</span>
              <a href={step.pdf_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--sky-deeper)', textDecoration: 'none', fontWeight: 600 }}>View ↗</a>
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
            <iframe
              src={step.pdf_url}
              style={{ flex: 1, width: '100%', border: 'none' }}
              title="Instruction PDF preview"
            />
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <FileText size={40} style={{ color: 'var(--sky-deeper)', opacity: 0.4 }} />
            <p style={{ fontSize: 13, color: 'var(--mist)' }}>Upload the instruction PDF that students will read for this step</p>
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
              appearance={{ button: 'bg-[#A8CBDE] text-[#1A1D23] text-sm font-semibold py-2.5 px-6 rounded-lg font-[Syne]' }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Problems Step Editor ──────────────────────────────────────────────────────

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
  const [title, setTitle] = useState(step.title);
  const [stageLabel, setStageLabel] = useState(step.stage_label ?? '');
  const [lockedNav, setLockedNav] = useState(step.locked_nav);
  const [savingMeta, setSavingMeta] = useState(false);

  const [positions, setPositions] = useState<WsPosition[]>(step.positions);
  const [problems, setProblems] = useState<WsProblem[]>(step.problems);

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Settings bar */}
      <div style={{ borderBottom: '1px solid var(--fog)', background: 'var(--white)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: 'var(--rose-deeper)', background: 'rgba(224,166,175,0.14)', border: '1px solid rgba(224,166,175,0.3)', padding: '3px 10px', borderRadius: 20, flexShrink: 0 }}>
            <Layers size={11} /> Problems Step
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ ...labelStyle, marginBottom: 0, whiteSpace: 'nowrap' }}>Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ ...inputStyle, width: 180 }} placeholder="Step title" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ ...labelStyle, marginBottom: 0, whiteSpace: 'nowrap' }}>Stage</label>
            <input value={stageLabel} onChange={(e) => setStageLabel(e.target.value)} style={{ ...inputStyle, width: 140 }} placeholder="e.g. Student Work" />
          </div>
          <button
            onClick={() => setLockedNav((v) => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, border: `1px solid ${lockedNav ? 'rgba(224,166,175,0.5)' : 'var(--fog)'}`, background: lockedNav ? 'rgba(224,166,175,0.1)' : 'transparent', color: lockedNav ? 'var(--rose-deeper)' : 'var(--mist)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: "'Syne', sans-serif", flexShrink: 0 }}
            title={lockedNav ? 'Locked: student must answer all before advancing' : 'Unlocked: free navigation'}
          >
            {lockedNav ? <Lock size={11} /> : <Unlock size={11} />}
            {lockedNav ? 'Locked' : 'Unlocked'}
          </button>
          <button
            onClick={saveMeta}
            disabled={savingMeta}
            style={{ padding: '6px 16px', borderRadius: 8, border: 'none', background: 'var(--rose)', color: 'var(--charcoal)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Syne', sans-serif", whiteSpace: 'nowrap' }}
          >
            {savingMeta ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <PdfImportTab
          key={stepId}
          wsId={wsId}
          stepId={stepId}
          problems={problems}
          positions={positions}
          onProblemsChange={setProblems}
          onPositionsChange={setPositions}
          initialPdfUrl={step.pdf_url ?? null}
          onPdfUrlSave={async (url) => {
            const ok = await onSaveField(stepId, { pdfUrl: url });
            if (ok) onUpdate({ pdf_url: url });
          }}
        />
      </div>
    </div>
  );
}
