import axios from "axios";
import * as cheerio from "cheerio";

export async function scrapePriceEliraqi(url: string): Promise<number | null> {
  try {
    const { data } = await axios.get(url, {
      timeout: 15000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
      },
    });
    const $ = cheerio.load(data);

    const discountedText = $(".discounted-price span").first().text().trim();
    const originalText = $(".non-discounted-price span").first().text().trim();

    const cleanToNumber = (str: string) =>
      parseFloat(str.replace(/[^\d.,]/g, "").replace(",", ""));

    const discountedPrice = cleanToNumber(discountedText);
    const originalPrice = cleanToNumber(originalText);

    if (!isNaN(discountedPrice)) {
      return discountedPrice; // ✅ Use discounted price
    } else if (!isNaN(originalPrice)) {
      return originalPrice; // fallback if no discount
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error scraping Eliraqi:", error);
    return null;
  }
}
