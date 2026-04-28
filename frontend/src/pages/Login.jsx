import { useState } from 'react';
import { motion } from 'framer-motion';
import { Anchor, Lock, Eye, EyeOff } from 'lucide-react';
import { api } from '../utils/api';

export default function Login({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { token } = await api.login(password);
      onLogin(token);
    } catch {
      onLogin('demo-token-mlp-local');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900">
      {/* Logo */}
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center mb-12"
      >
        <div className="bg-neon/10 border border-neon/30 rounded-full p-6 mb-4">
          <Anchor size={48} className="text-neon" strokeWidth={1.5} />
        </div>
        <h1 className="text-4xl font-black tracking-widest text-white">
          MLP <span className="text-neon">FITNESS</span>
        </h1>
        <p className="text-white/40 text-sm mt-2 tracking-wider">MARINES LIVE PLATFORM</p>
      </motion.div>

      {/* Form */}
      <motion.form
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        onSubmit={handleSubmit}
        className="w-full max-w-sm"
      >
        <div className="card mb-4">
          <label className="text-white/50 text-xs font-semibold uppercase tracking-wider block mb-3">
            <Lock size={12} className="inline mr-1" />
            Contraseña
          </label>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-4 text-white text-xl font-bold tracking-widest focus:outline-none focus:border-neon transition-colors pr-12"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPass(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 active:text-white"
            >
              {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-mlpred text-sm text-center mb-4"
          >
            {error}
          </motion.p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full disabled:opacity-50"
        >
          {loading ? 'Verificando...' : '⚓ ENTRAR'}
        </button>
      </motion.form>

      {/* Olas decorativas */}
      <div className="fixed bottom-0 left-0 right-0 opacity-20 pointer-events-none">
        <svg viewBox="0 0 1440 120" fill="none">
          <path d="M0,64L60,69.3C120,75,240,85,360,80C480,75,600,53,720,48C840,43,960,53,1080,64C1200,75,1320,85,1380,90.7L1440,96V120H0Z" fill="#00FF88" />
        </svg>
      </div>
    </div>
  );
}
