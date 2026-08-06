/**
 * Seed Demo Data Script for Learning Tree Connect (Naashah)
 * Creates realistic test data for all roles
 * Run: node scripts/seed-demo-data.mjs
 */

import crypto from 'crypto';
import mysql from 'mysql2/promise';

// Password hashing (same as authService)
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

// Parse DATABASE_URL
const url = new URL(DB_URL);
// BUGFIX: ssl was unconditionally on, which is right for the hosted database
// but makes this script unusable against a local MySQL: Node refuses to set a
// TLS servername to an IP ("Setting the TLS ServerName to an IP address is not
// permitted") and the script dies before seeding anything. Local hosts don't
// speak TLS anyway, so only negotiate it for remote hosts.
const isLocalHost = ['localhost', '127.0.0.1', '::1', 'host.docker.internal'].includes(url.hostname);
const connection = await mysql.createConnection({
  host: url.hostname,
  port: parseInt(url.port),
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1).split('?')[0],
  ...(isLocalHost ? {} : { ssl: { rejectUnauthorized: false } }),
});

console.log('Connected to database');

const ORG_ID = 1;
const DEFAULT_PASSWORD = hashPassword('Naashah2026!');

// ============ TEACHERS ============
const teachers = [
  { name: 'نورة الشمري', email: 'noura.teacher@naashah.com', phone: '0501111001' },
  { name: 'فاطمة العتيبي', email: 'fatima.teacher@naashah.com', phone: '0501111002' },
  { name: 'سارة القحطاني', email: 'sara.teacher@naashah.com', phone: '0501111003' },
  { name: 'هند المطيري', email: 'hind.teacher@naashah.com', phone: '0501111004' },
  { name: 'ريم الحربي', email: 'reem.teacher@naashah.com', phone: '0501111005' },
  { name: 'منال الدوسري', email: 'manal.teacher@naashah.com', phone: '0501111006' },
];

// ============ PARENTS ============
const parents = [
  { name: 'أحمد الغامدي', email: 'ahmed.parent@naashah.com', phone: '0502222001' },
  { name: 'محمد السبيعي', email: 'mohammed.parent@naashah.com', phone: '0502222002' },
  { name: 'خالد الزهراني', email: 'khaled.parent@naashah.com', phone: '0502222003' },
  { name: 'عبدالله العنزي', email: 'abdullah.parent@naashah.com', phone: '0502222004' },
  { name: 'فهد الشهري', email: 'fahad.parent@naashah.com', phone: '0502222005' },
  { name: 'سلطان المالكي', email: 'sultan.parent@naashah.com', phone: '0502222006' },
  { name: 'ياسر الحارثي', email: 'yaser.parent@naashah.com', phone: '0502222007' },
  { name: 'عمر البلوي', email: 'omar.parent@naashah.com', phone: '0502222008' },
  { name: 'سعود الرشيدي', email: 'saud.parent@naashah.com', phone: '0502222009' },
  { name: 'ماجد القرني', email: 'majed.parent@naashah.com', phone: '0502222010' },
  { name: 'هدى العمري', email: 'huda.parent@naashah.com', phone: '0502222011' },
  { name: 'مريم الجهني', email: 'maryam.parent@naashah.com', phone: '0502222012' },
];

