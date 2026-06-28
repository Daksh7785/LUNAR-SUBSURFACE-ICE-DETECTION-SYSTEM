import pytest
import numpy as np
import torch
from ml_pipeline.models.ice_detector import IceDetector

class TestIceDetectorEnterpriseSuite:
    @pytest.fixture
    def detector(self):
        # Initialize the Hybrid PyTorch + XGBoost IceDetector
        return IceDetector(input_dim=7)

    def test_detector_initialization(self, detector):
        """Asserts correct instantiation of neural network layers and feature dimensions."""
        assert detector.input_dim == 7
        assert detector.nn_model is not None
        assert detector.xgb_model is not None

    def test_cpr_and_dop_exact_criteria_compliance(self, detector):
        """
        Validates that the classifier absolutely honors CPR > 1.0 and DOP < 0.13
        as required by ISRO Problem Statement 8.
        Input feature vector definition: [CPR, DOP, m_chi, slope, temp, roughness, albedo]
        """
        # Case 1: Pure subsurface ice signature (CPR > 1.0, DOP < 0.13, low temp, flat slope)
        ice_vector = np.array([[1.45, 0.08, 0.75, 5.2, 85.0, 0.02, 0.45]])
        
        # Case 2: Rough rocky regolith (CPR > 1.0, but high DOP > 0.13, high roughness)
        rocky_vector = np.array([[1.35, 0.28, 0.20, 18.5, 110.0, 0.15, 0.18]])
        
        # Case 3: Flat smooth regolith (CPR < 1.0, high DOP, normal lunar temp)
        regolith_vector = np.array([[0.45, 0.35, 0.10, 2.1, 220.0, 0.01, 0.12]])

        predictions_ice = detector.predict(ice_vector)
        predictions_rocky = detector.predict(rocky_vector)
        predictions_regolith = detector.predict(regolith_vector)

        # Ice vector must be classified as 1 (Ice)
        assert predictions_ice[0] == 1, "Failed to classify valid CPR > 1.0 & DOP < 0.13 as Ice"
        
        # Rocky and regolith vectors must be classified as 0 (No Ice)
        assert predictions_rocky[0] == 0, "False positive on rough rock with DOP >= 0.13"
        assert predictions_regolith[0] == 0, "False positive on standard smooth regolith"

    def test_top_5m_subsurface_ice_volume_estimation(self, detector):
        """
        Verifies the volumetric ice calculation based on Lichtenecker's dielectric mixing model.
        Assumes 30m x 30m pixels (900 m^2) and 5m depth.
        """
        # Simulate a grid of 10x10 radar pixels (100 pixels total)
        # 40 pixels have positive ice detections with varying backscatter m-chi
        features = np.zeros((100, 7))
        # Set 40 pixels to valid ice parameters
        features[:40, 0] = 1.35 # CPR > 1.0
        features[:40, 1] = 0.09 # DOP < 0.13
        features[:40, 2] = np.linspace(0.5, 0.9, 40) # m-chi backscatter decomposition
        features[:40, 3] = 4.0  # low slope
        features[:40, 4] = 90.0 # cryogenic temp
        features[:40, 5] = 0.02 # low roughness
        features[:40, 6] = 0.35 # ice albedo

        # Calculate volume
        volume_m3, volume_km3, avg_conc = detector.estimate_ice_volume(features)

        # Mathematical sanity checks
        # Total area of 40 pixels = 40 * 900 m^2 = 36,000 m^2
        # Depth = 5m -> Total regolith volume for ice pixels = 180,000 m^3
        # With avg concentration around 50-80%, volume_m3 should be between 90,000 and 150,000 m^3
        assert 90000 <= volume_m3 <= 150000, f"Volumetric estimation {volume_m3} out of expected physics bounds"
        assert volume_km3 == pytest.approx(volume_m3 / 1e9, rel=1e-5), "km3 conversion mismatch"
        assert 0.4 <= avg_conc <= 0.9, "Average concentration out of bounds"

    def test_invalid_and_empty_inputs(self, detector):
        """Asserts robust error handling when passing empty or malformed arrays."""
        with pytest.raises((ValueError, TypeError)):
            detector.predict(np.array([]))
        
        with pytest.raises((ValueError, TypeError)):
            # Wrong feature dimension (5 instead of 7)
            detector.predict(np.zeros((10, 5)))
