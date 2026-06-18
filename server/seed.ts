import { drizzle } from "drizzle-orm/mysql2";
import { users, children, attendance, dailyReports, conversations, messages, invoices, loyaltyPoints, loyaltyTransactions, loyaltyRewards, notifications } from "../drizzle/schema";

async function seed() {
  const db = drizzle(process.env.DATABASE_URL!);

  console.log("Seeding database with demo data...");

  // ============ TEACHERS (5) ============
  const teacherData = [
    { openId: "teacher_1", name: "سارة الأحمد", email: "sara@learningtree.sa", role: "teacher" as const, phone: "0501234567" },
    { openId: "teacher_2", name: "نورة المالكي", email: "noura@learningtree.sa", role: "teacher" as const, phone: "0502345678" },
    { openId: "teacher_3", name: "فاطمة العتيبي", email: "fatima@learningtree.sa", role: "teacher" as const, phone: "0503456789" },
    { openId: "teacher_4", name: "هند الشمري", email: "hind@learningtree.sa", role: "teacher" as const, phone: "0504567890" },
    { openId: "teacher_5", name: "ريم القحطاني", email: "reem@learningtree.sa", role: "teacher" as const, phone: "0505678901" },
  ];

  for (const t of teacherData) {
    await db.insert(users).values({ ...t, lastSignedIn: new Date() }).onDuplicateKeyUpdate({ set: { name: t.name } });
  }

  // ============ PARENTS (20) ============
  const parentData = [
    { openId: "parent_1", name: "محمد العمري", email: "mohammed.amri@gmail.com", role: "parent" as const, phone: "0551234567" },
    { openId: "parent_2", name: "عبدالله الحربي", email: "abdullah.harbi@gmail.com", role: "parent" as const, phone: "0552345678" },
    { openId: "parent_3", name: "خالد الدوسري", email: "khaled.dosari@gmail.com", role: "parent" as const, phone: "0553456789" },
    { openId: "parent_4", name: "أحمد الغامدي", email: "ahmed.ghamdi@gmail.com", role: "parent" as const, phone: "0554567890" },
    { openId: "parent_5", name: "سلطان المطيري", email: "sultan.mutairi@gmail.com", role: "parent" as const, phone: "0555678901" },
    { openId: "parent_6", name: "فهد الزهراني", email: "fahad.zahrani@gmail.com", role: "parent" as const, phone: "0556789012" },
    { openId: "parent_7", name: "ناصر العنزي", email: "nasser.anazi@gmail.com", role: "parent" as const, phone: "0557890123" },
    { openId: "parent_8", name: "سعود البقمي", email: "saud.baqami@gmail.com", role: "parent" as const, phone: "0558901234" },
    { openId: "parent_9", name: "تركي الشهري", email: "turki.shahri@gmail.com", role: "parent" as const, phone: "0559012345" },
    { openId: "parent_10", name: "بندر الحارثي", email: "bandar.harthi@gmail.com", role: "parent" as const, phone: "0560123456" },
    { openId: "parent_11", name: "منى السبيعي", email: "mona.subaie@gmail.com", role: "parent" as const, phone: "0561234567" },
    { openId: "parent_12", name: "هدى الجهني", email: "huda.juhani@gmail.com", role: "parent" as const, phone: "0562345678" },
    { openId: "parent_13", name: "سارة الرشيدي", email: "sara.rashidi@gmail.com", role: "parent" as const, phone: "0563456789" },
    { openId: "parent_14", name: "نوف العتيبي", email: "nouf.otaibi@gmail.com", role: "parent" as const, phone: "0564567890" },
    { openId: "parent_15", name: "ريم الشمري", email: "reem.shamri@gmail.com", role: "parent" as const, phone: "0565678901" },
    { openId: "parent_16", name: "عمر المالكي", email: "omar.malki@gmail.com", role: "parent" as const, phone: "0566789012" },
    { openId: "parent_17", name: "يوسف الحربي", email: "yousef.harbi@gmail.com", role: "parent" as const, phone: "0567890123" },
    { openId: "parent_18", name: "عائشة القرني", email: "aisha.qarni@gmail.com", role: "parent" as const, phone: "0568901234" },
    { openId: "parent_19", name: "لطيفة الشهراني", email: "latifa.shahrani@gmail.com", role: "parent" as const, phone: "0569012345" },
    { openId: "parent_20", name: "مريم الأسمري", email: "mariam.asmari@gmail.com", role: "parent" as const, phone: "0570123456" },
  ];

  for (const p of parentData) {
    await db.insert(users).values({ ...p, lastSignedIn: new Date() }).onDuplicateKeyUpdate({ set: { name: p.name } });
  }

  // Get inserted user IDs
  const allUsers = await db.select().from(users);
  const teachers = allUsers.filter(u => u.role === 'teacher');
  const parents = allUsers.filter(u => u.role === 'parent');

  // ============ CHILDREN (20) ============
  const childrenData = [
    { firstName: "ليان", lastName: "العمري", gender: "female" as const, className: "الروضة أ", dateOfBirth: new Date("2021-03-15"), medicalNotes: "لا يوجد", allergies: "لا يوجد", emergencyContact: "الجدة أم محمد", emergencyPhone: "0551111111" },
    { firstName: "عبدالرحمن", lastName: "الحربي", gender: "male" as const, className: "الروضة أ", dateOfBirth: new Date("2021-06-20"), medicalNotes: "لا يوجد", allergies: "حساسية من الفول السوداني", emergencyContact: "العم أحمد", emergencyPhone: "0552222222" },
    { firstName: "جنى", lastName: "الدوسري", gender: "female" as const, className: "الروضة ب", dateOfBirth: new Date("2021-01-10"), medicalNotes: "لا يوجد", allergies: "لا يوجد", emergencyContact: "الخالة سارة", emergencyPhone: "0553333333" },
    { firstName: "يزيد", lastName: "الغامدي", gender: "male" as const, className: "الروضة ب", dateOfBirth: new Date("2020-11-25"), medicalNotes: "ربو خفيف", allergies: "حساسية من الغبار", emergencyContact: "الجد عبدالله", emergencyPhone: "0554444444" },
    { firstName: "لمى", lastName: "المطيري", gender: "female" as const, className: "التمهيدي أ", dateOfBirth: new Date("2020-08-05"), medicalNotes: "لا يوجد", allergies: "لا يوجد", emergencyContact: "العمة نورة", emergencyPhone: "0555555555" },
    { firstName: "فيصل", lastName: "الزهراني", gender: "male" as const, className: "التمهيدي أ", dateOfBirth: new Date("2020-04-12"), medicalNotes: "لا يوجد", allergies: "حساسية من البيض", emergencyContact: "الأب فهد", emergencyPhone: "0556789012" },
    { firstName: "رزان", lastName: "العنزي", gender: "female" as const, className: "التمهيدي ب", dateOfBirth: new Date("2020-09-30"), medicalNotes: "لا يوجد", allergies: "لا يوجد", emergencyContact: "الأم هند", emergencyPhone: "0557890123" },
    { firstName: "سلمان", lastName: "البقمي", gender: "male" as const, className: "التمهيدي ب", dateOfBirth: new Date("2021-02-14"), medicalNotes: "لا يوجد", allergies: "لا يوجد", emergencyContact: "الجدة فاطمة", emergencyPhone: "0558901234" },
    { firstName: "دانة", lastName: "الشهري", gender: "female" as const, className: "الحضانة أ", dateOfBirth: new Date("2022-05-18"), medicalNotes: "لا يوجد", allergies: "حساسية من الحليب", emergencyContact: "الأب تركي", emergencyPhone: "0559012345" },
    { firstName: "راكان", lastName: "الحارثي", gender: "male" as const, className: "الحضانة أ", dateOfBirth: new Date("2022-07-22"), medicalNotes: "لا يوجد", allergies: "لا يوجد", emergencyContact: "العم سعد", emergencyPhone: "0560123456" },
    { firstName: "تالا", lastName: "السبيعي", gender: "female" as const, className: "الحضانة ب", dateOfBirth: new Date("2022-01-08"), medicalNotes: "لا يوجد", allergies: "لا يوجد", emergencyContact: "الأم منى", emergencyPhone: "0561234567" },
    { firstName: "عمر", lastName: "الجهني", gender: "male" as const, className: "الحضانة ب", dateOfBirth: new Date("2022-03-25"), medicalNotes: "أكزيما خفيفة", allergies: "لا يوجد", emergencyContact: "الأب ناصر", emergencyPhone: "0562345678" },
    { firstName: "ميلا", lastName: "الرشيدي", gender: "female" as const, className: "الروضة أ", dateOfBirth: new Date("2021-04-30"), medicalNotes: "لا يوجد", allergies: "لا يوجد", emergencyContact: "الخالة هدى", emergencyPhone: "0563456789" },
    { firstName: "زياد", lastName: "العتيبي", gender: "male" as const, className: "الروضة ب", dateOfBirth: new Date("2021-08-15"), medicalNotes: "لا يوجد", allergies: "حساسية من المكسرات", emergencyContact: "الجد سلطان", emergencyPhone: "0564567890" },
    { firstName: "غلا", lastName: "الشمري", gender: "female" as const, className: "التمهيدي أ", dateOfBirth: new Date("2020-12-20"), medicalNotes: "لا يوجد", allergies: "لا يوجد", emergencyContact: "الأم ريم", emergencyPhone: "0565678901" },
    { firstName: "مشاري", lastName: "المالكي", gender: "male" as const, className: "التمهيدي ب", dateOfBirth: new Date("2020-06-10"), medicalNotes: "لا يوجد", allergies: "لا يوجد", emergencyContact: "العم خالد", emergencyPhone: "0566789012" },
    { firstName: "ريناد", lastName: "الحربي", gender: "female" as const, className: "الحضانة أ", dateOfBirth: new Date("2022-09-05"), medicalNotes: "لا يوجد", allergies: "لا يوجد", emergencyContact: "الأب يوسف", emergencyPhone: "0567890123" },
    { firstName: "نواف", lastName: "القرني", gender: "male" as const, className: "الحضانة ب", dateOfBirth: new Date("2022-11-12"), medicalNotes: "لا يوجد", allergies: "حساسية من الفراولة", emergencyContact: "الأم عائشة", emergencyPhone: "0568901234" },
    { firstName: "لين", lastName: "الشهراني", gender: "female" as const, className: "الروضة أ", dateOfBirth: new Date("2021-07-28"), medicalNotes: "لا يوجد", allergies: "لا يوجد", emergencyContact: "الجدة لطيفة", emergencyPhone: "0569012345" },
    { firstName: "تميم", lastName: "الأسمري", gender: "male" as const, className: "الروضة ب", dateOfBirth: new Date("2021-10-03"), medicalNotes: "لا يوجد", allergies: "لا يوجد", emergencyContact: "الأم مريم", emergencyPhone: "0570123456" },
  ];

  const insertedChildren: number[] = [];
  for (let i = 0; i < childrenData.length; i++) {
    const parentId = parents[i]?.id;
    const result = await db.insert(children).values({ ...childrenData[i], parentId, status: "active" });
    insertedChildren.push(result[0].insertId);
  }

  // ============ ATTENDANCE (last 7 days) ============
  const statuses = ["present", "present", "present", "present", "absent", "late", "excused"] as const;
  for (let day = 0; day < 7; day++) {
    const date = new Date();
    date.setDate(date.getDate() - day);
    date.setHours(7, 30, 0, 0);

    for (let i = 0; i < insertedChildren.length; i++) {
      const statusIdx = (i + day) % statuses.length;
      const status = statuses[statusIdx];
      const checkInTime = new Date(date);
      checkInTime.setHours(7, 15 + Math.floor(Math.random() * 30), 0, 0);
      const checkOutTime = new Date(date);
      checkOutTime.setHours(13, Math.floor(Math.random() * 30), 0, 0);

      await db.insert(attendance).values({
        childId: insertedChildren[i],
        date,
        status,
        checkInTime: status === "present" || status === "late" ? checkInTime : null,
        checkOutTime: status === "present" ? checkOutTime : null,
        checkedInBy: teachers[i % teachers.length]?.id,
      });
    }
  }

  // ============ DAILY REPORTS (last 5 days for each child) ============
  const moods = ["happy", "calm", "excited", "tired", "happy"] as const;
  const mealOptions = [
    { breakfast: "فطور صحي - حبوب وحليب", snack: "فواكه طازجة", lunch: "أرز ودجاج مشوي" },
    { breakfast: "توست بالجبن", snack: "زبادي بالفواكه", lunch: "معكرونة بالخضار" },
    { breakfast: "بيض مسلوق وخبز", snack: "عصير طبيعي وبسكويت", lunch: "شوربة عدس وخبز" },
    { breakfast: "كورن فليكس بالحليب", snack: "تمر وحليب", lunch: "سمك مشوي وأرز" },
    { breakfast: "بان كيك بالعسل", snack: "جزر وخيار", lunch: "كفتة مع بطاطس" },
  ];
  const activityOptions = [
    "لعب حر في الساحة الخارجية - رسم وتلوين - قراءة قصة",
    "أنشطة حركية - تعلم الحروف - لعب بالمكعبات",
    "تجارب علمية بسيطة - غناء وأناشيد - لعب جماعي",
    "فنون يدوية - تعلم الأرقام - لعب بالرمل",
    "رياضة وحركة - قصة تفاعلية - رسم حر",
  ];
  const teacherNotesOptions = [
    "كان يومه رائعاً، تفاعل مع الأنشطة بشكل ممتاز",
    "أظهر تقدماً ملحوظاً في التعرف على الحروف",
    "لعب بشكل جيد مع أصدقائه وشارك ألعابه",
    "كان هادئاً اليوم وأكل وجباته بشكل كامل",
    "شارك في جميع الأنشطة بحماس وإيجابية",
  ];

  for (let day = 0; day < 5; day++) {
    const date = new Date();
    date.setDate(date.getDate() - day);
    date.setHours(12, 0, 0, 0);

    for (let i = 0; i < insertedChildren.length; i++) {
      const mealIdx = (i + day) % mealOptions.length;
      const moodIdx = (i + day) % moods.length;
      const actIdx = (i + day) % activityOptions.length;
      const noteIdx = (i + day) % teacherNotesOptions.length;

      await db.insert(dailyReports).values({
        childId: insertedChildren[i],
        date,
        teacherId: teachers[i % teachers.length]?.id ?? 1,
        meals: mealOptions[mealIdx],
        sleep: { duration: `${Math.floor(Math.random() * 2) + 1} ساعة`, quality: "جيد" },
        toileting: { count: Math.floor(Math.random() * 3) + 1, notes: "طبيعي" },
        activities: activityOptions[actIdx],
        mood: moods[moodIdx],
        teacherNotes: teacherNotesOptions[noteIdx],
        isPublished: true,
      });
    }
  }

  // ============ CONVERSATIONS & MESSAGES ============
  for (let i = 0; i < Math.min(10, parents.length); i++) {
    const teacherIdx = i % teachers.length;
    const result = await db.insert(conversations).values({
      participantOneId: parents[i].id,
      participantTwoId: teachers[teacherIdx].id,
      lastMessageAt: new Date(),
    });
    const convId = result[0].insertId;

    const messageExchanges = [
      { from: parents[i].id, content: "السلام عليكم، كيف حال طفلي اليوم؟" },
      { from: teachers[teacherIdx].id, content: "وعليكم السلام، الحمد لله كان يومه ممتازاً وتفاعل مع الأنشطة بشكل رائع" },
      { from: parents[i].id, content: "الحمد لله، هل أكل وجبته كاملة؟" },
      { from: teachers[teacherIdx].id, content: "نعم أكل وجبته بالكامل وشرب الحليب أيضاً" },
    ];

    for (const msg of messageExchanges) {
      await db.insert(messages).values({ conversationId: convId, senderId: msg.from, content: msg.content });
    }
  }

  // ============ INVOICES ============
  const months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو"];
  for (let i = 0; i < insertedChildren.length; i++) {
    const parentId = parents[i]?.id;
    if (!parentId) continue;

    for (let m = 0; m < 3; m++) {
      const subtotal = 3500 + Math.floor(Math.random() * 1500);
      const vatAmount = subtotal * 0.15;
      const total = subtotal + vatAmount;
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() - m);
      dueDate.setDate(1);

      const status = m === 0 ? "pending" : m === 1 ? "paid" : (Math.random() > 0.5 ? "paid" : "overdue");
      const paidAt = status === "paid" ? new Date(dueDate.getTime() + 5 * 24 * 60 * 60 * 1000) : null;

      await db.insert(invoices).values({
        childId: insertedChildren[i],
        parentId,
        invoiceNumber: `INV-2026${String(6 - m).padStart(2, '0')}-${String(i + 1).padStart(3, '0')}`,
        description: `رسوم ${months[5 - m]} 2026 - ${childrenData[i].className}`,
        subtotal: subtotal.toFixed(2),
        vatRate: "15.00",
        vatAmount: vatAmount.toFixed(2),
        total: total.toFixed(2),
        status,
        dueDate,
        paidAt,
      });
    }
  }

  // ============ LOYALTY REWARDS ============
  const rewardsData = [
    { name: "Free Day", nameAr: "يوم مجاني", description: "One free day of attendance", descriptionAr: "يوم حضور مجاني للطفل", pointsCost: 500 },
    { name: "Activity Kit", nameAr: "حقيبة أنشطة", description: "Educational activity kit", descriptionAr: "حقيبة أنشطة تعليمية منزلية", pointsCost: 300 },
    { name: "Photo Album", nameAr: "ألبوم صور", description: "Monthly photo album", descriptionAr: "ألبوم صور شهري للطفل", pointsCost: 200 },
    { name: "10% Discount", nameAr: "خصم 10%", description: "10% off next month fees", descriptionAr: "خصم 10% على رسوم الشهر القادم", pointsCost: 1000 },
    { name: "Extra Class", nameAr: "حصة إضافية", description: "One extra enrichment class", descriptionAr: "حصة إثرائية إضافية مجانية", pointsCost: 400 },
  ];

  for (const reward of rewardsData) {
    await db.insert(loyaltyRewards).values(reward);
  }

  // ============ LOYALTY POINTS FOR PARENTS ============
  for (let i = 0; i < parents.length; i++) {
    const points = 100 + Math.floor(Math.random() * 900);
    await db.insert(loyaltyPoints).values({ userId: parents[i].id, points });
    
    // Add some transactions
    await db.insert(loyaltyTransactions).values({ userId: parents[i].id, points: 200, type: "earned", description: "مكافأة التسجيل المبكر" });
    await db.insert(loyaltyTransactions).values({ userId: parents[i].id, points: 100, type: "earned", description: "مكافأة الحضور المنتظم" });
    if (Math.random() > 0.5) {
      await db.insert(loyaltyTransactions).values({ userId: parents[i].id, points: -50, type: "redeemed", description: "استبدال: خصم على الرسوم" });
    }
  }

  // ============ NOTIFICATIONS ============
  const adminUser = allUsers.find(u => u.role === 'admin');
  const notifData = [
    { title: "New Enrollment", titleAr: "تسجيل جديد", body: "New child enrolled", bodyAr: "تم تسجيل طفل جديد في الروضة أ", type: "general" as const },
    { title: "Payment Received", titleAr: "دفعة مستلمة", body: "Payment received", bodyAr: "تم استلام دفعة من ولي أمر ليان العمري", type: "payment" as const },
    { title: "Attendance Alert", titleAr: "تنبيه حضور", body: "Low attendance", bodyAr: "نسبة الحضور اليوم أقل من 80%", type: "attendance" as const },
    { title: "Report Published", titleAr: "تقرير منشور", body: "Daily reports published", bodyAr: "تم نشر التقارير اليومية لجميع الأطفال", type: "report" as const },
    { title: "New Message", titleAr: "رسالة جديدة", body: "New message from parent", bodyAr: "رسالة جديدة من ولي أمر عبدالرحمن الحربي", type: "message" as const },
  ];

  for (const parent of parents.slice(0, 5)) {
    for (const notif of notifData.slice(0, 2)) {
      await db.insert(notifications).values({ userId: parent.id, ...notif, isRead: Math.random() > 0.5 });
    }
  }

  if (adminUser) {
    for (const notif of notifData) {
      await db.insert(notifications).values({ userId: adminUser.id, ...notif, isRead: false });
    }
  }

  console.log("Seed completed successfully!");
  console.log(`- ${teacherData.length} teachers`);
  console.log(`- ${parentData.length} parents`);
  console.log(`- ${childrenData.length} children`);
  console.log(`- ${insertedChildren.length * 7} attendance records`);
  console.log(`- ${insertedChildren.length * 5} daily reports`);
  console.log(`- ${Math.min(10, parents.length)} conversations with messages`);
  console.log(`- ${insertedChildren.length * 3} invoices`);
  console.log(`- ${rewardsData.length} loyalty rewards`);
  console.log(`- Loyalty points for ${parents.length} parents`);
  
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
