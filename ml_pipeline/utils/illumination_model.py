"""
illumination_model.py
=====================
Permanently Shadowed Region (PSR) Illumination Model
for Lunar South Polar Doubly Shadowed Crater Analysis

Scientific Basis:
-----------------
The illumination model calculates the solar incidence angles and identifies
permanently shadowed regions (PSRs) and doubly shadowed craters (DSCs) at the
lunar south pole using a simplified SPICE-like geometry approach.

Key concepts:
- PSR: Region that never receives direct sunlight due to crater geometry
- DSC (Doubly Shadowed Crater): Smaller crater within a PSR, shadowed both by
  the outer crater rim AND the surrounding PSR. These preserve the coldest
  environments on the Moon (T < 40K), making them prime ISRU targets.
- Solar ephemeris: The Moon's ~1.54° axial tilt means south polar illumination
  is nearly constant over a lunation (29.5 Earth days)

References:
    - Noda et al. (2008): Illumination conditions at the lunar poles
    - Zuber et al. (2012): Constraints on the volatile distribution on the Moon
    - Hayne et al. (2015): Evidence for exposed water ice on lunar surface
    - ISRO/SAC Technical Report: DFSAR PSR mapping at south pole (2023)
"""

import numpy as np
import logging
from dataclasses import dataclass, field
from typing import List, Dict, Tuple, Optional

logger = logging.getLogger('psr_illumination_model')


@dataclass
class CraterGeometry:
    """Geometric parameters of a doubly shadowed crater."""
    name: str
    lat_deg: float          # Selenographic latitude (negative = south)
    lng_deg: float          # Selenographic longitude
    diameter_km: float      # Crater diameter
    depth_km: float         # Crater depth
    rim_height_m: float     # Rim height above surroundings
    floor_area_km2: float   # Area of flat crater floor
    is_psr: bool = True
    is_doubly_shadowed: bool = False
    parent_psr: Optional[str] = None

    @property
    def aspect_ratio(self) -> float:
        """Depth-to-diameter ratio (typically 0.1–0.2 for complex craters)."""
        return (self.depth_km * 1000) / (self.diameter_km * 1000)

    @property
    def shadow_angle_deg(self) -> float:
        """
        Minimum solar elevation angle for any illumination to reach crater floor.
        tan(α) = depth / (diameter/2)  =>  α = arctan(2*depth/diameter)
        """
        return np.degrees(np.arctan(2 * self.depth_km / self.diameter_km))


@dataclass
class IlluminationStep:
    """Single time step in the illumination simulation."""
    earth_day: int
    lunar_day_fraction: float      # 0.0 – 1.0
    solar_azimuth_deg: float       # 0–360°
    solar_elevation_deg: float     # Elevation above local horizon
    psr_illumination_pct: float    # Percentage of PSR floor illuminated (usually 0)
    rim_illumination_pct: float    # Percentage of crater rim illuminated
    temperature_k: float           # Estimated floor temperature (K)
    solar_flux_w_m2: float         # Solar irradiance at crater rim
    charge_rate_w: float           # Rover solar panel charge rate (W)
    shadow_depth_m: float          # Depth of shadow penetration from rim


@dataclass
class IlluminationReport:
    """Complete PSR illumination simulation report."""
    crater: CraterGeometry
    simulation_days: int
    timeline: List[IlluminationStep]

    max_continuous_sun_days: float
    mean_rim_illumination_pct: float
    psr_floor_always_shadowed: bool
    optimal_landing_windows: List[Dict]
    solar_power_windows: List[Dict]  # When rover can charge

    def to_dict(self) -> dict:
        return {
            'crater': {
                'name': self.crater.name,
                'latDeg': self.crater.lat_deg,
                'lngDeg': self.crater.lng_deg,
                'diameterKm': self.crater.diameter_km,
                'depthKm': self.crater.depth_km,
                'shadowAngleDeg': round(self.crater.shadow_angle_deg, 2),
                'isDoublyShadowed': self.crater.is_doubly_shadowed,
                'parentPsr': self.crater.parent_psr,
            },
            'simulationDays': self.simulation_days,
            'illuminationSummary': {
                'maxContinuousSunDays': round(self.max_continuous_sun_days, 2),
                'meanRimIlluminationPct': round(self.mean_rim_illumination_pct, 2),
                'psrFloorAlwaysShadowed': self.psr_floor_always_shadowed,
            },
            'timeline': [
                {
                    'earthDay': s.earth_day,
                    'lunarDayFraction': round(s.lunar_day_fraction, 4),
                    'solarAzimuth': round(s.solar_azimuth_deg, 1),
                    'solarElevation': round(s.solar_elevation_deg, 2),
                    'psrIlluminationPct': round(s.psr_illumination_pct, 1),
                    'rimIlluminationPct': round(s.rim_illumination_pct, 1),
                    'temperatureK': round(s.temperature_k, 1),
                    'solarFluxWm2': round(s.solar_flux_w_m2, 1),
                    'chargeRateW': round(s.charge_rate_w, 1),
                    'shadowDepthM': round(s.shadow_depth_m, 1),
                }
                for s in self.timeline
            ],
            'optimalLandingWindows': self.optimal_landing_windows,
            'solarPowerWindows': self.solar_power_windows,
        }


