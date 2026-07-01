import React, { useRef, useState, useEffect, useCallback } from 'react';
import { animate } from 'animejs';
import { BeadStyle, GridSpacing, CellSizeUnit, MardCategory } from '../types';
import Magnet from './ui/Magnet/Magnet';

interface Props {
  gridWidth: number;
  brand: string;
  brandNames: string[];
  mardCategory: MardCategory;
  cellSizeUnit: CellSizeUnit;
  beadStyle: BeadStyle;
  gridSpacing: GridSpacing;
  showStats: boolean;
  hasImage: boolean;
  hasMatrix: boolean;
  showToolbar: boolean;
  /** 上传后触发 — 自动展开设置面板 */
  forceExpand: boolean;
  onChangeWidth: (w: number) => void;
  onChangeBrand: (b: string) => void;
  onChangeMardCategory: (c: MardCategory) => void;
  onChangeCellSizeUnit: (u: CellSizeUnit) => void;
  onChangeBeadStyle: (s: BeadStyle) => void;
  onChangeGridSpacing: (s: GridSpacing) => void;
  onToggleStats: () => void;
  onToggleMirror: () => void;
  onCleanup: () => void;
  onExport: (format: string) => void;
  onUpload: (file: File) => void;
  onToggleToolbar: () => void;
  onForceExpandDone: () => void;
}

/** 分区标题 */
const SectionTitle: React.FC<{ label: string; dotColor?: string }> = ({ label, dotColor = '#30E787' }) => (
  <div className="flex items-center gap-2 mb-2">
    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9b8e86' }}>{label}</span>
  </div>
);

/** 选择按钮组 */
const ToggleGroup: React.FC<{
  options: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
  cols?: number;
}> = ({ options, value, onChange, cols = 2 }) => (
  <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
    {options.map((opt) => (
      <button key={opt.key} onClick={() => onChange(opt.key)}
        className="py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
        style={value === opt.key
          ? { background: '#2d2420', color: '#fff' }
          : { background: '#f5f0e8', color: '#9b8e86' }
        }>
        {opt.label}
      </button>
    ))}
  </div>
);

