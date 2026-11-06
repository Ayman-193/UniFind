import { useNavigate } from 'react-router-dom';
import { post } from '../../api.js';
import { ItemForm } from '../../components/ItemViews.jsx';
import { PageTitle, Panel, useToast } from '../../components/ui.jsx';

export default function NewRequest() {
  const navigate = useNavigate();
  const toast = useToast();

  async function save(data) {
    try {
      const result = await post('/api/items', data);
      toast.success('Request saved. The office will contact you if it turns up.');
      navigate(`/app/items/${result.data.id}`);
    } catch (error) {
      toast.error(error.status === 422 ? 'Check the highlighted fields.' : error.message);
      throw error;
    }
  }

  return (
    <>
      <PageTitle title="Report a lost item" back={{ to: '/app/requests', label: 'My requests' }} />
      <Panel>
        <p className="-mt-1 mb-[22px] text-sm text-muted">
          The office compares every request with what is handed in and marks yours as matched when they find it.
        </p>
        <ItemForm mode="student" submitLabel="Save request" onSubmit={save} onCancel={() => navigate(-1)} />
      </Panel>
    </>
  );
}
