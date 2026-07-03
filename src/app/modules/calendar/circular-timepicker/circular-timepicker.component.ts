import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-circular-timepicker',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './circular-timepicker.component.html',
  styleUrl: './circular-timepicker.component.scss'
})
export class CircularTimepickerComponent implements OnInit, OnChanges {
  @Input() time: Date = new Date();
  @Input() minHour: number = 0;
  @Input() maxHour: number = 23;
  @Output() timeChange = new EventEmitter<Date>();
  @Output() done = new EventEmitter<void>();

  mode: 'hours' | 'minutes' = 'hours';
  hours = 12;
  minutes = 0;
  isAm = true;

  ngOnInit(): void {
    // Initialize time display on component load
    this.updateTimeFromInput();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['time']) {
      this.updateTimeFromInput();
    }
  }

  private updateTimeFromInput(): void {
    if (!this.time) {
      this.time = new Date();
    }
    const date = new Date(this.time);
    const h = date.getHours();
    this.isAm = h < 12;
    this.hours = h % 12 === 0 ? 12 : h % 12;
    this.minutes = date.getMinutes();
  }

  private getMinuteStep(): number {
    return 5; // Standard 5-minute increments
  }

  getDisplayHours(): string {
    return this.hours.toString().padStart(2, '0');
  }

  getDisplayMinutes(): string {
    return this.minutes.toString().padStart(2, '0');
  }

  setMode(newMode: 'hours' | 'minutes') {
    this.mode = newMode;
  }

  toggleAmPm() {
    const newIsAm = !this.isAm;
    
    // Check if the toggle is valid given the time constraints
    let realHours = this.hours % 12;
    if (!newIsAm) {
      realHours += 12;
    }
    
    // Only toggle if the new time would be within bounds
    if (realHours >= this.minHour && realHours <= this.maxHour) {
      this.isAm = newIsAm;
      this.emitChange();
    }
  }

  getDialNumbers(): number[] {
    if (this.mode === 'hours') {
      const allHours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
      
      // Filter based on minHour and maxHour
      return allHours.filter(displayHour => {
        // Convert display hour to 24-hour format for both AM and PM
        const amHour = displayHour % 12;
        const pmHour = (displayHour % 12) + 12;
        
        // Check if either AM or PM version is within range
        const amValid = amHour >= this.minHour && amHour <= this.maxHour;
        const pmValid = pmHour >= this.minHour && pmHour <= this.maxHour;
        
        return amValid || pmValid;
      });
    } else {
      // Minutes - show only valid minute increments based on slot duration
      const minuteStep = this.getMinuteStep();
      const minutes: number[] = [];
      for (let i = 0; i < 60; i += minuteStep) {
        minutes.push(i);
      }
      return minutes;
    }
  }

  getNumberPosition(idx: number) {
    // Numbers are arranged clockwise starting from top (12 o'clock position)
    const dialNumbers = this.getDialNumbers();
    const number = dialNumbers[idx];
    
    let angle: number;
    if (this.mode === 'hours') {
      // For hours: 12 is at 0°, 1 is at 30°, 2 is at 60°, etc.
      angle = (number % 12) * 30 * (Math.PI / 180);
    } else {
      // For minutes: 0 is at 0°, 5 is at 30°, 10 is at 60°, etc.
      // Each minute is 6° (360° / 60 minutes)
      angle = number * 6 * (Math.PI / 180);
    }
    
    const radius = 78; // Radius from dial center (adjusted for 200px dial)
    const centerX = 100; // Half of dial face width (200px)
    const centerY = 100; // Half of dial face height (200px)
    const itemRadius = 16; // Half of element width (32px)
    
    return {
      x: centerX + radius * Math.sin(angle) - itemRadius,
      y: centerY - radius * Math.cos(angle) - itemRadius
    };
  }

  getHandRotation(): string {
    let angle = 0;
    if (this.mode === 'hours') {
      // For hours, use the actual display hour (1-12)
      angle = (this.hours % 12) * 30;
    } else {
      angle = this.minutes * 6;
    }
    return `rotate(${angle}deg)`;
  }

  isNumberSelected(num: number): boolean {
    if (this.mode === 'hours') {
      return this.hours === num;
    } else {
      // For minutes, round to nearest 5
      const minuteStep = 5;
      const rounded = Math.round(this.minutes / minuteStep) * minuteStep % 60;
      return rounded === num;
    }
  }

  selectNumber(num: number) {
    if (this.mode === 'hours') {
      // Check if this hour selection is valid
      const amHour = num % 12;
      const pmHour = (num % 12) + 12;
      
      // Determine which version (AM/PM) to use based on constraints
      const amValid = amHour >= this.minHour && amHour <= this.maxHour;
      const pmValid = pmHour >= this.minHour && pmHour <= this.maxHour;
      
      if (this.isAm && amValid) {
        this.hours = num;
      } else if (!this.isAm && pmValid) {
        this.hours = num;
      } else if (pmValid) {
        // Switch to PM if only PM is valid
        this.isAm = false;
        this.hours = num;
      } else if (amValid) {
        // Switch to AM if only AM is valid
        this.isAm = true;
        this.hours = num;
      } else {
        // Invalid selection, don't change
        return;
      }
      
      this.emitChange();
      
      this.emitChange();
      this.mode = 'minutes';
    } else {
      this.minutes = num;
      this.emitChange();
      this.done.emit(); // Select minute and we are done!
    }
  }

  prevMode() {
    if (this.mode === 'minutes') {
      this.mode = 'hours';
    }
  }

  nextMode() {
    if (this.mode === 'hours') {
      this.mode = 'minutes';
    } else {
      this.done.emit();
    }
  }

  private emitChange() {
    let realHours = this.hours % 12;
    if (!this.isAm) {
      realHours += 12;
    }
    const newDate = new Date(this.time);
    newDate.setHours(realHours, this.minutes, 0, 0); // Set seconds and milliseconds to 0
    this.time = newDate;
    this.timeChange.emit(newDate);
  }
}
