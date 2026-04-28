import { Anchor } from 'lucide-react';
import { motion } from 'framer-motion';

export const LoadingSpinner = ({ texto = 'Cargando...' }) => (
  <div className="flex flex-col items-center justify-center gap-4 py-16">
    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}>
      <Anchor size={36} className="text-neon" />
    </motion.div>
    <p className="text-white/50 text-sm">{texto}</p>
  </div>
);
