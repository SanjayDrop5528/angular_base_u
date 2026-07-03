import { Component, OnInit, OnDestroy, ViewChild, TemplateRef, inject, ChangeDetectorRef } from '@angular/core';
import { FieldType } from '@ngx-formly/core';
import { FormControl } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DataService } from '../../../core/services/data.service';
import { DialogService } from '../../../core/services/dialog.service';

@Component({
  selector: 'consent-preview',
  standalone: false,
  template: `
    <div class="consent-preview-control">
      <!-- Version upgrade panel shown only in edit/clone modes -->
      @if (model.isEdit || model.isClone) {
        <div class="version-upgrade-section">
          <h4 class="version-section-title">Notice Version Management</h4>
          <div class="version-current-info">
            Current Notice Version: <span class="v-badge">{{ originalVersion }}</span>
          </div>
          <div class="version-cards-container">
            <div class="version-card" [class.active]="selectedVersionType === 'current'" (click)="setVersionOption('current')">
              <div class="v-title">Keep Current</div>
              <div class="v-num">{{ originalVersion }}</div>
            </div>
            <div class="version-card" [class.active]="selectedVersionType === 'minor'" (click)="setVersionOption('minor')">
              <div class="v-title">Minor Option</div>
              <div class="v-num">{{ minorVersionOption }}</div>
            </div>
            <div class="version-card" [class.active]="selectedVersionType === 'major'" (click)="setVersionOption('major')">
              <div class="v-title">Major Option</div>
              <div class="v-num">{{ majorVersionOption }}</div>
            </div>
          </div>
        </div>
      }

      <!-- Preview Button Toggle -->
      <div class="preview-btn-container">
        <button type="button" class="btn-preview-toggle" (click)="togglePreview()">
          <span class="material-icons">{{ showPreviewPanel ? 'visibility_off' : 'visibility' }}</span>
          {{ showPreviewPanel ? 'Hide Live Preview' : 'Show Live Preview' }}
        </button>
      </div>

      <!-- Live Preview Render Box -->
      @if (showPreviewPanel) {
        <div class="preview-panel">
          <div class="preview-panel-header">
            <h3>Live Preview Renderer</h3>
            <p class="preview-desc">This panel dynamically renders token placeholders (e.g. <code>{{ '{{token.name}}' }}</code>) with sample profiles and strips XSS tags.</p>
          </div>

          <div class="preview-container">
            <div class="preview-badge" [ngClass]="model.is_active ? 'badge-active' : 'badge-draft'">
              {{ model.is_active ? 'Active / Public' : 'Draft Mode' }}
            </div>

            <div class="preview-meta">
              <div><strong>Notice Key:</strong> {{ model.key || 'N/A' }}</div>
              <div><strong>Version:</strong> {{ formControl.value || 'N/A' }}</div>
              <div><strong>Display Mode:</strong> {{ model.display_type === 'shortlink' ? 'Short Link' : 'Full Document' }}</div>
            </div>

            <div class="preview-rendered-box">
              <!-- Full Document View -->
              @if (model.display_type !== 'shortlink') {
                <div [innerHTML]="previewContent || '<p class=placeholder-text>Notice template body will render here...</p>'"></div>
              }

              <!-- Short Link View -->
              @if (model.display_type === 'shortlink') {
                <div class="shortlink-preview">
                  <p>Please click the link below to review and accept the notice:</p>
                  <a href="javascript:void(0)" class="consent-hyperlink" (click)="openNoticeInModal($event)">
                    <span class="material-icons">link</span>
                    Click here to read: {{ model.name || 'Consent Notice' }} (v{{ formControl.value }})
                  </a>
                </div>
              }
            </div>

            <div class="preview-actions">
              <button type="button" class="btn-decline" disabled>Decline</button>
              <button type="button" class="btn-accept" disabled>Accept & Continue</button>
            </div>
          </div>
        </div>
      }
    </div>

    <!-- Modal Dialog Template for Short Link Preview -->
    <ng-template #previewDialog>
      <div class="preview-modal-header">
        <h3>{{ model.name || 'Consent Notice' }}</h3>
        <button type="button" class="dialog-close-btn" (click)="closePreviewDialog()">
          <span class="material-icons">close</span>
        </button>
      </div>
      <div class="preview-modal-body" [innerHTML]="previewContent || '<p class=placeholder-text>No notice body provided.</p>'">
      </div>
      <div class="preview-modal-footer">
        <button type="button" class="btn-secondary" (click)="closePreviewDialog()">Close Preview</button>
      </div>
    </ng-template>
  `,
  styles: [`
    .consent-preview-control {
      margin: 1.5rem 0;
      color: #f8fafc;
    }
    .version-upgrade-section {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 1.25rem;
      margin-bottom: 1.5rem;
    }
    .version-section-title {
      font-size: 0.95rem;
      font-weight: 600;
      color: #94a3b8;
      margin: 0 0 0.5rem 0;
    }
    .version-current-info {
      font-size: 0.85rem;
      color: #cbd5e1;
      margin-bottom: 1rem;
    }
    .v-badge {
      background: rgba(99, 102, 241, 0.2);
      color: #818cf8;
      border: 1px solid rgba(99, 102, 241, 0.4);
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      font-weight: 600;
    }
    .version-cards-container {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }
    .version-card {
      background: rgba(15, 23, 42, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 0.75rem;
      text-align: center;
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .version-card:hover {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.15);
    }
    .version-card.active {
      background: rgba(99, 102, 241, 0.15);
      border-color: #6366f1;
      box-shadow: 0 0 12px rgba(99, 102, 241, 0.25);
    }
    .version-card .v-title {
      font-size: 0.75rem;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.25rem;
    }
    .version-card .v-num {
      font-size: 1.1rem;
      font-weight: 700;
      color: #ffffff;
    }
    .version-card.active .v-num {
      color: #818cf8;
    }
    .preview-btn-container {
      margin-bottom: 1.5rem;
    }
    .btn-preview-toggle {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #cbd5e1;
      border-radius: 8px;
      padding: 0.6rem 1.2rem;
      font-weight: 500;
      font-size: 0.88rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-preview-toggle:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.2);
    }
    .preview-panel {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 1.5rem;
      margin-top: 1rem;
    }
    .preview-panel-header h3 {
      font-size: 1.1rem;
      font-weight: 600;
      margin: 0 0 0.25rem 0;
    }
    .preview-desc {
      font-size: 0.82rem;
      color: #64748b;
      margin: 0 0 1.25rem 0;
    }
    .preview-container {
      background: rgba(15, 23, 42, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 12px;
      padding: 1.25rem;
      position: relative;
    }
    .preview-badge {
      position: absolute;
      top: 1.25rem;
      right: 1.25rem;
      font-size: 0.72rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
    }
    .badge-active {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .badge-draft {
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    .preview-meta {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      font-size: 0.8rem;
      color: #94a3b8;
      margin-bottom: 1.25rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      padding-bottom: 0.75rem;
    }
    .preview-rendered-box {
      min-height: 100px;
      font-size: 0.92rem;
      line-height: 1.6;
      color: #cbd5e1;
      margin-bottom: 1.5rem;
      max-height: 300px;
      overflow-y: auto;
    }
    .placeholder-text {
      color: #64748b;
      font-style: italic;
      margin: 0;
    }
    .shortlink-preview {
      color: #94a3b8;
    }
    .consent-hyperlink {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      color: #6366f1;
      text-decoration: none;
      font-weight: 600;
      transition: color 0.15s ease;
    }
    .consent-hyperlink:hover {
      color: #818cf8;
      text-decoration: underline;
    }
    .preview-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      padding-top: 1rem;
    }
    .preview-actions button {
      padding: 0.5rem 1.2rem;
      font-size: 0.8rem;
      font-weight: 600;
      border-radius: 6px;
      cursor: not-allowed;
      opacity: 0.5;
    }
    .btn-accept {
      background: #10b981;
      color: #ffffff;
      border: none;
    }
    .btn-decline {
      background: none;
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    /* Modal Dialog Styles */
    .preview-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding: 1.25rem 1.5rem;
    }
    .preview-modal-header h3 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: #ffffff;
    }
    .dialog-close-btn {
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      transition: color 0.15s ease;
    }
    .dialog-close-btn:hover {
      color: #ffffff;
    }
    .preview-modal-body {
      padding: 1.5rem;
      max-height: 400px;
      overflow-y: auto;
      font-size: 0.95rem;
      line-height: 1.6;
      color: #cbd5e1;
    }
    .preview-modal-footer {
      display: flex;
      justify-content: flex-end;
      padding: 1rem 1.5rem;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #cbd5e1;
      border-radius: 6px;
      padding: 0.5rem 1.2rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
    }
  `]
})
export class ConsentPreviewComponent extends FieldType<any> implements OnInit, OnDestroy {
  @ViewChild('previewDialog') previewDialog!: TemplateRef<any>;

