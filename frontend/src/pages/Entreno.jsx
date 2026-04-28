import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Flag, Zap, Clock, Plus, BarChart2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api } from '../utils/api';
import { EjercicioVisual } from '../components/EjercicioVisual';
import { Timer } from '../components/Timer';
import { LoadingSpinner } from '../components/LoadingSpinner';

const EJERCICIOS_COMPUESTOS = [
  'Press de Banca Inclinado', 'Press de Banca Plano', 'Press de Banca con Barra',
  'Press de Banca Plano con Barra', 'Press de Pecho', 'Press de Hombros',
  'Press de Hombros Máquina', 'Press Arnold', 'Press Militar con Barra',
  'Jalón al Pecho', 'Jalón al Pecho Agarre Neutro', 'Jalón al Pecho Agarre Amplio',
  'Remo Sentado con Agarre en V', 'Remo Iso-Lateral', 'Remo con Barra', 'Remo en T',
  'Sentadilla Búlgara', 'Sentadilla con Barra', 'Press de Piernas',
  'Peso Muerto Rumano', 'Peso Muerto Rumano con Barra', 'Hip Thrust',
  'Dominadas Asistidas', 'Fondos en Paralelas', 'Fondos con Peso',
];

function formatDur(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m ${String(s).padStart(2,'0')}s`;
  if (m > 0) return `${m}min ${String(s).padStart(2,'0')}s`;
  return `${s}s`;
}

export default function Entreno() {
  const { entrenoId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Valores de inputs por serie: clave = `${ejId}_${serieNum}`
  const [vals, setVals] = useState({});

  // Series completadas por ejercicio: { ejId: Set<number> }
  const [completadas, setCompletadas] = useState({});

  // Series extra añadidas por ejercicio: { ejId: number }
  const [extra, setExtra] = useState({});

  // Timer de descanso flotante
  const [timerInfo, setTimerInfo] = useState(null); // { ejId, duracion, label }

  // Badges de progresión
  const [mostrarPR, setMostrarPR] = useState(false);
  const [badgeEj, setBadgeEj] = useState(null);

  // Modal de historial de ejercicio
  const [historialModal, setHistorialModal] = useState(null); // { ej, data } | null
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  // Campaña al terminar
  const [campanaData, setCampanaData] = useState(null);
  const [activandoCampana, setActivandoCampana] = useState(false);
  const [campanaActivada, setCampanaActivada] = useState(false);
  const [terminado, setTerminado] = useState(false);

  // Duración en tiempo real
  const startTime = useRef(Date.now());
  const [duracion, setDuracion] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setDuracion(Math.round((Date.now() - startTime.current) / 1000)), 1000);
    return () => clearInterval(iv);
  }, []);

  // Cargar datos del entreno
  useEffect(() => {
    const cargar = async () => {
      try {
        const rutinaHoy = await api.getEntreno(entrenoId);
        const rutinaData = await api.getRutina(rutinaHoy.entreno.rutina_id);
        setData({ entreno: rutinaHoy.entreno, ejercicios: rutinaData.ejercicios });

        const initVals = {};
        const initComp = {};
        rutinaData.ejercicios.forEach(ej => {
          initComp[ej.ejercicio_id] = new Set();
          const isCardio = ej.grupo_muscular === 'Cardio';
          for (let s = 1; s <= ej.series_objetivo; s++) {
            initVals[`${ej.ejercicio_id}_${s}`] = isCardio
              ? { reps: '', peso: '', inclinacion: '' }
              : {
                  peso: ej.ultimo_peso ? String(ej.ultimo_peso) : '',
                  reps: ej.ultimas_reps ? String(ej.ultimas_reps) : String(ej.reps_min || ''),
                };
          }
        });
        setVals(initVals);
        setCompletadas(initComp);
      } catch (err) {
        alert('Error cargando entreno: ' + err.message);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [entrenoId]);

  // Al terminar, comprobar si hay campaña que avanzar
  useEffect(() => {
    if (!terminado) return;
    api.getCampanaActiva().then(setCampanaData).catch(() => {});
  }, [terminado]);

  const setVal = (ejId, serieNum, field, value) => {
    setVals(prev => ({
      ...prev,
      [`${ejId}_${serieNum}`]: { ...prev[`${ejId}_${serieNum}`], [field]: value },
    }));
  };

  const completarSerie = async (ej, serieNum) => {
    const key = `${ej.ejercicio_id}_${serieNum}`;
    const v = vals[key] || {};
    const isCardio = ej.grupo_muscular === 'Cardio';

    // Toggle: si ya está completada, desmarcar sin llamar backend
    if (completadas[ej.ejercicio_id]?.has(serieNum)) {
      setCompletadas(prev => {
        const next = new Set(prev[ej.ejercicio_id]);
        next.delete(serieNum);
        return { ...prev, [ej.ejercicio_id]: next };
      });
      return;
    }

    try {
      const result = await api.registrarSerie(entrenoId, {
        ejercicio_id: ej.ejercicio_id,
        numero_serie: serieNum,
        peso_kg: parseFloat(v.peso) || 0,
        reps: parseInt(v.reps) || 0,
        rpe: null,
      });

      setCompletadas(prev => {
        const next = new Set(prev[ej.ejercicio_id] || []);
        next.add(serieNum);
        return { ...prev, [ej.ejercicio_id]: next };
      });

      if (result.es_pr) {
        setMostrarPR(true);
        setTimeout(() => setMostrarPR(false), 3000);
      }

      // Badge de progresión en compuestos
      const ultimoPeso = parseFloat(ej.ultimo_peso || 0);
      if (!isCardio && EJERCICIOS_COMPUESTOS.includes(ej.nombre) && parseFloat(v.peso) > ultimoPeso && ultimoPeso > 0) {
        setBadgeEj(ej.ejercicio_id);
        setTimeout(() => setBadgeEj(null), 4000);
      }

      // Timer de descanso (no en cardio)
      if (!isCardio && ej.descanso_segundos > 0) {
        setTimerInfo({
          ejId: ej.ejercicio_id,
          duracion: ej.descanso_segundos,
          label: `Descansando — ${ej.nombre} serie ${serieNum}`,
        });
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const addSerie = (ej) => {
    const seriesBase = ej.series_objetivo;
    const seriesExtra = extra[ej.ejercicio_id] || 0;
    const newSerieNum = seriesBase + seriesExtra + 1;
    const isCardio = ej.grupo_muscular === 'Cardio';

    setExtra(prev => ({ ...prev, [ej.ejercicio_id]: seriesExtra + 1 }));
    setVals(prev => ({
      ...prev,
      [`${ej.ejercicio_id}_${newSerieNum}`]: isCardio
        ? { reps: '', peso: '', inclinacion: '' }
        : {
            peso: ej.ultimo_peso ? String(ej.ultimo_peso) : '',
            reps: ej.ultimas_reps ? String(ej.ultimas_reps) : '',
          },
    }));
  };

  const verHistorial = async (ej) => {
    setLoadingHistorial(true);
    setHistorialModal({ ej, data: null });
    try {
      const data = await api.getEjercicioHistorial(ej.ejercicio_id);
      setHistorialModal({ ej, data });
    } catch {
      setHistorialModal(null);
    } finally {
      setLoadingHistorial(false);
    }
  };

  const finalizarEntreno = async () => {
    const dur = Math.round((Date.now() - startTime.current) / 60000);
    try {
      await api.completarEntreno(entrenoId, { completado: true, duracion_minutos: dur });
      setTerminado(true);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  // Stats en tiempo real
  const totalSeriesCount = Object.values(completadas).reduce((acc, s) => acc + s.size, 0);
  const volumenTotal = data
    ? data.ejercicios.reduce((acc, ej) => {
        const comp = completadas[ej.ejercicio_id] || new Set();
        comp.forEach(sn => {
          const v = vals[`${ej.ejercicio_id}_${sn}`] || {};
          acc += (parseFloat(v.peso) || 0) * (parseInt(v.reps) || 0);
        });
        return acc;
      }, 0)
    : 0;

  if (loading) return (
    <div className="min-h-screen wave-bg flex items-center justify-center">
      <LoadingSpinner texto="Preparando entreno..." />
    </div>
  );
  if (!data) return null;

  // ── PANTALLA DE RESUMEN ──────────────────────────────────────────────────
  if (terminado) {
    const prsTotal = 0; // se podría calcular del estado si se guardaran
    return (
      <div className="min-h-screen wave-bg flex flex-col items-center justify-center px-6 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.4 }} className="w-full max-w-sm">
          <div className="text-7xl mb-4">🏆</div>
          <h1 className="text-3xl font-black text-neon mb-1">¡ENTRENO COMPLETADO!</h1>
          <p className="text-white/50 mb-6">Así se hace, Capi ⚓</p>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="card text-center py-3">
              <p className="text-lg font-black text-white">{formatDur(duracion)}</p>
              <p className="text-white/40 text-xs">duración</p>
            </div>
            <div className="card text-center py-3">
              <p className="text-lg font-black text-neon">{Math.round(volumenTotal / 100) / 10}t</p>
              <p className="text-white/40 text-xs">volumen</p>
            </div>
            <div className="card text-center py-3">
              <p className="text-lg font-black text-white">{totalSeriesCount}</p>
              <p className="text-white/40 text-xs">series</p>
            </div>
          </div>

          <button onClick={() => navigate('/')} className="btn-primary w-full mb-4">
            Volver al inicio
          </button>

          <AnimatePresence>
            {campanaData?.campana?.requiere_activar_siguiente && campanaData?.siguiente && !campanaActivada && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="rounded-3xl bg-gradient-to-br from-amber-900/30 to-yellow-900/20 border border-amber-500/40 p-5 text-left"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Flag size={16} className="text-amber-400" />
                  <span className="text-amber-400 font-black text-xs uppercase tracking-wider">Campaña completada</span>
                </div>
                <h3 className="text-white font-bold mb-3">{campanaData.campana.nombre}</h3>
                <div className="bg-neon/5 border border-neon/20 rounded-xl p-3 mb-3">
                  <p className="text-neon/80 text-xs font-bold">Siguiente: {campanaData.siguiente.nombre}</p>
                  <p className="text-white/50 text-xs mt-0.5">{campanaData.siguiente.objetivo}</p>
                </div>
                <button
                  onClick={async () => {
                    setActivandoCampana(true);
                    try { await api.activarCampana(campanaData.siguiente.id); setCampanaActivada(true); }
                    catch (err) { alert('Error: ' + err.message); }
                    finally { setActivandoCampana(false); }
                  }}
                  disabled={activandoCampana}
                  className="w-full py-3 rounded-2xl bg-amber-500 text-navy-900 font-black flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Zap size={16} />
                  {activandoCampana ? 'Activando...' : `ACTIVAR CAMPAÑA ${campanaData.siguiente.orden}`}
                </button>
              </motion.div>
            )}
            {campanaActivada && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-3xl bg-neon/10 border border-neon/30 p-4 text-center mt-3">
                <p className="text-neon font-black">¡Nueva campaña activada! ⚓</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    );
  }

  // ── PANTALLA PRINCIPAL DE ENTRENO ────────────────────────────────────────
  return (
    <div className="min-h-screen wave-bg" style={{ paddingBottom: '80px' }}>

      {/* Header fijo */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-navy-900/95 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center justify-between max-w-lg mx-auto px-4 py-3">
          <button onClick={() => navigate(-1)} className="text-white/50 active:text-white p-1">
            <X size={22} />
          </button>
          <div className="text-center">
            <p className="text-white font-bold text-sm">{data.entreno.rutina_nombre || 'Entreno'}</p>
          </div>
          <button
            onClick={finalizarEntreno}
            className="bg-blue-500 text-white font-bold text-sm px-4 py-1.5 rounded-xl active:bg-blue-400 transition-colors"
          >
            Terminar
          </button>
        </div>

        {/* Barra de stats en tiempo real */}
        <div className="flex items-center max-w-lg mx-auto px-4 pb-2.5 gap-6">
          <div>
            <p className="text-neon font-bold text-sm tabular-nums leading-tight">{formatDur(duracion)}</p>
            <p className="text-white/30 text-xs">Duración</p>
          </div>
          <div className="w-px h-7 bg-white/10" />
          <div>
            <p className="text-white font-bold text-sm leading-tight">{Math.round(volumenTotal)} kg</p>
            <p className="text-white/30 text-xs">Volumen</p>
          </div>
          <div className="w-px h-7 bg-white/10" />
          <div>
            <p className="text-white font-bold text-sm leading-tight">{totalSeriesCount}</p>
            <p className="text-white/30 text-xs">Series</p>
          </div>
        </div>
      </header>

      {/* Timer de descanso flotante */}
      <AnimatePresence>
        {timerInfo && (
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            className="fixed top-[108px] left-0 right-0 z-40 max-w-lg mx-auto px-4"
          >
            <div className="bg-navy-900/98 border border-neon/30 rounded-2xl px-4 py-3 shadow-2xl backdrop-blur-md">
              <p className="text-white/50 text-xs mb-2">{timerInfo.label}</p>
              <Timer
                duracion={timerInfo.duracion}
                onFinish={() => setTimerInfo(null)}
                autoStart
                compact
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de ejercicios */}
      <div className="pt-[120px] px-4 space-y-3 max-w-lg mx-auto">

        {data.ejercicios.map((ej) => {
          const isCardio = ej.grupo_muscular === 'Cardio';
          const seriesTotal = ej.series_objetivo + (extra[ej.ejercicio_id] || 0);
          const compEj = completadas[ej.ejercicio_id] || new Set();
          const todasCompletadas = !isCardio
            ? compEj.size >= seriesTotal
            : compEj.has(1);

          return (
            <motion.div
              key={ej.id}
              layout
              className={`rounded-2xl overflow-hidden border transition-colors duration-300 ${
                todasCompletadas
                  ? 'border-neon/25 bg-neon/[0.04]'
                  : 'border-white/10 bg-white/[0.04]'
              }`}
            >
              {/* Cabecera del ejercicio */}
              <div className="flex items-center gap-3 px-3 pt-3 pb-2">
                <EjercicioVisual
                  nombre={ej.nombre}
                  grupo_muscular={ej.grupo_muscular}
                  equipamiento={ej.equipamiento}
                  imagen_url={ej.imagen_url}
                  size="sm"
                  className="w-12 h-12 flex-shrink-0 rounded-xl overflow-hidden"
                />
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-sm leading-tight ${todasCompletadas ? 'text-neon' : 'text-white'}`}>
                    {ej.nombre}
                  </p>
                  <p className="text-white/40 text-xs">{ej.equipamiento}</p>
                  {ej.es_unilateral && (
                    <p className="text-amber-400/70 text-xs">⚠ Por cada lado</p>
                  )}
                </div>
                {/* Botón estadísticas */}
                <button
                  onClick={() => verHistorial(ej)}
                  className="p-2 text-white/30 active:text-neon transition-colors"
                >
                  <BarChart2 size={18} />
                </button>
                {todasCompletadas && (
                  <div className="bg-neon/20 rounded-full p-1">
                    <Check size={14} className="text-neon" strokeWidth={3} />
                  </div>
                )}
              </div>

              {/* Info descanso + objetivo */}
              <div className="flex items-center gap-3 px-3 pb-2">
                {!isCardio && ej.descanso_segundos > 0 && (
                  <div className="flex items-center gap-1">
                    <Clock size={11} className="text-blue-400" />
                    <span className="text-blue-400 text-xs">
                      Descanso: {Math.floor(ej.descanso_segundos / 60) > 0
                        ? `${Math.floor(ej.descanso_segundos / 60)}min`
                        : ''}{ej.descanso_segundos % 60 > 0
                        ? ` ${ej.descanso_segundos % 60}s`
                        : ''}
                    </span>
                  </div>
                )}
                {!isCardio && (
                  <span className="text-white/25 text-xs">
                    {ej.series_objetivo} × {ej.reps_min}-{ej.reps_max} reps
                  </span>
                )}
              </div>

              {/* Nota especial */}
              {ej.nota_especial && (
                <div className="mx-3 mb-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-1.5">
                  <p className="text-amber-400/80 text-xs">⚠ {ej.nota_especial}</p>
                </div>
              )}

              {/* Badge progresión activa */}
              <AnimatePresence>
                {badgeEj === ej.ejercicio_id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mx-3 mb-2 rounded-xl bg-neon/10 border border-neon/30 px-3 py-2 text-neon text-xs font-bold text-center"
                  >
                    📈 Progresión activa. Buen trabajo, Marino.
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── CARDIO ────────────────────────────────────────── */}
              {isCardio ? (
                <div className="px-3 pb-3 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-white/40 text-xs block text-center mb-1">MIN *</label>
                      <input
                        type="number" inputMode="numeric"
                        value={vals[`${ej.ejercicio_id}_1`]?.reps || ''}
                        onChange={e => setVal(ej.ejercicio_id, 1, 'reps', e.target.value)}
                        placeholder="20"
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-2 py-2 text-white text-center text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-white/40 text-xs block text-center mb-1">KM/H</label>
                      <input
                        type="number" inputMode="decimal" step="0.1"
                        value={vals[`${ej.ejercicio_id}_1`]?.peso || ''}
                        onChange={e => setVal(ej.ejercicio_id, 1, 'peso', e.target.value)}
                        placeholder="6.0"
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-2 py-2 text-white text-center text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-white/40 text-xs block text-center mb-1">INCL %</label>
                      <input
                        type="number" inputMode="decimal" step="0.5"
                        value={vals[`${ej.ejercicio_id}_1`]?.inclinacion || ''}
                        onChange={e => setVal(ej.ejercicio_id, 1, 'inclinacion', e.target.value)}
                        placeholder="8"
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-2 py-2 text-white text-center text-sm"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => completarSerie(ej, 1)}
                    className={`w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                      compEj.has(1)
                        ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-400'
                        : 'text-white active:scale-98'
                    }`}
                    style={!compEj.has(1) ? { background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' } : {}}
                  >
                    <Check size={16} strokeWidth={3} />
                    {compEj.has(1) ? 'Completado ✓' : 'Completar Cardio'}
                  </button>
                </div>

              ) : (
                /* ── TABLA DE SERIES ──────────────────────────────── */
                <div>
                  {/* Encabezados de la tabla */}
                  <div
                    className="grid px-3 py-1 border-t border-white/5"
                    style={{ gridTemplateColumns: '28px 1fr 68px 68px 38px' }}
                  >
                    <span className="text-white/25 text-xs font-bold text-center">S</span>
                    <span className="text-white/25 text-xs font-bold text-center">ANTERIOR</span>
                    <span className="text-white/25 text-xs font-bold text-center">KG</span>
                    <span className="text-white/25 text-xs font-bold text-center">REPS</span>
                    <span />
                  </div>

                  {/* Filas de series */}
                  {Array.from({ length: seriesTotal }).map((_, i) => {
                    const serieNum = i + 1;
                    const isChecked = compEj.has(serieNum);
                    const v = vals[`${ej.ejercicio_id}_${serieNum}`] || {};
                    const anteriorText = ej.ultimo_peso
                      ? `${ej.ultimo_peso}×${ej.ultimas_reps || '?'}`
                      : '—';

                    return (
                      <div
                        key={serieNum}
                        className={`grid items-center px-3 py-1.5 transition-colors ${
                          isChecked
                            ? 'bg-neon/[0.07]'
                            : i % 2 === 1
                            ? 'bg-white/[0.02]'
                            : ''
                        }`}
                        style={{ gridTemplateColumns: '28px 1fr 68px 68px 38px' }}
                      >
                        {/* Número de serie */}
                        <span className={`text-sm font-black text-center ${isChecked ? 'text-neon' : 'text-white/50'}`}>
                          {serieNum}
                        </span>

                        {/* Anterior */}
                        <span className="text-white/25 text-xs text-center">{anteriorText}</span>

                        {/* Input KG */}
                        <input
                          type="number" inputMode="decimal" step="0.5"
                          value={v.peso || ''}
                          onChange={e => setVal(ej.ejercicio_id, serieNum, 'peso', e.target.value)}
                          placeholder={ej.ultimo_peso ? String(ej.ultimo_peso) : '0'}
                          className={`bg-white/10 border rounded-lg px-1 py-1.5 text-white text-center text-sm w-full transition-colors ${
                            isChecked ? 'border-neon/30 bg-neon/10 text-neon' : 'border-white/15'
                          }`}
                        />

                        {/* Input REPS */}
                        <input
                          type="number" inputMode="numeric"
                          value={v.reps || ''}
                          onChange={e => setVal(ej.ejercicio_id, serieNum, 'reps', e.target.value)}
                          placeholder={String(ej.reps_min || 0)}
                          className={`bg-white/10 border rounded-lg px-1 py-1.5 text-white text-center text-sm w-full transition-colors ${
                            isChecked ? 'border-neon/30 bg-neon/10 text-neon' : 'border-white/15'
                          }`}
                        />

                        {/* Botón check */}
                        <button
                          onClick={() => completarSerie(ej, serieNum)}
                          className={`flex items-center justify-center w-8 h-8 rounded-lg mx-auto border transition-all active:scale-90 ${
                            isChecked
                              ? 'bg-neon/20 border-neon/50 text-neon'
                              : 'bg-white/8 border-white/20 text-white/30 active:bg-neon/15 active:border-neon/40 active:text-neon'
                          }`}
                        >
                          <Check size={14} strokeWidth={3} />
                        </button>
                      </div>
                    );
                  })}

                  {/* Botón añadir serie */}
                  <button
                    onClick={() => addSerie(ej)}
                    className="w-full py-2.5 text-white/35 text-xs font-semibold flex items-center justify-center gap-1.5 border-t border-white/5 active:text-white/60 active:bg-white/5 transition-colors"
                  >
                    <Plus size={14} /> Agregar Serie
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}

        {/* Botón terminar al pie */}
        <button
          onClick={finalizarEntreno}
          className="w-full py-4 rounded-2xl border border-white/15 text-white/40 font-semibold text-sm active:border-mlpred/40 active:text-mlpred transition-colors mt-2"
        >
          Terminar Entreno
        </button>
      </div>

      {/* Modal historial de ejercicio */}
      <AnimatePresence>
        {historialModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setHistorialModal(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full max-w-lg bg-[#0a0a2e] border-t border-white/10 rounded-t-3xl p-5 pb-10 max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* Handle */}
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />

              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-white font-black text-lg leading-tight">{historialModal.ej.nombre}</h3>
                  <p className="text-white/40 text-sm">{historialModal.ej.grupo_muscular} · {historialModal.ej.equipamiento}</p>
                </div>
                <button onClick={() => setHistorialModal(null)} className="text-white/30 active:text-white p-1">
                  <X size={20} />
                </button>
              </div>

              {loadingHistorial || !historialModal.data ? (
                <div className="py-10 flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-neon/30 border-t-neon rounded-full animate-spin" />
                  <p className="text-white/40 text-sm">Cargando historial...</p>
                </div>
              ) : historialModal.data.series.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-4xl mb-3">🆕</p>
                  <p className="text-white/50">Sin registros aún</p>
                  <p className="text-white/30 text-sm mt-1">¡Hoy es la primera vez!</p>
                </div>
              ) : (() => {
                const { progresion, series } = historialModal.data;

                // Calcular tendencia: comparar último peso con hace 3 sesiones
                const pesos = progresion.map(p => parseFloat(p.peso_max));
                const ultimo = pesos[pesos.length - 1];
                const referencia = pesos.length >= 3 ? pesos[pesos.length - 3] : pesos[0];
                const tendencia = ultimo > referencia ? 'sube' : ultimo < referencia ? 'baja' : 'igual';

                return (
                  <>
                    {/* Badge tendencia */}
                    <div className={`flex items-center gap-2 rounded-2xl px-4 py-3 mb-4 ${
                      tendencia === 'sube' ? 'bg-neon/10 border border-neon/20' :
                      tendencia === 'baja' ? 'bg-red-500/10 border border-red-500/20' :
                      'bg-white/5 border border-white/10'
                    }`}>
                      {tendencia === 'sube' && <><TrendingUp size={18} className="text-neon" /><span className="text-neon font-bold text-sm">Subiendo peso 📈</span></>}
                      {tendencia === 'baja' && <><TrendingDown size={18} className="text-red-400" /><span className="text-red-400 font-bold text-sm">Bajando peso — revisar</span></>}
                      {tendencia === 'igual' && <><Minus size={18} className="text-white/50" /><span className="text-white/50 font-bold text-sm">Peso estancado</span></>}
                      <span className="text-white/30 text-xs ml-auto">
                        {referencia}kg → {ultimo}kg
                      </span>
                    </div>

                    {/* Gráfica */}
                    {progresion.length > 1 && (
                      <div className="mb-4">
                        <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Evolución de peso máximo</p>
                        <ResponsiveContainer width="100%" height={130}>
                          <LineChart data={progresion}>
                            <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="fecha" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} axisLine={false} tickLine={false} width={32} />
                            <Tooltip
                              contentStyle={{ background: '#0D005C', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                              labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
                              itemStyle={{ color: '#00FF88' }}
                              formatter={v => [`${v} kg`, 'Peso máx']}
                            />
                            <Line type="monotone" dataKey="peso_max" stroke="#00FF88" strokeWidth={2} dot={{ fill: '#00FF88', r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Últimas series */}
                    <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Últimas series</p>
                    <div className="space-y-1">
                      {series.slice(0, 10).map((s, i) => (
                        <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                          <span className="text-white/40 text-xs w-20">
                            {new Date(s.fecha_entreno).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                          </span>
                          <span className={`font-bold text-sm flex-1 text-center ${s.es_pr ? 'text-mlpred' : 'text-white'}`}>
                            {s.es_pr && '🏆 '}{s.peso_kg}kg × {s.reps} reps
                          </span>
                          <span className="text-white/25 text-xs w-20 text-right">
                            ~{parseFloat(s.one_rm_estimado).toFixed(1)}kg 1RM
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay PR */}
      <AnimatePresence>
        {mostrarPR && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: -100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: -100 }}
            className="fixed top-36 left-1/2 -translate-x-1/2 z-50 bg-mlpred text-white px-6 py-4 rounded-2xl shadow-2xl text-center"
          >
            <div className="text-3xl">🏆</div>
            <p className="font-black text-lg">¡NUEVO RÉCORD!</p>
            <p className="text-white/80 text-sm">Personal Best ⚓</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
