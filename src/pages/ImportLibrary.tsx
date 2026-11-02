import { useEffect, useRef, useState } from 'react';
import { fileHost, useFileAction, type ImportStatus, type LibraryInfo } from '../data/files';
import { useMenu } from '../data/MenuProvider';
import { Icon } from '../components/Icon';
import { Sheet } from '../components/Sheet';
import { ActionLink } from '../components/Shared';
import '../import.css';

const size = (bytes: number) => bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(2)} GB` : `${(bytes / 1024 ** 2).toFixed(1)} MB`;
const busy = (status: ImportStatus) => status.phase === 'extracting' || status.phase === 'validating';

export function ImportLibrary() {
  const host = fileHost();
  const run = useFileAction();
  const { load, notify, data } = useMenu();
  const [info, setInfo] = useState<LibraryInfo>();
  const [status, setStatus] = useState<ImportStatus>({ phase: 'idle' });
  const [choosing, setChoosing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [disconnected, setDisconnected] = useState(false);
  const announced = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!host) return;
    let active = true;
    void run(async () => {
      const next = await host.info();
      if (active) {
        setInfo(next); setStatus(next.import);
        if (next.import.phase === 'completed') await load();
      }
    }, () => { if (active) setDisconnected(true); });
    return () => { active = false; };
  }, [host, run, load]);

  useEffect(() => {
    if (!host || !busy(status) || disconnected) return;
    let active = true;
    let timer: number;
    const poll = () => void run(async () => {
      const next = await host.importStatus();
      if (!active) return;
      if (next.phase === 'failed') { setStatus(next); return; }
      if (next.phase === 'completed') {
        const loaded = await load();
        if (!loaded) { setStatus(next); return; }
        if (!active) return;
        setInfo(await host.info());
        setStatus(next);
        notify('资料已导入');
        window.location.hash = '/dishes';
        return;
      }
      setStatus(next);
      timer = window.setTimeout(poll, 1000);
    }, () => { if (active) setDisconnected(true); });
    timer = window.setTimeout(poll, 500);
    return () => { active = false; window.clearTimeout(timer); };
  }, [host, status.phase, run, notify, load, disconnected]);

  useEffect(() => {
    if (status.phase === 'failed' && announced.current !== status.jobId) {
      announced.current = status.jobId;
      notify(status.error!);
    }
  }, [status, notify]);

  const start = () => {
    setConfirm(false);
    setChoosing(true);
    void run(async () => {
      try {
        const next = await host!.importArchive();
        if (!next.cancelled) setStatus(next);
      } finally { setChoosing(false); }
    });
  };
  const request = () => {
    if (info?.available || data.recipes.length || data.restaurants.length) setConfirm(true);
    else start();
  };

  return <section className="import-library">
    <div className="import-summary"><Icon name="archive" size={32} /><h2>把熟悉的味道带过来</h2><p>导入菜谱、餐厅、用餐记录和照片。<br />照片保存在本机，按需读取。</p></div>
    {disconnected ? <ActionLink to="/me" secondary>返回我的</ActionLink> : busy(status) ? <div className="import-progress" role="status"><h3>{status.phase === 'validating' ? '正在校验资料' : '正在导入照片'}</h3>
      {status.totalBytes ? <progress max={status.totalBytes} value={status.bytes} aria-label="已导入数据" /> : <progress aria-label="正在读取数据包" />}
      <p>已处理 {status.files ?? 0} 个文件 · {size(status.bytes ?? 0)}{status.totalBytes ? ` / ${size(status.totalBytes)}` : ''}</p>
      <small>可以离开此页，请保持 Aurai 运行。</small>
    </div> : <>
      {info?.available && <div className="import-existing"><span>当前资料包</span><strong>{info.counts.recipes} 道菜谱 · {info.counts.restaurants} 家餐厅</strong><ActionLink to="/dishes" secondary>浏览菜谱</ActionLink></div>}
      <div className="import-instructions"><h3>准备好资料包</h3><p>选择转换后的随机菜单 ZIP 资料包。导入前请留出足够空间；原图不会转换或压缩。</p><p>只有全部校验通过后才会切换当前资料。未完成的导入不会影响已有资料。</p></div>
      {host ? <button className="button primary" onClick={request} disabled={choosing || !info}>{!info ? '正在读取资料…' : choosing ? '正在选择文件…' : status.phase === 'failed' ? '重新选择资料包' : info.available ? '导入另一份资料' : '选择资料包'}</button> : <p className="availability">请在 Aurai 小程序中选择资料包。</p>}
    </>}
    {confirm && <Sheet title="替换当前资料？" view="confirm-import" onClose={() => setConfirm(false)}><p className="sheet-description">导入成功后，将使用这份资料包中的菜谱、餐厅和用餐记录替换当前显示的资料。原库暂时保留在本机；导入失败或取消选择不会更改当前资料。</p><div className="import-dialog-actions"><button className="button secondary" onClick={() => setConfirm(false)}>取消</button><button className="button primary" onClick={start}>选择并导入</button></div></Sheet>}
  </section>;
}
