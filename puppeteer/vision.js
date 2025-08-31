import "dotenv/config";
import fs from "fs";
import OpenAI from "openai";


const client = new OpenAI({
  apiKey: "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"
});


// 🔹 Convert image file to base64 string
function imageToBase64(imagePath) {
  const fileData = fs.readFileSync(imagePath);
  return fileData.toString("base64");
}

// 🔹 Call OpenAI vision model with image + query
async function askImageQuestion(imagePath, query) {
  const base64Image = imageToBase64(imagePath);

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini", // Or use "gpt-4o" if you want stronger reasoning
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: query },
          {
            type: "image_url",
            image_url: { url: `data:image/png;base64,${base64Image}` }, // 👈 supports jpg, png, etc
          },
        ],
      },
    ],
  });

  return response.choices[0].message.content;
}

// Example usage
(async () => {
  const result = await askImageQuestion(
    "C:\\Users\\Gautam\\Desktop\\apps\\1.PNG", 
    "give me titles of all the videos"
  );
  console.log("AI Answer:", result);
})();
