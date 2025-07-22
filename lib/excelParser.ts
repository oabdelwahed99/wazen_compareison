// lib/excelParser.ts
import * as xlsx from "xlsx";

export interface Product {
  productName: string;
  productCode: string;
  cost: string;
  sellingPrice: string;
  urls: { [key: string]: string };
}

export function parseProductExcel(fileBuffer: Buffer): Product[] {
  const workbook = xlsx.read(fileBuffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json<Record<string, string>>(sheet);

  const products: Product[] = data.map((row) => {
    const name = row["Product Name"]; // Fix: match the actual column header in Excel
    const code = row["Product Code"];
    const cost = row["Cost"];
    const sellingPrice = row["Selling Price"];

    const urls = Object.fromEntries(
      Object.entries(row).filter(
        ([key]) =>
          key !== "Product Code" &&
          key !== "Product Name" &&
          key !== "Cost" &&
          key !== "Selling Price"
      )
    );
    return {
      productName: name ?? "Unknown",
      productCode: code ?? "Unknown",
      cost: cost ?? "Unknown",
      sellingPrice: sellingPrice ?? "Unknown",
      urls: urls as { [key: string]: string },
    };
  });

  return products;
}
