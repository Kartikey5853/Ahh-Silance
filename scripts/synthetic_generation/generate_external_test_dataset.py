"""
Generator for External Test Dataset.

Generates:
1. Dataset/external_test/omr_sheet_01.png + answer_key_01.json (.csv/.txt)
2. Dataset/external_test/omr_sheet_02.png + answer_key_02.json (.csv/.txt)
3. Dataset/external_test/marked_question_paper_10pages.pdf + marked_paper_answer_key.json (.csv/.txt)
"""

import os
import random
import json
import csv
import numpy as np
import cv2
import pymupdf as fitz

OUT_DIR = r"f:\neira\Dataset\external_test"
os.makedirs(OUT_DIR, exist_ok=True)

PEN_COLORS = {
    "blue_ballpoint": (185, 45, 15),
    "black_ballpoint": (25, 25, 25),
}

def draw_bubble(img, cx, cy, radius, label="", is_filled=False, fill_color=(25, 25, 25), is_faint=False, is_double=False):
    cv2.circle(img, (cx, cy), radius, (80, 80, 80), 1, cv2.LINE_AA)
    if label:
        cv2.putText(img, label, (cx - 4, cy + 4), cv2.FONT_HERSHEY_SIMPLEX, 0.34, (70, 70, 70), 1, cv2.LINE_AA)
    if is_filled:
        col = (175, 175, 180) if is_faint else fill_color
        cv2.circle(img, (cx, cy), radius - 2, col, -1, cv2.LINE_AA)
        if is_double:
            cv2.line(img, (cx - 6, cy - 6), (cx + 6, cy + 6), (0, 0, 180), 2, cv2.LINE_AA)
            cv2.line(img, (cx - 6, cy + 6), (cx + 6, cy - 6), (0, 0, 180), 2, cv2.LINE_AA)

