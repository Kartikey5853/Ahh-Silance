# Real Image Computer Vision Pipeline & Error Handling Architecture

**Date**: November 6, 2026  
**Document**: Architectural Blueprint & Failure Mode Handling  
**Target Environment**: Pure Image & Document Processing (No JSON Cheating, No Mocked Fallbacks)

---

## Executive Summary: The End of Synthetic Simulation

In previous iterations, when an uploaded image lacked an associated JSON sidecar metadata file, the server dropped into a fallback random generator (`rng.random()`) that synthesized responses based on a filename hash. As discovered during manual testing:
> *"I can upload any random file and it will still give me a fake answer."*

This violates the core principle of an automated evaluation system. In a production-grade grading engine:
1. **Zero Fake Answers**: If the user uploads a random photo, a selfie, or a blank page, the system must **detect that it is not an OMR sheet and reject it with a clear error**—never return a fabricated score.
2. **Pure Pixel Computer Vision**: The system must inspect the actual pixel array using OpenCV and neural OCR:
   - Measure actual bubble darkness ratios on the paper.
   - Run OCR on handwritten numerical boxes.
   - Run OCR on uploaded handwritten answer keys.
3. **Transparent Failure Modes**: When a sheet is partially cropped, torn, or unreadable, the system must accurately report which questions were visible and which were missing, rather than guessing.

---

## 1. The 9-Stage Real Image Evaluation Pipeline

