import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useMenu } from '../data/MenuProvider';
import { RestaurantChangedError, fullAddress, money, visitMoment, type Restaurant, type Visit } from '../data/restaurants';
import { moveItem, visitValidation } from '../data/restaurantEditing';
import type { RestaurantPhoto } from '../data/restaurantPhotos';
import { RestaurantPhotoBatch } from './RestaurantPhotos';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { VisitEditor } from './RestaurantForms';
import '../restaurant-editor.css';

export function RestaurantEditor({ restaurant, onClose, onSaved }: {
  restaurant?: Restaurant; onClose: () => void; onSaved: (id: string) => void;
}) {
  const { data, commit, saving, notify } = useMenu();
  const formId = useId();
  const cuisineId = useId();
  const [baseline] = useState(() => JSON.stringify(restaurant));
  const [originalVisits] = useState(() => new Map(restaurant?.visits.map(record => [record.id, JSON.stringify(record)]) ?? []));
  const [draft, setDraft] = useState<Restaurant>(() => restaurant ?? {
    id: crypto.randomUUID(), name: '', cuisine: '',
    addresses: [{ id: crypto.randomUUID(), district: '', address: '' }],
    note: '', link: '', favorite: false, createdAt: Date.now(), visits: [],
  });
  const [dirty, setDirty] = useState(false);
  const [visitEditor, setVisitEditor] = useState<{ visit?: Visit } | null>(null);
  const [visitDirty, setVisitDirty] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [exitRoute, setExitRoute] = useState<string | null>(null);
  const [removal, setRemoval] = useState<{ type: 'address' | 'visit'; id: string } | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoImport, setPhotoImport] = useState<RestaurantPhoto[] | null>(null);
  const leaving = useRef(false);
  const busy = saving || uploading;
  const cuisines = [...new Set(data.restaurants.map(item => item.cuisine))];
  useEffect(() => {
    const originalHash = window.location.hash;
    const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty || visitDirty) event.preventDefault(); };
    const onNavigate = () => {
      if (leaving.current || window.location.hash === originalHash) return;
      if (busy || dirty || visitDirty) {
        const destination = window.location.hash;
        window.history.replaceState(window.history.state, '', originalHash);
        if (!busy) { setExitRoute(destination); setConfirmExit(true); }
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    window.addEventListener('hashchange', onNavigate, true);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      window.removeEventListener('hashchange', onNavigate, true);
    };
  }, [dirty, visitDirty, busy]);
  function update(value: Partial<Restaurant>) { setDirty(true); setDraft(current => ({ ...current, ...value })); }
  function leave() {
    if (busy) return;
    if (photo) { setPhoto(null); return; }
    if (removal) { setRemoval(null); return; }
    if (photoImport) { setPhotoImport(null); return; }
    if (confirmExit) { setConfirmExit(false); setExitRoute(null); return; }
    if (visitEditor ? visitDirty : dirty) setConfirmExit(true);
    else if (visitEditor) setVisitEditor(null);
    else onClose();
  }
  function discard() {
    setConfirmExit(false);
    if (exitRoute !== null) { leaving.current = true; window.location.hash = exitRoute; return; }
    if (visitEditor) { setVisitEditor(null); setVisitDirty(false); }
    else onClose();
  }
  function openVisit(visit?: Visit) {
    if (draft.addresses.some(item => !item.district.trim() || !item.address.trim())) { notify('请先补全餐厅地址，或移除空地址'); return; }
    setVisitDirty(false); setVisitEditor({ visit });
  }
  function removeAddress(id: string) {
    const address = draft.addresses.find(item => item.id === id)!;
    if (draft.visits.some(record => record.address === fullAddress(address))) setRemoval({ type: 'address', id });
    else update({ addresses: draft.addresses.filter(item => item.id !== id) });
  }
  function importPhotoVisits(useDates: boolean) {
    const groups = new Map<string, RestaurantPhoto[]>();
    for (const image of photoImport!) {
      const key = useDates ? image.shotAt?.date ?? 'undated' : 'one';
      groups.set(key, [...(groups.get(key) ?? []), image]);
    }
    const records: Visit[] = [...groups.values()].map(photos => {
      const shot = useDates ? photos.flatMap(image => image.shotAt ? [image.shotAt] : []).sort((a, b) => a.time.localeCompare(b.time))[0] : undefined;
      return { id: crypto.randomUUID(), date: shot?.date ?? '', time: shot?.time ?? '', autoCost: false,
        people: 1, companions: '', totalCents: null, note: '', images: [],
        address: draft.addresses.length === 1 ? fullAddress(draft.addresses[0]) : '',
        foods: photos.map(image => ({ id: crypto.randomUUID(), name: '', priceCents: null, quantity: 1, note: '', image: image.image, images: [image.image] })),
      };
    });
    update({ visits: [...draft.visits, ...records] }); setPhotoImport(null);
    notify('照片已生成消费草稿，请逐笔填写日期、菜名并核对金额');
  }
  function finishVisit(record: Visit) {
    update({ visits: visitEditor!.visit ? draft.visits.map(item => item.id === record.id ? record : item) : [...draft.visits, record] });
    setVisitEditor(null);
    setVisitDirty(false);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.name.trim() || !draft.cuisine.trim()) { notify('请填写店名和菜系'); return; }
    if (draft.addresses.some(item => !item.district.trim() || !item.address.trim())) {
      notify('请补全地址，或移除不需要的地址'); return;
    }
    for (const record of draft.visits) {
      if (originalVisits.get(record.id) === JSON.stringify(record)) continue;
      const error = visitValidation(record);
      if (error || draft.addresses.length > 0 && !record.address) {
        setVisitEditor({ visit: record }); setVisitDirty(false);
        notify(error ?? '请选择这笔消费的用餐地址'); return;
      }
    }
    if (draft.link.trim()) {
      try { const url = new URL(draft.link.trim()); if (!['https:', 'http:'].includes(url.protocol)) throw new Error(); }
      catch { notify('请填写完整的 http 或 https 链接'); return; }
    }
    const item: Restaurant = {
      ...draft, name: draft.name.trim(), cuisine: draft.cuisine.trim(), note: draft.note.trim(), link: draft.link.trim(),
      addresses: draft.addresses.map(address => ({ ...address, district: address.district.trim(), address: address.address.trim() })),
    };
    const ok = await commit(current => {
      if (restaurant && JSON.stringify(current.restaurants.find(old => old.id === restaurant.id)) !== baseline) throw new RestaurantChangedError();
      return { ...current, restaurants: restaurant ? current.restaurants.map(old => old.id === item.id ? item : old) : [...current.restaurants, item] };
    }, restaurant ? '餐厅资料已保存' : '已添加餐厅');
    if (ok) onSaved(item.id);
  }
  const overlay = Boolean(confirmExit || removal || photoImport || photo);
  return <Sheet fullscreen title={photo ? '查看照片' : photoImport ? '从照片记一笔' : removal ? removal.type === 'visit' ? '移除消费记录？' : '移除分店地址？' : confirmExit ? '放弃未保存的内容？' : visitEditor ? visitEditor.visit ? '编辑消费记录' : '记一笔' : '探店记录'}
    view={photo ? 'record-photo' : photoImport ? 'record-import' : removal ? 'record-remove' : confirmExit ? 'record-confirm' : visitEditor ? `record-visit-${visitEditor.visit?.id ?? 'new'}` : 'record-editor'}
    onClose={leave} onBack={visitEditor || photo || photoImport || removal ? leave : undefined} closeDisabled={busy}>
    {photo && <img className="restaurant-photo-preview" src={photo} alt="照片预览" />}
    {photoImport && <div className="restaurant-confirm record-confirm"><p>已选择 {photoImport.length} 张照片，每张照片会生成一道待填写菜品。</p><p>可使用照片中已有的拍摄时间按日期分组；没有拍摄时间的记录需要手动填写日期。餐厅地址仍需自行核对。</p><div className="record-import-options"><button className="button primary" disabled={!photoImport.some(image => image.shotAt)} onClick={() => importPhotoVisits(true)}>使用拍摄时间分组</button><button className="button secondary" onClick={() => importPhotoVisits(false)}>合为一笔，手填日期</button><button className="text-button" onClick={() => setPhotoImport(null)}>返回编辑</button></div></div>}
    {removal && <div className="restaurant-confirm record-confirm"><p>{removal.type === 'address' ? '这处分店已有消费记录。移除后，历史记录仍会保留当时的完整地址。' : '这笔消费及其菜品和照片将从本次编辑中移除，保存餐厅后生效。'}</p><div className="sheet-actions"><button className="button secondary" onClick={() => setRemoval(null)}>保留</button><button className="button primary" onClick={() => { if (removal.type === 'visit') update({ visits: draft.visits.filter(item => item.id !== removal.id) }); else update({ addresses: draft.addresses.filter(item => item.id !== removal.id) }); setRemoval(null); }}>确认移除</button></div></div>}
    {confirmExit && <div className="restaurant-confirm record-confirm"><p>{visitEditor ? '这次消费记录的修改尚未完成。' : '餐厅资料和消费记录的修改尚未保存。'}</p>
      <div className="sheet-actions"><button className="button secondary" onClick={() => { setConfirmExit(false); setExitRoute(null); }}>继续编辑</button><button className="button primary" onClick={discard}>放弃修改</button></div>
    </div>}
    <div hidden={Boolean(visitEditor || overlay)}>
      <form id={formId} className="recipe-form restaurant-form record-form" noValidate onSubmit={submit}>
        <fieldset disabled={busy}>
          <label className="form-label">店名<input aria-label="店名" placeholder="输入餐厅名称" maxLength={100} value={draft.name} onChange={event => update({ name: event.target.value })} /></label>
          <label className="form-label">菜系<input aria-label="菜系" list={cuisineId} placeholder="填写菜系，如川菜、烤肉" maxLength={30} value={draft.cuisine} onChange={event => update({ cuisine: event.target.value })} /></label>
          <datalist id={cuisineId}>{cuisines.map(cuisine => <option key={cuisine} value={cuisine} />)}</datalist>
          <label className="record-favorite"><Icon name="heart" size={21} /><span>收藏这家餐厅</span><input type="checkbox" checked={draft.favorite} onChange={event => update({ favorite: event.target.checked })} /></label>
          <section className="record-addresses" aria-label="餐厅地址">
            <div className="record-section-heading"><h3>地址</h3><button className="text-button" type="button" onClick={() => update({ addresses: [...draft.addresses, { id: crypto.randomUUID(), district: '', address: '' }] })}><Icon name="plus" size={18} />添加地址</button></div>
            {draft.addresses.map((address, index) => <div className="record-address" key={address.id}>
              <div className="record-address-fields">
                <input aria-label={`地址 ${index + 1} 省市区`} placeholder="填写省市区" maxLength={80} value={address.district} onChange={event => update({ addresses: draft.addresses.map(item => item.id === address.id ? { ...item, district: event.target.value } : item) })} />
                <input aria-label={`地址 ${index + 1} 具体地址`} placeholder="街道、门牌号或商场楼层" maxLength={200} value={address.address} onChange={event => update({ addresses: draft.addresses.map(item => item.id === address.id ? { ...item, address: event.target.value } : item) })} />
              </div>
              <div className="record-address-actions"><button type="button" aria-label={`上移地址 ${index + 1}`} disabled={index === 0} onClick={() => update({ addresses: moveItem(draft.addresses, index, -1) })}>上移</button><button type="button" aria-label={`下移地址 ${index + 1}`} disabled={index === draft.addresses.length - 1} onClick={() => update({ addresses: moveItem(draft.addresses, index, 1) })}>下移</button><button type="button" aria-label={`移除地址 ${index + 1}`} onClick={() => removeAddress(address.id)}>移除</button></div>
            </div>)}
            {draft.addresses.length === 0 && <p className="record-address-hint">还没有地址，可稍后补充</p>}
          </section>
          <label className="form-label">评价 <span>选填</span><textarea aria-label="评价" rows={3} placeholder="口味、环境、服务，记下你的感受…" maxLength={3000} value={draft.note} onChange={event => update({ note: event.target.value })} /></label>
          <label className="form-label">链接 <span>选填</span><input aria-label="餐厅链接" type="url" placeholder="粘贴商家链接" maxLength={2000} value={draft.link} onChange={event => update({ link: event.target.value })} /></label>
          <section className="record-consumption" aria-label="消费记录">
            <div className="record-section-heading"><h3>消费记录</h3><button className="text-button" type="button" onClick={() => openVisit()}><Icon name="plus" size={18} />记一笔</button></div>
            <RestaurantPhotoBatch label="从照片记一笔" disabled={busy} onBusy={setUploading} onPhotos={setPhotoImport} />
            {draft.visits.length > 0 ? <div className="record-visit-list">{[...draft.visits].sort((a, b) => visitMoment(b).localeCompare(visitMoment(a))).map(record => <div className="record-visit-row" key={record.id}><button type="button" onClick={() => openVisit(record)} aria-label={`编辑 ${record.date} ${record.time} 消费记录`}>
              <span><strong>{record.date ? record.date.replaceAll('-', '.') : '待选择日期'}{record.time && ' ' + record.time}</strong><small>{record.people} 人{record.foods.length > 0 ? ` · ${record.foods.length} 道菜` : ''}</small></span>
              <b>{record.totalCents === null ? '金额未记录' : `¥${money(record.totalCents)}`}</b><Icon name="chevron" size={18} />
            </button><button type="button" className="record-remove-visit" aria-label={`移除 ${record.date} ${record.time} 消费记录`} onClick={() => setRemoval({ type: 'visit', id: record.id })}>移除</button></div>)}</div> : <div className="record-empty"><Icon name="note" size={34} /><p>还没有消费记录</p><small>记下吃过的菜和这次花费</small></div>}
          </section>
        </fieldset>
      </form>
    </div>
    {visitEditor && <div hidden={overlay} className="record-visit-editor"><VisitEditor key={visitEditor.visit?.id ?? 'new'}
      formId={`${formId}-visit`} restaurant={draft} visit={visitEditor.visit} onPreview={setPhoto}
      onDirty={() => setVisitDirty(true)} onBusy={setUploading} onSaved={() => {}} onDraftSaved={finishVisit} />
    </div>}
    {!overlay && <div className="sheet-actions record-bottom-actions"><button className="button primary" type="submit" form={visitEditor ? `${formId}-visit` : formId} disabled={busy}>{saving ? '保存中…' : visitEditor ? '完成这笔记录' : '保存餐厅'}</button></div>}
  </Sheet>;
}
