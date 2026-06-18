import { useAuthStore } from './useAuth';

const translations = {
  ar: {
    login: 'تسجيل الدخول', email: 'البريد الإلكتروني', password: 'كلمة المرور',
    dashboard: 'الرئيسية', children: 'الأطفال', attendance: 'الحضور',
    dailyReports: 'التقارير اليومية', messages: 'الرسائل', notifications: 'الإشعارات',
    profile: 'الملف الشخصي', settings: 'الإعدادات', logout: 'تسجيل الخروج',
    welcome: 'مرحباً', today: 'اليوم', present: 'حاضر', absent: 'غائب',
    checkIn: 'تسجيل حضور', checkOut: 'تسجيل انصراف', meals: 'الوجبات',
    sleep: 'النوم', activities: 'الأنشطة', mood: 'المزاج', notes: 'ملاحظات',
    send: 'إرسال', noData: 'لا توجد بيانات', loading: 'جارٍ التحميل...',
    save: 'حفظ', cancel: 'إلغاء', search: 'بحث', loyalty: 'برنامج الولاء',
    points: 'نقاط', rewards: 'المكافآت', redeem: 'استبدال',
  },
  en: {
    login: 'Login', email: 'Email', password: 'Password',
    dashboard: 'Dashboard', children: 'Children', attendance: 'Attendance',
    dailyReports: 'Daily Reports', messages: 'Messages', notifications: 'Notifications',
    profile: 'Profile', settings: 'Settings', logout: 'Logout',
    welcome: 'Welcome', today: 'Today', present: 'Present', absent: 'Absent',
    checkIn: 'Check In', checkOut: 'Check Out', meals: 'Meals',
    sleep: 'Sleep', activities: 'Activities', mood: 'Mood', notes: 'Notes',
    send: 'Send', noData: 'No data', loading: 'Loading...', 
    save: 'Save', cancel: 'Cancel', search: 'Search', loyalty: 'Loyalty Program',
    points: 'Points', rewards: 'Rewards', redeem: 'Redeem',
  },
};

export const useI18n = () => {
  const { language } = useAuthStore();
  return { t: translations[language], isRTL: language === 'ar', language };
};
