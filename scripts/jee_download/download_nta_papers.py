import json
import os
import re
import urllib.request
import urllib.parse
import time

DEST_DIR = r"f:\neira\Dataset\NTA offical"
os.makedirs(DEST_DIR, exist_ok=True)

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "*/*",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "Origin": "https://nta.ac.in",
    "Referer": "https://nta.ac.in/Downloads",
    "X-Requested-With": "XMLHttpRequest"
}

def get_papers_for_year(year):
    url = "https://nta.ac.in/downloads/getlist"
    data = f"Year={year}&ExamType=1&PaperType=0".encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("List", [])
    except Exception as e:
        print(f"Error fetching for year {year}: {e}")
        return []

def sanitize_filename(name):
    # Remove invalid characters for windows
    cleaned = re.sub(r'[\\/*?:"<>|]', '_', name)
    cleaned = re.sub(r'\s+', '_', cleaned).strip('_')
    return cleaned

def download_file(relative_url, output_path):
    full_url = f"https://nta.ac.in{relative_url}"
    print(f"Downloading: {full_url} -> {os.path.basename(output_path)} ...")
    req = urllib.request.Request(full_url, headers={"User-Agent": headers["User-Agent"]})
    try:
        with urllib.request.urlopen(req, timeout=60) as resp, open(output_path, "wb") as f:
            while True:
                chunk = resp.read(64 * 1024)
                if not chunk:
                    break
                f.write(chunk)
        size_mb = os.path.getsize(output_path) / (1024 * 1024)
        print(f"  [SUCCESS] {os.path.basename(output_path)} ({size_mb:.2f} MB)")
        return True
    except Exception as e:
        print(f"  [FAILED] {full_url}: {e}")
        if os.path.exists(output_path):
            os.remove(output_path)
        return False

def main():
    years = [2025, 2024, 2023]
    all_btech_papers = []

    for year in years:
        papers = get_papers_for_year(year)
        print(f"Year {year}: Total items returned = {len(papers)}")
        for p in papers:
            name = p.get("PaperName", "")
            # Filter specifically for B.Tech / BTech
            is_btech = bool(re.search(r'\bb\s*\.?\s*tech\b', name, re.IGNORECASE))
            if is_btech and p.get("PaperFile"):
                all_btech_papers.append(p)

    print(f"\nTotal B.Tech papers identified: {len(all_btech_papers)}")

    downloaded = 0
    for idx, p in enumerate(all_btech_papers, 1):
        year = p.get("Year")
        paper_name = p.get("PaperName", f"Paper_{idx}")
        shift = p.get("Shift", "")
        paper_date = p.get("PaperDate", "")
        rel_url = p.get("PaperFile")
        
        # Clean naming format: JEE_Main_{year}_{Date}_Shift_{shift}_{PaperName}.pdf
        clean_name = sanitize_filename(f"JEE_Main_{year}_{paper_date}_Shift{shift}_{paper_name}")
        if not clean_name.lower().endswith(".pdf"):
            clean_name += ".pdf"
            
        dest_path = os.path.join(DEST_DIR, clean_name)
        if os.path.exists(dest_path) and os.path.getsize(dest_path) > 100000:
            print(f"[{idx}/{len(all_btech_papers)}] Already downloaded: {clean_name}")
            downloaded += 1
            continue

        print(f"[{idx}/{len(all_btech_papers)}] Fetching...", end=" ")
        success = download_file(rel_url, dest_path)
        if success:
            downloaded += 1
        time.sleep(0.5)

    print(f"\nCompleted! Total downloaded: {downloaded}/{len(all_btech_papers)}")

if __name__ == "__main__":
    main()
