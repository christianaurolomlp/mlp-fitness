import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Calendar, Clock, BarChart3, Trophy, ChevronRight, Flag } from 'lucide-react';
import { api } from '../utils/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

const getSaludo = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
};

export default function Home() {
  const navigate = useNavigate();
  const [rutinaHoy, setRutinaHoy] = useState(null);
  const [stats, setStats] = useState(null);
  const [progresion, setProgresion] = useState([]);
  const [campanaActiva, setCampanaActiva] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getRutinaHoy(),
      api.getStatsSemana(),
      api.getProgresionGeneral(),
      api.getCampanaActiva(),
    ]).then(([rh, st, pg, ca]) => {
      setRutinaHoy(rh);
      setStats(st);
      setProgresion(pg.map(p => ({
        semana: new Date(p.semana).toLocaleDateString('es', { day: '2-digit', month: 'short' }),
        volumen: Math.round(p.volumen),
      })));
      setCampanaActiva(ca?.campana || null);
    }).finally(() => setLoading(false));
  }, []);

  const iniciarEntreno = async () => {
    if (!rutinaHoy?.rutina) return;
    try {
      const entreno = await api.iniciarEntreno(rutinaHoy.rutina.id);
      navigate(`/entreno/${entreno.id}`);
    } catch (err) {
      alert('Error al iniciar: ' + err.message);
    }
  };

  if (loading) return <LoadingSpinner texto="Cargando tu plan, Capi..." />;

  return (
    <div className="space-y-4 py-4">
      {/* Saludo */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-black text-white">
          {getSaludo()}, <span className="text-neon">Capi</span> ⚓
        </h1>
        <p className="text-white/40 text-sm">
          {new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </motion.div>

      {/* Banner campaña activa */}
      {campanaActiva && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <button
            onClick={() => navigate('/campanas')}
            className={`w-full text-left card py-3 px-4 border transition-colors ${
              campanaActiva.requiere_activar_siguiente
                ? 'border-amber-500/40 bg-amber-500/5'
                : 'border-neon/10 bg-neon/5'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flag size={15} className={campanaActiva.requiere_activar_siguiente ? 'text-amber-400' : 'text-neon'} />
                <span className={`text-xs font-black uppercase tracking-widest ${campanaActiva.requiere_activar_siguiente ? 'text-amber-400' : 'text-neon'}`}>
                  Campaña {campanaActiva.orden} — {campanaActiva.nombre.split(' ').slice(0, 2).join(' ')}
                </span>
              </div>
              <ChevronRight size={15} className="text-white/30" />
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-white/50 text-xs">
                Día {campanaActiva.dias_transcurridos} de {campanaActiva.dias_totales}
              </span>
              {/* Mini barra de progreso */}
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${campanaActiva.requiere_activar_siguiente ? 'bg-amber-400' : 'bg-neon'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${campanaActiva.progreso_pct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
              <span className={`text-xs font-bold ${campanaActiva.requiere_activar_siguiente ? 'text-amber-400' : 'text-neon'}`}>
                {campanaActiva.progreso_pct}%
              </span>
            </div>
            {campanaActiva.requiere_activar_siguiente && (
              <p className="text-amber-400/80 text-xs mt-1 font-semibold">¡Próxima disponible!</p>
            )}
          </button>
        </motion.div>
      )}

      {/* Card rutina de hoy */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {rutinaHoy?.rutina ? (
          <div className="card bg-gradient-to-br from-neon/10 to-blue-900/20 border-neon/20">
            <div className="flex items-start justify-between mb-1">
              <div>
                <p className="text-neon text-xs font-bold uppercase tracking-widest">Hoy toca</p>
                <h2 className="text-2xl font-black text-white mt-1">{rutinaHoy.rutina.nombre}</h2>
                <p className="text-white/50 text-sm">{rutinaHoy.rutina.descripcion}</p>
              </div>
              <Zap size={32} className="text-neon opacity-60" />
            </div>
            <p className="text-white/40 text-xs mb-4">
              {rutinaHoy.ejercicios?.length} ejercicios
            </p>
            <button onClick={iniciarEntreno} className="btn-primary w-full text-xl">
              ⚡ INICIAR ENTRENAMIENTO
            </button>
          </div>
        ) : (
          <div className="card text-center py-8">
            <p className="text-4xl mb-2">🌊</p>
            <p className="text-white font-bold text-lg">{rutinaHoy?.mensaje || 'Fin de semana'}</p>
            <p className="text-white/40 text-sm mt-1">Descansa y recupera, Capi</p>
          </div>
        )}
      </motion.div>

      {/* Stats semanales */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 gap-3"
        >
          <div className="card">
            <div className="flex items-center gap-2 mb-1">
              <Calendar size={16} className="text-neon" />
              <span className="text-white/50 text-xs">Días esta semana</span>
            </div>
            <p className="text-3xl font-black text-white">
              {stats.dias_entrenados}<span className="text-white/30 text-lg">/5</span>
            </p>
          </div>

          <div className="card">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={16} className="text-neon" />
              <span className="text-white/50 text-xs">Tiempo total</span>
            </div>
            <p className="text-3xl font-black text-white">
              {stats.tiempo_total}<span className="text-white/30 text-sm">min</span>
            </p>
          </div>

          <div className="card">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 size={16} className="text-neon" />
              <span className="text-white/50 text-xs">Volumen</span>
            </div>
            <p className="text-2xl font-black text-white">
              {Math.round(stats.volumen_total / 1000 * 10) / 10}<span className="text-white/30 text-sm">t</span>
            </p>
          </div>

          <div className="card">
            <div className="flex items-center gap-2 mb-1">
              <Trophy size={16} className="text-mlpred" />
              <span className="text-white/50 text-xs">PRs semana</span>
            </div>
            <p className="text-3xl font-black text-mlpred">{stats.prs_semana}</p>
          </div>
        </motion.div>
      )}

      {/* Gráfica de progresión */}
      {progresion.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <h3 className="text-white/50 text-xs font-bold uppercase tracking-wider mb-3">
            Volumen últimas 8 semanas
          </h3>
          <ResponsiveContainer width="100%" height={100}>
            <AreaChart data={progresion}>
              <defs>
                <linearGradient id="gradVol" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00FF88" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00FF88" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="semana" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#0D005C', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
                itemStyle={{ color: '#00FF88' }}
                formatter={(v) => [`${v} kg`, 'Volumen']}
              />
              <Area type="monotone" dataKey="volumen" stroke="#00FF88" strokeWidth={2} fill="url(#gradVol)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Acceso rápido a rutinas */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card"
      >
        <button
          onClick={() => navigate('/rutina')}
          className="flex items-center justify-between w-full"
        >
          <span className="text-white font-semibold">Ver todas las rutinas</span>
          <ChevronRight size={20} className="text-white/40" />
        </button>
      </motion.div>
    </div>
  );
}
