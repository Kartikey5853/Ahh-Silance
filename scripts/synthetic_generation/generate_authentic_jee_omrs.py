import os
import random
import json
import numpy as np
import cv2

OUT_DIR = r"f:\neira\Dataset\synthetically_generated\jee_main_authentic_omrs"
os.makedirs(OUT_DIR, exist_ok=True)

PEN_COLORS = {
    "blue_ballpoint": (185, 45, 15),
    "black_ballpoint": (25, 25, 25),
    "dark_blue": (140, 30, 10),
    "pencil_gray": (100, 100, 105),
    "faint_pencil": (135, 135, 140)
}

def draw_bubble(img, cx, cy, radius, label="", is_filled=False, fill_color=(25,25,25), is_faint=False, is_double=False, jitter=True):
    if jitter and is_filled:
        cx += random.randint(-1, 1)
        cy += random.randint(-1, 1)

    # Base circle outline
    cv2.circle(img, (cx, cy), radius, (80, 80, 80), 1, cv2.LINE_AA)
    if label:
        cv2.putText(img, label, (cx - 4, cy + 4), cv2.FONT_HERSHEY_SIMPLEX, 0.34, (70, 70, 70), 1, cv2.LINE_AA)

    if is_filled:
        col = (175, 175, 180) if is_faint else fill_color
        cv2.circle(img, (cx, cy), radius - 2, col, -1, cv2.LINE_AA)
        if is_double:
            cv2.line(img, (cx - 6, cy - 6), (cx + 6, cy + 6), (0, 0, 180), 2, cv2.LINE_AA)
            cv2.line(img, (cx - 6, cy + 6), (cx + 6, cy - 6), (0, 0, 180), 2, cv2.LINE_AA)

def apply_real_life_distortions(img, condition_type="wild_mobile"):
    H, W = img.shape[:2]
    
    # 1. Perspective Keystoning (Camera angle tilt)
    max_shift = random.randint(35, 75)
    pts1 = np.float32([[0, 0], [W, 0], [0, H], [W, H]])
    pts2 = np.float32([
        [random.randint(0, max_shift), random.randint(0, max_shift)],
        [W - random.randint(0, max_shift), random.randint(0, max_shift)],
        [random.randint(0, max_shift), H - random.randint(0, max_shift)],
        [W - random.randint(0, max_shift), H - random.randint(0, max_shift)]
    ])
    M_persp = cv2.getPerspectiveTransform(pts1, pts2)
    # Background desk color (slightly off-white / wooden tint border)
    bg_color = (235, 232, 228)
    img = cv2.warpPerspective(img, M_persp, (W, H), borderValue=bg_color)

    # 2. Paper Fold Crease Line (Horizontal fold in middle)
    if random.random() < 0.65:
        fold_y = random.randint(int(H * 0.42), int(H * 0.58))
        for y in range(max(0, fold_y - 18), min(H, fold_y + 18)):
            dist = abs(y - fold_y)
            factor = 1.0 - 0.14 * np.exp(-(dist**2) / 28.0)
            img[y, :] = np.clip(img[y, :].astype(np.float32) * factor, 0, 255).astype(np.uint8)

    # 3. Overhead Phone & Body Shadow Gradient
    shadow_style = random.choice(["top_left_to_bottom", "diagonal_corner", "radial_hand"])
    if shadow_style == "top_left_to_bottom":
        grad = np.tile(np.linspace(0.65, 1.0, W), (H, 1))
        shadow = cv2.merge([grad, grad, grad])
        img = np.clip(img.astype(np.float32) * shadow, 0, 255).astype(np.uint8)
    elif shadow_style == "diagonal_corner":
        x_g = np.linspace(0, 1, W)
        y_g = np.linspace(0, 1, H)
        xx, yy = np.meshgrid(x_g, y_g)
        diag = 0.62 + 0.38 * (xx * 0.5 + yy * 0.5)
        shadow = cv2.merge([diag, diag, diag])
        img = np.clip(img.astype(np.float32) * shadow, 0, 255).astype(np.uint8)

    # 4. Ambient Paper Warmth & Sensor Grain Noise
    # Warm indoor lighting tint (slight yellow/warm cast)
    warmth = np.array([0.96, 0.99, 1.02]) # slight BGR adjustment
    img = np.clip(img.astype(np.float32) * warmth, 0, 255).astype(np.uint8)
    
    # Gaussian camera sensor noise
    noise = np.random.normal(0, 2.2, img.shape).astype(np.float32)
    img = np.clip(img.astype(np.float32) + noise, 0, 255).astype(np.uint8)

    # Subtle optical defocus blur
    if random.random() < 0.45:
        img = cv2.GaussianBlur(img, (3, 3), 0.5)

    return img

