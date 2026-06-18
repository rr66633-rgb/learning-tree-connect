import { PrismaClient, UserRole, Gender, ChildStatus, AttendanceStatus, InvoiceStatus, PaymentMethod } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create Super Admin
  const superAdminHash = await bcrypt.hash('admin123', 12);
  const superAdmin = await prisma.user.create({
    data: {
      email: 'admin@learningtree.sa',
      passwordHash: superAdminHash,
      firstName: 'Admin',
      lastName: 'System',
      firstNameAr: 'مدير',
      lastNameAr: 'النظام',
      phone: '+966500000000',
      language: 'ar',
    },
  });

  // Create Demo Tenant (School)
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Bright Stars Nursery',
      nameAr: 'حضانة النجوم الساطعة',
      subdomain: 'bright-stars',
      contactEmail: 'info@brightstars.sa',
      contactPhone: '+966501234567',
      address: 'حي الملقا، الرياض',
      city: 'الرياض',
      country: 'SA',
      vatNumber: '300000000000003',
      commercialRegister: 'CR1234567890',
      subscriptionPlan: 'premium',
      subscriptionStatus: 'active',
      settings: {
        workingDays: [0, 1, 2, 3, 4], // Sun-Thu
        startTime: '07:00',
        endTime: '14:00',
        currency: 'SAR',
        timezone: 'Asia/Riyadh',
      },
    },
  });

  // Assign super admin to tenant
  await prisma.tenantUser.create({
    data: { tenantId: tenant.id, userId: superAdmin.id, role: 'SUPER_ADMIN' },
  });

  // Create School Owner
  const ownerHash = await bcrypt.hash('owner123', 12);
  const owner = await prisma.user.create({
    data: {
      email: 'owner@brightstars.sa',
      passwordHash: ownerHash,
      firstName: 'Khalid',
      lastName: 'Al-Rashid',
      firstNameAr: 'خالد',
      lastNameAr: 'الراشد',
      phone: '+966501234567',
      language: 'ar',
    },
  });
  await prisma.tenantUser.create({
    data: { tenantId: tenant.id, userId: owner.id, role: 'SCHOOL_OWNER' },
  });

  // Create Principal
  const principalHash = await bcrypt.hash('principal123', 12);
  const principal = await prisma.user.create({
    data: {
      email: 'principal@brightstars.sa',
      passwordHash: principalHash,
      firstName: 'Noura',
      lastName: 'Al-Fahad',
      firstNameAr: 'نورة',
      lastNameAr: 'الفهد',
      phone: '+966502345678',
      language: 'ar',
    },
  });
  await prisma.tenantUser.create({
    data: { tenantId: tenant.id, userId: principal.id, role: 'PRINCIPAL' },
  });

  // Create Teachers
  const teacherHash = await bcrypt.hash('teacher123', 12);
  const teacher1 = await prisma.user.create({
    data: {
      email: 'sara.teacher@brightstars.sa',
      passwordHash: teacherHash,
      firstName: 'Sara',
      lastName: 'Al-Otaibi',
      firstNameAr: 'سارة',
      lastNameAr: 'العتيبي',
      phone: '+966503456789',
      language: 'ar',
    },
  });
  await prisma.tenantUser.create({
    data: { tenantId: tenant.id, userId: teacher1.id, role: 'TEACHER' },
  });

  const teacher2 = await prisma.user.create({
    data: {
      email: 'fatima.teacher@brightstars.sa',
      passwordHash: teacherHash,
      firstName: 'Fatima',
      lastName: 'Al-Harbi',
      firstNameAr: 'فاطمة',
      lastNameAr: 'الحربي',
      phone: '+966504567890',
      language: 'ar',
    },
  });
  await prisma.tenantUser.create({
    data: { tenantId: tenant.id, userId: teacher2.id, role: 'TEACHER' },
  });

  // Create Parents
  const parentHash = await bcrypt.hash('parent123', 12);
  const parent1 = await prisma.user.create({
    data: {
      email: 'mohammed.parent@gmail.com',
      passwordHash: parentHash,
      firstName: 'Mohammed',
      lastName: 'Al-Saud',
      firstNameAr: 'محمد',
      lastNameAr: 'آل سعود',
      phone: '+966505678901',
      language: 'ar',
    },
  });
  await prisma.tenantUser.create({
    data: { tenantId: tenant.id, userId: parent1.id, role: 'PARENT' },
  });

  const parent2 = await prisma.user.create({
    data: {
      email: 'ahmad.parent@gmail.com',
      passwordHash: parentHash,
      firstName: 'Ahmad',
      lastName: 'Al-Qahtani',
      firstNameAr: 'أحمد',
      lastNameAr: 'القحطاني',
      phone: '+966506789012',
      language: 'ar',
    },
  });
  await prisma.tenantUser.create({
    data: { tenantId: tenant.id, userId: parent2.id, role: 'PARENT' },
  });

  const parent3 = await prisma.user.create({
    data: {
      email: 'huda.parent@gmail.com',
      passwordHash: parentHash,
      firstName: 'Huda',
      lastName: 'Al-Dosari',
      firstNameAr: 'هدى',
      lastNameAr: 'الدوسري',
      phone: '+966507890123',
      language: 'ar',
    },
  });
  await prisma.tenantUser.create({
    data: { tenantId: tenant.id, userId: parent3.id, role: 'PARENT' },
  });

  // Create Accountant
  const accountantHash = await bcrypt.hash('accountant123', 12);
  const accountant = await prisma.user.create({
    data: {
      email: 'accountant@brightstars.sa',
      passwordHash: accountantHash,
      firstName: 'Omar',
      lastName: 'Al-Mutairi',
      firstNameAr: 'عمر',
      lastNameAr: 'المطيري',
      phone: '+966508901234',
      language: 'ar',
    },
  });
  await prisma.tenantUser.create({
    data: { tenantId: tenant.id, userId: accountant.id, role: 'ACCOUNTANT' },
  });

  // Create Academic Year
  const academicYear = await prisma.academicYear.create({
    data: {
      tenantId: tenant.id,
      name: '2024-2025',
      startDate: new Date('2024-09-01'),
      endDate: new Date('2025-06-30'),
      isCurrent: true,
    },
  });

  // Create Classes
  const classStars = await prisma.class.create({
    data: {
      tenantId: tenant.id,
      name: 'Stars',
      nameAr: 'النجوم',
      ageGroup: '3-4',
      capacity: 20,
      teacherId: teacher1.id,
    },
  });

  const classMoon = await prisma.class.create({
    data: {
      tenantId: tenant.id,
      name: 'Moon',
      nameAr: 'القمر',
      ageGroup: '4-5',
      capacity: 18,
      teacherId: teacher2.id,
    },
  });

  const classSun = await prisma.class.create({
    data: {
      tenantId: tenant.id,
      name: 'Sun',
      nameAr: 'الشمس',
      ageGroup: '2-3',
      capacity: 15,
      teacherId: teacher1.id,
    },
  });

  // Create Children
  const child1 = await prisma.child.create({
    data: {
      tenantId: tenant.id,
      firstName: 'Zayed',
      lastName: 'Al-Saud',
      firstNameAr: 'زايد',
      lastNameAr: 'آل سعود',
      dateOfBirth: new Date('2021-03-15'),
      gender: 'MALE',
      enrollmentDate: new Date('2024-09-01'),
      status: 'ACTIVE',
      bloodType: 'A+',
      nationality: 'Saudi',
      nationalId: '1234567890',
    },
  });

  const child2 = await prisma.child.create({
    data: {
      tenantId: tenant.id,
      firstName: 'Layan',
      lastName: 'Al-Saud',
      firstNameAr: 'ليان',
      lastNameAr: 'آل سعود',
      dateOfBirth: new Date('2020-07-22'),
      gender: 'FEMALE',
      enrollmentDate: new Date('2024-09-01'),
      status: 'ACTIVE',
      bloodType: 'O+',
      nationality: 'Saudi',
    },
  });

  const child3 = await prisma.child.create({
    data: {
      tenantId: tenant.id,
      firstName: 'Faisal',
      lastName: 'Al-Qahtani',
      firstNameAr: 'فيصل',
      lastNameAr: 'القحطاني',
      dateOfBirth: new Date('2021-11-05'),
      gender: 'MALE',
      enrollmentDate: new Date('2024-09-01'),
      status: 'ACTIVE',
      allergies: 'حساسية من المكسرات',
      bloodType: 'B+',
      nationality: 'Saudi',
    },
  });

  const child4 = await prisma.child.create({
    data: {
      tenantId: tenant.id,
      firstName: 'Reem',
      lastName: 'Al-Dosari',
      firstNameAr: 'ريم',
      lastNameAr: 'الدوسري',
      dateOfBirth: new Date('2022-01-10'),
      gender: 'FEMALE',
      enrollmentDate: new Date('2024-09-01'),
      status: 'ACTIVE',
      nationality: 'Saudi',
    },
  });

  const child5 = await prisma.child.create({
    data: {
      tenantId: tenant.id,
      firstName: 'Abdullah',
      lastName: 'Al-Qahtani',
      firstNameAr: 'عبدالله',
      lastNameAr: 'القحطاني',
      dateOfBirth: new Date('2020-05-18'),
      gender: 'MALE',
      enrollmentDate: new Date('2024-09-01'),
      status: 'ACTIVE',
      nationality: 'Saudi',
    },
  });

  // Parent-Child relationships
  await prisma.parentChild.createMany({
    data: [
      { tenantId: tenant.id, parentId: parent1.id, childId: child1.id, relationship: 'أب' },
      { tenantId: tenant.id, parentId: parent1.id, childId: child2.id, relationship: 'أب' },
      { tenantId: tenant.id, parentId: parent2.id, childId: child3.id, relationship: 'أب' },
      { tenantId: tenant.id, parentId: parent2.id, childId: child5.id, relationship: 'أب' },
      { tenantId: tenant.id, parentId: parent3.id, childId: child4.id, relationship: 'أم' },
    ],
  });

  // Class Assignments
  await prisma.classAssignment.createMany({
    data: [
      { tenantId: tenant.id, classId: classStars.id, childId: child1.id, academicYear: '2024-2025' },
      { tenantId: tenant.id, classId: classMoon.id, childId: child2.id, academicYear: '2024-2025' },
      { tenantId: tenant.id, classId: classStars.id, childId: child3.id, academicYear: '2024-2025' },
      { tenantId: tenant.id, classId: classSun.id, childId: child4.id, academicYear: '2024-2025' },
      { tenantId: tenant.id, classId: classMoon.id, childId: child5.id, academicYear: '2024-2025' },
    ],
  });

  // Emergency Contacts
  await prisma.emergencyContact.createMany({
    data: [
      { tenantId: tenant.id, childId: child1.id, name: 'خالد آل سعود', phone: '+966509999999', relationship: 'عم', isAuthorizedPickup: true },
      { tenantId: tenant.id, childId: child3.id, name: 'سعد القحطاني', phone: '+966508888888', relationship: 'جد', isAuthorizedPickup: true },
    ],
  });

  // Attendance records for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await prisma.attendance.createMany({
    data: [
      { tenantId: tenant.id, childId: child1.id, date: today, status: 'PRESENT', checkInTime: new Date(today.getTime() + 7 * 3600000 + 30 * 60000), checkedInBy: teacher1.id },
      { tenantId: tenant.id, childId: child2.id, date: today, status: 'PRESENT', checkInTime: new Date(today.getTime() + 7 * 3600000 + 45 * 60000), checkedInBy: teacher2.id },
      { tenantId: tenant.id, childId: child3.id, date: today, status: 'LATE', checkInTime: new Date(today.getTime() + 8 * 3600000 + 15 * 60000), checkedInBy: teacher1.id },
      { tenantId: tenant.id, childId: child4.id, date: today, status: 'ABSENT', notes: 'مريض' },
      { tenantId: tenant.id, childId: child5.id, date: today, status: 'PRESENT', checkInTime: new Date(today.getTime() + 7 * 3600000 + 20 * 60000), checkedInBy: teacher2.id },
    ],
  });

  // Daily Reports
  await prisma.dailyReport.createMany({
    data: [
      {
        tenantId: tenant.id,
        childId: child1.id,
        teacherId: teacher1.id,
        date: today,
        meals: JSON.stringify([{ type: 'breakfast', amount: 'all' }, { type: 'lunch', amount: 'some' }, { type: 'snack', amount: 'all' }]),
        sleep: JSON.stringify({ startTime: '12:00', endTime: '13:30', quality: 'good' }),
        toileting: JSON.stringify({ count: 3, notes: 'طبيعي' }),
        activities: 'لعب بالمكعبات، رسم، قصة',
        mood: 'happy',
        teacherNotes: 'زايد كان نشيطاً جداً اليوم وشارك في جميع الأنشطة',
        photos: JSON.stringify([]),
        isPublished: true,
      },
      {
        tenantId: tenant.id,
        childId: child2.id,
        teacherId: teacher2.id,
        date: today,
        meals: JSON.stringify([{ type: 'breakfast', amount: 'all' }, { type: 'lunch', amount: 'all' }, { type: 'snack', amount: 'some' }]),
        sleep: JSON.stringify({ startTime: '12:30', endTime: '14:00', quality: 'excellent' }),
        toileting: JSON.stringify({ count: 2, notes: 'طبيعي' }),
        activities: 'أنشطة حسية، لعب حر، موسيقى',
        mood: 'calm',
        teacherNotes: 'ليان هادئة ومتعاونة مع زميلاتها',
        photos: JSON.stringify([]),
        isPublished: true,
      },
    ],
  });

  // Fee Structures
  const monthlyFee = await prisma.feeStructure.create({
    data: {
      tenantId: tenant.id,
      name: 'Monthly Tuition',
      nameAr: 'الرسوم الشهرية',
      amount: 3500,
      frequency: 'MONTHLY',
      description: 'رسوم الدراسة الشهرية',
      isActive: true,
    },
  });

  await prisma.feeStructure.create({
    data: {
      tenantId: tenant.id,
      name: 'Registration Fee',
      nameAr: 'رسوم التسجيل',
      amount: 2000,
      frequency: 'ONE_TIME',
      description: 'رسوم التسجيل لمرة واحدة',
      isActive: true,
    },
  });

  await prisma.feeStructure.create({
    data: {
      tenantId: tenant.id,
      name: 'Transportation Fee',
      nameAr: 'رسوم النقل',
      amount: 800,
      frequency: 'MONTHLY',
      description: 'رسوم خدمة النقل المدرسي',
      isActive: true,
    },
  });

  // Invoices
  await prisma.invoice.create({
    data: {
      tenantId: tenant.id,
      parentId: parent1.id,
      childId: child1.id,
      invoiceNumber: 'INV-2024-001',
      description: 'رسوم شهر أكتوبر 2024',
      subtotal: 3500,
      vatRate: 0.15,
      vatAmount: 525,
      totalAmount: 4025,
      issueDate: new Date('2024-10-01'),
      dueDate: new Date('2024-10-15'),
      status: 'PAID',
      items: JSON.stringify([{ description: 'الرسوم الشهرية', amount: 3500, quantity: 1 }]),
    },
  });

  await prisma.invoice.create({
    data: {
      tenantId: tenant.id,
      parentId: parent1.id,
      childId: child1.id,
      invoiceNumber: 'INV-2024-002',
      description: 'رسوم شهر نوفمبر 2024',
      subtotal: 3500,
      vatRate: 0.15,
      vatAmount: 525,
      totalAmount: 4025,
      issueDate: new Date('2024-11-01'),
      dueDate: new Date('2024-11-15'),
      status: 'PENDING',
      items: JSON.stringify([{ description: 'الرسوم الشهرية', amount: 3500, quantity: 1 }]),
    },
  });

  await prisma.invoice.create({
    data: {
      tenantId: tenant.id,
      parentId: parent2.id,
      childId: child3.id,
      invoiceNumber: 'INV-2024-003',
      description: 'رسوم شهر أكتوبر 2024',
      subtotal: 4300,
      vatRate: 0.15,
      vatAmount: 645,
      totalAmount: 4945,
      issueDate: new Date('2024-10-01'),
      dueDate: new Date('2024-10-15'),
      status: 'OVERDUE',
      items: JSON.stringify([
        { description: 'الرسوم الشهرية', amount: 3500, quantity: 1 },
        { description: 'رسوم النقل', amount: 800, quantity: 1 },
      ]),
    },
  });

  // Events
  await prisma.event.createMany({
    data: [
      {
        tenantId: tenant.id,
        title: 'Parent-Teacher Meeting',
        titleAr: 'اجتماع أولياء الأمور',
        description: 'Monthly parent-teacher meeting',
        descriptionAr: 'الاجتماع الشهري مع أولياء الأمور',
        startDate: new Date(Date.now() + 7 * 24 * 3600000),
        isAllDay: false,
        location: 'القاعة الرئيسية',
      },
      {
        tenantId: tenant.id,
        title: 'National Day Celebration',
        titleAr: 'احتفال اليوم الوطني',
        description: 'Saudi National Day celebration',
        descriptionAr: 'احتفال اليوم الوطني السعودي',
        startDate: new Date('2024-09-23'),
        isAllDay: true,
      },
    ],
  });

  // Announcements
  await prisma.announcement.createMany({
    data: [
      {
        tenantId: tenant.id,
        title: 'Welcome Back',
        titleAr: 'أهلاً بعودتكم',
        content: 'Welcome to the new academic year!',
        contentAr: 'نرحب بكم في العام الدراسي الجديد!',
        authorId: principal.id,
        isPublished: true,
      },
      {
        tenantId: tenant.id,
        title: 'Holiday Notice',
        titleAr: 'إشعار إجازة',
        content: 'School will be closed next Thursday',
        contentAr: 'ستكون المدرسة مغلقة يوم الخميس القادم',
        authorId: principal.id,
        targetRole: 'PARENT',
        isPublished: true,
      },
    ],
  });

  // Notifications
  await prisma.notification.createMany({
    data: [
      {
        tenantId: tenant.id,
        userId: parent1.id,
        title: 'Attendance',
        titleAr: 'حضور',
        body: 'Zayed checked in at 7:30 AM',
        bodyAr: 'تم تسجيل حضور زايد الساعة ٧:٣٠ صباحاً',
        type: 'ATTENDANCE',
        data: JSON.stringify({ childId: child1.id }),
      },
      {
        tenantId: tenant.id,
        userId: parent1.id,
        title: 'Daily Report',
        titleAr: 'التقرير اليومي',
        body: "Zayed's daily report is ready",
        bodyAr: 'التقرير اليومي لزايد جاهز',
        type: 'DAILY_REPORT',
        data: JSON.stringify({ childId: child1.id }),
      },
      {
        tenantId: tenant.id,
        userId: parent2.id,
        title: 'Invoice',
        titleAr: 'فاتورة',
        body: 'New invoice INV-2024-003 is overdue',
        bodyAr: 'الفاتورة INV-2024-003 متأخرة السداد',
        type: 'INVOICE',
        data: JSON.stringify({}),
      },
    ],
  });

  // Bus Routes
  await prisma.busRoute.create({
    data: {
      tenantId: tenant.id,
      name: 'Route A - North Riyadh',
      driverName: 'سالم العمري',
      driverPhone: '+966509876543',
      busNumber: 'BUS-001',
      capacity: 30,
      isActive: true,
      assignments: {
        create: [
          { childId: child1.id, pickupAddress: 'حي الملقا', pickupTime: '06:45' },
          { childId: child3.id, pickupAddress: 'حي الياسمين', pickupTime: '07:00' },
        ],
      },
    },
  });

  // Staff Records
  await prisma.staffRecord.createMany({
    data: [
      {
        tenantId: tenant.id,
        userId: teacher1.id,
        employeeId: 'EMP-001',
        department: 'التعليم',
        position: 'معلمة رياض أطفال',
        hireDate: new Date('2023-08-15'),
        salary: 8000,
      },
      {
        tenantId: tenant.id,
        userId: teacher2.id,
        employeeId: 'EMP-002',
        department: 'التعليم',
        position: 'معلمة رياض أطفال',
        hireDate: new Date('2023-09-01'),
        salary: 7500,
      },
    ],
  });

  // Observations (EYFS)
  await prisma.observation.createMany({
    data: [
      {
        tenantId: tenant.id,
        childId: child1.id,
        teacherId: teacher1.id,
        date: today,
        title: 'Physical Development',
        description: 'زايد يستطيع الآن الجري والقفز بثقة ويحافظ على توازنه',
        eyfsArea: 'Physical Development',
        eyfsStrand: 'Moving and Handling',
        ageRange: '30-50 months',
        isSharedWithParent: true,
      },
      {
        tenantId: tenant.id,
        childId: child2.id,
        teacherId: teacher2.id,
        date: today,
        title: 'Communication and Language',
        description: 'ليان تستخدم جمل كاملة وتعبر عن مشاعرها بوضوح',
        eyfsArea: 'Communication and Language',
        eyfsStrand: 'Speaking',
        ageRange: '40-60 months',
        isSharedWithParent: true,
      },
    ],
  });

  console.log('✅ Database seeded successfully!');
  console.log('');
  console.log('📋 Login Credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Super Admin:  admin@learningtree.sa / admin123');
  console.log('School Owner: owner@brightstars.sa / owner123');
  console.log('Principal:    principal@brightstars.sa / principal123');
  console.log('Teacher 1:    sara.teacher@brightstars.sa / teacher123');
  console.log('Teacher 2:    fatima.teacher@brightstars.sa / teacher123');
  console.log('Parent 1:     mohammed.parent@gmail.com / parent123');
  console.log('Parent 2:     ahmad.parent@gmail.com / parent123');
  console.log('Parent 3:     huda.parent@gmail.com / parent123');
  console.log('Accountant:   accountant@brightstars.sa / accountant123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
