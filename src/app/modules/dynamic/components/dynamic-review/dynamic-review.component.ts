import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, OnDestroy, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormArray, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { FormlyFieldConfig, FormlyModule } from '@ngx-formly/core';
import { TranslateModule } from '@ngx-translate/core';
import * as _ from 'lodash';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { FormService } from '../../../../core/services/form.service';
import { DialogService } from '../../../../core/services/dialog.service';
import { SharedModule } from '../../../shared/shared.module';
import { DataService } from '../../../../core/services/data.service';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormlyModule,
    TranslateModule,
    SharedModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule
  ],
  selector: 'app-dynamic-review',
  templateUrl: './dynamic-review.component.html',
  styleUrls: ['./dynamic-review.component.css']
})
export class DynamicReviewComponent implements OnInit, OnDestroy {
  form = new FormGroup({});
  model: any = {};
  options: any = {};
  layoutMode: 'single' | 'stepper' = 'single';
  activeStepIndex = 0;
  saveOnNext = false;

  private _fields!: FormlyFieldConfig[];
  get fields(): FormlyFieldConfig[] {
    return this._fields;
  }
  set fields(value: FormlyFieldConfig[]) {
    if (value && this.layoutMode === 'stepper' && (!value[0] || !value[0].fieldGroup)) {
      const steps = this.config?.steps;
      const grouped: FormlyFieldConfig[] = [];

      if (Array.isArray(steps) && steps.length > 0) {
        let fieldIndex = 0;
        steps.forEach((step: any) => {
          let count = 1;
          let label = '';
          if (typeof step === 'number') {
            count = step;
          } else if (step && typeof step === 'object') {
            count = step.fieldsCount || step.fields || step.num_of_questions || step.numOfQuestions || 1;
            label = step.label || step.title || '';
          }

          if (fieldIndex < value.length) {
            const chunk = value.slice(fieldIndex, fieldIndex + count);
            grouped.push({
              fieldGroup: chunk,
              props: {
                label: label || chunk[0]?.props?.label || ''
              }
            });
            fieldIndex += count;
          }
        });

        if (fieldIndex < value.length) {
          const chunk = value.slice(fieldIndex);
          grouped.push({
            fieldGroup: chunk,
            props: {
              label: chunk[0]?.props?.label || ''
            }
          });
        }
        this._fields = grouped;
      } else {
        const stepFieldCount = this.config?.stepFieldCount || this.config?.stepFieldsCount || 1;
        for (let i = 0; i < value.length; i += stepFieldCount) {
          const chunk = value.slice(i, i + stepFieldCount);
          grouped.push({
            fieldGroup: chunk,
            props: {
              label: chunk[0]?.props?.label || ''
            }
          });
        }
        this._fields = grouped;
      }
    } else {
      this._fields = value;
    }
    this.updateStepVisibility();
  }
  config: any = null;
  pageHeading = 'Submit Review';
  formAction = 'Add';
  butText = 'Submit Review';
  id: any = undefined;
  butonflag: boolean = false;
  formName: string = '';
  collectionName: string = '';
  entityId: string = '';
  
  @Input() user_id: string = '';
  @Input() referenceId: string = '';
  @Input() eventId: string = 'reviews';
  
  @Input() needclose: boolean = false;
  @Input() viewMode: boolean = false;
  @Input() hidefilter: boolean = false;
  @Output() onClose = new EventEmitter<any>();
  @Output() onSave = new EventEmitter<any>();

  private route = inject(ActivatedRoute);
  private formService = inject(FormService);
  private dialogService = inject(DialogService);
  private dataService = inject(DataService);
  public cdr = inject(ChangeDetectorRef);
  private dialogData = inject(MAT_DIALOG_DATA, { optional: true });
  private dialogRef = inject(MatDialogRef, { optional: true });

  reviewsList: any[] = [];
  loadingReviews: boolean = false;
  private _sortBy: 'newest' | 'oldest' | 'highest' | 'lowest' = 'newest';
  get sortBy(): 'newest' | 'oldest' | 'highest' | 'lowest' {
    return this._sortBy;
  }
  set sortBy(value: 'newest' | 'oldest' | 'highest' | 'lowest') {
    this._sortBy = value;
    this.checkOverflows();
  }

  expandedReviews = new Set<string>();
  private resizeObserver?: any;

  ngOnInit() {
    if (this.dialogData) {
      this.referenceId = this.dialogData.referenceId || this.referenceId;
      this.eventId = this.dialogData.eventId || this.eventId;
      this.user_id = this.dialogData.user_id || this.user_id;
      this.viewMode = this.dialogData.viewMode !== undefined ? this.dialogData.viewMode : this.viewMode;
      this.needclose = this.dialogData.needclose !== undefined ? this.dialogData.needclose : this.needclose;
    }
    this.initLoad();
    if (this.viewMode) {
      this.fetchReviews();
    }
  }

  ngOnDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  fetchReviews() {
    if (!this.user_id) return;
    this.loadingReviews = true;
    const payload:any ={
      user_id: this.user_id,
      refid: this.referenceId,
    }
    //not use this for save this was use for get data
    this.dataService.save(`entities/api/reviews/ref`, payload).subscribe({
      next: (res: any) => {
        this.reviewsList = res?.data || [];
        this.loadingReviews = false;
        this.cdr.detectChanges();
        this.checkOverflows();
      },
      error: (err: any) => {
        console.error('Failed to fetch reviews:', err);
        this.loadingReviews = false;
        this.cdr.detectChanges();
      }
    });
  }

  checkOverflows() {
    this.measureOverflows();
    setTimeout(() => this.measureOverflows(), 100);
    setTimeout(() => this.measureOverflows(), 300);
    setTimeout(() => this.measureOverflows(), 600);
    this.setupResizeObserver();
  }

  measureOverflows() {
    let changed = false;
    this.reviewsList.forEach(review => {
      const el = document.getElementById(`review-text-${review.id}`);
      if (el) {
        const hasOverflow = el.scrollHeight > el.clientHeight;
        if (review.hasOverflow !== hasOverflow) {
          review.hasOverflow = hasOverflow;
          changed = true;
        }
      }
    });
    if (changed) {
      this.cdr.detectChanges();
    }
  }

  setupResizeObserver() {
    if (typeof ResizeObserver === 'undefined') return;
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    this.resizeObserver = new ResizeObserver(() => {
      this.measureOverflows();
    });

    setTimeout(() => {
      const container = document.querySelector('.reviews-list-container');
      if (container && this.resizeObserver) {
        this.resizeObserver.observe(container);
      }
    }, 200);
  }

