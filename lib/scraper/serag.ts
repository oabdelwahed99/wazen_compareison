import axios from "axios";
import * as cheerio from "cheerio";

export async function scrapePriceSerag(url: string): Promise<number | null> {
  try {
    const { data } = await axios.get(url, {
      timeout: 30000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
      },
    });

    const $ = cheerio.load(data);

    // Get price from hidden span with itemprop="price"
    const priceText = $(
      'div.product_price[itemprop="offers"] span[itemprop="price"]'
    )
      .first()
      .text()
      .trim();

    const price = parseFloat(priceText);

    if (!isNaN(price)) {
      return price;
    }
    return null;
  } catch (error) {
    console.error("Error scraping Serag price:", error);
    return null;
  }
}
