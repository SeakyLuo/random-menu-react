import { ActionLink, EmptyState, MenuLink } from "../components/Shared";

export type Appearance = "system" | "light" | "dark";

export function Personal({ appearance }: { appearance: Appearance }) {
  return (
    <>
      <section className="section personal-section">
        <div className="section-heading">
          <h2>饮食清单</h2>
        </div>
        <div className="menu-group">
          <MenuLink
            to="/me/favorites"
            icon="heart"
            title="我的收藏"
          />
          <MenuLink
            to="/me/to-cook"
            icon="dishes"
            title="想做"
          />
          <MenuLink
            to="/me/to-eat"
            icon="restaurant"
            title="想吃"
          />
          <MenuLink
            to="/me/dislikes"
            icon="blocked"
            title="不喜欢"
          />
          <MenuLink
            to="/me/notes"
            icon="note"
            title="随手记"
          />
        </div>
      </section>
      <section className="section">
        <div className="section-heading">
          <h2>偏好设置</h2>
        </div>
        <div className="menu-group">
          <MenuLink
            to="/me/appearance"
            icon="appearance"
            title="外观"
            value={{ system: "跟随系统", light: "浅色", dark: "深色" }[appearance]}
          />
          <MenuLink
            to="/me/tags"
            icon="sparkles"
            title="自动标签"
          />
        </div>
      </section>
      <section className="section">
        <div className="section-heading">
          <h2>数据管理</h2>
        </div>
        <div className="menu-group">
          <MenuLink
            to="/me/backup"
            icon="archive"
            title="资料导入"
            detail="导入菜谱、餐厅、记录和照片"
          />
        </div>
      </section>
    </>
  );
}

export function AppearancePage({
  value,
  onChange,
}: {
  value: Appearance;
  onChange: (value: Appearance) => void;
}) {
  const options = [
    { value: "system", title: "跟随系统", detail: "随设备外观自动切换" },
    { value: "light", title: "浅色", detail: "清爽明亮" },
    { value: "dark", title: "深色", detail: "柔和深邃" },
  ] as const;
  return (
    <fieldset className="appearance-options">
      <legend className="sr-only">选择外观</legend>
      {options.map((option) => (
        <label
          className={`appearance-option ${option.value === value ? "selected" : ""}`}
          key={option.value}
        >
          <span className={`theme-preview ${option.value}`} aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>
            <strong>{option.title}</strong>
            <small>{option.detail}</small>
          </span>
          <input
            type="radio"
            name="appearance"
            value={option.value}
            checked={option.value === value}
            onChange={() => onChange(option.value)}
          />
        </label>
      ))}
    </fieldset>
  );
}

export function Collection({ path }: { path: string }) {
  const content = {
    "/me/favorites": {
      icon: "heart",
      title: "还没有收藏",
      description: "喜欢的菜谱和餐厅，都可以留在这里。",
      to: "/dishes",
      action: "浏览菜谱",
    },
    "/me/to-cook": {
      icon: "bookmark",
      title: "还没有想做的菜",
      description: "想尝试的菜，会成为下一次下厨的灵感。",
      to: "/dishes",
      action: "去逛菜谱",
    },
    "/me/to-eat": {
      icon: "restaurant",
      title: "还没有想吃的记录",
      description: "把惦记的菜、餐厅和味道，留给下一次期待。",
      to: "/restaurants",
      action: "浏览餐厅",
    },
    "/menu": {
      icon: "dishes",
      title: "本次菜单还是空的",
      description: "从菜谱中挑选喜欢的菜，安排这一餐。",
      to: "/dishes",
      action: "浏览菜谱",
    },
    "/me/dislikes": {
      icon: "blocked",
      title: "记住自己的饮食偏好",
      description: "不喜欢的食材和味道，可以集中记录在这里。偏好记录即将开放。",
      to: "/me",
      action: "返回我的",
    },
    "/me/notes": {
      icon: "note",
      title: "留住一闪而过的灵感",
      description:
        "做菜灵感、采购清单和用餐心情，都值得随手记下。记录功能即将开放。",
      to: "/me",
      action: "返回我的",
    },
    "/me/tags": {
      icon: "sparkles",
      title: "让菜谱整理更轻松",
      description:
        "根据菜名和做法自动添加标签，方便筛选与随机挑选。标签规则即将开放。",
      to: "/dishes",
      action: "浏览菜谱",
    },
    "/me/backup": {
      icon: "archive",
      title: "留住积累的好味道",
      description:
        "备份菜谱、餐厅和用餐记录，也可以从备份恢复。备份与恢复即将开放。",
      to: "/me",
      action: "返回我的",
    },
  } as const;
  const item = content[path as keyof typeof content];
  return (
    <EmptyState
      icon={item.icon}
      title={item.title}
      description={item.description}
    >
      <ActionLink to={item.to} secondary>
        {item.action}
      </ActionLink>
      {path === "/me/favorites" && (
        <ActionLink to="/restaurants" secondary>
          浏览餐厅
        </ActionLink>
      )}
    </EmptyState>
  );
}
