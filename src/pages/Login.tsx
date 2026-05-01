import { Rocket, Chrome } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

export function Login() {
  const navigate = useNavigate();
  const { loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);
      await loginWithGoogle();
      navigate('/');
    } catch (error) {
      console.error('Authentication failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-[120px] opacity-60" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-indigo-100 rounded-full blur-[120px] opacity-60" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md p-8 bento-card z-10 shadow-2xl relative"
      >
        <div className="text-center mb-10">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="w-16 h-16 bg-brand-primary rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 mx-auto mb-6"
          >
            <Rocket className="text-white w-10 h-10" />
          </motion.div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-1 text-slate-900 leading-none">LIGHTYEAR</h1>
          <p className="text-slate-500 font-mono text-[10px] uppercase tracking-[0.3em]">Agency Studio Terminal</p>
        </div>

        <div className="space-y-6">
          <div className="p-8 border border-border-light rounded-2xl bg-slate-50/50 text-center">
            <h2 className="text-lg font-bold text-slate-800 mb-2">Internal Access</h2>
            <p className="text-sm text-slate-500 mb-8 font-medium">Please authenticate using your company credentials.</p>
            
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white border border-border-main text-slate-700 font-bold py-4 px-6 rounded-xl hover:bg-slate-50 hover:shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <Chrome className="w-5 h-5 text-brand-primary" />
              )}
              {loading ? 'Authorizing...' : 'Sign in with Google'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-[10px] text-slate-400 font-mono leading-relaxed max-w-[240px] mx-auto uppercase tracking-wider">
              Secure Transmission Protocol // AES-256-GCM Authorized Personnel Only
            </p>
          </div>
        </div>
      </motion.div>

      {/* Footer Branding */}
      <div className="absolute bottom-8 w-full text-center">
        <span className="text-[10px] uppercase tracking-[0.5em] text-slate-300 font-bold">Protocol L-Y-01 // Digital Command</span>
      </div>
    </div>
  );
}
