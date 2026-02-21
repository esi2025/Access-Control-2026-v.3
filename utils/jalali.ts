
export const JALALI_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"
];

export const getDaysInMonth = (month: number, year: number) => {
  if (month <= 6) return 31;
  if (month <= 11) return 30;
  // Simplified leap year check for common Jalali years
  const isLeap = [1403, 1407, 1411, 1415].includes(year);
  return isLeap ? 30 : 29; 
};

/**
 * پیدا کردن روز هفته اولین روز ماه
 * شنبه = 0، یکشنبه = 1، ...، جمعه = 6
 */
export const getFirstDayWeekday = (month: number, year: number): number => {
  // پیدا کردن یک تاریخ میلادی تقریبی برای شروع سال شمسی
  // سال 1404 شمسی از 21 مارس 2025 شروع می‌شود
  // ما از Intl برای پیدا کردن دقیق روز استفاده می‌کنیم
  
  // یک جستجوی ساده برای پیدا کردن روز اول ماه
  // از 20 مارس سال میلادی متناظر شروع می‌کنیم (تقریبی)
  let gYear = year + 621;
  let testDate = new Date(gYear, 2, 15); // 15 March
  
  const formatter = new Intl.DateTimeFormat('en-u-ca-persian', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    calendar: 'persian'
  });

  // حرکت به جلو تا رسیدن به ماه و سال مورد نظر
  for (let i = 0; i < 400; i++) {
    const parts = formatter.formatToParts(testDate);
    const jYear = parseInt(parts.find(p => p.type === 'year')?.value || '0');
    const jMonth = parseInt(parts.find(p => p.type === 'month')?.value || '0');
    const jDay = parseInt(parts.find(p => p.type === 'day')?.value || '0');

    if (jYear === year && jMonth === month && jDay === 1) {
      // پیدا شد!
      // در جاوااسکریپت: 0 = یکشنبه، 1 = دوشنبه، ...، 6 = شنبه
      // ما می‌خواهیم: 0 = شنبه، 1 = یکشنبه، ...، 6 = جمعه
      const gWeekday = testDate.getDay(); // 0 (Sun) to 6 (Sat)
      const jalaliWeekday = (gWeekday + 1) % 7; 
      return jalaliWeekday;
    }
    testDate.setDate(testDate.getDate() + 1);
  }
  
  return 0;
};

export const parseJalaliDate = (dateStr: string) => {
  // Format: DD/MM/YYYY
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  return {
    day: parseInt(parts[0]),
    month: parseInt(parts[1]),
    year: parseInt(parts[2])
  };
};

/**
 * تبدیل تاریخ عددی اکسل (Serial Date) به رشته شمسی DD/MM/YYYY
 */
export const excelSerialToJalali = (serial: any): string => {
  if (typeof serial !== 'number') return String(serial || '');
  
  // اکسل مبنا را ۳۰ دسامبر ۱۸۹۹ در نظر می‌گیرد
  const baseDate = new Date(1899, 11, 30);
  const targetDate = new Date(baseDate.getTime() + (serial * 24 * 60 * 60 * 1000));
  
  // استفاده از فرمت تقویم فارسی مرورگر
  const formatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const parts = formatter.formatToParts(targetDate);
  const year = parts.find(p => p.type === 'year')?.value || '1404';
  const month = parts.find(p => p.type === 'month')?.value || '01';
  const day = parts.find(p => p.type === 'day')?.value || '01';
  
  // تبدیل اعداد فارسی به انگلیسی برای سازگاری با بقیه منطق برنامه
  const farsiToEn = (s: string) => s.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString());
  
  return `${farsiToEn(day)}/${farsiToEn(month)}/${farsiToEn(year)}`;
};
