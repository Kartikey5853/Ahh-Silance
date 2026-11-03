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
    years = [2020, 2021, 2022]
    target_papers = []

    for year in years:
        papers = get_papers_for_year(year)
        print(f"Year {year}: Total items = {len(papers)}")
        
        seen_shifts = set()
        for p in papers:
            name = p.get("PaperName", "").strip()
            shift = str(p.get("Shift", "")).strip()
            date = str(p.get("PaperDate", "")).strip()
            rel_url = p.get("PaperFile")
            if not rel_url:
                continue

            # Year 2020: Paper 1 is BTech
            if year == 2020:
                if name.startswith("PAPER- I") or name == "PAPER- I":
                    key = (year, date, shift)
                    if key not in seen_shifts:
                        seen_shifts.add(key)
                        target_papers.append(p)
            elif year == 2021:
                # English or default BTech
                lower_name = name.lower()
                if "btech" in lower_name and ("english" in lower_name or name.strip() == "BTech" or "btech eh" in lower_name):
                    key = (year, date, shift)
                    if key not in seen_shifts:
                        seen_shifts.add(key)
                        target_papers.append(p)
            elif year == 2022:
                lower_name = name.lower()
                if "btech" in lower_name and ("english" in lower_name or "hindi" in lower_name):
                    key = (year, date, shift)
                    if key not in seen_shifts:
                        seen_shifts.add(key)
                        target_papers.append(p)

    print(f"\nTotal new B.Tech papers queued: {len(target_papers)}")

    downloaded = 0
    for idx, p in enumerate(target_papers, 1):
        year = p.get("Year")
        paper_name = p.get("PaperName", f"Paper_{idx}")
        shift = p.get("Shift", "")
        paper_date = p.get("PaperDate", "")
        rel_url = p.get("PaperFile")
        
        clean_name = sanitize_filename(f"JEE_Main_{year}_{paper_date}_Shift{shift}_{paper_name}")
        if not clean_name.lower().endswith(".pdf"):
            clean_name += ".pdf"
            
        dest_path = os.path.join(DEST_DIR, clean_name)
        if os.path.exists(dest_path) and os.path.getsize(dest_path) > 100000:
            print(f"[{idx}/{len(target_papers)}] Already downloaded: {clean_name}")
            downloaded += 1
            continue

        print(f"[{idx}/{len(target_papers)}] Fetching...", end=" ")
        success = download_file(rel_url, dest_path)
        if success:
            downloaded += 1
        time.sleep(0.3)

    print(f"\nFinished batch! Downloaded {downloaded}/{len(target_papers)}")

if __name__ == "__main__":
    main()
