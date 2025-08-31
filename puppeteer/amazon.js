import puppeteer from 'puppeteer';

const DEFAULT_CONFIG = {
  timeout: 45000,
  waitUntil: 'networkidle2',
  maxScrolls: 10,
  scrollDelay: 600,
  minItemCount: 3,
  maxItemsToExtract: 100,
  viewport: { width: 1366, height: 850 },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

// Enhanced auto-scroll with dynamic content detection
async function smartScroll(page, maxSteps = 10, delay = 600) {
  await page.evaluate(async (maxSteps, delay) => {
    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
    
    let lastHeight = document.scrollingElement.scrollHeight;
    let lastItemCount = document.querySelectorAll('[data-testid], [class*="item"], [class*="card"], [class*="post"], [class*="product"]').length;
    let stagnantScrolls = 0;
    let stagnantItems = 0;
    
    for (let i = 0; i < maxSteps; i++) {
      // Scroll by viewport height
      window.scrollBy(0, window.innerHeight);
      await sleep(delay);
      
      // Check for lazy loading triggers
      const lazyElements = document.querySelectorAll('[loading="lazy"], .lazy, [data-src]');
      lazyElements.forEach(el => {
        if (el.getBoundingClientRect().top < window.innerHeight * 2) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
      
      await sleep(200);
      
      const newHeight = document.scrollingElement.scrollHeight;
      const newItemCount = document.querySelectorAll('[data-testid], [class*="item"], [class*="card"], [class*="post"], [class*="product"]').length;
      
      // Track stagnation in both height and item count
      if (newHeight <= lastHeight) stagnantScrolls++;
      else stagnantScrolls = 0;
      
      if (newItemCount <= lastItemCount) stagnantItems++;
      else stagnantItems = 0;
      
      lastHeight = newHeight;
      lastItemCount = newItemCount;
      
      // Stop if both height and items are stagnant
      if (stagnantScrolls >= 3 && stagnantItems >= 3) break;
      
      // Also check if we've reached the bottom
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
        await sleep(1000); // Wait for any final loading
        break;
      }
    }
  }, maxSteps, delay);
}

// Safe JSON stringify with circular reference handling
function safeJSONStringify(obj, space = 2) {
  const seen = new WeakSet();
  try {
    return JSON.stringify(obj, (key, val) => {
      if (val !== null && typeof val === "object") {
        if (seen.has(val)) return '[Circular]';
        seen.add(val);
      }
      return val;
    }, space);
  } catch (error) {
    return JSON.stringify({ error: 'Serialization failed', message: error.message }, null, space);
  }
}

// Main extraction function
export default async function extractWebData(url, config = {}) {
  const opts = { ...DEFAULT_CONFIG, ...config };
  
  if (!url || typeof url !== 'string') {
    throw new Error('Valid URL is required');
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ],
    });

    const page = await browser.newPage();
    
    // Set viewport and user agent
    await page.setViewport(opts.viewport);
    await page.setUserAgent(opts.userAgent);
    
    // Block unnecessary resources to speed up loading
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    console.log(`🔍 Navigating to: ${url}`);
    await page.goto(url, { 
      timeout: opts.timeout, 
      waitUntil: opts.waitUntil 
    });

    // Wait for initial content load
    // await page.waitForTimeout(2000);
    await new Promise((resolve) => setTimeout(resolve, 2000))
    
    console.log('📜 Starting smart scroll...');
    await smartScroll(page, opts.maxScrolls, opts.scrollDelay);
    
    console.log('🔍 Analyzing page structure...');
    const result = await page.evaluate((sourceUrl, minItemCount, maxItemsToExtract) => {
      // ---- Content Area Detection ----
      const EXCLUDE_SELECTORS = [
        'nav', 'header', 'footer', 'aside', 'sidebar',
        '[class*="nav"]', '[class*="header"]', '[class*="footer"]', 
        '[class*="sidebar"]', '[class*="menu"]', '[class*="breadcrumb"]',
        '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
        '[class*="filter"]', '[class*="sort"]', '[class*="pagination"]',
        '[id*="nav"]', '[id*="header"]', '[id*="footer"]', '[id*="sidebar"]'
      ];

      const isExcludedElement = (el) => {
        return EXCLUDE_SELECTORS.some(selector => {
          try {
            return el.matches(selector) || el.closest(selector);
          } catch (e) {
            return false;
          }
        });
      };

      // ---- Helper Functions ----
      const normalizeClass = (cls) => {
        if (!cls) return [];
        const str = typeof cls === "string" ? cls : (cls.baseVal || String(cls));
        return str.trim().split(/\s+/).filter(Boolean);
      };

      const elementSignature = (el) => {
        const tag = el.tagName.toLowerCase();
        const classes = normalizeClass(el.className);
        const relevantClasses = classes.filter(c => 
          !c.match(/^(col|row|flex|grid|p-|m-|text-|bg-|border-)/i)
        ).slice(0, 2);
        return tag + (relevantClasses.length ? '.' + relevantClasses.join('.') : '');
      };

      const extractTextContent = (el) => {
        const clone = el.cloneNode(true);
        // Remove script and style elements
        clone.querySelectorAll('script, style, noscript').forEach(e => e.remove());
        return clone.textContent?.trim() || '';
      };

      const extractElementData = (el) => {
        const data = {};
        
        // Extract text content
        const textContent = extractTextContent(el);
        if (textContent && textContent.length > 0) {
          data.text = textContent;
        }

        // Extract links
        const links = Array.from(el.querySelectorAll('a[href]')).map(a => ({
          text: extractTextContent(a),
          href: a.href,
          title: a.title || null
        })).filter(link => link.text || link.title);
        
        if (links.length > 0) {
          data.links = links;
        }

        // Extract images
        const images = Array.from(el.querySelectorAll('img[src]')).map(img => ({
          src: img.src,
          alt: img.alt || null,
          title: img.title || null
        }));
        
        if (images.length > 0) {
          data.images = images;
        }

        // Extract prices (common pattern)
        const priceElements = el.querySelectorAll('[class*="price"], [class*="cost"], [data-testid*="price"]');
        if (priceElements.length > 0) {
          data.prices = Array.from(priceElements).map(p => extractTextContent(p)).filter(Boolean);
        }

        // Extract dates (common pattern)
        const dateElements = el.querySelectorAll('[class*="date"], [class*="time"], time, [datetime]');
        if (dateElements.length > 0) {
          data.dates = Array.from(dateElements).map(d => ({
            text: extractTextContent(d),
            datetime: d.getAttribute('datetime') || null
          })).filter(d => d.text);
        }

        // Extract ratings (common pattern)
        const ratingElements = el.querySelectorAll('[class*="rating"], [class*="star"], [class*="score"]');
        if (ratingElements.length > 0) {
          data.ratings = Array.from(ratingElements).map(r => extractTextContent(r)).filter(Boolean);
        }

        // Extract structured data from data attributes
        const dataAttrs = {};
        Array.from(el.attributes).forEach(attr => {
          if (attr.name.startsWith('data-') && attr.value) {
            dataAttrs[attr.name] = attr.value;
          }
        });
        if (Object.keys(dataAttrs).length > 0) {
          data.dataAttributes = dataAttrs;
        }

        return data;
      };

      // ---- Find Main Content Area ----
      const contentSelectors = [
        'main', '[role="main"]', '[class*="content"]', '[class*="main"]',
        '[id*="content"]', '[id*="main"]', '.container', '[class*="list"]',
        '[class*="grid"]', '[class*="items"]'
      ];

      let contentArea = document.body;
      for (const selector of contentSelectors) {
        const el = document.querySelector(selector);
        if (el && !isExcludedElement(el)) {
          contentArea = el;
          break;
        }
      }

      // ---- Find Repeating Item Patterns ----
      const potentialContainers = Array.from(contentArea.querySelectorAll(
        'div, section, ul, ol, article, [class*="list"], [class*="grid"], [class*="container"]'
      )).filter(el => !isExcludedElement(el));

      let candidates = [];
      
      for (const container of potentialContainers) {
        const children = Array.from(container.children).filter(child => 
          !isExcludedElement(child) && child.offsetHeight > 0 && child.offsetWidth > 0
        );
        
        if (children.length < minItemCount) continue;

        const signatures = children.map(elementSignature);
        const signatureFreq = {};
        
        signatures.forEach(sig => {
          signatureFreq[sig] = (signatureFreq[sig] || 0) + 1;
        });

        const maxCount = Math.max(...Object.values(signatureFreq));
        if (maxCount >= minItemCount) {
          const dominantSig = Object.entries(signatureFreq)
            .sort((a, b) => b[1] - a[1])[0][0];
          
          candidates.push({
            container,
            signature: dominantSig,
            count: maxCount,
            totalChildren: children.length,
            avgHeight: children.reduce((sum, child) => sum + child.offsetHeight, 0) / children.length
          });
        }
      }

      if (candidates.length === 0) {
        return {
          sourceUrl,
          timestamp: new Date().toISOString(),
          success: false,
          error: "No repeating content patterns found",
          itemCount: 0,
          data: []
        };
      }

      // Select best candidate (prioritize count, then average height)
      candidates.sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return b.avgHeight - a.avgHeight;
      });

      const bestCandidate = candidates[0];
      const itemElements = Array.from(bestCandidate.container.children)
        .filter(child => 
          elementSignature(child) === bestCandidate.signature &&
          !isExcludedElement(child) &&
          child.offsetHeight > 0 &&
          child.offsetWidth > 0
        )
        .slice(0, maxItemsToExtract);

      // ---- Extract Data from Items ----
      const extractedData = itemElements.map((item, index) => {
        const itemData = extractElementData(item);
        return {
          index: index + 1,
          ...itemData
        };
      });

      return {
        sourceUrl,
        timestamp: new Date().toISOString(),
        success: true,
        itemCount: extractedData.length,
        pattern: {
          containerSignature: elementSignature(bestCandidate.container),
          itemSignature: bestCandidate.signature,
          confidence: bestCandidate.count / bestCandidate.totalChildren
        },
        data: extractedData
      };

    }, url, opts.minItemCount, opts.maxItemsToExtract);

    await browser.close();
    
    console.log(`✅ Extraction complete! Found ${result.itemCount} items`);
    return result;

  } catch (error) {
    if (browser) {
      await browser.close();
    }
    
    console.error('❌ Extraction failed:', error.message);
    return {
      sourceUrl: url,
      timestamp: new Date().toISOString(),
      success: false,
      error: error.message,
      itemCount: 0,
      data: []
    };
  }
}

