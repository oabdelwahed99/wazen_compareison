import axios from "axios";
import * as cheerio from "cheerio";

export async function scrapePriceRaneen(url: string): Promise<number | null> {
  try {
    const { data } = await axios.get(url, {
      timeout: 20000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
      },
    });

    const $ = cheerio.load(data);

    // Target span with id like 'product-price-XXXXX' and data-price-amount attribute
    const priceElement = $('[id^="product-price-"][data-price-amount]');
    const priceText = priceElement.attr("data-price-amount");

    if (!priceText) return null;

    const price = parseFloat(priceText.replace(/[^\d.]/g, ""));
    return isNaN(price) ? null : price;
  } catch (error) {
    console.error("Error scraping Raneen:", error);
    return null;
  }
}
