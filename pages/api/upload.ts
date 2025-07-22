import { IncomingForm } from "formidable";
import fs from "fs";
import { NextApiRequest, NextApiResponse } from "next";
import { parseProductExcel } from "../../lib/excelParser";
import { scrapePrice2B } from "../../lib/scraper/2b";
import { scrapePriceRaneen } from "../../lib/scraper/raneen";
import { scrapePriceElghazawy } from "../../lib/scraper/elghazawy";
import { scrapePriceEliraqi } from "../../lib/scraper/eliraqi";
import { scrapePriceElsindbad } from "../../lib/scraper/elsindbad";
import { scrapeRayaPrice } from "../../lib/scraper/raya";
import { scrapeBtechPrice } from "../../lib/scraper/btech";

import formidable from "formidable";

export const config = {
  api: {
    bodyParser: false,
  },
};

const competitors: { [key: string]: (url: string) => Promise<number | null> } =
  {
    "2b.com.eg": scrapePrice2B,
    "eliraqi.com.eg": scrapePriceEliraqi,
    "elghazawy.com": scrapePriceElghazawy,
    "raneen.com": scrapePriceRaneen,
    "elsindbadstore.com": scrapePriceElsindbad,
    "rayashop.com": scrapeRayaPrice,
    "btech.com": scrapeBtechPrice,
  };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const form = formidable({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: "Error parsing file." });
    }

    let file: formidable.File | null = null;

    if (files.file) {
      if (Array.isArray(files.file)) {
        file = files.file[0];
      } else {
        file = files.file;
      }
    }
    if (!file) {
      return;
    }
    const excelBuffer = fs.readFileSync(file.filepath);

    const products = parseProductExcel(excelBuffer); // update this to support buffer input
    const allResults: any[] = [];

    for (const product of products) {
      const prices: Record<string, number | null> = {};
      console.log(product);
      for (const [competitor, url] of Object.entries(product.urls)) {
        if (!url || url === "NA") {
          prices[competitor] = null;
          continue;
        }

        const scraper = competitors[competitor];
        if (!scraper) {
          prices[competitor] = null;
          continue;
        }

        const price = await scraper(url);
        prices[competitor] = price;
        console.log(competitor, price);
      }

      allResults.push({
        productName: product.productName,
        productCode: product.productCode,
        cost: product.cost,
        sellingPrice: product.sellingPrice,
        prices,
      });
    }

    return res.status(200).json(allResults);
  });
}
