import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { Rocket } from 'lucide-react';

export function Dashboard() {
  const { profile, loading, currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!currentUser) {
        navigate('/login');
        return;
      }

      if (!profile || !profile.role) {
        navigate('/onboarding');
        return;
      }

      if (profile.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/employee');
      }
    }
  }, [profile, loading, currentUser, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
        className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full mb-4"
      />
      <div className="flex items-center gap-2">
        <Rocket className="w-5 h-5 text-brand-primary animate-bounce" />
        <span className="font-mono text-sm uppercase tracking-widest text-gray-500">Initializing Dashboard...</span>
      </div>
    </div>
  );
}
