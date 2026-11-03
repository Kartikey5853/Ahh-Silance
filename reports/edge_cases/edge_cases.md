# Real-World Gotchas & Edge Cases: What Can Go Wrong in Practice

When moving from an idealized demo to actual students using the platform, standard assumptions fall apart. Below are the real-world traps, messy human habits, and edge cases across each of the 9 steps that must be planned for beforehand.

---

## 1. Document Ingestion & Validation
*Things that go wrong before a single line of OCR runs:*

* **Desk Photo instead of a Scan**: 90% of students will not use a flatbed scanner. They will snap a photo with their phone on a messy wooden table, capturing pens, laptop edges, fingers holding the page down, and floor tiles in the background. The actual sheet is only 60% of the image.
* **Scrambled & Missing Pages**: An exam booklet uploaded as `IMG_0012.jpg`, `IMG_0011.jpg`—pages in reverse order, page 4 missing entirely, or page 3 photographed twice by accident.
* **Blue Ink, Light Pencils, and Gel Pens**: Despite exam instructions saying "Black ballpoint only", students frequently use blue ballpoint, faint HB pencil, fountain pen ink that bleeds, or gel pen that smudges when fingers swipe across it.
* **Folded & Pocket-Creased Sheets**: Question papers and OMR sheets are folded in half or into quarters to fit into bags or pockets. The fold lines cast sharp physical shadows right through bubbles and question numbers.

---

## 2. Document Preprocessing
*Things that break standard computer vision filters:*

* **The Book Spine / Curved Page Problem**: When photographing a thick question booklet, the inner margin curves sharply into the staple/binding. Text and options near the binding appear stretched, distorted, and angled on a 3D curve.
* **Phone & Finger Shadow Trap**: Taking a photo from directly above casts the harsh shadow of the phone and the student's hand across the bottom half of the sheet. Standard global thresholding (like Otsu) turns that entire shadow region pitch black.
* **Cut-Off OMR Timing Tracks (Fiducials)**: Traditional OMR algorithms depend on black corner squares or border timing tracks to align the grid. If the student's photo trims even one corner square off-frame, classic alignment algorithms crash immediately.
* **Mixed Orientations in One Document**: Page 1 is portrait, Page 2 was scanned sideways in landscape, and Page 3 is upside down. Processing the document with a single rotation angle will corrupt 50% of the pages.

---

## 3. Question & Section Structure Detection
*Things that confuse question parsers and layouts:*

* **Rough Work Scribbles in the Margins**: Real students do physics calculations, draw free-body diagrams, and scratch formulas right in the white space next to the question. A naive text parser will swallow their rough math as part of the question text or options.
* **Circled Numbers vs. Crossed-Out Questions**: Students frequently circle question numbers they plan to revisit, put a big `?` next to tough ones, or draw an `X` across questions they abandon. The parser can misread `"Q 14"` as `"Q (14)"`, `"Q 114"`, or fail to detect the question tag altogether.
* **Dual-Column Layout Reading Order**: JEE papers are almost always printed in two columns. Standard left-to-right OCR reads straight across both columns ($Q1 \to Q16 \to Q2 \to Q17$), completely scrambling question stems and options.
* **The Hindi + English Bilingual Trap**: JEE papers print the question in English first, followed immediately by the Hindi translation. If not accounted for, the system thinks Question 1 has 8 options (4 in English, 4 in Hindi) or registers duplicate question numbers.

---

## 4. Student Response Extraction
*The messiest stage: interpreting real human markings:*

* **Real-World "Human Corrections" on OMR**:
  * **The Struck-Out Bubble**: A student fills bubble `B`, realizes it is wrong, scratches an `X` over `B`, and bubbles `C`. An automated system often flags this as a disallowed "multiple attempt" or picks the wrong bubble.
  * **The Faint Tick or Dot**: Instead of shading the bubble, the student put a small checkmark ($\checkmark$) or a quick dot in the center.
  * **The Pencil Smudge**: An erased pencil answer leaves a gray graphite sheen that reflective optical scans mistake for a filled bubble.
* **Direct Marking on Question Papers (No OMR)**:
  * When marking on the paper itself, students are wildly inconsistent: some circle option `(B)`, some tick the text, some underline the formula, and some write `"Ans: C"` in the margin.
* **Handwritten Numerical Answers**:
  * **The "Invisible" Decimal Point**: A handwritten decimal is often just a microscopic pen tap. A faint dot or a paper defect can turn `25` into `2.5` or `2.5` into `25`.
  * **Fractions and Expressions**: A student writes `4/3` or `2*10^5` instead of computing `1.33` or `200000`.
  * **Units Attached to Numbers**: Student writes `12 m/s`, `10 N`, or `x = 4`. If the backend directly runs `float(extracted_str)`, the server throws an unhandled exception.
  * **Ambiguous Digits**: `1` written with a top hook looks like `7`; an unclosed `0` looks like `6` or `U`; a sloppy `4` looks like `9`.

