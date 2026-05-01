import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Users, ShieldCheck, Rocket, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Role } from '../types';

import { handleFirestoreError, OperationType } from '../lib/errorHandlers';

export function Onboarding() {
  const { currentUser } = useAuth();
  const [role, setRole] = useState<Role | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleComplete = async () => {
    if (!currentUser || !role) return;

    setSubmitting(true);
    try {
      await setDoc(doc(db, 'users', currentUser.uid), {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName || 'Anonymous User',
        photoURL: currentUser.photoURL || '',
        role: role,
        onboarded: true,
        createdAt: serverTimestamp()
      });
      navigate('/');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${currentUser.uid}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-12 py-12">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Rocket className="text-brand-primary w-8 h-8" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight">Welcome to LIGHTYEAR</h1>
        <p className="text-gray-400">Initialize your profile to join the mission.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setRole('employee')}
          className={`p-8 rounded-2xl border transition-all text-left group ${
            role === 'employee' ? 'border-brand-primary bg-brand-primary/5 ring-1 ring-brand-primary' : 'border-line bg-bg-card hover:border-gray-500'
          }`}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-colors ${
            role === 'employee' ? 'bg-brand-primary text-black' : 'bg-gray-800 text-gray-400 group-hover:text-white'
          }`}>
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold mb-2">Employee</h3>
          <p className="text-sm text-gray-500 leading-relaxed">Join as an intern or full-time member. Track your attendance, tasks, and progress.</p>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setRole('admin')}
          className={`p-8 rounded-2xl border transition-all text-left group ${
            role === 'admin' ? 'border-brand-primary bg-brand-primary/5 ring-1 ring-brand-primary' : 'border-line bg-bg-card hover:border-gray-500'
          }`}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-colors ${
            role === 'admin' ? 'bg-brand-primary text-black' : 'bg-gray-800 text-gray-400 group-hover:text-white'
          }`}>
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold mb-2">Administrator</h3>
          <p className="text-sm text-gray-500 leading-relaxed">Oversee operations. Manage employees, schedules, and monitor agency-wide progress.</p>
        </motion.button>
      </div>

      <div className="flex justify-end">
        <button
          disabled={!role || submitting}
          onClick={handleComplete}
          className="btn-primary flex items-center gap-2 px-8 py-3"
        >
          {submitting ? 'Processing...' : 'Complete Recruitment'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
