
import React from 'react';
import { PersonAttendance, AttendanceEntry } from '../types';
import { JALALI_MONTHS, getDaysInMonth, getWeekdayName } from '../utils/jalali';

interface MonthlyReportProps {
  person: PersonAttendance;
  year: number;
  month: number;
  onClose: () => void;
}

const MonthlyReport: React.FC<MonthlyReportProps> = ({ person, year: initialYear, month: initialMonth, onClose }) => {
  const [year, setYear] = React.useState(initialYear);
  const [month, setMonth] = React.useState(initialMonth);

  const daysCount = getDaysInMonth(month, year);
  const days = Array.from({ length: daysCount }, (_, i) => i + 1);

  const getDayEntries = (day: number) => {
    const dateKey = `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
    return person.dailyLogs[dateKey] || [];
  };

  const handlePrint = () => {
    window.print();
  };

  const nextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const goToCurrent = () => {
    setYear(initialYear);
    setMonth(initialMonth);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:p-0 print:bg-white print:static print:inset-auto">
      <div className="bg-white w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col rounded-3xl shadow-2xl print:shadow-none print:max-h-none print:rounded-none">
        {/* Header - Hidden in Print */}
        <div className="p-6 border-b flex justify-between items-center bg-slate-50 print:hidden">
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-200 rounded-full transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
            <h2 className="text-xl font-black text-slate-800">پیش‌نمایش گزارش ماهیانه</h2>
          </div>
          <button 
            onClick={handlePrint}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-black flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
            چاپ / خروجی PDF
          </button>
        </div>

        {/* Report Content */}
        <div className="flex-1 overflow-auto p-8 print:p-0 custom-scrollbar" dir="rtl">
          <div className="min-w-[1000px] print:min-w-0">
            {/* Report Header */}
            <div className="flex justify-between items-end mb-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center border rounded-lg overflow-hidden bg-white shadow-sm">
                  <button onClick={prevMonth} className="p-2 hover:bg-slate-100 border-l"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>
                  <span className="px-4 py-1 font-black text-slate-800">{JALALI_MONTHS[month - 1]} {year}</span>
                  <button onClick={nextMonth} className="p-2 hover:bg-slate-100 border-r"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg></button>
                </div>
                <button onClick={goToCurrent} className="text-xs font-black text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50">ماه جاری</button>
              </div>
              <h1 className="text-2xl font-black text-slate-900">تردد ماهیانه</h1>
            </div>

            {/* Personnel Info Section (Optional but good for context) */}
            <div className="mb-4 flex justify-between text-sm font-black text-slate-600 border-b pb-2">
                <span>نام پرسنل: {person.name}</span>
                <span>کد پرسنلی: {person.id}</span>
            </div>

            {/* Table */}
            <div className="border border-slate-400">
              <table className="w-full border-collapse text-[10px] font-black">
                <thead>
                  <tr className="bg-[#f2f2f2] text-slate-700">
                    <th className="border border-slate-400 p-1 w-[120px]">تاریخ</th>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
                      <th key={num} className="border border-slate-400 p-0.5 w-8">{num}</th>
                    ))}
                    <th className="border border-slate-400 p-1 w-32">شیفت و مجوز روزانه</th>
                    <th className="border border-slate-400 p-1 w-16">قبل</th>
                    <th className="border border-slate-400 p-1 w-16">بعد</th>
                  </tr>
                </thead>
                <tbody>
                  {days.map(day => {
                    const weekday = getWeekdayName(day, month, year);
                    const isFriday = weekday === "جمعه";
                    const entries = getDayEntries(day);
                    const dateStr = `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}`;
                    
                    // Check for leave or holiday based on entries (simplified logic)
                    const isLeave = false; // Placeholder for future logic

                    return (
                      <tr key={day} className={`text-center h-7 ${isFriday ? 'bg-[#fff5f5]' : 'bg-[#fffdf0]'}`}>
                        <td className={`border border-slate-400 p-0.5 text-right pr-2 ${isFriday ? 'text-red-600' : 'text-slate-800'}`}>
                          {weekday} {dateStr}
                        </td>
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(idx => (
                          <td key={idx} className="border border-slate-400 p-0.5">
                            {entries[idx]?.time || ''}
                          </td>
                        ))}
                        <td className="border border-slate-400 p-0.5">
                          {isFriday ? (
                            <span className="text-red-600">تعطیل</span>
                          ) : isLeave ? (
                            <span className="text-slate-600">۱۸۵ - مرخصی روزانه</span>
                          ) : entries.length > 0 ? (
                            "۱۸۵"
                          ) : (
                            ""
                          )}
                        </td>
                        <td className="border border-slate-400 p-0.5"></td>
                        <td className="border border-slate-400 p-0.5"></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:static, .print\\:static * {
            visibility: visible;
          }
          .print\\:static {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page {
            size: landscape;
            margin: 1cm;
          }
        }
      `}} />
    </div>
  );
};

export default MonthlyReport;
