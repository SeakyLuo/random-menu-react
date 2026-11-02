import { Icon } from './Icon';
import { EmptyState } from './Shared';
import { useMenu } from '../data/MenuProvider';
import { averageCost, averageVisitCost, fullAddress, money, restaurantFoods, visitMoment, type Restaurant, type Visit } from '../data/restaurants';

export function RestaurantCard({ restaurant, visits, scoped, onOpen, onFavorite }: { restaurant: Restaurant; visits: Visit[]; scoped: boolean; onOpen: () => void; onFavorite: () => void }) {
  const { saving } = useMenu();
  const cost = averageVisitCost(visits);
  const foods = restaurantFoods({ visits }).filter(food => food.image).slice(0, 12);
  return <article className="restaurant-card">
    <div className="restaurant-card-heading"><button className="restaurant-card-open" onClick={onOpen}><h2>{restaurant.name}</h2></button>
      <button className={`icon-button ${restaurant.favorite ? 'is-favorite' : ''}`} aria-label={`${restaurant.favorite ? '取消收藏' : '收藏'}${restaurant.name}`} aria-pressed={restaurant.favorite} disabled={saving} onClick={onFavorite}><Icon name="heart" style={{ fill: restaurant.favorite ? 'currentColor' : 'none' }} /></button></div>
    <button className="restaurant-card-info" onClick={onOpen}>
      <span className="restaurant-meta">{restaurant.cuisine}<i />{cost === null ? '未记录人均' : `人均 ¥${money(cost)}`}</span>
      <span className="restaurant-card-scope">{scoped ? `当前条件下 · ${visits.length} 次用餐` : `到店 ${visits.length} 次`}</span>
      <span className="restaurant-address"><Icon name="restaurant" size={16} />{restaurant.addresses.length ? fullAddress(restaurant.addresses[0]) : '地址待补充'}{restaurant.addresses.length > 1 && <small>等 {restaurant.addresses.length} 家分店</small>}</span>
    </button>
    {foods.length > 0 ? <div className="restaurant-food-strip">{foods.map(food => <button key={food.id} onClick={onOpen}><img src={food.image} alt={food.name} loading="lazy" decoding="async" /><strong>{food.name}</strong>{food.note && <span>{food.note}</span>}</button>)}</div>
      : <button className="restaurant-no-photos" onClick={onOpen}><Icon name={restaurant.visits.length ? 'note' : 'restaurant'} size={19} /><span>{restaurant.visits.length ? '查看用餐记录' : '还没去过，留给下一次期待'}</span><Icon name="chevron" size={17} /></button>}
  </article>;
}

export function RestaurantDetail({ restaurant, scoped, onPreview, onEdit, onVisit, onDelete, onDeleteVisit }: {
  restaurant: Restaurant; scoped: boolean; onPreview: (images: string[], index: number) => void; onEdit: () => void; onVisit: (visit?: Visit) => void; onDelete: () => void; onDeleteVisit: (visit: Visit) => void;
}) {
  const { commit, saving, notify } = useMenu();
  const cost = averageCost(restaurant);
  return <div className="restaurant-detail">
    <h3 className="restaurant-detail-name">{restaurant.name}</h3>
    <p className="restaurant-meta">{restaurant.cuisine}<i />{cost === null ? '未记录人均' : `人均 ¥${money(cost)}`}</p>
    <div className="restaurant-addresses">{restaurant.addresses.map(address => <div key={address.id}><span>{fullAddress(address)}</span><button className="icon-button" aria-label={`复制地址 ${fullAddress(address)}`} onClick={async () => {
      try { await navigator.clipboard.writeText(fullAddress(address)); notify('地址已复制'); }
      catch { notify('复制失败，请长按地址复制'); }
    }}><Icon name="archive" size={19} /></button></div>)}</div>
    {restaurant.note && <p className="restaurant-note">{restaurant.note}</p>}
    {restaurant.link && <a className="text-button restaurant-link" href={restaurant.link} target="_blank" rel="noreferrer">打开餐厅链接<Icon name="arrow" size={17} /></a>}
    <div className="restaurant-detail-tools"><button className="button secondary" aria-pressed={restaurant.favorite} disabled={saving} onClick={() => void commit(current => ({ ...current, restaurants: current.restaurants.map(item => item.id === restaurant.id ? { ...item, favorite: !item.favorite } : item) }), restaurant.favorite ? '已取消收藏' : '已收藏餐厅')}><Icon name="heart" size={19} style={{ fill: restaurant.favorite ? 'currentColor' : 'none' }} />{restaurant.favorite ? '已收藏' : '收藏'}</button><button className="button secondary" onClick={onEdit}><Icon name="note" size={19} />编辑餐厅</button></div>
    {scoped && <p className="restaurant-history-note">以下为这家餐厅的全部历史记录，不受列表筛选影响。</p>}
    <div className="restaurant-section-title"><h3>消费记录 <span>· {restaurant.visits.length} 次</span></h3></div>
    {restaurant.visits.length ? <div className="restaurant-visits">{[...restaurant.visits].sort((a, b) => visitMoment(b).localeCompare(visitMoment(a))).map(visit => <article className="visit-card" key={visit.id}>
      <header><div><strong>{visit.date.replaceAll('-', '.')}{visit.time && ' ' + visit.time}</strong><span>{visit.people} 人</span></div><b>{visit.totalCents === null ? '金额未记录' : `¥${money(visit.totalCents)}`}</b></header>
      {visit.address && <p className="visit-address">{visit.address}</p>}
      {visit.companions && <p className="visit-address">同行 · {visit.companions}</p>}
      {visit.note && <p className="visit-note">{visit.note}</p>}
      <div className="visit-foods">{visit.foods.map(food => <div className="visit-food" key={food.id}>
        {food.image ? <button className="library-photo-open" onClick={() => onPreview(food.images, 0)} aria-label={`查看${food.name}照片`}><img src={food.image} alt={food.name} loading="lazy" decoding="async" /></button> : <span className="visit-food-placeholder"><Icon name="dishes" size={28} /></span>}
        <div><strong>{food.name}</strong>{food.note && <p>{food.note}</p>}<small>数量 {food.quantity}</small>{food.images.length > 1 && <button className="text-button" onClick={() => onPreview(food.images, 0)}>查看 {food.images.length} 张照片</button>}</div>
        {food.priceCents !== null && <span className="visit-food-price">¥{money(food.priceCents)}<small>/ 份</small></span>}
      </div>)}</div>
      {visit.images.length > 0 && <div className="visit-environment">{visit.images.map((image, index) => <button className="library-photo-open" key={index} onClick={() => onPreview(visit.images, index)} aria-label={`查看环境照片 ${index + 1}`}><img src={image} alt={`用餐环境 ${index + 1}`} loading="lazy" decoding="async" /></button>)}</div>}
      <footer><button className="text-button" onClick={() => onVisit(visit)} aria-label={`编辑 ${visit.date} ${visit.time} 消费记录`}><Icon name="note" size={17} />编辑记录</button><button className="text-button danger" disabled={saving} onClick={() => onDeleteVisit(visit)} aria-label={`删除 ${visit.date} ${visit.time} 消费记录`}>删除</button></footer>
    </article>)}</div> : <EmptyState icon="note" title="还没有用餐记录" description="记下吃过的菜和感受，下次再来更好选。" />}
    <button className="text-button danger delete-restaurant" onClick={onDelete}>删除餐厅</button>
    <div className="sheet-actions"><button className="button primary" onClick={() => onVisit()}><Icon name="plus" size={22} />记一笔</button></div>
  </div>;
}
