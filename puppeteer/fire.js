import fetch from "node-fetch";
import fs from "fs";

const API_KEY = "fc-9349819eb4d442d68103383ac61d4ba9"; // 🔑 replace with your Firecrawl API key

async function scrapeWithFirecrawl(url) {
  const endpoint = "https://api.firecrawl.dev/v1/scrape";

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        url: url,
        formats: ["markdown"],
        onlyMainContent: true,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Error ${response.status}: ${text}`);
    }

    const data = await response.json();

    // Extract only the markdown
    const markdownContent = data?.data?.markdown || "";
    fs.writeFileSync("output.md", markdownContent, "utf8");
    console.log("✅ Markdown saved to output.md");
    return markdownContent;
  } catch (err) {
    console.error("❌ Scraping failed:", err.message);
    return null;
  }
}



// Example usage
(async () => {
  const markdown = await scrapeWithFirecrawl("https://www.myntra.com/men-tshirts?p=1");
  console.log(markdown);
})();
