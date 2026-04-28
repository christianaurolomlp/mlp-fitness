// MLP FITNESS — Rutas de Campañas
const router = require('express').Router();
const { pool } = require('../db');
const auth = require('../middleware/auth');

// GET /api/campanas — todas las campañas ordenadas por orden
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM campanias ORDER BY orden');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/campanas/activa — campaña activa con progreso y estadísticas
router.get('/activa', auth, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM campanias WHERE estado = 'activa' LIMIT 1");
    if (rows.length === 0) {
      return res.json({ campana: null });
    }

    const campana = rows[0];

    // Calcular progreso
    const hoy = new Date().toISOString().split('T')[0];
    const fechaInicio = campana.fecha_inicio ? campana.fecha_inicio.split('T')[0] : hoy;
    const fechaFin = campana.fecha_fin ? campana.fecha_fin.split('T')[0] : hoy;

    const msInicio = new Date(fechaInicio).getTime();
    const msHoy = new Date(hoy).getTime();
    const msFin = new Date(fechaFin).getTime();

    const diasTranscurridos = Math.max(0, Math.floor((msHoy - msInicio) / 86400000));
    const diasTotales = campana.duracion_semanas * 7;
    const progresoPct = Math.min(100, Math.round((diasTranscurridos / diasTotales) * 100));
    const requiereActivarSiguiente = hoy > fechaFin;

    // Estadísticas de entrenos dentro de la campaña
    const { rows: statsRows } = await pool.query(
      `SELECT
         COUNT(*) AS total_entrenos,
         COALESCE(SUM(
           (SELECT COALESCE(SUM(sr.peso_kg * sr.reps), 0)
            FROM series_realizadas sr
            WHERE sr.entreno_id = e.id)
         ), 0) AS volumen_total
       FROM entrenos e
       WHERE (e.completado = 1 OR e.completado = TRUE)
         AND e.fecha >= $1
         AND e.fecha <= $2`,
      [fechaInicio, fechaFin]
    );

    // Contar PRs en el período
    const { rows: prRows } = await pool.query(
      `SELECT COUNT(*) AS total_prs
       FROM series_realizadas sr
       JOIN entrenos e ON sr.entreno_id = e.id
       WHERE sr.es_pr = 1
         AND (e.completado = 1 OR e.completado = TRUE)
         AND e.fecha >= $1
         AND e.fecha <= $2`,
      [fechaInicio, fechaFin]
    );

    const stats = {
      total_entrenos: parseInt(statsRows[0].total_entrenos || 0),
      volumen_total: parseFloat(statsRows[0].volumen_total || 0),
      total_prs: parseInt(prRows[0].total_prs || 0),
    };

    // Calcular asistencia %
    const diasHabilesTranscurridos = Math.min(diasTranscurridos, diasTotales);
    // Aproximado: 5 de cada 7 días son hábiles
    const diasHabilesEsperados = Math.max(1, Math.floor(diasHabilesTranscurridos * 5 / 7));
    const asistenciaPct = diasHabilesEsperados > 0
      ? Math.min(100, Math.round((stats.total_entrenos / diasHabilesEsperados) * 100))
      : 0;

    // Obtener la siguiente campaña pendiente (si hay)
    const { rows: siguienteRows } = await pool.query(
      "SELECT * FROM campanias WHERE estado = 'pendiente' ORDER BY orden LIMIT 1"
    );

    res.json({
      campana: {
        ...campana,
        dias_transcurridos: diasTranscurridos,
        dias_totales: diasTotales,
        progreso_pct: progresoPct,
        requiere_activar_siguiente: requiereActivarSiguiente,
        stats: { ...stats, asistencia_pct: asistenciaPct },
      },
      siguiente: siguienteRows[0] || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/campanas/:id/activar — activar una campaña
router.post('/:id/activar', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Marcar la activa actual como completada
    await pool.query("UPDATE campanias SET estado = 'completada' WHERE estado = 'activa'");

    // Calcular fechas para la nueva campaña activa
    const hoy = new Date().toISOString().split('T')[0];
    const { rows: campRows } = await pool.query('SELECT * FROM campanias WHERE id = $1', [id]);
    if (campRows.length === 0) return res.status(404).json({ error: 'Campaña no encontrada' });

    const campana = campRows[0];
    const fechaInicio = hoy;
    const fechaFinDate = new Date(hoy);
    fechaFinDate.setDate(fechaFinDate.getDate() + campana.duracion_semanas * 7);
    const fechaFin = fechaFinDate.toISOString().split('T')[0];

    // Activar la campaña seleccionada
    await pool.query(
      "UPDATE campanias SET estado = 'activa', fecha_inicio = $1, fecha_fin = $2 WHERE id = $3",
      [fechaInicio, fechaFin, id]
    );

    // Actualizar fechas en cascada para las campañas siguientes pendientes
    const { rows: pendientes } = await pool.query(
      "SELECT * FROM campanias WHERE estado = 'pendiente' AND orden > (SELECT orden FROM campanias WHERE id = $1) ORDER BY orden",
      [id]
    );

    let fechaAnteriorFin = new Date(fechaFin);
    for (const pend of pendientes) {
      const nuevaInicio = new Date(fechaAnteriorFin);
      nuevaInicio.setDate(nuevaInicio.getDate() + 1);
      const nuevaFin = new Date(nuevaInicio);
      nuevaFin.setDate(nuevaFin.getDate() + pend.duracion_semanas * 7);

      await pool.query(
        'UPDATE campanias SET fecha_inicio = $1, fecha_fin = $2 WHERE id = $3',
        [nuevaInicio.toISOString().split('T')[0], nuevaFin.toISOString().split('T')[0], pend.id]
      );

      fechaAnteriorFin = nuevaFin;
    }

    const { rows: updated } = await pool.query('SELECT * FROM campanias WHERE id = $1', [id]);
    res.json({ ok: true, campana: updated[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/campanas/:id/stats — estadísticas de una campaña
router.get('/:id/stats', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM campanias WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Campaña no encontrada' });

    const campana = rows[0];
    const fechaInicio = campana.fecha_inicio ? campana.fecha_inicio.split('T')[0] : '2000-01-01';
    const fechaFin = campana.fecha_fin ? campana.fecha_fin.split('T')[0] : '2099-12-31';

    const { rows: statsRows } = await pool.query(
      `SELECT
         COUNT(*) AS total_entrenos,
         COALESCE(SUM(
           (SELECT COALESCE(SUM(sr.peso_kg * sr.reps), 0)
            FROM series_realizadas sr
            WHERE sr.entreno_id = e.id)
         ), 0) AS volumen_total
       FROM entrenos e
       WHERE (e.completado = 1 OR e.completado = TRUE)
         AND e.fecha >= $1
         AND e.fecha <= $2`,
      [fechaInicio, fechaFin]
    );

    const { rows: prRows } = await pool.query(
      `SELECT COUNT(*) AS total_prs
       FROM series_realizadas sr
       JOIN entrenos e ON sr.entreno_id = e.id
       WHERE sr.es_pr = 1
         AND (e.completado = 1 OR e.completado = TRUE)
         AND e.fecha >= $1
         AND e.fecha <= $2`,
      [fechaInicio, fechaFin]
    );

    res.json({
      campana,
      stats: {
        total_entrenos: parseInt(statsRows[0].total_entrenos || 0),
        volumen_total: parseFloat(statsRows[0].volumen_total || 0),
        total_prs: parseInt(prRows[0].total_prs || 0),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
