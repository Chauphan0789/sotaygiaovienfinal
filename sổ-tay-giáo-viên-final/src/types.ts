export enum Grade {
  EXCELLENT = 'Hoàn thành xuất sắc',
  GOOD = 'Hoàn thành tốt',
  COMPLETED = 'Hoàn thành',
  INCOMPLETE = 'Chưa hoàn thành',
}

export enum LogCategory {
  BEHAVIOR = 'Hành vi',
  ACADEMIC_NOTE = 'Ghi chú Học tập',
  ACADEMIC_REVIEW = 'Đánh giá Môn học',
  GENERAL = 'Chung',
}

export enum BehaviorSentiment {
  POSITIVE = 'Tích cực',
  NEUTRAL = 'Bình thường',
  NEEDS_IMPROVEMENT = 'Cần cải thiện',
}

export interface LogEntry {
  id: string;
  studentId: string;
  date: string;
  category: LogCategory;
  sentiment?: BehaviorSentiment;
  subject?: string;
  grade?: Grade;
  content: string;
}

export interface Student {
  id: string;
  name: string;
  avatar: string;
}

export interface Note {
  id: string;
  content: string;
  createdAt: string;
  completedAt: string | null;
}