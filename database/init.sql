CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  organization VARCHAR(255),
  role VARCHAR(50) DEFAULT 'scientist' CHECK (role IN ('admin', 'scientist', 'viewer', 'guest')),
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role);

-- Create projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  crater_name VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 6),
  longitude DECIMAL(11, 6),
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'archived')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created ON projects(created_at DESC);

-- Create datasets table
CREATE TABLE datasets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  dataset_type VARCHAR(50) NOT NULL CHECK (dataset_type IN ('DFSAR', 'OHRC', 'DEM')),
  filename VARCHAR(500) NOT NULL,
  file_url VARCHAR(1000),
  file_size BIGINT,
  metadata JSONB,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_datasets_project ON datasets(project_id);
CREATE INDEX idx_datasets_status ON datasets(status);
CREATE INDEX idx_datasets_type ON datasets(dataset_type);

-- Create analysis_results table
CREATE TABLE analysis_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  dataset_id UUID REFERENCES datasets(id),
  analysis_type VARCHAR(50) NOT NULL CHECK (analysis_type IN ('ice_detection', 'terrain', 'landing_site', 'path_planning', 'volume_estimation')),
  status VARCHAR(50) DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  task_id VARCHAR(255),
  parameters JSONB,
  result_data JSONB,
  confidence_score DECIMAL(5, 4),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_analysis_project ON analysis_results(project_id);
CREATE INDEX idx_analysis_type ON analysis_results(analysis_type);
CREATE INDEX idx_analysis_status ON analysis_results(status);
CREATE INDEX idx_analysis_task ON analysis_results(task_id);

-- Create landing_sites table
CREATE TABLE landing_sites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES analysis_results(id),
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  crater_id VARCHAR(255),
  safety_score DECIMAL(5, 4),
  proximity_score DECIMAL(5, 4),
  solar_score DECIMAL(5, 4),
  combined_score DECIMAL(5, 4),
  rank INTEGER,
  details JSONB,
  hazards JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_landing_sites_project ON landing_sites(project_id);
CREATE INDEX idx_landing_sites_location ON landing_sites USING GIST (location);
CREATE INDEX idx_landing_sites_rank ON landing_sites(rank);

-- Create rover_paths table
CREATE TABLE rover_paths (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  landing_site_id UUID REFERENCES landing_sites(id),
  target_crater_id VARCHAR(255),
  path_geometry GEOMETRY(LINESTRING, 4326),
  distance_km DECIMAL(10, 2),
  estimated_traversal_time DECIMAL(8, 2),
  energy_consumption DECIMAL(12, 2),
  hazard_flags JSONB,
  waypoints JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rover_paths_project ON rover_paths(project_id);
CREATE INDEX idx_rover_paths_geometry ON rover_paths USING GIST (path_geometry);

-- Create ice_volume_estimates table
CREATE TABLE ice_volume_estimates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES analysis_results(id),
  crater_id VARCHAR(255),
  volume_m3 DECIMAL(15, 2),
  concentration_percentage DECIMAL(5, 2),
  depth_m DECIMAL(8, 2),
  mass_tonnes DECIMAL(15, 2),
  methodology TEXT,
  confidence_interval JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ice_volume_project ON ice_volume_estimates(project_id);

-- Create spatial_data table (for GeoTIFF metadata)
CREATE TABLE spatial_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES analysis_results(id),
  data_type VARCHAR(100),
  file_url VARCHAR(1000),
  geometry GEOMETRY(POLYGON, 4326),
  resolution_m DECIMAL(8, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_spatial_data_project ON spatial_data(project_id);
CREATE INDEX idx_spatial_data_geometry ON spatial_data USING GIST (geometry);

-- Create refresh_tokens table (for JWT management)
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- Create audit_logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(255),
  resource_type VARCHAR(100),
  resource_id VARCHAR(255),
  changes JSONB,
  ip_address INET,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- Create function for updating updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update_updated_at to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analysis_results_updated_at BEFORE UPDATE ON analysis_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add new tables required by full-stack specification
CREATE TABLE lunar_regions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  region_name VARCHAR(255) NOT NULL,
  center_lat DECIMAL(10, 6) NOT NULL,
  center_lng DECIMAL(11, 6) NOT NULL,
  bounding_box GEOMETRY(POLYGON, 4326),
  diameter_km DECIMAL(10, 2),
  psr_area_sqkm DECIMAL(12, 2),
  est_ice_score DECIMAL(5, 4),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lunar_regions_center ON lunar_regions(center_lat, center_lng);

CREATE TABLE radar_measurements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
  region_id UUID REFERENCES lunar_regions(id) ON DELETE CASCADE,
  frequency_band VARCHAR(50) DEFAULT 'L-band',
  polarization VARCHAR(50) DEFAULT 'HH-HV',
  cpr_val DECIMAL(6, 4),
  dop_val DECIMAL(6, 4),
  mchi_odd_dbl_vol JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_radar_measurements_cpr ON radar_measurements(cpr_val);

CREATE TABLE terrain_features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  region_id UUID REFERENCES lunar_regions(id) ON DELETE CASCADE,
  elevation_mean DECIMAL(10, 2),
  slope_median DECIMAL(5, 2),
  roughness_val DECIMAL(5, 2),
  boulder_count INTEGER,
  hazard_flag VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE path_waypoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  path_id UUID REFERENCES rover_paths(id) ON DELETE CASCADE,
  waypoint_index INTEGER NOT NULL,
  latitude DECIMAL(10, 6) NOT NULL,
  longitude DECIMAL(11, 6) NOT NULL,
  elevation DECIMAL(10, 2),
  hazard_score DECIMAL(5, 4),
  speed_kph DECIMAL(5, 2),
  energy_cost_wh DECIMAL(8, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_path_waypoints_path ON path_waypoints(path_id, waypoint_index);

CREATE TABLE mission_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type VARCHAR(100) NOT NULL,
  event_source VARCHAR(100) NOT NULL,
  log_message TEXT NOT NULL,
  severity VARCHAR(50) DEFAULT 'INFO',
  telemetry_snapshot JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mission_events_created ON mission_events(created_at DESC);

-- Alter ice_volume_estimates to ensure all required prompt columns exist
ALTER TABLE ice_volume_estimates 
  ADD COLUMN IF NOT EXISTS depth_min_m DECIMAL(8, 2),
  ADD COLUMN IF NOT EXISTS depth_max_m DECIMAL(8, 2),
  ADD COLUMN IF NOT EXISTS volume_km3 DECIMAL(15, 6);

