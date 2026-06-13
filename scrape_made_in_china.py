import csv
import html
import json
import re
import time
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.parse import quote_plus, urljoin

import requests
from bs4 import BeautifulSoup


BASE = "https://ru.made-in-china.com"
OUT_DIR = Path("outputs/made_in_china_products")
OUT_DIR.mkdir(parents=True, exist_ok=True)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/125.0 Safari/537.36"
    ),
    "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.7",
}

CATEGORY_QUERIES = {
    "Шкафы и гардеробные": [
        "Foshan Wardrobe",
        "Foshan Walk in Closet",
        "Foshan Closet",
        "Foshan Cabinet Wardrobe",
    ],
    "Спальни и кровати": [
        "Foshan Bedroom Furniture",
        "Foshan Bed",
        "Foshan Bedroom Set",
        "Foshan Hotel Bedroom Furniture",
    ],
    "Столы и стулья": [
        "Foshan Dining Table Chair",
        "Foshan Table Chair",
        "Foshan Dining Chair",
        "Foshan Dining Table",
    ],
    "Сантехника и ванные": [
        "Foshan Bathroom Vanity",
        "Foshan Bathroom Cabinet",
        "Foshan Sanitary Ware",
        "Foshan Bathtub Shower",
    ],
}

TARGET_PER_CATEGORY = 125
MAX_SEARCH_PAGES_PER_QUERY = 8


def clean_text(value: Any) -> str:
    if value is None:
        return ""
    text = html.unescape(str(value))
    text = re.sub(r"\s+", " ", text).strip()
    return text


def normalize_url(url: str) -> str:
    url = clean_text(url)
    if not url:
        return ""
    if url.startswith("//"):
        return "https:" + url
    return urljoin(BASE, url)


def get(session: requests.Session, url: str, timeout: int = 25) -> str:
    for attempt in range(3):
        try:
            response = session.get(url, headers=HEADERS, timeout=timeout)
            response.raise_for_status()
            return response.text
        except Exception:
            if attempt == 2:
                raise
            time.sleep(0.8 + attempt * 0.8)
    return ""


def parse_search_page(source_category: str, query: str, page: int, html_text: str) -> list[dict[str, str]]:
    soup = BeautifulSoup(html_text, "html.parser")
    products = []
    cards = soup.select(".list-node")
    if not cards:
        cards = soup.select(".prod-list")
    for card in cards:
        link_el = card.select_one("a.product-detail[href]") or card.select_one("h2.product-name a[href]")
        if not link_el:
            continue
        url = normalize_url(link_el.get("href"))
        if "/product_" not in url and "/product-" not in url:
            continue

        title_el = card.select_one("h2.product-name")
        title = clean_text(title_el.get("title") if title_el else link_el.get_text(" ", strip=True))
        if not title:
            title = clean_text(link_el.get_text(" ", strip=True))

        img_el = card.select_one("img[data-original]")
        image_url = normalize_url(img_el.get("data-original")) if img_el else ""

        price_el = card.select_one(".price") or card.select_one(".price-new")
        price_text = clean_text(price_el.get_text(" ", strip=True) if price_el else "")
        specs = {}
        for li in card.select(".property-list li"):
            val_el = li.select_one(".property-val")
            value = clean_text(val_el.get_text(" ", strip=True) if val_el else "")
            raw = clean_text(li.get_text(" ", strip=True))
            name = clean_text(raw.split(":", 1)[0]) if ":" in raw else ""
            if name and value:
                specs[name] = value

        products.append(
            {
                "source_category": source_category,
                "source_query": query,
                "search_page": str(page),
                "url": url,
                "list_title": title,
                "list_image_url": image_url,
                "list_price": price_text,
                "list_specs": json.dumps(specs, ensure_ascii=False),
            }
        )
    return products


def extract_json_ld_products(html_text: str) -> tuple[dict[str, Any] | None, dict[str, Any] | None, list[dict[str, str]]]:
    soup = BeautifulSoup(html_text, "html.parser")
    product = None
    organization = None
    faq = []
    for script in soup.select('script[type="application/ld+json"]'):
        raw = script.string or script.get_text()
        raw = raw.strip()
        if not raw:
            continue
        try:
            data = json.loads(raw)
        except Exception:
            continue
        nodes = data if isinstance(data, list) else [data]
        for node in nodes:
            if not isinstance(node, dict):
                continue
            kind = node.get("@type")
            if kind == "Product":
                product = node
            elif kind == "Organization":
                organization = node
            elif kind == "FAQPage":
                for item in node.get("mainEntity", []) or []:
                    answer = item.get("acceptedAnswer") or {}
                    faq.append(
                        {
                            "q": clean_text(item.get("name")),
                            "a": clean_text(answer.get("text") if isinstance(answer, dict) else answer),
                        }
                    )
    return product, organization, faq


