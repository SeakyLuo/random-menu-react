import { useMemo, useState, type FormEvent } from 'react';
import { useMenu } from '../data/MenuProvider';
import { money, type Restaurant } from '../data/restaurants';
import {
  budgetLabels, companionNames, emptyRestaurantFilters, filterRestaurants, restaurantFilterLabels, restaurantSortOptions, restaurantStatistics,
  type DiningMode, type DiningRank, type RestaurantFilters, type RestaurantResult, type RestaurantSort,
} from '../data/restaurantQuery';
import { Icon } from './Icon';
import { Pagination } from './Pagination';
import '../restaurant-tools.css';

function dateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
const diningOptions: { value: DiningMode; label: string }[] = [
  { value: 'all', label: '不限' }, { value: 'alone', label: '独自用餐' },
  { value: 'companions', label: '和饭伙一起' }, { value: 'unnamed', label: '多人 · 未记姓名' },
];

export function RestaurantFilterPanel({ restaurants, filters, query, onApply }: {
  restaurants: Restaurant[]; filters: RestaurantFilters; query: string; onApply: (filters: RestaurantFilters) => void;
}) {
  const { notify } = useMenu();
  const [draft, setDraft] = useState(filters);
  const [nameQuery, setNameQuery] = useState('');
  const [namePage, setNamePage] = useState(0);
  const cuisines = useMemo(() => [...new Set(restaurants.map(item => item.cuisine))].sort((a, b) => a.localeCompare(b, 'zh-CN')), [restaurants]);
  const districts = useMemo(() => [...new Set(restaurants.flatMap(item => item.addresses.map(address => address.district)))].sort((a, b) => a.localeCompare(b, 'zh-CN')), [restaurants]);
  const names = useMemo(() => [...new Set([...restaurants.flatMap(item => item.visits.flatMap(visit => companionNames(visit.companions))), ...filters.companions])].sort((a, b) => a.localeCompare(b, 'zh-CN')), [restaurants, filters.companions]);
  const matchingNames = names.filter(name => name.toLocaleLowerCase().includes(nameQuery.trim().toLocaleLowerCase()));
  const currentNamePage = Math.min(namePage, Math.max(0, Math.ceil(matchingNames.length / 12) - 1));
  const validDate = !draft.startDate || !draft.endDate || draft.startDate <= draft.endDate;
  const validNames = draft.dining !== 'companions' || draft.companions.length > 0;
  const count = useMemo(() => validDate && validNames ? filterRestaurants(restaurants, query, draft, 'recent').length : null, [restaurants, query, draft, validDate, validNames]);
  function selectNames(value: string) {
    setDraft(current => ({ ...current, companions: current.companions.includes(value) ? current.companions.filter(name => name !== value) : [...current.companions, value] }));
  }
  function setRange(range: 'all' | 'month' | 'year') {
    const now = new Date();
    setDraft(current => ({ ...current, startDate: range === 'all' ? '' : dateString(new Date(now.getFullYear(), range === 'year' ? 0 : now.getMonth(), 1)), endDate: range === 'all' ? '' : dateString(now) }));
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!validDate) { notify('开始日期不能晚于结束日期'); return; }
    if (!validNames) { notify('请选择至少一位饭伙，或改为不限'); return; }
    onApply({ ...draft, address: draft.address.trim(), companions: draft.dining === 'companions' ? draft.companions : [] });
  }
  return <form className="restaurant-filter-form" onSubmit={submit} noValidate>
    <div className="restaurant-tool-body">
      <fieldset className="restaurant-filter-section"><legend>消费日期</legend>
        <div className="restaurant-date-range"><label>开始日期<input aria-label="开始日期" type="date" value={draft.startDate} onChange={event => setDraft({ ...draft, startDate: event.target.value })} /></label><span>至</span><label>结束日期<input aria-label="结束日期" type="date" value={draft.endDate} onChange={event => setDraft({ ...draft, endDate: event.target.value })} /></label></div>
        <div className="restaurant-date-presets"><button type="button" onClick={() => setRange('all')}>不限日期</button><button type="button" onClick={() => setRange('month')}>本月</button><button type="button" onClick={() => setRange('year')}>今年</button></div>
      </fieldset>
      <fieldset className="restaurant-filter-section"><legend>餐厅</legend>
        <div className="restaurant-location-fields"><label className="restaurant-select-label">地区<select aria-label="筛选地区" value={draft.district} onChange={event => setDraft({ ...draft, district: event.target.value })}><option value="">不限地区</option>{districts.map(district => <option key={district} value={district}>{district}</option>)}</select></label>
          <label className="restaurant-select-label">菜系<select aria-label="筛选菜系" value={draft.cuisine} onChange={event => setDraft({ ...draft, cuisine: event.target.value })}><option value="">不限菜系</option>{cuisines.map(cuisine => <option key={cuisine} value={cuisine}>{cuisine}</option>)}</select></label></div>
        <label className="restaurant-select-label">地址关键词<input aria-label="地址关键词" type="search" placeholder="省市、区县或道路" maxLength={200} value={draft.address} onChange={event => setDraft({ ...draft, address: event.target.value })} /></label>
        <p className="restaurant-tool-hint">按餐厅当前分店地址筛选。</p>
      </fieldset>
      <fieldset className="restaurant-filter-section"><legend>和谁吃饭</legend>
        <div className="restaurant-dining-options" role="radiogroup" aria-label="用餐方式">{diningOptions.map(option => <label key={option.value} className={draft.dining === option.value ? 'selected' : ''}><input type="radio" name="dining" value={option.value} checked={draft.dining === option.value} onChange={() => setDraft({ ...draft, dining: option.value })} /><span>{option.label}</span></label>)}</div>
        {draft.dining === 'companions' && <div className="restaurant-companion-picker">
          <p className="restaurant-tool-hint">多选时，须在同一次用餐中一起出现。</p>
          {draft.companions.length > 0 && <div className="restaurant-selected-names" aria-label="已选饭伙">{draft.companions.map(name => <button type="button" key={name} aria-label={`取消选择${name}`} onClick={() => selectNames(name)}>{name}<Icon name="close" size={15} /></button>)}</div>}
          {names.length > 0 ? <><label className="search-field"><Icon name="search" size={18} /><input aria-label="搜索饭伙" type="search" placeholder="搜索已记录的饭伙" value={nameQuery} onChange={event => { setNameQuery(event.target.value); setNamePage(0); }} /></label>
            <div className="restaurant-name-options">{matchingNames.slice(currentNamePage * 12, (currentNamePage + 1) * 12).map(name => <label key={name}><input type="checkbox" checked={draft.companions.includes(name)} onChange={() => selectNames(name)} /><span>{name}</span></label>)}</div>
            {!matchingNames.length && <p className="restaurant-tool-hint">没有匹配的饭伙。<button type="button" className="text-button" onClick={() => setNameQuery('')}>清除搜索</button></p>}
            <Pagination page={currentNamePage} total={matchingNames.length} onChange={setNamePage} />
          </> : <p className="restaurant-tool-hint">还没有记录饭伙。可先选择不限，在消费记录里补充同行者姓名。</p>}
        </div>}
        {draft.dining === 'unnamed' && <p className="restaurant-tool-hint">用餐人数大于 1，且尚未填写同行者姓名。</p>}
        {draft.dining === 'alone' && <p className="restaurant-tool-hint">用餐人数为 1 的记录。</p>}
      </fieldset>
      <fieldset className="restaurant-filter-section"><legend>人均消费</legend>
        <select aria-label="筛选人均消费" value={draft.budget} onChange={event => setDraft({ ...draft, budget: event.target.value as RestaurantFilters['budget'] })}><option value="">不限金额</option>{(Object.keys(budgetLabels) as (keyof typeof budgetLabels)[]).map(value => <option key={value} value={value}>{budgetLabels[value]}</option>)}</select>
        <p className="restaurant-tool-hint">按符合日期和饭伙的记录计算；未填写金额的记录不参与人均。</p>
      </fieldset>
      {query && <p className="restaurant-tool-hint">同时保留搜索“{query}”。</p>}
    </div>
    <div className="sheet-actions restaurant-tool-actions"><button className="button secondary" type="button" onClick={() => { setDraft(emptyRestaurantFilters); setNameQuery(''); setNamePage(0); }}>重置</button><button className="button primary" type="submit">{count === null ? '应用筛选' : `查看 ${count} 家餐厅`}</button></div>
  </form>;
}

