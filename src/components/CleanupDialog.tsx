import React, { useRef } from 'react';
import { ColorStat } from '../types';
import { useDialogAnimation } from '../hooks/useDialogAnimation';

interface Props {
  stats: ColorStat[];
  onCleanup: (colorIds: string[]) => void;
  onClose: () => void;
}

const CleanupDialog: React.FC<Props> = ({ stats, onCleanup, onClose }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const { exit } = useDialogAnimation(panelRef, backdropRef);

  const handleCleanup = (colorIds: string[]) => exit(() => onCleanup(colorIds));

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={() => exit(onClose)}
    >
      <div
        ref={panelRef}
        className="rounded-2xl shadow-2xl max-w-md w-full p-6 border"
        style={{ background: '#fffdf9', borderColor: '#e5ded4' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-bold uppercase tracking-wider mb-1" style={{ color: '#2d2420' }}>去除杂色</h3>
        <p className="text-xs mb-4" style={{ color: '#9b8e86' }}>点击颜色删除该颜色所有珠子</p>
        <div className="grid grid-cols-6 gap-2 mb-4 max-h-40 overflow-y-auto">
          {stats.map((s) => (
            <div key={s.color.id}
              className="flex flex-col items-center gap-1 cursor-pointer transition-all hover:scale-105"
              onClick={() => handleCleanup([s.color.id])}
              title={`${s.color.code} - ${s.color.name}: ${s.count}颗`}>
              <div className="w-8 h-8 rounded-lg shadow-sm border" style={{ background: s.color.hex, borderColor: '#d4cbbd' }} />
              <span className="text-[8px] font-bold" style={{ color: '#2d2420' }}>{s.color.code}</span>
              <span className="text-[8px]" style={{ color: '#9b8e86' }}>×{s.count}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <button
            onClick={() => exit(onClose)}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all"
            style={{ color: '#6b5e56' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#f5f0e8'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >取消</button>
        </div>
      </div>
    </div>
  );
};

export default CleanupDialog;