def price_from_offer(offers: Any) -> tuple[str, str, str, str]:
    if isinstance(offers, list):
        offers = offers[0] if offers else {}
    if not isinstance(offers, dict):
        return "", "", "", ""
    currency = clean_text(offers.get("priceCurrency"))
    valid_until = clean_text(offers.get("priceValidUntil"))
    if offers.get("price"):
        return clean_text(offers.get("price")), "", currency, valid_until
    low = clean_text(offers.get("lowPrice"))
    high = clean_text(offers.get("highPrice"))
    if low and high:
        return f"{low}-{high}", "", currency, valid_until
    return low or high, "", currency, valid_until


def choose_category_from_breadcrumb(html_text: str) -> str:
    soup = BeautifulSoup(html_text, "html.parser")
    crumbs = [clean_text(a.get_text(" ", strip=True)) for a in soup.select(".sr-QPWords-item a, .sr-crumb a")]
    crumbs = [c for c in crumbs if c and c.lower() != "главная"]
    return " / ".join(crumbs[-3:])


def adapt_title(source_category: str, name: str) -> str:
    text = clean_text(name)
    replacements = [
        (r"\bФошаньская\b", ""),
        (r"\bФошаньский\b", ""),
        (r"\bФошаньское\b", ""),
        (r"\bФошаньские\b", ""),
        (r"\bФошаньская фабрика\b", ""),
        (r"\bФошаньский завод\b", ""),
        (r"\bиз Фошаня\b", ""),
        (r"\bв Фошане\b", ""),
        (r"\bФошань\s*", ""),
        (r"\bКитайская?\b", ""),
        (r"\bКитай\b", ""),
        (r"\bОптовая продажа\b", ""),
        (r"\bОптовик\b", ""),
        (r"\bПроизводитель\b", ""),
        (r"\bФабрика\b", ""),
        (r"\bКастом\b", "на заказ"),
        (r"\bкастомизированная\b", "индивидуальная"),
        (r"\bванити\b", "тумба под раковину"),
        (r"\bВанити\b", "тумба под раковину"),
        (r"\bВанная Кабинета\b", "тумба для ванной"),
        (r"\bВанная Юнит\b", "комплект для ванной"),
        (r"\bking size\b", "King Size"),
        (r"\s+", " "),
    ]
    for pattern, repl in replacements:
        text = re.sub(pattern, repl, text, flags=re.IGNORECASE)
    text = re.sub(r"^[,.\-– ]+", "", text).strip()
    text = text[:1].upper() + text[1:] if text else name

    category_prefixes = {
        "Шкафы и гардеробные": "Шкаф/гардеробная",
        "Спальни и кровати": "Мебель для спальни",
        "Столы и стулья": "Стол/стул",
        "Сантехника и ванные": "Мебель и сантехника для ванной",
    }
    prefix = category_prefixes.get(source_category, "")
    if prefix and not text.lower().startswith(prefix.lower()):
        text = f"{prefix}: {text}"
    return text


def shorten_description(source_category: str, description: str, specs: dict[str, str]) -> str:
    desc = clean_text(description)
    desc = re.sub(r"^(Фошань|Китай|Китайская?)\s+", "", desc, flags=re.IGNORECASE)
    parts = re.split(r"(?<=[.!?])\s+", desc)
    summary = " ".join(parts[:4]).strip()
    if len(summary) > 650:
        summary = summary[:647].rstrip() + "..."
    material = specs.get("Материал") or specs.get("материал") or specs.get("Основной материал")
    style = specs.get("Стиль") or specs.get("стиль")
    extra = []
    if material:
        extra.append(f"Материал: {material}")
    if style:
        extra.append(f"Стиль: {style}")
    if extra:
        summary = f"{summary} {'; '.join(extra)}."
    return summary


def parse_moq(html_text: str) -> str:
    soup = BeautifulSoup(html_text, "html.parser")
    el = soup.select_one(".sa-only-property-price")
    return clean_text(el.get_text(" ", strip=True) if el else "")


