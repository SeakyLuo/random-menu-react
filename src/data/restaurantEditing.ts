import { companionNames } from './restaurantQuery';
import type { RestaurantFood, Visit } from './restaurants';

export function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const next = [...items];
  [next[index], next[index + direction]] = [next[index + direction], next[index]];
  return next;
}
export const parseAmount = (value: string) => value.trim() === '' ? null : /^\d+(\.\d{1,2})?$/.test(value) && Number(value) <= 10000000 ? Math.round(Number(value) * 100) : NaN;
export function foodTotal(foods: Pick<RestaurantFood, 'priceCents' | 'quantity'>[]): number | null {
  if (!foods.length || foods.some(food => food.priceCents === null || !Number.isFinite(food.priceCents) || !Number.isInteger(food.quantity) || food.quantity < 1)) return null;
  return foods.reduce((sum, food) => sum + food.priceCents! * food.quantity, 0);
}
export function visitValidation(visit: Visit): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(visit.date) || !Number.isFinite(new Date(visit.date).getTime())) return '请选择用餐日期';
  if (visit.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(visit.time)) return '请填写有效的用餐时间';
  if (!Number.isInteger(visit.people) || visit.people < 1 || visit.people > 10000) return '用餐人数须为 1 至 10000 的整数，包含自己';
  if (companionNames(visit.companions).length >= visit.people) return '用餐人数须包含自己和每位同行者，请核对人数';
  if (visit.totalCents !== null && (!Number.isFinite(visit.totalCents) || visit.totalCents < 0 || visit.totalCents > 1000000000)) return '请填写有效消费金额，最多两位小数';
  if (visit.foods.some(food => !food.name.trim() || food.priceCents !== null && (!Number.isFinite(food.priceCents) || food.priceCents < 0 || food.priceCents > 1000000000) || !Number.isInteger(food.quantity) || food.quantity < 1 || food.quantity > 10000)) return '请补全菜品名称、有效单价和数量，或移除不需要的菜品';
  if (visit.autoCost && foodTotal(visit.foods) === null) return '自动计算需要添加菜品并填写有效单价和数量，或关闭自动计算后手填总消费';
  return null;
}
