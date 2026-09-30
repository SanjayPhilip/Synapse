/**
 * Calendar link generation & .ics export for interview scheduling
 */

export interface CalendarEvent {
  title: string;
  description?: string;
  location?: string;
  startDate?: Date;
  durationMinutes?: number;
}

function formatDateToIcs(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function getEventTimes(event: CalendarEvent): { start: Date; end: Date } {
  const start = event.startDate || new Date(Date.now() + 24 * 60 * 60 * 1000); // Defaults to tomorrow
  // Ensure starts on a clean hour or half hour if using default
  if (!event.startDate) {
    start.setMinutes(0, 0, 0);
    start.setHours(14); // 2:00 PM
  }
  const duration = event.durationMinutes || 45;
  const end = new Date(start.getTime() + duration * 60 * 1000);
  return { start, end };
}

/**
 * Generate Google Calendar one-click schedule link
 */
export function getGoogleCalendarUrl(event: CalendarEvent): string {
  const { start, end } = getEventTimes(event);
  const dates = `${formatDateToIcs(start)}/${formatDateToIcs(end)}`;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates,
    details: event.description || '',
    location: event.location || '',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate Outlook Calendar one-click schedule link
 */
export function getOutlookCalendarUrl(event: CalendarEvent): string {
  const { start, end } = getEventTimes(event);

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    body: event.description || '',
    location: event.location || '',
    startdt: start.toISOString(),
    enddt: end.toISOString(),
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Generate raw .ics file content
 */
export function generateIcsContent(event: CalendarEvent): string {
  const { start, end } = getEventTimes(event);
  const now = new Date();
  const uid = `synapse-interview-${Date.now()}-${Math.random().toString(36).slice(2, 9)}@synapse.platform`;

  // Escape special chars in text fields
  const cleanSummary = (event.title || '').replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n');
  const cleanDesc = (event.description || '').replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n');
  const cleanLocation = (event.location || '').replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Synapse//Interview Scheduler//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatDateToIcs(now)}`,
    `DTSTART:${formatDateToIcs(start)}`,
    `DTEND:${formatDateToIcs(end)}`,
    `SUMMARY:${cleanSummary}`,
    `DESCRIPTION:${cleanDesc}`,
    cleanLocation ? `LOCATION:${cleanLocation}` : '',
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
}

/**
 * Download standard .ics file for Apple Calendar, Outlook Desktop, Thunderbird, etc.
 */
export function downloadIcsFile(event: CalendarEvent, filename = 'interview.ics'): void {
  const content = generateIcsContent(event);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.ics') ? filename : `${filename}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
