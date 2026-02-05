import { formatDateString, getNowInTimezone, getTodayString } from './index';

describe('date.utils', () => {
  describe('formatDateString', () => {
    it('should format a date as YYYY-MM-DD', () => {
      const date = new Date(2024, 0, 15); // January 15, 2024
      expect(formatDateString(date)).toBe('2024-01-15');
    });

    it('should pad single-digit months with zero', () => {
      const date = new Date(2024, 4, 5); // May 5, 2024
      expect(formatDateString(date)).toBe('2024-05-05');
    });

    it('should pad single-digit days with zero', () => {
      const date = new Date(2024, 11, 3); // December 3, 2024
      expect(formatDateString(date)).toBe('2024-12-03');
    });

    it('should handle end of year dates', () => {
      const date = new Date(2024, 11, 31); // December 31, 2024
      expect(formatDateString(date)).toBe('2024-12-31');
    });
  });

  describe('getNowInTimezone', () => {
    it('should return a Date object', () => {
      const result = getNowInTimezone();
      expect(result).toBeInstanceOf(Date);
    });

    it('should return a valid date (not NaN)', () => {
      const result = getNowInTimezone();
      expect(result.getTime()).not.toBeNaN();
    });
  });

  describe('getTodayString', () => {
    it('should return a string in YYYY-MM-DD format', () => {
      const result = getTodayString();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return the same date as formatDateString(getNowInTimezone())', () => {
      const result = getTodayString();
      const expected = formatDateString(getNowInTimezone());
      expect(result).toBe(expected);
    });
  });
});
