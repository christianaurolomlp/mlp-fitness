const router = require('express').Router();
const { pool } = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM rutinas
       WHERE campania_id = (SELECT id FROM campanias WHERE estado = 'activa' LIMIT 1)
          OR campania_id IS NULL
       ORDER BY dia_semana`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/hoy', auth, async (req, res) => {
  try {
    const jsDay = new Date().getDay();
    const dia = jsDay === 0 || jsDay === 6 ? null : jsDay;

    if (!dia) {
      return res.json({ rutina: null, mensaje: 'Hoy es fin de semana — descansa, Capi' });
    }

    const rutinaRes = await pool.query(
      `SELECT * FROM rutinas
       WHERE dia_semana = $1
         AND (campania_id = (SELECT id FROM campanias WHERE estado = 'activa' LIMIT 1)
              OR campania_id IS NULL)
       LIMIT 1`,
      [dia]
    );
    if (rutinaRes.rows.length === 0) return res.json({ rutina: null });

    const rutina = rutinaRes.rows[0];
    const ejerciciosRes = await pool.query(
      `SELECT re.*, e.nombre, e.grupo_muscular, e.equipamiento, e.es_unilateral, e.imagen_url,
              (SELECT sr.peso_kg FROM series_realizadas sr
               JOIN entrenos en ON sr.entreno_id = en.id
               WHERE sr.ejercicio_id = e.id AND (en.completado = 1 OR en.completado = TRUE)
               ORDER BY sr.timestamp DESC LIMIT 1) AS ultimo_peso,
              (SELECT sr.reps FROM series_realizadas sr
               JOIN entrenos en ON sr.entreno_id = en.id
               WHERE sr.ejercicio_id = e.id AND (en.completado = 1 OR en.completado = TRUE)
               ORDER BY sr.timestamp DESC LIMIT 1) AS ultimas_reps
       FROM rutina_ejercicios re
       JOIN ejercicios e ON re.ejercicio_id = e.id
       WHERE re.rutina_id = $1
       ORDER BY re.orden`,
      [rutina.id]
    );

    res.json({ rutina, ejercicios: ejerciciosRes.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const rutinaRes = await pool.query('SELECT * FROM rutinas WHERE id = $1', [req.params.id]);
    if (rutinaRes.rows.length === 0) return res.status(404).json({ error: 'Rutina no encontrada' });

    const rutina = rutinaRes.rows[0];
    const ejerciciosRes = await pool.query(
      `SELECT re.*, e.nombre, e.grupo_muscular, e.equipamiento, e.es_unilateral, e.imagen_url,
              (SELECT sr.peso_kg FROM series_realizadas sr
               JOIN entrenos en ON sr.entreno_id = en.id
               WHERE sr.ejercicio_id = e.id AND (en.completado = 1 OR en.completado = TRUE)
               ORDER BY sr.timestamp DESC LIMIT 1) AS ultimo_peso,
              (SELECT sr.reps FROM series_realizadas sr
               JOIN entrenos en ON sr.entreno_id = en.id
               WHERE sr.ejercicio_id = e.id AND (en.completado = 1 OR en.completado = TRUE)
               ORDER BY sr.timestamp DESC LIMIT 1) AS ultimas_reps
       FROM rutina_ejercicios re
       JOIN ejercicios e ON re.ejercicio_id = e.id
       WHERE re.rutina_id = $1
       ORDER BY re.orden`,
      [rutina.id]
    );

    res.json({ rutina, ejercicios: ejerciciosRes.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/ejercicios/:reId', auth, async (req, res) => {
  const { series_objetivo, reps_min, reps_max, descanso_segundos, orden, nota_especial } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE rutina_ejercicios
       SET series_objetivo=$1, reps_min=$2, reps_max=$3, descanso_segundos=$4, orden=$5, nota_especial=$6
       WHERE id=$7 AND rutina_id=$8 RETURNING *`,
      [series_objetivo, reps_min, reps_max, descanso_segundos, orden, nota_especial, req.params.reId, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/ejercicios', auth, async (req, res) => {
  const { ejercicio_id, orden, series_objetivo, reps_min, reps_max, descanso_segundos, nota_especial } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO rutina_ejercicios (rutina_id, ejercicio_id, orden, series_objetivo, reps_min, reps_max, descanso_segundos, nota_especial)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.params.id, ejercicio_id, orden, series_objetivo, reps_min, reps_max, descanso_segundos, nota_especial]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/ejercicios/:reId', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM rutina_ejercicios WHERE id=$1 AND rutina_id=$2', [req.params.reId, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
