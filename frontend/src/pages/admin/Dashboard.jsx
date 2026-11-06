import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { get } from '../../api.js';
import { ButtonLink, ErrorState, Loading, PageTitle, Panel, formatDateTime } from '../../components/ui.jsx';
import { describeActivity } from './Activity.jsx';

const COUNTERS = [
  { key: 'open_lost', label: 'Open lost requests', to: '/admin/cases?type=lost&status=open' },
  { key: 'open_found', label: 'Found items waiting', to: '/admin/cases?type=found&status=open' },
  { key: 'matched', label: 'Ready to collect', to: '/admin/cases?status=found' },
  { key: 'returned', label: 'Returned', to: '/admin/cases?status=returned' },
  { key: 'closed', label: 'Closed', to: '/admin/cases?status=closed' },
  { key: 'removed', label: 'Removed', to: '/admin/cases?trashed=only' },
  { key: 'total', label: 'Items on record', to: '/admin/cases' },
  { key: 'students', label: 'Student accounts', to: '/admin/database?table=users' },
];

const dayLabel = (date) => new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** Items reported per day over 14 days: plain bars with the number above each. */
function DailyBars({ data }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <ol className="flex h-48 items-end gap-1 border-b border-line sm:gap-2" aria-label="Items reported per day">
      {data.map((d, i) => (
        <li key={d.date} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
          {d.count > 0 && <span className="text-xs font-bold" aria-hidden="true">{d.count}</span>}
          <span className="w-full max-w-7 rounded-t bg-teal" style={{ height: `${(d.count / max) * 80}%` }} aria-hidden="true" />
          <span className="sr-only">{i === data.length - 1 ? 'Today' : dayLabel(d.date)}: {d.count} items</span>
        </li>
      ))}
    </ol>
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

  const title = <PageTitle title="Dashboard" action={<ButtonLink to="/admin/cases/new">Add found item</ButtonLink>} />;
  if (error) return <>{title}<ErrorState error={error} onRetry={load} /></>;
  if (!stats) return <>{title}<Loading label="Loading the dashboard" /></>;

  const total14 = stats.per_day.reduce((sum, d) => sum + d.count, 0);
  const first = stats.per_day[0];

  return (
    <>
      {title}

      <ul className="mb-[26px] grid grid-cols-2 gap-[15px] sm:grid-cols-4" aria-label="Case counts">
        {COUNTERS.map((k) => (
          <li key={k.key}>
            <Link to={k.to} className="block h-full rounded-card border border-line bg-white p-4 text-ink no-underline shadow-panel hover:border-teal">
              <span className="block text-title font-bold">{stats.counters[k.key]}</span>
              <span className="text-sm text-muted">{k.label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <Panel aria-labelledby="chart-title">
        <h2 id="chart-title" className="mb-1 text-section">Items reported per day</h2>
        <p className="mb-4 text-sm text-muted">Last 14 days, {total14} in total.</p>
        <DailyBars data={stats.per_day} />
        <p className="mt-1 flex justify-between text-xs text-muted" aria-hidden="true">
          <span>{first && dayLabel(first.date)}</span><span>Today</span>
        </p>
      </Panel>

      <Panel aria-labelledby="activity-title">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="activity-title" className="text-section">Recent activity</h2>
          <Link to="/admin/activity" className="text-sm font-bold text-teal-dark hover:underline">Open the activity log</Link>
        </div>
        {stats.recent_activity.length === 0 ? (
          <p className="text-muted">No activity yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {stats.recent_activity.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:gap-4">
                <time dateTime={entry.created_at} className="shrink-0 text-sm text-muted sm:w-32">{formatDateTime(entry.created_at)}</time>
                <p className="min-w-0 break-words"><strong>{entry.user?.name || 'Someone'}</strong> {describeActivity(entry)}</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
