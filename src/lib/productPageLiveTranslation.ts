import { normalizeLang, pickByLang } from './language';
import type { ProductPageBlock, ProductPageDocument } from './productPageCards';

type TranslateFn = (key: string, defaultText?: string) => string;

export const shouldTranslateProductPage = (lang: string) =>
  pickByLang(normalizeLang(lang), false, true, true, true);

export const translateProductPageDocumentWithT = (
  document: ProductPageDocument,
  t: TranslateFn,
  keyPrefix: string,
): ProductPageDocument => ({
  ...document,
  blocks: document.blocks.map((block, index) => translateProductPageBlockWithT(block, t, `${keyPrefix}.block.${index}`)),
});

const translateProductPageBlockWithT = (
  block: ProductPageBlock,
  t: TranslateFn,
  keyPrefix: string,
): ProductPageBlock => ({
  ...block,
  title: t(`${keyPrefix}.title`, block.title),
  body: t(`${keyPrefix}.body`, block.body),
  badge: block.badge ? t(`${keyPrefix}.badge`, block.badge) : block.badge,
  buttonText: block.buttonText ? t(`${keyPrefix}.buttonText`, block.buttonText) : block.buttonText,
  highlights: block.highlights?.map((item, index) => t(`${keyPrefix}.highlight.${index}`, item)) ?? block.highlights,
});

export const translateHtmlContentWithT = (
  html: string,
  t: TranslateFn,
  keyPrefix: string,
): string => {
  if (!html.trim() || typeof DOMParser === 'undefined') return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  let textIndex = 0;

  const walk = (node: ParentNode, path: string) => {
    node.childNodes.forEach((child, index) => {
      const childPath = `${path}.${index}`;
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent || '';
        if (text.trim()) {
          child.textContent = t(`${keyPrefix}.text.${textIndex}`, text);
          textIndex += 1;
        }
        return;
      }

      if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child as unknown as ParentNode, childPath);
      }
    });
  };

  walk(doc.body, 'root');
  return doc.body.innerHTML;
};
