// src/utils/imageProcessor.ts
import { BeadColor, MardCategory, ColorStat } from '../types';
import { rgbToLab, findClosestColorLab, buildLabPalette, buildColorMap, generateStats, limitPaletteColors } from './colorMatcher';
import { filterMardPalette } from './colorPalette';

export async function processImage(
  image: HTMLImageElement,
  gridWidth: number,
  palette: BeadColor[],
  mardCategory?: MardCategory,
): Promise<{
  matrix: string[][];
  width: number;
  height: number;
  stats: ColorStat[];
}> {
  const effectivePalette = limitPaletteColors(
    mardCategory ? filterMardPalette(palette, mardCategory) : palette,
    gridWidth,
  );

  const aspectRatio = image.naturalHeight / image.naturalWidth;
  const gridHeight = Math.round(gridWidth * aspectRatio);
  const width = Math.min(gridWidth, 200);
  const height = Math.min(gridHeight, 200);

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D 上下文不可用');
  ctx.drawImage(image, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const labPalette = buildLabPalette(effectivePalette);
  const colorMap = buildColorMap(effectivePalette);

  const matrix: string[][] = [];
  for (let row = 0; row < height; row++) {
    const rowData: string[] = [];
    for (let col = 0; col < width; col++) {
      const idx = (row * width + col) * 4;
      const alpha = imageData.data[idx + 3];
      if (alpha < 128) {
        rowData.push('');
        continue;
      }
      const lab = rgbToLab(
        imageData.data[idx],
        imageData.data[idx + 1],
        imageData.data[idx + 2],
      );
      rowData.push(findClosestColorLab(lab, labPalette));
    }
    matrix.push(rowData);
  }

  const stats = generateStats(matrix, colorMap);
  return { matrix, width, height, stats };
}
