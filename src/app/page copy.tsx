"use client";

import { useState, useEffect } from "react";
import * as XLSX from "xlsx";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [selectedCompetitors, setSelectedCompetitors] = useState<string[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] || null);
  };

  const handleUpload = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    setUploading(true);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (Array.isArray(data) && data.length > 0 && data[0].prices) {
        const competitorList = Object.keys(data[0].prices);
        setCompetitors(competitorList);
        setSelectedCompetitors(competitorList); // Default: show all
      }

      setResults(Array.isArray(data) ? data : null);
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

  const handleDownloadExcel = () => {
    if (!results || !Array.isArray(results)) return;

    const excelData = results.map((row) => {
      const flatRow: any = {
        "Product Name": row.productName || "",
        "Product Code": row.productCode || "",
        "Our Cost": row.ourCost || "",
        "Our Selling Price": row.ourSellingPrice || "",
      };

      selectedCompetitors.forEach((competitor) => {
        flatRow[competitor] = row.prices?.[competitor] ?? "";
      });

      return flatRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Results");
    XLSX.writeFile(workbook, "competitor-prices.xlsx");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center text-purple-800">
          Competitor Price Analysis
        </h1>

        <div className="bg-white shadow-md rounded-xl p-6 mb-8">
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileChange}
            className="mb-4"
          />
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 disabled:bg-gray-400 transition"
          >
            {uploading ? "Uploading..." : "Upload Excel"}
          </button>
        </div>

        {results && results.length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-purple-700">
              Price Comparison ({results.length} products)
            </h2>

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

            <div className="overflow-x-auto">
              <table className="table-auto w-full border border-gray-300 text-sm text-left">
                <thead className="bg-purple-100 text-purple-900">
                  <tr>
                    <th className="px-4 py-2 border border-gray-300">Product Name</th>
                    <th className="px-4 py-2 border border-gray-300">Product Code</th>
                    <th className="px-4 py-2 border border-gray-300">Our Cost</th>
                    <th className="px-4 py-2 border border-gray-300">Our Selling Price</th>
                    {selectedCompetitors.map((competitor) => (
                      <th key={competitor} className="px-4 py-2 border border-gray-300">
                        {competitor}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-100">
                      <td className="px-4 py-2 border border-gray-200">{row.productName || '-'}</td>
                      <td className="px-4 py-2 border border-gray-200">{row.productCode || '-'}</td>
                      <td className="px-4 py-2 border border-gray-200 font-medium">
                        {row.ourCost || '-'}
                      </td>
                      <td className="px-4 py-2 border border-gray-200 font-medium">
                        {row.ourSellingPrice || '-'}
                      </td>
                      {selectedCompetitors.map((competitor) => (
                        <td
                          key={`${idx}-${competitor}`}
                          className={`px-4 py-2 border border-gray-200 ${
                            row.prices?.[competitor] < row.ourSellingPrice
                              ? "text-red-600"
                              : "text-gray-700"
                          }`}
                        >
                          {row.prices?.[competitor] ?? "-"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 text-right">
              <button
                onClick={handleDownloadExcel}
                className="bg-green-600 text-white px-5 py-2 rounded-md hover:bg-green-700 transition"
              >
                Download as Excel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
