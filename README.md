# 🌕 Lunar Subsurface Ice Detection, Landing Site Selection, & Rover Traverse Planning System
## 🚀 Chandrayaan-2 Radar (DFSAR) & Imagery (OHRC) Geospatial Analytics Platform

[![Python PyTest](https://img.shields.io/badge/Python-3.14--PyTest-green?logo=python)](file:///c:/Users/ASUS/Desktop/New%20folder%20(2)/LUNAR-SUBSURFACE-ICE-DETECTION-SYSTEM/ml_pipeline)
[![Backend Vitest](https://img.shields.io/badge/Node.js-18--Vitest-blue?logo=nodedotjs)](file:///c:/Users/ASUS/Desktop/New%20folder%20(2)/LUNAR-SUBSURFACE-ICE-DETECTION-SYSTEM/backend)
[![Frontend React](https://img.shields.io/badge/React-18--TypeScript-cyan?logo=react)](file:///c:/Users/ASUS/Desktop/New%20folder%20(2)/LUNAR-SUBSURFACE-ICE-DETECTION-SYSTEM/frontend)
[![PostGIS Database](https://img.shields.io/badge/PostGIS-16--3.4-blue?logo=postgresql)](file:///c:/Users/ASUS/Desktop/New%20folder%20(2)/LUNAR-SUBSURFACE-ICE-DETECTION-SYSTEM/database)

This repository hosts a production-grade, enterprise-scale full-stack platform designed for the **ISRO ANTARIKSH Hackathon (Problem Statement 8)**. The system enables planetary scientists, geologists, and mission planners to detect subsurface water-ice in the lunar South Polar permanently shadowed regions (PSRs), characterize doubly shadowed craters, evaluate landing site safety via multi-objective optimization, and plan optimal energy-constrained rover traverse paths.

---

## 🗺️ Architectural Overview

```
                      +---------------------------------------+
                      |         Nginx Reverse Proxy           |
                      |            (Port: 80)                 |
                      +---+-------------------------------+---+
                          |                               |
        (Web Client Traffic)                     (REST / WebSocket API)
                          v                               v
            +-------------+-------------+   +-------------+-------------+
            |      React Frontend       |   |       Express Backend       |
            |     (Single Page App)     |   |    (JWT Auth, REST, WS)     |
            |        (Port: 8080)       |   |        (Port: 3000)       |
            +---------------------------+   +---+---+---------------+---+
                                                |   |               |
                                    +-----------+   |               +-----------+
                                    |               |                           |
                                    v               v                           v
                      +-------------+---+   +-------+-------+             +-----+-----+
                      |    PostgreSQL   |   |  Redis Cache  |             | RabbitMQ  |
                      |   (With PostGIS) |   | (Task State)  |             | (Broker)  |
                      |    (Port: 5432) |   | (Port: 6379)  |             | (Port: 5672)
                      +-----------------+   +---------------+             +-----+-----+
                                                                                |
                                                                                | (Task Queue)
                                                                                v
                                                                          +-----+-----+
                                                                          | Celery Worker |
                                                                          | (FastAPI Core) |
                                                                          | Python Pipeline|
                                                                          +-----------+
```

---

## 🔬 Core Scientific Engines & Formulations

### 1. Polarimetric Radar Decomposition (DFSAR)
The platform processes Dual Frequency Synthetic Aperture Radar (DFSAR) L-band and S-band polarimetric products to resolve scattering mechanisms. The **Circular Polarization Ratio (CPR)** is computed from the backscatter cross-sections:

$$\text{CPR} = \frac{\sigma_{SC}}{\sigma_{OC}}$$

Where:
*   $\sigma_{SC}$ is the Same-Circular polarization backscatter power.
*   $\sigma_{OC}$ is the Opposite-Circular polarization backscatter power.

The **Degree of Polarization (DOP)** is extracted using the Stokes parameters:

$$\text{DOP} = \frac{\sqrt{S_1^2 + S_2^2 + S_3^2}}{S_0}$$

**Ice Detection Rule-Based Compliance**:
$$\text{Subsurface Ice Candidate} \iff \text{CPR} > 1.0 \quad \text{AND} \quad \text{DOP} < 0.13$$
This isolates volumetric Bragg scattering associated with clean subsurface ice inclusions from rocky terrain surface scattering (which exhibits high CPR with high DOP).

### 2. Subsurface Ice Volumetric Estimation (Top 5 Meters)
Using **Lichtenecker's Dielectric Mixing Formula**, the dielectric properties of dry lunar regolith mixed with water ice are calculated:

$$\varepsilon_{\text{mix}}^{\alpha} = f \cdot \varepsilon_{\text{ice}}^{\alpha} + (1 - f) \cdot \varepsilon_{\text{regolith}}^{\alpha}$$

Where:
*   $f$ is the volumetric ice fraction (concentration).
*   $\varepsilon_{\text{mix}}$ is the measured bulk dielectric constant (extracted from DFSAR amplitude/phase parameters).
*   $\varepsilon_{\text{ice}} \approx 3.15$ and $\varepsilon_{\text{regolith}} \approx 2.7$.
*   $\alpha \approx 0.5$ (refractive mixing limit).

The total subsurface reserve is estimated by:

$$\text{Ice Volume} (m^3) = \sum (\text{Pixel Area} \times \text{Depth} \times f)$$
$$\text{Ice Mass} (\text{metric tons}) = \text{Ice Volume} \times \rho_{\text{ice}}$$

### 3. Multi-Criteria Landing Site Selection
We rank illuminated ridges surrounding candidate PSRs (e.g., Faustini, Shackleton) using the **TOPSIS** (Technique for Order of Preference by Similarity to Ideal Solution) algorithm:

$$\text{Safety Score} = 0.7 \cdot S_{\text{slope}} + 0.3 \cdot S_{\text{boulders}}$$
$$\text{Proximity Score} = 1.0 - \left(\frac{D_{\text{ice}}}{D_{\text{max}}}\right)$$
$$\text{Combined Score} = 0.45 \cdot \text{Safety} + 0.30 \cdot \text{Proximity} + 0.25 \cdot \text{Solar Irradiance}$$

### 4. Energy-Constrained Rover Path Planning
The system executes a hybrid **A* and RRT* pathfinding algorithm** optimized over a 3D digital elevation model (DEM) and solar power grid:

$$\text{Path Cost} = \text{Distance} + w_1 \cdot \text{Slope Penalty} + w_2 \cdot \text{Boulder Hazard} + w_3 \cdot \text{Illumination Cost}$$

---

## 🛠️ Technology Stack

### Backend Services
*   **API Gateway & Web Sockets**: Node.js, Express, TypeScript, Socket.IO.
*   **Relational GIS Storage**: PostgreSQL 16 + PostGIS.
*   **Cache & Session Stores**: Redis.
*   **Asynchronous Message Broker**: RabbitMQ.

### ML & Scientific Pipeline
*   **Execution Worker**: Python 3.14 + Celery.
*   **Numerical & Geospatial Computing**: NumPy, SciPy, Pandas, GeoPandas, Rasterio, GDAL.
*   **Deep Learning & Ensembles**: PyTorch, XGBoost.

### Frontend Dashboard
*   **User Interface**: React 18, TypeScript, Vite, Tailwind CSS, ShadCN UI.
*   **Charts & Visuals**: Recharts (2D elevation profiles, polarimetric distributions), CesiumJS / Leaflet (GIS Map Viewports).
*   **State Management**: Zustand.

---

## 🐳 Docker Deployment Guide

The entire microservice architecture is orchestrated via Docker Compose.

### Prerequisites
*   Docker & Docker Compose installed.
*   Port `80`, `3000`, `3001`, `9090`, `5432`, `6379`, `5672` open.

### Quick Start Execution
1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/Daksh7785/LUNAR-SUBSURFACE-ICE-DETECTION-SYSTEM.git
    cd LUNAR-SUBSURFACE-ICE-DETECTION-SYSTEM
    ```
2.  **Build & Launch Containers**:
    ```bash
    docker-compose up --build -d
    ```
3.  **Verify Services Status**:
    ```bash
    docker-compose ps
    ```

### Accessible Endpoints
*   **Vite Client Application**: `http://localhost` (Routed via Nginx port 80)
*   **Express API Server**: `http://localhost/api/v1` (Proxied via Nginx)
*   **Celery Message Broker Dashboard**: `http://localhost:15672` (RabbitMQ Management, login: `guest`/`guest`)
*   **Prometheus Metrics Scraper**: `http://localhost:9090`
*   **Grafana Dashboards**: `http://localhost:3001` (login: `admin`/`admin`)

---

## 🧪 Verification & Test Suites

The project features a comprehensive test coverage suite (>85% target) verifying calculations, database queries, state stores, and machine learning estimators.

### 1. Python ML Engine (PyTest)
Validates Stokes polarimetric algorithms, RRT* rover waypoint routing, and Lichtenecker volumetric estimation.
```bash
# Execute ML tests locally
python -m pytest
```
*Result*:
```
ml_pipeline\tests\test_ice_detector.py ....                              [ 50%]
ml_pipeline\tests\test_landing_site.py ..                                [ 75%]
ml_pipeline\tests\test_path_planning.py ..                               [100%]
============================== 8 passed in 4.54s ==============================
```

### 2. Express Backend Gateway (Vitest + Supertest)
Verifies authentication JWT protocols, PostGIS spatial queries, and REST endpoint routes.
```bash
cd backend
npm run test
```
*Result*:
```
 ✓ tests/unit/services/iceDetectionService.test.ts  (4 tests)
 ✓ tests/integration/api/analysis.test.ts  (3 tests)
Test Files  2 passed (2)
     Tests  7 passed (7)
```

### 3. React Client Store (Vitest)
Ensures Zustand auth/project telemetry state sync, local storage persistence, and form constraints validation.
```bash
cd frontend
npm run test
```
*Result*:
```
 ✓ src/__tests__/authStore.test.ts  (4 tests)
 ✓ src/__tests__/projectStore.test.ts  (4 tests)
Test Files  2 passed (2)
     Tests  8 passed (8)
```

---

## 🔒 Security & SRE Compliance
*   **Input Validation**: Strict schema checks enforced on both HTTP request bodies and environment variables using **Zod**.
*   **OWASP Protections**: Helmet headers, rate limiting, and parameter sanitization middlewares are active on all REST routes.
*   **Docker Health Checks**: Automated interval pings verify the healthy startup of PostgreSQL, Redis, RabbitMQ, and Node.js backend services before routing live traffic.