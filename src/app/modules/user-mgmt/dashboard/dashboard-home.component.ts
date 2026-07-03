import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { DataService } from '../../../core/services/data.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './dashboard-home.component.html',
  styleUrls: ['./dashboard-home.component.css']
})
export class DashboardHomeComponent implements OnInit {
  metrics: any = null;
  loading = false;
  role = '';
  currentUserId = '';
  currentUserObj: any = null;

  // Heatmap data for SA (Booking vs Doctor)
  heatmapDoctors = ['Dr. Priya Sharma', 'Dr. Rajesh Kumar', 'Dr. Vikram Singh', 'Dr. Kavita Reddy', 'Dr. Amit Verma'];
  heatmapDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  heatmapData = [
    [12, 5, 8, 3, 14, 0, 2], // Dr. Priya
    [4, 15, 6, 9, 2, 1, 0],  // Dr. Rajesh
    [8, 7, 12, 4, 10, 3, 1], // Dr. Vikram
    [2, 3, 9, 11, 5, 0, 0],  // Dr. Kavita
    [10, 12, 4, 8, 15, 2, 4] // Dr. Amit
  ];

  // Dummy lists for Backoffice dashboard
  mockPatients = [
    { id: 'PAT-001', name: 'Sanjay Kumar', email: 'sanjay.k@gmail.com', phone: '+91 9845012345', status: 'Active' },
    { id: 'PAT-002', name: 'Aarav Mehta', email: 'aarav.m@outlook.com', phone: '+91 9123456780', status: 'Active' },
    { id: 'PAT-003', name: 'Neha Deshmukh', email: 'neha.d@yahoo.com', phone: '+91 8877665544', status: 'Pending Review' },
    { id: 'PAT-004', name: 'Ananya Iyer', email: 'ananya.iyer@gmail.com', phone: '+91 7654321098', status: 'Inactive' }
  ];

  mockDoctors = [
    { id: 'DOC-101', name: 'Dr. Priya Sharma', specialty: 'Cardiology', status: 'Verified' },
    { id: 'DOC-102', name: 'Dr. Rajesh Kumar', specialty: 'Neurology', status: 'Verified' },
    { id: 'DOC-103', name: 'Dr. Vikram Singh', specialty: 'Pediatrics', status: 'Pending Verification' },
    { id: 'DOC-104', name: 'Dr. Kavita Reddy', specialty: 'Oncology', status: 'Verified' }
  ];

  doctorVerifications = [
    { id: 'VER-01', name: 'Dr. Vikram Singh', specialty: 'Pediatrics', submittedAt: '2026-06-17', status: 'Pending' },
    { id: 'VER-02', name: 'Dr. Amit Verma', specialty: 'Dermatology', submittedAt: '2026-06-18', status: 'Pending' },
    { id: 'VER-03', name: 'Dr. Shalini Gupta', specialty: 'General Medicine', submittedAt: '2026-06-16', status: 'Pending' }
  ];

  // Dummy lists for Doctor dashboard
  doctorMeetings = [
    { patient: 'Sanjay Kumar', time: '10:00 AM', type: 'Consultation', status: 'Upcoming' },
    { patient: 'Aarav Mehta', time: '11:30 AM', type: 'Follow-up', status: 'Completed' },
    { patient: 'Neha Deshmukh', time: '02:00 PM', type: 'Case Review', status: 'Upcoming' }
  ];

  doctorReviews = [
    { caseId: 'CASE-732', patient: 'Neha Deshmukh', priority: 'High', daysOpen: 2 },
    { caseId: 'CASE-740', patient: 'Rahul Verma', priority: 'Medium', daysOpen: 5 }
  ];

  // Dummy lists for Patient dashboard
  patientMeetings = [
    { doctor: 'Dr. Priya Sharma', time: '10:00 AM', date: 'Today', type: 'Cardiology consultation' },
    { doctor: 'Dr. Rajesh Kumar', time: '04:00 PM', date: 'Next Tuesday', type: 'Routine check-up' }
  ];

  patientCases = [
    { caseId: 'CASE-820', type: 'Second Opinion', status: 'Under Review', doctor: 'Dr. Priya Sharma' },
    { caseId: 'CASE-810', type: 'Cardiac Assessment', status: 'Advice Ready', doctor: 'Dr. Rajesh Kumar' }
  ];

  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private dataService = inject(DataService);

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    this.currentUserObj = currentUser;
    this.role = currentUser?.role_name || '';
    this.currentUserId = currentUser?.id || currentUser?._id || '';

    this.fetchMetrics();
  }

  fetchMetrics(): void {
    this.loading = true;

    if (this.role === 'Doctor') {
      this.metrics = {
        total_patients: 42,
        pending_case_reviews: 8,
        today_meetings: 6,
        upcoming_meetings: 19
      };
    } else if (this.role === 'Patient' || this.role === 'User') {
      this.metrics = {
        total_patients: 1,
        pending_case_reviews: 2,
        today_meetings: 1,
        upcoming_meetings: 3
      };
    } else if (this.role === 'Backoffice User') {
      this.metrics = {
        unallocated_cases: 14,
        today_appointments: 28,
        upcoming_appointments: 143,
        pending_verifications: this.doctorVerifications.filter(v => v.status === 'Pending').length
      };
    } else {
      // Superadmin (SA) / Administrator dashboard
      this.metrics = {
        total_users: 1412,
        active_users: 1248,
        invited_users: 114,
        suspended_users: 50,
        active_sessions: 15,
        total_groups: 12,
        blocked_ips: 4,
        total_patients: 1248,
        total_cases: 3842,
        total_doctors: 156,
        recent_activities: [
          { created_at: new Date().toISOString(), user_email: 'superadmin@system.com', action: 'Update Super Admin Navigation Seeds', ip_address: '127.0.0.1' },
          { created_at: new Date(Date.now() - 600000).toISOString(), user_email: 'admin@acme.com', action: 'MFA Verification Complete', ip_address: '192.168.1.45' },
          { created_at: new Date(Date.now() - 3600000).toISOString(), user_email: 'doctor@hospital.com', action: 'Submit Case Advice for CASE-732', ip_address: '10.0.0.12' }
        ]
      };
    }
    this.loading = false;
  }

  getHeatmapColor(val: number): string {
    if (val === 0) return 'rgba(255, 255, 255, 0.05)';
    if (val < 4) return 'rgba(20, 184, 166, 0.2)';
    if (val < 8) return 'rgba(20, 184, 166, 0.4)';
    if (val < 12) return 'rgba(20, 184, 166, 0.7)';
    return 'rgba(20, 184, 166, 0.95)';
  }

  verifyDoctor(verId: string, action: 'Approve' | 'Reject'): void {
    const item = this.doctorVerifications.find(v => v.id === verId);
    if (item) {
      item.status = action === 'Approve' ? 'Approved' : 'Rejected';
      if (this.metrics && this.role === 'Backoffice User') {
        this.metrics.pending_verifications = this.doctorVerifications.filter(v => v.status === 'Pending').length;
      }
    }
  }
}
