import { Component, OnInit, ChangeDetectorRef, NgZone, ViewChild, TemplateRef, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormlyModule, FormlyFieldConfig, FieldType, FormlyFormBuilder } from '@ngx-formly/core';
import { MatIconModule } from '@angular/material/icon';
import { Observable, Subject, forkJoin } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { DialogService } from '../../../../core/services/dialog.service';
import { ThemeService } from '../../../../core/services/theme.service';
import { DataService } from '../../../../core/services/data.service';
import { environment } from '../../../../../environments/environment';
import { PatientDetailsViewComponent } from '../../../shared/components/patient-details-view/patient-details-view.component';
import { SpecialistViewComponent } from "../../../specialist/specialist-view/specialist-view.component";

@Component({
  selector: 'app-dynamic-stepper',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    FormlyModule,
    MatIconModule,
    PatientDetailsViewComponent,
    SpecialistViewComponent,
    TranslateModule
  ],
  templateUrl: './dynamic-stepper.component.html',
  styleUrls: ['./dynamic-stepper.component.css']
})
export class DynamicStepperComponent extends FieldType implements OnInit {
  detectedRegion = '';

  activeStepIndex = 0;
  /** Highest step index ever reached — used so users can freely navigate
   *  between any already-visited step, even after going backward. */
  maxReachedStepIndex = 0;
  isSubmitting = false;
  isSavingStep = false;
  acceptTerms = false;
  acceptPrivacy = false;
  isEdit = false;
  isNewOnboarding = false;
  isMobileSidebarOpen = false;
  photoTimestamp = new Date().getTime();

  @ViewChild('termsPopup') termsPopup!: TemplateRef<any>;
  @ViewChild('privacyPopup') privacyPopup!: TemplateRef<any>;

  stepperForm = new FormGroup({});
  private _localModel: any = {};
  get onboardingModel(): any {
    return this.model || this._localModel;
  }
  set onboardingModel(val: any) {
    if (this.model) {
      Object.assign(this.model, val);
    } else {
      this._localModel = val;
    }
  }

  steps: any[] = [];
  submitEndpoint = '';
  profileConfig: any = null;
  themeMode$: Observable<'night' | 'morning'>;

  /** Map from arrayKey → callback that loads rows into the FieldArrayType */
  private fieldPopulators = new Map<string, (rows: any[]) => void>();

  /** Called by RepeatTypeComponent to register its populate callback */
  registerFieldPopulator(arrayKey: string, fn: (rows: any[]) => void): void {
    this.fieldPopulators.set(arrayKey, fn);
    // If data was already loaded before the repeat component initialized, replay it
    const pending = this._pendingArrayData.get(arrayKey);
    if (pending) {
      fn(pending);
      this._pendingArrayData.delete(arrayKey);
    }
  }

  /** Holds array data that arrived before the repeat field was ready */
  private _pendingArrayData = new Map<string, any[]>();

  /**
   * Tracks which step keys have received valid (non-empty) data from the GET API.
   * Only steps in this set are considered "complete" and skippable in edit mode.
   */
  private _stepsWithLoadedData = new Set<string>();
  loadingStepData = false;

