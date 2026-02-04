import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getTodayString,
  formatDateString,
  getStartOfWeek,
  getWeekDates,
  formatWeekRange,
} from './date.utils'

describe('date.utils', () => {
  describe('formatDateString', () => {
    it('formats date as YYYY-MM-DD', () => {
      const date = new Date(2026, 1, 4) // Feb 4, 2026
      expect(formatDateString(date)).toBe('2026-02-04')
    })

    it('pads single-digit months with zero', () => {
      const date = new Date(2026, 0, 15) // Jan 15, 2026
      expect(formatDateString(date)).toBe('2026-01-15')
    })

    it('pads single-digit days with zero', () => {
      const date = new Date(2026, 11, 5) // Dec 5, 2026
      expect(formatDateString(date)).toBe('2026-12-05')
    })

    it('handles end of year', () => {
      const date = new Date(2026, 11, 31) // Dec 31, 2026
      expect(formatDateString(date)).toBe('2026-12-31')
    })

    it('handles start of year', () => {
      const date = new Date(2026, 0, 1) // Jan 1, 2026
      expect(formatDateString(date)).toBe('2026-01-01')
    })
  })

  describe('getTodayString', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns date in YYYY-MM-DD format', () => {
      vi.setSystemTime(new Date(2026, 1, 4, 12, 0, 0))
      expect(getTodayString()).toBe('2026-02-04')
    })

    it('uses local timezone, not UTC', () => {
      // Set time to 11 PM local time on Feb 4
      vi.setSystemTime(new Date(2026, 1, 4, 23, 0, 0))
      expect(getTodayString()).toBe('2026-02-04')
    })
  })

  describe('getStartOfWeek', () => {
    it('returns Sunday for a Wednesday', () => {
      const wednesday = new Date(2026, 1, 4) // Feb 4, 2026 is Wednesday
      const sunday = getStartOfWeek(wednesday)
      expect(sunday.getDay()).toBe(0) // Sunday
      expect(formatDateString(sunday)).toBe('2026-02-01')
    })

    it('returns same day for a Sunday', () => {
      const sunday = new Date(2026, 1, 1) // Feb 1, 2026 is Sunday
      const result = getStartOfWeek(sunday)
      expect(result.getDay()).toBe(0)
      expect(formatDateString(result)).toBe('2026-02-01')
    })

    it('returns previous Sunday for a Saturday', () => {
      const saturday = new Date(2026, 1, 7) // Feb 7, 2026 is Saturday
      const sunday = getStartOfWeek(saturday)
      expect(sunday.getDay()).toBe(0)
      expect(formatDateString(sunday)).toBe('2026-02-01')
    })

    it('sets time to midnight', () => {
      const date = new Date(2026, 1, 4, 15, 30, 45)
      const sunday = getStartOfWeek(date)
      expect(sunday.getHours()).toBe(0)
      expect(sunday.getMinutes()).toBe(0)
      expect(sunday.getSeconds()).toBe(0)
      expect(sunday.getMilliseconds()).toBe(0)
    })

    it('does not mutate the original date', () => {
      const original = new Date(2026, 1, 4, 15, 30, 45)
      const originalTime = original.getTime()
      getStartOfWeek(original)
      expect(original.getTime()).toBe(originalTime)
    })

    it('handles week crossing month boundary', () => {
      // Jan 31, 2026 is Saturday - week starts on Jan 25 (Sunday)
      const saturday = new Date(2026, 0, 31)
      const sunday = getStartOfWeek(saturday)
      expect(formatDateString(sunday)).toBe('2026-01-25')
    })

    it('handles week crossing year boundary', () => {
      // Jan 2, 2026 is Friday - week starts on Dec 28, 2025 (Sunday)
      const friday = new Date(2026, 0, 2)
      const sunday = getStartOfWeek(friday)
      expect(formatDateString(sunday)).toBe('2025-12-28')
    })
  })

  describe('getWeekDates', () => {
    it('returns 7 dates starting from the given date', () => {
      const startDate = new Date(2026, 1, 1) // Sunday, Feb 1
      const dates = getWeekDates(startDate)
      expect(dates).toHaveLength(7)
    })

    it('returns consecutive dates', () => {
      const startDate = new Date(2026, 1, 1) // Sunday, Feb 1
      const dates = getWeekDates(startDate)
      expect(dates).toEqual([
        '2026-02-01',
        '2026-02-02',
        '2026-02-03',
        '2026-02-04',
        '2026-02-05',
        '2026-02-06',
        '2026-02-07',
      ])
    })

    it('handles month boundary', () => {
      const startDate = new Date(2026, 0, 25) // Sunday, Jan 25
      const dates = getWeekDates(startDate)
      expect(dates).toEqual([
        '2026-01-25',
        '2026-01-26',
        '2026-01-27',
        '2026-01-28',
        '2026-01-29',
        '2026-01-30',
        '2026-01-31',
      ])
    })

    it('handles year boundary', () => {
      const startDate = new Date(2025, 11, 28) // Sunday, Dec 28, 2025
      const dates = getWeekDates(startDate)
      expect(dates).toEqual([
        '2025-12-28',
        '2025-12-29',
        '2025-12-30',
        '2025-12-31',
        '2026-01-01',
        '2026-01-02',
        '2026-01-03',
      ])
    })

    it('does not mutate the original date', () => {
      const original = new Date(2026, 1, 1)
      const originalTime = original.getTime()
      getWeekDates(original)
      expect(original.getTime()).toBe(originalTime)
    })
  })

  describe('formatWeekRange', () => {
    it('formats week range within same month', () => {
      const startDate = new Date(2026, 1, 1) // Feb 1 - Feb 7
      expect(formatWeekRange(startDate)).toBe('Feb 1 - 7, 2026')
    })

    it('formats week range crossing months', () => {
      const startDate = new Date(2026, 0, 25) // Jan 25 - Jan 31
      expect(formatWeekRange(startDate)).toBe('Jan 25 - 31, 2026')
    })

    it('formats week range crossing months (different months)', () => {
      const startDate = new Date(2026, 0, 27) // Jan 27 - Feb 2
      expect(formatWeekRange(startDate)).toBe('Jan 27 - Feb 2, 2026')
    })

    it('formats week range crossing years', () => {
      const startDate = new Date(2025, 11, 28) // Dec 28, 2025 - Jan 3, 2026
      expect(formatWeekRange(startDate)).toBe('Dec 28 - Jan 3, 2026')
    })

    it('does not mutate the original date', () => {
      const original = new Date(2026, 1, 1)
      const originalTime = original.getTime()
      formatWeekRange(original)
      expect(original.getTime()).toBe(originalTime)
    })
  })
})
