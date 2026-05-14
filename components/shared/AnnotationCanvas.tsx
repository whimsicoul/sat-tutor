'use client';

import { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Highlighter, Pen, Eraser, Trash2 } from 'lucide-react';
import type { AnnotationStroke, Annotations } from '@/types/annotations';

interface AnnotationCanvasProps {
  context: 'worksheet' | 'breakfast';
  worksheetId?: string;
  stepId?: string;
  questionNumber?: number;
  assignmentId?: string;
  initialAnnotations?: Annotations;
  editable?: boolean;
  // External toolbar mode — when true the built-in toolbar is hidden and
  // tool/slider state is controlled from outside.
  externalToolbar?: boolean;
  externalTool?: Tool;
  externalSliderVal?: number;
  onStrokeCountChange?: (count: number) => void;
}

export interface AnnotationCanvasHandle {
  clearAll: () => void;
}

type Tool = 'highlight' | 'pen' | 'eraser';

const TOOL_CONFIG: Record<Tool, { minPx: number; maxPx: number; color: string; opacity: number }> = {
  highlight: { minPx: 8, maxPx: 32, color: '#FFFF00', opacity: 0.35 },
  pen:       { minPx: 1, maxPx: 8,  color: '#000000', opacity: 1.0  },
  eraser:    { minPx: 10, maxPx: 48, color: '#000000', opacity: 1.0 },
};

function sliderToThicknessPct(sliderVal: number, tool: Tool, canvasWidth: number): number {
  const { minPx, maxPx } = TOOL_CONFIG[tool];
  const px = minPx + ((sliderVal - 1) / 9) * (maxPx - minPx);
  return (px / Math.max(canvasWidth, 1)) * 100;
}

function toPercent(clientX: number, clientY: number, rect: DOMRect) {
  return {
    x: ((clientX - rect.left) / rect.width) * 100,
    y: ((clientY - rect.top) / rect.height) * 100,
  };
}

function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: AnnotationStroke,
  canvasWidth: number,
  canvasHeight: number,
) {
  if (stroke.points.length < 2) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = (stroke.thickness / 100) * canvasWidth;

  if (stroke.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.globalAlpha = 1;
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = stroke.color;
    ctx.globalAlpha = stroke.opacity;
  }

  ctx.beginPath();
  ctx.moveTo((stroke.points[0].x / 100) * canvasWidth, (stroke.points[0].y / 100) * canvasHeight);
  for (let i = 1; i < stroke.points.length; i++) {
    ctx.lineTo((stroke.points[i].x / 100) * canvasWidth, (stroke.points[i].y / 100) * canvasHeight);
  }
  ctx.stroke();
  ctx.restore();
}

