// Script para poblar imagen_url en todos los ejercicios
// Ejecutar: node database/update-images.js

require('dotenv').config({ path: './backend/.env' });
const path = require('path');

const BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';

const IMAGENES = {
  'Press de Banca Inclinado':             `${BASE}/Incline_Dumbbell_Press/0.jpg`,
  'Press de Pecho':                        `${BASE}/Leverage_Chest_Press/0.jpg`,
  'Aperturas':                             `${BASE}/Butterfly/0.jpg`,
  'Press de Hombros':                      `${BASE}/Dumbbell_Shoulder_Press/0.jpg`,
  'Elevaciones Laterales':                 `${BASE}/Side_Lateral_Raise/0.jpg`,
  'Extensión de Tríceps con Cuerda':       `${BASE}/Triceps_Pushdown_-_Rope_Attachment/0.jpg`,
  'Jalón al Pecho':                        `${BASE}/Wide-Grip_Lat_Pulldown/0.jpg`,
  'Remo Sentado con Agarre en V':          `${BASE}/Seated_Cable_Rows/0.jpg`,
  'Remo Inclinado con Apoyo de Pecho':     `${BASE}/Dumbbell_Incline_Row/0.jpg`,
  'Vuelos Posteriores':                    `${BASE}/Reverse_Machine_Flyes/0.jpg`,
  'Curl Predicador':                       `${BASE}/Machine_Preacher_Curls/0.jpg`,
  'Curl Martillo':                         `${BASE}/Hammer_Curls/0.jpg`,
  'Sentadilla Búlgara':                    `${BASE}/Split_Squat_with_Dumbbells/0.jpg`,
  'Press de Piernas':                      `${BASE}/Leg_Press/0.jpg`,
  'Peso Muerto Rumano':                    `${BASE}/Stiff-Legged_Dumbbell_Deadlift/0.jpg`,
  'Curl de Piernas Acostado':              `${BASE}/Lying_Leg_Curls/0.jpg`,
  'Extensión de Pierna':                   `${BASE}/Leg_Extensions/0.jpg`,
  'Hip Thrust':                            `${BASE}/Barbell_Hip_Thrust/0.jpg`,
  'Extensión de Pantorrilla':              `${BASE}/Standing_Calf_Raises/0.jpg`,
  'Jalón al Pecho Agarre Neutro':          `${BASE}/V-Bar_Pulldown/0.jpg`,
  'Remo Iso-Lateral':                      `${BASE}/Leverage_Iso_Row/0.jpg`,
  'Jalón de Remo a Un Brazo':              `${BASE}/Seated_One-arm_Cable_Pulley_Rows/0.jpg`,
  'Face Pull':                             `${BASE}/Face_Pull/0.jpg`,
  'Curl de Bíceps':                        `${BASE}/Dumbbell_Bicep_Curl/0.jpg`,
  'Press de Banca Plano':                  `${BASE}/Dumbbell_Bench_Press/0.jpg`,
  'Press de Hombros Máquina':              `${BASE}/Machine_Shoulder_Military_Press/0.jpg`,
  'Fondos en Paralelas':                   `${BASE}/Dips_-_Chest_Version/0.jpg`,
  'Elevaciones Laterales con Cable':       `${BASE}/Cable_Seated_Lateral_Raise/0.jpg`,
  'Extensión de Tríceps Sobre la Cabeza':  `${BASE}/Cable_Rope_Overhead_Triceps_Extension/0.jpg`,
  'Plancha':                               `${BASE}/Plank/0.jpg`,
  'Plancha Lateral':                       `${BASE}/Side_Plank/0.jpg`,
  'Rodillas al Pecho Colgado':             `${BASE}/Hanging_Leg_Raise/0.jpg`,
  'Russian Twist con Peso':                `${BASE}/Russian_Twist/0.jpg`,
  'Caminadora':                            `${BASE}/Jogging_Treadmill/0.jpg`,
  'Caminadora Recuperación':               `${BASE}/Jogging_Treadmill/0.jpg`,
  'Caminadora Intensificación':            `${BASE}/Jogging_Treadmill/0.jpg`,
};

const run = async () => {
  const isProduction = !!process.env.DATABASE_URL;

  if (isProduction) {
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    for (const [nombre, url] of Object.entries(IMAGENES)) {
      const r = await pool.query('UPDATE ejercicios SET imagen_url=$1 WHERE nombre=$2', [url, nombre]);
      console.log(`${r.rowCount ? '✅' : '⚠️ '} ${nombre}`);
    }
    await pool.end();
  } else {
    const Database = require('better-sqlite3');
    const db = new Database(path.join(__dirname, '../local.db'));
    const stmt = db.prepare('UPDATE ejercicios SET imagen_url=? WHERE nombre=?');
    for (const [nombre, url] of Object.entries(IMAGENES)) {
      const info = stmt.run(url, nombre);
      console.log(`${info.changes ? '✅' : '⚠️ '} ${nombre}`);
    }
    db.close();
  }

  console.log('\n✅ Imágenes actualizadas.');
};

run().catch(console.error);