/** 图标栏按钮 */
const IconBtn: React.FC<{
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
}> = ({ icon, label, active, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="flex flex-col items-center gap-0.5 py-1.5 px-1 w-full rounded-lg transition-all disabled:opacity-30"
    style={{ color: active ? '#30E787' : '#6b5e56' }}
    title={label}
  >
    {icon}
    <span className="text-[8px] font-medium leading-none" style={{ color: active ? '#30E787' : '#9b8e86' }}>{label}</span>
  </button>
);

const Sidebar: React.FC<Props> = ({
  gridWidth, brand, brandNames, mardCategory, cellSizeUnit, beadStyle, gridSpacing,
  hasImage, hasMatrix, showStats, showToolbar, forceExpand,
  onChangeWidth, onChangeBrand, onChangeMardCategory, onChangeCellSizeUnit,
  onChangeBeadStyle, onChangeGridSpacing,
  onToggleStats, onToggleMirror, onCleanup,
  onExport, onUpload, onToggleToolbar, onForceExpandDone,
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [animating, setAnimating] = useState(false);

  const accentGreen = '#30E787';
  const accentDeep = '#25b868';

  // forceExpand → 自动展开设置面板
  useEffect(() => {
    if (forceExpand && !expanded && !animating) {
      open();
      onForceExpandDone();
    }
  }, [forceExpand]); // eslint-disable-line react-hooks/exhaustive-deps

  // 展开面板
  const open = useCallback(() => {
    setExpanded(true);
    requestAnimationFrame(() => {
      if (overlayRef.current) {
        animate(overlayRef.current, { opacity: [0, 1], duration: 250, ease: 'out(2)' });
      }
      if (panelRef.current) {
        animate(panelRef.current, {
          translateX: [320, 0],
          opacity: [0, 1],
          duration: 320,
          ease: 'out(3)',
        });
      }
      setAnimating(false);
    });
  }, []);

  // 收起面板
  const close = useCallback(() => {
    setAnimating(true);
    let done = 0;
    const check = () => { done++; if (done >= 2) { setExpanded(false); setAnimating(false); } };
    if (overlayRef.current) {
      animate(overlayRef.current, { opacity: [1, 0], duration: 200, ease: 'in(2)', onComplete: () => check() });
    } else { check(); }
    if (panelRef.current) {
      animate(panelRef.current, { translateX: [0, 320], opacity: [1, 0], duration: 250, ease: 'in(3)', onComplete: () => check() });
    } else { check(); }
  }, []);

  // 展开时禁止 body 滚动
  useEffect(() => {
    if (expanded) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [expanded]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      onUpload(f);
      e.target.value = '';
    }
  };

  // ====== 面板内容 ======
  const panelContent = (
    <aside
      ref={panelRef}
      className="w-80 flex-col shrink-0 z-40 border-l overflow-y-auto h-full"
      style={{
        background: '#fffdf9',
        borderColor: '#e5ded4',
        boxShadow: '-8px 0 30px rgba(45,36,32,0.1)',
      }}
    >
      <div className="flex flex-col p-4 space-y-4">
        {/* 标题栏 + 关闭按钮 */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#2d2420' }}>设置面板</span>
          <button
            onClick={close}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-lg leading-none transition-colors"
            style={{ color: '#9b8e86' }}
          >&times;</button>
        </div>

        {/* 图片来源 */}
        <section className="p-3 rounded-xl border" style={{ background: '#faf7f2', borderColor: '#f0ebe4' }}>
          <SectionTitle label="图片来源" dotColor="#30E787" />
          <input type="file" ref={fileRef} hidden accept="image/*" onChange={handleFileChange} />
          <button onClick={() => fileRef.current?.click()}
            className="flex items-center justify-center gap-2 w-full py-3.5 border-2 border-dashed rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
            style={{ borderColor: '#e5ded4', color: '#9b8e86', background: '#faf7f2' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#30E787';
              e.currentTarget.style.color = '#30E787';
              e.currentTarget.style.background = 'rgba(48,231,135,0.04)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5ded4';
              e.currentTarget.style.color = '#9b8e86';
              e.currentTarget.style.background = '#faf7f2';
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" />
            </svg>
            {hasImage ? '更换图片' : '上传图片'}
          </button>
        </section>

        {/* 工具 */}
        <section className="p-3 rounded-xl border" style={{ background: '#faf7f2', borderColor: '#f0ebe4' }}>
          <SectionTitle label="工具" dotColor="#c8845c" />
          <div className="grid grid-cols-2 gap-2">
            <Magnet padding={60}>
              <button onClick={onToggleMirror}
                className="flex flex-col items-center justify-center py-3 w-full rounded-xl border transition-all"
                style={{ background: '#fffdf9', borderColor: '#f0ebe4', color: '#6b5e56' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mb-1">
                  <path d="m3 7 5 5-5 5V7" /><path d="m21 7-5 5 5 5V7" /><path d="M12 20v2" /><path d="M12 14v2" /><path d="M12 8v2" /><path d="M12 2v2" />
                </svg>
                <span className="text-[7px] font-bold uppercase tracking-widest">镜像</span>
              </button>
            </Magnet>
            <Magnet padding={60}>
              <button onClick={onCleanup}
                className="flex flex-col items-center justify-center py-3 w-full rounded-xl border transition-all"
                style={{ background: '#fffdf9', borderColor: '#f0ebe4', color: '#6b5e56' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mb-1">
                  <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
                </svg>
                <span className="text-[7px] font-bold uppercase tracking-widest">去除杂色</span>
              </button>
            </Magnet>
          </div>
        </section>

        {/* 设置 */}
        <section className="p-3 rounded-xl border space-y-3" style={{ background: '#faf7f2', borderColor: '#f0ebe4' }}>
          <SectionTitle label="设置" dotColor="#c8845c" />

          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-bold uppercase" style={{ color: '#9b8e86' }}>
              <span>宽度</span><span style={{ color: '#2d2420' }}>{gridWidth} 颗</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => onChangeWidth(Math.max(10, gridWidth - 5))}
                className="w-6 h-6 flex items-center justify-center rounded-md font-bold text-xs transition-colors"
                style={{ background: '#f5f0e8', color: '#6b5e56' }}>−</button>
              <input type="range" min={10} max={200} value={gridWidth}
                onChange={(e) => onChangeWidth(parseInt(e.target.value))} className="flex-1" />
              <button onClick={() => onChangeWidth(Math.min(200, gridWidth + 5))}
                className="w-6 h-6 flex items-center justify-center rounded-md font-bold text-xs transition-colors"
                style={{ background: '#f5f0e8', color: '#6b5e56' }}>+</button>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase" style={{ color: '#9b8e86' }}>网格大小</span>
            <ToggleGroup options={[{ key: '5mm', label: '5mm' }, { key: '2.6mm', label: '2.6mm' }]}
              value={cellSizeUnit} onChange={(k) => onChangeCellSizeUnit(k as CellSizeUnit)} />
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase" style={{ color: '#9b8e86' }}>拼豆品牌</span>
            <select value={brand} onChange={(e) => onChangeBrand(e.target.value)}
              className="w-full p-2.5 border rounded-lg text-xs font-bold cursor-pointer transition-colors"
              style={{ background: '#faf7f2', borderColor: '#e5ded4', color: '#2d2420' }}>
              {brandNames.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          {brand === 'MARD' && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase" style={{ color: '#9b8e86' }}>MARD 分类</span>
              <select value={mardCategory} onChange={(e) => onChangeMardCategory(e.target.value as MardCategory)}
                className="w-full p-2.5 border rounded-lg text-xs font-bold cursor-pointer transition-colors"
                style={{ background: '#faf7f2', borderColor: '#e5ded4', color: '#2d2420' }}>
                <option value="72">72 色号</option>
                <option value="96">96 色号</option>
                <option value="120">120 色号</option>
                <option value="144">144 色号</option>
                <option value="168">168 色号</option>
                <option value="all">所有 MARD 颜色 (291)</option>
              </select>
            </div>
          )}
        </section>

        {/* 导出设置 */}
        <section className="p-3 rounded-xl border space-y-3" style={{ background: '#faf7f2', borderColor: '#f0ebe4' }}>
          <SectionTitle label="导出设置" dotColor="#30E787" />
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={showStats} onChange={onToggleStats} className="w-3.5 h-3.5 rounded" />
            <span className="text-[10px] font-bold uppercase" style={{ color: '#6b5e56' }}>显示统计数据</span>
          </label>
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase" style={{ color: '#9b8e86' }}>拼豆样式</span>
            <ToggleGroup
              options={[{ key: 'square', label: '方珠' }, { key: 'round', label: '圆珠' }, { key: 'hollow', label: '中空' }]}
              value={beadStyle} onChange={(k) => onChangeBeadStyle(k as BeadStyle)} cols={3} />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase" style={{ color: '#9b8e86' }}>网格间距</span>
            <ToggleGroup
              options={[{ key: 'none', label: '无' }, { key: 'small', label: '小' }, { key: 'large', label: '大' }]}
              value={gridSpacing} onChange={(k) => onChangeGridSpacing(k as GridSpacing)} cols={3} />
          </div>
        </section>

        {/* 图纸导出 */}
        <section className="p-3 rounded-xl border space-y-2" style={{ background: '#faf7f2', borderColor: '#f0ebe4' }}>
          <SectionTitle label="图纸导出" dotColor="#30E787" />
          <div className="grid grid-cols-2 gap-2">
            <Magnet padding={40}>
              <button onClick={() => onExport('png')} disabled={!hasMatrix}
                className="flex items-center justify-center gap-1.5 py-3 w-full text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97] text-white shadow-md"
                style={{ background: `linear-gradient(135deg, ${accentGreen}, ${accentDeep})` }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                PNG 图纸
              </button>
            </Magnet>
            <Magnet padding={40}>
              <button onClick={() => onExport('pdf')} disabled={!hasMatrix}
                className="flex items-center justify-center gap-1.5 py-3 w-full text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97] border shadow-sm"
                style={{ background: '#fffdf9', borderColor: '#e5ded4', color: '#6b5e56' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                PDF 文档
              </button>
            </Magnet>
          </div>
        </section>

        {/* 数据导出 */}
        <section className="p-3 rounded-xl border space-y-2" style={{ background: '#faf7f2', borderColor: '#f0ebe4' }}>
          <SectionTitle label="数据导出" dotColor="#9b8e86" />
          <div className="grid grid-cols-3 gap-2">
            {[{ fmt: 'svg', label: 'SVG' }, { fmt: 'csv', label: 'CSV' }, { fmt: 'json', label: 'JSON' }].map(({ fmt, label }) => (
              <button key={fmt} onClick={() => onExport(fmt)} disabled={!hasMatrix}
                className="flex items-center justify-center gap-1 py-2.5 w-full text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97] border"
                style={{ background: '#fffdf9', borderColor: '#f0ebe4', color: '#9b8e86' }}>
                {label}
              </button>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );

  return (
    <>
      {/* 遮罩层 */}
      {(expanded || animating) && (
        <div ref={overlayRef} className="fixed inset-0 z-30" style={{ background: 'rgba(0,0,0,0.2)' }}
          onClick={close} />
      )}

      {/* 展开面板 — fixed 定位在右侧 */}
      {(expanded || animating) && (
        <div className="fixed top-0 right-0 z-40 h-full">
          {panelContent}
        </div>
      )}

      {/* 折叠态图标栏 */}
      {!expanded && !animating && (
        <div
          className="flex flex-col items-center gap-1 py-2 border-l shrink-0 z-20"
          style={{
            width: '48px',
            background: 'rgba(255,253,249,0.88)',
            backdropFilter: 'blur(12px)',
            borderColor: '#e5ded4',
          }}
        >
          <IconBtn
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2"/><path d="M12 21v2"/><path d="M4.22 4.22l1.42 1.42"/><path d="M18.36 18.36l1.42 1.42"/><path d="M1 12h2"/><path d="M21 12h2"/><path d="M4.22 19.78l1.42-1.42"/><path d="M18.36 5.64l1.42-1.42"/></svg>}
            label="工具"
            active={showToolbar}
            disabled={!hasImage}
            onClick={onToggleToolbar}
          />

          <IconBtn
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>}
            label="设置"
            disabled={!hasImage}
            onClick={open}
          />

          <IconBtn
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>}
            label="导出"
            disabled={!hasMatrix}
            onClick={() => { if (hasMatrix) onExport('png'); }}
          />
        </div>
      )}
    </>
  );
};

export default Sidebar;
