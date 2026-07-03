import { Directive, Input, TemplateRef, ViewContainerRef, ElementRef, Optional, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { AuthService } from '../services/auth.service';

@Directive({
  selector: '[appHasPermission],[appHasAnyPermission],[appHasAllPermissions]',
  standalone: false
})
export class HasPermissionDirective implements OnInit, OnChanges {
  private rawValue: any = null;
  private hasView = false;
  private directiveType: 'ALL' | 'ANY' = 'ALL';

  @Input() set appHasPermission(val: any) {
    this.rawValue = val;
    this.directiveType = 'ALL';
    this.updateView();
  }

  @Input() set appHasAnyPermission(val: any) {
    this.rawValue = val;
    this.directiveType = 'ANY';
    this.updateView();
  }

  @Input() set appHasAllPermissions(val: any) {
    this.rawValue = val;
    this.directiveType = 'ALL';
    this.updateView();
  }

  @Input() appHasPermissionType?: 'ALL' | 'ANY';

  constructor(
    @Optional() private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private elementRef: ElementRef,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.updateView();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['appHasPermissionType']) {
      this.updateView();
    }
  }

  private updateView() {
    const isAuthorized = this.checkPermission(this.rawValue);

    if (this.templateRef) {
      // Structural Directive behavior
      if (isAuthorized && !this.hasView) {
        this.viewContainer.createEmbeddedView(this.templateRef);
        this.hasView = true;
      } else if (!isAuthorized && this.hasView) {
        this.viewContainer.clear();
        this.hasView = false;
      }
    } else {
      // Attribute Directive behavior
      if (isAuthorized) {
        this.elementRef.nativeElement.style.display = '';
      } else {
        this.elementRef.nativeElement.style.display = 'none';
      }
    }
  }

  private checkPermission(val: any): boolean {
    if (!val) return false;

    // Determine check type (explicit type input takes precedence, otherwise set by the bound directive input)
    const type = this.appHasPermissionType || this.directiveType;
    const isAny = type === 'ANY';

    // If val is a 2D array (e.g. [['module', 'sub', 'action'], ['module2', 'sub2']])
    const isMultiple = Array.isArray(val) && val.length > 0 && Array.isArray(val[0]);
    const rules = isMultiple ? val : [val];

    const checkSingleRule = (rule: any): boolean => {
      if (typeof rule === 'string') {
        if (rule.includes(':')) {
          const parts = rule.split(':');
          return this.authService.hasPermission(parts[0], parts[1], parts[2]);
        }
        return this.authService.hasPermission(rule);
      }
      if (Array.isArray(rule)) {
        const module = rule[0];
        const submodule = rule[1];
        const action = rule[2];
        return this.authService.hasPermission(module, submodule, action);
      }
      if (rule && typeof rule === 'object') {
        return this.authService.hasPermission(rule.module, rule.submodule, rule.action || rule.screen);
      }
      return false;
    };

    if (isAny) {
      return rules.some(rule => checkSingleRule(rule));
    } else {
      return rules.every(rule => checkSingleRule(rule));
    }
  }
}
