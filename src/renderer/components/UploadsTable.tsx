import React from "react";
import * as XLSX from "xlsx";

import { UploadedRecord } from "../types/uploads";

interface UploadsTableProps {
  uploads: UploadedRecord[];
}

export const UploadsTable: React.FC<UploadsTableProps> = ({ uploads }) => {
  const exportToExcel = () => {
    if (!uploads.length) return;
    // Build rows that mirror the visible table
    const rows = uploads.map((u) => {
      const url = u.url
        ? u.url
        : `${(u.endpoint || "").replace(/\/+$/, "")}/${u.bucket}/${u.fileId}`;
      return {
        URL: url,
        产品卖点: "",
        产品名称: "",
        索引: u.fileId,
        批次: "",
      } as const;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows, {
      header: ["URL", "产品卖点", "产品名称", "索引", "批次"],
      skipHeader: false,
    });
    // Optional: set column widths for readability
    (worksheet as any)["!cols"] = [
      { wch: 60 }, // URL
      { wch: 20 }, // 产品卖点
      { wch: 20 }, // 产品名称
      { wch: 40 }, // 索引
      { wch: 12 }, // 批次
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "uploads");
    const filename = `uploads-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">上传记录</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{uploads.length} 条</span>
          <button
            onClick={exportToExcel}
            disabled={!uploads.length}
            className={`px-3 py-1 rounded text-sm font-medium border ${
              uploads.length
                ? "bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700"
                : "bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed"
            }`}
          >
            导出Excel
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600 border-b">
              <th className="py-2 pr-4">URL</th>
              <th className="py-2 pr-4">产品卖点</th>
              <th className="py-2 pr-4">产品名称</th>
              <th className="py-2 pr-4">索引</th>
              <th className="py-2 pr-4">批次</th>
            </tr>
          </thead>
          <tbody>
            {uploads.length === 0 ? (
              <tr>
                <td className="py-3 text-gray-500" colSpan={7}>
                  还没有上传记录。完成一次录制后会自动显示在此处。
                </td>
              </tr>
            ) : (
              uploads.map((u, idx) => (
                <tr
                  key={`${u.fileId}-${idx}`}
                  className="border-b last:border-b-0"
                >
                  <td className="py-2 pr-4 whitespace-nowrap">
                    <a
                      href={u.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline break-all"
                      title={u.url}
                    >
                      {u.url}
                    </a>
                  </td>
                  <td className="py-2 pr-4 font-mono break-all"></td>
                  <td className="py-2 pr-4 break-all"></td>
                  <td className="py-2 pr-4">{u.fileId}</td>
                  <td className="py-2 pr-4"></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
