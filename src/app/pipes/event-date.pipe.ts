import { Pipe, PipeTransform } from '@angular/core';
import { formatEventDate } from '../models/team-event';

/** Zobrazí ISO čas akce česky, například „pá 20. 11. 2026 18:00“. */
@Pipe({ name: 'eventDate' })
export class EventDatePipe implements PipeTransform {
  transform(value: string): string {
    return formatEventDate(value);
  }
}
