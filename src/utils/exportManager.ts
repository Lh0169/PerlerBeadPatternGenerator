// src/utils/exportManager.ts — 高分辨率导出
import { jsPDF } from 'jspdf';
import { BeadColor, BeadStyle, ColorStat, CellSizeUnit } from '../types';

// ========== 常量 ==========

const CELL = 40;             // 高分辨率格子
const GROUP = 10;            // 红色分隔线间隔（每10格一组）
const GAP = 40;              // 图纸与统计面板间距
const PANEL_W = 400;         // 右侧统计面板宽度

// ========== 工具函数 ==========

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function isLight(hex: string): boolean {
  const { r, g, b } = hexToRgb(hex);
  return r * 0.299 + g * 0.587 + b * 0.114 > 128;
}

// ========== 通用下载 ==========

export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

export function downloadText(content: string, filename: string): void {
  const blob = new Blob(['﻿' + content], { type: 'text/plain;charset=utf-8' });
  downloadFile(blob, filename);
}

// ==================== PNG 导出 ====================

export function exportPNG(
  matrix: string[][],
  colorMap: Map<string, BeadColor>,
  width: number,
  height: number,
  beadStyle: BeadStyle,
  showStats: boolean,
  stats: ColorStat[],
  brand: string,
  unit: CellSizeUnit,
): void {
  const gridW = width * CELL;
  const gridH = height * CELL;

  // 右侧统计面板内容高度
  const sorted = [...stats].sort((a, b) => b.count - a.count);
  const statsTitleH = 55;
  const statsSummaryH = 25;
  const statsItemH = 30;
  const statsListH = Math.ceil(sorted.length / 2) * statsItemH;
  const statsContentH = statsTitleH + statsSummaryH + statsListH + 30;

  const canvasW = gridW + (showStats ? GAP + PANEL_W : 0);
  const canvasH = Math.max(gridH, showStats ? statsContentH : 0);

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvasW, canvasH);

  // ===== 绘制珠子 =====
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const id = matrix[row]?.[col];
      const c = id ? colorMap.get(id) : null;
      const cx = col * CELL + CELL / 2;
      const cy = row * CELL + CELL / 2;

      if (!c) continue;

      ctx.fillStyle = c.hex;
      if (beadStyle === 'round') {
        ctx.beginPath();
        ctx.arc(cx, cy, CELL / 2 - 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (beadStyle === 'hollow') {
        ctx.beginPath();
        ctx.arc(cx, cy, CELL / 2 - 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath();
        ctx.arc(cx, cy, CELL / 5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(col * CELL + 2, row * CELL + 2, CELL - 4, CELL - 4);
      }

      // 色号文字 — 导出时始终印在每个格子上
      ctx.fillStyle = isLight(c.hex) ? '#000' : '#fff';
      ctx.font = `bold ${CELL * 0.24}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(c.code, cx, cy);
    }
  }

  // ===== 红色分隔线（每 GROUP 个格子） =====
  ctx.strokeStyle = '#E53935';
  ctx.lineWidth = 2.5;
  for (let r = GROUP; r < height; r += GROUP) {
    ctx.beginPath();
    ctx.moveTo(0, r * CELL);
    ctx.lineTo(gridW, r * CELL);
    ctx.stroke();
  }
  for (let c = GROUP; c < width; c += GROUP) {
    ctx.beginPath();
    ctx.moveTo(c * CELL, 0);
    ctx.lineTo(c * CELL, gridH);
    ctx.stroke();
  }

  // ===== 右侧统计面板 =====
  if (showStats) {
    const px = gridW + GAP;
    const total = stats.reduce((s, c) => s + c.count, 0);

    // 标题
    ctx.fillStyle = '#1a1a1a';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`拼豆统计`, px, 8);

    // 子标题
    ctx.fillStyle = '#888';
    ctx.font = '13px sans-serif';
    ctx.fillText(`${brand} · ${unit}  |  ${width}×${height}  |  共 ${total} 珠  |  ${stats.length} 色`, px, 36);

    // 分隔线
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px, 56);
    ctx.lineTo(px + PANEL_W, 56);
    ctx.stroke();

    // 颜色清单（2列）
    sorted.forEach((s, i) => {
      const col = i % 2;
      const r = Math.floor(i / 2);
      const sx = px + col * 195;
      const sy = 65 + r * statsItemH;

      // 大色块
      ctx.fillStyle = s.color.hex;
      ctx.fillRect(sx, sy, 24, 24);
      ctx.strokeStyle = '#CCC';
      ctx.lineWidth = 1;
      ctx.strokeRect(sx, sy, 24, 24);

      // 色号 + 名称
      ctx.fillStyle = '#1a1a1a';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(`${s.color.code}  ${s.color.name}`, sx + 32, sy + 2);

      // 数量 + 占比
      ctx.fillStyle = '#666';
      ctx.font = '12px sans-serif';
      ctx.fillText(`×${s.count}  (${s.percentage}%)`, sx + 32, sy + 20);
    });
  }

  canvas.toBlob((b) => {
    if (b) downloadFile(b, `拼豆图纸_${width}x${height}_${brand}.png`);
  }, 'image/png', 1.0);
}

// ==================== PDF 导出 ====================

export function exportPDF(
  matrix: string[][],
  colorMap: Map<string, BeadColor>,
  width: number,
  height: number,
  beadStyle: BeadStyle,
  showStats: boolean,
  stats: ColorStat[],
  brand: string,
  unit: CellSizeUnit,
): void {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10;

  // 第一页：图纸
  doc.setFontSize(16);
  doc.setTextColor(62, 42, 30);
  doc.text('拼豆图纸', pageWidth / 2, 15, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`品牌: ${brand} | 尺寸: ${unit} | 网格: ${width}x${height}`, pageWidth / 2, 22, { align: 'center' });

  const availW = pageWidth - margin * 2;
  const availH = pageHeight - margin * 2 - 40;
  const cellSize = Math.min(availW / width, availH / height, 5);
  const gridW = width * cellSize;
  const startX = (pageWidth - gridW) / 2;
  const startY = 30;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const colorId = matrix[y]?.[x];
      if (!colorId) continue;
      const color = colorMap.get(colorId);
      if (!color) continue;
      const { r, g, b } = hexToRgb(color.hex);
      doc.setFillColor(r, g, b);
      if (beadStyle === 'round') {
        doc.circle(startX + x * cellSize + cellSize / 2, startY + y * cellSize + cellSize / 2, cellSize / 2 - 0.2, 'F');
      } else {
        doc.rect(startX + x * cellSize + 0.2, startY + y * cellSize + 0.2, cellSize - 0.4, cellSize - 0.4, 'F');
      }
    }
  }

  // 第二页：统计
  if (showStats) {
    doc.addPage();
    doc.setFontSize(14);
    doc.setTextColor(62, 42, 30);
    doc.text('拼豆颜色统计清单', pageWidth / 2, 15, { align: 'center' });
    const total = stats.reduce((s, c) => s + c.count, 0);
    doc.setFontSize(10);
    doc.text(`总珠数: ${total} | 颜色种类: ${stats.length}`, pageWidth / 2, 22, { align: 'center' });

    let cy = 35;
    const sorted = [...stats].sort((a, b) => b.count - a.count);
    doc.setFontSize(9);
    for (const s of sorted) {
      if (cy > 280) { doc.addPage(); cy = 20; }
      const { r, g, b } = hexToRgb(s.color.hex);
      doc.setFillColor(r, g, b);
      doc.rect(margin, cy - 3, 5, 5, 'F');
      doc.setTextColor(62, 42, 30);
      doc.text(`${s.color.code} - ${s.color.name}: ${s.count} 颗`, margin + 10, cy + 2);
      cy += 8;
    }
  }

  doc.save(`拼豆图纸_${width}x${height}_${brand}.pdf`);
}

// ==================== SVG 导出 ====================

export function exportSVG(
  matrix: string[][],
  colorMap: Map<string, BeadColor>,
  width: number,
  height: number,
  beadStyle: BeadStyle,
): void {
  const C = 10;
  const w = width * C;
  const h = height * C;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`;
  svg += `<rect width="100%" height="100%" fill="white"/>`;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const colorId = matrix[y]?.[x];
      if (!colorId) continue;
      const color = colorMap.get(colorId);
      if (!color) continue;
      if (beadStyle === 'round') {
        svg += `<circle cx="${x * C + C / 2}" cy="${y * C + C / 2}" r="${C / 2 - 0.5}" fill="${color.hex}"/>`;
      } else {
        svg += `<rect x="${x * C + 0.5}" y="${y * C + 0.5}" width="${C - 1}" height="${C - 1}" fill="${color.hex}"/>`;
      }
    }
  }
  svg += '</svg>';
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  downloadFile(blob, `拼豆图纸_${width}x${height}.svg`);
}

// ==================== CSV 导出 ====================

export function exportCSV(stats: ColorStat[], brand: string): void {
  const header = '编号,名称,Hex,数量,占比(%)';
  const rows = stats.map(s => `${s.color.code},${s.color.name},${s.color.hex},${s.count},${s.percentage}`);
  downloadText([header, ...rows].join('\n'), `拼豆清单_${brand}.csv`);
}

// ==================== JSON 导出 ====================

export function exportJSON(
  matrix: string[][],
  width: number,
  height: number,
  stats: ColorStat[],
  brand: string,
  unit: CellSizeUnit,
  beadStyle: BeadStyle,
): void {
  const coords: { x: number; y: number; colorId: string }[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const id = matrix[y]?.[x];
      if (id) coords.push({ x, y, colorId: id });
    }
  }
  const colorList = stats.map(s => ({
    code: s.color.code,
    name: s.color.name,
    hex: s.color.hex,
    count: s.count,
    percentage: s.percentage,
    coordinates: coords.filter(c => c.colorId === s.color.id).map(c => ({ x: c.x, y: c.y })),
  }));
  const data = {
    metadata: {
      brand,
      gridSize: `${width}x${height}`,
      beadSize: unit,
      beadStyle,
      totalBeads: stats.reduce((s, c) => s + c.count, 0),
      colorCount: stats.length,
      createdAt: new Date().toISOString(),
    },
    colorList,
    grid: matrix,
  };
  downloadText(JSON.stringify(data, null, 2), `拼豆数据_${width}x${height}_${brand}.json`);
}
