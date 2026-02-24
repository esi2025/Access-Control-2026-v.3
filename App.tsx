
import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  FileUp, 
  Search, 
  Users, 
  Calendar as CalendarIcon, 
  Clock, 
  AlertCircle,
  FileSpreadsheet,
  Download,
  ArrowRightLeft,
  ChevronLeft,
  Trophy,
  Activity,
  FileDown,
  LogIn,
  LogOut,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Settings2,
  Home,
  ShieldAlert,
  Smartphone,
  DownloadCloud,
  Car,
  User as UserIcon,
  DoorOpen,
  Moon,
  Sun,
  Filter,
  FilterX,
  FileText
} from 'lucide-react';
import { RawRecord, PersonAttendance, AttendanceEntry } from './types';
import Calendar from './components/Calendar';
import MonthlyReport from './components/MonthlyReport';
import { parseJalaliDate, JALALI_MONTHS, excelSerialToJalali, getDaysInMonth } from './utils/jalali';

const excelTimeToSeconds = (time: any): number => {
  if (typeof time === 'number') return Math.round(time * 24 * 3600);
  if (typeof time === 'string') {
    if (time.includes(':')) {
      const parts = time.split(':');
      return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + (parts[2] ? parseInt(parts[2]) : 0);
    }
    if (!isNaN(parseFloat(time))) {
      return Math.round(parseFloat(time) * 24 * 3600);
    }
  }
  return 0;
};

const secondsToHHMMSS = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const formatFriendlyJalaliDate = (dateStr: string) => {
  const parsed = parseJalaliDate(dateStr);
  if (!parsed) return dateStr;
  return `${parsed.day} ${JALALI_MONTHS[parsed.month - 1]} ${parsed.year}`;
};

const findColumn = (row: any, keywords: string[]) => {
  if (!row) return undefined;
  const keys = Object.keys(row);
  return keys.find(key => keywords.some(k => key.toLowerCase().includes(k.toLowerCase())));
};

const compareJalaliDates = (dateA: string, dateB: string) => {
  const pA = parseJalaliDate(dateA);
  const pB = parseJalaliDate(dateB);
  if (!pA || !pB) return 0;
  if (pA.year !== pB.year) return pA.year - pB.year;
  if (pA.month !== pB.month) return pA.month - pB.month;
  return pA.day - pB.day;
};

