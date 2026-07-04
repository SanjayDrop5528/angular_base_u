import { ChangeDetectorRef, Component, EventEmitter, Input, NgZone, Output, TemplateRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormlyFieldConfig, FormlyModule } from '@ngx-formly/core';
import { FormGroup, FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import * as _ from 'lodash';
import { CommonModule, Location } from '@angular/common';
import { FormService } from '../../../../core/services/form.service';
import { HelperService } from '../../../../core/services/utils/helper.service';
import { DialogService } from '../../../../core/services/dialog.service';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from '../../../shared/shared.module';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormlyModule,
    TranslateModule,
    SharedModule,
    FormsModule
  ],
  selector: 'app-dynamic-form',
  templateUrl: './dynamic-form.component.html',
  styleUrls: ['./dynamic-form.component.css']
})
export class DynamicFormComponent {
  @ViewChild('emailTemplatePreview') emailTemplatePreview!: TemplateRef<any>;
  form = new FormGroup({})
  pageHeading: any
  formAction = ''
  butText = ''
  id: any
  keyField: any
  isDataError = false
  config: any = null
  authdata: any
  options: any = {};
  fields!: FormlyFieldConfig[]
  paramsSubscription !: Subscription;
  @Input('formName') formName: any
  @Input('mode') mode: string = "page"
  @Input('model') model: any = {}
  @Output('onClose') onClose = new EventEmitter<any>();
  butonflag: boolean = false;
  actionHide: boolean = false;
  previewUrl: SafeResourceUrl | null = null;
  private previewDialogRef?: MatDialogRef<any>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private _location: Location,
    private formService: FormService,
    private helperService: HelperService,
    private dialogService: DialogService,
    public cdr: ChangeDetectorRef,
    public ngZone: NgZone,
    private matDialog: MatDialog,
    private sanitizer: DomSanitizer,
  ) { }
  valuchangeDetect = new Subject<any>();
  ngOnInit() {
    console.log("INIT");
    console.log(this.model);

    const { form, id = undefined } = this.route.snapshot.params;
    const { component = false } = this.route.snapshot.data;
    if (component) this.formName = form;
    this.id = id;
    if (this.mode == "page" && this.paramsSubscription) {
      this.paramsSubscription.unsubscribe()
    }
    if (this.formName && this.model && this.mode == "popup") {
      this.id = this.model['_id']

    }

    this.initLoad()
    console.log(this.form);

  }

  frmSubmit(event: any) {
    if (!this.form.valid) {
      const invalidLabels: any = this.helperService.getDataValidation(this.form.controls);
      this.dialogService.openSnackBar("Error in " + invalidLabels, "OK");
      this.form.markAllAsTouched();
      this.butonflag = false
      return;
    }
    this.formService.saveFormData(this).then((result: any) => {

      this.goBack(result ?? { data: this.form.value });
      this.butonflag = true;
    }).catch((err) => {
      this.butonflag = false;
      console.error('Save failed:', err);
    });

  }

  ngOnDestroy() {
    console.log("Component will be destroyed");
    if (this.paramsSubscription) this.paramsSubscription.unsubscribe();
  }

  initLoad() {
    console.log(this);
    console.log(this.model)
    _.set(this, 'temp_model', this.model)
    this.formService.LoadInitData(this)
  }

  goBack(data?: any) {
    console.log(data);
    if (this.config?.["noReturnResponseNeed"]) {
      this.dialogService.CloseALL()
      return
    }
    const { component } = this.route.snapshot.data || { component: false }
    if (this.config.editMode == 'page' && this.config.cancelroute_ID) {
      this.router.navigate([`${this.config.onCancelRoute}` + this.model[this.config.add_value]]);
    }
    else if (this.config.editMode == 'page' || component) {
      if (!_.hasIn(this.config, 'locationgoback')) {
        this.router.navigate([`${this.config.onCancelRoute}`]);
      } else {
        this._location.back();
      }
    }
    else {
      if (data && this.formAction == "Add") {
        console.log(data);

        // ✅ safely resolve the inserted id regardless of response shape
        const insertedId =
          _.get(data, 'data.insert ID') ??
          _.get(data, 'data["insert ID"]') ??
          _.get(data, 'data._id') ??
          _.get(data, 'data.id') ??
          _.get(data, 'insert ID') ??
          _.get(data, 'id') ??
          _.get(data, '_id');

        if (this.config.inserted_id) {
          if (data?.data) {
            data.data._id = insertedId;
          }
          this.model['_id'] = insertedId;
        } else {
          this.model['_id'] = insertedId;
        }

        let insertedData = Object.assign(data?.data ?? {}, this.model);
        Object.assign(insertedData, this.form.value);
        this.onClose.emit({ action: this.config?.['formAction'] ?? this.formAction, data: insertedData })
      } else {
        let insertedData = Object.assign(this.model, this.form.value)
        this.onClose.emit({ action: this.config?.['formAction'] ?? this.formAction, data: insertedData })
      }
      return
    }
  }

  resetBtn(data?: any) {
    this.form.reset();
    this.formAction = this.model.id ? 'Edit' : 'Add'
    this.butText = this.model.id ? 'Update' : 'Save';

  }

  shouldShowEmailPreview(): boolean {
    const formValue = this.form?.getRawValue() as any;
    return this.formName === 'notification-template'
      && `${formValue?.channel_id || this.model?.channel_id || ''}`.toLowerCase() === 'email';
  }
  cancel() {
    const { component } = this.route.snapshot.data || { component: false }
    if (this.config.editMode == "page" || component) {
      if (!_.hasIn(this.config, 'locationgoback')) {
        this.router.navigate([`${this.config.onCancelRoute}`]);
      } else {
        this._location.back();
      }
    } else {
      this.goBack();
      this.onClose.emit({ action: 'cancel', data: null });
      this.dialogService.closeModal();
    }
  }
}
