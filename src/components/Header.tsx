import React, { useRef, useEffect } from 'react';
import { animate } from 'animejs';
import { Palette } from 'lucide-react';

const Header: React.FC = () => {
  const headerRef = useRef<HTMLElement>(null);
  const iconRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (headerRef.current) {
      animate(headerRef.current, {
        opacity: [0, 1],
        translateY: [-16, 0],
        duration: 700,
        ease: 'out(4)',
      });
    }
    if (iconRef.current) {
      animate(iconRef.current, {
        rotate: [-90, 0],
        scale: [0, 1],
        duration: 600,
        ease: 'out(4)',
      });
    }
  }, []);

  return (
    <header
      ref={headerRef}
      className="flex items-center justify-between px-5 py-2 bg-white/70 backdrop-blur-md border-b shadow-sm shrink-0"
      style={{ borderColor: '#e5ded4' }}
    >
      {/* 左侧占位 — 与右侧版本标签对称 */}
      <div className="w-12" />
      {/* 标题居中 */}
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shadow-sm"
            style={{
              background: 'linear-gradient(135deg, rgba(48,231,135,0.18), rgba(48,231,135,0.06))',
            }}
          >
            <Palette ref={iconRef} className="w-5 h-5" style={{ color: '#30E787' }} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm font-bold tracking-tight text-center" style={{ color: '#2d2420' }}>
              拼豆图谱生成器
            </h1>
            <span className="text-[9px] font-medium tracking-wide text-center" style={{ color: '#9b8e86' }}>
              Perler Bead Pattern Studio
            </span>
          </div>
        </div>
      </div>
      {/* 版本标签 */}
      <span
        className="text-[10px] font-semibold px-2.5 py-1 rounded-full tracking-wide"
        style={{ background: '#f5f0e8', color: '#9b8e86' }}
      >
        v1.0
      </span>
    </header>
  );
};

export default Header;
