import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Clock, MapPin, CheckCircle, ArrowRight, ClipboardList, Calendar, Rocket, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, addDoc, query, where, orderBy, limit, onSnapshot, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { handleFirestoreError, OperationType } from '../../lib/errorHandlers';
import { AttendanceRecord, Task } from '../../types';
import { format } from 'date-fns';
import { CameraCapture } from '../../components/CameraCapture';
import { X, Camera as CameraIcon } from 'lucide-react';
import { DailyReportForm } from '../../components/DailyReportForm';

export function EmployeeDashboard() {
  const { profile } = useAuth();
  const [lastAttendance, setLastAttendance] = useState<AttendanceRecord | null>(null);
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [hasSubmittedReportToday, setHasSubmittedReportToday] = useState(false);

  useEffect(() => {
    if (!profile) return;

    // Get last attendance
    const attendanceQuery = query(
      collection(db, 'attendance'),
      where('userId', '==', profile.uid),
      orderBy('timestamp', 'desc'),
      limit(1)
    );

    const unsubAttendance = onSnapshot(attendanceQuery, (snapshot) => {
      if (!snapshot.empty) {
        setLastAttendance({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as AttendanceRecord);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'attendance');
    });

    // Check if report submitted today
    const checkReport = async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const reportQuery = query(
        collection(db, 'daily_reports'),
        where('userId', '==', profile.uid),
        where('date', '==', today)
      );
      const snap = await getDocs(reportQuery);
      setHasSubmittedReportToday(!snap.empty);
    };
    checkReport();

    // Get active tasks
    const tasksQuery = query(
      collection(db, 'tasks'),
      where('assignedTo', '==', profile.uid),
      where('status', '!=', 'done'),
      orderBy('createdAt', 'desc')
    );

    const unsubTasks = onSnapshot(tasksQuery, (snapshot) => {
      setActiveTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'tasks');
    });

    return () => {
      unsubAttendance();
      unsubTasks();
    };
  }, [profile]);

  const handleClockAction = async (type: 'clock-in' | 'clock-out') => {
    if (!profile) return;
    
    // For clock-in, require camera if not already captured
    if (type === 'clock-in' && !capturedPhoto) {
      setShowCamera(true);
      return;
    }

    // For clock-out, require daily report
    if (type === 'clock-out' && !hasSubmittedReportToday) {
      setShowReportForm(true);
      return;
    }

    setLoading(true);
    try {
      let geo: { latitude: number; longitude: number } | undefined;
      
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
          });
          geo = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
        } catch (geoErr: any) {
          console.warn("Geolocation denied or timed out", geoErr);
          // Don't block clock-in if geo fails, but inform user if needed
          // Or we can choose to require it. For now, let's just log it.
        }
      }

      await addDoc(collection(db, 'attendance'), {
        userId: profile.uid,
        userName: profile.displayName,
        type,
        timestamp: serverTimestamp(),
        location: geo,
        photo: capturedPhoto
      });

      setShowCamera(false);
      setCapturedPhoto(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'attendance');
    } finally {
      setLoading(false);
    }
  };

  const isClockedIn = lastAttendance?.type === 'clock-in';

  return (
    <div className="space-y-8">
      <AnimatePresence>
        {showReportForm && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto shadow-2xl">
            <div className="min-h-full flex items-center justify-center w-full py-8">
              <DailyReportForm 
                userId={profile?.uid || ''} 
                userName={profile?.displayName || ''} 
                tasks={activeTasks}
                onSuccess={() => {
                  setHasSubmittedReportToday(true);
                  setShowReportForm(false);
                }}
                onCancel={() => setShowReportForm(false)}
              />
            </div>
          </div>
        )}
      </AnimatePresence>

      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Intern Dashboard</h2>
          <p className="text-slate-500 italic">Welcome back, {profile?.displayName}. Here's your mission status.</p>
        </div>
        <div className="flex items-center gap-4 text-sm font-mono text-slate-500 bg-white p-3 rounded-xl border border-border-main shadow-sm">
          <Calendar className="w-4 h-4 text-brand-primary" />
          <span>{format(new Date(), 'EEEE, MMMM do yyyy')}</span>
        </div>
      </header>

      <div className="bento-grid">
        {/* Clock In/Out Section */}
        <div className="md:col-span-4 bento-card flex flex-col justify-between min-h-[320px] relative overflow-hidden bg-blue-600 text-white shadow-lg shadow-blue-200 border-none">
          {showCamera ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-20 bg-slate-900 p-6 flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                  <CameraIcon className="w-4 h-4" />
                  Facial Recognition
                </h3>
                <button 
                  onClick={() => setShowCamera(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 min-h-0">
                <CameraCapture 
                  isActive={showCamera} 
                  onCapture={(photo) => setCapturedPhoto(photo)} 
                />
              </div>

              {capturedPhoto && (
                <motion.button
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  onClick={() => handleClockAction('clock-in')}
                  disabled={loading}
                  className="w-full mt-4 py-3 bg-brand-primary text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2"
                >
                  {loading ? 'Transmitting...' : 'Confirm Identity & Clock In'}
                </motion.button>
              )}
            </motion.div>
          ) : (
            <>
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Clock className="w-40 h-40" style={{ color: '#473333' }} />
              </div>
              
              <div className="text-black">
                <h3 className="text-sm font-bold uppercase tracking-[0.2em] opacity-80 mb-1 text-black">Telemetry Status</h3>
                <p className="text-xs font-mono mb-8 text-black">
                   {isClockedIn ? 'TRANSMITTING :: ACTIVE' : 'STANDBY :: INACTIVE'}
                </p>
                
                <div className="text-5xl font-mono font-bold mb-2">
                  {format(new Date(), 'HH:mm')}
                </div>
                {lastAttendance && (
                   <p className="text-xs opacity-70 mb-8 font-medium text-black">
                     Last {lastAttendance.type === 'clock-in' ? 'check-in' : 'check-out'} at {format(lastAttendance.timestamp?.toDate() || new Date(), 'p')}
                   </p>
                )}
                {isClockedIn && (
                  <div className={`mt-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider ${hasSubmittedReportToday ? 'text-green-900 bg-green-500/20' : 'text-blue-900 bg-white/40'} px-3 py-1.5 rounded-full w-fit`}>
                    <FileText className="w-3 h-3" />
                    {hasSubmittedReportToday ? 'Report Submitted' : 'Daily Report Pending'}
                  </div>
                )}
              </div>

              <button
                disabled={loading}
                onClick={() => handleClockAction(isClockedIn ? 'clock-out' : 'clock-in')}
                className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-3 active:scale-95 shadow-xl ${
                  isClockedIn 
                  ? 'bg-red-500 text-white hover:bg-red-600' 
                  : 'bg-white text-blue-600 hover:bg-blue-50'
                }`}
              >
                {isClockedIn ? (
                  <>
                    <Clock className="w-5 h-5" />
                    Clock Out
                  </>
                ) : (
                  <>
                    <Rocket className="w-5 h-5" />
                    Clock In
                  </>
                )}
              </button>
            </>
          )}
        </div>

        {/* Tasks Summary */}
        <div className="md:col-span-8 bento-card flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800">
              <ClipboardList className="w-5 h-5 text-brand-primary" />
              Active Objectives
            </h3>
            <span className="badge-info">
              {activeTasks.length} PENDING
            </span>
          </div>

          <div className="flex-1 space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {activeTasks.length > 0 ? (
              activeTasks.map((task) => (
                <div key={task.id} className="p-4 bg-slate-50 border border-border-light rounded-xl flex items-center justify-between hover:border-brand-primary/30 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-1.5 h-10 bg-brand-primary/20 group-hover:bg-brand-primary rounded-full transition-all" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{task.title}</h4>
                      <p className="text-[10px] text-slate-400 font-mono tracking-wider">PROGRESS: {task.progress}%</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden hidden sm:block">
                      <div className="h-full bg-brand-primary transition-all duration-700" style={{ width: `${task.progress}%` }} />
                    </div>
                    <button className="p-2 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-border-light text-slate-400 hover:text-brand-primary">
                      <CheckCircle className="w-5 h-5 transition-transform group-hover:scale-110" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 py-12 opacity-40 grayscale">
                <ClipboardList className="w-12 h-12 mb-4" />
                <p className="font-mono text-sm uppercase tracking-widest text-center">All Objectives Secured</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
