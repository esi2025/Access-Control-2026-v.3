
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
  DoorOpen
} from 'lucide-react';
import { RawRecord, PersonAttendance, AttendanceEntry } from './types';
import Calendar from './components/Calendar';
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
    <div className="min-h-screen bg-slate-50 pb-20 overflow-x-hidden" dir="rtl">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="bg-blue-600 p-2 rounded-lg">
              <FileSpreadsheet className="text-white w-6 h-6" />
            </div>
            <div className="text-right">
              <h1 className="text-lg font-bold text-slate-800">تحلیلگر هوشمند تردد</h1>
              <p className="text-[10px] text-slate-500 font-medium">واحد فناوری اطلاعات عمران آذرستان</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
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
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                   <Settings2 size={16} className="text-slate-500" />
                   <label className="text-[11px] font-black text-black whitespace-nowrap">بازه تجمیع (دقیقه):</label>
                   <input 
                      type="number" 
                      min="1" 
                      max="120" 
                      className="w-20 bg-white border border-slate-300 rounded-md text-center text-sm font-black py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 text-blue-900"
                      value={mergeInterval}
                      onChange={(e) => setMergeInterval(Math.max(1, parseInt(e.target.value) || 1))}
                   />
                </div>
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                   <ShieldAlert size={16} className="text-orange-500" />
                   <label className="text-[11px] font-black text-black whitespace-nowrap">حد مجاز (بار):</label>
                   <input 
                      type="number" 
                      min="1" 
                      max="50" 
                      className="w-20 bg-white border border-slate-300 rounded-md text-center text-sm font-black py-1 focus:outline-none focus:ring-1 focus:ring-orange-500 text-blue-900"
                      value={trafficLimit}
                      onChange={(e) => setTrafficLimit(Math.max(1, parseInt(e.target.value) || 1))}
                   />
                </div>
             </div>

             <div className="flex items-center gap-2">
                {Object.keys(rawParsedData).length > 0 && (
                  <button 
                      onClick={exportHighTrafficReport}
                      className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-md active:scale-95 text-xs"
                  >
                      <FileDown size={18} />
                      <span>گزارش نهایی</span>
                  </button>
                )}
                
                <button 
                    onClick={clearData}
                    className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-xl font-bold hover:bg-red-100 transition-all shadow-sm active:scale-95 text-xs"
                    title="پاکسازی کامل حافظه برنامه"
                >
                    <XCircle size={18} />
                    <span>حذف داده‌ها</span>
                </button>
             </div>

             <button 
                onClick={downloadTemplate}
                className="flex items-center gap-2 bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold hover:bg-slate-300 transition-all shadow-sm active:scale-95 text-xs"
              >
                <Download size={18} />
                <span>دانلود نمونه</span>
              </button>
              
             <label className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl cursor-pointer hover:bg-blue-700 transition-all shadow-md active:scale-95 text-xs font-bold">
                <FileUp size={18} />
                <span>بارگذاری فایل</span>
                <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} />
             </label>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-8">
        {isProcessing ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm mx-auto max-w-2xl">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">در حال پردازش داده‌ها...</h2>
            <p className="text-slate-500 text-center px-6 text-sm">لطفاً شکیبا باشید، در حال تحلیل ترددهای پرسنل هستیم.</p>
          </div>
        ) : !Object.keys(rawParsedData).length ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 shadow-sm mx-auto max-w-2xl">
            <div className="bg-blue-50 p-6 rounded-full mb-6 text-blue-400">
              <Download size={48} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">در انتظار بارگذاری داده‌ها</h2>
            <p className="text-slate-500 text-center px-6 text-sm">لطفاً فایل اکسل تردد پرسنل را جهت استخراج خودکار لیست افراد پرتردد بارگذاری نمایید.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                <div className="relative mb-4">
                  <Search className="absolute right-3 top-2.5 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="جستجو در لیست..."
                    className="w-full pr-10 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm font-bold"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  <div className="flex justify-between items-center mb-2 px-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {showAll ? 'لیست تمامی پرسنل' : 'لیست افراد پرتردد'}
                    </p>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={showAll} 
                          onChange={(e) => setShowAll(e.target.checked)}
                          className="w-3 h-3 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-[9px] font-bold text-slate-500">نمایش همه</span>
                      </label>
                      <span className="bg-orange-100 text-orange-600 text-[10px] px-2 py-0.5 rounded-full font-bold">{filteredPeople.length} نفر</span>
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
                        className={`w-full text-right p-3 rounded-xl flex items-center justify-between transition-all border select-none group ${
                          selectedPersonId === person.id 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                          : 'bg-white text-slate-700 border-slate-50 hover:border-blue-200 hover:bg-blue-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg ${selectedPersonId === person.id ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-blue-100'}`}>
                            <Users size={14} />
                          </div>
                          <div>
                            <div className="font-bold text-xs leading-tight">{person.name}</div>
                            <div className={`text-[9px] mt-0.5 ${selectedPersonId === person.id ? 'text-blue-100' : 'text-slate-400'}`}>کد: {person.id}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${selectedPersonId === person.id ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-600'}`}>
                             {person.highTrafficDays} روز
                          </span>
                          <ChevronLeft size={12} className={selectedPersonId === person.id ? 'text-white' : 'text-slate-300'} />
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-8">
              {!selectedPerson ? (
                <div className="space-y-6">
                  <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center shadow-sm">
                    <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-600">
                      <Trophy size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">تحلیل هوشمند بر اساس پارامترها</h3>
                    <p className="text-slate-500 mt-2 text-sm leading-relaxed">
                      برنامه با تحلیل بازه <span className="font-bold text-blue-600">{mergeInterval} دقیقه‌ای</span> و حد مجاز <span className="font-bold text-blue-600">{trafficLimit} بار</span>، لیست سمت راست را استخراج کرده است.
                    </p>
                    <div className="mt-6 flex flex-col items-center gap-3">
                        <div className="flex items-center gap-2 text-blue-500 text-[11px] font-bold bg-blue-50 px-4 py-2 rounded-xl">
                            <Activity size={14} />
                            <span>راهنما: روی نام فرد در لیست سمت راست دبل کلیک کنید.</span>
                        </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-start">
                     <button 
                        onClick={() => setSelectedPersonId(null)}
                        className="flex items-center gap-2 bg-white text-slate-600 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all font-bold text-xs shadow-sm"
                     >
                        <Home size={16} className="text-blue-600" />
                        بازگشت به صفحه اصلی
                     </button>
                  </div>
                  
                  <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-5 flex-row-reverse">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-md">
                      {selectedPerson.name[0]}
                    </div>
                    <div className="text-right flex-1">
                      <h2 className="text-xl font-black text-slate-800">{selectedPerson.name}</h2>
                      <div className="flex gap-2 mt-1 justify-end">
                        <span className="text-slate-500 text-[9px] bg-slate-100 px-2 py-0.5 rounded-full font-bold">کد: {selectedPerson.id}</span>
                        <span className="text-orange-600 text-[9px] bg-orange-50 px-2 py-0.5 rounded-full font-bold">{selectedPersonStats?.highTrafficCount} روز تردد غیرمجاز</span>
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
                        
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3">
                            <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
                                <CalendarDays size={16} className="text-blue-600" />
                                <h4 className="text-[11px] font-black text-slate-700">خلاصه وضعیت ماهانه</h4>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex flex-col items-center">
                                    <XCircle size={14} className="text-slate-400 mb-1" />
                                    <span className="text-[14px] font-black text-slate-800">{selectedPersonStats?.summary.noAttendanceCount}</span>
                                    <span className="text-[8px] font-bold text-slate-500">بدون تردد</span>
                                </div>
                                <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-100 flex flex-col items-center">
                                    <CheckCircle2 size={14} className="text-emerald-500 mb-1" />
                                    <span className="text-[14px] font-black text-emerald-800">{selectedPersonStats?.summary.normalAttendanceCount}</span>
                                    <span className="text-[8px] font-bold text-emerald-600">مجاز</span>
                                </div>
                                <div className="bg-red-50 p-2 rounded-xl border border-red-100 flex flex-col items-center">
                                    <AlertCircle size={14} className="text-red-500 mb-1" />
                                    <span className="text-[14px] font-black text-red-800">{selectedPersonStats?.summary.highAttendanceCount}</span>
                                    <span className="text-[8px] font-bold text-red-600">غیرمجاز</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {selectedDate && selectedPerson?.dailyLogs[selectedDate] ? (
                      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
                        <div className="p-4 border-b border-slate-100 bg-blue-50/20 text-center flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <CalendarIcon size={18} className="text-blue-500" />
                            <h3 className="font-bold text-slate-800 text-xs">جزئیات تردد: {formatFriendlyJalaliDate(selectedDate)}</h3>
                          </div>
                          <button onClick={() => setSelectedDate(null)} className="text-slate-400 hover:text-slate-600">
                            <XCircle size={16} />
                          </button>
                        </div>
                        <div className="p-4 space-y-3 overflow-y-auto max-h-[400px] custom-scrollbar">
                          {/* خلاصه روزانه */}
                          <div className="flex gap-2 mb-4">
                            <div className="flex-1 bg-blue-50 border border-blue-100 p-2 rounded-2xl flex flex-col items-center">
                              <span className="text-[10px] font-bold text-blue-600">تردد نفری</span>
                              <span className="text-lg font-black text-blue-800">
                                {selectedPerson.dailyLogs[selectedDate].filter(e => e.type !== 'vehicle').length}
                              </span>
                            </div>
                            <div className="flex-1 bg-amber-50 border border-amber-100 p-2 rounded-2xl flex flex-col items-center">
                              <span className="text-[10px] font-bold text-amber-600">تردد خودرویی</span>
                              <span className="text-lg font-black text-amber-800">
                                {selectedPerson.dailyLogs[selectedDate].filter(e => e.type === 'vehicle').length}
                              </span>
                            </div>
                          </div>

                          {selectedPerson.dailyLogs[selectedDate].map((entry, idx) => {
                            const isVehicle = entry.type === 'vehicle';
                            const themeClass = isVehicle 
                              ? 'bg-amber-50/50 border-amber-200/50' 
                              : 'bg-blue-50/50 border-blue-200/50';
                            const iconBgClass = isVehicle ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600';
                            
                            return (
                              <div key={idx} className={`flex flex-col p-3 rounded-2xl border shadow-sm transition-all hover:shadow-md ${themeClass} gap-2`}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className={`p-2.5 rounded-xl shadow-inner ${iconBgClass}`}>
                                      {isVehicle ? <Car size={18} /> : <UserIcon size={18} />}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="font-black text-slate-800 text-base leading-none">{entry.time}</span>
                                      <span className={`text-[9px] font-bold mt-1 uppercase tracking-wider ${isVehicle ? 'text-amber-600' : 'text-blue-600'}`}>
                                        {isVehicle ? 'تردد با خودرو' : 'تردد پیاده / نفری'}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  <div className="flex flex-col items-end gap-1">
                                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-black text-[10px] shadow-sm ${
                                      idx % 2 === 0 ? 'bg-emerald-500 text-white' : 'bg-slate-500 text-white'
                                    }`}>
                                      {idx % 2 === 0 ? <LogIn size={12} /> : <LogOut size={12} />}
                                      <span>{idx % 2 === 0 ? 'ورود' : 'خروج'}</span>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold border-t border-slate-200/30 pt-2 mt-1">
                                  <div className="flex items-center gap-1.5">
                                    <div className="p-1 bg-white rounded-md border border-slate-100">
                                      <DoorOpen size={12} className="text-slate-400" />
                                    </div>
                                    <span>موقعیت: <span className="text-slate-700">{entry.gate}</span></span>
                                  </div>
                                  <div className="flex items-center gap-1 opacity-60">
                                    <CheckCircle2 size={10} className="text-emerald-500" />
                                    <span>تایید شده</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : selectedPersonStats && selectedPersonStats.highTrafficDetails.length > 0 && (
                      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
                        <div className="p-4 border-b border-slate-100 bg-orange-50/20 text-center flex items-center justify-center gap-2">
                          <AlertCircle size={18} className="text-orange-500" />
                          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">روزهای پرتردد (بحرانی)</h3>
                        </div>
                        <div className="divide-y divide-slate-50 overflow-y-auto custom-scrollbar flex-1 max-h-[400px]">
                          {selectedPersonStats.highTrafficDetails.map(([date, entries]) => (
                            <div key={date} className="p-4 hover:bg-slate-50/30 transition-colors flex flex-col items-center cursor-pointer" onClick={() => setSelectedDate(date)}>
                              <div className="flex flex-col items-center gap-1 mb-3">
                                <span className="font-bold text-slate-800 bg-white border border-slate-200 px-3 py-1 rounded-lg text-[10px] shadow-sm">
                                  {formatFriendlyJalaliDate(date)}
                                </span>
                                <span className="text-[8px] text-orange-700 font-bold bg-orange-100 px-2 py-0.5 rounded-full">
                                  {entries.length} تردد
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-2 w-full">
                                {[...entries].sort((a,b) => String(a.time).localeCompare(String(b.time))).map((entry, idx) => {
                                  const isEntry = idx % 2 === 0;
                                  return (
                                    <div 
                                      key={idx} 
                                      className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                                        isEntry 
                                          ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                                          : 'bg-sky-50 border-sky-100 text-sky-700'
                                      }`}
                                    >
                                      <div className="flex items-center gap-1">
                                        {isEntry ? <LogIn size={10} /> : <LogOut size={10} />}
                                        <span className="text-[10px] font-black">{entry.time}</span>
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
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-200 px-4 py-2 z-20">
        <div className="max-w-7xl mx-auto flex flex-row items-center justify-between">
           <div className="text-[9px] font-bold text-slate-600 text-right">
              واحد فناوری اطلاعات و ارتباطات شرکت عمران آذرستان
           </div>
           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              نسخه ۲.۶ (PWA & Offline Optimized)
           </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
