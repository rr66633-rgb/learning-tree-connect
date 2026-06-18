const ar = {
  common: { appName: 'Learning Tree Connect', dashboard: 'لوحة التحكم', children: 'الأطفال', attendance: 'الحضور', dailyReports: 'التقارير اليومية', messaging: 'الرسائل', finance: 'المالية', loyalty: 'برنامج الولاء', hr: 'الموارد البشرية', transportation: 'النقل', settings: 'الإعدادات', notifications: 'الإشعارات', logout: 'تسجيل الخروج', save: 'حفظ', cancel: 'إلغاء', delete: 'حذف', edit: 'تعديل', add: 'إضافة', search: 'بحث', filter: 'تصفية', loading: 'جاري التحميل...', noData: 'لا توجد بيانات', total: 'الإجمالي', status: 'الحالة', actions: 'الإجراءات', date: 'التاريخ', name: 'الاسم', phone: 'الهاتف', email: 'البريد الإلكتروني', active: 'نشط', inactive: 'غير نشط', all: 'الكل', today: 'اليوم', welcome: 'مرحباً', sar: 'ريال' },
  auth: { login: 'تسجيل الدخول', email: 'البريد الإلكتروني', password: 'كلمة المرور', loginTitle: 'تسجيل الدخول إلى حسابك', loginSubtitle: 'أدخل بياناتك للوصول إلى لوحة التحكم', invalidCredentials: 'بيانات الدخول غير صحيحة' },
  dashboard: { totalChildren: 'إجمالي الأطفال', presentToday: 'الحاضرون اليوم', absentToday: 'الغائبون اليوم', totalRevenue: 'إجمالي الإيرادات', pendingInvoices: 'فواتير معلقة', attendanceRate: 'نسبة الحضور', recentActivity: 'النشاط الأخير', quickActions: 'إجراءات سريعة' },
  children: { title: 'إدارة الأطفال', addChild: 'إضافة طفل', firstName: 'الاسم الأول', lastName: 'اسم العائلة', dateOfBirth: 'تاريخ الميلاد', gender: 'الجنس', male: 'ذكر', female: 'أنثى', class: 'الفصل', parent: 'ولي الأمر', allergies: 'الحساسية', medicalNotes: 'ملاحظات طبية', bloodType: 'فصيلة الدم', nationality: 'الجنسية' },
  attendance: { title: 'سجل الحضور', checkIn: 'تسجيل حضور', checkOut: 'تسجيل انصراف', present: 'حاضر', absent: 'غائب', late: 'متأخر', excused: 'مستأذن', scanQR: 'مسح QR', attendanceRate: 'نسبة الحضور' },
  dailyReports: { title: 'التقارير اليومية', createReport: 'إنشاء تقرير', meals: 'الوجبات', sleep: 'النوم', toileting: 'دورة المياه', activities: 'الأنشطة', mood: 'المزاج', teacherNotes: 'ملاحظات المعلمة', publish: 'نشر', published: 'منشور', draft: 'مسودة' },
  finance: { title: 'المالية والفواتير', invoices: 'الفواتير', payments: 'المدفوعات', createInvoice: 'إنشاء فاتورة', paid: 'مدفوعة', pending: 'معلقة', overdue: 'متأخرة', amount: 'المبلغ', vat: 'ضريبة القيمة المضافة', totalAmount: 'المبلغ الإجمالي', dueDate: 'تاريخ الاستحقاق' },
  loyalty: { title: 'برنامج الولاء', points: 'النقاط', balance: 'الرصيد', rewards: 'المكافآت', redeem: 'استبدال', earned: 'مكتسبة', transactions: 'سجل النقاط' },
};

const en: typeof ar = {
  common: { appName: 'Learning Tree Connect', dashboard: 'Dashboard', children: 'Children', attendance: 'Attendance', dailyReports: 'Daily Reports', messaging: 'Messages', finance: 'Finance', loyalty: 'Loyalty Program', hr: 'HR', transportation: 'Transportation', settings: 'Settings', notifications: 'Notifications', logout: 'Logout', save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit', add: 'Add', search: 'Search', filter: 'Filter', loading: 'Loading...', noData: 'No data available', total: 'Total', status: 'Status', actions: 'Actions', date: 'Date', name: 'Name', phone: 'Phone', email: 'Email', active: 'Active', inactive: 'Inactive', all: 'All', today: 'Today', welcome: 'Welcome', sar: 'SAR' },
  auth: { login: 'Login', email: 'Email', password: 'Password', loginTitle: 'Sign in to your account', loginSubtitle: 'Enter your credentials to access the dashboard', invalidCredentials: 'Invalid credentials' },
  dashboard: { totalChildren: 'Total Children', presentToday: 'Present Today', absentToday: 'Absent Today', totalRevenue: 'Total Revenue', pendingInvoices: 'Pending Invoices', attendanceRate: 'Attendance Rate', recentActivity: 'Recent Activity', quickActions: 'Quick Actions' },
  children: { title: 'Children Management', addChild: 'Add Child', firstName: 'First Name', lastName: 'Last Name', dateOfBirth: 'Date of Birth', gender: 'Gender', male: 'Male', female: 'Female', class: 'Class', parent: 'Parent', allergies: 'Allergies', medicalNotes: 'Medical Notes', bloodType: 'Blood Type', nationality: 'Nationality' },
  attendance: { title: 'Attendance', checkIn: 'Check In', checkOut: 'Check Out', present: 'Present', absent: 'Absent', late: 'Late', excused: 'Excused', scanQR: 'Scan QR', attendanceRate: 'Attendance Rate' },
  dailyReports: { title: 'Daily Reports', createReport: 'Create Report', meals: 'Meals', sleep: 'Sleep', toileting: 'Toileting', activities: 'Activities', mood: 'Mood', teacherNotes: 'Teacher Notes', publish: 'Publish', published: 'Published', draft: 'Draft' },
  finance: { title: 'Finance & Billing', invoices: 'Invoices', payments: 'Payments', createInvoice: 'Create Invoice', paid: 'Paid', pending: 'Pending', overdue: 'Overdue', amount: 'Amount', vat: 'VAT', totalAmount: 'Total Amount', dueDate: 'Due Date' },
  loyalty: { title: 'Loyalty Program', points: 'Points', balance: 'Balance', rewards: 'Rewards', redeem: 'Redeem', earned: 'Earned', transactions: 'Transactions' },
};

const translations = { ar, en };
export function useTranslation() {
  const getLang = (): 'ar' | 'en' => {
    if (typeof window === 'undefined') return 'ar';
    return (localStorage.getItem('language') as 'ar' | 'en') || 'ar';
  };
  return { t: translations[getLang()], lang: getLang(), isRtl: getLang() === 'ar' };
}
export { translations };
