import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';
export function Sheet({ title, onClose, onBack, view, children, fullscreen = false, action, closeDisabled = false }: {
  title: ReactNode; onClose: () => void; onBack?: () => void; view: string; children: ReactNode;
  fullscreen?: boolean; action?: ReactNode; closeDisabled?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const [dismissing, setDismissing] = useState(false);
  const closing = useRef(false);
  function dismiss() {
    if (closeDisabled || closing.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { onClose(); return; }
    closing.current = true;
    setDismissing(true);
  }
  useEffect(() => {
    const element = dialog.current!;
    const focus = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      if (focus.isConnected) focus.focus();
    };
  }, []);
  useEffect(() => { heading.current!.focus(); dialog.current!.scrollTop = 0; }, [view]);
  return <dialog ref={dialog} className={`sheet${fullscreen ? ' sheet-fullscreen' : ''}`} data-view={view} data-dismissing={dismissing} inert={dismissing} aria-labelledby={titleId}
    onAnimationEnd={event => {
      if (event.target !== event.currentTarget || event.animationName !== 'sheet-slide-down') return;
      closing.current = false;
      setDismissing(false);
      onClose();
    }}
    onCancel={event => { event.preventDefault(); dismiss(); }}
    onClick={event => { if (event.target === event.currentTarget) {
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dismiss();
    } }}>
    <div className="sheet-handle" />
    <header className="sheet-header">
      {onBack && <button className="icon-button" aria-label="返回" disabled={closeDisabled} onClick={onBack}><Icon name="back" /></button>}
      {fullscreen && !onBack && <button className="icon-button" aria-label="关闭" disabled={closeDisabled} onClick={dismiss}><Icon name="close" /></button>}
      <h2 id={titleId} tabIndex={-1} ref={heading}>{title}</h2>
      {action}
      {!fullscreen && <button className="icon-button" aria-label="关闭" disabled={closeDisabled} onClick={dismiss}><Icon name="close" /></button>}
    </header>
    {children}
  </dialog>;
}