// Usage examples and utility functions
export async function extractAndSave(url, outputPath = null, config = {}) {
  const result = await extractWebData(url, config);
  const jsonOutput = safeJSONStringify(result);
  
  if (outputPath) {
    const fs = await import('fs');
    fs.writeFileSync(outputPath, jsonOutput);
    console.log(`📄 Data saved to: ${outputPath}`);
  }
  
  return result;
}

export function printSummary(result) {
  if (!result.success) {
    console.log(`❌ Failed: ${result.error}`);
    return;
  }
  
  console.log(`
📊 Extraction Summary:
   URL: ${result.sourceUrl}
   Items found: ${result.itemCount}
   Pattern confidence: ${(result.pattern.confidence * 100).toFixed(1)}%
   Container: ${result.pattern.containerSignature}
   Item pattern: ${result.pattern.itemSignature}
  `);
}

///////////////////// Example usage:   ///////////////////////////////////

// Basic usage
// const result = await extractWebData('https://www.amazon.in/s?k=mobile&crid=1AFEC8GES7PIO&sprefix=mobile%2Caps%2C359&ref=nb_sb_noss_2');
// console.log(safeJSONStringify(result));

// Print summary
// printSummary(result);


// With custom config
const customResult = await extractWebData('https://www.amazon.in/s?k=mobile&crid=1AFEC8GES7PIO&sprefix=mobile%2Caps%2C359&ref=nb_sb_noss_2', {
  maxScrolls: 5,
  minItemCount: 5,
  maxItemsToExtract: 10
});

// Extract and save to file
// await extractAndSave('https://example.com', './extracted-data.json');