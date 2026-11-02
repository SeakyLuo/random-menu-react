import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { emptyData, readMenu, RecipeChangedError, writeMenu, type MenuData } from './menu';
import { RestaurantChangedError } from './restaurants';
export type PanelKind = 'filter' | 'menu' | 'picker' | 'detail' | 'editor' | 'options';
export interface Panel { type: PanelKind; recipeId?: string; returnTo?: Panel }
interface MenuContextValue {
  data: MenuData;
  loading: boolean;
  loadFailed: boolean;
  saving: boolean;
  panel: Panel | null;
  setPanel: (panel: Panel | null) => void;
  commit: (update: (data: MenuData) => MenuData, message?: string) => Promise<boolean>;
  notify: (message: string) => void;
  load: () => Promise<boolean>;
}
const MenuContext = createContext<MenuContextValue>(null!);
export const useMenu = () => useContext(MenuContext);
export function MenuProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [toast, setToast] = useState({ message: '', serial: 0 });
  const current = useRef({ data: emptyData, revision: 0 });
  const writing = useRef(false);
  const toastElement = useRef<HTMLDivElement>(null);
  const reading = useRef(0);
  const notify = useCallback((message: string) => setToast(old => ({ message, serial: old.serial + 1 })), []);
  const load = useCallback(async () => {
    const request = ++reading.current;
    try {
      const document = await readMenu();
      if (request !== reading.current) return false;
      current.current = { data: document.value ?? emptyData, revision: document.revision };
      setData(current.current.data);
      setLoadFailed(false);
      return true;
    } catch (error) {
      if (request === reading.current) {
        setLoadFailed(true);
        notify(error instanceof Error ? error.message : String(error));
      }
      return false;
    } finally {
      if (request === reading.current) setLoading(false);
    }
  }, [notify]);
  useEffect(() => {
    void load();
    const onUpdate = () => { if (!writing.current) void load(); };
    window.addEventListener('storage', onUpdate);
    document.addEventListener('aurai:messageupdate', onUpdate);
    return () => {
      reading.current++;
      window.removeEventListener('storage', onUpdate);
      document.removeEventListener('aurai:messageupdate', onUpdate);
    };
  }, [load]);
  useEffect(() => {
    if (!toast.message) return;
    const element = toastElement.current!;
    element.showPopover();
    const timer = window.setTimeout(() => setToast(old => ({ ...old, message: '' })), 3500);
    return () => { window.clearTimeout(timer); element.hidePopover(); };
  }, [toast]);
  const commit = async (update: (data: MenuData) => MenuData, message?: string) => {
    if (writing.current || loading || loadFailed) return false;
    writing.current = true;
    setSaving(true);
    ++reading.current;
    try {
      const next = update(current.current.data);
      const revision = await writeMenu(next, current.current.revision);
      current.current = { data: next, revision };
      setData(next);
      if (message) notify(message);
      return true;
    } catch (error) {
      notify(error instanceof RestaurantChangedError ? '餐厅已在其他页面修改，输入已保留，请核对最新记录后重新编辑' : error instanceof RecipeChangedError ? '这道菜已在其他页面修改，输入已保留，请核对后重新编辑' : '保存失败，输入已保留，请重试');
      await load();
      return false;
    } finally {
      writing.current = false;
      setSaving(false);
    }
  };
  return <MenuContext.Provider value={{ data, loading, loadFailed, saving, panel, setPanel, commit, notify, load }}>
    {children}
    <div ref={toastElement} popover="manual" className="toast" role="status">{toast.message}</div>
  </MenuContext.Provider>;
}
