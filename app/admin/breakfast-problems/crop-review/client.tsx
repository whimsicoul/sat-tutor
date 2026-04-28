'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import type { CropProblem } from './page';

interface Props {
  problems: CropProblem[];
}

function CroppedPreview({ problem, cropTop, cropBottom }: { problem: CropProblem; cropTop: number; cropBottom: number }) {
  const w = problem.image_width_px || 1836;
  const h = problem.image_height_px || 1134;
  const top = Math.max(0, cropTop);
  const bottom = Math.max(0, cropBottom);
  const visibleHeight = Math.max(1, h - top - bottom);

  return (
    <div
      className="w-full rounded border overflow-hidden relative"
      style={{ borderColor: 'var(--fog)', aspectRatio: `${w} / ${visibleHeight}` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={problem.question_image_url}
        alt="Cropped preview"
        className="absolute left-0 w-full"
        style={{ top: 0, transform: `translateY(-${(top / h * 100).toFixed(4)}%)` }}
      />
    </div>
  );
}

function FullImageWithLines({ problem, cropTop, cropBottom }: { problem: CropProblem; cropTop: number; cropBottom: number }) {
  const h = problem.image_height_px || 1134;
  const topPct = (Math.max(0, cropTop) / h * 100).toFixed(2) + '%';
  const bottomPct = (Math.max(0, cropBottom) / h * 100).toFixed(2) + '%';

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={problem.question_image_url} alt="Full image" style={{ width: '100%', display: 'block' }} />
      <div style={{ position: 'absolute', top: topPct, left: 0, right: 0, height: 2, background: 'rgba(77,143,174,0.85)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: bottomPct, left: 0, right: 0, height: 2, background: 'rgba(224,166,175,0.85)', pointerEvents: 'none' }} />
    </div>
  );
}

export default function CropReviewClient({ problems }: Props) {
  const [index, setIndex] = useState(0);
  const [cropTop, setCropTop] = useState(0);
  const [cropBottom, setCropBottom] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savedCrops, setSavedCrops] = useState<Record<string, { top: number; bottom: number }>>({});

  const problem = problems[index];

  useEffect(() => {
    if (!problem) return;
    const saved = savedCrops[problem.id];
    setCropTop(saved?.top ?? problem.crop_top_px ?? 0);
    setCropBottom(saved?.bottom ?? problem.crop_bottom_px ?? 0);
  }, [index, problem, savedCrops]);

  if (problems.length === 0) {
    return (
      <div style={{ padding: '40px 48px' }}>
        <Link href="/admin/breakfast-problems" style={{ textDecoration: 'none' }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--fog)', background: 'var(--frost)', cursor: 'pointer', fontSize: 13, color: 'var(--slate)', marginBottom: 24 }}>
            <ArrowLeft size={14} /> Back
          </button>
        </Link>
        <p style={{ color: 'var(--mist)', fontSize: 14 }}>No breakfast problems with image URLs found.</p>
      </div>
    );
  }

  const h = problem.image_height_px || 1134;
  const overCropped = cropTop + cropBottom >= h;

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/breakfast-problems/${problem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crop_top_px: cropTop, crop_bottom_px: cropBottom }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Save failed');
      }
      setSavedIds(prev => new Set(prev).add(problem.id));
      setSavedCrops(prev => ({ ...prev, [problem.id]: { top: cropTop, bottom: cropBottom } }));
      toast.success('Crop saved.');
      const nextIdx = problems.findIndex((p, i) => i > index && !savedIds.has(p.id));
      if (nextIdx !== -1) setIndex(nextIdx);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: '40px 48px', maxWidth: 1400 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <Link href="/admin/breakfast-problems" style={{ textDecoration: 'none' }}>
          <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: '1px solid var(--fog)', background: 'var(--frost)', cursor: 'pointer' }}>
            <ArrowLeft size={14} style={{ color: 'var(--slate)' }} />
          </button>
        </Link>
        <div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 700, color: 'var(--charcoal)', margin: 0 }}>
            Crop Review
          </h1>
          <p style={{ fontSize: 13, color: 'var(--mist)', marginTop: 2 }}>
            {problems.length} image{problems.length !== 1 ? 's' : ''} · {savedIds.size} reviewed this session
          </p>
        </div>
      </div>

      {/* Navigation bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setIndex(i => Math.max(0, i - 1))}
            disabled={index === 0}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: '1px solid var(--fog)', background: 'var(--frost)', cursor: index === 0 ? 'not-allowed' : 'pointer', opacity: index === 0 ? 0.4 : 1 }}
          >
            <ChevronLeft size={16} style={{ color: 'var(--slate)' }} />
          </button>
          <span style={{ fontSize: 14, color: 'var(--slate)', fontFamily: "'Syne', sans-serif", minWidth: 80, textAlign: 'center' }}>
            {savedIds.has(problem.id) && <Check size={13} style={{ color: '#16a34a', display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />}
            {index + 1} / {problems.length}
          </span>
          <button
            onClick={() => setIndex(i => Math.min(problems.length - 1, i + 1))}
            disabled={index === problems.length - 1}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: '1px solid var(--fog)', background: 'var(--frost)', cursor: index === problems.length - 1 ? 'not-allowed' : 'pointer', opacity: index === problems.length - 1 ? 0.4 : 1 }}
          >
            <ChevronRight size={16} style={{ color: 'var(--slate)' }} />
          </button>
        </div>
        <button
          onClick={() => {
            const next = problems.findIndex((p, i) => i > index && !savedIds.has(p.id));
            if (next !== -1) setIndex(next);
          }}
          style={{ fontSize: 12, color: 'var(--mist)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Syne', sans-serif", textDecoration: 'underline' }}
        >
          Skip to next unreviewed
        </button>
      </div>

      {/* Main two-column layout */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* Left: cropped preview (student view) */}
        <div style={{ flex: '0 0 60%' }}>
          <p style={{ fontSize: 11, fontFamily: "'Syne', sans-serif", color: 'var(--mist)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Student view (cropped)
          </p>
          <CroppedPreview problem={problem} cropTop={cropTop} cropBottom={cropBottom} />
          {overCropped && (
            <p style={{ fontSize: 12, color: '#b91c1c', marginTop: 8 }}>
              Warning: crop values exceed image height — nothing will be visible.
            </p>
          )}
        </div>

        {/* Right: full image + controls */}
        <div style={{ flex: '0 0 40%' }}>
          <p style={{ fontSize: 11, fontFamily: "'Syne', sans-serif", color: 'var(--mist)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Full image (blue = top cut, pink = bottom cut)
          </p>
          <FullImageWithLines problem={problem} cropTop={cropTop} cropBottom={cropBottom} />

          {/* Controls */}
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate)', fontFamily: "'Syne', sans-serif", marginBottom: 4 }}>
                Crop Top (px)
              </label>
              <input
                type="number"
                min={0}
                value={cropTop}
                onChange={e => setCropTop(Math.max(0, parseInt(e.target.value) || 0))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--fog)', fontSize: 14, fontFamily: "'Syne', sans-serif", color: 'var(--charcoal)', background: 'var(--white)', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate)', fontFamily: "'Syne', sans-serif", marginBottom: 4 }}>
                Crop Bottom (px)
              </label>
              <input
                type="number"
                min={0}
                value={cropBottom}
                onChange={e => setCropBottom(Math.max(0, parseInt(e.target.value) || 0))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--fog)', fontSize: 14, fontFamily: "'Syne', sans-serif", color: 'var(--charcoal)', background: 'var(--white)', outline: 'none' }}
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saving || overCropped}
              style={{
                width: '100%',
                padding: '10px 0',
                borderRadius: 8,
                border: 'none',
                background: saving || overCropped ? 'var(--fog)' : 'var(--rose)',
                color: saving || overCropped ? 'var(--mist)' : 'white',
                fontFamily: "'Syne', sans-serif",
                fontSize: 14,
                fontWeight: 600,
                cursor: saving || overCropped ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {saving ? 'Saving…' : 'Save Crop'}
            </button>
            <p style={{ fontSize: 11, color: 'var(--mist)', textAlign: 'center' }}>
              Image: {problem.image_width_px || '?'} × {problem.image_height_px || '?'} px
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