const App: React.FC = () => {
  // استفاده از کلید جدید برای جلوگیری از تداخل با داده‌های قدیمی
  const STORAGE_KEY = 'attendance_data_v3';

  const [rawParsedData, setRawParsedData] = useState<Record<string, PersonAttendance>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log("Loaded data from storage:", Object.keys(parsed).length, "records");
        return parsed;
      }
    } catch (e) {
      console.error("Failed to load data:", e);
    }
    return {};
  });

  // جلوگیری از رفرش ناخواسته صفحه
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (Object.keys(rawParsedData).length > 0) {
        // فقط اگر داده‌ای وجود داشت، هشدار بدهد (اختیاری)
        // e.preventDefault();
        // e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [rawParsedData]);

  const [mergeInterval, setMergeInterval] = useState<number>(5);
  const [trafficLimit, setTrafficLimit] = useState<number>(2);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showAll, setShowAll] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [reportPersonId, setReportPersonId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'person' | 'vehicle'>('all');
  const [filterGate, setFilterGate] = useState<string>('all');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // ذخیره در حافظه با مدیریت خطا
  useEffect(() => {
    if (Object.keys(rawParsedData).length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(rawParsedData));
      } catch (e) {
        console.warn("Storage full or error:", e);
      }
    }
  }, [rawParsedData]);

  const clearData = () => {
    if (window.confirm("آیا از پاکسازی تمامی داده‌ها و بازگشت به حالت اولیه اطمینان دارید؟")) {
      localStorage.removeItem(STORAGE_KEY);
      // پاکسازی تمام نسخه‌های احتمالی قدیمی
      localStorage.removeItem('attendance_data');
      localStorage.removeItem('attendance_data_v2');
      setRawParsedData({});
      setSelectedPersonId(null);
      setSelectedDate(null);
      // یکبار رفرش دستی برای اطمینان از پاکسازی کش
      window.location.reload();
    }
  };

  useEffect(() => {
    setSelectedDate(null);
  }, [selectedPersonId]);

  useEffect(() => {
    console.log("Raw Data Updated:", Object.keys(rawParsedData).length, "people");
  }, [rawParsedData]);

  // گوش دادن به رویداد آمادگی برای نصب
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json<any>(ws);
        
        if (rawData.length === 0) {
          alert("فایل اکسل خالی است یا فرمت آن پشتیبانی نمی‌شود.");
          setIsProcessing(false);
          return;
        }

        // تشخیص هوشمند ستون‌ها
        const firstRow = rawData[0];
        const colMap = {
          id: findColumn(firstRow, ['CodePersonel', 'کد', 'پرسنلی', 'ID', 'Code']),
          desc: findColumn(firstRow, ['Description', 'توضیحات', 'رویداد', 'Event', 'Desc']),
          time: findColumn(firstRow, ['Timestamp2', 'زمان', 'ساعت', 'Time']),
          date: findColumn(firstRow, ['Datestamp', 'تاریخ', 'Date'])
        };

        const initialProcessed: Record<string, PersonAttendance> = {};

        rawData.forEach((row) => {
          const id = String(row[colMap.id || 'CodePersonel'] || '').trim();
          if (!id || id === 'undefined' || id === 'null') return;

          const description = String(row[colMap.desc || 'Description'] || '');
          const timeValue = row[colMap.time || 'Timestamp2'];
          const timeSeconds = excelTimeToSeconds(timeValue);
          
          let datestamp = '';
          const rawDate = row[colMap.date || 'Datestamp'];
          if (typeof rawDate === 'number') {
            datestamp = excelSerialToJalali(rawDate);
          } else if (typeof rawDate === 'string') {
            if (/^\d+$/.test(rawDate.trim())) {
              datestamp = excelSerialToJalali(Number(rawDate.trim()));
            } else {
              datestamp = rawDate.trim();
            }
          }

          if (!datestamp) return;

          const nameMatch = description.match(/Valid credential (.*?) \(/);
          const name = nameMatch ? nameMatch[1].trim() : `شخص ${id}`;

          // استخراج هوشمند درب و نوع تردد
          let gate = 'نامشخص';
          const gateMatch = description.match(/(Gate|درب)\s*(\d+|[آ-ی]+)/i);
          if (gateMatch) gate = gateMatch[0];

          let type: 'person' | 'vehicle' | 'unknown' = 'unknown';
          if (description.toLowerCase().includes('vehicle') || description.includes('خودرو')) {
            type = 'vehicle';
          } else if (description.toLowerCase().includes('person') || description.includes('نفر') || description.includes('credential')) {
            type = 'person';
          }

          if (!initialProcessed[id]) {
            initialProcessed[id] = { id, name, entries: [], dailyLogs: {} };
          }

          const entry: AttendanceEntry = {
            time: secondsToHHMMSS(timeSeconds),
            date: datestamp,
            description: description,
            gate,
            type
          };

          if (!initialProcessed[id].dailyLogs[datestamp]) {
            initialProcessed[id].dailyLogs[datestamp] = [];
          }
          initialProcessed[id].dailyLogs[datestamp].push(entry);
        });

        if (Object.keys(initialProcessed).length === 0) {
          alert("هیچ داده معتبری در فایل یافت نشد. لطفاً از فایل نمونه استفاده کنید.");
          setIsProcessing(false);
          return;
        }

        setRawParsedData(initialProcessed);
        setSelectedPersonId(null);
        setIsProcessing(false);
      } catch (err) {
        console.error("Error parsing file:", err);
        alert("خطا در پردازش فایل اکسل.");
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const processedData = useMemo(() => {
    const finalProcessed: Record<string, PersonAttendance> = {};
    const intervalSeconds = mergeInterval * 60;

    Object.keys(rawParsedData).forEach(id => {
      const person = rawParsedData[id];
      const newDailyLogs: Record<string, AttendanceEntry[]> = {};

      Object.keys(person.dailyLogs).forEach(date => {
        const dayEntries = [...person.dailyLogs[date]].sort((a, b) => 
          excelTimeToSeconds(a.time) - excelTimeToSeconds(b.time)
        );

        const mergedEntries: AttendanceEntry[] = [];
        if (dayEntries.length > 0) {
          let currentGroup = dayEntries[0];
          for (let i = 1; i < dayEntries.length; i++) {
            const nextEntry = dayEntries[i];
            const diffSeconds = excelTimeToSeconds(nextEntry.time) - excelTimeToSeconds(currentGroup.time);
            
            if (diffSeconds < intervalSeconds) {
              currentGroup = nextEntry;
            } else {
              mergedEntries.push(currentGroup);
              currentGroup = nextEntry;
            }
          }
          mergedEntries.push(currentGroup);
        }
        newDailyLogs[date] = mergedEntries;
      });

      finalProcessed[id] = {
        ...person,
        dailyLogs: newDailyLogs,
        entries: Object.values(newDailyLogs).flat()
      };
    });

    return finalProcessed;
  }, [rawParsedData, mergeInterval]);

  useEffect(() => {
    console.log("Processed Data Updated:", Object.keys(processedData).length, "people");
  }, [processedData]);

  const highTrafficPeople = useMemo(() => {
    const people = (Object.values(processedData) as PersonAttendance[]);
    if (showAll) return [...people].sort((a, b) => a.name.localeCompare(b.name, 'fa'));

    return people
      .map(p => {
        const highTrafficDays = Object.values(p.dailyLogs).filter(entries => entries.length > trafficLimit).length;
        return { ...p, highTrafficDays };
      })
      .filter(p => (p.highTrafficDays ?? 0) > 0)
      .sort((a, b) => (b.highTrafficDays ?? 0) - (a.highTrafficDays ?? 0));
  }, [processedData, trafficLimit, showAll]);

  const filteredPeople = useMemo(() => {
    if (!searchTerm) return highTrafficPeople;
    const lowerSearch = searchTerm.toLowerCase();
    return highTrafficPeople.filter(p => 
      p.name.toLowerCase().includes(lowerSearch) || p.id.toLowerCase().includes(lowerSearch)
    );
  }, [highTrafficPeople, searchTerm]);

  const selectedPerson = useMemo(() => {
    return selectedPersonId ? processedData[selectedPersonId] : null;
  }, [processedData, selectedPersonId]);

  const selectedPersonStats = useMemo(() => {
    if (!selectedPerson) return null;
    const dailyLogs = selectedPerson.dailyLogs;
    const highTrafficDaysEntries = (Object.entries(dailyLogs) as [string, AttendanceEntry[]][])
      .filter(([_, entries]) => entries.length > trafficLimit)
      .sort((a, b) => compareJalaliDates(a[0], b[0]));

    const firstDateStr = Object.keys(dailyLogs)[0] || "01/01/1404";
    const parsed = parseJalaliDate(firstDateStr);
    const year = parsed?.year || 1404;
    const month = parsed?.month || 1;

    const activeDaysMap: Record<string, number> = {};
    (Object.entries(dailyLogs) as [string, AttendanceEntry[]][]).forEach(([date, entries]) => {
      activeDaysMap[date] = entries.length;
    });

    let noAttendanceCount = 0;
    let normalAttendanceCount = 0;
    let highAttendanceCount = 0;

    const daysInMonth = getDaysInMonth(month, year);
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
      const count = activeDaysMap[dateKey] || 0;
      if (count === 0) noAttendanceCount++;
      else if (count <= trafficLimit) normalAttendanceCount++;
      else highAttendanceCount++;
    }

    return {
      totalDays: daysInMonth,
      highTrafficCount: highTrafficDaysEntries.length,
      highTrafficDetails: highTrafficDaysEntries,
      activeDaysMap,
      year,
      month,
      summary: {
        noAttendanceCount,
        normalAttendanceCount,
        highAttendanceCount
      }
    };
  }, [selectedPerson, trafficLimit]);

  const allGates = useMemo(() => {
    const gates = new Set<string>();
    (Object.values(processedData) as PersonAttendance[]).forEach(person => {
      Object.values(person.dailyLogs).forEach(entries => {
        entries.forEach(entry => {
          if (entry.gate) gates.add(entry.gate);
        });
      });
    });
    return Array.from(gates).sort();
  }, [processedData]);

  const filteredEntriesReport = useMemo(() => {
    const results: any[] = [];
    (Object.values(processedData) as PersonAttendance[]).forEach(person => {
      Object.entries(person.dailyLogs).forEach(([date, entries]) => {
        // فیلتر تاریخ
        if (filterStartDate && compareJalaliDates(date, filterStartDate) < 0) return;
        if (filterEndDate && compareJalaliDates(date, filterEndDate) > 0) return;

        entries.forEach(entry => {
          // فیلتر نوع
          if (filterType !== 'all' && entry.type !== filterType) return;
          // فیلتر درب
          if (filterGate !== 'all' && entry.gate !== filterGate) return;

          results.push({
            'نام': person.name,
            'کد پرسنلی': person.id,
            'تاریخ': date,
            'زمان': entry.time,
            'نوع': entry.type === 'vehicle' ? 'خودرویی' : 'نفری',
            'درب/موقعیت': entry.gate,
            'توضیحات': entry.description
          });
        });
      });
    });
    return results;
  }, [processedData, filterStartDate, filterEndDate, filterType, filterGate]);

  const exportFilteredToCSV = () => {
    if (filteredEntriesReport.length === 0) {
      alert("داده‌ای برای خروجی با این فیلترها وجود ندارد.");
      return;
    }
    const ws = XLSX.utils.json_to_sheet(filteredEntriesReport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Filtered_Report");
    XLSX.writeFile(wb, `Filtered_Attendance_Report_${new Date().getTime()}.xlsx`);
  };

  const exportHighTrafficReport = () => {
    if (highTrafficPeople.length === 0) return;
    const reportData = highTrafficPeople.map(p => ({
      'نام و نام خانوادگی': p.name,
      'کد پرسنلی': p.id,
      'تعداد روزهای با تردد بیش از حد': p.highTrafficDays,
      'مجموع روزهای حضور': Object.keys(p.dailyLogs).length
    }));
    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Personnel_Report");
    XLSX.writeFile(wb, "High_Traffic_Personnel.xlsx");
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        'CodePersonel': '1001',
        'Description': 'Valid credential Person Name (1001)',
        'Timestamp2': '08:30:00',
        'Datestamp': '01/01/1403'
      },
      {
        'CodePersonel': '1001',
        'Description': 'Valid credential Person Name (1001)',
        'Timestamp2': '17:15:00',
        'Datestamp': '01/01/1403'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Attendance_Template.xlsx");
  };

  return (
    <div className={`h-screen flex flex-col overflow-hidden transition-colors duration-300 ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`} dir="rtl">
      <header className={`border-b sticky top-0 z-20 shadow-sm transition-colors duration-300 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 py-5 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="bg-blue-600 p-3 rounded-xl shadow-lg">
              <FileSpreadsheet className="text-white w-7 h-7" />
            </div>
            <div className="text-right flex flex-col gap-0.5">
              <h1 className={`text-xl font-black transition-colors whitespace-nowrap leading-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>تحلیلگر هوشمند تردد گیت</h1>
              <p className={`text-[11px] font-black transition-colors leading-tight ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>شرکت عمران آذرستان ( بوشهر )</p>
              <p className={`text-[10px] font-bold transition-colors leading-tight ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>واحد فناوری اطلاعات و ارتباطات</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto justify-end">
             {/* دکمه تم تیره */}
             <div className="flex items-center gap-2">
               <span className={`text-[10px] font-black uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                 {darkMode ? 'تم تیره' : 'تم روشن'}
               </span>
               <button 
                  onClick={() => setDarkMode(!darkMode)}
                  className={`p-2.5 rounded-xl border transition-all shadow-sm active:scale-95 ${
                    darkMode ? 'bg-slate-700 border-slate-600 text-yellow-400 hover:bg-slate-600' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                  }`}
                  title={darkMode ? "تم روشن" : "تم تیره"}
               >
                  {darkMode ? <Sun size={20} /> : <Moon size={20} />}
               </button>
             </div>

             {/* دکمه نصب اپلیکیشن */}
             {deferredPrompt && (
               <button 
                  onClick={handleInstallClick}
                  className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:from-indigo-700 hover:to-blue-700 transition-all shadow-lg active:scale-95 text-xs animate-bounce"
                  title="نصب نسخه دسکتاپ/موبایل"
               >
                  <DownloadCloud size={16} />
                  <span>نصب برنامه</span>
               </button>
             )}

             <div className="flex items-center gap-3">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border shadow-sm transition-colors ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                   <Settings2 size={18} className={darkMode ? 'text-blue-400' : 'text-slate-500'} />
                   <label className={`text-xs font-black whitespace-nowrap ${darkMode ? 'text-slate-200' : 'text-black'}`}>بازه تجمیع (دقیقه):</label>
                   <input 
                      type="number" 
                      min="1" 
                      max="120" 
                      className={`w-14 border rounded-lg text-center text-sm font-black py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                        darkMode ? 'bg-slate-800 border-slate-600 text-blue-300' : 'bg-white border-slate-300 text-blue-900'
                      }`}
                      value={mergeInterval}
                      onChange={(e) => setMergeInterval(Math.max(1, parseInt(e.target.value) || 1))}
                   />
                </div>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border shadow-sm transition-colors ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                   <ShieldAlert size={18} className="text-orange-500" />
                   <label className={`text-xs font-black whitespace-nowrap ${darkMode ? 'text-slate-200' : 'text-black'}`}>حد مجاز (بار):</label>
                   <input 
                      type="number" 
                      min="1" 
                      max="50" 
                      className={`w-14 border rounded-lg text-center text-sm font-black py-1 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors ${
                        darkMode ? 'bg-slate-800 border-slate-600 text-orange-300' : 'bg-white border-slate-300 text-blue-900'
                      }`}
                      value={trafficLimit}
                      onChange={(e) => setTrafficLimit(Math.max(1, parseInt(e.target.value) || 1))}
                   />
                </div>
             </div>

             <div className="flex items-center gap-3">
                {Object.keys(rawParsedData).length > 0 && (
                  <>
                    <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl font-black transition-all shadow-md active:scale-95 text-xs ${
                          showFilters 
                            ? 'bg-blue-600 text-white' 
                            : darkMode ? 'bg-slate-700 text-slate-300 border border-slate-600' : 'bg-white text-slate-600 border border-slate-200'
                        }`}
                    >
                        {showFilters ? <FilterX size={20} /> : <Filter size={20} />}
                        <span>فیلتر پیشرفته</span>
                    </button>

                    <button 
                        onClick={exportFilteredToCSV}
                        className="flex items-center gap-3 bg-blue-500 text-white px-5 py-2.5 rounded-2xl font-black hover:bg-blue-600 transition-all shadow-md active:scale-95 text-xs"
                    >
                        <FileText size={20} />
                        <span>خروجی فیلتر شده</span>
                    </button>

                    <button 
                        onClick={exportHighTrafficReport}
                        className="flex items-center gap-3 bg-emerald-600 text-white px-5 py-2.5 rounded-2xl font-black hover:bg-emerald-700 transition-all shadow-md active:scale-95 text-xs"
                    >
                        <FileDown size={20} />
                        <span>گزارش نهایی</span>
                    </button>
                  </>
                )}
                
                <button 
                    onClick={clearData}
                    className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl font-black transition-all shadow-sm active:scale-95 text-xs ${
                      darkMode ? 'bg-red-900/30 text-red-400 border border-red-900/50 hover:bg-red-900/50' : 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100'
                    }`}
                    title="پاکسازی کامل حافظه برنامه"
                >
                    <XCircle size={20} />
                    <span>حذف داده‌ها</span>
                </button>
             </div>

             <button 
                onClick={downloadTemplate}
                className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl font-black transition-all shadow-sm active:scale-95 text-xs ${
                  darkMode ? 'bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600' : 'bg-slate-200 text-slate-700 border border-slate-300 hover:bg-slate-300'
                }`}
              >
                <Download size={20} />
                <span>دانلود نمونه</span>
              </button>
              
             <label className="flex items-center gap-3 bg-blue-600 text-white px-5 py-2.5 rounded-2xl cursor-pointer hover:bg-blue-700 transition-all shadow-lg active:scale-95 text-xs font-black">
                <FileUp size={20} />
                <span>بارگذاری فایل</span>
                <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} />
             </label>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-4 flex-1 overflow-hidden flex flex-col w-full pb-4">
        {showFilters && Object.keys(rawParsedData).length > 0 && (
          <div className={`mb-8 p-6 rounded-[32px] border shadow-xl transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center gap-3 mb-6 border-b pb-4 border-slate-100 dark:border-slate-700">
              <Filter className="text-blue-500" size={24} />
              <h2 className={`text-lg font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>فیلترهای پیشرفته گزارش‌گیری</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex flex-col gap-2">
                <label className={`text-xs font-black ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>بازه زمانی (از تاریخ):</label>
                <input 
                  type="text" 
                  placeholder="مثلاً 01/10/1404"
                  className={`p-3 rounded-xl border font-black text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                />
              </div>
              
              <div className="flex flex-col gap-2">
                <label className={`text-xs font-black ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>بازه زمانی (تا تاریخ):</label>
                <input 
                  type="text" 
                  placeholder="مثلاً 30/10/1404"
                  className={`p-3 rounded-xl border font-black text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className={`text-xs font-black ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>نوع تردد:</label>
                <select 
                  className={`p-3 rounded-xl border font-black text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                >
                  <option value="all">همه موارد</option>
                  <option value="person">فقط نفری</option>
                  <option value="vehicle">فقط خودرویی</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className={`text-xs font-black ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>درب / موقعیت:</label>
                <select 
                  className={`p-3 rounded-xl border font-black text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                  value={filterGate}
                  onChange={(e) => setFilterGate(e.target.value)}
                >
                  <option value="all">همه درب‌ها</option>
                  {allGates.map(gate => (
                    <option key={gate} value={gate}>{gate}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <p className={`text-[10px] font-bold ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                * تعداد رکوردهای منطبق: <span className="text-blue-500 font-black">{filteredEntriesReport.length} مورد</span>
              </p>
              <button 
                onClick={() => {
                  setFilterStartDate('');
                  setFilterEndDate('');
                  setFilterType('all');
                  setFilterGate('all');
                }}
                className="text-xs font-black text-red-500 hover:text-red-600 transition-colors"
              >
                پاکسازی فیلترها
              </button>
            </div>
          </div>
        )}

        {isProcessing ? (
          <div className={`flex flex-col items-center justify-center py-24 rounded-3xl border shadow-sm mx-auto max-w-2xl transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-6"></div>
            <h2 className={`text-2xl font-black mb-3 ${darkMode ? 'text-white' : 'text-slate-800'}`}>در حال پردازش داده‌ها...</h2>
            <p className={`text-center px-10 text-base font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>لطفاً شکیبا باشید، در حال تحلیل ترددهای پرسنل هستیم.</p>
          </div>
        ) : !Object.keys(rawParsedData).length ? (
          <div className={`flex flex-col items-center justify-center py-24 rounded-3xl border-2 border-dashed shadow-sm mx-auto max-w-2xl transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className={`p-8 rounded-full mb-8 transition-colors ${darkMode ? 'bg-slate-700 text-blue-400' : 'bg-blue-50 text-blue-400'}`}>
              <Download size={64} />
            </div>
            <h2 className={`text-2xl font-black mb-3 ${darkMode ? 'text-white' : 'text-slate-800'}`}>در انتظار بارگذاری داده‌ها</h2>
            <p className={`text-center px-10 text-base font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>لطفاً فایل اکسل تردد پرسنل را جهت استخراج خودکار لیست افراد پرتردد بارگذاری نمایید.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 overflow-hidden">
            <div className="lg:col-span-4 flex flex-col overflow-hidden">
              <div className={`p-5 rounded-3xl shadow-sm border flex flex-col flex-1 overflow-hidden transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className="relative mb-6">
                  <Search className="absolute right-4 top-3.5 text-slate-400" size={20} />
                  <input
                    type="text"
                    placeholder="جستجو در لیست..."
                    className={`w-full pr-12 pl-4 py-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-base font-black transition-colors ${
                      darkMode ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                  <div className="flex justify-between items-center mb-3 px-2">
                    <p className={`text-xs font-black uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      {showAll ? 'لیست تمامی پرسنل' : 'لیست افراد پرتردد'}
                    </p>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={showAll} 
                          onChange={(e) => setShowAll(e.target.checked)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className={`text-xs font-black ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>نمایش همه</span>
                      </label>
                      <span className="bg-orange-100 text-orange-600 text-xs px-3 py-1 rounded-full font-black">{filteredPeople.length} نفر</span>
                    </div>
                  </div>
                  {filteredPeople.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <p className="text-xs text-slate-500 font-bold">موردی با تنظیمات فعلی یافت نشد.</p>
                      <p className="text-[10px] text-slate-400 mt-1">شاید نیاز باشد "حد مجاز" را کاهش دهید.</p>
                    </div>
                  ) : (
                    filteredPeople.map(person => (
                      <button
                        key={person.id}
                        onDoubleClick={() => setSelectedPersonId(person.id)}
                        className={`w-full text-right p-4 rounded-2xl flex items-center justify-between transition-all border select-none group ${
                          selectedPersonId === person.id 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-lg scale-[1.02]' 
                          : darkMode 
                            ? 'bg-slate-800 text-slate-200 border-slate-700 hover:border-blue-500 hover:bg-slate-700'
                            : 'bg-white text-slate-700 border-slate-50 hover:border-blue-200 hover:bg-blue-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl ${selectedPersonId === person.id ? 'bg-blue-500 text-white' : darkMode ? 'bg-slate-700 text-slate-500 group-hover:bg-blue-900' : 'bg-slate-100 text-slate-400 group-hover:bg-blue-100'}`}>
                            <Users size={18} />
                          </div>
                          <div>
                            <div className="font-black text-sm leading-tight">{person.name}</div>
                            <div className={`text-xs mt-1 font-bold ${selectedPersonId === person.id ? 'text-blue-100' : 'text-slate-400'}`}>کد: {person.id}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black px-2 py-1 rounded-full ${selectedPersonId === person.id ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-600'}`}>
                             {person.highTrafficDays} روز
                          </span>
                          <ChevronLeft size={16} className={selectedPersonId === person.id ? 'text-white' : 'text-slate-300'} />
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 flex flex-col overflow-hidden">
              {!selectedPerson ? (
                <div className="flex-1 flex flex-col justify-center">
                  <div className={`p-12 rounded-[40px] border text-center shadow-lg transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-md transition-colors ${darkMode ? 'bg-slate-700 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                      <Trophy size={40} />
                    </div>
                    <h3 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>تحلیل هوشمند بر اساس پارامترها</h3>
                    <p className={`mt-4 text-base font-bold leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      برنامه با تحلیل بازه <span className="font-black text-blue-600">{mergeInterval} دقیقه‌ای</span> و حد مجاز <span className="font-black text-blue-600">{trafficLimit} بار</span>، لیست سمت راست را استخراج کرده است.
                    </p>
                    <div className="mt-10 flex flex-col items-center gap-4">
                        <div className={`flex items-center gap-3 text-sm font-black px-6 py-3 rounded-2xl transition-colors ${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-500'}`}>
                            <Activity size={18} />
                            <span>راهنما: روی نام فرد در لیست سمت راست دبل کلیک کنید.</span>
                        </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col overflow-hidden space-y-4">
                  <div className="flex justify-start">
                     <button 
                        onClick={() => setSelectedPersonId(null)}
                        className="flex items-center gap-2 bg-white text-slate-600 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all font-bold text-xs shadow-sm"
                     >
                        <Home size={16} className="text-blue-600" />
                        بازگشت به صفحه اصلی
                     </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-6 pr-1 custom-scrollbar">
                    <div className={`p-6 rounded-[32px] shadow-sm border flex items-center gap-6 flex-row-reverse transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center text-white text-3xl font-black shadow-xl">
                      {selectedPerson.name[0]}
                    </div>
                    <div className="text-right flex-1">
                      <h2 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>{selectedPerson.name}</h2>
                      <div className="flex gap-3 mt-2 justify-end items-center">
                        <button 
                          onClick={() => setReportPersonId(selectedPerson.id)}
                          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-1.5 rounded-xl text-xs font-black hover:bg-blue-700 transition-all shadow-md active:scale-95"
                        >
                          <FileText size={14} />
                          <span>خروجی PDF ماهیانه</span>
                        </button>
                        <span className={`text-xs px-3 py-1 rounded-full font-black ${darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>کد: {selectedPerson.id}</span>
                        <span className="text-orange-600 text-xs bg-orange-50 px-3 py-1 rounded-full font-black">{selectedPersonStats?.highTrafficCount} روز تردد غیرمجاز</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-4">
                        <Calendar 
                          year={selectedPersonStats?.year || 1404} 
                          month={selectedPersonStats?.month || 1} 
                          activeDays={selectedPersonStats?.activeDaysMap || {}} 
                          limit={trafficLimit}
                          onDayClick={(date) => setSelectedDate(date)}
                        />
                        
                        <div className={`p-5 rounded-3xl border shadow-sm flex flex-col gap-4 transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                            <div className={`flex items-center gap-3 border-b pb-3 ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                                <CalendarDays size={20} className="text-blue-600" />
                                <h4 className={`text-sm font-black ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>خلاصه وضعیت ماهانه</h4>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div className={`p-3 rounded-2xl border flex flex-col items-center transition-colors ${darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                                    <XCircle size={18} className="text-slate-400 mb-2" />
                                    <span className={`text-xl font-black ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{selectedPersonStats?.summary.noAttendanceCount}</span>
                                    <span className="text-[10px] font-black text-slate-500">بدون تردد</span>
                                </div>
                                <div className={`p-3 rounded-2xl border flex flex-col items-center transition-colors ${darkMode ? 'bg-emerald-900/20 border-emerald-900/30' : 'bg-emerald-50 border-emerald-100'}`}>
                                    <CheckCircle2 size={18} className="text-emerald-500 mb-2" />
                                    <span className={`text-xl font-black ${darkMode ? 'text-emerald-300' : 'text-emerald-800'}`}>{selectedPersonStats?.summary.normalAttendanceCount}</span>
                                    <span className="text-[10px] font-black text-emerald-600">مجاز</span>
                                </div>
                                <div className={`p-3 rounded-2xl border flex flex-col items-center transition-colors ${darkMode ? 'bg-red-900/20 border-red-900/30' : 'bg-red-50 border-red-100'}`}>
                                    <AlertCircle size={18} className="text-red-500 mb-2" />
                                    <span className={`text-xl font-black ${darkMode ? 'text-red-300' : 'text-red-800'}`}>{selectedPersonStats?.summary.highAttendanceCount}</span>
                                    <span className="text-[10px] font-black text-red-600">غیرمجاز</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {selectedDate && selectedPerson?.dailyLogs[selectedDate] ? (
                      <div className={`rounded-[32px] border overflow-hidden shadow-lg flex flex-col transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <div className={`p-5 border-b text-center flex items-center justify-between gap-3 transition-colors ${darkMode ? 'bg-blue-900/20 border-slate-700' : 'bg-blue-50/20 border-slate-100'}`}>
                          <div className="flex items-center gap-3">
                            <CalendarIcon size={22} className="text-blue-500" />
                            <h3 className={`font-black text-sm ${darkMode ? 'text-white' : 'text-slate-800'}`}>جزئیات تردد: {formatFriendlyJalaliDate(selectedDate)}</h3>
                          </div>
                          <button onClick={() => setSelectedDate(null)} className="text-slate-400 hover:text-red-500 transition-colors">
                            <XCircle size={24} />
                          </button>
                        </div>
                        <div className="p-5 space-y-4 overflow-y-auto max-h-[500px] custom-scrollbar">
                          {/* خلاصه روزانه */}
                          <div className="flex gap-3 mb-6">
                            <div className={`flex-1 p-3 rounded-2xl flex flex-col items-center border transition-colors ${darkMode ? 'bg-blue-900/20 border-blue-900/30' : 'bg-blue-50 border-blue-100'}`}>
                              <span className="text-[11px] font-black text-blue-600">تردد نفری</span>
                              <span className={`text-2xl font-black ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                                {selectedPerson.dailyLogs[selectedDate].filter(e => e.type !== 'vehicle').length}
                              </span>
                            </div>
                            <div className={`flex-1 p-3 rounded-2xl flex flex-col items-center border transition-colors ${darkMode ? 'bg-amber-900/20 border-amber-900/30' : 'bg-amber-50 border-amber-100'}`}>
                              <span className="text-[11px] font-black text-amber-600">تردد خودرویی</span>
                              <span className={`text-2xl font-black ${darkMode ? 'text-amber-300' : 'text-amber-800'}`}>
                                {selectedPerson.dailyLogs[selectedDate].filter(e => e.type === 'vehicle').length}
                              </span>
                            </div>
                          </div>

                          {selectedPerson.dailyLogs[selectedDate].map((entry, idx) => {
                            const isVehicle = entry.type === 'vehicle';
                            const themeClass = isVehicle 
                              ? darkMode ? 'bg-amber-900/10 border-amber-900/30' : 'bg-amber-50/50 border-amber-200/50' 
                              : darkMode ? 'bg-blue-900/10 border-blue-900/30' : 'bg-blue-50/50 border-blue-200/50';
                            const iconBgClass = isVehicle 
                              ? darkMode ? 'bg-amber-900/40 text-amber-400' : 'bg-amber-100 text-amber-600' 
                              : darkMode ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-100 text-blue-600';
                            
                            return (
                              <div key={idx} className={`flex flex-col p-4 rounded-2xl border shadow-sm transition-all hover:shadow-md ${themeClass} gap-3`}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-2xl shadow-inner ${iconBgClass}`}>
                                      {isVehicle ? <Car size={22} /> : <UserIcon size={22} />}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className={`font-black text-lg leading-none ${darkMode ? 'text-white' : 'text-slate-800'}`}>{entry.time}</span>
                                      <span className={`text-[10px] font-black mt-1.5 uppercase tracking-wider ${isVehicle ? 'text-amber-500' : 'text-blue-500'}`}>
                                        {isVehicle ? 'تردد با خودرو' : 'تردد پیاده / نفری'}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  <div className="flex flex-col items-end gap-1">
                                    <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-black text-xs shadow-sm ${
                                      idx % 2 === 0 ? 'bg-emerald-500 text-white' : 'bg-slate-500 text-white'
                                    }`}>
                                      {idx % 2 === 0 ? <LogIn size={14} /> : <LogOut size={14} />}
                                      <span>{idx % 2 === 0 ? 'ورود' : 'خروج'}</span>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className={`flex items-center justify-between text-xs font-black border-t pt-3 mt-1 transition-colors ${darkMode ? 'border-slate-700 text-slate-400' : 'border-slate-200/30 text-slate-500'}`}>
                                  <div className="flex items-center gap-2">
                                    <div className={`p-1.5 rounded-lg border transition-colors ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`}>
                                      <DoorOpen size={14} className="text-slate-400" />
                                    </div>
                                    <span>موقعیت: <span className={darkMode ? 'text-slate-200' : 'text-slate-700'}>{entry.gate}</span></span>
                                  </div>
                                  <div className="flex items-center gap-1.5 opacity-60">
                                    <CheckCircle2 size={12} className="text-emerald-500" />
                                    <span>تایید شده</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : selectedPersonStats && selectedPersonStats.highTrafficDetails.length > 0 && (
                      <div className={`rounded-[32px] border overflow-hidden shadow-lg flex flex-col transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <div className={`p-5 border-b text-center flex items-center justify-center gap-3 transition-colors ${darkMode ? 'bg-orange-900/20 border-slate-700' : 'bg-orange-50/20 border-slate-100'}`}>
                          <AlertCircle size={22} className="text-orange-500" />
                          <h3 className={`font-black text-sm uppercase tracking-wider ${darkMode ? 'text-white' : 'text-slate-800'}`}>روزهای پرتردد (بحرانی)</h3>
                        </div>
                        <div className="divide-y divide-slate-50 overflow-y-auto custom-scrollbar flex-1 max-h-[500px]">
                          {selectedPersonStats.highTrafficDetails.map(([date, entries]) => (
                            <div key={date} className={`p-5 transition-colors flex flex-col items-center cursor-pointer ${darkMode ? 'hover:bg-slate-700/50 divide-slate-700' : 'hover:bg-slate-50/30 divide-slate-50'}`} onClick={() => setSelectedDate(date)}>
                              <div className="flex flex-col items-center gap-2 mb-4">
                                <span className={`font-black border px-4 py-1.5 rounded-xl text-xs shadow-sm transition-colors ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
                                  {formatFriendlyJalaliDate(date)}
                                </span>
                                <span className="text-[10px] text-orange-700 font-black bg-orange-100 px-3 py-1 rounded-full">
                                  {entries.length} تردد
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3 w-full">
                                {[...entries].sort((a,b) => String(a.time).localeCompare(String(b.time))).map((entry, idx) => {
                                  const isEntry = idx % 2 === 0;
                                  return (
                                    <div 
                                      key={idx} 
                                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                                        isEntry 
                                          ? darkMode ? 'bg-emerald-900/20 border-emerald-900/30 text-emerald-300' : 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                                          : darkMode ? 'bg-sky-900/20 border-sky-900/30 text-sky-300' : 'bg-sky-50 border-sky-100 text-sky-700'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        {isEntry ? <LogIn size={14} /> : <LogOut size={14} />}
                                        <span className="text-sm font-black">{entry.time}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>

      <footer className={`border-t px-6 py-2 z-20 transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="max-w-7xl mx-auto flex flex-row items-center justify-between">
           <div className={`text-[10px] font-black text-right ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              واحد فناوری اطلاعات و ارتباطات شرکت عمران آذرستان
           </div>
           <p className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              نسخه ۳.۰ (Dark Mode & HD Optimized)
           </p>
        </div>
      </footer>

      {reportPersonId && processedData[reportPersonId] && (
        <MonthlyReport 
          person={processedData[reportPersonId]}
          year={selectedPersonStats?.year || 1404}
          month={selectedPersonStats?.month || 1}
          onClose={() => setReportPersonId(null)}
        />
      )}
    </div>
  );
};

export default App;
