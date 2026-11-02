import type { MenuData } from './menu';

/** Imported archives are external input; verify the business document before activation. */
export function validateImportedMenu(value: unknown): asserts value is MenuData {
  const fail = (): never => { throw new Error('Invalid random_menu.json in imported library'); };
  const object = (input: unknown): Record<string, unknown> => {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) fail();
    return input as Record<string, unknown>;
  };
  const list = (input: unknown): unknown[] => { if (!Array.isArray(input)) fail(); return input as unknown[]; };
  const text = (input: unknown) => { if (typeof input !== 'string') fail(); };
  const strings = (input: unknown) => list(input).forEach(text);
  const flag = (input: unknown) => { if (typeof input !== 'boolean') fail(); };
  const number = (input: unknown) => { if (typeof input !== 'number' || !Number.isFinite(input)) fail(); };
  const images = (input: unknown) => {
    for (const path of list(input)) {
      if (typeof path !== 'string' || !/^https:\/\/aurai-game\.invalid\/app-files\/[a-f0-9-]{36}\/media\/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp|gif)$/.test(path)) fail();
    }
  };
  const data = object(value);
  const ids = new Set<string>();
  for (const item of list(data.recipes)) {
    const row = object(item);
    text(row.id); if (ids.has(row.id as string)) fail(); ids.add(row.id as string);
    text(row.name); text(row.note); strings(row.tags); images(row.images);
    flag(row.favorite); number(row.createdAt); number(row.hiddenRounds);
  }
  for (const id of [...list(data.menuIds), ...list(data.queue)]) if (!ids.has(id as string)) fail();
  const filters = object(data.filters); strings(filters.preferred); strings(filters.excluded);
  for (const item of list(data.restaurants)) {
    const row = object(item);
    text(row.id); text(row.name); text(row.cuisine); text(row.note); text(row.link);
    flag(row.favorite); number(row.createdAt);
    for (const item of list(row.addresses)) {
      const address = object(item); text(address.id); text(address.district); text(address.address);
    }
    for (const item of list(row.visits)) {
      const visit = object(item);
      text(visit.id); text(visit.date); text(visit.companions); text(visit.address); text(visit.note);
      if ('time' in visit) text(visit.time);
      if ('autoCost' in visit) flag(visit.autoCost);
      number(visit.people); if ((visit.people as number) < 1) fail();
      if (visit.totalCents !== null) number(visit.totalCents);
      images(visit.images);
      for (const item of list(visit.foods)) {
        const food = object(item); text(food.id); text(food.name); text(food.note);
        number(food.quantity); if (food.priceCents !== null) number(food.priceCents);
        if (food.image !== '') images([food.image]);
        if ('images' in food) images(food.images);
      }
    }
  }
}
