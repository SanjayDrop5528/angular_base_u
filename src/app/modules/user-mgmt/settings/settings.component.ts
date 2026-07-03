import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UserMgmtService } from '../service/user-mgmt.service';
import { AuthService } from '../../../core/services/auth.service';
import { DialogService } from '../../../core/services/dialog.service';
import { TranslateService, TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, TranslateModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  currentTab = 'profile';
  profileForm!: FormGroup;
  passwordForm!: FormGroup;
  
  loading = false;
  profileLoading = false;
  prefLoading = false;
  deviceLoading = false;

  user: any = {};
  errorMessage = '';
  profileErrorMessage = '';

  // Connected Devices
  devices: any[] = [];
  medicalDevices: any[] = [];
  wearables: any[] = [];
  healthApps: any[] = [];

  // Modal states for Connect Device
  showConnectModal = false;
  newDeviceName = '';
  newDeviceMode = 'medical';

  // Notification Preferences
  preferences: any = {
    email: {
      health_alerts: true,
      activity_reminders: true,
      provider_updates: true
    },
    sms: {
      health_alerts: true,
      provider_updates: true,
      otp_mfa: true
    },
    push: {
      security_alerts: true,
      reminders_updates: true
    }
  };

  languages = [
    { label: 'English', value: 'en' },
    { label: 'Hindi', value: 'hi' },
    { label: 'Malay', value: 'ms' },
    { label: 'Tamil', value: 'ta' },
    { label: 'Marathi', value: 'mr' },
    { label: 'Nepali', value: 'ne' }
  ];

  constructor(
    private fb: FormBuilder,
    private apiService: UserMgmtService,
    private authService: AuthService,
    private dialogService: DialogService,
    private translateService: TranslateService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Initialise forms
    this.profileForm = this.fb.group({
      name: ['', [Validators.required]],
      phone: ['', [Validators.required]],
      preferredLanguage: ['en', [Validators.required]]
    });

    this.passwordForm = this.fb.group({
      oldPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });

    this.loadUserProfile();

    // Read tab from query parameters
    this.route.queryParams.subscribe(params => {
      const tab = params['tab'];
      if (tab && ['profile', 'notifications', 'devices', 'security'].includes(tab)) {
        this.currentTab = tab;
        this.cdr.markForCheck();
      }
    });
  }

  setTab(tab: string): void {
    this.currentTab = tab;
    this.errorMessage = '';
    this.profileErrorMessage = '';

    // Update query parameters in the URL
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value
      ? null : { 'mismatch': true };
  }

  loadUserProfile(): void {
    this.profileLoading = true;
    this.apiService.getCurrentUserProfile().subscribe({
      next: (res) => {
        this.profileLoading = false;
        if (res && res.user) {
          this.user = res.user;
          this.devices = res.user.devices || [];
          this.preferences = res.user.preferences || this.preferences;
          this.filterDevices();

          // Populate profile form fields
          this.profileForm.patchValue({
            name: this.user.name || '',
            phone: this.user.mobile || '',
            preferredLanguage: this.user.preferred_language || 'en'
          });
        }
      },
      error: () => {
        this.profileLoading = false;
      }
    });
  }

  filterDevices(): void {
    this.medicalDevices = this.devices.filter(d => d.device_mode === 'medical');
    this.wearables = this.devices.filter(d => d.device_mode === 'wearable');
    this.healthApps = this.devices.filter(d => d.device_mode === 'app');
  }

  saveProfile(): void {
    if (this.profileForm.invalid) return;

    this.profileLoading = true;
    this.profileErrorMessage = '';

    const body = {
      user_id: this.user.user_id,
      name: this.profileForm.value.name,
      phone: this.profileForm.value.phone,
      preferred_language: this.profileForm.value.preferredLanguage
    };

    this.apiService.editUser(this.user.user_id, body).subscribe({
      next: () => {
        this.profileLoading = false;
        this.dialogService.openSnackBar(this.translateService.instant('SETTINGS.SNACK_PROFILE_SUCCESS'));
        this.loadUserProfile();
      },
      error: (err) => {
        this.profileLoading = false;
        this.profileErrorMessage = err.error?.error || 'Failed to update profile details.';
      }
    });
  }

  savePreferences(): void {
    this.prefLoading = true;
    this.apiService.updateNotificationPreferences(this.preferences).subscribe({
      next: () => {
        this.prefLoading = false;
        this.dialogService.openSnackBar(this.translateService.instant('SETTINGS.NOTIFICATIONS_SAVE_SUCCESS') || 'Preferences saved successfully.');
      },
      error: () => {
        this.prefLoading = false;
        this.dialogService.openSnackBar('Failed to save notification preferences.');
      }
    });
  }

  openConnectModal(): void {
    this.showConnectModal = true;
    this.newDeviceName = '';
    this.newDeviceMode = 'medical';
  }

  closeConnectModal(): void {
    this.showConnectModal = false;
  }

  submitConnectDevice(): void {
    if (!this.newDeviceName.trim()) return;

    this.deviceLoading = true;
    this.apiService.connectDevice(this.newDeviceName, this.newDeviceMode).subscribe({
      next: () => {
        this.deviceLoading = false;
        this.closeConnectModal();
        this.dialogService.openSnackBar('Device connected successfully.');
        this.loadUserProfile();
      },
      error: () => {
        this.deviceLoading = false;
        this.dialogService.openSnackBar('Failed to connect device.');
      }
    });
  }

  toggleBlockDevice(device: any): void {
    this.deviceLoading = true;
    const request = device.is_blocked
      ? this.apiService.unblockDevice(device.id)
      : this.apiService.blockDevice(device.id);

    request.subscribe({
      next: () => {
        this.deviceLoading = false;
        this.dialogService.openSnackBar(device.is_blocked ? 'Device unblocked.' : 'Device blocked.');
        this.loadUserProfile();
      },
      error: () => {
        this.deviceLoading = false;
        this.dialogService.openSnackBar('Failed to change device blocking status.');
      }
    });
  }

  disconnectDevice(id: string): void {
    if (!confirm('Are you sure you want to disconnect this device?')) return;

    this.deviceLoading = true;
    this.apiService.disconnectDevice(id).subscribe({
      next: () => {
        this.deviceLoading = false;
        this.dialogService.openSnackBar('Device disconnected.');
        this.loadUserProfile();
      },
      error: () => {
        this.deviceLoading = false;
        this.dialogService.openSnackBar('Failed to disconnect device.');
      }
    });
  }

  onSubmit(): void {
    if (this.passwordForm.invalid) return;

    this.loading = true;
    this.errorMessage = '';

    const body = {
      old_password: this.passwordForm.value.oldPassword,
      new_password: this.passwordForm.value.newPassword
    };

    this.apiService.changePassword(body).subscribe({
      next: () => {
        this.loading = false;
        this.passwordForm.reset();
        this.dialogService.openSnackBar(this.translateService.instant('SETTINGS.SNACK_SUCCESS'));
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.error || this.translateService.instant('SETTINGS.ERR_FAILED');
      }
    });
  }
}
