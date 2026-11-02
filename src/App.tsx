import { useEffect, useRef, useState } from "react";
import { Icon } from "./components/Icon";
import { tabs, useNavigation } from "./navigation";
import { RandomPage } from "./pages/Random";
import { Restaurants } from "./pages/Restaurants";
import { Plan } from "./pages/Plan";
import {
  AppearancePage,
  Collection,
  Personal,
  type Appearance,
} from "./pages/Personal";
import { ActionLink, EmptyState } from "./components/Shared";
import { MenuProvider, useMenu } from "./data/MenuProvider";
import { RecipeLibrary } from "./components/RecipeLibrary";
import { HomePanels, MenuPanel } from "./components/HomePanels";
import logo from "./assets/logo.png?inline";
import { ImportLibrary } from "./pages/ImportLibrary";

export function App() {
  return <MenuProvider><MenuApp /></MenuProvider>;
}
function MenuApp() {
  const { loading, loadFailed } = useMenu();
  const { path, page } = useNavigation();
  const [appearance, setAppearance] = useState<Appearance>("light");
  const title = useRef<HTMLHeadingElement>(null);
  const previousPath = useRef(path);
  useEffect(() => {
    document.documentElement.dataset.appearance = appearance;
  }, [appearance]);
  useEffect(() => {
    document.title = `${page ? page.title : "页面未找到"} · 随机菜单`;
    if (previousPath.current !== path) title.current!.focus();
    previousPath.current = path;
  }, [path, page]);

  let content;
  switch (path) {
    case "/":
      content = <RandomPage />;
      break;
    case "/dishes":
    case "/dishes/search":
      content = <RecipeLibrary searchPage={path === "/dishes/search"} />;
      break;
    case "/restaurants":
      content = <Restaurants />;
      break;
    case "/me":
      content = <Personal appearance={appearance} />;
      break;
    case "/plan":
      content = <Plan />;
      break;
    case "/me/appearance":
      content = <AppearancePage value={appearance} onChange={setAppearance} />;
      break;
    case "/menu":
      content = <MenuPanel />;
      break;
    case "/me/favorites":
      content = <RecipeLibrary favorites />;
      break;
    case "/me/to-cook":
    case "/me/to-eat":
    case "/me/dislikes":
    case "/me/notes":
    case "/me/tags":
      content = <Collection path={path} />;
      break;
    case "/me/backup":
      content = <ImportLibrary />;
      break;
    default:
      content = (
        <EmptyState
          icon="search"
          title="这个页面不在这里"
          description="从随机页重新开始，找点吃饭的灵感。"
        >
          <ActionLink to="/">返回随机页</ActionLink>
        </EmptyState>
      );
  }
  const isRoot = tabs.some((tab) => tab.path === path);
  return (
    <div className={`app-shell${path === "/" ? " home-screen" : ""}${path.startsWith("/dishes") ? " recipes-screen" : ""}${path === "/dishes/search" ? " search-screen" : ""}${path === "/me" ? " personal-screen" : ""}`}>
      <HomePanels />
      <button
        className="skip-link"
        onClick={() => document.getElementById("main")!.focus()}
      >
        跳到主要内容
      </button>
      <aside className="sidebar">
        <a href="#/" className="brand">
          <span className="brand-icon">
            <img src={logo} width="47" height="47" alt="" style={{ borderRadius: 16 }} />
          </span>
          <span>
            随机菜单<small>把喜欢留在菜单</small>
          </span>
        </a>
        <nav aria-label="主要导航" className="main-nav">
          {tabs.map((tab) => (
            <a
              key={tab.path}
              href={`#${tab.path}`}
              className={page?.tab === tab.path ? "active" : ""}
              aria-current={page?.tab === tab.path ? "page" : undefined}
            >
              <Icon name={tab.icon} />
              <span>{tab.label}</span>
            </a>
          ))}
        </nav>
        <div className="sidebar-note">
          <Icon name="leaf" size={20} />
          <p>
            生活的好滋味
            <br />
            藏在每一顿饭里。
          </p>
        </div>
      </aside>
      <main id="main" className="main-content" tabIndex={-1}>
        <header className="page-header">
          {!isRoot && (
            <a
              className="back-button"
              href={`#${page?.parent ?? "/"}`}
              aria-label="返回上一级"
            >
              <Icon name="back" />
            </a>
          )}
          <div>
            <h1 ref={title} tabIndex={-1}>
              {page?.title ?? "页面未找到"}
            </h1>
            {path !== "/me" && path !== "/dishes" && path !== "/restaurants" && <p>{page?.subtitle ?? "换个方向，继续逛逛。"}</p>}
          </div>
          {path === "/dishes" && <a className="search-field recipe-header-search" href="#/dishes/search" aria-label="搜索菜谱"><Icon name="search" size={19} /><span>搜索菜谱</span></a>}
        </header>
        <div className="page-content">
          {loading && path !== "/me/backup" ? <div className="loading-state" role="status">正在读取菜谱…</div> : loadFailed && path !== "/me/backup" ? <div className="loading-state"><ActionLink to="/me/backup">重新导入资料</ActionLink></div> : content}
        </div>
      </main>
    </div>
  );
}