def generate_omr(sheet_idx: int, roll_no: str, booklet_code: str, force_overflow: bool = False):
    img = np.full((3508, 2480, 3), 255, dtype=np.uint8)
    pen_col = PEN_COLORS["blue_ballpoint"] if sheet_idx == 1 else PEN_COLORS["black_ballpoint"]

    # Header
    cv2.rectangle(img, (100, 100), (2380, 3400), (0, 0, 0), 3)
    cv2.rectangle(img, (120, 120), (2360, 240), (240, 240, 240), -1)
    cv2.putText(img, "JOINT ENTRANCE EXAMINATION (MAIN) - CANDIDATE OMR ANSWER SHEET", (260, 175), cv2.FONT_HERSHEY_DUPLEX, 1.05, (0, 0, 0), 2)
    cv2.putText(img, f"EXAM: JEE (MAIN) 2025 | TEST BOOKLET CODE: {booklet_code} | EXTERNAL TEST #{sheet_idx}", (520, 215), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (60, 60, 60), 2)

    # Roll Number Header
    cv2.rectangle(img, (150, 270), (1200, 480), (60, 60, 60), 2)
    cv2.putText(img, "CANDIDATE ROLL NUMBER", (170, 300), cv2.FONT_HERSHEY_DUPLEX, 0.7, (0, 0, 0), 2)
    for d_i, ch in enumerate(roll_no):
        rx = 220 + d_i * 90
        cv2.rectangle(img, (rx - 25, 320), (rx + 25, 370), (0, 0, 0), 2)
        cv2.putText(img, ch, (rx - 10, 358), cv2.FONT_HERSHEY_DUPLEX, 1.0, (0, 0, 0), 2)
        # 10 bubble rows under digit
        val = int(ch)
        for b_v in range(10):
            by = 395 + b_v * 7 # compressed display row
            is_f = (b_v == val)
            draw_bubble(img, rx, 385 + b_v * 8, 4, label="", is_filled=is_f, fill_color=pen_col)

    # Candidate Name & Sign
    cv2.rectangle(img, (1250, 270), (2300, 480), (60, 60, 60), 2)
    cv2.putText(img, "CANDIDATE SIGNATURE & DECLARATION", (1280, 305), cv2.FONT_HERSHEY_DUPLEX, 0.7, (0, 0, 0), 2)
    cv2.putText(img, f"Candidate Name: Test Student {sheet_idx}", (1280, 350), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (30, 30, 30), 2)
    cv2.putText(img, "Signature Verified by Invigilator", (1280, 410), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (100, 100, 100), 1)

    # Section A: MCQ (Q1-Q20 Chem, Q31-Q50 Phys, Q61-Q80 Math)
    cv2.rectangle(img, (150, 500), (2300, 1680), (60, 60, 60), 2)
    cv2.rectangle(img, (150, 500), (2300, 545), (235, 235, 235), -1)
    cv2.putText(img, "SECTION A : MULTIPLE CHOICE QUESTIONS (Single Correct Choice: +4, -1, 0)", (420, 532), cv2.FONT_HERSHEY_DUPLEX, 0.85, (0, 0, 0), 2)

    sec_a_subjects = [
        {"name": "CHEMISTRY (Q01 - Q20)", "subject": "CHEMISTRY", "q_start": 1, "q_end": 20, "x_off": 210},
        {"name": "PHYSICS (Q31 - Q50)", "subject": "PHYSICS", "q_start": 31, "q_end": 50, "x_off": 910},
        {"name": "MATHEMATICS (Q61 - Q80)", "subject": "MATHEMATICS", "q_start": 61, "q_end": 80, "x_off": 1610}
    ]

    master_key_dict = {}
    student_responses = {}
    random.seed(42 + sheet_idx * 17)

    for sub in sec_a_subjects:
        x = sub["x_off"]
        cv2.putText(img, sub["name"], (x + 90, 585), cv2.FONT_HERSHEY_DUPLEX, 0.8, (0, 0, 0), 2)
        cv2.line(img, (x, 598), (x + 480, 598), (120, 120, 120), 1)
        for o_i, opt in enumerate(["A", "B", "C", "D"]):
            cv2.putText(img, opt, (x + 180 + o_i * 75, 630), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (60, 60, 60), 2)

        for q in range(sub["q_start"], sub["q_end"] + 1):
            y = 675 + (q - sub["q_start"]) * 48
            cv2.putText(img, f"Q{q:02d}", (x + 20, y + 6), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 0, 0), 2)

            key_opt = random.choice(["A", "B", "C", "D"])
            master_key_dict[str(q)] = key_opt

            # Candidate response: 85% attempt rate
            is_att = random.random() < 0.85
            if is_att:
                is_correct = (random.random() < 0.75) if sheet_idx == 1 else (random.random() < 0.65)
                cand_opt = key_opt if is_correct else random.choice([o for o in ["A", "B", "C", "D"] if o != key_opt])
            else:
                cand_opt = None

            for o_i, opt in enumerate(["A", "B", "C", "D"]):
                bx = x + 188 + o_i * 75
                draw_bubble(img, bx, y, 16, label=opt, is_filled=(opt == cand_opt), fill_color=pen_col)

            student_responses[str(q)] = {
                "question_no": q,
                "subject": sub["subject"],
                "marked_option": cand_opt,
                "is_attempted": is_att
            }

    # Section B: Numerical (Q21-Q30 Chem, Q51-Q60 Phys, Q81-Q90 Math)
    cv2.rectangle(img, (150, 1710), (2300, 3350), (60, 60, 60), 2)
    cv2.rectangle(img, (150, 1710), (2300, 1755), (235, 235, 235), -1)
    cv2.putText(img, "SECTION B : NUMERICAL VALUE TYPE QUESTIONS (Answer any 5 out of 10: +4, -1, 0)", (380, 1742), cv2.FONT_HERSHEY_DUPLEX, 0.85, (0, 0, 0), 2)

    sec_b_subjects = [
        {"name": "CHEMISTRY (Q21 - Q30)", "subject": "CHEMISTRY", "q_start": 21, "q_end": 30, "x_off": 180},
        {"name": "PHYSICS (Q51 - Q60)", "subject": "PHYSICS", "q_start": 51, "q_end": 60, "x_off": 880},
        {"name": "MATHEMATICS (Q81 - Q90)", "subject": "MATHEMATICS", "q_start": 81, "q_end": 90, "x_off": 1580}
    ]

    for sub in sec_b_subjects:
        x = sub["x_off"]
        cv2.putText(img, sub["name"], (x + 80, 1790), cv2.FONT_HERSHEY_DUPLEX, 0.8, (0, 0, 0), 2)
        cv2.line(img, (x, 1802), (x + 500, 1802), (120, 120, 120), 1)

        # Decide how many to attempt in Section B
        # For sheet 2, force overflow in Chemistry (attempt 7 out of 10) to test NTA First-5 rule!
        attempt_count = 7 if (force_overflow and sub["subject"] == "CHEMISTRY") else 5
        attempts_made = 0

        for q in range(sub["q_start"], sub["q_end"] + 1):
            y = 1845 + (q - sub["q_start"]) * 145
            cv2.rectangle(img, (x + 10, y - 25), (x + 520, y + 105), (200, 200, 200), 1)
            cv2.putText(img, f"Q{q:02d}", (x + 20, y + 15), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)

            key_val = str(round(float((q * 7) % 75 + 10), 1))
            master_key_dict[str(q)] = key_val

            is_att = (attempts_made < attempt_count)
            if is_att:
                attempts_made += 1
                # 80% chance correct
                is_correct = (random.random() < 0.80)
                cand_val = key_val if is_correct else str(round(float(key_val) + 3.0, 1))
            else:
                cand_val = None

            # Draw written box
            cv2.rectangle(img, (x + 110, y - 10), (x + 230, y + 40), (0, 0, 0), 2)
            if cand_val:
                cv2.putText(img, cand_val, (x + 120, y + 26), cv2.FONT_HERSHEY_SIMPLEX, 0.8, pen_col, 2)

            # Draw bubble grid for digits
            for d_col in range(4):
                bx = x + 265 + d_col * 60
                for d_row in range(5): # digits 0-4
                    draw_bubble(img, bx, y - 10 + d_row * 24, 8, label=str(d_row), is_filled=False)

            student_responses[str(q)] = {
                "question_no": q,
                "subject": sub["subject"],
                "numerical_value": cand_val,
                "is_attempted": is_att
            }

    # Save OMR image
    omr_path = os.path.join(OUT_DIR, f"omr_sheet_{sheet_idx:02d}.png")
    cv2.imwrite(omr_path, img)

    # Save Ground Truth JSON
    gt_payload = {
        "sheet_id": f"external_omr_{sheet_idx:02d}",
        "roll_no": roll_no,
        "booklet_code": booklet_code,
        "exam_title": "JEE Main 2025 Jan Session",
        "student_responses": student_responses
    }
    with open(os.path.join(OUT_DIR, f"omr_sheet_{sheet_idx:02d}.json"), "w", encoding="utf-8") as f:
        json.dump(gt_payload, f, indent=2)

    # Save Answer Key in JSON, CSV, and TXT formats
    # 1. JSON
    key_json_path = os.path.join(OUT_DIR, f"answer_key_{sheet_idx:02d}.json")
    with open(key_json_path, "w", encoding="utf-8") as f:
        json.dump(master_key_dict, f, indent=2)

    # 2. CSV
    key_csv_path = os.path.join(OUT_DIR, f"answer_key_{sheet_idx:02d}.csv")
    with open(key_csv_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["Question", "Answer"])
        for q_num in range(1, 91):
            writer.writerow([q_num, master_key_dict[str(q_num)]])

    # 3. TXT
    key_txt_path = os.path.join(OUT_DIR, f"answer_key_{sheet_idx:02d}.txt")
    with open(key_txt_path, "w", encoding="utf-8") as f:
        f.write(f"JEE MAIN 2025 ANSWER KEY - BOOKLET {booklet_code}\n")
        f.write("================================================\n")
        for q_num in range(1, 91):
            f.write(f"Q{q_num:02d}: {master_key_dict[str(q_num)]}\n")

    print(f"[SUCCESS] Generated OMR Sheet {sheet_idx} and Answer Keys in {OUT_DIR}")


