import pytest
import numpy as np
from ml_pipeline.utils.landing_site import rank_landing_sites

class TestLandingSiteEnterpriseSuite:
    @pytest.fixture
    def mock_terrain_data(self):
        """Simulates OHRC slope, boulder density, ice distance, and solar irradiance arrays."""
        # 5 candidate landing zones along crater ridge
        slopes = np.array([5.2, 12.4, 3.1, 8.9, 15.0]) # in degrees (safe < 10.0)
        boulder_densities = np.array([0.02, 0.05, 0.01, 0.12, 0.20]) # area percentage
        ice_distances = np.array([1.2, 0.5, 2.8, 1.5, 0.3]) # in km
        solar_irradiances = np.array([0.85, 0.90, 0.95, 0.70, 0.60]) # normalized continuous illumination
        coordinates = [(-87.12, 42.10), (-87.13, 42.11), (-87.11, 42.09), (-87.14, 42.12), (-87.15, 42.13)]
        
        return slopes, boulder_densities, ice_distances, solar_irradiances, coordinates

    def test_rank_landing_sites_safety_enforcement(self, mock_terrain_data):
        """
        Verifies that candidate landing zones with slope > 10 degrees or excessive boulders
        are appropriately penalized or filtered out, prioritizing safe, highly illuminated sites.
        """
        slopes, boulder_densities, ice_distances, solar_irradiances, coordinates = mock_terrain_data
        
        # Call ranking utility
        ranked_sites = rank_landing_sites(slopes, boulder_densities, ice_distances, solar_irradiances, coordinates)
        
        # Verify output structure
        assert len(ranked_sites) > 0, "Failed to return ranked landing sites"
        
        # The top ranked site must be safe (slope <= 10.0)
        top_site = ranked_sites[0]
        assert top_site['slope'] <= 10.0, f"Top ranked landing site has dangerous slope: {top_site['slope']}"
        assert top_site['boulder_density'] <= 0.05, f"Top ranked landing site has excessive boulders: {top_site['boulder_density']}"
        assert top_site['score'] > 0.5, f"Top ranked site has unexpectedly low score: {top_site['score']}"

        # Ensure high slope sites (12.4 and 15.0) are ranked lower or excluded
        for site in ranked_sites:
            if site['slope'] > 10.0:
                assert site['score'] < top_site['score'], "Dangerous slope site scored higher than safe site"

    def test_boundary_and_malformed_arrays(self):
        """Ensures the decision matrix handles mismatched shapes or empty lists gracefully."""
        with pytest.raises((ValueError, IndexError, TypeError)):
            # Mismatched array dimensions
            rank_landing_sites(np.array([5.0]), np.array([0.01, 0.02]), np.array([1.0]), np.array([0.9]), [(-87.1, 42.1)])

        with pytest.raises((ValueError, TypeError)):
            rank_landing_sites(np.array([]), np.array([]), np.array([]), np.array([]), [])
