// src/types/index.ts

export type Brand = 'Perler' | 'Hama' | 'Artkal' | 'MARD' | 'Nabbi' | 'Ikea-Pyssla';
export type BeadStyle = 'square' | 'round' | 'hollow';
export type GridSpacing = 'none' | 'small' | 'large';
export type CellSizeUnit = '5mm' | '2.6mm';
export type EditorTool = 'brush' | 'eraser' | 'eyedropper';
export type MardCategory = '72' | '96' | '120' | '144' | '168' | 'all';
export type ExportFormat = 'png' | 'csv' | 'json' | 'pdf' | 'svg';

export interface BeadColor {
  id: string;
  code: string;
  hex: string;
  name: string;
}

export interface PatternData {
  matrix: string[][];
  width: number;
  height: number;
}

export interface ColorStat {
  color: BeadColor;
  count: number;
  percentage: number;
}

export const DEFAULT_GRID_WIDTH = 50;
export const MIN_GRID_WIDTH = 10;
export const MAX_GRID_WIDTH = 200;
export const MAX_FILE_SIZE = 8 * 1024 * 1024;

/** 像素单位 → 显示尺寸映射 */
export const CELL_SIZE_MAP: Record<CellSizeUnit, number> = {
  '5mm': 15,
  '2.6mm': 10,
};
