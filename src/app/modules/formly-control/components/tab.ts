import { Component } from '@angular/core';
import { FieldType, FormlyFieldConfig } from '@ngx-formly/core';

@Component({
  selector: 'tab',standalone:false,
  template: `
    <mat-tab-group>
      @for (tab of field.fieldGroup; track tab; let i = $index; let last = $last) {
        <div style="background-color: #D3E2D3; border: 1px solid #3D4849;">
          @if (!tab.hide) {
            <mat-tab [label]="tab.props!.label || 'Tab'" style="height: 100%;">
              <formly-field [field]="tab"></formly-field>
            </mat-tab>
          }
        </div>
      }
    </mat-tab-group>
    `,
})
export class Tab extends FieldType {
  isValid(field: FormlyFieldConfig): any {
    if (field.key) {
      return field.formControl?.valid;
    }
    return field.fieldGroup?.every(f => this.isValid(f));
  } 
}
