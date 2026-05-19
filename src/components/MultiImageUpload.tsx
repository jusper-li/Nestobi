import React, { useRef, useState } from 'react';
import { Upload, Link, X, Plus, Loader2, Image as ImageIcon, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const STORAGE_BUCKET = 'site-assets';
const STORAGE_FOLDER = 'rooms';

interface Props {
  values: string[];
  onChange: (urls: string[]) => void;
  accentClass?: string;
  storageFolder?: string;
}

function getUploadErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }

  return '上傳失敗';
}

function getFileExtension(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
  return ext || 'jpg';
}

function validateImageFile(file: File) {
  if (!file.type.startsWith('image/')) return '請上傳圖片檔案';
  if (file.size > MAX_IMAGE_SIZE) return '檔案大小不可超過 10MB';
  return '';
}

const MultiImageUpload: React.FC<Props> = ({ values, onChange, accentClass = 'ring-amber-400', storageFolder = STORAGE_FOLDER }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const uploadFile = async (file: File) => {
    const validationError = validateImageFile(file);
    if (validationError) throw new Error(validationError);

    const ext = getFileExtension(file.name);
    const path = `${storageFolder}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { upsert: true });
    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  };

  const handleFiles = async (files: FileList) => {
    if (!files.length || uploading) return;

    setError('');
    setUploading(true);

    try {
      const uploadedUrls: string[] = [];
      for (const file of Array.from(files)) {
        uploadedUrls.push(await uploadFile(file));
      }

      const nextValues = [...values];
      for (const url of uploadedUrls) {
        if (!nextValues.includes(url)) nextValues.push(url);
      }
      onChange(nextValues);
    } catch (uploadError) {
      setError(getUploadErrorMessage(uploadError));
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) handleFiles(e.target.files);
    e.target.value = '';
  };

  const addUrl = () => {
    const u = urlInput.trim();
    if (u && !values.includes(u)) onChange([...values, u]);
    setUrlInput('');
    setShowUrlInput(false);
  };

  const remove = (idx: number) => onChange(values.filter((_, i) => i !== idx));

  const setCover = (idx: number) => {
    if (idx === 0) return;
    const next = [...values];
    [next[0], next[idx]] = [next[idx], next[0]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {/* Thumbnails grid */}
      {values.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {values.map((url, i) => (
            <div key={url + i} className="relative group aspect-[4/3] rounded-xl overflow-hidden border border-gray-200">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
                {i !== 0 && (
                  <button
                    type="button"
                    onClick={() => setCover(i)}
                    title="設為封面"
                    className="bg-white/90 hover:bg-white text-amber-600 rounded-full p-1.5 shadow transition"
                  >
                    <Star className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(i)}
                  title="移除"
                  className="bg-white/90 hover:bg-white text-red-500 rounded-full p-1.5 shadow transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {i === 0 && (
                <span className="absolute top-1.5 left-1.5 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <Star className="w-2.5 h-2.5 fill-white" />封面
                </span>
              )}
              <span className="absolute bottom-1.5 right-1.5 bg-black/50 text-white text-[9px] px-1.5 py-0.5 rounded-full">{i + 1}</span>
            </div>
          ))}
        </div>
      )}

      {/* Add area */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`rounded-xl border-2 border-dashed p-4 transition ${dragOver ? 'border-amber-500 bg-amber-100/70 shadow-inner' : 'border-slate-300 bg-slate-50 hover:border-amber-400 hover:bg-amber-50/60'}`}
      >
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-amber-400 hover:bg-amber-50 disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin text-amber-500" /> : <Upload className="w-4 h-4 text-amber-500" />}
            {uploading ? '上傳中…' : '上傳圖片'}
          </button>
          <button
            type="button"
            onClick={() => setShowUrlInput(v => !v)}
            className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-amber-400 hover:bg-amber-50"
          >
            <Link className="w-4 h-4 text-slate-500" />填入網址
          </button>
          {values.length === 0 && (
            <p className="mt-1 w-full text-center text-xs font-medium text-slate-600">
              <ImageIcon className="mr-1 inline h-4 w-4 text-slate-500" />拖曳或點擊新增，第一張為封面
            </p>
          )}
        </div>

        {showUrlInput && (
          <div className="flex gap-2 mt-3">
            <input
              type="url"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addUrl())}
              placeholder="https://..."
              className={`flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${accentClass}`}
              autoFocus
            />
            <button type="button" onClick={addUrl} className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
      {values.length > 0 && <p className="text-xs font-medium text-slate-600">共 {values.length} 張，懸停圖片可移除或設為封面</p>}

      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFile} />
    </div>
  );
};

export default MultiImageUpload;
