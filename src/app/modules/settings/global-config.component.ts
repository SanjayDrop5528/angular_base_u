import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { SettingsService } from '../../core/services/settings.service';
import { DialogService } from '../../core/services/dialog.service';
import { DataService } from '../../core/services/data.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-global-config',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, MatIconModule],
  template: `
    <div class="config-container animate-fade-in">
      <div class="config-header">
        <h2>System Configuration</h2>
        <p>Configure general branding, security rules, file upload storage engines, and AI services.</p>
      </div>

      <div *ngIf="loading" class="loading-state">
        <mat-icon class="spin-icon">sync</mat-icon>
        <span>Loading configurations...</span>
      </div>

      <div *ngIf="!loading && configForm" class="config-layout">
        <!-- Sidebar Navigation -->
        <div class="config-sidebar glass-panel">
          <button type="button" class="sidebar-item" [class.active]="activeTab === 'platform'" (click)="activeTab = 'platform'">
            <mat-icon class="sidebar-icon">dns</mat-icon>
            <div class="sidebar-text">
              <span class="sidebar-title">Platform Branding</span>
              <small class="sidebar-subtitle">Logo, name, and background</small>
            </div>
          </button>
          
          <button type="button" class="sidebar-item" [class.active]="activeTab === 'security'" (click)="activeTab = 'security'">
            <mat-icon class="sidebar-icon">security</mat-icon>
            <div class="sidebar-text">
              <span class="sidebar-title">Security & Policy</span>
              <small class="sidebar-subtitle">Session timeout & expiry</small>
            </div>
          </button>
          
          <button type="button" class="sidebar-item" [class.active]="activeTab === 'asset'" (click)="activeTab = 'asset'">
            <mat-icon class="sidebar-icon">cloud_upload</mat-icon>
            <div class="sidebar-text">
              <span class="sidebar-title">Asset & Storage</span>
              <small class="sidebar-subtitle">Local, S3, or R2 buckets</small>
            </div>
          </button>

          <button type="button" class="sidebar-item" [class.active]="activeTab === 'ai'" (click)="activeTab = 'ai'">
            <mat-icon class="sidebar-icon">psychology</mat-icon>
            <div class="sidebar-text">
              <span class="sidebar-title">AI Provider Config</span>
              <small class="sidebar-subtitle">Ollama, Gemini, Grok, OpenAI</small>
            </div>
          </button>

          <button type="button" class="sidebar-item" [class.active]="activeTab === 'case_category'" (click)="activeTab = 'case_category'">
            <mat-icon class="sidebar-icon">category</mat-icon>
            <div class="sidebar-text">
              <span class="sidebar-title">File upload Categories</span>
              <small class="sidebar-subtitle">Name, extensions, and description</small>
            </div>
          </button>
        </div>

        <!-- Main Configuration Content Area -->
        <form [formGroup]="configForm" (ngSubmit)="onSubmit()" class="config-main-content">
          
          <!-- CARD 1: Platform Information -->
          <div class="tab-content" [class.active]="activeTab === 'platform'">
            <div class="config-card glass-panel">
              <div class="card-header">
                <mat-icon class="header-icon">dns</mat-icon>
                <div class="header-text">
                  <h3>Platform Branding</h3>
                  <p>Configure details shown on login screen and branding across workspace pages.</p>
                </div>
              </div>

              <div class="card-body">
                <div class="form-row">
                  <div class="form-group flex-1">
                    <label for="platform_name">Platform Name</label>
                    <input type="text" id="platform_name" formControlName="platform_name" class="form-input" placeholder="e.g. SynapseMD">
                  </div>
                  <div class="form-group flex-1">
                    <label for="support_email">Support Email</label>
                    <input type="email" id="support_email" formControlName="support_email" class="form-input" placeholder="e.g. support@platform.com">
                  </div>
                </div>

                <!-- Visual Logo Uploader Box -->
                <div class="form-row">
                  <div class="form-group flex-1">
                    <label>Platform Logo</label>
                    <div class="image-uploader-box">
                      <div class="image-preview" *ngIf="configForm.get('platform_logo')?.value">
                        <img [src]="imageHost + configForm.get('platform_logo')?.value" alt="Logo preview">
                      </div>
                      <div class="uploader-controls">
                        <span class="path-display" title="{{ configForm.get('platform_logo')?.value }}">
                          {{ configForm.get('platform_logo')?.value || 'No logo uploaded' }}
                        </span>
                        <label class="btn-secondary uploader-btn">
                          <mat-icon>upload</mat-icon>
                          <span>Upload Logo</span>
                          <input type="file" accept="image/*" style="display: none;" (change)="uploadImage($event, 'platform_logo', 'logos')">
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Visual Login Background Uploader Box -->
                <div class="form-row">
                  <div class="form-group flex-1">
                    <label>Login Page Background Photo</label>
                    <div class="image-uploader-box">
                      <div class="image-preview rect-preview" *ngIf="configForm.get('loginpage_photo')?.value">
                        <img [src]="imageHost + configForm.get('loginpage_photo')?.value" alt="Background preview">
                      </div>
                      <div class="uploader-controls">
                        <span class="path-display" title="{{ configForm.get('loginpage_photo')?.value }}">
                          {{ configForm.get('loginpage_photo')?.value || 'No background photo' }}
                        </span>
                        <label class="btn-secondary uploader-btn">
                          <mat-icon>wallpaper</mat-icon>
                          <span>Upload Image</span>
                          <input type="file" accept="image/*" style="display: none;" (change)="uploadImage($event, 'loginpage_photo', 'login-bg')">
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="form-group">
                  <label for="platform_description">Platform Description</label>
                  <textarea id="platform_description" formControlName="platform_description" class="form-input" rows="3" placeholder="Describe the workspace or platform purpose..."></textarea>
                </div>
              </div>
            </div>
          </div>

          <!-- CARD 2: Security & Session Settings -->
          <div class="tab-content" [class.active]="activeTab === 'security'">
            <div class="config-card glass-panel">
              <div class="card-header">
                <mat-icon class="header-icon">security</mat-icon>
                <div class="header-text">
                  <h3>Security & Access Control Policy</h3>
                  <p>Enforce session timeouts, password strength validation rules, and default credentials.</p>
                </div>
              </div>

              <div class="card-body">
                <div class="form-row-center">
                  <div class="form-group toggle-group">
                    <label for="auto_logout_inactivity" class="toggle-label">
                      <span class="label-title">Auto Logout on Inactivity</span>
                      <span class="label-desc">Automatically log users out when inactive.</span>
                    </label>
                    <input type="checkbox" id="auto_logout_inactivity" formControlName="auto_logout_inactivity" class="toggle-switch">
                  </div>

                  <div class="form-group flex-1" *ngIf="configForm.get('auto_logout_inactivity')?.value">
                    <label for="web_session_timeout">Session Timeout (Minutes)</label>
                    <input type="number" id="web_session_timeout" formControlName="web_session_timeout" class="form-input" min="1">
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group flex-1">
                    <label for="password_min_length">Minimum Password Length</label>
                    <input type="number" id="password_min_length" formControlName="password_min_length" class="form-input" min="4">
                  </div>
                  <div class="form-group flex-1">
                    <label for="password_expiry_mins">Password Expiry Cycle (Minutes)</label>
                    <input type="number" id="password_expiry_mins" formControlName="password_expiry_mins" class="form-input" min="1">
                  </div>
                </div>

                <div class="form-row-center">
                  <div class="form-group toggle-group flex-1">
                    <label for="password_require_special" class="toggle-label">
                      <span class="label-title">Require Special Characters</span>
                      <span class="label-desc">Force users to use symbols and numbers in passwords.</span>
                    </label>
                    <input type="checkbox" id="password_require_special" formControlName="password_require_special" class="toggle-switch">
                  </div>

                  <div class="form-group toggle-group flex-1">
                    <label for="default_password_enabled" class="toggle-label">
                      <span class="label-title">Override Default Password</span>
                      <span class="label-desc">Apply default temporary password for new registrations.</span>
                    </label>
                    <input type="checkbox" id="default_password_enabled" formControlName="default_password_enabled" class="toggle-switch">
                  </div>
                </div>

                <div class="form-group" *ngIf="configForm.get('default_password_enabled')?.value">
                  <label for="default_password_value">Default Password Value</label>
                  <input type="text" id="default_password_value" formControlName="default_password_value" class="form-input" placeholder="e.g. TempPass123!">
                </div>
              </div>
            </div>
          </div>

          <!-- CARD 3: Asset Configuration -->
          <div class="tab-content" [class.active]="activeTab === 'asset'">
            <div class="config-card glass-panel" style="margin-bottom: 2rem;">
              <div class="card-header">
                <mat-icon class="header-icon">cloud_upload</mat-icon>
                <div class="header-text">
                  <h3>Asset & File Upload limits</h3>
                  <p>Configure file size limits, allowed extensions, and file counts.</p>
                </div>
              </div>

              <div class="card-body">
                <div class="form-row">
                  <div class="form-group flex-1">
                    <label for="max_file_size_mb">Max File Size (MB)</label>
                    <input type="number" id="max_file_size_mb" formControlName="max_file_size_mb" class="form-input" min="1">
                  </div>
                  <div class="form-group flex-1">
                    <label for="min_files_per_asset">Min Files per Upload</label>
                    <input type="number" id="min_files_per_asset" formControlName="min_files_per_asset" class="form-input" min="1">
                  </div>
                  <div class="form-group flex-1">
                    <label for="max_files_per_asset">Max Files per Upload</label>
                    <input type="number" id="max_files_per_asset" formControlName="max_files_per_asset" class="form-input" min="1">
                  </div>
                </div>

                <div class="form-group">
                  <label>Allowed File Extensions</label>
                  
                  <div class="chips-container">
                    <span class="ext-chip" *ngFor="let ext of allowedExts">
                      {{ ext }}
                      <mat-icon class="remove-chip-icon" (click)="removeExt(ext)">close</mat-icon>
                    </span>
                    <span class="no-chips" *ngIf="allowedExts.length === 0">No extensions allowed. Add some format categories below.</span>
                  </div>

                  <div class="quick-add-area">
                    <span class="quick-label">Quick Add:</span>
                    <div class="quick-buttons">
                      <button type="button" class="btn-quick" *ngFor="let qe of quickExts" [disabled]="allowedExts.includes(qe)" (click)="addExt(qe)">
                        {{ qe.toUpperCase().replace('.', '') }}
                      </button>
                    </div>
                  </div>

                  <div class="custom-add-area">
                    <input type="text" #newExtInput class="form-input add-input" placeholder="e.g. .xls, .zip" (keydown.enter)="$event.preventDefault(); addExt(newExtInput.value); newExtInput.value=''">
                    <button type="button" class="btn-secondary add-btn" (click)="addExt(newExtInput.value); newExtInput.value=''">Add Custom</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Asset Upload Storage Config Card -->
            <div class="config-card glass-panel">
              <div class="card-header">
                <mat-icon class="header-icon">storage</mat-icon>
                <div class="header-text">
                  <h3>File Storage Engine Configuration</h3>
                  <p>Choose where user uploads and profile attachments are securely stored.</p>
                </div>
              </div>

              <div class="card-body">
                <div class="form-group">
                  <label for="storage_provider">Storage Destination Type</label>
                  <select id="storage_provider" formControlName="storage_provider" class="form-input">
                    <option value="LOCAL">Local Server Storage (LOCAL)</option>
                    <option value="S3">Amazon S3 Storage (S3)</option>
                    <option value="R2">Cloudflare R2 Object Storage (R2)</option>
                  </select>
                </div>

                <div class="storage-s3-fields" *ngIf="configForm.get('storage_provider')?.value === 'S3' || configForm.get('storage_provider')?.value === 'R2'">
                  <div class="form-row">
                    <div class="form-group flex-1">
                      <label for="storage_base_url">Endpoint / Base URL</label>
                      <input type="text" id="storage_base_url" formControlName="storage_base_url" class="form-input" placeholder="e.g. https://s3.amazonaws.com">
                    </div>
                    <div class="form-group flex-1">
                      <label for="storage_app_token">App Access Key / Token</label>
                      <input type="text" id="storage_app_token" formControlName="storage_app_token" class="form-input" placeholder="S3 Access Key or Token">
                    </div>
                  </div>

                  <div class="form-row">
                    <div class="form-group flex-1">
                      <label for="storage_region">Region</label>
                      <input type="text" id="storage_region" formControlName="storage_region" class="form-input" placeholder="e.g. us-east-1">
                    </div>
                    <div class="form-group flex-1">
                      <label for="storage_bucket_name">Bucket Name</label>
                      <input type="text" id="storage_bucket_name" formControlName="storage_bucket_name" class="form-input" placeholder="e.g. synapse-attachments-bucket">
                    </div>
                  </div>

                  <div class="form-row-center">
                    <div class="form-group toggle-group flex-1">
                      <label for="storage_use_presigned" class="toggle-label">
                        <span class="label-title">Use Presigned URLs</span>
                        <span class="label-desc">Deliver files via temporary, secure presigned URLs.</span>
                      </label>
                      <input type="checkbox" id="storage_use_presigned" formControlName="storage_use_presigned" class="toggle-switch">
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- CARD 4: AI Provider Config -->
          <div class="tab-content" [class.active]="activeTab === 'ai'">
            <div style="margin-bottom: 1.5rem; background: var(--glass-bg, rgba(15, 23, 42, 0.45)); border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08)); border-radius: 12px; padding: 1.5rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
              <div>
                <h3 style="margin-top: 0; color: var(--primary-color, #6366f1); font-size: 1.3rem;">AI Provider Engine Settings</h3>
                <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 0;">Configure connection parameters for multiple AI providers. Select the primary provider below.</p>
              </div>
              <button type="button" class="btn-primary" style="padding: 0.5rem 1rem !important; font-size: 0.88rem !important; display: flex; align-items: center; gap: 0.35rem; white-space: nowrap;" (click)="openAddModal()">
                <mat-icon>add</mat-icon>
                <span>Add Provider</span>
              </button>
            </div>

            <!-- AI Providers Grid -->
            <div class="ai-grid">
              <div *ngFor="let p of aiProviders; let idx = index" class="ai-card" [class.primary]="configForm.get('ai_provider')?.value === p.provider">
                <div class="ai-card-header">
                  <div class="ai-card-title">
                    <mat-icon style="color: var(--primary-color, #6366f1);">psychology</mat-icon>
                    <h4>
                      {{ p.provider === 'openai' ? 'OpenAI' : (p.provider === 'claude' ? 'Anthropic Claude' : (p.provider === 'gemini' ? 'Google Gemini' : (p.provider === 'grok' ? 'xAI Grok' : p.provider))) }}
                    </h4>
                  </div>
                  <span class="ai-primary-badge" *ngIf="configForm.get('ai_provider')?.value === p.provider">Primary</span>
                </div>

                <!-- Health Status & Details -->
                <div style="margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                  <mat-icon [style.color]="(!p.active) ? '#94a3b8' : (((p.consecutive_errors || 0) >= 3) ? '#ef4444' : '#10b981')" style="font-size: 1.2rem; width: 20px; height: 20px; line-height: 20px;">
                    {{ (!p.active) ? 'toggle_off' : (((p.consecutive_errors || 0) >= 3) ? 'warning' : 'check_circle') }}
                  </mat-icon>
                  <span [style.color]="(!p.active) ? '#94a3b8' : (((p.consecutive_errors || 0) >= 3) ? '#ef4444' : '#10b981')" style="font-size: 0.85rem; font-weight: 600;">
                    {{ (!p.active) ? 'Disabled' : (((p.consecutive_errors || 0) >= 3) ? 'Deactivated (3+ Failures)' : 'Active & Healthy') }}
                  </span>
                </div>

                <!-- Usage Statistics Section -->
                <div class="ai-card-stats">
                  <div class="ai-stat-row">
                    <span class="ai-stat-label">Total Queries:</span>
                    <span class="ai-stat-value">{{ p.total_usage_count || 0 }}</span>
                  </div>
                  <div class="ai-stat-row">
                    <span class="ai-stat-label">Today's Queries:</span>
                    <span class="ai-stat-value">{{ p.today_usage_count || 0 }} / {{ p.max_usage_per_day || 100 }}</span>
                  </div>
                  <div class="ai-progress-bar-container" title="Daily usage percentage">
                    <div class="ai-progress-bar" [style.width.%]="getUsagePercent(p)"></div>
                  </div>
                </div>

                <!-- Actions Footer -->
                <div class="ai-card-actions">
                  <button type="button" class="ai-card-btn primary-btn" *ngIf="configForm.get('ai_provider')?.value !== p.provider && p.active" (click)="setPrimaryProvider(p.provider)">
                    <mat-icon style="font-size: 1rem; width: 16px; height: 16px; line-height: 16px;">star</mat-icon>
                    <span>Set Primary</span>
                  </button>
                  <button type="button" class="ai-card-btn edit-btn" (click)="openEditModal(p, idx)">
                    <mat-icon style="font-size: 1rem; width: 16px; height: 16px; line-height: 16px;">edit</mat-icon>
                    <span>Edit</span>
                  </button>
                  <button type="button" class="ai-card-btn remove-btn" (click)="removeProvider(idx)" title="Remove Provider">
                    <mat-icon style="font-size: 1.1rem; width: 18px; height: 18px; line-height: 18px; margin: 0;">delete</mat-icon>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- CARD 5: File Upload Categories -->
          <div class="tab-content" [class.active]="activeTab === 'case_category'">
            <div class="config-card glass-panel" style="padding: 1.5rem; display: flex; flex-direction: column;">
              <div style="margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.08)); padding-bottom: 1rem;">
                <div style="display: flex; gap: 1rem; align-items: center;">
                  <mat-icon class="header-icon" style="color: var(--primary-color, #6366f1);">category</mat-icon>
                  <div>
                    <h3 style="margin: 0; color: var(--primary-color, #6366f1); font-size: 1.3rem;">File Upload Categories</h3>
                    <p style="color: var(--text-muted); font-size: 0.95rem; margin: 0.25rem 0 0 0;">Configure categories (e.g. Lab Report, Patient Report), allowed file formats, and AI extraction.</p>
                  </div>
                </div>
                <button type="button" class="btn-primary" style="padding: 0.5rem 1rem !important; font-size: 0.88rem !important; display: flex; align-items: center; gap: 0.35rem; white-space: nowrap;" (click)="openCategoryModal()">
                  <mat-icon>add</mat-icon>
                  <span>Add File Upload Category</span>
                </button>
              </div>

              <!-- Sleek Table/Grid for Categories -->
              <div class="custom-grid-container" style="overflow-x: auto;">
                <table class="premium-table">
                  <thead>
                    <tr>
                      <th>Category Name</th>
                      <th>Allowed Extensions</th>
                      <th>Max Docs</th>
                      <th>Max Size</th>
                      <th>AI Extraction</th>
                      <th>AI Providers</th>
                      <th style="text-align: right;">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let cat of fileUploadCategories; let idx = index" class="table-row">
                      <td class="font-semibold">
                        <div>{{ cat.name }}</div>
                        <small style="color: var(--text-muted); font-size: 0.78rem; font-family: monospace;">ID: {{ cat.id }}</small>
                      </td>
                      <td>
                        <span class="extension-tag" *ngFor="let ext of cat.allowed_extensions.split(',')">{{ ext }}</span>
                      </td>
                      <td>
                        <span style="font-weight: 500; font-size: 0.9rem;">{{ cat.max_doc_limit || 5 }}</span>
                      </td>
                      <td>
                        <span style="font-weight: 500; font-size: 0.9rem;">{{ cat.max_file_size_mb || 10 }} MB</span>
                      </td>
                      <td>
                        <span class="status-badge" [class.active]="cat.ai_description">
                          {{ cat.ai_description ? 'Enabled' : 'Disabled' }}
                        </span>
                      </td>
                      <td>
                        <span class="provider-pill" *ngFor="let prov of cat.ai_providers">
                          {{ prov === 'gemini' ? 'Gemini' : (prov === 'openai' ? 'OpenAI' : (prov === 'claude' ? 'Claude' : (prov === 'ollama' ? 'Ollama' : (prov === 'grok' ? 'Grok' : prov)))) }}
                        </span>
                        <span *ngIf="!cat.ai_description || !cat.ai_providers || cat.ai_providers.length === 0" style="color: var(--text-muted); font-style: italic; font-size: 0.85rem;">None</span>
                      </td>
                      <td style="text-align: right;">
                        <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                          <button type="button" class="action-btn edit" (click)="openCategoryModal(cat, idx)" title="Edit Category">
                            <mat-icon style="font-size: 1.1rem; width: 18px; height: 18px;">edit</mat-icon>
                          </button>
                          <button type="button" class="action-btn delete" (click)="removeCategory(idx)" title="Delete Category">
                            <mat-icon style="font-size: 1.1rem; width: 18px; height: 18px;">delete</mat-icon>
                          </button>
                        </div>
                      </td>
                    </tr>
                    <tr *ngIf="fileUploadCategories.length === 0">
                      <td colspan="7" style="text-align: center; padding: 3rem; color: var(--text-muted);">
                        No file upload categories configured. Click "Add Category" to create one.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div class="form-actions">
            <button type="submit" [disabled]="saving || configForm.invalid" class="btn-primary">
              <mat-icon *ngIf="!saving">save</mat-icon>
              <mat-icon *ngIf="saving" class="spin-icon">sync</mat-icon>
              <span>{{ saving ? 'Saving Configurations...' : 'Save Settings' }}</span>
            </button>
          </div>

        </form>
      </div>
    </div>

    <!-- AI Add/Edit Modal Dialog -->
    <div class="modal-backdrop" *ngIf="showAiModal">
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>{{ isEditing ? 'Edit AI Provider' : 'Add AI Provider' }}</h3>
          <button type="button" class="modal-close-btn" (click)="showAiModal = false">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label>AI Model Provider</label>
            <select class="form-input" [(ngModel)]="aiModalData.provider" [disabled]="isEditing">
              <option value="gemini">Google Gemini</option>
              <option value="openai">OpenAI (GPT Models)</option>
              <option value="claude">Anthropic Claude</option>
              <option value="ollama">Ollama (Local Models)</option>
              <option value="grok">xAI Grok</option>
              <option value="custom">Custom Endpoint Provider</option>
            </select>
          </div>

          <div class="form-group">
            <label>API Connection Endpoint</label>
            <input type="text" class="form-input" [(ngModel)]="aiModalData.endpoint" placeholder="e.g. https://api.gemini.com/v1">
          </div>

          <div class="form-group">
            <label>Authorization API Token / Key</label>
            <input type="password" class="form-input" [(ngModel)]="aiModalData.token" placeholder="Enter API Token">
          </div>

          <div class="form-row" style="display: flex; gap: 1.5rem; align-items: center;">
            <div class="form-group" style="flex: 1; margin: 0;">
              <label>Max Queries per Day</label>
              <input type="number" class="form-input" [(ngModel)]="aiModalData.max_usage_per_day" min="1">
            </div>
            
            <div class="form-group toggle-group" style="flex: 1; border: none; background: transparent; padding: 0; margin: 0;">
              <label class="toggle-label" style="cursor: pointer;">
                <span class="label-title" style="font-size: 0.85rem;">Enabled</span>
                <span class="label-desc" style="font-size: 0.75rem;">Allow workflow integration</span>
              </label>
              <input type="checkbox" [(ngModel)]="aiModalData.active" class="toggle-switch">
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-secondary" style="padding: 0.5rem 1.25rem !important;" (click)="showAiModal = false">Cancel</button>
          <button type="button" class="btn-primary" style="padding: 0.5rem 1.25rem !important;" (click)="saveModalData()">
            <span>{{ isEditing ? 'Update Configuration' : 'Add Configuration' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- File Upload Category Add/Edit Modal Dialog -->
    <div class="modal-backdrop" *ngIf="showCategoryModal">
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>{{ isEditingCategory ? 'Edit File Upload Category' : 'Add File Upload Category' }}</h3>
          <button type="button" class="modal-close-btn" (click)="showCategoryModal = false">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <div class="modal-body" style="padding: 1.5rem 0;">
          <div class="form-group" style="margin-bottom: 1.25rem;">
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; font-size: 0.9rem; color: var(--text-main);">Category Name</label>
            <input type="text" class="form-input" [(ngModel)]="categoryModalData.name" (ngModelChange)="onCategoryNameChange($event)" placeholder="e.g. Lab Report, Patient Report" style="width: 100%; box-sizing: border-box; padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08)); background: var(--hover-bg, rgba(255,255,255,0.02)); color: var(--text-main);">
          </div>

          <div class="form-group" style="margin-bottom: 1.25rem;">
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; font-size: 0.9rem; color: var(--text-main);">Category ID (Must be Unique)</label>
            <input type="text" class="form-input" [(ngModel)]="categoryModalData.id" (ngModelChange)="validateCategoryId()" placeholder="e.g. lab_report" style="width: 100%; box-sizing: border-box; padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08)); background: var(--hover-bg, rgba(255,255,255,0.02)); color: var(--text-main); font-family: monospace;" [disabled]="isEditingCategory">
            <small *ngIf="isCategoryIdDuplicate" style="color: #ef4444; font-size: 0.8rem; margin-top: 0.25rem; display: block; font-weight: 500;">
              * This Category ID is already taken. Please enter a unique ID.
            </small>
          </div>

          <div class="form-group" style="margin-bottom: 1.25rem;">
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; font-size: 0.9rem; color: var(--text-main);">Allowed Extensions</label>
            
            <div class="chips-container" style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-color, rgba(255,255,255,0.08)); border-radius: 8px; padding: 0.75rem; min-height: 45px; display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; margin-bottom: 0.75rem;">
              <span class="ext-chip" *ngFor="let ext of categoryModalData.allowed_extensions" style="display: inline-flex; align-items: center; gap: 0.25rem; background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 6px; padding: 0.3rem 0.6rem; font-size: 0.82rem; font-weight: 500; color: #a5b4fc;">
                {{ ext }}
                <mat-icon class="remove-chip-icon" style="font-size: 1rem; width: 16px; height: 16px; line-height: 16px; cursor: pointer; opacity: 0.7; transition: opacity 0.2s;" (click)="removeCategoryExt(ext)">close</mat-icon>
              </span>
              <span class="no-chips" *ngIf="categoryModalData.allowed_extensions.length === 0" style="color: var(--text-muted); font-size: 0.85rem; font-style: italic;">No extensions added.</span>
            </div>

            <!-- Custom Input & Quick Add for category extensions -->
            <div class="custom-add-area" style="margin-bottom: 0.5rem; display: flex; gap: 0.5rem; align-items: center;">
              <input type="text" #catExtInput class="form-input add-input" placeholder="e.g. .pdf, .xls" style="flex: 1; min-width: 120px;" (keydown.enter)="$event.preventDefault(); addCategoryExt(catExtInput.value); catExtInput.value=''">
              <button type="button" class="btn-primary" style="padding: 0.5rem 1.25rem !important; font-size: 0.88rem !important; height: 38px; flex-shrink: 0; box-shadow: none;" (click)="addCategoryExt(catExtInput.value); catExtInput.value=''">
                <mat-icon style="font-size: 1.1rem; width: 18px; height: 18px; margin-right: 0.25rem;">add</mat-icon>
                <span>Add</span>
              </button>
            </div>
            <div style="display: flex; gap: 0.35rem; flex-wrap: wrap; align-items: center;">
              <span style="font-size: 0.8rem; color: var(--text-muted); margin-right: 0.25rem;">Quick Add:</span>
              <button type="button" *ngFor="let qe of quickExts" [disabled]="categoryModalData.allowed_extensions.includes(qe)" (click)="addCategoryExt(qe)" style="font-size: 0.75rem; padding: 0.2rem 0.45rem; border: 1px solid var(--border-color, rgba(255,255,255,0.08)); border-radius: 4px; background: rgba(255,255,255,0.02); color: var(--text-muted); cursor: pointer; transition: all 0.2s;" [style.opacity]="categoryModalData.allowed_extensions.includes(qe) ? '0.4' : '1'">
                {{ qe.toUpperCase().replace('.', '') }}
              </button>
            </div>
          </div>

          <div style="display: flex; gap: 1rem; margin-bottom: 1.25rem;">
            <div class="form-group" style="flex: 1; margin-bottom: 0;">
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; font-size: 0.9rem; color: var(--text-main);">Max Document Count Limit</label>
              <input type="number" class="form-input" [(ngModel)]="categoryModalData.max_doc_limit" min="1" placeholder="e.g. 5" style="width: 100%; box-sizing: border-box; padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08)); background: var(--hover-bg, rgba(255,255,255,0.02)); color: var(--text-main);">
            </div>
            <div class="form-group" style="flex: 1; margin-bottom: 0;">
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; font-size: 0.9rem; color: var(--text-main);">File Size Limit (MB)</label>
              <input type="number" class="form-input" [(ngModel)]="categoryModalData.max_file_size_mb" min="1" placeholder="e.g. 10" style="width: 100%; box-sizing: border-box; padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08)); background: var(--hover-bg, rgba(255,255,255,0.02)); color: var(--text-main);">
            </div>
          </div>

          <div class="form-group toggle-group" style="margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between; padding: 0.75rem; border-radius: 8px; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-color, rgba(255, 255, 255, 0.05));">
            <label class="toggle-label" style="cursor: pointer; display: flex; flex-direction: column; gap: 0.15rem;">
              <span class="label-title" style="font-weight: 500; font-size: 0.9rem; color: var(--text-main);">AI Extraction Enabled</span>
              <span class="label-desc" style="font-size: 0.8rem; color: var(--text-muted);">Automatically extract fields using AI models</span>
            </label>
            <input type="checkbox" [(ngModel)]="categoryModalData.ai_description" class="toggle-switch" style="width: 44px; height: 22px; cursor: pointer;">
          </div>

          <div class="form-group" *ngIf="categoryModalData.ai_description" style="margin-bottom: 1.25rem;">
            <label style="display: block; margin-bottom: 0.75rem; font-weight: 500; font-size: 0.9rem; color: var(--text-main);">Select AI Providers (Select atleast one)</label>
            <div class="provider-chips-grid">
              <div *ngFor="let provider of availableProviders" 
                   class="provider-select-chip" 
                   [class.selected]="categoryModalData.ai_providers.includes(provider.id)"
                   (click)="toggleProviderSelection(provider.id)">
                <mat-icon class="chip-check" *ngIf="categoryModalData.ai_providers.includes(provider.id)" style="margin-right: 0.25rem;">check</mat-icon>
                <span>{{ provider.name }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-secondary" style="padding: 0.5rem 1.25rem !important;" (click)="showCategoryModal = false">Cancel</button>
          <button type="button" class="btn-primary" style="padding: 0.5rem 1.25rem !important;" [disabled]="!categoryModalData.name || !categoryModalData.id || isCategoryIdDuplicate || categoryModalData.allowed_extensions.length === 0" (click)="saveCategoryModalData()">
            <span>{{ isEditingCategory ? 'Update Category' : 'Add File Upload Category' }}</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .config-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem 1.5rem;
    }
    .config-header {
      margin-bottom: 2.5rem;
    }
    .config-header h2 {
      font-size: 2.2rem;
      font-weight: 800;
      color: var(--primary-color, #6366f1);
      margin-bottom: 0.5rem;
      letter-spacing: -0.025em;
    }
    .config-header p {
      color: var(--text-muted, #94a3b8);
      font-size: 1.05rem;
    }
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 5rem 0;
      color: var(--text-muted, #94a3b8);
      font-size: 1.1rem;
    }
    .spin-icon {
      animation: spin 1.5s linear infinite;
      width: 24px;
      height: 24px;
    }
    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    /* Side Content layout */
    .config-layout {
      display: flex;
      gap: 2rem;
      align-items: flex-start;
    }
    .config-sidebar {
      width: 280px;
      flex-shrink: 0;
      border-radius: 12px;
      border: 1px solid var(--border-color, rgba(255,255,255,0.08));
      background: var(--glass-bg, rgba(15, 23, 42, 0.45));
      backdrop-filter: blur(16px);
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .sidebar-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: transparent;
      border: none;
      border-radius: 8px;
      padding: 0.85rem 1rem;
      color: var(--text-muted, #94a3b8);
      cursor: pointer;
      text-align: left;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      width: 100%;
    }
    .sidebar-item:hover {
      color: var(--text-main, #f8fafc);
      background: var(--hover-bg, rgba(255, 255, 255, 0.03));
    }
    .sidebar-item.active {
      color: var(--primary-color, #6366f1);
      background: rgba(99, 102, 241, 0.08);
      box-shadow: inset 3px 0 0 var(--primary-color, #6366f1);
    }
    .sidebar-icon {
      font-size: 1.5rem;
      width: 24px;
      height: 24px;
    }
    .sidebar-text {
      display: flex;
      flex-direction: column;
    }
    .sidebar-title {
      font-weight: 700;
      font-size: 0.92rem;
    }
    .sidebar-subtitle {
      font-size: 0.74rem;
      opacity: 0.6;
      font-weight: 400;
      margin-top: 0.1rem;
    }

    .config-main-content {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      gap: 2rem;
      min-width: 0;
    }

    .config-card {
      border-radius: 12px;
      border: 1px solid var(--border-color, rgba(255,255,255,0.08));
      background: var(--glass-bg, rgba(15, 23, 42, 0.45));
      backdrop-filter: blur(16px);
      transition: border-color 0.3s ease;
    }
    .config-card:hover {
      border-color: rgba(99, 102, 241, 0.25);
    }
    .card-header {
      padding: 1.5rem;
      border-bottom: 1px solid var(--border-color, rgba(255,255,255,0.08));
      display: flex;
      gap: 1rem;
      align-items: center;
    }
    .header-icon {
      font-size: 2rem;
      width: 32px;
      height: 32px;
      color: var(--primary-color, #6366f1);
    }
    .header-text h3 {
      font-size: 1.25rem;
      font-weight: 700;
      margin: 0;
      color: var(--text-main, #f8fafc);
    }
    .header-text p {
      font-size: 0.88rem;
      color: var(--text-muted, #94a3b8);
      margin: 0.15rem 0 0 0;
    }
    .card-body {
      padding: 1.75rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .form-row {
      display: flex;
      gap: 1.5rem;
      flex-wrap: wrap;
    }
    .form-row-center {
      display: flex;
      gap: 1.5rem;
      flex-wrap: wrap;
      align-items: center;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .flex-1 {
      flex: 1;
      min-width: 200px;
    }
    label {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-muted, #cbd5e1);
    }
    .form-input {
      background: var(--hover-bg, rgba(0, 0, 0, 0.2));
      border: 1px solid var(--border-color, rgba(255,255,255,0.08));
      border-radius: 8px;
      padding: 0.75rem 1rem;
      color: var(--text-main, #f8fafc);
      font-size: 0.95rem;
      outline: none;
      transition: all 0.2s ease;
      width: 100%;
      box-sizing: border-box;
    }
    .form-input:focus {
      border-color: var(--primary-color, #6366f1);
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
    }
    select.form-input {
      cursor: pointer;
    }
    select.form-input option {
      background: #0f172a;
      color: #f8fafc;
    }
    .toggle-group {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      background: var(--hover-bg, rgba(0,0,0,0.15));
      border: 1px solid var(--border-color, rgba(255,255,255,0.08));
      border-radius: 8px;
      padding: 1rem;
      flex: 1;
      min-width: 250px;
    }
    .toggle-label {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      cursor: pointer;
    }
    .label-title {
      font-size: 0.92rem;
      font-weight: 700;
      color: var(--text-main, #f8fafc);
    }
    .label-desc {
      font-size: 0.8rem;
      color: var(--text-muted, #94a3b8);
      font-weight: 400;
    }
    .toggle-switch {
      width: 44px;
      height: 22px;
      appearance: none;
      background: #475569;
      border-radius: 20px;
      position: relative;
      cursor: pointer;
      outline: none;
      transition: background 0.3s;
      flex-shrink: 0;
    }
    .toggle-switch:checked {
      background: var(--primary-color, #6366f1);
    }
    .toggle-switch::before {
      content: '';
      position: absolute;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #ffffff;
      top: 2px;
      left: 2px;
      transition: transform 0.3s;
    }
    .toggle-switch:checked::before {
      transform: translateX(22px);
    }

    /* Uploader controls */
    .image-uploader-box {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      background: var(--hover-bg, rgba(0, 0, 0, 0.15));
      border: 1px solid var(--border-color, rgba(255,255,255,0.08));
      border-radius: 8px;
      padding: 1rem;
    }
    .image-preview {
      width: 60px;
      height: 60px;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      background: #000;
      flex-shrink: 0;
    }
    .image-preview img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .rect-preview {
      width: 120px;
      height: 60px;
    }
    .uploader-controls {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      flex-grow: 1;
      min-width: 0;
    }
    .path-display {
      font-size: 0.8rem;
      color: var(--text-muted, #94a3b8);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .uploader-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      align-self: flex-start;
      padding: 0.4rem 1rem !important;
      font-size: 0.8rem !important;
      cursor: pointer;
    }

    /* AI Status badge */
    .ai-status-badge {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.85rem 1.25rem;
      border-radius: 8px;
      border: 1px solid transparent;
    }
    .ai-status-badge.healthy {
      background: rgba(16, 185, 129, 0.1);
      border-color: rgba(16, 185, 129, 0.2);
      color: #10b981;
    }
    .ai-status-badge.deactivated {
      background: rgba(239, 68, 68, 0.1);
      border-color: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }
    .badge-icon {
      font-size: 2rem;
      width: 32px;
      height: 32px;
    }
    .badge-texts {
      display: flex;
      flex-direction: column;
    }
    .badge-main {
      font-weight: 700;
      font-size: 0.95rem;
    }
    .badge-detail {
      font-size: 0.8rem;
      opacity: 0.8;
      font-weight: 400;
    }

    /* AI Provider Grid & Card Styling */
    .ai-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    .ai-card {
      background: var(--glass-bg, rgba(15, 23, 42, 0.45));
      border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
      border-radius: 12px;
      backdrop-filter: blur(16px);
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
      min-height: 220px;
    }
    .ai-card:hover {
      transform: translateY(-4px);
      border-color: rgba(99, 102, 241, 0.3);
      box-shadow: 0 10px 20px -10px rgba(99, 102, 241, 0.15);
    }
    .ai-card.primary {
      border-color: var(--primary-color, #6366f1);
      box-shadow: 0 0 12px rgba(99, 102, 241, 0.15);
    }
    .ai-card-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 1rem;
    }
    .ai-card-title {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .ai-card-title h4 {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text-main, #f8fafc);
      text-transform: capitalize;
    }
    .ai-primary-badge {
      background: var(--primary-color, #6366f1);
      color: #ffffff;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .ai-card-stats {
      background: rgba(0, 0, 0, 0.15);
      border-radius: 8px;
      padding: 0.75rem 1rem;
      margin-bottom: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .ai-stat-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.85rem;
    }
    .ai-stat-label {
      color: var(--text-muted, #94a3b8);
    }
    .ai-stat-value {
      color: var(--text-main, #f8fafc);
      font-weight: 600;
    }
    .ai-progress-bar-container {
      width: 100%;
      height: 6px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 3px;
      overflow: hidden;
      margin-top: 0.25rem;
    }
    .ai-progress-bar {
      height: 100%;
      background: var(--primary-color, #6366f1);
      border-radius: 3px;
      transition: width 0.4s ease;
    }
    .ai-card-actions {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      margin-top: auto;
    }
    .ai-card-btn {
      flex: 1;
      padding: 0.5rem;
      font-size: 0.82rem;
      font-weight: 600;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.2s;
    }
    .ai-card-btn.primary-btn {
      background: rgba(99, 102, 241, 0.1);
      color: var(--primary-color, #6366f1);
      border-color: rgba(99, 102, 241, 0.2);
    }
    .ai-card-btn.primary-btn:hover {
      background: var(--primary-color, #6366f1);
      color: #ffffff;
    }
    .ai-card-btn.edit-btn {
      background: rgba(255, 255, 255, 0.03);
      color: var(--text-main, #f8fafc);
      border-color: rgba(255, 255, 255, 0.08);
    }
    .ai-card-btn.edit-btn:hover {
      background: rgba(255, 255, 255, 0.08);
    }
    .ai-card-btn.remove-btn {
      background: rgba(239, 68, 68, 0.08);
      color: #ef4444;
      border-color: rgba(239, 68, 68, 0.15);
      max-width: 40px;
    }
    .ai-card-btn.remove-btn:hover {
      background: #ef4444;
      color: #ffffff;
    }

    /* Modal Backdrop and Box */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(8px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.2s ease;
    }
    .modal-dialog {
      width: 500px;
      max-width: 90%;
      max-height: 90vh;
      overflow-y: auto;
      background: rgba(15, 23, 42, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      padding: 1.5rem;
      animation: scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .modal-header h3 {
      margin: 0;
      font-size: 1.4rem;
      font-weight: 800;
      color: var(--primary-color, #6366f1);
    }
    .modal-close-btn {
      background: transparent;
      border: none;
      color: var(--text-muted, #94a3b8);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.25rem;
      border-radius: 50%;
      transition: all 0.15s;
    }
    .modal-close-btn:hover {
      background: rgba(255,255,255,0.08);
      color: var(--text-main, #f8fafc);
    }
    .modal-body {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      margin-top: 0.5rem;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes scaleUp {
      from { transform: scale(0.9); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    /* ── Light Mode Override (morning theme) for AI Cards & Modal ── */
    :host-context([data-theme="morning"]) .modal-backdrop {
      background: rgba(15, 23, 42, 0.25);
    }
    :host-context([data-theme="morning"]) .modal-dialog {
      background: #ffffff;
      border-color: rgba(15, 23, 42, 0.08);
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    }
    :host-context([data-theme="morning"]) .modal-header h3 {
      color: var(--primary-color, #1a73e8);
    }
    :host-context([data-theme="morning"]) .modal-close-btn:hover {
      background: rgba(15, 23, 42, 0.05);
      color: var(--text-main);
    }
    :host-context([data-theme="morning"]) select.form-input option {
      background-color: #ffffff;
      color: #0f172a;
    }
    :host-context([data-theme="morning"]) .toggle-switch {
      background: #cbd5e1;
    }
    :host-context([data-theme="morning"]) .toggle-switch:checked {
      background: var(--primary-color, #1a73e8);
    }
    :host-context([data-theme="morning"]) .ai-card-stats {
      background: rgba(15, 23, 42, 0.04);
    }
    :host-context([data-theme="morning"]) .ai-progress-bar-container {
      background: rgba(15, 23, 42, 0.08);
    }
    :host-context([data-theme="morning"]) .ai-card-btn.edit-btn {
      background: rgba(15, 23, 42, 0.03);
      border-color: rgba(15, 23, 42, 0.08);
    }
    :host-context([data-theme="morning"]) .ai-card-btn.edit-btn:hover {
      background: rgba(15, 23, 42, 0.06);
    }

    /* Premium Table Styling */
    .premium-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      color: var(--text-main, #f8fafc);
      font-size: 0.92rem;
    }
    .premium-table th {
      background: rgba(255, 255, 255, 0.02);
      border-bottom: 2px solid var(--border-color, rgba(255, 255, 255, 0.08));
      padding: 1rem;
      font-weight: 700;
      text-align: left;
      color: var(--primary-color, #6366f1);
      text-transform: uppercase;
      font-size: 0.78rem;
      letter-spacing: 0.05em;
    }
    .premium-table td {
      padding: 1rem;
      border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.05));
      vertical-align: middle;
    }
    .table-row {
      transition: background-color 0.2s ease;
    }
    .table-row:hover {
      background-color: rgba(255, 255, 255, 0.02);
    }
    .font-semibold {
      font-weight: 600;
    }
    .extension-tag {
      display: inline-block;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      padding: 0.15rem 0.4rem;
      font-size: 0.78rem;
      margin-right: 0.35rem;
      margin-bottom: 0.25rem;
      color: #94a3b8;
    }
    .status-badge {
      display: inline-block;
      padding: 0.25rem 0.6rem;
      border-radius: 9999px;
      font-size: 0.78rem;
      font-weight: 600;
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.2);
    }
    .status-badge.active {
      background: rgba(16, 185, 129, 0.1);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.2);
    }
    .provider-pill {
      display: inline-block;
      background: rgba(99, 102, 241, 0.1);
      border: 1px solid rgba(99, 102, 241, 0.2);
      color: #a5b4fc;
      border-radius: 9999px;
      padding: 0.15rem 0.5rem;
      font-size: 0.78rem;
      margin-right: 0.35rem;
      margin-bottom: 0.25rem;
      font-weight: 500;
    }
    .action-btn {
      background: transparent;
      border: none;
      border-radius: 6px;
      padding: 0.35rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      color: var(--text-muted, #94a3b8);
    }
    .action-btn:hover {
      background: rgba(255, 255, 255, 0.05);
    }
    .action-btn.edit:hover {
      color: var(--primary-color, #6366f1);
    }
    .action-btn.delete:hover {
      color: #ef4444;
      background: rgba(239, 68, 68, 0.08);
    }
    
    /* Multiselect Provider Chips */
    .provider-chips-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 0.75rem;
      margin-top: 0.5rem;
    }
    .provider-select-chip {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 0.6rem 0.85rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      transition: all 0.2s ease;
      user-select: none;
    }
    .provider-select-chip:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.15);
    }
    .provider-select-chip.selected {
      background: rgba(99, 102, 241, 0.12);
      border-color: var(--primary-color, #6366f1);
      color: #a5b4fc;
    }
    .chip-check {
      font-size: 1.1rem;
      width: 18px;
      height: 18px;
      line-height: 18px;
      color: var(--primary-color, #6366f1);
    }

    /* Light mode override */
    :host-context([data-theme="morning"]) .premium-table {
      color: #0f172a;
    }
    :host-context([data-theme="morning"]) .premium-table th {
      background: rgba(0, 0, 0, 0.02);
      border-bottom: 2px solid rgba(0, 0, 0, 0.06);
    }
    :host-context([data-theme="morning"]) .premium-table td {
      border-bottom: 1px solid rgba(0, 0, 0, 0.04);
    }
    :host-context([data-theme="morning"]) .table-row:hover {
      background-color: rgba(0, 0, 0, 0.02);
    }
    :host-context([data-theme="morning"]) .extension-tag {
      background: rgba(0, 0, 0, 0.03);
      border: 1px solid rgba(0, 0, 0, 0.06);
      color: #64748b;
    }
    :host-context([data-theme="morning"]) .provider-select-chip {
      background: rgba(0, 0, 0, 0.01);
      border-color: rgba(0, 0, 0, 0.06);
    }
    :host-context([data-theme="morning"]) .provider-select-chip:hover {
      background: rgba(0, 0, 0, 0.03);
      border-color: rgba(0, 0, 0, 0.1);
    }
    :host-context([data-theme="morning"]) .provider-select-chip.selected {
      background: rgba(26, 115, 232, 0.08);
      border-color: var(--primary-color, #1a73e8);
      color: #1a73e8;
    }


    .chips-container {
      background: var(--hover-bg, rgba(0, 0, 0, 0.2));
      border: 1px solid var(--border-color, rgba(255,255,255,0.08));
      border-radius: 8px;
      padding: 0.75rem;
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      min-height: 50px;
      align-items: center;
    }
    .ext-chip {
      background: rgba(99, 102, 241, 0.12);
      border: 1px solid rgba(99, 102, 241, 0.25);
      color: #a5b4fc;
      padding: 0.35rem 0.65rem;
      border-radius: 6px;
      font-size: 0.82rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.35rem;
      transition: background 0.2s;
    }
    .ext-chip:hover {
      background: rgba(99, 102, 241, 0.2);
    }
    .remove-chip-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      cursor: pointer;
      transition: color 0.15s;
    }
    .remove-chip-icon:hover {
      color: #ef4444;
    }
    .no-chips {
      font-size: 0.85rem;
      color: var(--text-muted, #94a3b8);
      font-style: italic;
    }
    .quick-add-area {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      background: var(--hover-bg, rgba(255,255,255,0.02));
      border: 1px solid var(--border-color, rgba(255,255,255,0.08));
      border-radius: 8px;
      padding: 0.75rem 1rem;
      margin: 0.5rem 0;
    }
    .quick-label {
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--text-muted, #94a3b8);
    }
    .quick-buttons {
      display: flex;
      gap: 0.4rem;
      flex-wrap: wrap;
    }
    .btn-quick {
      background: var(--hover-bg, rgba(255,255,255,0.04));
      border: 1px solid var(--border-color, rgba(255,255,255,0.08));
      color: var(--text-muted, #cbd5e1);
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-quick:hover {
      background: rgba(99, 102, 241, 0.1);
      border-color: rgba(99, 102, 241, 0.3);
      color: var(--primary-color, #6366f1);
    }
    .btn-quick:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .custom-add-area {
      display: flex;
      gap: 0.5rem;
    }
    .add-input {
      max-width: 250px;
    }
    .btn-secondary {
      background: transparent;
      border: 1px solid var(--border-color, rgba(255,255,255,0.08));
      border-radius: 8px;
      padding: 0.75rem 1.25rem;
      color: var(--text-main, #cbd5e1);
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn-secondary:hover {
      background: var(--hover-bg, rgba(255,255,255,0.03));
    }
    .form-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 1rem;
    }
    .btn-primary {
      background: var(--primary-color, #6366f1);
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 0.85rem 2rem;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
      transition: all 0.2s ease;
    }
    .btn-primary:hover {
      background: #4f46e5;
      transform: translateY(-1px);
    }
    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none !important;
    }
    
    .tab-content {
      display: none;
      animation: fadeScale 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }
    .tab-content.active {
      display: block;
    }
    @keyframes fadeScale {
      0% {
        opacity: 0;
        transform: scale(0.97) translateY(8px);
      }
      100% {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }
  `]
})
export class GlobalConfigComponent implements OnInit {
  private fb = inject(FormBuilder);
  private settingsService = inject(SettingsService);
  private dialogService = inject(DialogService);
  private dataService = inject(DataService);
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  saving = false;
  configForm!: FormGroup;
  settingsRecord: any = null;
  activeTab: 'platform' | 'security' | 'asset' | 'ai' | 'case_category' = 'platform';

