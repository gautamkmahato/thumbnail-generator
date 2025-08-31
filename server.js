const puppeteer = require("puppeteer");
const HumanTypingPlugin = require("puppeteer-extra-plugin-human-typing");


(async () => {
  const browser = await puppeteer.launch({
    headless: false,   // show browser while testing
    slowMo: 50,        // slow down actions a bit
    defaultViewport: null,
  });

  const page = await browser.newPage();
  await page.goto("https://qa-chat-alpha.vercel.app/forms", { waitUntil: "networkidle0" });

  // Smooth scroll down to make sure form is visible
  await page.evaluate(() => {
    window.scrollTo({ top: 500, behavior: "smooth" });
  });
  // await page.waitForTimeout(800);
  await new Promise((resolve) => setTimeout(resolve, 1000))


  // Example: human-like typing helper
  async function typeLikeHuman(selector, text) {
    for (const char of text) {
      await page.type(selector, char, { delay: 100 + Math.random() * 100 }); // random delay per char
      if (Math.random() > 0.9) {
        // simulate typo correction sometimes
        await page.keyboard.press("Backspace");
        await page.type(selector, char, { delay: 50 });
      }
    }
  }

  // Fill inputs (adjust selectors for your React app)
  await typeLikeHuman('input[name="name"]', "John Doe");
  await typeLikeHuman('input[name="email"]', "johndoe@example.com");
  await typeLikeHuman('input[name="city"]', "New York");
  await typeLikeHuman('input[name="password"]', "SuperSecret123!");

  // Dropdown (simulate click + select)
  await page.click('select[name="country"]');
  await page.select('select[name="country"]', "US");
  // await page.waitForTimeout(500);
  await new Promise((resolve) => setTimeout(resolve, 500))

  // Checkbox
  await page.hover('input[name="terms"]');
  await page.click('input[name="terms"]', { delay: 200 });

  // Handle date input (remove readonly if needed)
  try {
    await page.$eval('#dob', el => el.removeAttribute("readonly"));
    await typeLikeHuman('#dob', "2025-08-27");
  } catch {}

  // Scroll into view for submit button
  const submitBtn = await page.$('button[type="submit"], input[type="submit"]');
  await submitBtn.evaluate(el => el.scrollIntoView({ behavior: "smooth" }));
  // await page.waitForTimeout(1000);
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Human-like hover then click submit
  await page.hover('button[type="submit"], input[type="submit"]');
  await page.click('button[type="submit"], input[type="submit"]', { delay: 500 });

  // Wait for success message or navigation
  try {
    await page.waitForSelector(".success-message", { timeout: 5000 });
    console.log("✅ Form submitted successfully!");
  } catch {
    console.log("⚠️ No success message found, but form submitted.");
  }

  //await browser.close();
})();

///////////////////////////////////////////////////////////////////////////
/////////////////////////////// METHOD 2    /////////////////////////
///////// "puppeteer-extra-plugin-human-typing"  ////////////////////////
//////////////////////////////////////////////////////////////////////////


// Use the human typing plugin
puppeteer.use(HumanTypingPlugin());

(async () => {
  const browser = await puppeteer.launch({
    headless: false,  // show browser while testing
    slowMo: 50,       // add delay between actions
    defaultViewport: null,
  });

  const page = await browser.newPage();
  await page.goto("https://qa-chat-alpha.vercel.app/forms", { waitUntil: "networkidle0" });

  // Example of human-like typing
  await page.typeHuman('input[name="name"]', "John Doe");
  await page.typeHuman('input[name="email"]', "johndoe@example.com");
  await page.typeHuman('input[name="city"]', "New York");
  await page.typeHuman('input[name="password"]', "SuperSecret123!");

  // Dropdown
  // await page.click('select[name="country"]');
  // await page.select('select[name="country"]', "US");

  // Checkbox
  //await page.click('input[name="terms"]', { delay: 200 });

  // Date field (if readonly, remove first)
  // try {
  //   await page.$eval('#dob', el => el.removeAttribute("readonly"));
  //   await page.typeHuman('#dob', "2025-08-27");
  // } catch {}

  // Smooth scroll before submitting
  await page.evaluate(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  });
  //await page.waitForTimeout(1000);
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Submit the form
  await page.click('button[type="submit"], input[type="submit"]', { delay: 500 });

  // Wait for success message or navigation
  try {
    await page.waitForSelector(".success-message", { timeout: 5000 });
    console.log("✅ Form submitted successfully with human-like typing!");
  } catch {
    console.log("⚠️ Submitted, but no success message detected.");
  }

  await browser.close();
})();


