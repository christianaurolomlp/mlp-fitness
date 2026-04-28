CREATE TABLE IF NOT EXISTS rutinas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  dia_semana INTEGER NOT NULL,
  descripcion TEXT
);

CREATE TABLE IF NOT EXISTS ejercicios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  grupo_muscular TEXT NOT NULL,
  equipamiento TEXT NOT NULL,
  imagen_url TEXT,
  descripcion TEXT,
  es_unilateral INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS rutina_ejercicios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
  rutina_id INTEGER REFERENCES rutinas(id),
  duracion_minutos INTEGER,
  notas TEXT,
  completado INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS series_realizadas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entreno_id INTEGER NOT NULL REFERENCES entrenos(id) ON DELETE CASCADE,
  ejercicio_id INTEGER NOT NULL REFERENCES ejercicios(id),
  numero_serie INTEGER NOT NULL,
  peso_kg REAL,
  reps INTEGER NOT NULL,
  rpe INTEGER,
  es_pr INTEGER DEFAULT 0,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS records_personales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ejercicio_id INTEGER UNIQUE NOT NULL REFERENCES ejercicios(id),
  peso_max REAL,
  reps_a_ese_peso INTEGER,
  fecha DATETIME,
  volumen_max REAL,
  one_rm_estimado REAL
);

CREATE INDEX IF NOT EXISTS idx_series_entreno ON series_realizadas(entreno_id);
CREATE INDEX IF NOT EXISTS idx_series_ejercicio ON series_realizadas(ejercicio_id);
CREATE INDEX IF NOT EXISTS idx_entrenos_fecha ON entrenos(fecha);
CREATE INDEX IF NOT EXISTS idx_rutina_ejercicios_rutina ON rutina_ejercicios(rutina_id, orden);
