import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BedDouble, Building2, ExternalLink, ImageOff, Pencil, Store, Tags } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';

interface RoomDetail {
  id: string;
  name: string;
  description: string;
  room_type: string;
  capacity: number;
  min_capacity?: number | null;
  price_per_night: number;
  weekend_price?: number | null;
  floor?: string | null;
  image_url: string | null;
  images?: string[] | null;
  amenities?: string[] | null;
  location: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
  vendor_id?: string | null;
  vendors?: { id?: string | null; name?: string | null } | null;
  hotel_id?: string | null;
  hotels?: { id?: string | null; name?: string | null; city?: string | null } | null;
}

export default function SuperAdminRoomDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      setError('');
      const { data, error: loadError } = await supabase
        .from('tbl_rooms')
        .select('id,name,description,room_type,capacity,min_capacity,price_per_night,weekend_price,floor,image_url,images,amenities,location,is_available,created_at,updated_at,vendor_id,vendors(id,name),hotel_id,hotels(id,name,city)')
        .eq('id', id)
        .maybeSingle();

      if (loadError) setError(loadError.message);
      else setRoom((data as RoomDetail) || null);
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

  if (error || !room) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate('/superadmin/rooms')}
          className="inline-flex items-center gap-2 text-sm font-medium text-amber-700 hover:text-amber-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to rooms
        </button>
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error || 'Load failed'}</div>
      </div>
    );
  }

  const images = Array.isArray(room.images) ? room.images.filter(Boolean) : [];
  const cover = room.image_url || images[0] || '';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/superadmin/rooms')}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="rounded-xl bg-amber-100 p-2">
          <BedDouble className="h-6 w-6 text-amber-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{room.name}</h1>
          <p className="text-sm text-gray-500">{room.location}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/superadmin/rooms/${room.id}`)}
          className="ml-auto inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
        >
          <Pencil className="h-4 w-4" />
          Edit
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6">
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            {cover ? (
              <img src={cover} alt={room.name} className="h-72 w-full object-cover" />
            ) : (
              <div className="flex h-72 items-center justify-center bg-gray-100 text-gray-300">
                <ImageOff className="h-12 w-12" />
              </div>
            )}
            <div className="border-t border-gray-100 p-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${room.is_available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {room.is_available ? 'Available' : 'Unavailable'}
                </span>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">{room.room_type}</span>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">{formatCurrency(room.price_per_night)}</span>
                {room.weekend_price ? <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Weekend {formatCurrency(room.weekend_price)}</span> : null}
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs font-medium text-gray-500">Capacity</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">{room.min_capacity || room.capacity} - {room.capacity} guests</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs font-medium text-gray-500">Floor</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">{room.floor || '-'}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs font-medium text-gray-500">Location</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">{room.location || '-'}</p>
                </div>
              </div>

              <div className="mt-4 prose max-w-none text-gray-700">
                <p>{room.description || 'No description'}</p>
              </div>
            </div>
          </div>

          {images.length > 0 && (
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-gray-900">Images</h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {images.map((src, index) => (
                  <img key={`${src}-${index}`} src={src} alt={`${room.name}-${index + 1}`} className="h-28 w-full rounded-xl object-cover" />
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-gray-900">Amenities</h2>
            <div className="flex flex-wrap gap-2">
              {(room.amenities || []).length ? (
                room.amenities!.map(item => (
                  <span key={item} className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                    {item}
                  </span>
                ))
              ) : (
                <span className="text-sm text-gray-400">No amenities data</span>
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-gray-900">Meta</h2>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs font-medium text-gray-500">Vendor</p>
                {room.vendors?.id ? (
                  <Link to={`/superadmin/vendors/detail/${room.vendors.id}`} className="mt-1 inline-flex items-center gap-1 font-semibold text-amber-700 hover:underline">
                    {room.vendors.name || room.vendors.id}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                ) : (
                  <p className="mt-1 text-gray-700">-</p>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Hotel</p>
                {room.hotels?.id ? (
                  <Link to={`/superadmin/hotels/detail/${room.hotels.id}`} className="mt-1 inline-flex items-center gap-1 font-semibold text-amber-700 hover:underline">
                    {room.hotels.name || room.hotels.id}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                ) : (
                  <p className="mt-1 text-gray-700">-</p>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">City</p>
                <p className="mt-1 text-gray-700">{room.hotels?.city || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Created at</p>
                <p className="mt-1 text-gray-700">{new Date(room.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Updated at</p>
                <p className="mt-1 text-gray-700">{new Date(room.updated_at).toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-gray-900">Quick actions</h2>
            <div className="space-y-3 text-sm">
              {room.vendors?.id ? (
                <Link to={`/superadmin/vendors/detail/${room.vendors.id}`} className="block rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 font-medium text-gray-800 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-800">
                  View vendor
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => navigate(`/superadmin/rooms/${room.id}`)}
                className="block w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left font-semibold text-amber-800 transition hover:bg-amber-100"
              >
                Edit room
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            <div className="flex items-center gap-2 font-semibold">
              <Tags className="h-4 w-4" />
              Notes
            </div>
            <p className="mt-2 leading-6">
              This page keeps room, hotel, and vendor links intact while making the detail view readable for admins.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
