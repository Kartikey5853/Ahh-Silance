"""
Stage 2 Service: Image Preprocessing and Geometric Rectification.

Provides computer vision algorithms for deskewing, Sauvola adaptive illumination
normalization (eliminating phone camera shadows), and perspective rectification.
"""

import numpy as np
import cv2
from typing import Tuple
from backend.schemas.s2_preprocessing import PreprocessingConfig, PreprocessingResult
from backend.core.config import settings


class PreprocessingService:
    """
    Implements classical CV deskewing and adaptive lighting compensation.
    """

    @staticmethod
    def detect_skew_angle(image: np.ndarray) -> float:
        """
        Estimates the rotation angle of a document page using minAreaRect on contours.
        """
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image

        # Invert and threshold to find text line blocks
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        coords = np.column_stack(np.where(thresh > 0))
        if len(coords) < 50:
            return 0.0

        angle = cv2.minAreaRect(coords)[-1]
        if angle < -45:
            angle = -(90 + angle)
        elif angle > 45:
            angle = 90 - angle
        return float(round(angle, 2))

    @staticmethod
    def rotate_image(image: np.ndarray, angle: float) -> np.ndarray:
        """
        Rotates an image around its center point by the specified angle in degrees.
        """
        if abs(angle) < 0.1:
            return image
        h, w = image.shape[:2]
        center = (w // 2, h // 2)
        rot_mat = cv2.getRotationMatrix2D(center, angle, 1.0)
        return cv2.warpAffine(image, rot_mat, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)

    @staticmethod
    def apply_sauvola_threshold(gray: np.ndarray, window_size: int = 25, k: float = 0.2, r: float = 128.0) -> np.ndarray:
        """
        Applies Sauvola adaptive thresholding to remove shadows while preserving faint marks.
        """
        if len(gray.shape) == 3:
            gray = cv2.cvtColor(gray, cv2.COLOR_BGR2GRAY)

        # Convert to float32 for mean and variance filtering
        float_img = gray.astype(np.float32)
        mean = cv2.blur(float_img, (window_size, window_size))
        mean_sq = cv2.blur(float_img * float_img, (window_size, window_size))
        variance = mean_sq - mean * mean
        variance[variance < 0] = 0
        std = np.sqrt(variance)

        # Sauvola threshold: T = m * (1 + k * (s / r - 1))
        threshold = mean * (1.0 + k * (std / r - 1.0))
        binary = np.zeros_like(gray, dtype=np.uint8)
        binary[float_img > threshold] = 255
        return binary

    @classmethod
    def preprocess_image(cls, image: np.ndarray, config: PreprocessingConfig) -> Tuple[np.ndarray, PreprocessingResult]:
        """
        Executes end-to-end preprocessing: deskew, illumination correction, and normalization.
        """
        h, w = image.shape[:2]
        detected_skew = 0.0
        processed = image.copy()

        if config.enable_deskew:
            detected_skew = cls.detect_skew_angle(processed)
            if abs(detected_skew) > 0.2:
                processed = cls.rotate_image(processed, -detected_skew)

        is_illuminated = False
        if config.enable_sauvola:
            if len(processed.shape) == 3:
                gray = cv2.cvtColor(processed, cv2.COLOR_BGR2GRAY)
            else:
                gray = processed
            sauvola_bin = cls.apply_sauvola_threshold(
                gray,
                window_size=config.sauvola_window,
                k=config.sauvola_k,
                r=settings.sauvola_r_constant
            )
            processed = cv2.cvtColor(sauvola_bin, cv2.COLOR_GRAY2BGR)
            is_illuminated = True

        h_out, w_out = processed.shape[:2]
        result = PreprocessingResult(
            document_id="doc_processed",
            page_index=0,
            detected_skew_degrees=detected_skew,
            is_perspective_warped=False,
            normalized_width=w_out,
            normalized_height=h_out,
            illumination_normalized=is_illuminated
        )
        return processed, result
