# 📂 Chandrayaan-2 Mock & Sample Datasets
## 🌕 DFSAR Polarimetric & OHRC Optical Ingestion Templates

This directory contains simulated lunar polar scientific datasets to demonstrate ingestion pipelines, radar calculations (CPR, DOP, Stokes scattering), and U-Net semantic segmentation pipelines.

### 📋 Sample Data Inventory

1. **`faustini_dfsar_stokes.csv`**:
   - Contains 100 simulated spatial pixel locations across the Faustini Permanently Shadowed Region (PSR) floor and illuminated rims.
   - **Headers**:
     * `latitude`: Decimal latitude coordinates near South Pole (typically $-88.5^\circ$ to $-87^\circ$).
     * `longitude`: Decimal longitude coordinates ($0^\circ$ to $360^\circ$).
     * `cpr`: Circular Polarization Ratio ($\text{CPR} = \text{Same-Circular} / \text{Opposite-Circular}$).
     * `dop`: Degree of Polarization.
     * `m_chi`: Backscatter entropy decomposition metric.
     * `slope`: Local gradient slope in degrees.
     * `temp`: Thermal surface environment value (Kelvin).
     * `roughness`: RMS roughness parameter derived from high-res optical profiles.
     * `albedo`: Optical reflectivity index from OHRC.

2. **`faustini_ohrc_metadata.json`**:
   - Simulated metadata block matching actual ISRO ISSDC (Indian Space Science Data Centre) PDS4 product structures.
   - Documenting sensor resolution, incident angle, sun azimuth, orbit index, and bounding geometry parameters.

---

### 📡 Data Format and Standard Ranges

*   **CPR (Circular Polarization Ratio)**:
    *   *Dry Regolith / Background*: $0.15 \le \text{CPR} \le 0.45$
    *   *Rough / Rocky Slopes (Crater Ejecta)*: $0.6 \le \text{CPR} \le 1.8$ (with high DOP > 0.3)
    *   *Subsurface Volumetric Ice*: $\text{CPR} > 1.0$ (with low DOP < 0.13)
*   **DOP (Degree of Polarization)**:
    *   *Surface Scattering*: $0.4 \le \text{DOP} \le 0.85$
    *   *Volumetric Ice Multiple Scattering*: $\text{DOP} < 0.13$
