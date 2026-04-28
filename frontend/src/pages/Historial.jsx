import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Download, Filter, Trophy, Clock, BarChart3 } from 'lucide-react';
import { api } from '../utils/api';
import { LoadingSpinner } from '../components/LoadingSpinner';

export default function Historial() {
  const [entrenos, setEntrenos] = useState([]);
  const [rutinaFiltro, setRutinaFiltro] = useState('');
  const [rutinas, setRutinas] = useState([]);
  const [expandido, setExpandido] = useState(null);
  const [detalleEntreno, setDetalleEntreno] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getEntrenos({ limit: 50 }),
      api.getRutinas(),
    ]).then(([ens, ruts]) => {
      setEntrenos(ens);
      setRutinas(ruts);
    }).finally(() => setLoading(false));
  }, []);

  const filtrar = async (rutina_id) => {
    setRutinaFiltro(rutina_id);
    setLoading(true);
    try {
      const ens = await api.getEntrenos(rutina_id ? { rutina_id, limit: 50 } : { limit: 50 });
      setEntrenos(ens);
    } finally {
      setLoading(false);
    }
  };

  const verDetalle = async (entrenoId) => {
    if (expandido === entrenoId) {
      setExpandido(null);
      return;
    }
    setExpandido(entrenoId);
    if (!detalleEntreno[entrenoId]) {
      const data = await api.getEntreno(entrenoId);
      setDetalleEntreno(prev => ({ ...prev, [entrenoId]: data }));
    }
  };

  const formatFecha = (fecha) => new Date(fecha).toLocaleDateString('es', {
    weekday: 'short', day: 'numeric', month: 'short',
  });

  if (loading) return <LoadingSpinner />;

  // Agrupar series por ejercicio para el detalle
  const agruparSeries = (series) => {
    const grupos = {};
    series.forEach(s => {
      if (!grupos[s.ejercicio_id]) {
        grupos[s.ejercicio_id] = { nombre: s.ejercicio_nombre, series: [] };
      }
      grupos[s.ejercicio_id].series.push(s);
    });
    return Object.values(grupos);
  };

  return (
    <div className="space-y-4 py-4">
      <h1 className="text-2xl font-black text-white">Historial <span className="text-neon">⚓</span></h1>

      {/* Filtro por rutina */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => filtrar('')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors flex-shrink-0 ${!rutinaFiltro ? 'bg-neon text-navy-900' : 'bg-white/10 text-white/60'}`}
        >
          Todos
        </button>
        {rutinas.map(r => (
          <button
            key={r.id}
            onClick={() => filtrar(String(r.id))}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors flex-shrink-0 ${rutinaFiltro === String(r.id) ? 'bg-neon text-navy-900' : 'bg-white/10 text-white/60'}`}
          >
            {r.nombre}
          </button>
        ))}
      </div>

      {entrenos.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-4xl mb-2">📋</p>
          <p className="text-white/50">Aún no hay entrenos registrados</p>
        </div>
      )}

      {entrenos.map(entreno => (
        <motion.div key={entreno.id} layout className="card">
          <button onClick={() => verDetalle(entreno.id)} className="w-full">
            <div className="flex items-start justify-between">
              <div className="text-left">
                <p className="text-neon text-xs font-bold uppercase tracking-wider">{formatFecha(entreno.fecha)}</p>
                <h3 className="text-white font-bold text-lg">{entreno.rutina_nombre || 'Entreno libre'}</h3>
                <div className="flex gap-3 mt-1 text-white/40 text-xs">
                  {entreno.duracion_minutos > 0 && (
                    <span className="flex items-center gap-1"><Clock size={11} />{entreno.duracion_minutos}min</span>
                  )}
                  {entreno.total_series > 0 && (
                    <span className="flex items-center gap-1"><BarChart3 size={11} />{entreno.total_series} series</span>
                  )}
                  {entreno.volumen_total > 0 && (
                    <span>{Math.round(entreno.volumen_total / 100) / 10}t</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={api.exportarEntreno(entreno.id)}
                  download
                  onClick={e => e.stopPropagation()}
                  className="text-white/20 active:text-neon p-2"
                >
                  <Download size={16} />
                </a>
                {expandido === entreno.id ? <ChevronUp size={18} className="text-neon" /> : <ChevronDown size={18} className="text-white/30" />}
              </div>
            </div>
          </button>

          <AnimatePresence>
            {expandido === entreno.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                  {detalleEntreno[entreno.id] ? (
                    agruparSeries(detalleEntreno[entreno.id].series).map((grupo, i) => (
                      <div key={i}>
                        <p className="text-white/60 text-sm font-semibold mb-1">{grupo.nombre}</p>
                        <div className="flex gap-2 flex-wrap">
                          {grupo.series.map((s, j) => (
                            <span key={j} className={`text-xs px-2 py-1 rounded-lg ${s.es_pr ? 'bg-mlpred/20 text-mlpred' : 'bg-white/5 text-white/60'}`}>
                              {s.es_pr && '🏆 '}S{s.numero_serie}: {s.peso_kg}kg×{s.reps}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <LoadingSpinner texto="Cargando detalle..." />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  );
}
