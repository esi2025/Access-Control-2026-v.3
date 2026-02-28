
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
          <div className="space-y-12">
            {people.map((person) => {
              const highTrafficDays = (Object.entries(person.dailyLogs) as [string, AttendanceEntry[]][])
                .filter(([_, entries]) => entries.length > trafficLimit)
                .sort((a, b) => a[0].localeCompare(b[0]));

              if (highTrafficDays.length === 0) return null;

              return (
                <div key={person.id} className="border-b-2 border-slate-200 pb-8 last:border-0 break-inside-avoid">
                  <div className="flex justify-between items-center mb-6 bg-slate-100 p-4 rounded-xl">
                    <div className="text-right">
                      <h3 className="text-xl font-black text-slate-900">{person.name}</h3>
                      <p className="text-sm font-bold text-slate-600">کد پرسنلی: {person.id}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-orange-600">{highTrafficDays.length} روز پرتردد شناسایی شده</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {highTrafficDays.map(([date, entries]) => (
                      <div key={date} className="border rounded-xl overflow-hidden">
                        <div className="bg-slate-50 p-2 border-b flex justify-between items-center px-4">
                          <span className="font-black text-sm text-slate-800">{formatFriendlyJalaliDate(date)}</span>
                          <span className="text-xs font-bold text-slate-500">{entries.length} تردد ثبت شده</span>
                        </div>
                        <div className="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                          {entries.map((entry, idx) => (
                            <div key={idx} className={`p-2 rounded-lg border text-center text-xs font-black ${entry.direction === 'in' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-sky-50 border-sky-100 text-sky-700'}`}>
                              <span className="block">{entry.time}</span>
                              <span className="text-[9px] opacity-70">{entry.direction === 'in' ? 'ورود' : 'خروج'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
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
            size: A4;
            margin: 1cm;
          }
        }
      `}} />
    </div>
  );
};

export default AdvancedReport;
