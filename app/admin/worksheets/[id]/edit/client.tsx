'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { UploadButton } from '@uploadthing/react';
import type { OurFileRouter } from '@/lib/uploadthing';
import {
  ArrowLeft, Plus, Trash2, Image as ImageIcon, ChevronUp, ChevronDown,
  BookOpen, Layers, Lock, Unlock, Key, GripVertical,
} from 'lucide-react';
import type { WsStep, WsPage, WsPosition, WsAnswerKeyEntry } from './page';

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
      const full: WsStep = { ...step, type: step.type as 'instruction' | 'problems', pages: [], positions: [], answerKey: [] };
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
                  wsId={wsId}
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

// ── Instruction Step Editor ───────────────────────────────────────────────────

function InstructionStepEditor({
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

type ProblemsTab = 'pages' | 'answerkey';

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