// ============ CHILDREN ============
const childrenData = [
  { firstName: 'ليان', lastName: 'الغامدي', gender: 'female', dob: '2021-03-15', parentIdx: 0, classId: 30003 },
  { firstName: 'يزن', lastName: 'السبيعي', gender: 'male', dob: '2021-06-20', parentIdx: 1, classId: 30003 },
  { firstName: 'جنى', lastName: 'الزهراني', gender: 'female', dob: '2020-09-10', parentIdx: 2, classId: 30004 },
  { firstName: 'عبدالرحمن', lastName: 'العنزي', gender: 'male', dob: '2020-11-05', parentIdx: 3, classId: 30004 },
  { firstName: 'لمى', lastName: 'الشهري', gender: 'female', dob: '2019-04-22', parentIdx: 4, classId: 30005 },
  { firstName: 'فيصل', lastName: 'المالكي', gender: 'male', dob: '2019-07-18', parentIdx: 5, classId: 30005 },
  { firstName: 'ريناد', lastName: 'الحارثي', gender: 'female', dob: '2019-01-30', parentIdx: 6, classId: 30005 },
  { firstName: 'تركي', lastName: 'البلوي', gender: 'male', dob: '2018-12-08', parentIdx: 7, classId: 30006 },
  { firstName: 'غادة', lastName: 'الرشيدي', gender: 'female', dob: '2018-08-14', parentIdx: 8, classId: 30006 },
  { firstName: 'نواف', lastName: 'القرني', gender: 'male', dob: '2020-02-25', parentIdx: 9, classId: 30004 },
  { firstName: 'سلمى', lastName: 'العمري', gender: 'female', dob: '2021-11-12', parentIdx: 10, classId: 30001 },
  { firstName: 'زياد', lastName: 'الجهني', gender: 'male', dob: '2022-01-08', parentIdx: 11, classId: 30001 },
  { firstName: 'دانة', lastName: 'الغامدي', gender: 'female', dob: '2022-05-20', parentIdx: 0, classId: 30002 },
  { firstName: 'راكان', lastName: 'السبيعي', gender: 'male', dob: '2020-08-03', parentIdx: 1, classId: 30004 },
  { firstName: 'لين', lastName: 'الزهراني', gender: 'female', dob: '2019-10-17', parentIdx: 2, classId: 30005 },
];

