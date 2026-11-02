import { useRef, type PointerEvent } from 'react';
import { useMenu } from '../data/MenuProvider';
import type { Recipe } from '../data/menu';
import { Icon } from './Icon';
import { RecipeImage } from './Recipes';

interface PickCardProps {
  recipe: Recipe;
  onAdd: () => void;
  onSkip: () => void;
  onRedraw: () => void;
}

export function PickCard({ recipe, onAdd, onSkip, onRedraw }: PickCardProps) {
  const { commit, saving, setPanel } = useMenu();
  const pointer = useRef<{ x: number; y: number; id: number } | null>(null);
  const ignoreClickUntil = useRef(0);

  function start(event: PointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || saving) return;
    pointer.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function finish(event: PointerEvent<HTMLButtonElement>) {
    const start = pointer.current;
    if (!start || start.id !== event.pointerId) return;
    pointer.current = null;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const distance = Math.max(Math.abs(dx), Math.abs(dy));
    if (distance > 10) ignoreClickUntil.current = performance.now() + 500;
    if (distance < 72 || saving) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) onRedraw();
    } else if (dy < 0) onAdd();
    else onSkip();
  }

  return (
    <article className={`pick-card${recipe.images.length ? '' : ' without-photo'}`}>
      <button
        className="photo-open"
        aria-label={`查看${recipe.name}详情`}
        onPointerDown={start}
        onPointerUp={finish}
        onPointerCancel={() => { pointer.current = null; ignoreClickUntil.current = performance.now() + 500; }}
        onClick={() => {
          if (performance.now() < ignoreClickUntil.current) return;
          setPanel({ type: 'detail', recipeId: recipe.id });
        }}
      >
        <RecipeImage recipe={recipe} large />
      </button>
      <div className="photo-shade" aria-hidden="true" />
      <div className="photo-controls">
        {recipe.favorite && <button
          className="icon-button is-favorite favorite-glass"
          disabled={saving}
          aria-label="取消收藏"
          aria-pressed="true"
          onClick={() => void commit(state => ({
            ...state,
            recipes: state.recipes.map(item => item.id === recipe.id ? { ...item, favorite: false } : item),
          }))}
        >
          <Icon name="heart" size={23} style={{ fill: 'currentColor' }} />
        </button>}
      </div>
      <div className="photo-caption">
        <h2>{recipe.name}</h2>
        {recipe.note && <p>{recipe.note}</p>}
      </div>
    </article>
  );
}
