import { useState } from 'react';
import { Activity } from 'lucide-react';

const GRADIENTES = {
  Pecho:   'from-red-700 to-orange-500',
  Espalda: 'from-blue-900 to-blue-500',
  Pierna:  'from-emerald-700 to-green-400',
  Hombros: 'from-yellow-600 to-amber-400',
  Brazos:  'from-purple-700 to-violet-500',
  Core:    'from-cyan-600 to-sky-400',
  Cardio:  'from-cyan-500 to-blue-500',
  default: 'from-slate-700 to-slate-500',
};

const EMOJI_GRUPO = {
  Pecho:   '🏋️', Espalda: '🤸', Pierna: '🦵',
  Hombros: '🔱', Brazos:  '💪', Core:   '🔥',
  default: '🏅',
};

const EMOJI_EQUIPO = {
  Mancuerna: '🥊', Máquina: '⚙️', Cable: '🔗',
  Barra: '🏋️', 'Peso Corporal': '🤸', default: '💥',
};

export const EjercicioVisual = ({ nombre, grupo_muscular, equipamiento, imagen_url, className = '', size = 'md' }) => {
  const [imgError, setImgError] = useState(false);
  const gradiente = GRADIENTES[grupo_muscular] || GRADIENTES.default;
  // Solo añadir altura por defecto si className no trae ya una clase h-*
  const heights = { sm: 'h-24', md: 'h-44', lg: 'h-56' };
  const tieneAltura = /\bh-\d/.test(className);
  const alturaClass = tieneAltura ? '' : heights[size];

  const mostrarImagen = imagen_url && !imgError;

  return (
    <div className={`relative overflow-hidden rounded-2xl ${alturaClass} ${className} bg-gradient-to-br ${gradiente}`}>
      {mostrarImagen ? (
        <>
          <img
            src={imagen_url}
            alt={nombre}
            onError={() => setImgError(true)}
            className="w-full h-full object-contain object-center"
          />
          {/* Overlay con nombre y badge */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 flex flex-col justify-between p-2.5">
            <p className="text-white font-bold text-xs leading-tight drop-shadow line-clamp-2">{nombre}</p>
            <span className="self-start bg-black/50 text-white/90 text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
              {grupo_muscular}
            </span>
          </div>
        </>
      ) : (
        // Fallback: gradiente con emoji
        <>
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full" />
          <div className="absolute -left-4 -bottom-4 w-16 h-16 bg-black/10 rounded-full" />
          <div className="px-2.5 pt-2.5 relative z-10">
            <p className="text-white font-bold text-xs leading-tight line-clamp-2">{nombre}</p>
          </div>
          <div className="flex-1 flex items-center justify-center absolute inset-0 z-10">
            {grupo_muscular === 'Cardio' ? (
              <Activity
                className="text-white/80"
                size={size === 'lg' ? 64 : size === 'md' ? 52 : 36}
                strokeWidth={1.5}
              />
            ) : (
              <span className={size === 'lg' ? 'text-6xl' : size === 'md' ? 'text-5xl' : 'text-3xl'}>
                {EMOJI_GRUPO[grupo_muscular] || EMOJI_GRUPO.default}
              </span>
            )}
          </div>
          <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 flex justify-between items-end">
            <span className="bg-black/30 text-white/90 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {grupo_muscular}
            </span>
            <span className="text-base">{EMOJI_EQUIPO[equipamiento] || EMOJI_EQUIPO.default}</span>
          </div>
        </>
      )}
    </div>
  );
};
