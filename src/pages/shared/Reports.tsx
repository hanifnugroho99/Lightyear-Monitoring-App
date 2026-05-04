import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Search, Calendar, FileText, Target, Link as LinkIcon, Download, Filter, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { handleFirestoreError, OperationType } from '../../lib/errorHandlers';
import { DailyReport, Task } from '../../types';
import { format } from 'date-fns';
import { generateDailyReportsPDF } from '../../services/pdfService';
import { DailyReportForm } from '../../components/DailyReportForm';

export function Reports() {
  const { profile } = useAuth();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [editingReport, setEditingReport] = useState<DailyReport | null>(null);

  useEffect(() => {
    if (!profile) return;

    let reportsQuery;
    if (profile.role === 'admin') {
      reportsQuery = query(collection(db, 'daily_reports'), orderBy('timestamp', 'desc'));
    } else {
      reportsQuery = query(
        collection(db, 'daily_reports'),
        where('userId', '==', profile.uid),
        orderBy('timestamp', 'desc')
      );
    }

    const unsubReports = onSnapshot(reportsQuery, (snapshot) => {
      setReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DailyReport)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'daily_reports');
    });

    // Fetch tasks using onSnapshot for real-time availability in form
    const tasksQuery = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
    const unsubTasks = onSnapshot(tasksQuery, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    }, (error) => {
      console.error("Error fetching tasks for report:", error);
    });

    return () => {
      unsubReports();
      unsubTasks();
    };
  }, [profile]);

  const filteredReports = reports.filter(report => {
    const reportDate = report.timestamp?.toDate() || new Date();
    const reportMonth = format(reportDate, 'yyyy-MM');
    const matchesSearch = 
      report.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      report.objectiveTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.workDescription.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMonth = reportMonth === filterMonth;
    return matchesSearch && matchesMonth;
  });

  const handleDownloadReport = () => {
    generateDailyReportsPDF(filteredReports, profile?.displayName || 'System', filterMonth);
  };

  const getValidUrl = (url: string) => {
    if (!url) return '#';
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
  };

  return (
    <div className="space-y-8">
      <AnimatePresence>
        {editingReport && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <div className="min-h-full flex items-center justify-center w-full py-8">
              <DailyReportForm 
                userId={profile?.uid || ''} 
                userName={profile?.displayName || profile?.email || ''} 
                tasks={tasks}
                report={editingReport}
                onSuccess={() => setEditingReport(null)}
                onCancel={() => setEditingReport(null)}
              />
            </div>
          </div>
        )}
      </AnimatePresence>

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-800">Intelligence Briefings</h2>
          <p className="text-slate-500 italic">Historical archive of daily operation reports and deliverables.</p>
        </div>
        <button
          onClick={handleDownloadReport}
          className="btn-primary flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export Intelligence Archive
        </button>
      </header>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bento-card border-l-4 border-l-blue-500">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Monthly Reports</p>
          <p className="text-3xl font-mono font-bold text-slate-900">{filteredReports.length}</p>
        </div>
        <div className="bento-card border-l-4 border-l-brand-primary">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
          <p className="text-3xl font-mono font-bold text-slate-900 uppercase">Archive_Active</p>
        </div>
        <div className="bento-card border-l-4 border-l-slate-300">
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Protocol</p>
           <p className="text-lg font-bold text-slate-700">L-Y Standard Reporting</p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid md:grid-cols-3 gap-4 bento-card border-border-light bg-slate-50/50">
        <div className="relative col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search briefings by keyword, person, or objective..."
            className="input-field pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="month"
            className="input-field pl-10"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <div className="bento-card p-0 overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-border-main">
                <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 font-mono">Timestamp</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 font-mono">Personnel</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 font-mono">Objective</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 font-mono">Work Summary</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 font-mono text-right">Deliverable</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {filteredReports.map((report) => (
                  <motion.tr
                    key={report.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="border-b border-border-light last:border-0 hover:bg-slate-50/80 transition-colors group"
                  >
                    <td className="p-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-slate-800">{format(report.timestamp?.toDate() || new Date(), 'dd MMM yyyy')}</div>
                      <div className="text-[10px] text-slate-400 font-mono tracking-wider">{format(report.timestamp?.toDate() || new Date(), 'pp')}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-bold text-slate-700">{report.userName}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Target className="w-3 h-3 text-brand-primary" />
                        <span className="text-xs font-bold text-slate-600 truncate max-w-[150px]">{report.objectiveTitle}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-xs text-slate-500 line-clamp-2 max-w-md italic">"{report.workDescription}"</p>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {report.userId === profile?.uid && (
                          <button
                            onClick={() => setEditingReport(report)}
                            className="p-2 text-slate-400 hover:text-brand-primary hover:bg-slate-100 rounded-lg transition-all"
                            title="Edit Report"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        {report.workLink ? (
                          <a 
                            href={getValidUrl(report.workLink)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[10px] font-bold text-brand-primary hover:underline bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 shadow-sm"
                          >
                            <LinkIcon className="w-3 h-3" />
                            ACCESS_ASSET
                          </a>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-300 italic opacity-50">NO_LINK</span>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        {filteredReports.length === 0 && (
          <div className="py-24 text-center flex flex-col items-center justify-center grayscale opacity-30">
            <FileText className="w-16 h-16 mb-4" />
            <p className="font-mono text-sm uppercase tracking-widest text-slate-500">Archive Empty :: No Records Found</p>
          </div>
        )}
      </div>
    </div>
  );
}
