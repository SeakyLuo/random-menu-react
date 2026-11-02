export function Pagination({ page, total, size = 12, onChange }: {
  page: number; total: number; size?: number; onChange: (page: number) => void;
}) {
  const pages = Math.ceil(total / size);
  if (pages <= 1) return null;
  return <nav className="local-pagination" aria-label="列表分页">
    <button className="button secondary" disabled={page === 0} onClick={() => onChange(page - 1)}>上一页</button>
    <span>{page + 1} / {pages}</span>
    <button className="button secondary" disabled={page + 1 >= pages} onClick={() => onChange(page + 1)}>下一页</button>
  </nav>;
}
