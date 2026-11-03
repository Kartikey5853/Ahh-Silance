# Big Dataset Sourcing & Benchmark Sizing Guide: OMR Sheets & JEE Papers

This document catalogs large-scale sources for obtaining clean, scanned, and "in-the-wild" OMR answer sheets and question papers (both digital vector PDFs and real smartphone camera captures/leaks), followed by the **recommended ideal test size & benchmark split**.

---

## 1. Where to Get OMR Sheets (Clean & Wild)

### A. Academic & Massive Real-World Exam Datasets
1. **Tamaulipas Multiple-Choice Exam Dataset (2024)**
   * **Scale:** **6,029 full real-world answer sheets** ($\sim 564,000$ bubble responses).
   * **Source:** Open-access research on automated MCQ grading (MDPI / ResearchGate repository).
   * **Nature:** Actual student answer sheets administered in Mexican state exams.
   * **Why it matters:** Contains genuine real-world noise: variable pencil shading, faint marks, scanner feed skew, misalignments, and student erasing smudges.
2. **SurveySet & SurveyNet (Zenodo / MDPI)**
   * **Scale:** 135 complex real-world survey and assessment forms.
   * **Nature:** Multi-format sheets featuring filled bubbles, checkboxes, handwritten numerical digits, crosses, and checkmarks.
   * **Why it matters:** Bridges the gap between pure bubble OMR and mixed handwritten numerical/text evaluation.

### B. Computer Vision & ML Repositories (Annotated for Object Detection & CV)
1. **Roboflow Universe (Pre-Annotated YOLO/COCO Datasets)**
   * **SUST OMR Scanner Dataset:** Annotated bubble sheets, bounding boxes, and response blocks.
   * **OwlMark OMR-question-detection:** Explicitly annotated for camera perspective warp, timing markers, and bubble grids.
   * **AnswerSheet Detection Projects:** Multiple community projects featuring mobile phone camera photos taken at angles.
   * **Direct URL:** `https://universe.roboflow.com/search?q=OMR+answer+sheet`
2. **Kaggle Datasets**
   * **OMR (Optical Mark Recognition) Image Dataset:** Labeled bubble sheets including rotated, shadowed, and noise-injected sheets.
   * **Bubble Answer Dataset:** Thousands of segmented individual bubble crops categorized into classes (`filled`, `unfilled`, `partially_filled`, `smudged`).
   * **OMR-500-Images:** 500 scanned and photographed sheets of varying quality.
3. **GitHub Open-Source Test Suites**
   * **`Udayraj123/OMRChecker` (`samples/` directory):** Real smartphone camera photos of OMR sheets on wooden tables with perspective tilt, shadow casts, and multiple template layouts.
   * **`donsolo-khalifa/OMRGrading` & `sakethbachu/OMR-scanner`:** Include sample multi-page exam scans and evaluation templates.

### C. Synthetic "Wild" Data Augmentation Pipeline
* When building production CV, you can take 50 baseline templates (Allen, Resonance, FIITJEE, NTA standard 75/90/180-question sheets) and generate **100,000+ photorealistic wild samples** using an automated pipeline:
  1. **Perspective Distortion:** Random 3D homography transforms ($\pm 25^\circ$ pitch/yaw).
  2. **Lighting & Shadows:** Synthetic phone/hand shadow masks overlaid via alpha blending.
  3. **Paper Degradation:** Gaussian blur, speckle noise, crumpled displacement maps, and pocket-crease shadows.
  4. **Human Marking Variations:** Randomly simulated pencil graphite sheen, blue ballpoint strokes, faint dots, and struck-out multi-mark bubbles.

---

## 2. Where to Get Question Papers (Digital PDFs & Wild Screenshots)

### A. Clean Digital Vector PDFs (Official & Standardized)
1. **NTA Official Archive (`nta.ac.in/Downloads` & `jeemain.nta.ac.in`)**
   * **Scale:** All sessions and shifts from 2019 to 2025.
   * **Volume:** $\sim 24\text{ to }30$ shifts per year $\times 6\text{ years} = \mathbf{140+\text{ full papers}}$ ($10,000+\text{ questions}$) with master answer keys.
   * **Format:** High-resolution digital vector PDFs with embedded math formulas, diagrams, and section headers.
2. **JEE Advanced Official Portal (`jeeadv.ac.in/past_qps.html`)**
   * **Scale:** Complete archive from 2007 through 2024.
   * **Volume:** Paper 1 and Paper 2 for each year ($\sim 36\text{ papers}$, $\sim 2,000\text{ questions}$).
   * **Format:** Clean bilingual (English & Hindi) PDFs featuring multi-correct, integer, and comprehension question types with official keys.
3. **GitHub Open Databases**
   * **`HostServer001/jee_mains_pyqs_data_base`:** Over 14,000 structured JEE Main questions cached with JSON metadata and image assets.
   * **`yashclouded/pyda-pdf`:** Parsed PDF datasets of JEE Main/Advanced papers with isolated questions, options, and keys.
   * **`davidrajm/Competitive-Exam-Question-Papers`:** Cloned past papers archive.

