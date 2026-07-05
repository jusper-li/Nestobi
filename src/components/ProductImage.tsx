import { ImgHTMLAttributes, useEffect, useState } from 'react';
import ProductImagePlaceholder from './ProductImagePlaceholder';
import { getOptimizedProductImage } from '../utils/optimizedImages';

interface ProductImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'alt' | 'onError' | 'src'> {
  alt: string;
  compactPlaceholder?: boolean;
  src?: string | null;
}

export default function ProductImage({
  alt,
  compactPlaceholder = false,
  src,
  ...imgProps
}: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return <ProductImagePlaceholder name={alt} compact={compactPlaceholder} />;
  }

  const optimized = getOptimizedProductImage(src);

  return (
    <img
      {...imgProps}
      src={optimized?.src || src}
      srcSet={imgProps.srcSet || optimized?.srcSet}
      sizes={imgProps.sizes || (optimized ? '(max-width: 768px) 46vw, (max-width: 1280px) 25vw, 320px' : undefined)}
      alt={alt}
      loading={imgProps.loading || 'lazy'}
      decoding={imgProps.decoding || 'async'}
      onError={() => setFailed(true)}
    />
  );
}
