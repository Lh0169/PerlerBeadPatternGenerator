import React, { useEffect, useRef } from 'react';
import { animate, stagger } from 'animejs';
import { ColorStat } from '../types';

interface Props {
  stats: ColorStat[];
  highlightedCode: string | null;
  onHighlight: (code: string | null) => void;
}

const ColorStats: React.FC<Props> = ({ stats, highlightedCode, onHighlight }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const total = stats.reduce((sum, s) => sum + s.count, 0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || stats.length === 0) return;
    const buttons = el.querySelectorAll<HTMLElement>('button');
    if (buttons.length === 0) return;
    animate(buttons, {
      opacity: [0, 1],
      translateX: [-8, 0],
      delay: stagger(12),
      duration: 300,
      ease: 'out(3)',
    });
  }, [stats.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (stats.length === 0) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 border-t h-12"
        style={{ background: 'rgba(255,253,249,0.75)', backdropFilter: 'blur(8px)', borderColor: '#e5ded4' }}
      >
        <span className="text-xs" style={{ color: '#9b8e86' }}>生成图谱后显示颜色统计</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="border-t max-h-28 overflow-y-auto"
      style={{ background: 'rgba(255,253,249,0.75)', backdropFilter: 'blur(8px)', borderColor: '#e5ded4' }}
    >
      <div className="flex flex-wrap items-center gap-1 px-3 py-2">
        {stats.map((s) => (
          <button key={s.color.id}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs whitespace-nowrap transition-all border ${
              highlightedCode === s.color.code || highlightedCode === s.color.id
                ? 'scale-110'
                : 'hover:scale-105'
            }`}
            style={{
              background: highlightedCode === s.color.code || highlightedCode === s.color.id
                ? '#fffdf9'
                : 'transparent',
              borderColor: highlightedCode === s.color.code || highlightedCode === s.color.id
                ? '#30E787'
                : 'transparent',
              boxShadow: highlightedCode === s.color.code || highlightedCode === s.color.id
                ? '0 2px 8px rgba(48,231,135,0.2)'
                : 'none',
            }}
            onClick={() => onHighlight(highlightedCode === s.color.code || highlightedCode === s.color.id ? null : s.color.code)}
            title={`${s.color.name} (${s.color.code}): ${s.count}颗 (${s.percentage}%)`}>
            <span className="w-3 h-3 rounded-sm border flex-shrink-0" style={{ backgroundColor: s.color.hex, borderColor: '#d4cbbd' }} />
            <span style={{ color: '#2d2420' }}>{s.color.code}</span>
            <span style={{ color: '#9b8e86' }}>×{s.count}</span>
          </button>
        ))}
        <span className="text-xs ml-2 font-medium" style={{ color: '#9b8e86' }}>共 {total} 颗</span>
      </div>
    </div>
  );
};

export default ColorStats;
