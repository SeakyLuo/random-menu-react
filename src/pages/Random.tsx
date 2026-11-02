import { Icon } from '../components/Icon';
import { EmptyState } from '../components/Shared';
import { RecipeImage, RecipeRow } from '../components/Recipes';
import { PickCard } from '../components/PickCard';
import { useMenu } from '../data/MenuProvider';
import { eligible, matches, newRound, type Recipe } from '../data/menu';
export function RandomPage() {
  const { data, commit, saving, setPanel, notify } = useMenu();
  const recipes = new Map(data.recipes.map(recipe => [recipe.id, recipe]));
  const current = data.queue.map(id => recipes.get(id)!).find(recipe => eligible(recipe, data));
  const menu = data.menuIds.map(id => recipes.get(id)!);
  const matching = data.recipes.filter(recipe => matches(recipe, data.filters));
  const available = matching.filter(recipe => eligible(recipe, data));
  const hidden = matching.filter(recipe => recipe.hiddenRounds > 0 && !data.menuIds.includes(recipe.id));
  const filterCount = data.filters.preferred.length + data.filters.excluded.length;
  function next(recipe: Recipe, add: boolean) {
    void commit(state => ({ ...state, queue: state.queue.filter(id => id !== recipe.id), menuIds: add ? [...state.menuIds, recipe.id] : state.menuIds }), add ? '已加入本次菜单' : undefined);
  }
  function redraw() {
    void commit(state => newRound(state));
  }
  return <div className={`random-home${current ? ' is-picking' : ''}`}>
    <div className="pick-toolbar">
      <button aria-label="筛选菜谱" title="筛选菜谱" onClick={() => setPanel({ type: 'filter' })} className={`pick-filter${filterCount ? ' has-filter' : ''}`}><Icon name="filter" size={21} /></button>
      <button className="pick-menu" aria-label={`本次菜单 ${menu.length}`} onClick={() => setPanel({ type: 'menu' })}>
        <span className="menu-button-title">本次菜单</span>
        {menu.length > 0 && <span className="menu-button-photos" aria-hidden="true">{menu.slice(0, 3).map(recipe => <RecipeImage key={recipe.id} recipe={recipe} />)}</span>}
        <span className="count-badge">{menu.length}</span>
      </button>
      <button className="pick-redraw" aria-label="重新抽取" title="重新抽取" disabled={saving || !data.recipes.length} onClick={redraw}><Icon name="redraw" size={21} /></button>
    </div>
    {current ? <>
      <PickCard recipe={current} onAdd={() => next(current, true)} onSkip={() => next(current, false)} onRedraw={redraw} />
      <div className="pick-action-area">
        <div className="pick-actions"><button className="button secondary" disabled={saving} onClick={() => next(current, false)}><Icon name="close" size={21} />这次跳过</button><button className="button primary" disabled={saving} onClick={() => next(current, true)}><Icon name="check" size={21} />加入菜单</button></div>
      </div>
    </> : !data.recipes.length ? <section className="random-stage"><EmptyState icon="book" title="从一道拿手菜开始" description="记下喜欢的菜，下一餐就交给随机。"><button className="button primary" onClick={() => setPanel({ type: 'editor' })}><Icon name="plus" size={19} />添加我的菜谱</button></EmptyState></section>
      : !matching.length ? <section className="random-stage"><EmptyState icon="filter" title="换个口味，继续挑" description="现有菜谱里没有符合这次筛选的菜，可以减少想吃的标签或调整排除项。"><button className="button primary" onClick={() => setPanel({ type: 'filter' })}>调整筛选</button><button className="button secondary" disabled={saving} onClick={() => void commit(state => newRound({ ...state, filters: { preferred: [], excluded: [] } }, false))}>清除筛选</button></EmptyState></section>
        : <section className="round-end">
          <div className="round-mark"><Icon name="check" size={32} /></div>
          <h2>{hidden.length && !available.length ? '这些菜暂时休息一下' : '这一轮挑完了'}</h2>
          <p>{hidden.length && !available.length ? '可以恢复暂时隐藏的菜，或从菜谱里直接添加。' : '已选的菜会保留，重新抽取也不会重复。'}</p>
          {menu.length > 0 && <div className="menu-preview"><h3>本次菜单 <span>· {menu.length} 道菜</span></h3>{menu.slice(0, 2).map(recipe => <RecipeRow key={recipe.id} recipe={recipe} onOpen={() => setPanel({ type: 'detail', recipeId: recipe.id })} />)}{menu.length > 2 && <button className="text-button" onClick={() => setPanel({ type: 'menu' })}>查看全部 {menu.length} 道菜</button>}</div>}
          <div className="round-actions">
            {!hidden.length && <button className="button primary" disabled={saving} onClick={() => { if (available.length) void commit(state => newRound(state)); else notify('符合条件的菜已全部加入菜单，可移出菜品后再抽'); }}>再抽一轮</button>}
            {hidden.length > 0 && <button className="button primary" disabled={saving} onClick={() => void commit(state => newRound({ ...state, recipes: state.recipes.map(recipe => ({ ...recipe, hiddenRounds: 0 })) }, false), '已恢复抽取')}>恢复暂时隐藏的菜</button>}
            <button className="button secondary" onClick={() => setPanel({ type: 'menu' })}>{menu.length ? '查看本次菜单' : '自己添加菜品'}</button>
            <button className="text-button" onClick={() => setPanel({ type: 'filter' })}>调整筛选</button>
          </div>
        </section>}

  </div>;
}
