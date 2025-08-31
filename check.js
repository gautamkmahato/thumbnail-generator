import "dotenv/config";
import { Agent, run, tool } from "@openai/agents";
import OpenAI from "openai";
import puppeteer from "puppeteer";
import z from "zod";

/* ---------------------- GLOBALS ---------------------- */
let browser = null;
let page = null;

/* ---------------------- HELPER FUNCTIONS ---------------------- */

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

/* --------------------------- TOOLS --------------------------- */

// 1️⃣ Open browser
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

// 2️⃣ Scroll page
export const scrollTool = tool({
  name: "scroll_page",
  description: "Scroll page in viewport-sized increments",
  parameters: z.object({ delay: z.number().optional().nullable() }),
  async execute({ delay = 1000 }) {
    if (!page) throw new Error("Page not initialized");
    await scrollByViewport(page, delay);
  },
});

// 3️⃣ Dynamic UI interaction
export const interactComponentTool = tool({
  name: "interact-component",
  description: "Dynamically interact with a UI component based on user instruction",
  parameters: z.object({ query: z.string() }),
  async execute({ query }) {
    if (!page) throw new Error("Page not initialized");

    console.log(`Looking for component matching: "${query}"`);
    const keyword = query.toLowerCase();

    const elements = await page.$x(
      `//button[contains(translate(text(),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'${keyword}')] | 
       //a[contains(translate(text(),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'${keyword}')] | 
       //div[contains(translate(text(),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'${keyword}') and (@role='button' or @tabindex)] | 
       //*[@aria-label][contains(translate(@aria-label,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'${keyword}')]`
    );

    if (elements.length === 0) {
      console.log(`⚠️ No component found for "${query}"`);
      return `No component found matching "${query}"`;
    }

    const el = elements[0];
    await el.evaluate((e) => e.scrollIntoView({ behavior: "smooth" }));
    await page.waitForTimeout(500);
    await el.click({ delay: 100 });

    console.log(`✅ Component "${query}" clicked successfully!`);
    return `Component "${query}" clicked successfully!`;
  },
});

/* --------------------------- AGENT --------------------------- */

const BrowserAgent = new Agent({
  name: "dynamic-ui-agent",
  instructions: `You are a fully autonomous browser agent that can interact with ANY UI component dynamically.

CORE BEHAVIOR:
- Never ask for human confirmation
- Execute the full task as requested
- Detect components dynamically (buttons, toggles, switches, links)
- Scroll page if needed
- Handle multiple instructions in sequence
`,
  client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
  tools: [openBrowser, scrollTool, interactComponentTool],
});

/* --------------------------- RUN AGENT --------------------------- */

const query = "Go to 'https://ui.chaicode.com', click login component, then click submit button, then open sidebar";

console.log("Running BrowserAgent with query:", query);
const result = await run(BrowserAgent, query);
console.log("Agent final output:", result.finalOutput);
