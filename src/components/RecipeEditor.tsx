import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useMenu } from '../data/MenuProvider';
import { eligible, RecipeChangedError, type Recipe } from '../data/menu';
import { Icon } from './Icon';
async function readPhoto(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.82);
}
export function RecipeEditor({ recipe, onSaved }: { recipe?: Recipe; onSaved: (id: string) => void }) {
  const { data, commit, saving, notify, setPanel } = useMenu();
  const [baseline] = useState(() => JSON.stringify(recipe));
  const [name, setName] = useState(recipe?.name ?? '');
  const [note, setNote] = useState(recipe?.note ?? '');
  const [tags, setTags] = useState<string[]>(recipe?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [images, setImages] = useState<string[]>(recipe?.images ?? []);
  const [readingPhoto, setReadingPhoto] = useState(false);
  const [favorite, setFavorite] = useState(recipe?.favorite ?? false);
  const [choosingTags, setChoosingTags] = useState(false);
  const dirty = tagInput.trim().length > 0 || readingPhoto || JSON.stringify({ name, note, tags, images, favorite }) !== JSON.stringify({ name: recipe?.name ?? '', note: recipe?.note ?? '', tags: recipe?.tags ?? [], images: recipe?.images ?? [], favorite: recipe?.favorite ?? false });
  useEffect(() => {
    const originalHash = window.location.hash;
    const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    const onNavigate = () => {
      if (window.location.hash === originalHash) return;
      if (dirty && !window.confirm('修改尚未保存，确定放弃修改？')) window.location.hash = originalHash;
      else setPanel(null);
    };
    window.addEventListener('beforeunload', beforeUnload);
    window.addEventListener('hashchange', onNavigate);
    return () => { window.removeEventListener('beforeunload', beforeUnload); window.removeEventListener('hashchange', onNavigate); };
  }, [dirty, setPanel]);
  const allTags = [...new Set(data.recipes.flatMap(item => item.tags))];
  function addTag() {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) setTags([...tags, tag]);
    setTagInput('');
  }
  async function upload(event: ChangeEvent<HTMLInputElement>, replace = false) {
    const files = Array.from(event.target.files!);
    event.target.value = '';
    if (!files.length) return;
    if (!replace && files.length + images.length > 4) { notify('每道菜最多添加 4 张照片'); return; }
    setReadingPhoto(true);
    try { const photos = await Promise.all(files.map(readPhoto)); setImages(replace ? [photos[0], ...images.slice(1)] : [...images, ...photos]); }
    catch { notify('照片读取失败，请选择其他照片'); }
    finally { setReadingPhoto(false); }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) { notify('请填写菜名'); return; }
    const pendingTag = tagInput.trim();
    const item: Recipe = {
      id: recipe?.id ?? crypto.randomUUID(), name: name.trim(), note: note.trim(),
      tags: pendingTag && !tags.includes(pendingTag) ? [...tags, pendingTag] : tags,
      images, favorite, createdAt: recipe?.createdAt ?? Date.now(), hiddenRounds: recipe?.hiddenRounds ?? 0,
    };
    const ok = await commit(current => {
      if (recipe && JSON.stringify(current.recipes.find(old => old.id === recipe.id)) !== baseline) throw new RecipeChangedError();
      const next = { ...current, recipes: recipe ? current.recipes.map(old => old.id === item.id ? item : old) : [...current.recipes, item] };
      return { ...next, queue: eligible(item, next) && !next.queue.includes(item.id) ? [...next.queue, item.id] : next.queue };
    }, recipe ? '菜谱已保存' : '已添加菜谱');
    if (ok) onSaved(item.id);
  }
  return <form className="recipe-form recipe-editor" onSubmit={submit} noValidate data-dirty={dirty}>
    <div className="recipe-editor-scroll">
      <fieldset className="editor-fields" disabled={saving || readingPhoto}>
        <label className="form-label">菜名 <span>必填</span><input autoComplete="off" aria-label="菜名" maxLength={60} placeholder="例如：番茄炒蛋" value={name} onChange={event => setName(event.target.value)} /></label>
        <section className="editor-photo-section" aria-label="菜品照片">
          <div className="form-label">照片 <span>可选</span></div>
          {images.length ? <>
            <div className="editor-cover">
              <img src={images[0]} alt="菜谱封面" />
              <span className="cover-badge">封面</span>
              <label className="cover-upload"><Icon name="image" size={17} />更换<input type="file" accept="image/jpeg,image/png,image/webp" aria-label="更换封面" disabled={readingPhoto || saving} onChange={event => void upload(event, true)} /></label>
            </div>
            <div className="photo-editor">{images.map((src, index) => <div className="photo-item" key={src + index}>
              <img src={src} alt={`菜品照片 ${index + 1}`} />
              <button type="button" className="icon-button" disabled={readingPhoto || saving} aria-label={`移除照片 ${index + 1}`} onClick={() => setImages(images.filter((_, i) => i !== index))}><Icon name="close" size={15} /></button>
            </div>)}
              {images.length < 4 && <label className="photo-upload"><Icon name="plus" /><span className="sr-only">添加照片</span><input type="file" accept="image/jpeg,image/png,image/webp" aria-label="添加更多照片" multiple disabled={readingPhoto || saving} onChange={event => void upload(event)} /></label>}
            </div>
          </> : <label className="editor-photo-empty"><Icon name="image" size={29} /><span>{readingPhoto ? '正在读取…' : '添加菜品照片'}</span><input type="file" accept="image/jpeg,image/png,image/webp" aria-label="添加菜品照片" multiple disabled={readingPhoto || saving} onChange={event => void upload(event)} /></label>}
        </section>
        <section className="editor-tags-section" aria-label="菜谱标签">
          <div className="editor-label-row"><span className="form-label">标签</span>
            {(tags.length > 0 || choosingTags) && <button type="button" className="text-button" aria-expanded={choosingTags} onClick={() => setChoosingTags(!choosingTags)}><Icon name={choosingTags ? 'close' : 'plus'} size={18} />{choosingTags ? '收起' : '添加'}</button>}
          </div>
          <div className="editor-selected-tags">{tags.map(tag => <button type="button" className="tag-chip active" key={tag} aria-label={`移除标签${tag}`} onClick={() => setTags(tags.filter(item => item !== tag))}>{tag}<Icon name="close" size={15} /></button>)}
            {tags.length === 0 && !choosingTags && <button type="button" className="editor-add-tag" aria-expanded="false" onClick={() => setChoosingTags(true)}><Icon name="plus" size={18} />添加标签</button>}
          </div>
          {choosingTags && <div className="editor-tag-picker">
            <div className="tag-options">{allTags.filter(tag => !tags.includes(tag)).map(tag => <button type="button" className="tag-chip" key={tag} onClick={() => setTags([...tags, tag])}>{tag}<Icon name="plus" size={14} /></button>)}</div>
            <div className="tag-input"><input aria-label="新标签" placeholder="输入新标签" maxLength={20} value={tagInput} onChange={event => setTagInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addTag(); } }} /><button type="button" className="button secondary" onClick={addTag} disabled={!tagInput.trim()}>添加</button></div>
          </div>}
        </section>
        <label className="form-label">备注 <span>可选</span><textarea aria-label="备注与做法" rows={3} placeholder="记下用料、做法或小贴士…" maxLength={10000} value={note} onChange={event => setNote(event.target.value)} /></label>
        <label className="editor-favorite"><Icon name="heart" size={22} /><span>收藏这道菜</span><input type="checkbox" role="switch" checked={favorite} onChange={event => setFavorite(event.target.checked)} /><span className="favorite-switch" aria-hidden="true" /></label>
      </fieldset>
    </div>
    <div className="sheet-actions"><button className="button primary" disabled={saving || readingPhoto} type="submit">{saving ? '正在保存…' : '保存菜谱'}</button></div>
  </form>;
}
