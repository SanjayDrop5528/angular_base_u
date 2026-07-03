import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { IamService } from '../service/iam.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-mfa-verify',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './mfa-verify.component.html',
  styleUrls: ['./mfa-verify.component.css']
})
export class MfaVerifyComponent implements OnInit {
  mfaForm!: FormGroup;
  loading = false;
  errorMessage = '';
  userId = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private apiService: IamService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.userId = this.route.snapshot.queryParams['userId'] || '';

    if (!this.userId) {
      this.router.navigate(['/iam/login']);
      return;
    }

    this.mfaForm = this.fb.group({
      code: ['', [Validators.required, Validators.pattern('^[0-9]{6}$')]]
    });
  }

  onSubmit(): void {
    if (this.mfaForm.invalid) return;

    this.loading = true;
    this.errorMessage = '';

    const body = {
      user_id: this.userId,
      code: this.mfaForm.value.code
    };

    this.apiService.mfaVerify(body).subscribe({
      next: (res) => {
        this.loading = false;
        this.authService.setSession(res.token, res.user);
        
        this.authService.setOrg(null);
        this.router.navigate(['/user-mgmt']);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.error || 'Verification code failed';
      }
    });
  }
}
