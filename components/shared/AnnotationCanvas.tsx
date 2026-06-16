'use client';

import { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Highlighter, Pen, Eraser, Trash2, GripVertical, ALargeSmall } from 'lucide-react';
import type { AnnotationStroke, Annotations } from '@/types/annotations';
import { useToolbarScale } from '@/hooks/useToolbarScale';

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

const TOOLBAR_HEIGHT = 44;

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
  const [internalSliderVals, setInternalSliderVals] = useState<Record<Tool, number>>({
    highlight: 5,
    pen: 5,
    eraser: 5,
  });
  const [strokeCount, setStrokeCount] = useState(initialAnnotations.length);
  const [sc, setScale] = useToolbarScale();
  const [showSizePopover, setShowSizePopover] = useState(false);
  const sizeButtonRef = useRef<HTMLButtonElement>(null);
  const sizePopoverRef = useRef<HTMLDivElement>(null);

  const tool: Tool = externalToolbar && externalTool != null ? externalTool : internalTool;
  const sliderVal: number = externalToolbar && externalSliderVal != null
    ? externalSliderVal
    : internalSliderVals[tool];

  // Draggable built-in toolbar state
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number } | null>(null);
  const draggingToolbar = useRef(false);
  const toolbarDragOffset = useRef({ x: 0, y: 0 });

  const clampToolbar = useCallback((x: number, y: number) => {
    const el = toolbarRef.current;
    const w = el ? el.offsetWidth : 280;
    const maxX = window.innerWidth - w;
    const maxY = window.innerHeight - TOOLBAR_HEIGHT * sc;
    return {
      x: Math.max(0, Math.min(x, maxX)),
      y: Math.max(0, Math.min(y, maxY)),
    };
  }, [sc]);

  const onToolbarDragStart = useCallback((clientX: number, clientY: number) => {
    draggingToolbar.current = true;
    if (toolbarPos == null) return;
    toolbarDragOffset.current = { x: clientX - toolbarPos.x, y: clientY - toolbarPos.y };
  }, [toolbarPos]);

  const onToolbarDragMove = useCallback((clientX: number, clientY: number) => {
    if (!draggingToolbar.current) return;
    setToolbarPos(clampToolbar(clientX - toolbarDragOffset.current.x, clientY - toolbarDragOffset.current.y));
  }, [clampToolbar]);

  const onToolbarDragEnd = useCallback(() => {
    draggingToolbar.current = false;
  }, []);

  // Position toolbar top-right on mount
  useEffect(() => {
    if (externalToolbar) return;
    const el = toolbarRef.current;
    if (!el) return;
    const w = el.offsetWidth || 280;
    setToolbarPos({ x: window.innerWidth - w - 16, y: 16 });
  }, [externalToolbar]);

  // Document-level drag listeners for built-in toolbar
  useEffect(() => {
    if (externalToolbar) return;
    const onMouseMove = (e: MouseEvent) => onToolbarDragMove(e.clientX, e.clientY);
    const onMouseUp = () => onToolbarDragEnd();
    const onTouchMove = (e: TouchEvent) => {
      if (draggingToolbar.current) { e.preventDefault(); onToolbarDragMove(e.touches[0].clientX, e.touches[0].clientY); }
    };
    const onTouchEnd = () => onToolbarDragEnd();

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [externalToolbar, onToolbarDragMove, onToolbarDragEnd]);

  // Close size popover when clicking outside
  useEffect(() => {
    if (!showSizePopover) return;
    const handler = (e: MouseEvent) => {
      if (
        sizeButtonRef.current?.contains(e.target as Node) ||
        sizePopoverRef.current?.contains(e.target as Node)
      ) return;
      setShowSizePopover(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSizePopover]);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount-only: initialAnnotations is stable server data; unstable deps caused infinite re-renders

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
          ref={toolbarRef}
          style={{
            position: 'fixed',
            top: toolbarPos?.y ?? -200,
            left: toolbarPos?.x ?? -200,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: 4 * sc,
            background: 'rgba(255,255,255,0.97)',
            border: '1px solid var(--fog)',
            borderRadius: 24 * sc,
            padding: `${4 * sc}px ${10 * sc}px ${4 * sc}px ${6 * sc}px`,
            boxShadow: '0 4px 16px rgba(0,0,0,0.13)',
            userSelect: 'none',
            height: TOOLBAR_HEIGHT * sc,
            boxSizing: 'border-box',
          }}
        >
          {/* Drag handle */}
          <div
            title="Drag to move"
            onMouseDown={(e) => { e.preventDefault(); onToolbarDragStart(e.clientX, e.clientY); }}
            onTouchStart={(e) => { e.preventDefault(); onToolbarDragStart(e.touches[0].clientX, e.touches[0].clientY); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'grab',
              color: 'var(--mist, #b0b8c1)',
              padding: '0 2px',
              touchAction: 'none',
            }}
          >
            <GripVertical size={Math.round(16 * sc)} />
          </div>

          <div style={{ width: 1, height: 18 * sc, background: 'var(--fog)', margin: '0 2px' }} />

          {toolButtons.map(({ id, Icon, title }) => (
            <button
              key={id}
              title={title}
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setInternalTool(id); }}
              style={{
                width: 28 * sc,
                height: 28 * sc,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8 * sc,
                border: tool === id ? '1px solid var(--rose-deeper)' : '1px solid transparent',
                background: tool === id ? 'var(--rose-ultra, #fdf2f4)' : 'transparent',
                cursor: 'pointer',
                color: id === 'highlight' ? '#ca8a04' : 'var(--charcoal)',
                padding: 0,
              }}
            >
              <Icon size={Math.round(15 * sc)} />
            </button>
          ))}

          <div style={{ width: 1, height: 18 * sc, background: 'var(--fog)', margin: '0 2px' }} />

          <input
            type="range"
            min={1}
            max={10}
            value={sliderVal}
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => setInternalSliderVals(prev => ({ ...prev, [tool]: Number(e.target.value) }))}
            title="Thickness"
            style={{ width: 64 * sc, accentColor: 'var(--rose-deeper)', cursor: 'pointer' }}
          />

          <div style={{ width: 1, height: 18 * sc, background: 'var(--fog)', margin: '0 2px' }} />

          <button
            title="Clear all annotations"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); clearAll(); }}
            style={{
              width: 28 * sc,
              height: 28 * sc,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8 * sc,
              border: '1px solid transparent',
              background: 'transparent',
              cursor: strokeCount > 0 ? 'pointer' : 'default',
              color: strokeCount > 0 ? 'var(--rose-deeper)' : 'var(--cloud)',
              padding: 0,
            }}
          >
            <Trash2 size={Math.round(15 * sc)} />
          </button>

          <div style={{ width: 1, height: 18 * sc, background: 'var(--fog)', margin: '0 2px' }} />

          {/* Toolbar size button */}
          <button
            ref={sizeButtonRef}
            title="Adjust toolbar size"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setShowSizePopover(p => !p); }}
            style={{
              width: 28 * sc,
              height: 28 * sc,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8 * sc,
              border: showSizePopover ? '1px solid var(--rose-deeper)' : '1px solid transparent',
              background: showSizePopover ? 'var(--rose-ultra, #fdf2f4)' : 'transparent',
              cursor: 'pointer',
              color: 'var(--charcoal)',
              padding: 0,
            }}
          >
            <ALargeSmall size={Math.round(15 * sc)} />
          </button>

          {/* Size popover */}
          {showSizePopover && (
            <div
              ref={sizePopoverRef}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                top: TOOLBAR_HEIGHT * sc + 8,
                right: 0,
                background: 'rgba(255,255,255,0.97)',
                border: '1px solid var(--fog)',
                borderRadius: 12,
                padding: '10px 14px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.13)',
                minWidth: 180,
                zIndex: 1001,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <span style={{ fontSize: 12, color: 'var(--mist)', fontWeight: 500 }}>Toolbar size</span>
              <input
                type="range"
                min={0.75}
                max={2}
                step={0.05}
                value={sc}
                onMouseDown={(e) => e.stopPropagation()}
                onChange={(e) => setScale(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--rose-deeper)', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--mist)' }}>
                <span>Small</span>
                <span>Large</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default AnnotationCanvas;
