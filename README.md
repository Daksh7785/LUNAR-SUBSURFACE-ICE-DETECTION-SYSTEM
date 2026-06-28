<div align="center">

<img src="https://img.shields.io/badge/ISRO-LUPEX%20Mission-orange?style=for-the-badge&logo=rocket&logoColor=white" />
<img src="https://img.shields.io/badge/Chandrayaan--2-DFSAR%20%7C%20OHRC-blue?style=for-the-badge&logo=satellite&logoColor=white" />
<img src="https://img.shields.io/badge/Status-Mission%20Ready-brightgreen?style=for-the-badge" />
<img src="https://img.shields.io/badge/License-MIT-cyan?style=for-the-badge" />

# 🌕 LUNAR SUBSURFACE ICE DETECTION SYSTEM

### *ISRO LUPEX — Chandrayaan-2 South Pole Resource Mapping & Rover Navigation Platform*

> **A production-grade full-stack mission-control application** for detecting water-ice deposits in Lunar Permanently Shadowed Regions (PSRs) using Chandrayaan-2 DFSAR polarimetric radar data — built for the **ISRO LUPEX Hackathon Problem Statement 8**.

<br/>

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python)](https://python.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%20+%20PostGIS-336791?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Three.js](https://img.shields.io/badge/Three.js-r165-black?style=flat-square&logo=three.js)](https://threejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker)](https://docker.com/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Ready-326CE5?style=flat-square&logo=kubernetes)](https://kubernetes.io/)

</div>

---

## 📡 Mission Overview

The **Lunar Subsurface Ice Detection System (LSIDS)** is a mission-critical full-stack platform designed to support ISRO's upcoming **LUPEX (Lunar Polar Exploration)** mission. The system processes Chandrayaan-2 **DFSAR (Dual-frequency Synthetic Aperture Radar)** and **OHRC (Orbiter High Resolution Camera)** datasets to identify, quantify, and visualize subsurface water-ice deposits at the **lunar south pole**.

### 🎯 Science Objectives

| Objective | Method | Metric |
|-----------|--------|--------|
| Detect subsurface water-ice | Circular Polarization Ratio (CPR) thresholding | CPR > 1.0 (clean ice signature) |
| Estimate volumetric ice concentration | Dielectric mixing model (ε_mix = f·ε_ice + (1-f)·ε_regolith) | % concentration per pixel |
| Identify landing zones | Multi-criteria scoring (safety + solar + ice proximity) | Combined score 0–1 |
| Plan rover traversal | RRT* path optimization on slope/hazard maps | Distance, energy, time |
| Quantify volatile resources | PSR-constrained volume integration | m³ / km² |

---

## 🛰️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    LUPEX MISSION CONTROL PLATFORM                    │
│                                                                       │
│  ┌──────────────────────┐        ┌────────────────────────────────┐  │
│  │   React 18 Frontend  │◄──────►│     Node.js / Express API      │  │
│  │   Vite + TypeScript  │  HTTP  │   TypeScript · JWT Auth        │  │
│  │   Three.js (WebGL)   │  WS    │   WebSocket Telemetry          │  │
│  │   Zustand · Recharts │        │   Zod Validation               │  │
│  └──────────────────────┘        └────────────┬───────────────────┘  │
│                                               │                       │
│                              ┌────────────────▼──────────────────┐   │
│                              │     PostgreSQL 16 + PostGIS 3.4    │   │
│                              │  Geospatial queries · Offline Mock │   │
│                              └────────────────┬──────────────────┘   │
│                                               │                       │
│                         ┌─────────────────────▼──────────────────┐   │
│                         │   Python ML Pipeline (Celery Workers)  │   │
│                         │   XGBoost · Random Forest · CNN        │   │
│                         │   SHAP XAI · m-chi Decomposition       │   │
│                         │   RabbitMQ Task Queue                  │   │
│                         └────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features

### 🔬 Subsurface Ice Detection Engine
- **Polarimetric SAR Analysis** — m-chi decomposition on Chandrayaan-2 L-band DFSAR data
- **Hybrid ML Classifier** — XGBoost + Random Forest ensemble with neural network head
- **SHAP Explainability** — Per-pixel feature attribution (CPR, DOP, m-chi, slope, temperature)
- **Coherent Backscatter (CBOE)** detection for clean ice vs. rough rocky terrain
- **Ice Volume Estimation** — Dielectric mixing model with regolith depth analysis

### 🗺️ Landing Site Intelligence
- **Multi-criteria Scoring** — Safety (45%) + Ice Proximity (30%) + Solar Illumination (25%)
- **Rank-ordered Site Cards** — Interactive comparison with slope, depth, and hazard metadata
- **Geospatial PostGIS queries** — Sub-metre precision coordinate lookups
- **Real-time Recalculation** — API-triggered scoring with configurable weight matrices

### 🤖 Rover Path Planning
- **RRT\* Algorithm** — Rapidly-Exploring Random Tree with obstacle and slope avoidance
- **Energy Budget Analysis** — Wh consumption modelling per waypoint segment
- **Hazard Classification** — ice_proximity, moderate_slope, boulder_field flags
- **Traversal Timeline** — End-to-end mission duration estimation

### 🌐 3D Interactive Visualizer
- **Three.js WebGL Crater Model** — Procedural Faustini crater with realistic PSR bowl geometry
- **Animated Rover** — Real-time traverse playback along planned path
- **Ice Patch Rendering** — Glowing subsurface anomaly overlays inside PSR
- **Orbital Camera** — Drag-to-orbit, scroll-to-zoom controls
- **Landing Site Markers** — Color-coded rank rings with emissive glow

### 🛡️ Offline Resilience
- **Mock Fallback Mode** — Full in-memory mock DB activates automatically when PostgreSQL is offline
- **Simulated ML Worker** — Analysis results auto-complete after 3 seconds even without Celery
- **Preloaded Science Data** — Real CPR/DOP/SHAP values seeded in mock store for demo

---

## 🖥️ Screenshots

> *Login → Dashboard → Ice Detection → 3D Visualization → Rover Path Planning*

| Mission Login | Exploration Dashboard |
|:---:|:---:|
| ISRO credential portal with animated starfield | Project workspace cards with crater coordinates |

| Ice Detection Results | 3D Crater Simulation |
|:---:|:---:|
| SHAP XAI charts + polygon anomaly cards | Three.js WebGL Faustini crater + live rover |

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | ≥ 20.x | Backend + Frontend |
| Python | ≥ 3.11 | ML Pipeline |
| Docker | ≥ 24.x | Full stack via Compose |
| PostgreSQL | ≥ 16.x | With PostGIS extension |
| Git | ≥ 2.40 | |

---

### ⚡ Quick Start — Docker Compose (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/Daksh7785/LUNAR-SUBSURFACE-ICE-DETECTION-SYSTEM.git
cd LUNAR-SUBSURFACE-ICE-DETECTION-SYSTEM

# 2. Copy environment config
cp backend/.env.example backend/.env

# 3. Launch full stack (PostgreSQL + RabbitMQ + API + ML Worker + Frontend)
docker compose up --build

# 4. Open Mission Control
open http://localhost:5173
```

> **Default Credentials:**  
> Email: `mission_control@isro.gov.in`  
> Password: `isro_secure_admin_2026`

---

### 🛠️ Manual Development Setup

#### Backend (Node.js / Express)

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your PostgreSQL and RabbitMQ credentials

# Initialize database schema
psql -U postgres -d lunar_ice_db -f ../database/init.sql

# Start development server (with hot reload)
npm run dev
# API live at: http://localhost:3001
```

#### Frontend (React / Vite)

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
# App live at: http://localhost:5173
```

#### ML Pipeline (Python / Celery)

```bash
cd ml_pipeline

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start Celery worker (requires RabbitMQ)
celery -A celery_worker worker --loglevel=info
```

---

## 📁 Project Structure

```
LUNAR-SUBSURFACE-ICE-DETECTION-SYSTEM/
│
├── 📂 backend/                      # Node.js + Express API server
│   └── src/
│       ├── config/
│       │   ├── database.ts          # PostgreSQL pool + Offline Mock Fallback
│       │   ├── rabbitmq.ts          # RabbitMQ publisher
│       │   └── env.ts               # Zod-validated env schema
│       ├── controllers/
│       │   ├── analysisController.ts  # Ice detection, landing sites, path planning
│       │   ├── projectController.ts   # Workspace CRUD
│       │   ├── datasetController.ts   # Dataset ingestion
│       │   └── authController.ts      # JWT authentication
│       ├── middleware/
│       │   ├── auth.ts              # Bearer token middleware
│       │   └── validate.ts          # Zod request validation
│       ├── routes/
│       │   └── api.ts               # All REST routes (v1)
│       └── index.ts                 # Express + WebSocket server
│
├── 📂 frontend/                     # React 18 + Vite SPA
│   └── src/
│       ├── pages/
│       │   ├── Login.tsx            # Mission control auth portal
│       │   ├── Dashboard.tsx        # Exploration workspaces
│       │   ├── ProjectView.tsx      # Dataset ingestion hub
│       │   ├── AnalysisView.tsx     # Ice detection classifier UI
│       │   ├── VisualizationView.tsx # Three.js crater + rover nav
│       │   └── MissionControl.tsx   # 7-tab advanced mission ops
│       ├── store/
│       │   ├── projectStore.ts      # Zustand API state management
│       │   └── authStore.ts         # Auth + token persistence
│       └── components/              # Shared UI components
│
├── 📂 ml_pipeline/                  # Python ML workers
│   ├── tasks.py                     # Celery task definitions
│   ├── celery_worker.py             # Worker entry point
│   └── models/                      # XGBoost + neural network models
│
├── 📂 database/
│   └── init.sql                     # PostgreSQL + PostGIS schema
│
├── 📂 k8s/                          # Kubernetes manifests
├── 📂 monitoring/                   # Prometheus + Grafana configs
├── 📂 e2e/                          # Playwright end-to-end tests
├── 📂 sample_data/                  # Chandrayaan-2 sample datasets
│
├── docker-compose.yml               # Full stack orchestration
└── nginx.conf                       # Production reverse proxy
```

---

## 🔌 API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/register` | Register new mission scientist |
| `POST` | `/api/v1/auth/login` | Obtain JWT access token |
| `POST` | `/api/v1/auth/refresh` | Refresh access token |
| `POST` | `/api/v1/auth/logout` | Invalidate session |

### Projects (Workspaces)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/projects` | List all exploration workspaces |
| `POST` | `/api/v1/projects` | Create new workspace |
| `GET` | `/api/v1/projects/:id` | Get workspace details |
| `PUT` | `/api/v1/projects/:id` | Update workspace metadata |
| `DELETE` | `/api/v1/projects/:id` | Archive workspace |

### Datasets

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/projects/:id/datasets` | List ingested datasets |
| `POST` | `/api/v1/projects/:id/datasets` | Ingest new DFSAR/OHRC file |
| `GET` | `/api/v1/datasets/:projectId/:datasetId` | Get dataset details |

### Analysis (Core Science Endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/projects/:id/analysis` | List analysis runs |
| `POST` | `/api/v1/projects/:id/analysis` | Start analysis (dispatches by type) |
| `POST` | `/api/v1/analysis/:id/detect-ice` | Run CPR/DOP ice classifier |
| `POST` | `/api/v1/analysis/:id/landing-sites` | Calculate landing site scores |
| `POST` | `/api/v1/analysis/:id/rover-path` | Plan RRT* rover traverse |

### Mission Control (Science APIs)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/radar/analyze` | Full polarimetric SAR decomposition |
| `POST` | `/api/v1/terrain/analyze` | Slope + roughness terrain analysis |
| `POST` | `/api/v1/ice/estimate-volume` | Dielectric mixing volume model |
| `POST` | `/api/v1/ai/interpret` | LLM geological interpretation |
| `POST` | `/api/v1/report/generate` | Generate mission PDF report |
| `GET` | `/api/v1/illumination/simulate` | Solar illumination simulation |

### External Agency APIs (Simulated)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/external/nasa-spice` | NASA SPICE ephemeris data |
| `GET` | `/api/v1/external/lola-dem` | LOLA Digital Elevation Model |
| `GET` | `/api/v1/external/noaa-weather` | NOAA space weather |
| `GET` | `/api/v1/external/isro-pradan` | ISRO PRADAN archive |

---

## 🧪 Testing

### Backend Unit & Integration Tests

```bash
cd backend
npm run test            # Jest unit tests
npm run test:coverage   # Coverage report
npm run test:watch      # Watch mode
```

### Frontend Component Tests

```bash
cd frontend
npm run test            # Vitest component tests
npm run test:ui         # Vitest UI browser
```

### End-to-End Tests (Playwright)

```bash
cd e2e
npx playwright test                    # All E2E tests
npx playwright test --ui               # Interactive UI mode
npx playwright show-report             # HTML test report
```

### ML Pipeline Tests

```bash
cd ml_pipeline
pytest tests/ -v                       # All Python tests
pytest tests/ --cov=. --cov-report=html
```

---

## 🛡️ Offline Mock Fallback Mode

The system is designed for **resilient offline operation** — critical for demo environments without a live database.

When PostgreSQL is unreachable, the backend automatically activates **Mock Fallback Mode**:

```
[WARN] PostgreSQL database is offline. Activating Offline Mock Fallback Mode.
```

**What's mocked:**
- ✅ User authentication (hardcoded ISRO credentials)
- ✅ Project workspace listing (Faustini Crater seed data)
- ✅ Dataset ingestion (in-memory persistence per session)
- ✅ Ice detection results (real CPR/DOP/SHAP science values)
- ✅ Landing site scores (4 ranked candidates)
- ✅ Rover path waypoints (RRT* simulated route)
- ✅ Analysis auto-completion (3-second simulation timeout)

---

## 🔬 Science: The Ice Detection Algorithm

### Step 1 — Polarimetric Decomposition (m-chi)
Chandrayaan-2 DFSAR dual-circular polarization data undergoes m-chi decomposition to separate:
- **Double-bounce** scattering (volume ice)
- **Surface** scattering (bare regolith)
- **Diffuse** scattering (mixed terrain)

### Step 2 — CPR / DOP Thresholding
```
Ice Candidate = CPR > 1.0  AND  DOP < 0.13
```
- **CPR (Circular Polarization Ratio)** > 1.0 → Coherent Backscatter Opposition Effect (CBOE)
- **DOP (Degree of Polarization)** < 0.13 → Volume scattering dominance

### Step 3 — XGBoost + Random Forest Ensemble
7-feature ML classifier trained on:
`[CPR, DOP, m-chi, slope, brightness_temp, surface_roughness, albedo]`

### Step 4 — SHAP Explainability
Per-prediction feature attribution ensures **scientific reproducibility** and mission team trust.

### Step 5 — Volume Estimation
```
V_ice = A_ice × depth × (ε_mix - ε_regolith) / (ε_ice - ε_regolith)
```
Dielectric mixing model constrained by 5 m penetration depth at L-band.

---

## 🌍 Environment Variables

```env
# Backend (.env)
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://postgres:password@localhost:5432/lunar_ice_db
JWT_SECRET=your_super_secret_jwt_key_256_bits_minimum
JWT_REFRESH_SECRET=your_refresh_secret_key
RABBITMQ_URL=amqp://guest:guest@localhost:5672
REDIS_URL=redis://localhost:6379
CORS_ORIGIN=http://localhost:5173

# Frontend (.env)
VITE_API_BASE_URL=http://localhost:3001
```

---

## 🚢 Kubernetes Deployment

```bash
# Build and push images
docker build -t lupex-backend ./backend
docker build -t lupex-frontend ./frontend
docker build -t lupex-ml ./ml_pipeline

# Apply Kubernetes manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml

# Verify deployment
kubectl get pods -n lupex-system
```

---

## 📊 Tech Stack

<div align="center">

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + Vite + TypeScript | SPA Mission Control UI |
| **3D Visualizer** | Three.js r165 | WebGL crater simulation |
| **Charts** | Recharts 2.x | CPR/DOP/SHAP metrics |
| **State** | Zustand + persist | Auth + project state |
| **Styling** | Tailwind CSS v3 | Dark space UI |
| **API** | Node.js + Express 4 + TypeScript | REST + WebSocket |
| **Auth** | JWT (access + refresh) | Mission role security |
| **Validation** | Zod | Schema-safe requests |
| **Database** | PostgreSQL 16 + PostGIS 3.4 | Geospatial ice maps |
| **ML Queue** | RabbitMQ + Celery | Async ML task dispatch |
| **ML Models** | XGBoost + Random Forest + CNN | Ice classification |
| **XAI** | SHAP | Feature attribution |
| **Testing** | Jest + Vitest + Playwright | Unit/E2E coverage |
| **DevOps** | Docker Compose + Kubernetes | Container orchestration |
| **Monitoring** | Prometheus + Grafana | System observability |

</div>

---

## 🤝 Contributing

We welcome contributions from the planetary science and engineering community!

```bash
# Fork → clone → branch
git checkout -b feature/your-science-feature

# Make changes, run tests
npm run test

# Commit with conventional format
git commit -m "feat(ice-detection): improve CPR threshold algorithm for polar night conditions"

# Push and open PR
git push origin feature/your-science-feature
```

**Commit Convention:** `type(scope): description`  
Types: `feat` | `fix` | `science` | `docs` | `test` | `perf` | `refactor`

---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 🏆 Hackathon Context

> **ISRO LUPEX Hackathon — Problem Statement 8**  
> *"Develop an AI/ML-based system to detect and quantify subsurface water-ice deposits in Lunar Permanently Shadowed Regions using Chandrayaan-2 DFSAR polarimetric radar data to support LUPEX landing site selection."*

This system represents a **complete, production-grade solution** addressing all PS-8 requirements:
- ✅ Chandrayaan-2 DFSAR data ingestion pipeline
- ✅ Polarimetric ice classification (CPR + DOP + m-chi)
- ✅ Subsurface volume estimation with dielectric mixing
- ✅ Multi-criteria landing site scoring
- ✅ RRT* rover traverse planning
- ✅ 3D WebGL visualization
- ✅ Explainable AI (SHAP) for mission trust
- ✅ Offline-resilient architecture for field operations

---

<div align="center">

**Built with ❤️ for the Moon · ISRO LUPEX Mission 2025–2028**

[![GitHub Stars](https://img.shields.io/github/stars/Daksh7785/LUNAR-SUBSURFACE-ICE-DETECTION-SYSTEM?style=social)](https://github.com/Daksh7785/LUNAR-SUBSURFACE-ICE-DETECTION-SYSTEM)
[![GitHub Forks](https://img.shields.io/github/forks/Daksh7785/LUNAR-SUBSURFACE-ICE-DETECTION-SYSTEM?style=social)](https://github.com/Daksh7785/LUNAR-SUBSURFACE-ICE-DETECTION-SYSTEM/fork)

*"The Moon's ice is humanity's next fuel depot. Let's find it."*

</div>