import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function PropertyForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    price_per_share: '',
    status: 'Available',
    image_url: '',
    description: '',
    total_shares: '100',
    available_shares: '100',
  });

  useEffect(() => {
    if (isEditing && id) {
      fetchProperty(id);
    }
  }, [id, isEditing]);

  const fetchProperty = async (propertyId: string) => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setFormData({
          name: data.name,
          location: data.location,
          price_per_share: data.price_per_share.toString(),
          status: data.status,
          image_url: data.image_url,
          description: data.description,
          total_shares: data.total_shares.toString(),
          available_shares: data.available_shares.toString(),
        });
      }
    } catch (error) {
      console.error('Error fetching property:', error);
      setError('載入物業失敗');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const propertyData = {
        name: formData.name,
        location: formData.location,
        price_per_share: parseFloat(formData.price_per_share),
        status: formData.status,
        image_url: formData.image_url,
        description: formData.description,
        total_shares: parseInt(formData.total_shares),
        available_shares: parseInt(formData.available_shares),
      };

      if (isEditing && id) {
        const { error } = await supabase
          .from('properties')
          .update(propertyData)
          .eq('id', id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('properties').insert([propertyData]);

        if (error) throw error;
      }

      navigate('/admin/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : '儲存物業失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-cream">
      <nav className="bg-charcoal text-cream shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img
                src="/20260407_nestobi_logo.svg"
                alt="Kessaku"
                className="h-12 w-auto brightness-0 invert"
              />
              <span className="text-lg font-medium">管理員</span>
            </div>
            <span className="text-cream/70 text-sm">{user?.email}</span>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <button
          onClick={() => navigate('/admin/dashboard')}
          className="flex items-center text-charcoal/70 hover:text-charcoal mb-6 transition-colors"
        >
          <ArrowLeft size={20} className="mr-2" />
          返回儀表板
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-sm shadow-lg p-8"
        >
          <h2 className="text-3xl font-serif text-charcoal mb-6">
            {isEditing ? '編輯物業' : '新增物業'}
          </h2>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 rounded-sm p-4 flex items-center text-red-800 mb-6"
            >
              <AlertCircle size={20} className="mr-2 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-charcoal mb-2">
                  物業名稱 *
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-charcoal/20 rounded-sm focus:outline-none focus:border-[#2C1F10] transition-colors"
                  placeholder="The Bisho House"
                />
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-charcoal mb-2">
                  位置 *
                </label>
                <input
                  id="location"
                  name="location"
                  type="text"
                  value={formData.location}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-charcoal/20 rounded-sm focus:outline-none focus:border-[#2C1F10] transition-colors"
                  placeholder="京都，日本"
                />
              </div>

              <div>
                <label
                  htmlFor="price_per_share"
                  className="block text-sm font-medium text-charcoal mb-2"
                >
                  每股價格（美元）*
                </label>
                <input
                  id="price_per_share"
                  name="price_per_share"
                  type="number"
                  value={formData.price_per_share}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-3 border border-charcoal/20 rounded-sm focus:outline-none focus:border-[#2C1F10] transition-colors"
                  placeholder="15000"
                />
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-charcoal mb-2">
                  狀態 *
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-charcoal/20 rounded-sm focus:outline-none focus:border-[#2C1F10] transition-colors"
                >
                  <option value="Available">可售</option>
                  <option value="Waitlist Open">候補開放</option>
                  <option value="Sold Out">已售出</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="total_shares"
                  className="block text-sm font-medium text-charcoal mb-2"
                >
                  總股份數 *
                </label>
                <input
                  id="total_shares"
                  name="total_shares"
                  type="number"
                  value={formData.total_shares}
                  onChange={handleChange}
                  required
                  min="1"
                  className="w-full px-4 py-3 border border-charcoal/20 rounded-sm focus:outline-none focus:border-[#2C1F10] transition-colors"
                  placeholder="100"
                />
              </div>

              <div>
                <label
                  htmlFor="available_shares"
                  className="block text-sm font-medium text-charcoal mb-2"
                >
                  可售股份數 *
                </label>
                <input
                  id="available_shares"
                  name="available_shares"
                  type="number"
                  value={formData.available_shares}
                  onChange={handleChange}
                  required
                  min="0"
                  max={formData.total_shares}
                  className="w-full px-4 py-3 border border-charcoal/20 rounded-sm focus:outline-none focus:border-[#2C1F10] transition-colors"
                  placeholder="100"
                />
              </div>
            </div>

            <div>
              <label htmlFor="image_url" className="block text-sm font-medium text-charcoal mb-2">
                圖片網址 *
              </label>
              <input
                id="image_url"
                name="image_url"
                type="url"
                value={formData.image_url}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-charcoal/20 rounded-sm focus:outline-none focus:border-[#2C1F10] transition-colors"
                placeholder="https://images.pexels.com/..."
              />
              {formData.image_url && (
                <div className="mt-4">
                  <img
                    src={formData.image_url}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-sm"
                    onError={(e) => {
                      e.currentTarget.src =
                        'https://via.placeholder.com/800x400?text=Invalid+Image+URL';
                    }}
                  />
                </div>
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-charcoal mb-2">
                描述 *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={4}
                className="w-full px-4 py-3 border border-charcoal/20 rounded-sm focus:outline-none focus:border-[#2C1F10] transition-colors resize-none"
                placeholder="傳統日式建築的驚人範例..."
              />
            </div>

            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-charcoal/10">
              <button
                type="button"
                onClick={() => navigate('/admin/dashboard')}
                className="px-6 py-3 border border-charcoal/20 text-charcoal rounded-sm hover:bg-charcoal/5 transition-all duration-300"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-[#2C1F10] text-charcoal font-medium rounded-sm hover:bg-charcoal hover:text-cream transition-all duration-300 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={20} className="mr-2" />
                {loading ? '儲存中...' : isEditing ? '更新物業' : '建立物業'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
