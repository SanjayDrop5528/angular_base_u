import { Component, TemplateRef, ViewChild, AfterViewInit, OnInit } from '@angular/core';
import { FieldWrapper } from '@ngx-formly/core';
import { DataService } from '../../../core/services/data.service';

@Component({
  selector: 'formly-wrapper-addons',standalone:false,
  template: `
    <ng-template #matPrefix>
      <span
        [ngStyle]="{ cursor: props['addonLeft'].onClick ? 'pointer' : 'inherit' }"
        >
        @if (props['addonLeft'].icon) {
          <mat-icon>{{ props['addonLeft'].icon }}</mat-icon>
        }
        <span>{{ prefix }}</span>
      </span>
    </ng-template>
    
    <ng-container #fieldComponent></ng-container>
    
    
    `,
})
export class PrefixInput extends FieldWrapper<any> implements OnInit,AfterViewInit {
  @ViewChild('matPrefix', { static: true }) matPrefix!: TemplateRef<any>;
public  prefix:any
  value:any
  constructor(
    private dataService: DataService,
  ) {
    super();
  }
  ngAfterViewInit() {
    if (this.matPrefix) {
      // Note: for text use `textPrefix` property (only in Angular Material >= 15)
      this.props.prefix = this.matPrefix;
    }
  }

  ngOnInit() {
    this.value=this.field.props
    if(this.field?.props.textPrefix!= "") {
      (this.field.hooks as any).afterViewInit = (f:any) => {
        let parentkey=this.field?.parentKey
          const parentControl = this.form.get(parentkey)//this.opt.parent_key);
          parentControl?.valueChanges.subscribe((val:any) =>{
            
            let collection =this.field.ParentCollectionName
            this.dataService.getDataById(collection,val).subscribe((res: any) => {
              if(res.data!=null){
                let data=res.data[0]
               this.prefix=data[this.value.addonLeft.text]
              }
            })
           })
          }
        }
      }
}