import { useEffect, useCallback } from 'react';
import { createTimeline } from 'animejs';

/**
 * 弹窗动画 Hook — 统一管理入场/出场动画
 *
 * 入场: scale 0.92→1 + opacity 0→1 + 遮罩淡入，400ms out(4)
 * 出场: scale 1→0.95 + opacity 1→0 + 遮罩淡出，200ms inExpo
 */
export function useDialogAnimation(
  panelRef: React.RefObject<HTMLElement | null>,
  backdropRef?: React.RefObject<HTMLElement | null>,
) {
  // 入场动画
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const tl = createTimeline();
    if (backdropRef?.current) {
      tl.add(backdropRef.current, { opacity: [0, 1], duration: 250, ease: 'outExpo' }, 0);
    }
    tl.add(panel, {
      scale: [0.92, 1],
      opacity: [0, 1],
      duration: 400,
      ease: 'out(4)',
    }, backdropRef ? '-=180' : 0);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 出场回调
  const exit = useCallback((onComplete?: () => void) => {
    const panel = panelRef.current;
    if (!panel) { onComplete?.(); return; }

    const tl = createTimeline();
    tl.add(panel, {
      scale: [1, 0.95],
      opacity: [1, 0],
      duration: 200,
      ease: 'inExpo',
    }, 0);
    if (backdropRef?.current) {
      tl.add(backdropRef.current, {
        opacity: [1, 0],
        duration: 200,
        ease: 'inExpo',
      }, '-=160');
    }

    setTimeout(() => onComplete?.(), 220);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { exit };
}
