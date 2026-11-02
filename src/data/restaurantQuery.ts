import { averageVisitCost, fullAddress, visitMoment, type Restaurant, type Visit } from './restaurants';

export type DiningMode = 'all' | 'alone' | 'companions' | 'unnamed';
export type RestaurantSort = 'recent' | 'visits' | 'costDesc' | 'costAsc' | 'added';
export interface RestaurantFilters {
  cuisine: string; district: string; address: string; startDate: string; endDate: string;
  dining: DiningMode; companions: string[]; budget: '' | 'low' | 'mid' | 'high';
}
export interface RestaurantResult { restaurant: Restaurant; visits: Visit[]; average: number | null; lastVisit: string }
export const emptyRestaurantFilters: RestaurantFilters = {
  cuisine: '', district: '', address: '', startDate: '', endDate: '', dining: 'all', companions: [], budget: '',
};
export const restaurantSortOptions: { value: RestaurantSort; label: string }[] = [
  { value: 'recent', label: '最近到店' }, { value: 'visits', label: '到店次数最多' },
  { value: 'costDesc', label: '人均从高到低' }, { value: 'costAsc', label: '人均从低到高' }, { value: 'added', label: '最近添加' },
];
export const budgetLabels = { low: '¥100以下', mid: '¥100–300', high: '¥300以上' };
export function companionNames(value: string): string[] {
  return [...new Set(value.split(/[，,、\n]/).map(name => name.trim()).filter(Boolean))];
}
function matchesVisit(visit: Visit, filters: RestaurantFilters) {
  if (filters.startDate && visit.date < filters.startDate || filters.endDate && visit.date > filters.endDate) return false;
  if (filters.dining === 'alone') return visit.people === 1;
  const names = companionNames(visit.companions);
  if (filters.dining === 'unnamed') return visit.people > 1 && names.length === 0;
  if (filters.dining === 'companions') return filters.companions.every(name => names.includes(name));
  return true;
}
export function filterRestaurants(restaurants: Restaurant[], query: string, filters: RestaurantFilters, sort: RestaurantSort): RestaurantResult[] {
  const term = query.trim().toLocaleLowerCase();
  const addressTerm = filters.address.trim().toLocaleLowerCase();
  const requireVisit = Boolean(filters.startDate || filters.endDate || filters.dining !== 'all');
  const result: RestaurantResult[] = [];
  for (const restaurant of restaurants) {
    if (filters.cuisine && restaurant.cuisine !== filters.cuisine) continue;
    // 地区和地址须命中同一家分店；日期和饭伙须命中同一次消费。
    if ((filters.district || addressTerm) && !restaurant.addresses.some(address =>
      (!filters.district || address.district === filters.district) && (!addressTerm || fullAddress(address).toLocaleLowerCase().includes(addressTerm)))) continue;
    if (term && ![restaurant.name, restaurant.cuisine, restaurant.note, ...restaurant.addresses.map(fullAddress),
      ...restaurant.visits.flatMap(visit => [visit.address, ...visit.foods.map(food => food.name)])].some(value => value.toLocaleLowerCase().includes(term))) continue;
    const visits = restaurant.visits.filter(visit => matchesVisit(visit, filters));
    if (requireVisit && visits.length === 0) continue;
    const average = averageVisitCost(visits);
    if (filters.budget && (average === null || !(filters.budget === 'low' ? average < 10000 : filters.budget === 'mid' ? average >= 10000 && average <= 30000 : average > 30000))) continue;
    result.push({ restaurant, visits, average, lastVisit: visits.reduce((latest, visit) => visitMoment(visit) > latest ? visitMoment(visit) : latest, '') });
  }
  return result.sort((first, second) => {
    let order = 0;
    if (sort === 'visits') order = second.visits.length - first.visits.length;
    if (sort === 'costDesc' || sort === 'costAsc') {
      if (first.average === null && second.average !== null) return 1;
      if (second.average === null && first.average !== null) return -1;
      if (first.average !== null && second.average !== null) order = sort === 'costAsc' ? first.average - second.average : second.average - first.average;
    }
    if (sort === 'added') order = second.restaurant.createdAt - first.restaurant.createdAt;
    return order || second.lastVisit.localeCompare(first.lastVisit) || second.restaurant.createdAt - first.restaurant.createdAt || first.restaurant.name.localeCompare(second.restaurant.name, 'zh-CN');
  });
}
export type FilterKey = 'date' | 'district' | 'address' | 'cuisine' | 'dining' | 'budget';
export function restaurantFilterLabels(filters: RestaurantFilters): { key: FilterKey; label: string }[] {
  const labels: { key: FilterKey; label: string }[] = [];
  if (filters.startDate || filters.endDate) labels.push({ key: 'date', label: filters.startDate && filters.endDate ? `${filters.startDate} 至 ${filters.endDate}` : filters.startDate ? `${filters.startDate} 起` : `截至 ${filters.endDate}` });
  if (filters.district) labels.push({ key: 'district', label: filters.district });
  if (filters.address) labels.push({ key: 'address', label: `地址：${filters.address}` });
  if (filters.cuisine) labels.push({ key: 'cuisine', label: filters.cuisine });
  if (filters.dining !== 'all') labels.push({ key: 'dining', label: filters.dining === 'alone' ? '独自用餐' : filters.dining === 'unnamed' ? '多人用餐 · 未记姓名' : `和 ${filters.companions.join('、')} 一起` });
  if (filters.budget) labels.push({ key: 'budget', label: `人均 ${budgetLabels[filters.budget]}` });
  return labels;
}
export function removeRestaurantFilter(filters: RestaurantFilters, key: FilterKey): RestaurantFilters {
  if (key === 'date') return { ...filters, startDate: '', endDate: '' };
  if (key === 'dining') return { ...filters, dining: 'all', companions: [] };
  return { ...filters, [key]: '' };
}
export interface DiningRank { name: string; count: number; restaurants: number; dining: Exclude<DiningMode, 'all'> }
export function restaurantStatistics(results: RestaurantResult[]) {
  const visits = results.flatMap(result => result.visits);
  const recorded = visits.filter(visit => visit.totalCents !== null);
  const ranks = new Map<string, { count: number; restaurantIds: Set<string> }>();
  const alone = { name: '独自用餐', count: 0, restaurants: new Set<string>() };
  const unnamed = { name: '多人用餐 · 未记姓名', count: 0, restaurants: new Set<string>() };
  for (const result of results) for (const visit of result.visits) {
    if (visit.people === 1) { alone.count++; alone.restaurants.add(result.restaurant.id); continue; }
    const names = companionNames(visit.companions);
    if (names.length === 0) { unnamed.count++; unnamed.restaurants.add(result.restaurant.id); }
    for (const name of names) {
      const rank = ranks.get(name) ?? { count: 0, restaurantIds: new Set<string>() };
      rank.count++; rank.restaurantIds.add(result.restaurant.id); ranks.set(name, rank);
    }
  }
  const companions: DiningRank[] = [...ranks].map(([name, rank]) => ({ name, count: rank.count, restaurants: rank.restaurantIds.size, dining: 'companions' }));
  companions.sort((a, b) => b.count - a.count || b.restaurants - a.restaurants || a.name.localeCompare(b.name, 'zh-CN'));
  const other: DiningRank[] = [
    { name: alone.name, count: alone.count, restaurants: alone.restaurants.size, dining: 'alone' },
    { name: unnamed.name, count: unnamed.count, restaurants: unnamed.restaurants.size, dining: 'unnamed' },
  ];
  return { visits: visits.length, recorded: recorded.length, total: recorded.reduce((sum, visit) => sum + visit.totalCents!, 0), average: averageVisitCost(visits), companions, other: other.filter(row => row.count > 0) };
}
