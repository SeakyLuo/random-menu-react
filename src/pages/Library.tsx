import { useState } from "react";
import { Icon } from "../components/Icon";
import { ActionLink, EmptyState } from "../components/Shared";

export function Library({ restaurant = false }: { restaurant?: boolean }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("全部");
  const categories = restaurant
    ? ["全部", "想吃", "去过", "收藏"]
    : ["全部", "想做", "做过", "收藏"];
  return (
    <>
      <div className="library-toolbar">
        <label className="search-field">
          <Icon name="search" size={21} />
          <input
            type="search"
            aria-label={restaurant ? "搜索餐厅" : "搜索菜品"}
            placeholder={restaurant ? "搜索餐厅、菜系" : "搜索菜名、食材"}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>
      <div
        className="filter-tabs"
        aria-label={restaurant ? "餐厅分类" : "菜品分类"}
      >
        {categories.map((item) => (
          <button
            key={item}
            className={category === item ? "selected" : ""}
            aria-pressed={category === item}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="library-body">
        <EmptyState
          icon={query ? "search" : restaurant ? "restaurant" : "dishes"}
          title={
            query
              ? "没有找到相关内容"
              : category === "全部"
                ? restaurant
                  ? "记下值得再去的餐厅"
                  : "从一道喜欢的菜开始"
                : `还没有${category === "收藏" ? "收藏" : category}的${restaurant ? "餐厅" : "菜"}`
          }
          description={
            query
              ? "试试其他关键词，或查看全部内容。"
              : restaurant
                ? "收集喜欢的餐厅，让下次出门少一点纠结。"
                : "收集拿手菜和想尝试的味道，让每天的选择更轻松。"
          }
        >
          {query ? (
            <button
              className="button secondary"
              onClick={() => {
                setQuery("");
                setCategory("全部");
              }}
            >
              查看全部
            </button>
          ) : (
            <>
              <p className="availability">
                {restaurant ? "餐厅记录" : "菜品录入"}即将开放
              </p>
              <ActionLink to={"/"} secondary>
                {"去随机页看看"}
              </ActionLink>
            </>
          )}
        </EmptyState>
      </div>
    </>
  );
}
