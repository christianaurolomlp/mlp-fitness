import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LogOut, Anchor, Shield, Github, Info, Flag, Trophy, Lock, Check } from 'lucide-react';
import { api } from '../utils/api';

export default function Ajustes({ onLogout }) {
  const [campanas, setCampanas] = useState([]);

  useEffect(() => {
    api.getCampanas().then(setCampanas).catch(() => {});
  }, []);

  const confirmarLogout = () => {
    if (confirm('¿Cerrar sesión, Capi?')) onLogout();
  };

  return (
    <div className="space-y-4 py-4">
      <h1 className="text-2xl font-black text-white">Ajustes <span className="text-neon">⚓</span></h1>

      {/* Perfil */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card">
        <div className="flex items-center gap-4">
          <div className="bg-neon/10 border border-neon/20 rounded-full p-4">
            <Anchor size={28} className="text-neon" />
          </div>
          <div>
            <h2 className="text-white font-bold text-xl">Capi (Aurolo)</h2>
            <p className="text-white/40 text-sm">Marines Live Platform</p>
            <p className="text-neon/70 text-xs mt-1">⚓ melapela.ai</p>
          </div>
        </div>
      </motion.div>

      {/* Info app */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card space-y-3">
        <h3 className="text-white/50 text-xs font-bold uppercase tracking-wider">Aplicación</h3>

        <div className="flex items-center justify-between py-2 border-b border-white/5">
          <div className="flex items-center gap-3">
            <Info size={18} className="text-white/40" />
            <span className="text-white text-sm">Versión</span>
          </div>
          <span className="text-white/40 text-sm">1.0.0</span>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-white/5">
          <div className="flex items-center gap-3">
            <Shield size={18} className="text-white/40" />
            <span className="text-white text-sm">Sesión</span>
          </div>
          <span className="text-neon text-xs font-semibold">Activa (30 días)</span>
        </div>

        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <Github size={18} className="text-white/40" />
            <span className="text-white text-sm">Stack</span>
          </div>
          <span className="text-white/40 text-xs">Node + React + PostgreSQL</span>
        </div>
      </motion.div>

      {/* Objetivo */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card">
        <h3 className="text-white/50 text-xs font-bold uppercase tracking-wider mb-3">Objetivo actual</h3>
        <div className="bg-neon/5 border border-neon/10 rounded-xl p-3">
          <p className="text-neon font-bold text-sm">🎯 Recomposición corporal</p>
          <p className="text-white/60 text-xs mt-1">Mantener masa muscular · Bajar grasa abdominal · Tonificado para verano</p>
        </div>
      </motion.div>

      {/* Gestión de Campañas */}
      {campanas.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="card space-y-3">
          <h3 className="text-white/50 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
            <Flag size={13} className="text-neon" /> Gestión de Campañas
          </h3>
          {campanas.map(c => (
            <div key={c.id} className="flex items-start justify-between py-2 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-1.5 ${
                  c.estado === 'activa' ? 'bg-neon/10' :
                  c.estado === 'completada' ? 'bg-yellow-500/10' :
                  'bg-white/5'
                }`}>
                  {c.estado === 'activa' && <Flag size={15} className="text-neon" />}
                  {c.estado === 'completada' && <Trophy size={15} className="text-yellow-400" />}
                  {c.estado === 'pendiente' && <Lock size={15} className="text-white/30" />}
                </div>
                <div>
                  <p className={`text-sm font-semibold ${
                    c.estado === 'activa' ? 'text-white' :
                    c.estado === 'completada' ? 'text-white/60' :
                    'text-white/40'
                  }`}>
                    {c.nombre}
                  </p>
                  {c.fecha_inicio && (
                    <p className="text-white/30 text-xs">
                      {new Date(c.fecha_inicio).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                      {c.fecha_fin && ` → ${new Date(c.fecha_fin).toLocaleDateString('es', { day: 'numeric', month: 'short' })}`}
                    </p>
                  )}
                </div>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full mt-0.5 ${
                c.estado === 'activa' ? 'bg-neon/20 text-neon' :
                c.estado === 'completada' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-white/10 text-white/30'
              }`}>
                {c.estado === 'activa' ? 'Activa' : c.estado === 'completada' ? '✓' : 'Pendiente'}
              </span>
            </div>
          ))}
        </motion.div>
      )}

      {/* Logout */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <button onClick={confirmarLogout} className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl border border-mlpred/30 text-mlpred font-semibold active:bg-mlpred/10 transition-colors">
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </motion.div>

      <p className="text-center text-white/20 text-xs pb-4">
        ⚓ MLP FITNESS — Hecho con ❤️ para Capi
      </p>
    </div>
  );
}
