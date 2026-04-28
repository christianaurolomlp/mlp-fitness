const fs = require('fs');
const path = require('path');
const seed = require('../../../database/seed');

const isProduction = !!process.env.DATABASE_URL;

let pool, connect;

if (isProduction) {
  const { Pool } = require('pg');
  const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  pool = pgPool;
  connect = () => pgPool.connect();
} else {
  const adapter = require('./sqlite-adapter');
  pool = { query: adapter.query };
  connect = adapter.connect;
}

const initDB = async () => {
  const schemaFile = isProduction ? 'schema.sql' : 'schema-sqlite.sql';
  const schemaSQL = fs.readFileSync(
    path.join(__dirname, '../../../database', schemaFile),
    'utf8'
  );

  if (isProduction) {
    await pool.query(schemaSQL);
  } else {
    // SQLite: ejecutar cada statement por separado
    const { default: Database } = await import('better-sqlite3').catch(() => ({ default: require('better-sqlite3') }));
    const dbPath = path.join(__dirname, '../../../local.db');
    const db = require('better-sqlite3')(dbPath);
    db.pragma('foreign_keys = ON');
    const statements = schemaSQL.split(';').map(s => s.trim()).filter(Boolean);
    for (const stmt of statements) {
      try { db.prepare(stmt).run(); } catch {}
    }
    db.close();
  }

  console.log('✅ Schema verificado/creado');

  // 1. Migraciones (idempotente — crean schema, campanias, columnas)
  const runMigrations = require('../../../database/migration');
  await runMigrations(pool);

  const runMigrationsV3 = require('../../../database/migration-v3-completo');
  await runMigrationsV3(pool);

  // 2. FORCE_SEED: limpia y reseedea (para estados rotos)
  if (process.env.FORCE_SEED === '1') {
    console.log('🔥 FORCE_SEED activo — limpiando y reseeding...');
    await pool.query('DELETE FROM series_realizadas').catch(() => {});
    await pool.query('DELETE FROM entrenos').catch(() => {});
    await pool.query('DELETE FROM records_personales').catch(() => {});
    await pool.query('DELETE FROM rutina_ejercicios').catch(() => {});
    await pool.query('DELETE FROM rutinas').catch(() => {});
    await pool.query('DELETE FROM ejercicios').catch(() => {});
    await pool.query('DELETE FROM campanias').catch(() => {});
    console.log('🗑️  Tablas limpiadas');
    await runMigrations(pool);    // campanias, columnas
    await seed(pool);             // ejercicios + C1 rutinas
    await runMigrationsV3(pool);  // cardio, C2 rutinas
    console.log('✅ FORCE_SEED completado');
    return;
  }

  // 3. Seed de rutinas de Campaña 1 si no existen (estado roto frecuente)
  // La campaña activa es la 1; seed crea sus 5 rutinas base
  let campania1Id = null;
  try {
    const { rows: cr } = await pool.query("SELECT id FROM campanias WHERE orden = 1 LIMIT 1");
    if (cr.length > 0) campania1Id = cr[0].id;
  } catch(e) {}

  const rutinaCheck = campania1Id
    ? await pool.query('SELECT COUNT(*) as count FROM rutinas WHERE campania_id = $1', [campania1Id])
    : await pool.query('SELECT COUNT(*) as count FROM rutinas WHERE campania_id IS NULL');

  const c1Count = parseInt(rutinaCheck.rows[0].count || 0);
  console.log(`📊 Rutinas Campaña 1: ${c1Count}`);

  if (c1Count === 0) {
    console.log('🌱 Campaña 1 sin rutinas — ejecutando seed...');
    try {
      await seed(pool);
      // Vincular las nuevas rutinas a Campaña 1
      if (campania1Id) {
        await pool.query('UPDATE rutinas SET campania_id = $1 WHERE campania_id IS NULL', [campania1Id]);
      }
      const { rows: check } = await pool.query('SELECT COUNT(*) as count FROM rutinas');
      console.log(`✅ Seed completado. Total rutinas: ${check[0].count}`);
    } catch (err) {
      console.error('❌ Error en seed:', err.message, err.stack);
    }
  } else {
    console.log('✅ Rutinas Campaña 1 presentes, seed omitido');
  }
};

module.exports = { pool, connect, initDB };
