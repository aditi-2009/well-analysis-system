BEGIN;

CREATE TABLE alembic_version (
    version_num VARCHAR(32) NOT NULL, 
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);

-- Running upgrade  -> 24fe9da79c86

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE satellite_image (
    file_id VARCHAR(255) NOT NULL, 
    original_filename VARCHAR(500) NOT NULL, 
    stored_filename VARCHAR(500) NOT NULL, 
    file_size_bytes BIGINT NOT NULL, 
    detected_format VARCHAR(50) NOT NULL, 
    image_width INTEGER, 
    image_height INTEGER, 
    band_count INTEGER, 
    crs VARCHAR(255), 
    spatial_resolution_m FLOAT, 
    bounds JSON, 
    image_metadata JSON, 
    status VARCHAR(50) NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    expires_at TIMESTAMP WITHOUT TIME ZONE, 
    CONSTRAINT pk_satellite_image PRIMARY KEY (file_id), 
    CONSTRAINT uq_satellite_image_file_id UNIQUE (file_id), 
    CONSTRAINT uq_satellite_image_stored_filename UNIQUE (stored_filename)
);

CREATE TABLE state (
    id SERIAL NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(10),
    CONSTRAINT pk_state PRIMARY KEY (id),
    CONSTRAINT uq_state_name UNIQUE (name)
);

CREATE TABLE users (
    id SERIAL NOT NULL,
    email VARCHAR(255) NOT NULL,
    hashed_password VARCHAR(500) NOT NULL,
    full_name VARCHAR(255),
    mobile VARCHAR(20),
    organization VARCHAR(255),
    is_active BOOLEAN DEFAULT true NOT NULL,
    is_admin BOOLEAN DEFAULT false NOT NULL,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    CONSTRAINT pk_users PRIMARY KEY (id),
    CONSTRAINT ck_users_email_lowercase CHECK (email = lower(email)),
    CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE TABLE district (
    id SERIAL NOT NULL,
    name VARCHAR(255) NOT NULL,
    state_id INTEGER NOT NULL,
    code VARCHAR(10),
    CONSTRAINT pk_district PRIMARY KEY (id),
    CONSTRAINT fk_district_state_id_state FOREIGN KEY(state_id) REFERENCES state (id)
);

CREATE TABLE known_wells (
    id SERIAL NOT NULL,
    well_identifier VARCHAR(100),
    source VARCHAR(100) NOT NULL
    source_reference VARCHAR(500),
    geom geometry(POINT,4326) NOT NULL,
    well_type VARCHAR(50),
    status VARCHAR(50),
    district VARCHAR(255),
    taluka VARCHAR(255),
    village VARCHAR(255),
    created_by INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    CONSTRAINT pk_known_wells PRIMARY KEY (id), 
    CONSTRAINT fk_known_wells_created_by_users FOREIGN KEY(created_by) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT uq_known_wells_source_well_identifier UNIQUE (source, well_identifier)
);

CREATE INDEX ix_known_wells_geom ON known_wells USING gist (geom);

CREATE TABLE taluka (
    id SERIAL NOT NULL,
    name VARCHAR(255) NOT NULL,
    district_id INTEGER NOT NULL,
    code VARCHAR(10),
    CONSTRAINT pk_taluka PRIMARY KEY (id),
    CONSTRAINT fk_taluka_district_id_district FOREIGN KEY(district_id) REFERENCES district (id)
);

CREATE TABLE village (
    id SERIAL NOT NULL,
    name VARCHAR(255) NOT NULL,
    taluka_id INTEGER NOT NULL,
    district_id INTEGER NOT NULL,
    state_id INTEGER NOT NULL,
    geom_geojson TEXT,
    population INTEGER
    area_km2 FLOAT
    CONSTRAINT pk_village PRIMARY KEY (id),
    CONSTRAINT fk_village_district_id_district FOREIGN KEY(district_id) REFERENCES district (id),
    CONSTRAINT fk_village_state_id_state FOREIGN KEY(state_id) REFERENCES state (id),
    CONSTRAINT fk_village_taluka_id_taluka FOREIGN KEY(taluka_id) REFERENCES taluka (id)
);

INSERT INTO alembic_version (version_num) VALUES ('24fe9da79c86') RETURNING alembic_version.version_num;

COMMIT;

