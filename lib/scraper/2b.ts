import axios from "axios";
import * as cheerio from "cheerio";

export async function scrapePrice2B(url: string): Promise<number | null> {
  try {
    const { data } = await axios.get(url, {
      timeout: 15000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
      },
    });

    const $ = cheerio.load(data);

    // Extract special price (discounted price)
    const specialPrice = $(
      'span.special-price span[data-price-type="finalPrice"]'
    ).attr("data-price-amount");
    if (specialPrice) {
      const price = parseFloat(specialPrice);
      if (!isNaN(price)) return price;
    }

    // Fallback to old price if no special price
    const oldPrice = $('span.old-price span[data-price-type="oldPrice"]').attr(
      "data-price-amount"
    );
    if (oldPrice) {
      const price = parseFloat(oldPrice);
      if (!isNaN(price)) return price;
    }

    return null;
  } catch (error) {
    console.error("Error scraping 2B:", error);
    return null;
  }
}
