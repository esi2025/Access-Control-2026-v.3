
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
    <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 w-full max-w-[340px] mx-auto">
      <div className="flex flex-col items-center mb-4 gap-1">
        <h3 className="text-sm font-black text-slate-800">
          تقویم حضور: {JALALI_MONTHS[month - 1]} {year}
        </h3>
        <div className="flex gap-3 text-[7px] font-bold uppercase tracking-tighter">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-slate-100 border border-slate-200 rounded-xs"></div>
            <span className="text-slate-400">بدون تردد</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-emerald-400 border border-emerald-500 rounded-xs"></div>
            <span className="text-emerald-600">مجاز</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-red-600 rounded-xs"></div>
            <span className="text-red-600">بحرانی</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map(d => (
          <div key={d} className="text-center text-slate-300 font-black py-1 text-[10px]">{d}</div>
        ))}
        
        {blanks.map(b => (
          <div key={`blank-${b}`} className="aspect-square"></div>
        ))}

        {days.map(day => {
          const dateKey = `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
          const count = activeDays[dateKey] || 0;
          
          let bgColor = 'bg-slate-50'; 
          let textColor = 'text-slate-400'; 
          let borderColor = 'border-slate-100';
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
              className={`relative aspect-square flex flex-col items-center justify-center rounded-lg border cursor-pointer transition-all text-[11px] font-black ${bgColor} ${textColor} ${borderColor} ${
                isHovered ? 'scale-110 z-10 shadow-lg ring-2 ring-blue-400 ring-offset-1' : ''
              } ${isCritical ? 'animate-pulse-subtle' : ''}`}
            >
              <span>{day}</span>
              
              {isHovered && count > 0 && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[8px] px-2 py-1 rounded shadow-xl whitespace-nowrap z-20 pointer-events-none">
                  {count} تردد ثبت شده
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 pt-3 border-t border-slate-50 text-center">
        <p className="text-[9px] text-slate-400 font-bold">
          * برای مشاهده جزئیات هر روز، روی آن کلیک کنید.
        </p>
      </div>
    </div>
  );
};

export default Calendar;
