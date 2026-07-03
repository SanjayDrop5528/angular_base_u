import { Component, OnInit, AfterViewInit, ViewChild, TemplateRef, EventEmitter, ViewContainerRef } from '@angular/core'; 
import { FieldType, FieldWrapper, FormlyFieldConfig } from '@ngx-formly/core'; 
@Component({
  selector: 'button-input',
  template: ` 
<div style="display: grid;">
  <div>
    <label [attr.for]="id" class="form-control-label control-label" *ngIf="to.label" innerHTML="{{to.label}}"></label>
  </div>
  <div >  
    <ng-template #fieldComponent></ng-template>
  </div>
</div>
  `,standalone:false

})


export class LabelWrapperComponent extends FieldWrapper{ 
    // @ViewChild('fieldComponent', {read: ViewContainerRef}) fieldComponent: ViewContainerRef;

}