/////////////////////////////////////////////////////////////////////////////
///////////   METHOD 3 - auto detects forms and fills it ///////////////////
////////////////////////////////////////////////////////////////////////////


(async () => {
  const browser = await puppeteer.launch({
    headless: false,   // show browser while testing
    slowMo: 50,        // slow down actions a bit
    defaultViewport: null,
  });

  const page = await browser.newPage();
  await page.goto("https://youtube.com", { waitUntil: "networkidle0" });

  // Smooth scroll down to make sure form is visible
  await page.evaluate(() => {
    window.scrollTo({ top: 500, behavior: "smooth" });
  });
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Human-like typing helper
  async function typeLikeHuman(selector, text) {
    for (const char of text) {
      await page.type(selector, char, { delay: 100 + Math.random() * 100 }); 
      if (Math.random() > 0.95) { // small chance of "typo" correction
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
    } else if (type === "date") {
      await page.$eval(`input[name="${name}"]`, el => el.removeAttribute("readonly"));
      await typeLikeHuman(`input[name="${name}"]`, "2025-08-27");
    } else if (type === "email") {
      await typeLikeHuman(`input[name="${name}"]`, `user${i}@example.com`);
    } else if (type === "password") {
      await typeLikeHuman(`input[name="${name}"]`, `Password123!`);
    } else if (type === "number") {
      await typeLikeHuman(`input[name="${name}"]`, `${Math.floor(Math.random() * 100)}`);
    } else if (tag === "TEXTAREA") {
      await typeLikeHuman(`textarea[name="${name}"]`, `This is a sample message ${i}`);
    } else if (type !== "hidden") {
      await typeLikeHuman(`input[name="${name}"]`, `Sample ${i}`);
    }
  }

  // Scroll into view and submit
  const submitBtn = await page.$('button[type="submit"], input[type="submit"]');
  if (submitBtn) {
    await submitBtn.evaluate(el => el.scrollIntoView({ behavior: "smooth" }));
    await new Promise(resolve => setTimeout(resolve, 1000));
    await submitBtn.hover();
    await submitBtn.click({ delay: 500 });
  }

  // Wait for success
  try {
    await page.waitForSelector(".success-message", { timeout: 5000 });
    console.log("✅ Form submitted successfully!");
  } catch {
    console.log("⚠️ No success message found, but form submitted.");
  }

  // await browser.close();
})();


/////////////////////////////////////////////////////////////////////////////
///////////////////////////   METHOD 3 - Search box and input box  ////////////////////////////
////////////////////////////////////////////////////////////////////////////

/**
 * Automatically detects standalone input boxes (not inside a form) 
 * and fills them with human-like typing.
 * If a button exists next to the input, it will click it.
 * 
 * @param {puppeteer.Page} page - The Puppeteer page object
 * @param {string} textToType - Text to type into the search/input box
 */
/**
 * Automatically fills input boxes and clicks their associated buttons.
 * Handles both inputs inside forms (with regular buttons) and standalone inputs.
 * 
 * @param {puppeteer.Page} page - Puppeteer page object
 * @param {string} textToType - Text to type into the input/search boxes
 */
async function autoFillSearchBoxes(page, textToType) {
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

  // Detect all visible inputs inside forms or standalone (not hidden)
  const inputs = await page.$$eval("input:not([type=hidden])", els =>
    els
      .filter(el => el.offsetParent !== null)
      .map(el => {
        // Find a button related to this input (sibling, parent, or inside form)
        let buttonSelector = null;

        // Check siblings first
        let siblingBtn = el.parentElement?.querySelector("button, input[type=button]");
        if (siblingBtn) buttonSelector = siblingBtn.tagName === "BUTTON" ? siblingBtn.outerHTML : siblingBtn.outerHTML;

        // If inside a form, find a button inside the form
        if (!buttonSelector && el.closest("form")) {
          const formBtn = el.closest("form").querySelector("button, input[type=button]");
          if (formBtn) buttonSelector = formBtn.tagName === "BUTTON" ? formBtn.outerHTML : formBtn.outerHTML;
        }

        return {
          name: el.name || el.id || null,
          selector: el.name ? `input[name="${el.name}"]` : el.id ? `#${el.id}` : null,
          buttonSelector
        };
      })
  );

  for (const field of inputs) {
    if (!field.selector) continue;

    await page.focus(field.selector);
    await typeLikeHuman(field.selector, textToType);

    // Click the associated button if it exists
    if (field.buttonSelector) {
      const btn = await page.$("button, input[type=button]");
      if (btn) {
        await btn.hover();
        await btn.click({ delay: 300 });
      }
    } else {
      // If no button, press Enter
      await page.keyboard.press("Enter");
    }

    // await page.waitForTimeout(1000); // wait a bit after each input
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`✅ Filled input: ${field.selector}`);
  }
}f


