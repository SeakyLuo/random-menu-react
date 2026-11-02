import { useState } from 'react';
import { PhotoViewer } from './PhotoViewer';
import { useMenu } from '../data/MenuProvider';
import { eligible, type Recipe } from '../data/menu';
import { Icon } from './Icon';
export function RecipeImage({ recipe, large = false }: { recipe: Recipe; large?: boolean }) {
  return recipe.images.length ? <img className={large ? 'recipe-cover' : 'recipe-thumb'} src={recipe.images[0]} alt={recipe.name} loading="lazy" decoding="async" />
    : <span className={large ? 'recipe-cover image-placeholder' : 'recipe-thumb image-placeholder'}><Icon name="dishes" size={large ? 64 : 28} /></span>;
}
export function Tags({ tags }: { tags: string[] }) {
  return <div className="recipe-tags">{tags.map(tag => <span key={tag}>{tag}</span>)}</div>;
}
export function RecipeRow({ recipe, onOpen, action }: { recipe: Recipe; onOpen: () => void; action?: React.ReactNode }) {
  return <div className="recipe-row">
    <button className="recipe-row-open" onClick={onOpen}>
      <RecipeImage recipe={recipe} />
      <span className="recipe-row-text"><strong>{recipe.name}</strong><Tags tags={recipe.tags} />
        {recipe.hiddenRounds > 0 && <small>暂时不参与抽取 · 剩余 {recipe.hiddenRounds} 轮</small>}
      </span>
    </button>
    {action}
    <button className="icon-button" aria-label={`查看${recipe.name}详情`} onClick={onOpen}><Icon name="chevron" size={19} /></button>
  </div>;
}
export function RecipeDetail({ recipe, onEdit }: { recipe: Recipe; onEdit: () => void }) {
  const { data, commit, saving } = useMenu();
  const [photo, setPhoto] = useState<string | null>(null);
  return <div className="recipe-detail">{photo && <PhotoViewer src={photo} onClose={() => setPhoto(null)} />}
    {recipe.images.length ? <div className="photo-gallery">{recipe.images.map((image, i) => <button className="library-photo-open" key={image + i} onClick={() => setPhoto(image)} aria-label={`查看${recipe.name}照片 ${i + 1}`}><img src={image} alt={`${recipe.name}照片 ${i + 1}`} loading="lazy" decoding="async" /></button>)}</div> : <RecipeImage recipe={recipe} large />}
    <Tags tags={recipe.tags} />
    <p className="detail-note">{recipe.note || '还没有记录做法，可以编辑补充。'}</p>
    <p className="recipe-date">添加于 {new Date(recipe.createdAt).toLocaleDateString('zh-CN')}</p>
    {recipe.hiddenRounds > 0 && <div className="hidden-info"><p>暂时不参与抽取 · 剩余 {recipe.hiddenRounds} 轮</p><button className="text-button" disabled={saving} onClick={() => void commit(current => {
      const item = { ...recipe, hiddenRounds: 0 };
      const next = { ...current, recipes: current.recipes.map(old => old.id === item.id ? item : old) };
      return { ...next, queue: eligible(item, next) && !next.queue.includes(item.id) ? [...next.queue, item.id] : next.queue };
    }, '已恢复抽取')}>恢复抽取</button></div>}
    <div className="detail-actions">
      <button className="button secondary" disabled={saving} aria-pressed={recipe.favorite} onClick={() => void commit(current => ({ ...current, recipes: current.recipes.map(item => item.id === recipe.id ? { ...item, favorite: !item.favorite } : item) }))}>{recipe.favorite && <Icon name="heart" size={19} style={{ fill: 'currentColor', color: 'var(--favorite)' }} />}{recipe.favorite ? '已收藏' : '收藏'}</button>
      <button className="button secondary" onClick={onEdit}>编辑菜谱</button>
      <button className="button primary" disabled={saving || data.menuIds.includes(recipe.id)} onClick={() => void commit(current => ({ ...current, menuIds: [...current.menuIds, recipe.id], queue: current.queue.filter(id => id !== recipe.id) }), '已加入本次菜单')}>{data.menuIds.includes(recipe.id) ? '已在菜单' : '加入菜单'}</button>
    </div>
    {recipe.hiddenRounds === 0 && <button className="detail-hide text-button" disabled={saving} onClick={() => void commit(current => ({
      ...current,
      recipes: current.recipes.map(item => item.id === recipe.id ? { ...item, hiddenRounds: item.hiddenRounds + 3 } : item),
      queue: current.queue.filter(id => id !== recipe.id),
    }), '已暂时隐藏，可在详情中恢复抽取')}><Icon name="blocked" size={18} />暂时不抽这道菜</button>}
  </div>;
}
