import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Clock, Download, Filter, Search, MapPin, Calendar, FileText, Rocket, Target, Link as LinkIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { handleFirestoreError, OperationType } from '../../lib/errorHandlers';
import { AttendanceRecord, DailyReport } from '../../types';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { generateAttendancePDF, generateDailyReportsPDF } from '../../services/pdfService';

export function Attendance() {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<AttendanceRecord[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [activeTab, setActiveTab] = useState<'attendance' | 'reports'>('attendance');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'));

  useEffect(() => {
    if (!profile) return;

    // Attendance Query
    let attendanceQuery;
    if (profile.role === 'admin') {
      attendanceQuery = query(collection(db, 'attendance'), orderBy('timestamp', 'desc'));
    } else {
      attendanceQuery = query(
        collection(db, 'attendance'),
        where('userId', '==', profile.uid),
        orderBy('timestamp', 'desc')
      );
    }

    const unsubAttendance = onSnapshot(attendanceQuery, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'attendance');
    });

    // Daily Reports Query
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

    return () => {
      unsubAttendance();
      unsubReports();
    };
  }, [profile]);

  const filteredLogs = logs.filter(log => {
    const logDate = log.timestamp?.toDate() || new Date();
    const logMonth = format(logDate, 'yyyy-MM');
    const matchesSearch = log.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          log.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMonth = logMonth === filterMonth;
    return matchesSearch && matchesMonth;
  });

  const filteredReports = reports.filter(report => {
    const reportDate = report.timestamp?.toDate() || new Date();
    const reportMonth = format(reportDate, 'yyyy-MM');
    const matchesSearch = report.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          report.objectiveTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          report.workDescription.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMonth = reportMonth === filterMonth;
    return matchesSearch && matchesMonth;
  });

  const handleDownloadReport = () => {
    if (activeTab === 'attendance') {
      generateAttendancePDF(filteredLogs, profile?.displayName || 'System', filterMonth);
    } else {
      generateDailyReportsPDF(filteredReports, profile?.displayName || 'System', filterMonth);
    }
  };

  const getValidUrl = (url: string) => {
    if (!url) return '#';
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-800">Mission Intelligence</h2>
          <p className="text-slate-500 italic">Temporal tracking and operational progress reports.</p>
        </div>
        <button
          onClick={handleDownloadReport}
          className="btn-primary flex items-center gap-2"
        >
          <FileText className="w-4 h-4" />
          Export {activeTab === 'attendance' ? 'Attendance' : 'Reports'}
        </button>
      </header>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${
            activeTab === 'attendance' 
            ? 'bg-white text-brand-primary shadow-sm' 
            : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Attendance Logs
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${
            activeTab === 'reports' 
            ? 'bg-white text-brand-primary shadow-sm' 
            : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Daily Reports
        </button>
      </div>

      {/* Filters */}
      <div className="grid md:grid-cols-3 gap-4 bento-card border-border-light bg-slate-50/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search signals..."
            className="input-field pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="month"
            className="input-field pl-10"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 px-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Filter className="w-4 h-4 text-brand-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Telemetry Filter</span>
            <span className="text-xs font-mono font-bold text-slate-600">
              {activeTab === 'attendance' ? filteredLogs.length : filteredReports.length} DATA_POINTS FOUND
            </span>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bento-card p-0 overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          {activeTab === 'attendance' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-border-main">
                  <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Timestamp</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Personnel</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 text-center">Visual ID</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Status</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 text-right">Geolocation</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {filteredLogs.map((log) => (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="border-b border-border-light last:border-0 hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="p-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-slate-800">{format(log.timestamp?.toDate() || new Date(), 'dd MMM yyyy')}</div>
                        <div className="text-[10px] text-slate-400 font-mono tracking-wider">{format(log.timestamp?.toDate() || new Date(), 'pp')}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-bold text-slate-700">{log.userName}</div>
                      </td>
                      <td className="p-4 flex justify-center">
                        {log.photo ? (
                          <div className="w-10 h-10 rounded-lg overflow-hidden border border-border-light bg-slate-100 shadow-sm transition-transform hover:scale-150 cursor-zoom-in">
                            <img src={log.photo} alt="ID" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-50 border border-border-light flex items-center justify-center">
                             <Rocket className="w-4 h-4 text-slate-200" />
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={log.type === 'clock-in' ? 'badge-success' : 'badge-warning'}>
                          {log.type}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {log.location ? (
                          <div className="flex flex-col items-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                             <MapPin className="w-4 h-4 text-brand-primary mb-1" />
                             <span className="text-[10px] font-mono leading-none bg-white p-1 rounded border border-border-light shadow-sm">
                               {log.location.latitude.toFixed(4)}N, {log.location.longitude.toFixed(4)}E
                             </span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-300">SIGNAL_LOST</span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-border-main">
                  <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Timestamp</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Report By</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Objective</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Work Description</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 text-right">Deliverable</th>
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
                        <p className="text-xs text-slate-500 line-clamp-2 max-w-md">{report.workDescription}</p>
                      </td>
                      <td className="p-4 text-right">
                        {report.workLink ? (
                          <a 
                            href={getValidUrl(report.workLink)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[10px] font-bold text-brand-primary hover:underline bg-blue-50 px-2 py-1 rounded border border-blue-100"
                          >
                            <LinkIcon className="w-3 h-3" />
                            VIEW_ASSET
                          </a>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-300 italic">NO_LINK_ATTACHED</span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          )}
        </div>
        {((activeTab === 'attendance' && filteredLogs.length === 0) || (activeTab === 'reports' && filteredReports.length === 0)) && (
          <div className="py-24 text-center flex flex-col items-center justify-center grayscale opacity-30">
            {activeTab === 'attendance' ? <Clock className="w-16 h-16 mb-4" /> : <FileText className="w-16 h-16 mb-4" />}
            <p className="font-mono text-sm uppercase tracking-widest">No Intelligence Recorded</p>
          </div>
        )}
      </div>
    </div>
  );
}
