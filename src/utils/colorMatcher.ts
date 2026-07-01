// src/utils/colorMatcher.ts
import { BeadColor, ColorStat } from '../types';

interface LabColor { l: number; a: number; b: number }
interface LabPaletteEntry extends LabColor { id: string }

/** sRGB → CIELAB */
export function rgbToLab(r: number, g: number, b: number): LabColor {
  let rr = r / 255, gg = g / 255, bb = b / 255;
  rr = rr > 0.04045 ? Math.pow((rr + 0.055) / 1.055, 2.4) : rr / 12.92;
  gg = gg > 0.04045 ? Math.pow((gg + 0.055) / 1.055, 2.4) : gg / 12.92;
  bb = bb > 0.04045 ? Math.pow((bb + 0.055) / 1.055, 2.4) : bb / 12.92;
  rr *= 100; gg *= 100; bb *= 100;
  const x = rr * 0.4124 + gg * 0.3576 + bb * 0.1805;
  const y = rr * 0.2126 + gg * 0.7152 + bb * 0.0722;
  const z = rr * 0.0193 + gg * 0.1192 + bb * 0.9505;
  let xr = x / 95.047, yr = y / 100, zr = z / 108.883;
  xr = xr > 0.008856 ? Math.pow(xr, 1 / 3) : 7.787 * xr + 16 / 116;
  yr = yr > 0.008856 ? Math.pow(yr, 1 / 3) : 7.787 * yr + 16 / 116;
  zr = zr > 0.008856 ? Math.pow(zr, 1 / 3) : 7.787 * zr + 16 / 116;
  return { l: 116 * yr - 16, a: 500 * (xr - yr), b: 200 * (yr - zr) };
}

/** hex → Lab */
function hexToLab(hex: string): LabColor {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return rgbToLab(r, g, b);
}

/** 构建 LAB 调色板查找表 */
export function buildLabPalette(palette: BeadColor[]): LabPaletteEntry[] {
  return palette.map(c => ({ id: c.id, ...hexToLab(c.hex) }));
}

/** 在 LAB 空间找最近颜色 */
export function findClosestColorLab(
  target: LabColor,
  labPalette: LabPaletteEntry[]
): string {
  let minDist = Infinity, closest = labPalette[0].id;
  for (const c of labPalette) {
    const dl = target.l - c.l, da = target.a - c.a, db = target.b - c.b;
    const d = dl * dl + da * da + db * db;
    if (d < minDist) { minDist = d; closest = c.id; }
  }
  return closest;
}

/** 按网格宽度限制颜色数：均匀采样保证色域覆盖 */
export function limitPaletteColors(palette: BeadColor[], gridWidth: number): BeadColor[] {
  const maxColors = Math.max(24, Math.round(gridWidth * 2.5));
  if (palette.length <= maxColors) return palette;
  const step = palette.length / maxColors;
  const result: BeadColor[] = [];
  for (let i = 0; i < maxColors; i++) {
    result.push(palette[Math.floor(i * step)]);
  }
  return result;
}

/** 根据 BeadColor 查找表解析 id → BeadColor */
export function buildColorMap(palette: BeadColor[]): Map<string, BeadColor> {
  const m = new Map<string, BeadColor>();
  for (const c of palette) m.set(c.id, c);
  return m;
}

/** 生成颜色统计 */
export function generateStats(matrix: string[][], colorMap: Map<string, BeadColor>): ColorStat[] {
  const count = new Map<string, number>();
  let total = 0;
  for (const row of matrix) {
    for (const id of row) {
      if (!id) continue;
      count.set(id, (count.get(id) ?? 0) + 1);
      total++;
    }
  }
  if (total === 0) return [];
  return [...count.entries()]
    .map(([id, n]) => {
      const color = colorMap.get(id);
      return color ? { color, count: n, percentage: Math.round(n / total * 10000) / 100 } : null;
    })
    .filter(Boolean) as ColorStat[];
}
