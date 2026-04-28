import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../utils/api';
import { EjercicioVisual } from '../components/EjercicioVisual';
import { LoadingSpinner } from '../components/LoadingSpinner';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

const GRUPOS = ['Todos', 'Pecho', 'Espalda', 'Pierna', 'Hombros', 'Brazos', 'Core'];

export default function Progreso() {
  const [ejercicios, setEjercicios] = useState([]);
  const [grupo, setGrupo] = useState('Todos');
  const [expandido, setExpandido] = useState(null);
  const [historial, setHistorial] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getEjercicios().then(setEjercicios).finally(() => setLoading(false));
  }, []);

  const verHistorial = async (ejId) => {
    if (expandido === ejId) {
      setExpandido(null);
      return;
    }
    setExpandido(ejId);
    if (!historial[ejId]) {
      const data = await api.getEjercicioHistorial(ejId);
      setHistorial(prev => ({ ...prev, [ejId]: data }));
    }
  };

  const ejerciciosFiltrados = ejercicios.filter(e =>
    grupo === 'Todos' || e.grupo_muscular === grupo
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4 py-4">
      <h1 className="text-2xl font-black text-white">Progreso <span className="text-neon">⚓</span></h1>

      {/* Filtro grupo muscular */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {GRUPOS.map(g => (
          <button
            key={g}
            onClick={() => setGrupo(g)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap flex-shrink-0 transition-colors ${grupo === g ? 'bg-neon text-navy-900' : 'bg-white/10 text-white/60'}`}
          >
            {g}
          </button>
        ))}
      </div>

      {ejerciciosFiltrados.map(ej => (
        <motion.div key={ej.id} layout className="card">
          <button onClick={() => verHistorial(ej.id)} className="w-full">
            <div className="flex items-center gap-3">
              <EjercicioVisual
                nombre={ej.nombre}
                grupo_muscular={ej.grupo_muscular}
                equipamiento={ej.equipamiento}
                imagen_url={ej.imagen_url}
                size="sm"
                className="w-20 flex-shrink-0"
              />
              <div className="flex-1 text-left">
                <p className="text-white font-semibold text-sm leading-tight">{ej.nombre}</p>
                <p className="text-white/40 text-xs">{ej.equipamiento}</p>
                {ej.peso_max ? (
                  <div className="flex gap-2 mt-1">
                    <span className="text-neon text-xs font-bold flex items-center gap-1">
                      <Trophy size={10} />{ej.peso_max}kg × {ej.reps_a_ese_peso}
                    </span>
                    {ej.one_rm_estimado && (
                      <span className="text-white/30 text-xs">1RM ~{parseFloat(ej.one_rm_estimado).toFixed(1)}kg</span>
                    )}
                  </div>
                ) : (
                  <p className="text-white/30 text-xs mt-1">Sin registros aún</p>
                )}
              </div>
              {expandido === ej.id ? <ChevronUp size={18} className="text-neon flex-shrink-0" /> : <ChevronDown size={18} className="text-white/30 flex-shrink-0" />}
            </div>
          </button>

          <AnimatePresence>
            {expandido === ej.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 pt-4 border-t border-white/10">
                  {historial[ej.id] ? (
                    historial[ej.id].progresion.length > 1 ? (
                      <>
                        <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-3">
                          Evolución peso máximo
                        </p>
                        <ResponsiveContainer width="100%" height={150}>
                          <LineChart data={historial[ej.id].progresion}>
                            <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="fecha" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} axisLine={false} tickLine={false} width={35} />
                            <Tooltip
                              contentStyle={{ background: '#0D005C', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                              labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
                              itemStyle={{ color: '#00FF88' }}
                              formatter={(v) => [`${v} kg`, 'Peso máx']}
                            />
                            <Line type="monotone" dataKey="peso_max" stroke="#00FF88" strokeWidth={2} dot={{ fill: '#00FF88', r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>

                        {/* Últimas 5 series */}
                        <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2 mt-4">
                          Últimas series
                        </p>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {historial[ej.id].series.slice(0, 10).map((s, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <span className="text-white/40">{new Date(s.fecha_entreno).toLocaleDateString('es', { day: 'numeric', month: 'short' })}</span>
                              <span className={`font-semibold ${s.es_pr ? 'text-mlpred' : 'text-white/70'}`}>
                                {s.es_pr && '🏆 '}{s.peso_kg}kg × {s.reps} reps
                              </span>
                              <span className="text-white/30">~{parseFloat(s.one_rm_estimado).toFixed(1)}kg 1RM</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="text-white/40 text-sm text-center py-4">
                        {historial[ej.id].series.length === 0 ? 'Sin datos aún' : 'Necesitas más sesiones para ver la gráfica'}
                      </p>
                    )
                  ) : (
                    <LoadingSpinner texto="Cargando historial..." />
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
