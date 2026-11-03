import os
import random
import json
import glob
import math
import numpy as np
import cv2
import pymupdf

BASE_OUT = r"f:\neira\Dataset\synthetically_generated"
MARKED_QP_DIR = os.path.join(BASE_OUT, "marked_question_papers")
OMR_DIR = os.path.join(BASE_OUT, "omr_sheets")

os.makedirs(MARKED_QP_DIR, exist_ok=True)
os.makedirs(OMR_DIR, exist_ok=True)

# Pen color palettes (BGR)
PEN_COLORS = {
    "blue_ballpoint": (180, 50, 20),
    "dark_blue": (140, 30, 10),
    "black_gel": (25, 25, 25),
    "pencil_gray": (105, 105, 110),
    "light_pencil": (140, 140, 145)
}

def draw_handwritten_tick(img, x, y, color, size=18):
    jitter = random.randint(-2, 2)
    x0, y0 = x - size//2, y
    x1, y1 = x, y + size//2 + jitter
    x2, y2 = x + size, y - size//2 + jitter
    thick = random.choice([2, 3])
    cv2.line(img, (x0, y0), (x1, y1), color, thick, cv2.LINE_AA)
    cv2.line(img, (x1, y1), (x2, y2), color, thick, cv2.LINE_AA)

def draw_handwritten_circle(img, cx, cy, color, rx=24, ry=16):
    angle = random.randint(-20, 20)
    rx_j = rx + random.randint(-3, 3)
    ry_j = ry + random.randint(-3, 3)
    thick = random.choice([2, 3])
    cv2.ellipse(img, (cx, cy), (rx_j, ry_j), angle, 0, 360, color, thick, cv2.LINE_AA)

def draw_handwritten_number(img, text, x, y, color):
    font = random.choice([cv2.FONT_HERSHEY_SIMPLEX, cv2.FONT_HERSHEY_DUPLEX])
    scale = random.uniform(0.65, 0.85)
    thick = random.choice([2, 2])
    # Slight jitter
    x += random.randint(-3, 3)
    y += random.randint(-2, 2)
    cv2.putText(img, text, (x, y), font, scale, color, thick, cv2.LINE_AA)

