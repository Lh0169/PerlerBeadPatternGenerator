// src/utils/exportManager.ts — 高分辨率导出
import { jsPDF } from 'jspdf';
import { BeadColor, BeadStyle, ColorStat, CellSizeUnit } from '../types';
import { saveFile } from './tauriAdapter';
import { registerChineseFont } from './pdfFont';

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

export async function downloadFile(blob: Blob, filename: string): Promise<{ success: boolean; path?: string; error?: string }> {
  return saveFile(blob, filename);
}

export async function downloadText(content: string, filename: string): Promise<{ success: boolean; path?: string; error?: string }> {
  const blob = new Blob(['﻿' + content], { type: 'text/plain;charset=utf-8' });
  return downloadFile(blob, filename);
}

// ==================== PNG 导出 ====================

export async function exportPNG(
  matrix: string[][],
  colorMap: Map<string, BeadColor>,
  width: number,
  height: number,
  beadStyle: BeadStyle,
  showStats: boolean,
  stats: ColorStat[],
  brand: string,
  unit: CellSizeUnit,
): Promise<{ success: boolean; filePath?: string; fileSize?: number; error?: string }> {
  try {
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

    // 将 canvas.toBlob 转为 Promise
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/png', 1.0);
    });

    if (!blob) {
      return { success: false, error: '画布转 Blob 失败' };
    }

    const filename = `拼豆图纸_${width}x${height}_${brand}.png`;
    const result = await downloadFile(blob, filename);

    if (!result.success) {
      return { success: false, error: result.error || 'PNG 保存失败' };
    }

    return { success: true, filePath: result.path, fileSize: blob.size };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'PNG 导出失败' };
  }
}

// ==================== PDF 导出（高清 + 格子色号 + 红色分隔线）====================

export async function exportPDF(
  matrix: string[][],
  colorMap: Map<string, BeadColor>,
  width: number,
  height: number,
  beadStyle: BeadStyle,
  showStats: boolean,
  stats: ColorStat[],
  brand: string,
  unit: CellSizeUnit,
): Promise<{ success: boolean; filePath?: string; fileSize?: number; error?: string }> {
  try {
  // 页面设置：A3 横向，格子更大更清晰
  const doc = new jsPDF('l', 'mm', 'a3');  // l = landscape 横向
  const pageWidth = 420;   // A3 横向宽度
  const pageHeight = 297;  // A3 横向高度
  const margin = 15;

  // 注册中文字体
  registerChineseFont(doc);
  doc.setFont('NotoSansSC');

  // ===== 第一页：高清图纸（带色号 + 红色分隔线）=====
  doc.setFontSize(18);
  doc.setTextColor(62, 42, 30);
  doc.text('拼豆图纸', pageWidth / 2, margin + 5, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text(`品牌: ${brand} | 尺寸: ${unit} | 网格: ${width}x${height}`, pageWidth / 2, margin + 12, { align: 'center' });

  // 计算格子大小（A3 横向空间更大，统计放第二页，第一页全给图纸）
  const availW = pageWidth - margin * 2;
  const availH = pageHeight - margin * 2 - 25; // 25mm 留给标题
  const cellSize = Math.min(availW / width, availH / height);

  const gridW = width * cellSize;
  const gridH = height * cellSize;
  const startX = (pageWidth - gridW) / 2;
  const startY = margin + 20;

  // 动态字号：格子越大字越大，最大 9pt
  const fontSize = Math.min(cellSize * 0.4, 9);
  const showLabel = cellSize >= 3.5; // 格子 >= 3.5mm 才印字

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const colorId = matrix[y]?.[x];
      if (!colorId) continue;
      const color = colorMap.get(colorId);
      if (!color) continue;

      const { r, g, b } = hexToRgb(color.hex);
      const cx = startX + x * cellSize + cellSize / 2;
      const cy = startY + y * cellSize + cellSize / 2;

      // 1. 绘制珠子（圆/方/中空）
      doc.setFillColor(r, g, b);
      if (beadStyle === 'round') {
        doc.circle(cx, cy, cellSize / 2 - 0.3, 'F');
      } else if (beadStyle === 'hollow') {
        doc.circle(cx, cy, cellSize / 2 - 0.3, 'F');
        doc.setFillColor(Math.max(0, r - 40), Math.max(0, g - 40), Math.max(0, b - 40));
        doc.circle(cx, cy, cellSize / 5, 'F');
      } else {
        doc.rect(startX + x * cellSize + 0.3, startY + y * cellSize + 0.3, cellSize - 0.6, cellSize - 0.6, 'F');
      }

      // 2. 在每个格子内印上色号（根据背景亮度选择文字颜色）
      if (showLabel) {
        const brightness = r * 0.299 + g * 0.587 + b * 0.114;
        doc.setTextColor(brightness > 128 ? 30 : 255);
        doc.setFontSize(fontSize);

        const textWidth = doc.getTextWidth(color.code);
        const textX = cx - textWidth / 2;
        const textY = cy + fontSize * 0.35;
        doc.text(color.code, textX, textY);
      }
    }
  }

  // 3. 红色分隔线（每 GROUP 格一组）
  doc.setDrawColor(229, 57, 53); // #E53935 红色
  doc.setLineWidth(0.8);

  for (let r = GROUP; r < height; r += GROUP) {
    const lineY = startY + r * cellSize;
    doc.line(startX, lineY, startX + gridW, lineY);
  }
  for (let c = GROUP; c < width; c += GROUP) {
    const lineX = startX + c * cellSize;
    doc.line(lineX, startY, lineX, startY + gridH);
  }

  // ===== 第二页：详细颜色统计清单 =====
  if (showStats) {
    doc.addPage();

    doc.setFontSize(16);
    doc.setTextColor(62, 42, 30);
    doc.text('拼豆颜色统计清单', pageWidth / 2, margin + 5, { align: 'center' });

    const total = stats.reduce((s, c) => s + c.count, 0);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`总珠数: ${total} | 颜色种类: ${stats.length}`, pageWidth / 2, margin + 12, { align: 'center' });

    // 表头
    let cy = margin + 25;
    const rowHeight = 7;
    const colX = {
      color: margin,
      code: margin + 12,
      name: margin + 40,
      hex: margin + 120,
      count: margin + 165,
      percent: margin + 200,
    };

    doc.setFillColor(245, 245, 245);
    doc.rect(margin, cy - 5, pageWidth - margin * 2, rowHeight, 'F');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text('色块', colX.color + 1, cy);
    doc.text('编号', colX.code, cy);
    doc.text('名称', colX.name, cy);
    doc.text('Hex', colX.hex, cy);
    doc.text('数量', colX.count, cy);
    doc.text('占比', colX.percent, cy);

    // 数据行
    cy += rowHeight + 2;
    const sorted = [...stats].sort((a, b) => b.count - a.count);

    for (let i = 0; i < sorted.length; i++) {
      const s = sorted[i];

      // 分页
      if (cy > pageHeight - margin - 10) {
        doc.addPage();
        cy = margin + 10;
      }

      // 隔行背景
      if (i % 2 === 1) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, cy - 5, pageWidth - margin * 2, rowHeight, 'F');
      }

      const { r, g, b } = hexToRgb(s.color.hex);

      // 色块
      doc.setFillColor(r, g, b);
      doc.rect(colX.color, cy - 4, 6, 6, 'F');

      // 数据
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(8.5);
      doc.text(s.color.code, colX.code, cy);
      doc.text(s.color.name, colX.name, cy);
      doc.text(s.color.hex.toUpperCase(), colX.hex, cy);
      doc.text(String(s.count), colX.count, cy);
      doc.text(`${s.percentage}%`, colX.percent, cy);

      cy += rowHeight;
    }
  }

  const pdfBlob = doc.output('blob');
  const filename = `拼豆图纸_${width}x${height}_${brand}.pdf`;
  const result = await saveFile(pdfBlob, filename);

  if (!result.success) {
    return { success: false, error: result.error || 'PDF 保存失败' };
  }

  return { success: true, filePath: result.path, fileSize: pdfBlob.size };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'PDF 导出失败' };
  }
}

