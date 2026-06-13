import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = path.resolve("outputs/made_in_china_products");
const inputPath = path.join(outputDir, "made_in_china_500_products.json");
const outputPath = path.join(outputDir, "made_in_china_import_500_products.xlsx");
const previewPath = path.join(outputDir, "made_in_china_import_preview.png");

const rows = JSON.parse(await fs.readFile(inputPath, "utf8"));
const workbook = Workbook.create();
const sheet = workbook.worksheets.add("Товары");
const summary = workbook.worksheets.add("Сводка");

const fields = [
  "№",
  "Категория",
  "Подкатегория Made-in-China",
  "Поисковый запрос",
  "Адаптированное название на русском",
  "Оригинальное название",
  "Описание",
  "Тех. характеристики",
  "Прямая ссылка на фото",
  "Все фото",
  "Цена",
  "Валюта",
  "MOQ / минимальный заказ",
  "Поставщик",
  "Происхождение",
  "Торговая марка",
  "Упаковка",
  "Ссылка на товар",
  "Дополнительная информация",
  "Дата сбора",
];

const matrix = [
  fields,
  ...rows.map((row, idx) => [
    idx + 1,
    ...fields.slice(1).map((field) => row[field] ?? ""),
  ]),
];

sheet.getRangeByIndexes(0, 0, matrix.length, fields.length).values = matrix;
sheet.freezePanes.freezeRows(1);
sheet.showGridLines = false;

const used = sheet.getRangeByIndexes(0, 0, matrix.length, fields.length);
used.format = {
  font: { name: "Arial", size: 10, color: "#1F2937" },
  wrapText: true,
  verticalAlignment: "top",
  borders: { preset: "all", style: "thin", color: "#E5E7EB" },
};

const header = sheet.getRangeByIndexes(0, 0, 1, fields.length);
header.format = {
  fill: "#1F4E79",
  font: { bold: true, color: "#FFFFFF", name: "Arial", size: 10 },
  wrapText: true,
  horizontalAlignment: "center",
  verticalAlignment: "middle",
  borders: { preset: "all", style: "thin", color: "#93C5FD" },
};
header.format.rowHeightPx = 42;
sheet.getRangeByIndexes(1, 0, rows.length, fields.length).format.rowHeightPx = 66;

const widths = [
  48, 150, 230, 150, 360, 340, 470, 480, 360, 420,
  85, 65, 150, 260, 160, 140, 260, 360, 420, 105,
];
widths.forEach((width, col) => {
  sheet.getRangeByIndexes(0, col, matrix.length, 1).format.columnWidthPx = width;
});

const tableRange = `A1:T${rows.length + 1}`;
const table = sheet.tables.add(tableRange, true, "MadeInChinaProducts");
table.style = "TableStyleMedium2";
table.showFilterButton = true;

const byCategory = rows.reduce((acc, row) => {
  acc[row["Категория"]] = (acc[row["Категория"]] || 0) + 1;
  return acc;
}, {});
const summaryRows = [
  ["Показатель", "Значение"],
  ["Всего товаров", rows.length],
  ["Дата сбора", rows[0]?.["Дата сбора"] ?? ""],
  ["Источник", "ru.made-in-china.com: productSearch + детальные карточки schema.org/Product"],
  ["Фото", "Прямые URL изображений из карточек товара, пригодные для загрузки в БД"],
  ["Валюта", "USD, как указано на Made-in-China"],
  [],
  ["Категория", "Количество"],
  ...Object.entries(byCategory).sort().map(([category, count]) => [category, count]),
];

summary.getRangeByIndexes(0, 0, summaryRows.length, 2).values = summaryRows;
summary.showGridLines = false;
summary.freezePanes.freezeRows(1);
summary.getRange("A1:B1").format = {
  fill: "#1F4E79",
  font: { bold: true, color: "#FFFFFF", name: "Arial", size: 11 },
  horizontalAlignment: "center",
};
summary.getRangeByIndexes(0, 0, summaryRows.length, 2).format = {
  font: { name: "Arial", size: 10, color: "#1F2937" },
  borders: { preset: "all", style: "thin", color: "#E5E7EB" },
  wrapText: true,
  verticalAlignment: "top",
};
summary.getRange("A8:B12").format = {
  borders: { preset: "all", style: "thin", color: "#D1D5DB" },
};
summary.getRange("A8:B8").format = {
  fill: "#D9EAF7",
  font: { bold: true, color: "#111827" },
};
summary.getRange("A:A").format.columnWidthPx = 260;
summary.getRange("B:B").format.columnWidthPx = 520;

const productCheck = await workbook.inspect({
  kind: "table",
  range: "Товары!A1:T6",
  include: "values",
  tableMaxRows: 6,
  tableMaxCols: 20,
  tableMaxCellChars: 120,
});
console.log(productCheck.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 50 },
  summary: "formula error scan",
});
console.log(errors.ndjson);

const preview = await workbook.render({
  sheetName: "Товары",
  range: "A1:H12",
  scale: 1,
  format: "png",
});
await fs.writeFile(previewPath, new Uint8Array(await preview.arrayBuffer()));

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(JSON.stringify({ outputPath, previewPath, rows: rows.length }));
