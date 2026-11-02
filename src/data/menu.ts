import { upgradeRestaurantRecords, type Restaurant } from './restaurants';
import type { AuraiFiles } from './files';
import { validateImportedMenu } from './importedMenu';
export interface Recipe {
  id: string;
  name: string;
  images: string[];
  tags: string[];
  note: string;
  favorite: boolean;
  createdAt: number;
  hiddenRounds: number;
}
export interface Filters { preferred: string[]; excluded: string[] }
export interface MenuData {
  libraryGeneration?: string;
  restaurants: Restaurant[];
  recipes: Recipe[];
  menuIds: string[];
  filters: Filters;
  queue: string[];
}
export const emptyData: MenuData = {
  restaurants: [], recipes: [], menuIds: [], filters: { preferred: [], excluded: [] }, queue: [],
};
export function matches(recipe: Recipe, filters: Filters) {
  return (!filters.preferred.length || recipe.tags.some(tag => filters.preferred.includes(tag)))
    && !recipe.tags.some(tag => filters.excluded.includes(tag));
}
export function eligible(recipe: Recipe, data: MenuData) {
  return recipe.hiddenRounds === 0 && !data.menuIds.includes(recipe.id) && matches(recipe, data.filters);
}
export function shuffle(ids: string[]) {
  const result = [...ids];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function newRound(data: MenuData, decrement = true): MenuData {
  const next = { ...data, recipes: data.recipes.map(recipe => ({
    ...recipe, hiddenRounds: decrement ? Math.max(0, recipe.hiddenRounds - 1) : recipe.hiddenRounds,
  })) };
  return { ...next, queue: shuffle(next.recipes.filter(recipe => eligible(recipe, next)).map(recipe => recipe.id)) };
}
export function removeFromMenu(data: MenuData, ids: string[]): MenuData {
  const next = { ...data, menuIds: data.menuIds.filter(id => !ids.includes(id)) };
  const returned = data.recipes.filter(recipe => ids.includes(recipe.id) && eligible(recipe, next) && !data.queue.includes(recipe.id));
  return { ...next, queue: [...data.queue, ...shuffle(returned.map(recipe => recipe.id))] };
}
interface Document { revision: number; value: MenuData | null }
interface AuraiStorage {
  files?: AuraiFiles;
  readData(name: string): Promise<Document>;
  writeData(name: string, value: MenuData, revision: number): Promise<Document>;
}
declare global { interface Window { AuraiHTML?: AuraiStorage } }
const documentName = 'random_menu.json';
const localKey = 'random-menu:data:v1';
const host = window.AuraiHTML;
async function readMenuDocument(): Promise<Document> {
  let document: Document;
  if (host) document = await host.readData(documentName);
  else {
    const raw = localStorage.getItem(localKey);
    document = raw === null ? { revision: 0, value: null } : JSON.parse(raw);
  }
  if (host?.files) {
    const library = await host.files.info();
    if (library.available && document.value?.libraryGeneration !== library.generation) {
      const value = await host.files.readDocument('random_menu.json');
      validateImportedMenu(value);
      document = await host.writeData(documentName, { ...value, libraryGeneration: library.generation }, document.revision);
    }
  }
  // v1 菜谱文档尚未包含餐厅；读取时升级，下一次保存一并持久化。
  if (document.value && !('restaurants' in document.value)) {
    document.value = { ...(document.value as Omit<MenuData, 'restaurants'>), restaurants: [] };
  }
  if (document.value) document.value = { ...document.value, restaurants: upgradeRestaurantRecords(document.value.restaurants) };
  return document;
}
// Multiple mounted surfaces may request the same document during import activation.
let pendingRead: Promise<Document> | null = null;
export function readMenu(): Promise<Document> {
  if (!pendingRead) pendingRead = readMenuDocument().finally(() => { pendingRead = null; });
  return pendingRead;
}
export async function writeMenu(value: MenuData, revision: number): Promise<number> {
  if (host) return (await host.writeData(documentName, value, revision)).revision;
  const current = await readMenu();
  if (current.revision !== revision) throw new Error('revision conflict');
  localStorage.setItem(localKey, JSON.stringify({ revision: revision + 1, value }));
  return revision + 1;
}

export class RecipeChangedError extends Error {}
