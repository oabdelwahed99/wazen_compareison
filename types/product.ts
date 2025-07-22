interface Product {
  productName: string;
  urls: Record<string, string>;
}


export type ProductWithScrapedPrices = Product & {
  competitorPrices: (number | null)[];
  decision: string;
};
