import { buildConceptMap, buildMistakeTimeline, type MapNode, type TimelineKind } from '@/core/engine';
import type { ConceptStatus } from '@/core/types';
import { DAY } from '@/core/util/time';
import { useSession } from '@/app/session';

// Rounded DOWN, so "75%" is only shown when the topic really reached 75% (the Solid line). Rounding up could show 75% on a Shaky topic.
const pct = (n: number) => `${Math.floor(n * 100 + 1e-6)}%`;
/** A topic never answered has no score yet: say so instead of showing its starting number. */
const score = (x: { mastery: number; attempts: number }) => (x.attempts > 0 ? pct(x.mastery) : 'not started');

/** Every status has a word and a star style (filled, part-filled, dotted, dashed), so nothing depends on colour or symbols. */
const STATUS: Record<ConceptStatus, { label: string }> = {
  solid: { label: 'Solid' },
  shaky: { label: 'Shaky' },
  new: { label: 'New' },
  locked: { label: 'Locked' },
};
const ENTRY: Record<TimelineKind, string> = {
  seen: 'Made this mistake',
  'probe-missed': 'Missed the follow-up check',
  fixed: 'Passed the follow-up check (fixed)',
};
const MISTAKE_STATUS = { active: 'Active', improving: 'Improving', resolved: 'Resolved' } as const;

function ago(now: number, at: number): string {
  const days = Math.max(0, Math.round((now - at) / DAY));
  return days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
}

// map geometry: every topic is a star; the more the learner knows, the more of the star is lit
const NODE_W = 140, NODE_H = 58, COL_GAP = 30, ROW_GAP = 14, PAD = 12, R = 13;
const starPath = (cx: number, cy: number, r: number) =>
  `M${cx} ${cy - r}L${cx + r * 0.3} ${cy - r * 0.3}L${cx + r} ${cy}L${cx + r * 0.3} ${cy + r * 0.3}L${cx} ${cy + r}L${cx - r * 0.3} ${cy + r * 0.3}L${cx - r} ${cy}L${cx - r * 0.3} ${cy - r * 0.3}Z`;

