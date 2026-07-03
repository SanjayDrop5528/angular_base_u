import { Directive, ElementRef, Input } from '@angular/core';

@Directive({
  selector: '[appAppendData]', 
  standalone: true
})
export class AppendDataDirective {
  @Input() set appAppendData(context: { dragable: boolean, data?: any }) {
    if (!context) return;

    const { dragable, data } = context; 

    if (dragable) {
      this.elementRef.nativeElement.setAttribute('data-gs-widget', JSON.stringify(data ?? {}));
    } else {
      this.elementRef.nativeElement.removeAttribute('data-gs-widget');
    }
  }

  constructor(private elementRef: ElementRef) { }
}
