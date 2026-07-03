import { Component, inject, Inject } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { DialogService } from '../../../../core/services/dialog.service';
import { DataService } from '../../../../core/services/data.service';

@Component({
  selector: 'app-reason-dialog',
  standalone: false,
  template: `
    <h2 mat-dialog-title style="color: black;">{{ data.title }}</h2>

    <mat-dialog-content>
      <mat-form-field appearance="outline" class="w-full"*ngIf="rowData?.status=='active'&&rowData?.hierarchy_id&&(rowData.hierarchy_id!='HL0008'&&rowData.hierarchy_id!='HL0002'&&rowData.hierarchy_id!='HL0003'&&rowData.hierarchy_id!='HL0004'&&rowData.hierarchy_id!='HL0010')" >
        <mat-label>{{ 'DEACTIVATE.DEACTIVATE_TYPE' | translate }}</mat-label>
        <mat-select [formControl]="deactivateType" (selectionChange)="fetchemployee()">
          <mat-option *ngFor="let option of deactivateOptions" [value]="option.value">
            {{ option.label | translate }}
          </mat-option>
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline" class="w-full"  *ngIf="(deactivateType.value == 'TRANSFER' || deactivateType.value == 'HOLD') && rowData?.status == 'active'">
        <mat-label>{{ 'DEACTIVATE.NEW_EMPLOYEE' | translate }}</mat-label>
        <mat-select [formControl]="newemployeeId">
          <mat-option *ngFor="let option of alternativeemployee" [value]="option._id">
          {{ option.name }}
          </mat-option>
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline" class="w-full" *ngIf="!showDeactivateType || (!active || deactivateType.value)">
        <mat-label>{{ 'DEACTIVATE.REASON' | translate }}</mat-label>
        <textarea matInput [formControl]="reason" rows="4" [placeholder]="'DEACTIVATE.TYPE_REASON_PLACEHOLDER' | translate"></textarea>
      </mat-form-field>
    </mat-dialog-content>

    <div mat-dialog-actions>
      <button mat-button (click)="onCancel()">{{ 'FORM.COMMON.CANCEL' | translate }}</button>
      <button mat-button color="primary" (click)="onConfirm()">{{ 'FORM.COMMON.OK' | translate }}</button>
    </div>
  `,
})
export class ReasonDialogComponent {
  reason = new FormControl('', [Validators.required]);
  confirmChange = new FormControl(false);

  deactivateType = new FormControl('', [Validators.required]);
  newemployeeId = new FormControl('', [Validators.required]);
  showDeactivateType = false; // Toggle this externally when opening the dialog
  showAlterNativeemployee = false;
  alternativeemployee: any[] = [];
  deactivateOptions = [
    {
      "value": "TRANSFER",
      "label": "DEACTIVATE.OPTIONS.TRANSFER"
    },
    {
      "value": "HOLD",
      "label": "DEACTIVATE.OPTIONS.HOLD"
    },
    {
      "value": "IN-ACTIVE",
      "label": "DEACTIVATE.OPTIONS.INACTIVE"
    }
  ];

  dialogService = inject(DialogService);
  dataService = inject(DataService);
  translateService = inject(TranslateService);
  active = false
  rowData: any
  constructor(
    public dialogRef: MatDialogRef<ReasonDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { title: string; active: boolean, showDeactivateType?: boolean, type?: string, reason?: string, rowData: any },
  ) {
    // Read the flag from incoming data
    this.showDeactivateType = data.showDeactivateType ?? false;
    this.active = data.active ?? false;
    this.rowData = data.rowData
    console.log(this.rowData);

    // if(this.rowData?.['hasNoClass']){
    //   this.deactivateOptions = [
    //     { value: 'employee_only', label: 'Deactivate employee record only' },
    //   ];
    //   this.deactivateType.setValue('employee_only')
    // }
    if (this.rowData?.hierarchy_id && this.rowData.hierarchy_id == "HL0007") {

      this.fetchemployee()
      //     this.deactivateOptions = [
      //   { value: 'TRANSFER', label: 'change supervisor and transfer labour to new Supervisor' },
      //   { value: 'TRANSFER-HOLD', label: 'Reassign only labour and hold tasks' },
      //   { value: 'IN-ACTIVE', label: 'Deactivate supervisor and his tasks' },
      // ];

    }
  }

  fetchemployee() {

    let filterParams = {
      "filter": [
        {
          "clause": "AND",
          "conditions": [
            {
              "column": "hierarchy_id",
              "operator": "EQUALS",
              "type": "string",
              "value": this.rowData?.hierarchy_id
            }, {
              "column": "_id",
              "operator": "NOTEQUAL",
              "type": "string",
              "value": this.rowData?._id
            }, this.rowData?.location_id && {
              "column": "location_id",
              "operator": "EQUALS",
              "type": "string",
              "value": this.rowData?.location_id
            }
          ].filter(Boolean)
        }
      ], start: 0, end: 200
    }



    this.dataService.getDataByFilter('employee', filterParams).subscribe((res: any) => {
      this.alternativeemployee = res.data[0].response
    })
  }

  onCancel(): void {
    this.dialogRef.close({ confirm: false });
  }

  onConfirm(): void {
    const defstatus = this.active ? 'active' : 'deactive';

    const showDeactivateField = this.rowData?.status === 'active' &&
      this.rowData?.hierarchy_id &&
      (this.rowData?.hierarchy_id !== 'HL0008' &&
        this.rowData?.hierarchy_id !== 'HL0002' &&
        this.rowData?.hierarchy_id !== 'HL0003' &&
        this.rowData?.hierarchy_id !== 'HL0004' &&
        this.rowData?.hierarchy_id !== 'HL0010');

    const needsDeactivateType = showDeactivateField;
    const needsNewemployee = (this.deactivateType.value === 'TRANSFER' || this.deactivateType.value === 'HOLD') &&
      this.rowData?.status === 'active';

    if (
      (needsDeactivateType && !this.deactivateType.valid) ||
      (needsNewemployee && !this.newemployeeId.valid) ||
      !this.reason.valid
    ) {
      this.dialogService.openSnackBar(
        this.translateService.instant('DEACTIVATE.REQUIRED_FIELDS_ERROR'),
        this.translateService.instant('FORM.COMMON.OK')
      );
      this.deactivateType.markAsTouched();
      this.reason.markAsTouched();
      return;
    }
    let obj: any = {
      confirm: true,
      old_employee_id: this.rowData?._id,
      new_employee_id: this.newemployeeId?.value,
      reason: this.reason?.value,
      status: this.deactivateType?.value || defstatus,
      change_labour: this.confirmChange?.value,
      hierarchy_id: this.rowData?.hierarchy_id
    }


    this.dialogRef.close(obj);
  }
}