  imageHost = environment.ImageBaseUrl;
  allowedExts: string[] = [];
  quickExts: string[] = ['.png', '.pdf', '.doc', '.docx', '.ppt', '.jpg', '.jpeg', '.mp4', '.mp3', '.svg', '.mov'];
  aiProviders: any[] = [];
  showAiModal = false;
  isEditing = false;
  editIndex = -1;
  aiModalData: any = {
    provider: 'gemini',
    endpoint: '',
    token: '',
    max_usage_per_day: 1000,
    active: true,
    consecutive_errors: 0,
    total_usage_count: 0,
    today_usage_count: 0
  };

  fileUploadCategories: any[] = [];
  showCategoryModal = false;
  isEditingCategory = false;
  categoryEditingIndex = -1;
  isCategoryIdDuplicate = false;
  categoryModalData: any = {
    id: '',
    name: '',
    allowed_extensions: '.pdf,.png,.jpeg,.jpg',
    ai_description: false,
    ai_providers: []
  };

  availableProviders = [
    { id: 'gemini', name: 'Google Gemini' },
    { id: 'openai', name: 'OpenAI' },
    { id: 'claude', name: 'Anthropic Claude' },
    { id: 'ollama', name: 'Ollama (Local)' },
    { id: 'grok', name: 'xAI Grok' }
  ];

