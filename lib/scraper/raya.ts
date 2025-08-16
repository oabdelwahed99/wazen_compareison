// import axios from "axios";

// /**
//  * Scrapes the final price of any product from RayaShop using the product URL.
//  * @param productUrl - Full product URL from rayashop.com
//  * @returns Final price as a number, or null if failed
//  */
// export async function scrapeRayaPrice(
//   productUrl: string
// ): Promise<number | null> {
//   // Extract slug from URL
//   const match = productUrl.match(/rayashop\.com\/ar\/([^\/?#]+)/i);
//   const slug = match?.[1];

//   if (!slug) {
//     console.error("❌ Could not extract a valid slug from the product URL.");
//     return null;
//   }

//   try {
//     const response = await axios.post(
//       "https://api-rayashop.global.ssl.fastly.net/graphql?storeCode=ar",
//       {
//         query:
//           "query ProductInstallments($slug: String!, $corporateId: Int) { product: product(url_key: $slug) { price_range { maximum_price { final_price { value } regular_price { value } } } installments(corporateId: $corporateId) { installment_data { method_name plans { months down_payment interest } } } } }",
//         variables: {
//           slug,
//           corporateId: null,
//         },
//       },
//       {
//         headers: {
//           "Content-Type": "application/json",
//           storeCode: "ar",
//           "User-Agent":
//             "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
//         },
//         timeout: 15000,
//       }
//     );

//     const finalPrice =
//       response.data?.data?.product?.price_range?.maximum_price?.final_price
//         ?.value;

//     if (typeof finalPrice === "number") {
//       return finalPrice;
//     } else {
//       console.warn("⚠️ Price not found in response:", response.data);
//       return null;
//     }
//   } catch (error) {
//     console.error("❌ Error scraping RayaShop:", error);
//     return null;
//   }
// }

import axios from "axios";
import * as cheerio from "cheerio";

/**
 * Scrapes the final price of any product from RayaShop using the product URL.
 * If product is out of stock, returns "no stock".
 * @param productUrl - Full product URL from rayashop.com
 * @returns Final price as a number, "no stock" if unavailable, or null if failed
 */
export async function scrapeRayaPrice(
  productUrl: string
): Promise<number | null> {
  // Step 1: Check stock status from HTML
  try {
    const pageResponse = await axios.get(productUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
      },
      timeout: 15000,
    });

    const $ = cheerio.load(pageResponse.data);
    const outOfStockText = $("span.AppButton__text").text().trim();

    if (outOfStockText.includes("أعلمني عند توفره")) {
      console.log("⚠️ Product is out of stock.");
      return 0;
    }
  } catch (err) {
    console.error("❌ Error checking stock status:", err);
    return null;
  }

  // Step 2: Extract slug from URL
  const match = productUrl.match(/rayashop\.com\/ar\/([^\/?#]+)/i);
  const slug = match?.[1];
  if (!slug) {
    console.error("❌ Could not extract a valid slug from the product URL.");
    return null;
  }

  // Step 3: Get price via GraphQL
  try {
    const response = await axios.post(
      "https://api-rayashop.global.ssl.fastly.net/graphql?storeCode=ar",
      {
        query:
          "query ProductInstallments($slug: String!, $corporateId: Int) { product: product(url_key: $slug) { price_range { maximum_price { final_price { value } regular_price { value } } } installments(corporateId: $corporateId) { installment_data { method_name plans { months down_payment interest } } } } }",
        variables: {
          slug,
          corporateId: null,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          storeCode: "ar",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
        },
        timeout: 15000,
      }
    );

    const finalPrice =
      response.data?.data?.product?.price_range?.maximum_price?.final_price
        ?.value;

    if (typeof finalPrice === "number") {
      return finalPrice;
    } else {
      console.warn("⚠️ Price not found in response:", response.data);
      return null;
    }
  } catch (error) {
    console.error("❌ Error scraping RayaShop:", error);
    return null;
  }
}
