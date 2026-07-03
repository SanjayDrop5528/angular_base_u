import { Injectable } from '@angular/core';
import { BaseService } from '../../../core/services/base.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class IamService extends BaseService {

  login(body: any): Observable<any> {
    return this.post('/user/api/auth/login', body);
  }

  ssoLogin(email: string): Observable<any> {
    return this.post('/user/api/auth/sso/login', { email });
  }

  firebaseSSO(email: string, name?: string): Observable<any> {
    let url = `/user/api/auth/firebase-sso?email=${encodeURIComponent(email)}`;
    if (name) {
      url += `&name=${encodeURIComponent(name)}`;
    }
    return this.get(url);
  }

  registerSSO(payload: any): Observable<any> {
    return this.post('/user/api/auth/register-sso', payload);
  }

  // registerPatient(name: string, email: string, mobile: string): Observable<any> {
  //   return this.post('/user/api/auth/register-sso', {
  //     name,
  //     email,
  //     mobile,
  //     entity_type: 'Patient'
  //   });
  // }

  getOnboardingDraft(email: string): Observable<any> {
    return this.get(`/user/api/auth/onboarding/draft?email=${encodeURIComponent(email)}`);
  }

  saveOnboardingIdentity(email: string, identityData: any): Observable<any> {
    return this.post('/user/api/auth/onboarding/identity', { email, identity_data: identityData });
  }

  saveOnboardingQualifications(email: string, qualificationsData: any): Observable<any> {
    return this.post('/user/api/auth/onboarding/qualifications', { email, qualifications_data: qualificationsData });
  }

  saveOnboardingExperience(email: string, experienceData: any): Observable<any> {
    return this.post('/user/api/auth/onboarding/experience', { email, experience_data: experienceData });
  }

  saveOnboardingDocuments(email: string, documentsData: any): Observable<any> {
    return this.post('/user/api/auth/onboarding/documents', { email, documents_data: documentsData });
  }

  submitOnboarding(email: string): Observable<any> {
    return this.post('/user/api/auth/onboarding/submit', { email });
  }

  mfaVerify(body: any): Observable<any> {
    return this.post('/user/api/auth/mfa-verify', body);
  }
  register(body: any): Observable<any> {
    return this.post('/user/api/auth/register', body);
  }

  registerPatient(name: string, email: string, mobile: string): Observable<any> {
    return this.post('/user/api/auth/register-patient', { name, email, mobile });
  }

  resetPassword(body: any): Observable<any> {
    return this.post('/user/api/auth/reset-password', body);
  }

  changePassword(body: any): Observable<any> {
    return this.post('/user/api/auth/change-password', body);
  }


  verifyOtp(body: any): Observable<any> {
    return this.post('/user/api/auth/otp-verify', body);
  }

  sendOtp(body: any): Observable<any> {
    return this.post('/user/api/auth/otp-send', body);
  }


  verifyInviteToken(token: string): Observable<any> {
    return this.get(`/user/api/users/invite/verify?token=${token}`);
  }
}
