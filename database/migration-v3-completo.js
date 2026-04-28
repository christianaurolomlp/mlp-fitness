// MLP FITNESS - Migración v3.0: Cardio + Core + Campaña 2 completa + Fixes
// Idempotente — solo agrega, nunca elimina datos de usuarios

const isProduction = !!process.env.DATABASE_URL;

module.exports = async function runMigrationsV3(pool) {
  console.log('🔄 Ejecutando migraciones v3.0...');

  // ─────────────────────────────────────────────────────────────
  // FIX 1 — Crear 5 ejercicios nuevos (si no existen)
  // ─────────────────────────────────────────────────────────────
  const ejerciciosNuevos = [
    { nombre: 'Caminadora',               grupo_muscular: 'Cardio', equipamiento: 'Cardio',       tipo_medicion: 'minutos', es_unilateral: 0 },
    { nombre: 'Caminadora Recuperación',  grupo_muscular: 'Cardio', equipamiento: 'Cardio',       tipo_medicion: 'minutos', es_unilateral: 0 },
    { nombre: 'Caminadora Intensificación', grupo_muscular: 'Cardio', equipamiento: 'Cardio',     tipo_medicion: 'minutos', es_unilateral: 0 },
    { nombre: 'Rodillas al Pecho Colgado', grupo_muscular: 'Core',  equipamiento: 'Peso Corporal', tipo_medicion: 'reps',   es_unilateral: 0 },
    { nombre: 'Russian Twist con Peso',   grupo_muscular: 'Core',   equipamiento: 'Mancuerna',    tipo_medicion: 'reps',   es_unilateral: 1 },
  ];

  // Cargar mapa completo nombre → id
  const { rows: existentes } = await pool.query('SELECT id, nombre FROM ejercicios');
  const ejIds = {};
  for (const e of existentes) {
    ejIds[e.nombre] = e.id;
  }

  let creados = 0;
  for (const ej of ejerciciosNuevos) {
    if (!ejIds[ej.nombre]) {
      const { rows } = await pool.query(
        `INSERT INTO ejercicios (nombre, grupo_muscular, equipamiento, es_unilateral, tipo_medicion)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [ej.nombre, ej.grupo_muscular, ej.equipamiento, ej.es_unilateral, ej.tipo_medicion]
      );
      ejIds[ej.nombre] = rows[0].id;
      creados++;
    }
  }
  console.log(`✅ ${creados} ejercicios cardio/core creados (${ejerciciosNuevos.length - creados} ya existían)`);

  // ─────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────

  // Obtener siguiente orden_posicion para una rutina
  const getNextOrden = async (rutinaId) => {
    const { rows } = await pool.query(
      'SELECT COALESCE(MAX(orden), 0) + 1 AS next FROM rutina_ejercicios WHERE rutina_id = $1',
      [rutinaId]
    );
    return parseInt(rows[0].next || rows[0].NEXT || 1);
  };

  // Verificar si ejercicio ya existe en rutina
  const existeEnRutina = async (rutinaId, ejercicioId) => {
    const { rows } = await pool.query(
      'SELECT id FROM rutina_ejercicios WHERE rutina_id = $1 AND ejercicio_id = $2 LIMIT 1',
      [rutinaId, ejercicioId]
    );
    return rows.length > 0;
  };

  // Añadir ejercicio a rutina si no existe
  const addEjercicioSiNoExiste = async (rutinaId, nombreEj, series, repsMin, repsMax, descanso, nota = null) => {
    const ejId = ejIds[nombreEj];
    if (!ejId) {
      console.warn(`⚠️  Ejercicio no encontrado: ${nombreEj}`);
      return false;
    }
    const yaExiste = await existeEnRutina(rutinaId, ejId);
    if (yaExiste) {
      return false; // ya estaba
    }
    const orden = await getNextOrden(rutinaId);
    await pool.query(
      `INSERT INTO rutina_ejercicios (rutina_id, ejercicio_id, orden, series_objetivo, reps_min, reps_max, descanso_segundos, nota_especial)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [rutinaId, ejId, orden, series, repsMin, repsMax, descanso, nota]
    );
    return true;
  };

  // Obtener rutina de campaña por dia_semana
  const getRutinaCampania = async (campaniaId, diaSemana) => {
    const { rows } = await pool.query(
      'SELECT id FROM rutinas WHERE campania_id = $1 AND dia_semana = $2 LIMIT 1',
      [campaniaId, diaSemana]
    );
    return rows.length > 0 ? rows[0].id : null;
  };

  // Insertar rutina nueva
  const insertRutina = async (nombre, dia, descripcion, campaniaId) => {
    const { rows } = await pool.query(
      `INSERT INTO rutinas (nombre, dia_semana, descripcion, campania_id)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [nombre, dia, descripcion, campaniaId]
    );
    return rows[0].id;
  };

  // ─────────────────────────────────────────────────────────────
  // FIX 2 — Campaña 1: añadir cardio y core a sus 5 rutinas
  // ─────────────────────────────────────────────────────────────
  console.log('🔄 Actualizando Campaña 1...');

  // LUNES (dia_semana=1) — Push 1
  const rutinaC1L = await getRutinaCampania(1, 1);
  if (rutinaC1L) {
    await addEjercicioSiNoExiste(rutinaC1L, 'Caminadora', 1, 20, 25, 0, '6 km/h, inclinación 8%');
  }

  // MARTES (dia_semana=2) — Pull 1
  const rutinaC1Ma = await getRutinaCampania(1, 2);
  if (rutinaC1Ma) {
    await addEjercicioSiNoExiste(rutinaC1Ma, 'Plancha',                3, 45, 60, 60, null);
    await addEjercicioSiNoExiste(rutinaC1Ma, 'Rodillas al Pecho Colgado', 3, 12, 15, 60, null);
    await addEjercicioSiNoExiste(rutinaC1Ma, 'Caminadora',             1, 20, 25, 0, '6 km/h, inclinación 8%');
  }

  // MIÉRCOLES (dia_semana=3) — Legs
  const rutinaC1Mi = await getRutinaCampania(1, 3);
  if (rutinaC1Mi) {
    await addEjercicioSiNoExiste(rutinaC1Mi, 'Caminadora Recuperación', 1, 15, 15, 0, '5 km/h, inclinación 5% — recuperación activa');
  }

  // JUEVES (dia_semana=4) — Pull 2
  const rutinaC1J = await getRutinaCampania(1, 4);
  if (rutinaC1J) {
    await addEjercicioSiNoExiste(rutinaC1J, 'Caminadora', 1, 20, 25, 0, '6 km/h, inclinación 8%');
  }

  // VIERNES (dia_semana=5) — Push 2
  const rutinaC1V = await getRutinaCampania(1, 5);
  if (rutinaC1V) {
    // Eliminar Plancha de Viernes si existe
    const idPlancha = ejIds['Plancha'];
    if (idPlancha) {
      const { rows: planchaRows } = await pool.query(
        'SELECT id FROM rutina_ejercicios WHERE rutina_id = $1 AND ejercicio_id = $2 LIMIT 1',
        [rutinaC1V, idPlancha]
      );
      if (planchaRows.length > 0) {
        await pool.query('DELETE FROM rutina_ejercicios WHERE id = $1', [planchaRows[0].id]);
        console.log('  ✅ Plancha eliminada de Viernes C1');
      }
    }
    await addEjercicioSiNoExiste(rutinaC1V, 'Plancha Lateral',         3, 30, 45, 60, 'Por cada lado');
    await addEjercicioSiNoExiste(rutinaC1V, 'Russian Twist con Peso',  3, 15, 15, 60, 'Por cada lado');
    await addEjercicioSiNoExiste(rutinaC1V, 'Caminadora',              1, 20, 25, 0,  '6 km/h, inclinación 8%');
  }

  console.log('✅ Campaña 1 actualizada');

  // ─────────────────────────────────────────────────────────────
  // FIX 3 — Campaña 2: crear 5 rutinas completas (solo si no existen)
  // ─────────────────────────────────────────────────────────────
  const { rows: c2Rows } = await pool.query('SELECT COUNT(*) as count FROM rutinas WHERE campania_id = 2');
  const c2Count = parseInt(c2Rows[0].count || c2Rows[0].COUNT || 0);

  if (c2Count > 0) {
    console.log('✅ Campaña 2 ya tiene rutinas, seed omitido');
  } else {
    console.log('🌱 Creando rutinas de Campaña 2...');

    // LUNES — Push 1 Progresión
    const c2L = await insertRutina('Push 1 — Progresión', 1, 'Pecho / Hombros / Tríceps — SUBIR PESO cada semana', 2);
    await addEjercicioSiNoExiste(c2L, 'Press de Banca Inclinado',         4, 8,  10, 120, null);
    await addEjercicioSiNoExiste(c2L, 'Press de Pecho',                   3, 10, 12, 120, null);
    await addEjercicioSiNoExiste(c2L, 'Aperturas',                        3, 12, 15, 90,  null);
    await addEjercicioSiNoExiste(c2L, 'Press de Hombros',                 3, 8,  10, 120, null);
    await addEjercicioSiNoExiste(c2L, 'Elevaciones Laterales',            4, 12, 15, 90,  null);
    await addEjercicioSiNoExiste(c2L, 'Extensión de Tríceps con Cuerda',  3, 10, 12, 90,  null);
    await addEjercicioSiNoExiste(c2L, 'Caminadora',                       1, 20, 25, 0,   '6 km/h, 8% inclinación');

    // MARTES — Pull 1 Progresión
    const c2Ma = await insertRutina('Pull 1 — Progresión', 2, 'Espalda / Bíceps — SUBIR PESO cada semana', 2);
    await addEjercicioSiNoExiste(c2Ma, 'Jalón al Pecho',                    4, 8,  10, 120, null);
    await addEjercicioSiNoExiste(c2Ma, 'Remo Sentado con Agarre en V',      4, 8,  10, 120, null);
    await addEjercicioSiNoExiste(c2Ma, 'Remo Inclinado con Apoyo de Pecho', 3, 10, 12, 90,  null);
    await addEjercicioSiNoExiste(c2Ma, 'Vuelos Posteriores',                3, 12, 15, 90,  null);
    await addEjercicioSiNoExiste(c2Ma, 'Curl Predicador',                   3, 10, 12, 90,  null);
    await addEjercicioSiNoExiste(c2Ma, 'Curl Martillo',                     3, 10, 12, 90,  null);
    await addEjercicioSiNoExiste(c2Ma, 'Plancha',                           3, 45, 60, 60,  null);
    await addEjercicioSiNoExiste(c2Ma, 'Rodillas al Pecho Colgado',         3, 12, 15, 60,  null);
    await addEjercicioSiNoExiste(c2Ma, 'Caminadora',                        1, 20, 25, 0,   null);

    // MIÉRCOLES — Legs Progresión
    const c2Mi = await insertRutina('Legs — Progresión', 3, 'Pierna completa — SUBIR PESO en compuestos', 2);
    await addEjercicioSiNoExiste(c2Mi, 'Sentadilla Búlgara',         3, 8,  10, 120, null);
    await addEjercicioSiNoExiste(c2Mi, 'Press de Piernas',           4, 10, 12, 120, null);
    await addEjercicioSiNoExiste(c2Mi, 'Peso Muerto Rumano',         4, 10, 12, 120, null);
    await addEjercicioSiNoExiste(c2Mi, 'Curl de Piernas Acostado',   3, 10, 12, 90,  null);
    await addEjercicioSiNoExiste(c2Mi, 'Extensión de Pierna',        3, 12, 15, 90,  null);
    await addEjercicioSiNoExiste(c2Mi, 'Hip Thrust',                 3, 12, 15, 90,  null);
    await addEjercicioSiNoExiste(c2Mi, 'Extensión de Pantorrilla',   4, 15, 20, 60,  null);
    await addEjercicioSiNoExiste(c2Mi, 'Caminadora Recuperación',    1, 15, 15, 0,   null);

    // JUEVES — Pull 2 Progresión
    const c2J = await insertRutina('Pull 2 — Progresión', 4, 'Espalda / Bíceps variación', 2);
    await addEjercicioSiNoExiste(c2J, 'Jalón al Pecho Agarre Neutro',    4, 8,  10, 120, null);
    await addEjercicioSiNoExiste(c2J, 'Remo Iso-Lateral',                4, 10, 12, 120, null);
    await addEjercicioSiNoExiste(c2J, 'Jalón de Remo a Un Brazo',        3, 10, 12, 90,  null);
    await addEjercicioSiNoExiste(c2J, 'Face Pull',                       3, 12, 15, 90,  null);
    await addEjercicioSiNoExiste(c2J, 'Curl de Bíceps',                  3, 10, 12, 90,  null);
    await addEjercicioSiNoExiste(c2J, 'Caminadora',                      1, 20, 25, 0,   null);

    // VIERNES — Push 2 Progresión
    const c2V = await insertRutina('Push 2 — Progresión', 5, 'Pecho / Hombros / Tríceps variación', 2);
    await addEjercicioSiNoExiste(c2V, 'Press de Banca Plano',                     4, 8,  10, 120, null);
    await addEjercicioSiNoExiste(c2V, 'Press de Hombros Máquina',                 3, 10, 12, 120, null);
    await addEjercicioSiNoExiste(c2V, 'Fondos en Paralelas',                      3, 8,  10, 120, null);
    await addEjercicioSiNoExiste(c2V, 'Elevaciones Laterales con Cable',          3, 12, 15, 90,  null);
    await addEjercicioSiNoExiste(c2V, 'Extensión de Tríceps Sobre la Cabeza',     3, 10, 12, 90,  null);
    await addEjercicioSiNoExiste(c2V, 'Plancha Lateral',                          3, 30, 45, 60,  'Por cada lado');
    await addEjercicioSiNoExiste(c2V, 'Russian Twist con Peso',                   3, 15, 15, 60,  'Por cada lado');
    await addEjercicioSiNoExiste(c2V, 'Caminadora',                               1, 20, 25, 0,   null);

    console.log('✅ 5 rutinas de Campaña 2 creadas');
  }

  // ─────────────────────────────────────────────────────────────
  // FIX 4 — Campaña 3: añadir cardio + reorganizar core
  // ─────────────────────────────────────────────────────────────
  console.log('🔄 Actualizando Campaña 3...');

  // LUNES (dia_semana=1)
  const rutinaC3L = await getRutinaCampania(3, 1);
  if (rutinaC3L) {
    await addEjercicioSiNoExiste(rutinaC3L, 'Caminadora Intensificación', 1, 25, 30, 0, '6.5 km/h, 10% inclinación');
  }

  // MARTES (dia_semana=2)
  const rutinaC3Ma = await getRutinaCampania(3, 2);
  if (rutinaC3Ma) {
    await addEjercicioSiNoExiste(rutinaC3Ma, 'Plancha',                    3, 60, 60, 60, null);
    await addEjercicioSiNoExiste(rutinaC3Ma, 'Rodillas al Pecho Colgado',  3, 15, 15, 60, null);
    await addEjercicioSiNoExiste(rutinaC3Ma, 'Caminadora Intensificación', 1, 25, 30, 0,  '6.5 km/h, 10% inclinación');
  }

  // MIÉRCOLES (dia_semana=3)
  const rutinaC3Mi = await getRutinaCampania(3, 3);
  if (rutinaC3Mi) {
    await addEjercicioSiNoExiste(rutinaC3Mi, 'Caminadora Recuperación', 1, 15, 15, 0, '5 km/h, 5% — post-pierna');
  }

  // JUEVES (dia_semana=4)
  const rutinaC3J = await getRutinaCampania(3, 4);
  if (rutinaC3J) {
    // Eliminar Plancha de Jueves C3 si existe
    const idPlancha = ejIds['Plancha'];
    if (idPlancha) {
      const { rows: planchaRows } = await pool.query(
        'SELECT id FROM rutina_ejercicios WHERE rutina_id = $1 AND ejercicio_id = $2 LIMIT 1',
        [rutinaC3J, idPlancha]
      );
      if (planchaRows.length > 0) {
        await pool.query('DELETE FROM rutina_ejercicios WHERE id = $1', [planchaRows[0].id]);
        console.log('  ✅ Plancha eliminada de Jueves C3');
      }
    }
    await addEjercicioSiNoExiste(rutinaC3J, 'Caminadora Intensificación', 1, 25, 30, 0, '6.5 km/h, 10% inclinación');
  }

  // VIERNES (dia_semana=5)
  const rutinaC3V = await getRutinaCampania(3, 5);
  if (rutinaC3V) {
    await addEjercicioSiNoExiste(rutinaC3V, 'Russian Twist con Peso',   3, 15, 15, 60, 'Por cada lado');
    await addEjercicioSiNoExiste(rutinaC3V, 'Caminadora Intensificación', 1, 25, 30, 0, '6.5 km/h, 10% inclinación');
  }

  console.log('✅ Campaña 3 actualizada');

  // ─────────────────────────────────────────────────────────────
  // FIX 5 — Correcciones de reps
  // ─────────────────────────────────────────────────────────────
  try {
    await pool.query(`
      UPDATE rutina_ejercicios SET reps_min = 8
      WHERE ejercicio_id = (SELECT id FROM ejercicios WHERE nombre = 'Fondos en Paralelas' LIMIT 1)
        AND reps_min = 10 AND reps_max = 10
    `);
    await pool.query(`
      UPDATE rutina_ejercicios SET reps_min = 12
      WHERE ejercicio_id = (SELECT id FROM ejercicios WHERE nombre = 'Elevaciones Laterales con Cable' LIMIT 1)
        AND reps_min = 15 AND reps_max = 15
    `);
    console.log('✅ Correcciones de reps aplicadas');
  } catch (e) {
    console.log('⚠️  Correcciones de reps (ignorando errores):', e.message);
  }

  console.log('✅ Migraciones v3.0 completadas');
};