async function seedData() {
  try {
    // Insert teachers
    console.log('Inserting teachers...');
    const teacherIds = [];
    for (const t of teachers) {
      const openId = `demo_teacher_${crypto.randomBytes(8).toString('hex')}`;
      const [result] = await connection.execute(
        `INSERT INTO users (openId, name, email, phone, role, password, isActive, organizationId, language)
         VALUES (?, ?, ?, ?, 'teacher', ?, true, ?, 'ar')
         ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`,
        [openId, t.name, t.email, t.phone, DEFAULT_PASSWORD, ORG_ID]
      );
      teacherIds.push(result.insertId);
      console.log(`  Teacher: ${t.name} (ID: ${result.insertId})`);
    }

    // Assign teachers to classes
    const classTeacherMap = [
      { classId: 30001, teacherIdx: 0 },
      { classId: 30002, teacherIdx: 1 },
      { classId: 30003, teacherIdx: 2 },
      { classId: 30004, teacherIdx: 3 },
      { classId: 30005, teacherIdx: 4 },
      { classId: 30006, teacherIdx: 5 },
    ];
    for (const ct of classTeacherMap) {
      await connection.execute(
        `UPDATE classes SET teacherId = ? WHERE id = ?`,
        [teacherIds[ct.teacherIdx], ct.classId]
      );
    }
    console.log('  Teachers assigned to classes');

    // Insert parents
    console.log('Inserting parents...');
    const parentIds = [];
    for (const p of parents) {
      const openId = `demo_parent_${crypto.randomBytes(8).toString('hex')}`;
      const [result] = await connection.execute(
        `INSERT INTO users (openId, name, email, phone, role, password, isActive, organizationId, language)
         VALUES (?, ?, ?, ?, 'parent', ?, true, ?, 'ar')
         ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`,
        [openId, p.name, p.email, p.phone, DEFAULT_PASSWORD, ORG_ID]
      );
      parentIds.push(result.insertId);
      console.log(`  Parent: ${p.name} (ID: ${result.insertId})`);
    }

    // Insert children
    console.log('Inserting children...');
    const childIds = [];
    for (const c of childrenData) {
      const [result] = await connection.execute(
        `INSERT INTO children (firstName, lastName, gender, dateOfBirth, parentId, classId, status, organizationId)
         VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`,
        [c.firstName, c.lastName, c.gender, c.dob, parentIds[c.parentIdx], c.classId, ORG_ID]
      );
      childIds.push(result.insertId);
      console.log(`  Child: ${c.firstName} ${c.lastName} (ID: ${result.insertId})`);
    }

    // Insert attendance records for the last 5 days
    console.log('Inserting attendance records...');
    const today = new Date();
    for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
      const date = new Date(today);
      date.setDate(date.getDate() - dayOffset);
      // Skip weekends (Friday=5, Saturday=6 in Saudi)
      if (date.getDay() === 5 || date.getDay() === 6) continue;
      
      const dateStr = date.toISOString().split('T')[0];
      for (const childId of childIds) {
        const status = Math.random() > 0.1 ? 'present' : 'absent';
        const checkInTime = status === 'present' ? `${dateStr} 07:${String(Math.floor(Math.random() * 30) + 15).padStart(2, '0')}:00` : null;
        const checkOutTime = status === 'present' ? `${dateStr} 14:${String(Math.floor(Math.random() * 30)).padStart(2, '0')}:00` : null;
        
        await connection.execute(
          `INSERT INTO attendance (childId, date, status, checkInTime, checkOutTime, organizationId)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE status=VALUES(status)`,
          [childId, dateStr, status, checkInTime, checkOutTime, ORG_ID]
        );
      }
    }
    console.log('  Attendance records created for 5 days');

    // Insert daily reports
    console.log('Inserting daily reports...');
    const mealTypes = ['breakfast', 'lunch', 'snack'];
    const mealDescriptions = ['أكل جيداً', 'أكل قليلاً', 'أكل بشكل ممتاز', 'لم يأكل كثيراً'];
    const activities = ['رسم وتلوين', 'قراءة قصة', 'لعب حر', 'أنشطة حركية', 'موسيقى وأناشيد', 'تجارب علمية'];
    const moods = ['happy', 'calm', 'excited', 'tired'];
    
    for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
      const date = new Date(today);
      date.setDate(date.getDate() - dayOffset);
      if (date.getDay() === 5 || date.getDay() === 6) continue;
      const dateStr = date.toISOString().split('T')[0];
      
      for (let i = 0; i < Math.min(childIds.length, 10); i++) {
        const childId = childIds[i];
        const teacherId = teacherIds[Math.floor(i / 3) % teacherIds.length];
        const meal = mealTypes[Math.floor(Math.random() * mealTypes.length)];
        const mealDesc = mealDescriptions[Math.floor(Math.random() * mealDescriptions.length)];
        const activity = activities[Math.floor(Math.random() * activities.length)];
        const mood = moods[Math.floor(Math.random() * moods.length)];
        
        await connection.execute(
          `INSERT INTO daily_reports (childId, date, meals, sleep, activities, mood, teacherNotes, teacherId, organizationId, isPublished)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, true)`,
          [
            childId, dateStr,
            JSON.stringify([{ type: meal, description: mealDesc, amount: 'good' }]),
            JSON.stringify({ start: '12:00', end: '13:30', quality: 'good' }),
            activity,
            mood,
            'يوم جميل ومليء بالأنشطة',
            teacherId, ORG_ID
          ]
        );
      }
    }
    console.log('  Daily reports created');

    // Insert announcements
    console.log('Inserting announcements...');
    const announcementData = [
      { title: 'إجازة اليوم الوطني', content: 'نود إبلاغكم بأن الحضانة ستكون مغلقة يوم الاثنين بمناسبة اليوم الوطني السعودي. نتمنى لكم إجازة سعيدة!', audience: 'all' },
      { title: 'اجتماع أولياء الأمور', content: 'ندعوكم لحضور اجتماع أولياء الأمور يوم الأربعاء القادم الساعة 5 مساءً. سنناقش خطة الفصل الدراسي الجديد.', audience: 'parents' },
      { title: 'تحديث سياسة الاستلام', content: 'تم تحديث سياسة استلام الأطفال. يرجى الاطلاع على التفاصيل في قسم المستندات.', audience: 'all' },
      { title: 'رحلة ميدانية - حديقة الحيوان', content: 'سيتم تنظيم رحلة ميدانية لحديقة الحيوان يوم الخميس القادم لفصول KG1 و KG2. يرجى تعبئة نموذج الموافقة.', audience: 'parents' },
    ];
    
    for (const ann of announcementData) {
      await connection.execute(
        `INSERT INTO announcements (title, content, audience, organizationId, createdBy)
         VALUES (?, ?, ?, ?, ?)`,
        [ann.title, ann.content, ann.audience, ORG_ID, teacherIds[0]]
      );
    }
    console.log('  Announcements created');

    // Insert calendar events
    console.log('Inserting calendar events...');
    const eventData = [
      { title: 'بداية الفصل الدراسي', description: 'أول يوم دراسي للفصل الجديد', date: '2026-09-01', category: 'activity' },
      { title: 'اليوم الوطني السعودي', description: 'إجازة رسمية', date: '2026-09-23', category: 'holiday' },
      { title: 'يوم الطفل العالمي', description: 'أنشطة وفعاليات خاصة بيوم الطفل', date: '2026-11-20', category: 'event' },
      { title: 'حفل نهاية العام', description: 'حفل تخرج وتكريم الأطفال', date: '2026-06-30', category: 'celebration' },
      { title: 'اجتماع أولياء الأمور', description: 'اجتماع دوري مع أولياء الأمور', date: '2026-07-15', category: 'meeting' },
    ];
    
    for (const evt of eventData) {
      // BUGFIX: this inserted `title` and `startDate`, which are the ORIGINAL
      // 0002 column names. Migration 0019 reshaped calendar_events to
      // titleAr/titleEn/eventDate (and dropped the legacy columns), so this
      // insert failed with "Unknown column 'title'" and aborted the whole seed
      // before invoices/messages/etc. were ever created.
      await connection.execute(
        `INSERT INTO calendar_events (titleAr, titleEn, description, eventDate, category, createdBy, organizationId, audience, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'all', 'published')`,
        [evt.title, evt.title, evt.description, evt.date, evt.category, teacherIds[0], ORG_ID]
      );
    }
    console.log('  Calendar events created');

    // Insert invoices
    console.log('Inserting invoices...');
    for (let i = 0; i < Math.min(childIds.length, 10); i++) {
      const childId = childIds[i];
      const parentId = parentIds[childrenData[i].parentIdx];
      const subtotal = [3500, 4000, 4500, 5000][Math.floor(Math.random() * 4)];
      const vatAmount = Math.round(subtotal * 0.15 * 100) / 100;
      const total = subtotal + vatAmount;
      const status = Math.random() > 0.3 ? 'paid' : 'pending';
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + 15);
      const invoiceNumber = `INV-2026-${String(i + 1).padStart(4, '0')}`;
      
      await connection.execute(
        `INSERT INTO invoices (childId, parentId, invoiceNumber, description, subtotal, vatRate, vatAmount, total, status, dueDate, invoiceType, organizationId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'tuition', ?)`,
        [childId, parentId, invoiceNumber, 'رسوم شهرية - يونيو 2026', subtotal, '15.00', vatAmount, total, status, dueDate.toISOString().split('T')[0], ORG_ID]
      );
    }
    console.log('  Invoices created');

    console.log('\n✅ Demo data seeded successfully!');
    console.log(`\n📋 Summary:`);
    console.log(`  - ${teachers.length} teachers`);
    console.log(`  - ${parents.length} parents`);
    console.log(`  - ${childrenData.length} children`);
    console.log(`  - 6 classes`);
    console.log(`  - Attendance records (5 days)`);
    console.log(`  - Daily reports (3 days)`);
    console.log(`  - ${announcementData.length} announcements`);
    console.log(`  - ${eventData.length} calendar events`);
    console.log(`  - 10 invoices`);
    console.log(`\n🔑 Login credentials for all demo users:`);
    console.log(`  Password: Naashah2026!`);
    console.log(`  Teachers: noura.teacher@naashah.com, fatima.teacher@naashah.com, etc.`);
    console.log(`  Parents: ahmed.parent@naashah.com, mohammed.parent@naashah.com, etc.`);

  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await connection.end();
  }
}

await seedData();
