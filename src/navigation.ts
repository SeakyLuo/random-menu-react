import { useEffect, useState } from "react";
import type { IconName } from "./components/Icon";

export const tabs = [
  { path: "/", label: "随机", icon: "random" },
  { path: "/dishes", label: "菜谱", icon: "book" },
  { path: "/restaurants", label: "餐厅", icon: "restaurant" },
  { path: "/me", label: "我的", icon: "personal" },
] as const satisfies readonly { path: string; label: string; icon: IconName }[];

export const pages = {
  "/": {
    title: "今天吃什么",
    subtitle: "随机挑一道，喜欢就留下",
    tab: "/",
    parent: "/",
  },
  "/dishes": {
    title: "菜谱",
    subtitle: "收好拿手菜，让每顿饭都有灵感",
    tab: "/dishes",
    parent: "/",
  },
  "/dishes/search": {
    title: "搜索菜谱", subtitle: "", tab: "/dishes", parent: "/dishes",
  },
  "/restaurants": {
    title: "餐厅",
    subtitle: "",
    tab: "/restaurants",
    parent: "/",
  },
  "/me": {
    title: "我的",
    subtitle: "收好喜欢的味道，记下下一次期待",
    tab: "/me",
    parent: "/",
  },
  "/menu": {
    title: "本次菜单",
    subtitle: "把这次想吃的菜，放在一起",
    tab: "/",
    parent: "/",
  },
  "/me/dislikes": {
    title: "不喜欢",
    subtitle: "记住自己的饮食偏好",
    tab: "/me",
    parent: "/me",
  },
  "/me/notes": {
    title: "随手记",
    subtitle: "记下灵感、采购清单和用餐心情",
    tab: "/me",
    parent: "/me",
  },
  "/me/tags": {
    title: "自动标签",
    subtitle: "按规则整理菜谱，更容易找到想吃的",
    tab: "/me",
    parent: "/me",
  },
  "/me/backup": {
    title: "资料导入",
    subtitle: "把熟悉的菜谱和照片带过来",
    tab: "/me",
    parent: "/me",
  },
  "/plan": {
    title: "AI 配菜单",
    subtitle: "把想法交给 AI，把决定留给自己。",
    tab: "/",
    parent: "/",
  },
  "/me/favorites": {
    title: "我的收藏",
    subtitle: "喜欢的味道，值得再吃一次。",
    tab: "/me",
    parent: "/me",
  },
  "/me/to-cook": {
    title: "想做",
    subtitle: "下一次下厨，从这里挑一道。",
    tab: "/me",
    parent: "/me",
  },
  "/me/to-eat": {
    title: "想吃",
    subtitle: "给下一次出门，留一点期待。",
    tab: "/me",
    parent: "/me",
  },
  "/me/appearance": {
    title: "外观",
    subtitle: "选一个看起来舒服的样子。",
    tab: "/me",
    parent: "/me",
  },
} as const;
export type Route = keyof typeof pages;

function currentPath() {
  return window.location.hash.slice(1) || "/";
}

export function useNavigation() {
  const [path, setPath] = useState(currentPath);
  useEffect(() => {
    const onChange = () => {
      setPath(currentPath());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return { path, page: pages[path as Route] };
}
