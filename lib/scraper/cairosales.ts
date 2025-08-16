import cloudscraper from "cloudscraper";
import * as cheerio from "cheerio";

const headers = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

async function fetchHtml(url: string): Promise<string> {
  return cloudscraper({ url, method: "GET", headers, timeout: 20000 });
}

export async function scrapePricecairosales(
  url: string
): Promise<number | null> {
  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    let priceText =
      $("#our_price_display").attr("content") || $("#our_price_display").text();
    if (!priceText) return null;
    const price = parseFloat(priceText.replace(/[^\d.]/g, ""));
    return isNaN(price) ? null : price;
  } catch (e) {
    console.error("Scraping failed:", e);
    return null;
  }
}
