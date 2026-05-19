import io
import json
import os
import sys
import urllib.parse
import urllib.request

import numpy as np
from PIL import Image, ImageOps


def load_env():
    env = {}
    with open(".env", encoding="utf-8") as env_file:
        for line in env_file:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                env[key] = value
    return env


def request_json(url, method="GET", headers=None, payload=None, retries=2):
    body = None
    final_headers = dict(headers or {})
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        final_headers["content-type"] = "application/json"
    last_error = None
    for _ in range(retries + 1):
        try:
            request = urllib.request.Request(url, data=body, headers=final_headers, method=method)
            with urllib.request.urlopen(request, timeout=90) as response:
                raw = response.read()
                if not raw:
                    return None
                return json.loads(raw)
        except Exception as error:
            last_error = error
    raise last_error


def request_bytes(url, headers=None):
    request = urllib.request.Request(url, headers=headers or {}, method="GET")
    with urllib.request.urlopen(request, timeout=45) as response:
        return response.read()


def perceptual_bits(raw):
    image = Image.open(io.BytesIO(raw)).convert("RGB")
    image = ImageOps.exif_transpose(image)

    gray = ImageOps.grayscale(image).resize((16, 16), Image.Resampling.LANCZOS)
    arr = np.asarray(gray, dtype=np.float32)
    median = float(np.median(arr))
    average_hash = "".join("1" if value > median else "0" for value in arr.flatten())

    small = ImageOps.grayscale(image).resize((17, 16), Image.Resampling.LANCZOS)
    diff = np.asarray(small, dtype=np.int16)
    difference_hash = "".join(
        "1" if diff[y, x] > diff[y, x + 1] else "0"
        for y in range(16)
        for x in range(16)
    )

    return average_hash, difference_hash


def hamming(left, right):
    return sum(a != b for a, b in zip(left, right))


def visually_similar(left, right):
    return hamming(left[0], right[0]) <= 18 or hamming(left[1], right[1]) <= 18


def clean_product_images(product):
    kept_urls = []
    discarded_urls = []
    kept_hashes = []

    for image_url in product.get("images") or []:
        try:
            raw = request_bytes(image_url, {"user-agent": "Mozilla/5.0 (compatible; NestobiCleaner/1.0)"})
            image_hash = perceptual_bits(raw)
        except Exception:
            if image_url not in kept_urls:
                kept_urls.append(image_url)
            continue

        if any(visually_similar(image_hash, existing_hash) for existing_hash in kept_hashes):
            discarded_urls.append(image_url)
            continue

        kept_hashes.append(image_hash)
        kept_urls.append(image_url)

    return kept_urls, discarded_urls


def main():
    apply = "--apply" in sys.argv
    env = load_env()
    supabase_url = env["VITE_SUPABASE_URL"]
    anon_key = env["VITE_SUPABASE_ANON_KEY"]
    email = os.environ.get("NESTOBI_IMPORT_EMAIL")
    password = os.environ.get("NESTOBI_IMPORT_PASSWORD")

    if not email or not password:
        raise SystemExit("Set NESTOBI_IMPORT_EMAIL and NESTOBI_IMPORT_PASSWORD before running this script")

    auth = request_json(
        f"{supabase_url}/auth/v1/token?grant_type=password",
        method="POST",
        headers={"apikey": anon_key},
        payload={"email": email, "password": password},
    )
    token = auth["access_token"]
    headers = {"apikey": anon_key, "authorization": f"Bearer {token}"}
    query = urllib.parse.urlencode(
        {
            "select": "id,name,images,image_url,source_url",
            "source_url": "like.*dlalshop.com*",
            "order": "created_at.asc",
        }
    )
    products = request_json(f"{supabase_url}/rest/v1/products?{query}", headers=headers)

    changed = []
    total_before = 0
    total_after = 0

    for product in products:
        original_images = product.get("images") or []
        kept_images, discarded_images = clean_product_images(product)
        total_before += len(original_images)
        total_after += len(kept_images)

        if len(kept_images) == len(original_images):
            continue

        changed.append(
            {
                "id": product["id"],
                "name": product["name"],
                "before": len(original_images),
                "after": len(kept_images),
                "discarded": len(discarded_images),
            }
        )

        if apply:
            product_id = urllib.parse.quote(product["id"])
            request_json(
                f"{supabase_url}/rest/v1/products?id=eq.{product_id}",
                method="PATCH",
                headers={**headers, "prefer": "return=minimal"},
                payload={
                    "images": kept_images,
                    "image_url": kept_images[0] if kept_images else product.get("image_url") or "",
                },
            )

    print(
        json.dumps(
            {
                "apply": apply,
                "products": len(products),
                "changed": len(changed),
                "total_before": total_before,
                "total_after": total_after,
                "sample": changed[:20],
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
