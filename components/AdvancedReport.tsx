
import React from 'react';
import { PersonAttendance, AttendanceEntry } from '../types';
import { formatFriendlyJalaliDate } from '../utils/jalali';

interface AdvancedReportProps {
  people: PersonAttendance[];
  trafficLimit: number;
  onClose: () => void;
  darkMode?: boolean;
}

const AdvancedReport: React.FC<AdvancedReportProps> = ({ people, trafficLimit, onClose, darkMode = false }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:p-0 print:bg-white print:static print:inset-auto">
      <div className={`w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col rounded-3xl shadow-2xl print:shadow-none print:max-h-none print:rounded-none transition-colors ${darkMode ? 'bg-slate-900 border border-slate-700' : 'bg-white'}`}>
        {/* Header - Hidden in Print */}
        <div className={`p-6 border-b flex justify-between items-center print:hidden transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose}
              className={`p-2 rounded-full transition-colors flex items-center gap-2 px-4 py-2 ${darkMode ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
              title="بستن"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              <span className="font-black text-xs">بستن</span>
            </button>
            <h2 className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>گزارش تجمیعی افراد پرتردد</h2>
          </div>
          <button 
            onClick={handlePrint}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-black flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
            چاپ گزارش
          </button>
        </div>

        {/* Report Content */}
        <div className="flex-1 overflow-auto p-8 print:p-0 custom-scrollbar" dir="rtl">
          <table className="w-full border-collapse border border-slate-300 text-right text-xs">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 p-2 font-black w-12 text-center">ردیف</th>
                <th className="border border-slate-300 p-2 font-black w-48">نام و کد پرسنلی</th>
                <th className="border border-slate-300 p-2 font-black w-32 text-center">تاریخ</th>
                <th className="border border-slate-300 p-2 font-black w-20 text-center">تعداد</th>
                <th className="border border-slate-300 p-2 font-black">جزئیات ترددها (زمان - جهت)</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                let globalIndex = 1;
                return people.map((person) => {
                  const highTrafficDays = (Object.entries(person.dailyLogs) as [string, AttendanceEntry[]][])
                    .filter(([_, entries]) => entries.length > trafficLimit)
                    .sort((a, b) => a[0].localeCompare(b[0]));

                  if (highTrafficDays.length === 0) return null;

                  return highTrafficDays.map(([date, entries], dayIdx) => (
                    <tr key={`${person.id}-${date}`} className="hover:bg-slate-50 transition-colors">
                      <td className="border border-slate-300 p-2 text-center font-bold">{globalIndex++}</td>
                      {dayIdx === 0 ? (
                        <td className="border border-slate-300 p-2 font-black align-top" rowSpan={highTrafficDays.length}>
                          <div className="text-slate-900">{person.name}</div>
                          <div className="text-[10px] text-slate-500 font-bold">{person.id}</div>
                          <div className="mt-1 text-[9px] text-orange-600 font-black">{highTrafficDays.length} روز بحرانی</div>
                        </td>
                      ) : null}
                      <td className="border border-slate-300 p-2 text-center font-bold text-slate-700">
                        {formatFriendlyJalaliDate(date)}
                      </td>
                      <td className="border border-slate-300 p-2 text-center font-black text-blue-600">
                        {entries.length}
                      </td>
                      <td className="border border-slate-300 p-1">
                        <div className="flex flex-wrap gap-1">
                          {entries.map((entry, idx) => (
                            <div key={idx} className={`px-1.5 py-0.5 rounded border text-[10px] font-black flex items-center gap-1 ${entry.direction === 'in' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-sky-50 border-sky-100 text-sky-700'}`}>
                              <span>{entry.time}</span>
                              <span className="opacity-50 text-[8px]">{entry.direction === 'in' ? 'ورود' : 'خروج'}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ));
                });
              })()}
            </tbody>
          </table>
          
          {people.length === 0 && (
            <div className="text-center py-12 text-slate-400 font-bold">
              موردی برای نمایش یافت نشد.
            </div>
          )}
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
            size: A4;
            margin: 1cm;
          }
        }
      `}} />
    </div>
  );
};

export default AdvancedReport;
