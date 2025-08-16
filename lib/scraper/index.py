from __future__ import annotations

import csv
import sys
from pathlib import Path
import re
from typing import List, Dict
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

try:
    import cloudscraper  # type: ignore
except Exception:  # pragma: no cover
    cloudscraper = None  # noqa: N816


def fetch_html(url: str, *, timeout_seconds: int = 30) -> str:
    """Fetch HTML with a browser-like client. Uses cloudscraper when available."""
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/126.0.0.0 Safari/537.36"
        ),
        "Accept": (
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
        ),
        "Accept-Language": "en-US,en;q=0.9",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
    }

    session: requests.Session
    if cloudscraper is not None:
        session = cloudscraper.create_scraper(
            browser={
                "browser": "chrome",
                "platform": "darwin",
                "mobile": False,
            }
        )
    else:
        session = requests.Session()

    response = session.get(url, headers=headers, timeout=timeout_seconds)
    response.raise_for_status()
    return response.text


def normalize_price(raw_text: str) -> str:
    """Normalize price text by removing currency symbols, spaces, and commas.

    Example: "EGP 26,499" -> "26499"
    """
    if not raw_text:
        return ""
    # Remove everything that is not a digit
    digits_only = re.sub(r"[^0-9]", "", raw_text)
    return digits_only


def parse_product_links(html: str, base_url: str) -> List[Dict[str, str]]:
    """Parse product anchors within ul.product_list.grid and return title+href+price.

    Both a.product_img_link and span.price.product-price are inside ul.product_list.grid > li
    """
    soup = BeautifulSoup(html, "html.parser")

    # Primary container as requested
    product_container = soup.select_one("ul.product_list.grid")
    if product_container is None:
        # Fallback in case of additional classes/structure variations
        product_container = soup.select_one("ul.product_list")

    if product_container is not None:
        list_items = product_container.select("li")
    else:
        list_items = soup.select("li")

    results: List[Dict[str, str]] = []
    for li in list_items:
        # Find the product anchor within this list item
        anchor = li.select_one("a.product_img_link")
        if not anchor:
            continue
            
        href = anchor.get("href")
        title = anchor.get("title") or anchor.get("data-original-title") or ""
        if not href:
            continue
        absolute_href = urljoin(base_url, href)

        # Find the price span within the same list item
        price_el = li.select_one("span.price.product-price")
        price_text = price_el.get_text(strip=True) if price_el else ""

        results.append({
            "title": title.strip(),
            "href": absolute_href,
            "price": normalize_price(price_text),
        })

    return results


def save_to_csv(rows: List[Dict[str, str]], output_path: Path) -> None:
    """Save rows to CSV with columns: title, href, price, detail_price, h1."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", newline="", encoding="utf-8-sig") as file:
        writer = csv.DictWriter(file, fieldnames=["title", "href", "price", "detail_price", "h1"]) 
        writer.writeheader()
        for row in rows:
            writer.writerow({
                "title": row.get("title", ""),
                "href": row.get("href", ""),
                "price": row.get("price", ""),
                "detail_price": row.get("detail_price", ""),
                "h1": row.get("h1", ""),
            })


def extract_first_h1(html: str) -> str:
    """Extract the first <h1> text from an HTML document."""
    soup = BeautifulSoup(html, "html.parser")
    h1_el = soup.find("h1")
    return h1_el.get_text(strip=True) if h1_el else ""


def extract_detail_price(html: str) -> str:
    """Extract the product price from the detail page using span#our_price_display.price.

    Falls back to the element's text when the content attribute is missing.
    The returned value is normalized to digits only, e.g., "EGP 4,999" -> "4999".
    """
    soup = BeautifulSoup(html, "html.parser")
    price_el = soup.select_one("span#our_price_display.price") or soup.select_one("#our_price_display")
    if price_el is None:
        return ""
    raw_value = price_el.get("content") or price_el.get_text(strip=True)
    return normalize_price(raw_value)


def enrich_products_with_details(products: List[Dict[str, str]]) -> List[Dict[str, str]]:
    """Fetch each product page and attach first h1 and detail page price."""
    enriched: List[Dict[str, str]] = []
    for product in products:
        href = product.get("href", "")
        h1_text = ""
        detail_price = ""
        if href:
            try:
                detail_html = fetch_html(href)
                h1_text = extract_first_h1(detail_html)
                detail_price = extract_detail_price(detail_html)
            except Exception:
                h1_text = ""
                detail_price = ""
        enriched.append({**product, "h1": h1_text, "detail_price": detail_price})
    return enriched


def main() -> int:
    target_url = "https://cairosales.com/en/air-conditioners/?n=10"
    base_url = "https://cairosales.com"

    try:
        html = fetch_html(target_url)
    except Exception as exc:
        print(f"Failed to fetch HTML: {exc}", file=sys.stderr)
        return 1

    products = parse_product_links(html, base_url=base_url)
    print(f"Found {len(products)} products on listing page")

    products_with_details = enrich_products_with_details(products)
    print(f"Enriched {len(products_with_details)} products with first h1 and detail price")
    print("First H1s:")
    for product in products_with_details:
        print(product.get("h1", ""))
    print("Detail page prices (normalized):")
    for product in products_with_details:
        print(product.get("detail_price", ""))

    desktop = Path.home() / "Desktop"
    output_csv = desktop / "cairosales_products.csv"
    try:
        save_to_csv(products_with_details, output_csv)
    except Exception as exc:
        print(f"Failed to save CSV: {exc}", file=sys.stderr)
        return 1

    print(f"Saved: {output_csv}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())