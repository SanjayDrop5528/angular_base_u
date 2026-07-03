import { Directive, Input, ViewContainerRef, TemplateRef, inject } from '@angular/core';
import { PermissionService } from '../services/permission/permission.service';
export declare type usedOn = 'menu' | 'button';

@Directive({
  selector: '[appVisible]', standalone: false
})
export class VisibleDirective {
  private _permissionService = inject(PermissionService);

  @Input() set appVisible(context: { config: any, usedOn: usedOn, value?: any, type?: any }) {
    const { config, value, type = "obj", usedOn } = context;

    if (config && value && type == "obj") {
      let show = true
      if (usedOn == "menu") {
        show = this._permissionService.isvisible(config)
      } else {
        show = this._permissionService.isvisibility(config, value)
      }
      if (show) {
        this.view.createEmbeddedView(this.template);
      } else {
        this.view.clear();
      }

    } else if (config && value && type == "arr") {

      let visbility = config?.some((item: any) => this._permissionService.isvisibility(item, value));

      if (visbility) {
        this.view.createEmbeddedView(this.template);
      } else {
        this.view.clear();
      }
    } else {
      this.view.createEmbeddedView(this.template);
    }

  }

  constructor(private view: ViewContainerRef, private template: TemplateRef<any>) { }

}
