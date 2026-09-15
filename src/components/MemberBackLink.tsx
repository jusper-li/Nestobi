import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function MemberBackLink() {
  return (
    <Link to="/member" className="mb-4 inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition hover:border-[#C09A6A] hover:text-[#8B6840]">
      <ArrowLeft className="h-4 w-4" />
      返回會員中心
    </Link>
  );
}
