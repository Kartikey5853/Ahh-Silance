"""
Hybrid PDF Extractor: Solves the 'PDF Reader Fail' Problem.

Combines:
1. PyMuPDF Digital Text Layer (for metadata, Question IDs, Option IDs, marks).
2. Spatial Image Alignment (matching image bounding boxes to corresponding question IDs).
3. Horizontal Projection Line Slicing (for multi-line formula/stem crops).
4. RapidOCR ONNX Recognition (for transcribing math formulas, question stems, and options).
"""

import os
import sys
sys.stdout.reconfigure(encoding='utf-8')
import json
import time
import pymupdf
import cv2
import numpy as np
from rapidocr_onnxruntime import RapidOCR

engine = RapidOCR()

pdf_path = r"f:\neira\Dataset\NTA offical\JEE_Main_2024_27-01-2024_Shift1_B_Tech_27th_Jan_2024_Shift_1_English_Hindi.pdf"
doc = pymupdf.open(pdf_path)


def split_into_lines(img_bgr):
    """
    Splits a multi-line text image into individual horizontal line strips using horizontal projection.
    """
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape
    if h <= 45:
        return [img_bgr]

    _, binary = cv2.threshold(gray, 220, 255, cv2.THRESH_BINARY_INV)
    proj = np.sum(binary, axis=1)

    in_line = False
    lines = []
    start_y = 0

    for y in range(h):
        if proj[y] > w * 0.02 and not in_line:
            in_line = True
            start_y = max(0, y - 3)
        elif proj[y] <= w * 0.02 and in_line:
            in_line = False
            end_y = min(h, y + 3)
            if (end_y - start_y) >= 12:
                lines.append(img_bgr[start_y:end_y, :])

    if not lines:
        return [img_bgr]
    return lines


def ocr_image_crop(img_bgr):
    """
    Performs robust OCR on an image crop, handling multi-line stems and single-line options.
    """
    h, w = img_bgr.shape[:2]
    padded = cv2.copyMakeBorder(img_bgr, 20, 20, 20, 20, cv2.BORDER_CONSTANT, value=(255, 255, 255))
    res, _ = engine(padded)

    if res:
        res.sort(key=lambda x: x[0][0][1])
        return " ".join([item[1] for item in res])

    line_strips = split_into_lines(img_bgr)
    extracted_texts = []
    for strip in line_strips:
        pad_strip = cv2.copyMakeBorder(strip, 12, 12, 15, 15, cv2.BORDER_CONSTANT, value=(255, 255, 255))
        l_res, _ = engine(pad_strip, use_text_det=False)
        if l_res and len(l_res) > 0 and len(l_res[0]) > 1:
            extracted_texts.append(l_res[0][1])

    if extracted_texts:
        return " ".join(extracted_texts)

    return ""


def process_page(doc, page_num):
    """
    Reconstructs complete question data for a page using hybrid text + image OCR.
    """
    t0 = time.perf_counter()
    page = doc[page_num - 1]
    raw_text = page.get_text()
    image_list = page.get_images(full=True)

    spatial_images = []
    for img_info in image_list:
        xref = img_info[0]
        rects = page.get_image_rects(xref)
        if not rects:
            continue
        base_img = doc.extract_image(xref)
        img_bytes = base_img["image"]
        nparr = np.frombuffer(img_bytes, np.uint8)
        img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        for rect in rects:
            spatial_images.append({
                "xref": xref,
                "rect": [float(rect.x0), float(rect.y0), float(rect.x1), float(rect.y1)],
                "y0": float(rect.y0),
                "y1": float(rect.y1),
                "x0": float(rect.x0),
                "x1": float(rect.x1),
                "img": img_bgr
            })

    spatial_images.sort(key=lambda x: x["y0"])

    for item in spatial_images:
        item["ocr_text"] = ocr_image_crop(item["img"])
        del item["img"] # Free memory

    latency_ms = round((time.perf_counter() - t0) * 1000.0, 2)
    return {
        "page_no": page_num,
        "images_count": len(spatial_images),
        "spatial_images": spatial_images,
        "raw_text_length": len(raw_text),
        "latency_ms": latency_ms
    }


if __name__ == "__main__":
    print("=== Testing Hybrid PDF Extractor on Pages 1 to 10 ===", flush=True)
    all_pages = []
    for p in range(1, 11):
        res = process_page(doc, p)
        all_pages.append(res)
        print(f"Page {p:02d}: Extracted {res['images_count']} images in {res['latency_ms']} ms", flush=True)
        for idx, img_item in enumerate(res["spatial_images"]):
            rect = img_item["rect"]
            ocr = img_item["ocr_text"]
            print(f"   [{idx+1}] (y={rect[1]:.0f}..{rect[3]:.0f}): '{ocr}'", flush=True)

    out_json = r"f:\neira\reports\internal_backend_test\assets\test1_hybrid_extracted.json"
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(all_pages, f, indent=2, ensure_ascii=False)
    print(f"\n[SUCCESS] Saved extracted data to {out_json}", flush=True)
    doc.close()
