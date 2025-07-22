import axios from "axios";
import * as cheerio from "cheerio";

export async function scrapeBtechPrice(
  productUrl: string
): Promise<number | null> {
  const source = "BTech";

  try {
    // Step 1: Load the product page HTML
    const { data: html } = await axios.get(productUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
      },
      timeout: 15000,
    });

    const $ = cheerio.load(html);

    // Step 2: Extract product code from the .detail div
    let productCode: string | null = null;

    $("div.detail").each((_, el) => {
      const label = $(el).find("strong").text().trim();
      const value = $(el).find("p").text().trim();

      // Match any of the Arabic variations for "model"
      if (/رقم الموديل:|الموديل|رقم الموديل/.test(label) && value) {
        productCode = value;
        return false; // Exit loop early when match is found
      }
    });

    console.log("📦 Product code:", productCode);

    if (!productCode) {
      throw new Error("❌ Product code not found in the HTML content.");
    }

    // Step 3: Send GraphQL request to get price using the product code
    const graphqlResponse = await axios.post(
      "https://btech.com/graphql",
      {
        query: `
          query mirasvitSearch($query: String!, $pageSize: Int, $currentPage: Int) {
            search(query: $query) {
              magento_catalog_product(pageSize: $pageSize, currentPage: $currentPage) {
                items {
                  name
                  price_range {
                    minimum_price {
                      final_price {
                        value
                        currency
                      }
                    }
                  }
                }
              }
            }
          }
        `,
        variables: {
          query: productCode,
          pageSize: 1,
          currentPage: 1,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
        },
        timeout: 15000,
      }
    );

    // Step 4: Extract the price from response
    const item =
      graphqlResponse.data?.data?.search?.magento_catalog_product?.items?.[0];

    if (!item) {
      throw new Error("❌ Product not found in GraphQL response.");
    }

    const price: number = item.price_range.minimum_price.final_price.value;

    console.log("💰 Price:", price);
    return price;
  } catch (error) {
    console.error("❌ Error scraping Btech Shop:", error);
    return null;
  }
}
