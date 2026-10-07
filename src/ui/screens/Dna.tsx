import { buildConceptMap, buildMistakeTimeline, calibrationSummary, type MapNode, type TimelineKind } from '@/core/engine';
import type { ConceptStatus } from '@/core/types';
import { DAY } from '@/core/util/time';
import { useSession } from '@/app/session';

const pct = (n: number) => `${Math.round(n * 100)}%`;

/** Every status has a glyph, a word and a border style, so nothing depends on colour. */
const STATUS: Record<ConceptStatus, { glyph: string; label: string; fill: string; stroke: string; width: number; dash?: string; rx: number }> = {
  solid: { glyph: '✔', label: 'Solid', fill: 'var(--okb)', stroke: 'var(--ok)', width: 3, rx: 6 },
  shaky: { glyph: '◐', label: 'Shaky', fill: 'var(--wnb)', stroke: 'var(--wn)', width: 2, rx: 16 },
  new: { glyph: '○', label: 'New', fill: 'var(--card)', stroke: 'var(--mu)', width: 2, dash: '2 4', rx: 6 },
  locked: { glyph: '⊘', label: 'Locked', fill: 'var(--bg)', stroke: 'var(--mu)', width: 2, dash: '7 4', rx: 6 },
};
const ENTRY: Record<TimelineKind, { glyph: string; text: string }> = {
  seen: { glyph: '●', text: 'Made this mistake' },
  'probe-missed': { glyph: '✖', text: 'Missed the follow-up check' },
  fixed: { glyph: '✔', text: 'Passed the follow-up check (fixed)' },
};
const MISTAKE_STATUS = { active: 'Active', improving: 'Improving', resolved: 'Resolved' } as const;

function ago(now: number, at: number): string {
  const days = Math.max(0, Math.round((now - at) / DAY));
  return days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
}

// map geometry
const NODE_W = 144, NODE_H = 54, COL_GAP = 40, ROW_GAP = 16, PAD = 10;

function MapSvg({ map }: { map: ReturnType<typeof buildConceptMap> }) {
  const x = (n: MapNode) => PAD + n.depth * (NODE_W + COL_GAP);
  const y = (n: MapNode) => PAD + n.row * (NODE_H + ROW_GAP);
  const w = PAD * 2 + map.columns * NODE_W + (map.columns - 1) * COL_GAP;
  const h = PAD * 2 + map.rows * NODE_H + (map.rows - 1) * ROW_GAP;
  const byId = new Map(map.nodes.map((n) => [n.id, n]));
  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Concept map. Arrows go from a topic to the topics it unlocks. The same information is listed in words below." style={{ display: 'block', color: 'var(--mu)' }}>
        <defs>
          <marker id="dna-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="currentColor" /></marker>
        </defs>
        {map.edges.map((e) => {
          const a = byId.get(e.from)!, b = byId.get(e.to)!;
          const x1 = x(a) + NODE_W, y1 = y(a) + NODE_H / 2, x2 = x(b), y2 = y(b) + NODE_H / 2;
          return <path key={`${e.from}>${e.to}`} d={`M${x1} ${y1} C${x1 + 24} ${y1} ${x2 - 24} ${y2} ${x2 - 2} ${y2}`} fill="none" stroke="currentColor" strokeWidth={e.met ? 2.5 : 1.5} strokeDasharray={e.met ? undefined : '5 4'} markerEnd="url(#dna-arrow)" />;
        })}
        {map.nodes.map((n) => {
          const s = STATUS[n.status];
          return (
            <g key={n.id} aria-hidden="true">
              <rect x={x(n)} y={y(n)} width={NODE_W} height={NODE_H} rx={s.rx} fill={s.fill} stroke={s.stroke} strokeWidth={s.width} strokeDasharray={s.dash} />
              <text x={x(n) + 10} y={y(n) + 22} fontSize="14" fontWeight="700" fill="var(--tx)">{n.title}</text>
              <text x={x(n) + 10} y={y(n) + 41} fontSize="13" fill="var(--tx)">{s.glyph} {s.label} {pct(n.mastery)}</text>
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
  const cal = calibrationSummary(learner);

  return (
    <div>
      <div className="card"><h3 style={{ marginTop: 0 }}>Concept map</h3>
        <MapSvg map={map} />
        <p className="mu" style={{ margin: '8px 0 0' }}>
          Status: ✔ Solid, ◐ Shaky, ○ New, ⊘ Locked. An arrow goes from a topic to the topic it unlocks. A solid arrow means the first topic is strong enough ({pct(map.lockBelow)} or more). A dashed arrow means not yet.
        </p>
      </div>

      <div className="card"><h3 style={{ marginTop: 0 }}>Topic by topic</h3>
        {map.nodes.map((n) => {
          const s = STATUS[n.status];
          return (
            <div key={n.id} style={{ margin: '12px 0' }}>
              <div className="row" style={{ justifyContent: 'space-between', margin: 0 }}>
                <b>{n.title}</b><span>{s.glyph} {s.label}, {pct(n.mastery)}</span>
              </div>
              <div className="bar" role="img" aria-label={`${n.title}: ${s.label}, ${pct(n.mastery)}`}><i style={{ width: pct(n.mastery) }} /></div>
              <div className="mu">
                {n.needs.length ? <>Needs: {n.needs.map((p) => `${p.title} (${pct(p.mastery)} ${p.met ? '✔' : '✖'})`).join(', ')}. </> : 'Needs nothing first. '}
                {n.unlocks.length ? <>Unlocks: {n.unlocks.map((u) => u.title).join(', ')}.</> : 'Does not unlock another topic.'}
              </div>
              {n.status === 'locked' && (
                <div className="box tip" style={{ marginTop: 6 }}>
                  <b>To unlock:</b> {n.unlockBy.map((p) => `reach ${pct(map.lockBelow)} in ${p.title} (now ${pct(p.mastery)})`).join(', and ')}.
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="card"><h3 style={{ marginTop: 0 }}>Mistake timeline</h3>
        {timeline.length === 0 && <p className="mu">None yet.</p>}
        {timeline.map((m) => (
          <div key={m.id} style={{ margin: '12px 0' }}>
            <div className="row" style={{ justifyContent: 'space-between', margin: 0 }}>
              <b>{m.title}</b><span className="tag">{MISTAKE_STATUS[m.status]}, seen {m.seen} time{m.seen === 1 ? '' : 's'}</span>
            </div>
            <ol style={{ margin: '6px 0 0', paddingLeft: 22 }}>
              {m.entries.map((e, i) => (
                <li key={i}>{ENTRY[e.kind].glyph} {ENTRY[e.kind].text} <span className="mu">({ago(now, e.at)})</span></li>
              ))}
            </ol>
          </div>
        ))}
      </div>

      <div className="card"><h3 style={{ marginTop: 0 }}>What NOVA has learned about you</h3>
        <p>{cal.enoughData ? `You said "Sure" ${cal.sureCount} times and ${cal.sureWrong} were wrong.` : 'Not enough answers yet to check your confidence.'}</p>
        <p className="mu">{Object.entries(learner.strategies).map(([s, v]) => `${s}: helped ${v!.helped} of ${v!.shown}`).join(' | ') || 'No teaching-style history yet.'}</p>
      </div>
    </div>
  );
}
