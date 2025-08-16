import https from "https";
import * as cheerio from "cheerio";

export async function scrapePriceNoon(url: string): Promise<number | null> {
  return new Promise((resolve, reject) => {
    const options = {
      method: "GET",
      hostname: "api.webscrapingapi.com",
      port: null,
      path:
        "/v2?api_key=E8megGi0QXgwFjyYu2HrbuI5Sa7Yl4Xx&url=" +
        encodeURIComponent(url),
      headers: {},
    };

    const req = https.request(options, (res) => {
      const chunks: Uint8Array[] = [];

      res.on("data", (chunk) => chunks.push(chunk));

      res.on("end", () => {
        try {
          const body = Buffer.concat(chunks).toString();
          const $ = cheerio.load(body);

          const priceText = $(".PriceOfferV2_priceNowText__fk5kK")
            .first()
            .text()
            .trim();

          const price = parseFloat(priceText);
          resolve(!isNaN(price) ? price : null);
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on("error", (err) => reject(err));

    req.end();
  });
}

// import cloudscraper from "cloudscraper";
// import * as cheerio from "cheerio";

// const headers = {
//   "User-Agent":
//     "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
//   Accept:
//     "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
//   "Accept-Language": "en-US,en;q=0.9",
//   "Sec-Fetch-Dest": "document",
//   "Sec-Fetch-Mode": "navigate",
//   "Sec-Fetch-Site": "none",
//   "Sec-Fetch-User": "?1",
//   "Upgrade-Insecure-Requests": "1",
// };

// async function fetchHtml(url: string): Promise<string> {
//   return cloudscraper({ url, method: "GET", headers, timeout: 20000 });
// }

// export async function scrapePriceNoon(url: string): Promise<number | null> {
//   try {
//     const html = await fetchHtml(url);
//     const $ = cheerio.load(html);
//     console.log($);
//     console.log("noon");

//     const priceText = $(".PriceOfferV2_priceNowText__fk5kK")
//       .first()
//       .text()
//       .trim();

//     if (!priceText) return null;
//     const price = parseFloat(priceText.replace(/[^\d.]/g, ""));
//     return isNaN(price) ? null : price;
//   } catch (e) {
//     console.error("Scraping failed:", e);
//     return null;
//   }
// }

// import { chromium } from "playwright-extra";
// import stealth from "puppeteer-extra-plugin-stealth";
// import * as cheerio from "cheerio";

// chromium.use(stealth());

// export async function scrapePriceNoon(url: string): Promise<number | null> {
//   // Webshare proxy credentials
//   const proxyServer = "23.95.150.145:6114";
//   const proxyUsername = "txbiwzxm";
//   const proxyPassword = "emkv9ajjtl18";

//   const browser = await chromium.launch({
//     headless: true,
//     args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-http2"],
//   });

//   const context = await browser.newContext({
//     proxy: {
//       server: `http://${proxyServer}`,
//       username: proxyUsername,
//       password: proxyPassword,
//     },
//     userAgent:
//       "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
//     viewport: { width: 1280, height: 800 },
//     javaScriptEnabled: true,
//   });

//   const page = await context.newPage();

//   try {
//     await page.goto(url, { timeout: 60000, waitUntil: "networkidle" });

//     // Ensure page is fully loaded
//     await page.waitForTimeout(2000);

//     // Get the full rendered HTML
//     const html = await page.content();
//     const $ = cheerio.load(html);

//     const priceText = $(".PriceOfferV2_priceNowText__fk5kK")
//       .first()
//       .text()
//       .trim();

//     await browser.close();

//     if (!priceText) return null;
//     const price = parseFloat(priceText.replace(/[^\d.]/g, ""));
//     return isNaN(price) ? null : price;
//   } catch (err) {
//     console.error("Scraping failed:", err);
//     await browser.close();
//     return null;
//   }
// }
// import { chromium } from "playwright";

// export async function scrapePriceNoon(url: string) {
//   const browser = await chromium.launch({
//     headless: false, // visible browser
//     args: ["--no-sandbox", "--disable-setuid-sandbox"],
//   });

//   const context = await browser.newContext({
//     userAgent:
//       "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
//     locale: "en-US",
//   });

//   const page = await context.newPage();

//   // Go to product page
//   await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

//   // Simulate some human activity
//   await page.mouse.move(100, 100);
//   await page.waitForTimeout(500);
//   await page.mouse.move(200, 300);
//   await page.waitForTimeout(800);
//   await page.evaluate(() => window.scrollBy(0, 300));
//   await page.waitForTimeout(1200);

//   // Wait for price element
//   await page.waitForSelector(".PriceOfferV2_priceNowText__fk5kK", {
//     timeout: 15000,
//   });

//   const priceText = await page.$eval(
//     ".PriceOfferV2_priceNowText__fk5kK",
//     (el) => el.textContent?.trim() || ""
//   );

//   await browser.close();

//   if (!priceText) return null;
//   const price = parseFloat(priceText.replace(/[^\d.]/g, ""));
//   return isNaN(price) ? null : price;
// }
