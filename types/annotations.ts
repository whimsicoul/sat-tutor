export interface AnnotationStroke {
  tool: 'highlight' | 'pen' | 'eraser';
  color: string;
  thickness: number; // percentage of canvas width
  opacity: number;
  points: Array<{ x: number; y: number }>; // 0–100 percentage coordinates
}

export type Annotations = AnnotationStroke[];
