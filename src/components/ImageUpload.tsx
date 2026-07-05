import { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

export default function ImageUpload({ value, onChange, label }: ImageUploadProps) {
  const { t } = useLanguage();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert(t('image_upload.invalid_file', '請選擇圖片檔案。'));
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('homepage-images').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('homepage-images').getPublicUrl(fileName);
      onChange(data.publicUrl);
    } catch (error) {
      console.error('Upload failed:', error);
      alert(t('image_upload.upload_failed', '圖片上傳失敗，請稍後再試。'));
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    onChange('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div>
      {label && <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>}

      <div className="flex gap-2">
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('image_upload.placeholder', '圖片 URL，或點擊上傳')}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          {uploading ? t('image_upload.uploading', '上傳中...') : t('image_upload.upload', '上傳')}
        </button>

        {value && (
          <button type="button" onClick={handleRemove} className="rounded-lg p-2 text-red-600 hover:bg-red-50">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

      {value && (
        <div className="mt-2">
          <img
            src={value}
            alt={t('image_upload.preview_alt', '圖片預覽')}
            className="max-h-40 max-w-xs rounded-lg border border-slate-200"
            onError={() => {
              console.error('Failed to load image:', value);
            }}
          />
        </div>
      )}
    </div>
  );
}
