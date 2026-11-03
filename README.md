# Ahh-Silance - Automated JEE Evaluation

An automated evaluation pipeline for Joint Entrance Examination (JEE) test papers and OMR answer sheets. The platform extracts student responses across multiple-choice questions (Section A) and numerical value problems (Section B), evaluates them against master answer keys, enforces strict JEE marking schemes (including the Section B First-5 Attempt rule), and outputs instant verified scorecards.

---

## 📁 Repository Structure

```text
├── reports/
│   ├── edge_cases/               # Comprehensive breakdown of failure modes in real student sheets
│   │   └── edge_cases.md
│   ├── previous_approaches/      # Comparison of top 5 CV/ML architectures, speeds, & fatal mistakes
│   │   └── previous_approaches.md
│   └── datasets/                 # Catalog of large-scale OMR & question paper sources
│       └── dataset_sources.md
│
├── scripts/
│   ├── jee_download/             # Automated scrapers for official NTA past-year question papers
│   │   ├── download_nta_papers.py
│   │   └── download_past_nta_papers.py
│   └── synthetic_generation/     # Generators for marked test papers and authentic JEE OMR layouts
│       ├── generate_authentic_jee_omrs.py
│       └── generate_synthetic_benchmark.py
│
├── .gitignore
└── README.md
```

---

## 🔬 Key Engineering Research

Detailed research reports are located in the `reports/` folder:
* **[Edge Cases & Real-World Gotchas](reports/edge_cases/edge_cases.md)**: Real failure modes including camera keystoning, pocket folds, mobile phone shadows, bilingual English/Hindi question collisions, tiny handwritten decimal points, and the Section B First-5 Attempt rule.
* **[Evaluation Architecture Benchmarks](reports/previous_approaches/previous_approaches.md)**: Evaluates pure cloud VLM APIs vs classical OpenCV geometry vs small vision models (TrOCR / Florence-2). Outlines the final recommended hybrid sub-second architecture.
* **[Dataset Sourcing & Benchmark Splits](reports/datasets/dataset_sources.md)**: Details sources for thousands of real-world OMR answer sheets and past papers, proposing a 2,500-sheet evaluation benchmark.

---

## 🛠️ Data Collection & Generation Scripts

### 1. Download Official NTA Past Papers
To download official JEE Main B.Tech question papers directly from NTA:
```bash
python scripts/jee_download/download_nta_papers.py
python scripts/jee_download/download_past_nta_papers.py
```
*(Downloads 90+ verified high-resolution test papers covering 2020 through 2025 into `Dataset/NTA offical/`.)*

### 2. Generate Benchmark OMRs & Marked Papers
To generate synthetic test papers with ground-truth labels:
```bash
python scripts/synthetic_generation/generate_synthetic_benchmark.py
python scripts/synthetic_generation/generate_authentic_jee_omrs.py
```
