import puppeteer from "puppeteer";

async function extractInteractiveElements(url) {
  const browser = await puppeteer.launch({
    headless: true, // set to false if you want to see the browser
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: { width: 1280, height: 800 },
  });

  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle2" });

  // Extract interactive elements
  const elements = await page.$$eval("input, button, a, textarea, select", (els) =>
    els.map((el) => ({
      tag: el.tagName.toLowerCase(),
      id: el.id,
      name: el.getAttribute("name"),
      placeholder: el.getAttribute("placeholder"),
      text: el.innerText ? el.innerText.slice(0, 50) : "",
      type: el.getAttribute("type"),
    }))
  );

  await browser.close();
  return elements;
}

// Example usage:
(async () => {
  const url = "https://www.google.com"; // replace with any webpage
  const interactiveElements = await extractInteractiveElements(url);
  console.log(JSON.stringify(interactiveElements, null, 2));
})();
