import { Component, EventEmitter, Input, Output, OnChanges, inject, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-toggle-switch',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div>
      <input [id]="randomId" [(ngModel)]="checked" type="checkbox" (change)="onToggle()" />
      <label [for]="randomId">Toggle</label>
    </div>
  `,
  styles: [`
    input[type=checkbox] {
      height: 0;
      width: 0;
      visibility: hidden;
    }

    label {
      cursor: pointer;
      text-indent: -9999px;
      width: 42px;
      height: 25px;
      background: var(--toogle-inactive, grey);
      display: block;
      border-radius: 100px;
      position: relative;
    }

    label:after {
      content: '';
      position: absolute;
      top: 5px;
      left: 5px;
      width: 16px;
      height: 15px;
      background: #fff;
      border-radius: 90px;
      transition: 0.3s;
    }

    input:checked + label {
      background: var(--toogle-active, var(--primary-color, #1a73e8));
    }

    input:checked + label:after {
      left: calc(100% - 5px);
      transform: translateX(-100%);
      
    }

    label:active:after {
      width: 30px;
    }

    div {
      display: flex;
      justify-content: center;
      align-items: center;
    }
  `]
})
export class ToggleSwitchComponent implements OnChanges {
  @Input() checked: any;
  @Output() valueChanged = new EventEmitter<any>();
  cdr=inject(ChangeDetectorRef)
  randomId = `switch-${self.crypto.randomUUID().substring(0, 8)}`;

  ngOnChanges(): void {
    // console.log('Checked value changed:', this.checked);
    try {
      const inputElement = document.getElementById(this.randomId) as HTMLInputElement | null;
      if (inputElement) {
        inputElement.checked = this.checked;
        this.cdr.detectChanges();
      } else {
        // console.warn(`Element with ID ${this.randomId} not found.`);
      }
    } catch (error) {
      // console.error('Failed to set checkbox state:', error);
    }
    
  }

  onToggle(): void {
    // console.log(this.checked);
    
    this.valueChanged.emit({currentValue:this.checked,previousValue:!this.checked});
    // this.checked=!this.checked
  }
}
