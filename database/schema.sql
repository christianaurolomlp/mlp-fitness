-- MLP FITNESS - Esquema de base de datos
-- Ejecutado automáticamente al arrancar si las tablas no existen

CREATE TABLE IF NOT EXISTS rutinas (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 1 AND 5),
  descripcion TEXT
);

CREATE TABLE IF NOT EXISTS ejercicios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  grupo_muscular VARCHAR(50) NOT NULL,
  equipamiento VARCHAR(50) NOT NULL,
  imagen_url VARCHAR(500),
  descripcion TEXT,
  es_unilateral BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS rutina_ejercicios (
  id SERIAL PRIMARY KEY,
  rutina_id INTEGER NOT NULL REFERENCES rutinas(id) ON DELETE CASCADE,
  ejercicio_id INTEGER NOT NULL REFERENCES ejercicios(id) ON DELETE CASCADE,
  orden INTEGER NOT NULL,
  series_objetivo INTEGER NOT NULL,
  reps_min INTEGER NOT NULL,
  reps_max INTEGER NOT NULL,
  descanso_segundos INTEGER NOT NULL DEFAULT 90,
  nota_especial TEXT
);

CREATE TABLE IF NOT EXISTS entrenos (
  id SERIAL PRIMARY KEY,
  fecha TIMESTAMP DEFAULT NOW(),
  rutina_id INTEGER REFERENCES rutinas(id),
  duracion_minutos INTEGER,
  notas TEXT,
  completado BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS series_realizadas (
  id SERIAL PRIMARY KEY,
  entreno_id INTEGER NOT NULL REFERENCES entrenos(id) ON DELETE CASCADE,
  ejercicio_id INTEGER NOT NULL REFERENCES ejercicios(id),
  numero_serie INTEGER NOT NULL,
  peso_kg DECIMAL(5,2),
  reps INTEGER NOT NULL,
  rpe INTEGER CHECK (rpe BETWEEN 1 AND 10),
  es_pr BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS records_personales (
  id SERIAL PRIMARY KEY,
  ejercicio_id INTEGER UNIQUE NOT NULL REFERENCES ejercicios(id),
  peso_max DECIMAL(5,2),
  reps_a_ese_peso INTEGER,
  fecha TIMESTAMP,
  volumen_max DECIMAL(8,2),
  one_rm_estimado DECIMAL(5,2)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_series_entreno ON series_realizadas(entreno_id);
CREATE INDEX IF NOT EXISTS idx_series_ejercicio ON series_realizadas(ejercicio_id);
CREATE INDEX IF NOT EXISTS idx_entrenos_fecha ON entrenos(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_rutina_ejercicios_rutina ON rutina_ejercicios(rutina_id, orden);
