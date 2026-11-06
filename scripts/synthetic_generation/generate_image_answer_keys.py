"""
Generates authentic computer-generated (printed table) and handwritten image answer keys
for both JEE Main and JEE Advanced datasets.
"""

import os
import csv
import random
import cv2
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
EXTERNAL_TEST_DIR = os.path.join(BASE_DIR, "Dataset", "external_test")
JEE_ADVANCED_DIR = os.path.join(BASE_DIR, "Dataset", "jee_advanced")


def load_csv_key(csv_path: str) -> dict:
    mapping = {}
    with open(csv_path, "r", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        header = next(reader, None)
        for row in reader:
            if len(row) >= 2:
                q_num = int(row[0].strip())
                mapping[q_num] = row[1].strip()
    return mapping


def generate_jee_main_printed_key(mapping: dict, out_path: str):
    w, h = 1600, 2400
    img = np.full((h, w, 3), 255, dtype=np.uint8)

    # Top official header
    cv2.putText(img, "NATIONAL TESTING AGENCY (NTA) - JEE (MAIN) 2025", (220, 65), cv2.FONT_HERSHEY_DUPLEX, 0.95, (0, 0, 0), 2)
    cv2.putText(img, "OFFICIAL FINAL MASTER ANSWER KEY - SESSION 1 (SET A)", (310, 105), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (60, 60, 60), 2)
    cv2.line(img, (80, 125), (1520, 125), (0, 0, 0), 2)

    cols = [
        ("CHEMISTRY (Q1 - Q30)", 1, 30, 100),
        ("PHYSICS (Q31 - Q60)", 31, 60, 600),
        ("MATHEMATICS (Q61 - Q90)", 61, 90, 1100)
    ]

    for title, q_start, q_end, cx in cols:
        cv2.putText(img, title, (cx, 165), cv2.FONT_HERSHEY_DUPLEX, 0.75, (0, 90, 180), 2)
        cv2.line(img, (cx, 180), (cx + 400, 180), (120, 120, 120), 1)

        for q in range(q_start, q_end + 1):
            rel = q - q_start
            y = 225 + rel * 70
            ans_val = mapping.get(q, "A")
            # Draw line separator
            cv2.line(img, (cx, y + 15), (cx + 380, y + 15), (240, 240, 240), 1)
            cv2.putText(img, f"Q{q:02d} : {ans_val}", (cx + 10, y), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)

    cv2.imwrite(out_path, img)
    print(f"[SUCCESS] Generated JEE Main Printed Key Image: {out_path}")


def generate_jee_main_handwritten_key(mapping: dict, out_path: str):
    w, h = 1600, 2400
    img = np.full((h, w, 3), 248, dtype=np.uint8) # off-white paper

    # Ruled lines
    for y in range(120, h - 50, 65):
        cv2.line(img, (50, y), (w - 50, y), (235, 220, 215), 1)

    # Red margin
    cv2.line(img, (110, 50), (110, h - 50), (200, 200, 240), 2)

    pen_col = (115, 25, 20) # Blue ballpoint ink

    cv2.putText(img, "JEE Main 2025 Jan Session - Answer Key (SET A)", (150, 95), cv2.FONT_HERSHEY_SIMPLEX, 0.88, pen_col, 2)

    cols = [
        ("CHEMISTRY", 1, 30, 150),
        ("PHYSICS", 31, 60, 640),
        ("MATHEMATICS", 61, 90, 1130)
    ]

    for title, q_start, q_end, cx in cols:
        cv2.putText(img, title, (cx, 150), cv2.FONT_HERSHEY_DUPLEX, 0.75, (160, 40, 20), 2)

        for q in range(q_start, q_end + 1):
            rel = q - q_start
            y = 210 + rel * 65
            ans_val = mapping.get(q, "A")
            jx = (q % 3) - 1
            jy = ((q * 2) % 3) - 1
            sep = "." if q % 2 == 0 else ":"
            cv2.putText(img, f"Q{q:02d}{sep} {ans_val}", (cx + jx, y + jy), cv2.FONT_HERSHEY_SIMPLEX, 0.68, pen_col, 2)

    cv2.imwrite(out_path, img)
    print(f"[SUCCESS] Generated JEE Main Handwritten Key Image: {out_path}")


def generate_jee_advanced_printed_key(mapping: dict, out_path: str):
    w, h = 1600, 2200
    img = np.full((h, w, 3), 255, dtype=np.uint8)

    # Header
    cv2.putText(img, "INDIAN INSTITUTES OF TECHNOLOGY - JEE (ADVANCED) 2025", (170, 65), cv2.FONT_HERSHEY_DUPLEX, 0.95, (0, 0, 0), 2)
    cv2.putText(img, "PAPER 1 MASTER ANSWER KEY - 51 QUESTIONS (SET A)", (330, 105), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (60, 60, 60), 2)
    cv2.line(img, (80, 125), (1520, 125), (0, 0, 0), 2)

    cols = [
        ("PHYSICS (Q1 - Q17)", 1, 17, 100),
        ("CHEMISTRY (Q18 - Q34)", 18, 34, 600),
        ("MATHEMATICS (Q35 - Q51)", 35, 51, 1100)
    ]

    for title, q_start, q_end, cx in cols:
        cv2.putText(img, title, (cx, 165), cv2.FONT_HERSHEY_DUPLEX, 0.75, (0, 90, 180), 2)
        cv2.line(img, (cx, 180), (cx + 400, 180), (120, 120, 120), 1)

        for q in range(q_start, q_end + 1):
            rel = q - q_start
            y = 230 + rel * 105
            ans_val = mapping.get(q, "A")
            cv2.line(img, (cx, y + 20), (cx + 380, y + 20), (240, 240, 240), 1)
            cv2.putText(img, f"Q{q:02d} : {ans_val}", (cx + 10, y), cv2.FONT_HERSHEY_SIMPLEX, 0.72, (0, 0, 0), 2)

    cv2.imwrite(out_path, img)
    print(f"[SUCCESS] Generated JEE Advanced Printed Key Image: {out_path}")


def generate_jee_advanced_handwritten_key(mapping: dict, out_path: str):
    w, h = 1600, 2200
    img = np.full((h, w, 3), 248, dtype=np.uint8)

    # Ruled lines
    for y in range(120, h - 50, 65):
        cv2.line(img, (50, y), (w - 50, y), (235, 220, 215), 1)

    # Red margin
    cv2.line(img, (110, 50), (110, h - 50), (200, 200, 240), 2)

    pen_col = (115, 25, 20)

    cv2.putText(img, "JEE Advanced 2025 Paper 1 - Master Key (SET A)", (150, 95), cv2.FONT_HERSHEY_SIMPLEX, 0.88, pen_col, 2)

    cols = [
        ("PHYSICS", 1, 17, 150),
        ("CHEMISTRY", 18, 34, 640),
        ("MATHEMATICS", 35, 51, 1130)
    ]

    for title, q_start, q_end, cx in cols:
        cv2.putText(img, title, (cx, 150), cv2.FONT_HERSHEY_DUPLEX, 0.75, (160, 40, 20), 2)

        for q in range(q_start, q_end + 1):
            rel = q - q_start
            y = 220 + rel * 105
            ans_val = mapping.get(q, "A")
            jx = (q % 3) - 1
            jy = ((q * 2) % 3) - 1
            sep = "." if q % 2 == 0 else ":"
            cv2.putText(img, f"Q{q:02d}{sep} {ans_val}", (cx + jx, y + jy), cv2.FONT_HERSHEY_SIMPLEX, 0.7, pen_col, 2)

    cv2.imwrite(out_path, img)
    print(f"[SUCCESS] Generated JEE Advanced Handwritten Key Image: {out_path}")


def main():
    # 1. JEE Main Keys
    jm_csv = os.path.join(EXTERNAL_TEST_DIR, "answer_key_01.csv")
    if os.path.exists(jm_csv):
        jm_mapping = load_csv_key(jm_csv)
        generate_jee_main_printed_key(jm_mapping, os.path.join(EXTERNAL_TEST_DIR, "answer_key_01_printed.png"))
        generate_jee_main_handwritten_key(jm_mapping, os.path.join(EXTERNAL_TEST_DIR, "answer_key_01_handwritten.png"))

    # 2. JEE Advanced Keys
    ja_csv = os.path.join(JEE_ADVANCED_DIR, "jee_advanced_answer_key_01.csv")
    if os.path.exists(ja_csv):
        ja_mapping = load_csv_key(ja_csv)
        generate_jee_advanced_printed_key(ja_mapping, os.path.join(JEE_ADVANCED_DIR, "jee_advanced_answer_key_01_printed.png"))
        generate_jee_advanced_handwritten_key(ja_mapping, os.path.join(JEE_ADVANCED_DIR, "jee_advanced_answer_key_01_handwritten.png"))


if __name__ == "__main__":
    main()
