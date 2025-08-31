import "dotenv/config";
import { Agent, run, tool } from "@openai/agents";
import OpenAI from "openai";
import puppeteer from "puppeteer";
import z from "zod";


let browser = null;
let page = null;


/**
 * Auto-fill form fields with human-like typing.
 * Uses provided values JSON if available, otherwise falls back to defaults.
 *
 * @param {Object} values - Key-value pairs where key = input name, value = text to fill
 */
async function typeFunction(values = {}) {
  // Smooth scroll down to make sure form is visible
  await page.evaluate(() => {
    window.scrollTo({ top: 500, behavior: "smooth" });
  });
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Human-like typing helper
  async function typeLikeHuman(selector, text) {
    for (const char of text) {
      await page.type(selector, char, { delay: 100 + Math.random() * 100 });
      if (Math.random() > 0.95) {
        await page.keyboard.press("Backspace");
        await page.type(selector, char, { delay: 50 });
      }
    }
  }

  // Auto-detect and fill all form fields
  const fields = await page.$$("form input, form textarea, form select");

  for (const [i, field] of fields.entries()) {
    const tag = await (await field.getProperty("tagName")).jsonValue();
    const type = (await (await field.getProperty("type")).jsonValue())?.toLowerCase();
    const name = await (await field.getProperty("name")).jsonValue();

    console.log(tag, type, name);
    console.log("values", values)

    // ✅ Use provided value if exists, otherwise fallback
    const fieldValue =
      values[name] && values[name].trim() !== ""
        ? values[name]
        : (type === "email"
            ? `user${i}@example.com`
            : type === "password"
            ? `Password123!`
            : type === "number"
            ? `${Math.floor(Math.random() * 100)}`
            : type === "date"
            ? "2025-08-27"
            : tag === "TEXTAREA"
            ? `This is a sample message ${i}`
            : `Sample ${i}`);

    if (tag === "SELECT") {
      // Select first non-placeholder option
      const options = await page.$$eval(`select[name="${name}"] option`, opts =>
        opts.map(o => o.value).filter(v => v)
      );
      if (options.length > 0) {
        await page.select(`select[name="${name}"]`, options[0]);
      }
    } else if (type === "checkbox" || type === "radio") {
      await field.hover();
      await field.click({ delay: 200 });
    } else if (type !== "hidden") {
      const selector =
        tag === "TEXTAREA" ? `textarea[name="${name}"]` : `input[name="${name}"]`;
      await typeLikeHuman(selector, fieldValue);
    }
  }

  // First, try to find native submit buttons
  let submitBtn = await page.$('button[type="submit"], input[type="submit"]');

  // If no submit button, try any button inside the form
  if (!submitBtn) {
    submitBtn = await page.$('form button, form input[type="button"]');
  }

  // If we found a button, click it
  if (submitBtn) {
    await submitBtn.evaluate(el => el.scrollIntoView({ behavior: "smooth" }));
    await new Promise(resolve => setTimeout(resolve, 500));
    await submitBtn.hover();
    await submitBtn.click({ delay: 300 });
  } else {
    // Fallback: press Enter on the last visible input in the form
    const inputs = await page.$$('form input:not([type=hidden])');
    if (inputs.length > 0) {
      const lastInput = inputs[inputs.length - 1];
      await lastInput.focus();
      await page.keyboard.press('Enter');
    }
  }

  // Wait for success
  try {
    await page.waitForSelector(".success-message", { timeout: 5000 });
    console.log("✅ Form submitted successfully!");
  } catch {
    console.log("⚠️ No success message found, but form submitted.");
  }
}

import puppeteer from "puppeteer";
import fs from "fs";

// 🔹 Convert image file to base64 string
function imageToBase64(imagePath) {
  const fileData = fs.readFileSync(imagePath);
  return fileData.toString("base64");
}

async function captureScreenshotAndConvert(url, screenshotPath = "screenshot.png") {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: "networkidle2" });

  // Take screenshot
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`📸 Screenshot saved at: ${screenshotPath}`);

  // Convert screenshot to base64
  const base64Image = imageToBase64(screenshotPath);
  console.log("✅ Screenshot converted to base64 (truncated):", base64Image.substring(0, 100), "...");

  await browser.close();
  return base64Image;
}


