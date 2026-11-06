import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Calendar, MapPin } from 'lucide-react';
import { get, post } from '../../api.js';
import { ItemForm, ItemPhoto } from '../../components/ItemViews.jsx';
import { ButtonLink, ErrorState, Loading, Note, PageTitle, Panel, StatusBadge, TypeBadge, formatDate, formatDateTime, useToast } from '../../components/ui.jsx';
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
  if (error) return <div className="pt-8"><ErrorState error={error} onRetry={load} /></div>;
  if (!item) return <Loading label="Loading item" />;

  const back = item.is_mine ? { to: '/app/requests', label: 'My requests' } : { to: '/app', label: 'Found items' };

  if (editing) {
    return (
      <>
        <PageTitle title="Edit request" back={{ to: `/app/items/${id}`, label: item.title }} />
        <Panel>
          <ItemForm mode="student" initial={item} submitLabel="Save changes" onSubmit={save} onCancel={() => setParams({})} />
        </Panel>
      </>
    );
  }

  return (
    <>
      <PageTitle
        title={item.title}
        back={back}
        action={item.is_mine && item.can_edit ? <ButtonLink to="?edit=1">Edit request</ButtonLink> : null}
      />

      <Panel>
        <div className="mb-4 flex flex-wrap gap-1.5">
          <TypeBadge type={item.type} />
          <StatusBadge status={item.status} />
        </div>
        <ItemPhoto item={item} />
        <p className="mb-4 break-words whitespace-pre-line">{item.description}</p>

        <dl className="grid gap-x-6 gap-y-1 text-base sm:grid-cols-[max-content_1fr] sm:gap-y-2">
          <dt className="font-bold">Category</dt>
          <dd>{item.category?.name}</dd>
          <dt className="font-bold">{item.type === 'lost' ? 'Lost at' : 'Found at'}</dt>
          <dd className="flex items-center gap-1.5"><MapPin className="size-4 text-teal" aria-hidden="true" />{item.location?.name}</dd>
          <dt className="font-bold">{item.type === 'lost' ? 'Date lost' : 'Date found'}</dt>
          <dd className="flex items-center gap-1.5"><Calendar className="size-4 text-muted" aria-hidden="true" />{formatDate(item.date_reported)}</dd>
          {item.is_mine && (
            <>
              <dt className="font-bold">Your contact</dt>
              <dd>{item.contact_info || 'Not given'}</dd>
              <dt className="font-bold">Last updated</dt>
              <dd>{formatDateTime(item.updated_at)}</dd>
            </>
          )}
        </dl>

        {item.is_mine && item.status === 'found' && (
          <Note title="Ready to collect">
            {item.admin_note && <p>{item.admin_note}</p>}
            {item.matched_item && (
              <p className="mt-1 text-sm text-muted">Matched with “{item.matched_item.title}”, handed in at {item.matched_item.location}.</p>
            )}
          </Note>
        )}
        {item.is_mine && item.status !== 'found' && item.admin_note && (
          <Note title="Note from the office"><p>{item.admin_note}</p></Note>
        )}
        {!item.is_mine && item.type === 'found' && (
          <Note title="Is this yours?">
            <p>Go to Student Affairs, room 12, with your student card. The office will ask you to describe one detail before handing it over.</p>
          </Note>
        )}
        {item.is_mine && !item.can_edit && (
          <p className="mt-4 text-sm text-muted">The office has updated this request, so it can no longer be edited.</p>
        )}
      </Panel>
    </>
  );
}
