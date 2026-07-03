import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  NgZone,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { environment } from '../../../../environments/environment';
import { FirebaseServices } from '../../../core/services/notification/firebase.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PhoneInputComponent, PhoneValue } from '../../formly-control/components/Phone input.component';
import { LoginService } from '../../../core/services/login.service';
import { DataService } from '../../../core/services/data.service';
import { IamService } from '../service/iam.service';

// ── Phone input ───────────────────────────────────────────────────────────────

@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    FormsModule,
    TranslateModule,
    PhoneInputComponent
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit, OnDestroy {
  isSSO = false;
  loginForm!: FormGroup;
  loading = false;
  errorMessage = '';
  theme: any = {};
  showPassword = false;
  showGoogleChooser = false;
  customGoogleName = '';
  customGoogleEmail = '';
  isRegisterMode = false;
  isForgetPasswordMode = false;
  forgetPasswordForm!: FormGroup;
  forgetPasswordLoading = false;
  forgetPasswordSent = false;

  registerForm!: FormGroup;

  mobileOtpSent = false;
  emailOtpSent = false;
  mobileVerified = false;
  emailVerified = false;
  mobileOtpLoading = false;
  emailOtpLoading = false;
  mobileOtpVerifying = false;
  emailOtpVerifying = false;
  tempUserId: string = '';
  mobileOtpEverSent = false;
  emailOtpEverSent = false;
  showTermsCheckbox = false;
  isTermsChecked = false;
  termslabel = '';
  consentTemplate = '';
  consentDisplayType: 'shortlink' | 'fulldocument' = 'shortlink';
  consentLinkModel: 'popup' | 'screen' = 'popup';
  consentName = '';
  consentVersion = '';
  consentKey = '';

  readonly OTP_DURATION = 30;
  mobileTimer = 0;
  emailTimer = 0;

  private mobileTimerRef: any = null;
  private emailTimerRef: any = null;

  // ── Config for PhoneInputComponent ─────────────────────────────────────────
  /**
   * Name of your DataService collection that returns country/dial-code records.
   * Each record must have the field referenced by phonValueProp (e.g. 'dial_code').
   */
  readonly phoneCollection = 'countries';   // ← change to your collection name

  /**
   * Field on each record used as the option VALUE in the dropdown (the dial code).
   * E.g. if a record is { dial_code: '+91', name: 'India' }, set this to 'dial_code'.
   */
  readonly phoneValueProp = 'calling_code';        // ← change to your field name

  /**
   * Handlebar template for the option LABEL shown next to the code.
   * Uses fields from each record. Example: '{{name}}' or '{{country}} ({{dial_code}})'
   */
  readonly phoneLabelProp = '{{name}}';         // ← change to your label template

  constructor(
    private fb: FormBuilder,
    private apiService: IamService,
    private authService: AuthService,
    private themeService: ThemeService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private dataService: DataService,
    private translate: TranslateService,
    private firebaseServices: FirebaseServices,
  ) {
    this.theme = this.themeService.getCurrentTheme();
  }

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/user-mgmt']);
      return;
    }

    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });

    this.forgetPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });

    // mobile holds a PhoneValue object: { countryCode: string, number: string }
    this.registerForm = this.fb.group({
      name: ['', Validators.required],
      mobile: [null, Validators.required],   // PhoneValue
      mobileOtp: [''],
      email: ['', [Validators.required, Validators.email]],
      emailOtp: [''],
    });

    this.route.queryParams.subscribe(params => {
      if (params['type'] === 'register' && !this.isRegisterMode) {
        this.toggleRegister();
      }
    });
    this.agreecondition();
  }

  ngOnDestroy(): void {
    this.clearMobileTimer();
    this.clearEmailTimer();
  }

  // ── Timers ─────────────────────────────────────────────────────────────────
  private startMobileTimer(): void {
    this.clearMobileTimer();
    this.mobileTimer = this.OTP_DURATION;
    this.ngZone.runOutsideAngular(() => {
      this.mobileTimerRef = setInterval(() => {
        this.ngZone.run(() => {
          this.mobileTimer--;
          if (this.mobileTimer <= 0) { this.clearMobileTimer(); this.mobileOtpSent = false; }
          this.cdr.markForCheck();
        });
      }, 1000);
    });
  }

  private startEmailTimer(): void {
    this.clearEmailTimer();
    this.emailTimer = this.OTP_DURATION;
    this.ngZone.runOutsideAngular(() => {
      this.emailTimerRef = setInterval(() => {
        this.ngZone.run(() => {
          this.emailTimer--;
          if (this.emailTimer <= 0) { this.clearEmailTimer(); this.emailOtpSent = false; }
          this.cdr.markForCheck();
        });
      }, 1000);
    });
  }

  private clearMobileTimer(): void {
    if (this.mobileTimerRef) { clearInterval(this.mobileTimerRef); this.mobileTimerRef = null; }
    this.mobileTimer = 0;
  }

  private clearEmailTimer(): void {
    if (this.emailTimerRef) { clearInterval(this.emailTimerRef); this.emailTimerRef = null; }
    this.emailTimer = 0;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  toggleForgetPassword(): void {
    this.isForgetPasswordMode = !this.isForgetPasswordMode;
    this.forgetPasswordSent = false;
    this.errorMessage = '';
    this.forgetPasswordForm.reset();
    this.cdr.markForCheck();
  }

  submitForgetPassword(): void {
    if (this.forgetPasswordForm.invalid || this.forgetPasswordLoading) return;
    this.forgetPasswordLoading = true;
    this.errorMessage = '';

    this.apiService.resetPassword(this.forgetPasswordForm.value).subscribe({
      next: () => {
        this.forgetPasswordLoading = false;
        this.forgetPasswordSent = true;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.forgetPasswordLoading = false;
        this.errorMessage = err.error?.error || 'Failed to send password reset link.';
        this.cdr.markForCheck();
      }
    });
  }

  toggleRegister(): void {
    this.isRegisterMode = !this.isRegisterMode;
    this.errorMessage = '';
    this.mobileOtpSent = false;
    this.emailOtpSent = false;
    this.mobileVerified = false;
    this.emailVerified = false;
    this.tempUserId = '';
    this.mobileOtpEverSent = false;
    this.emailOtpEverSent = false;
    this.clearMobileTimer();
    this.clearEmailTimer();
    this.registerForm.reset();
    this.cdr.markForCheck();
  }

  togglePasswordVisibility(): void { this.showPassword = !this.showPassword; }

  toggleSSO(): void {
    this.isSSO = !this.isSSO;
    if (this.isSSO) {
      this.loginForm.get('password')?.clearValidators();
    } else {
      this.loginForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    }
    this.loginForm.get('password')?.updateValueAndValidity();
    this.errorMessage = '';
  }

  // ── Mobile OTP ─────────────────────────────────────────────────────────────
  /**
   * Reads the PhoneValue object from the form control and sends the OTP.
   * The API receives the full number including country code, e.g. "+919876543210".
   */
  sendMobileOtp(): void {
    if (this.mobileOtpLoading || this.mobileOtpSent) return;

    const phoneVal: PhoneValue | null = this.registerForm.get('mobile')?.value;
    if (!phoneVal?.number) {
      this.registerForm.get('mobile')?.markAsTouched();
      return;
    }

    // Combine country code + number into a single string for the API
    const fullMobile = `${phoneVal.countryCode}${phoneVal.number}`;

    this.mobileOtpLoading = true;
    this.errorMessage = '';

    const payload: any = { mobile: fullMobile, type: 'mobile' };
    if (this.tempUserId) payload.id = this.tempUserId;

    this.apiService.sendOtp(payload).subscribe({
      next: (res) => {
        this.mobileOtpLoading = false;
        this.mobileOtpSent = true;
        this.mobileOtpEverSent = true;
        if (res.id) this.tempUserId = res.id;
        this.startMobileTimer();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.mobileOtpLoading = false;
        this.errorMessage = err.error?.message || 'Failed to send OTP';
        this.cdr.markForCheck();
      },
    });
  }

  resendMobileOtp(): void {
    this.mobileOtpSent = false;
    this.clearMobileTimer();
    this.registerForm.get('mobileOtp')?.reset();
    this.cdr.markForCheck();
    setTimeout(() => this.sendMobileOtp(), 0);
  }

  verifyMobileOtp(): void {
    if (this.mobileOtpVerifying || this.mobileVerified) return;
    const otp = this.registerForm.get('mobileOtp')?.value;
    if (!otp) return;

    const phoneVal: PhoneValue | null = this.registerForm.get('mobile')?.value;
    const fullMobile = phoneVal ? `${phoneVal.countryCode}${phoneVal.number}` : '';

    this.mobileOtpVerifying = true;
    this.errorMessage = '';

    this.apiService.verifyOtp({ mobile: fullMobile, code: otp, type: 'mobile' }).subscribe({
      next: () => {
        this.mobileOtpVerifying = false;
        this.mobileVerified = true;
        this.mobileOtpSent = false;
        this.clearMobileTimer();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.mobileOtpVerifying = false;
        this.errorMessage = err?.error?.error || err?.error?.message || err?.error || 'Invalid mobile OTP.';
        this.cdr.markForCheck();
      },
    });
  }

  // ── Email OTP ──────────────────────────────────────────────────────────────
  sendEmailOtp(): void {
    if (this.emailOtpLoading || this.emailOtpSent) return;
    if (this.registerForm.get('email')?.invalid) {
      this.registerForm.get('email')?.markAsTouched();
      return;
    }

    const email = this.registerForm.get('email')?.value;
    this.emailOtpLoading = true;
    this.errorMessage = '';

    const payload: any = { email, type: 'email' };
    if (this.tempUserId) payload.id = this.tempUserId;

    this.apiService.sendOtp(payload).subscribe({
      next: (res) => {
        this.emailOtpLoading = false;
        this.emailOtpSent = true;
        this.emailOtpEverSent = true;
        if (res.id) this.tempUserId = res.id;
        this.startEmailTimer();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.emailOtpLoading = false;
        this.errorMessage = err.error?.message || 'Failed to send OTP';
        this.cdr.markForCheck();
      },
    });
  }

  resendEmailOtp(): void {
    this.emailOtpSent = false;
    this.clearEmailTimer();
    this.registerForm.get('emailOtp')?.reset();
    this.cdr.markForCheck();
    setTimeout(() => this.sendEmailOtp(), 0);
  }

  verifyEmailOtp(): void {
    if (this.emailOtpVerifying || this.emailVerified) return;
    const otp = this.registerForm.get('emailOtp')?.value;
    if (!otp) return;

    this.emailOtpVerifying = true;
    this.errorMessage = '';

    this.apiService.verifyOtp({
      email: this.registerForm.get('email')?.value,
      code: otp,
      type: 'email',
    }).subscribe({
      next: () => {
        this.emailOtpVerifying = false;
        this.emailVerified = true;
        this.emailOtpSent = false;
        this.clearEmailTimer();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.emailOtpVerifying = false;
        this.errorMessage = err?.error?.error || err?.error?.message || err?.error || 'Invalid email OTP.';
        this.cdr.markForCheck();
      },
    });
  }
  loginService = inject(LoginService)

  agreecondition(): void {
    this.dataService.getMethodApi("entities/public/filter/consent_managements/821cede2-1d1e-4aa0-9451-e1cbcbb2cbe9").subscribe({
      next: (res: any) => {
        const notice = res.data[0].response;
        //   .find(
        //   (n: any) =>
        //     n.event_id?.trim() === 'buddy-998' &&
        //     n.status === 'active' &&
        //     n.is_publish === true
        // );

        if (!notice) {
          this.showTermsCheckbox = false;
          this.cdr.markForCheck();
          return;
        }

        this.consentTemplate = notice.template;
        this.consentDisplayType = notice.display_type;
        this.consentName = notice.name;
        this.consentVersion = notice.version;
        this.consentKey = notice.key;
        this.termslabel = notice.termslabel;
        this.consentLinkModel = notice.linkmodel === 'page' ? 'screen' : 'popup';
        this.showTermsCheckbox = true;
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        console.error('Failed to load consent notice', err);
        this.showTermsCheckbox = false;
        this.cdr.markForCheck();
      }
    });
  }

  onConsentTermsChecked(checked: boolean): void {
    this.isTermsChecked = checked;
  }


  // ── Registration submit ────────────────────────────────────────────────────
  continueRegistration(): void {
    if (this.registerForm.invalid || !this.mobileVerified || !this.emailVerified) return;

    const { name, email } = this.registerForm.value;
    const phoneVal: PhoneValue = this.registerForm.get('mobile')?.value;
    const fullMobile = phoneVal ? `${phoneVal.countryCode}${phoneVal.number}` : '';

    this.loading = true;
    this.errorMessage = '';

    this.apiService.registerPatient(name, email, fullMobile).subscribe({
      next: (res: any) => {
        this.loginService.Init(res)
        this.loading = false;
        // this.toggleRegister();
        // this.loginForm.patchValue({ email });
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMessage = err.error?.error || 'Registration failed. Please try again.';
        this.cdr.markForCheck();
      },
    });
    this.router.navigate(['/onboard']);
  }

  // ── Login submit ───────────────────────────────────────────────────────────
  onSubmit(): void {
    if (this.isSSO) {
      if (this.loginForm.get('email')?.invalid) return;
      this.loading = true;
      this.errorMessage = '';
      this.apiService.ssoLogin(this.loginForm.value.email).subscribe({
        next: (res) => {
          this.loading = false;
          this.loginService.Init(res)
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = err.error?.error || 'SSO Login failed. Email not registered or SSO not enabled.';
          this.cdr.markForCheck();
        },
      });
      return;
    }

    if (this.loginForm.invalid) return;
    this.loading = true;
    this.errorMessage = '';

    this.apiService.login(this.loginForm.value).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.force_password_change) {
          this.router.navigate(['/iam/change-password'], { queryParams: { token: res.invite_token } });
          return;
        }
        if (res.mfa_required) {
          this.router.navigate(['/iam/mfa-verify'], { queryParams: { userId: res.user_id } });
          return;
        }
        this.authService.setSession(res.token, res.user);
        this.authService.setOrg(null);
        this.router.navigate(['/user-mgmt']);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.error || 'Invalid email or password';
        this.cdr.markForCheck();
      },
    });
  }

  // ── Firebase / Google SSO ──────────────────────────────────────────────────
  loginWithFirebaseSSO(): void {
    this.loading = true;
    this.errorMessage = '';
    this.firebaseServices.signInWithGoogle(null)
      .then((success) => {
        this.loading = false;
        if (!success) this.errorMessage = 'Google Sign-In failed or was cancelled.';
        this.cdr.markForCheck();
      })
      .catch((err) => {
        this.loading = false;
        this.errorMessage = err?.message || 'Google Sign-In failed.';
        this.cdr.markForCheck();
      });
  }

  closeGoogleChooser(): void { this.showGoogleChooser = false; }

  submitCustomGoogleAccount(): void {
    if (this.customGoogleName && this.customGoogleEmail) {
      this.selectGoogleAccount(this.customGoogleEmail, this.customGoogleName);
    }
  }

  private firebaseApp = initializeApp(environment.firebaseConfig);
  private firebaseAuth = getAuth(this.firebaseApp);

  selectGoogleAccount(email: string, name: string): void {
    this.showGoogleChooser = false;
    this.loading = true;
    this.errorMessage = '';
    const defaultPassword = 'SSOMockPassword123!';
    signInWithEmailAndPassword(this.firebaseAuth, email, defaultPassword)
      .then(() => this.verifyWithBackend(email, name))
      .catch((error) => {
        if (['auth/user-not-found', 'auth/invalid-credential', 'auth/invalid-login-credentials']
          .includes(error.code)) {
          createUserWithEmailAndPassword(this.firebaseAuth, email, defaultPassword)
            .then(() => this.verifyWithBackend(email, name))
            .catch(() => this.verifyWithBackend(email, name));
        } else {
          this.verifyWithBackend(email, name);
        }
      });
  }

  private verifyWithBackend(email: string, name: string): void {
    this.apiService.firebaseSSO(email, name).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.exists) {
          this.authService.setSession(res.token, res.user);
          this.authService.setOrg(null);
          this.router.navigate(['/user-mgmt']);
        } else {
          localStorage.setItem('sso_email', email);
          localStorage.setItem('sso_name', name);
          localStorage.removeItem('onboarding_answers');
          localStorage.removeItem('onboarding_step');
          this.router.navigate(['/iam/onboarding']);
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.error || 'SSO validation failed. Please try again.';
        this.cdr.markForCheck();
      },
    });
  }
}