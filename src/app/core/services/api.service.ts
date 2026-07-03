import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserMgmtService } from '../../modules/user-mgmt/service/user-mgmt.service';
import { IamService } from '../../modules/iam/service/iam.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService extends UserMgmtService {

  constructor(
    private iamService: IamService,
    http: HttpClient
  ) {
    super(http);
  }

  // --- Delegate Identity & Access Management (IAM) ---

  login(body: any): Observable<any> {
    return this.iamService.login(body);
  }

  ssoLogin(email: string): Observable<any> {
    return this.iamService.ssoLogin(email);
  }

  firebaseSSO(email: string, name?: string): Observable<any> {
    return this.iamService.firebaseSSO(email, name);
  }

  registerSSO(payload: any): Observable<any> {
    return this.iamService.registerSSO(payload);
  }

  // registerPatient(name: string, email: string, mobile: string): Observable<any> {
  //   return this.iamService.registerPatient(name, email, mobile);
  // }

  getOnboardingDraft(email: string): Observable<any> {
    return this.iamService.getOnboardingDraft(email);
  }

  saveOnboardingIdentity(email: string, identityData: any): Observable<any> {
    return this.iamService.saveOnboardingIdentity(email, identityData);
  }

  saveOnboardingQualifications(email: string, qualificationsData: any): Observable<any> {
    return this.iamService.saveOnboardingQualifications(email, qualificationsData);
  }

  saveOnboardingExperience(email: string, experienceData: any): Observable<any> {
    return this.iamService.saveOnboardingExperience(email, experienceData);
  }

  saveOnboardingDocuments(email: string, documentsData: any): Observable<any> {
    return this.iamService.saveOnboardingDocuments(email, documentsData);
  }

  submitOnboarding(email: string): Observable<any> {
    return this.iamService.submitOnboarding(email);
  }

  mfaVerify(body: any): Observable<any> {
    return this.iamService.mfaVerify(body);
  }
  register(body: any): Observable<any> {
    return this.iamService.register(body);
  }

  // register(body: any): Observable<any> {
  //   return this.iamService.register(body);
  // }

  registerPatient(name: string, email: string, mobile: string): Observable<any> {
    return this.iamService.registerPatient(name, email, mobile);
  }

  resetPassword(body: any): Observable<any> {
    return this.iamService.resetPassword(body);
  }

  changePassword(body: any): Observable<any> {
    return this.iamService.changePassword(body);
  }

  verifyInviteToken(token: string): Observable<any> {
    return this.iamService.verifyInviteToken(token);
  }

  sendOtp(body: any): Observable<any> {
    return this.iamService.sendOtp(body);
  }

  verifyOtp(body: any): Observable<any> {
    return this.iamService.verifyOtp(body);
  }
}
