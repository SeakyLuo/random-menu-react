import { useState } from 'react';
import { type Panel, useMenu } from '../data/MenuProvider';
import { newRound, removeFromMenu, type Filters } from '../data/menu';
import { Sheet } from './Sheet';
import { Icon } from './Icon';
import { EmptyState } from './Shared';
import { RecipeEditor } from './RecipeEditor';
import { RecipeDetail, RecipeRow } from './Recipes';
function FilterPanel() {
  const { data, commit, saving, setPanel } = useMenu();
  const [draft, setDraft] = useState<Filters>(data.filters);
  const tags = [...new Set(data.recipes.flatMap(recipe => recipe.tags))];
  function toggle(tag: string, group: keyof Filters) {
    const other = group === 'preferred' ? 'excluded' : 'preferred';
    setDraft(old => {
      const next = { ...old };
      next[group] = old[group].includes(tag) ? old[group].filter(value => value !== tag) : [...old[group], tag];
      next[other] = old[other].filter(value => value !== tag);
      return next;
    });
  }
  return <div className="filter-panel">
    <p className="sheet-description">想吃的标签匹配一个即可。</p>
    {!tags.length && <div className="filter-no-tags"><p>还没有菜谱标签，添加后就能按口味挑选。</p><button className="text-button" onClick={() => { setPanel(null); window.location.hash = '/dishes'; }}>去整理菜谱</button></div>}
    {([{ key: 'preferred', title: '想吃的' }, { key: 'excluded', title: '这次不吃' }] as const).map(group => <section className="filter-section" key={group.key}><h3>{group.title}</h3><div className="tag-options">{tags.map(tag => <button key={tag} className={`tag-chip ${draft[group.key].includes(tag) ? group.key === 'excluded' ? 'excluded' : 'active' : ''}`} aria-pressed={draft[group.key].includes(tag)} onClick={() => toggle(tag, group.key)}>{tag}{draft[group.key].includes(tag) && <span className="tag-check"><Icon name="check" size={15} /></span>}</button>)}</div>{group.key === 'excluded' && <p className="filter-hint">排除的标签不会参与抽取。</p>}</section>)}
    <div className="sheet-actions"><button className="button secondary" onClick={() => setDraft({ preferred: [], excluded: [] })}>重置</button><button className="button primary" disabled={saving} onClick={async () => { if (await commit(current => newRound({ ...current, filters: draft }, false))) setPanel(null); }}>应用筛选</button></div>
  </div>;
}
export function MenuPanel() {
  const { data, saving, commit, setPanel } = useMenu();
  const [confirmClear, setConfirmClear] = useState(false);
  const menu = data.menuIds.map(id => data.recipes.find(recipe => recipe.id === id)!);
  return <div className="menu-panel">
    {menu.length ? <div className="sheet-recipe-list">{menu.map(recipe => <RecipeRow key={recipe.id} recipe={recipe} onOpen={() => setPanel({ type: 'detail', recipeId: recipe.id, returnTo: { type: 'menu' } })} action={<button className="icon-button" aria-label={`移除${recipe.name}`} disabled={saving} onClick={() => void commit(current => removeFromMenu(current, [recipe.id]), '已移出菜单')}><Icon name="close" size={20} /></button>} />)}</div>
      : <EmptyState icon="dishes" title="菜单里还没有菜" description="随机挑一道，或者直接添加这餐想吃的菜。" />}
    <button className="add-menu-row" onClick={() => setPanel({ type: 'picker', returnTo: { type: 'menu' } })}><Icon name="plus" size={22} />添加菜品<Icon name="chevron" size={19} /></button>
    <div className="sheet-actions">
      {confirmClear && menu.length > 0 ? <div className="menu-clear-confirmation" role="group" aria-label="确认清空本次菜单">
        <p>清空本次菜单？菜谱和收藏会保留。</p>
        <div><button className="button secondary" disabled={saving} onClick={() => setConfirmClear(false)}>取消</button><button className="button menu-clear-submit" disabled={saving} onClick={async () => { if (await commit(current => removeFromMenu(current, current.menuIds), '菜单已清空')) setConfirmClear(false); }}>确认清空</button></div>
      </div> : <><button className="button primary" onClick={() => { setPanel(null); window.location.hash = '/'; }}>继续挑选</button>{menu.length > 0 && <button className="button secondary menu-clear-toggle" disabled={saving} onClick={() => setConfirmClear(true)}>清空</button>}</>}
    </div>
  </div>;
}
function PickerPanel() {
  const { data, saving, commit, setPanel } = useMenu();
  const [query, setQuery] = useState('');
  const recipes = data.recipes.filter(recipe => [recipe.name, ...recipe.tags].some(value => value.includes(query.trim())));
  return <div className="picker-panel">
    <label className="search-field"><Icon name="search" size={20} /><input type="search" aria-label="搜索可添加的菜品" placeholder="搜索菜名、标签" value={query} onChange={event => setQuery(event.target.value)} /></label>
    <p className="sheet-description">直接挑选不受随机筛选限制。</p>
    <div className="sheet-recipe-list">{recipes.map(recipe => <RecipeRow key={recipe.id} recipe={recipe} onOpen={() => setPanel({ type: 'detail', recipeId: recipe.id, returnTo: { type: 'picker', returnTo: { type: 'menu' } } })} action={<button className={`icon-button ${data.menuIds.includes(recipe.id) ? 'in-menu' : ''}`} disabled={saving || data.menuIds.includes(recipe.id)} aria-label={data.menuIds.includes(recipe.id) ? `${recipe.name}已在菜单` : `添加${recipe.name}`} onClick={() => void commit(current => ({ ...current, menuIds: [...current.menuIds, recipe.id], queue: current.queue.filter(id => id !== recipe.id) }), '已加入本次菜单')}><Icon name={data.menuIds.includes(recipe.id) ? 'check' : 'plus'} size={20} /></button>} />)}</div>
    {!recipes.length && <EmptyState icon="search" title={query ? '没有找到相关菜谱' : '先记下一道喜欢的菜'} description="添加菜谱后，就可以安排这一餐。">{query && <button className="button secondary" onClick={() => setQuery('')}>清除搜索</button>}</EmptyState>}
    <button className="add-menu-row" onClick={() => setPanel({ type: 'editor', returnTo: { type: 'picker', returnTo: { type: 'menu' } } })}><Icon name="plus" size={22} />新建菜谱<Icon name="chevron" size={19} /></button>
    <div className="sheet-actions"><button className="button primary" onClick={() => setPanel({ type: 'menu' })}>选好了 · {data.menuIds.length} 道菜</button></div>
  </div>;
}
export function HomePanels() {
  const { data, panel, setPanel, saving, commit } = useMenu();
  if (!panel) return null;
  const recipe = data.recipes.find(item => item.id === panel.recipeId);
  const title = { filter: '筛选菜谱', menu: <>本次菜单<span className="sheet-count"> · {data.menuIds.length} 道菜</span></>, picker: '添加菜品', detail: recipe?.name ?? '菜谱详情', editor: recipe ? '编辑菜谱' : '添加菜谱', options: recipe?.name ?? '更多操作' }[panel.type];
  const back = panel.returnTo ? () => setPanel(panel.returnTo!) : undefined;
  const leaveEditor = (next: Panel | null) => {
    if (panel.type === 'editor' && (saving || document.querySelector('.recipe-editor fieldset:disabled'))) return;
    if (panel.type !== 'editor' || !document.querySelector('[data-dirty="true"]') || window.confirm('修改尚未保存，确定放弃修改？')) setPanel(next);
  };
  return <Sheet title={title} view={panel.type + (panel.recipeId ?? '')} onClose={() => leaveEditor(null)} onBack={back ? () => leaveEditor(panel.returnTo!) : undefined}>
    {panel.type === 'filter' && <FilterPanel />}
    {panel.type === 'menu' && <MenuPanel />}
    {panel.type === 'picker' && <PickerPanel />}
    {panel.type === 'editor' && <RecipeEditor key={panel.recipeId ?? 'new'} recipe={recipe} onSaved={id => setPanel(panel.returnTo ?? { type: 'detail', recipeId: id })} />}
    {panel.type === 'detail' && recipe && <RecipeDetail recipe={recipe} onEdit={() => setPanel({ type: 'editor', recipeId: recipe.id, returnTo: panel })} />}
    {panel.type === 'options' && recipe && <div className="options-panel"><button onClick={() => setPanel({ type: 'editor', recipeId: recipe.id, returnTo: panel })}><Icon name="note" />编辑菜谱<Icon name="chevron" size={18} /></button><button disabled={saving} onClick={async () => { if (await commit(current => ({ ...current, recipes: current.recipes.map(item => item.id === recipe.id ? { ...item, hiddenRounds: item.hiddenRounds + 3 } : item), queue: current.queue.filter(id => id !== recipe.id) }), '已暂时隐藏，可在菜谱详情里恢复')) setPanel(null); }}><Icon name="blocked" /><span>暂时不抽这道菜<small>随轮次恢复，也可在详情中提前恢复</small></span></button><button onClick={() => setPanel({ type: 'detail', recipeId: recipe.id })}><Icon name="book" />查看详情<Icon name="chevron" size={18} /></button></div>}
  </Sheet>;
}
