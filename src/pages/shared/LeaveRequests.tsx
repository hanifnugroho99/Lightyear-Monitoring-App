import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Calendar, Send, Clock, CheckCircle, XCircle, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp } from 'firebase/firestore';
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
      q = query(collection(db, 'leave_requests'));
    } else {
      q = query(collection(db, 'leave_requests'), where('userId', '==', profile.uid));
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
        userName: profile.displayName,
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setShowForm(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'leave_requests');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Time-Off Requests</h2>
          <p className="text-gray-400 italic">Manage leaves and mission absences.</p>
        </div>
        {profile?.role === 'employee' && (
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Request
          </button>
        )}
      </header>

      {showForm && (
        <motion.form 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          onSubmit={handleSubmit}
          className="p-8 glass-morphism rounded-2xl space-y-6"
        >
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-mono text-gray-500 uppercase tracking-widest">Type</label>
              <select className="input-field" value={type} onChange={(e) => setType(e.target.value as any)}>
                <option value="vacation">Vacation</option>
                <option value="sick">Sick Leave</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-mono text-gray-500 uppercase tracking-widest">Start Date</label>
              <input type="date" className="input-field" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-mono text-gray-500 uppercase tracking-widest">End Date</label>
              <input type="date" className="input-field" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-mono text-gray-500 uppercase tracking-widest">Reason</label>
            <textarea className="input-field min-h-[100px]" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Provide context..." required />
          </div>
          <div className="flex gap-4">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1">{submitting ? 'Sending...' : 'Submit Request'}</button>
          </div>
        </motion.form>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {requests.map((req) => (
          <div key={req.id} className="p-6 glass-morphism rounded-2xl border border-line space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold flex items-center gap-2">
                  {req.userName}
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-line rounded text-brand-primary uppercase">{req.type}</span>
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  {format(req.startDate.toDate(), 'PPP')} - {format(req.endDate.toDate(), 'PPP')}
                </p>
              </div>
              <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${
                req.status === 'pending' ? 'bg-orange-500/10 text-orange-500' :
                req.status === 'approved' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
              }`}>
                {req.status}
              </div>
            </div>
            <p className="text-sm text-gray-300 italic">"{req.reason}"</p>
          </div>
        ))}
      </div>
    </div>
  );
}