def generate_jee_main_omr(sheet_idx, test_meta, is_wild=True):
    W, H = 2400, 3300
    img = np.full((H, W, 3), 255, dtype=np.uint8)

    # 1. Corner Timing Markers (Fiducials)
    cv2.rectangle(img, (50, 50), (140, 140), (0, 0, 0), -1)
    cv2.rectangle(img, (W - 140, 50), (W - 50, 140), (0, 0, 0), -1)
    cv2.rectangle(img, (50, H - 140), (140, H - 50), (0, 0, 0), -1)
    cv2.rectangle(img, (W - 140, H - 140), (W - 50, H - 50), (0, 0, 0), -1)

    # 2. Header
    cv2.putText(img, "NATIONAL TESTING AGENCY - JEE (MAIN) EXAMINATION", (500, 85), cv2.FONT_HERSHEY_DUPLEX, 1.05, (0, 0, 0), 2)
    cv2.putText(img, "OFFICIAL OMR ANSWER SHEET", (880, 130), cv2.FONT_HERSHEY_DUPLEX, 1.0, (70, 70, 70), 2)
    cv2.line(img, (150, 155), (W - 150, 155), (60, 60, 60), 2)

    pen_name = random.choice(list(PEN_COLORS.keys()))
    pen_col = PEN_COLORS[pen_name]

    # Candidate Info (Left: x = 150 to 1050)
    cv2.rectangle(img, (150, 175), (1050, 480), (100, 100, 100), 2)
    candidate_name = test_meta["candidate_name"]
    cv2.putText(img, "CANDIDATE NAME:", (170, 215), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    cv2.putText(img, candidate_name, (420, 215), cv2.FONT_HERSHEY_SIMPLEX, 0.75, pen_col, 2)

    roll_no = test_meta["roll_no"]
    cv2.putText(img, "APPLICATION NO:", (170, 265), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    cv2.putText(img, roll_no, (420, 265), cv2.FONT_HERSHEY_SIMPLEX, 0.75, pen_col, 2)

    booklet_code = test_meta["booklet_code"]
    cv2.putText(img, "TEST BOOKLET CODE:", (170, 315), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    for b_i, b_code in enumerate(["A", "B", "C", "D"]):
        bx = 470 + b_i * 90
        is_sel = (b_code == booklet_code)
        draw_bubble(img, bx, 310, 14, label=b_code, is_filled=is_sel, fill_color=pen_col)

    cv2.putText(img, f"EXAM: {test_meta['exam_name']}", (170, 375), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (70, 70, 70), 1)
    cv2.putText(img, "CANDIDATE SIGNATURE:", (170, 435), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 0, 0), 2)
    cv2.putText(img, candidate_name.title().replace(" ", "_"), (470, 435), cv2.FONT_HERSHEY_SCRIPT_SIMPLEX, 0.9, pen_col, 2)

    # Roll Number Matrix (Right: x = 1080 to 2250)
    cv2.rectangle(img, (1080, 175), (2250, 480), (100, 100, 100), 2)
    cv2.putText(img, "ROLL NUMBER (WRITE IN BOX AND DARKEN CORRESPONDING BUBBLE)", (1100, 205), cv2.FONT_HERSHEY_SIMPLEX, 0.58, (0, 0, 0), 2)

    roll_audit = []
    has_roll_mistake = (random.random() < 0.12)
    mistake_col = random.randint(3, 8) if has_roll_mistake else -1

    for d_idx, digit in enumerate(roll_no):
        rx = 1135 + d_idx * 105
        # Top write-in box
        cv2.rectangle(img, (rx - 18, 220), (rx + 18, 255), (60, 60, 60), 1)
        cv2.putText(img, digit, (rx - 6, 247), cv2.FONT_HERSHEY_SIMPLEX, 0.72, pen_col, 2)

        d_val = int(digit)
        bubbled_val = d_val
        if has_roll_mistake and d_idx == mistake_col:
            bubbled_val = (d_val + 1) % 10

        # Bubble column 0 to 9
        for val in range(10):
            by = 280 + val * 19
            is_filled = (val == bubbled_val)
            draw_bubble(img, rx, by, 7, label=str(val), is_filled=is_filled, fill_color=pen_col)

        roll_audit.append({
            "column": d_idx + 1,
            "written_digit": digit,
            "bubbled_digit": bubbled_val,
            "is_matched": (d_val == bubbled_val)
        })

    ground_truth = {
        "sheet_id": f"jee_mains_{sheet_idx:02d}",
        "test_metadata": test_meta,
        "pen_color": pen_name,
        "real_life_condition": "wild_handheld_mobile" if is_wild else "clean_scan",
        "has_perspective_keystoning": is_wild,
        "has_phone_shadow": is_wild,
        "has_paper_fold": is_wild,
        "roll_number_audit": roll_audit,
        "has_roll_number_mistake": has_roll_mistake,
        "section_a_mcq": {},
        "section_b_numerical": {},
        "score_summary": {}
    }

    total_score = 0
    correct_cnt = 0
    incorrect_cnt = 0
    unattempted_cnt = 0

    # 3. SECTION A: MCQs (Q01-Q20: Chem, Q31-Q50: Physics, Q61-Q80: Math)
    cv2.rectangle(img, (150, 500), (2250, 1680), (60, 60, 60), 2)
    cv2.rectangle(img, (150, 500), (2250, 545), (235, 235, 235), -1)
    cv2.putText(img, "SECTION A : MULTIPLE CHOICE QUESTIONS (Single Correct Choice: +4, -1, 0)", (420, 532), cv2.FONT_HERSHEY_DUPLEX, 0.85, (0, 0, 0), 2)

    sec_a_subjects = [
        {"name": "CHEMISTRY (Q01 - Q20)", "subject": "CHEMISTRY", "q_start": 1, "q_end": 20, "x_off": 210},
        {"name": "PHYSICS (Q31 - Q50)", "subject": "PHYSICS", "q_start": 31, "q_end": 50, "x_off": 910},
        {"name": "MATHEMATICS (Q61 - Q80)", "subject": "MATHEMATICS", "q_start": 61, "q_end": 80, "x_off": 1610}
    ]

    for sub in sec_a_subjects:
        x = sub["x_off"]
        cv2.putText(img, sub["name"], (x + 90, 585), cv2.FONT_HERSHEY_DUPLEX, 0.8, (0, 0, 0), 2)
        cv2.line(img, (x, 598), (x + 480, 598), (120, 120, 120), 1)

        # Headers A B C D
        for o_i, opt in enumerate(["A", "B", "C", "D"]):
            cv2.putText(img, opt, (x + 180 + o_i * 75, 630), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (60, 60, 60), 2)

        for q in range(sub["q_start"], sub["q_end"] + 1):
            y = 675 + (q - sub["q_start"]) * 48
            cv2.putText(img, f"Q{q:02d}", (x + 20, y + 6), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 0, 0), 2)

            key_ans = random.choice(["A", "B", "C", "D"])
            is_att = (random.random() < 0.85)
            if is_att:
                student_ans = key_ans if (random.random() < 0.70) else random.choice([o for o in ["A", "B", "C", "D"] if o != key_ans])
            else:
                student_ans = None

            is_double = is_att and (random.random() < 0.04)
            is_faint = is_att and (random.random() < 0.06)

            for o_i, opt in enumerate(["A", "B", "C", "D"]):
                bx = x + 188 + o_i * 75
                draw_bubble(img, bx, y, 16, label=opt, is_filled=(opt == student_ans), fill_color=pen_col, is_faint=is_faint, is_double=(is_double and opt == student_ans))

            if is_att:
                if is_double:
                    marks = -1
                    incorrect_cnt += 1
                elif student_ans == key_ans:
                    marks = 4
                    correct_cnt += 1
                else:
                    marks = -1
                    incorrect_cnt += 1
                total_score += marks
            else:
                marks = 0
                unattempted_cnt += 1

            ground_truth["section_a_mcq"][str(q)] = {
                "subject": sub["subject"],
                "student_marked": student_ans,
                "answer_key": key_ans,
                "is_double_marked": is_double,
                "is_faint": is_faint,
                "marks_awarded": marks
            }

    # 4. SECTION B: NUMERICAL VALUE QUESTIONS (Q21-Q30: Chem, Q51-Q60: Physics, Q81-Q90: Math)
    cv2.rectangle(img, (150, 1710), (2250, 3180), (60, 60, 60), 2)
    cv2.rectangle(img, (150, 1710), (2250, 1755), (235, 235, 235), -1)
    cv2.putText(img, "SECTION B : NUMERICAL VALUE TYPE QUESTIONS (Answer any 5 out of 10 per subject: +4, -1, 0)", (360, 1742), cv2.FONT_HERSHEY_DUPLEX, 0.85, (0, 0, 0), 2)

    sec_b_subjects = [
        {"name": "CHEMISTRY (Q21 - Q30)", "subject": "CHEMISTRY", "q_start": 21, "q_end": 30, "x_off": 180},
        {"name": "PHYSICS (Q51 - Q60)", "subject": "PHYSICS", "q_start": 51, "q_end": 60, "x_off": 880},
        {"name": "MATHEMATICS (Q81 - Q90)", "subject": "MATHEMATICS", "q_start": 81, "q_end": 90, "x_off": 1580}
    ]

    for sub in sec_b_subjects:
        x_base = sub["x_off"]
        cv2.putText(img, sub["name"], (x_base + 140, 1795), cv2.FONT_HERSHEY_DUPLEX, 0.78, (0, 0, 0), 2)
        cv2.line(img, (x_base, 1808), (x_base + 640, 1808), (120, 120, 120), 1)

        # Decide attempt count (5 to 7 to test first-5 rule)
        attempt_count = random.choice([5, 5, 5, 6, 7])
        attempted_qs = sorted(random.sample(range(sub["q_start"], sub["q_end"] + 1), attempt_count))
        
        evaluated_in_section = 0

        # Draw 10 questions in 2 sub-columns of 5 questions each
        for q_idx_sub, q in enumerate(range(sub["q_start"], sub["q_end"] + 1)):
            col_in_sub = q_idx_sub // 5
            row_in_sub = q_idx_sub % 5

            qx = x_base + col_in_sub * 325
            qy = 1830 + row_in_sub * 265

            cv2.rectangle(img, (qx, qy), (qx + 315, qy + 255), (200, 200, 200), 1)
            cv2.putText(img, f"Q{q:02d}", (qx + 10, qy + 24), cv2.FONT_HERSHEY_DUPLEX, 0.65, (0, 0, 0), 2)

            correct_num = round(random.uniform(2.0, 95.0), 1)
            correct_str = f"{correct_num:04.1f}"

            is_att = (q in attempted_qs)
            
            # Digits: Tens (col 0), Units (col 1), Tenths (col 2) with fixed decimal point
            col_x = [qx + 95, qx + 165, qx + 250]
            box_y = qy + 10
            
            # Top Write-in Boxes
            cv2.rectangle(img, (col_x[0] - 18, box_y), (col_x[0] + 18, box_y + 30), (80, 80, 80), 1)
            cv2.rectangle(img, (col_x[1] - 18, box_y), (col_x[1] + 18, box_y + 30), (80, 80, 80), 1)
            # Fixed pre-printed decimal point
            cv2.circle(img, (qx + 208, box_y + 22), 4, (0, 0, 0), -1)
            cv2.rectangle(img, (col_x[2] - 18, box_y), (col_x[2] + 18, box_y + 30), (80, 80, 80), 1)

            student_num_str = None
            bubbled_digits = [None, None, None]
            written_digits = [None, None, None]
            mistake_type = "NONE"
            marks = 0
            is_ignored_overflow = False

            if is_att:
                evaluated_in_section += 1
                if evaluated_in_section > 5:
                    is_ignored_overflow = True # FIRST-5 OVERFLOW!

                if random.random() < 0.65:
                    student_num_str = correct_str
                else:
                    student_num_str = f"{random.uniform(1.0, 99.0):04.1f}"

                d0 = int(student_num_str[0])
                d1 = int(student_num_str[1])
                d2 = int(student_num_str[3])
                written_digits = [d0, d1, d2]
                bubbled_digits = [d0, d1, d2]

                # Realistic mistakes on ~15% of attempts in wild mode
                if random.random() < 0.15:
                    error_choice = random.choice(["MISMATCH", "FORGOT_BUBBLE", "FORGOT_WRITE", "DOUBLE_BUBBLE"])
                    if error_choice == "MISMATCH":
                        mistake_type = "DIGIT_BUBBLE_MISMATCH"
                        bubbled_digits[1] = (d1 + 1) % 10
                    elif error_choice == "FORGOT_BUBBLE":
                        mistake_type = "MISSING_BUBBLE"
                        bubbled_digits[2] = None
                    elif error_choice == "FORGOT_WRITE":
                        mistake_type = "MISSING_WRITTEN_BOX"
                        written_digits[0] = None
                    elif error_choice == "DOUBLE_BUBBLE":
                        mistake_type = "DOUBLE_BUBBLE_IN_COLUMN"

                # Draw Written Digits in top boxes
                for c_i, w_val in enumerate(written_digits):
                    if w_val is not None:
                        cv2.putText(img, str(w_val), (col_x[c_i] - 6, box_y + 23), cv2.FONT_HERSHEY_SIMPLEX, 0.72, pen_col, 2)

                # Draw Bubbles 0-9 Underneath
                for c_i, bx in enumerate(col_x):
                    b_target = bubbled_digits[c_i]
                    for d in range(10):
                        by = box_y + 48 + d * 18
                        is_filled = (b_target is not None and d == b_target)
                        if mistake_type == "DOUBLE_BUBBLE_IN_COLUMN" and c_i == 0 and d == (d0 + 1) % 10:
                            is_filled = True
                        draw_bubble(img, bx, by, 7, label=str(d), is_filled=is_filled, fill_color=pen_col)

                # Score Calculation with First-5 rule & mismatch penalty
                if is_ignored_overflow:
                    marks = 0
                elif mistake_type in ["DIGIT_BUBBLE_MISMATCH", "DOUBLE_BUBBLE_IN_COLUMN"]:
                    marks = -1
                    incorrect_cnt += 1
                    total_score -= 1
                elif student_num_str == correct_str and mistake_type == "NONE":
                    marks = 4
                    correct_cnt += 1
                    total_score += 4
                else:
                    marks = -1
                    incorrect_cnt += 1
                    total_score -= 1
            else:
                unattempted_cnt += 1
                for bx in col_x:
                    for d in range(10):
                        by = box_y + 48 + d * 18
                        draw_bubble(img, bx, by, 7, label=str(d), is_filled=False)

            ground_truth["section_b_numerical"][str(q)] = {
                "subject": sub["subject"],
                "is_attempted": is_att,
                "written_value": student_num_str if is_att else None,
                "written_digits": written_digits,
                "bubbled_digits": bubbled_digits,
                "has_discrepancy": (mistake_type != "NONE"),
                "discrepancy_type": mistake_type,
                "correct_answer": correct_str,
                "is_ignored_by_first_5_rule": is_ignored_overflow,
                "marks_awarded": marks
            }

    ground_truth["score_summary"] = {
        "total_score": total_score,
        "max_score": 300,
        "correct_count": correct_cnt,
        "incorrect_count": incorrect_cnt,
        "unattempted_count": unattempted_cnt,
        "percentage": round((total_score / 300) * 100, 2)
    }

    # Apply authentic real-life mobile camera and physical artifacts
    if is_wild:
        img = apply_real_life_distortions(img)

    out_img = os.path.join(OUT_DIR, f"jee_mains_omr_{sheet_idx:02d}.png")
    out_json = os.path.join(OUT_DIR, f"jee_mains_omr_{sheet_idx:02d}.json")

    cv2.imwrite(out_img, img)
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(ground_truth, f, indent=2)

    print(f"  [SHEET {sheet_idx:02d}] {os.path.basename(out_img)} | Candidate: {candidate_name} | Score: {total_score}/300 | Style: {'Real-Life Mobile Photo' if is_wild else 'Clean Scan'}")

def main():
    print("=== Generating 20 Additional Real-Life Authentic JEE Main OMR Sheets (11 to 30) ===")
    
    candidates_wild = [
        {"name": "MANISH AGRAWAL", "roll": "2403107291", "booklet": "SET A", "exam": "JEE Main 2025 Jan 22 S1"},
        {"name": "SHREYA DESHMUKH", "roll": "2403108420", "booklet": "SET B", "exam": "JEE Main 2025 Apr 02 S2"},
        {"name": "HARSHIT PANDEY", "roll": "2403101938", "booklet": "SET C", "exam": "JEE Main 2024 Jan 27 S1"},
        {"name": "TANVI KULKARNI", "roll": "2403106519", "booklet": "SET D", "exam": "JEE Main 2024 Jan 30 S2"},
        {"name": "ABHINAV TIWARI", "roll": "2403109382", "booklet": "SET A", "exam": "JEE Main 2024 Apr 08 S1"},
        {"name": "ISHA MALHOTRA", "roll": "2403103721", "booklet": "SET B", "exam": "JEE Main 2025 Apr 04 S1"},
        {"name": "KUNAL CHAUHAN", "roll": "2403105184", "booklet": "SET C", "exam": "JEE Main 2025 Apr 07 S2"},
        {"name": "MEERA IYER", "roll": "2403108273", "booklet": "SET D", "exam": "JEE Main 2024 Apr 04 S1"},
        {"name": "SIDDHARTH RAO", "roll": "2403104619", "booklet": "SET A", "exam": "JEE Main 2024 Apr 06 S2"},
        {"name": "RHEA BHATIA", "roll": "2403109841", "booklet": "SET B", "exam": "JEE Main 2025 Jan 28 S1"},
        {"name": "AYUSH TRIPATHI", "roll": "2403102374", "booklet": "SET C", "exam": "JEE Main 2025 Apr 03 S1"},
        {"name": "SIMRAN KAUR", "roll": "2403107129", "booklet": "SET D", "exam": "JEE Main 2025 Apr 08 S2"},
        {"name": "DEVENDRA SINGH", "roll": "2403105820", "booklet": "SET A", "exam": "JEE Main 2024 Jan 31 S1"},
        {"name": "NEHA SENGUPTA", "roll": "2403109147", "booklet": "SET B", "exam": "JEE Main 2024 Jan 31 S2"},
        {"name": "VARUN CHATTERJEE", "roll": "2403103982", "booklet": "SET C", "exam": "JEE Main 2024 Feb 01 S1"},
        {"name": "AVANI SHROFF", "roll": "2403106741", "booklet": "SET D", "exam": "JEE Main 2024 Feb 01 S2"},
        {"name": "GAURAV BANSAL", "roll": "2403108195", "booklet": "SET A", "exam": "JEE Main 2025 Apr 04 S2"},
        {"name": "TRISHA CHANDRA", "roll": "2403102658", "booklet": "SET B", "exam": "JEE Main 2025 Apr 07 S1"},
        {"name": "PRANAV SHUKLA", "roll": "2403107493", "booklet": "SET C", "exam": "JEE Main 2024 Apr 09 S1"},
        {"name": "SANYA GARG", "roll": "2403104128", "booklet": "SET D", "exam": "JEE Main 2025 Jan 23 S2"}
    ]

    for offset, c in enumerate(candidates_wild):
        sheet_idx = 11 + offset
        meta = {
            "candidate_name": c["name"],
            "roll_no": c["roll"],
            "booklet_code": c["booklet"],
            "exam_name": c["exam"]
        }
        # Generate with real-life mobile photographic distortions
        generate_jee_main_omr(sheet_idx, meta, is_wild=True)

    print("\n[SUCCESS] Generated 20 Real-Life Handheld Mobile Authentic JEE Main OMR Sheets (11 to 30)!")

if __name__ == "__main__":
    main()
