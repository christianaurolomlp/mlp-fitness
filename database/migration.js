// MLP FITNESS - Migración v2.0: Sistema de Campañas
// Idempotente — solo agrega, nunca elimina ni trunca

const isProduction = !!process.env.DATABASE_URL;

const runMigrations = async (db) => {
  console.log('🔄 Ejecutando migraciones v2.0...');

  // 1. Crear tabla campanias si no existe
  if (isProduction) {
    await db.query(`
      CREATE TABLE IF NOT EXISTS campanias (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        objetivo TEXT,
        duracion_semanas INTEGER NOT NULL DEFAULT 4,
        orden INTEGER NOT NULL DEFAULT 1,
        estado TEXT NOT NULL DEFAULT 'pendiente',
        fecha_inicio DATE,
        fecha_fin DATE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
  } else {
    await db.query(`
      CREATE TABLE IF NOT EXISTS campanias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        objetivo TEXT,
        duracion_semanas INTEGER NOT NULL DEFAULT 4,
        orden INTEGER NOT NULL DEFAULT 1,
        estado TEXT NOT NULL DEFAULT 'pendiente',
        fecha_inicio TEXT,
        fecha_fin TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
  }
  console.log('✅ Tabla campanias verificada');

  // 2. Agregar campania_id a rutinas (ignorar si ya existe)
  try {
    await db.query('ALTER TABLE rutinas ADD COLUMN campania_id INTEGER');
    console.log('✅ Columna campania_id agregada a rutinas');
  } catch (e) {
    // Ya existe — ignorar
  }

  // 3. Agregar tipo_medicion a ejercicios (ignorar si ya existe)
  try {
    await db.query("ALTER TABLE ejercicios ADD COLUMN tipo_medicion TEXT DEFAULT 'reps'");
    console.log('✅ Columna tipo_medicion agregada a ejercicios');
  } catch (e) {
    // Ya existe — ignorar
  }

  // 4. Insertar campañas si la tabla está vacía
  const { rows: campRows } = await db.query('SELECT COUNT(*) as count FROM campanias');
  const campCount = parseInt(campRows[0].count || campRows[0].COUNT || 0);

  if (campCount === 0) {
    console.log('🌱 Insertando campañas iniciales...');

    // Calcular fechas basadas en hoy
    const hoy = new Date();
    const formatDate = (d) => d.toISOString().split('T')[0];

    // Campaña 1: activa desde hace semanas (ajustada a hoy para dev)
    const fechaInicioC1 = new Date(hoy);
    const fechaFinC1 = new Date(hoy);
    fechaFinC1.setDate(fechaFinC1.getDate() + 28); // 4 semanas desde hoy

    // Campaña 2: pendiente — empieza cuando termine la 1
    const fechaInicioC2 = new Date(fechaFinC1);
    fechaInicioC2.setDate(fechaInicioC2.getDate() + 1);
    const fechaFinC2 = new Date(fechaInicioC2);
    fechaFinC2.setDate(fechaFinC2.getDate() + 28);

    // Campaña 3: pendiente — empieza cuando termine la 2
    const fechaInicioC3 = new Date(fechaFinC2);
    fechaInicioC3.setDate(fechaInicioC3.getDate() + 1);
    const fechaFinC3 = new Date(fechaInicioC3);
    fechaFinC3.setDate(fechaFinC3.getDate() + 28);

    await db.query(
      `INSERT INTO campanias (nombre, descripcion, objetivo, duracion_semanas, orden, estado, fecha_inicio, fecha_fin)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        'Adaptación y Recuperación',
        'Campaña 1 — Base y técnica',
        'Recuperar técnica y pesos tras 2 meses parado. Enfoque en reconexión muscular.',
        4, 1, 'activa',
        formatDate(fechaInicioC1),
        formatDate(fechaFinC1),
      ]
    );

    await db.query(
      `INSERT INTO campanias (nombre, descripcion, objetivo, duracion_semanas, orden, estado, fecha_inicio, fecha_fin)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        'Progresión Activa',
        'Campaña 2 — Subida de carga',
        'Subir peso cada semana (1-2kg). Reps al límite superior del rango. Aquí empieza el cambio físico visible.',
        4, 2, 'pendiente',
        formatDate(fechaInicioC2),
        formatDate(fechaFinC2),
      ]
    );

    await db.query(
      `INSERT INTO campanias (nombre, descripcion, objetivo, duracion_semanas, orden, estado, fecha_inicio, fecha_fin)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        'Intensificación Pre-Verano',
        'Campaña 3 — Máxima intensidad',
        'Intensificar para llegar a verano definido. Nuevo estímulo muscular. Mantener fuerza, mejorar densidad.',
        4, 3, 'pendiente',
        formatDate(fechaInicioC3),
        formatDate(fechaFinC3),
      ]
    );

    console.log('✅ 3 campañas insertadas');
  }

  // 5. Vincular rutinas existentes sin campania_id a la campaña 1
  await db.query('UPDATE rutinas SET campania_id = 1 WHERE campania_id IS NULL');
  console.log('✅ Rutinas existentes vinculadas a Campaña 1');

  // 6. Corregir reps de la rutina Pull 2 — el seed usa reps_min=reps_max en algunos
  // Remo Iso-Lateral: 10,10 → 10,12
  try {
    await db.query(`
      UPDATE rutina_ejercicios SET reps_max = 12
      WHERE ejercicio_id IN (SELECT id FROM ejercicios WHERE nombre = 'Remo Iso-Lateral')
      AND reps_max = 10 AND reps_min = 10
    `);
    // Jalón de Remo a Un Brazo: 12,12 → 10,12
    await db.query(`
      UPDATE rutina_ejercicios SET reps_min = 10
      WHERE ejercicio_id IN (SELECT id FROM ejercicios WHERE nombre = 'Jalón de Remo a Un Brazo')
      AND reps_min = 12 AND reps_max = 12
    `);
    // Face Pull: 15,15 → 12,15
    await db.query(`
      UPDATE rutina_ejercicios SET reps_min = 12
      WHERE ejercicio_id IN (SELECT id FROM ejercicios WHERE nombre = 'Face Pull')
      AND reps_min = 15 AND reps_max = 15
    `);
    // Curl de Bíceps: 10,12 → OK pero agregar si falta
    // Legs: Curl de Piernas 12,12 → 10,12
    await db.query(`
      UPDATE rutina_ejercicios SET reps_min = 10
      WHERE ejercicio_id IN (SELECT id FROM ejercicios WHERE nombre = 'Curl de Piernas Acostado')
      AND reps_min = 12 AND reps_max = 12
    `);
    // Remo Sentado: 10,10 → 8,10
    await db.query(`
      UPDATE rutina_ejercicios SET reps_min = 8
      WHERE ejercicio_id IN (SELECT id FROM ejercicios WHERE nombre = 'Remo Sentado con Agarre en V')
      AND reps_min = 10 AND reps_max = 10
    `);
    // Hip Thrust legs: 12,15 → OK ya está
    console.log('✅ Correcciones de reps aplicadas');
  } catch (e) {
    console.log('⚠️ Correcciones de reps (ignorando errores):', e.message);
  }

  // 7. Plancha → tipo_medicion='segundos'
  try {
    await db.query(`UPDATE ejercicios SET tipo_medicion = 'segundos' WHERE nombre = 'Plancha'`);
    console.log('✅ Plancha configurada como medición en segundos');
  } catch (e) {
    console.log('⚠️ Error configurando Plancha:', e.message);
  }

  // 8. Crear ejercicios y rutinas de Campaña 3 si no existen
  const { rows: c3Rows } = await db.query('SELECT COUNT(*) as count FROM rutinas WHERE campania_id = 3');
  const c3Count = parseInt(c3Rows[0].count || c3Rows[0].COUNT || 0);

  if (c3Count === 0) {
    console.log('🌱 Creando ejercicios y rutinas de Campaña 3...');
    await crearCampania3(db);
  } else {
    console.log('✅ Campaña 3 ya tiene rutinas, seed omitido');
  }

  console.log('✅ Migraciones v2.0 completadas');
};

const crearCampania3 = async (db) => {
  // Lista de nuevos ejercicios de la Campaña 3
  const nuevosEjercicios = [
    { nombre: 'Press de Banca con Barra', grupo_muscular: 'Pecho', equipamiento: 'Barra', es_unilateral: 0, imagen_url: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Bench_Press/0.jpg', tipo_medicion: 'reps' },
    { nombre: 'Aperturas Cruce de Poleas', grupo_muscular: 'Pecho', equipamiento: 'Cable', es_unilateral: 0, imagen_url: null, tipo_medicion: 'reps' },
    { nombre: 'Press Arnold', grupo_muscular: 'Hombros', equipamiento: 'Mancuerna', es_unilateral: 0, imagen_url: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Arnold_Dumbbell_Press/0.jpg', tipo_medicion: 'reps' },
    { nombre: 'Press Francés con Barra EZ', grupo_muscular: 'Brazos', equipamiento: 'Barra', es_unilateral: 0, imagen_url: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_French_Press/0.jpg', tipo_medicion: 'reps' },
    { nombre: 'Dominadas Asistidas', grupo_muscular: 'Espalda', equipamiento: 'Peso Corporal', es_unilateral: 0, imagen_url: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Assisted_Pull-Up/0.jpg', tipo_medicion: 'reps' },
    { nombre: 'Remo con Barra', grupo_muscular: 'Espalda', equipamiento: 'Barra', es_unilateral: 0, imagen_url: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Bent_Over_Row/0.jpg', tipo_medicion: 'reps' },
    { nombre: 'Remo con Mancuerna a Un Brazo', grupo_muscular: 'Espalda', equipamiento: 'Mancuerna', es_unilateral: 1, imagen_url: null, tipo_medicion: 'reps' },
    { nombre: 'Vuelos Posteriores con Cable', grupo_muscular: 'Espalda', equipamiento: 'Cable', es_unilateral: 0, imagen_url: null, tipo_medicion: 'reps' },
    { nombre: 'Curl con Barra Z', grupo_muscular: 'Brazos', equipamiento: 'Barra', es_unilateral: 0, imagen_url: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Curl/0.jpg', tipo_medicion: 'reps' },
    { nombre: 'Curl Concentrado', grupo_muscular: 'Brazos', equipamiento: 'Mancuerna', es_unilateral: 0, imagen_url: null, tipo_medicion: 'reps' },
    { nombre: 'Sentadilla con Barra', grupo_muscular: 'Pierna', equipamiento: 'Barra', es_unilateral: 0, imagen_url: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Full_Squat/0.jpg', tipo_medicion: 'reps' },
    { nombre: 'Peso Muerto Rumano con Barra', grupo_muscular: 'Pierna', equipamiento: 'Barra', es_unilateral: 0, imagen_url: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Romanian_Deadlift/0.jpg', tipo_medicion: 'reps' },
    { nombre: 'Elevación de Gemelos de Pie', grupo_muscular: 'Pierna', equipamiento: 'Máquina', es_unilateral: 0, imagen_url: null, tipo_medicion: 'reps' },
    { nombre: 'Jalón al Pecho Agarre Amplio', grupo_muscular: 'Espalda', equipamiento: 'Cable', es_unilateral: 0, imagen_url: null, tipo_medicion: 'reps' },
    { nombre: 'Remo en T', grupo_muscular: 'Espalda', equipamiento: 'Máquina', es_unilateral: 0, imagen_url: null, tipo_medicion: 'reps' },
    { nombre: 'Pullover con Cable', grupo_muscular: 'Espalda', equipamiento: 'Cable', es_unilateral: 0, imagen_url: null, tipo_medicion: 'reps' },
    { nombre: 'Press Militar con Barra', grupo_muscular: 'Hombros', equipamiento: 'Barra', es_unilateral: 0, imagen_url: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Standing_Military_Press/0.jpg', tipo_medicion: 'reps' },
    { nombre: 'Press de Banca Plano con Barra', grupo_muscular: 'Pecho', equipamiento: 'Barra', es_unilateral: 0, imagen_url: null, tipo_medicion: 'reps' },
    { nombre: 'Fondos con Peso', grupo_muscular: 'Pecho', equipamiento: 'Peso Corporal', es_unilateral: 0, imagen_url: null, tipo_medicion: 'reps' },
    { nombre: 'Elevaciones Laterales con Mancuerna', grupo_muscular: 'Hombros', equipamiento: 'Mancuerna', es_unilateral: 0, imagen_url: null, tipo_medicion: 'reps' },
    { nombre: 'Extensión de Tríceps con Barra', grupo_muscular: 'Brazos', equipamiento: 'Barra', es_unilateral: 0, imagen_url: null, tipo_medicion: 'reps' },
    { nombre: 'Plancha Lateral', grupo_muscular: 'Core', equipamiento: 'Peso Corporal', es_unilateral: 1, imagen_url: null, tipo_medicion: 'segundos' },
  ];

  // Insertar solo los que no existen — guardar mapa nombre→id
  const ejIds = {};

  // Primero cargar los existentes
  const { rows: existentes } = await db.query('SELECT id, nombre FROM ejercicios');
  for (const e of existentes) {
    ejIds[e.nombre] = e.id;
  }

  // Insertar los nuevos
  for (const ej of nuevosEjercicios) {
    if (!ejIds[ej.nombre]) {
      const { rows } = await db.query(
        `INSERT INTO ejercicios (nombre, grupo_muscular, equipamiento, es_unilateral, imagen_url, tipo_medicion)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [ej.nombre, ej.grupo_muscular, ej.equipamiento, ej.es_unilateral, ej.imagen_url, ej.tipo_medicion]
      );
      ejIds[ej.nombre] = rows[0].id;
    } else {
      // Actualizar imagen_url si está disponible y el ejercicio ya existe
      if (ej.imagen_url) {
        await db.query(
          'UPDATE ejercicios SET imagen_url = $1 WHERE id = $2 AND (imagen_url IS NULL OR imagen_url = \'\')',
          [ej.imagen_url, ejIds[ej.nombre]]
        );
      }
      if (ej.tipo_medicion === 'segundos') {
        await db.query(
          "UPDATE ejercicios SET tipo_medicion = 'segundos' WHERE id = $1",
          [ejIds[ej.nombre]]
        );
      }
    }
  }

  console.log('✅ Ejercicios de Campaña 3 insertados/verificados');

  // Helper para insertar rutina
  const insertRutina = async (nombre, dia, descripcion) => {
    const { rows } = await db.query(
      `INSERT INTO rutinas (nombre, dia_semana, descripcion, campania_id)
       VALUES ($1, $2, $3, 3) RETURNING id`,
      [nombre, dia, descripcion]
    );
    return rows[0].id;
  };

  // Helper para insertar ejercicio en rutina
  const addEj = async (rutinaId, nombreEj, orden, series, repsMin, repsMax, descanso, nota = null) => {
    const ejId = ejIds[nombreEj];
    if (!ejId) {
      console.warn(`⚠️ Ejercicio no encontrado: ${nombreEj}`);
      return;
    }
    await db.query(
      `INSERT INTO rutina_ejercicios (rutina_id, ejercicio_id, orden, series_objetivo, reps_min, reps_max, descanso_segundos, nota_especial)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [rutinaId, ejId, orden, series, repsMin, repsMax, descanso, nota]
    );
  };

  // LUNES — Push 1 Intensificación
  const push1 = await insertRutina('Push 1 Intensificación', 1, 'Pecho / Hombros / Tríceps — Alta intensidad');
  await addEj(push1, 'Press de Banca Inclinado', 1, 4, 8, 10, 120);
  await addEj(push1, 'Press de Banca con Barra', 2, 4, 6, 8, 120);
  await addEj(push1, 'Aperturas Cruce de Poleas', 3, 3, 12, 15, 90);
  await addEj(push1, 'Press Arnold', 4, 3, 8, 10, 120);
  await addEj(push1, 'Elevaciones Laterales', 5, 4, 12, 15, 90);
  await addEj(push1, 'Press Francés con Barra EZ', 6, 3, 10, 12, 90);

  // MARTES — Pull 1 Intensificación
  const pull1 = await insertRutina('Pull 1 Intensificación', 2, 'Espalda / Bíceps — Tirón vertical y horizontal');
  await addEj(pull1, 'Dominadas Asistidas', 1, 4, 6, 8, 120);
  await addEj(pull1, 'Remo con Barra', 2, 4, 8, 10, 120);
  await addEj(pull1, 'Remo con Mancuerna a Un Brazo', 3, 3, 10, 12, 90, 'Por lado');
  await addEj(pull1, 'Vuelos Posteriores con Cable', 4, 3, 12, 15, 90);
  await addEj(pull1, 'Curl con Barra Z', 5, 3, 8, 10, 90);
  await addEj(pull1, 'Curl Concentrado', 6, 3, 10, 12, 90);

  // MIÉRCOLES — Legs Intensificación
  const legs = await insertRutina('Legs Intensificación', 3, 'Pierna completa — Squat, RDL y aislamientos');
  await addEj(legs, 'Sentadilla con Barra', 1, 4, 6, 8, 120);
  await addEj(legs, 'Sentadilla Búlgara', 2, 3, 8, 10, 120, 'Por pierna');
  await addEj(legs, 'Peso Muerto Rumano con Barra', 3, 4, 8, 10, 120);
  await addEj(legs, 'Curl de Piernas Acostado', 4, 3, 10, 12, 90);
  await addEj(legs, 'Extensión de Pierna', 5, 3, 12, 15, 90);
  await addEj(legs, 'Hip Thrust', 6, 4, 10, 12, 90);
  await addEj(legs, 'Elevación de Gemelos de Pie', 7, 4, 12, 15, 60);

  // JUEVES — Pull 2 Intensificación
  const pull2 = await insertRutina('Pull 2 Intensificación', 4, 'Espalda horizontal + Core');
  await addEj(pull2, 'Jalón al Pecho Agarre Amplio', 1, 4, 8, 10, 120);
  await addEj(pull2, 'Remo en T', 2, 4, 8, 10, 120);
  await addEj(pull2, 'Pullover con Cable', 3, 3, 10, 12, 90);
  await addEj(pull2, 'Face Pull', 4, 3, 12, 15, 90);
  await addEj(pull2, 'Curl Martillo', 5, 3, 10, 12, 90);
  await addEj(pull2, 'Plancha', 6, 3, 45, 60, 60, 'Segundos de aguante');

  // VIERNES — Push 2 Intensificación
  const push2 = await insertRutina('Push 2 Intensificación', 5, 'Hombros / Pecho / Tríceps + Core unilateral');
  await addEj(push2, 'Press Militar con Barra', 1, 4, 6, 8, 120);
  await addEj(push2, 'Press de Banca Plano con Barra', 2, 4, 8, 10, 120);
  await addEj(push2, 'Fondos con Peso', 3, 3, 8, 10, 120);
  await addEj(push2, 'Elevaciones Laterales con Mancuerna', 4, 4, 12, 15, 90);
  await addEj(push2, 'Extensión de Tríceps con Barra', 5, 3, 10, 12, 90);
  await addEj(push2, 'Plancha Lateral', 6, 3, 30, 45, 60, 'Por lado — unilateral');

  console.log('✅ 5 rutinas de Campaña 3 creadas');
};

module.exports = runMigrations;
