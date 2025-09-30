import React, { useState } from 'react';
import { Student, LogEntry, LogCategory, BehaviorSentiment, Grade } from '../types';
import { XMarkIcon } from './Icons';
import { ACADEMIC_SUBJECTS } from '../constants';

interface LogEntryFormProps {
  student: Student;
  onAddLog: (log: Omit<LogEntry, 'id' | 'date'>) => void;
  onClose: () => void;
}

const LogEntryForm: React.FC<LogEntryFormProps> = ({ student, onAddLog, onClose }) => {
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<LogCategory>(LogCategory.BEHAVIOR);
  const [sentiment, setSentiment] = useState<BehaviorSentiment | undefined>(undefined);
  const [subject, setSubject] = useState<string>(ACADEMIC_SUBJECTS[0]);
  const [grade, setGrade] = useState<Grade>(Grade.COMPLETED);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim() === '') return;
    
    let logData: Omit<LogEntry, 'id' | 'date'> = {
        studentId: student.id,
        content: content.trim(),
        category,
    };

    if (category === LogCategory.BEHAVIOR) {
        logData.sentiment = sentiment;
    } else if (category === LogCategory.ACADEMIC_REVIEW) {
        logData.subject = subject;
        logData.grade = grade;
    }

    onAddLog(logData);
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 relative animate-fade-in-up">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition">
          <XMarkIcon className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Thêm ghi nhận mới</h2>
        <p className="text-gray-500 mb-6">Dành cho học sinh: <span className="font-semibold text-indigo-600">{student.name}</span></p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">Phân loại</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as LogCategory)}
              className={inputClasses}
            >
              {Object.values(LogCategory).map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {category === LogCategory.BEHAVIOR && (
            <div className="animate-fade-in">
              <label className="block text-sm font-medium text-gray-700 mb-2">Đánh giá hành vi</label>
              <div className="flex items-center space-x-2">
                <button type="button" onClick={() => setSentiment(BehaviorSentiment.POSITIVE)} className={getSentimentButtonClass(BehaviorSentiment.POSITIVE)}>Tích cực</button>
                <button type="button" onClick={() => setSentiment(BehaviorSentiment.NEUTRAL)} className={getSentimentButtonClass(BehaviorSentiment.NEUTRAL)}>Bình thường</button>
                <button type="button" onClick={() => setSentiment(BehaviorSentiment.NEEDS_IMPROVEMENT)} className={getSentimentButtonClass(BehaviorSentiment.NEEDS_IMPROVEMENT)}>Cần cải thiện</button>
              </div>
            </div>
          )}
          
          {category === LogCategory.ACADEMIC_REVIEW && (
              <div className="grid grid-cols-2 gap-4 animate-fade-in">
                  <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">Môn học</label>
                      <select id="subject" value={subject} onChange={e => setSubject(e.target.value)} className={inputClasses}>
                          {ACADEMIC_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                  </div>
                   <div>
                      <label htmlFor="grade" className="block text-sm font-medium text-gray-700 mb-2">Mức độ</label>
                      <select id="grade" value={grade} onChange={e => setGrade(e.target.value as Grade)} className={inputClasses}>
                          {Object.values(Grade).map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                  </div>
              </div>
          )}

          <div className="relative">
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">Nội dung ghi nhận</label>
            <textarea
              id="content"
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Ví dụ: Em An đã giúp bạn Bình sắp xếp lại sách vở..."
              className={inputClasses}
              required
              autoComplete="off"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition"
            >
              Lưu ghi nhận
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LogEntryForm;