import { Outlet } from 'react-router-dom';
import Navigation from '../../components/Navigation';

/** Member pages use the global header menu as their single navigation surface. */
export default function MemberLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="mx-auto min-w-0 max-w-7xl px-3 py-4 sm:px-4 sm:py-6">
        <Outlet />
      </main>
    </div>
  );
}
