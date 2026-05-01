export type Role = 'admin' | 'employee';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: Role | null;
  photoURL: string;
  createdAt: any;
  onboarded: boolean;
}

export interface AttendanceRecord {
  id?: string;
  userId: string;
  userName: string;
  type: 'clock-in' | 'clock-out';
  timestamp: any;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  photo?: string;
}

export interface Task {
  id?: string;
  title: string;
  description: string;
  assignedTo: string;
  assignedToName: string;
  progress: number;
  status: 'todo' | 'in-progress' | 'done';
  deadline: any;
  createdAt: any;
  adminId: string;
}

export interface LeaveRequest {
  id?: string;
  userId: string;
  userName: string;
  type: 'sick' | 'vacation' | 'other';
  startDate: any;
  endDate: any;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
}

export interface WhitelistEntry {
  email: string;
  role: Role;
}
