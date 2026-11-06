"""
Generation Script: Authentic JEE Advanced OMR Benchmark Dataset.

Synthesizes high-fidelity JEE Advanced examination sheets and master answer keys:
- 51 questions total across 3 subjects:
    * Physics: Q01 - Q17
    * Chemistry: Q18 - Q34
    * Mathematics: Q35 - Q51
- Three sections per subject:
    * Section 1: Single Correct Choice (SCQ: +3, -1, 0) - Q1-Q6, Q18-Q23, Q35-Q40
    * Section 2: One or More than One Correct (Multi-Correct: +4, partial +3/+2/+1, -2, 0) - Q7-Q12, Q24-Q29, Q41-Q46
    * Section 3: Numerical Value with Bubble Grid (+3, 0, 0) - Q13-Q17, Q30-Q34, Q47-Q51
- Features candidate roll number grid (7 digits), corner fiducial markers, and realistic optical marks.
- Sheet 02 contains an explicit unbubbled numerical (written in box without bubbles) to verify 0-mark penalty.
"""

import os
import json
import csv
import random
import numpy as np
import cv2

OUT_DIR = r"f:\neira\Dataset\jee_advanced"
os.makedirs(OUT_DIR, exist_ok=True)

def draw_bubble(img, cx, cy, radius, label="", is_filled=False, fill_color=(25, 25, 25), is_faint=False):
    # Base circle outline
    cv2.circle(img, (cx, cy), radius, (70, 70, 70), 1, cv2.LINE_AA)
    if label:
        cv2.putText(img, label, (cx - 4, cy + 4), cv2.FONT_HERSHEY_SIMPLEX, 0.34, (60, 60, 60), 1, cv2.LINE_AA)
    if is_filled:
        col = (160, 160, 165) if is_faint else fill_color
        cv2.circle(img, (cx, cy), radius - 2, col, -1, cv2.LINE_AA)

