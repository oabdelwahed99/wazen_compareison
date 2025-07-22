import axios from 'axios';
import * as cheerio from 'cheerio';

export async function scrapePriceElghazawy(url: string): Promise<number | null> {
  try {
    const { data } = await axios.get(url, { timeout: 15000 });
    const $ = cheerio.load(data);

    const priceText = $("p.h2-price.pro-praice.text-primary-800").first().text().trim();
    const cleanedPrice = priceText.replace(/[^\d.]/g, "");

    const price = parseFloat(cleanedPrice);
    return isNaN(price) ? null : price;
  } catch (err) {
    console.error("Elghazawy scraping failed:", err);
    return null;
  }
}
