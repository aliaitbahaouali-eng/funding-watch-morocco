import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AdminNav from '@/components/nav/AdminNav';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }) {
  await requireAdmin();
  return (
    <>
      <Header />
      <div className="bg-slate-50 py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 lg:flex-row">
          <AdminNav />
          <div className="flex-1">{children}</div>
        </div>
      </div>
      <Footer />
    </>
  );
}
