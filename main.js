import "dotenv/config";
import OpenAI from "openai";
import { Agent, run, tool } from "@openai/agents";
import z from "zod";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

let browser = null;
let page = null;

// ----------------- Tools -----------------

export const openBrowser = tool({
  name: "open-browser",
  description: "Open a browser and navigate to a URL",
  parameters: z.object({ url: z.string() }),
  async execute({ url }) {
    console.log("Step: opening browser...");
    browser = await puppeteer.launch({
      headless: false,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-blink-features=AutomationControlled"],
      defaultViewport: { width: 1280, height: 800 },
    });
    const pages = await browser.pages();
    page = pages[0];
    await page.goto(url, { waitUntil: "networkidle2" });
    console.log(`Browser opened at ${url}`);
    return `Browser opened at ${url}`;
  },
});

export const extractElements = tool({
  name: "extract-elements",
  description: "Get interactive elements in viewport (inputs, buttons, anchors, textareas, selects). If using <a> tag, consider using href to navigate.",
  parameters: z.object({ batchSize: z.number().default(20) }),
  async execute({ batchSize }) {
    console.log("Step: extracting elements...");
    if (!page) throw new Error("No active page");
    const elements = await page.$$eval("input, button, a, textarea, select", (els) =>
      els.map((el) => ({
        tag: el.tagName.toLowerCase(),
        id: el.id,
        name: el.getAttribute("name"),
        placeholder: el.getAttribute("placeholder"),
        text: el.innerText ? el.innerText.slice(0, 50) : "",
        type: el.getAttribute("type"),
        href: el.tagName.toLowerCase() === "a" ? el.getAttribute("href") : undefined,
      }))
    );
    console.log(`Extraction done. Found ${elements.length} elements`);
    return elements.slice(0, batchSize);
  },
});


export const typeText = tool({
  name: "type-text",
  description: "Type text into an input field in a human-like way (pauses, typos, corrections, React/Vue compatible).",
  parameters: z.object({ selector: z.string(), text: z.string() }),
  async execute({ selector, text }) {
    console.log(`Typing "${text}" into ${selector}...`);
    if (!page) throw new Error("No active page");

    const input = await page.waitForSelector(selector, { state: "visible" });
    if (!input) throw new Error(`Selector not found: ${selector}`);

    await input.focus();

    // Clear any existing text
    await page.keyboard.down("Control");
    await page.keyboard.press("A");
    await page.keyboard.up("Control");
    await page.keyboard.press("Backspace");

    // Human-like typing with typos & corrections
    const possibleTypos = "abcdefghijklmnopqrstuvwxyz";
    for (const char of text) {
      // 10% chance: insert a typo, then backspace
      if (Math.random() < 0.1) {
        const typoChar = possibleTypos[Math.floor(Math.random() * possibleTypos.length)];
        await page.keyboard.type(typoChar, { delay: 80 + Math.floor(Math.random() * 120) });
        await page.waitForTimeout(200 + Math.floor(Math.random() * 200));
        await page.keyboard.press("Backspace");
      }

      // Type the correct character
      await page.keyboard.type(char, { delay: 60 + Math.floor(Math.random() * 120) });

      // Add extra pause after spaces
      if (char === " " && Math.random() < 0.3) {
        await page.waitForTimeout(300 + Math.floor(Math.random() * 200));
      }
    }

    // Force React/Vue to register final value
    await page.$eval(
      selector,
      (el, value) => {
        const setter = Object.getOwnPropertyDescriptor(el.__proto__, "value").set;
        setter.call(el, value); // native setter
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      },
      text
    );

    // Verify final value
    const typedValue = await page.$eval(selector, (el) => el.value);
    if (typedValue === text) {
      console.log(`✅ Typed "${text}" into ${selector} successfully (human-like + React/Vue safe).`);
      return `Successfully typed "${text}" into ${selector}.`;
    } else {
      throw new Error(`❌ Mismatch: expected "${text}" but input has "${typedValue}".`);
    }
  },
});




export const pressKey = tool({
  name: "press-key",
  description: "Press a keyboard key",
  parameters: z.object({ key: z.string() }),
  async execute({ key }) {
    console.log(`Step: pressing key ${key}...`);
    if (!page) throw new Error("No active page");
    await page.keyboard.press(key);
    console.log(`Pressed key "${key}"`);
    return `Pressed key "${key}"`;
  },
});

export const clickElement = tool({
  name: "click-element",
  description: "Click an element using a CSS selector",
  parameters: z.object({ selector: z.string() }),
  async execute({ selector }) {
    if (!page) throw new Error("No active page");
    console.log(`Clicking element ${selector}...`);

    await page.waitForSelector(selector, { visible: true });
    const elementHandle = await page.$(selector);

    if (!elementHandle) return `Element not found: ${selector}`;

    await elementHandle.evaluate(el => el.scrollIntoView({ behavior: "instant", block: "center" }));
    await elementHandle.click({ delay: 100 });
    await page.waitForTimeout(1000);

    // ✅ Validation: check if button was disabled or removed after click
    const exists = await page.$(selector);
    const clickedSuccessfully = !exists || await page.$eval(selector, el => el.disabled || el.tagName.toLowerCase() !== "button");
    console.log(`Clicked element ${selector}, validation: ${clickedSuccessfully}`);
    return `Clicked element ${selector}`;
  },
});


