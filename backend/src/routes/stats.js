const router = require('express').Router();
const { pool } = require('../db');
const auth = require('../middleware/auth');
const isPG = !!process.env.DATABASE_URL;

router.get('/semana', auth, async (req, res) => {
  try {
    const inicioSemana = new Date();
    inicioSemana.setHours(0, 0, 0, 0);
    inicioSemana.setDate(inicioSemana.getDate() - ((inicioSemana.getDay() + 6) % 7));

    const { rows } = await pool.query(
      `SELECT
         COUNT(DISTINCT e.id) AS dias_entrenados,
         COALESCE(SUM(e.duracion_minutos), 0) AS tiempo_total,
         COALESCE(SUM(sr.peso_kg * sr.reps), 0) AS volumen_total,
         COUNT(CASE WHEN sr.es_pr = 1 OR sr.es_pr = TRUE THEN 1 END) AS prs_semana
       FROM entrenos e
       LEFT JOIN series_realizadas sr ON e.id = sr.entreno_id
       WHERE (e.completado = 1 OR e.completado = TRUE) AND e.fecha >= $1`,
      [inicioSemana.toISOString()]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/progresion-general', auth, async (req, res) => {
  try {
    let rows;
    if (isPG) {
      const result = await pool.query(
        `SELECT DATE_TRUNC('week', e.fecha) AS semana,
                COALESCE(SUM(sr.peso_kg * sr.reps), 0) AS volumen
         FROM entrenos e
         LEFT JOIN series_realizadas sr ON e.id = sr.entreno_id
         WHERE (e.completado = TRUE) AND e.fecha >= NOW() - INTERVAL '8 weeks'
         GROUP BY semana ORDER BY semana`
      );
      rows = result.rows;
    } else {
      const result = await pool.query(
        `SELECT strftime('%Y-%W', e.fecha) AS semana,
                COALESCE(SUM(sr.peso_kg * sr.reps), 0) AS volumen
         FROM entrenos e
         LEFT JOIN series_realizadas sr ON e.id = sr.entreno_id
         WHERE e.completado = 1 AND e.fecha >= datetime('now', '-56 days')
         GROUP BY semana ORDER BY semana`
      );
      rows = result.rows;
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
