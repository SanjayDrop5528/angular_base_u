import { Component, Input, OnInit, OnChanges, SimpleChanges, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DataService } from '../../../../core/services/data.service';
import { forkJoin, of } from 'rxjs';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-patient-details-view',
  standalone: true,
  imports: [CommonModule, MatIconModule, TranslateModule],
  templateUrl: './patient-details-view.component.html',
  styleUrls: ['./patient-details-view.component.css']
})
export class PatientDetailsViewComponent implements OnInit, OnChanges {
  @Input() patient: any = null;
  @Input() case: any = null;
  /** The full onboardingModel — contains has_medication, has_allergy, has_insurance, has_surgery flags */
  @Input() model: any = null;
  @Input() hideHeader: boolean = false;

  private dataService = inject(DataService);
  private cdr = inject(ChangeDetectorRef);
  private translateService = inject(TranslateService);

  resolvedPatient: any = null;
  resolvedMedications: any[] = [];
  resolvedAllergies: any[] = [];
  resolvedSurgicalHistory: any[] = [];
  resolvedInsurance: any = null;
  resolvedInsurances: any[] = [];
  resolvedCases: any[] = [];
  resolvedPlanName: string = '';
  previewImageUrl: string = '';

  loading = false;
  activeMobileSection: string = 'medications';

  // ── Section visibility: only show if the patient said YES and real data exists ──
  get showMedications(): boolean {
    const flag = this.model?.has_medication;
    const allowed = flag === undefined || flag === null || flag === true || flag === 'Yes' || flag === 'yes';
    return allowed && this.resolvedMedications.length > 0;
  }

  get showAllergies(): boolean {
    const flag = this.model?.has_allergy;
    const allowed = flag === undefined || flag === null || flag === true || flag === 'Yes' || flag === 'yes';
    return allowed && this.resolvedAllergies.length > 0;
  }

  get showSurgicalHistory(): boolean {
    const flag = this.model?.has_surgery;
    const allowed = flag === undefined || flag === null || flag === true || flag === 'Yes' || flag === 'yes';
    return allowed && this.resolvedSurgicalHistory.length > 0;
  }

  get showInsurance(): boolean {
    return this.resolvedInsurances.some(ins => {
      if (!ins) return false;
      return !!(
        (ins.insurance_provider && String(ins.insurance_provider).trim() !== '') ||
        (ins.policy_number && String(ins.policy_number).trim() !== '') ||
        (ins.coverage_type && String(ins.coverage_type).trim() !== '') ||
        (ins.coverage_amount && String(ins.coverage_amount).trim() !== '')
      );
    });
  }


  isDoctor = false;

  ngOnInit(): void {
    this.checkUserRole();
    this.resolveData();
  }

