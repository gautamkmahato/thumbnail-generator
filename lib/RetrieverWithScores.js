export function retrieverWithScores(vectorStore, k = 4) {
  return {
    lc_namespace: ["retrievers", "RetrieverWithScores"],
    async getRelevantDocuments(query) {
      const results = await vectorStore.similaritySearchWithScore(query, k);

      return results.map(([doc, score]) => {
        doc.metadata.similarity = score;
        doc.metadata.source_query = query;   // ✅ track origin query
        return doc;
      });
    },
  };
}
