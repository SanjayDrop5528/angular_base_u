import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  standalone: false,   
  selector: 'app-confirmation-dialog',
  template: `
    <h1 mat-dialog-title>{{data.title | translate}}</h1>
    <div mat-dialog-content>
      <p>{{ data.message | translate }}</p>
    </div>
    <div mat-dialog-actions>
      <button mat-button (click)="onCancel()">{{ 'FORM.COMMON.CANCEL' | translate }}</button>
      <button mat-button color="primary" (click)="onConfirm()">{{ 'FORM.COMMON.OK' | translate }}</button>
    </div>
  `,
})
export class ConfirmationDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
