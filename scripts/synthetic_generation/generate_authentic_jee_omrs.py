import os
import random
import json
import glob
import numpy as np
import cv2

OUT_DIR = r"f:\neira\Dataset\synthetically_generated\jee_main_authentic_omrs"
os.makedirs(OUT_DIR, exist_ok=True)

PEN_COLORS = {
    "blue_ballpoint": (180, 50, 20),
    "black_ballpoint": (25, 25, 25),
    "dark_blue": (145, 35, 12),
    "pencil_gray": (100, 100, 105)
}

def draw_bubble(img, cx, cy, radius, label="", is_filled=False, fill_color=(25,25,25), is_faint=False, is_double=False):
    # Outer ring
    cv2.circle(img, (cx, cy), radius, (70, 70, 70), 2, cv2.LINE_AA)
    if label:
        cv2.putText(img, label, (cx - 5, cy + 5), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (60, 60, 60), 1, cv2.LINE_AA)

    if is_filled:
        col = (175, 175, 180) if is_faint else fill_color
        cv2.circle(img, (cx, cy), radius - 3, col, -1, cv2.LINE_AA)
        if is_double:
            # Draw an X cross-out
            cv2.line(img, (cx - 8, cy - 8), (cx + 8, cy + 8), (0, 0, 180), 2, cv2.LINE_AA)
            cv2.line(img, (cx - 8, cy + 8), (cx + 8, cy - 8), (0, 0, 180), 2, cv2.LINE_AA)

