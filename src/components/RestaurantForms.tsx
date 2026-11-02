import { useRef, useState, type FormEvent } from 'react';
import { useMenu } from '../data/MenuProvider';
import { RestaurantChangedError, fullAddress, money, type Restaurant, type Visit, type RestaurantFood } from '../data/restaurants';
import { companionNames } from '../data/restaurantQuery';
import { foodTotal, moveItem, parseAmount, visitValidation } from '../data/restaurantEditing';
import type { RestaurantPhoto } from '../data/restaurantPhotos';
import { RestaurantPhotos, RestaurantPhotoBatch } from './RestaurantPhotos';
import { Icon } from './Icon';

interface FoodDraft extends Omit<RestaurantFood, 'priceCents'> { price: string }
function nowParts() {
  const now = new Date();
  return { date: now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0'),
    time: String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') };
}
export function VisitEditor({ restaurant, visit, onDirty, onSaved, onBusy, onDraftSaved, formId, onPreview }: {
  restaurant: Restaurant; visit?: Visit; onDirty: () => void; onSaved: () => void; onBusy: (busy: boolean) => void;
  onDraftSaved?: (record: Visit) => void; formId?: string; onPreview: (src: string) => void;
}) {
  const { data, commit, saving, notify } = useMenu();
  const [baseline] = useState(() => JSON.stringify(restaurant));
  const [moment] = useState(nowParts);
  const [date, setDate] = useState(visit?.date ?? moment.date);
  const [time, setTime] = useState(visit?.time ?? moment.time);
  const [people, setPeople] = useState(String(visit?.people ?? 1));
  const [companions, setCompanions] = useState(visit?.companions ?? '');
  const [total, setTotal] = useState(visit?.totalCents === null || visit === undefined ? '' : String(visit.totalCents / 100));
  const [autoCost, setAutoCost] = useState(visit?.autoCost ?? false);
  const [address, setAddress] = useState(visit?.address ?? (restaurant.addresses.length === 1 ? fullAddress(restaurant.addresses[0]) : ''));
  const [note, setNote] = useState(visit?.note ?? '');
  const [images, setImages] = useState(visit?.images ?? []);
  const [foods, setFoods] = useState<FoodDraft[]>(() => visit?.foods.map(({ priceCents, ...food }) => ({ ...food, price: priceCents === null ? '' : String(priceCents / 100) })) ?? []);
  const [removedFood, setRemovedFood] = useState<{ food: FoodDraft; index: number } | null>(null);
  const [photoDates, setPhotoDates] = useState<{ date: string; time: string }[]>([]);
  const [companionSearch, setCompanionSearch] = useState('');
  const [uploads, setUploads] = useState<string[]>([]);
  const pendingUploads = useRef(new Set<string>());
  const parsedFoods = foods.map(({ price, ...food }) => ({ ...food, name: food.name.trim(), note: food.note.trim(), priceCents: parseAmount(price) }));
  const calculated = foodTotal(parsedFoods);
  const totalCents = autoCost ? calculated : parseAmount(total);
  const knownNames = [...new Set(data.restaurants.flatMap(item => item.visits.flatMap(record => companionNames(record.companions))))];
  const pickedNames = companionNames(companions);
  function busy(id: string, value: boolean) {
    if (value) pendingUploads.current.add(id); else pendingUploads.current.delete(id);
    setUploads([...pendingUploads.current]); onBusy(pendingUploads.current.size > 0);
  }
  function updateFood(id: string, update: Partial<FoodDraft>) { onDirty(); setFoods(current => current.map(food => food.id === id ? { ...food, ...update } : food)); }
  function photoFoods(photos: RestaurantPhoto[]) {
    onDirty();
    setFoods(current => [...current, ...photos.map(photo => ({ id: crypto.randomUUID(), name: '', price: '', quantity: 1, note: '', image: photo.image, images: [photo.image] }))]);
    const moments = new Map<string, { date: string; time: string }>();
    for (const photo of photos) if (photo.shotAt) {
      const existing = moments.get(photo.shotAt.date);
      if (!existing || photo.shotAt.time < existing.time) moments.set(photo.shotAt.date, photo.shotAt);
    }
    setPhotoDates([...moments.values()].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)));
    notify('照片已添加为待填写菜品，请补充菜名，并核对用餐日期');
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (uploads.length) return;
    const record: Visit = { id: visit?.id ?? crypto.randomUUID(), date, time, autoCost, people: Number(people), companions: companions.trim(),
      totalCents, address, note: note.trim(), images, foods: parsedFoods };
    const error = visitValidation(record);
    if (error) { notify(error); return; }
    if (restaurant.addresses.length && !address) { notify('请选择用餐地址'); return; }
    if (onDraftSaved) { onDraftSaved(record); return; }
    const ok = await commit(current => {
      if (JSON.stringify(current.restaurants.find(item => item.id === restaurant.id)) !== baseline) throw new RestaurantChangedError();
      return { ...current, restaurants: current.restaurants.map(item => item.id === restaurant.id ? { ...item, visits: visit ? item.visits.map(old => old.id === visit.id ? record : old) : [...item.visits, record] } : item) };
    }, visit ? '消费记录已保存' : '已记下这次用餐');
    if (ok) onSaved();
  }
  const addressOptions = [...new Set([...restaurant.addresses.map(fullAddress), ...(visit?.address ? [visit.address] : [])])];
  return <form id={formId} className="recipe-form restaurant-form visit-form" noValidate onSubmit={submit} onChange={onDirty}>
    <fieldset disabled={saving || uploads.length > 0}>
      <p className="sheet-description">{restaurant.name}</p>
      <div className="restaurant-form-grid">
        <label className="form-label">用餐日期 <span>必填</span><input aria-label="用餐日期" type="date" value={date} onChange={event => setDate(event.target.value)} /></label>
        <label className="form-label">用餐时间 <span>选填</span><input aria-label="用餐时间" type="time" value={time} onChange={event => setTime(event.target.value)} /></label>
      </div>
      <label className="form-label">用餐人数 <span>含自己</span><input aria-label="用餐人数" type="number" inputMode="numeric" min="1" max="10000" value={people} onChange={event => setPeople(event.target.value)} /></label>
      <label className="form-label">总消费 <span>实际支付金额</span><input aria-label="总消费" inputMode="decimal" placeholder={autoCost ? '待补全菜品单价' : '¥ 未记录'} value={autoCost ? calculated === null ? '' : String(calculated / 100) : total} onChange={event => { setAutoCost(false); setTotal(event.target.value); }} /></label>
      <label className="restaurant-auto-cost"><input type="checkbox" checked={autoCost} onChange={event => setAutoCost(event.target.checked)} /><span>按菜品单价 × 数量自动计算</span></label>
      <p className="restaurant-edit-hint">{autoCost ? calculated === null ? '合计待补全：请填写每道菜的单价和数量；手填金额会切换为手动。' : '添加、删除或修改菜品后实时重算；手填金额会切换为手动。' : '开启自动计算会按当前菜品重新合计；关闭后保留手填金额。'}</p>
      {totalCents !== null && Number.isFinite(totalCents) && Number(people) > 0 && <p className="restaurant-form-hint">本次人均 ¥{money(Math.round(totalCents / Number(people)))}</p>}
      {addressOptions.length > 0 && <label className="form-label">用餐地址<select aria-label="用餐地址" value={address} onChange={event => setAddress(event.target.value)}><option value="">请选择分店</option>{addressOptions.map(value => <option value={value} key={value}>{value}</option>)}</select></label>}
      <label className="form-label">同行者 <span>多人用逗号或顿号分隔</span><input aria-label="同行者" placeholder="例如：小林、小陈" maxLength={300} value={companions} onChange={event => setCompanions(event.target.value)} /></label>
      {knownNames.some(name => !pickedNames.includes(name)) && <details className="restaurant-known-companions"><summary>选择已记录的饭伙</summary><input aria-label="查找已记录饭伙" type="search" placeholder="输入姓名查找" value={companionSearch} onChange={event => { event.stopPropagation(); setCompanionSearch(event.target.value); }} onKeyDown={event => { if (event.key === 'Enter') event.preventDefault(); }} /><div>{knownNames.filter(name => !pickedNames.includes(name) && name.toLocaleLowerCase().includes(companionSearch.trim().toLocaleLowerCase())).slice(0, 12).map(name => <button type="button" key={name} onClick={() => { onDirty(); const next = [...pickedNames, name]; setCompanions(next.join('、')); if (Number(people) < next.length + 1) setPeople(String(next.length + 1)); }}>{name}<Icon name="plus" size={15} /></button>)}</div></details>}
      <label className="form-label">用餐评价 <span>选填</span><textarea aria-label="用餐评价" placeholder="味道、服务，或下次想再点的菜…" rows={3} maxLength={5000} value={note} onChange={event => setNote(event.target.value)} /></label>
      <div className="restaurant-section-title"><h3>吃了什么</h3><span>选填</span></div>
      {foods.map((food, index) => <section className="food-editor" key={food.id}>
        <div className="restaurant-food-heading"><strong>菜品 {index + 1}</strong><div>
          <button type="button" aria-label={'上移菜品 ' + (index + 1)} disabled={index === 0} onClick={() => { onDirty(); setFoods(moveItem(foods, index, -1)); }}>上移</button>
          <button type="button" aria-label={'下移菜品 ' + (index + 1)} disabled={index === foods.length - 1} onClick={() => { onDirty(); setFoods(moveItem(foods, index, 1)); }}>下移</button>
          <button type="button" aria-label={'移除菜品 ' + (index + 1)} onClick={() => { onDirty(); setRemovedFood({ food, index }); setFoods(foods.filter(item => item.id !== food.id)); }}>移除</button>
        </div></div>
        <label className="form-label">菜品名称<input aria-label={'菜品 ' + (index + 1) + ' 名称'} placeholder="例如：炭烧鳗鱼" maxLength={80} value={food.name} onChange={event => updateFood(food.id, { name: event.target.value })} /></label>
        <div className="restaurant-form-grid"><label className="form-label">单价 <span>选填</span><input aria-label={'菜品 ' + (index + 1) + ' 单价'} inputMode="decimal" placeholder="¥ 未记录" value={food.price} onChange={event => updateFood(food.id, { price: event.target.value })} /></label>
          <label className="form-label">数量<input aria-label={'菜品 ' + (index + 1) + ' 数量'} type="number" inputMode="numeric" min="1" max="10000" value={food.quantity || ''} onChange={event => updateFood(food.id, { quantity: Number(event.target.value) })} /></label></div>
        <label className="form-label">菜品备注<input aria-label={'菜品 ' + (index + 1) + ' 备注'} placeholder="份量、口味、推荐理由…" maxLength={1000} value={food.note} onChange={event => updateFood(food.id, { note: event.target.value })} /></label>
        <div className="restaurant-edit-label">菜品照片 <span>第一张为封面，最多 12 张</span></div>
        <RestaurantPhotos images={food.images} cover onPreview={onPreview} onBusy={value => busy(food.id, value)} onChange={photos => updateFood(food.id, { images: photos, image: photos[0] ?? '' })} />
      </section>)}
      {removedFood && <button type="button" className="text-button" onClick={() => { onDirty(); const next = [...foods]; next.splice(removedFood.index, 0, removedFood.food); setFoods(next); setRemovedFood(null); }}>撤销移除菜品</button>}
      <button type="button" className="add-menu-row" onClick={() => { onDirty(); setFoods([...foods, { id: crypto.randomUUID(), name: '', price: '', quantity: 1, note: '', image: '', images: [] }]); }}><Icon name="plus" size={22} />添加菜品</button>
      <RestaurantPhotoBatch label="批量添加菜品照片" onBusy={value => busy('batch', value)} onPhotos={photoFoods} />
      {photoDates.length > 0 && <div className="restaurant-photo-dates"><p>照片中的拍摄时间，可选用作这次用餐时间：</p>{photoDates.map(shot => <button type="button" key={shot.date} onClick={() => { onDirty(); setDate(shot.date); setTime(shot.time); }}>使用 {shot.date} {shot.time}</button>)}</div>}
      <div className="restaurant-section-title"><h3>用餐环境</h3><span>选填 · 最多 12 张</span></div>
      <RestaurantPhotos images={images} onPreview={onPreview} onBusy={value => busy('environment', value)} onChange={photos => { onDirty(); setImages(photos); }} />
    </fieldset>
    {!onDraftSaved && <div className="sheet-actions"><button type="submit" className="button primary" disabled={saving || uploads.length > 0}>{saving ? '正在保存…' : '保存记录'}</button></div>}
  </form>;
}
