# Frontend Pages and Component Architecture

This document describes the structure, responsibilities, and operational flows of each web page and component in the `Ahh Silance!!!` frontend.

---

## 1. Pages

### [LoginPage.tsx](file:///f:/neira/frontend/src/pages/LoginPage.tsx)
* **Purpose**: User authentication gateway.
* **Aesthetics**: Clean, distraction-free pure white background with the prominent brand header `Ahh Silance!!!`.
* **Features**:
  * Default test credentials badge (`test` / `test123`) for 1-click test fill or manual entry.
  * Submits credentials to `POST /api/v1/auth/login`.
  * Stores the returned signed JWT access token in `localStorage`.
  * Surfaces clear error messages on invalid login attempts.

### [DashboardPage.tsx](file:///f:/neira/frontend/src/pages/DashboardPage.tsx)
* **Purpose**: Core examination evaluation submission hub.
* **Features**:
  * **Evaluation Modes**:
    1. *OMR Sheet + Answer Key*: Scanned standard JEE Mains bubble sheet evaluated against booklet keys.
    2. *Marked Question Paper + Answer Key*: Scanned examination booklet with circled or checked responses.
  * **Input Channels**:
    1. *Computer File Upload*: Drag-and-drop or file picker for PNG, JPG, JPEG, and PDF documents.
    2. *Camera Live Snapshot*: Integrated webcam video viewfinder to snap physical paper sheets directly.
  * **Preset Test Selector**: Allows 1-click evaluation of pre-bundled authentic 2024/2025 JEE exam papers to test edge cases immediately.
  * **Submission**: Transmits multipart form payload to `POST /api/v1/evaluate/upload`.

### [ResultPage.tsx](file:///f:/neira/frontend/src/pages/ResultPage.tsx)
* **Purpose**: Comprehensive NTA JEE scorecard and audit report presentation.
* **Features**:
  * **Header Score Metrics**: Net score out of 300, accuracy percentage, attempt count, and server processing duration in ms.
  * **Subject Breakdown Cards**: Independent metrics for Physics (100), Chemistry (100), and Mathematics (100).
  * **NTA Section B First-5 Rule Banner**: Prominently highlights if candidate attempted >5 numericals per section, documenting which attempts were scored and which were pruned.
  * **Audit Quality Verification**: Flags for double bubbling, faint markings, and digit-bubble discrepancies.
  * **Question Matrix Integration**: Mounts the interactive 90-question table.

### [HistoryPage.tsx](file:///f:/neira/frontend/src/pages/HistoryPage.tsx)
* **Purpose**: Historical scorecard repository.
* **Features**:
  * Queries `GET /api/v1/auth/history` backed by the local SQLite database.
  * Displays roll number, mode, score/300, and evaluation timestamp.
  * Allows 1-click reload of any previously computed scorecard.

---

## 2. Supporting Components

* **[Navbar.tsx](file:///f:/neira/frontend/src/components/Navbar.tsx)**: Top navigation header with logo, section tabs, user session badge, and sign-out action.
* **[CameraCapture.tsx](file:///f:/neira/frontend/src/components/CameraCapture.tsx)**: Live webcam document capture modal using `navigator.mediaDevices`.
* **[FileUploadDropzone.tsx](file:///f:/neira/frontend/src/components/FileUploadDropzone.tsx)**: Accessible file drop area with size formatting and camera switch.
* **[QuestionMatrix.tsx](file:///f:/neira/frontend/src/components/QuestionMatrix.tsx)**: 90-question audit grid with subject tabs, Section A/B categorization, and status badges.
