export interface RestaurantAddress { id: string; district: string; address: string }
export interface RestaurantFood { id: string; name: string; priceCents: number | null; quantity: number; note: string; image: string; images: string[] }
export interface Visit {
  id: string; date: string; people: number; companions: string; totalCents: number | null;
  address: string; note: string; foods: RestaurantFood[]; images: string[]; time: string; autoCost: boolean;
}
export interface Restaurant {
  id: string; name: string; cuisine: string; addresses: RestaurantAddress[];
  note: string; link: string; favorite: boolean; createdAt: number; visits: Visit[];
}
export const money = (cents: number) => (cents / 100).toLocaleString('zh-CN', { maximumFractionDigits: 2 });
export const fullAddress = (address: RestaurantAddress) => [address.district, address.address].filter(Boolean).join(' ');
export function averageCost(restaurant: Restaurant): number | null {
  return averageVisitCost(restaurant.visits);
}
export function averageVisitCost(records: Visit[]): number | null {
  const visits = records.filter(visit => visit.totalCents !== null);
  return visits.length ? Math.round(visits.reduce((sum, visit) => sum + visit.totalCents!, 0) / visits.reduce((sum, visit) => sum + visit.people, 0)) : null;
}
export function restaurantFoods(restaurant: Pick<Restaurant, 'visits'>) {
  return [...restaurant.visits].sort((a, b) => visitMoment(b).localeCompare(visitMoment(a))).flatMap(visit => visit.foods);
}
export const visitMoment = (visit: Visit) => `${visit.date}T${visit.time}`;
// 明确升级只有日期和单张封面的旧文档；未知时间保持空，旧金额保持手填。
export function upgradeRestaurantRecords(restaurants: Restaurant[]): Restaurant[] {
  return restaurants.map(restaurant => ({ ...restaurant, visits: restaurant.visits.map(visit => ({
    ...visit, time: 'time' in visit ? visit.time : '', autoCost: 'autoCost' in visit ? visit.autoCost : false,
    foods: visit.foods.map(food => {
      const previousCover = food.image;
      return { ...food, images: 'images' in food ? food.images : previousCover ? [previousCover] : [] };
    }),
  })) }));
}
export class RestaurantChangedError extends Error {}
