// src/utils/denoiseEngine.ts
// 风格预设去杂引擎 — 移植自 pindou-tool 算法管线
import { BeadColor, ColorStat } from '../types';
import { rgbToLab, LabColor } from './colorMatcher';
import { buildColorMap, generateStats } from './colorMatcher';

// ---- 辅助函数 ----

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function lumFromHex(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const _labCache = new Map<string, LabColor>();

function getLab(c: BeadColor): LabColor {
  let lab = _labCache.get(c.id);
  if (!lab) {
    const [r, g, b] = hexToRgb(c.hex);
    lab = rgbToLab(r, g, b);
    _labCache.set(c.id, lab);
  }
  return lab;
}

function labDistSq(a: LabColor, b: LabColor): number {
  const dl = a.l - b.l;
  const da = a.a - b.a;
  const db = a.b - b.b;
  return dl * dl * 1.15 + da * da + db * db;
}

// ---- 风格预设 ----
export type StyleKey = 'anime' | 'photo' | 'illustration' | 'pixel';

export interface StyleParams {
  name: string;
  label: string;
  denoiseStrength: number;
  edgeProtect: boolean;
  colorMergeAggression: number;
  minRegionSize: number;
  preserveLineart: boolean;
  edgeThreshold: number;
  colorEdgeThreshold: number;
  edgeProtectRadius: number;
}

export const STYLE_PRESETS: Record<StyleKey, StyleParams> = {
  anime: {
    name: 'anime', label: '🎌 动漫/漫画',
    denoiseStrength: 68, edgeProtect: true,
    colorMergeAggression: 0.55, minRegionSize: 2,
    preserveLineart: true, edgeThreshold: 32,
    colorEdgeThreshold: 18, edgeProtectRadius: 1,
  },
  photo: {
    name: 'photo', label: '📷 真人照片',
    denoiseStrength: 24, edgeProtect: true,
    colorMergeAggression: 0.18, minRegionSize: 1,
    preserveLineart: false, edgeThreshold: 28,
    colorEdgeThreshold: 14, edgeProtectRadius: 1,
  },
  illustration: {
    name: 'illustration', label: '🎨 插画/海报',
    denoiseStrength: 56, edgeProtect: true,
    colorMergeAggression: 0.45, minRegionSize: 2,
    preserveLineart: true, edgeThreshold: 30,
    colorEdgeThreshold: 16, edgeProtectRadius: 1,
  },
  pixel: {
    name: 'pixel', label: '👾 像素/图标',
    denoiseStrength: 18, edgeProtect: true,
    colorMergeAggression: 0.15, minRegionSize: 1,
    preserveLineart: true, edgeThreshold: 22,
    colorEdgeThreshold: 12, edgeProtectRadius: 1,
  },
};

/** 膨胀蒙版 */
function dilateMask(mask: Uint8Array, w: number, h: number, radius: number): Uint8Array {
  if (!radius) return mask;
  const out = new Uint8Array(mask);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < w && ny < h) out[ny * w + nx] = 1;
        }
      }
    }
  }
  return out;
}

// ---- 边缘检测 ----

