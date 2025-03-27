export interface DominoPosition {
  id: number;
  row?: number;
  col?: number;
  topValue: number | null;
  bottomValue: number | null;
  isEditable: boolean;
  isVertical?: boolean;
  color?: string;
  uniqueId?: string;
  exactX?: number;
  exactY?: number;
  angle?: number;
  scale?: number;
  connectsTo?: number[];
}

export interface DominoChange {
  id: number;
  topValue: number | null;
  bottomValue: number | null;
  isVertical?: boolean;
}

export interface ArrowPosition {
  id: number;
  row?: number;
  col?: number;
  exactX: number;
  exactY: number;
  angle: number;
  uniqueId: string;
  scale: number;
  length: number;
  arrowColor: string;
  headSize: number;
  curved: boolean;
  curvature: number;
}
