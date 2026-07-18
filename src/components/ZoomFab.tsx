// src/components/ZoomFab.tsx
// 悬浮缩放控件 — 可拖拽、支持长按连续缩放、适配 APK/EXE
import React, { useRef, useCallback, useState } from 'react';
import { usePlatform } from '../hooks/usePlatform';

interface Props {
  zoom: number;
  visible: boolean;
  onZoomChange: (zoom: number | ((prev: number) => number)) => void;
}

const ZoomFab: React.FC<Props> = ({ zoom, visible, onZoomChange }) => {
  const fabRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const dragging = useRef(false);
  const dragStart = useRef<{ x: number; y: number; left: number; top: number }>({ x: 0, y: 0, left: 0, top: 0 });
  const zoomTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const zoomDelay = useRef<ReturnType<typeof setTimeout> | null>(null);

  const platformInfo = usePlatform();
  const isMobile = platformInfo.isMobile;

  const clamp = useCallback((v: number) => Math.max(0.5, Math.min(3, v)), []);

  // 按住连续缩放
  const startZoom = useCallback((dir: number) => {
    onZoomChange(clamp(zoom * (dir > 0 ? 1.25 : 0.8)));
    zoomDelay.current = setTimeout(() => {
      zoomTimer.current = setInterval(() => {
        onZoomChange((prev: number) => clamp(prev * Math.pow(dir > 0 ? 1.25 : 0.8, 0.6)));
      }, 60);
    }, 350);
  }, [zoom, clamp, onZoomChange]);

  const stopZoom = useCallback(() => {
    if (zoomDelay.current) clearTimeout(zoomDelay.current);
    if (zoomTimer.current) clearInterval(zoomTimer.current);
    zoomDelay.current = null;
    zoomTimer.current = null;
  }, []);

  // 拖拽 — 只在百分比按钮区域和非按钮区域触发
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    // 点击 − 或 + 缩放按钮不拖拽，百分比标签和空白区域可拖拽
    if (target.tagName === 'BUTTON' && target.title && target.title !== '点击复位 100%') return;
    e.preventDefault();
    const el = fabRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    dragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, left: r.left, top: r.top };
    try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return; // 消抖
    setPos({
      left: Math.max(4, Math.min(window.innerWidth - 120, dragStart.current.left + dx)),
      top: Math.max(4, Math.min(window.innerHeight - 50, dragStart.current.top + dy)),
    });
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  if (!visible) return null;

  const btnSize = isMobile ? 42 : 34;
  const fontSize = isMobile ? 20 : 17;
  // 避开右侧图标栏(48px)和底部统计栏(~36px)
  const rightOffset = 64; // 48px 图标栏 + 16px 间距
  const bottomOffset = isMobile ? 68 : 56;

  const style: React.CSSProperties = {
    position: 'fixed',
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    background: 'rgba(30,30,35,0.92)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 999,
    padding: 4,
    boxShadow: '0 6px 20px rgba(0,0,0,0.45)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    touchAction: 'none',
    userSelect: 'none',
    cursor: dragging.current ? 'grabbing' : 'grab',
  };

  if (pos) {
    style.left = pos.left;
    style.top = pos.top;
    style.right = 'auto';
    style.bottom = 'auto';
  } else {
    style.right = rightOffset;
    style.bottom = `calc(${bottomOffset}px + env(safe-area-inset-bottom, 0px))`;
  }

  const btnStyle: React.CSSProperties = {
    width: btnSize,
    height: btnSize,
    borderRadius: 999,
    border: 'none',
    background: 'transparent',
    color: '#e9ecf1',
    fontSize,
    fontWeight: 700,
    padding: 0,
    lineHeight: 1,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    touchAction: 'none',
  };

  return (
    <div
      ref={fabRef}
      style={style}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <button
        style={btnStyle}
        onPointerDown={(e) => { e.stopPropagation(); startZoom(-1); }}
        onPointerUp={(e) => { e.stopPropagation(); stopZoom(); }}
        onPointerLeave={(e) => { e.stopPropagation(); stopZoom(); }}
        onPointerCancel={(e) => { e.stopPropagation(); stopZoom(); }}
        title="缩小"
      >−</button>
      <button
        style={{ ...btnStyle, width: 'auto', minWidth: btnSize + 10, fontSize: isMobile ? 13 : 12, fontWeight: 600, color: '#9aa2b1' }}
        onClick={() => onZoomChange(1)}
        title="点击复位 100%"
      >{Math.round(zoom * 100)}%</button>
      <button
        style={btnStyle}
        onPointerDown={(e) => { e.stopPropagation(); startZoom(1); }}
        onPointerUp={(e) => { e.stopPropagation(); stopZoom(); }}
        onPointerLeave={(e) => { e.stopPropagation(); stopZoom(); }}
        onPointerCancel={(e) => { e.stopPropagation(); stopZoom(); }}
        title="放大"
      >+</button>
    </div>
  );
};

export default ZoomFab;
