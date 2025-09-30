import React, { useState, useEffect, useMemo } from 'react';
import { Student, LogEntry, LogCategory, BehaviorSentiment, Grade, Note } from './types';
import { INITIAL_STUDENTS, ACADEMIC_SUBJECTS } from './constants';
import { getAISuggestion, getAIStudentSummary } from './services/geminiService';
import LogEntryForm from './components/LogEntryForm';
import MultiLogEntryForm from './components/MultiLogEntryForm';
import { DocumentTextIcon, SparklesIcon, UserGroupIcon, PlusIcon, ChartPieIcon, IdentificationIcon, TrashIcon, PencilIcon, XMarkIcon, DocumentArrowDownIcon, LightBulbIcon, CheckCircleIcon, ArrowUturnLeftIcon } from './components/Icons';
import { produce } from 'immer';

type View = 'dashboard' | 'students' | 'manage_students' | 'ai_assistant' | 'reports';

const App: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [view, setView] = useState<View>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isMultiLogFormOpen, setIsMultiLogFormOpen] = useState(false);
  
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const [aiStudentSummary, setAiStudentSummary] = useState('');
  const [isAiSummaryLoading, setIsAiSummaryLoading] = useState(false);

  // Note Management State
  const [newNoteContent, setNewNoteContent] = useState('');
  const [showCompletedNotes, setShowCompletedNotes] = useState(false);


  // Student Management State
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [newStudentName, setNewStudentName] = useState('');
  const [bulkStudentNames, setBulkStudentNames] = useState('');
  const [isAddMultipleOpen, setIsAddMultipleOpen] = useState(false);

  // Export State
  const [exportStudentIds, setExportStudentIds] = useState<Set<string>>(new Set());
  const [exportStudentSearch, setExportStudentSearch] = useState('');
  const [exportDateRange, setExportDateRange] = useState<'week' | 'month' | '3month' | 'all'>('month');

  // Log filter state
  const [categoryFilter, setCategoryFilter] = useState<'all' | LogCategory>('all');
  const [detailFilter, setDetailFilter] = useState<string>('all');
  
  useEffect(() => {
    const savedStudents = localStorage.getItem('teacher_app_students');
    const savedLogs = localStorage.getItem('teacher_app_logs');
    const savedNotes = localStorage.getItem('teacher_app_notes');
    
    setStudents(savedStudents ? JSON.parse(savedStudents) : INITIAL_STUDENTS);
    setLogs(savedLogs ? JSON.parse(savedLogs) : []);
    setNotes(savedNotes ? JSON.parse(savedNotes) : []);
  }, []);

  useEffect(() => {
    if (students.length > 0 || localStorage.getItem('teacher_app_students')) {
      localStorage.setItem('teacher_app_students', JSON.stringify(students));
    }
  }, [students]);

  useEffect(() => {
    localStorage.setItem('teacher_app_logs', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem('teacher_app_notes', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    if (view === 'students' && students.length > 0 && !selectedStudent) {
      setSelectedStudent(students[0]);
    }
  }, [view, students, selectedStudent]);

  useEffect(() => {
    setDetailFilter('all');
  }, [categoryFilter, selectedStudent]);
  
  const handleAddLog = (log: Omit<LogEntry, 'id' | 'date'>) => {
    const newLog: LogEntry = {
      ...log,
      id: `log_${Date.now()}`,
      date: new Date().toISOString(),
    };
    setLogs(prevLogs => [newLog, ...prevLogs]);
  };

  const handleAddMultipleLogs = (log: Omit<LogEntry, 'id' | 'date' | 'studentId'>, studentIds: string[]) => {
      const newLogs: LogEntry[] = studentIds.map(studentId => ({
        ...log,
        studentId,
        id: `log_${Date.now()}_${studentId}`,
        date: new Date().toISOString(),
      }));
      setLogs(prevLogs => [...newLogs, ...prevLogs]);
    };
  
  const handleGetSuggestionFromLog = async (log: LogEntry) => {
    const studentForLog = students.find(s => s.id === log.studentId);
    if (!studentForLog) return;
    
    const studentLogs = logs.filter(l => l.studentId === studentForLog.id && l.id !== log.id).slice(0, 5);
    setView('ai_assistant');
    setAiResponse('');
    setIsAiLoading(true);
    const suggestion = await getAISuggestion(studentForLog, log, studentLogs);
    setAiResponse(suggestion);
    setIsAiLoading(false);
  }

  const handleGetStudentSummary = async () => {
    if(!selectedStudent) return;
    setIsAiSummaryLoading(true);
    setAiStudentSummary('');
    const summary = await getAIStudentSummary(selectedStudent, selectedStudentLogs);
    setAiStudentSummary(summary);
    setIsAiSummaryLoading(false);
  }

  const handleGetSuggestionFromPrompt = async () => {
      if(!aiPrompt.trim()) return;
      const dummyStudent: Student = { id: 'generic', name: 'một học sinh', avatar: ''};
      const dummyLog: LogEntry = { id: 'generic', studentId: 'generic', date: new Date().toISOString(), category: LogCategory.GENERAL, content: aiPrompt };
      
      setAiResponse('');
      setIsAiLoading(true);
      const suggestion = await getAISuggestion(dummyStudent, dummyLog, []);
      setAiResponse(suggestion);
      setIsAiLoading(false);
      setAiPrompt('');
  }
  
  // Note handlers
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;
    const newNote: Note = {
      id: `note_${Date.now()}`,
      content: newNoteContent.trim(),
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    setNotes(prev => [newNote, ...prev]);
    setNewNoteContent('');
  }

  const handleToggleNoteComplete = (noteId: string) => {
    setNotes(produce(draft => {
      const note = draft.find(n => n.id === noteId);
      if (note) {
        note.completedAt = note.completedAt ? null : new Date().toISOString();
      }
    }));
  }

  const handleDeleteNote = (noteId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xoá vĩnh viễn ghi chú này?')) {
      setNotes(produce(draft => {
        const index = draft.findIndex(n => n.id === noteId);
        if (index !== -1) {
          draft.splice(index, 1);
        }
      }));
    }
  }

  const handleAddStudent = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newStudentName.trim()) return;
      const newStudent: Student = {
          id: `std_${Date.now()}`,
          name: newStudentName.trim(),
          avatar: `https://picsum.photos/seed/std_${Date.now()}/100`,
      };
      setStudents(prev => [...prev, newStudent]);
      setNewStudentName('');
  }

  const handleAddMultipleStudents = () => {
    const names = bulkStudentNames.split('\n').map(name => name.trim()).filter(Boolean);
    if (names.length === 0) return;
    const newStudents: Student[] = names.map(name => ({
      id: `std_${Date.now()}_${Math.random()}`,
      name,
      avatar: `https://picsum.photos/seed/std_${Date.now()}_${name}/100`,
    }));
    setStudents(prev => [...prev, ...newStudents]);
    setBulkStudentNames('');
    setIsAddMultipleOpen(false);
  }

  const handleUpdateStudent = (studentId: string, newName: string) => {
      setStudents(produce(draft => {
          const student = draft.find(s => s.id === studentId);
          if (student) {
              student.name = newName;
          }
      }));
      setEditingStudent(null);
  }

  const handleDeleteStudent = (studentId: string) => {
      if(window.confirm('Bạn có chắc chắn muốn xoá học sinh này? Mọi dữ liệu ghi nhận liên quan cũng sẽ bị xoá vĩnh viễn.')) {
        setStudents(prev => prev.filter(s => s.id !== studentId));
        setLogs(prev => prev.filter(l => l.studentId !== studentId));
        if (selectedStudent?.id === studentId) {
            setSelectedStudent(null);
        }
      }
  }

  const handleExport = () => {
    const now = new Date();
    let startDate = new Date(0); 

    switch (exportDateRange) {
        case 'week': startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()); break;
        case 'month': startDate = new Date(now.getFullYear(), now.getMonth(), 1); break;
        case '3month': startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1); break;
        case 'all': default: break;
    }
    startDate.setHours(0,0,0,0);

    const logsToExport = logs.filter(log => exportStudentIds.has(log.studentId) && new Date(log.date) >= startDate);

    if (logsToExport.length === 0) {
        alert("Không có dữ liệu nào để xuất cho lựa chọn của bạn.");
        return;
    }
    
    const studentMap = new Map(students.map(s => [s.id, s.name]));
    const headers = ['Học sinh', 'Ngày', 'Phân loại', 'Chi tiết', 'Đánh giá', 'Nội dung'];
    const csvRows = [headers.join(',')];

    for (const log of logsToExport.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())) {
        const row = [`"${studentMap.get(log.studentId) || 'Không rõ'}"`, `"${new Date(log.date).toLocaleString('vi-VN')}"`, `"${log.category}"`, `"${log.subject || ''}"`, `"${log.grade || log.sentiment || ''}"`, `"${log.content.replace(/"/g, '""')}"`];
        csvRows.push(row.join(','));
    }

    const csvString = csvRows.join('\n');
    const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Xuat_du_lieu_ghi_nhan_${new Date().toLocaleDateString('vi-VN')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const filteredStudents = useMemo(() => students.filter(student => student.name.toLowerCase().includes(searchTerm.toLowerCase())), [students, searchTerm]);
  const selectedStudentLogs = useMemo(() => logs.filter(log => log.studentId === selectedStudent?.id), [logs, selectedStudent]);

  const filteredStudentLogs = useMemo(() => {
    if (categoryFilter === 'all') return selectedStudentLogs;
    return selectedStudentLogs.filter(log => {
      if (log.category !== categoryFilter) return false;
      if (detailFilter === 'all') return true;

      if (categoryFilter === LogCategory.BEHAVIOR) {
        return log.sentiment === detailFilter;
      }
      if (categoryFilter === LogCategory.ACADEMIC_REVIEW) {
        return log.subject === detailFilter;
      }
      return true;
    })
  }, [selectedStudentLogs, categoryFilter, detailFilter]);
  
  const behaviorStats = useMemo(() => {
    const stats: { [key in BehaviorSentiment]: number } = {
      [BehaviorSentiment.POSITIVE]: 0,
      [BehaviorSentiment.NEUTRAL]: 0,
      [BehaviorSentiment.NEEDS_IMPROVEMENT]: 0,
    };
    for (const log of logs) {
      if (log.category === LogCategory.BEHAVIOR && log.sentiment) {
        stats[log.sentiment]++;
      }
    }
    return stats;
  }, [logs]);

  const academicStats = useMemo(() => {
      const stats: { [key: string]: { [key in Grade]: number } } = {};
      for (const log of logs) {
          if (log.category === LogCategory.ACADEMIC_REVIEW && log.subject && log.grade) {
              if (!stats[log.subject]) {
                stats[log.subject] = {
                  [Grade.EXCELLENT]: 0,
                  [Grade.GOOD]: 0,
                  [Grade.COMPLETED]: 0,
                  [Grade.INCOMPLETE]: 0,
                };
              }
              stats[log.subject][log.grade]++;
          }
      }
      return stats;
  }, [logs]);
  
  const activeNotes = useMemo(() => notes.filter(n => !n.completedAt).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [notes]);
  const completedNotes = useMemo(() => notes.filter(n => n.completedAt).sort((a,b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime()), [notes]);

  const needsImprovementLeaderboard = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const log of logs) {
        if (log.category === LogCategory.BEHAVIOR && log.sentiment === BehaviorSentiment.NEEDS_IMPROVEMENT) {
            counts[log.studentId] = (counts[log.studentId] || 0) + 1;
        }
    }
    const studentMap = new Map(students.map(s => [s.id, {name: s.name, avatar: s.avatar}]));
    return Object.entries(counts).map(([studentId, count]) => {
      const studentInfo = studentMap.get(studentId) || { name: 'Học sinh đã bị xoá', avatar: ''};
      return { studentId, count, ...studentInfo };
    }).sort((a, b) => b.count - a.count);
  }, [logs, students]);

  const studentLogCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const log of logs) {
        counts[log.studentId] = (counts[log.studentId] || 0) + 1;
    }
    const studentMap = new Map(students.map(s => [s.id, {name: s.name, avatar: s.avatar}]));
    return Object.entries(counts)
      .map(([studentId, count]) => {
        const studentInfo = studentMap.get(studentId) || { name: 'Học sinh đã bị xoá', avatar: ''};
        return { studentId, count, ...studentInfo };
      })
      .sort((a, b) => b.count - a.count);
  }, [logs, students]);

  const behaviorLogTimeline = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentLogs = logs.filter(log => new Date(log.date) >= thirtyDaysAgo && log.category === LogCategory.BEHAVIOR);

    const timeline: Record<string, Record<BehaviorSentiment, number>> = {};

    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      timeline[key] = {
        [BehaviorSentiment.POSITIVE]: 0,
        [BehaviorSentiment.NEUTRAL]: 0,
        [BehaviorSentiment.NEEDS_IMPROVEMENT]: 0,
      };
    }

    for (const log of recentLogs) {
      const key = new Date(log.date).toISOString().split('T')[0];
      if (timeline[key] && log.sentiment) {
        timeline[key][log.sentiment]++;
      }
    }
    
    return Object.entries(timeline).map(([date, counts]) => ({ date, ...counts })).reverse();
  }, [logs]);

  const filteredExportStudents = useMemo(() => students.filter(s => s.name.toLowerCase().includes(exportStudentSearch.toLowerCase())), [students, exportStudentSearch]);

  const handleExportStudentSelect = (studentId: string) => { setExportStudentIds(prev => { const newSet = new Set(prev); if (newSet.has(studentId)) { newSet.delete(studentId); } else { newSet.add(studentId); } return newSet; }); };
  const handleExportSelectAll = () => { if (exportStudentIds.size === filteredExportStudents.length) { setExportStudentIds(new Set()); } else { setExportStudentIds(new Set(filteredExportStudents.map(s => s.id))); } }
  
  const getSentimentClasses = (sentiment?: BehaviorSentiment) => {
    switch (sentiment) {
      case BehaviorSentiment.POSITIVE: return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' };
      case BehaviorSentiment.NEUTRAL: return { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' };
      case BehaviorSentiment.NEEDS_IMPROVEMENT: return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' };
    }
  };
  const getGradeClasses = (grade?: Grade) => {
    switch (grade) {
        case Grade.EXCELLENT: return { bg: 'bg-blue-500', text: 'text-blue-800', name: 'Xuất sắc' };
        case Grade.GOOD: return { bg: 'bg-green-500', text: 'text-green-800', name: 'Tốt' };
        case Grade.COMPLETED: return { bg: 'bg-sky-500', text: 'text-sky-800', name: 'Hoàn thành' };
        case Grade.INCOMPLETE: return { bg: 'bg-red-500', text: 'text-red-800', name: 'Chưa hoàn thành' };
        default: return { bg: 'bg-gray-500', text: 'text-gray-800', name: 'Không xác định' };
    }
  }

  const inputClasses = "w-full px-4 py-2 border border-slate-300 bg-slate-50 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition placeholder-slate-500";


  const AcademicStatsChart = ({ stats }: { stats: { [key: string]: { [key in Grade]: number } } }) => {
    const gradeOrder = [Grade.EXCELLENT, Grade.GOOD, Grade.COMPLETED, Grade.INCOMPLETE];

    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
            <h3 className="font-semibold text-slate-800">Kết quả học tập theo môn</h3>
            <div className="mt-4 space-y-4">
                {Object.keys(stats).length > 0 ? Object.entries(stats).map(([subject, grades]) => {
                    const totalGrades = Object.values(grades).reduce((a, b) => a + b, 0);
                    return (
                        <div key={subject}>
                            <div className="flex justify-between items-center mb-1.5">
                                <h4 className="font-medium text-slate-600 text-sm">{subject}</h4>
                                <span className="text-xs font-medium text-slate-500">{totalGrades} đánh giá</span>
                            </div>
                            <div className="flex h-4 rounded-full overflow-hidden bg-slate-200">
                                {totalGrades > 0 && gradeOrder.map(grade => {
                                    const count = grades[grade] || 0;
                                    const percentage = (count / totalGrades) * 100;
                                    const classes = getGradeClasses(grade);
                                    if (percentage === 0) return null;
                                    return <div key={grade} className={classes.bg} style={{ width: `${percentage}%` }} title={`${grade}: ${count} (${percentage.toFixed(0)}%)`}></div>;
                                })}
                            </div>
                        </div>
                    );
                }) : <p className="text-slate-500 text-sm">Chưa có dữ liệu đánh giá môn học.</p>}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 justify-end mt-4">
                {gradeOrder.map(grade => {
                    const classes = getGradeClasses(grade);
                    return (<div key={grade} className="flex items-center text-xs"><div className={`w-3 h-3 rounded-sm mr-1.5 ${classes.bg}`}></div><span className="text-slate-600">{grade}</span></div>);
                })}
            </div>
        </div>
    );
  };

  const BehaviorTrendsChart = ({ data }: { data: { date: string, [BehaviorSentiment.POSITIVE]: number, [BehaviorSentiment.NEUTRAL]: number, [BehaviorSentiment.NEEDS_IMPROVEMENT]: number }[] }) => {
    const maxCount = data.reduce((max, d) => {
      const currentTotal = d[BehaviorSentiment.POSITIVE] + d[BehaviorSentiment.NEUTRAL] + d[BehaviorSentiment.NEEDS_IMPROVEMENT];
      return Math.max(max, currentTotal);
    }, 1);

    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="font-semibold text-slate-800 mb-4">Xu hướng hành vi (30 ngày qua)</h3>
        <div className="flex space-x-1 h-48 items-end">
          {data.map(day => {
            const total = day[BehaviorSentiment.POSITIVE] + day[BehaviorSentiment.NEUTRAL] + day[BehaviorSentiment.NEEDS_IMPROVEMENT];
            const posP = total > 0 ? (day[BehaviorSentiment.POSITIVE] / total) * 100 : 0;
            const neuP = total > 0 ? (day[BehaviorSentiment.NEUTRAL] / total) * 100 : 0;
            const negP = total > 0 ? (day[BehaviorSentiment.NEEDS_IMPROVEMENT] / total) * 100 : 0;
            const barHeight = (total / maxCount) * 100;

            return (
              <div key={day.date} className="flex-1 h-full flex items-end" title={`${new Date(day.date).toLocaleDateString('vi-VN')}: ${total} ghi nhận`}>
                <div className="w-full bg-slate-200 rounded-t-sm" style={{ height: `${barHeight}%` }}>
                  <div className="bg-red-400" style={{height: `${negP}%`}}></div>
                  <div className="bg-yellow-400" style={{height: `${neuP}%`}}></div>
                  <div className="bg-green-400" style={{height: `${posP}%`}}></div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex justify-center space-x-4 mt-4 text-xs">
          <div className="flex items-center"><div className="w-3 h-3 bg-green-400 rounded-sm mr-1.5"></div>Tích cực</div>
          <div className="flex items-center"><div className="w-3 h-3 bg-yellow-400 rounded-sm mr-1.5"></div>Bình thường</div>
          <div className="flex items-center"><div className="w-3 h-3 bg-red-400 rounded-sm mr-1.5"></div>Cần cải thiện</div>
        </div>
      </div>
    );
  };

  const renderMainDashboard = () => {
    const totalBehavior = Object.values(behaviorStats).reduce((a, b) => a + b, 0);
    return (
        <div className="p-6 md:p-8 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-800">Bảng điều khiển tổng quan</h1>
                 <button onClick={() => setIsMultiLogFormOpen(true)} className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition shadow-sm"> <PlusIcon className="w-5 h-5" /> <span>Thêm ghi nhận</span></button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-semibold text-slate-800">Tổng quan hành vi (Cả lớp)</h3>
                    {totalBehavior > 0 ? ( <div className="mt-4 space-y-3"> {Object.entries(behaviorStats).map(([sentiment, count]) => { const percentage = totalBehavior > 0 ? (count / totalBehavior) * 100 : 0; return ( <div key={sentiment}> <div className="flex justify-between text-sm mb-1"> <span className="font-medium text-slate-600">{sentiment}</span> <span>{count} ({percentage.toFixed(0)}%)</span> </div> <div className="w-full bg-slate-200 rounded-full h-2.5"> <div className={`${getSentimentClasses(sentiment as BehaviorSentiment).bg} h-2.5 rounded-full`} style={{ width: `${percentage}%` }}></div> </div> </div> ); })} </div> ) : <p className="text-slate-500 mt-4 text-sm">Chưa có dữ liệu hành vi.</p>}
                </div>
                <AcademicStatsChart stats={academicStats} />
            </div>
             <div className="grid grid-cols-1 gap-6 mb-6">
                <BehaviorTrendsChart data={behaviorLogTimeline} />
            </div>
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-semibold text-slate-800 mb-4">Ghi chú</h3>
                    <form onSubmit={handleAddNote} className="flex gap-2 mb-4">
                        <input
                            type="text"
                            value={newNoteContent}
                            onChange={(e) => setNewNoteContent(e.target.value)}
                            placeholder="Thêm một ghi chú mới..."
                            className={inputClasses}
                        />
                        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition disabled:bg-indigo-300" disabled={!newNoteContent.trim()}>
                            Thêm
                        </button>
                    </form>

                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                        {activeNotes.length > 0 ? activeNotes.map(note => (
                            <div key={note.id} className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 group">
                                <p className="text-sm text-slate-700">{note.content}</p>
                                <div className="flex items-center opacity-0 group-hover:opacity-100 transition">
                                    <button onClick={() => handleToggleNoteComplete(note.id)} title="Đánh dấu hoàn thành" className="text-green-500 hover:text-green-700 ml-2 flex-shrink-0 p-1">
                                        <CheckCircleIcon className="w-6 h-6" />
                                    </button>
                                     <button onClick={() => handleDeleteNote(note.id)} title="Xoá" className="text-red-500 hover:text-red-700 ml-1 flex-shrink-0 p-1">
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        )) : <p className="text-slate-500 text-sm py-4 text-center">Không có ghi chú nào.</p>}
                    </div>

                    {completedNotes.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                            <button onClick={() => setShowCompletedNotes(!showCompletedNotes)} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                                {showCompletedNotes ? 'Ẩn' : 'Xem'} {completedNotes.length} ghi chú đã hoàn thành
                            </button>
                            {showCompletedNotes && (
                                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto pr-2">
                                    {completedNotes.map(note => (
                                        <div key={note.id} className="flex items-center justify-between p-2 rounded-md bg-slate-50 group">
                                            <div>
                                                <p className="text-sm text-slate-500 line-through">{note.content}</p>
                                                <p className="text-xs text-slate-400 mt-1">Hoàn thành: {new Date(note.completedAt!).toLocaleDateString('vi-VN')}</p>
                                            </div>
                                            <div className="flex items-center">
                                                 <button onClick={() => handleToggleNoteComplete(note.id)} title="Khôi phục" className="opacity-0 group-hover:opacity-100 transition text-slate-500 hover:text-slate-700 ml-2 flex-shrink-0 p-1">
                                                    <ArrowUturnLeftIcon className="w-5 h-5" />
                                                </button>
                                                <button onClick={() => handleDeleteNote(note.id)} title="Xoá vĩnh viễn" className="opacity-0 group-hover:opacity-100 transition text-red-500 hover:text-red-700 ml-1 flex-shrink-0 p-1">
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                 </div>
                 <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                     <h3 className="font-semibold text-slate-800">Học sinh cần quan tâm</h3>
                     <ul className="mt-4 space-y-2">
                         {needsImprovementLeaderboard.length > 0 ? needsImprovementLeaderboard.map(s => (
                            <li key={s.studentId} className="flex items-center justify-between text-sm p-2 rounded-md hover:bg-slate-50">
                                <div className="flex items-center space-x-3">
                                    <img src={s.avatar} alt={s.name} className="w-8 h-8 rounded-full"/>
                                    <span className="font-medium text-slate-700">{s.name}</span>
                                </div>
                                <span className="font-bold text-red-500 bg-red-100 rounded-full px-2 py-0.5">{s.count}</span>
                            </li>
                         )) : <p className="text-slate-500 text-sm">Không có học sinh nào bị ghi nhận "Cần cải thiện".</p>}
                     </ul>
                 </div>
             </div>
        </div>
    );
  }

  const StudentBehaviorChart = ({ studentLogs, studentCount }: { studentLogs: LogEntry[], studentCount: number }) => {
    const studentStats: { [key in BehaviorSentiment]: number } = { [BehaviorSentiment.POSITIVE]: 0, [BehaviorSentiment.NEUTRAL]: 0, [BehaviorSentiment.NEEDS_IMPROVEMENT]: 0 };
    for (const log of studentLogs) {
      if(log.category === LogCategory.BEHAVIOR && log.sentiment) {
        studentStats[log.sentiment]++;
      }
    }
    
    const totalStudent = Object.values(studentStats).reduce((a, b) => a + b, 0);

    const data = Object.values(BehaviorSentiment).map(sentiment => {
        const studentPercentage = totalStudent > 0 ? (studentStats[sentiment] / totalStudent) * 100 : 0;
        const studentCountForSentiment = studentStats[sentiment];
        return { sentiment, studentPercentage, studentCountForSentiment, sentimentClasses: getSentimentClasses(sentiment) };
    });

    return (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Phân tích hành vi cá nhân</h3>
            <div className="space-y-4">
                {data.map(({ sentiment, studentPercentage, studentCountForSentiment, sentimentClasses }) => (
                    <div key={sentiment}>
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-sm font-medium text-slate-600">{sentiment}</p>
                          <span className="text-sm font-semibold">{studentCountForSentiment}</span>
                        </div>
                        <div className="flex-1 bg-slate-200 rounded-full h-3">
                            <div className={`${sentimentClasses.bg} h-3 rounded-full`} style={{ width: `${studentPercentage}%`}}></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
  };

  const renderStudentDetailView = () => (
    <>
      <div className="md:col-span-1 border-r border-slate-200 h-full flex flex-col">
        <div className="p-4 border-b border-slate-200"> <input type="text" placeholder="Tìm kiếm học sinh..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={inputClasses} /> </div>
        <div className="flex-grow overflow-y-auto">
          <ul> {filteredStudents.map(student => ( <li key={student.id}> <button onClick={() => setSelectedStudent(student)} className={`w-full text-left flex items-center p-4 space-x-4 transition-colors duration-200 ${selectedStudent?.id === student.id ? 'bg-indigo-100' : 'hover:bg-slate-100'}`}> <img src={student.avatar} alt={student.name} className="w-12 h-12 rounded-full object-cover" /> <div> <p className={`font-semibold ${selectedStudent?.id === student.id ? 'text-indigo-800' : 'text-slate-800'}`}>{student.name}</p> </div> </button> </li> ))} </ul>
        </div>
      </div>
      <div className="md:col-span-2 flex flex-col h-full bg-slate-50 overflow-y-auto">
        {selectedStudent ? (
          <>
            <div className="p-6 border-b border-slate-200 flex flex-wrap justify-between items-center gap-4 bg-white sticky top-0 z-10">
              <div> <h2 className="text-3xl font-bold text-slate-800">{selectedStudent.name}</h2> <p className="text-slate-500">Nhật ký và Ghi nhận</p> </div>
              <button onClick={() => setIsFormOpen(true)} className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition shadow-sm"> <PlusIcon className="w-5 h-5" /> <span>Thêm ghi nhận</span> </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <StudentBehaviorChart studentLogs={selectedStudentLogs} studentCount={students.length} />
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">Tổng hợp và gợi ý từ AI</h3>
                    { isAiSummaryLoading ? ( <div className="flex-grow flex items-center justify-center"><SparklesIcon className="w-8 h-8 text-indigo-500 animate-pulse"/></div> ) : 
                      aiStudentSummary ? (<div className="prose prose-sm max-w-none text-slate-800 overflow-y-auto flex-grow" dangerouslySetInnerHTML={{ __html: aiStudentSummary }}></div>) : 
                      (<div className="flex-grow flex flex-col items-center justify-center text-center"><LightBulbIcon className="w-10 h-10 text-slate-300 mb-2" /><p className="text-sm text-slate-500">Nhấn nút bên dưới để AI phân tích và đưa ra đánh giá tổng quan về học sinh.</p></div>)}
                    <button onClick={handleGetStudentSummary} disabled={isAiSummaryLoading} className="mt-4 w-full flex items-center justify-center space-x-2 px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition disabled:bg-slate-200 disabled:cursor-wait"> <SparklesIcon className="w-5 h-5" /> <span>{isAiSummaryLoading ? 'Đang phân tích...' : 'Chạy phân tích AI'}</span></button>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                  <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as LogCategory | 'all')} className="flex-1 bg-white border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:ring-indigo-500 focus:border-indigo-500">
                    <option value="all">Tất cả phân loại</option>
                    {Object.values(LogCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                  {categoryFilter === LogCategory.BEHAVIOR && (
                    <select value={detailFilter} onChange={e => setDetailFilter(e.target.value)} className="flex-1 bg-white border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:ring-indigo-500 focus:border-indigo-500">
                      <option value="all">Tất cả hành vi</option>
                      {Object.values(BehaviorSentiment).map(sent => <option key={sent} value={sent}>{sent}</option>)}
                    </select>
                  )}
                  {categoryFilter === LogCategory.ACADEMIC_REVIEW && (
                    <select value={detailFilter} onChange={e => setDetailFilter(e.target.value)} className="flex-1 bg-white border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:ring-indigo-500 focus:border-indigo-500">
                      <option value="all">Tất cả môn học</option>
                      {ACADEMIC_SUBJECTS.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                    </select>
                  )}
                </div>
                 {filteredStudentLogs.length > 0 ? filteredStudentLogs.map(log => { const sentimentClasses = getSentimentClasses(log.sentiment); return ( <div key={log.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow mb-3"> <div className="flex justify-between items-start mb-2"> <div> <span className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full ${sentimentClasses.bg} ${sentimentClasses.text}`}> {log.category} </span> {log.sentiment && <span className={`ml-2 inline-block px-2.5 py-0.5 text-xs font-medium rounded-full ${sentimentClasses.bg} ${sentimentClasses.text}`}>{log.sentiment}</span>} {log.subject && <span className={`ml-2 inline-block px-2.5 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-800`}>{log.subject}</span>} {log.grade && <span className={`ml-2 inline-block px-2.5 py-0.5 text-xs font-medium rounded-full ${getGradeClasses(log.grade).bg.replace('500','-100')} ${getGradeClasses(log.grade).text}`}>{log.grade}</span>} </div> <span className="text-sm text-slate-500">{new Date(log.date).toLocaleDateString('vi-VN')}</span> </div> <p className="text-slate-700 mb-3">{log.content}</p> <button onClick={() => handleGetSuggestionFromLog(log)} className="flex items-center text-sm text-indigo-600 hover:text-indigo-800 font-medium transition"> <SparklesIcon className="w-4 h-4 mr-1.5" /> Nhận gợi ý từ AI </button> </div> ) }) : ( <div className="text-center py-10"> <DocumentTextIcon className="mx-auto w-10 h-10 text-slate-300" /> <h3 className="mt-2 text-md font-medium text-slate-700">Không có ghi nhận phù hợp</h3> <p className="mt-1 text-sm text-slate-500">Vui lòng thử thay đổi bộ lọc hoặc thêm ghi nhận mới.</p> </div> )}
              </div>
            </div>
          </>
        ) : ( <div className="flex items-center justify-center h-full text-center text-slate-500"> <div> <UserGroupIcon className="mx-auto w-16 h-16 text-slate-300" /> <p className="mt-4 text-lg">{students.length > 0 ? 'Chọn một học sinh để xem chi tiết' : 'Hãy thêm học sinh để bắt đầu'}</p> </div> </div> )}
      </div>
    </>
  );

  const renderAIAssistantView = () => ( <div className="p-6 md:p-8 flex flex-col h-full bg-white"> <h2 className="text-3xl font-bold text-slate-800 mb-2">Trợ lý AI</h2> <p className="text-slate-500 mb-6">Nhận đề xuất và giải pháp cho các tình huống sư phạm.</p> <div className="flex-grow flex flex-col overflow-hidden"> <div className="flex-grow bg-slate-100 rounded-lg p-4 overflow-y-auto mb-4 custom-scrollbar"> {isAiLoading ? ( <div className="flex items-center justify-center h-full"> <div className="text-center"> <SparklesIcon className="w-10 h-10 text-indigo-500 animate-pulse mx-auto" /> <p className="mt-2 text-slate-600">AI đang suy nghĩ, vui lòng chờ trong giây lát...</p> </div> </div> ) : aiResponse ? ( <div className="prose prose-sm max-w-none text-slate-800" dangerouslySetInnerHTML={{ __html: aiResponse.replace(/\n/g, '<br />') }}></div> ) : ( <div className="flex items-center justify-center h-full"> <div className="text-center text-slate-500"> <p>Câu trả lời của AI sẽ xuất hiện ở đây.</p> <p className="text-sm">Bạn có thể bắt đầu bằng cách hỏi một câu hỏi hoặc chọn "Nhận gợi ý từ AI" từ một ghi nhận của học sinh.</p> </div> </div> )} </div> <div className="flex items-center space-x-3"> <textarea rows={1} value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="Mô tả tình huống hoặc đặt câu hỏi cho AI..." className="flex-grow px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none" onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGetSuggestionFromPrompt(); } }} /> <button onClick={handleGetSuggestionFromPrompt} disabled={isAiLoading || !aiPrompt.trim()} className="px-5 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition disabled:bg-indigo-300 disabled:cursor-not-allowed flex-shrink-0"> Gửi </button> </div> </div> </div> );
  const renderStudentManagement = () => ( <div className="p-6 md:p-8 overflow-y-auto"> {isAddMultipleOpen && ( <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setIsAddMultipleOpen(false)}> <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 relative animate-fade-in-up" onClick={e => e.stopPropagation()}> <button onClick={() => setIsAddMultipleOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"><XMarkIcon className="w-6 h-6" /></button> <h3 className="text-xl font-bold text-gray-800 mb-4">Thêm nhiều học sinh</h3> <p className="text-slate-500 mb-4 text-sm">Nhập tên học sinh, mỗi tên trên một dòng.</p> <textarea value={bulkStudentNames} onChange={e => setBulkStudentNames(e.target.value)} rows={8} className={inputClasses} placeholder="Nguyễn Văn A&#10;Trần Thị B&#10;Lê Minh C"></textarea> <div className="flex justify-end mt-4"> <button onClick={handleAddMultipleStudents} className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700">Thêm học sinh</button> </div> </div> </div> )} <h1 className="text-3xl font-bold text-slate-800 mb-6">Quản lý danh sách lớp</h1> <div className="grid grid-cols-1 lg:grid-cols-3 gap-8"> <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm"> <h3 className="font-semibold text-slate-800 mb-4">Danh sách học sinh ({students.length})</h3> <div className="max-h-[60vh] overflow-y-auto"> <table className="w-full text-left"> <thead className="sticky top-0 bg-slate-50"> <tr> <th className="p-3 text-sm font-semibold text-slate-600">Họ và tên</th> <th className="p-3 text-sm font-semibold text-slate-600 text-right">Hành động</th> </tr> </thead> <tbody> {students.map(student => ( <tr key={student.id} className="border-b border-slate-100"> <td className="p-3"> {editingStudent?.id === student.id ? ( <input type="text" defaultValue={student.name} autoFocus onBlur={(e) => handleUpdateStudent(student.id, e.target.value)} onKeyDown={e => {if(e.key === 'Enter') handleUpdateStudent(student.id, (e.target as HTMLInputElement).value)}} className="w-full px-2 py-1 border border-indigo-300 rounded-md"/> ) : ( <div className="flex items-center space-x-3"> <img src={student.avatar} alt={student.name} className="w-10 h-10 rounded-full object-cover"/> <span className="font-medium text-slate-700">{student.name}</span> </div> )} </td> <td className="p-3 text-right"> <button onClick={() => setEditingStudent(student)} className="p-2 text-slate-500 hover:text-indigo-600"><PencilIcon className="w-6 h-6"/></button> <button onClick={() => handleDeleteStudent(student.id)} className="p-2 text-slate-500 hover:text-red-600"><TrashIcon className="w-6 h-6"/></button> </td> </tr> ))} </tbody> </table> </div> </div> <div className="space-y-6"> <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"> <h3 className="font-semibold text-slate-800 mb-4">Thêm học sinh mới</h3> <form onSubmit={handleAddStudent} className="flex space-x-2"> <input type="text" value={newStudentName} onChange={e => setNewStudentName(e.target.value)} placeholder="Nhập tên học sinh" className={inputClasses}/> <button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700"><PlusIcon className="w-5 h-5"/></button> </form> </div> <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"> <h3 className="font-semibold text-slate-800 mb-4">Thêm hàng loạt</h3> <button onClick={() => setIsAddMultipleOpen(true)} className="w-full text-center px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition">Thêm nhiều học sinh</button> </div> </div> </div> </div> );
  
  const StudentLogDistributionChart = ({ data }: { data: { studentId: string, name: string, avatar: string, count: number }[] }) => {
    const maxCount = Math.max(...data.map(d => d.count), 0);
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="font-semibold text-slate-800 mb-4">Phân bổ ghi nhận theo học sinh</h3>
        <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
          {data.map(item => (
            <div key={item.studentId} className="grid grid-cols-4 items-center gap-2 text-sm">
              <div className="flex items-center space-x-2 col-span-1 truncate">
                <img src={item.avatar} alt={item.name} className="w-6 h-6 rounded-full"/>
                <span className="font-medium text-slate-700 truncate">{item.name}</span>
              </div>
              <div className="col-span-3 flex items-center">
                  <div className="w-full bg-slate-200 rounded-full h-4">
                    <div className="bg-indigo-500 h-4 rounded-full" style={{ width: maxCount > 0 ? `${(item.count / maxCount) * 100}%` : '0%' }}></div>
                  </div>
                  <span className="ml-3 font-semibold text-slate-600 w-8 text-right">{item.count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderReportsView = () => ( 
    <div className="p-6 md:p-8 overflow-y-auto"> 
      <h1 className="text-3xl font-bold text-slate-800 mb-6">Phân tích & Báo cáo</h1>
      <div className="grid grid-cols-1 gap-6 mb-6">
        <StudentLogDistributionChart data={studentLogCounts} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8"> 
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm"> 
          <h3 className="font-semibold text-slate-800 mb-4">1. Chọn học sinh để xuất dữ liệu ({exportStudentIds.size} đã chọn)</h3> 
          <input type="text" placeholder="Tìm kiếm học sinh..." value={exportStudentSearch} onChange={e => setExportStudentSearch(e.target.value)} className={`${inputClasses} mb-3`} /> 
          <div className="flex items-center justify-between mb-3"> <button type="button" onClick={handleExportSelectAll} className="text-sm font-medium text-indigo-600 hover:text-indigo-800"> {exportStudentIds.size === filteredExportStudents.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'} </button> </div> <div className="max-h-[45vh] overflow-y-auto border rounded-lg"> {filteredExportStudents.map(student => ( <label key={student.id} className="flex items-center p-3 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 cursor-pointer transition"> <input type="checkbox" checked={exportStudentIds.has(student.id)} onChange={() => handleExportStudentSelect(student.id)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" /> <img src={student.avatar} alt={student.name} className="w-8 h-8 rounded-full object-cover ml-4 mr-3" /> <span className="text-sm text-gray-800">{student.name}</span> </label> ))} </div> 
        </div> 
        <div className="space-y-6"> <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"> <h3 className="font-semibold text-slate-800 mb-4">2. Chọn khoảng thời gian</h3> <div className="space-y-3"> {(['week', 'month', '3month', 'all'] as const).map(range => ( <label key={range} className="flex items-center space-x-3 cursor-pointer"> <input type="radio" name="date-range" value={range} checked={exportDateRange === range} onChange={() => setExportDateRange(range)} className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500" /> <span className="text-slate-700"> {range === 'week' && 'Tuần này'} {range === 'month' && 'Tháng này'} {range === '3month' && '3 tháng qua'} {range === 'all' && 'Toàn bộ thời gian'} </span> </label> ))} </div> </div> <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"> <h3 className="font-semibold text-slate-800 mb-4">3. Tải xuống</h3> <button onClick={handleExport} disabled={exportStudentIds.size === 0} className="w-full flex items-center justify-center space-x-2 text-center px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition disabled:bg-indigo-300 disabled:cursor-not-allowed"> <DocumentArrowDownIcon className="w-5 h-5" /> <span>Xuất ra file CSV</span> </button> </div> </div> 
      </div> 
    </div> 
  );
  
  const renderContent = () => {
    switch (view) {
        case 'dashboard': return <div className="col-span-full">{renderMainDashboard()}</div>;
        case 'students': return renderStudentDetailView();
        case 'manage_students': return <div className="col-span-full">{renderStudentManagement()}</div>;
        case 'ai_assistant': return <div className="col-span-full">{renderAIAssistantView()}</div>;
        case 'reports': return <div className="col-span-full">{renderReportsView()}</div>;
        default: return null;
    }
  }

  return (
    <div className="h-screen w-screen flex font-sans antialiased text-slate-800 bg-slate-50">
      {isFormOpen && selectedStudent && <LogEntryForm student={selectedStudent} onAddLog={handleAddLog} onClose={() => setIsFormOpen(false)} />}
      {isMultiLogFormOpen && <MultiLogEntryForm students={students} onAddLogs={handleAddMultipleLogs} onClose={() => setIsMultiLogFormOpen(false)} />}
      <nav className="w-20 bg-slate-800 flex flex-col items-center py-6 space-y-4">
        <button onClick={() => setView('dashboard')} title="Bảng điều khiển" className={`p-3 rounded-xl transition ${view === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}> <ChartPieIcon className="w-6 h-6" /> </button>
        <button onClick={() => setView('students')} title="Hồ sơ học sinh" className={`p-3 rounded-xl transition ${view === 'students' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}> <UserGroupIcon className="w-6 h-6" /> </button>
        <button onClick={() => setView('manage_students')} title="Quản lý lớp" className={`p-3 rounded-xl transition ${view === 'manage_students' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}> <IdentificationIcon className="w-6 h-6" /> </button>
        <button onClick={() => setView('reports')} title="Phân tích & Báo cáo" className={`p-3 rounded-xl transition ${view === 'reports' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}> <DocumentArrowDownIcon className="w-6 h-6" /> </button>
        <button onClick={() => setView('ai_assistant')} title="Trợ lý AI" className={`p-3 rounded-xl transition ${view === 'ai_assistant' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}> <SparklesIcon className="w-6 h-6" /> </button>
      </nav>
      <main className="flex-1 grid grid-cols-1 md:grid-cols-3 h-full overflow-hidden">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;