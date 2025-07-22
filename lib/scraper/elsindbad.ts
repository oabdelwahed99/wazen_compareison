import axios from "axios";
import * as cheerio from "cheerio";

export async function scrapePriceElsindbad(
  url: string
): Promise<number | null> {
  try {
    const { data } = await axios.get(url, {
      timeout: 15000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
      },
    });

    const $ = cheerio.load(data);

    // Prefer meta tag with itemprop="price"
    const metaPrice = $('span.special-price meta[itemprop="price"]').attr(
      "content"
    );
    if (metaPrice) {
      const price = parseFloat(metaPrice);
      if (!isNaN(price)) return price;
    }

    // Fallback to extracting from text content if meta not found
    const discounted = $("span.special-price .price-wrapper .price")
      .first()
      .text()
      .trim();
    const original = $("span.old-price .price-wrapper .price")
      .first()
      .text()
      .trim();

    const cleanToNumber = (str: string): number =>
      parseFloat(str.replace(/[^\d]/g, ""));

    if (discounted) {
      const discountedPrice = cleanToNumber(discounted);
      if (!isNaN(discountedPrice)) return discountedPrice;
    }

    if (original) {
      const originalPrice = cleanToNumber(original);
      if (!isNaN(originalPrice)) return originalPrice;
    }

    return null;
  } catch (error) {
    console.error("Error scraping ElSindbad:", error);
    return null;
  }
}