```
[ Uploaded Sheet Image (PNG/JPG/PDF) ]      [ Uploaded Answer Key (PNG/JPG/CSV/TXT/JSON) ]
                   │                                             │
                   ▼                                             ▼
  ┌─────────────────────────────────┐           ┌─────────────────────────────────┐
  │ Stage 1: Document Validation    │           │ Stage 5: Master Key OCR/Parser  │
  │ Check format, resolution, size  │           │ Extract 1..90 answers (No Defs) │
  └─────────────────────────────────┘           └─────────────────────────────────┘
                   │                                             │
                   ▼                                             │
  ┌─────────────────────────────────┐                            │
  │ Stage 2: OMR Grid Verification  │                            │
  │ Search fiducials / contour grid │                            │
  │ [Reject non-OMR with HTTP 422]  │                            │
  └─────────────────────────────────┘                            │
                   │                                             │
                   ▼                                             │
  ┌─────────────────────────────────┐                            │
  │ Stage 3: Perspective Alignment  │                            │
  │ Four-point warp, deskew, scale  │                            │
  └─────────────────────────────────┘                            │
                   │                                             │
                   ▼                                             │
  ┌─────────────────────────────────┐                            │
  │ Stage 4: True Bubble Extraction │                            │
  │ Core darkness sampling + OCR    │                            │
  └─────────────────────────────────┘                            │
                   │                                             │
                   ▼                                             ▼
  ┌───────────────────────────────────────────────────────────────────────────────┐
  │ Stage 6: Response-to-Key Alignment (1-to-1 question matching)                 │
  └───────────────────────────────────────────────────────────────────────────────┘
                                           │
                                           ▼
  ┌───────────────────────────────────────────────────────────────────────────────┐
  │ Stage 7: Strict NTA Scoring Engine (+4, -1, 0, Section B First-5 Rule)        │
  └───────────────────────────────────────────────────────────────────────────────┘
                                           │
                                           ▼
  ┌───────────────────────────────────────────────────────────────────────────────┐
  │ Stage 8: Anomaly Audit & Analytics (Double marks, faint ink, unreadable rows) │
  └───────────────────────────────────────────────────────────────────────────────┘
                                           │
                                           ▼
  ┌───────────────────────────────────────────────────────────────────────────────┐
  │ Stage 9: Scorecard Delivery & SQLite Persistence                              │
  └───────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Exhaustive Edge Cases & Failure Mode Protocols

### Case A: What happens if the OMR sheet is not uploaded at all?
* **Detection**: Multipart form field `sheet_file` is empty, null, or has filename `""`.
* **Behavior**:
  * Abort execution immediately before running any CV models.
  * Return `HTTP 400 Bad Request`:
    ```json
    {
      "detail": "Student document file is missing. Please select an OMR sheet image or marked question paper PDF."
    }
    ```
* **Frontend Reaction**: The UI disables the Evaluate button and highlights the Document dropzone in red with an explicit prompt.

---

### Case B: What happens if the user uploads a random non-OMR image?
*(e.g., a photo of a desk, landscape, whiteboard, or screenshot)*
* **Detection (OMR Verification Filter)**:
  1. Image is loaded via `cv2.imdecode`.
  2. Image is converted to grayscale and thresholded with `cv2.adaptiveThreshold` or Sauvola local variance.
  3. Morphological black-hat / Hough circle transforms search for candidate bubble rings ($r \in [5, 25]$ px) and rectangular question table borders.
  4. **Threshold Rule**: A genuine JEE Main OMR sheet contains at least **240 bubble rings** (Section A has $60 \times 4 = 240$ bubbles; roll number grid has $10 \times 10 = 100$ bubbles).
  5. If the detected bubble/grid candidate count is **$< 20$**, the image is confirmed to be a non-OMR document.
* **Behavior**:
  * Abort pipeline immediately.
  * Return `HTTP 422 Unprocessable Entity`:
    ```json
    {
      "detail": "Uploaded image is not a recognizable OMR sheet. No question bubble rows or test registration markers were detected. Please upload a clear photo or scan of a JEE OMR sheet."
    }
    ```
  * **Zero fake marks awarded**. The evaluation halts cleanly.

---

### Case C: What happens if the OMR is partially uploaded, cropped, or torn?
*(e.g., only the top half of the sheet was captured, questions 1 to 40 are visible, but questions 41 to 90 are cut off)*
* **Detection**:
  1. The registration algorithm locates the outer boundary bounding box of the page.
  2. For each standard question coordinate row $y_q$:
     - If $y_q > H_{\text{image}} - \text{margin}$ or $x_q > W_{\text{image}} - \text{margin}$, the question location falls outside the captured frame.
* **Behavior**:
  * The visible questions (e.g. Q1 to Q40) are evaluated with true pixel darkness measurements.
  * The missing questions (e.g. Q41 to Q90) are assigned status `NOT_FOUND_IN_IMAGE`:
    * `candidate_response`: `null`
    * `marks_awarded`: `0`
    * `status`: `"UNATTEMPTED"`
    * `audit_note`: `"Question row was clipped or outside the captured camera frame."`
  * The scorecard audit flag `has_clipped_questions` is set to `True`.
  * The student is NOT penalized with -1 for questions that were simply cut off by the camera; they are treated as unattempted (0 marks).

---

### Case D: What happens if questions cannot be resolved (e.g. ink smudges, torn paper, glare)?
* **Detection**:
  1. Local standard deviation of the bubble core is measured.
  2. If glare makes the entire region pure white ($255$) or a tear makes it pure black ($0$) across all options A, B, C, D:
     - All 4 options report fill $> 90\%$ (heavy ink smudge) or all 4 options report fill $0\%$ with low contrast (glare washout).
* **Behavior**:
  * If all options are saturated ($> 85\%$ fill), mark as `has_multiple_marks = True`, awarding `-1` mark per NTA multiple-bubble penalty rules.
  * If contrast is too washed out to confirm ink presence, mark `is_attempted = False` with audit note `"Unresolvable contrast / potential paper damage"`.

---

### Case E: What happens if the Master Answer Key is missing or incomplete?
*(e.g., the teacher uploads a text key that only has answers for Questions 1 to 50)*
* **Rule**: There are **NO hardcoded or default answers in the backend**.
* **Behavior**:
  1. If no answer key file was provided: Abort with `HTTP 400 Bad Request: "Answer key is mandatory."`
  2. If the user's answer key only contains 50 questions:
     - Questions 1 to 50 are evaluated strictly against the user's key.
     - Questions 51 to 90 have no reference key and are designated `NO_KEY_PROVIDED`:
       * `marks_awarded`: `0`
       * `status`: `"UNATTEMPTED"`
       * `audit_note`: `"Missing from uploaded master answer key"`
     - The scorecard flags an explicit warning:
       > *"Warning: Uploaded answer key only contained 50 of 90 questions. Questions 51-90 were left unscored."*

---

## 3. Real Computer Vision Implementation Details

### Bubble Core Density Measurement (The Mathematics)
For a question row with options A, B, C, D:
1. Candidate bubble center coordinates: $(c_x, c_y)$ with radius $R$.
2. To avoid printed ring borders, sample only the inner $60\%$ disk: $r_{\text{inner}} = 0.60 \times R$.
3. Compute the relative optical ink density:
   $$\text{Density} = 1.0 - \frac{\bar{I}_{\text{core}}}{\bar{I}_{\text{local\_paper}}}$$
   where $\bar{I}_{\text{core}}$ is the mean grayscale intensity of the inner disk, and $\bar{I}_{\text{local\_paper}}$ is the mean intensity of an adjacent unprinted paper patch.
4. **Classification Rule**:
   * If $\text{Density} \ge 0.40 \implies$ **Marked**.
   * If $0.22 \le \text{Density} < 0.40 \implies$ **Faint Pencil** (flagged for review).
   * If $\text{Density} < 0.22 \implies$ **Clean / Unmarked**.

### Section B Handwritten Numerical OCR
1. For each of the 10 numerical questions per subject (Q21-Q30, Q51-Q60, Q81-Q90):
2. Crop the written rectangular box: $\text{Box} = I[y_1:y_2, x_1:x_2]$.
3. Apply 2x bicubic resizing and white border padding.
4. Pass directly to RapidOCR ONNX model.
5. Parse the transcribed text:
   - Extract numeric regex: `r"[-+]?\d*\.?\d+"`.
   - If no digits detected $\implies$ question is unattempted.
   - If digits detected $\implies$ compare float value against the master key with numerical tolerance ($\pm 0.05$).

---

## 4. Frontend-to-Backend End-to-End Verification Plan

| Pipeline Step | Frontend Action | Backend Processing | Verification Criteria |
|:---|:---|:---|:---|
| **Step 1: Upload** | User drops image file and key file | `multipart/form-data` received by `/upload` | Verify both streams exist; reject if either is missing |
| **Step 2: Document Check** | Loading spinner activates | `OMRVisionDetector.verify_is_omr()` | Rejects random non-OMR images with `422`; proceeds if valid |
| **Step 3: Registration** | Progress: 20% | Contour quad / fiducial transform | Deskews camera tilt up to $15^\circ$ |
| **Step 4: Grid Crop** | Progress: 40% | Slices 3 subject columns | Verifies all question rows are within bounds |
| **Step 5: Key Parse** | Progress: 60% | RapidOCR / CSV parser on key file | Extracts user's exact answers with zero assumed defaults |
| **Step 6: Bubble Core** | Progress: 75% | Inner 60% core pixel sampling | Calculates real ink densities; flags double bubbles |
| **Step 7: Numerical OCR**| Progress: 85% | ONNX character recognition | Reads written decimal values |
| **Step 8: Scoring** | Progress: 95% | NTA +4, -1, 0 + First-5 Rule | Prunes attempts $>5$ in Section B |
| **Step 9: Scorecard** | Renders ResultPage | Saves to SQLite `scorecards` | Displays real marks, roll number, and 90-question matrix |