(async () => {
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null, 
  });
  const page = await browser.newPage();

  // Go to your target URL
  await page.goto("https://youtube.com", { waitUntil: "networkidle0" });

  // Call your auto-fill function and pass the page
  await autoFillSearchBoxes(page, "Puppeteer automation search");

  //await browser.close();
})();


///////////////////////////////////////////////////////////////////////////
/////////////////////////   METHOD 4 - Auto detects cards and scrape  ////////////////////////////
//////////////////////////////////////////////////////////////////////////


/**
 * Auto-detect and scrape card-like layouts dynamically
 * Returns data in JSON format [{ title: "" }]
 * Handles dynamic loading via scrolling
 * 
 * @param {puppeteer.Page} page - Puppeteer page object
 * @param {number} maxItems - Max number of cards to extract
 * @returns {Array<Object>} Array of JSON objects with title
 */
async function autoDetectAndScrapeCardsJSON(page, maxItems = 10) {
  const collected = new Map(); // use Map to avoid duplicates
  let lastHeight = 0;
  let scrollAttempts = 0;

  while (collected.size < maxItems && scrollAttempts < 10) {
    // Scroll down
    const newHeight = await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
      return document.body.scrollHeight;
    });

    // Wait 2–3 seconds for dynamic content
    // await page.waitForTimeout(2000 + Math.random() * 1000);
    await new Promise((resolve) => setTimeout(resolve, 2000 + Math.random() * 1000))


    // Auto-detect repeated elements and extract title
    const detected = await page.evaluate(() => {
      const visibleElements = Array.from(document.body.querySelectorAll("*"))
        .filter(el => el.offsetParent !== null && el.children.length > 0);

      // Group by parent and tagName
      const parentMap = {};
      visibleElements.forEach(el => {
        const parentTag = el.parentElement?.tagName || "BODY";
        const key = parentTag + ">" + el.tagName;
        if (!parentMap[key]) parentMap[key] = [];
        parentMap[key].push(el);
      });

      // Find the group with most children (>1)
      let bestGroup = [];
      for (const key in parentMap) {
        if (parentMap[key].length > bestGroup.length) bestGroup = parentMap[key];
      }

      // Extract first meaningful text from each element
      const results = bestGroup.map(el => {
        // const textEl = el.querySelector("h1,h2,h3,h4,h5,h6,p,span") || el;
        const textEl = el.querySelector("h3") || el;
        const title = textEl.innerText?.trim() || null;
        return title ? { title } : null;
      }).filter(Boolean);

      return results;
    });

    // Add unique titles to collected
    detected.forEach(item => {
      if (item.title && !collected.has(item.title)) {
        collected.set(item.title, item);
      }
    });

    // Stop if reached bottom
    if (newHeight === lastHeight) scrollAttempts++;
    else scrollAttempts = 0;

    lastHeight = newHeight;
  }

  return Array.from(collected.values()).slice(0, maxItems);
}


(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto("https://www.youtube.com/results?search_query=puppeteer", { waitUntil: "networkidle0" });

  const cardsData = await autoDetectAndScrapeCardsJSON(page, 10);
  console.log("Detected cards JSON:", cardsData);

  // await browser.close();
})();
