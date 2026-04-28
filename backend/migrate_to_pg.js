// Este script corre dentro del entorno Railway con DATABASE_URL disponible
const { Pool } = require('pg');
const data = require('/tmp/mlp_fitness_data.json');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function migrate() {
  const client = await pool.connect();
  try {
    // Ver tablas existentes
    const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    console.log('Tablas PG:', tables.rows.map(r => r.table_name));
    
    // Insertar campañas
    for (const c of data.campanias) {
      await client.query(
        `INSERT INTO campanias (id, nombre, descripcion, activa, fecha_inicio, fecha_fin, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
        [c.id, c.nombre, c.descripcion, c.activa, c.fecha_inicio, c.fecha_fin, c.created_at]
      ).catch(e => console.log('campania skip:', e.message));
    }
    console.log(`✅ Campañas: ${data.campanias.length}`);

    // Insertar rutinas
    for (const r of data.rutinas) {
      await client.query(
        `INSERT INTO rutinas (id, nombre, descripcion, dia_semana, orden, campania_id, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
        [r.id, r.nombre, r.descripcion, r.dia_semana, r.orden, r.campania_id, r.created_at]
      ).catch(e => console.log('rutina skip:', e.message));
    }
    console.log(`✅ Rutinas: ${data.rutinas.length}`);

    // Insertar ejercicios
    for (const e of data.ejercicios) {
      await client.query(
        `INSERT INTO ejercicios (id, nombre, grupo_muscular, descripcion, imagen_url, es_cardio, medir_en_segundos, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
        [e.id, e.nombre, e.grupo_muscular, e.descripcion, e.imagen_url, e.es_cardio||false, e.medir_en_segundos||false, e.created_at]
      ).catch(e2 => console.log('ejercicio skip:', e2.message));
    }
    console.log(`✅ Ejercicios: ${data.ejercicios.length}`);

    // Insertar rutina_ejercicios
    for (const re of data.rutina_ejercicios) {
      await client.query(
        `INSERT INTO rutina_ejercicios (id, rutina_id, ejercicio_id, series, reps, peso_inicial, orden, descanso, notas, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
        [re.id, re.rutina_id, re.ejercicio_id, re.series, re.reps, re.peso_inicial, re.orden, re.descanso, re.notas, re.created_at]
      ).catch(e => console.log('re skip:', e.message));
    }
    console.log(`✅ Rutina_ejercicios: ${data.rutina_ejercicios.length}`);

    // Insertar entrenos
    for (const e of data.entrenos) {
      await client.query(
        `INSERT INTO entrenos (id, rutina_id, fecha, duracion_minutos, notas, completado, campania_id, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
        [e.id, e.rutina_id, e.fecha, e.duracion_minutos, e.notas, e.completado, e.campania_id, e.created_at]
      ).catch(e2 => console.log('entreno skip:', e2.message));
    }
    console.log(`✅ Entrenos: ${data.entrenos.length}`);

    // Insertar series
    for (const s of data.series_realizadas) {
      await client.query(
        `INSERT INTO series_realizadas (id, entreno_id, ejercicio_id, numero_serie, reps_realizadas, peso, completada, notas, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
        [s.id, s.entreno_id, s.ejercicio_id, s.numero_serie, s.reps_realizadas, s.peso, s.completada, s.notas, s.created_at]
      ).catch(e => console.log('serie skip:', e.message));
    }
    console.log(`✅ Series: ${data.series_realizadas.length}`);

    // Records
    for (const r of data.records_personales) {
      await client.query(
        `INSERT INTO records_personales (id, ejercicio_id, peso_maximo, reps, fecha, created_at)
         VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
        [r.id, r.ejercicio_id, r.peso_maximo, r.reps, r.fecha, r.created_at]
      ).catch(e => console.log('record skip:', e.message));
    }
    console.log(`✅ Records: ${data.records_personales.length}`);

    console.log('🎉 MIGRACIÓN COMPLETA');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);
