import { ChangeDetectorRef, Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { IamService } from '../service/iam.service';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { DialogService } from '../../../core/services/dialog.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

interface PasswordRule {
  label: string;
  pattern: string;
  isValid: boolean;
}

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TranslateModule],
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.css']
})
export class ChangePasswordComponent implements OnInit, OnDestroy {
  passwordForm!: FormGroup;
  loading = false;
  verifying = false;
  tokenExpired = false;
  tokenAlreadyUsed = false;
  isInvite = false;
  isResetToken = false;
  hasToken = false;
  token = '';
  errorMessage = '';
  rules: PasswordRule[] = [];
  rulesValid = false;
  orgTheme: any = {};
  showNewPassword = false;
  showConfirmPassword = false;

  // Countdown for TOKEN_ALREADY_USED auto-redirect
  redirectCountdown = 20;
  private countdownInterval: any = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private apiService: IamService,
    private authService: AuthService,
    private themeService: ThemeService,
    private dialogService: DialogService,
    private translate: TranslateService,
    private router: Router
  ) {
    this.orgTheme = this.themeService.getCurrentTheme();
  }
  cdr = inject(ChangeDetectorRef);
  ngOnInit(): void {
    this.token = this.route.snapshot.queryParams['token'] || '';
    this.isResetToken = this.route.snapshot.queryParams['type'] === 'reset';
    this.hasToken = !!this.token;

    this.passwordForm = this.fb.group({
      oldPassword: [''],
      newPassword: ['', [Validators.required]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });

    if (this.hasToken) {
      if (this.isResetToken) {
        this.isInvite = false;
        this.loadRules('');
        return;
      }

      // Token links can be invitations or password resets. Invitation links get
      // optional branding; reset links are allowed to proceed directly.
      this.verifying = true;
      this.apiService.verifyInviteToken(this.token).subscribe({
        next: (res) => {
          console.log('Invite token valid:', res);
          this.verifying = false;
          this.isInvite = true;
          this.orgTheme = res.organisation || this.themeService.getCurrentTheme();

          // Apply dynamic branding instantly
          if (res.organisation && res.organisation.password_strength_rules) {
            this.loadRules(res.organisation.password_strength_rules);
          } else {
            this.loadRules('');
          }
          this.themeService.applyTheme(this.orgTheme);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.verifying = false;
          this.isInvite = false;
          this.loadRules('');
          this.handleError(err, true);
          this.cdr.detectChanges();
        }
      });
    } else {
      // 2. Normal Authenticated flow
      if (!this.authService.isLoggedIn()) {
        this.router.navigate(['/iam/login']);
        return;
      }
      this.isInvite = false;
      const currentOrg = this.authService.getCurrentOrg();
      if (currentOrg) {
        this.orgTheme = currentOrg;
        this.loadRules(currentOrg.password_strength_rules);
      } else {
        this.loadRules('');
      }
    }
  }

  loadRules(rulesJson: string): void {
    try {
      const parsed = JSON.parse(rulesJson || '[]');
      this.rules = parsed.map((r: any) => ({
        label: r.label,
        pattern: r.pattern,
        isValid: false
      }));
      this.rulesValid = this.rules.length === 0;
    } catch (e) {
      this.rules = [];
      this.rulesValid = true;
    }
  }

  checkStrength(): void {
    const pw = this.passwordForm.get('newPassword')?.value || '';
    this.rulesValid = true;

    for (const rule of this.rules) {
      try {
        const regex = new RegExp(rule.pattern);
        rule.isValid = regex.test(pw);
        if (!rule.isValid) {
          this.rulesValid = false;
        }
      } catch (e) {
        rule.isValid = false;
        this.rulesValid = false;
      }
    }
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value
      ? null : { 'mismatch': true };
  }

  toggleNewPasswordVisibility(): void {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onSubmit(): void {
    if (this.passwordForm.invalid || !this.rulesValid) return;

    this.loading = true;
    this.errorMessage = '';

    const body: any = {
      new_password: this.passwordForm.value.newPassword
    };

    if (this.hasToken) {
      body.token = this.token;
    } else {
      body.old_password = this.passwordForm.value.oldPassword;
    }

    this.apiService.changePassword(body).subscribe({
      next: () => {
        this.loading = false;
        this.authService.logout();
        this.dialogService.openSnackBar(this.translate.instant('CHANGE_PASSWORD.SUCCESS_UPDATED'));
        this.router.navigate(['/iam/login']);
      },
      error: (err) => {
        this.loading = false;
        this.handleError(err, false);
      }
    });
  }

  /**
   * Shared error handler for both verifyInviteToken and changePassword.
   *
   * @param fallbackToExpired
   *   true  → verifyInviteToken path: any unrecognised error shows the
   *            "link unavailable" (tokenExpired) screen.
   *   false → changePassword path: token errors show tokenExpired screen;
   *            password mismatch / rules failure / generic errors show
   *            the inline errorMessage banner.
   */
  private handleError(err: any, fallbackToExpired: boolean): void {
    const errorCode = err?.error?.error_code;
    switch (errorCode) {
      case 'TOKEN_ALREADY_USED':
        this.tokenAlreadyUsed = true;
        this.startRedirectCountdown();
        break;
      case 'TOKEN_EXPIRED':
      case 'TOKEN_INVALID':
        this.tokenExpired = true;
        this.startRedirectCountdown();
        break;
      default:
        if (fallbackToExpired) {
          // verifyInviteToken: treat unknown errors as an unusable link
          this.tokenExpired = true;
        } else {
          // changePassword: show inline message (mismatch, rules, generic)
          this.errorMessage = this.translate.instant(this.getErrorMessageKey(err));
        }
    }
  }

  startRedirectCountdown(): void {
    this.redirectCountdown = 20;
    this.countdownInterval = setInterval(() => {
      this.redirectCountdown--;
      this.cdr.markForCheck();
      if (this.redirectCountdown <= 0) {
        this.clearCountdown();
        this.router.navigate(['/iam/login']);
      }
    }, 1000);
  }

  clearCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  goToLoginNow(): void {
    this.clearCountdown();
    this.router.navigate(['/iam/login']);
  }

  ngOnDestroy(): void {
    this.clearCountdown();
  }

  private getErrorMessageKey(err: any): string {
    switch (err?.error?.error_code) {
      case 'TOKEN_ALREADY_USED':
        return 'CHANGE_PASSWORD.ERROR_TOKEN_ALREADY_USED';
      case 'TOKEN_EXPIRED':
        return 'CHANGE_PASSWORD.ERROR_TOKEN_EXPIRED';
      case 'TOKEN_INVALID':
        return 'CHANGE_PASSWORD.ERROR_TOKEN_INVALID';
      default:
        return 'CHANGE_PASSWORD.ERROR_UPDATE_FAILED';
    }
  }
}
