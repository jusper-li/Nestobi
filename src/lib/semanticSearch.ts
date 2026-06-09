import { callAI } from './openai';

export interface SemanticSearchMatch {
  source_type: string;
  source_id: string;
  title: string;
  url_path: string;
  similarity: number;
}

interface SemanticSearchResult {
  summary?: string;
  matches?: SemanticSearchMatch[];
}

export async function semanticSearch(scope: 'rooms' | 'products' | 'articles', query: string, matchCount = 24) {
  return callAI<SemanticSearchResult>('semantic-search', { scope, query, matchCount });
}

export function sortBySemanticMatches<T extends { id: string }>(items: T[], matches: SemanticSearchMatch[] | null) {
  if (!matches?.length) return items;
  const rank = new Map(matches.map((match, index) => [match.source_id, { index, similarity: match.similarity }]));
  return [...items]
    .filter(item => rank.has(item.id))
    .sort((a, b) => {
      const left = rank.get(a.id)!;
      const right = rank.get(b.id)!;
      return right.similarity - left.similarity || left.index - right.index;
    });
}
