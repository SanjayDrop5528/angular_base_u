import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { IamService } from '../service/iam.service';
import { AuthService } from '../../../core/services/auth.service';

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { environment } from '../../../../environments/environment';
import { FirebaseServices } from '../../../core/services/notification/firebase.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  loading = false;
  success = false;
  errorMessage = '';
  showGoogleChooser = false;
  customGoogleName = '';
  customGoogleEmail = '';

  constructor(
    private fb: FormBuilder,
    private apiService: IamService,
    private authService: AuthService,
    private router: Router,
    private firebaseServices: FirebaseServices
  ) { }

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      orgName: ['', [Validators.required, Validators.minLength(3)]],
      name: ['', [Validators.required]],
      adminEmail: ['', [Validators.required, Validators.email]],
      adminPassword: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  onSubmit(): void {
    if (this.registerForm.invalid) return;

    this.loading = true;
    this.errorMessage = '';

    const body = {
      org_name: this.registerForm.value.orgName,
      admin_email: this.registerForm.value.adminEmail,
      admin_password: this.registerForm.value.adminPassword,
      name: this.registerForm.value.name
    };

    this.apiService.register(body).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.error || 'Registration failed. Email might be in use.';
      }
    });
  }

  loginWithFirebaseSSO(): void {
    this.loading = true;
    this.errorMessage = '';
    this.firebaseServices.signInWithGoogle(null)
      .then((success) => {
        this.loading = false;
        if (!success) {
          this.errorMessage = 'Google Sign-In failed or was cancelled.';
        }
      })
      .catch((err) => {
        this.loading = false;
        this.errorMessage = err?.message || 'Google Sign-In failed.';
      });
  }

  closeGoogleChooser(): void {
    this.showGoogleChooser = false;
  }

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

    // Perform a real Firebase Auth call under the hood
    signInWithEmailAndPassword(this.firebaseAuth, email, defaultPassword)
      .then(() => {
        this.verifyWithBackend(email, name);
      })
      .catch((error) => {
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/invalid-login-credentials') {
          // Create the account in Firebase Auth
          createUserWithEmailAndPassword(this.firebaseAuth, email, defaultPassword)
            .then(() => {
              this.verifyWithBackend(email, name);
            })
            .catch((regError) => {
              console.warn("Firebase Auth API call failed, falling back to local flow:", regError);
              this.verifyWithBackend(email, name);
            });
        } else {
          console.warn("Firebase Auth login failed, falling back to local flow:", error);
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
      }
    });
  }
}
