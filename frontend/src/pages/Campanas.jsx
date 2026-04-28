import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flag, Trophy, Lock, Calendar, TrendingUp, ChevronRight, Zap, X, Check } from 'lucide-react';
import { api } from '../utils/api';
import { LoadingSpinner } from '../components/LoadingSpinner';

// Colores por estado de campaña
const ESTADO_CONFIG = {
  activa: {
    badge: 'bg-neon/20 text-neon border border-neon/30',
    card: 'bg-gradient-to-br from-neon/20 to-emerald-900/30 border-neon/30',
    icono: Zap,
    label: 'ACTIVA',
  },
  pendiente: {
    badge: 'bg-white/10 text-white/40 border border-white/10',
    card: 'bg-white/5 border-white/10',
    icono: Lock,
    label: 'PENDIENTE',
  },
  completada: {
    badge: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    card: 'bg-gradient-to-br from-yellow-900/20 to-amber-900/10 border-yellow-600/20',
    icono: Trophy,
    label: 'COMPLETADA',
  },
};

// Modal de confirmación para activar campaña
const ModalActivar = ({ campana, onConfirm, onCancel, cargando }) => (
  <AnimatePresence>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center"
      onClick={onCancel}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="bg-navy-900 border border-amber-500/30 rounded-t-3xl p-6 w-full max-w-lg"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-black text-lg">Activar campaña</h3>
          <button onClick={onCancel} className="text-white/40 active:text-white">
            <X size={22} />
          </button>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-4">
          <p className="text-amber-400 font-bold text-sm mb-1">🚀 {campana.nombre}</p>
          <p className="text-white/60 text-xs">{campana.objetivo}</p>
        </div>

        <p className="text-white/50 text-sm mb-6">
          La campaña actual será marcada como completada. Las fechas de esta y las siguientes campañas se recalcularán desde hoy.
        </p>

        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 rounded-2xl border border-white/20 text-white/60 font-semibold">
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={cargando}
            className="flex-1 py-3 rounded-2xl bg-amber-500 text-navy-900 font-black active:bg-amber-400 disabled:opacity-50"
          >
            {cargando ? 'Activando...' : '⚡ ACTIVAR'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  </AnimatePresence>
);

// Barra de progreso animada
const BarraProgreso = ({ pct }) => (
  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
    <motion.div
      className="h-full bg-neon rounded-full"
      initial={{ width: 0 }}
      animate={{ width: `${pct}%` }}
      transition={{ duration: 1, ease: 'easeOut' }}
    />
  </div>
);

// Tarjeta de campaña activa
const TarjetaActiva = ({ data, onActivarSiguiente }) => {
  const { campana, siguiente } = data;
  const [modalAbierto, setModalAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);

  const handleActivar = async () => {
    setCargando(true);
    try {
      await onActivarSiguiente(siguiente.id);
      setModalAbierto(false);
    } catch (err) {
      alert('Error al activar campaña: ' + err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`card ${campana.requiere_activar_siguiente ? 'border-amber-500/40' : ESTADO_CONFIG.activa.card}`}
      >
        {/* Encabezado */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ESTADO_CONFIG.activa.badge}`}>
                ⚓ ACTIVA
              </span>
              <span className="text-white/30 text-xs">Campaña {campana.orden}</span>
            </div>
            <h2 className="text-white font-black text-xl">{campana.nombre}</h2>
            <p className="text-white/50 text-sm mt-0.5">{campana.objetivo}</p>
          </div>
          <Flag size={28} className="text-neon opacity-60 flex-shrink-0" />
        </div>

        {/* Progreso */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-white/50 text-xs">
              Día {campana.dias_transcurridos} de {campana.dias_totales}
            </span>
            <span className="text-neon text-xs font-bold">{campana.progreso_pct}%</span>
          </div>
          <BarraProgreso pct={campana.progreso_pct} />
          <p className="text-white/30 text-xs mt-1.5">
            {Math.max(0, campana.dias_totales - campana.dias_transcurridos)} días restantes
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-white/5 rounded-xl p-2.5 text-center">
            <p className="text-white font-black text-xl">{campana.stats.total_entrenos}</p>
            <p className="text-white/40 text-xs">entrenos</p>
          </div>
          <div className="bg-white/5 rounded-xl p-2.5 text-center">
            <p className="text-neon font-black text-xl">{campana.stats.asistencia_pct}%</p>
            <p className="text-white/40 text-xs">asistencia</p>
          </div>
          <div className="bg-white/5 rounded-xl p-2.5 text-center">
            <p className="text-white font-black text-xl">
              {Math.round(campana.stats.volumen_total / 1000 * 10) / 10}
              <span className="text-white/40 text-sm">t</span>
            </p>
            <p className="text-white/40 text-xs">volumen</p>
          </div>
        </div>

        {/* Botón activar siguiente si procede */}
        {campana.requiere_activar_siguiente && siguiente && (
          <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setModalAbierto(true)}
            className="w-full py-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 font-black text-sm active:bg-amber-500/30 transition-colors"
          >
            🚀 Iniciar Campaña {siguiente.orden}: {siguiente.nombre}
          </motion.button>
        )}
      </motion.div>

      {/* Modal confirmación */}
      {modalAbierto && siguiente && (
        <ModalActivar
          campana={siguiente}
          onConfirm={handleActivar}
          onCancel={() => setModalAbierto(false)}
          cargando={cargando}
        />
      )}
    </>
  );
};

// Tarjeta de campaña pendiente
const TarjetaPendiente = ({ campana, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.1 * index }}
    className={`card ${ESTADO_CONFIG.pendiente.card}`}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="bg-white/5 rounded-xl p-2">
          <Lock size={18} className="text-white/30" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-white/30 text-xs">Campaña {campana.orden}</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ESTADO_CONFIG.pendiente.badge}`}>
              PENDIENTE
            </span>
          </div>
          <h3 className="text-white/60 font-bold">{campana.nombre}</h3>
          {campana.fecha_inicio && (
            <p className="text-white/30 text-xs flex items-center gap-1 mt-0.5">
              <Calendar size={11} />
              Desde: {new Date(campana.fecha_inicio).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          )}
        </div>
      </div>
      <ChevronRight size={18} className="text-white/20" />
    </div>
    <p className="text-white/30 text-xs mt-2 ml-11">{campana.objetivo}</p>
  </motion.div>
);

// Tarjeta de campaña completada
const TarjetaCompletada = ({ campana, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.1 * index }}
    className={`card ${ESTADO_CONFIG.completada.card}`}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="bg-yellow-500/10 rounded-xl p-2">
          <Trophy size={18} className="text-yellow-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-yellow-400/50 text-xs">Campaña {campana.orden}</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ESTADO_CONFIG.completada.badge}`}>
              ✓ COMPLETADA
            </span>
          </div>
          <h3 className="text-white/70 font-bold">{campana.nombre}</h3>
        </div>
      </div>
    </div>
  </motion.div>
);

export default function Campanas() {
  const [campanas, setCampanas] = useState([]);
  const [activaData, setActivaData] = useState(null);
  const [loading, setLoading] = useState(true);

  const cargarDatos = async () => {
    try {
      const [todas, activa] = await Promise.all([
        api.getCampanas(),
        api.getCampanaActiva(),
      ]);
      setCampanas(todas);
      setActivaData(activa);
    } catch (err) {
      console.error('Error cargando campañas:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleActivarSiguiente = async (id) => {
    await api.activarCampana(id);
    await cargarDatos();
  };

  if (loading) return <LoadingSpinner texto="Cargando campañas..." />;

  const activa = campanas.find(c => c.estado === 'activa');
  const pendientes = campanas.filter(c => c.estado === 'pendiente');
  const completadas = campanas.filter(c => c.estado === 'completada');

  return (
    <div className="space-y-4 py-4">
      {/* Título */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2">
          <Flag size={24} className="text-neon" />
          <h1 className="text-2xl font-black text-white">Campañas</h1>
        </div>
        <p className="text-white/40 text-sm mt-0.5">Tu plan de entrenamiento estructurado</p>
      </motion.div>

      {/* Campaña activa */}
      {activaData?.campana && (
        <div>
          <p className="text-white/30 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1">
            <Zap size={11} className="text-neon" /> En curso
          </p>
          <TarjetaActiva data={activaData} onActivarSiguiente={handleActivarSiguiente} />
        </div>
      )}

      {/* Campañas pendientes */}
      {pendientes.length > 0 && (
        <div>
          <p className="text-white/30 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1">
            <TrendingUp size={11} /> Próximas
          </p>
          <div className="space-y-2">
            {pendientes.map((c, i) => (
              <TarjetaPendiente key={c.id} campana={c} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Campañas completadas */}
      {completadas.length > 0 && (
        <div>
          <p className="text-white/30 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1">
            <Trophy size={11} className="text-yellow-400" /> Completadas
          </p>
          <div className="space-y-2">
            {completadas.map((c, i) => (
              <TarjetaCompletada key={c.id} campana={c} index={i} />
            ))}
          </div>
        </div>
      )}

      {campanas.length === 0 && (
        <div className="card text-center py-8">
          <p className="text-4xl mb-2">⚓</p>
          <p className="text-white/50">No hay campañas configuradas</p>
        </div>
      )}
    </div>
  );
}
