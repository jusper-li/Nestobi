const OPTIMIZABLE_IMAGE_PATTERN = /^\/(product-images|homepage-images)\/([^/?#]+)\.(?:jpe?g|png)([?#].*)?$/i;
const OPTIMIZED_WIDTHS = [640, 1280, 1920] as const;

export function getOptimizedProductImage(src?: string | null) {
  if (!src) return null;

  const match = src.match(OPTIMIZABLE_IMAGE_PATTERN);
  if (!match || src.includes('/optimized/')) return null;

  const [, directory, filename] = match;
  const basePath = `/${directory}/optimized/${filename}`;

  return {
    src: `${basePath}-640.webp`,
    srcSet: OPTIMIZED_WIDTHS.map((width) => `${basePath}-${width}.webp ${width}w`).join(', '),
  };
}
