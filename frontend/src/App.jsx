import { Route, Routes } from 'react-router-dom';
import { AdminLayout, HomeRedirect, RequireRole, StudentLayout } from './components/Layouts.jsx';
import { Forbidden, Login, NotFound } from './pages/Auth.jsx';
import Browse from './pages/student/Browse.jsx';
import MyRequests from './pages/student/MyRequests.jsx';
import NewRequest from './pages/student/NewRequest.jsx';
import ItemDetail from './pages/student/ItemDetail.jsx';
import Dashboard from './pages/admin/Dashboard.jsx';
import Cases from './pages/admin/Cases.jsx';
import CaseEdit from './pages/admin/CaseEdit.jsx';
import Database from './pages/admin/Database.jsx';
import Activity from './pages/admin/Activity.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/403" element={<Forbidden />} />

      <Route path="/app" element={<RequireRole role="student"><StudentLayout /></RequireRole>}>
        <Route index element={<Browse />} />
        <Route path="requests" element={<MyRequests />} />
        <Route path="requests/new" element={<NewRequest />} />
        <Route path="items/:id" element={<ItemDetail />} />
      </Route>

      <Route path="/admin" element={<RequireRole role="admin"><AdminLayout /></RequireRole>}>
        <Route index element={<Dashboard />} />
        <Route path="cases" element={<Cases />} />
        <Route path="cases/new" element={<CaseEdit />} />
        <Route path="cases/:id" element={<CaseEdit />} />
        <Route path="database" element={<Database />} />
        <Route path="activity" element={<Activity />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