def generate_10page_marked_question_paper():
    """
    Constructs a 10-page marked question paper PDF with answers marked on the questions,
    plus an accompanying answer key file.
    """
    pdf_path = os.path.join(OUT_DIR, "marked_question_paper_10pages.pdf")
    doc = fitz.open()

    master_key_dict = {}
    candidate_marks_dict = {}
    random.seed(999)

    for page_idx in range(1, 11):
        page = doc.new_page(width=595, height=842) # A4 points
        # Page header
        page.draw_rect(fitz.Rect(30, 20, 565, 60), color=(0.2, 0.2, 0.2), fill=(0.95, 0.95, 0.95))
        page.insert_text(fitz.Point(40, 42), "JEE (MAIN) 2025 - OFFICIAL EXAMINATION QUESTION PAPER", fontsize=11, fontname="helv", color=(0, 0, 0))
        page.insert_text(fitz.Point(40, 55), f"CANDIDATE COPY • PAGE {page_idx} OF 10 • BOOKLET CODE: SET A", fontsize=8.5, fontname="helv", color=(0.3, 0.3, 0.3))

        # Each page has 9 questions (total 90 questions across 10 pages)
        q_start = (page_idx - 1) * 9 + 1
        q_end = page_idx * 9

        y_offset = 80
        for q in range(q_start, q_end + 1):
            is_numerical = (21 <= q <= 30) or (51 <= q <= 60) or (81 <= q <= 90)
            subj = "Chemistry" if q <= 30 else "Physics" if q <= 60 else "Mathematics"
            
            # Question stem
            page.draw_rect(fitz.Rect(35, y_offset, 560, y_offset + 72), color=(0.85, 0.85, 0.85), fill=(0.99, 0.99, 0.99))
            page.insert_text(fitz.Point(45, y_offset + 16), f"Question {q} ({subj})", fontsize=10, fontname="helv", color=(0.1, 0.1, 0.6))
            
            if not is_numerical:
                page.insert_text(fitz.Point(45, y_offset + 32), f"Consider the standard equilibrium reaction or function for state parameter k_{q}.", fontsize=9, fontname="helv")
                
                # Options
                opts = ["A", "B", "C", "D"]
                correct_opt = random.choice(opts)
                master_key_dict[str(q)] = correct_opt

                # Candidate marks one option: 85% attempt rate
                is_att = random.random() < 0.85
                cand_opt = correct_opt if (is_att and random.random() < 0.75) else random.choice([o for o in opts if o != correct_opt]) if is_att else None
                candidate_marks_dict[str(q)] = cand_opt

                for o_idx, opt in enumerate(opts):
                    ox = 55 + o_idx * 120
                    oy = y_offset + 54
                    page.insert_text(fitz.Point(ox, oy), f"({opt}) Value {opt}_{q}", fontsize=8.5, fontname="helv")
                    
                    # If candidate marked this option, draw a pen circle around it!
                    if cand_opt == opt:
                        page.draw_circle(fitz.Point(ox + 8, oy - 3), 11, color=(0.1, 0.2, 0.7), width=1.5)
                        page.draw_line(fitz.Point(ox - 2, oy + 4), fitz.Point(ox + 18, oy + 4), color=(0.1, 0.2, 0.7), width=1.2)
            else:
                page.insert_text(fitz.Point(45, y_offset + 32), f"Evaluate the integral / rate constant to the nearest single decimal place.", fontsize=9, fontname="helv")
                key_val = str(round(float((q * 5) % 80 + 10), 1))
                master_key_dict[str(q)] = key_val

                # Candidate written answer
                cand_val = key_val if (random.random() < 0.80) else str(round(float(key_val) + 2.0, 1))
                candidate_marks_dict[str(q)] = cand_val
                
                page.insert_text(fitz.Point(55, y_offset + 54), "Candidate Response: [", fontsize=9, fontname="helv")
                page.insert_text(fitz.Point(170, y_offset + 54), f" {cand_val} ", fontsize=10, fontname="helv", color=(0.1, 0.2, 0.7))
                page.insert_text(fitz.Point(220, y_offset + 54), "]", fontsize=9, fontname="helv")

            y_offset += 78

        # Footer
        page.insert_text(fitz.Point(250, 825), f"- Page {page_idx} of 10 -", fontsize=8.5, fontname="helv", color=(0.4, 0.4, 0.4))

    doc.save(pdf_path)
    doc.close()

    # Save Ground truth JSON
    marked_gt = {
        "paper_id": "marked_question_paper_10pages",
        "roll_no": "2403109988",
        "booklet_code": "SET A",
        "total_questions": 90,
        "candidate_marks": candidate_marks_dict
    }
    with open(os.path.join(OUT_DIR, "marked_question_paper_10pages.json"), "w", encoding="utf-8") as f:
        json.dump(marked_gt, f, indent=2)

    # Save Master Answer Key in JSON, CSV, and TXT
    with open(os.path.join(OUT_DIR, "marked_paper_answer_key.json"), "w", encoding="utf-8") as f:
        json.dump(master_key_dict, f, indent=2)

    with open(os.path.join(OUT_DIR, "marked_paper_answer_key.csv"), "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["Question", "Answer"])
        for q in range(1, 91):
            writer.writerow([q, master_key_dict[str(q)]])

    with open(os.path.join(OUT_DIR, "marked_paper_answer_key.txt"), "w", encoding="utf-8") as f:
        f.write("JEE MAIN 2025 10-PAGE QUESTION PAPER MASTER ANSWER KEY\n")
        f.write("====================================================\n")
        for q in range(1, 91):
            f.write(f"Q{q:02d}: {master_key_dict[str(q)]}\n")

    print(f"[SUCCESS] Generated 10-page Marked Question Paper PDF and Answer Keys in {OUT_DIR}")


if __name__ == "__main__":
    generate_omr(1, "2403101155", "SET A", force_overflow=False)
    generate_omr(2, "2403102288", "SET B", force_overflow=True)
    generate_10page_marked_question_paper()
