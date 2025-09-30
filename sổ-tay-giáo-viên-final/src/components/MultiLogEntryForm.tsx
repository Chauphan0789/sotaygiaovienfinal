import React, { useState, useMemo } from 'react';
import { Student, LogEntry, LogCategory, BehaviorSentiment, Grade } from '../types';
import { XMarkIcon } from './Icons';
import { ACADEMIC_SUBJECTS } from '../constants';

interface MultiLogEntryFormProps {
  students: Student[];
  onAddLogs: (log: Omit<LogEntry, 'id' | 'date' | 'studentId'>, studentIds: string[]) => void;
  onClose: () => void;
}

const MultiLogEntryForm: React.FC<MultiLogEntryFormProps> = ({ students, onAddLogs, onClose }) => {
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<LogCategory>(LogCategory.BEHAVIOR);
  const [sentiment, setSentiment] = useState<BehaviorSentiment | undefined>(undefined);
  const [subject, setSubject] = useState<string>(ACADEMIC_SUBJECTS[0]);
  const [grade, setGrade] = useState<Grade>(Grade.COMPLETED);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [studentSearch, setStudentSearch] = useState('');

  const filteredStudents = useMemo(() => students.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase())), [students, studentSearch]);
  const selectedStudents = useMemo(() => students.filter(s => selectedStudentIds.has(s.id)), [students, selectedStudentIds]);

  const handleStudentSelect = (studentId: string) => { setSelectedStudentIds(prev => { const newSet = new Set(prev); if (newSet.has(studentId)) { newSet.delete(studentId); } else { newSet.add(studentId); } return newSet; }); };
  const handleSelectAll = () => { if (selectedStudentIds.size === filteredStudents.length) { setSelectedStudentIds(new Set()); } else { setSelectedStudentIds(new Set(filteredStudents.map(s => s.id))); } }
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim() === '' || selectedStudentIds.size === 0) {
        if(selectedStudentIds.size === 0) alert('Vui lòng chọn ít nhất một học sinh.');
        return;
    }
    
    let logData: Omit<LogEntry, 'id' | 'date' | 'studentId'> = { content: content.trim(), category };

    if (category === LogCategory.BEHAVIOR) { logData.sentiment = sentiment; } 
    else if (category === LogCategory.ACADEMIC_REVIEW) { logData.subject = subject; logData.grade = grade; }

    onAddLogs(logData, Array.from(selectedStudentIds));
    onClose();
  };

  const getSentimentButtonClass = (s: BehaviorSentiment) => {
      const base = "px-3 py-1.5 text-sm rounded-full border transition-all duration-200";
      if (sentiment === s) {
        switch(s) {
            case BehaviorSentiment.POSITIVE: return `${base} bg-green-500 text-white border-green-500`;
            case BehaviorSentiment.NEEDS_IMPROVEMENT: return `${base} bg-red-500 text-white border-red-500`;
            case BehaviorSentiment.NEUTRAL: return `${base} bg-yellow-500 text-white border-yellow-500`;
        }
      }
      return `${base} bg-white text-gray-600 border-gray-300 hover:bg-gray-100`;
  }

  const inputClasses = "w-full px-3 py-2 border border-slate-300 bg-slate-50 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition placeholder-slate-500";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 relative animate-fade-in-up flex flex-col max-h-[90vh]">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"> <XMarkIcon className="w-6 h-6" /> </button>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Thêm ghi nhận hàng loạt</h2>
        {selectedStudentIds.size > 0 ? ( <div className="flex items-center space-x-3 mb-6 h-8"> <div className="flex -space-x-2 overflow-hidden"> {selectedStudents.slice(0, 5).map(s => ( <img key={s.id} src={s.avatar} alt={s.name} title={s.name} className="inline-block h-8 w-8 rounded-full ring-2 ring-white" /> ))} </div> <p className="text-gray-500 text-sm"> {selectedStudentIds.size} học sinh đã chọn {selectedStudentIds.size > 5 && ` (+${selectedStudentIds.size - 5} nữa)`} </p> </div> ) : ( <p className="text-gray-500 mb-6 h-8 flex items-center">Chọn học sinh để áp dụng ghi nhận.</p> )}

        <form onSubmit={handleSubmit} className="flex-grow flex flex-col md:flex-row gap-6 overflow-hidden">
          <div className="w-full md:w-1/3 flex flex-col border-r md:pr-6">
            <h3 className="font-semibold text-gray-700 mb-2">Chọn học sinh</h3>
            <input type="text" placeholder="Tìm kiếm..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)} className={`${inputClasses} mb-2`} />
            <div className="flex items-center justify-between mb-2"> <button type="button" onClick={handleSelectAll} className="text-sm font-medium text-indigo-600 hover:text-indigo-800"> {selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0 ? 'Bỏ chọn tất cả' : 'Chọn tất cả'} </button> </div>
            <div className="flex-grow overflow-y-auto space-y-2 pr-2 -mr-2">
              {filteredStudents.map(student => (
                <label key={student.id} className="flex items-center p-2 rounded-lg hover:bg-slate-100 cursor-pointer transition">
                  <input type="checkbox" checked={selectedStudentIds.has(student.id)} onChange={() => handleStudentSelect(student.id)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                  <img src={student.avatar} alt={student.name} className="w-8 h-8 rounded-full object-cover ml-3 mr-2" />
                  <span className="text-sm text-gray-700">{student.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="w-full md:w-2/3 flex flex-col">
              <div className="flex-grow overflow-y-auto pr-2 -mr-2 space-y-4">
                  <div> <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">Phân loại</label> <select id="category" value={category} onChange={(e) => setCategory(e.target.value as LogCategory)} className={inputClasses}> {Object.values(LogCategory).map((cat) => ( <option key={cat} value={cat}>{cat}</option> ))} </select> </div>
                  {category === LogCategory.BEHAVIOR && ( <div className="animate-fade-in"> <label className="block text-sm font-medium text-gray-700 mb-2">Đánh giá hành vi</label> <div className="flex items-center space-x-2"> <button type="button" onClick={() => setSentiment(BehaviorSentiment.POSITIVE)} className={getSentimentButtonClass(BehaviorSentiment.POSITIVE)}>Tích cực</button> <button type="button" onClick={() => setSentiment(BehaviorSentiment.NEUTRAL)} className={getSentimentButtonClass(BehaviorSentiment.NEUTRAL)}>Bình thường</button> <button type="button" onClick={() => setSentiment(BehaviorSentiment.NEEDS_IMPROVEMENT)} className={getSentimentButtonClass(BehaviorSentiment.NEEDS_IMPROVEMENT)}>Cần cải thiện</button> </div> </div> )}
                  {category === LogCategory.ACADEMIC_REVIEW && ( <div className="grid grid-cols-2 gap-4 animate-fade-in"> <div> <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">Môn học</label> <select id="subject" value={subject} onChange={e => setSubject(e.target.value)} className={inputClasses}> {ACADEMIC_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)} </select> </div> <div> <label htmlFor="grade" className="block text-sm font-medium text-gray-700 mb-2">Mức độ</label> <select id="grade" value={grade} onChange={e => setGrade(e.target.value as Grade)} className={inputClasses}> {Object.values(Grade).map(g => <option key={g} value={g}>{g}</option>)} </select> </div> </div> )}
                  <div className="relative"> <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">Nội dung ghi nhận</label> <textarea id="content" rows={4} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Ví dụ: Cả lớp đã hoàn thành tốt bài tập nhóm..." className={inputClasses} required autoComplete="off" />
                  </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t mt-4">
                <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition"> Hủy </button>
                <button type="submit" className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition disabled:bg-indigo-300" disabled={selectedStudentIds.size === 0}> Lưu ghi nhận </button>
              </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MultiLogEntryForm;