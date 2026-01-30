import json
import urllib.request
import urllib.error

API = "http://127.0.0.1:8000"


def http_json(url: str, method: str = "GET", body: dict | None = None) -> dict | list:
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main():
    try:
        sellers = http_json(f"{API}/api/sellers")
        if not sellers:
            print("No sellers found. Seed must run first.")
            return
        seller_id = sellers[0]["id"]
        print(f"Using seller: {seller_id}")

        created_ids = []
        for i in range(1, 31):
            name = f"샘플 상품 {i:02d}"
            desc = "샘플 설명입니다.\n이 상품은 데모 데이터로 표시됩니다."
            details_html = (
                f"<p><strong>{name}</strong>의 상세정보입니다.</p>"
                f"<ul><li>특징 A</li><li>특징 B</li><li>특징 C</li></ul>"
            )
            # Use placeholder image service for demo
            base = f"https://placehold.co/800x800?text=Sample+{i:02d}"
            images = [
                {"url": base, "sort": 1},
                {"url": f"{base}+Alt1", "sort": 2},
                {"url": f"{base}+Alt2", "sort": 3},
            ]
            price = 1000 + i * 10
            body = {
                "sellerId": seller_id,
                "name": name,
                "description": desc,
                "detailsHtml": details_html,
                "priceJpy": price,
                "images": images,
            }
            try:
                res = http_json(f"{API}/api/admin/products", method="POST", body=body)
                created_ids.append(res["id"])
                print(f"Created: {res['id']} - {name}")
            except urllib.error.HTTPError as e:
                msg = e.read().decode("utf-8")
                print(f"Failed to create {name}: {e.code} {msg}")
            except Exception as e:
                print(f"Failed to create {name}: {e}")

        print(f"Done. Created {len(created_ids)} products.")
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    main()