function computeEdgeMask(
  grid: BeadColor[][],
  w: number,
  h: number,
  style: StyleParams,
): Uint8Array {
  const mask = new Uint8Array(w * h);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = grid[y][x];
      if (!p) continue;

      // Sobel 亮度梯度
      const g = (cy: number, cx: number) => {
        const c = grid[cy]?.[cx];
        return c ? lumFromHex(c.hex) : 0;
      };
      const gx00 = g(y - 1, x - 1), gx01 = g(y - 1, x), gx02 = g(y - 1, x + 1);
      const gx10 = g(y, x - 1), gx12 = g(y, x + 1);
      const gx20 = g(y + 1, x - 1), gx21 = g(y + 1, x), gx22 = g(y + 1, x + 1);
      const sx = -gx00 - 2 * gx10 - gx20 + gx02 + 2 * gx12 + gx22;
      const sy = -gx00 - 2 * gx01 - gx02 + gx20 + 2 * gx21 + gx22;

      // Lab 邻域最大色差
      let maxColorEdge = 0;
      const labP = getLab(p);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const q = grid[y + dy]?.[x + dx];
          if (!q) continue;
          maxColorEdge = Math.max(maxColorEdge, Math.sqrt(labDistSq(labP, getLab(q))));
        }
      }

      if (Math.sqrt(sx * sx + sy * sy) > style.edgeThreshold || maxColorEdge > style.colorEdgeThreshold) {
        mask[y * w + x] = 1;
      }
    }
  }

  // 线稿保护（深色像素标记为边缘）
  if (style.preserveLineart) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = grid[y][x];
        if (!p || mask[y * w + x]) continue;
        if (lumFromHex(p.hex) < 80) mask[y * w + x] = 1;
      }
    }
  }

  return dilateMask(mask, w, h, style.edgeProtectRadius);
}

// ---- 孤点清除 ----

function removeIsolatedPixels(
  grid: BeadColor[][],
  w: number,
  h: number,
  edgeMask: Uint8Array,
  style: StyleParams,
): void {
  const passes = Math.min(4, Math.round(style.denoiseStrength / 25));
  for (let pass = 0; pass < passes; pass++) {
    const snap = grid.map(row => row.slice());
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = snap[y][x];
        if (!p) continue;
        const isEdge = !!edgeMask[y * w + x];
        const tally = new Map<string, { count: number; color: BeadColor }>();
        let sameCount = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const ny = y + dy, nx = x + dx;
            if (ny < 0 || nx < 0 || ny >= h || nx >= w) continue;
            const q = snap[ny][nx];
            if (!q) continue;
            if (q.id === p.id) { sameCount++; continue; }
            const e = tally.get(q.id);
            if (e) e.count++; else tally.set(q.id, { count: 1, color: q });
          }
        }
        let bestC: BeadColor | null = null;
        let bestN = 0;
        for (const [, v] of tally) { if (v.count > bestN) { bestN = v.count; bestC = v.color; } }
        if (isEdge) {
          if (sameCount <= 0 && bestC && bestN >= 5) grid[y][x] = bestC;
        } else {
          if (sameCount <= 1 && bestC && bestN >= 3) grid[y][x] = bestC;
        }
      }
    }
  }
}

// ---- 稀有色合并 ----

function mergeRareColors(
  grid: BeadColor[][],
  w: number,
  h: number,
  edgeMask: Uint8Array,
  style: StyleParams,
  palette: BeadColor[],
): void {
  const counts = new Map<string, number>();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = grid[y][x];
      if (p) counts.set(p.id, (counts.get(p.id) ?? 0) + 1);
    }
  }
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  const ratio = (style.denoiseStrength / 100) * 0.012 * style.colorMergeAggression;
  const minCnt = Math.max(2, Math.round(total * ratio));

  const keep = palette.filter(p => counts.has(p.id) && (counts.get(p.id) ?? 0) >= minCnt);
  if (!keep.length) return;

  const remap = new Map<string, BeadColor>();
  for (const p of palette) {
    if (!counts.has(p.id)) continue;
    if ((counts.get(p.id) ?? 0) >= minCnt) { remap.set(p.id, p); continue; }
    let best = keep[0], bestD = Infinity;
    const labP = getLab(p);
    for (const k of keep) {
      const d = labDistSq(labP, getLab(k));
      if (d < bestD) { bestD = d; best = k; }
    }
    remap.set(p.id, best);
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = grid[y][x];
      if (!p) continue;
      if (edgeMask[y * w + x]) continue;
      const mapped = remap.get(p.id);
      if (mapped && mapped !== p) grid[y][x] = mapped;
    }
  }
}

// ---- BFS 连通区域清理 ----