  ngOnInit(): void {
    this.loadSettings();
  }

  openCategoryModal(cat?: any, index?: number): void {
    this.isCategoryIdDuplicate = false;
    if (cat) {
      this.isEditingCategory = true;
      this.categoryEditingIndex = index !== undefined ? index : -1;
      this.categoryModalData = {
        id: cat.id || '',
        name: cat.name || '',
        allowed_extensions: cat.allowed_extensions ? cat.allowed_extensions.split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean) : [],
        ai_description: !!cat.ai_description,
        ai_providers: Array.isArray(cat.ai_providers) ? [...cat.ai_providers] : [],
        max_doc_limit: cat.max_doc_limit !== undefined ? cat.max_doc_limit : 5,
        max_file_size_mb: cat.max_file_size_mb !== undefined ? cat.max_file_size_mb : 10
      };
    } else {
      this.isEditingCategory = false;
      this.categoryEditingIndex = -1;
      this.categoryModalData = {
        id: '',
        name: '',
        allowed_extensions: ['.pdf', '.png', '.jpeg', '.jpg'],
        ai_description: false,
        ai_providers: [],
        max_doc_limit: 5,
        max_file_size_mb: 10
      };
    }
    this.showCategoryModal = true;
    this.cdr.detectChanges();
  }

  onCategoryNameChange(name: string): void {
    if (!this.isEditingCategory) {
      this.categoryModalData.id = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      this.validateCategoryId();
    }
  }

  validateCategoryId(): void {
    const currentId = this.categoryModalData.id?.trim().toLowerCase();
    if (!currentId) {
      this.isCategoryIdDuplicate = false;
      return;
    }
    this.isCategoryIdDuplicate = this.fileUploadCategories.some((cat, index) => {
      if (this.isEditingCategory && index === this.categoryEditingIndex) {
        return false;
      }
      return cat.id?.trim().toLowerCase() === currentId;
    });
  }

  addCategoryExt(ext: string): void {
    ext = ext.trim().toLowerCase();
    if (!ext) return;
    if (!ext.startsWith('.')) ext = '.' + ext;
    if (!this.categoryModalData.allowed_extensions.includes(ext)) {
      this.categoryModalData.allowed_extensions.push(ext);
    }
    this.cdr.detectChanges();
  }

  removeCategoryExt(ext: string): void {
    this.categoryModalData.allowed_extensions = this.categoryModalData.allowed_extensions.filter((e: string) => e !== ext);
    this.cdr.detectChanges();
  }

  toggleProviderSelection(providerId: string): void {
    const idx = this.categoryModalData.ai_providers.indexOf(providerId);
    if (idx > -1) {
      this.categoryModalData.ai_providers.splice(idx, 1);
    } else {
      this.categoryModalData.ai_providers.push(providerId);
    }
    this.cdr.detectChanges();
  }

  saveCategoryModalData(): void {
    if (!this.categoryModalData.name || !this.categoryModalData.id || this.isCategoryIdDuplicate || this.categoryModalData.allowed_extensions.length === 0) return;
    
    const category = {
      id: this.categoryModalData.id.trim().toLowerCase(),
      name: this.categoryModalData.name,
      allowed_extensions: this.categoryModalData.allowed_extensions.join(','),
      ai_description: this.categoryModalData.ai_description,
      ai_providers: this.categoryModalData.ai_description ? this.categoryModalData.ai_providers : [],
      max_doc_limit: this.categoryModalData.max_doc_limit !== undefined ? Number(this.categoryModalData.max_doc_limit) : 5,
      max_file_size_mb: this.categoryModalData.max_file_size_mb !== undefined ? Number(this.categoryModalData.max_file_size_mb) : 10
    };

    if (this.isEditingCategory && this.categoryEditingIndex > -1) {
      this.fileUploadCategories[this.categoryEditingIndex] = category;
    } else {
      this.fileUploadCategories.push(category);
    }
    
    this.showCategoryModal = false;
    this.cdr.detectChanges();
  }

  removeCategory(index: number): void {
    this.dialogService.confirmationBox('Are you sure you want to delete this category?').afterClosed().subscribe((confirm) => {
      if (confirm) {
        this.fileUploadCategories.splice(index, 1);
        this.cdr.detectChanges();
      }
    });
  }

  loadSettings(): void {
    this.loading = true;
    this.settingsService.loadSettings().subscribe({
      next: (config) => {
        this.settingsRecord = config;
        this.initForm(config);
        if (config?.allowed_extensions) {
          this.allowedExts = config.allowed_extensions
            .split(',')
            .map((e: string) => e.trim().toLowerCase())
            .filter(Boolean);
        } else {
          this.allowedExts = [];
        }

        // Initialize AI providers
        let parsedProviders = [];
        if (config?.ai_providers_config) {
          try {
            parsedProviders = typeof config.ai_providers_config === 'string'
              ? JSON.parse(config.ai_providers_config)
              : config.ai_providers_config;
          } catch (e) {
            console.error('Failed to parse ai_providers_config', e);
          }
        }
        if (!Array.isArray(parsedProviders)) {
          parsedProviders = [];
        }

        const defaultProviders = [
          { provider: 'gemini', endpoint: 'https://generativelanguage.googleapis.com', token: '', max_usage_per_day: 1000, consecutive_errors: 0, active: true, total_usage_count: 0, today_usage_count: 0 },
          { provider: 'openai', endpoint: 'https://api.openai.com/v1', token: '', max_usage_per_day: 500, consecutive_errors: 0, active: false, total_usage_count: 0, today_usage_count: 0 },
          { provider: 'claude', endpoint: 'https://api.anthropic.com/v1', token: '', max_usage_per_day: 500, consecutive_errors: 0, active: false, total_usage_count: 0, today_usage_count: 0 },
          { provider: 'ollama', endpoint: 'http://localhost:11434', token: '', max_usage_per_day: 10000, consecutive_errors: 0, active: false, total_usage_count: 0, today_usage_count: 0 },
          { provider: 'grok', endpoint: 'https://api.x.ai/v1', token: '', max_usage_per_day: 200, consecutive_errors: 0, active: false, total_usage_count: 0, today_usage_count: 0 },
          { provider: 'custom', endpoint: '', token: '', max_usage_per_day: 100, consecutive_errors: 0, active: false, total_usage_count: 0, today_usage_count: 0 }
        ];

        this.aiProviders = defaultProviders.map(def => {
          const existing = parsedProviders.find((p: any) => p.provider === def.provider);
          return existing ? { ...def, ...existing } : def;
        });

        // Initialize File Upload Categories
        let parsedCategories = [];
        if (config?.file_upload_categories_config) {
          try {
            parsedCategories = typeof config.file_upload_categories_config === 'string'
              ? JSON.parse(config.file_upload_categories_config)
              : config.file_upload_categories_config;
          } catch (e) {
            console.error('Failed to parse file_upload_categories_config', e);
          }
        }
        if (!Array.isArray(parsedCategories) || parsedCategories.length === 0) {
          parsedCategories = [
            { id: 'lab_report', name: 'Lab Report', allowed_extensions: '.pdf,.png,.jpeg,.jpg', ai_description: true, ai_providers: ['gemini'], max_doc_limit: 5, max_file_size_mb: 10 },
            { id: 'patient_report', name: 'Patient Report', allowed_extensions: '.pdf,.png,.jpeg,.jpg', ai_description: false, ai_providers: [], max_doc_limit: 5, max_file_size_mb: 10 }
          ];
        }
        // Ensure every loaded category has a unique ID, max_doc_limit, and max_file_size_mb
        parsedCategories.forEach((cat: any) => {
          if (!cat.id) {
            cat.id = (cat.name || '')
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '_')
              .replace(/^_+|_+$/g, '');
          }
          if (cat.max_doc_limit === undefined) {
            cat.max_doc_limit = 5;
          }
          if (cat.max_file_size_mb === undefined) {
            cat.max_file_size_mb = 10;
          }
        });
        this.fileUploadCategories = parsedCategories;

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.dialogService.openSnackBar('Failed to load system configuration.');
        this.loading = false;
      }
    });
  }

  initForm(config: any): void {
    this.configForm = this.fb.group({
      platform_name: [config?.platform_name || '', Validators.required],
      platform_logo: [config?.platform_logo || '', Validators.required],
      loginpage_photo: [config?.loginpage_photo || ''],
      platform_description: [config?.platform_description || ''],
      support_email: [config?.support_email || '', [Validators.required, Validators.email]],
      web_session_timeout: [config?.web_session_timeout || 60, [Validators.required, Validators.min(1)]],
      auto_logout_inactivity: [config?.auto_logout_inactivity || false],
      password_min_length: [config?.password_min_length || 8, [Validators.required, Validators.min(4)]],
      password_require_special: [config?.password_require_special || false],
      password_expiry_mins: [config?.password_expiry_mins || 129600, [Validators.required, Validators.min(1)]],
      default_password_enabled: [config?.default_password_enabled || false],
      default_password_value: [config?.default_password_value || ''],
      max_file_size_mb: [config?.max_file_size_mb || 10, [Validators.required, Validators.min(1)]],
      min_files_per_asset: [config?.min_files_per_asset || 1, [Validators.required, Validators.min(1)]],
      max_files_per_asset: [config?.max_files_per_asset || 3, [Validators.required, Validators.min(1)]],
      storage_provider: [config?.storage_provider || 'LOCAL'],
      storage_base_url: [config?.storage_base_url || ''],
      storage_app_token: [config?.storage_app_token || ''],
      storage_region: [config?.storage_region || ''],
      storage_bucket_name: [config?.storage_bucket_name || ''],
      storage_use_presigned: [config?.storage_use_presigned || false],
      ai_provider: [config?.ai_provider || 'gemini'],
      ai_endpoint: [config?.ai_endpoint || ''],
      ai_token: [config?.ai_token || ''],
      ai_max_usage_per_day: [config?.ai_max_usage_per_day || 100, [Validators.required, Validators.min(1)]],
      ai_active: [config?.ai_active !== false],
      ai_providers_config: [config?.ai_providers_config || '[]'],
      file_upload_categories_config: [config?.file_upload_categories_config || '[]']
    });
  }

  setPrimaryProvider(provider: string): void {
    this.configForm.get('ai_provider')?.setValue(provider);
    const found = this.aiProviders.find(p => p.provider === provider);
    if (found) {
      found.active = true;
    }
    this.cdr.detectChanges();
  }

  getUsagePercent(p: any): number {
    if (!p.max_usage_per_day) return 0;
    return Math.min(100, Math.round(((p.today_usage_count || 0) / p.max_usage_per_day) * 100));
  }

  openAddModal(): void {
    this.isEditing = false;
    this.editIndex = -1;
    this.aiModalData = {
      provider: 'openai',
      endpoint: '',
      token: '',
      max_usage_per_day: 1000,
      active: true,
      consecutive_errors: 0,
      total_usage_count: 0,
      today_usage_count: 0
    };
    this.showAiModal = true;
    this.cdr.detectChanges();
  }

  openEditModal(p: any, index: number): void {
    this.isEditing = true;
    this.editIndex = index;
    this.aiModalData = { ...p };
    this.showAiModal = true;
    this.cdr.detectChanges();
  }

  saveModalData(): void {
    if (this.isEditing && this.editIndex > -1) {
      this.aiProviders[this.editIndex] = { ...this.aiModalData };
    } else {
      // Check if provider already exists in array
      const existingIdx = this.aiProviders.findIndex(p => p.provider === this.aiModalData.provider);
      if (existingIdx > -1) {
        this.aiProviders[existingIdx] = { ...this.aiModalData };
      } else {
        this.aiProviders.push({ ...this.aiModalData });
      }
    }
    this.showAiModal = false;
    this.cdr.detectChanges();
  }

  removeProvider(index: number): void {
    const provider = this.aiProviders[index].provider;
    this.aiProviders.splice(index, 1);
    // If we removed the primary, fall back to the first available provider or clear it
    if (this.configForm.get('ai_provider')?.value === provider) {
      const fallback = this.aiProviders[0]?.provider || '';
      this.configForm.get('ai_provider')?.setValue(fallback);
    }
    this.cdr.detectChanges();
  }

  uploadImage(event: any, fieldKey: string, folder: string): void {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('refId', fieldKey);

    const refId = `${fieldKey}_${Date.now()}`;
    this.dataService.imageupload(folder, refId, formData).subscribe({
      next: (res: any) => {
        if (res?.data?.[0]?.storage_name) {
          const path = res.data[0].storage_name;
          this.configForm.get(fieldKey)?.setValue(path);
          this.dialogService.openSnackBar('Image uploaded successfully.');
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Upload failed', err);
        this.dialogService.openSnackBar('Failed to upload image.');
      }
    });
  }

  addExt(ext: string): void {
    ext = ext.trim().toLowerCase();
    if (!ext) return;
    if (!ext.startsWith('.')) ext = '.' + ext;
    if (!this.allowedExts.includes(ext)) {
      this.allowedExts.push(ext);
    }
  }

  removeExt(ext: string): void {
    this.allowedExts = this.allowedExts.filter(e => e !== ext);
  }

  onSubmit(): void {
    if (this.configForm.invalid) return;

    // Build the AI providers JSON config string
    const aiProvidersJson = JSON.stringify(this.aiProviders);
    this.configForm.get('ai_providers_config')?.setValue(aiProvidersJson);

    // Build File Upload Categories JSON config string
    const categoriesJson = JSON.stringify(this.fileUploadCategories);
    this.configForm.get('file_upload_categories_config')?.setValue(categoriesJson);

    // Sync primary provider fields for backward compatibility
    const formVal = this.configForm.value;
    const primaryCode = formVal.ai_provider || 'gemini';
    const primaryDef = this.aiProviders.find(p => p.provider === primaryCode);
    if (primaryDef) {
      this.configForm.get('ai_endpoint')?.setValue(primaryDef.endpoint || '');
      this.configForm.get('ai_token')?.setValue(primaryDef.token || '');
      this.configForm.get('ai_max_usage_per_day')?.setValue(primaryDef.max_usage_per_day || 100);
      this.configForm.get('ai_active')?.setValue(primaryDef.active);
    }

    this.saving = true;
    const updatedFormVal = this.configForm.value;
    const payload = {
      ...updatedFormVal,
      allowed_extensions: this.allowedExts.join(','),
      version_no: this.settingsRecord?.version_no || 1
    };

    this.settingsService.saveSettings(this.settingsRecord.id, payload).subscribe({
      next: () => {
        this.saving = false;
        this.dialogService.openSnackBar('System configuration saved successfully.');
        this.loadSettings();
      },
      error: (err) => {
        this.saving = false;
        this.dialogService.openSnackBar(err.error?.error || 'Failed to save configuration settings.');
      }
    });
  }
}
