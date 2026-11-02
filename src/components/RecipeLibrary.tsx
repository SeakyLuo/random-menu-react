import { useEffect, useState, type FormEvent } from 'react';
import { useMenu } from '../data/MenuProvider';
import type { Recipe } from '../data/menu';
import { Icon } from './Icon';
import { RecipeImage } from './Recipes';
import { EmptyState } from './Shared';

import { Pagination } from './Pagination';

const historyKey = 'random-menu:search-history:v1';
const scopes = ['全部', '菜名', '标签', '备注'] as const;
type Scope = typeof scopes[number];

function RecipeGrid({ recipes }: { recipes: Recipe[] }) {
  const { setPanel, saving, commit } = useMenu();
  const [page, setPage] = useState(0);
  const recipeIds = recipes.map(recipe => recipe.id).join(',');
  useEffect(() => setPage(0), [recipeIds]);
  const currentPage = Math.min(page, Math.max(0, Math.ceil(recipes.length / 12) - 1));
  return <><div className="recipe-grid">{recipes.slice(currentPage * 12, (currentPage + 1) * 12).map(recipe => <article className="recipe-card" key={recipe.id}>
    <button className="recipe-card-open" onClick={() => setPanel({ type: 'detail', recipeId: recipe.id })}>
      <RecipeImage recipe={recipe} large />
      <div className="recipe-card-copy"><strong>{recipe.name}</strong>
        {recipe.hiddenRounds > 0 && <small>暂时不参与抽取</small>}
      </div>
    </button>
    {recipe.favorite && <button className="recipe-favorite favorite-glass" aria-label={`取消收藏${recipe.name}`} aria-pressed="true" disabled={saving}
      onClick={() => void commit(current => ({ ...current, recipes: current.recipes.map(item => item.id === recipe.id ? { ...item, favorite: false } : item) }), '已取消收藏')}>
      <Icon name="heart" size={21} style={{ fill: 'currentColor' }} />
    </button>}
  </article>)}</div><Pagination page={currentPage} total={recipes.length} onChange={setPage} /></>;
}

export function RecipeLibrary({ favorites = false, searchPage = false }: { favorites?: boolean; searchPage?: boolean }) {
  const { data, setPanel, notify } = useMenu();
  const [tag, setTag] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<Scope>('全部');
  const [history, setHistory] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(historyKey) ?? '[]'); }
    catch { return []; }
  });
  const tags = [...new Set(data.recipes.flatMap(recipe => recipe.tags))];
  const selectedFavorites = favorites;
  const browsing = data.recipes.filter(recipe => (!selectedFavorites || recipe.favorite) && (tag === null || recipe.tags.includes(tag)));
  const term = query.trim().toLocaleLowerCase();
  const results = data.recipes.filter(recipe => {
    const fields = scope === '菜名' ? [recipe.name] : scope === '标签' ? recipe.tags : scope === '备注' ? [recipe.note] : [recipe.name, recipe.note, ...recipe.tags];
    return fields.some(field => field.toLocaleLowerCase().includes(term));
  });
  function saveHistory(next: string[]) {
    setHistory(next);
    try { localStorage.setItem(historyKey, JSON.stringify(next)); }
    catch { notify('搜索历史未能保存'); }
  }
  function search(value = query) {
    const keyword = value.trim();
    setQuery(keyword);
    if (keyword) saveHistory([keyword, ...history.filter(item => item !== keyword)].slice(0, 20));
  }
  function submit(event: FormEvent) { event.preventDefault(); search(); }
  function addRecipe() { setPanel({ type: 'editor' }); }
  if (searchPage) return <section className="recipe-search" aria-label="搜索菜谱">
    <form className="recipe-search-bar" onSubmit={submit}>
      <a className="icon-button" href="#/dishes" aria-label="返回菜谱"><Icon name="back" /></a>
      <label className="search-field"><Icon name="search" size={21} /><input autoFocus type="search" aria-label="搜索菜谱" placeholder="搜索菜名、标签或备注" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <button className="text-button" type="submit">搜索</button>
    </form>
    <div className="search-scopes" aria-label="搜索范围">{scopes.map(item => <button key={item} aria-pressed={scope === item} className={scope === item ? 'active' : ''} onClick={() => setScope(item)}>{item}</button>)}</div>
    {term ? <>
      <p className="recipe-count">找到 {results.length} 道菜</p>
      {results.length ? <RecipeGrid recipes={results} /> : <EmptyState icon="search" title="没有找到相关菜谱" description="换个关键词，或记下这道想吃的菜。"><button className="button secondary" onClick={() => setQuery('')}>清除搜索</button><button className="button primary" onClick={addRecipe}>添加菜谱</button></EmptyState>}
    </> : <section className="search-history">
      <div className="history-heading"><h2>搜索历史</h2>{history.length > 0 && <button className="text-button" onClick={() => saveHistory([])}>清空</button>}</div>
      {history.length ? history.map(item => <div className="history-row" key={item}>
        <button className="history-keyword" onClick={() => search(item)}><Icon name="clock" size={21} /><span>{item}</span></button>
        <button className="icon-button" aria-label={`删除搜索历史${item}`} onClick={() => saveHistory(history.filter(value => value !== item))}><Icon name="close" size={19} /></button>
      </div>) : <p className="search-history-empty">搜索过的关键词会留在这里</p>}
    </section>}
  </section>;
  return <section className="recipe-library" aria-label="菜谱列表">
    {favorites && <a className="search-field recipe-search-entry" href="#/dishes/search"><Icon name="search" size={21} /><span>搜索菜名、标签或备注</span></a>}
    {tags.length > 0 && <div className="library-categories" aria-label="按标签筛选">
      <button className={tag === null ? 'active' : ''} aria-pressed={tag === null} onClick={() => setTag(null)}>全部</button>
      {(expanded ? tags : tags.slice(0, 3)).map(item => <button key={item} className={tag === item ? 'active' : ''} aria-pressed={tag === item} onClick={() => setTag(item)}>{item}</button>)}
      {tags.length > 3 && <button className="category-more" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? '收起' : '更多'}<Icon name="chevron" size={16} style={{ transform: expanded ? 'rotate(-90deg)' : 'rotate(90deg)' }} /></button>}
      {!expanded && tag !== null && !tags.slice(0, 3).includes(tag) && <button className="active" aria-pressed="true" onClick={() => setTag(null)}>{tag}<Icon name="close" size={14} /></button>}
    </div>}
    <p className="recipe-count">共 {browsing.length} 道菜</p>
    {browsing.length ? <RecipeGrid recipes={browsing} /> : <EmptyState icon={selectedFavorites ? 'heart' : 'book'} title={tag ? '这个标签下还没有菜谱' : selectedFavorites ? '还没有收藏的菜谱' : '从一道拿手菜开始'} description={tag || selectedFavorites ? '看看其他菜谱，找到这一餐想吃的味道。' : '点击右下角的＋添加菜谱，记下喜欢的味道。'}>
      {(tag !== null || selectedFavorites) && <button className="button secondary" onClick={() => { setTag(null); if (favorites) window.location.hash = '/dishes'; }}>浏览全部菜谱</button>}
    </EmptyState>}
    <button className="recipe-add-fab" aria-label="添加菜谱" title="添加菜谱" onClick={addRecipe}><Icon name="plus" size={30} /></button>
  </section>;
}
