// retrievers/MultiQueryWithScores.js
import { MultiQueryRetriever } from "langchain/retrievers/multi_query";
import { retrieverWithScores } from "./RetrieverWithScores.js";


export function createMultiQueryRetriever({ vectorStore, llm, k = 4, queryCount = 3 }) {

  return MultiQueryRetriever.fromLLM({
    retriever: retrieverWithScores(vectorStore, k),
    llm,
    verbose: true,
    queryCount, // how many rewrites (default = 5)
  });
}
