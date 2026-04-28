// MLP FITNESS - Script de seed con la rutina de Capi
// Se ejecuta automáticamente si la tabla rutinas está vacía

const seed = async (db) => {
  console.log('🌱 Ejecutando seed de rutinas...');

  // Ejercicios con su grupo muscular y equipamiento
  const ejercicios = [
    // PUSH 1
    { nombre: 'Press de Banca Inclinado', grupo_muscular: 'Pecho', equipamiento: 'Mancuerna', es_unilateral: false },
    { nombre: 'Press de Pecho', grupo_muscular: 'Pecho', equipamiento: 'Máquina', es_unilateral: false },
    { nombre: 'Aperturas', grupo_muscular: 'Pecho', equipamiento: 'Máquina', es_unilateral: false },
    { nombre: 'Press de Hombros', grupo_muscular: 'Hombros', equipamiento: 'Mancuerna', es_unilateral: false },
    { nombre: 'Elevaciones Laterales', grupo_muscular: 'Hombros', equipamiento: 'Máquina', es_unilateral: false },
    { nombre: 'Extensión de Tríceps con Cuerda', grupo_muscular: 'Brazos', equipamiento: 'Cable', es_unilateral: false },
    // PULL 1
    { nombre: 'Jalón al Pecho', grupo_muscular: 'Espalda', equipamiento: 'Cable', es_unilateral: false },
    { nombre: 'Remo Sentado con Agarre en V', grupo_muscular: 'Espalda', equipamiento: 'Cable', es_unilateral: false },
    { nombre: 'Remo Inclinado con Apoyo de Pecho', grupo_muscular: 'Espalda', equipamiento: 'Mancuerna', es_unilateral: false },
    { nombre: 'Vuelos Posteriores', grupo_muscular: 'Espalda', equipamiento: 'Máquina', es_unilateral: false },
    { nombre: 'Curl Predicador', grupo_muscular: 'Brazos', equipamiento: 'Máquina', es_unilateral: false },
    { nombre: 'Curl Martillo', grupo_muscular: 'Brazos', equipamiento: 'Mancuerna', es_unilateral: false },
    // LEGS
    { nombre: 'Sentadilla Búlgara', grupo_muscular: 'Pierna', equipamiento: 'Mancuerna', es_unilateral: true },
    { nombre: 'Press de Piernas', grupo_muscular: 'Pierna', equipamiento: 'Máquina', es_unilateral: false },
    { nombre: 'Peso Muerto Rumano', grupo_muscular: 'Pierna', equipamiento: 'Mancuerna', es_unilateral: false },
    { nombre: 'Curl de Piernas Acostado', grupo_muscular: 'Pierna', equipamiento: 'Máquina', es_unilateral: false },
    { nombre: 'Extensión de Pierna', grupo_muscular: 'Pierna', equipamiento: 'Máquina', es_unilateral: false },
    { nombre: 'Hip Thrust', grupo_muscular: 'Pierna', equipamiento: 'Barra', es_unilateral: false },
    { nombre: 'Extensión de Pantorrilla', grupo_muscular: 'Pierna', equipamiento: 'Máquina', es_unilateral: false },
    // PULL 2
    { nombre: 'Jalón al Pecho Agarre Neutro', grupo_muscular: 'Espalda', equipamiento: 'Cable', es_unilateral: false },
    { nombre: 'Remo Iso-Lateral', grupo_muscular: 'Espalda', equipamiento: 'Máquina', es_unilateral: false },
    { nombre: 'Jalón de Remo a Un Brazo', grupo_muscular: 'Espalda', equipamiento: 'Cable', es_unilateral: true },
    { nombre: 'Face Pull', grupo_muscular: 'Hombros', equipamiento: 'Cable', es_unilateral: false },
    { nombre: 'Curl de Bíceps', grupo_muscular: 'Brazos', equipamiento: 'Mancuerna', es_unilateral: false },
    // PUSH 2
    { nombre: 'Press de Banca Plano', grupo_muscular: 'Pecho', equipamiento: 'Mancuerna', es_unilateral: false },
    { nombre: 'Press de Hombros Máquina', grupo_muscular: 'Hombros', equipamiento: 'Máquina', es_unilateral: false },
    { nombre: 'Fondos en Paralelas', grupo_muscular: 'Pecho', equipamiento: 'Peso Corporal', es_unilateral: false },
    { nombre: 'Elevaciones Laterales con Cable', grupo_muscular: 'Hombros', equipamiento: 'Cable', es_unilateral: false },
    { nombre: 'Extensión de Tríceps Sobre la Cabeza', grupo_muscular: 'Brazos', equipamiento: 'Cable', es_unilateral: false },
    { nombre: 'Plancha', grupo_muscular: 'Core', equipamiento: 'Peso Corporal', es_unilateral: false },
  ];

  // Insertar ejercicios y obtener sus IDs (idempotente)
  const ejercicioIds = {};
  for (const ej of ejercicios) {
    // Buscar si ya existe (evita duplicados)
    const { rows: existing } = await db.query('SELECT id FROM ejercicios WHERE nombre = $1 LIMIT 1', [ej.nombre]);
    if (existing.length > 0) {
      ejercicioIds[ej.nombre] = existing[0].id;
    } else {
      const result = await db.query(
        `INSERT INTO ejercicios (nombre, grupo_muscular, equipamiento, es_unilateral)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [ej.nombre, ej.grupo_muscular, ej.equipamiento, ej.es_unilateral]
      );
      ejercicioIds[ej.nombre] = result.rows[0].id;
    }
  }

  // Rutinas
  const rutinas = [
    { nombre: 'Push 1', dia_semana: 1, descripcion: 'Pecho / Hombros / Tríceps' },
    { nombre: 'Pull 1', dia_semana: 2, descripcion: 'Espalda / Bíceps' },
    { nombre: 'Legs', dia_semana: 3, descripcion: 'Pierna completa' },
    { nombre: 'Pull 2', dia_semana: 4, descripcion: 'Espalda / Bíceps (variación)' },
    { nombre: 'Push 2', dia_semana: 5, descripcion: 'Pecho / Hombros / Tríceps (variación)' },
  ];

  const rutinaIds = {};
  for (const rut of rutinas) {
    const result = await db.query(
      `INSERT INTO rutinas (nombre, dia_semana, descripcion) VALUES ($1, $2, $3) RETURNING id`,
      [rut.nombre, rut.dia_semana, rut.descripcion]
    );
    rutinaIds[rut.nombre] = result.rows[0].id;
  }

  // Función helper para insertar ejercicio en rutina
  const addEj = async (rutinaId, nombreEj, orden, series, repsMin, repsMax, descanso, nota = null) => {
    await db.query(
      `INSERT INTO rutina_ejercicios (rutina_id, ejercicio_id, orden, series_objetivo, reps_min, reps_max, descanso_segundos, nota_especial)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [rutinaId, ejercicioIds[nombreEj], orden, series, repsMin, repsMax, descanso, nota]
    );
  };

  // PUSH 1 - Lunes
  const push1 = rutinaIds['Push 1'];
  await addEj(push1, 'Press de Banca Inclinado', 1, 4, 8, 10, 120);
  await addEj(push1, 'Press de Pecho', 2, 3, 10, 12, 120);
  await addEj(push1, 'Aperturas', 3, 3, 12, 15, 90);
  await addEj(push1, 'Press de Hombros', 4, 3, 8, 10, 120);
  await addEj(push1, 'Elevaciones Laterales', 5, 4, 12, 15, 90);
  await addEj(push1, 'Extensión de Tríceps con Cuerda', 6, 3, 10, 12, 90);

  // PULL 1 - Martes
  const pull1 = rutinaIds['Pull 1'];
  await addEj(pull1, 'Jalón al Pecho', 1, 4, 8, 10, 120);
  await addEj(pull1, 'Remo Sentado con Agarre en V', 2, 4, 10, 10, 120);
  await addEj(pull1, 'Remo Inclinado con Apoyo de Pecho', 3, 3, 10, 12, 90);
  await addEj(pull1, 'Vuelos Posteriores', 4, 3, 12, 15, 90);
  await addEj(pull1, 'Curl Predicador', 5, 3, 10, 12, 90);
  await addEj(pull1, 'Curl Martillo', 6, 3, 10, 12, 90);

  // LEGS - Miércoles
  const legs = rutinaIds['Legs'];
  await addEj(legs, 'Sentadilla Búlgara', 1, 3, 8, 10, 120, 'Por pierna — unilateral');
  await addEj(legs, 'Press de Piernas', 2, 4, 10, 12, 120);
  await addEj(legs, 'Peso Muerto Rumano', 3, 4, 10, 12, 120);
  await addEj(legs, 'Curl de Piernas Acostado', 4, 3, 12, 12, 90);
  await addEj(legs, 'Extensión de Pierna', 5, 3, 12, 15, 90);
  await addEj(legs, 'Hip Thrust', 6, 3, 12, 15, 90);
  await addEj(legs, 'Extensión de Pantorrilla', 7, 4, 15, 20, 60);

  // PULL 2 - Jueves
  const pull2 = rutinaIds['Pull 2'];
  await addEj(pull2, 'Jalón al Pecho Agarre Neutro', 1, 4, 8, 10, 120);
  await addEj(pull2, 'Remo Iso-Lateral', 2, 4, 10, 10, 120);
  await addEj(pull2, 'Jalón de Remo a Un Brazo', 3, 3, 12, 12, 90, 'Por lado — unilateral');
  await addEj(pull2, 'Face Pull', 4, 3, 15, 15, 90);
  await addEj(pull2, 'Curl de Bíceps', 5, 3, 10, 12, 90);

  // PUSH 2 - Viernes
  const push2 = rutinaIds['Push 2'];
  await addEj(push2, 'Press de Banca Plano', 1, 4, 8, 10, 120);
  await addEj(push2, 'Press de Hombros Máquina', 2, 3, 10, 12, 120);
  await addEj(push2, 'Fondos en Paralelas', 3, 3, 10, 10, 120, 'Asistido si es necesario');
  await addEj(push2, 'Elevaciones Laterales con Cable', 4, 3, 15, 15, 90);
  await addEj(push2, 'Extensión de Tríceps Sobre la Cabeza', 5, 3, 10, 12, 90);
  await addEj(push2, 'Plancha', 6, 3, 45, 60, 60, 'Segundos de aguante — reps = segundos');

  console.log('✅ Seed completado: 5 rutinas, 30 ejercicios cargados.');
};

module.exports = seed;