---

## 5. Master Answer Key Ingestion
*Assuming the answer key is a neat list of A, B, C, D is a fatal mistake:*

* **Official NTA Answer Keys Use 9-Digit IDs, Not 1, 2, 3**:
  * Official JEE Mains response sheets and keys do NOT say `Q1: A`. They say:
    `Question ID: 501823901, Correct Option ID: 5018239014`.
  * If your system expects simple `1 to 90 -> A/B/C/D`, it fails completely on genuine official NTA answer key files.
* **Dropped & Bonus Questions**: Official keys regularly drop questions due to ambiguity or translation errors. You must handle whether $+4$ goes to *everyone* or *only to students who attempted it*.
* **Multiple Accepted Options**: Real keys frequently state `"Option 2 or Option 4 accepted"` or `"Marks given to (A) and (D)"`.
* **Tolerance Ranges for Numericals**: Due to rounding differences (e.g. using $g = 9.8$ vs $g = 10$), official keys often accept an interval like `[19.5, 20.2]`, not a single rigid number.

---

## 6. Response-to-Key Alignment
*Where silent scoring disasters happen:*

* **Scrambled Test Booklets / Paper Codes**: JEE uses multiple randomized paper codes (Set A, Set B, Set C, Set D). Question 1 in Set A is Question 18 in Set B. If the student uploaded Set A and the key is Set B, every single answer aligns with the wrong question without throwing any syntax errors.
* **The "Off-By-One" Domino Effect on Skipped Questions**: If a student skipped Question 17, and the extractor simply emits an array of answers `[A, B, C, D...]` without explicit question indices, Question 18 becomes index 17, permanently ruining the alignment for the remaining 73 questions.
* **Shuffled Option Orders in Computer-Based Tests**: In modern JEE Mains, even the option choices are scrambled per candidate (Option 1 for Student A might be Option 3 for Student B).

---

## 7. JEE Scoring Engine Execution
*Nuances of official exam regulations:*

* **The Strict "First 5 Attempted" Rule (Section B)**:
  * In JEE Mains Section B, 10 numerical questions are provided per subject, but students must only attempt 5.
  * **The Trap**: If an eager student attempts 7 questions, NTA's official rule states: *Only the first 5 attempted questions in numerical order are graded.* Questions 6 and 7 are completely DISREGARDED—even if questions 6 and 7 were 100% correct! If your code evaluates the "best 5", the score will be wrong.
* **Negative Marking Rule Changes Over the Years**:
  * Prior to 2022: Section B numericals had NO negative marking ($0$ for wrong).
  * 2022 onwards: Section B numericals HAVE negative marking ($-1$ for wrong).
  * The scoring engine cannot hardcode a single rule without knowing the target exam year pattern.
* **JEE Advanced Multi-Correct Partial Marking Complexities**:
  * If correct options are $\{A, B, D\}$:
    * Marking $\{A, B, D\} \to +4$
    * Marking $\{A, B\} \to +2$ (partial)
    * Marking $\{A\} \to +1$ (partial)
    * Marking $\{A, B, C\} \to -2$ (even though $A$ and $B$ were right, selecting the wrong option $C$ triggers full negative marking).

---

## 8. Score Calculation & Statistics Compilation
*Hidden logical flaws in tallying marks:*

* **Negative Total Subject Scores**: In JEE, negative marking means a student can legitimately score $-7$ in Chemistry. Junior developers often wrap subject totals in `Math.max(0, score)`, falsely boosting bad scores to 0.
* **Floating-Point Rounding Drift**: Advanced partial marking or normalized percentiles can introduce floating point precision drift ($183.9999999994$ instead of $184$). Rational numbers or fixed-decimal arithmetic are required.
* **Discrepancy in Attempt Counts**: If a student answered 7 questions in Section B, naive statistics might report "Total Attempted: 77 / 75", confusing the student. The breakdown must cleanly distinguish: *Evaluated Attempts (5)*, *Ignored Overflow Attempts (2)*, and *Unattempted (3)*.

---

## 9. Result Formatting & Delivery
*What causes student confusion and disputes:*

* **Lack of Transparency on "Why" Marks Were Lost**: If a student sees Question 27 marked with 0 points when their answer was correct, they will believe the app is broken—unless the UI explicitly tells them: *"Ignored: You already attempted 5 questions in Section B before this one."*
* **Low-Confidence OCR Guessing vs. Flagging**: If the model guesses between `7` and `1` on a blurry handwritten number and deducts $-1$ mark, the user loses trust. The UI must flag low-confidence reads: *"We read '7' with low confidence. Click to confirm."*
* **Side-by-Side Visual Verification**: Students rarely trust a pure text table. Displaying a cropped visual cutout of their marked bubble or handwritten box next to the official answer key removes all doubt.