export function RestaurantStats({ results, filters, query, sort, onSort, onDining, onClose }: {
  results: RestaurantResult[]; filters: RestaurantFilters; query: string; sort: RestaurantSort;
  onSort: (sort: RestaurantSort) => void; onDining: (row: DiningRank) => void; onClose: () => void;
}) {
  const stats = useMemo(() => restaurantStatistics(results), [results]);
  const [rankQuery, setRankQuery] = useState('');
  const [rankPage, setRankPage] = useState(0);
  const ranks = stats.companions.map((row, index) => ({ ...row, rank: index + 1 })).filter(row => row.name.toLocaleLowerCase().includes(rankQuery.trim().toLocaleLowerCase()));
  const currentRankPage = Math.min(rankPage, Math.max(0, Math.ceil(ranks.length / 12) - 1));
  const labels = restaurantFilterLabels(filters).map(item => item.label);
  return <div className="restaurant-stats-panel">
    <div className="restaurant-tool-body">
      <label className="restaurant-sort-select">餐厅排序<select aria-label="餐厅排序" value={sort} onChange={event => onSort(event.target.value as RestaurantSort)}>{restaurantSortOptions.map(option => <option key={option.value} value={option.value}>{option.label}{option.value === 'recent' ? '（默认）' : ''}</option>)}</select></label>
      <div className="restaurant-stat-scope"><span>当前列表 · {results.length} 家餐厅 · {stats.visits} 次用餐</span>
        {(query || labels.length > 0) && <p className="restaurant-scope-summary">{[query && `搜索“${query}”`, ...labels].filter(Boolean).join(' · ')}</p>}
        <p className="restaurant-tool-hint">当前餐厅范围内，统计符合用餐日期和饭伙的记录。</p>
      </div>
      <section className="restaurant-rank-section"><h3>和谁约饭最多</h3><p className="restaurant-tool-hint">按用餐次数排列，点选饭伙查看一起去过的餐厅。</p>
        {stats.companions.length > 0 && <label className="search-field"><Icon name="search" size={18} /><input aria-label="搜索约饭排行" type="search" placeholder="搜索饭伙" value={rankQuery} onChange={event => { setRankQuery(event.target.value); setRankPage(0); }} /></label>}
        <div className="restaurant-rank-list">{ranks.slice(currentRankPage * 12, (currentRankPage + 1) * 12).map(row => <button key={row.name} onClick={() => onDining(row)} aria-label={`查看和${row.name}一起去过的餐厅`}><span className="restaurant-rank-number">{row.rank}</span><span className="restaurant-rank-copy"><strong>{row.name}</strong><small>一起去过 {row.restaurants} 家餐厅</small></span><b>{row.count}<small>次</small></b><Icon name="chevron" size={18} /></button>)}</div>
        {stats.companions.length > 0 && !ranks.length && <p className="restaurant-tool-hint">没有匹配的饭伙。<button className="text-button" onClick={() => setRankQuery('')}>清除搜索</button></p>}
        <Pagination page={currentRankPage} total={ranks.length} onChange={setRankPage} />
        {!stats.companions.length && <p className="restaurant-rank-empty">{stats.visits ? '当前记录还没有饭伙姓名，可在消费记录中补充。' : '当前范围还没有用餐记录。记下一次用餐，就能查看排行。'}</p>}
        {stats.other.length > 0 && <div className="restaurant-other-dining">{stats.other.map(row => <button key={row.dining} onClick={() => onDining(row)} aria-label={`查看${row.name}的餐厅`}><Icon name={row.dining === 'alone' ? 'personal' : 'note'} size={21} /><span className="restaurant-rank-copy"><strong>{row.name}</strong><small>{row.restaurants} 家餐厅</small></span><b>{row.count}<small>次</small></b><Icon name="chevron" size={18} /></button>)}</div>}
        <p className="restaurant-tool-hint">每次用餐，同一位饭伙只计 1 次；不将整桌消费记为个人消费。</p>
      </section>
      <section className="restaurant-stat-overview"><div className="restaurant-section-title"><h3>消费汇总</h3></div>
        <dl className="restaurant-stat-grid"><div><dt>用餐次数</dt><dd>{stats.visits}<small>次</small></dd></div><div><dt>去过餐厅</dt><dd>{results.filter(result => result.visits.length > 0).length}<small>家</small></dd></div><div><dt>已记消费</dt><dd>{stats.recorded > 0 ? `¥${money(stats.total)}` : '未记录'}</dd></div><div><dt>用餐人均</dt><dd>{stats.average === null ? '未记录' : `¥${money(stats.average)}`}</dd></div></dl>
        {stats.recorded < stats.visits && <p className="restaurant-tool-hint">{stats.visits - stats.recorded} 次用餐未填写金额，不计入消费和人均。</p>}
      </section>
    </div>
    <div className="sheet-actions restaurant-tool-actions"><button className="button primary" onClick={onClose}>查看餐厅</button></div>
  </div>;
}
