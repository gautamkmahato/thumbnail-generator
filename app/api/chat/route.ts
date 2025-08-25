import { NextResponse } from "next/server";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import model from "@/lib/gemini"; // your Gemini LLM wrapper
import vectorStore from "@/lib/ingest"; // your vector store
import { createMultiQueryRetriever } from "@/lib/MultiQueryWithScores";
import { rerankDocs } from "@/lib/rerankDocs";
import { removeJsonCodeBlockMarkers } from "../../../lib/utils/removeJsonCodeBlockMarkers";

// This route assumes you are using ES modules and have top-level await enabled

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    console.log(query)

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query is required." }, { status: 400 });
    }

    // ------------------------------
    // Paste your exact existing logic here
    // ------------------------------


    // 1️⃣ Create multi-query retriever
    const retriever = createMultiQueryRetriever({
      vectorStore,
      llm: model,
      k: 4,
      queryCount: 3,
    });

    // 2️⃣ Retrieve candidate chunks
    let docs = await retriever.invoke(query);

    const parser = new StringOutputParser();

    async function filterRelevantChunks(query: string, docs: any[]) {
      const filtered = [];

        const prompt = ChatPromptTemplate.fromMessages([
        ["system", `You are an expert relevance filter for a RAG system that processes VIDEO SUBTITLES and educational content. Your task is to determine if a subtitle chunk contains ACTUAL USEFUL INFORMATION to answer the query.
      
      # SUBTITLE-SPECIFIC RULES:
      
      ## 🚫 ALWAYS mark as "NO" if the chunk is:
      - Casual greetings/introductions: "Hi everyone", "Welcome to this video", "Let's get started"
      - Video housekeeping: "Don't forget to subscribe", "Link in description", "See you next time"
      - Transition phrases only: "Moving on to...", "Next up...", "Now let's talk about..."
      - Incomplete explanations: Just mentions the topic without explaining it
      - Off-topic tangents: Stories, jokes, or examples unrelated to the query
      - Procedural talk: "I'm going to show you...", "We'll cover this later..."
      - Pure filler content: "Um, so, like, you know..."
      
      ## 🎯 SUBTITLE CONTEXT AWARENESS:
      - Subtitles are conversational and may lack formal structure
      - Look for EXPLANATORY content, not just topic mentions
      - Consider if this chunk would help someone UNDERSTAND the concept
      - Check if the educator is actually TEACHING about the topic (not just mentioning it)
      
      ## ✅ ONLY mark as "YES" if the chunk:
      - **Actively explains/teaches** the concept asked about
      - **Provides definitions** or clarifications about the topic
      - **Shows examples, code, or demonstrations** related to the query
      - **Discusses benefits, drawbacks, or use cases** of the topic
      - **Compares/contrasts** with other concepts
      - **Gives step-by-step explanations** or procedures
      - **Answers "what", "why", "how"** questions about the topic
      
      ## 🎬 VIDEO-SPECIFIC ANALYSIS:
      1. **Topic Introduction Detection**: Is this where the educator first introduces this topic?
      2. **Depth Level**: Surface mention vs deep explanation?
      3. **Educational Value**: Would a student learn something concrete from this chunk?
      4. **Context Completeness**: Does this chunk make sense on its own for answering the query?
      
      ## 🔍 RANKING SIGNALS (add these to your response):
      - **topic_introduction**: "YES" if this appears to be where the topic is first introduced/explained
      - **explanation_depth**: "shallow" | "moderate" | "deep" 
      - **educational_value**: 1-5 scale (5 = highly educational, 1 = barely relevant)
      - **chunk_type**: "introduction" | "explanation" | "example" | "summary" | "tangent"
      
      Return ONLY valid JSON in this format:
      \`\`\`json
      {{
        "pageContent": "the full pageContent",
        "relevant": "YES" or "NO",
        "reason": "Specific explanation of why relevant/not relevant for subtitles",
        "topic_introduction": "YES" or "NO",
        "explanation_depth": "shallow" | "moderate" | "deep",
        "educational_value": 1-5,
        "chunk_type": "introduction" | "explanation" | "example" | "summary" | "tangent",
        "metadata": "metadata object"
        }}
      \`\`\`
      `],
        ["human", `Query: {query}\nChunk: {chunk}\nMetadata: {metadata}`]
        ]);

      const chain = prompt.pipe(model).pipe(parser);

      for (const doc of docs) {
        try {
          const result = await chain.invoke({
            query,
            chunk: doc.pageContent,
            metadata: doc.metadata
          });

          try {
            const parsedResult = await removeJsonCodeBlockMarkers(result);
            const jsonResult = JSON.parse(parsedResult);

            if (jsonResult.relevant === "YES") {
              doc.metadata.relevance_reason = jsonResult.reason;
              filtered.push(doc);
            }
          } catch (parseError) {
            console.error("JSON parsing error:", parseError);
          }

        } catch (error) {
          console.error("Error processing chunk:", error);
        }
      }

      return filtered;
    }

    docs = await filterRelevantChunks(query, docs);
    const finalDocs = rerankDocs(docs, 5);
    console.log("final Docs ready")

    const context = finalDocs.map((doc) => ({
      pageContent: doc.pageContent,
      startTime: doc.metadata.startTime,
      endTime: doc.metadata.endTime,
      fileNames: doc.metadata.fileNames,
    }));

    // 3. Build prompt
    const prompt = ChatPromptTemplate.fromMessages([
    ["system", `You are tasked with synthesizing video transcript content while preserving the speaker's authentic voice and teaching style. Your goal is to create a comprehensive, informative response that covers all relevant aspects mentioned in the context.

    # RESPONSE GUIDELINES:

    ## 🎤 AUTHENTIC VOICE PRESERVATION:
    - **Maintain the speaker's conversational tone** and speaking patterns from the context
    - **Use the same terminology, phrases, and explanations** the speaker used
    - **Preserve their teaching style** - whether casual, formal, technical, or beginner-friendly
    - **Keep their personality** - if they use "you know," "basically," "let me tell you," etc., maintain that
    - **Don't over-formalize** their casual explanations but keep them informative

    ## 📚 COMPREHENSIVE CONTENT COVERAGE:
    - **Include ALL relevant information** from the provided context chunks
    - **Cover every aspect** the speaker mentioned related to the user's query
    - **Organize content by topics/sections** that the speaker covered
    - **Provide detailed explanations** using the speaker's words and approach
    - **Don't skip important details** - be thorough while staying authentic

    ## 🗂️ SMART SECTIONING:
    - **Create natural topic sections** based on what the speaker actually discussed
    - **Use simple, descriptive headers** that match the speaker's language style
    - **Group related concepts** together as the speaker would explain them
    - **Follow the logical flow** of how the speaker taught the concepts

    Examples of natural headers based on speaker's content:
    - "Setting up your .env file"
    - "Creating files in Node.js"
    - "How authentication actually works"
    - "The main difference between..."

    ## 🚫 STRICT LIMITATIONS:
    - **NO code snippets** unless the speaker specifically mentions or shows code in the context
    - **NO examples** unless the speaker provides them in the transcript
    - **NO external knowledge** - only what the speaker actually said
    - **NO references to "the video"** - write as if you are the speaker explaining directly

    ## 📝 RESPONSE STRUCTURE:
    1. **Start with direct answer** to the user's question in speaker's voice
    2. **Break into natural sections** based on different aspects the speaker covered
    3. **Each section should be detailed and informative** using speaker's explanations
    4. **Maintain conversational flow** while being comprehensive
    5. **Include all relevant details** the speaker mentioned
    6. **At the very end, append the metadata** from each chunk in this format:

        ### Sources
        -   - **Start → End (Filename)**
        -   - Example: 00:01:15.000 → 00:02:05.200 (lecture1.vtt)
        +   - **Start → End (Filename without .vtt extension)**
        +   - Example: 00:01:15.000 → 00:02:05.200 (lecture1)


    ## ⚖️ BALANCE:
    - **Informative but natural**
    - **Comprehensive but authentic**
    - **Organized but conversational**

    ---

    **CONTEXT FROM VIDEO TRANSCRIPTS:**

    {context}

    ---

    Based on the above context, create a comprehensive response that covers all relevant information the speaker mentioned. 
    Organize the content into natural sections based on different topics/aspects the 
    speaker discussed, while maintaining their authentic voice and teaching style 
    throughout. 

    **Finally, include the list of sources with their start/end timestamps and filenames 
    at the end as specified. 
    NOTE: give the final response in markdown format only
    **`],
    ["human", "{input}"]
    ]);

    const chain = prompt.pipe(model).pipe(parser);

    console.log("Formating result...")

    const result = await chain.invoke({ input: query, context: JSON.stringify(context) });
    console.log(result)
    console.log("Result ready")
    // ------------------------------
    // Return result as JSON
    // ------------------------------
    return NextResponse.json({ answer: result });

  } catch (error) {
    console.error("Error in chat route:", error);
    return NextResponse.json({ error: "Failed to process query." }, { status: 500 });
  }
}