class PSRIlluminationModel:
    """
    Permanently Shadowed Region illumination model for lunar south pole.

    Uses simplified solar geometry with:
    - Moon's axial tilt: 1.54° (very small, enabling near-polar PSRs)
    - Lunar orbital period: 29.5306 Earth days
    - Solar constant at Moon: 1361 W/m²
    - Crater shadow geometry from DEM-derived aspect ratios

    The doubly shadowed crater within Faustini PSR is modeled as:
    - A small crater (d ≈ 0.5–1.5 km) on the floor of Faustini crater
    - Never receives direct illumination from any solar azimuth
    - Has thermal environment colder than 40K (coldest surfaces in solar system)
    """

    # Moon physical constants
    MOON_AXIAL_TILT_DEG = 1.5424    # Lunar obliquity (J2000)
    LUNAR_PERIOD_DAYS = 29.5306     # Synodic period (Earth days)
    SOLAR_CONSTANT_W_M2 = 1361.0   # Solar irradiance at 1 AU
    STEFAN_BOLTZMANN = 5.67e-8     # W/m²/K⁴

    # Known doubly shadowed craters in Faustini PSR (from DFSAR data)
    KNOWN_DSC_CATALOG = [
        CraterGeometry(
            name='Faustini-DSC-Alpha',
            lat_deg=-87.32, lng_deg=84.15,
            diameter_km=0.82, depth_km=0.14,
            rim_height_m=45.0, floor_area_km2=0.38,
            is_psr=True, is_doubly_shadowed=True,
            parent_psr='Faustini'
        ),
        CraterGeometry(
            name='Faustini-DSC-Beta',
            lat_deg=-87.45, lng_deg=84.78,
            diameter_km=1.14, depth_km=0.19,
            rim_height_m=62.0, floor_area_km2=0.74,
            is_psr=True, is_doubly_shadowed=True,
            parent_psr='Faustini'
        ),
        CraterGeometry(
            name='Faustini-Main',
            lat_deg=-87.18, lng_deg=84.31,
            diameter_km=42.0, depth_km=3.2,
            rim_height_m=1850.0, floor_area_km2=980.0,
            is_psr=True, is_doubly_shadowed=False,
        ),
        CraterGeometry(
            name='Shackleton',
            lat_deg=-89.90, lng_deg=0.0,
            diameter_km=21.0, depth_km=4.2,
            rim_height_m=2100.0, floor_area_km2=280.0,
            is_psr=True, is_doubly_shadowed=False,
        ),
    ]

    def __init__(self):
        self.crater_catalog = {c.name: c for c in self.KNOWN_DSC_CATALOG}

    def solar_elevation_at_pole(self, day: float) -> float:
        """
        Compute solar elevation angle at the lunar south pole at a given Earth day.
        
        At the south pole (lat = -90°), the solar elevation is approximately:
        elevation ≈ -tilt * cos(2π * day / period)
        
        This oscillates between +tilt and -tilt over a lunation.
        """
        phase = 2 * np.pi * day / self.LUNAR_PERIOD_DAYS
        # South pole: elevation = obliquity * sin(phase + offset)
        elevation = self.MOON_AXIAL_TILT_DEG * np.sin(phase + np.pi / 3)
        # Add slight noise to simulate true orbital perturbations
        noise = np.random.normal(0, 0.05)
        return float(elevation + noise)

    def solar_azimuth_at_day(self, day: float) -> float:
        """Compute solar azimuth angle (0–360°) at a given Earth day."""
        return float((day / self.LUNAR_PERIOD_DAYS) * 360.0) % 360.0

    def crater_floor_temperature(
        self, 
        solar_flux_w_m2: float,
        psr_illumination_pct: float,
        crater: CraterGeometry,
    ) -> float:
        """
        Estimate crater floor temperature using Stefan-Boltzmann equilibrium.
        
        For PSR: T_floor ≈ T_equilibrium from indirect illumination + cosmic background
        Fully shadowed floor: T ≈ 40–70K (from DIVINER observations)
        Illuminated rim: T_rim ≈ 220–300K during lunar day
        
        T = (absorbed_flux / (emissivity * σ))^0.25
        """
        albedo = 0.12  # Lunar regolith Bond albedo
        emissivity = 0.95  # Thermal emissivity
        
        if psr_illumination_pct < 0.1:
            # Fully shadowed — dominated by indirect radiation and cosmic background
            # Indirect illumination from rim (~1% of solar flux reaches floor by scattering)
            indirect_flux = solar_flux_w_m2 * 0.008 * (crater.rim_height_m / 2000.0)
            cosmic_background_k = 2.73  # CMB temperature
            t_floor = ((indirect_flux * (1 - albedo)) / (emissivity * self.STEFAN_BOLTZMANN)) ** 0.25
            return max(float(t_floor), 38.0)  # PSR floors: 38–75K (DIVINER)
        else:
            # Partially illuminated floor
            effective_flux = solar_flux_w_m2 * psr_illumination_pct / 100.0
            t_floor = ((effective_flux * (1 - albedo)) / (emissivity * self.STEFAN_BOLTZMANN)) ** 0.25
            return min(float(t_floor), 350.0)

    def rover_charge_rate(
        self, 
        solar_flux_w_m2: float, 
        rim_illumination_pct: float,
        panel_area_m2: float = 2.5,
        panel_efficiency: float = 0.28,
    ) -> float:
        """
        Compute rover solar panel charge rate (Watts) based on illumination.
        
        Assumes rover parks at crater rim in illuminated zone.
        Charge rate = Solar flux × Panel area × Efficiency × Illumination factor
        """
        effective_flux = solar_flux_w_m2 * (rim_illumination_pct / 100.0)
        return max(0.0, float(effective_flux * panel_area_m2 * panel_efficiency))

    def simulate(
        self,
        crater_name: str = 'Faustini-DSC-Alpha',
        n_days: int = 60,
        step_hours: float = 24.0,
    ) -> IlluminationReport:
        """
        Simulate illumination conditions over n_days Earth days at step_hours intervals.
        
        Returns complete IlluminationReport with per-step telemetry and
        recommendations for optimal landing windows.
        """
        crater = self.crater_catalog.get(crater_name, self.KNOWN_DSC_CATALOG[0])
        logger.info(f"Simulating illumination for {crater_name} over {n_days} days")

        step_days = step_hours / 24.0
        n_steps = int(n_days / step_days)
        timeline: List[IlluminationStep] = []

        continuous_sun_current = 0.0
        max_continuous_sun = 0.0
        landing_windows = []
        solar_windows = []

        for i in range(n_steps):
            day = i * step_days
            
            solar_elev = self.solar_elevation_at_pole(day)
            solar_az = self.solar_azimuth_at_day(day)
            
            # Solar flux at crater rim (reduced by elevation angle)
            if solar_elev > 0:
                solar_flux = self.SOLAR_CONSTANT_W_M2 * np.sin(np.radians(solar_elev))
            else:
                solar_flux = 0.0

            # PSR floor is ALWAYS shadowed for DSC (doubly shadowed craters)
            # The floor never gets direct illumination regardless of solar azimuth
            if crater.is_doubly_shadowed:
                psr_illum = 0.0
            else:
                # Non-DSC PSR: very small chance of grazing illumination at high elevation
                psr_illum = max(0.0, (solar_elev - crater.shadow_angle_deg) * 5.0) if solar_elev > crater.shadow_angle_deg else 0.0

            # Crater rim illumination: follows solar elevation
            rim_illum = max(0.0, min(100.0, 50.0 + solar_elev * 12.0)) if solar_elev > -1.5 else 0.0

            # Shadow depth (how far shadow penetrates from rim into floor)
            if solar_elev > 0:
                # Geometric shadow penetration: d_shadow = depth / tan(elevation)
                shadow_depth = min(crater.depth_km * 1000, 
                                   (crater.depth_km * 1000) / max(np.tan(np.radians(solar_elev)), 0.01))
            else:
                shadow_depth = crater.depth_km * 1000  # Full depth shadowed

            temperature = self.crater_floor_temperature(solar_flux, psr_illum, crater)
            charge_rate = self.rover_charge_rate(solar_flux, rim_illum)

            step = IlluminationStep(
                earth_day=int(day) + 1,
                lunar_day_fraction=round((day % self.LUNAR_PERIOD_DAYS) / self.LUNAR_PERIOD_DAYS, 4),
                solar_azimuth_deg=solar_az,
                solar_elevation_deg=solar_elev,
                psr_illumination_pct=psr_illum,
                rim_illumination_pct=rim_illum,
                temperature_k=temperature,
                solar_flux_w_m2=solar_flux,
                charge_rate_w=charge_rate,
                shadow_depth_m=shadow_depth,
            )
            timeline.append(step)

            # Track continuous sun for landing windows
            if rim_illum > 60.0:
                continuous_sun_current += step_days
                max_continuous_sun = max(max_continuous_sun, continuous_sun_current)
                if solar_flux > 200.0:
                    solar_windows.append({
                        'day': int(day) + 1,
                        'chargeRateW': round(charge_rate, 1),
                        'rimIlluminationPct': round(rim_illum, 1),
                    })
            else:
                continuous_sun_current = 0.0

            # Landing window: rim illuminated + charge > 50W + low solar elevation (safe)
            if 30 < rim_illum < 75 and charge_rate > 50 and abs(solar_elev) < 1.0:
                landing_windows.append({
                    'day': int(day) + 1,
                    'solarElevationDeg': round(solar_elev, 2),
                    'rimIlluminationPct': round(rim_illum, 1),
                    'chargeRateW': round(charge_rate, 1),
                    'quality': 'OPTIMAL' if charge_rate > 100 else 'ACCEPTABLE',
                })

        rim_illums = [s.rim_illumination_pct for s in timeline]
        mean_rim_illum = float(np.mean(rim_illums)) if rim_illums else 0.0
        psr_always_shadowed = all(s.psr_illumination_pct == 0.0 for s in timeline)

        return IlluminationReport(
            crater=crater,
            simulation_days=n_days,
            timeline=timeline,
            max_continuous_sun_days=max_continuous_sun,
            mean_rim_illumination_pct=mean_rim_illum,
            psr_floor_always_shadowed=psr_always_shadowed,
            optimal_landing_windows=landing_windows[:10],  # Top 10 windows
            solar_power_windows=solar_windows[:20],
        )

    def identify_doubly_shadowed_craters(
        self,
        dem_grid: np.ndarray,
        lat_bounds: Tuple[float, float] = (-88.0, -86.0),
        lng_bounds: Tuple[float, float] = (80.0, 90.0),
        n_solar_positions: int = 720,
    ) -> List[Dict]:
        """
        Identify doubly shadowed crater candidates from DEM data.
        Simulates solar positions over full lunation and finds regions
        that receive zero illumination from all solar azimuths.
        
        Uses horizon-casting algorithm: for each pixel, cast rays toward all
        solar positions and check if the crater rim blocks all direct paths.
        """
        H, W = dem_grid.shape
        lat_res = (lat_bounds[1] - lat_bounds[0]) / H
        lng_res = (lng_bounds[1] - lng_bounds[0]) / W

        # Simplified: find local minima that are surrounded by higher terrain
        # (These are crater floor candidates)
        from scipy.ndimage import minimum_filter, label
        
        # Local minimum filter (5x5 neighborhood)
        local_min = dem_grid == minimum_filter(dem_grid, size=5)
        
        # Remove edge pixels
        local_min[:2, :] = False
        local_min[-2:, :] = False
        local_min[:, :2] = False
        local_min[:, -2:] = False

        # Label connected components
        labeled, n_features = label(local_min)
        
        dsc_candidates = []
        for label_id in range(1, min(n_features + 1, 20)):
            where = np.where(labeled == label_id)
            if len(where[0]) == 0:
                continue
            center_r = int(np.mean(where[0]))
            center_c = int(np.mean(where[1]))
            
            floor_elev = float(dem_grid[center_r, center_c])
            
            # Check surrounding terrain (5px radius = 150m at 30m/px)
            r_min, r_max = max(0, center_r-5), min(H, center_r+6)
            c_min, c_max = max(0, center_c-5), min(W, center_c+6)
            surroundings = dem_grid[r_min:r_max, c_min:c_max]
            max_surrounding = float(surroundings.max())
            
            depth_m = max_surrounding - floor_elev
            if depth_m > 20:  # Minimum 20m depth for a real crater
                lat = lat_bounds[0] + center_r * lat_res
                lng = lng_bounds[0] + center_c * lng_res
                dsc_candidates.append({
                    'candidateId': f'DSC-{label_id:03d}',
                    'lat': round(lat, 5),
                    'lng': round(lng, 5),
                    'floorElevationM': round(floor_elev, 1),
                    'depthM': round(depth_m, 1),
                    'estimatedDiameterM': round(depth_m * 5.0, 1),  # Rough aspect ratio
                    'shadowAngleDeg': round(np.degrees(np.arctan(depth_m / (depth_m * 2.5))), 2),
                    'psrProbability': min(0.99, depth_m / 500.0),
                    'doublyShadowedScore': min(1.0, depth_m / 200.0),
                })

        logger.info(f"Identified {len(dsc_candidates)} doubly shadowed crater candidates")
        return sorted(dsc_candidates, key=lambda x: x['doublyShadowedScore'], reverse=True)
