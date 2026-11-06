import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { get, post } from '../../api.js';
import { ItemForm, ItemPhoto } from '../../components/ItemViews.jsx';
import { ErrorState, Spinner, StatusBadge, TypeBadge, formatDate, formatDateTime, reference, useToast } from '../../components/ui.jsx';
import { NotFound } from '../Auth.jsx';

export default function ItemDetail() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const toast = useToast();
  const [item, setItem] = useState(null);
  const [error, setError] = useState(null);
  const editing = params.get('edit') === '1' && item?.can_edit;

  function load() {
    setError(null);
    get(`/api/items/${id}`).then((d) => setItem(d.data)).catch(setError);
  }
  useEffect(load, [id]);

  async function save(data) {
    // PHP only parses multipart bodies on POST, so the update is sent as POST + _method=PUT.
    data.append('_method', 'PUT');
    try {
      const result = await post(`/api/items/${id}`, data);
      setItem(result.data);
      setParams({});
      toast.success('Changes saved.');
    } catch (e) {
      toast.error(e.status === 422 ? 'Check the highlighted fields.' : e.message);
      throw e;
    }
  }

  if (error?.status === 404) return <NotFound />;
  if (error) return <div className="container page"><ErrorState error={error} onRetry={load} /></div>;
  if (!item) return <div className="page-loader"><Spinner label="Loading item" /></div>;

  const back = item.is_mine ? { to: '/app/requests', label: 'My requests' } : { to: '/app', label: 'Found items' };

  if (editing) {
    return (
      <div className="container page page-narrow">
        <Link to={`/app/items/${id}`} className="back-link">{item.title}</Link>
        <h1>Edit request</h1>
        <div className="panel">
          <ItemForm mode="student" initial={item} submitLabel="Save changes" onSubmit={save} onCancel={() => setParams({})} />
        </div>
      </div>
    );
  }

  return (
    <div className="container page">
      <Link to={back.to} className="back-link">{back.label}</Link>

      <article className={`detail detail-${item.type}`}>
        <div className="detail-media">
          <ItemPhoto item={item} className="detail-photo" />
        </div>

        <div className="detail-body">
          <div className="detail-tagline">
            <span className="tag-ref">{reference(item.id)}</span>
            <TypeBadge type={item.type} />
            <StatusBadge status={item.status} />
          </div>
          <h1>{item.title}</h1>
          <p className="detail-description">{item.description}</p>

          <dl className="detail-facts">
            <div><dt>Category</dt><dd>{item.category?.name}</dd></div>
            <div><dt>{item.type === 'lost' ? 'Lost at' : 'Found at'}</dt><dd>{item.location?.name}</dd></div>
            <div><dt>{item.type === 'lost' ? 'Date lost' : 'Date found'}</dt><dd>{formatDate(item.date_reported)}</dd></div>
            {item.is_mine && <div><dt>Your contact</dt><dd>{item.contact_info || 'Not given'}</dd></div>}
            {item.is_mine && <div><dt>Last updated</dt><dd>{formatDateTime(item.updated_at)}</dd></div>}
          </dl>

          {item.is_mine && item.status === 'found' && (
            <div className="collect-callout">
              <h2>Ready to collect</h2>
              {item.admin_note && <p>{item.admin_note}</p>}
              {item.matched_item && (
                <p className="collect-match">
                  Matched with {reference(item.matched_item.id)}, “{item.matched_item.title}”, handed in at {item.matched_item.location}.
                </p>
              )}
            </div>
          )}
          {item.is_mine && item.status !== 'found' && item.admin_note && (
            <p className="office-note"><strong>Note from the office:</strong> {item.admin_note}</p>
          )}

          {!item.is_mine && item.type === 'found' && (
            <div className="claim-box">
              <h2>Is this yours?</h2>
              <p>
                Go to Student Affairs, room 12, with your student card and quote <strong>{reference(item.id)}</strong>.
                The office will ask you to describe one detail before handing it over.
              </p>
            </div>
          )}

          {item.is_mine && (
            <div className="detail-actions">
              {item.can_edit ? (
                <Link to="?edit=1" className="btn btn-primary">Edit request</Link>
              ) : (
                <p className="field-hint">The office has updated this request, so it can no longer be edited.</p>
              )}
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