### B. "In-the-Wild" Question Papers & Candidate Response Sheets
1. **Coaching Institute Challenge Portals & Shift Archives**
   * Major coaching portals (**Allen Career Institute, Resonance, Motion Education, MathonGo, Careers360, Vedantu**) archive genuine candidate response sheets immediately after every exam session when NTA opens the challenge window.
   * **What they look like:** The raw NTA candidate portal HTML/PDF export showing 9-digit Question IDs, chosen Option IDs, and status (`"Answered"`, `"Not Answered"`, `"Marked for Review"`).
2. **Telegram Exam Communities (`@jeeneetprep`, `@iitjee_materials`, `@allen_test_series`)**
   * Students constantly share photos and smartphone scans of:
     * **Allen Leader/Score Test Series:** 2-column printed booklets photographed under classroom lights.
     * **FIITJEE AITS (All India Test Series):** Complex multi-column booklets with handwritten margin rough work.
     * **Sri Chaitanya / Narayana Weekend Tests:** Printed test papers with student pencil ticks, circled options, and handwritten numerical answers in the margins.
3. **Automated Response Sheet Scrapers**
   * **`adityaruplaha/JEEMainAnswerKeyChecker` & `Threadsnappers/JEE_Calc_API`:** Codebases containing sample student response sheets and parsing tools.

---

## 3. Recommended Ideal Test Benchmark & Dataset Split

When evaluating a production grading engine, **testing on 100 clean images is a fatal trap**—a system with 99% accuracy in the lab will plummet to 60% when handed a skewed camera shot with pencil shading.

### A. The Gold Standard Benchmark Size
* **Total OMR Sheets:** **$2,500\text{ sheets}$** ($\sim 225,000$ individual bubble evaluations).
* **Total Question Papers:** **$200\text{ full test papers}$** ($\sim 16,000$ total questions).

---

### B. OMR Dataset Split (The 50 / 35 / 15 Rule)

```
Total: 2,500 OMR Sheets
├── Tier 1: Clean Scans (50% = 1,250 sheets) ──▶ Baseline algorithm verification
├── Tier 2: Real Mobile Photos (35% = 875 sheets) ──▶ Real-world geometry & shadows
└── Tier 3: Extreme Stress Cases (15% = 375 sheets) ──▶ Robustness against human flaws
```

#### 1. Tier 1: Standard Clean Scans ($50\% = 1,250\text{ sheets}$)
* Flatbed 300 DPI scans, zero perspective tilt, black ballpoint pen.
* **Purpose:** Establishes algorithm upper-bound accuracy ($>99.9\%$).

#### 2. Tier 2: Real Mobile Camera Photos ($35\% = 875\text{ sheets}$)
* Photographed with various smartphone cameras (iPhone, Samsung, budget Android).
* Skew angles between $5^\circ\text{ and }25^\circ$.
* Natural indoor lighting, overhead phone shadows, wooden table / keyboard backgrounds.
* **Purpose:** Validates automatic page corner detection, perspective warp, and adaptive local thresholding.

#### 3. Tier 3: Extreme Stress & Edge Cases ($15\% = 375\text{ sheets}$)
* **The "Messy Human" Distribution:**
  * **Double Markings ($75\text{ sheets}$):** Candidate filled bubble B, scratched an 'X' over it, and bubbled C.
  * **Pencil Smudges ($75\text{ sheets}$):** Erased pencil marks leaving gray graphite reflections.
  * **Faint Marks ($75\text{ sheets}$):** Light HB pencil or quick checkmarks ($\checkmark$) instead of full bubble shading.
  * **Folded/Creased Paper ($75\text{ sheets}$):** Sheet folded in quarters with crease shadows slicing through bubble rows.
  * **Ink Variations ($50\text{ sheets}$):** Light blue ballpoint, fountain pen ink bleed, or smudged gel pen.
  * **Cropped Corners ($25\text{ sheets}$):** 1 of 4 corner alignment markers cut off by camera frame.

---

### C. Question Paper Dataset Split

```
Total: 200 Question Papers (~16,000 Questions)
├── 1. Official Digital Vector PDFs (40% = 80 papers)
├── 2. Scanned Coaching Booklets (40% = 80 papers)
└── 3. Student-Marked Copies (20% = 40 papers)
```

1. **Official Digital Vector PDFs ($40\% = 80\text{ papers}$):**
   * NTA JEE Mains & JEE Advanced official papers with vector text.
   * Tests vector extraction bypass and layout analysis on clean text.
2. **Scanned Coaching Booklets ($40\% = 80\text{ papers}$):**
   * Allen, FIITJEE, Resonance printed papers.
   * Tests 2-column layout parsing, Hindi/English bilingual separation, and diagram isolation.
3. **Directly Marked Question Papers ($20\% = 40\text{ papers}$):**
   * Real student papers with circled option letters, handwritten numerical answers in answer boxes, and scratch work in margins.
   * Tests TrOCR numerical recognition, unit stripping, and margin scribble rejection.
