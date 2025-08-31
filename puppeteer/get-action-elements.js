import puppeteer from "puppeteer";

/**
 * Find element by visible text and optionally click it
 * @param {object} page - Puppeteer page instance
 * @param {string} searchText - The text to search for
 * @param {boolean} click - Whether to click the element if found
 */
async function findElementByText(page, searchText, click = false) {
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

async function main() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // 👇 Change to test with a real site
  await page.goto("https://www.youtube.com/results?search_query=javascript", { waitUntil: "networkidle2" });

  // Try with partial text
  await findElementByText(page, "JavaScript Full Course (2025-26) - Beginners to Pro", true);

  await browser.close();
}

main();
