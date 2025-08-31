import puppeteer from "puppeteer";

// Change the target URL
const url = "https://www.amazon.in/s?k=mobile&crid=1AFEC8GES7PIO&sprefix=mobile%2Caps%2C359&ref=nb_sb_noss_2";

const opts = {
  timeout: 30000,
  waitUntil: "networkidle2",
  maxScrolls: 6,
};

async function autoScroll(page, maxSteps = 6) {
  await page.evaluate(async (maxSteps) => {
    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
    let lastHeight = document.scrollingElement.scrollHeight;
    let stagnant = 0;
    for (let i = 0; i < maxSteps; i++) {
      window.scrollBy(0, window.innerHeight);
      await sleep(400);
      const newHeight = document.scrollingElement.scrollHeight;
      if (newHeight <= lastHeight) stagnant++;
      else stagnant = 0;
      lastHeight = newHeight;
      if (stagnant >= 2) break;
    }
  }, maxSteps);
}

function safeJSONStringify(obj) {
  try { return JSON.stringify(obj, null, 2); } catch { return String(obj); }
}

export default async function getStructure() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 850 });
  await page.goto(url, { timeout: opts.timeout, waitUntil: opts.waitUntil });
  await autoScroll(page, opts.maxScrolls);

  const result = await page.evaluate((sourceUrl) => {
    // ---- Helpers ----
    const normalizeClass = (cls) => {
      if (!cls) return [];
      const str = typeof cls === "string" ? cls : (cls.baseVal || String(cls));
      return str
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    };

    const elementSig = (el) => {
      const tag = el.tagName.toLowerCase();
      const cls = normalizeClass(el.className).slice(0, 1).join(".");
      return tag + (cls ? "." + cls : "");
    };

    // ---- Find repeating candidates ----
    let candidates = [];
    const all = Array.from(document.querySelectorAll("div,section,ul,ol"));
    for (const el of all) {
      const kids = Array.from(el.children);
      if (kids.length < 3) continue;
      const sigs = kids.map(elementSig);
      const freq = {};
      for (let s of sigs) freq[s] = (freq[s] || 0) + 1;
      const maxCount = Math.max(...Object.values(freq));
      if (maxCount >= 3) {
        candidates.push({
          el,
          sig: Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0],
          count: maxCount,
          size: kids.length,
        });
      }
    }
    if (!candidates.length) {
      return { sourceUrl, structure: null, error: "⚠️ No repeated card-like content detected." };
    }

    // pick best candidate
    candidates.sort((a, b) => b.count - a.count);
    const best = candidates[0];
    const itemEl = best.el.querySelector(best.sig);
    if (!itemEl) {
      return { sourceUrl, structure: null, error: "⚠️ Could not locate item element." };
    }

    // ---- Build recursive structure ----
    function buildStructure(el) {
      const obj = {
        type: el.tagName.toLowerCase(),
      };
      if (el.id) obj.id = el.id;
      const cls = normalizeClass(el.className).join(" ");
      if (cls) obj.class = cls;

      // keep key attributes
      ["href", "src", "alt", "title"].forEach(attr => {
        if (el.hasAttribute && el.hasAttribute(attr)) {
          obj[attr] = el.getAttribute(attr);
        }
      });

      if (el.children.length > 0) {
        obj.children = Array.from(el.children).map(buildStructure);
      } else {
        obj.text = ""; // leave empty, only structure
      }
      return obj;
    }

    const structure = buildStructure(itemEl);
    return { sourceUrl, structure };
  }, url);

  console.log(safeJSONStringify(result));
  await browser.close();
  return safeJSONStringify(result);
}

const res = await getStructure();