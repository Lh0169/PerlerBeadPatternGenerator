import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  BeadColor, BeadStyle, GridSpacing, CellSizeUnit, EditorTool, MardCategory, ColorStat,
  DEFAULT_GRID_WIDTH,
} from './types';
import { getPalette, getBrandNames } from './utils/colorPalette';
import { buildColorMap } from './utils/colorMatcher';
import { processImage } from './utils/imageProcessor';
import { exportPNG, exportCSV, exportJSON, exportSVG, exportPDF } from './utils/exportManager';
import Header from './components/Header';
import ImageCropper from './components/ImageCropper';
import BeadGridCanvas from './components/BeadGridCanvas';
import ColorStats from './components/ColorStats';
import Sidebar from './components/Sidebar';
import ColorPicker from './components/ColorPicker';
import CleanupDialog from './components/CleanupDialog';
import ClickSpark from './components/ui/ClickSpark/ClickSpark';

const App: React.FC = () => {
  // ---- 图片/图谱状态 ----
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [matrix, setMatrix] = useState<string[][]>([]);
  const [imgW, setImgW] = useState(0);
  const [imgH, setImgH] = useState(0);
  const [colorMap, setColorMap] = useState<Map<string, BeadColor>>(new Map());
  const [stats, setStats] = useState<ColorStat[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);

  // ---- 设置状态 ----
  const [gridWidth, setGridWidth] = useState(DEFAULT_GRID_WIDTH);
  const [brand, setBrand] = useState('MARD');
  const [mardCategory, setMardCategory] = useState<MardCategory>('all');
  const [cellSizeUnit, setCellSizeUnit] = useState<CellSizeUnit>('2.6mm');
  const [beadStyle, setBeadStyle] = useState<BeadStyle>('round');
  const [gridSpacing, setGridSpacing] = useState<GridSpacing>('small');
  const [showGrid, setShowGrid] = useState(true);
  const [showCodes, setShowCodes] = useState(false);
  const [showStatsExport, setShowStatsExport] = useState(true);
  const [highlightedCode, setHighlightedCode] = useState<string | null>(null);

  // ---- 编辑器状态 ----
  const [editorTool, setEditorTool] = useState<EditorTool>('brush');
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [history, setHistory] = useState<string[][][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [zoom, setZoom] = useState(1);

  // ---- 弹窗/面板 ----
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const [forceExpandSidebar, setForceExpandSidebar] = useState(false);
  const [exporting, setExporting] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const brands = getBrandNames();
  const palette = getPalette(brand);

  // ========== 历史记录 ==========

  const saveHistory = useCallback((m: string[][]) => {
    setHistory((prev) => {
      const trimmed = prev.slice(0, historyIndex + 1);
      const next = [...trimmed, m.map((row) => [...row])];
      if (next.length > 50) { next.shift(); }
      return next;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 49));
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const idx = historyIndex - 1;
      setHistoryIndex(idx);
      setMatrix(history[idx].map((row) => [...row]));
    }
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const idx = historyIndex + 1;
      setHistoryIndex(idx);
      setMatrix(history[idx].map((row) => [...row]));
    }
  }, [historyIndex, history]);

  // ========== 文件上传 + 裁剪 ==========

  const handleFile = useCallback((file: File) => {
    setOriginalFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setCropSrc(e.target?.result as string);
    reader.readAsDataURL(file);
    // 新图片重置参数到默认值
    setGridWidth(DEFAULT_GRID_WIDTH);
  }, []);

  const doProcess = useCallback(async (img: HTMLImageElement) => {
    setIsProcessing(true);
    try {
      const p = getPalette(brand);
      const result = await processImage(img, gridWidth, p, brand === 'MARD' ? mardCategory : undefined);
      setMatrix(result.matrix);
      setImgW(result.width);
      setImgH(result.height);
      setColorMap(buildColorMap(p));
      setStats(result.stats);
      setHistory([result.matrix.map((row) => [...row])]);
      setHistoryIndex(0);
      setSelectedColor(null);
    } catch (e) { console.error('处理失败:', e); }
    finally { setIsProcessing(false); }
  }, [brand, gridWidth, mardCategory]);

  const handleCropComplete = useCallback((croppedUrl: string) => {
    setCropSrc(null);
    const img = new Image();
    img.onload = () => { setImage(img); doProcess(img); };
    img.src = croppedUrl;
    // 裁剪确认后延迟展开设置面板
    setTimeout(() => setForceExpandSidebar(true), 500);
  }, [doProcess]);

  const handleSkipCrop = useCallback(() => {
    setCropSrc(null);
    if (!originalFile) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => { setImage(img); doProcess(img); };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(originalFile);
    setTimeout(() => setForceExpandSidebar(true), 500);
  }, [originalFile, doProcess]);

  // 品牌/分类变更 → 立即重生
  useEffect(() => {
    if (!image) return;
    doProcess(image);
  }, [brand, mardCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  // 宽度变更 → 防抖重生
  const debounceRef = useRef<number>(0);
  useEffect(() => {
    if (!image) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => doProcess(image), 400);
    return () => clearTimeout(debounceRef.current);
  }, [gridWidth]); // eslint-disable-line react-hooks/exhaustive-deps

  // ========== 编辑器操作 ==========

  const handleCellEdit = useCallback((row: number, col: number, colorId: string) => {
    setMatrix((prev) => {
      const next = prev.map((r) => [...r]);
      if (row >= 0 && row < next.length && col >= 0 && col < (next[0]?.length ?? 0)) {
        next[row][col] = colorId;
      }
      return next;
    });
  }, []);

  const handleColorPick = useCallback((colorId: string) => {
    setSelectedColor(colorId);
    setEditorTool('brush');
  }, []);

  // ========== 工具操作 ==========

  const toggleMirror = useCallback(() => {
    setMatrix((prev) => {
      const next = prev.map((row) => [...row].reverse());
      saveHistory(next);
      return next;
    });
  }, [saveHistory]);

  const handleCleanup = useCallback((colorIds: string[]) => {
    const removeSet = new Set(colorIds);
    setMatrix((prev) => {
      const next = prev.map((row) => row.map((id) => removeSet.has(id) ? '' : id));
      saveHistory(next);
      return next;
    });
    setShowCleanupDialog(false);
  }, [saveHistory]);

  // ========== 导出 ==========

  const handleExport = useCallback((format: string) => {
    if (matrix.length === 0 || exporting) return;
    const labels: Record<string, string> = { png: 'PNG 图纸', pdf: 'PDF 文档', svg: 'SVG 矢量', csv: 'CSV 采购清单', json: 'JSON 数据' };
    setExporting(`正在导出 ${labels[format] ?? format}...`);
    // requestAnimationFrame 确保遮罩先渲染
    requestAnimationFrame(() => {
      switch (format) {
        case 'png':
          exportPNG(matrix, colorMap, imgW, imgH, beadStyle, showStatsExport, stats, brand, cellSizeUnit);
          break;
        case 'csv':
          exportCSV(stats, brand);
          break;
        case 'json':
          exportJSON(matrix, imgW, imgH, stats, brand, cellSizeUnit, beadStyle);
          break;
        case 'svg':
          exportSVG(matrix, colorMap, imgW, imgH, beadStyle);
          break;
        case 'pdf':
          exportPDF(matrix, colorMap, imgW, imgH, beadStyle, showStatsExport, stats, brand, cellSizeUnit);
          break;
      }
      // 最小显示 800ms，防止一闪而过
      setTimeout(() => setExporting(''), 800);
    });
  }, [matrix, colorMap, imgW, imgH, beadStyle, showCodes, stats, brand, cellSizeUnit, exporting]);

  // ========== 键盘快捷键 ==========

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      }
      if (e.key === 'b' && !e.ctrlKey && !e.metaKey) setEditorTool('brush');
      if (e.key === 'e' && !e.ctrlKey && !e.metaKey) setEditorTool('eraser');
      if (e.key === 'i' && !e.ctrlKey && !e.metaKey) setEditorTool('eyedropper');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  // ========== 重新生成统计 ==========
  React.useEffect(() => {
    if (matrix.length === 0) return;
    const count = new Map<string, number>();
    let total = 0;
    for (const row of matrix) {
      for (const id of row) {
        if (id) { count.set(id, (count.get(id) ?? 0) + 1); total++; }
      }
    }
    if (total === 0) { setStats([]); return; }
    const newStats: ColorStat[] = [...count.entries()]
      .map(([id, n]) => {
        const color = colorMap.get(id);
        return color ? { color, count: n, percentage: Math.round(n / total * 10000) / 100 } : null;
      })
      .filter(Boolean) as ColorStat[];
    newStats.sort((a, b) => b.count - a.count);
    setStats(newStats);
  }, [matrix, colorMap]);

  const accentGreen = '#30E787';
  const btnBase = 'px-2 py-1 text-xs rounded-lg transition-all font-medium';

  // ========== 布局 ==========

  return (
    <ClickSpark sparkColor="#30E787" sparkSize={10} sparkCount={6}>
    <div className="h-full flex flex-col">
      <Header />

      {/* 隐藏的上传 input — 供空状态使用 */}
      <input type="file" ref={fileInputRef} accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

      {/* 裁剪弹窗 */}
      {cropSrc && (
        <ImageCropper src={cropSrc} onCropComplete={handleCropComplete} onSkipCrop={handleSkipCrop}
          onCancelUpload={() => { setCropSrc(null); setOriginalFile(null); }} />
      )}

      {/* 颜色选择弹窗 */}
      {showColorPicker && (
        <ColorPicker palette={palette} selectedColor={selectedColor}
          onSelect={(id) => { setSelectedColor(id); setEditorTool('brush'); setShowColorPicker(false); }}
          onClose={() => setShowColorPicker(false)} />
      )}

      {/* 去除杂色弹窗 */}
      {showCleanupDialog && (
        <CleanupDialog stats={stats}
          onCleanup={handleCleanup} onClose={() => setShowCleanupDialog(false)} />
      )}

      {/* 顶部工具栏 — 可折叠 */}
      {showToolbar && image && (
        <div
          className="flex items-center gap-1.5 px-4 py-2 border-b h-11 shrink-0 z-10"
          style={{ background: 'rgba(255,253,249,0.92)', backdropFilter: 'blur(12px)', borderColor: '#e5ded4' }}
        >
          {/* 编辑工具组 */}
          <div className="flex items-center gap-0.5 rounded-lg p-0.5" style={{ background: '#f5f0e8' }}>
            {([
              { tool: 'brush' as EditorTool, label: '🖌', title: '画笔 (B)' },
              { tool: 'eraser' as EditorTool, label: '🧹', title: '橡皮擦 (E)' },
              { tool: 'eyedropper' as EditorTool, label: '💉', title: '吸色器 (I)' },
            ]).map(({ tool, label, title }) => (
              <button key={tool} title={title}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${
                  editorTool === tool ? 'bg-white text-gray-900 shadow-sm' : ''
                }`}
                style={editorTool === tool ? { color: '#2d2420' } : { color: '#6b5e56' }}
                onClick={() => {
                  setEditorTool(tool);
                  if (tool === 'brush' && !selectedColor) setShowColorPicker(true);
                }}>
                {label}
              </button>
            ))}
          </div>

          {/* 颜色指示器 */}
          <button
            className="flex items-center gap-1 px-2 py-1 rounded-lg border cursor-pointer transition-all"
            style={{ background: '#fffdf9', borderColor: '#e5ded4' }}
            onClick={() => setShowColorPicker(true)} title="选择颜色"
          >
            <span className="w-3.5 h-3.5 rounded-sm border" style={{ background: selectedColor ? (colorMap.get(selectedColor)?.hex ?? '#FFF') : '#FFF', borderColor: '#d4cbbd' }} />
            <span className="text-[10px] font-bold" style={{ color: '#6b5e56' }}>
              {selectedColor ? colorMap.get(selectedColor)?.code ?? '?' : '选色'}
            </span>
          </button>

          <span className="text-gray-300">|</span>

          {/* 撤销/重做 */}
          <button onClick={undo} disabled={historyIndex <= 0}
            className={`${btnBase} disabled:opacity-30`} style={{ color: '#6b5e56' }} title="撤销 (Ctrl+Z)">↩</button>
          <button onClick={redo} disabled={historyIndex >= history.length - 1}
            className={`${btnBase} disabled:opacity-30`} style={{ color: '#6b5e56' }} title="重做 (Ctrl+Shift+Z)">↪</button>

          <span className="text-gray-300">|</span>

          {/* 缩放 */}
          <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            className={btnBase} style={{ color: '#6b5e56' }}>−</button>
          <span className="text-[10px] font-bold w-8 text-center" style={{ color: '#2d2420' }}>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
            className={btnBase} style={{ color: '#6b5e56' }}>+</button>

          <span className="text-gray-300">|</span>

          {/* 宽度调节 */}
          <span className="text-[10px] font-medium" style={{ color: '#9b8e86' }}>宽:</span>
          <button onClick={() => setGridWidth(Math.max(10, gridWidth - 5))}
            className="px-1 text-xs" style={{ color: '#6b5e56' }}>−</button>
          <input type="range" min={10} max={200} value={gridWidth}
            onChange={(e) => setGridWidth(parseInt(e.target.value))} className="w-16" />
          <button onClick={() => setGridWidth(Math.min(200, gridWidth + 5))}
            className="px-1 text-xs" style={{ color: '#6b5e56' }}>+</button>
          <span className="text-xs font-bold w-7" style={{ color: '#2d2420' }}>{gridWidth}</span>

          <select value={brand} onChange={(e) => setBrand(e.target.value)}
            className="px-2 py-1 text-xs border rounded-lg font-medium cursor-pointer"
            style={{ background: '#fffdf9', borderColor: '#e5ded4', color: '#2d2420' }}>
            {brands.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>

          {isProcessing && <span className="text-[10px] animate-pulse" style={{ color: '#9b8e86' }}>处理中...</span>}

          <span className="text-gray-300">|</span>

          {/* 网格/色号 */}
          <button
            className="px-2 py-1 text-xs font-bold rounded-lg transition-all"
            style={showGrid ? { background: accentGreen, color: '#fff' } : { color: '#6b5e56' }}
            onClick={() => setShowGrid((v) => !v)}>网格</button>
          <button
            className="px-2 py-1 text-xs font-bold rounded-lg transition-all"
            style={showCodes ? { background: accentGreen, color: '#fff' } : { color: '#6b5e56' }}
            onClick={() => setShowCodes((v) => !v)}>色号</button>
        </div>
      )}

      {/* 导出阻塞遮罩 */}
      {exporting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}>
          <div className="flex flex-col items-center gap-4 px-10 py-8 rounded-2xl shadow-2xl border"
            style={{ background: '#fffdf9', borderColor: '#e5ded4' }}>
            <div className="w-10 h-10 border-[3px] rounded-full animate-spin"
              style={{ borderColor: '#e5ded4', borderTopColor: '#30E787' }} />
            <span className="text-sm font-bold" style={{ color: '#2d2420' }}>{exporting}</span>
            <span className="text-xs" style={{ color: '#9b8e86' }}>请勿关闭页面</span>
          </div>
        </div>
      )}

      {/* 主区域：全宽画布 + 可折叠侧边栏 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 画布区域 — 全宽 */}
        <div className="flex-1 flex flex-col min-w-0 relative" style={{ background: '#f7f3ed' }}>
          {matrix.length > 0 ? (
            <BeadGridCanvas
              matrix={matrix} width={imgW} height={imgH} colorMap={colorMap}
              showGrid={showGrid} showCodes={showCodes} highlightedCode={highlightedCode}
              beadStyle={beadStyle} gridSpacing={gridSpacing} cellSizeUnit={cellSizeUnit} zoom={zoom}
              editorTool={editorTool} selectedColor={selectedColor}
              onCellEdit={handleCellEdit} onColorPick={handleColorPick}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center m-3">
              {isProcessing ? (
                <div
                  className="text-center relative z-10 rounded-2xl p-10 border"
                  style={{ background: 'rgba(255,253,249,0.85)', backdropFilter: 'blur(16px)', borderColor: '#e5ded4', boxShadow: '0 8px 32px rgba(45,36,32,0.08)' }}
                >
                  <div className="w-10 h-10 border-[3px] rounded-full animate-spin mx-auto mb-4"
                    style={{ borderColor: '#e5ded4', borderTopColor: accentGreen }} />
                  <p className="text-sm font-bold tracking-widest uppercase" style={{ color: '#6b5e56' }}>正在生成拼豆图纸...</p>
                </div>
              ) : (
                <div
                  className="text-center cursor-pointer relative z-10 rounded-2xl p-10 border transition-all select-none"
                  style={{
                    background: 'rgba(255,253,249,0.85)',
                    backdropFilter: 'blur(16px)',
                    borderColor: '#e5ded4',
                    boxShadow: '0 4px 24px rgba(45,36,32,0.06)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 12px 40px rgba(45,36,32,0.12)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 24px rgba(45,36,32,0.06)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-sm"
                    style={{ background: 'linear-gradient(135deg, rgba(48,231,135,0.12), rgba(48,231,135,0.04))' }}>
                    <span className="text-3xl">📁</span>
                  </div>
                  <p className="text-sm font-bold mb-1" style={{ color: '#2d2420' }}>上传图片开始创作</p>
                  <p className="text-xs" style={{ color: '#9b8e86' }}>JPG / PNG / WebP · 支持裁剪 · 导出含坐标+统计</p>
                </div>
              )}
            </div>
          )}

          {/* 底部统计栏 */}
          <ColorStats stats={stats} highlightedCode={highlightedCode} onHighlight={setHighlightedCode} />
        </div>

        {/* 可折叠侧边栏 — 始终渲染 */}
        <Sidebar
          gridWidth={gridWidth} brand={brand} brandNames={brands} mardCategory={mardCategory}
          cellSizeUnit={cellSizeUnit} beadStyle={beadStyle} gridSpacing={gridSpacing}
          showStats={showStatsExport} showToolbar={showToolbar}
          hasImage={!!image} hasMatrix={matrix.length > 0}
          forceExpand={forceExpandSidebar}
          onChangeWidth={setGridWidth} onChangeBrand={setBrand}
          onChangeMardCategory={(c) => { setMardCategory(c); }}
          onChangeCellSizeUnit={setCellSizeUnit}
          onChangeBeadStyle={setBeadStyle}
          onChangeGridSpacing={setGridSpacing}
          onToggleStats={() => setShowStatsExport((v) => !v)}
          onToggleMirror={toggleMirror}
          onCleanup={() => setShowCleanupDialog(true)}
          onExport={handleExport}
          onUpload={handleFile}
          onToggleToolbar={() => setShowToolbar((v) => !v)}
          onForceExpandDone={() => setForceExpandSidebar(false)}
        />
      </div>

    </div>
    </ClickSpark>
  );
};

export default App;
