import { useSession } from '@/app/session';

/** "Subject" choice on Home. Each subject keeps its own progress. Hidden when there is only one. */
export function PackPicker() {
  const { services, switchPack } = useSession();
  const { packs, pack } = services;
  if (packs.length < 2 || !packs.some((p) => p.id === pack.id)) return null;
  return (
    <div className="row subject">
      <label htmlFor="pack-picker" style={{ fontWeight: 600 }}>Subject</label>
      <select id="pack-picker" value={pack.id} onChange={(e) => { void switchPack(e.target.value); }}>
        {packs.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
      </select>
      <span className="mu">Each subject keeps its own progress and plan.</span>
    </div>
  );
}
