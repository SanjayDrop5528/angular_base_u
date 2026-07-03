import { Injectable } from '@angular/core';
import { RecurrenceType } from '../../enums/enum';

@Injectable({
  providedIn: 'root'
})
export class RecurringEventsService {
  
  /**
   * Generates recurring start and end dates based on a base start/end date,
   * a recurrence pattern, and the number of repetitions.
   */
  public generateOccurrences(
    startTime: Date | string,
    endTime: Date | string,
    recurrence: RecurrenceType | string,
    repeatCount: number
  ): { startTime: Date, endTime: Date }[] {
    const occurrences: { startTime: Date, endTime: Date }[] = [];
    const startBase = new Date(startTime);
    const endBase = new Date(endTime);

    for (let i = 1; i < repeatCount; i++) {
      const nextStart = new Date(startBase);
      const nextEnd = new Date(endBase);

      if (recurrence === RecurrenceType.DAILY || recurrence === 'daily') {
        nextStart.setDate(startBase.getDate() + i);
        nextEnd.setDate(endBase.getDate() + i);
      } else if (recurrence === RecurrenceType.WEEKLY || recurrence === 'weekly') {
        nextStart.setDate(startBase.getDate() + (7 * i));
        nextEnd.setDate(endBase.getDate() + (7 * i));
      } else if (recurrence === RecurrenceType.MONTHLY || recurrence === 'monthly') {
        nextStart.setMonth(startBase.getMonth() + i);
        nextEnd.setMonth(endBase.getMonth() + i);
      }

      occurrences.push({
        startTime: nextStart,
        endTime: nextEnd
      });
    }

    return occurrences;
  }
}
