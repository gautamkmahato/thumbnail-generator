import puppeteer from "puppeteer";


class SchemaExtractor {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async init() {
    this.browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  // Extract content structure from a webpage
  async extractSchema(url, options = {}) {
    const {
      maxItems = 1,
      minTextLength = 10,
      excludeSelectors = ['script', 'style', 'nav', 'footer', 'header', '.advertisement'],
      contentSelectors = ['.content', '.main', '.post', '.article', '.item', '.card', '.product']
    } = options;

    try {
      await this.page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

      // Extract structured content from the page
      const contentStructure = await this.page.evaluate((config) => {
        const { minTextLength, excludeSelectors, contentSelectors } = config;

        // Helper function to clean text
        function cleanText(text) {
          return text.replace(/\s+/g, ' ').trim();
        }

        // Helper function to generate field name from text content
        function generateFieldName(text, existingNames = new Set()) {
          let fieldName = text
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '_')
            .substring(0, 30);
          
          // Handle common patterns
          if (fieldName.includes('name') || fieldName.includes('title')) {
            fieldName = 'name';
          } else if (fieldName.includes('description') || fieldName.includes('summary')) {
            fieldName = 'description';
          } else if (fieldName.includes('price')) {
            fieldName = 'price';
          } else if (fieldName.includes('date')) {
            fieldName = 'date';
          } else if (fieldName.includes('email')) {
            fieldName = 'email';
          } else if (fieldName.includes('phone')) {
            fieldName = 'phone';
          } else if (fieldName.includes('address')) {
            fieldName = 'address';
          } else if (fieldName.includes('category')) {
            fieldName = 'category';
          }

          // Ensure unique field names
          let counter = 1;
          let originalName = fieldName;
          while (existingNames.has(fieldName)) {
            fieldName = `${originalName}_${counter}`;
            counter++;
          }

          return fieldName;
        }

        // Helper function to detect data type
        function detectDataType(text) {
          // Check for number
          if (/^\d+(\.\d+)?$/.test(text.trim())) {
            return 'number';
          }
          
          // Check for boolean
          if (/^(true|false|yes|no)$/i.test(text.trim())) {
            return 'boolean';
          }
          
          // Check for email
          if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text.trim())) {
            return 'string'; // Keep as string for emails
          }
          
          // Check for URL
          if (/^https?:\/\/.+/.test(text.trim())) {
            return 'string';
          }
          
          // Check for date
          if (/^\d{4}-\d{2}-\d{2}|^\d{1,2}\/\d{1,2}\/\d{4}|^\w+ \d{1,2}, \d{4}/.test(text.trim())) {
            return 'string'; // Keep dates as strings
          }

          return 'string';
        }

        // Remove excluded elements
        excludeSelectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(el => el.remove());
        });

        // Try to find main content containers
        let contentContainers = [];
        
