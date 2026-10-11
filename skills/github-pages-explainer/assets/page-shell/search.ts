// A deliberately small executable example, not a production search implementation.
export interface SearchDocument {
  id: number;
  title: string;
}
export function tokenize(text: string): string[] {
  return [...new Set(text.toLowerCase().match(/[a-z0-9]+/g) ?? [])];
}
export function buildIndex(
  documents: SearchDocument[],
): Record<string, number[]> {
  const index: Record<string, number[]> = Object.create(null);
  for (const document of documents)
    for (const token of tokenize(document.title))
      (index[token] ??= []).push(document.id);
  return index;
}
export function match(
  index: Record<string, number[]>,
  query: string,
): number[] {
  const tokens = tokenize(query);
  if (!tokens.length) return [];
  return (index[tokens[0]] ?? []).filter((id) =>
    tokens.every((token) => index[token]?.includes(id)),
  );
}
export const snapshots: SearchDocument[][] = [
  [
    { id: 1, title: "Retry failed jobs" },
    { id: 2, title: "Deploy static pages" },
    { id: 3, title: "Retry deploy jobs" },
  ],
  [
    { id: 1, title: "Retry failed jobs" },
    { id: 2, title: "Deploy static pages" },
    { id: 3, title: "Retry deploy jobs" },
    { id: 4, title: "Retry network requests" },
  ],
];
