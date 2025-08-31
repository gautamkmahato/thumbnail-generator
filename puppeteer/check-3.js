import "dotenv/config";
import { Agent, run, tool } from "@openai/agents";
import OpenAI from "openai";
import puppeteer from "puppeteer";
import z from "zod";
import fs from "fs";
import path from "path";
import sharp from "sharp"; // npm i sharp
import { createClient } from "@supabase/supabase-js";

/* ---------------------- GLOBALS ---------------------- */
let browser = null;
let page = null;

const SUPABASE_URL = "https://fdmvffppytuiuctqijvc.supabase.co"
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkbXZmZnBweXR1aXVjdHFpanZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MjQzNjMsImV4cCI6MjA2OTIwMDM2M30.J3rKyzimWVP8-tS7nGg6OFbnnJs4PAnn9CgEq9X3pnU"

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

/* ---------------------- HELPER FUNCTIONS ---------------------- */

// Capture viewport screenshot and upload to Supabase
async function captureScreenshotAndUpload(url, filename = "screenshot.png") {
  const browserInstance = await puppeteer.launch({ headless: true });
  const pageInstance = await browserInstance.newPage();

  await pageInstance.setViewport({ width: 1366, height: 768 });
  await pageInstance.goto(url, { waitUntil: "networkidle2" });

  const screenshotPath = path.join("/tmp", filename);
  await pageInstance.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`📸 Screenshot saved locally at: ${screenshotPath}`);

  await browserInstance.close();

  // Upload to Supabase
  const fileData = fs.readFileSync(screenshotPath);
  const { error } = await supabase.storage
    .from("product-images")
    .upload(filename, fileData, { cacheControl: "3600", upsert: true });

  if (error) throw new Error(`Supabase upload error: ${error.message}`);

  console.log(error)

  const { publicUrl, error: urlError } = supabase.storage
    .from("my-images")
    .getPublicUrl(filename);

  if (urlError) throw new Error(`Supabase URL error: ${urlError.message}`);

  console.log(`🌐 Screenshot uploaded. Public URL: ${publicUrl}`);
  return publicUrl;
}

// Scroll page in viewport-sized increments
async function scrollByViewport(page, delay = 1000) {
  await page.evaluate(async (wait) => {
    await new Promise((resolve) => {
      const viewportHeight = window.innerHeight;
      let scrolled = 0;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, viewportHeight);
        scrolled += viewportHeight;
        if (scrolled >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, wait);
    });
  }, delay);
}

// Human-like typing
async function typeFunction(values = {}) {
  if (!page) throw new Error("Page is not initialized");

  console.log("Step: Scrolling page before typing...");
  await page.evaluate(() => window.scrollTo({ top: 500, behavior: "smooth" }));
  await new Promise((resolve) => setTimeout(resolve, 1000));

  async function typeLikeHuman(selector, text) {
    for (const char of text) {
      await page.type(selector, char, { delay: 100 + Math.random() * 100 });
      if (Math.random() > 0.95) {
        await page.keyboard.press("Backspace");
        await page.type(selector, char, { delay: 50 });
      }
    }
  }

  const fields = await page.$$("form input, form textarea, form select");
  for (const [i, field] of fields.entries()) {
    const tag = await (await field.getProperty("tagName")).jsonValue();
    const type = (await (await field.getProperty("type")).jsonValue())?.toLowerCase();
    const name = await (await field.getProperty("name")).jsonValue();

    const fieldValue =
      values[name] && values[name].trim() !== ""
        ? values[name]
        : type === "email"
        ? `user${i}@example.com`
        : type === "password"
        ? `Password123!`
        : type === "number"
        ? `${Math.floor(Math.random() * 100)}`
        : type === "date"
        ? "2025-08-27"
        : tag === "TEXTAREA"
        ? `This is a sample message ${i}`
        : `Sample ${i}`;

    if (tag === "SELECT") {
      const options = await page.$$eval(`select[name="${name}"] option`, (opts) =>
        opts.map((o) => o.value).filter((v) => v)
      );
      if (options.length > 0) await page.select(`select[name="${name}"]`, options[0]);
    } else if (type === "checkbox" || type === "radio") {
      await field.hover();
      await field.click({ delay: 200 });
    } else if (type !== "hidden") {
      const selector = tag === "TEXTAREA" ? `textarea[name="${name}"]` : `input[name="${name}"]`;
      await typeLikeHuman(selector, fieldValue);
    }
  }

  // Submit form
  let submitBtn = await page.$('button[type="submit"], input[type="submit"]');
  if (!submitBtn) submitBtn = await page.$('form button, form input[type="button"]');

  if (submitBtn) {
    await submitBtn.evaluate((el) => el.scrollIntoView({ behavior: "smooth" }));
    await new Promise((resolve) => setTimeout(resolve, 500));
    await submitBtn.hover();
    await submitBtn.click({ delay: 300 });
  } else {
    const inputs = await page.$$('form input:not([type=hidden])');
    if (inputs.length > 0) {
      const lastInput = inputs[inputs.length - 1];
      await lastInput.focus();
      await page.keyboard.press("Enter");
    }
  }

  try {
    await page.waitForSelector(".success-message", { timeout: 5000 });
    console.log("✅ Form submitted successfully!");
  } catch {
    console.log("⚠️ No success message found, but form submitted.");
  }
}

