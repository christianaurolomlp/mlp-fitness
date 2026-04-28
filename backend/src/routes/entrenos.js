const router = require('express').Router();
const { pool, connect } = require('../db');
const auth = require('../middleware/auth');

router.post('/', auth, async (req, res) => {
  const { rutina_id } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO entrenos (rutina_id, completado) VALUES ($1, 0) RETURNING *`,
      [rutina_id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', auth, async (req, res) => {
  const { rutina_id, limit = 50, offset = 0 } = req.query;
  try {
    let query = `
      SELECT e.*, r.nombre AS rutina_nombre,
             COUNT(sr.id) AS total_series,
             COALESCE(SUM(sr.peso_kg * sr.reps), 0) AS volumen_total
      FROM entrenos e
      LEFT JOIN rutinas r ON e.rutina_id = r.id
      LEFT JOIN series_realizadas sr ON e.id = sr.entreno_id
      WHERE (e.completado = 1 OR e.completado = TRUE)`;
    const params = [];

    if (rutina_id) {
      params.push(rutina_id);
      query += ` AND e.rutina_id = $${params.length}`;
    }

    query += ` GROUP BY e.id, r.nombre ORDER BY e.fecha DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const entrenoRes = await pool.query(
      `SELECT e.*, r.nombre AS rutina_nombre FROM entrenos e
       LEFT JOIN rutinas r ON e.rutina_id = r.id WHERE e.id = $1`,
      [req.params.id]
    );
    if (entrenoRes.rows.length === 0) return res.status(404).json({ error: 'Entreno no encontrado' });

    const seriesRes = await pool.query(
      `SELECT sr.*, ej.nombre AS ejercicio_nombre, ej.grupo_muscular
       FROM series_realizadas sr
       JOIN ejercicios ej ON sr.ejercicio_id = ej.id
       WHERE sr.entreno_id = $1
       ORDER BY sr.ejercicio_id, sr.numero_serie`,
      [req.params.id]
    );

    res.json({ entreno: entrenoRes.rows[0], series: seriesRes.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  const { completado, duracion_minutos, notas } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE entrenos SET completado=$1, duracion_minutos=$2, notas=$3 WHERE id=$4 RETURNING *`,
      [completado ? 1 : 0, duracion_minutos, notas, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/series', auth, async (req, res) => {
  const { ejercicio_id, numero_serie, peso_kg, reps, rpe } = req.body;
  const client = await connect();

  try {
    await client.query('BEGIN', []);

    const prRes = await client.query(
      `SELECT peso_max, one_rm_estimado FROM records_personales WHERE ejercicio_id = $1`,
      [ejercicio_id]
    );

    const pesoActual = parseFloat(peso_kg) || 0;
    const oneRmActual = pesoActual * (1 + reps / 30);
    const esPr =
      prRes.rows.length === 0 ||
      pesoActual > parseFloat(prRes.rows[0].peso_max || 0) ||
      oneRmActual > parseFloat(prRes.rows[0].one_rm_estimado || 0);

    const { rows } = await client.query(
      `INSERT INTO series_realizadas (entreno_id, ejercicio_id, numero_serie, peso_kg, reps, rpe, es_pr)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.params.id, ejercicio_id, numero_serie, peso_kg, reps, rpe || null, esPr ? 1 : 0]
    );

    if (esPr) {
      const existePR = prRes.rows.length > 0;
      if (existePR) {
        const actual = prRes.rows[0];
        await client.query(
          `UPDATE records_personales SET
             peso_max = CASE WHEN $1 > peso_max THEN $1 ELSE peso_max END,
             one_rm_estimado = CASE WHEN $2 > one_rm_estimado THEN $2 ELSE one_rm_estimado END,
             reps_a_ese_peso = CASE WHEN $1 >= peso_max THEN $3 ELSE reps_a_ese_peso END,
             fecha = CASE WHEN $2 > one_rm_estimado THEN CURRENT_TIMESTAMP ELSE fecha END
           WHERE ejercicio_id = $4`,
          [pesoActual, oneRmActual, reps, ejercicio_id]
        );
      } else {
        await client.query(
          `INSERT INTO records_personales (ejercicio_id, peso_max, reps_a_ese_peso, fecha, one_rm_estimado)
           VALUES ($1,$2,$3,CURRENT_TIMESTAMP,$4)`,
          [ejercicio_id, pesoActual, reps, oneRmActual]
        );
      }
    }

    await client.query('COMMIT', []);
    res.status(201).json({ ...rows[0], es_pr: esPr });
  } catch (err) {
    await client.query('ROLLBACK', []);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.delete('/:id/series/:serieId', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM series_realizadas WHERE id=$1 AND entreno_id=$2', [req.params.serieId, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/export', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ej.nombre AS ejercicio, sr.numero_serie AS serie, sr.peso_kg AS peso, sr.reps, sr.rpe, sr.es_pr, sr.timestamp
       FROM series_realizadas sr JOIN ejercicios ej ON sr.ejercicio_id = ej.id
       WHERE sr.entreno_id = $1 ORDER BY ej.nombre, sr.numero_serie`,
      [req.params.id]
    );
    const header = 'Ejercicio,Serie,Peso(kg),Reps,RPE,PR,Timestamp\n';
    const csv = rows.map(r =>
      `"${r.ejercicio}",${r.serie},${r.peso || 0},${r.reps},${r.rpe || ''},${r.es_pr ? 'SI' : ''},${r.timestamp}`
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="entreno-${req.params.id}.csv"`);
    res.send(header + csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