  originalVersion = '1.0';
  minorVersionOption = '1.1';
  majorVersionOption = '2.0';
  selectedVersionType: 'current' | 'minor' | 'major' = 'current';

  showPreviewPanel = false;
  previewContent = '';
  entitiesList: any[] = [];

  countries = [
    { value: 'US', label: 'United States' },
    { value: 'IN', label: 'India' },
    { value: 'MY', label: 'Malaysia' },
    { value: 'SG', label: 'Singapore' }
  ];

  regions = [
    { value: 'EU', label: 'European Union' },
    { value: 'APAC', label: 'Asia Pacific' },
    { value: 'NA', label: 'North America' },
    { value: 'LATAM', label: 'Latin America' }
  ];

  eventsByRegion: Record<string, string[]> = {
    'US': ['WEBINAR', 'EVENT', 'MEETUP', 'MARKETING', 'NEWSLETTER'],
    'IN': ['CONFERENCE', 'SEMINAR', 'SUMMIT', 'WORKSHOP'],
    'MY': ['EXPO', 'FORUM', 'CONGRESS'],
    'SG': ['EXPO', 'FORUM', 'WORKSHOP'],
    'EU': ['GDPR-CONSENT', 'COOKIE-POLICY', 'NEWSLETTER'],
    'APAC': ['CONFERENCE', 'SEMINAR', 'SUMMIT', 'WORKSHOP'],
    'NA': ['WEBINAR', 'EVENT', 'MEETUP', 'MARKETING', 'NEWSLETTER'],
    'LATAM': ['EVENT', 'MEETUP', 'MARKETING'],
    'NONE': ['MARKETING', 'NEWSLETTER', 'GENERAL-CONSENT']
  };

