import { ChatGoogleGenerativeAI } from "@langchain/google-genai";


const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.0-flash",
  maxOutputTokens: 2048,
  apiKey: "AIzaSyB7E82dV_PL-yCGyFDfStg6xo_MEAX7_uY", 
});

export default model;