def detail_to_row(seed: dict[str, str], html_text: str) -> dict[str, str]:
    product, organization, faq = extract_json_ld_products(html_text)
    if not product:
        raise ValueError("Product JSON-LD not found")

    name = clean_text(product.get("name")) or seed.get("list_title", "")
    images = product.get("image") or []
    if isinstance(images, str):
        images = [images]
    images = [normalize_url(x) for x in images if x]
    specs = {
        clean_text(item.get("name")): clean_text(item.get("value"))
        for item in (product.get("additionalProperty") or [])
        if isinstance(item, dict) and item.get("name")
    }
    if not specs and seed.get("list_specs"):
        try:
            specs = json.loads(seed["list_specs"])
        except Exception:
            specs = {}
    specs_text = "; ".join(f"{k}: {v}" for k, v in specs.items() if v)

    price, _, currency, valid_until = price_from_offer(product.get("offers"))
    brand = product.get("brand") if isinstance(product.get("brand"), dict) else {}
    supplier = clean_text(brand.get("name")) if brand else ""
    if organization and not supplier:
        supplier = clean_text(organization.get("name"))

    origin = specs.get("Происхождение") or specs.get("происхождение") or ""
    trademark = specs.get("Торговая Марка") or specs.get("торговая марка") or ""
    package = specs.get("Транспортная Упаковка") or specs.get("транспортная упаковка") or ""
    faqs = " | ".join(f"{x['q']}: {x['a']}" for x in faq[:3] if x.get("q") or x.get("a"))
    breadcrumb = choose_category_from_breadcrumb(html_text)

    return {
        "Категория": seed["source_category"],
        "Подкатегория Made-in-China": breadcrumb,
        "Поисковый запрос": seed["source_query"],
        "Адаптированное название на русском": adapt_title(seed["source_category"], name),
        "Оригинальное название": name,
        "Описание": shorten_description(seed["source_category"], product.get("description", ""), specs),
        "Тех. характеристики": specs_text,
        "Прямая ссылка на фото": images[0] if images else seed.get("list_image_url", ""),
        "Все фото": " | ".join(images),
        "Цена": price or seed.get("list_price", ""),
        "Валюта": currency or "USD",
        "MOQ / минимальный заказ": parse_moq(html_text),
        "Поставщик": supplier,
        "Происхождение": origin,
        "Торговая марка": trademark,
        "Упаковка": package,
        "Ссылка на товар": product.get("offers", {}).get("url", "") if isinstance(product.get("offers"), dict) else seed["url"],
        "Дополнительная информация": f"Срок актуальности цены: {valid_until}. {faqs}".strip(),
        "Дата сбора": datetime.now().strftime("%Y-%m-%d"),
    }


def collect_seeds() -> list[dict[str, str]]:
    session = requests.Session()
    by_category: dict[str, dict[str, dict[str, str]]] = defaultdict(dict)

    for category, queries in CATEGORY_QUERIES.items():
        for query in queries:
            for page in range(1, MAX_SEARCH_PAGES_PER_QUERY + 1):
                url = f"{BASE}/productSearch?keyword={quote_plus(query)}&page={page}"
                try:
                    page_html = get(session, url)
                except Exception as exc:
                    print(f"SEARCH ERROR {category} / {query} / page {page}: {exc}", flush=True)
                    continue
                products = parse_search_page(category, query, page, page_html)
                for product in products:
                    by_category[category].setdefault(product["url"], product)
                print(
                    f"seed {category}: {len(by_category[category])} unique after {query} page {page}",
                    flush=True,
                )
                time.sleep(0.15)
                if len(by_category[category]) >= TARGET_PER_CATEGORY + 25:
                    break
            if len(by_category[category]) >= TARGET_PER_CATEGORY + 25:
                break

    seeds = []
    for category in CATEGORY_QUERIES:
        category_seeds = list(by_category[category].values())[: TARGET_PER_CATEGORY + 20]
        seeds.extend(category_seeds)
        print(f"selected seeds {category}: {len(category_seeds)}", flush=True)
    return seeds


def fetch_detail(seed: dict[str, str]) -> tuple[dict[str, str], str | None]:
    session = requests.Session()
    try:
        html_text = get(session, seed["url"], timeout=30)
        row = detail_to_row(seed, html_text)
        return row, None
    except Exception as exc:
        return {}, f"{seed['url']} :: {exc}"


def main() -> None:
    seeds = collect_seeds()
    rows_by_category: dict[str, list[dict[str, str]]] = defaultdict(list)
    errors = []

    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = [executor.submit(fetch_detail, seed) for seed in seeds]
        done = 0
        for future in as_completed(futures):
            row, error = future.result()
            done += 1
            if row:
                category = row["Категория"]
                if len(rows_by_category[category]) < TARGET_PER_CATEGORY:
                    rows_by_category[category].append(row)
            if error:
                errors.append(error)
            if done % 25 == 0:
                counts = ", ".join(f"{k}: {len(v)}" for k, v in rows_by_category.items())
                print(f"details {done}/{len(seeds)}; {counts}; errors={len(errors)}", flush=True)

    rows = []
    for category in CATEGORY_QUERIES:
        rows.extend(rows_by_category[category][:TARGET_PER_CATEGORY])

    fields = [
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
    ]

    csv_path = OUT_DIR / "made_in_china_500_products.csv"
    json_path = OUT_DIR / "made_in_china_500_products.json"
    with csv_path.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
    json_path.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")

    (OUT_DIR / "scrape_errors.txt").write_text("\n".join(errors), encoding="utf-8")
    print(json.dumps({"rows": len(rows), "csv": str(csv_path), "json": str(json_path), "errors": len(errors)}, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
