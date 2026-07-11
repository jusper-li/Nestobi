import { useEffect, useState } from 'react';
import type React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Mail, MapPin, Pencil, Phone, Store, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface VendorDetail {
  id: string;
  name: string;
  description: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  website: string;
  logo_url: string;
  note: string;
  is_active: boolean;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  linked_display_name?: string | null;
}

export default function SuperAdminVendorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState<VendorDetail | null>(null);
  const [productCount, setProductCount] = useState(0);
  const [roomCount, setRoomCount] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      setError('');

      const [{ data, error: vendorError }, { count: productsCount }, { count: roomsCount }] = await Promise.all([
        supabase.from('vendors').select('id,name,description,contact_email,contact_phone,address,website,logo_url,note,is_active,user_id,created_at,updated_at').eq('id', id).maybeSingle(),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('vendor_id', id),
        supabase.from('tbl_rooms').select('id', { count: 'exact', head: true }).eq('vendor_id', id),
      ]);

      if (vendorError) {
        setError(vendorError.message);
      } else if (data) {
        const vendorRow = data as VendorDetail;
        if (vendorRow.user_id) {
          const { data: profile } = await supabase.from('tbl_mn5wgzh0').select('display_name').eq('user_id', vendorRow.user_id).maybeSingle();
          vendorRow.linked_display_name = (profile as any)?.display_name || null;
        }
        setVendor(vendorRow);
      }

      setProductCount(productsCount || 0);
      setRoomCount(roomsCount || 0);
      setLoading(false);
    };

    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="space-y-4">
        <button type="button" onClick={() => navigate('/superadmin/vendors')} className="inline-flex items-center gap-2 text-sm font-medium text-amber-700 hover:text-amber-800">
          <ArrowLeft className="h-4 w-4" />
          Back to vendors
        </button>
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error || 'Load failed'}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => navigate('/superadmin/vendors')} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="rounded-xl bg-amber-100 p-2">
          <Store className="h-6 w-6 text-amber-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{vendor.name}</h1>
          <p className="text-sm text-gray-500">{vendor.contact_email || vendor.id}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/superadmin/vendors/edit/${vendor.id}`)}
          className="ml-auto inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
        >
          <Pencil className="h-4 w-4" />
          Edit
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <section className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              {vendor.logo_url ? (
                <img src={vendor.logo_url} alt={vendor.name} className="h-20 w-20 rounded-2xl border border-gray-100 object-contain" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-50 text-amber-400">
                  <Store className="h-10 w-10" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${vendor.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{vendor.is_active ? 'Active' : 'Inactive'}</span>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">Products {productCount}</span>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">Rooms {roomCount}</span>
                </div>
                <p className="mt-4 whitespace-pre-line text-gray-700">{vendor.description || 'No description'}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-gray-900">Contact</h2>
            <div className="grid gap-4 text-sm md:grid-cols-2">
              <div><p className="text-xs font-medium text-gray-500">Email</p><p className="mt-1 inline-flex items-center gap-1 text-gray-700">{vendor.contact_email || '-'}<Mail className="h-3.5 w-3.5 text-gray-400" /></p></div>
              <div><p className="text-xs font-medium text-gray-500">Phone</p><p className="mt-1 inline-flex items-center gap-1 text-gray-700">{vendor.contact_phone || '-'}<Phone className="h-3.5 w-3.5 text-gray-400" /></p></div>
              <div className="md:col-span-2"><p className="text-xs font-medium text-gray-500">Address</p><p className="mt-1 inline-flex items-start gap-1 text-gray-700"><MapPin className="mt-0.5 h-3.5 w-3.5 text-gray-400" />{vendor.address || '-'}</p></div>
              <div className="md:col-span-2"><p className="text-xs font-medium text-gray-500">Website</p>{vendor.website ? <a href={vendor.website} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-amber-700 hover:underline">{vendor.website}<ExternalLink className="h-3.5 w-3.5" /></a> : <p className="mt-1 text-gray-700">-</p>}</div>
              <div><p className="text-xs font-medium text-gray-500">Created at</p><p className="mt-1 text-gray-700">{new Date(vendor.created_at).toLocaleString()}</p></div>
              <div><p className="text-xs font-medium text-gray-500">Updated at</p><p className="mt-1 text-gray-700">{new Date(vendor.updated_at).toLocaleString()}</p></div>
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-gray-900">Linked user</h2>
            {vendor.user_id ? (
              <Link to={`/superadmin/users?q=${encodeURIComponent(vendor.user_id)}`} className="inline-flex items-center gap-1 font-semibold text-amber-700 hover:underline">
                {vendor.linked_display_name || vendor.user_id}
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <p className="text-sm text-gray-500">No linked user</p>
            )}
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-gray-900">Quick actions</h2>
            <div className="space-y-3 text-sm">
              <Link to={`/superadmin/products?q=${encodeURIComponent(vendor.name)}`} className="block rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 font-medium text-gray-800 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-800">
                View related products
              </Link>
              <Link to={`/superadmin/rooms?q=${encodeURIComponent(vendor.name)}`} className="block rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 font-medium text-gray-800 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-800">
                View related rooms
              </Link>
              <button
                type="button"
                onClick={() => navigate(`/superadmin/vendors/edit/${vendor.id}`)}
                className="block w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left font-semibold text-amber-800 transition hover:bg-amber-100"
              >
                Edit vendor
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-gray-900">Notes</h2>
            <p className="whitespace-pre-line text-sm text-gray-700">{vendor.note || '-'}</p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            <div className="flex items-center gap-2 font-semibold"><Package className="h-4 w-4" />Inventory links</div>
            <div className="mt-3 space-y-2">
              <Link to={`/superadmin/products?q=${encodeURIComponent(vendor.name)}`} className="block font-medium text-amber-800 hover:underline">Go to products</Link>
              <Link to={`/superadmin/rooms?q=${encodeURIComponent(vendor.name)}`} className="block font-medium text-amber-800 hover:underline">Go to rooms</Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
