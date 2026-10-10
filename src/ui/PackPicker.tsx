import { useSession } from '@/app/session';

/** "Subject" choice on Home. Each subject keeps its own progress for the learner. Hidden when there is only one. */
export function PackPicker() {
  const { services, switchPack } = useSession();
  const { packs, pack } = services;
  if (packs.length < 2 || !packs.some((p) => p.id === pack.id)) return null;
  return (
    <div className="card">
      <div className="row">
        <label htmlFor="pack-picker" style={{ fontWeight: 600 }}>Subject</label>
        <select id="pack-picker" value={pack.id} onChange={(e) => { void switchPack(e.target.value); }}>
          {packs.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
      </div>
      <p className="mu" style={{ marginBottom: 0 }}>Each subject keeps its own progress and plan.</p>
    </div>
  );
}