function MapSvg({ map }: { map: ReturnType<typeof buildConceptMap> }) {
  const x = (n: MapNode) => PAD + n.depth * (NODE_W + COL_GAP);
  const y = (n: MapNode) => PAD + n.row * (NODE_H + ROW_GAP);
  const w = PAD * 2 + map.columns * NODE_W + (map.columns - 1) * COL_GAP;
  const h = PAD * 2 + map.rows * NODE_H + (map.rows - 1) * ROW_GAP;
  const byId = new Map(map.nodes.map((n) => [n.id, n]));
  const cx = (n: MapNode) => x(n) + R + 4;
  const cy = (n: MapNode) => y(n) + NODE_H / 2;
  return (
    <div className="sky">
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Concept map drawn as a star chart. A line goes from a topic to the topic it unlocks. The same information is listed in words below." style={{ display: 'block', color: 'var(--mu)', width: '100%', minWidth: 540, maxWidth: w * 1.2, height: 'auto' }}>
        <defs>
          {map.nodes.map((n) => (
            <clipPath key={n.id} id={`lit-${n.id}`}><rect x={cx(n) - R} y={cy(n) + R - 2 * R * Math.max(0.12, n.mastery)} width={2 * R} height={2 * R} /></clipPath>
          ))}
        </defs>
        {map.edges.map((e) => {
          const a = byId.get(e.from)!, b = byId.get(e.to)!;
          const x1 = x(a) + NODE_W - 6, y1 = cy(a), x2 = cx(b) - R - 5, y2 = cy(b); // from the end of the label to the next star
          const mx = (x1 + x2) / 2;
          return <path key={`${e.from}>${e.to}`} d={`M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`} fill="none" stroke={e.met ? 'var(--star)' : 'currentColor'} strokeWidth={e.met ? 2 : 1.25} strokeDasharray={e.met ? undefined : '3 5'} strokeLinecap="round" opacity={e.met ? 0.9 : 0.7} />;
        })}
        {map.nodes.map((n) => {
          const s = STATUS[n.status];
          const dim = n.status === 'locked' ? 0.6 : 1;
          return (
            <g key={n.id} aria-hidden="true" opacity={dim}>
              {n.status === 'solid' && <circle cx={cx(n)} cy={cy(n)} r={R + 8} fill="var(--glow)" />}
              {n.status === 'solid' && <path d={starPath(cx(n), cy(n), R)} fill="var(--starf)" stroke="var(--star)" strokeWidth={1.5} strokeLinejoin="round" />}
              {n.status === 'shaky' && <>
                <path d={starPath(cx(n), cy(n), R)} fill="none" stroke="var(--star)" strokeWidth={1.75} strokeLinejoin="round" />
                <path d={starPath(cx(n), cy(n), R)} fill="var(--starf)" clipPath={`url(#lit-${n.id})`} />
              </>}
              {(n.status === 'new' || n.status === 'locked') && <path d={starPath(cx(n), cy(n), R)} fill="none" stroke="var(--mu)" strokeWidth={1.75} strokeDasharray={n.status === 'new' ? '2 3' : '5 3'} strokeLinejoin="round" />}
              <text x={cx(n) + R + 10} y={cy(n) - 4} fontSize="14" fontWeight="600" fill="var(--tx)">{n.title}</text>
              <text x={cx(n) + R + 10} y={cy(n) + 14} fontSize="12" fill="var(--mu)">{s.label}{n.attempts > 0 ? ` ${pct(n.mastery)}` : ''}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function Dna() {
  const { services, learner } = useSession();
  if (!learner) return null;
  const { pack, clock } = services;
  const now = clock.now();
  const map = buildConceptMap(pack, learner);
  const timeline = buildMistakeTimeline(pack, learner);

  return (
    <div>
      <div className="card"><h3 style={{ marginTop: 0 }}>Concept map</h3>
        <MapSvg map={map} />
        <p className="mu" style={{ margin: '8px 0 0' }}>
          Star styles: Solid is a full star, Shaky is a part-filled star, New is a dotted star, Locked is a dashed star. A line goes from a topic to the topic it unlocks. A gold line means the first topic is strong enough ({pct(map.lockBelow)} or more). A dotted line means not yet.
        </p>
      </div>

      <div className="card"><h3 style={{ marginTop: 0 }}>Topic by topic</h3>
        {map.nodes.map((n) => {
          const s = STATUS[n.status];
          return (
            <div key={n.id} className="topic">
              <div className="head">
                <b>{n.title}</b><span>{s.label}{n.attempts > 0 ? `, ${pct(n.mastery)}` : ''}</span>
              </div>
              <div className="bar" role="img" aria-label={`${n.title}: ${s.label}${n.attempts > 0 ? `, ${pct(n.mastery)}` : ''}`}><i style={{ width: n.attempts > 0 ? pct(n.mastery) : '0%' }} /></div>
              <div className="mu">
                {n.needs.length ? <>Needs: {n.needs.map((p) => `${p.title} (${score(p)}${p.met ? ', ready' : `, needs ${pct(map.lockBelow)}`})`).join(', ')}. </> : 'Needs nothing first. '}
                {n.unlocks.length ? <>Unlocks: {n.unlocks.map((u) => u.title).join(', ')}.</> : 'Does not unlock another topic.'}
              </div>
              {n.status === 'locked' && (
                <div className="box tip" style={{ marginTop: 6 }}>
                  <b>To unlock:</b> {n.unlockBy.map((p) => `reach ${pct(map.lockBelow)} in ${p.title} (now ${score(p)})`).join(', and ')}.
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="card"><h3 style={{ marginTop: 0 }}>Mistake timeline</h3>
        {timeline.length === 0 && <p className="mu">None yet.</p>}
        {timeline.map((m) => (
          <div key={m.id} className="topic">
            <div className="head">
              <b>{m.title}</b><span className="tag">{MISTAKE_STATUS[m.status]}, seen {m.seen} time{m.seen === 1 ? '' : 's'}</span>
            </div>
            <ol className="timeline">
              {m.entries.map((e, i) => (
                <li key={i}>{ENTRY[e.kind]} <span className="mu">({ago(now, e.at)})</span></li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
}
