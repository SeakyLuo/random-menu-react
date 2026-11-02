import { useEffect, useMemo, useRef, useState } from 'react';
import { useMenu } from '../data/MenuProvider';
import { RestaurantChangedError, type Restaurant, type Visit } from '../data/restaurants';
import { emptyRestaurantFilters, filterRestaurants, restaurantFilterLabels, removeRestaurantFilter, restaurantSortOptions, type RestaurantSort } from '../data/restaurantQuery';
import { Icon } from '../components/Icon';
import { Sheet } from '../components/Sheet';
import { EmptyState } from '../components/Shared';
import { VisitEditor } from '../components/RestaurantForms';
import { RestaurantEditor } from '../components/RestaurantEditor';
import { RestaurantCard, RestaurantDetail } from '../components/RestaurantViews';
import { RestaurantFilterPanel, RestaurantStats } from '../components/RestaurantTools';
import '../restaurants.css';

import { Pagination } from '../components/Pagination';

type Panel = { type: 'detail' | 'editor' | 'visit'; restaurantId?: string; visitId?: string } | { type: 'filter' | 'stats' };
type Removal = { restaurant: Restaurant; visit?: Visit };
export function Restaurants() {
  const { data, saving, commit } = useMenu();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState(emptyRestaurantFilters);
  const [sort, setSort] = useState<RestaurantSort>('recent');
  const [panel, setPanel] = useState<Panel | null>(null);
  const [dirty, setDirty] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant>();
  const [discardTo, setDiscardTo] = useState<{ panel: Panel | null } | null>(null);
  const [removal, setRemoval] = useState<Removal | null>(null);
  const [photo, setPhoto] = useState<{ images: string[]; index: number } | null>(null);
  const uploading = useRef(false);
  const restaurant = panel && 'restaurantId' in panel ? data.restaurants.find(item => item.id === panel.restaurantId) : undefined;
  const visit = panel?.type === 'visit' ? restaurant?.visits.find(item => item.id === panel.visitId) : undefined;
  const list = useMemo(() => filterRestaurants(data.restaurants, query, filters, sort), [data.restaurants, query, filters, sort]);
  useEffect(() => setPage(0), [query, filters, sort]);
  const currentPage = Math.min(page, Math.max(0, Math.ceil(list.length / 12) - 1));
  const filterLabels = restaurantFilterLabels(filters);
  const filtered = Boolean(query || filterLabels.length);
  const activeFilters = filterLabels.length;
  function navigate(next: Panel | null) {
    if (saving || uploading.current) return;
    if (dirty) setDiscardTo({ panel: next });
    else {
      if (next?.type === 'editor') setEditingRestaurant(data.restaurants.find(item => item.id === next.restaurantId));
      setPanel(next); setRemoval(null);
    }
  }
  function saved(id: string) { setDirty(false); setPanel({ type: 'detail', restaurantId: id }); }
  function clearFilters() { setQuery(''); setFilters(emptyRestaurantFilters); }
  async function remove() {
    const target = removal!;
    const ok = await commit(current => {
      const existing = current.restaurants.find(item => item.id === target.restaurant.id);
      if (JSON.stringify(existing) !== JSON.stringify(target.restaurant)) throw new RestaurantChangedError();
      return { ...current, restaurants: target.visit ? current.restaurants.map(item => item.id === target.restaurant.id ? { ...item, visits: item.visits.filter(record => record.id !== target.visit!.id) } : item) : current.restaurants.filter(item => item.id !== target.restaurant.id) };
    }, target.visit ? '消费记录已删除' : '餐厅已删除');
    if (ok) { setRemoval(null); if (!target.visit) setPanel(null); }
  }
  const title = panel?.type === 'filter' ? '筛选餐厅' : panel?.type === 'stats' ? '统计与排序' : panel?.type === 'editor' ? restaurant ? '编辑餐厅' : '添加餐厅' : panel?.type === 'visit' ? visit ? '编辑消费记录' : '记一笔' : '餐厅详情';
  const back = panel && (panel.type === 'visit' || panel.type === 'editor' && restaurant) ? () => navigate({ type: 'detail', restaurantId: restaurant!.id }) : undefined;
  return <div className="restaurant-page">
    <div className="restaurant-toolbar"><label className="search-field"><Icon name="search" size={20} /><input type="search" aria-label="搜索餐厅" placeholder="搜索餐厅、菜系、地址或菜品" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <button className={`icon-button restaurant-tool ${activeFilters ? 'has-filter' : ''}`} aria-label={`筛选餐厅${activeFilters ? `，已选 ${activeFilters} 项` : ''}`} onClick={() => navigate({ type: 'filter' })}><Icon name="filter" size={21} />{activeFilters > 0 && <span>{activeFilters}</span>}</button>
      <button className={`icon-button restaurant-tool ${sort !== 'recent' ? 'has-filter' : ''}`} aria-label="统计与排序" onClick={() => navigate({ type: 'stats' })}><Icon name="stats" size={22} /></button>
    </div>
    {activeFilters > 0 && <div className="restaurant-applied-filters">{filterLabels.map(item => <button key={item.key} aria-label={`移除筛选：${item.label}`} onClick={() => setFilters(removeRestaurantFilter(filters, item.key))}><span>{item.label}</span><Icon name="close" size={15} /></button>)}<button className="restaurant-clear-filters" onClick={() => setFilters(emptyRestaurantFilters)}>清除筛选</button></div>}
    {data.restaurants.length > 0 && <div className="restaurant-result-summary"><span>{list.length} 家餐厅 · {list.reduce((sum, item) => sum + item.visits.length, 0)} 次用餐</span><span>{restaurantSortOptions.find(option => option.value === sort)!.label}</span></div>}
    {list.length > 0 ? <div className="restaurant-grid">{list.slice(currentPage * 12, (currentPage + 1) * 12).map(({ restaurant: item, visits }) => <RestaurantCard key={item.id} restaurant={item} visits={visits} scoped={activeFilters > 0} onOpen={() => navigate({ type: 'detail', restaurantId: item.id })} onFavorite={() => void commit(current => ({ ...current, restaurants: current.restaurants.map(old => old.id === item.id ? { ...old, favorite: !old.favorite } : old) }), item.favorite ? '已取消收藏' : '已收藏餐厅')} />)}</div>
      : <EmptyState icon={filtered ? 'search' : 'restaurant'} title={filtered ? '没有符合条件的餐厅' : '收好值得再去的地方'} description={filtered ? '换个关键词或筛选条件，继续找找。' : '点击右下角的＋添加餐厅，再记下吃过的菜和用餐感受。'}>{filtered && <button className="button secondary" onClick={clearFilters}>查看全部餐厅</button>}</EmptyState>}
    <Pagination page={currentPage} total={list.length} onChange={setPage} />
    <button className="restaurant-add-fab" aria-label="添加餐厅" title="添加餐厅" onClick={() => navigate({ type: 'editor' })}><Icon name="plus" size={30} /></button>
    {panel?.type === 'editor' && <RestaurantEditor key={panel.restaurantId ?? 'new'} restaurant={editingRestaurant} onClose={() => { setDirty(false); setPanel(editingRestaurant ? { type: 'detail', restaurantId: editingRestaurant.id } : null); }} onSaved={saved} />}
    {panel && panel.type !== 'editor' && <Sheet title={photo ? '查看照片' : discardTo ? '放弃未保存的内容？' : removal ? removal.visit ? '删除消费记录？' : '删除餐厅？' : title} view={photo ? 'restaurant-photo' : `restaurant-${panel.type}`} onClose={() => { if (photo) setPhoto(null); else if (discardTo) setDiscardTo(null); else if (removal) setRemoval(null); else navigate(null); }} onBack={photo ? () => setPhoto(null) : discardTo || removal ? undefined : back}>
      {photo && <div className="restaurant-photo-preview-panel"><img className="restaurant-photo-preview" src={photo.images[photo.index]} alt="照片预览" />{photo.images.length > 1 && <div className="restaurant-preview-pagination"><button className="button secondary" disabled={photo.index === 0} onClick={() => setPhoto({ ...photo, index: photo.index - 1 })}>上一张</button><span>{photo.index + 1} / {photo.images.length}</span><button className="button secondary" disabled={photo.index === photo.images.length - 1} onClick={() => setPhoto({ ...photo, index: photo.index + 1 })}>下一张</button></div>}</div>}
      {discardTo && <div className="restaurant-confirm"><p>这次填写的内容还没有保存。</p><div className="sheet-actions"><button className="button secondary" onClick={() => setDiscardTo(null)}>继续编辑</button><button className="button primary" onClick={() => { setDirty(false); setPanel(discardTo.panel); setDiscardTo(null); }}>放弃修改</button></div></div>}
      {removal && <div className="restaurant-confirm"><p>{removal.visit ? `删除 ${removal.visit.date} 的这次消费及菜品照片，餐厅资料会保留。` : `删除“${removal.restaurant.name}”及其 ${removal.restaurant.visits.length} 条消费记录和照片。此操作无法撤销。`}</p><div className="sheet-actions"><button className="button secondary" disabled={saving} onClick={() => setRemoval(null)}>保留</button><button className="button primary destructive" disabled={saving} onClick={() => void remove()}>确认删除</button></div></div>}
      <div hidden={Boolean(discardTo || removal || photo)}>
        {panel.type === 'filter' && <RestaurantFilterPanel restaurants={data.restaurants} filters={filters} query={query} onApply={next => { setFilters(next); setPanel(null); }} />}
        {panel.type === 'stats' && <RestaurantStats results={list} filters={filters} query={query} sort={sort} onSort={setSort} onClose={() => setPanel(null)} onDining={row => {
          setFilters(current => ({ ...current, dining: row.dining, companions: row.dining === 'companions' ? [...new Set([...(current.dining === 'companions' ? current.companions : []), row.name])] : [] }));
          setPanel(null);
        }} />}
        {panel.type === 'detail' && restaurant && <RestaurantDetail restaurant={restaurant} scoped={activeFilters > 0} onPreview={(images, index) => setPhoto({ images, index })} onEdit={() => navigate({ type: 'editor', restaurantId: restaurant.id })} onVisit={record => navigate({ type: 'visit', restaurantId: restaurant.id, visitId: record?.id })} onDelete={() => setRemoval({ restaurant })} onDeleteVisit={record => setRemoval({ restaurant, visit: record })} />}
        {panel.type === 'visit' && restaurant && <VisitEditor key={visit?.id ?? 'new-visit'} restaurant={restaurant} visit={visit} onPreview={image => setPhoto({ images: [image], index: 0 })} onDirty={() => setDirty(true)} onSaved={() => saved(restaurant.id)} onBusy={value => { uploading.current = value; }} />}
        {(panel.type === 'detail' || panel.type === 'visit') && !restaurant && <EmptyState icon="restaurant" title="餐厅已被移除" description="回到列表，继续收集喜欢的地方。"><button className="button secondary" onClick={() => { setDirty(false); setPanel(null); }}>返回列表</button></EmptyState>}
      </div>
    </Sheet>}
  </div>;
}
