import { describe, it, expect, vi } from 'vitest';
import { getGoogleCalendarUrl, getOutlookCalendarUrl, generateIcsContent, downloadIcsFile } from './calendar';

describe('calendar utility', () => {
  const sampleEvent = {
    title: 'Technical Interview: Jane Doe',
    description: 'First round interview with Engineering team',
    location: 'https://meet.google.com/abc-defg-hij',
    startDate: new Date('2026-10-15T14:00:00Z'),
    durationMinutes: 60,
  };

  it('generates valid Google Calendar URL', () => {
    const url = getGoogleCalendarUrl(sampleEvent);
    expect(url).toContain('https://calendar.google.com/calendar/render');
    expect(url).toContain('action=TEMPLATE');
    expect(url).toContain('text=Technical+Interview%3A+Jane+Doe');
    expect(url).toContain('dates=20261015T140000Z%2F20261015T150000Z');
    expect(url).toContain('location=https%3A%2F%2Fmeet.google.com%2Fabc-defg-hij');
  });

  it('generates valid Outlook Calendar URL', () => {
    const url = getOutlookCalendarUrl(sampleEvent);
    expect(url).toContain('https://outlook.live.com/calendar/0/deeplink/compose');
    expect(url).toContain('subject=Technical+Interview%3A+Jane+Doe');
    expect(url).toContain('startdt=2026-10-15T14%3A00%3A00.000Z');
    expect(url).toContain('enddt=2026-10-15T15%3A00%3A00.000Z');
  });

  it('generates compliant iCalendar .ics format content', () => {
    const ics = generateIcsContent(sampleEvent);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('SUMMARY:Technical Interview: Jane Doe');
    expect(ics).toContain('DTSTART:20261015T140000Z');
    expect(ics).toContain('DTEND:20261015T150000Z');
    expect(ics).toContain('LOCATION:https://meet.google.com/abc-defg-hij');
    expect(ics).toContain('STATUS:CONFIRMED');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
  });

  it('downloads .ics file via blob link', () => {
    const clickMock = vi.fn();
    const appendMock = vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as any);
    const removeMock = vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as any);

    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      setAttribute: vi.fn(),
      click: clickMock,
    } as any);

    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:test');
    window.URL.revokeObjectURL = vi.fn();

    downloadIcsFile(sampleEvent, 'custom-interview.ics');

    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(clickMock).toHaveBeenCalled();
    expect(appendMock).toHaveBeenCalled();
    expect(removeMock).toHaveBeenCalled();

    createElementSpy.mockRestore();
    appendMock.mockRestore();
    removeMock.mockRestore();
  });
});
