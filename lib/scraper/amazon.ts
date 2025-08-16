import axios from "axios";
import * as cheerio from "cheerio";

export async function scrapePriceAmazon(url: string): Promise<number | null> {
  try {
    const { data } = await axios.get(url, {
      timeout: 15000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
        // Maybe add 'Accept-Language': 'en-US,en;q=0.9' if needed
      },
    });

    const $ = cheerio.load(data);

    // Get price text inside .a-offscreen within .a-price
    const priceText = $(".a-price .a-offscreen").first().text().trim();

    // Clean the price by removing non-digit/non-dot characters except decimal separators
    // The price string may contain currency text in Arabic "جنيه", so remove all non-digit and dots
    const cleanPriceStr = priceText.replace(/[^\d.,]/g, "").replace(/,/g, "");

    const price = parseFloat(cleanPriceStr);

    if (!isNaN(price)) {
      return price;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error scraping Amazon price:", error);
    return null;
  }
}
