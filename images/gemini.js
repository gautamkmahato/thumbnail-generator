// To run this code you need to install the following dependencies:
// npm install @google/genai mime
// npm install -D @types/node

import {
  GoogleGenAI,
} from '@google/genai';
import mime from 'mime';
import { writeFile } from 'fs';


const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

const config = {
    responseModalities: [
        'IMAGE',
        'TEXT',
    ],
    systemInstruction: [
        {
          text: `Based on the uploaded image and the user prompt generate a high quality, cinematic image`,
        }
    ],
};

const model = 'gemini-2.5-flash-image-preview';


function saveBinaryFile(fileName, content) {
  writeFile(fileName, content, 'utf8', (err) => {
    if (err) {
      console.error(`Error writing file ${fileName}:`, err);
      return;
    }
    console.log(`File ${fileName} saved to file system.`);
  });
}


async function main() {
  
  const contents = [
    {
      role: 'user',
      parts: [
        {
          inlineData: {
            data: base64,
            mimeType: `image/png`,
          },
        },
        {
          text: `user query`
        },
      ],
    },
    {
      role: 'model',
      parts: [
        {
          inlineData: {
            data: base64,
            mimeType: `image/png`,
          },
        },
      ],
    },
  ];

  const response = await ai.models.generateContentStream({
    model,
    config,
    contents,
  });
  let fileIndex = 0;
  for await (const chunk of response) {
    if (!chunk.candidates || !chunk.candidates[0].content || !chunk.candidates[0].content.parts) {
      continue;
    }
    if (chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
      const fileName = `ENTER_FILE_NAME_${fileIndex++}`;
      const inlineData = chunk.candidates[0].content.parts[0].inlineData;
      const fileExtension = mime.getExtension(inlineData.mimeType || '');
      const buffer = Buffer.from(inlineData.data || '', 'base64');
      saveBinaryFile(`${fileName}.${fileExtension}`, buffer);
    }
    else {
      console.log(chunk.text);
    }
  }
}

main();