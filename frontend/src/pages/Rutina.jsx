import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Play, Pencil, Save, X, Clock, Repeat, Flag } from 'lucide-react';
import { api } from '../utils/api';
import { EjercicioVisual } from '../components/EjercicioVisual';
import { LoadingSpinner } from '../components/LoadingSpinner';

const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

export default function Rutina() {
  const navigate = useNavigate();
  const [rutinas, setRutinas] = useState([]);
  const [rutinaActiva, setRutinaActiva] = useState(null);
  const [ejercicios, setEjercicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingEjs, setLoadingEjs] = useState(false);
  const [editando, setEditando] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [campanaActiva, setCampanaActiva] = useState(null);

  useEffect(() => {
    Promise.all([
      api.getRutinas(),
      api.getCampanaActiva(),
    ]).then(([ruts, ca]) => {
      setRutinas(ruts);
      setCampanaActiva(ca?.campana || null);
    }).finally(() => setLoading(false));
  }, []);

  const seleccionarRutina = async (rutina) => {
    if (rutinaActiva?.id === rutina.id) {
      setRutinaActiva(null);
      return;
    }
    setRutinaActiva(rutina);
    setLoadingEjs(true);
    try {
      const data = await api.getRutina(rutina.id);
      setEjercicios(data.ejercicios);
    } finally {
      setLoadingEjs(false);
    }
  };

  const iniciarRutina = async (rutinaId) => {
    try {
      const entreno = await api.iniciarEntreno(rutinaId);
      navigate(`/entreno/${entreno.id}`);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const iniciarEdicion = (ej) => {
    setEditando(ej.id);
    setEditForm({
      series_objetivo: ej.series_objetivo,
      reps_min: ej.reps_min,
      reps_max: ej.reps_max,
      descanso_segundos: ej.descanso_segundos,
    });
  };

  const guardarEdicion = async (ej) => {
    try {
      await api.updateRutinaEjercicio(ej.rutina_id, ej.id, editForm);
      setEjercicios(prev => prev.map(e => e.id === ej.id ? { ...e, ...editForm } : e));
      setEditando(null);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-3 py-4">
      <h1 className="text-2xl font-black text-white">Rutinas <span className="text-neon">⚓</span></h1>

      {/* Badge de campaña activa */}
      {campanaActiva && (
        <div className="flex items-center gap-2 bg-neon/5 border border-neon/15 rounded-xl px-3 py-2">
          <Flag size={14} className="text-neon flex-shrink-0" />
          <span className="text-neon/80 text-xs font-bold">
            📅 Campaña {campanaActiva.orden} — {campanaActiva.nombre}
            <span className="text-white/30 font-normal ml-1">
              (Día {campanaActiva.dias_transcurridos} de {campanaActiva.dias_totales})
            </span>
          </span>
        </div>
      )}

      {rutinas.map(rutina => (
        <motion.div key={rutina.id} layout className="card">
          {/* Header rutina */}
          <button
            onClick={() => seleccionarRutina(rutina)}
            className="flex items-center justify-between w-full"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-neon/10 text-neon text-xs font-bold px-2 py-0.5 rounded-full">
                  {DIAS[rutina.dia_semana]}
                </span>
                <h2 className="text-white font-bold text-lg">{rutina.nombre}</h2>
              </div>
              <p className="text-white/40 text-sm text-left">{rutina.descripcion}</p>
            </div>
            {rutinaActiva?.id === rutina.id ? <ChevronUp size={20} className="text-neon" /> : <ChevronDown size={20} className="text-white/40" />}
          </button>

          {/* Ejercicios expandidos */}
          <AnimatePresence>
            {rutinaActiva?.id === rutina.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="mt-4 space-y-3">
                  {loadingEjs ? (
                    <LoadingSpinner texto="Cargando ejercicios..." />
                  ) : (
                    <>
                      {ejercicios.map((ej, i) => (
                        <div key={ej.id} className="bg-white/5 rounded-xl p-3">
                          <div className="flex gap-3">
                            <EjercicioVisual
                              nombre={ej.nombre}
                              grupo_muscular={ej.grupo_muscular}
                              equipamiento={ej.equipamiento}
                              imagen_url={ej.imagen_url}
                              size="sm"
                              className="w-24 flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div>
                                  <span className="text-white/30 text-xs">{i + 1}.</span>
                                  <p className="text-white font-semibold text-sm leading-tight">{ej.nombre}</p>
                                  <p className="text-white/40 text-xs">{ej.equipamiento}</p>
                                </div>
                                <button onClick={() => editando === ej.id ? setEditando(null) : iniciarEdicion(ej)} className="text-white/30 active:text-neon p-1">
                                  {editando === ej.id ? <X size={16} /> : <Pencil size={14} />}
                                </button>
                              </div>

                              {editando === ej.id ? (
                                <div className="mt-2 space-y-2">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-white/40 text-xs">Series</label>
                                      <input type="number" value={editForm.series_objetivo}
                                        onChange={e => setEditForm(p => ({ ...p, series_objetivo: +e.target.value }))}
                                        className="w-full bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-center text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-white/40 text-xs">Reps min</label>
                                      <input type="number" value={editForm.reps_min}
                                        onChange={e => setEditForm(p => ({ ...p, reps_min: +e.target.value }))}
                                        className="w-full bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-center text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-white/40 text-xs">Reps max</label>
                                      <input type="number" value={editForm.reps_max}
                                        onChange={e => setEditForm(p => ({ ...p, reps_max: +e.target.value }))}
                                        className="w-full bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-center text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-white/40 text-xs">Descanso (s)</label>
                                      <input type="number" value={editForm.descanso_segundos}
                                        onChange={e => setEditForm(p => ({ ...p, descanso_segundos: +e.target.value }))}
                                        className="w-full bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-center text-sm"
                                      />
                                    </div>
                                  </div>
                                  <button onClick={() => guardarEdicion(ej)} className="btn-primary w-full py-2 text-sm gap-2">
                                    <Save size={14} /> Guardar
                                  </button>
                                </div>
                              ) : (
                                <div className="flex gap-3 mt-2 text-xs text-white/50">
                                  <span className="flex items-center gap-1"><Repeat size={11} />{ej.series_objetivo}×{ej.reps_min}-{ej.reps_max}</span>
                                  <span className="flex items-center gap-1"><Clock size={11} />{ej.descanso_segundos}s</span>
                                  {ej.ultimo_peso && (
                                    <span className="text-neon/70">Último: {ej.ultimo_peso}kg</span>
                                  )}
                                </div>
                              )}
                              {ej.nota_especial && (
                                <p className="text-amber-400/70 text-xs mt-1">⚠ {ej.nota_especial}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      <button
                        onClick={() => iniciarRutina(rutina.id)}
                        className="btn-primary w-full mt-2"
                      >
                        <Play size={18} /> Empezar {rutina.nombre}
                      </button>
                    </>
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