        // First try specific content selectors
        for (const selector of contentSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            contentContainers = Array.from(elements);
            break;
          }
        }

        // If no specific containers found, look for elements with substantial text content
        if (contentContainers.length === 0) {
          const allElements = document.querySelectorAll('div, section, article, li, .item, [class*="card"], [class*="product"], [class*="post"]');
          contentContainers = Array.from(allElements).filter(el => {
            const text = el.textContent.trim();
            return text.length >= minTextLength * 3 && 
                   el.children.length >= 2 && 
                   el.children.length <= 20;
          });
        }

        // Extract structure from the first content container
        if (contentContainers.length === 0) {
          return null;
        }

        const firstContainer = contentContainers[0];
        const schema = { properties: {} };
        const usedFieldNames = new Set();

        // Extract text from different elements within the container
        const textElements = firstContainer.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div, a, strong, em, [class*="title"], [class*="name"], [class*="description"], [class*="price"], [class*="date"]');
        
        const extractedFields = [];
        
        textElements.forEach(el => {
          const text = cleanText(el.textContent);
          
          if (text.length >= minTextLength && text.length <= 500) {
            // Try to determine field purpose from element attributes
            let fieldHint = '';
            const className = el.className.toLowerCase();
            const id = el.id.toLowerCase();
            const tagName = el.tagName.toLowerCase();
            
            if (className.includes('title') || className.includes('name') || tagName === 'h1' || tagName === 'h2') {
              fieldHint = 'name';
            } else if (className.includes('description') || className.includes('summary') || tagName === 'p') {
              fieldHint = 'description';
            } else if (className.includes('price')) {
              fieldHint = 'price';
            } else if (className.includes('date')) {
              fieldHint = 'date';
            }

            extractedFields.push({
              text: text,
              hint: fieldHint,
              element: el.tagName,
              className: className
            });
          }
        });

        // Sort by priority (titles first, then descriptions, then others)
        extractedFields.sort((a, b) => {
          const priorityOrder = { 'name': 1, 'description': 2, 'price': 3, 'date': 4, '': 5 };
          return (priorityOrder[a.hint] || 5) - (priorityOrder[b.hint] || 5);
        });

        // Generate schema properties
        const maxFields = Math.min(extractedFields.length, 8); // Limit to 8 fields max
        
        for (let i = 0; i < maxFields; i++) {
          const field = extractedFields[i];
          let fieldName = field.hint || generateFieldName(field.text.substring(0, 50), usedFieldNames);
          
          if (!fieldName) {
            fieldName = `field_${i + 1}`;
          }
          
          usedFieldNames.add(fieldName);
          
          schema.properties[fieldName] = {
            type: detectDataType(field.text)
          };
        }

        return {
          schema: schema,
          sampleData: extractedFields.slice(0, maxFields).reduce((acc, field, index) => {
            const fieldName = Object.keys(schema.properties)[index];
            acc[fieldName] = field.text;
            return acc;
          }, {}),
          containerInfo: {
            tagName: firstContainer.tagName,
            className: firstContainer.className,
            textLength: firstContainer.textContent.length
          }
        };

      }, { minTextLength, excludeSelectors, contentSelectors });

      return contentStructure;

    } catch (error) {
      throw new Error(`Failed to extract schema: ${error.message}`);
    }
  }

  // Analyze multiple items and create a unified schema
  async extractUnifiedSchema(url, options = {}) {
    const {
      sampleSize = 3,
      ...extractOptions
    } = options;

    try {
      await this.page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

      const unifiedStructure = await this.page.evaluate((config) => {
        const { minTextLength = 10, excludeSelectors = ['script', 'style', 'nav', 'footer', 'header'], contentSelectors = ['.item', '.card', '.product', '.post', '.article'], sampleSize } = config;

        // Find multiple similar content items
        let itemContainers = [];
        
        for (const selector of contentSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length >= 2) {
            itemContainers = Array.from(elements).slice(0, sampleSize);
            break;
          }
        }

        if (itemContainers.length === 0) {
          // Fallback: find similar structured elements
          const candidates = document.querySelectorAll('div, li, section');
          const grouped = {};
          
          candidates.forEach(el => {
            const key = `${el.tagName}_${el.children.length}`;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(el);
          });

          // Find the group with most similar elements
          for (const [key, elements] of Object.entries(grouped)) {
            if (elements.length >= 2) {
              itemContainers = elements.slice(0, sampleSize);
              break;
            }
          }
        }

        if (itemContainers.length === 0) {
          return null;
        }

        // Extract common structure
        const commonFields = new Map();
        
        itemContainers.forEach((container, index) => {
          const textElements = container.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div, a, strong');
          
          textElements.forEach((el, elIndex) => {
            const text = el.textContent.trim();
            if (text.length >= minTextLength && text.length <= 300) {
              const fieldKey = `${el.tagName}_${elIndex}`;
              
              if (!commonFields.has(fieldKey)) {
                commonFields.set(fieldKey, {
                  examples: [],
                  tagName: el.tagName,
                  className: el.className
                });
              }
              
              commonFields.get(fieldKey).examples.push(text);
            }
          });
        });

        // Build unified schema
        const schema = { properties: {} };
        let fieldIndex = 1;

        commonFields.forEach((fieldData, fieldKey) => {
          if (fieldData.examples.length >= Math.min(2, itemContainers.length)) {
            let fieldName;
            const className = fieldData.className.toLowerCase();
            const tagName = fieldData.tagName.toLowerCase();
            
            if (className.includes('title') || className.includes('name') || tagName.startsWith('h')) {
              fieldName = 'name';
            } else if (className.includes('description') || tagName === 'p') {
              fieldName = 'description';
            } else if (className.includes('price')) {
              fieldName = 'price';
            } else {
              fieldName = `field_${fieldIndex}`;
              fieldIndex++;
            }

            // Ensure unique field names
            let counter = 1;
            let originalName = fieldName;
            while (schema.properties[fieldName]) {
              fieldName = `${originalName}_${counter}`;
              counter++;
            }

            schema.properties[fieldName] = {
              type: 'string' // Default to string for unified schema
            };
          }
        });

        return {
          schema: schema,
          itemCount: itemContainers.length,
          sampleData: Array.from(commonFields.entries())
            .filter(([_, fieldData]) => fieldData.examples.length >= Math.min(2, itemContainers.length))
            .slice(0, Object.keys(schema.properties).length)
            .map(([_, fieldData]) => fieldData.examples[0])
        };

      }, { ...extractOptions, sampleSize });

      return unifiedStructure;

    } catch (error) {
      throw new Error(`Failed to extract unified schema: ${error.message}`);
    }
  }
}

// Usage example
async function main() {
  const extractor = new SchemaExtractor();
  
  try {
    await extractor.init();
    
    // Extract schema from a single content item
    const result = await extractor.extractSchema('https://www.amazon.in/s?k=mobile&crid=1AFEC8GES7PIO&sprefix=mobile%2Caps%2C359&ref=nb_sb_noss_2', {
      maxItems: 1,
      minTextLength: 10,
      contentSelectors: ['.product', '.item', '.card', '.post', 'article', '.content']
    });

    if (result) {
      console.log('Generated Firecrawl Schema:');
      console.log(JSON.stringify(result.schema, null, 2));
      
      console.log('\nSample extracted data:');
      console.log(JSON.stringify(result.sampleData, null, 2));
    } else {
      console.log('Could not extract schema from the webpage');
    }

    // Alternative: Extract unified schema from multiple similar items
    // const unifiedResult = await extractor.extractUnifiedSchema('https://example.com');
    // console.log('Unified Schema:', JSON.stringify(unifiedResult.schema, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await extractor.close();
  }
}



main()