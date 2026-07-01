import React, { useRef } from 'react';
import { BeadColor } from '../types';
import { useDialogAnimation } from '../hooks/useDialogAnimation';

interface Props {
  palette: BeadColor[];
  selectedColor: string | null;
  onSelect: (colorId: string) => void;
  onClose: () => void;
}

const ColorPicker: React.FC<Props> = ({ palette, selectedColor, onSelect, onClose }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const { exit } = useDialogAnimation(panelRef, backdropRef);

  const handleSelect = (id: string) => exit(() => onSelect(id));

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={() => exit(onClose)}
    >
      <div
        ref={panelRef}
        className="rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col border"
        style={{ background: '#fffdf9', borderColor: '#e5ded4' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: '#f0ebe4' }}>
          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: '#2d2420' }}>选择颜色</h3>
          <button
            onClick={() => exit(onClose)}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all text-lg leading-none"
            style={{ color: '#9b8e86' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#f5f0e8'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >&times;</button>
        </div>
        {/* 色块网格 */}
        <div className="p-4 overflow-y-auto">
          <div className="grid grid-cols-8 gap-2">
            {palette.map((color) => (
              <div key={color.id}
                className={`w-full aspect-square rounded-lg shadow-sm cursor-pointer transition-all hover:scale-110 border-2 ${
                  selectedColor === color.id ? 'scale-110' : 'border-transparent'
                }`}
                style={{
                  background: color.hex,
                  borderColor: selectedColor === color.id ? '#30E787' : 'transparent',
                  boxShadow: selectedColor === color.id ? '0 0 0 2px rgba(48,231,135,0.35)' : undefined,
                }}
                title={`${color.code} - ${color.name}`}
                onClick={() => handleSelect(color.id)}
              />
            ))}
          </div>
        </div>
        {/* 底部 */}
        <div className="p-4 border-t flex justify-end" style={{ borderColor: '#f0ebe4' }}>
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

export default ColorPicker;
