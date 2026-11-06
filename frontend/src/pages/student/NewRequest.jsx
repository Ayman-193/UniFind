import { useNavigate } from 'react-router-dom';
import { post } from '../../api.js';
import { ItemForm } from '../../components/ItemViews.jsx';
import { PageHeader } from '../../components/Layouts.jsx';
import { useToast } from '../../components/ui.jsx';

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
    <div className="container page page-narrow">
      <PageHeader title="Report a lost item" back={{ to: '/app/requests', label: 'My requests' }} />
      <p className="page-intro">
        Tell the Lost &amp; Found Office what you lost. They compare every request with what is handed in
        and will mark yours as matched when they find it.
      </p>
      <div className="panel">
        <ItemForm mode="student" submitLabel="Save request" onSubmit={save} onCancel={() => navigate(-1)} />
      </div>
    </div>
  );
}
