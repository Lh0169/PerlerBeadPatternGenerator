import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useDialogAnimation } from '../hooks/useDialogAnimation';

interface Props {
  src: string;
  onCropComplete: (croppedUrl: string) => void;
  onSkipCrop: () => void;
  onCancelUpload: () => void;
}

const ImageCropper: React.FC<Props> = ({ src, onCropComplete, onSkipCrop, onCancelUpload }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const { exit } = useDialogAnimation(panelRef, backdropRef);

  const [imgLoaded, setImgLoaded] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [rect, setRect] = useState({ x: 50, y: 50, w: 200, h: 200 });
  const [dragCorner, setDragCorner] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImgLoaded(true);
      const s = Math.min(img.naturalWidth, img.naturalHeight) * 0.6;
      setRect({
        x: (img.naturalWidth - s) / 2,
        y: (img.naturalHeight - s) / 2,
        w: s,
        h: s,
      });
    };
    img.src = src;
  }, [src]);

  useEffect(() => {
    if (!imgLoaded || !canvasRef.current || !imgRef.current) return;
    const canvas = canvasRef.current;
    const img = imgRef.current;
    const maxW = Math.min(window.innerWidth * 0.8, img.naturalWidth);
    const scale = maxW / img.naturalWidth;
    canvas.width = maxW;
    canvas.height = img.naturalHeight * scale;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#30E787';
    ctx.lineWidth = 2;
    ctx.strokeRect(rect.x * scale, rect.y * scale, rect.w * scale, rect.h * scale);
    // 半透明遮罩
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, canvas.width, rect.y * scale);
    ctx.fillRect(0, (rect.y + rect.h) * scale, canvas.width, canvas.height - (rect.y + rect.h) * scale);
    ctx.fillRect(0, rect.y * scale, rect.x * scale, rect.h * scale);
    ctx.fillRect((rect.x + rect.w) * scale, rect.y * scale, canvas.width - (rect.x + rect.w) * scale, rect.h * scale);
  }, [imgLoaded, rect]);

  const getPos = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getPos(e);
    const scale = canvasRef.current!.width / imgRef.current!.naturalWidth;
    const rx = rect.x * scale, ry = rect.y * scale, rw = rect.w * scale, rh = rect.h * scale;
    const margin = 10;
    const corner =
      pos.x < rx + margin && pos.y < ry + margin ? 'nw' :
      pos.x > rx + rw - margin && pos.y < ry + margin ? 'ne' :
      pos.x < rx + margin && pos.y > ry + rh - margin ? 'sw' :
      pos.x > rx + rw - margin && pos.y > ry + rh - margin ? 'se' :
      pos.x > rx && pos.x < rx + rw && pos.y > ry && pos.y < ry + rh ? 'move' : null;
    setDragCorner(corner);
    setDragStart(pos);
    setDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !dragCorner) return;
    const pos = getPos(e);
    const scale = canvasRef.current!.width / imgRef.current!.naturalWidth;
    const dx = (pos.x - dragStart.x) / scale;
    const dy = (pos.y - dragStart.y) / scale;
    setDragStart(pos);
    const img = imgRef.current!;
    setRect(prev => {
      let { x, y, w, h } = prev;
      if (dragCorner === 'move') { x += dx; y += dy; }
      else if (dragCorner === 'se') { w += dx; h += dy; }
      else if (dragCorner === 'nw') { x += dx; y += dy; w -= dx; h -= dy; }
      else if (dragCorner === 'ne') { y += dy; w += dx; h -= dy; }
      else if (dragCorner === 'sw') { x += dx; w -= dx; h += dy; }
      w = Math.max(20, Math.min(w, img.naturalWidth - x));
      h = Math.max(20, Math.min(h, img.naturalHeight - y));
      x = Math.max(0, Math.min(x, img.naturalWidth - w));
      y = Math.max(0, Math.min(y, img.naturalHeight - h));
      return { x, y, w, h };
    });
  };

  const handleMouseUp = () => { setDragging(false); setDragCorner(null); };

  const handleConfirm = () => {
    if (!imgRef.current) return;
    const img = imgRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = rect.w;
    canvas.height = rect.h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
    exit(() => onCropComplete(canvas.toDataURL('image/png')));
  };

  const handleExpandToFull = () => {
    if (!imgRef.current) return;
    const img = imgRef.current;
    setRect({ x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight });
  };

  if (!src) return null;

  return (
    <div ref={backdropRef} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div ref={panelRef} className="max-w-[90vw] max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border" style={{ background: '#fffdf9', borderColor: '#e5ded4' }}>
        <h3 className="text-sm font-bold px-4 pt-4 pb-2" style={{ color: '#2d2420' }}>裁剪图片 — 拖动选框调整区域</h3>
        <div className="flex-1 overflow-auto relative mx-4">
          <canvas ref={canvasRef}
            className="cursor-crosshair max-w-full rounded-lg"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>
        <div className="flex items-center gap-2 px-4 py-3">
          <button onClick={handleExpandToFull}
            className="px-3 py-1.5 text-xs border rounded-lg transition-colors"
            style={{ borderColor: '#e5ded4', color: '#6b5e56' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#f5f0e8'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >⛶ 全图</button>
          <button onClick={() => exit(onSkipCrop)}
            className="px-3 py-1.5 text-xs border rounded-lg transition-colors"
            style={{ borderColor: '#e5ded4', color: '#6b5e56' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#f5f0e8'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >使用原图</button>
          <div className="flex-1" />
          <button onClick={() => exit(onCancelUpload)}
            className="px-4 py-1.5 text-xs border rounded-lg font-medium transition-colors"
            style={{ borderColor: '#e5ded4', color: '#6b5e56' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#f5f0e8'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >取消上传</button>
          <button onClick={handleConfirm}
            className="px-6 py-1.5 text-xs text-white rounded-lg font-bold transition-all shadow-md hover:shadow-lg active:scale-[0.97]"
            style={{ background: 'linear-gradient(135deg, #30E787, #25b868)' }}
          >
            确认裁剪 ({Math.round(rect.w)}×{Math.round(rect.h)})
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropper;
