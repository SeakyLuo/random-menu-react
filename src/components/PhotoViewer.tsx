import { Sheet } from './Sheet';

export function PhotoViewer({ src, onClose }: { src: string; onClose: () => void }) {
  return <Sheet title="查看照片" view="photo" onClose={onClose}>
    <img className="photo-viewer-image" src={src} alt="原图" decoding="async" />
  </Sheet>;
}
