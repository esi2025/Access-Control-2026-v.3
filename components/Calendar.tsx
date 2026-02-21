
import React, { useState } from 'react';
import { JALALI_MONTHS, getDaysInMonth, getFirstDayWeekday } from '../utils/jalali';

interface CalendarProps {
  year: number;
  month: number;
  activeDays: Record<string, number>; // dateStr -> count
  limit: number; // The traffic limit before considered critical
  onDayClick?: (date: string) => void;
}

const Calendar: React.FC<CalendarProps> = ({ year, month, activeDays, limit, onDayClick }) => {
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  
  const daysCount = getDaysInMonth(month, year);
  const firstDayWeekday = getFirstDayWeekday(month, year);
  
  const days = Array.from({ length: daysCount }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayWeekday }, (_, i) => i);

  return (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-[32px] shadow-lg border border-slate-200 dark:border-slate-700 w-full max-w-[360px] mx-auto transition-colors">
      <div className="flex flex-col items-center mb-5 gap-2">
        <h3 className="text-base font-black text-slate-900 dark:text-white">
          تقویم حضور: {JALALI_MONTHS[month - 1]} {year}
        </h3>
        <div className="flex gap-4 text-[8px] font-black uppercase tracking-tighter">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xs"></div>
            <span className="text-slate-400">بدون تردد</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 bg-emerald-400 border border-emerald-500 rounded-xs"></div>
            <span className="text-emerald-600">مجاز</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 bg-red-600 rounded-xs"></div>
            <span className="text-red-600">بحرانی</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map(d => (
          <div key={d} className="text-center text-black dark:text-white font-black py-1.5 text-xs">{d}</div>
        ))}
        
        {blanks.map(b => (
          <div key={`blank-${b}`} className="aspect-square"></div>
        ))}

        {days.map(day => {
          const dateKey = `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
          const count = activeDays[dateKey] || 0;
          
          let bgColor = 'bg-slate-50 dark:bg-slate-900/50'; 
          let textColor = 'text-slate-400 dark:text-slate-600'; 
          let borderColor = 'border-slate-100 dark:border-slate-800';
          let isCritical = false;

          if (count > 0) {
            if (count > limit) {
              bgColor = 'bg-red-600'; 
              textColor = 'text-white'; 
              borderColor = 'border-red-700';
              isCritical = true;
            } else {
              bgColor = 'bg-emerald-400'; 
              textColor = 'text-slate-900'; 
              borderColor = 'border-emerald-500';
            }
          }

          const isHovered = hoveredDay === dateKey;

          return (
            <div
              key={day}
              onMouseEnter={() => setHoveredDay(dateKey)}
              onMouseLeave={() => setHoveredDay(null)}
              onClick={() => onDayClick?.(dateKey)}
              className={`relative aspect-square flex flex-col items-center justify-center rounded-xl border cursor-pointer transition-all text-xs font-black ${bgColor} ${textColor} ${borderColor} ${
                isHovered ? 'scale-110 z-10 shadow-xl ring-2 ring-blue-400 ring-offset-2 dark:ring-offset-slate-800' : ''
              } ${isCritical ? 'animate-pulse-subtle' : ''}`}
            >
              <span>{day}</span>
              
              {isHovered && count > 0 && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-3 py-1.5 rounded-lg shadow-2xl whitespace-nowrap z-20 pointer-events-none border border-slate-700">
                  {count} تردد ثبت شده
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700 text-center">
        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black">
          * برای مشاهده جزئیات هر روز، روی آن کلیک کنید.
        </p>
      </div>
    </div>
  );
};

export default Calendar;