// 🔹 Call OpenAI vision model with image + query
async function askImageQuestion(base64Image, query) {

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


/**
 * Find element by visible text and optionally click it
 * @param {object} page - Puppeteer page instance
 * @param {string} searchText - The text to search for
 * @param {boolean} click - Whether to click the element if found
 */
async function findElementByText(searchText, click = false) {
  // Normalize text (ignore case, trim spaces)
  const normalized = searchText.toLowerCase().trim();

  // --- First try: Exact match ---
  let elementHandle = await page.evaluateHandle((text) => {
    const xpath = `//*[translate(normalize-space(text()), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz') = '${text}']`;
    return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
  }, normalized);

  // --- Second try: Partial match ---
  if (!elementHandle || (await elementHandle.jsonValue()) === null) {
    elementHandle = await page.evaluateHandle((text) => {
      const xpath = `//*[contains(translate(normalize-space(text()), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${text}')]`;
      return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    }, normalized);
  }

  if (!elementHandle || (await elementHandle.jsonValue()) === null) {
    console.log(`❌ No element found with text (exact or partial): "${searchText}"`);
    return null;
  }

  // Extract properties
  const details = await page.evaluate((el) => {
    return {
      tag: el.tagName.toLowerCase(),
      text: el.innerText.trim(),
      id: el.id || null,
      type: el.getAttribute("type") || null,
      href: el.getAttribute("href") || null,
      classes: el.className || null,
    };
  }, elementHandle);

  console.log("✅ Found element:", details);

  // If clickable, click
  if (click && ["a", "button", "input"].includes(details.tag)) {
    await elementHandle.click();
    console.log(`🖱️ Clicked on: "${details.text}"`);
  }

  return details;
}


export const openBrowser = tool({
  name: "open-browser",
  description: "Open a browser and navigate to a URL",
  parameters: z.object({ url: z.string() }),
  async execute({ url }) {
    console.log("Step: opening browser...");
    browser = await puppeteer.launch({
        headless: false,   // show browser while testing
        slowMo: 50,        // slow down actions a bit
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-blink-features=AutomationControlled"],
        defaultViewport: null,
    });
    const pages = await browser.pages();
    page = pages[0];
    await page.goto(url, { waitUntil: "networkidle2" });
    console.log(`Browser opened at ${url}`);
    return `Browser opened at ${url}`;
  },
});


const typeTool = tool({
  name: "typing_tool",
  description: "This is a typing tool, which fills data using human like typing",
  parameters: z.object({
    values: z.record(z.string(), z.string()).optional().nullable().describe(
      "Optional key-value map where keys are input field names and values are the text to type"
    ),
  }),
  async execute({ values = {} }) {
    await typeFunction(values);
  },
});


const TakeScreenshotTool = tool({
  name: 'analyze-image-tool',
  description: 'Its an tool to take screenshot of a webpage',
  parameters: z.object({}),
  async execute(){
    await captureScreenshotAndConvert(url)
  }
})

const AnalyzeImageTool = tool({
  name: 'analyze-image-tool',
  description: 'Its an tool to analyze an image',
  parameters: z.object({}),
  async execute(){
    await askImageQuestion(base64Image, query)
  }
})

const FindElementByTextTool = tool({
  name: 'find-element-text',
  description: 'Its an tool to find the text from the DOM',
  parameters: z.object({}),
  async execute(){
    await findElementByText(searchText, click)
  }
})


const BrowserAgent = new Agent({
    name: 'browser-agent',
    instructions: `You are a smart browser agent. Your job is to analyze the user query
        and call the requried tools to complete the task. Always first plan then decide which
        tools to call and get the required data for the tool and then call the tool, repeat this
        process untill the task is completed.
     `,
     client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
    tools: [openBrowser, typeTool, AnalyzeImageTool, TakeScreenshotTool, FindElementByTextTool]
})

// const query = "Go to 'https://qa-chat-alpha.vercel.app/forms' fill out form with some data ";
const query = "Go to 'https://youtube.com' and type 'hello world' and search videos ";


const result = await run(BrowserAgent, query, {
    // Make sure toolChoice is required
    // toolChoice: { type: "required" }
});

console.log(result.finalOutput)