const AnnotationCanvas = forwardRef<AnnotationCanvasHandle, AnnotationCanvasProps>(function AnnotationCanvas({
  context,
  worksheetId,
  stepId,
  questionNumber,
  assignmentId,
  initialAnnotations = [],
  editable = true,
  externalToolbar = false,
  externalTool,
  externalSliderVal,
  onStrokeCountChange,
}, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const strokesRef = useRef<Annotations>(initialAnnotations);
  const currentStrokeRef = useRef<AnnotationStroke | null>(null);
  const isDrawingRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Internal state — used only when externalToolbar is false
  const [internalTool, setInternalTool] = useState<Tool>('highlight');
  const [internalSliderVal, setInternalSliderVal] = useState(5);
  const [strokeCount, setStrokeCount] = useState(initialAnnotations.length);

  const tool: Tool = externalToolbar && externalTool != null ? externalTool : internalTool;
  const sliderVal: number = externalToolbar && externalSliderVal != null ? externalSliderVal : internalSliderVal;

  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const stroke of strokesRef.current) {
      drawStroke(ctx, stroke, canvas.width, canvas.height);
    }
    if (currentStrokeRef.current) {
      drawStroke(ctx, currentStrokeRef.current, canvas.width, canvas.height);
    }
  }, []);

  // Size canvas to container and redraw on resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      redrawAll();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [redrawAll]);

  // Draw initial annotations once on mount
  useEffect(() => {
    strokesRef.current = initialAnnotations;
    const count = initialAnnotations.length;
    setStrokeCount(count);
    onStrokeCountChange?.(count);
    redrawAll();
  }, [initialAnnotations, redrawAll, onStrokeCountChange]);

  const triggerSave = useCallback((strokes: Annotations) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        if (context === 'worksheet' && worksheetId && stepId && questionNumber != null) {
          await fetch(`/api/worksheets/${worksheetId}/steps/${stepId}/annotations`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ questionNumber, annotations: strokes }),
          });
        } else if (context === 'breakfast' && assignmentId) {
          await fetch('/api/breakfast-problems/annotations', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assignmentId, annotations: strokes }),
          });
        }
      } catch {
        // silent — annotation save is best-effort
      }
    }, 400);
  }, [context, worksheetId, stepId, questionNumber, assignmentId]);

  const beginStroke = useCallback((clientX: number, clientY: number) => {
    if (!editable) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const config = TOOL_CONFIG[tool];
    const thicknessPct = sliderToThicknessPct(sliderVal, tool, canvas.width);
    isDrawingRef.current = true;
    currentStrokeRef.current = {
      tool,
      color: config.color,
      thickness: thicknessPct,
      opacity: config.opacity,
      points: [toPercent(clientX, clientY, rect)],
    };
  }, [editable, tool, sliderVal]);

  const continueStroke = useCallback((clientX: number, clientY: number) => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    currentStrokeRef.current.points.push(toPercent(clientX, clientY, rect));
    redrawAll();
  }, [redrawAll]);

  const endStroke = useCallback(() => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    isDrawingRef.current = false;
    const stroke = currentStrokeRef.current;
    currentStrokeRef.current = null;
    if (stroke.points.length >= 2) {
      const updated = [...strokesRef.current, stroke];
      strokesRef.current = updated;
      setStrokeCount(updated.length);
      onStrokeCountChange?.(updated.length);
      triggerSave(updated);
    }
    redrawAll();
  }, [redrawAll, triggerSave, onStrokeCountChange]);

  const clearAll = useCallback(() => {
    strokesRef.current = [];
    currentStrokeRef.current = null;
    isDrawingRef.current = false;
    setStrokeCount(0);
    onStrokeCountChange?.(0);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    triggerSave([]);
  }, [triggerSave, onStrokeCountChange]);

  // Expose clearAll to parent via ref
  useImperativeHandle(ref, () => ({ clearAll }), [clearAll]);

  // Mouse handlers
  const onMouseDown = (e: React.MouseEvent) => { e.preventDefault(); beginStroke(e.clientX, e.clientY); };
  const onMouseMove = (e: React.MouseEvent) => { if (isDrawingRef.current) continueStroke(e.clientX, e.clientY); };
  const onMouseUp = () => endStroke();
  const onMouseLeave = () => { if (isDrawingRef.current) endStroke(); };

  // Touch handlers
  const onTouchStart = (e: React.TouchEvent) => { e.preventDefault(); const t = e.touches[0]; beginStroke(t.clientX, t.clientY); };
  const onTouchMove = (e: React.TouchEvent) => { e.preventDefault(); const t = e.touches[0]; continueStroke(t.clientX, t.clientY); };
  const onTouchEnd = () => endStroke();

  const toolButtons: { id: Tool; Icon: React.ElementType; title: string }[] = [
    { id: 'highlight', Icon: Highlighter, title: 'Highlight' },
    { id: 'pen',       Icon: Pen,         title: 'Pen' },
    { id: 'eraser',    Icon: Eraser,       title: 'Eraser' },
  ];

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0, zIndex: 2 }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          cursor: editable ? (tool === 'eraser' ? 'cell' : 'crosshair') : 'default',
          touchAction: 'none',
          pointerEvents: editable ? 'auto' : 'none',
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      />

      {editable && !externalToolbar && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'rgba(255,255,255,0.95)',
            border: '1px solid var(--fog)',
            borderRadius: 24,
            padding: '4px 10px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          {toolButtons.map(({ id, Icon, title }) => (
            <button
              key={id}
              title={title}
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setInternalTool(id); }}
              style={{
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
                border: tool === id ? '1px solid var(--rose-deeper)' : '1px solid transparent',
                background: tool === id ? 'var(--rose-ultra, #fdf2f4)' : 'transparent',
                cursor: 'pointer',
                color: id === 'highlight' ? '#ca8a04' : 'var(--charcoal)',
                padding: 0,
              }}
            >
              <Icon size={15} />
            </button>
          ))}

          <div style={{ width: 1, height: 18, background: 'var(--fog)', margin: '0 2px' }} />

          <input
            type="range"
            min={1}
            max={10}
            value={sliderVal}
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => setInternalSliderVal(Number(e.target.value))}
            title="Thickness"
            style={{ width: 64, accentColor: 'var(--rose-deeper)', cursor: 'pointer' }}
          />

          <div style={{ width: 1, height: 18, background: 'var(--fog)', margin: '0 2px' }} />

          <button
            title="Clear all annotations"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); clearAll(); }}
            style={{
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              border: '1px solid transparent',
              background: 'transparent',
              cursor: strokeCount > 0 ? 'pointer' : 'default',
              color: strokeCount > 0 ? 'var(--rose-deeper)' : 'var(--cloud)',
              padding: 0,
            }}
          >
            <Trash2 size={15} />
          </button>
        </div>
      )}
    </div>
  );
});

export default AnnotationCanvas;
