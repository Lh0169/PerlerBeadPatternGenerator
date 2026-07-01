import React, { useRef, useEffect, useCallback } from 'react';
import { animate } from 'animejs';
import { BeadColor, BeadStyle, GridSpacing, EditorTool, CellSizeUnit, CELL_SIZE_MAP } from '../types';

interface Props {
  matrix: string[][];
  width: number;
  height: number;
  colorMap: Map<string, BeadColor>;
  showGrid: boolean;
  showCodes: boolean;
  highlightedCode: string | null;
  beadStyle: BeadStyle;
  gridSpacing: GridSpacing;
  cellSizeUnit: CellSizeUnit;
  zoom: number;
  editorTool: EditorTool;
  selectedColor: string | null;
  onCellEdit: (row: number, col: number, colorId: string) => void;
  onColorPick: (colorId: string) => void;
}

/** 间距像素映射 */
const SPACING_PX: Record<GridSpacing, number> = { none: 0, small: 1, large: 2 };

const BeadGridCanvas: React.FC<Props> = ({
  matrix, width, height, colorMap, showGrid, showCodes, highlightedCode,
  beadStyle, gridSpacing, cellSizeUnit, zoom, editorTool, selectedColor,
  onCellEdit, onColorPick,
}) => {
  const CELL = CELL_SIZE_MAP[cellSizeUnit];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDragging = useRef(false);
  const lastCell = useRef<{ row: number; col: number } | null>(null);

  /** 根据鼠标事件获取所在 cell */
  const getCellFromEvent = useCallback((e: React.MouseEvent<HTMLCanvasElement>): { row: number; col: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    const col = Math.floor(mx / CELL);
    const row = Math.floor(my / CELL);
    if (col < 0 || col >= width || row < 0 || row >= height) return null;
    return { row, col };
  }, [width, height]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const cell = getCellFromEvent(e);
    if (!cell) return;
    if (editorTool === 'brush') {
      if (selectedColor) {
        onCellEdit(cell.row, cell.col, selectedColor);
        isDragging.current = true;
        lastCell.current = cell;
      }
    } else if (editorTool === 'eraser') {
      onCellEdit(cell.row, cell.col, '');
      isDragging.current = true;
      lastCell.current = cell;
    } else if (editorTool === 'eyedropper') {
      const colorId = matrix[cell.row]?.[cell.col];
      if (colorId) onColorPick(colorId);
    }
  }, [editorTool, selectedColor, getCellFromEvent, onCellEdit, onColorPick, matrix]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging.current) return;
    const cell = getCellFromEvent(e);
    if (!cell) return;
    if (lastCell.current && lastCell.current.row === cell.row && lastCell.current.col === cell.col) return;
    lastCell.current = cell;
    if (editorTool === 'brush' && selectedColor) {
      onCellEdit(cell.row, cell.col, selectedColor);
    } else if (editorTool === 'eraser') {
      onCellEdit(cell.row, cell.col, '');
    }
  }, [editorTool, selectedColor, getCellFromEvent, onCellEdit]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    lastCell.current = null;
  }, []);

  // 全局 mouseup 确保拖拽到 canvas 外也能结束
  useEffect(() => {
    const up = () => { isDragging.current = false; lastCell.current = null; };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, []);

  // 自适应缩放 — 窗口 resize 时自动调整 canvas 显示尺寸
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || matrix.length === 0) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const updateSize = () => {
      const totalW = width * CELL;
      const totalH = height * CELL;
      const containerW = (parent.clientWidth ?? window.innerWidth - 320) - 32;
      const containerH = Math.max(200, window.innerHeight - 200);
      const fit = Math.min(1, containerW / totalW, containerH / totalH) * zoom;
      canvas.style.width = `${Math.round(totalW * fit)}px`;
      canvas.style.height = `${Math.round(totalH * fit)}px`;
    };

    const observer = new ResizeObserver(updateSize);
    observer.observe(parent);
    updateSize();

    return () => observer.disconnect();
  }, [matrix.length, width, height, zoom]);

  // 首次渲染入场动画
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || matrix.length === 0) return;
    animate(canvas, {
      opacity: [0, 1],
      scale: [0.95, 1],
      duration: 500,
      ease: 'out(4)',
    });
  }, [matrix.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // 渲染内容
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || matrix.length === 0) return;
    const spacing = SPACING_PX[gridSpacing];
    const totalW = width * CELL;
    const totalH = height * CELL;
    canvas.width = totalW;
    canvas.height = totalH;

    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, totalW, totalH);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, totalW, totalH);

    const hasHL = highlightedCode !== null;

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const id = matrix[row]?.[col];
        const c = id ? colorMap.get(id) : null;
        const cx = col * CELL + CELL / 2;
        const cy = row * CELL + CELL / 2;
        const s = spacing;

        if (!c) {
          ctx.fillStyle = '#F5F5F5';
          ctx.fillRect(col * CELL + s, row * CELL + s, CELL - s * 2, CELL - s * 2);
          continue;
        }

        ctx.fillStyle = c.hex;
        if (beadStyle === 'round') {
          ctx.beginPath();
          ctx.arc(cx, cy, CELL / 2 - s - 1, 0, Math.PI * 2);
          ctx.fill();
        } else if (beadStyle === 'hollow') {
          ctx.beginPath();
          ctx.arc(cx, cy, CELL / 2 - s - 1, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          ctx.beginPath();
          ctx.arc(cx, cy, CELL / 5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(col * CELL + s, row * CELL + s, CELL - s * 2, CELL - s * 2);
        }

        // 高亮
        if (hasHL) {
          if (id === highlightedCode || c.code === highlightedCode) {
            ctx.fillStyle = 'rgba(48, 231, 135, 0.55)';
          } else {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
          }
          if (beadStyle === 'round' || beadStyle === 'hollow') {
            ctx.beginPath();
            ctx.arc(cx, cy, CELL / 2 - s - 1, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillRect(col * CELL + s, row * CELL + s, CELL - s * 2, CELL - s * 2);
          }
        }
      }
    }

    // 色号文字
    if (showCodes) {
      const fs = Math.max(7, Math.min(11, CELL * 0.55));
      ctx.font = `bold ${fs}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
          const id = matrix[row]?.[col];
          if (!id) continue;
          const c = colorMap.get(id);
          if (!c) continue;
          const cx = col * CELL + CELL / 2;
          const cy = row * CELL + CELL / 2;
          ctx.strokeStyle = 'rgba(255,255,255,0.7)';
          ctx.lineWidth = 2;
          ctx.strokeText(c.code, cx, cy);
          ctx.fillStyle = '#111';
          ctx.fillText(c.code, cx, cy);
        }
      }
    }

    // 网格线
    if (showGrid) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
      ctx.lineWidth = 0.5;
      for (let r = 0; r <= height; r++) { ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(totalW, r * CELL); ctx.stroke(); }
      for (let c = 0; c <= width; c++) { ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, totalH); ctx.stroke(); }
    }
  }, [matrix, width, height, colorMap, showGrid, showCodes, highlightedCode, beadStyle, gridSpacing, cellSizeUnit, zoom]);

  if (matrix.length === 0) return null;

  const cursor = editorTool === 'eyedropper' ? 'crosshair' : editorTool === 'eraser' ? 'cell' : 'pointer';

  return (
    <div className="flex-1 overflow-auto flex items-center justify-center p-4">
      <canvas ref={canvasRef} className="shadow-lg bg-white"
        style={{ imageRendering: 'pixelated', cursor }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
};

export default BeadGridCanvas;