def generate_jee_advanced_omr(
    sheet_idx: int,
    candidate_roll: str = "7410293",
    has_unbubbled_numerical_test: bool = False
):
    W, H = 2400, 3300
    img = np.full((H, W, 3), 255, dtype=np.uint8)

    # 1. Corner Timing Fiducial Markers
    cv2.rectangle(img, (50, 50), (140, 140), (0, 0, 0), -1)
    cv2.rectangle(img, (W - 140, 50), (W - 50, 140), (0, 0, 0), -1)
    cv2.rectangle(img, (50, H - 140), (140, H - 50), (0, 0, 0), -1)
    cv2.rectangle(img, (W - 140, H - 140), (W - 50, H - 50), (0, 0, 0), -1)

    # 2. Header
    cv2.putText(img, "INDIAN INSTITUTES OF TECHNOLOGY - JEE (ADVANCED) EXAMINATION", (340, 95), cv2.FONT_HERSHEY_DUPLEX, 1.1, (0, 0, 0), 2)
    cv2.putText(img, "OPTICAL RESPONSE SHEET (OMR) - PAPER 1", (780, 145), cv2.FONT_HERSHEY_DUPLEX, 0.9, (40, 40, 40), 2)
    cv2.line(img, (150, 175), (W - 150, 175), (0, 0, 0), 2)

    # 3. Candidate Roll Number Grid (7 digits)
    roll_start_x = 220
    roll_start_y = 215
    cv2.rectangle(img, (150, 200), (1150, 430), (80, 80, 80), 1)
    cv2.putText(img, "CANDIDATE ROLL NUMBER", (170, 230), cv2.FONT_HERSHEY_DUPLEX, 0.7, (0, 0, 0), 2)

    for col_idx in range(7):
        rx = roll_start_x + col_idx * 125
        d_val = int(candidate_roll[col_idx])
        # Box for digit
        cv2.rectangle(img, (rx - 15, roll_start_y + 30), (rx + 25, roll_start_y + 70), (0, 0, 0), 1)
        cv2.putText(img, str(d_val), (rx - 4, roll_start_y + 60), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (20, 20, 20), 2)

        # Bubbles 0 to 9 in two compact rows of 5
        for b_i in range(10):
            bx = rx - 5 + (b_i % 5) * 22
            by = roll_start_y + 90 + (b_i // 5) * 35
            draw_bubble(img, bx, by, 8, label=str(b_i), is_filled=(b_i == d_val))

    # Exam Info Box
    cv2.rectangle(img, (1250, 200), (2250, 430), (80, 80, 80), 1)
    cv2.putText(img, "EXAMINATION INSTRUCTIONS", (1280, 235), cv2.FONT_HERSHEY_DUPLEX, 0.75, (0, 0, 0), 2)
    cv2.putText(img, "* Section 1: Single Choice (+3, -1, 0)", (1280, 275), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (50, 50, 50), 1)
    cv2.putText(img, "* Section 2: One or More Than One Option Correct (+4, Partial, -2, 0)", (1280, 315), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (50, 50, 50), 1)
    cv2.putText(img, "* Section 3: Numerical Value (+3, 0, 0) - MUST DARKEN BUBBLES", (1280, 355), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 180), 2)
    cv2.putText(img, "* Darkening of bubble is MANDATORY. Written values without bubbles = 0", (1280, 395), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (180, 0, 0), 2)

    # 4. Generate 51 Questions (3 Subjects x 17 Questions)
    subjects = [
        {"name": "PHYSICS", "start": 1, "end": 17, "x_off": 150},
        {"name": "CHEMISTRY", "start": 18, "end": 34, "x_off": 870},
        {"name": "MATHEMATICS", "start": 35, "end": 51, "x_off": 1590}
    ]

    master_key_data = {}
    student_responses = {}
    ground_truth = {
        "exam_type": "JEE_ADVANCED",
        "sheet_id": f"jee_advanced_omr_{sheet_idx:02d}",
        "roll_number": candidate_roll,
        "questions": {}
    }

    random.seed(42 + sheet_idx * 13)

    for subj_info in subjects:
        s_name = subj_info["name"]
        sx = subj_info["x_off"]
        # Column boundary
        cv2.rectangle(img, (sx, 460), (sx + 660, 3200), (70, 70, 70), 2)
        cv2.rectangle(img, (sx, 460), (sx + 660, 510), (225, 235, 245), -1)
        cv2.putText(img, f"PART: {s_name}", (sx + 160, 495), cv2.FONT_HERSHEY_DUPLEX, 0.85, (0, 0, 0), 2)

        for q_num in range(subj_info["start"], subj_info["end"] + 1):
            rel_idx = q_num - subj_info["start"] # 0 to 16
            
            # Sub-sections:
            # 0 to 5: Single Choice (SCQ)
            # 6 to 11: Multi-Correct (MULTI_MCQ)
            # 12 to 16: Numerical (NUMERICAL)
            qy = 530 + rel_idx * 155

            if rel_idx == 0:
                cv2.rectangle(img, (sx, qy), (sx + 660, qy + 25), (240, 240, 240), -1)
                cv2.putText(img, "SEC 1: SINGLE CORRECT (+3, -1)", (sx + 120, qy + 18), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 0, 0), 1)
            elif rel_idx == 6:
                cv2.rectangle(img, (sx, qy), (sx + 660, qy + 25), (240, 240, 240), -1)
                cv2.putText(img, "SEC 2: MULTI-CORRECT (+4, PARTIAL, -2)", (sx + 80, qy + 18), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 0, 0), 1)
            elif rel_idx == 12:
                cv2.rectangle(img, (sx, qy), (sx + 660, qy + 25), (240, 240, 240), -1)
                cv2.putText(img, "SEC 3: NUMERICAL (+3, 0) [DARKEN BUBBLES]", (sx + 60, qy + 18), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 0, 150), 1)

            qy_row = qy + 35
            cv2.line(img, (sx + 10, qy_row + 110), (sx + 650, qy_row + 110), (220, 220, 220), 1)
            cv2.putText(img, f"Q{q_num:02d}", (sx + 20, qy_row + 45), cv2.FONT_HERSHEY_DUPLEX, 0.7, (0, 0, 0), 2)

            if rel_idx < 6:
                # --- SINGLE CHOICE MCQ ---
                key_choice = random.choice(["A", "B", "C", "D"])
                master_key_data[q_num] = key_choice

                # Student attempt
                student_choice = key_choice if random.random() < 0.80 else random.choice(["A", "B", "C", "D"])
                if random.random() < 0.10:
                    student_choice = None # unattempted

                student_responses[q_num] = student_choice

                # Draw options A B C D
                for o_i, opt in enumerate(["A", "B", "C", "D"]):
                    bx = sx + 180 + o_i * 110
                    by = qy_row + 40
                    draw_bubble(img, bx, by, 16, label=opt, is_filled=(opt == student_choice))

                ground_truth["questions"][str(q_num)] = {
                    "type": "MCQ",
                    "subject": s_name,
                    "key": key_choice,
                    "student": student_choice
                }

            elif 6 <= rel_idx < 12:
                # --- MULTI-CORRECT MCQ ---
                k_opts = sorted(random.sample(["A", "B", "C", "D"], random.choice([2, 3])))
                master_key_data[q_num] = ",".join(k_opts)

                # Student attempt
                if has_unbubbled_numerical_test and q_num == 7:
                    # Partial test: student marks only 1 correct
                    s_opts = [k_opts[0]]
                elif has_unbubbled_numerical_test and q_num == 8:
                    # Full correct
                    s_opts = list(k_opts)
                elif has_unbubbled_numerical_test and q_num == 9:
                    # Penalized: student marks a wrong option
                    wrong = [x for x in ["A", "B", "C", "D"] if x not in k_opts]
                    s_opts = [k_opts[0], wrong[0]]
                else:
                    s_opts = list(k_opts) if random.random() < 0.70 else sorted(random.sample(["A", "B", "C", "D"], random.choice([1, 2])))

                student_responses[q_num] = ",".join(s_opts) if s_opts else None

                # Draw options A B C D
                for o_i, opt in enumerate(["A", "B", "C", "D"]):
                    bx = sx + 180 + o_i * 110
                    by = qy_row + 40
                    draw_bubble(img, bx, by, 16, label=opt, is_filled=(opt in s_opts))

                ground_truth["questions"][str(q_num)] = {
                    "type": "MULTI_MCQ",
                    "subject": s_name,
                    "key": k_opts,
                    "student": s_opts
                }

            else:
                # --- NUMERICAL VALUE WITH BUBBLES ---
                key_num = random.randint(10, 95)
                master_key_data[q_num] = str(key_num)

                student_num = key_num if random.random() < 0.75 else random.randint(10, 95)
                d_tens = student_num // 10
                d_units = student_num % 10

                # Top written boxes
                bx_tens = sx + 220
                bx_units = sx + 360
                by_box = qy_row + 10

                cv2.rectangle(img, (bx_tens - 20, by_box), (bx_tens + 30, by_box + 40), (0, 0, 0), 1)
                cv2.rectangle(img, (bx_units - 20, by_box), (bx_units + 30, by_box + 40), (0, 0, 0), 1)

                # Special test case for unbubbled numerical bug
                is_unbubbled_bug_case = has_unbubbled_numerical_test and (q_num == 13)

                if is_unbubbled_bug_case:
                    # Candidate writes 42 in the boxes BUT DOES NOT BUBBLE!
                    cv2.putText(img, "4", (bx_tens - 6, by_box + 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (20, 20, 20), 2)
                    cv2.putText(img, "2", (bx_units - 6, by_box + 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (20, 20, 20), 2)
                    bubbled_tens = None
                    bubbled_units = None
                    student_responses[q_num] = None # invalid attempt
                else:
                    # Normal candidate: writes and bubbles
                    cv2.putText(img, str(d_tens), (bx_tens - 6, by_box + 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (20, 20, 20), 2)
                    cv2.putText(img, str(d_units), (bx_units - 6, by_box + 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (20, 20, 20), 2)
                    bubbled_tens = d_tens
                    bubbled_units = d_units
                    student_responses[q_num] = str(student_num)

                # Draw 0-9 bubbles for tens and units in compact 2 rows
                for d in range(10):
                    # Tens column bubbles
                    bx_t = bx_tens - 15 + (d % 5) * 20
                    by_t = by_box + 55 + (d // 5) * 25
                    draw_bubble(img, bx_t, by_t, 7, label=str(d), is_filled=(bubbled_tens is not None and d == bubbled_tens))

                    # Units column bubbles
                    bx_u = bx_units - 15 + (d % 5) * 20
                    by_u = by_box + 55 + (d // 5) * 25
                    draw_bubble(img, bx_u, by_u, 7, label=str(d), is_filled=(bubbled_units is not None and d == bubbled_units))

                ground_truth["questions"][str(q_num)] = {
                    "type": "NUMERICAL",
                    "subject": s_name,
                    "key": key_num,
                    "written_in_box": f"{d_tens}{d_units}",
                    "bubbled": f"{bubbled_tens}{bubbled_units}" if bubbled_tens is not None else None,
                    "is_unbubbled": is_unbubbled_bug_case
                }

    # Save PNG Image
    img_path = os.path.join(OUT_DIR, f"jee_advanced_omr_{sheet_idx:02d}.png")
    cv2.imwrite(img_path, img)

    # Save Ground Truth JSON
    json_path = os.path.join(OUT_DIR, f"jee_advanced_omr_{sheet_idx:02d}.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(ground_truth, f, indent=2)

    # Save Master Answer Key (CSV)
    csv_path = os.path.join(OUT_DIR, f"jee_advanced_answer_key_{sheet_idx:02d}.csv")
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["Question", "CorrectAnswer"])
        for q in range(1, 52):
            writer.writerow([q, master_key_data.get(q, "A")])

    # Save Master Answer Key (JSON)
    key_json_path = os.path.join(OUT_DIR, f"jee_advanced_answer_key_{sheet_idx:02d}.json")
    with open(key_json_path, "w", encoding="utf-8") as f:
        json.dump({str(q): master_key_data.get(q, "A") for q in range(1, 52)}, f, indent=2)

    # Save Master Answer Key (TXT)
    txt_path = os.path.join(OUT_DIR, f"jee_advanced_answer_key_{sheet_idx:02d}.txt")
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write("# JEE ADVANCED MASTER ANSWER KEY - 51 QUESTIONS\n")
        for q in range(1, 52):
            f.write(f"Q{q:02d}: {master_key_data.get(q, 'A')}\n")

    print(f"[Generated] {img_path}")
    print(f"[Generated] {csv_path}")
    print(f"[Generated] {json_path}")

if __name__ == "__main__":
    # Sheet 1: Standard high-scoring attempt across all 51 questions
    generate_jee_advanced_omr(1, candidate_roll="7410293", has_unbubbled_numerical_test=False)
    # Sheet 2: Partial marking stress test & explicit unbubbled numerical bug test
    generate_jee_advanced_omr(2, candidate_roll="8521304", has_unbubbled_numerical_test=True)
