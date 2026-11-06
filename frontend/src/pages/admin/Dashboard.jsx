import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { get } from '../../api.js';
import { PageHeader } from '../../components/Layouts.jsx';
import { ErrorState, Spinner, formatDateTime } from '../../components/ui.jsx';
import { describeActivity } from './Activity.jsx';

const COUNTERS = [
  { key: 'open_lost', label: 'Open lost requests', to: '/admin/cases?type=lost&status=open', lead: true },
  { key: 'open_found', label: 'Found items waiting', to: '/admin/cases?type=found&status=open', lead: true },
  { key: 'matched', label: 'Ready to collect', to: '/admin/cases?status=found' },
  { key: 'returned', label: 'Returned', to: '/admin/cases?status=returned' },
  { key: 'closed', label: 'Closed', to: '/admin/cases?status=closed' },
  { key: 'removed', label: 'Removed', to: '/admin/cases?trashed=only' },
  { key: 'total', label: 'Items on record', to: '/admin/cases' },
  { key: 'students', label: 'Student accounts', to: '/admin/database?table=users' },
];

/** 14-day bar chart in plain SVG, one series, with a hover/focus tooltip. */
function DailyChart({ data }) {
  const [active, setActive] = useState(null);
  const width = 640;
  const height = 200;
  const pad = { top: 16, right: 8, bottom: 28, left: 28 };
  const max = Math.max(4, ...data.map((d) => d.count));
  const step = Math.ceil(max / 4);
  const top = step * 4;
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const slot = plotW / data.length;
  const barW = Math.min(28, slot - 6);
  const y = (v) => pad.top + plotH - (v / top) * plotH;

  const label = (d) => new Date(`${d.date}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const weekday = (d) => new Date(`${d.date}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <figure className="chart">
      <div className="chart-plot">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Items reported per day over the last 14 days, ${total} in total`}>
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <line x1={pad.left} x2={width - pad.right} y1={y(i * step)} y2={y(i * step)} className={i === 0 ? 'chart-baseline' : 'chart-grid'} />
              <text x={pad.left - 8} y={y(i * step) + 4} className="chart-tick" textAnchor="end">{i * step}</text>
            </g>
          ))}
          {data.map((d, i) => {
            const x = pad.left + i * slot + (slot - barW) / 2;
            const h = Math.max(0, y(0) - y(d.count));
            const r = Math.min(4, h / 2);
            const isActive = active === i;
            return (
              <g key={d.date}>
                {h > 0 && (
                  <path
                    className={`chart-bar${isActive ? ' is-active' : ''}`}
                    d={`M${x},${y(0)} V${y(d.count) + r} Q${x},${y(d.count)} ${x + r},${y(d.count)} H${x + barW - r} Q${x + barW},${y(d.count)} ${x + barW},${y(d.count) + r} V${y(0)} Z`}
                  />
                )}
                {(i % 2 === 1 || i === data.length - 1) && (
                  <text x={x + barW / 2} y={height - 8} className="chart-tick" textAnchor="middle">{i === data.length - 1 ? 'Today' : label(d)}</text>
                )}
                {/* Hit target taller and wider than the bar */}
                <rect
                  x={pad.left + i * slot} y={pad.top} width={slot} height={plotH}
                  className="chart-hit" tabIndex={0}
                  aria-label={`${weekday(d)}: ${d.count} ${d.count === 1 ? 'item' : 'items'}`}
                  onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(i)} onBlur={() => setActive(null)}
                />
              </g>
            );
          })}
        </svg>
        {active !== null && (
          <div className="chart-tooltip" style={{ left: `${((pad.left + active * slot + slot / 2) / width) * 100}%`, top: `${(y(data[active].count) / height) * 100}%` }}>
            <span className="chart-tooltip-value"><strong>{data[active].count}</strong> {data[active].count === 1 ? 'item' : 'items'}</span>
            <span>{weekday(data[active])}</span>
          </div>
        )}
      </div>
      <details className="chart-table">
        <summary>Show as table</summary>
        <table className="data-table compact">
          <thead><tr><th scope="col">Day</th><th scope="col">Items reported</th></tr></thead>
          <tbody>{data.map((d) => <tr key={d.date}><td>{weekday(d)}</td><td>{d.count}</td></tr>)}</tbody>
        </table>
      </details>
    </figure>
  );
}

function CategoryBars({ data }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <ul className="hbars">
      {data.map((d) => (
        <li key={d.id}>
          <span className="hbar-label">{d.name}</span>
          <span className="hbar-track" aria-hidden="true">
            <span className="hbar-fill" style={{ width: `${(d.count / max) * 100}%` }} />
          </span>
          <span className="hbar-value">{d.count}</span>
        </li>
      ))}
    </ul>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  function load() {
    setError(null);
    get('/api/admin/stats').then(setStats).catch(setError);
  }
  useEffect(load, []);

  if (error) return <div className="admin-page"><PageHeader title="Dashboard" /><ErrorState error={error} onRetry={load} /></div>;
  if (!stats) return <div className="page-loader"><Spinner label="Loading dashboard" /></div>;

  const c = stats.counters;
  const created14 = stats.per_day.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="admin-page">
      <PageHeader title="Dashboard">
        <Link to="/admin/cases/new" className="btn btn-primary">Add found item</Link>
      </PageHeader>

      <section className="counter-strip" aria-label="Case counts">
        {COUNTERS.map((k) => (
          <Link key={k.key} to={k.to} className={`counter${k.lead ? ' counter-lead' : ''}`}>
            <span className="counter-value">{c[k.key]}</span>
            <span className="counter-label">{k.label}</span>
          </Link>
        ))}
      </section>

      <div className="dash-grid">
        <section className="panel dash-chart" aria-labelledby="chart-title">
          <div className="panel-head">
            <h2 id="chart-title">Items reported per day</h2>
            <p className="panel-sub">Last 14 days, {created14} in total, lost and found together</p>
          </div>
          <DailyChart data={stats.per_day} />
        </section>

        <section className="panel" aria-labelledby="cat-title">
          <div className="panel-head">
            <h2 id="cat-title">By category</h2>
            <p className="panel-sub">Items on record, removed ones excluded</p>
          </div>
          <CategoryBars data={stats.per_category} />
        </section>

        <section className="panel dash-activity" aria-labelledby="act-title">
          <div className="panel-head panel-head-row">
            <h2 id="act-title">Recent activity</h2>
            <Link to="/admin/activity" className="btn btn-link">Open the activity log</Link>
          </div>
          {stats.recent_activity.length === 0 ? (
            <p className="muted">No activity yet.</p>
          ) : (
            <ol className="timeline">
              {stats.recent_activity.map((entry) => (
                <li key={entry.id}>
                  <time dateTime={entry.created_at}>{formatDateTime(entry.created_at)}</time>
                  <p><strong>{entry.user?.name || 'Someone'}</strong> {describeActivity(entry)}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
