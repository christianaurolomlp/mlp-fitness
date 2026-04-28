const router = require('express').Router();
const { pool } = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT e.*,
              rp.peso_max, rp.reps_a_ese_peso, rp.one_rm_estimado, rp.fecha AS fecha_pr
       FROM ejercicios e
       LEFT JOIN records_personales rp ON e.id = rp.ejercicio_id
       ORDER BY e.grupo_muscular, e.nombre`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/historial', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT sr.peso_kg, sr.reps, sr.rpe, sr.es_pr, sr.timestamp,
              en.fecha AS fecha_entreno,
              (sr.peso_kg * (1 + CAST(sr.reps AS REAL) / 30)) AS one_rm_estimado
       FROM series_realizadas sr
       JOIN entrenos en ON sr.entreno_id = en.id
       WHERE sr.ejercicio_id = $1 AND (en.completado = 1 OR en.completado = TRUE)
       ORDER BY sr.timestamp DESC
       LIMIT 200`,
      [req.params.id]
    );

    const porEntreno = {};
    rows.forEach(r => {
      const fecha = r.fecha_entreno ? r.fecha_entreno.toString().split('T')[0] : r.timestamp.toString().split('T')[0];
      if (!porEntreno[fecha]) {
        porEntreno[fecha] = { fecha, peso_max: 0, one_rm_max: 0, volumen: 0 };
      }
      if ((r.peso_kg || 0) > porEntreno[fecha].peso_max) {
        porEntreno[fecha].peso_max = parseFloat(r.peso_kg);
      }
      if ((r.one_rm_estimado || 0) > porEntreno[fecha].one_rm_max) {
        porEntreno[fecha].one_rm_max = parseFloat(r.one_rm_estimado).toFixed(1);
      }
      porEntreno[fecha].volumen += (r.peso_kg || 0) * r.reps;
    });

    res.json({
      series: rows,
      progresion: Object.values(porEntreno).sort((a, b) => a.fecha.localeCompare(b.fecha)),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