def generate_jee_omr_sheet(sheet_id, test_name):
    # Dimensions: 2400 x 3300 (Standard high-res A4 printable)
    W, H = 2400, 3300
    img = np.full((H, W, 3), 255, dtype=np.uint8)

    # 1. Corner Timing Markers (Fiducials for Perspective Warp / Homography)
    cv2.rectangle(img, (50, 50), (150, 150), (0, 0, 0), -1)
    cv2.rectangle(img, (W - 150, 50), (W - 50, 150), (0, 0, 0), -1)
    cv2.rectangle(img, (50, H - 150), (150, H - 50), (0, 0, 0), -1)
    cv2.rectangle(img, (W - 150, H - 150), (W - 50, H - 50), (0, 0, 0), -1)

    # 2. Header & Candidate Box
    cv2.putText(img, "NATIONAL TESTING AGENCY - JEE (MAIN) EXAMINATION", (420, 105), cv2.FONT_HERSHEY_DUPLEX, 1.3, (0, 0, 0), 2)
    cv2.putText(img, "OFFICIAL OMR ANSWER SHEET", (880, 150), cv2.FONT_HERSHEY_DUPLEX, 1.0, (80, 80, 80), 2)
    cv2.line(img, (180, 175), (W - 180, 175), (50, 50, 50), 2)

    pen_name = random.choice(list(PEN_COLORS.keys()))
    pen_col = PEN_COLORS[pen_name]

    # Candidate Meta Box
    cv2.rectangle(img, (180, 195), (1050, 480), (120, 120, 120), 2)
    cv2.putText(img, "CANDIDATE NAME:", (195, 230), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    candidate_name = random.choice(["AARAV SHARMA", "PRIYA PATEL", "ROHAN VERMA", "ANANYA GUPTA", "KARTIK MEHTA"])
    cv2.putText(img, candidate_name, (430, 230), cv2.FONT_HERSHEY_SIMPLEX, 0.75, pen_col, 2)

    cv2.putText(img, "ROLL NUMBER:", (195, 280), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    roll_no = f"240310{random.randint(10000, 99999)}"
    cv2.putText(img, roll_no, (430, 280), cv2.FONT_HERSHEY_SIMPLEX, 0.75, pen_col, 2)

    cv2.putText(img, "TEST BOOKLET CODE:", (195, 330), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    booklet_code = random.choice(["SET A", "SET B", "SET C", "SET D"])
    cv2.putText(img, booklet_code, (470, 330), cv2.FONT_HERSHEY_DUPLEX, 0.8, (0, 0, 180), 2)

    cv2.putText(img, f"EXAM: {test_name}", (195, 380), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (70, 70, 70), 1)
    cv2.putText(img, "CANDIDATE SIGNATURE:", (195, 440), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 0, 0), 2)
    # Realistic cursive signature
    cv2.putText(img, candidate_name.title().replace(" ", "_"), (470, 440), cv2.FONT_HERSHEY_SCRIPT_SIMPLEX, 0.9, pen_col, 2)

    # Roll Number Bubbling Grid (Top Right)
    cv2.rectangle(img, (1100, 195), (2220, 480), (120, 120, 120), 2)
    cv2.putText(img, "ROLL NUMBER (BUBBLE GRID):", (1120, 230), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    for d_idx, digit in enumerate(roll_no):
        bx = 1140 + d_idx * 95
        cv2.rectangle(img, (bx - 18, 250), (bx + 20, 285), (80, 80, 80), 1)
        cv2.putText(img, digit, (bx - 6, 277), cv2.FONT_HERSHEY_SIMPLEX, 0.7, pen_col, 2)
        # Bubble row 0-9
        d_val = int(digit)
        for val in range(10):
            by = 310 + (val * 16)
            is_filled = (val == d_val)
            draw_bubble(img, bx, by, 7, label="", is_filled=is_filled, fill_color=pen_col)

    # 3. SECTION A: MCQs (Q1 to Q20 per subject) - TOP HALF
    cv2.rectangle(img, (180, 510), (2220, 1720), (80, 80, 80), 2)
    cv2.rectangle(img, (180, 510), (2220, 560), (230, 230, 230), -1)
    cv2.putText(img, "SECTION A : MULTIPLE CHOICE QUESTIONS (Single Correct Choice: +4, -1, 0)", (420, 545), cv2.FONT_HERSHEY_DUPLEX, 0.85, (0, 0, 0), 2)

    subjects = [
        {"name": "PHYSICS", "q_start": 1, "q_end": 20, "x_off": 240},
        {"name": "CHEMISTRY", "q_start": 21, "q_end": 40, "x_off": 920},
        {"name": "MATHEMATICS", "q_start": 41, "q_end": 60, "x_off": 1600}
    ]

    ground_truth = {
        "sheet_id": f"jee_mains_{sheet_id:03d}",
        "candidate": {
            "name": candidate_name,
            "roll_no": roll_no,
            "booklet_code": booklet_code,
            "test_assigned": test_name
        },
        "pen": pen_name,
        "section_a_mcq": {},
        "section_b_numerical": {},
        "summary": {}
    }

    correct_answers_key = {}
    total_score = 0
    correct_count = 0
    incorrect_count = 0
    unattempted_count = 0

    # Draw Section A Columns
    for sub in subjects:
        x = sub["x_off"]
        cv2.putText(img, sub["name"], (x + 120, 605), cv2.FONT_HERSHEY_DUPLEX, 0.9, (0, 0, 0), 2)
        cv2.line(img, (x, 620), (x + 480, 620), (100, 100, 100), 1)

        # Options A, B, C, D header
        for o_i, opt in enumerate(["A", "B", "C", "D"]):
            cv2.putText(img, opt, (x + 180 + o_i * 75, 655), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (60, 60, 60), 2)

        for q in range(sub["q_start"], sub["q_end"] + 1):
            y = 705 + (q - sub["q_start"]) * 49
            cv2.putText(img, f"Q{q:02d}", (x + 20, y + 6), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 0, 0), 2)

            # Master Answer Key for this question
            key_ans = random.choice(["A", "B", "C", "D"])
            correct_answers_key[str(q)] = key_ans

            # Student attempt simulation (85% attempt rate, 70% accuracy)
            is_attempted = random.random() < 0.85
            if is_attempted:
                if random.random() < 0.72:
                    student_ans = key_ans
                else:
                    student_ans = random.choice([o for o in ["A", "B", "C", "D"] if o != key_ans])
            else:
                student_ans = None

            is_double = is_attempted and (random.random() < 0.04)
            is_faint = is_attempted and (random.random() < 0.06)

            for o_i, opt in enumerate(["A", "B", "C", "D"]):
                bx = x + 188 + o_i * 75
                is_filled = (opt == student_ans)
                draw_bubble(img, bx, y, 16, label=opt, is_filled=is_filled, fill_color=pen_col, is_faint=is_faint)

            if is_attempted:
                if student_ans == key_ans:
                    marks = 4
                    correct_count += 1
                else:
                    marks = -1
                    incorrect_count += 1
                total_score += marks
            else:
                marks = 0
                unattempted_count += 1

            ground_truth["section_a_mcq"][str(q)] = {
                "subject": sub["name"],
                "student_marked": student_ans,
                "answer_key": key_ans,
                "marks_awarded": marks
            }

    # 4. SECTION B: NUMERICAL VALUE QUESTIONS - BOTTOM HALF
    # Q61-Q70 (Physics), Q71-Q80 (Chemistry), Q81-Q90 (Maths)
    cv2.rectangle(img, (180, 1760), (2220, 3160), (80, 80, 80), 2)
    cv2.rectangle(img, (180, 1760), (2220, 1810), (230, 230, 230), -1)
    cv2.putText(img, "SECTION B : NUMERICAL VALUE TYPE QUESTIONS (Answer any 5 out of 10: +4, -1, 0)", (360, 1795), cv2.FONT_HERSHEY_DUPLEX, 0.85, (0, 0, 0), 2)

    sec_b_subjects = [
        {"name": "PHYSICS (Q61 - Q70)", "q_start": 61, "q_end": 70, "x_off": 210},
        {"name": "CHEMISTRY (Q71 - Q80)", "q_start": 71, "q_end": 80, "x_off": 890},
        {"name": "MATHEMATICS (Q81 - Q90)", "q_start": 81, "q_end": 90, "x_off": 1570}
    ]

    for sub in sec_b_subjects:
        x_base = sub["x_off"]
        cv2.putText(img, sub["name"], (x_base + 110, 1850), cv2.FONT_HERSHEY_DUPLEX, 0.8, (0, 0, 0), 2)
        cv2.line(img, (x_base, 1865), (x_base + 620, 1865), (100, 100, 100), 1)

        # Decide which questions student attempts (simulating student attempting 5 to 7 questions)
        total_attempts_target = random.choice([5, 5, 5, 6, 7]) # Sometimes 6 or 7 to test first-5 rule!
        attempted_q_nums = sorted(random.sample(range(sub["q_start"], sub["q_end"] + 1), total_attempts_target))
        
        evaluated_in_section = 0

        # Draw 10 numerical questions in 2 columns of 5 questions each
        for idx_in_sub, q in enumerate(range(sub["q_start"], sub["q_end"] + 1)):
            col_idx = idx_in_sub // 5  # 0 or 1
            row_idx = idx_in_sub % 5   # 0 to 4
            
            qx = x_base + col_idx * 315
            qy = 1890 + row_idx * 245

            # Question Header
            cv2.putText(img, f"Q{q:02d}", (qx + 10, qy + 25), cv2.FONT_HERSHEY_DUPLEX, 0.65, (0, 0, 0), 2)

            # Master Numerical Answer
            correct_val = round(random.uniform(2.0, 95.0), 1)
            correct_answers_key[str(q)] = str(correct_val)

            # Write-in Boxes for student: [SIGN] [INT1] [INT2] [ . ] [DEC]
            box_x = qx + 70
            box_y = qy + 5
            
            # Draw digit boxes
            labels = ["+", "-", "0-9", "0-9", ".", "0-9"]
            cv2.rectangle(img, (box_x, box_y), (box_x + 190, box_y + 35), (100, 100, 100), 1)
            for div in [35, 75, 115, 150]:
                cv2.line(img, (box_x + div, box_y), (box_x + div, box_y + 35), (100, 100, 100), 1)
            cv2.circle(img, (box_x + 132, box_y + 24), 3, (0, 0, 0), -1) # Decimal point

            is_att = (q in attempted_q_nums)
            student_val = None
            marks = 0
            is_ignored_overflow = False

            if is_att:
                evaluated_in_section += 1
                if evaluated_in_section > 5:
                    is_ignored_overflow = True # VIOLATES FIRST-5 RULE!

                # Student accuracy on numerical (65%)
                if random.random() < 0.65:
                    student_val = correct_val
                else:
                    student_val = round(random.uniform(1.0, 99.0), 1)

                val_str = f"{student_val:04.1f}" # e.g. 04.2
                # Write in boxes
                cv2.putText(img, "+", (box_x + 10, box_y + 26), cv2.FONT_HERSHEY_SIMPLEX, 0.65, pen_col, 2)
                cv2.putText(img, val_str[0], (box_x + 46, box_y + 26), cv2.FONT_HERSHEY_SIMPLEX, 0.65, pen_col, 2)
                cv2.putText(img, val_str[1], (box_x + 86, box_y + 26), cv2.FONT_HERSHEY_SIMPLEX, 0.65, pen_col, 2)
                cv2.putText(img, val_str[3], (box_x + 162, box_y + 26), cv2.FONT_HERSHEY_SIMPLEX, 0.65, pen_col, 2)

                # Bubbling underneath for digits 0-9
                # Sign bubbles
                draw_bubble(img, box_x + 17, box_y + 55, 9, label="+", is_filled=True, fill_color=pen_col)
                draw_bubble(img, box_x + 17, box_y + 78, 9, label="-", is_filled=False)

                # Int1 bubbles (0-9)
                for d in range(10):
                    by = box_y + 55 + d * 17
                    draw_bubble(img, box_x + 55, by, 7, label="", is_filled=(d == int(val_str[0])), fill_color=pen_col)
                # Int2 bubbles (0-9)
                for d in range(10):
                    by = box_y + 55 + d * 17
                    draw_bubble(img, box_x + 95, by, 7, label="", is_filled=(d == int(val_str[1])), fill_color=pen_col)
                # Dec1 bubbles (0-9)
                for d in range(10):
                    by = box_y + 55 + d * 17
                    draw_bubble(img, box_x + 170, by, 7, label="", is_filled=(d == int(val_str[3])), fill_color=pen_col)

                if is_ignored_overflow:
                    marks = 0 # STRICT FIRST-5 RULE DISQUALIFIES IT!
                elif student_val == correct_val:
                    marks = 4
                    correct_count += 1
                    total_score += 4
                else:
                    marks = -1
                    incorrect_count += 1
                    total_score -= 1
            else:
                unattempted_count += 1
                # Draw empty bubbles
                draw_bubble(img, box_x + 17, box_y + 55, 9, label="+")
                draw_bubble(img, box_x + 17, box_y + 78, 9, label="-")
                for d in range(10):
                    by = box_y + 55 + d * 17
                    draw_bubble(img, box_x + 55, by, 7)
                    draw_bubble(img, box_x + 95, by, 7)
                    draw_bubble(img, box_x + 170, by, 7)

            ground_truth["section_b_numerical"][str(q)] = {
                "subject": sub["name"],
                "student_marked": str(student_val) if student_val is not None else None,
                "answer_key": str(correct_val),
                "is_attempted": is_att,
                "is_ignored_by_first_5_rule": is_ignored_overflow,
                "marks_awarded": marks
            }

    # Final Summary Audit
    ground_truth["summary"] = {
        "total_score": total_score,
        "max_score": 300,
        "correct_answers": correct_count,
        "incorrect_answers": incorrect_count,
        "unattempted": unattempted_count,
        "percentage": round((total_score / 300) * 100, 2)
    }

    # Condition & Real-World Phone Camera Augmentations
    condition = "clean"
    if sheet_id % 3 == 0:
        condition = "skewed_camera"
        ang = random.uniform(-3.5, 3.5)
        M = cv2.getRotationMatrix2D((W//2, H//2), ang, 1.0)
        img = cv2.warpAffine(img, M, (W, H), borderValue=(240, 240, 242))
    elif sheet_id % 4 == 0:
        condition = "phone_shadowed"
        shadow = np.tile(np.linspace(0.60, 1.0, W), (H, 1))
        shadow = cv2.merge([shadow, shadow, shadow])
        img = np.clip(img.astype(np.float32) * shadow, 0, 255).astype(np.uint8)

    ground_truth["condition"] = condition

    out_img = os.path.join(OUT_DIR, f"jee_main_omr_{sheet_id:03d}.png")
    out_json = os.path.join(OUT_DIR, f"jee_main_omr_{sheet_id:03d}.json")

    cv2.imwrite(out_img, img)
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(ground_truth, f, indent=2)

    print(f"  [OMR {sheet_id:02d}] {os.path.basename(out_img)} | Candidate: {candidate_name} | Score: {total_score}/300 | Cond: {condition}")

def main():
    print("=== Generating Authentic JEE Main OMR Sheets (MCQs + Bottom Numerical Grids) ===")
    tests = [
        "JEE_Main_2025_Jan_22_Shift1",
        "JEE_Main_2025_Apr_02_Shift2",
        "JEE_Main_2024_Jan_27_Shift1",
        "JEE_Main_2024_Jan_30_Shift2",
        "JEE_Main_2024_Apr_08_Shift1"
    ]
    for i in range(1, 31):
        test_assigned = random.choice(tests)
        generate_jee_omr_sheet(i, test_assigned)
    print("\n[SUCCESS] Generated 30 Authentic JEE Main OMR Sheets with Section B Numerical Grids!")

if __name__ == "__main__":
    main()
