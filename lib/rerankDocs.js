
export function rerankDocs(docs, finalK = 5) {
  // Count agreement (same page/chunk appearing multiple times)
  const freqMap = {};
  
  for (const doc of docs) {
    const key = `${doc.metadata.wordCount}-${doc.metadata.similarity}`;
    if (!freqMap[key]) {
      freqMap[key] = { doc, count: 0 };
    }
    freqMap[key].count += 1;
  }

  // Convert to array with both score + agreement
  let scored = Object.values(freqMap).map(({ doc, count }) => {
    return {
      doc,
      count,
      score: doc.metadata.similarity ?? 0,
    };
  });

  // Sort:
  // 1. higher agreement first
  // 2. then lower similarity score (closer = better)
  scored.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.score - b.score;
  });

  // Return top K
  return scored.slice(0, finalK).map(s => s.doc);
}