  private checkUserRole(): void {
    try {
      const userStr = localStorage.getItem('current_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        this.isDoctor = user?.role_name?.toLowerCase() === 'doctor';
      }
    } catch (e) {
      console.warn('Failed to parse current_user from localStorage', e);
      this.isDoctor = false;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['patient'] && !changes['patient'].isFirstChange()) ||
        (changes['case'] && !changes['case'].isFirstChange())) {
      this.resolveData();
    }
  }

  resolveData(): void {
    // 1. Resolve Patient
    let patientObj = this.patient;
    if (!patientObj && this.case) {
      patientObj = this.case.patientInfo || this.case.patient;
    }

    if (typeof patientObj === 'string' && patientObj) {
      // It's an ID, load it
      this.loadPatientDataById(patientObj);
    } else if (patientObj && typeof patientObj === 'object') {
      this.resolvedPatient = patientObj;
      this.resolveSubCollections();
    } else if (this.case && this.case.patient_id) {
      this.loadPatientDataById(this.case.patient_id);
    } else {
      // Use fallback mock patient
      this.useMockPatient();
    }

    // 2. Resolve case medical records (reports)
  }

  loadPatientDataById(patientId: string): void {
    this.loading = true;
    this.dataService.getMethodApi(`entities/api/patients/${patientId}`).subscribe({
      next: (res: any) => {
        console.log('=== loadPatientDataById single API res ===', JSON.stringify(res));

        const d = res?.data || res;
        const pat = d?.patient || d?.personal || d;

        if (pat) {
          this.resolvedPatient = {
            ...pat,
            fullName: pat.patient_name || pat.name || 'Anonymous Patient'
          };
        } else {
          this.useMockPatient();
        }

        this.resolvedAllergies = Array.isArray(d?.allergies) ? d.allergies : [];
        console.log('=== resolvedAllergies ===', this.resolvedAllergies);

        this.resolvedMedications = Array.isArray(d?.medications) ? d.medications : [];
        console.log('=== resolvedMedications ===', this.resolvedMedications);

        this.resolvedSurgicalHistory = Array.isArray(d?.surgical_history) ? d.surgical_history : [];
        console.log('=== resolvedSurgicalHistory ===', this.resolvedSurgicalHistory);

        const insList = Array.isArray(d?.insurances) ? d.insurances : [];
        if (insList.length > 0) {
          this.resolvedInsurances = insList.slice().sort((a: any, b: any) => {
            const dateA = a.created_on ? new Date(a.created_on).getTime() : 0;
            const dateB = b.created_on ? new Date(b.created_on).getTime() : 0;
            return dateB - dateA;
          });
          this.resolvedInsurance = this.resolvedInsurances[0];
        } else {
          this.resolvedInsurances = [];
          this.resolvedInsurance = null;
        }
        console.log('=== resolvedInsurances ===', this.resolvedInsurances);

        let casesList = Array.isArray(d?.cases) ? d.cases
          : Array.isArray(d?.data?.cases) ? d.data.cases
          : [];

        const records = Array.isArray(d?.case_medical_records) ? d.case_medical_records : [];
        const assignments = Array.isArray(d?.case_assignments) ? d.case_assignments : [];
        const aiAnalysis = Array.isArray(d?.case_ai_analysis) ? d.case_ai_analysis : [];

        this.resolvedCases = casesList.map((c: any) => ({
          ...c,
          medicalRecords: records.filter((r: any) => r.case_id === c.id),
          assignments: assignments.filter((a: any) => a.case_id === c.id),
          aiAnalysis: aiAnalysis.find((a: any) => a.case_id === c.id)
        }));

        // Pick the latest case that has a plan_id and look up the plan name
        const caseWithPlan = casesList.find((c: any) => c.plan_id);
        if (caseWithPlan?.plan_id) {
          this.dataService.getDataByFilter('subscription_plans', {
            start: 0, end: 1,
            filter: [{ clause: 'AND', conditions: [{ column: 'id', operator: 'EQUALS', type: 'string', value: caseWithPlan.plan_id }] }]
          }).subscribe({
            next: (planRes: any) => {
              const plan =
                planRes?.data?.[0]?.response?.[0] ||
                planRes?.data?.[0] ||
                planRes?.data ||
                planRes;
              this.resolvedPlanName = plan?.name || plan?.plan_name || '';
              this.cdr.detectChanges();
            },
            error: () => { this.resolvedPlanName = ''; }
          });
        } else {
          this.resolvedPlanName = '';
        }

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Failed to load patient data in view component:', err);
        this.loading = false;
        this.useMockPatient();
        this.cdr.detectChanges();
      }
    });
  }

  resolveSubCollections(): void {
    // Check if subcollections are already attached
    const patient = this.resolvedPatient;
    
    // Medications
    if (this.case && Array.isArray(this.case.medications)) {
      this.resolvedMedications = this.case.medications;
    } else if (patient && Array.isArray(patient.medications)) {
      this.resolvedMedications = patient.medications;
    } else {
      this.resolvedMedications = [];
    }

    // Allergies
    if (this.case && Array.isArray(this.case.allergies)) {
      this.resolvedAllergies = this.case.allergies;
    } else if (patient && Array.isArray(patient.allergies)) {
      this.resolvedAllergies = patient.allergies;
    } else {
      this.resolvedAllergies = [];
    }

    // Insurance — show all insurances
    let insList: any[] = [];
    if (this.case && Array.isArray(this.case.insurances) && this.case.insurances.length > 0) {
      insList = this.case.insurances;
    } else if (this.case && this.case.insurance) {
      insList = [this.case.insurance];
    } else if (patient && Array.isArray(patient.insurances) && patient.insurances.length > 0) {
      insList = patient.insurances;
    } else if (patient && patient.insurance) {
      insList = [patient.insurance];
    }
    if (insList.length > 0) {
      this.resolvedInsurances = insList.slice().sort((a: any, b: any) => {
        const dateA = a.created_on ? new Date(a.created_on).getTime() : 0;
        const dateB = b.created_on ? new Date(b.created_on).getTime() : 0;
        return dateB - dateA; // descending: latest first
      });
      this.resolvedInsurance = this.resolvedInsurances[0];
    } else {
      this.resolvedInsurances = [];
      this.resolvedInsurance = null;
    }

    // Surgical History
    if (this.case && Array.isArray(this.case.surgical_history)) {
      this.resolvedSurgicalHistory = this.case.surgical_history;
    } else if (patient && Array.isArray(patient.surgical_history)) {
      this.resolvedSurgicalHistory = patient.surgical_history;
    } else if (patient && Array.isArray(patient.PatientSurgicalHistory)) {
      this.resolvedSurgicalHistory = patient.PatientSurgicalHistory;
    } else {
      this.resolvedSurgicalHistory = [];
    }

  }

  useMockPatient(): void {
    this.resolvedPatient = {
      patient_name: 'Sarah Jenkins',
      patient_no: 'P-98234',
      date_of_birth: '1990-05-14',
      gender: 'female',
      blood_group: 'O+',
      marital_status: 'married',
      height_cm: 165,
      weight_kg: 62,
      email: 's.jenkins@example.com',
      phone: '+1 (555) 982-3401',
      address: '1428 Maple View Terrace',
      city: 'Austin',
      state: 'TX',
      country: 'United States',
      zipcode: '78704'
    };
    this.resolvedMedications = [];
    this.resolvedAllergies = [];
    this.resolvedSurgicalHistory = [];
    this.resolvedInsurance = null;
    this.resolvedInsurances = [];
  }

