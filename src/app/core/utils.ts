export class Utils {
  /**
   * Safely formats a date object or string into YYYY-MM-DD
   */
  static formatDate(date: Date | string | null | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const month = '' + (d.getMonth() + 1);
    const day = '' + d.getDate();
    const year = d.getFullYear();

    return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
  }

  /**
   * Checks if a string or array is empty
   */
  static isEmpty(val: any): boolean {
    if (val === null || val === undefined) return true;
    if (typeof val === 'string') return val.trim().length === 0;
    if (Array.isArray(val)) return val.length === 0;
    if (typeof val === 'object') return Object.keys(val).length === 0;
    return false;
  }

  /**
   * Debounces a function call
   */
  static debounce(func: Function, wait: number): (...args: any[]) => void {
    let timeout: any;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }
}
