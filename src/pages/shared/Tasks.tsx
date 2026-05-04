import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  CheckSquare, Plus, Search, Filter, Calendar, 
  MoreVertical, Edit2, Trash2, CheckCircle2, 
  Clock, AlertCircle, FileText, Users, Paperclip, X, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, query, where, orderBy, onSnapshot, 
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { handleFirestoreError, OperationType } from '../../lib/errorHandlers';
import { Task, UserProfile } from '../../types';
import { format } from 'date-fns';
import { generateTasksPDF } from '../../services/pdfService';

export function Tasks() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'todo' | 'in-progress' | 'done'>('all');

  // New/Edit Task Form
  const [newTitle, setNewTitle] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [newBriefDescription, setNewBriefDescription] = useState('');
  const [newBriefAttachments, setNewBriefAttachments] = useState<{ name: string, url: string, type: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!profile) return;

    // Get tasks based on role
    let tasksQuery;
    if (profile.role === 'admin') {
      tasksQuery = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
    } else {
      tasksQuery = query(
        collection(db, 'tasks'),
        where('assignedTo', '==', profile.uid),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubTasks = onSnapshot(tasksQuery, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'tasks');
    });

    // Get employees for dropdown
    if (profile.role === 'admin') {
      const unsubEmployees = onSnapshot(
        query(collection(db, 'users'), where('role', '==', 'employee')),
        (snapshot) => {
          setEmployees(snapshot.docs.map(doc => doc.data() as UserProfile));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, 'users');
        }
      );
      return () => {
        unsubTasks();
        unsubEmployees();
      };
    }

    return () => unsubTasks();
  }, [profile]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const MAX_TOTAL_SIZE = 800 * 1024; // 800KB total limit
    let currentTotalSize = newBriefAttachments.reduce((sum, att) => sum + (att.url.length * 0.75), 0);

    const newAttachments: { name: string, url: string, type: string }[] = [];
    
    // Process each file
    for (const file of Array.from(files)) {
      const currentFile = file as File;
      if (currentTotalSize + currentFile.size > MAX_TOTAL_SIZE) {
        alert(`File "${currentFile.name}" exceeds the remaining space (${Math.round((MAX_TOTAL_SIZE - currentTotalSize) / 1024)}KB left). Please use external links for larger files.`);
        continue;
      }

      const reader = new FileReader();
      const filePromise = new Promise<{ name: string, url: string, type: string }>((resolve) => {
        reader.onload = (event) => {
          const result = event.target?.result as string;
          resolve({
            name: currentFile.name,
            url: result,
            type: currentFile.type
          });
        };
        reader.readAsDataURL(currentFile);
      });
      
      const processedFile = await filePromise;
      newAttachments.push(processedFile);
      currentTotalSize += processedFile.url.length * 0.75;
    }
    
    setNewBriefAttachments(prev => [...prev, ...newAttachments]);
    // Reset the input so the same file can be selected again
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setNewBriefAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleEditClick = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    setEditingTask(task);
    setNewTitle(task.title);
    setNewAssignee(task.assignedTo);
    setNewDeadline(task.deadline ? format((task.deadline as any).toDate(), 'yyyy-MM-dd') : '');
    setNewBriefDescription(task.briefDescription || '');
    setNewBriefAttachments(task.briefAttachments || []);
    setShowAddModal(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || profile.role !== 'admin' || !newTitle || !newAssignee) return;

    setSubmitting(true);
    try {
      const assignee = employees.find(e => e.uid === newAssignee);
      const taskData: any = {
        title: newTitle,
        briefDescription: newBriefDescription,
        briefAttachments: newBriefAttachments,
        assignedTo: newAssignee,
        assignedToName: assignee?.displayName || 'Unknown',
        deadline: newDeadline ? Timestamp.fromDate(new Date(newDeadline)) : null,
      };

      if (editingTask) {
        await updateDoc(doc(db, 'tasks', editingTask.id!), {
          ...taskData,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, 'tasks'), {
          ...taskData,
          description: '',
          progress: 0,
          status: 'todo',
          createdAt: serverTimestamp(),
          adminId: profile.uid
        });
      }
      
      closeModal();
    } catch (error) {
      handleFirestoreError(error, editingTask ? OperationType.UPDATE : OperationType.WRITE, 'tasks');
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingTask(null);
    setNewTitle('');
    setNewAssignee('');
    setNewDeadline('');
    setNewBriefDescription('');
    setNewBriefAttachments([]);
  };

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDeleteTask = async (e: React.MouseEvent, id: string | undefined) => {
    e.stopPropagation();
    if (!id) return;
    
    if (deleteConfirmId !== id) {
      setDeleteConfirmId(id);
      // Reset after 4 seconds
      setTimeout(() => setDeleteConfirmId(null), 4000);
      return;
    }

    try {
      await deleteDoc(doc(db, 'tasks', id));
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Delete failed:', error);
      handleFirestoreError(error, OperationType.DELETE, `tasks/${id}`);
    }
  };

  const handleDownloadFile = (file: { name: string, url: string, type: string }) => {
    try {
      // For data URLs, create a temporary anchor element and trigger download
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: open in new tab (might be blocked)
      window.open(file.url, '_blank');
    }
  };

  const handleUpdateProgress = async (id: string, progress: number) => {
    const status = progress === 100 ? 'done' : progress > 0 ? 'in-progress' : 'todo';
    try {
      await updateDoc(doc(db, 'tasks', id), { progress, status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${id}`);
    }
  };

  const filteredTasks = tasks.filter(t => filterStatus === 'all' || t.status === filterStatus);

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-black flex items-center gap-3">
            <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">
              <CheckSquare className="w-6 h-6 text-brand-primary" />
            </div>
            Operations Hub
          </h2>
          <p className="text-black italic mt-1 text-sm">Strategic objective management and progress tracking.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => generateTasksPDF(filteredTasks, profile?.displayName || 'User', format(new Date(), 'MMMM yyyy'))} className="btn-secondary flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Export PDF
          </button>
          {profile?.role === 'admin' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Objective
            </button>
          )}
        </div>
      </header>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-white border border-border-main rounded-xl w-fit shadow-sm">
        {['all', 'todo', 'in-progress', 'done'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status as any)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
              filterStatus === status 
                ? 'bg-blue-50 text-brand-primary shadow-sm' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Task Grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredTasks.map((task) => (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bento-card flex flex-col justify-between group hover:border-brand-primary/30"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-bold text-slate-800 group-hover:text-brand-primary transition-colors">{task.title}</h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono mt-1">
                    {profile?.role === 'admin' ? `OWNER: ${task.assignedToName}` : 'MY_OBJECTIVE'}
                  </p>
                </div>
                <div className={
                  task.status === 'done' ? 'badge-success' : 
                  task.status === 'in-progress' ? 'badge-info' : 'badge-warning'
                }>
                  {task.status}
                </div>
              </div>

              <div className="space-y-4">
                {task.briefDescription && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 overflow-hidden">
                    <div className="max-h-24 overflow-y-auto custom-scrollbar">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          a: ({ node, ...props }) => (
                            <a 
                              {...props} 
                              className="text-brand-primary hover:underline underline-offset-2 break-all" 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              onClick={(e) => e.stopPropagation()}
                            />
                          ),
                          p: ({ node, ...props }) => <p {...props} className="text-[11px] text-slate-600 italic leading-relaxed" />
                        }}
                      >
                        {task.briefDescription}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

                {task.briefAttachments && task.briefAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {task.briefAttachments.map((file, idx) => (
                      <button 
                        key={idx}
                        onClick={() => handleDownloadFile(file)}
                        className="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-100 rounded-lg text-[9px] font-bold text-slate-500 hover:text-brand-primary hover:border-brand-primary transition-all shadow-sm cursor-pointer"
                        title={`Download ${file.name}`}
                      >
                        {file.type.startsWith('image/') ? 'IMG' : 'FILE'}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex justify-between items-end mb-1">
                   <span className="text-[10px] font-mono font-bold text-slate-400">DEPLOYMENT_PROGRESS</span>
                   <span className="text-sm font-bold text-brand-primary font-mono">{task.progress}%</span>
                </div>
                
                {profile?.role === 'employee' ? (
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="10"
                      value={task.progress}
                      onChange={(e) => handleUpdateProgress(task.id!, parseInt(e.target.value))}
                      className="flex-1 h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-brand-primary"
                    />
                    {task.status !== 'done' && (
                       <button 
                        onClick={() => handleUpdateProgress(task.id!, 100)}
                        className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-300 hover:text-green-500 transition-colors"
                       >
                         <CheckCircle2 className="w-5 h-5" />
                       </button>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-primary transition-all duration-700 shadow-sm" style={{ width: `${task.progress}%` }} />
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-border-light mt-4">
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                    <Calendar className="w-3 h-3 text-brand-primary" />
                    {task.deadline ? format(task.deadline.toDate(), 'MMM dd, yyyy') : 'NO_DEADLINE'}
                  </div>
                  <div className="flex items-center gap-2">
                    {profile?.role === 'admin' && (
                      <>
                        <button 
                          onClick={(e) => handleEditClick(e, task)}
                          className="p-1.5 hover:bg-blue-50 rounded-lg text-slate-300 hover:text-brand-primary transition-all"
                          title="Edit Objective"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => handleDeleteTask(e, task.id)}
                          className={`p-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                            deleteConfirmId === task.id 
                              ? 'bg-red-500 text-white shadow-lg px-3 scale-105' 
                              : 'hover:bg-red-50 text-slate-300 hover:text-red-500'
                          }`}
                          title={deleteConfirmId === task.id ? "Confirm Deletion" : "Delete Objective"}
                        >
                          {deleteConfirmId === task.id ? (
                            <>
                              <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
                              <span className="text-[9px] font-bold uppercase tracking-tighter">Confirm</span>
                            </>
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </>
                    )}
                    {task.status === 'done' && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-green-600 uppercase tracking-widest bg-green-50 px-2 py-0.5 rounded-full">
                         <CheckSquare className="w-3 h-3" />
                         SECURED
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
              onClick={closeModal} 
            />
            <motion.form
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onSubmit={handleSaveTask}
              className="w-full max-w-2xl bg-white border border-border-main rounded-2xl p-8 z-10 shadow-2xl space-y-6 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 -z-0" />
              
              <div className="relative z-10">
                <h3 className="text-xl font-bold text-slate-800 mb-2">
                  {editingTask ? 'Reconfigure Objective' : 'Initiate New Objective'}
                </h3>
                <p className="text-sm text-slate-500 mb-6 font-mono uppercase tracking-widest text-[10px]">
                  {editingTask ? 'Target Adjustment Protocol' : 'Strategic Assignment Module'}
                </p>
                
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <FileText className="w-3 h-3" />
                        Protocol Title
                      </label>
                      <input 
                        type="text" 
                        className="input-field" 
                        placeholder="e.g., Q2 Brand Identity Draft" 
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <Users className="w-3 h-3" />
                        Assigned Personnel
                      </label>
                      <select 
                        className="input-field"
                        value={newAssignee}
                        onChange={(e) => setNewAssignee(e.target.value)}
                        required
                      >
                        <option value="">Select Personnel...</option>
                        {employees.map(emp => (
                          <option key={emp.uid} value={emp.uid}>{emp.displayName}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        Terminal Deadline
                      </label>
                      <input 
                        type="date" 
                        className="input-field"
                        value={newDeadline}
                        onChange={(e) => setNewDeadline(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <Edit2 className="w-3 h-3" />
                        Objective Brief (Links Supported)
                      </label>
                      <textarea 
                        className="input-field min-h-[100px] resize-none" 
                        placeholder="Provide detailed instructions..." 
                        value={newBriefDescription}
                        onChange={(e) => setNewBriefDescription(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <Paperclip className="w-3 h-3" />
                        Supporting Assets
                      </label>
                      <div className="relative group">
                        <input 
                          type="file" 
                          multiple 
                          accept="image/*,.pdf,.doc,.docx"
                          onChange={handleFileChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="p-4 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50 group-hover:bg-slate-100 transition-colors flex flex-col items-center justify-center text-center">
                          <Plus className="w-6 h-6 text-slate-300 mb-2" />
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Select Files</p>
                          <p className="text-[8px] text-slate-400 mt-1 font-mono tracking-tighter">MAX_TOTAL_ATTACHMENTS: 800KB</p>
                        </div>
                      </div>
                      
                      {newBriefAttachments.length > 0 && (
                        <div className="space-y-2 mt-3 max-h-[100px] overflow-y-auto pr-2 custom-scrollbar">
                          {newBriefAttachments.map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-100 rounded-lg group">
                              <span className="text-[10px] font-mono text-slate-500 truncate max-w-[150px]">{file.name}</span>
                              <button 
                                type="button" 
                                onClick={() => removeAttachment(idx)}
                                className="text-slate-300 hover:text-red-500 transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 mt-10">
                  <button 
                    type="button" 
                    onClick={closeModal}
                    className="flex-1 btn-secondary"
                  >
                    Abort
                  </button>
                  <button 
                    type="submit"
                    disabled={submitting}
                    className="flex-1 btn-primary"
                  >
                    {submitting ? 'Transmitting...' : (editingTask ? 'Update Objective' : 'Launch Task')}
                  </button>
                </div>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
