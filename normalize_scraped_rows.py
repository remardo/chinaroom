import csv
import json
from pathlib import Path

from scrape_made_in_china import adapt_title


OUT_DIR = Path("outputs/made_in_china_products")
json_path = OUT_DIR / "made_in_china_500_products.json"
csv_path = OUT_DIR / "made_in_china_500_products.csv"

rows = json.loads(json_path.read_text(encoding="utf-8"))
for row in rows:
    row["Адаптированное название на русском"] = adapt_title(
        row.get("Категория", ""),
        row.get("Оригинальное название", "") or row.get("Адаптированное название на русском", ""),
    )

fields = list(rows[0].keys()) if rows else []
with csv_path.open("w", newline="", encoding="utf-8-sig") as f:
    writer = csv.DictWriter(f, fieldnames=fields)
    writer.writeheader()
    writer.writerows(rows)
json_path.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"normalized {len(rows)} rows")