getProfilePhotoUrl(): string {
  if (!this.resolvedPatient) return '';

  const photo = this.resolvedPatient.profile_image || this.resolvedPatient.profile_photo;

  if (!photo) {
    console.log('No profile photo found');
    return '';
  }

  if (typeof photo === 'string') {
    const baseUrl = environment.ImageBaseUrl || '';
    const prefix = baseUrl.endsWith('/') ? baseUrl : (baseUrl + '/');
    const imageUrl = photo.startsWith('http') ? photo : `${prefix}${photo}`;

    console.log('Profile Image URL:', imageUrl);

    return imageUrl;
  }

  if (typeof photo === 'object') {
    const imageUrl = photo.file_url || photo.url || photo.path || '';

    console.log('Profile Image URL:', imageUrl);
    console.log('Profile Image Object:', photo);

    return imageUrl;
  }

  return '';
}

  getPatientInitials(): string {
    const name = this.resolvedPatient?.patient_name || this.resolvedPatient?.name || '—';
    console.log('resolvedPatient', this.resolvedPatient);
    const parts = name.trim().split(' ');
    if (parts.length === 0 || name === '—') return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  getPatientAge(): string {
    const dob = this.resolvedPatient?.date_of_birth;
    if (!dob) return '—';
    try {
      const birthDate = new Date(dob);
      if (isNaN(birthDate.getTime())) return dob;
      const today = new Date();
      let years = today.getFullYear() - birthDate.getFullYear();
      let months = today.getMonth() - birthDate.getMonth();
      if (today.getDate() < birthDate.getDate()) {
        months--;
      }
      if (months < 0) {
        years--;
        months += 12;
      }
      if (years < 0) return '—';

      return `${years}.${months}`;
    } catch {
      return '—';
    }
  }

  getPatientBMI(): string {
    const weight = this.resolvedPatient?.weight_kg || this.resolvedPatient?.weight;
    const height = this.resolvedPatient?.height_cm || this.resolvedPatient?.height;
    if (weight && height) {
      const heightInMeters = height / 100;
      const bmi = weight / (heightInMeters * heightInMeters);
      return bmi.toFixed(1);
    }
    return '—';
  }

  getBMIClass(): string {
    const bmiVal = parseFloat(this.getPatientBMI());
    if (isNaN(bmiVal)) return '';
    if (bmiVal < 18.5) return 'bmi-underweight';
    if (bmiVal >= 18.5 && bmiVal < 25) return 'bmi-normal';
    if (bmiVal >= 25 && bmiVal < 30) return 'bmi-overweight';
    return 'bmi-obese';
  }

  formatDate(dateStr: any): string {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  formatFrequency(freq: string): string {
    if (!freq) return '—';
    switch (freq.toLowerCase()) {
      case 'once_daily': return this.translateService.instant('PATIENT_DETAILS.FREQ_ONCE_DAILY');
      case 'twice_daily': return this.translateService.instant('PATIENT_DETAILS.FREQ_TWICE_DAILY');
      case 'thrice_daily': return this.translateService.instant('PATIENT_DETAILS.FREQ_THRICE_DAILY');
      case 'as_needed': return this.translateService.instant('PATIENT_DETAILS.FREQ_AS_NEEDED');
      case 'weekly': return this.translateService.instant('PATIENT_DETAILS.FREQ_WEEKLY');
      default: return freq;
    }
  }

  formatDuration(dur: string): string {
    if (!dur) return '—';
    switch (dur.toLowerCase()) {
      case '15_days': return this.translateService.instant('PATIENT_DETAILS.DUR_15_DAYS');
      case '1_month': return this.translateService.instant('PATIENT_DETAILS.DUR_1_MONTH');
      case '2_months': return this.translateService.instant('PATIENT_DETAILS.DUR_2_MONTHS');
      case '3_months': return this.translateService.instant('PATIENT_DETAILS.DUR_3_MONTHS');
      case '6_months': return this.translateService.instant('PATIENT_DETAILS.DUR_6_MONTHS');
      case '1_year': return this.translateService.instant('PATIENT_DETAILS.DUR_1_YEAR');
      case 'more_than_1_year': return this.translateService.instant('PATIENT_DETAILS.DUR_ONGOING');
      default: return dur;
    }
  }

  formatAllergyType(type: string): string {
    if (!type) return '—';
    const key = 'PATIENT_DETAILS.ALLERGY_TYPE_' + type.toUpperCase();
    const translated = this.translateService.instant(key);
    if (translated !== key) return translated;
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  formatAllergyReaction(reaction: string): string {
    if (!reaction) return this.translateService.instant('PATIENT_DETAILS.REACTION_MILD');
    const key = 'PATIENT_DETAILS.REACTION_' + reaction.toUpperCase().replace(/\s+/g, '_');
    const translated = this.translateService.instant(key);
    if (translated !== key) return translated;
    return reaction;
  }

  getReactionText(alg: any): string {
    const rx = (alg.reaction_label || alg.reaction || '').trim();
    const rxLower = rx.toLowerCase();
    if ((rxLower === 'other' || rxLower === 'unknown') && alg.notes && alg.notes.trim() !== '') {
      return alg.notes;
    }
    return alg.reaction_label || this.formatAllergyReaction(alg.reaction);
  }

  getAllergyReactionClass(reaction: string): string {
    const r = (reaction || '').toLowerCase();
    if (r.includes('rash') || r.includes('hives') || r.includes('swelling') || r.includes('anaphylaxis') || r.includes('difficulty breathing')) {
      return 'badge-critical';
    }
    return 'badge-warning';
  }

  getAllergySeverityClass(severity: string): string {
    const s = (severity || '').toLowerCase();
    if (s.includes('critical') || s.includes('life threatening') || s.includes('high') || s.includes('severe')) {
      return 'pill-danger';
    }
    if (s.includes('moderate') || s.includes('medium')) {
      return 'pill-warning';
    }
    if (s.includes('mild') || s.includes('low')) {
      return 'pill-info';
    }
    return 'pill-neutral';
  }

  openImagePreview(url: string): void {
    this.previewImageUrl = url;
  }

  getInsuranceValue(key: string): string {
    return this.resolvedInsurance?.[key] || '—';
  }

  getInsuranceProvider(): string {
    return this.resolvedInsurance?.insurance_provider || '—';
  }

  getInsurancePolicyNo(): string {
    return this.resolvedInsurance?.policy_number || '—';
  }
}