export const scrollPage = tool({
  name: "scroll-page",
  description: "Scroll page vertically by pixels",
  parameters: z.object({ pixels: z.number() }),
  async execute({ pixels }) {
    console.log(`Step: scrolling page by ${pixels}px...`);
    if (!page) throw new Error("No active page");
    await page.evaluate((y) => window.scrollBy(0, y), pixels);
    await page.waitForTimeout(500);
    console.log(`Scrolled page by ${pixels}px`);
    return `Scrolled page by ${pixels}px`;
  },
});

export const moveCursor = tool({
  name: "move-cursor",
  description: "Move cursor to x,y coordinates",
  parameters: z.object({ x: z.number(), y: z.number() }),
  async execute({ x, y }) {
    console.log(`Step: moving cursor to (${x}, ${y})...`);
    if (!page) throw new Error("No active page");
    await page.mouse.move(x, y, { steps: 15 });
    await page.waitForTimeout(300);
    console.log(`Moved cursor to (${x}, ${y})`);
    return `Moved cursor to (${x}, ${y})`;
  },
});

// export const takeScreenshot = tool({
//   name: "take-screenshot",
//   description: "Take screenshot of the current page",
//   parameters: z.object({ filename: z.string() }),
//   async execute({ filename }) {
//     console.log(`Step: taking screenshot ${filename}...`);
//     if (!page) throw new Error("No active page");
//     await page.screenshot({ path: filename, fullPage: true });
//     console.log(`Screenshot saved as ${filename}`);
//     return `Screenshot saved as ${filename}`;
//   },
// });



// 🧠 Agent definition
const agent = new Agent({
  name: "BrowserAgent",
  instructions: `
You are a web automation assistant.
- Your job is to perform multi-step tasks in a browser using tools.
- Always use browser tools to perform actions; never answer directly.
- Plan before acting: 
  1. Read the user's query.
  2. Break the query into a sequence of concrete steps (planning).
  3. Execute each step using available tools (openBrowser, extractElements, typeText, pressKey, clickElement, scrollPage, moveCursor, takeScreenshot, closeBrowser).
- For discovering interactive elements dynamically, use the 'extract-elements' tool.
- If using <a> tag, consider using href attribute for navigation.
- Wait for dynamic content to load before interacting.
- Stop only when the task is clearly complete but donot close the browser (all user instructions executed).
- If unsure about an element, use 'extract-elements' and decide based on visible text, placeholder, or type.
- When searching (e.g., YouTube, Google), prefer pressing "Enter" after typing instead of clicking buttons, unless clicking is necessary.
- Always provide updates of what you are about to do before calling a tool (planning phase).
- Maintain a step-by-step approach, do not skip steps.
- If the task is to "fill all fields," loop through all inputs, textareas, selects, and checkboxes.
- Decide values based on type, placeholder, or name.
- Always call extract-elements before typing to know all available fields.
- Do not submit until all fields are filled.
- Do NOT close the browser under any circumstances. The user will handle closing the browser manually.
- Only call the tools listed. Never invent a tool or assume closing the browser is necessary.


Example:
User query: "Go to youtube.com, search 'OpenAI Agent SDK tutorial', play first video"
Planning steps:
1. openBrowser("https://youtube.com")
2. extractElements() → find search box
3. typeText(searchBoxSelector, "OpenAI Agent SDK tutorial")
4. pressKey("Enter")
5. wait for results, extractElements() → find first video link
6. clickElement(firstVideoSelector)


**NOTE**: When the task will complete dont close the browser

Always follow this pattern for complex tasks.
`,
  client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
  tools: [openBrowser, typeText, pressKey, clickElement, scrollPage, moveCursor, extractElements],
  
});


// 🏃 Runner
async function runBrowserAgent(query) {
  let done = false;
  let lastOutput = "";

  // Keep track of the agent state manually
  while (!done) {
    const result = await run(agent, query, {
      // Make sure toolChoice is required
      toolChoice: { type: "required" }
    });

    //console.log("Agent history:", result.history);
    console.log("Agent output:", result.finalOutput);

    // Update last output
    lastOutput = result.finalOutput;

    // Check if the agent has truly completed the task
    // Ignore any mention of closing browser
    if (
      result.finalOutput.includes("task completed") ||
      result.finalOutput.includes("all steps done")
    ) {
      done = true; // stop loop, browser stays open
    } else {
      // For multi-step tasks, feed the last output as next input
      query = `Continue the previous task. Previous output: ${lastOutput}`;
    }
  }

  return lastOutput;
}


// Example usage
const userQuery = "Go to 'ui.chaicode.com' and try to sign in use random email and password ";
const output = await runBrowserAgent(userQuery);

console.log("Final Output:", output);
