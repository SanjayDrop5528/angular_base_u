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
import { PaymentService } from '../../../payment/service/payment.service';
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

  // Payment integration state
  showPaymentPanel = false;
  paymentOrderId = '';
  paymentAmount = 0;
  paymentCurrency = 'INR';
  paymentCaseNo = '';
  paymentCaseId = '';
  selectedGateway = 'cashfree';
  paying = false;
  previewHtml = '';
  previewUrl: SafeResourceUrl | null = null;
  private previewDialogRef?: MatDialogRef<any>;
  savedResult: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private _location: Location,
    private formService: FormService,
    private helperService: HelperService,
    private dialogService: DialogService,
    public cdr: ChangeDetectorRef,
    public ngZone: NgZone,
    private paymentService: PaymentService,
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
      if (result && result.data && result.data.order_created) {
        this.savedResult = result;
        this.ngZone.run(() => {
          this.showPaymentPanel = true;
          this.paymentOrderId = result.data.order_id;
          this.paymentAmount = result.data.total_amount;
          this.paymentCurrency = result.data.currency;
          this.paymentCaseNo = result.data.case_no;
          this.paymentCaseId = result.data["insert ID"] || result.data.id;
          this.cdr.detectChanges();
        });
      } else {
        this.goBack(result ?? { data: this.form.value });
        this.butonflag = true;
      }
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

  openEmailPreview(): void {
    const formValue = this.form?.getRawValue() as any;
    this.previewHtml = this.buildEmailPreviewHtml(`${formValue?.body || this.model?.body || ''}`);
    this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      `data:text/html;charset=utf-8,${encodeURIComponent(this.previewHtml)}`
    );
    this.previewDialogRef = this.matDialog.open(this.emailTemplatePreview, {
      width: '980px',
      minWidth: '720px',
      maxWidth: '94vw',
      height: '86vh',
      panelClass: 'email-template-preview-dialog',
      autoFocus: false,
      restoreFocus: false
    });
  }

  closeEmailPreview(): void {
    this.previewDialogRef?.close();
    this.previewDialogRef = undefined;
    this.previewUrl = null;
  }

  private buildEmailPreviewHtml(body: string): string {
    const content = this.normalizePreviewHtml(body).trim() || '<div class="empty-preview">No email body entered</div>';
    const readOnlyStyles = `<style>
    a,
    button,
    input,
    select,
    textarea,
    summary,
    label,
    [onclick],
    [role="button"],
    [tabindex] {
      pointer-events: none !important;
      cursor: default !important;
    }
    input,
    select,
    textarea,
    button {
      user-select: none !important;
    }
  </style>`;
    if (/<!doctype html|<html[\s>]/i.test(content)) {
      if (/<\/head>/i.test(content)) {
        return content.replace(/<\/head>/i, `${readOnlyStyles}</head>`);
      }
      return `${readOnlyStyles}${content}`;
    }
    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      margin: 0;
      background: #eef2f7;
      color: #111827;
      font-family: Arial, Helvetica, sans-serif;
      padding: 28px;
      box-sizing: border-box;
    }
    .empty-preview {
      padding: 32px;
      color: #64748b;
      text-align: center;
    }
  </style>
  ${readOnlyStyles}
</head>
<body>
${content}
</body>
</html>`;
  }

  private normalizePreviewHtml(value: string): string {
    let normalized = value || '';
    for (let i = 0; i < 2; i += 1) {
      const decoded = this.decodeHtmlEntities(normalized);
      if (decoded === normalized) break;
      normalized = decoded;
    }
    return normalized;
  }

  private decodeHtmlEntities(value: string): string {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = value;
    return textarea.value;
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
      if (this.savedResult) {
        this.goBack(this.savedResult);
      } else {
        this.onClose.emit({ action: 'cancel', data: null });
        this.dialogService.closeModal();
      }
    }
  }

  // Payment integration methods
  payNow() {
    this.paying = true;
    this.paymentService.initiatePayment(this.paymentOrderId, this.selectedGateway, this.paymentCaseId).subscribe({
      next: (res: any) => {
        if (res && res.checkout_url) {
          window.location.href = res.checkout_url;
        } else {
          this.dialogService.openSnackBar("Failed to initiate payment: no checkout URL returned", "OK");
          this.paying = false;
        }
      },
      error: (err: any) => {
        console.error("Payment initiation failed:", err);
        this.dialogService.openSnackBar("Error initiating payment", "OK");
        this.paying = false;
      }
    });
  }

  payLater() {
    if (this.savedResult) {
      this.goBack(this.savedResult);
    } else {
      this.dialogService.closeModal();
      this.onClose.emit({ action: 'cancel', data: null });
    }
  }

  getCurrencySymbol(currency: string): string {
    const symbols: { [key: string]: string } = {
      'INR': '₹',
      'USD': '$',
      'EUR': '€',
      'GBP': '£'
    };
    return symbols[currency] || (currency + ' ');
  }
}
