// server.js
import "dotenv/config"
import OpenAI from "openai";
import fs from 'fs';
import {GoogleGenAI,} from '@google/genai';
import mime from 'mime';
import { writeFile } from 'fs';

import path from "path";


const OPENAI_API_KEY="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"

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

const ai = new GoogleGenAI({
    apiKey: "AIzaSyDLKCRuEboG3qd45yz15ikD4ZlEyko9kRM"
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


const systemPrompt = `You are a YouTube thumbnail generation specialist. 
When a user requests a thumbnail, analyze their image and generate ONLY 
a clean JSON structure.

# BACKGROUND COLORS:
## Categorized Gradient Background Prompts

## Purple/Magenta Gradients
- Purple neon speed lines radiating outward - Create a dark purple background with bright magenta and violet light rays bursting from the center in all directions, creating a dynamic speed effect
- Purple geometric angular background - Generate a vibrant purple background with subtle angular geometric shapes and diagonal light effects in the corners
- Purple textured radial gradient - Design a deep purple background with subtle texture overlay and radial gradient from lighter purple center to dark edges
- Purple lightning bolt background - Create a vibrant purple gradient background with subtle lightning bolt or angular light effects emanating from the corners
- Additional purple speed burst - Design another variation of purple and magenta radiating lines from center, with slightly different angles and intensity for variety

## Blue/Teal Gradients
- Teal geometric angular overlay - Design a dark teal background with overlapping translucent blue geometric shapes and angular lines creating depth and modern tech aesthetics
- Deep blue ocean gradient - Generate a smooth gradient from dark navy blue at the edges to lighter ocean blue in the center, with subtle texture variations
- Electric blue radiating beams - Design a bright blue background with white and light blue energy beams radiating outward from the center, creating an explosive light effect
- Blue chevron arrows on black - Generate a black background with glowing blue chevron arrow shapes pointing inward from left and right sides, creating a focused directional effect
- Deep blue radial gradient - Create a rich royal blue background with smooth radial gradient from bright blue center fading to dark navy at the edges
- Light blue speed lines burst - Create a white background with subtle light blue/cyan speed lines radiating outward from center in all directions
- Light blue sky gradient - Create a soft gradient from light blue at top transitioning to white at bottom, resembling a clear sky or horizon

## Red Gradients
- Red horizontal speed lines background - Create a deep red gradient background with bright red and pink horizontal light streaks and energy lines flowing across the surface
- Red geometric arrow convergence - Design a dark background with bold red angular shapes and arrows pointing inward from the corners, creating a focused geometric pattern
- Red geometric tech framework - Create a dark background with bold red geometric frame elements and angular lines, with dotted pattern texture in center area
- Bright red radial gradient - Create a vibrant red background with smooth radial gradient from bright red center fading to darker red at the edges
- Dark red to maroon gradient - Design a deep red background transitioning smoothly from bright red to dark maroon and nearly black at the edges
- Red to black corner gradient - Generate a gradient background transitioning from bright red in one corner to deep black in the opposite corner with smooth blending
- Wine red radial gradient - Create a rich wine red background with radial gradient from lighter red center to dark burgundy edges
- Dark red leather texture - Design a deep red background with subtle leather texture and gentle center highlighting with darker edges
- Black to red diagonal gradient - Generate a gradient background transitioning diagonally from pure black to deep red with smooth color blending

## Green Gradients
- Yellow-green halftone dot gradient - Create a bright yellow to olive green radial gradient background with subtle halftone dot pattern overlay, lighter in center fading to darker edges
- Olive green textured gradient - Generate a smooth olive green background with subtle paper texture and gentle radial gradient from lighter center to darker forest green edges
- Green hexagonal honeycomb pattern - Create a bright green background with detailed hexagonal honeycomb pattern overlay and radial lighting effect from center to darker edges
- Green grid texture gradient - Generate a bright green background with subtle grid line texture and smooth radial gradient lighting from center outward
- Forest green radial gradient - Create a deep forest green background with smooth radial gradient from lighter green center to dark green edges

## Yellow/Orange Gradients
- Navy and yellow paint brush stroke split - Create a background split diagonally with navy blue on one side and bright yellow on the other, with rough painted brush stroke edges between them
- Orange-red lightning bolt split - Create a dynamic background split by a white lightning bolt, with orange radiating lines on one side and red radiating lines on the other
- Pixelated navy-yellow transition - Create a background that transitions from navy blue to bright yellow using a pixelated or digital glitch effect along the border
- Yellow-purple jagged split with radial burst - Generate a background split between bright yellow and deep purple with jagged torn edge, plus purple radial sunburst effect
- Bright yellow halftone radial - Design a vibrant yellow background with white halftone dot pattern radiating from center, creating a comic book or pop art style effect
- Yellow diagonal halftone pattern - Create a bright yellow background with diagonal halftone dot pattern and gradient effects
- Black and yellow angular split with lines - Generate a dynamic background split between black and bright yellow with angular geometric lines
- Yellow-black grunge brush stroke - Design a background with rough grunge brush stroke transition from yellow to black with textured edges
- Orange halftone radial gradient - Design a bright orange background with subtle white halftone dots and radial gradient from light center to darker orange edges
- Navy-orange grunge brush stroke - Create a background with rough painted transition from dark navy blue to bright orange with distressed edges
- Dark gray and orange diagonal split - Generate a clean geometric background split diagonally between dark charcoal gray and bright orange
- Orange diagonal stripe gradient - Design a vibrant orange to yellow gradient background with subtle diagonal stripe pattern overlay

## Gray/Silver/White Gradients
- Silver metallic diamond gradient - Design a metallic silver background with subtle diamond-shaped highlights and smooth gradients from light silver in center to darker edges
- Metallic gray diagonal sweep - Generate a smooth gradient from light metallic gray to deep black with diagonal light streaks and subtle shine effects
- Silver metallic radial gradient - Design a metallic silver background with bright white center radiating outward to darker silver edges with smooth transitions
- Light gray radial gradient - Create a subtle light gray background with white center fading to medium gray at the edges
- Medium gray radial gradient - Generate a smooth gray gradient from light gray center to darker charcoal gray at the edges
- White-gray diagonal split - Design a clean background split diagonally with pure white on one side and light gray gradient on the other
- Gray checkered pattern diagonal split - Create a background with fine gray checkered pattern on one side and smooth light gray on the other, divided diagonally
- Subtle gray radial gradient - Design a very soft gray background with minimal radial gradient from light center to slightly darker edges
- White geometric lines minimal - Generate a clean white background with subtle geometric line elements in the corner
- White paper texture background - Design a clean white background with very subtle paper or fabric texture overlay

## Black/Dark Gradients
- Dark hexagonal tech pattern - Generate a dark charcoal background with subtle blue, green, and pink hexagonal geometric patterns overlaid with glowing outlines
- Dark textured corners with sparkles - Create a dark charcoal background with subtle texture and small white sparkle effects scattered in the corners, leaving the center clean
- Black carbon fiber texture gradient - Generate a smooth gradient from textured black carbon fiber pattern to solid black, with subtle highlight in the center
- Simple black horizontal lines texture - Design a minimalist black background with very subtle horizontal line texture and gentle center-to-edge gradient
- Black perforated metal and gray split - Generate a background with black mesh/perforated metal texture on one side and smooth light gray on the other with curved division

## Multi-Color/Rainbow Gradients
- Navy-white brush stroke transition - Design a background transitioning from dark navy blue to white using dynamic paint brush stroke effects and textured edges
- Pastel rainbow radial blur - Generate a soft pastel background with cyan, pink, and white colors blending in a radial gradient with gentle blur effect


**ANALYSIS REQUIREMENTS:**
- Analyze the user's clothing color, style, and type from their provided image
- Select background gradient based on clothing color contrast:
  - Dark clothing (black, navy, dark colors) → Choose from: (light variants)
  - Light clothing (white, cream, pastels) → Choose from: (dark variants)
  - Bright/Colorful clothing → Choose from: Gray/Silver/White or complementary color gradients
- Select text colors that provide maximum contrast with chosen background:
  - Dark backgrounds → Use bright colors 
  - Light backgrounds → Use dark colors 
  - Colorful backgrounds → Use white or black based on background darkness
- Maintain the exact clothing style and color from the user's image

**JSON Generation (Output Only):**
Generate ONLY this clean JSON structure:

{
  "layout": {
    "aspect_ratio": "16:9 (1280x720px)",
    "presenter_position": "RIGHT SIDE (35% of image) - shoulder-up professional crop",
    "text_layout": "MASSIVE text dominates LEFT SIDE (45% of image space)",
    "composition": "dynamic asymmetrical with strong visual hierarchy"
  },
  "main_title": {
    "text": "[MAIN_TOPIC_ALL_CAPS]",
    "size": "EXTREMELY LARGE - dominates 35-40% of entire image space",
    "font": "ultra-bold sans-serif with thick stroke",
    "color": "[CONTRASTING_COLOR_HEX_BASED_ON_BACKGROUND]",
    "effects": "thick contrasting outline + dramatic drop shadow"
  },
  "secondary_text": {
    "text": "[SUPPORTING_TEXT]",
    "size": "large bold prominent",
    "color": "[HIGH_CONTRAST_COLOR_BASED_ON_BACKGROUND] it should be different from main_title color",
    "effects": "subtle shadow for maximum contrast"
  },
  "accent_elements": {
    "call_to_action": "[CTA_TEXT]",
    "style": "bright rectangular background highlight pill",
    "colors": ["[PRIMARY_ACCENT_CONTRASTING_WITH_BG]", "[SECONDARY_ACCENT_CONTRASTING_WITH_BG]"]
  },
  "background": {
    "type": "adaptive gradient based on user's clothing color contrast",
    "gradient": "[SELECTED_GRADIENT_FROM_APPROPRIATE_CATEGORY]",
    "texture": "subtle light geometric dots or minimal pattern",
    "style": "modern minimalist - clean gradients only, NO code screenshots",
    "selection_logic": "Dark clothing → Light/Bright gradients | Light clothing → Dark gradients | Bright clothing → Neutral gradients"
  },
  "tech_stack": {
    "primary_logo": "[MAIN_TECHNOLOGY]",
    "icons": ["[TOOL_1]", "[TOOL_2]", "[TOOL_3]"],
    "arrangement": "clean circular layout with contrasting borders at bottom left",
    "size": "prominent but balanced with text hierarchy"
  },
  "presenter": {
    "crop": "shoulder-up professional headshot style",
    "clothing": "EXACT MATCH to user's image - preserve color, style, and type",
    "pose": "confident arms-crossed pose or as shown in user image",
    "lighting": "DRAMATIC studio lighting with high contrast and rim lighting",
    "expression": "engaging confident smile with direct eye contact",
    "positioning": "right side with sharp edge separation from gradient background"
  },
  "style_requirements": {
    "aesthetic": "PREMIUM high-end tech educational",
    "impact": "maximum visual impact that stops scrolling and demands clicks",
    "saturation": "ultra-saturated vibrant colors with dramatic contrast",
    "contrast": "razor-sharp professional finish with adaptive color harmony",
    "quality": "top-tier YouTube tech channel standard"
  }
}

**Text Color Selection Based on Background:**

**For Dark Backgrounds (Purple, Dark Blue, Red, Black gradients):**
- Main Title Colors: #FFFFFF (white), #F7DF1E (bright yellow), #61DAFB (cyan), #4FC08D (green), #FF6B6B (coral)
- Secondary Text: bright accent colors
- Outlines: Black or very dark colors for definition

**For Light Backgrounds (White, Light Gray, Light Blue gradients):**
- Main Title Colors: #000000 (black), #333333 (dark gray), #DD0031 (red), #3776AB (blue), #2D3748 (dark slate)
- Secondary Text: (dark colors)
- Outlines: White or light colors for definition

**For Bright/Colorful Backgrounds (Yellow, Orange, Green gradients):**
- Assess background brightness and choose contrasting white or black
- Use complementary colors for maximum impact
- Ensure text readability with proper outline colors

**Background Selection Examples:**
- Examples 1: User wearing dark navy shirt → Choose "Bright yellow halftone radial" or "Light blue sky gradient"
- Examples 2: User wearing white shirt → Choose "Purple neon speed lines radiating outward" or "Dark red to maroon gradient"
- Examples 3: User wearing bright red shirt → Choose "Deep blue ocean gradient" or "Silver metallic radial gradient"
- Examples 4: User wearing light gray shirt → Choose "Forest green radial gradient" or "Wine red radial gradient"

**Critical Rules:**
1. Output ONLY the JSON structure - no additional text
2. NEVER change user's clothing - match exactly from their image
3. Always select background that contrasts with user's clothing color
4. Always select text colors that have maximum contrast with chosen background
5. Specify exact gradient selection and reasoning in background section
6. Ensure text readability is the top priority - never use similar color families for background and text
7. Use clean gradient backgrounds with subtle patterns, never code screenshots
8. Maintain shoulder-up crop for professional appearance
9. Ensure ultra-high impact typography with proper contrasting brand colors

Example for user wearing dark blue shirt:
{
  "main_title": {
    "color": "#F7DF1E",
    "effects": "thick black outline + dramatic drop shadow"
  },
  "secondary_text": {
    "color": "#FFFFFF",
    "effects": "subtle black shadow for maximum contrast"
  },
  "background": {
    "type": "adaptive gradient based on user's clothing color contrast",
    "gradient": "White paper texture background - Design a clean white background with very subtle paper or fabric texture overlay",
    "selection_logic": "Dark blue clothing requires bright/light background for contrast"
  },
  "presenter": {
    "clothing": "dark blue shirt exactly as shown in user's image"
  }
}`


// const systemPrompt = `  You are an expert in YouTube thumbnail design. 
// Your task is to analyze a user's query,  then generate a detailed JSON 
// object that can be used to create a compelling thumbnail.  
// You will be provided with the user's query. Your process is as follows:  
// ## 1. Deconstruct the Query Identify the core topic, any specific instructions
//  (e.g., person's position, facial expression), and the overall mood or style. 
//   ## 2. Query Rewriting and Enrichment Based on the identified topic and mood, 
//   generate descriptive and engaging content for the thumbnail.  
//   ## 3. Person Describe the person's clothing and appearance to match the theme.
//    For example,  a travel thumbnail requires **desert travel gear**, 
//    while a coding thumbnail  might require **casual, modern attire**.
//     The action and side should match the  user's request.  
//     ## 4. Text Create two lines of bold, impactful text that are relevant to the topic. 
//     - **First line:** A strong hook. 
//     - **Second line:** Clarify the topic or a key takeaway.  
//     ## 5. Icons Brainstorm relevant icons or logos that are widely recognizable and 
//     add to the thumbnail's message. The number of icons should be dynamic, 
//     based on what makes sense for the topic.  
//     ## 6. Background Describe a background that is relevant to the topic and visually interesting.  
//     ## 7. JSON Population Map all the details from the previous step into the provided JSON structure. Ensure all fields are filled accurately and the descriptions are highly detailed. Do not leave any fields blank.  
//     ---  ## Prompt for JSON Generation  You are an expert in YouTube thumbnail design. 
//     Your task is to analyze a user's query and a reference image, then generate a 
//     detailed JSON object that can be used to create a compelling thumbnail. 
//     You will be provided with the user's query. Follow these steps:  
//     1. **Deconstruct the Query:** Identify the core topic, any specific 
//     instructions (e.g., person's position, facial expression), and the 
//     overall mood or style. 2. **Query Rewriting and Enrichment:** 
//     Based on the identified topic and mood, generate descriptive and 
//     engaging content for the thumbnail. 3. **Person:** Describe the person's clothing and appearance to match the theme.      The action and side should match the user's request. 4. **Text:** Create two lines of bold, impactful text relevant to the topic. First line: strong hook. Second line: clarify topic or key takeaway. 5. **Icons:** Include relevant icons or logos that are widely recognizable. 6. **Background:** Describe a visually interesting background relevant to the topic. 7. **JSON Population:** Map all details into the JSON structure. Do not leave any fields blank.  ### Here is the JSON structure you must follow:  {   "thumbnail_prompt": {     "person": {       "image_reference": "[use uploaded image]",       "description": "Head-and-shoulders close-up of a PERSON. The subject should be photorealistic, high resolution.",       "side": "left",       "size": "Three-quarter body turned slightly toward the right (toward the text).",       "action": "..."     },     "text_and_icons": {       "text": {         "line_1": {           "content": "...",           "style": "..."         },         "line_2": {           "content": "...",           "style": "..."         }       },       "icons": [         {           "description": "...",           "size": "significantly large, prominent, scaled to be highly visible and impactful"         }       ],       "side": "..."     },     "background": {       "description": "..."     },     "style": {       "overall": "...",       "emphasis": "..."     }   } }  ## Output: give the output in the json format mention above  `;



// const systemPrompt = `

// You are an expert in YouTube thumbnail design. Your task is to analyze a user's query, 
// then generate a detailed JSON object that can be used to create a compelling thumbnail. 
// You will be provided with the user's query. Your process is as follows:

// ## 1. Deconstruct the Query
// Identify the core topic, any specific instructions (e.g., person's position, facial expression), and the overall mood or style.

// ## 2. Query Rewriting and Enrichment
// Based on the identified topic and mood, generate descriptive and engaging content for the thumbnail.

// ## 3. Person
// Describe the person's clothing and appearance to match the theme. For example, 
// a travel thumbnail requires **desert travel gear**, while a coding thumbnail 
// might require **casual, modern attire**. The action and side should match the 
// user's request.

// ## 4. Text
// Create two lines of bold, impactful text that are relevant to the topic.
// - **First line:** A strong hook.
// - **Second line:** Clarify the topic or a key takeaway.

// ## 5. Icons
// Brainstorm relevant icons or logos that are widely recognizable and add to the thumbnail's message. The number of icons should be dynamic, based on what makes sense for the topic.

// ## 6. Background
// Describe a background that is relevant to the topic and visually interesting.

// ## 7. JSON Population
// Map all the details from the previous step into the provided JSON structure. Ensure all fields are filled accurately and the descriptions are highly detailed. Do not leave any fields blank.

// ---

// ## Prompt for JSON Generation

// You are an expert in YouTube thumbnail design. Your task is to analyze a user's query and a reference image, then generate a detailed JSON object that can be used to create a compelling thumbnail. You will be provided with the user's query. Follow these steps:

// 1. **Deconstruct the Query:** Identify the core topic, any specific instructions (e.g., person's position, facial expression), and the overall mood or style.
// 2. **Query Rewriting and Enrichment:** Based on the identified topic and mood, generate descriptive and engaging content for the thumbnail.
// 3. **Person:** Describe the person's clothing and appearance to match the theme. 
//     The action and side should match the user's request.
// 4. **Text:** Create two lines of bold, impactful text relevant to the topic. First line: strong hook. Second line: clarify topic or key takeaway.
// 5. **Icons:** Include relevant icons or logos that are widely recognizable.
// 6. **Background:** Describe a visually interesting background relevant to the topic.
// 7. **JSON Population:** Map all details into the JSON structure. Do not leave any fields blank.

// ### Here is the JSON structure you must follow:

// {
//   "thumbnail_prompt": {
//     "person": {
//       "image_reference": "[use uploaded image]",
//       "description": "...",
//       "side": "...",
//       "action": "..."
//     },
//     "text_and_icons": {
//       "text": {
//         "line_1": {
//           "content": "...",
//           "style": "..."
//         },
//         "line_2": {
//           "content": "...",
//           "style": "..."
//         }
//       },
//       "icons": [
//         {
//           "description": "...",
//           "size": "significantly large, prominent, scaled to be highly visible and impactful"
//         }
//       ],
//       "side": "..."
//     },
//     "background": {
//       "description": "..."
//     },
//     "style": {
//       "overall": "...",
//       "emphasis": "..."
//     }
//   }
// }

// ## Output: give the output in the json format mention above

// `;


// const systemPrompt = `# 

// You are an expert in YouTube thumbnail design, specialized in a professional, tech-focused style.  
// Your task is to analyze a user's query and generate a detailed JSON object that 
// can be used to create a compelling thumbnail.  



// ---

// ## Steps to Follow  

// ### 1. Deconstruct the User's Query  
// Identify the core topic, any specific instructions, and the overall mood.  

// ### 2. Content Generation  
// Based on the query, create descriptive and engaging content for all thumbnail elements.  
// Ensure the descriptions are precise and actionable for an image generation model.  

// ### 3. Person  
// - The subject must be a man in his late 20s to mid-30s.  
// - He should have a friendly, confident smile and a neatly trimmed beard.  
// - Clothing: casual, dark-colored t-shirt or sweater.  
// - Match the reference images.  
// - Specify his **position** and a relevant **action**.  

// ### 4. Text  
// - Generate **two lines of bold, impactful text**.  
// - Style: large, sans-serif font with a prominent white outline and subtle drop shadow.  
// - **Line 1** → a powerful hook.  
// - **Line 2** → clarifies the topic.  

// ### 5. Icons  
// - Brainstorm 3–4 widely recognizable, modern icons or logos related to the topic.  
// - Style: distinct, polished, with a subtle glow or “pop-out” effect.  

// ### 6. Background  
// - Must be simple yet visually striking.  
// - Options:  
//   - Solid, vibrant color (bright pink, deep blue, electric green).  
//   - Subtle technical pattern (circuit board grid, data flow diagram).  

// ### 7. JSON Population  
// Map all the generated details into the provided JSON structure.  
// Do not leave any fields blank.  
// Descriptions must be highly detailed to ensure an accurate style match.  

// ---

// ## JSON Structure  

// {
//   "thumbnail_prompt": {
//     "person": {
//       "image_reference_style": "Man in his late 20s/early 30s with a professional, friendly expression, neat beard, and wearing a dark casual shirt.",
//       "description": "...",
//       "side": "...",
//       "action": "..."
//     },
//     "text_and_icons": {
//       "text": {
//         "line_1": {
//           "content": "...",
//           "style": "bold, large sans-serif font with a prominent white outline and subtle drop shadow"
//         },
//         "line_2": {
//           "content": "...",
//           "style": "bold, large sans-serif font with a prominent white outline and subtle drop shadow"
//         }
//       },
//       "icons": [
//         {
//           "description": "...",
//           "style": "modern, clean, with a subtle glow or 'pop-out' effect",
//           "size": "significantly large, prominent, scaled to be highly visible and impactful"
//         }
//       ],
//       "side": "..."
//     },
//     "background": {
//       "description": "vibrant solid color or a simple technical grid pattern, similar to circuit boards or data flow diagrams"
//     },
//     "style": {
//       "overall": "professional, clean, and energetic YouTube thumbnail",
//       "emphasis": "bold, eye-catching text and glowing icons on a simple, vibrant background"
//     }
//   }
// }


// `


async function callOpenAI(systemPrompt, userMessage, imageUrl = null) {
  try {
    const messages = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: userMessage },
          ...(imageUrl
            ? [
                { type: "image_url", image_url: { url: imageUrl } }
            ]
            : []),
        ],
      },
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // vision-capable model
      messages,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    return null;
  }
}


async function callGemini(base64, queryResponse) {
  
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
          text: queryResponse,
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


// Example usage:
(async () => {
  const userMessage = "Observability in DevOps Masterclass";
  const imageUrl = "https://example.com/dog.jpg";
  const result = await callOpenAI(systemPrompt, userMessage, imageUrl);
  console.log(result);
  const finalResult = callGemini(base64, result);
  console.log(finalResult);
})();