function cleanupSmallRegions(
  grid: BeadColor[][],
  w: number,
  h: number,
  edgeMask: Uint8Array,
  style: StyleParams,
): void {
  if (style.minRegionSize <= 1) return;
  const visited = new Uint8Array(h * w);
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (visited[y * w + x]) continue;
      const p = grid[y][x];
      if (!p) continue;

      const region: [number, number][] = [];
      const queue: [number, number][] = [[x, y]];
      visited[y * w + x] = 1;
      let head = 0;
      while (head < queue.length) {
        const [cx, cy] = queue[head++];
        region.push([cx, cy]);
        for (const [dx, dy] of dirs) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          if (visited[ny * w + nx]) continue;
          const q = grid[ny][nx];
          if (q && q.id === p.id) {
            visited[ny * w + nx] = 1;
            queue.push([nx, ny]);
          }
        }
      }
      if (region.length >= style.minRegionSize) continue;

      const tally = new Map<string, { count: number; color: BeadColor }>();
      for (const [cx, cy] of region) {
        for (const [dx, dy] of dirs) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const q = grid[ny][nx];
          if (!q || q.id === p.id) continue;
          const e = tally.get(q.id);
          if (e) e.count++; else tally.set(q.id, { count: 1, color: q });
        }
      }
      let bestC: BeadColor | null = null;
      let bestN = 0;
      for (const [, v] of tally) { if (v.count > bestN) { bestN = v.count; bestC = v.color; } }
      if (bestC) {
        for (const [cx, cy] of region) {
          if (edgeMask[cy * w + cx]) continue;
          grid[cy][cx] = bestC;
        }
      }
    }
  }
}

// ---- 边缘回填 ----

function restoreEdges(
  grid: BeadColor[][],
  rawGrid: BeadColor[][],
  w: number,
  h: number,
  edgeMask: Uint8Array,
): void {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (edgeMask[i] && rawGrid[y][x] && grid[y][x] && grid[y][x].id !== rawGrid[y][x].id) {
        grid[y][x] = rawGrid[y][x];
      }
    }
  }
}

// ---- 统一入口 ----

export interface DenoiseInput {
  matrix: string[][];
  width: number;
  height: number;
  palette: BeadColor[];
  style?: StyleKey | null;
}

export interface DenoiseResult {
  matrix: string[][];
  stats: ColorStat[];
}

/** 对矩阵应用风格去杂 */
export function applyStyleDenoise(input: DenoiseInput): DenoiseResult {
  const { matrix, width: w, height: h, palette, style } = input;
  if (!style || !STYLE_PRESETS[style]) {
    const colorMap = buildColorMap(palette);
    return { matrix, stats: generateStats(matrix, colorMap) };
  }

  const params = STYLE_PRESETS[style];
  if (params.denoiseStrength <= 0) {
    const colorMap = buildColorMap(palette);
    return { matrix, stats: generateStats(matrix, colorMap) };
  }

  const colorMap = buildColorMap(palette);

  // 构建 BeadColor[][] 网格
  const grid: BeadColor[][] = new Array(h);
  for (let y = 0; y < h; y++) {
    grid[y] = new Array(w);
    for (let x = 0; x < w; x++) {
      const id = matrix[y][x];
      grid[y][x] = id ? (colorMap.get(id) ?? null!) : null!;
    }
  }

  const rawGrid = grid.map(row => row.slice());

  // 1. 边缘检测
  const edgeMask = params.edgeProtect ? computeEdgeMask(rawGrid, w, h, params) : new Uint8Array(w * h);

  // 2. 多轮孤点清除
  removeIsolatedPixels(grid, w, h, edgeMask, params);

  // 3. 稀有色合并
  mergeRareColors(grid, w, h, edgeMask, params, palette);

  // 4. 连通区域清理
  cleanupSmallRegions(grid, w, h, edgeMask, params);

  // 5. 边缘回填
  if (params.edgeProtect) {
    restoreEdges(grid, rawGrid, w, h, edgeMask);
  }

  // 转回 string[][] 矩阵
  const newMatrix = grid.map(row => row.map(c => c?.id ?? ''));
  const stats = generateStats(newMatrix, colorMap);

  return { matrix: newMatrix, stats };
}
