import { useState, type ChangeEvent } from 'react';
import { useMenu } from '../data/MenuProvider';
import { moveItem } from '../data/restaurantEditing';
import { readRestaurantPhotos, type RestaurantPhoto } from '../data/restaurantPhotos';
import { Icon } from './Icon';
import '../restaurant-editing.css';

export function RestaurantPhotos({ images, onChange, onBusy, onPreview, cover = false }: {
  images: string[]; onChange: (images: string[]) => void; onBusy: (busy: boolean) => void; onPreview: (src: string) => void; cover?: boolean;
}) {
  const { notify } = useMenu();
  const [busy, setBusy] = useState(false);
  async function upload(event: ChangeEvent<HTMLInputElement>, replace?: number) {
    event.stopPropagation();
    const files = Array.from(event.target.files!);
    event.target.value = '';
    if (replace === undefined && images.length + files.length > 12) { notify('最多添加 12 张照片'); return; }
    setBusy(true); onBusy(true);
    try {
      const result = await readRestaurantPhotos(files, false);
      if (result.photos.length) onChange(replace === undefined ? [...images, ...result.photos.map(photo => photo.image)] : images.map((image, index) => index === replace ? result.photos[0].image : image));
      if (result.failures) notify(`${result.failures} 张照片读取失败，其他照片和原有内容已保留`);
    } finally { setBusy(false); onBusy(false); }
  }
  return <div className="restaurant-photo-manager">
    {images.map((image, index) => <div className="restaurant-photo-item" key={index}>
      <div className="restaurant-photo-thumb"><button type="button" aria-label={`预览照片 ${index + 1}`} onClick={() => onPreview(image)}><img src={image} alt={`照片 ${index + 1}`} /></button>{cover && index === 0 && <span className="restaurant-cover-badge">封面</span>}
        <label className="restaurant-photo-replace">更换<input aria-label={`更换照片 ${index + 1}`} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={event => void upload(event, index)} /></label></div>
      <div className="restaurant-photo-actions">
        {cover && <button type="button" disabled={busy || index === 0} onClick={() => onChange([image, ...images.filter((_, i) => i !== index)])}>{index === 0 ? '当前封面' : '设为封面'}</button>}
        <button type="button" aria-label={`前移照片 ${index + 1}`} disabled={busy || index === 0} onClick={() => onChange(moveItem(images, index, -1))}>前移</button>
        <button type="button" aria-label={`后移照片 ${index + 1}`} disabled={busy || index === images.length - 1} onClick={() => onChange(moveItem(images, index, 1))}>后移</button>
        <button type="button" aria-label={`删除照片 ${index + 1}`} disabled={busy} onClick={() => onChange(images.filter((_, i) => i !== index))}>删除</button>
      </div>
    </div>)}
    {images.length < 12 && <label className="restaurant-add-photo"><Icon name="image" /><span>{busy ? '读取中…' : '添加照片'}</span><input aria-label="添加照片" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy} onChange={event => void upload(event)} /></label>}
  </div>;
}

export function RestaurantPhotoBatch({ onPhotos, onBusy, disabled = false, label }: {
  onPhotos: (photos: RestaurantPhoto[]) => void; onBusy: (busy: boolean) => void; disabled?: boolean; label: string;
}) {
  const { notify } = useMenu();
  const [busy, setBusy] = useState(false);
  return <label className={`restaurant-photo-batch${busy || disabled ? ' is-disabled' : ''}`}><Icon name="image" size={20} /><span>{busy ? '正在读取照片…' : label}</span>
    <input aria-label={label} type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy || disabled} onChange={async event => {
      event.stopPropagation();
      const files = Array.from(event.target.files!); event.target.value = '';
      if (files.length > 12) { notify('每次最多选择 12 张照片'); return; }
      setBusy(true); onBusy(true);
      try {
        const result = await readRestaurantPhotos(files, true);
        if (result.photos.length) onPhotos(result.photos);
        if (result.failures) notify(`${result.failures} 张照片读取失败，其他照片和原有内容已保留`);
        else if (result.photos.some(photo => photo.metadataFailed)) notify('部分照片的拍摄时间读取失败，照片已保留，请手动选择用餐日期');
      } finally { setBusy(false); onBusy(false); }
    }} />
  </label>;
}