  get sortedReviews() {
    let list = [...this.reviewsList];
    if (this.sortBy === 'newest') {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (this.sortBy === 'oldest') {
      list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (this.sortBy === 'highest') {
      list.sort((a, b) => b.ratings - a.ratings);
    } else if (this.sortBy === 'lowest') {
      list.sort((a, b) => a.ratings - b.ratings);
    }
    return list;
  }

  getInitials(name: string): string {
    if (!name) return 'AP';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  getStars(rating: number): number[] {
    let val = rating;
    if (val > 5) {
      val = Math.round(val / 2);
    }
    val = Math.max(1, Math.min(5, Math.round(val)));
    return Array(5).fill(0).map((_, i) => i < val ? 1 : 0);
  }

  toggleExpandReview(reviewId: string) {
    if (this.expandedReviews.has(reviewId)) {
      this.expandedReviews.delete(reviewId);
    } else {
      this.expandedReviews.add(reviewId);
    }
    this.cdr.detectChanges();
  }

  isReviewLong(text: string): boolean {
    return text ? text.length > 180 : false;
  }

  getReviewTags(review: any): string[] {
    const tags: string[] = [];
    const data = review.review_data || {};
    Object.keys(data).forEach(key => {
      const val = data[key];
      if (key.includes('qa') || key.includes('option') || key.includes('select') || key === 'specialty' || key === 'department') {
        if (typeof val === 'string' && val.length > 0 && val.length < 30) {
          tags.push(val);
        } else if (Array.isArray(val)) {
          val.forEach(v => {
            if (typeof v === 'string' && v.length > 0 && v.length < 30) {
              tags.push(v);
            }
          });
        }
      }
    });
    if (tags.length === 0 && review.entity_id) {
      tags.push(_.capitalize(review.entity_id));
    }
    return _.uniq(tags).slice(0, 3);
  }

  getReviewTitle(review: any): string {
    const data = review.review_data || {};
    return data.title || data.review_title || data.subject || 'Consultation Feedback';
  }

  getReviewText(review: any): string {
    const data = review.review_data || {};
    return data.comment || data.comments || data.feedback || data.review || data.feedback_qa || data.feedback_qa_text || 'No comments provided.';
  }

  getReviewTextKey(review: any): string {
    const data = review.review_data || {};
    const keys = ['comment', 'comments', 'feedback', 'review', 'feedback_qa', 'feedback_qa_text'];
    for (const key of keys) {
      if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
        return key;
      }
    }
    return '';
  }

  getFlatFields(fields: any[]): any[] {
    const list: any[] = [];
    const recurse = (arr: any[]) => {
      if (!arr) return;
      arr.forEach(f => {
        if (f.key) {
          list.push(f);
        }
        if (f.fieldGroup) {
          recurse(f.fieldGroup);
        }
      });
    };
    recurse(fields);
    return list;
  }

  getReviewFields(review: any): { label: string; value: any; type: string }[] {
    const data = review.review_data || {};
    const flatFields = this.getFlatFields(this.fields || []);
    const items: { label: string; value: any; type: string }[] = [];

    const textKey = this.getReviewTextKey(review);
    const excludeKeys = ['rating', 'ratings', 'id'];
    if (textKey) {
      excludeKeys.push(textKey);
    }

    flatFields.forEach(f => {
      if (excludeKeys.includes(f.key)) {
        return;
      }
      const val = data[f.key];
      if (val !== undefined && val !== null && val !== '') {
        items.push({
          label: f.props?.viewLabels || f.props?.label || f.key,
          value: val,
          type: f.type || 'text'
        });
      }
    });

    return items;
  }

  initLoad() {
    if (this.eventId) {
      const filterCondition = {
        filter: [
          {
            clause: 'AND',
            conditions: [
              {
                column: 'event_id',
                operator: 'EQUALS',
                value: this.eventId
              }
            ]
          }
        ]
      };
      this.dataService.getDataByFilter('review_forms', filterCondition).subscribe({
        next: (res: any) => {
          const eventForm = res?.data?.[0]?.response?.[0];
          let config = eventForm?.form_config;
          this.entityId = this.entityId ? this.entityId : eventForm?.entity_id;
          if (config) {
            if (typeof config === 'string') {
              try {
                config = JSON.parse(config);
              } catch (e) {
                console.error('Failed to parse form_config JSON string', e);
              }
            }
            this.config = config;
            this.pageHeading = config.pageHeading || this.pageHeading;
            this.butText = config.addButText || this.butText;
            if (config.form) {
              this.collectionName = config.form.collectionName || this.collectionName;
              if (config.layoutMode) {
                this.layoutMode = config.layoutMode;
              } else if (config.formLayout) {
                this.layoutMode = config.formLayout;
              }
              this.saveOnNext = config.saveOnNext || config.autoSaveSteps || false;
              this.fields = config.form.fields;
            }
            this.formService.formPatchMethod(this, config);
            this.cdr.detectChanges();
          } else {
            console.warn('No form_config found for eventId:', this.eventId, 'falling back to local reviews config');
            this.formName = 'reviews';
            this.formService.LoadInitData(this);
          }
        },
        error: (err) => {
          console.error('Failed to load event form config from DB, falling back to local reviews config', err);
          this.formName = 'reviews';
          this.formService.LoadInitData(this);
        }
      });
    } else {
      this.formService.LoadInitData(this);
    }
  }


  onSubmit() {
    this.saveReviewProgress(false).then((result) => {
      if (result) {
        this.onSave.emit(result);
        this.onClose.emit({ action: 'submit', data: result });
        this.dialogService.closeModal();
        if (this.dialogRef) {
          this.dialogRef.close(result);
        }
      }
    });
  }

  cancel() {
    this.onClose.emit({ action: 'cancel', data: null });
    this.dialogService.closeModal();
    if (this.dialogRef) {
      this.dialogRef.close();
    }
  }


  updateStepVisibility() {
    if (!this._fields) return;
    this._fields.forEach((f, idx) => {
      let classes = (f.className || '').split(' ').filter(c => c !== 'hidden-step' && c !== 'visible-step');

      if (this.layoutMode === 'single') {
        classes.push('visible-step');
      } else {
        if (idx === this.activeStepIndex) {
          classes.push('visible-step');
        } else {
          classes.push('hidden-step');
        }
      }
      f.className = classes.join(' ');
    });
    if (this.options && this.options.buildForm) {
      this.options.buildForm();
    }
  }

  isStepValid(field: FormlyFieldConfig): boolean {
    if (!field) return true;
    if (field.key) {
      return field.formControl ? field.formControl.valid : true;
    }
    if (field.fieldGroup) {
      return field.fieldGroup.every(f => this.isStepValid(f));
    }
    return true;
  }

  markStepTouched(field: FormlyFieldConfig) {
    if (!field) return;
    if (field.formControl) {
      field.formControl.markAsTouched();
      field.formControl.updateValueAndValidity({ emitEvent: true });
    }
    if (field.fieldGroup) {
      field.fieldGroup.forEach(f => this.markStepTouched(f));
    }
  }

  getStepFormControls(field: FormlyFieldConfig, controls: any[] = []): any[] {
    if (!field) return controls;
    if (field.key) {
      const control = field.formControl;
      if (control) {
        controls.push(control);
      }
    }
    if (field.fieldGroup) {
      field.fieldGroup.forEach(f => this.getStepFormControls(f, controls));
    }
    return controls;
  }

  saveReviewProgress(backupControls: boolean): Promise<any> {
    return new Promise((resolve) => {
      let backup: Array<{ control: any; validator: any; asyncValidator: any }> = [];

      if (backupControls) {
        if (!this._fields || !this._fields[this.activeStepIndex]) {
          resolve(null);
          return;
        }
        const currentStep = this._fields[this.activeStepIndex];
        if (!this.isStepValid(currentStep)) {
          this.markStepTouched(currentStep);
          this.cdr.detectChanges();
          resolve(null);
          return;
        }

        // Collect all controls of the current active step
        const currentControls = this.getStepFormControls(currentStep);

        const isCurrentControl = (ctrl: any): boolean => {
          let current = ctrl;
          while (current) {
            if (currentControls.includes(current)) {
              return true;
            }
            current = current.parent;
          }
          return false;
        };

        const recurseControls = (group: any) => {
          if (group && group.controls) {
            Object.keys(group.controls).forEach(key => {
              const ctrl = group.get(key);
              if (ctrl && (ctrl.controls || ctrl instanceof FormGroup || ctrl instanceof FormArray)) {
                recurseControls(ctrl);
              } else if (ctrl) {
                if (!isCurrentControl(ctrl)) {
                  backup.push({
                    control: ctrl,
                    validator: ctrl.validator,
                    asyncValidator: ctrl.asyncValidator
                  });
                  ctrl.clearValidators();
                  ctrl.clearAsyncValidators();
                  ctrl.updateValueAndValidity({ emitEvent: false });
                }
              }
            });
          }
        };

        recurseControls(this.form);
      }

      if (!this.form.valid) {
        this.form.markAllAsTouched();
        this.dialogService.openSnackBar("Please fill all required fields", "OK");

        // Restore original validators if we cleared them
        backup.forEach(item => {
          item.control.setValidators(item.validator);
          item.control.setAsyncValidators(item.asyncValidator);
          item.control.updateValueAndValidity({ emitEvent: false });
        });

        resolve(null);
        return;
      }

      this.butonflag = true;
      const formData = this.form.value as any;
      const ratingValue = formData.rating ?? formData.ratings ?? formData.overall_rating ?? 0;
      const ratings = Number(ratingValue) || 0;

      const payload: any = {
        entity_id: this.entityId,
        event_id: this.eventId,
        refid: this.referenceId,
        user_id: this.user_id,
        ratings: ratings,
        review_data: formData
      };
      if (this.id) {
        payload['id'] = this.id;
      }
      this.dataService.save('entities/api/reviews', payload).subscribe({
        next: (res: any) => {
          // Restore original validators
          backup.forEach(item => {
            item.control.setValidators(item.validator);
            item.control.setAsyncValidators(item.asyncValidator);
            item.control.updateValueAndValidity({ emitEvent: false });
          });

          if (res && res.id) {
            this.id = res.id;
            this.formAction = 'Edit';
            resolve(res);
          } else {
            resolve(null);
          }
          this.butonflag = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          // Restore original validators
          backup.forEach(item => {
            item.control.setValidators(item.validator);
            item.control.setAsyncValidators(item.asyncValidator);
            item.control.updateValueAndValidity({ emitEvent: false });
          });

          console.error('Failed to save review:', err);
          this.dialogService.openSnackBar("Failed to save review: " + (err.error?.error || err.message || 'Unknown error'), "OK");
          this.butonflag = false;
          this.cdr.detectChanges();
          resolve(null);
        }
      });
    });
  }

  saveStepProgress(): Promise<any> {
    return this.saveReviewProgress(true);
  }

  submitFinalStepProgress() {
    this.saveStepProgress().then((result) => {
      if (result) {
        this.onSave.emit(result);
        this.onClose.emit({ action: 'submit', data: result });

      }
    });
  }

  nextStep() {
    if (!this._fields || this.activeStepIndex >= this._fields.length - 1) return;
    const currentStep = this._fields[this.activeStepIndex];
    if (!this.isStepValid(currentStep)) {
      this.markStepTouched(currentStep);
      this.cdr.detectChanges();
      return;
    }

    if (this.saveOnNext) {
      this.saveStepProgress().then((result) => {
        if (result) {
          this.activeStepIndex++;
          this.updateStepVisibility();
          this.cdr.detectChanges();
        }
      });
    } else {
      this.activeStepIndex++;
      this.updateStepVisibility();
      this.cdr.detectChanges();
    }
  }

  prevStep() {
    if (this.activeStepIndex > 0) {
      this.activeStepIndex--;
      this.updateStepVisibility();
      this.cdr.detectChanges();
    }
  }
}
