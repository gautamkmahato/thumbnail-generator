import { ChatGoogleGenerativeAI } from "@langchain/google-genai";


const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.0-flash",
  maxOutputTokens: 2048,
  apiKey: "AIzaSyDLKCRuEboG3qd45yz15ikD4ZlEyko9kRM", 
});

export default model;