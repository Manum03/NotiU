
import {
  ScheduleBlock,
  Subject,
  SubjectStatus,
  SubjectPriority,
  SubjectReminder,
  ActivityType,
} from "./subject.model";

export interface CreateSubjectDto {
  name: string;
  code: string;
  credits: number;
  semester: number;
  teacher?: string;
  color?: string;
  schedule?: ScheduleBlock[];
  status?: SubjectStatus;
  priority?: SubjectPriority;
  description?: string;
  dueDate?: string | null;
  dueTime?: string | null;
  activityType?: ActivityType | null;
  reminder?: SubjectReminder;
  notes?: string;
  progress?: number;
}

export type SubjectResponseDto = Omit<
  Subject,
  "userId" | "createdAt"
>;

export interface CreateSubjectResponseDto {
  message: string;
  subject: SubjectResponseDto;
}

export interface ListSubjectsFilters {
  semester?: number;
  status?: SubjectStatus;
  priority?: SubjectPriority;
  search?: string;
}

export interface SubjectListItemDto {
  id: string;
  name: string;
  code: string;
  credits: number;
  semester: number;
  status: SubjectStatus;
  priority: SubjectPriority;
  teacher: string;
  color: string;
  currentAverage: number;
  progress: number;
  dueDate: string | null;
  dueTime: string | null;
  activityType: ActivityType | null;
  reminder: SubjectReminder;
}

export interface ListSubjectsResponseDto {
  data: SubjectListItemDto[];
  total: number;
}

export interface GradesSummaryDto {
  count: number;
  totalWeight: number;
  weightedAverage: number;
}

export interface SubjectDetailDto extends SubjectResponseDto {
  room: string;
  gradesSummary: GradesSummaryDto;
}

export interface UpdateSubjectDto {
  name?: string;
  code?: string;
  credits?: number;
  semester?: number;
  teacher?: string;
  color?: string;
  schedule?: ScheduleBlock[];
  status?: SubjectStatus;
  priority?: SubjectPriority;
  description?: string;
  dueDate?: string | null;
  dueTime?: string | null;
  activityType?: ActivityType | null;
  reminder?: SubjectReminder;
  notes?: string;
  progress?: number;
}

export interface UpdateSubjectResponseDto {
  message: string;
  subject: SubjectResponseDto;
}

export interface ScheduleSessionDto {
  day: ScheduleBlock["day"];
  startTime: string;
  endTime: string;
  room: string;
}

export interface SubjectScheduleDto {
  subjectId: string;
  subjectName: string;
  sessions: ScheduleSessionDto[];
}
