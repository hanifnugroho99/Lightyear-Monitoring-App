import React, { useState, useEffect } from 'react';
import { Task, DailyReport } from '../types';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';
import { FileText, Link as LinkIcon, Target, Send, X, Rocket, Edit3 } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';

interface DailyReportFormProps {
  userId: string;
  userName: string;
  tasks: Task[];
  report?: DailyReport; // Optional report for editing
  onSuccess: () => void;
  onCancel: () => void;
}

export function DailyReportForm({ userId, userName, tasks, report, onSuccess, onCancel }: DailyReportFormProps) {
  const [description, setDescription] = useState(report?.workDescription || '');
  const [link, setLink] = useState(report?.workLink || '');
  const [selectedTaskId, setSelectedTaskId] = useState(report?.objectiveId || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (report) {
      setDescription(report.workDescription);
      setLink(report.workLink || '');
      setSelectedTaskId(report.objectiveId);
    }
  }, [report]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !selectedTaskId) return;

    setLoading(true);
    try {
      const selectedTask = tasks.find(t => t.id === selectedTaskId);
      
      const sanitizedLink = link.trim() && !/^https?:\/\//i.test(link.trim()) 
        ? `https://${link.trim()}` 
        : link.trim();

      const reportData: Partial<DailyReport> = {
        userId,
        userName,
        workDescription: description,
        workLink: sanitizedLink,
        objectiveId: selectedTaskId,
        objectiveTitle: selectedTask?.title || 'Unknown Objective',
        timestamp: serverTimestamp(),
      };

      if (report?.id) {
        // Update existing report
        await updateDoc(doc(db, 'daily_reports', report.id), reportData);
      } else {
        // Create new report
        reportData.date = format(new Date(), 'yyyy-MM-dd');
        await addDoc(collection(db, 'daily_reports'), reportData as DailyReport);
      }
      
      onSuccess();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'daily_reports');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-3xl p-8 shadow-2xl border border-slate-100 max-w-2xl w-full mx-auto"
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-primary/10 text-brand-primary rounded-2xl flex items-center justify-center">
            {report ? <Edit3 className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              {report ? 'Update Operational Briefing' : 'Daily Mission Report'}
            </h2>
            <p className="text-xs text-slate-400 font-mono uppercase tracking-[0.2em] mt-0.5">
              {report ? 'Modification protocol :: authorized' : 'Transmission protocol :: required'}
            </p>
          </div>
        </div>
        <button 
          onClick={onCancel}
          className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Active Objective
          </label>
          <select
            required
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-slate-700 font-medium focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all appearance-none cursor-pointer"
          >
            <option value="">{tasks.length > 0 ? 'Select current objective...' : 'No active objectives found'}</option>
            {tasks.map(task => (
              <option key={task.id} value={task.id} className="py-2">
                {task.title} {task.status === 'done' ? '(Completed)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Work Description
          </label>
          <textarea
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Document your achievements today..."
            className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-slate-700 font-medium focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all resize-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <LinkIcon className="w-4 h-4" />
            Deliverable Link (Optional)
          </label>
          <input
            type="text"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://github.com/..."
            className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-slate-700 font-medium focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-primary text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-600 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Rocket className="w-5 h-5 animate-bounce" />
              {report ? 'Updating...' : 'Transmitting...'}
            </span>
          ) : (
            <>
              {report ? <Edit3 className="w-5 h-5" /> : <Send className="w-5 h-5" />}
              {report ? 'Update Intelligence' : 'Finalize Report & Upload'}
            </>
          )}
        </button>
      </form>
    </motion.div>
  );
}