// Vision analysis with direct image URL
async function askImageQuestion(imageURL, query) {
  console.log(`Asking Vision model: ${query}`);
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: query },
          { type: "image_url", image_url: { url: imageURL } },
        ],
      },
    ],
  });

  return response.choices[0].message.content;
}

/* --------------------------- TOOLS --------------------------- */

// Open browser
export const openBrowser = tool({
  name: "open-browser",
  description: "Open a browser and navigate to a URL",
  parameters: z.object({ url: z.string() }),
  async execute({ url }) {
    browser = await puppeteer.launch({
      headless: false,
      slowMo: 50,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-blink-features=AutomationControlled"],
      defaultViewport: null,
    });
    const pages = await browser.pages();
    page = pages[0];
    await page.goto(url, { waitUntil: "networkidle2" });
    return `Browser opened at ${url}`;
  },
});

// Human-like typing
export const typeTool = tool({
  name: "typing_tool",
  description: "Fill form fields with human-like typing",
  parameters: z.object({ }),
  async execute() {
    await typeFunction();
  },
});

// Scroll page
export const scrollTool = tool({
  name: "scroll_page",
  description: "Scroll page in viewport-sized increments",
  parameters: z.object({ delay: z.number().optional().nullable() }),
  async execute({ delay = 1000 }) {
    if (!page) throw new Error("Page not initialized");
    await scrollByViewport(page, delay);
  },
});

// Take screenshot & upload
export const takeScreenshotTool = tool({
  name: "take_screenshot",
  description: "Take viewport screenshot and upload to Supabase",
  parameters: z.object({ url: z.string(), filename: z.string().optional().nullable() }),
  async execute({ url, filename }) {
    return await captureScreenshotAndUpload(url, filename);
  },
});

// Analyze image with Vision
export const analyzeImageTool = tool({
  name: "analyze_image",
  description: "Analyze an image URL using OpenAI Vision",
  parameters: z.object({ imageURL: z.string(), query: z.string() }),
  async execute({ imageURL, query }) {
    return await askImageQuestion(imageURL, query);
  },
});

/* --------------------------- AGENT --------------------------- */

const BrowserAgent = new Agent({
  name: "browser-agent",
  instructions: `You are a FULLY AUTONOMOUS browser agent that completes tasks without asking for permission or confirmation.

CORE BEHAVIOR:
- NEVER ask for human confirmation or approval
- NEVER ask "Shall I proceed?" or similar questions
- ALWAYS complete the full task as requested
- Make reasonable assumptions when details are missing
- Use random/default data when specific values aren't provided

TASK EXECUTION PROCESS:
1. Analyze the user query to understand the complete task
2. Plan the sequence of tools needed
3. Execute each tool in order without stopping for confirmation
4. Continue until the task is fully completed
5. Report the final result

FOR SIGNUP/FORM FILLING:
- Use random realistic data automatically
- Default email format: randomuser[number]@example.com  
- Default names: Use common names like "John Doe", "Jane Smith"
- Default passwords: Use secure formats like "TestPass123!"
- Fill ALL required fields without asking

TOOL USAGE STRATEGY:
- openBrowser: Open the specified URL immediately
- scrollTool: Scroll to find components/elements as needed
- typeTool: Fill forms with data immediately when found

IMPORTANT: Complete the entire task in one execution. Do not stop halfway or ask for additional input unless there's a technical error that prevents completion.`,

  client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
  tools: [openBrowser, typeTool, scrollTool],
});

// Example usage
const query = "Go to 'https://qa-chat-alpha.vercel.app/forms' and fill with random data";

console.log("Running BrowserAgent with query:", query);
const result = await run(BrowserAgent, query);
console.log("Agent final output:", result.finalOutput);