  private _destroy$ = new Subject<void>();

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router,
    public dialogService: DialogService,
    private themeService: ThemeService,
    private http: HttpClient,
    private location: Location,
    private cdr: ChangeDetectorRef,
    private builder: FormlyFormBuilder,
    private ngZone: NgZone,
    private dataService: DataService,
    private translate: TranslateService
  ) {
    super();
    this.themeMode$ = this.themeService.themeMode$;
  }

  ngOnInit(): void {

    try {
      this.detectedRegion = Intl.DateTimeFormat().resolvedOptions().timeZone || 'US/Eastern';
    } catch (e) {
      this.detectedRegion = 'US/Eastern';
    }

    // Initialize clean model
    this.initDefaultModel();

    this.isEdit = this.model?.isEdit;
    this.isNewOnboarding = this.model?.isNewOnboarding;
    if (this.field?.props) {
      this.setupStepsAndLoadData(this.field.props);
    } else {
      console.warn('DynamicStepperComponent: No Formly field props found.');
    }

    this.dataService.profilePhotoUploaded.subscribe(() => {
      this.photoTimestamp = new Date().getTime();
      if (this.profileConfig) {
        const stepKey = this.profileConfig.stepKey;
        if (stepKey && this.onboardingModel[stepKey]) {
          this.onboardingModel = {
            ...this.onboardingModel,
            [stepKey]: {
              ...this.onboardingModel[stepKey]
            }
          };
        }
      }
      this.cdr.detectChanges();
    });
  }

  onBackClick(): void {
    if (this.props['onBack']) {
      this.props['onBack']();
    } else if (this.props['backUrl']) {
      this.router.navigate([this.props['backUrl']]);
    }
  }

  setupStepsAndLoadData(config: any): void {
    if (!config) return;
    this.steps = config.steps || config.fieldGroup || [];
    this.submitEndpoint = config.submitEndpoint || '/user/api/auth/onboarding/submit';
    this.profileConfig = config.profileConfig || null;

    // Initialize model containers and compile each step
    this.steps.forEach(step => {
      if (step.key) {
        if (!this.onboardingModel[step.key]) {
          this.onboardingModel[step.key] = {};
        }
      }
      // Each step gets its own isolated FormGroup.
      // formly-form in the template will populate + manage controls automatically when the step renders.
      step._formGroup = new FormGroup({});
      step.form = step._formGroup;
      step.model = this.onboardingModel;

      // ── Inject previewFields into repeat field props ──────────────────────
      // previewFields lives on the step config but the repeat component reads
      // it from its own props. Walk the step's fields and inject it so the
      // repeat card can display label:value chips dynamically.
      if (step.previewFields && step.fields) {
        const injectPreviewFields = (fields: any[]) => {
          if (!fields) return;
          for (const f of fields) {
            if (f.type === 'repeat') {
              f.props = f.props || {};
              if (Array.isArray(step.previewFields) && f.key) {
                const matchedPf = step.previewFields.find((pf: any) => pf.key === f.key);
                if (matchedPf && matchedPf.itemFields) {
                  f.props['previewFields'] = matchedPf.itemFields;
                } else {
                  f.props['previewFields'] = step.previewFields;
                }
              } else {
                f.props['previewFields'] = step.previewFields;
              }
            }
            if (f.fieldGroup) injectPreviewFields(f.fieldGroup);
          }
        };
        injectPreviewFields(step.fields);
      }
    });


    const collectFieldKeys = (fields: any[], keys: string[] = []): string[] => {
      if (!fields) return keys;
      for (const f of fields) {
        if (f.key) {
          keys.push(f.key);
          // For dropdown-dynamic-input, also collect the prefix key (e.g., phone_code)
          if (f.type === 'dropdown-dynamic-input' && f.props?.prefixOptions?.key) {
            keys.push(f.props.prefixOptions.key);
          }
        }
        if (f.fieldGroup) {
          collectFieldKeys(f.fieldGroup, keys);
        }
      }
      return keys;
    };

    if (this.isEdit) {
      const id = this.onboardingModel?.id

      // Count step GETs so we can set the active step after all loads finish
      let pendingLoads = 0;
      this.loadingStepData = true;

      this.steps.forEach(step => {
        const stepGetEndpoint = step.getDataEndpoint || step.getEndpoint;
        if (!stepGetEndpoint) {
          return;
        }

        pendingLoads++;
        let requestObservable: Observable<any>;
        if (step.gettype === 'filter') {
          const collection = step.collectionName || stepGetEndpoint.split('/').pop();
          const filterUrl = `/entities/filter/${collection}`;
          const body = {
            filter: [
              {
                clause: 'AND',
                conditions: [
                  {
                    operator: 'EQUALS',
                    column: step.filterColumn,
                    type: 'string',
                    value: id
                  }
                ]
              }
            ]
          };
          requestObservable = this.apiService.post(filterUrl, body);
        } else {
          const getUrl = this.buildStepUrl(stepGetEndpoint, id);
          requestObservable = this.apiService.get(getUrl);
        }
        requestObservable.subscribe({
          next: (res: any) => {
            // ── Normalise the response ──────────────────────────────────────
            let responseData: any = res;
            if (res && typeof res === 'object') {
              if (Array.isArray(res.data) && res.data.length > 0) {
                responseData = res.data[0];
              } else if (res.data !== undefined) {
                responseData = res.data;
              }
            }

            // ── Handle array-based repeat steps (payloadArrayKey) ──────────
            if (step.payloadArrayKey) {
              const arrayKey = step.payloadArrayKey;
              let rows: any[] = [];
              if (Array.isArray(res?.data?.[0]?.response)) {
                rows = res.data[0].response;
              } else if (Array.isArray(responseData?.[arrayKey])) {
                rows = responseData[arrayKey];
              } else if (Array.isArray(responseData?.response)) {
                rows = responseData.response;
              } else if (Array.isArray(responseData)) {
                rows = responseData;
              }

              // Seed the onboardingModel so nextStep() can read the array
              if (!this.onboardingModel[step.key]) {
                this.onboardingModel[step.key] = {};
              }
              this.onboardingModel[step.key][arrayKey] = rows;

              // Mark this step as having loaded data (even empty arrays count
              // as a valid response — the step was reached and answered)
              this._stepsWithLoadedData.add(step.key);
              if (rows.length > 0) {
                if (step.key === 'medications_group') {
                  this.onboardingModel.has_medication = true;
                } else if (step.key === 'allergy') {
                  this.onboardingModel.has_allergy = true;
                } else if (step.key === 'surgical_history_group') {
                  this.onboardingModel.has_surgery = true;
                } else if (step.key === 'insurance') {
                  this.onboardingModel.has_insurance = true;
                }
              }

              // Try to populate via registered FieldArrayType populator
              const populator = this.fieldPopulators.get(arrayKey);
              if (populator && rows.length > 0) {
                populator(rows);
              } else if (rows.length > 0) {
                // Repeat component not yet initialized — store for when it registers
                this._pendingArrayData.set(arrayKey, rows);
              }

              this.cdr.detectChanges();
              pendingLoads--;
              if (pendingLoads === 0) {
                this.setActiveToFirstIncomplete();
                this.loadingStepData = false;
                this.cdr.detectChanges();
              }
              return;
            }

            // ── Resolve the flat step data ─────────────────────────────────
            let stepData: any =
              responseData?.[step.payloadKey] ??
              (step.payloadKey === 'insurance' && Array.isArray(responseData?.insurances) && responseData.insurances.length > 0 ? responseData.insurances[0] : null) ??
              responseData?.identity_data ??
              responseData?.qualifications_data ??
              responseData?.experience_data ??
              responseData?.documents_data ??
              responseData;

            if (!stepData || typeof stepData !== 'object' || Array.isArray(stepData)) {
              // stepData is empty/invalid — do NOT mark this step as loaded
              pendingLoads--;
              if (pendingLoads === 0) {
                this.setActiveToFirstIncomplete();
                this.loadingStepData = false;
                this.cdr.detectChanges();
              }
              return;
            }

            // ── Merge into the existing nested model object ────────────────
            // Mutating the existing reference ensures Formly's model binding
            // stays valid; we ALSO replace the root reference to trigger
            // Angular's change detection / Formly ngOnChanges.
            if (!this.onboardingModel[step.key]) {
              this.onboardingModel[step.key] = {};
            }

            // Build patched values
            const patchedValues: Record<string, any> = {};
            Object.keys(stepData).forEach((key: string) => {
              const val = stepData[key];
              if (key === 'profile_photo' && step.key === 'identity') {
                patchedValues['profile_image'] = val;
              } else {
                patchedValues[key] = val;
              }

              // Trigger populators for nested arrays in flat steps
              if (Array.isArray(val)) {
                const populator = this.fieldPopulators.get(key);
                if (populator) {
                  populator(val);
                } else {
                  this._pendingArrayData.set(key, val);
                }
              }
            });

            // 1. Mutate in-place (keeps existing refs valid)
            Object.assign(this.onboardingModel[step.key], patchedValues);

            // 2. Mark this step as having received valid data from the API
            this._stepsWithLoadedData.add(step.key);
            if (Object.keys(patchedValues).length > 0) {
              if (step.key === 'insurance') {
                this.onboardingModel.has_insurance = true;
              }
            }

            // 3. Replace the root reference so Formly sees the change
            this.onboardingModel = {
              ...this.onboardingModel,
              [step.key]: { ...this.onboardingModel[step.key] }
            };

            // 4. Trigger Angular CD immediately
            this.cdr.detectChanges();

            // 5. After the next render tick, patch any FormControls that
            //    may not have been created yet when step 4 fired
            setTimeout(() => {
              const patchForm = (fg: FormGroup | null, data: Record<string, any>) => {
                if (!fg) return;
                Object.keys(data).forEach(k => {
                  try {
                    const ctrl = fg.get(k);
                    if (ctrl) {
                      ctrl.setValue(data[k], { emitEvent: false });
                    }
                  } catch (_) { /* ignore */ }
                });
              };

              // Try both the nested step FormGroup and the root form
              const stepFg = this.getStepFormGroup(step);
              patchForm(stepFg, patchedValues);
              patchForm(this.stepperForm as FormGroup, patchedValues);

              this.cdr.detectChanges();
            }, 100);

            pendingLoads--;
            if (pendingLoads === 0) {
              this.setActiveToFirstIncomplete();
              this.loadingStepData = false;
              this.cdr.detectChanges();
            }
          },
          error: (err) => {
            pendingLoads--;
            if (pendingLoads === 0) {
              this.setActiveToFirstIncomplete();
              this.loadingStepData = false;
              this.cdr.detectChanges();
            }
            console.error(`Failed to load step data for ${step.key} via ${stepGetEndpoint}`, err);
          }
        });

      });

      if (pendingLoads === 0) {
        // No loads to wait for — set active now
        this.setActiveToFirstIncomplete();
        this.loadingStepData = false;
        this.cdr.detectChanges();
      }
    } else {
      this.loadingStepData = false;
      this.cdr.detectChanges();
    }
  }

  private buildStepUrl(endpoint: string, id: string | null): string {
    let url = endpoint;
    if (id && url.includes('{id}')) {
      url = url.replace('{id}', encodeURIComponent(id));
    }

    return url;
  }

  isStepModelValid(step: any): boolean {
    if (!step) return false;

    // Check if the step itself is hidden
    if (step.hideExpression && this.evaluateExpression(step.hideExpression, this.onboardingModel)) {
      return true; // if hidden, it is considered complete/skipped
    }

    const stepModel = this.onboardingModel[step.key] || {};

    const checkFields = (fields: any[], model: any): boolean => {
      if (!fields) return true;

      for (const field of fields) {
        // If field is hidden, skip it
        let isHidden = false;
        if (field.hide === true) {
          isHidden = true;
        } else if (typeof field.hide === 'function') {
          try {
            isHidden = field.hide(model, this.onboardingModel, field);
          } catch (e) {
            isHidden = false;
          }
        } else if (typeof field.hide === 'string') {
          isHidden = this.evaluateExpression(field.hide, model);
        }

        if (isHidden) {
          continue;
        }

        // If field has a hideExpression and it evaluates to true, skip it
        if (field.hideExpression) {
          let isHiddenExpr = false;
          if (typeof field.hideExpression === 'function') {
            try {
              isHiddenExpr = field.hideExpression(model, this.onboardingModel, field);
            } catch (e) {
              isHiddenExpr = false;
            }
          } else if (typeof field.hideExpression === 'string') {
            isHiddenExpr = this.evaluateExpression(field.hideExpression, model);
          } else if (typeof field.hideExpression === 'boolean') {
            isHiddenExpr = field.hideExpression;
          }
          if (isHiddenExpr) {
            continue;
          }
        }

        // If repeat field:
        if (field.type === 'repeat' && field.key) {
          const arr = model[field.key];
          const isReq = !!(field.props?.required || field.templateOptions?.required);
          if (isReq) {
            if (!Array.isArray(arr) || arr.length === 0) {
              return false;
            }
          }
          if (Array.isArray(arr) && field.fieldArray && field.fieldArray.fieldGroup) {
            for (const item of arr) {
              if (!checkFields(field.fieldArray.fieldGroup, item)) {
                return false;
              }
            }
          }
          continue;
        }

        // If field has fieldGroup, recurse
        if (field.fieldGroup && field.fieldGroup.length > 0) {
          const nextModel = field.key ? (model[field.key] || {}) : model;
          if (!checkFields(field.fieldGroup, nextModel)) {
            return false;
          }
        }

        // Check if this field itself is required
        const isRequired = !!(field.props?.required || field.templateOptions?.required);
        if (isRequired && field.key) {
          const val = model[field.key];
          if (val === undefined || val === null || val === '') {
            return false;
          }
          if (Array.isArray(val) && val.length === 0) {
            return false;
          }
        }
      }

      return true;
    };

    return checkFields(step.fields, stepModel);
  }

  private hasStepData(step: any): boolean {
    if (!step) return false;
    const stepModel = this.onboardingModel[step.key];
    if (!stepModel) return false;

    const checkFieldsHaveData = (fields: any[], model: any): boolean => {
      if (!fields || !model) return false;

      for (const field of fields) {
        // If field is hidden, skip it
        let isHidden = false;
        if (field.hide === true) {
          isHidden = true;
        } else if (typeof field.hide === 'function') {
          try {
            isHidden = field.hide(model, this.onboardingModel, field);
          } catch (e) {
            isHidden = false;
          }
        } else if (typeof field.hide === 'string') {
          isHidden = this.evaluateExpression(field.hide, model);
        }

        if (isHidden) {
          continue;
        }

        if (field.hideExpression) {
          let isHiddenExpr = false;
          if (typeof field.hideExpression === 'function') {
            try {
              isHiddenExpr = field.hideExpression(model, this.onboardingModel, field);
            } catch (e) {
              isHiddenExpr = false;
            }
          } else if (typeof field.hideExpression === 'string') {
            isHiddenExpr = this.evaluateExpression(field.hideExpression, model);
          } else if (typeof field.hideExpression === 'boolean') {
            isHiddenExpr = field.hideExpression;
          }
          if (isHiddenExpr) {
            continue;
          }
        }

        if (field.type === 'repeat' && field.key) {
          const arr = model[field.key];
          if (Array.isArray(arr) && arr.length > 0) {
            return true;
          }
        } else if (field.fieldGroup && field.fieldGroup.length > 0) {
          const nextModel = field.key ? model[field.key] : model;
          if (checkFieldsHaveData(field.fieldGroup, nextModel)) {
            return true;
          }
        } else if (field.key) {
          const val = model[field.key];
          if (val !== undefined && val !== null && val !== '') {
            return true;
          }
        }
      }
      return false;
    };

    return checkFieldsHaveData(step.fields, stepModel);
  }

  private setActiveToFirstIncomplete(): void {
    const visible = this.visibleSteps;

    for (let i = 0; i < visible.length; i++) {
      const step = visible[i];

      // A step is considered "complete and skippable" in edit mode ONLY if:
      //   (a) it has a getDataEndpoint configured, AND
      //   (b) the GET API returned non-empty data for it (tracked in _stepsWithLoadedData), AND
      //   (c) the data loaded satisfies all required fields of that step.
      const hasGetEndpoint = !!(step.getDataEndpoint || step.getEndpoint);
      const apiReturnedData = this._stepsWithLoadedData.has(step.key) && this.hasStepData(step);
      const isComplete = this.isStepModelValid(step);

      if (hasGetEndpoint && apiReturnedData && isComplete) {
        // This step has valid API data and is fully complete — skip it and look at the next one
        continue;
      }

      // Step has no endpoint, no data came back, or data is incomplete — land here
      this.activeStepIndex = i;
      // All steps before this one were skipped (had data and were complete), so they count as visited
      this.maxReachedStepIndex = Math.max(this.maxReachedStepIndex, i);
      return;
    }

    // Every step had a getDataEndpoint, returned data, and was complete — land on the last step
    this.activeStepIndex = Math.max(0, visible.length - 1);
    this.maxReachedStepIndex = this.activeStepIndex;
  }

  initDefaultModel(): void {
    if (this.model) {
      return;
    }
    this.onboardingModel = {};
  }

  evaluateExpression(expr: string, model: any): boolean {
    if (!expr) return false;
    try {
      const fn = new Function('model', `try { return ${expr}; } catch(e) { return false; }`);
      return fn(model);
    } catch (e) {
      console.error('Error compiling expression:', expr, e);
      return false;
    }
  }

  get visibleSteps(): any[] {
    // Synchronize root boolean flags with personal step model if it exists
    if (this.onboardingModel?.personal) {
      if (this.onboardingModel.personal.under_medication !== undefined) {
        this.onboardingModel.has_medication = !!this.onboardingModel.personal.under_medication;
      }
      if (this.onboardingModel.personal.is_allergic !== undefined) {
        this.onboardingModel.has_allergy = !!this.onboardingModel.personal.is_allergic;
      }
      if (this.onboardingModel.personal.had_surgery !== undefined) {
        this.onboardingModel.has_surgery = !!this.onboardingModel.personal.had_surgery;
      }
      if (this.onboardingModel.personal.has_insurance !== undefined) {
        this.onboardingModel.has_insurance = !!this.onboardingModel.personal.has_insurance;
      }
      if (this.onboardingModel.personal.has_medical_reports !== undefined) {
        this.onboardingModel.has_medical_reports = !!this.onboardingModel.personal.has_medical_reports;
      }
    }

    return this.steps.filter(step => {
      if (!step.hideExpression) return true;
      return !this.evaluateExpression(step.hideExpression, this.onboardingModel);
    });
  }
  onModelChange(event: any): void {
    // Formly automatically updates the model.
    // Default Angular change detection will re-evaluate visibleSteps implicitly.
  }

  check() {
    console.log(this.form.value);

  }
  get allInputFields(): { stepKey: string, fieldKey: string }[] {
    const fieldsList: { stepKey: string, fieldKey: string }[] = [];
    const stepsToProcess = this.visibleSteps.filter(s => s.key && s.fields);

    for (const step of stepsToProcess) {
      const collectLeafFields = (fields: any[]) => {
        if (!fields) return;
        for (const f of fields) {
          if (f.key) {
            if (!f.fieldGroup || f.fieldGroup.length === 0) {
              const isRequired = !!(f.props?.required || f.templateOptions?.required);
              if (isRequired) {
                fieldsList.push({ stepKey: step.key, fieldKey: f.key });
              }
            } else {
              collectLeafFields(f.fieldGroup);
            }
          } else if (f.fieldGroup) {
            collectLeafFields(f.fieldGroup);
          }
        }
      };
      collectLeafFields(step.fields);
    }
    return fieldsList;
  }

  /** Live profile data read from the configured step model */
  get profileName(): string {
    if (!this.profileConfig) return '';
    return this.onboardingModel[this.profileConfig.stepKey]?.[this.profileConfig.nameField] || '';
  }

  get profileEmail(): string {
    if (!this.profileConfig) return '';
    return this.onboardingModel[this.profileConfig.stepKey]?.[this.profileConfig.emailField] || '';
  }

  get profilePhoto(): string {
    if (!this.profileConfig) return '';
    const val = this.onboardingModel[this.profileConfig.stepKey]?.[this.profileConfig.photoField] || '';
    if (val) {
      if (val.startsWith('data:') || val.startsWith('http:') || val.startsWith('https:')) {
        return val;
      }
      const folder = this.profileConfig.photoFolder || 'profiles';
      const basePath = environment.ImageBaseUrl && environment.ImageBaseUrl.endsWith('/') ? environment.ImageBaseUrl : (environment.ImageBaseUrl + '/');
      let cleanUrl = '';
      if (val.startsWith(folder + '/')) {
        cleanUrl = basePath + val;
      } else {
        cleanUrl = basePath + folder + '/' + val;
      }
      return cleanUrl + "?t=" + this.photoTimestamp;
    }
    return '';
  }

  get profileInitials(): string {
    const name = this.profileName;
    if (!name) return '?';
    return name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
  }

  /** Stable model reference for the active step — prevents Formly reference churn */
  get activeStepModel(): any {
    const key = this.visibleSteps[this.activeStepIndex]?.key;
    if (!key) return {};
    if (!this.onboardingModel[key]) {
      this.onboardingModel[key] = {};
    }
    return this.onboardingModel[key];
  }

  get stepperStyle(): any {
    const baseStyle = this.field?.props?.['style'] || this.props?.['style'] || {};
    const styleObj: any = { ...baseStyle };

    if (styleObj.height) {
      if (typeof styleObj.height === 'object') {
        styleObj['--stepper-height-desktop'] = styleObj.height.desktop || '100%';
        styleObj['--stepper-height-mobile'] = styleObj.height.mobile || '100%';
        styleObj['height'] = 'var(--stepper-height-desktop)';
      }
    }
    return styleObj;
  }

  get progressPercentage(): number {
    const total = this.visibleSteps.length;
    if (total === 0) return 0;
    if (total === 1) return 100;
    return Math.round((this.activeStepIndex / (total - 1)) * 100);
  }

  toggleTheme(): void {
    this.themeService.toggleThemeMode();
  }

  prevStep(): void {
    if (this.activeStepIndex > 0) {
      this.activeStepIndex--;
      this.cdr.detectChanges();
    }
  }

  /**
   * Navigate to any already-visited step (i <= maxReachedStepIndex).
   * This allows free forward/backward jumping among all completed steps
   * even after the user has navigated backward.
   */
  goToStep(i: number): void {
    if (i !== this.activeStepIndex && i <= this.maxReachedStepIndex) {
      this.activeStepIndex = i;
      this.cdr.detectChanges();
    }
  }

  closeStepper(): void {
    if (this.props['needclose']) {
      this.location.back();
    } else if (!this.props['isEmbedded']) {
      this.router.navigate(['/patients']);
    }
    // Notify parent to close the drawer and refresh the list
    window.postMessage({ type: 'ONBOARD_COMPLETE' }, '*');
    if (window.self !== window.top) {
      window.parent.postMessage({ type: 'ONBOARD_COMPLETE' }, '*');
    }
  }
  get islaststeper(): boolean {
    return this.activeStepIndex === this.visibleSteps.length - 1;
  }
  nextStep(): void {
    const currentStep = this.visibleSteps[this.activeStepIndex];

    // Check if there is a required logo/profile image missing
    let missingLogoField: any = null;
    if (currentStep?.fields) {
      const checkLogo = (fields: any[]) => {
        for (const f of fields) {
          if (f.type === 'logo' && (f.props?.required || f.templateOptions?.required)) {
            const val = this.onboardingModel[currentStep.key]?.[f.key];
            if (!val) {
              missingLogoField = f;
              break;
            }
          }
          if (f.fieldGroup) checkLogo(f.fieldGroup);
        }
      };
      checkLogo(currentStep.fields);
    }

    if (missingLogoField) {
      const msg = this.translate ? this.translate.instant('SPECIALIST.ONBOARDING.UPLOAD_IMAGE_ERROR') : "Please upload your profile image before proceeding.";
      this.dialogService.openSnackBar(msg, "OK");
      return;
    }

    const fg = currentStep?._formGroup as FormGroup;
    if (fg && fg.invalid) {
      // Trigger all validation messages on this step
      fg.markAllAsTouched();
      this.cdr.detectChanges();
      const msg = this.translate ? this.translate.instant('SPECIALIST.ONBOARDING.FILL_REQUIRED_FIELDS') : "Please fill in all required fields before proceeding.";
      this.dialogService.openSnackBar(msg, "OK");
      return;
    }

    if (currentStep?.required) {
      const stepModel = this.onboardingModel[currentStep.key] || {};
      const repeatKeys: string[] = [];
      const findRepeatFields = (fields: any[]) => {
        for (const f of fields) {
          if (f.type === 'repeat' && f.key) {
            repeatKeys.push(f.key as string);
          }
          if (f.fieldGroup) {
            findRepeatFields(f.fieldGroup);
          }
        }
      };
      if (currentStep.fields) {
        findRepeatFields(currentStep.fields);
      }

      if (repeatKeys.length > 0) {
        const hasAtLeastOneItem = repeatKeys.some(key => {
          const arr = stepModel[key];
          return Array.isArray(arr) && arr.length > 0;
        });
        if (!hasAtLeastOneItem) {
          let stepName = currentStep.title || "item";
          if (this.translate) {
            stepName = this.translate.instant(stepName);
          }
          const msg = this.translate ? this.translate.instant('SPECIALIST.ONBOARDING.ADD_AT_LEAST_ONE', { stepName }) : `Please add at least one ${stepName} before proceeding.`;
          this.dialogService.openSnackBar(msg, "OK");
          return;
        }
      }
    }

    // If step has actIndividual=true, save its data to the step's own API first
    if (currentStep?.actIndividual && currentStep?.updateEndpoint &&
      (currentStep?.payloadKey || currentStep?.payloadArrayKey)) {
      this.isSavingStep = true;

      const id = this.onboardingModel?.id;

      let payload: any;

      if (currentStep.payloadArrayKey) {
        // New array-based endpoint: { docter_id: 'DOC-...', [arrayKey]: [ ...rows ] }
        const arrayKey = currentStep.payloadArrayKey;
        const stepModel: any = this.onboardingModel[currentStep.key] || {};
        // The repeat field stores its rows under the same key as the field (e.g. 'qualifications', 'experience', 'specialties')
        let rows: any[] = stepModel[arrayKey] || stepModel[currentStep.key] || [];
        if (!Array.isArray(rows)) rows = Object.values(rows);
        if (currentStep.parentKey) {
          payload = {
            [currentStep.parentKey]: id || '',
            [arrayKey]: rows
          }
        } else {
          payload = {
            id: id || '',
            patient_id: id || '',
            [arrayKey]: rows
          };
        }
      } else {
        const stepData = { ...(this.onboardingModel[currentStep.key] || {}) };

        // Attach patient_id and id from root model
        const ID = this.onboardingModel.patient_id || this.onboardingModel.id;
        if (ID) {
          stepData.id = ID;
          if (this.props['isPatient']) stepData.patient_id = ID;
        }

        // Map primary_phone to phone for personal info step
        if (currentStep.key === 'personal') {
          if (stepData.primary_phone && !stepData.phone) {
            stepData.phone = stepData.primary_phone;
          }
        }

        if (this.isEdit && id) {
          stepData.id = id;
        }

        // Wrap payload in payloadKey if configured (e.g. personal)
        if (currentStep.payloadKey) {
          payload = {
            [currentStep.payloadKey]: stepData
          };
          if (this.props['skippayloadmethos'] == true) {
            payload = stepData;
          }
          if (currentStep.payloadKey === 'personal' && this.onboardingModel?.onboard?.patient_relation) {
            payload.patient_relation = this.onboardingModel.onboard.patient_relation;
          }
        } else {
          payload = stepData;
        }
      }

      console.log('=== nextStep Payload ===', JSON.stringify(payload));
      console.log('=== nextStep onboardingModel ===', JSON.stringify(this.onboardingModel));

      this.apiService.post(currentStep.updateEndpoint, payload).subscribe({
        next: (res: any) => {
          this.ngZone.run(() => {
            this.isSavingStep = false;

            const newId = res?.patient_id || res?.id || (res?.data && (res.data.patient_id || res.data.id));
            if (newId) {
              this.onboardingModel.patient_id = newId;
              this.onboardingModel.id = newId;
            }

            if (this.activeStepIndex < this.visibleSteps.length - 1) {
              this.activeStepIndex++;
              // Track the furthest step ever reached
              if (this.activeStepIndex > this.maxReachedStepIndex) {
                this.maxReachedStepIndex = this.activeStepIndex;
              }
            }
            this.cdr.detectChanges();
          });
        },
        error: (err: any) => {
          this.ngZone.run(() => {
            this.isSavingStep = false;
            let stepName = currentStep.title || 'step';
            if (this.translate) {
              stepName = this.translate.instant(stepName);
            }
            const fallbackMsg = this.translate ? this.translate.instant('SPECIALIST.ONBOARDING.FAILED_SAVE_STEP', { stepName }) : `Failed to save ${stepName} data. Please try again.`;
            this.dialogService.openSnackBar(
              err.error?.error || fallbackMsg,
              'OK'
            );
            this.cdr.detectChanges();
          });
        }
      });
      return;
    }

    // Normal step — just advance
    if (this.activeStepIndex < this.visibleSteps.length - 1) {
      this.activeStepIndex++;
      // Track the furthest step ever reached
      if (this.activeStepIndex > this.maxReachedStepIndex) {
        this.maxReachedStepIndex = this.activeStepIndex;
      }
      this.cdr.detectChanges();
    }
  }

  getVisibleStepsForReview(): any[] {
    return this.visibleSteps.filter(step => {
      if (step.key === 'review') return false;
      // Include steps that have explicit previewFields
      if (step.previewFields) return true;
      // Also include array/repeat steps (payloadArrayKey) — they have no previewFields
      // but their data should still appear in the review
      if (step.payloadArrayKey) {
        const arr = this.getStepArrayData(step);
        return Array.isArray(arr); // show even if empty (renders "—")
      }
      return false;
    });
  }

  /**
   * Returns the rows array for a repeat/array step.
   * Data is stored at onboardingModel[step.key][step.payloadArrayKey].
   */
  getStepArrayData(step: any): any[] | null {
    if (!step.payloadArrayKey) return null;
    const stepModel = this.onboardingModel[step.key];
    if (!stepModel) return null;
    const arr = stepModel[step.payloadArrayKey];
    return Array.isArray(arr) ? arr : null;
  }



  getStepArrayItemEntries(item: any): { label: string; value: string }[] {
    if (!item || typeof item !== 'object') return [];
    return Object.keys(item)
      .filter(k => !k.startsWith('__'))
      .map(k => {
        const raw = item[k];
        let display: string;
        if (raw === null || raw === undefined || raw === '') {
          display = '—';
        } else if (typeof raw === 'object' && !Array.isArray(raw)) {
          const keys = Object.keys(raw);
          display = keys.length === 0 ? '—' : JSON.stringify(raw);
        } else if (Array.isArray(raw)) {
          display = raw.length === 0 ? '—' : raw.join(', ');
        } else {
          display = String(raw);
        }
        return {
          label: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          value: display
        };
      })
      .filter(entry => entry.value !== '—' || true); // keep all, '—' is fine
  }

  getVisiblePreviewFields(step: any): any[] {
    if (!step.previewFields) return [];
    return step.previewFields.filter((pf: any) => {
      if (!pf.hideExpression) return true;
      return !this.evaluateExpression(pf.hideExpression, this.onboardingModel);
    });
  }

  isArrayValue(step: any, pf: any): boolean {
    const val = this.onboardingModel[step.key]?.[pf.key];
    return Array.isArray(val) && val.length > 0 && typeof val[0] === 'object';
  }
  isArrayStep(step: any): boolean {
    return !!step.payloadArrayKey;
  }

  getPreviewItemEntries(step: any, item: any): { label: string; value: string }[] {
    if (!item || typeof item !== 'object') return [];
    const fields: any[] = step.previewFields || [];
    if (fields.length === 0) {
      return this.getStepArrayItemEntries(item);
    }
    return fields.map((pf: any) => {
      const raw = item[pf.key];
      let display: string;
      if (raw === null || raw === undefined || raw === '') {
        display = '—';
      } else if (typeof raw === 'object' && !Array.isArray(raw)) {
        const keys = Object.keys(raw);
        display = keys.length === 0 ? '—' : JSON.stringify(raw);
      } else if (Array.isArray(raw)) {
        display = raw.length === 0 ? '—' : raw.join(', ');
      } else {
        display = String(raw);
      }
      return { label: pf.label || pf.key, value: display };
    });
  }
  getArrayItemEntries(pf: any, item: any): { label: string; value: any }[] {
    if (!item || typeof item !== 'object') {
      return [{ label: '', value: item }];
    }
    if (Array.isArray(pf.itemFields)) {
      return pf.itemFields.map((f: any) => {
        let val = item[f.key];
        if (Array.isArray(val)) {
          val = val.join(', ');
        }
        return {
          label: f.label || f.key,
          value: val ?? '—'
        };
      });
    }
    return [];
  }

  getPreviewDisplayValue(step: any, pf: any): string {
    const raw = this.onboardingModel[step.key]?.[pf.key];

    if (raw === undefined || raw === null || raw === '') return '—';
    if (Array.isArray(raw)) {
      if (raw.every((v: any) => typeof v !== 'object')) return raw.join(', ');
      return '';
    }
    return String(raw);
  }
  get isOnboardFlow(): boolean {
    const status = (this.onboardingModel?.personal?.status || this.onboardingModel?.status || '').toLowerCase();
    const isAlreadyActive = status === 'active' || status === 'completed' || status === 'suspended' || status === 'invited';
    if (isAlreadyActive) {
      return false;
    }
    if (status === 'draft' || status === 'partial') {
      return true;
    }
    return this.router.url.includes('/onboard') || 
           this.router.url.includes('/addpatients') || 
           this.isNewOnboarding;
  }

  submitRegistration(): void {
    if (this.props['skipFinalSubmit']) {
      this.closeStepper();
      return;
    }
    if (this.props['viewtype'] !== 'component' && this.isOnboardFlow && (!this.acceptTerms || !this.acceptPrivacy)) return;
    this.isSubmitting = true;

    // If it's a normal edit (not onboarding), just submit and close
    if (this.isEdit && !this.isOnboardFlow) {
      this.executeFinalSubmission();
      return;
    }

    const patientId = this.onboardingModel?.patient_id || this.onboardingModel?.id || this.onboardingModel?._id;
    if (patientId) {
      this.apiService.post(`/entities/api/patients/${patientId}/complete`, {}).subscribe({
        next: () => {
          this.executeFinalSubmission();
        },
        error: (err: any) => {
          console.error('Failed to complete patient onboarding:', err);
          this.executeFinalSubmission();
        }
      });
    } else {
      this.executeFinalSubmission();
    }
  }

    // const id = this.onboardingModel?.id

    // if (this.isEdit) {
    //   const editSaves = this.steps
    //     .filter(step => step.updateEndpoint && step.payloadKey)
    //     .map(step => {
    //       const stepData = { ...(this.onboardingModel[step.key] || {}) };
    //       const payload: any = {
    //         [step.payloadKey]: stepData
    //       };

    //       if (this.onboardingModel?.email) {
    //         payload[step.payloadKey].email = this.onboardingModel.email;
    //       } else {
    //         const currentEmail = this.authService.getCurrentUser()?.email;
    //         if (currentEmail) {
    //           payload[step.payloadKey].email = currentEmail;
    //         }
    //       }

    //       if (patientId) {
    //         payload.patient_id = patientId;
    //         payload[step.payloadKey].patient_id = patientId;
    //       }

    //       return this.apiService.post(step.updateEndpoint, payload);
    //     });

    //   if (editSaves.length > 0) {
    //     forkJoin(editSaves).subscribe({
    //       next: () => {
    //         this.isSubmitting = false;
    //         this.cdr.detectChanges();
    //         this.dialogService.openSnackBar('Record updated successfully!', 'OK');
    //         this.location.back();
    //       },
    //       error: (err: any) => {
    //         this.isSubmitting = false;
    //         this.cdr.detectChanges();
    //         this.dialogService.openSnackBar(err.error?.error || 'Failed to update record.', 'OK');
    //       }
    //     });
    //     return;
    //   }
    // }

    // // Only save steps that are NOT actIndividual (those are saved on Next already)
    // const saves = this.visibleSteps
    //   .filter(step => step.updateEndpoint && step.payloadKey && !step.actIndividual)
    //   .map(step => {
    //     const stepData = { ...(this.onboardingModel[step.key] || {}) };

    //     // If in edit mode, include the doctor ID inside the step data
    //     if (this.isEdit && id) {
    //       stepData.id = id;
    //     }

    //     const payload: any = {
    //       [step.payloadKey]: stepData
    //     };

    //     return this.apiService.post(step.updateEndpoint, payload);
    //   });

    // if (saves.length > 0) {
    //   forkJoin(saves).subscribe({
    //     next: () => {
    //       if (patientId) {
    //         this.apiService.post(`/entities/api/patients/${patientId}/complete`, {}).subscribe({
    //           next: () => {
    //             localStorage.setItem('onboarded_completed', 'true');
    //             this.executeFinalSubmission();
    //           },
    //           error: () => {
    //             localStorage.setItem('onboarded_completed', 'true');
    //             this.executeFinalSubmission();
    //           }
    //         });
    //       } else {
    //         this.executeFinalSubmission();
    //       }
    //     },
    //     error: (err: any) => {
    //       this.isSubmitting = false;
    //       this.cdr.detectChanges();
    //       this.dialogService.openSnackBar(err.error?.error || 'Failed to save onboarding details.', 'OK');
    //     }
    //   });
    // } else {
    //   if (patientId) {
    //     this.apiService.post(`/entities/api/patients/${patientId}/complete`, {}).subscribe({
    //       next: () => {
    //         localStorage.setItem('onboarded_completed', 'true');
    //         this.executeFinalSubmission();
    //       },
    //       error: () => {
    //         localStorage.setItem('onboarded_completed', 'true');
    //         this.executeFinalSubmission();
    //       }
    //     });
    //   } else {
    //     this.executeFinalSubmission();
    //   }
    // }
  
  route = inject(ActivatedRoute)
  executeFinalSubmission(): void {
    this.isSubmitting = false;
    let successMsg = 'Patient profile completed successfully!';
    if (this.translate) {
      if (this.props && this.props['viewtype'] === 'component') {
        successMsg = this.translate.instant('SPECIALIST.ONBOARDING.PROFILE_COMPLETED_SUCCESS');
      } else {
        successMsg = this.translate.instant('PATIENT.ONBOARDING.PROFILE_COMPLETED_SUCCESS', { defaultValue: 'Patient profile completed successfully!' });
      }
    }
    this.dialogService.openSnackBar(successMsg, 'OK');
    const patientId = this.onboardingModel?.patient_id || this.onboardingModel?.id;

    // Always notify parent/window
    window.postMessage({ type: 'ONBOARD_COMPLETE', patientId: patientId }, '*');

    if (window.self !== window.top) {
      window.parent.postMessage({ type: 'ONBOARD_COMPLETE', patientId: patientId }, '*');
      return;
    }

    if (this.props?.['isEmbedded']) {
      return;
    }

    const user = this.authService.getCurrentUser();
    const isStaff = user && user.role_name !== 'Patient' && user.role_name !== 'User';
    if (isStaff) {
      this.dialogService.CloseALL();
      this.router.navigate(['/patients']);
      return;
    }

    const onboardPath = this.router.url.includes('onboard');
    if (this.isEdit && !onboardPath) {
      this.dialogService.CloseALL();
      window.postMessage({ type: 'ONBOARD_COMPLETE' }, '*');
      if (window.self !== window.top) {
        window.parent.postMessage({ type: 'ONBOARD_COMPLETE' }, '*');
      }
      this.router.navigate(['/patients']);
      return;
    } else if (this.submitEndpoint && this.submitEndpoint.includes('/patients')) {
      this.router.navigate(['/welcome']);
    } else {
      this.router.navigate(['/user-mgmt']);
    }
  }

  toggleTerms(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.acceptTerms) {
      this.acceptTerms = false;
      this.cdr.detectChanges();
    } else {
      this.viewTerms(event);
    }
  }

  viewTerms(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.dialogService.openDialog(this.termsPopup, '600px', 'auto');
  }

  togglePrivacy(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.acceptPrivacy) {
      this.acceptPrivacy = false;
      this.cdr.detectChanges();
    } else {
      this.viewPrivacy(event);
    }
  }

  viewPrivacy(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.dialogService.openDialog(this.privacyPopup, '600px', 'auto');
  }

  acceptTermsDialog(): void {
    this.acceptTerms = true;
    this.dialogService.closeModal();
    this.cdr.detectChanges();
  }

  acceptPrivacyDialog(): void {
    this.acceptPrivacy = true;
    this.dialogService.closeModal();
    this.cdr.detectChanges();
  }

  getStepFormGroup(step: any): FormGroup {
    if (step?._formGroup) return step._formGroup;
    return this.form as FormGroup;
  }

  /**
   * No-op: Formly automatically keeps form controls in sync with the model
   * via its own change detection. Manual patching is not needed.
   */
  _patchStepForm(_step: any): void {
    // intentionally empty — Formly handles form ↔ model sync
  }

  isStepInvalid(step: any): boolean {
    if (!step) return false;
    const fg = this.getStepFormGroup(step);
    if (fg && fg.invalid) return true;

    // Custom check for required logo (profile image) fields
    let logoMissing = false;
    if (step.fields) {
      const checkLogo = (fields: any[]) => {
        for (const f of fields) {
          if (f.type === 'logo' && (f.props?.required || f.templateOptions?.required)) {
            const val = this.onboardingModel[step.key]?.[f.key];
            if (!val) logoMissing = true;
          }
          if (f.fieldGroup) checkLogo(f.fieldGroup);
        }
      };
      checkLogo(step.fields);
    }
    return logoMissing;
  }
}