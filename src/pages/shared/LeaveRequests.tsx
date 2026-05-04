import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Calendar, Send, Clock, CheckCircle, XCircle, Plus, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, updateDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { handleFirestoreError, OperationType } from '../../lib/errorHandlers';
import { LeaveRequest } from '../../types';
import { format } from 'date-fns';

export function LeaveRequests() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  
  // Form State
  const [type, setType] = useState<'sick' | 'vacation' | 'other'>('vacation');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!profile) return;
    
    let q;
    if (profile.role === 'admin') {
      q = query(collection(db, 'leave_requests'), orderBy('createdAt', 'desc'));
    } else {
      q = query(
        collection(db, 'leave_requests'), 
        where('userId', '==', profile.uid),
        orderBy('createdAt', 'desc')
      );
    }

    const unsub = onSnapshot(q, (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeaveRequest)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'leave_requests');
    });

    return () => unsub();
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSubmitting(true);

    try {
      await addDoc(collection(db, 'leave_requests'), {
        userId: profile.uid,
        userName: profile.displayName || profile.email,
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setShowForm(false);
      // Reset form
      setStartDate('');
      setEndDate('');
      setReason('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'leave_requests');
    } finally {
      setSubmitting(false);
    }
  };

  const updateRequestStatus = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'leave_requests', requestId), {
        status,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `leave_requests/${requestId}`);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-800">Operational Absences</h2>
          <p className="text-slate-500 italic">Manage leave requests and mission stand-downs.</p>
        </div>
        {profile?.role === 'employee' && !showForm && (
          <button 
            onClick={() => setShowForm(true)} 
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            File New Request
          </button>
        )}
      </header>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bento-card border-brand-primary/20 bg-brand-primary/5"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                  <Plus className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Absence Request Protocol</h3>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-mono text-slate-500 uppercase tracking-widest">Absence Type</label>
                  <select 
                    className="input-field" 
                    value={type} 
                    onChange={(e) => setType(e.target.value as any)}
                  >
                    <option value="vacation">Vacation</option>
                    <option value="sick">Medical Stand-down</option>
                    <option value="other">Other Operational Need</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-mono text-slate-500 uppercase tracking-widest">Start Rotation</label>
                  <input 
                    type="date" 
                    className="input-field" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-mono text-slate-500 uppercase tracking-widest">End Rotation</label>
                  <input 
                    type="date" 
                    className="input-field" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)} 
                    required 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono text-slate-500 uppercase tracking-widest">Mission Context / Reason</label>
                <textarea 
                  className="input-field min-h-[100px]" 
                  value={reason} 
                  onChange={(e) => setReason(e.target.value)} 
                  placeholder="Provide detailed justification for absence..." 
                  required 
                />
              </div>
              <div className="flex gap-4 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowForm(false)} 
                  className="btn-secondary flex-1"
                >
                  Abort Request
                </button>
                <button 
                  type="submit" 
                  disabled={submitting} 
                  className="btn-primary flex-1"
                >
                  {submitting ? 'Transmitting...' : 'Authorize Submission'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnimatePresence mode="popLayout">
          {requests.map((req) => (
            <motion.div 
              layout
              key={req.id} 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`p-6 bento-card transition-all ${
                req.status === 'pending' ? 'border-orange-200' : 
                req.status === 'approved' ? 'border-green-200' : 'border-red-200'
              }`}
            >
              <div className="flex justify-between items-start gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    req.type === 'sick' ? 'bg-indigo-50 text-indigo-500' :
                    req.type === 'vacation' ? 'bg-sky-50 text-sky-500' : 'bg-slate-50 text-slate-500'
                  }`}>
                    {req.type === 'sick' ? <AlertCircle className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                      {req.userName}
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 rounded text-slate-600 uppercase tracking-wider">
                        {req.type === 'sick' ? 'Medical' : req.type}
                      </span>
                    </h4>
                    <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mt-0.5">
                      {(() => {
                        try {
                          const start = req.startDate?.toDate ? req.startDate.toDate() : new Date(req.startDate);
                          const end = req.endDate?.toDate ? req.endDate.toDate() : new Date(req.endDate);
                          return `${format(start, 'dd MMM')} → ${format(end, 'dd MMM yyyy')}`;
                        } catch (e) {
                          return 'Invalid Date Protocol';
                        }
                      })()}
                    </div>
                  </div>
                </div>
                
                <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.1em] border ${
                  req.status === 'pending' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                  req.status === 'approved' ? 'bg-green-50 text-green-600 border-green-100' : 
                  'bg-red-50 text-red-600 border-red-100'
                }`}>
                  {req.status}
                </div>
              </div>

              <div className="bg-slate-50/50 p-4 rounded-xl mb-4 border border-slate-100">
                <p className="text-sm text-slate-600 italic leading-relaxed">
                   "{req.reason}"
                </p>
              </div>

              {profile?.role === 'admin' && req.status === 'pending' && (
                <div className="flex gap-3 mt-4 border-t border-slate-100 pt-4">
                  <button 
                    onClick={() => updateRequestStatus(req.id, 'approved')}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500 text-white font-bold text-xs hover:bg-green-600 transition-colors shadow-sm"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve Request
                  </button>
                  <button 
                    onClick={() => updateRequestStatus(req.id, 'rejected')}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white border border-red-200 text-red-600 font-bold text-xs hover:bg-red-50 transition-colors shadow-sm"
                  >
                    <XCircle className="w-4 h-4" />
                    Deny Request
                  </button>
                </div>
              )}

              {req.status !== 'pending' && (
                <div className="text-[10px] font-mono text-slate-400 text-right uppercase tracking-[0.2em] pt-2">
                  Status protocol locked
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {requests.length === 0 && (
          <div className="col-span-full py-24 text-center grayscale opacity-30 flex flex-col items-center">
             <Calendar className="w-16 h-16 mb-4 text-slate-400" />
             <p className="font-mono text-sm uppercase tracking-widest text-slate-500">No mission absences logged in archive</p>
          </div>
        )}
      </div>
    </div>
  );
}