def generate_marked_question_papers(num_samples=15):
    print(f"\n--- Generating {num_samples} Directly Marked Question Papers ---")
    pdf_files = glob.glob(r"f:\neira\Dataset\NTA offical\*.pdf")
    if not pdf_files:
        print("No NTA PDFs found!")
        return

    for i in range(1, num_samples + 1):
        pdf_path = random.choice(pdf_files)
        doc = pymupdf.open(pdf_path)
        
        # Pick a page with questions
        target_page_idx = -1
        for pno in range(1, min(15, len(doc))):
            txt = doc[pno].get_text()
            if "Question Number" in txt and "Options :" in txt:
                target_page_idx = pno
                break
        
        if target_page_idx == -1:
            target_page_idx = 1

        page = doc[target_page_idx]
        pix = page.get_pixmap(dpi=150)
        img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, pix.n).copy()
        if pix.n == 4:
            img = cv2.cvtColor(img, cv2.COLOR_RGBA2BGR)
        elif pix.n == 1:
            img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)

        scale_x = pix.w / page.rect.width
        scale_y = pix.h / page.rect.height

        color_name = random.choice(list(PEN_COLORS.keys()))
        pen_color = PEN_COLORS[color_name]

        # Extract text blocks
        blocks = page.get_text("blocks")
        ground_truth = {
            "sample_id": f"marked_qp_{i:03d}",
            "source_pdf": os.path.basename(pdf_path),
            "page_number": target_page_idx + 1,
            "pen_style": color_name,
            "marks": []
        }

        # Look for option lines like "405036..." or "(1)"
        text_page = page.get_text()
        option_ids = []
        for line in text_page.split("\n"):
            line = line.strip()
            if line.endswith(".") and len(line) > 6 and line[:-1].isdigit():
                option_ids.append(line[:-1])

        # Mark 1 to 4 options
        if option_ids:
            chunk_size = 4
            for q_idx in range(0, len(option_ids), chunk_size):
                opts = option_ids[q_idx : q_idx + chunk_size]
                if not opts:
                    continue
                # 85% attempt rate
                if random.random() < 0.85:
                    chosen_idx = random.randint(0, len(opts) - 1)
                    chosen_opt = opts[chosen_idx]
                    rects = page.search_for(chosen_opt)
                    if rects:
                        r = rects[0]
                        cx = int((r.x0 + r.x1) / 2 * scale_x)
                        cy = int((r.y0 + r.y1) / 2 * scale_y)
                        
                        style = random.choice(["tick", "circle"])
                        if style == "tick":
                            draw_handwritten_tick(img, cx + 25, cy, pen_color)
                        else:
                            draw_handwritten_circle(img, cx, cy, pen_color, rx=int((r.width/2)*scale_x + 8), ry=14)

                        ground_truth["marks"].append({
                            "question_index": (q_idx // 4) + 1,
                            "type": "MCQ",
                            "marked_option_id": chosen_opt,
                            "chosen_option_number": chosen_idx + 1,
                            "mark_style": style
                        })

        # Check for numerical / blank fields and add handwritten numerical answer
        if random.random() < 0.6:
            # write a numerical response in a clear area (e.g. bottom right or near end)
            num_val = random.choice(["24", "42.5", "-12", "3.14", "0.5", "180", "125"])
            nx = int(pix.w * 0.72)
            ny = int(pix.h * (0.4 + random.uniform(0.1, 0.4)))
            cv2.rectangle(img, (nx - 10, ny - 30), (nx + 110, ny + 10), (220, 220, 220), 1)
            draw_handwritten_number(img, num_val, nx, ny, pen_color)
            ground_truth["marks"].append({
                "question_index": 21,
                "type": "NUMERICAL",
                "written_value": num_val,
                "location": [nx, ny]
            })

        out_img_path = os.path.join(MARKED_QP_DIR, f"marked_paper_{i:03d}.png")
        out_json_path = os.path.join(MARKED_QP_DIR, f"marked_paper_{i:03d}.json")
        cv2.imwrite(out_img_path, img)
        with open(out_json_path, "w", encoding="utf-8") as f:
            json.dump(ground_truth, f, indent=2)
        print(f"  [QP {i:02d}] Saved {os.path.basename(out_img_path)} with {len(ground_truth['marks'])} marks")

def generate_omr_sheets(num_samples=25):
    print(f"\n--- Generating {num_samples} Synthetic OMR Sheets ---")
    width, height = 1600, 2200

    for idx in range(1, num_samples + 1):
        img = np.full((height, width, 3), 255, dtype=np.uint8)

        # Draw outer borders & corner fiducials (essential for real OMR alignment)
        cv2.rectangle(img, (40, 40), (120, 120), (0, 0, 0), -1)
        cv2.rectangle(img, (width - 120, 40), (width - 40, 120), (0, 0, 0), -1)
        cv2.rectangle(img, (40, height - 120), (120, height - 40), (0, 0, 0), -1)
        cv2.rectangle(img, (width - 120, height - 120), (width - 40, height - 40), (0, 0, 0), -1)

        # Header Title
        cv2.putText(img, "JEE (MAIN) EXAMINATION - OMR RESPONSE SHEET", (260, 95), cv2.FONT_HERSHEY_DUPLEX, 1.1, (0, 0, 0), 2)
        cv2.line(img, (140, 135), (width - 140, 135), (50, 50, 50), 2)

        # 3 Subjects: Physics (Q1-30), Chemistry (Q31-60), Mathematics (Q61-90)
        columns = [
            {"subject": "PHYSICS", "start_q": 1, "end_q": 30, "x_offset": 120},
            {"subject": "CHEMISTRY", "start_q": 31, "end_q": 60, "x_offset": 620},
            {"subject": "MATHEMATICS", "start_q": 61, "end_q": 90, "x_offset": 1120}
        ]

        options = ["A", "B", "C", "D"]
        color_name = random.choice(["blue_ballpoint", "dark_blue", "black_gel", "pencil_gray"])
        pen_color = PEN_COLORS[color_name]

        ground_truth = {
            "omr_id": f"omr_{idx:03d}",
            "exam": "JEE Main",
            "pen_style": color_name,
            "condition": "clean",
            "responses": {}
        }

        # Draw grid & fill bubbles
        for col in columns:
            x_base = col["x_offset"]
            cv2.putText(img, col["subject"], (x_base + 80, 180), cv2.FONT_HERSHEY_DUPLEX, 0.8, (0, 0, 0), 2)
            cv2.line(img, (x_base, 195), (x_base + 380, 195), (100, 100, 100), 1)

            # Option headers A B C D
            for opt_idx, opt in enumerate(options):
                cv2.putText(img, opt, (x_base + 120 + opt_idx * 60, 225), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (50, 50, 50), 2)

            for q in range(col["start_q"], col["end_q"] + 1):
                y = 260 + (q - col["start_q"]) * 58
                cv2.putText(img, f"Q{q:02d}", (x_base + 15, y + 6), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)

                # Pick response
                is_attempted = random.random() < 0.80
                chosen_opt = random.choice(options) if is_attempted else None
                is_double_marked = is_attempted and (random.random() < 0.05)
                is_faint = is_attempted and (random.random() < 0.08)

                for opt_idx, opt in enumerate(options):
                    bx = x_base + 125 + opt_idx * 60
                    by = y
                    # Draw preprinted bubble ring
                    cv2.circle(img, (bx, by), 18, (80, 80, 80), 2, cv2.LINE_AA)

                    if opt == chosen_opt:
                        fill_col = (180, 180, 180) if is_faint else pen_color
                        # Fill bubble
                        cv2.circle(img, (bx, by), 15, fill_col, -1, cv2.LINE_AA)
                    elif is_double_marked and opt == random.choice([o for o in options if o != chosen_opt]):
                        # Double mark with cross
                        cv2.circle(img, (bx, by), 15, pen_color, -1, cv2.LINE_AA)
                        cv2.line(img, (bx-12, by-12), (bx+12, by+12), (0, 0, 200), 3, cv2.LINE_AA)

                if is_attempted:
                    status = "DOUBLE_MARKED" if is_double_marked else ("FAINT" if is_faint else "NORMAL")
                    ground_truth["responses"][str(q)] = {
                        "marked_option": chosen_opt,
                        "status": status
                    }
                else:
                    ground_truth["responses"][str(q)] = {
                        "marked_option": None,
                        "status": "UNATTEMPTED"
                    }

        # Apply realistic wild distortions to 50% of sheets
        if idx % 3 == 0:
            # Subtle rotation (skew)
            ground_truth["condition"] = "skewed"
            angle = random.uniform(-4.0, 4.0)
            M = cv2.getRotationMatrix2D((width//2, height//2), angle, 1.0)
            img = cv2.warpAffine(img, M, (width, height), borderValue=(245, 245, 245))
        elif idx % 4 == 0:
            # Gradient shadow (phone shadow)
            ground_truth["condition"] = "shadowed"
            shadow = np.tile(np.linspace(0.65, 1.0, width), (height, 1))
            shadow = cv2.merge([shadow, shadow, shadow])
            img = np.clip(img.astype(np.float32) * shadow, 0, 255).astype(np.uint8)

        out_img_path = os.path.join(OMR_DIR, f"omr_sheet_{idx:03d}.png")
        out_json_path = os.path.join(OMR_DIR, f"omr_sheet_{idx:03d}.json")
        cv2.imwrite(out_img_path, img)
        with open(out_json_path, "w", encoding="utf-8") as f:
            json.dump(ground_truth, f, indent=2)
        print(f"  [OMR {idx:02d}] Saved {os.path.basename(out_img_path)} ({ground_truth['condition']})")

def main():
    generate_marked_question_papers(num_samples=15)
    generate_omr_sheets(num_samples=25)
    print("\n[SUCCESS] Synthetic generation completed successfully!")

if __name__ == "__main__":
    main()
