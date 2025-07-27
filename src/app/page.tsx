"use client";

import { useState } from "react";
import * as XLSX from "xlsx";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [selectedCompetitors, setSelectedCompetitors] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"table1" | "table2" | "table3">("table1");
  const [priceFilter, setPriceFilter] = useState<"all" | "lowest" | "highest" | "belowAvg" | "aboveAvg">("all");
  const [feasibilityFilter, setFeasibilityFilter] = useState<"all" | "profit" | "breakeven" | "loss">("all");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] || null);
  };

  const [rowCount, setRowCount] = useState<number | null>(null);
  const [numProductsProcessed, setNumProductsProcessed] = useState<number>(0);
  
  const fetchBatch = async (startIndex: number = 0) => {
    const formData = new FormData();
    if (!file) return;
  
    formData.append("file", file);
  
    const url = `/api/upload?startIndex=${startIndex}`;
  
    const res = await fetch(url, {
      method: "POST",
      body: formData,
    });
  
    const data = await res.json();
    const newResults = data.results;
    const totalRowCount = data.rowCount;
    const processed = data.numProductsProcessed;

    // Append to current results
    setResults((prev) => (prev ? [...prev, ...newResults] : newResults));
    setRowCount(rowCount);
    setNumProductsProcessed(numProductsProcessed);
  
    // Update competitors only if not already done
    if (newResults.length > 0 && newResults[0].prices && competitors.length === 0) {
      const competitorList = Object.keys(newResults[0].prices);
      setCompetitors(competitorList);
      setSelectedCompetitors(competitorList);
    }
  
    // Continue fetching if backend responded with 206 Partial Content
    if (res.status === 206 && processed > 0 && processed + startIndex < totalRowCount) {
    setTimeout(() => {
      fetchBatch(startIndex + processed);
    }, 1000); // Optional: add delay to reduce backend load
    }
  };
  
  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResults(null);
    setRowCount(null);
    setNumProductsProcessed(0);
  
    try {
      await fetchBatch(0); // Start recursive fetching from beginning
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
    }
  };
  

  const handleCompetitorSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = Array.from(e.target.selectedOptions, (option) => option.value);
    setSelectedCompetitors(selected);
  };

  const getStats = (prices: any): {
    min: number;
    max: number;
    avg: number;
    validPrices: number[];
  } => {
    const validPrices = Object.entries(prices)
      .map(([_, v]) => Number(v))
      .filter((v) => !isNaN(v) && v > 0);

    if (validPrices.length === 0) {
      return { min: 0, max: 0, avg: 0, validPrices: [] };
    }

    const min = Math.min(...validPrices);
    const max = Math.max(...validPrices);
    const avg = validPrices.reduce((a, b) => a + b, 0) / validPrices.length;
    return { min, max, avg, validPrices };
  };

  const getFilteredResults = () => {
    if (!results) return [];

    return results.filter((row) => {
      if (activeTab === "table2") {
        const stats = getStats(row.prices || {});
        const selling = Number(row.sellingPrice);
        if (stats.validPrices.length === 0) return priceFilter === "all";
        if (priceFilter === "lowest") return selling === stats.min;
        if (priceFilter === "highest") return selling === stats.max;
        if (priceFilter === "belowAvg") return selling < stats.avg && selling !== stats.min;
        if (priceFilter === "aboveAvg") return selling > stats.avg && selling !== stats.max;
        return true;
      }

      if (activeTab === "table3") {
        const cost = Number(row.cost);
        const stats = getStats(row.prices || {});
        const isLoss = stats.min < cost;
        const isBreakeven = stats.min === cost;
        const isProfit = stats.min > cost;

        if (stats.validPrices.length === 0) return feasibilityFilter === "all";
        if (feasibilityFilter === "profit") return isProfit;
        if (feasibilityFilter === "breakeven") return isBreakeven;
        if (feasibilityFilter === "loss") return isLoss;
        return true;
      }

      return true;
    });
  };

  const handleDownloadExcel = () => {
    if (!results || !Array.isArray(results)) return;

    const filtered = getFilteredResults();

    const excelData = filtered.map((row) => {
      const stats = getStats(row.prices || {});
      const flatRow: any = {
        "Product Name": row.productName || "",
        "Product Code": row.productCode || "",
        Cost: row.cost || "",
        "Our Price": row.sellingPrice || "",
      };

      selectedCompetitors.forEach((competitor) => {
        const price = Number(row.prices?.[competitor]);
        flatRow[competitor] = isNaN(price) ? "" : price;
      });

      if (activeTab === "table2") {
        const selling = Number(row.sellingPrice);
        flatRow["Price Status"] =
          stats.validPrices.length === 0
            ? "No data"
            : selling === stats.min
            ? "Lowest"
            : selling === stats.max
            ? "Highest"
            : selling < stats.avg
            ? "Below Avg"
            : "Above Avg";
      }

      if (activeTab === "table3") {
        const cost = Number(row.cost);
        const isLoss = stats.min < cost;
        const isBreakeven = stats.min === cost;
        const isProfit = stats.min > cost;
        flatRow["Feasibility"] =
          stats.validPrices.length === 0
            ? "No data"
            : isProfit
            ? "Profitable"
            : isBreakeven
            ? "Breakeven"
            : "Loss";
      }

      flatRow["Min Price"] = stats.validPrices.length === 0 ? "" : stats.min;
      return flatRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Filtered Results");
    XLSX.writeFile(workbook, `${activeTab}-filtered-prices.xlsx`);
  };

  const filteredResults = getFilteredResults();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center text-purple-800">
          Competitor Price Analysis
        </h1>

        <div className="bg-white shadow-md rounded-xl p-6 mb-8">
          <input type="file" accept=".xlsx, .xls" onChange={handleFileChange} className="mb-4" />
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 disabled:bg-gray-400 transition"
          >
            {uploading ? "Uploading..." : "Upload Excel"}
          </button>
        </div>

        {results && results.length > 0 && (
          <>
            <div className="flex gap-4 mb-4">
              {["table1", "table2", "table3"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`px-4 py-2 rounded-md font-medium ${
                    activeTab === tab
                      ? "bg-purple-600 text-white"
                      : "bg-white border border-gray-300"
                  }`}
                >
                  {tab === "table1"
                    ? "1️⃣ Our vs Competitor"
                    : tab === "table2"
                    ? "2️⃣ Price Ranking"
                    : "3️⃣ Profit Feasibility"}
                </button>
              ))}
            </div>

            {activeTab === "table2" && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Price Status:
                </label>
                <select
                  value={priceFilter}
                  onChange={(e) => setPriceFilter(e.target.value as any)}
                  className="w-full border border-gray-300 rounded-md p-2"
                >
                  <option value="all">All</option>
                  <option value="lowest">🟢 Lowest</option>
                  <option value="highest">🔴 Highest</option>
                  <option value="belowAvg">🟡 Below Avg</option>
                  <option value="aboveAvg">🟣 Above Avg</option>
                </select>
              </div>
            )}

            {activeTab === "table3" && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Feasibility:
                </label>
                <select
                  value={feasibilityFilter}
                  onChange={(e) => setFeasibilityFilter(e.target.value as any)}
                  className="w-full border border-gray-300 rounded-md p-2"
                >
                  <option value="all">All</option>
                  <option value="profit">✅ Profitable</option>
                  <option value="breakeven">⚠️ Breakeven</option>
                  <option value="loss">❌ Loss</option>
                </select>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Competitors to Display:
              </label>
              <select
                multiple
                value={selectedCompetitors}
                onChange={handleCompetitorSelection}
                className="w-full border border-gray-300 rounded-md p-2"
              >
                {competitors.map((competitor) => (
                  <option key={competitor} value={competitor}>
                    {competitor}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-500 mt-1">
                Hold Ctrl (Cmd on Mac) or Shift to select multiple.
              </p>
            </div>

            <div className="overflow-x-auto bg-white p-6 rounded-xl shadow-md">
              <table className="table-auto w-full border border-gray-300 text-sm text-left">
                <thead className="bg-purple-100 text-purple-900">
                  <tr>
                    <th className="px-4 py-2 border">Product Name</th>
                    <th className="px-4 py-2 border">Product Code</th>
                    <th className="px-4 py-2 border">Cost</th>
                    <th className="px-4 py-2 border">Our Price</th>
                    {selectedCompetitors.map((c) => (
                      <th key={c} className="px-4 py-2 border">
                        {c}
                      </th>
                    ))}
                    {activeTab === "table2" && <th className="px-4 py-2 border">Price Status</th>}
                    {activeTab === "table3" && <th className="px-4 py-2 border">Feasibility</th>}
                    {(activeTab === "table2" || activeTab === "table3") && (
                      <th className="px-4 py-2 border text-blue-800">Min Price</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.map((row, idx) => {
                    const stats = getStats(row.prices || {});
                    const selling = Number(row.sellingPrice);
                    const cost = Number(row.cost);
                    const isLoss = stats.min < cost;
                    const isBreakeven = stats.min === cost;
                    const isProfit = stats.min > cost;

                    return (
                      <tr key={idx} className="hover:bg-gray-100">
                        <td className="px-4 py-2 border">{row.productName || "-"}</td>
                        <td className="px-4 py-2 border">{row.productCode || "-"}</td>
                        <td className="px-4 py-2 border">{row.cost || "-"}</td>
                        <td className="px-4 py-2 border">{row.sellingPrice || "-"}</td>
                        {selectedCompetitors.map((c) => {
                          const price = Number(row.prices?.[c]);
                          const isLower = !isNaN(price) && price < selling;
                          return (
                            <td
                              key={`${idx}-${c}`}
                              className={`px-4 py-2 border ${
                                isLower ? "text-red-600" : "text-gray-700"
                              }`}
                            >
                              {!isNaN(price) ? price : "-"}
                            </td>
                          );
                        })}
                        {activeTab === "table2" && (
                          <td className="px-4 py-2 border">
                            {stats.validPrices.length === 0
                              ? "No data"
                              : selling === stats.min
                              ? "🟢 Lowest"
                              : selling === stats.max
                              ? "🔴 Highest"
                              : selling < stats.avg
                              ? "🟡 Below Avg"
                              : "🟣 Above Avg"}
                          </td>
                        )}
                        {activeTab === "table3" && (
                          <td
                            className={`px-4 py-2 border font-semibold ${
                              stats.validPrices.length === 0
                                ? "text-gray-500"
                                : isProfit
                                ? "text-green-600"
                                : isBreakeven
                                ? "text-yellow-600"
                                : "text-red-600"
                            }`}
                          >
                            {stats.validPrices.length === 0
                              ? "No competitor data"
                              : isProfit
                              ? "✅ Profitable"
                              : isBreakeven
                              ? "⚠️ Breakeven"
                              : "❌ Loss"}
                          </td>
                        )}
                        {(activeTab === "table2" || activeTab === "table3") && (
                          <td className="px-4 py-2 border text-blue-700 font-medium">
                            {stats.validPrices.length > 0 ? stats.min : "-"}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="mt-6 text-right">
                <button
                  onClick={handleDownloadExcel}
                  className="bg-green-600 text-white px-5 py-2 rounded-md hover:bg-green-700 transition"
                >
                  Download Filtered Excel
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