  sampleTokens = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    company: 'SynapseMD Labs',
    country: 'US',
    region: 'California',
    timezone: 'America/Los_Angeles'
  };

  private sub = new Subscription();
  private dataService = inject(DataService);
  private dialogService = inject(DialogService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    // Determine the original version of this notice
    if (this.model.isEdit && this.model.version) {
      this.originalVersion = this.model.version;
      this.calculateVersionOptions(this.originalVersion);
    } else if (this.model.isClone && this.model.version) {
      this.originalVersion = this.model.version;
      this.calculateVersionOptions(this.originalVersion);
      this.selectedVersionType = 'minor';
      this.formControl.setValue(this.minorVersionOption);
    } else {
      if (!this.formControl.value) {
        this.formControl.setValue('1.0');
      }
    }

    // Fetch entity list dynamically from data-service
    this.dataService.getDataByFilter('entities', { start: 0, end: 100 }).subscribe({
      next: (res: any) => {
        this.entitiesList = res?.data?.[0]?.response || [];
        this.updateFormState(true);
      }
    });

    // Listen to notice template updates
    const templateControl = this.form.get('template');
    if (templateControl) {
      this.sub.add(templateControl.valueChanges.subscribe(tpl => {
        this.renderPreview(tpl);
      }));
      this.renderPreview(templateControl.value);
    }

    // Subscribe to form value modifications
    this.sub.add(this.form.valueChanges.subscribe(() => {
      this.updateFormState();
    }));

    this.updateFormState(true);
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  updateFormState(force = false) {
    const geoScope = this.form.get('geoScope')?.value || 'NONE';
    const regionControl = this.form.get('region');
    const entityControl = this.form.get('entity');
    const eventControl = this.form.get('event');
    const keyControl = this.form.get('key');

    // 1. Manage region value in synchronization with geoScope
    if (geoScope === 'NONE') {
      if (regionControl && regionControl.value !== 'NONE') {
        regionControl.setValue('NONE', { emitEvent: false });
      }
    } else {
      if (regionControl && regionControl.value === 'NONE') {
        regionControl.setValue('', { emitEvent: false });
      }
    }

    // 2. Set dynamic target options list on the region field config
    const regionField = this.field.parent?.fieldGroup?.find((f: any) => f.key === 'region');
    if (regionField && regionField.props) {
      let expectedOptions: any[] = [];
      if (geoScope === 'Country') {
        expectedOptions = this.countries;
      } else if (geoScope === 'Region') {
        expectedOptions = this.regions;
      } else {
        expectedOptions = [{ value: 'NONE', label: 'None / Global' }];
      }
      if (force || JSON.stringify(regionField.props.options) !== JSON.stringify(expectedOptions)) {
        regionField.props.options = expectedOptions;
        this.cdr.detectChanges();
      }
    }

    // 3. Set entities select list
    const entityField = this.field.parent?.fieldGroup?.find((f: any) => f.key === 'entity');
    if (entityField && entityField.props) {
      const expectedOptions = this.entitiesList.map(ent => ({
        value: ent.name.toUpperCase(),
        label: ent.name
      }));
      if (force || JSON.stringify(entityField.props.options) !== JSON.stringify(expectedOptions)) {
        entityField.props.options = expectedOptions;
        this.cdr.detectChanges();
      }
    }

    // 4. Set region-specific events
    const regionVal = regionControl?.value || 'NONE';
    const eventField = this.field.parent?.fieldGroup?.find((f: any) => f.key === 'event');
    if (eventField && eventField.props) {
      const expectedEvents = this.eventsByRegion[regionVal.toUpperCase()] || ['MARKETING', 'NEWSLETTER'];
      const expectedOptions = expectedEvents.map(e => ({ value: e, label: e }));
      if (force || JSON.stringify(eventField.props.options) !== JSON.stringify(expectedOptions)) {
        eventField.props.options = expectedOptions;

        // Reset selected event value if it's no longer valid for new region
        const currentEvent = eventControl?.value;
        if (currentEvent && !expectedEvents.includes(currentEvent)) {
          eventControl?.setValue('', { emitEvent: false });
        }
        this.cdr.detectChanges();
      }
    }

    // 5. Generate and set the computed key (only in non-edit mode)
    if (!this.model.isEdit) {
      const region = (regionControl?.value || '').toUpperCase();
      const entity = (entityControl?.value || '').toUpperCase();
      const event = (eventControl?.value || '').toUpperCase();

      if (region && entity && event) {
        const computedKey = `${region}-${entity}-${event}`;
        if (keyControl && keyControl.value !== computedKey) {
          keyControl.setValue(computedKey, { emitEvent: false });
        }
      }
    }

    // Update rendered preview
    const templateControl = this.form.get('template');
    if (templateControl) {
      this.renderPreview(templateControl.value);
    }
  }

  calculateVersionOptions(currentVersion: string): void {
    this.originalVersion = currentVersion || '1.0';
    const parts = this.originalVersion.split('.');
    const major = parseInt(parts[0], 10) || 1;
    const minor = parts.length > 1 ? (parseInt(parts[1], 10) || 0) : 0;

    this.minorVersionOption = `${major}.${minor + 1}`;
    this.majorVersionOption = `${major + 1}.0`;
  }

  setVersionOption(type: 'current' | 'minor' | 'major'): void {
    this.selectedVersionType = type;
    let versionVal = this.originalVersion;
    if (type === 'minor') versionVal = this.minorVersionOption;
    if (type === 'major') versionVal = this.majorVersionOption;
    this.formControl.setValue(versionVal);
  }

  togglePreview(): void {
    this.showPreviewPanel = !this.showPreviewPanel;
    if (this.showPreviewPanel) {
      const templateControl = this.form.get('template');
      this.renderPreview(templateControl?.value || '');
    }
  }

  renderPreview(template: string): void {
    if (!template) {
      this.previewContent = '';
      return;
    }

    let rendered = template;
    const tokenRegex = /\{\{\s*token\.([a-zA-Z0-9_.]+)\s*\}\}/gi;
    rendered = rendered.replace(tokenRegex, (match, tokenName) => {
      const key = tokenName.toLowerCase();
      return (this.sampleTokens as any)[key] !== undefined ? (this.sampleTokens as any)[key] : '';
    });

    this.previewContent = this.sanitizeHtml(rendered);
  }

  sanitizeHtml(html: string): string {
    if (!html) return '';
    return html
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/\son[a-z]+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '')
      .replace(/href\s*=\s*["']\s*javascript:[^"']*["']/gi, 'href="#"');
  }

  openNoticeInModal(event: MouseEvent): void {
    event.preventDefault();
    this.dialogService.openDialog(this.previewDialog, '600px');
  }

  closePreviewDialog(): void {
    this.dialogService.closeModal();
  }
}
