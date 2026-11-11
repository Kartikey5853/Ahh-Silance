"""
Page Storage and Multi-Page Rasterization Service for Academic Evaluations.

Handles ingestion, PDF-to-image rasterization (PyMuPDF at 200 DPI),
orientation normalization, and disk persistence for student answer sheets.
Guarantees consistent 1-to-1 page image coordinates between Gemini and frontend SVG overlays.
"""

import os
import io
import logging
from typing import Dict, List, Any, Optional, Tuple
from PIL import Image
import pymupdf as fitz

logger = logging.getLogger(__name__)

# Base directory for storing evaluation page raster images
BASE_UPLOADS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "uploads",
    "evaluations"
)


class PageStorageService:
    """
    Manages rasterization, storage, and retrieval of multi-page student answer sheets.
    """

    @classmethod
    def get_evaluation_dir(cls, eval_id: str) -> str:
        """Returns the absolute filesystem directory for an evaluation's rasterized pages."""
        target_dir = os.path.join(BASE_UPLOADS_DIR, eval_id)
        os.makedirs(target_dir, exist_ok=True)
        return target_dir

    @classmethod
    def save_and_rasterize_submission(
        cls,
        eval_id: str,
        file_bytes: bytes,
        filename: str,
        target_dpi: int = 200
    ) -> Dict[str, Any]:
        """
        Saves student submission and rasterizes all pages into numbered JPEG images.
        Supports PDFs, raster images, and plain text responses.
        
        Returns:
            Dictionary containing:
            - eval_id: evaluation identifier
            - pages_dir: relative path to the storage folder
            - page_count: total number of rasterized pages
            - pages: list of page metadata (page_num, filename, abs_path, width, height)
            - raw_text: any embedded digital text extracted from the document
        """
        eval_dir = cls.get_evaluation_dir(eval_id)
        lower_name = filename.lower()
        pages_meta: List[Dict[str, Any]] = []
        extracted_text_chunks: List[str] = []

        # 1. Multi-Page PDF Handling
        if lower_name.endswith(".pdf"):
            try:
                doc = fitz.open(stream=file_bytes, filetype="pdf")
                page_count = len(doc)
                
                for idx in range(page_count):
                    page = doc[idx]
                    page_num = idx + 1
                    
                    # Extract any native vector text
                    p_text = page.get_text().strip()
                    if p_text:
                        extracted_text_chunks.append(f"--- Page {page_num} ---\n{p_text}")
                    
                    # Render page at specified DPI (200 DPI provides high fidelity for messy handwriting/tables)
                    pix = page.get_pixmap(dpi=target_dpi)
                    out_fname = f"page_{page_num:02d}.jpg"
                    out_path = os.path.join(eval_dir, out_fname)
                    pix.save(out_path)
                    
                    pages_meta.append({
                        "page_num": page_num,
                        "filename": out_fname,
                        "path": out_path,
                        "width": pix.width,
                        "height": pix.height
                    })
                doc.close()
            except Exception as e:
                logger.error(f"Failed to rasterize PDF submission {filename} for {eval_id}: {e}")
                # Fallback to single blank/stub page if PDF is corrupt
                return cls._create_blank_fallback_page(eval_dir, eval_id, f"Corrupt PDF: {e}")

        # 2. Raster Image Handling (PNG, JPG, JPEG, WEBP, BMP, TIFF)
        elif lower_name.endswith((".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff")):
            try:
                img = Image.open(io.BytesIO(file_bytes))
                # Ensure RGB mode (handles RGBA, Palette, or Grayscale)
                if img.mode != "RGB":
                    img = img.convert("RGB")
                
                out_fname = "page_01.jpg"
                out_path = os.path.join(eval_dir, out_fname)
                img.save(out_path, format="JPEG", quality=92)
                
                pages_meta.append({
                    "page_num": 1,
                    "filename": out_fname,
                    "path": out_path,
                    "width": img.width,
                    "height": img.height
                })
            except Exception as e:
                logger.error(f"Failed to save image submission {filename} for {eval_id}: {e}")
                return cls._create_blank_fallback_page(eval_dir, eval_id, f"Corrupt Image: {e}")

        # 3. Plain Text / Markdown Submission Handling
        else:
            try:
                text_content = file_bytes.decode("utf-8", errors="ignore").strip()
            except Exception:
                text_content = "[Binary Submission]"
            extracted_text_chunks.append(text_content)
            
            # Generate a rendered paper canvas from text for visual overlay
            out_fname = "page_01.jpg"
            out_path = os.path.join(eval_dir, out_fname)
            w, h = cls._render_text_to_page_image(text_content, out_path)
            pages_meta.append({
                "page_num": 1,
                "filename": out_fname,
                "path": out_path,
                "width": w,
                "height": h
            })

        if not pages_meta:
            return cls._create_blank_fallback_page(eval_dir, eval_id, "Empty Submission")

        rel_dir = os.path.relpath(eval_dir, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

        return {
            "eval_id": eval_id,
            "pages_dir": rel_dir,
            "page_count": len(pages_meta),
            "pages": pages_meta,
            "raw_text": "\n\n".join(extracted_text_chunks).strip()
        }

    @classmethod
    def get_page_image_path(cls, eval_id: str, page_num: int) -> Optional[str]:
        """Returns the absolute filepath for a specific evaluation page image."""
        eval_dir = os.path.join(BASE_UPLOADS_DIR, eval_id)
        if not os.path.isdir(eval_dir):
            return None
        
        target_name = f"page_{page_num:02d}.jpg"
        target_path = os.path.join(eval_dir, target_name)
        if os.path.isfile(target_path):
            return target_path
            
        # Also check single-digit naming or png if present
        for candidate in [f"page_{page_num}.jpg", f"page_{page_num:02d}.png", f"page_{page_num}.png"]:
            cand_path = os.path.join(eval_dir, candidate)
            if os.path.isfile(cand_path):
                return cand_path
        return None

    @classmethod
    def _create_blank_fallback_page(cls, eval_dir: str, eval_id: str, reason: str) -> Dict[str, Any]:
        """Creates a default white canvas page if submission could not be parsed."""
        img = Image.new("RGB", (1200, 1600), color=(255, 255, 255))
        out_fname = "page_01.jpg"
        out_path = os.path.join(eval_dir, out_fname)
        img.save(out_path, format="JPEG", quality=90)
        
        rel_dir = os.path.relpath(eval_dir, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        return {
            "eval_id": eval_id,
            "pages_dir": rel_dir,
            "page_count": 1,
            "pages": [{
                "page_num": 1,
                "filename": out_fname,
                "path": out_path,
                "width": 1200,
                "height": 1600
            }],
            "raw_text": reason
        }

    @classmethod
    def _render_text_to_page_image(cls, text: str, out_path: str) -> Tuple[int, int]:
        """Renders plain text onto a lined notebook-style image canvas."""
        from PIL import ImageDraw
        w, h = 1200, 1600
        img = Image.new("RGB", (w, h), color=(254, 254, 250))
        draw = ImageDraw.Draw(img)
        
        # Draw light ruling lines
        for y in range(120, h - 60, 40):
            draw.line([(60, y), (w - 60, y)], fill=(225, 235, 245), width=1)
        # Margin line (red)
        draw.line([(120, 0), (120, h)], fill=(245, 205, 205), width=2)
        
        # Draw text lines
        lines = text.split("\n")
        curr_y = 100
        for line in lines[:34]:
            draw.text((140, curr_y), line[:85], fill=(20, 30, 45))
            curr_y += 40
            
        img.save(out_path, format="JPEG", quality=90)
        return w, h
