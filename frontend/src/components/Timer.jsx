import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipForward } from 'lucide-react';

// Sonido de notificación generado por Web Audio API
const playBeep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.8);
  } catch {}
};

export const Timer = ({ duracion, onFinish, autoStart = true, compact = false }) => {
  const [restante, setRestante] = useState(duracion);
  const [corriendo, setCorriendo] = useState(autoStart);
  const [terminado, setTerminado] = useState(false);
  const intervalRef = useRef(null);

  const tick = useCallback(() => {
    setRestante(prev => {
      if (prev <= 1) {
        setCorriendo(false);
        setTerminado(true);
        playBeep();
        onFinish?.();
        return 0;
      }
      return prev - 1;
    });
  }, [onFinish]);

  useEffect(() => {
    if (corriendo) {
      intervalRef.current = setInterval(tick, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [corriendo, tick]);

  const progreso = restante / duracion;
  const radio = 54;
  const circunferencia = 2 * Math.PI * radio;
  const offset = circunferencia * (1 - progreso);

  const minutos = Math.floor(restante / 60);
  const segundos = restante % 60;

  const resetear = () => {
    setRestante(duracion);
    setCorriendo(true);
    setTerminado(false);
  };

  // Modo compacto: barra horizontal inline para toasts
  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <span className={`text-2xl font-black tabular-nums ${terminado ? 'text-mlpred' : 'text-neon'}`}>
          {terminado ? '¡YA!' : `${minutos}:${String(segundos).padStart(2, '0')}`}
        </span>
        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-neon rounded-full"
            animate={{ width: `${progreso * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <button
          onClick={terminado ? resetear : () => onFinish?.()}
          className="text-white/40 active:text-white"
        >
          <SkipForward size={18} />
        </button>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        {/* Circle progress */}
        <div className="relative w-36 h-36">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r={radio} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
            <motion.circle
              cx="60" cy="60" r={radio}
              fill="none"
              stroke={terminado ? '#FF3B3B' : '#00FF88'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circunferencia}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 0.5 }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-black ${terminado ? 'text-mlpred' : 'text-neon'}`}>
              {terminado ? '¡YA!' : `${minutos}:${String(segundos).padStart(2, '0')}`}
            </span>
            <span className="text-white/50 text-xs">descanso</span>
          </div>
        </div>

        {/* Controles */}
        <div className="flex gap-3">
          {!terminado && (
            <button
              onClick={() => setCorriendo(p => !p)}
              className="bg-white/10 rounded-full p-3 active:scale-90 transition-transform"
            >
              {corriendo ? <Pause size={20} /> : <Play size={20} />}
            </button>
          )}
          <button
            onClick={terminado ? resetear : () => { onFinish?.(); }}
            className="bg-white/10 rounded-full p-3 active:scale-90 transition-transform"
          >
            <SkipForward size={20} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