// ==================== SVG 导出 ====================

export async function exportSVG(
  matrix: string[][],
  colorMap: Map<string, BeadColor>,
  width: number,
  height: number,
  beadStyle: BeadStyle,
): Promise<{ success: boolean; filePath?: string; fileSize?: number; error?: string }> {
  try {
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
  const filename = `拼豆图纸_${width}x${height}.svg`;
  const result = await downloadFile(blob, filename);

  if (!result.success) {
    return { success: false, error: result.error || 'SVG 保存失败' };
  }

  return { success: true, filePath: result.path, fileSize: blob.size };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'SVG 导出失败' };
  }
}

// ==================== CSV 导出 ====================

export async function exportCSV(stats: ColorStat[], brand: string): Promise<{ success: boolean; filePath?: string; fileSize?: number; error?: string }> {
  try {
  const header = '编号,名称,Hex,数量,占比(%)';
  const rows = stats.map(s => `${s.color.code},${s.color.name},${s.color.hex},${s.count},${s.percentage}`);
  const content = [header, ...rows].join('\n');
  const filename = `拼豆清单_${brand}.csv`;
  const result = await downloadText(content, filename);

  if (!result.success) {
    return { success: false, error: result.error || 'CSV 保存失败' };
  }

  return { success: true, filePath: result.path, fileSize: new Blob([content]).size };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'CSV 导出失败' };
  }
}

// ==================== JSON 导出 ====================

export async function exportJSON(
  matrix: string[][],
  width: number,
  height: number,
  stats: ColorStat[],
  brand: string,
  unit: CellSizeUnit,
  beadStyle: BeadStyle,
): Promise<{ success: boolean; filePath?: string; fileSize?: number; error?: string }> {
  try {
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
  const content = JSON.stringify(data, null, 2);
  const filename = `拼豆数据_${width}x${height}_${brand}.json`;
  const result = await downloadText(content, filename);

  if (!result.success) {
    return { success: false, error: result.error || 'JSON 保存失败' };
  }

  return { success: true, filePath: result.path, fileSize: new Blob([content]).size };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'JSON 导出失败' };
  }
}
