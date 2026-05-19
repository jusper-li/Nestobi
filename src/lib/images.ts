export const BLOG_FALLBACK_IMAGE =
  'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?auto=compress&cs=tinysrgb&w=900';

export const PRODUCT_FALLBACK_IMAGE =
  'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=900';

export const ROOM_FALLBACK_IMAGE =
  'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=900';

export const STORE_FALLBACK_IMAGE = '/stores/dlal-xinyi-flagship.webp';

export const SCENIC_GALLERY_IMAGES = [
  'https://images.pexels.com/photos/1732414/pexels-photo-1732414.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/1307698/pexels-photo-1307698.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/590478/pexels-photo-590478.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/2166553/pexels-photo-2166553.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/2506923/pexels-photo-2506923.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/237211/pexels-photo-237211.jpeg?auto=compress&cs=tinysrgb&w=1600',
];

export function useFallbackImage(event: { currentTarget: HTMLImageElement }, fallbackUrl: string) {
  const image = event.currentTarget;
  if (image.src === fallbackUrl) return;
  image.onerror = null;
  image.src = fallbackUrl;
}
