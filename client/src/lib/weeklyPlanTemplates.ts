/**
 * قوالب المواضيع التعليمية الجاهزة للخطة الأسبوعية
 * تشمل مواضيع شائعة مناسبة لرياض الأطفال مع مراعاة القيم الإسلامية والثقافة السعودية
 */

export interface WeeklyPlanTemplate {
  id: string;
  titleAr: string;
  titleEn: string;
  icon: string; // emoji
  category: string;
  categoryAr: string;
  description: string;
  suggestedThemes: { ar: string; en: string }[];
  ageGroups: string[]; // which age groups this is suitable for
  color: string; // tailwind color class
}

export const TEMPLATE_CATEGORIES = [
  { id: "nature", labelAr: "الطبيعة والبيئة", labelEn: "Nature & Environment" },
  { id: "animals", labelAr: "الحيوانات", labelEn: "Animals" },
  { id: "community", labelAr: "المجتمع والمهن", labelEn: "Community & Professions" },
  { id: "body", labelAr: "جسمي وصحتي", labelEn: "My Body & Health" },
  { id: "concepts", labelAr: "المفاهيم الأساسية", labelEn: "Basic Concepts" },
  { id: "islamic", labelAr: "القيم الإسلامية", labelEn: "Islamic Values" },
  { id: "transport", labelAr: "المواصلات والتقنية", labelEn: "Transport & Technology" },
  { id: "food", labelAr: "الطعام والتغذية", labelEn: "Food & Nutrition" },
];

export const WEEKLY_PLAN_TEMPLATES: WeeklyPlanTemplate[] = [
  // ===== الطبيعة والبيئة =====
  {
    id: "four_seasons",
    titleAr: "الفصول الأربعة",
    titleEn: "The Four Seasons",
    icon: "🌸",
    category: "nature",
    categoryAr: "الطبيعة والبيئة",
    description: "استكشاف تغيرات الطقس والفصول وتأثيرها على الطبيعة",
    suggestedThemes: [
      { ar: "فصل الربيع - الزهور والفراشات", en: "Spring - Flowers and Butterflies" },
      { ar: "فصل الصيف - الشمس والماء", en: "Summer - Sun and Water" },
      { ar: "فصل الخريف - أوراق الشجر", en: "Autumn - Falling Leaves" },
      { ar: "فصل الشتاء - المطر والغيوم", en: "Winter - Rain and Clouds" },
    ],
    ageGroups: ["nursery", "kg1", "kg2", "kg3"],
    color: "bg-green-50 border-green-200",
  },
  {
    id: "water_world",
    titleAr: "عالم الماء",
    titleEn: "Water World",
    icon: "💧",
    category: "nature",
    categoryAr: "الطبيعة والبيئة",
    description: "أهمية الماء ودورة المياه والحفاظ على البيئة",
    suggestedThemes: [
      { ar: "الماء نعمة من الله", en: "Water is a Blessing from Allah" },
      { ar: "من أين يأتي الماء؟", en: "Where Does Water Come From?" },
      { ar: "الكائنات البحرية", en: "Sea Creatures" },
      { ar: "المحافظة على الماء", en: "Water Conservation" },
    ],
    ageGroups: ["nursery", "kg1", "kg2", "kg3"],
    color: "bg-blue-50 border-blue-200",
  },
  {
    id: "plants_garden",
    titleAr: "النباتات والحديقة",
    titleEn: "Plants & Garden",
    icon: "🌱",
    category: "nature",
    categoryAr: "الطبيعة والبيئة",
    description: "نمو النباتات والزراعة والعناية بالبيئة",
    suggestedThemes: [
      { ar: "كيف تنمو النباتات", en: "How Plants Grow" },
      { ar: "حديقتي الصغيرة", en: "My Little Garden" },
      { ar: "أجزاء النبات", en: "Parts of a Plant" },
      { ar: "الفواكه والخضروات", en: "Fruits and Vegetables" },
    ],
    ageGroups: ["nursery", "kg1", "kg2", "kg3"],
    color: "bg-lime-50 border-lime-200",
  },
  {
    id: "space",
    titleAr: "الفضاء والكواكب",
    titleEn: "Space & Planets",
    icon: "🌙",
    category: "nature",
    categoryAr: "الطبيعة والبيئة",
    description: "استكشاف الفضاء والنجوم والقمر والشمس",
    suggestedThemes: [
      { ar: "الشمس والقمر - آيات الله", en: "Sun and Moon - Signs of Allah" },
      { ar: "النجوم في السماء", en: "Stars in the Sky" },
      { ar: "كوكبنا الأرض", en: "Our Planet Earth" },
      { ar: "الليل والنهار", en: "Day and Night" },
    ],
    ageGroups: ["kg1", "kg2", "kg3"],
    color: "bg-indigo-50 border-indigo-200",
  },
  {
    id: "desert",
    titleAr: "الصحراء والبيئة السعودية",
    titleEn: "Desert & Saudi Environment",
    icon: "🏜️",
    category: "nature",
    categoryAr: "الطبيعة والبيئة",
    description: "البيئة الصحراوية والحياة في المملكة العربية السعودية",
    suggestedThemes: [
      { ar: "حيوانات الصحراء - الجمل", en: "Desert Animals - The Camel" },
      { ar: "النخلة والتمر", en: "Palm Tree and Dates" },
      { ar: "الرمال والكثبان", en: "Sand and Dunes" },
      { ar: "واحات بلادي", en: "Oases of My Country" },
    ],
    ageGroups: ["nursery", "kg1", "kg2", "kg3"],
    color: "bg-amber-50 border-amber-200",
  },

  // ===== الحيوانات =====
  {
    id: "farm_animals",
    titleAr: "حيوانات المزرعة",
    titleEn: "Farm Animals",
    icon: "🐄",
    category: "animals",
    categoryAr: "الحيوانات",
    description: "التعرف على حيوانات المزرعة وفوائدها",
    suggestedThemes: [
      { ar: "حيوانات المزرعة وأصواتها", en: "Farm Animals and Their Sounds" },
      { ar: "الدجاجة والبيضة", en: "The Hen and the Egg" },
      { ar: "البقرة والحليب", en: "The Cow and Milk" },
      { ar: "الخروف - نعمة من الله", en: "The Sheep - A Blessing from Allah" },
    ],
    ageGroups: ["nursery", "kg1", "kg2", "kg3"],
    color: "bg-yellow-50 border-yellow-200",
  },
  {
    id: "wild_animals",
    titleAr: "الحيوانات البرية",
    titleEn: "Wild Animals",
    icon: "🦁",
    category: "animals",
    categoryAr: "الحيوانات",
    description: "اكتشاف الحيوانات البرية وبيئاتها",
    suggestedThemes: [
      { ar: "الأسد ملك الغابة", en: "The Lion - King of the Jungle" },
      { ar: "الزرافة الطويلة", en: "The Tall Giraffe" },
      { ar: "الفيل الكبير", en: "The Big Elephant" },
      { ar: "حيوانات الغابة", en: "Jungle Animals" },
    ],
    ageGroups: ["nursery", "kg1", "kg2", "kg3"],
    color: "bg-orange-50 border-orange-200",
  },
  {
    id: "insects",
    titleAr: "الحشرات والزواحف",
    titleEn: "Insects & Reptiles",
    icon: "🦋",
    category: "animals",
    categoryAr: "الحيوانات",
    description: "عالم الحشرات المدهش وأهميتها في الطبيعة",
    suggestedThemes: [
      { ar: "الفراشة الجميلة", en: "The Beautiful Butterfly" },
      { ar: "النحلة والعسل", en: "The Bee and Honey" },
      { ar: "النملة المجتهدة", en: "The Hardworking Ant" },
      { ar: "دورة حياة الفراشة", en: "Butterfly Life Cycle" },
    ],
    ageGroups: ["kg1", "kg2", "kg3"],
    color: "bg-pink-50 border-pink-200",
  },
  {
    id: "birds",
    titleAr: "الطيور",
    titleEn: "Birds",
    icon: "🐦",
    category: "animals",
    categoryAr: "الحيوانات",
    description: "التعرف على أنواع الطيور وخصائصها",
    suggestedThemes: [
      { ar: "الطيور وأعشاشها", en: "Birds and Their Nests" },
      { ar: "طيور بلادي", en: "Birds of My Country" },
      { ar: "كيف تطير الطيور", en: "How Birds Fly" },
      { ar: "الببغاء الملون", en: "The Colorful Parrot" },
    ],
    ageGroups: ["nursery", "kg1", "kg2", "kg3"],
    color: "bg-sky-50 border-sky-200",
  },

  // ===== المجتمع والمهن =====
  {
    id: "professions",
    titleAr: "المهن والأعمال",
    titleEn: "Professions & Jobs",
    icon: "👨‍⚕️",
    category: "community",
    categoryAr: "المجتمع والمهن",
    description: "التعرف على المهن المختلفة وأهميتها في المجتمع",
    suggestedThemes: [
      { ar: "الطبيب والممرضة", en: "Doctor and Nurse" },
      { ar: "رجل الإطفاء البطل", en: "The Brave Firefighter" },
      { ar: "المعلم والمعلمة", en: "The Teacher" },
      { ar: "الشرطي حامي الأمان", en: "The Police Officer" },
    ],
    ageGroups: ["nursery", "kg1", "kg2", "kg3"],
    color: "bg-blue-50 border-blue-200",
  },
  {
    id: "my_family",
    titleAr: "عائلتي",
    titleEn: "My Family",
    icon: "👨‍👩‍👧‍👦",
    category: "community",
    categoryAr: "المجتمع والمهن",
    description: "أفراد العائلة والعلاقات الأسرية وبر الوالدين",
    suggestedThemes: [
      { ar: "أفراد عائلتي", en: "My Family Members" },
      { ar: "بر الوالدين", en: "Honoring Parents" },
      { ar: "بيتي الجميل", en: "My Beautiful Home" },
      { ar: "أنا أساعد عائلتي", en: "I Help My Family" },
    ],
    ageGroups: ["nursery", "kg1", "kg2", "kg3"],
    color: "bg-rose-50 border-rose-200",
  },
  {
    id: "my_country",
    titleAr: "وطني السعودية",
    titleEn: "My Country Saudi Arabia",
    icon: "🇸🇦",
    category: "community",
    categoryAr: "المجتمع والمهن",
    description: "حب الوطن والتعرف على معالم المملكة العربية السعودية",
    suggestedThemes: [
      { ar: "اليوم الوطني السعودي", en: "Saudi National Day" },
      { ar: "معالم بلادي", en: "Landmarks of My Country" },
      { ar: "العلم السعودي", en: "The Saudi Flag" },
      { ar: "يوم التأسيس", en: "Founding Day" },
    ],
    ageGroups: ["kg1", "kg2", "kg3"],
    color: "bg-emerald-50 border-emerald-200",
  },
  {
    id: "community_helpers",
    titleAr: "مساعدو المجتمع",
    titleEn: "Community Helpers",
    icon: "🏥",
    category: "community",
    categoryAr: "المجتمع والمهن",
    description: "الأشخاص الذين يساعدوننا في حياتنا اليومية",
    suggestedThemes: [
      { ar: "عامل النظافة", en: "The Cleaner" },
      { ar: "الخباز والطعام", en: "The Baker and Food" },
      { ar: "سائق الحافلة", en: "The Bus Driver" },
      { ar: "البائع في المتجر", en: "The Shopkeeper" },
    ],
    ageGroups: ["nursery", "kg1", "kg2", "kg3"],
    color: "bg-teal-50 border-teal-200",
  },

  // ===== جسمي وصحتي =====
  {
    id: "my_body",
    titleAr: "جسمي",
    titleEn: "My Body",
    icon: "🫀",
    category: "body",
    categoryAr: "جسمي وصحتي",
    description: "التعرف على أجزاء الجسم والحواس الخمس",
    suggestedThemes: [
      { ar: "أجزاء جسمي", en: "Parts of My Body" },
      { ar: "الحواس الخمس", en: "The Five Senses" },
      { ar: "يدي وأصابعي", en: "My Hands and Fingers" },
      { ar: "عيوني ترى العالم", en: "My Eyes See the World" },
    ],
    ageGroups: ["nursery", "kg1", "kg2", "kg3"],
    color: "bg-red-50 border-red-200",
  },
  {
    id: "hygiene_health",
    titleAr: "النظافة والصحة",
    titleEn: "Hygiene & Health",
    icon: "🧼",
    category: "body",
    categoryAr: "جسمي وصحتي",
    description: "عادات النظافة الشخصية والصحة الجيدة",
    suggestedThemes: [
      { ar: "غسل اليدين", en: "Washing Hands" },
      { ar: "تنظيف الأسنان", en: "Brushing Teeth" },
      { ar: "الطعام الصحي", en: "Healthy Food" },
      { ar: "النظافة من الإيمان", en: "Cleanliness is Part of Faith" },
    ],
    ageGroups: ["nursery", "kg1", "kg2", "kg3"],
    color: "bg-cyan-50 border-cyan-200",
  },
  {
    id: "emotions",
    titleAr: "مشاعري",
    titleEn: "My Emotions",
    icon: "😊",
    category: "body",
    categoryAr: "جسمي وصحتي",
    description: "التعرف على المشاعر والتعبير عنها بطريقة صحية",
    suggestedThemes: [
      { ar: "أنا سعيد - أنا حزين", en: "I'm Happy - I'm Sad" },
      { ar: "كيف أعبر عن مشاعري", en: "How I Express My Feelings" },
      { ar: "أنا أحب أصدقائي", en: "I Love My Friends" },
      { ar: "التعاون والمشاركة", en: "Cooperation and Sharing" },
    ],
    ageGroups: ["nursery", "kg1", "kg2", "kg3"],
    color: "bg-violet-50 border-violet-200",
  },

  // ===== المفاهيم الأساسية =====
  {
    id: "colors",
    titleAr: "الألوان",
    titleEn: "Colors",
    icon: "🎨",
    category: "concepts",
    categoryAr: "المفاهيم الأساسية",
    description: "التعرف على الألوان الأساسية والثانوية",
    suggestedThemes: [
      { ar: "الألوان الأساسية", en: "Primary Colors" },
      { ar: "ألوان الطبيعة", en: "Colors of Nature" },
      { ar: "خلط الألوان", en: "Mixing Colors" },
      { ar: "لوني المفضل", en: "My Favorite Color" },
    ],
    ageGroups: ["nursery", "kg1", "kg2"],
    color: "bg-fuchsia-50 border-fuchsia-200",
  },
  {
    id: "shapes",
    titleAr: "الأشكال الهندسية",
    titleEn: "Shapes",
    icon: "🔷",
    category: "concepts",
    categoryAr: "المفاهيم الأساسية",
    description: "التعرف على الأشكال الهندسية في البيئة المحيطة",
    suggestedThemes: [
      { ar: "الأشكال من حولنا", en: "Shapes Around Us" },
      { ar: "الدائرة والمربع والمثلث", en: "Circle, Square, and Triangle" },
      { ar: "أشكال في الطبيعة", en: "Shapes in Nature" },
      { ar: "بناء بالأشكال", en: "Building with Shapes" },
    ],
    ageGroups: ["nursery", "kg1", "kg2", "kg3"],
    color: "bg-blue-50 border-blue-200",
  },
  {
    id: "numbers",
    titleAr: "الأرقام والعد",
    titleEn: "Numbers & Counting",
    icon: "🔢",
    category: "concepts",
    categoryAr: "المفاهيم الأساسية",
    description: "تعلم الأرقام والعد والمفاهيم الرياضية الأولية",
    suggestedThemes: [
      { ar: "الأرقام من ١ إلى ٥", en: "Numbers 1 to 5" },
      { ar: "الأرقام من ١ إلى ١٠", en: "Numbers 1 to 10" },
      { ar: "العد والتصنيف", en: "Counting and Sorting" },
      { ar: "أكبر وأصغر", en: "Bigger and Smaller" },
    ],
    ageGroups: ["nursery", "kg1", "kg2", "kg3"],
    color: "bg-purple-50 border-purple-200",
  },
  {
    id: "arabic_letters",
    titleAr: "الحروف العربية",
    titleEn: "Arabic Letters",
    icon: "أ",
    category: "concepts",
    categoryAr: "المفاهيم الأساسية",
    description: "تعلم الحروف العربية وأصواتها",
    suggestedThemes: [
      { ar: "حروف الهجاء (أ-ث)", en: "Arabic Letters (Alif-Tha)" },
      { ar: "حروف الهجاء (ج-ذ)", en: "Arabic Letters (Jim-Thal)" },
      { ar: "حروف الهجاء (ر-ض)", en: "Arabic Letters (Ra-Dad)" },
      { ar: "حروف الهجاء (ط-ي)", en: "Arabic Letters (Ta-Ya)" },
    ],
    ageGroups: ["kg1", "kg2", "kg3"],
    color: "bg-amber-50 border-amber-200",
  },

  // ===== القيم الإسلامية =====
  {
    id: "ramadan",
    titleAr: "رمضان والأعياد",
    titleEn: "Ramadan & Eid",
    icon: "🌙",
    category: "islamic",
    categoryAr: "القيم الإسلامية",
    description: "شهر رمضان المبارك والأعياد الإسلامية",
    suggestedThemes: [
      { ar: "أهلاً رمضان", en: "Welcome Ramadan" },
      { ar: "عيد الفطر السعيد", en: "Happy Eid Al-Fitr" },
      { ar: "عيد الأضحى المبارك", en: "Blessed Eid Al-Adha" },
      { ar: "فضل الصدقة", en: "The Virtue of Charity" },
    ],
    ageGroups: ["nursery", "kg1", "kg2", "kg3"],
    color: "bg-emerald-50 border-emerald-200",
  },
  {
    id: "hajj",
    titleAr: "الحج والعمرة",
    titleEn: "Hajj & Umrah",
    icon: "🕋",
    category: "islamic",
    categoryAr: "القيم الإسلامية",
    description: "ركن الحج ومناسك العمرة والأماكن المقدسة",
    suggestedThemes: [
      { ar: "الكعبة المشرفة", en: "The Holy Kaaba" },
      { ar: "مناسك الحج للأطفال", en: "Hajj Rituals for Children" },
      { ar: "المسجد الحرام", en: "The Grand Mosque" },
      { ar: "ذكريات الحج", en: "Hajj Memories" },
    ],
    ageGroups: ["kg1", "kg2", "kg3"],
    color: "bg-emerald-50 border-emerald-200",
  },
  {
    id: "islamic_manners",
    titleAr: "الآداب الإسلامية",
    titleEn: "Islamic Manners",
    icon: "🤲",
    category: "islamic",
    categoryAr: "القيم الإسلامية",
    description: "الآداب والأخلاق الإسلامية في الحياة اليومية",
    suggestedThemes: [
      { ar: "آداب الطعام والشراب", en: "Eating and Drinking Manners" },
      { ar: "آداب السلام والتحية", en: "Greeting Manners" },
      { ar: "الصدق والأمانة", en: "Honesty and Trustworthiness" },
      { ar: "احترام الكبير", en: "Respecting Elders" },
    ],
    ageGroups: ["nursery", "kg1", "kg2", "kg3"],
    color: "bg-teal-50 border-teal-200",
  },
  {
    id: "prophet_stories",
    titleAr: "قصص الأنبياء",
    titleEn: "Stories of the Prophets",
    icon: "📖",
    category: "islamic",
    categoryAr: "القيم الإسلامية",
    description: "قصص الأنبياء المبسطة للأطفال",
    suggestedThemes: [
      { ar: "قصة سيدنا نوح والسفينة", en: "Story of Prophet Nuh and the Ark" },
      { ar: "قصة سيدنا يوسف", en: "Story of Prophet Yusuf" },
      { ar: "قصة سيدنا إبراهيم", en: "Story of Prophet Ibrahim" },
      { ar: "قصة سيدنا محمد ﷺ", en: "Story of Prophet Muhammad ﷺ" },
    ],
    ageGroups: ["kg1", "kg2", "kg3"],
    color: "bg-emerald-50 border-emerald-200",
  },

  // ===== المواصلات والتقنية =====
  {
    id: "transportation",
    titleAr: "وسائل المواصلات",
    titleEn: "Transportation",
    icon: "🚗",
    category: "transport",
    categoryAr: "المواصلات والتقنية",
    description: "التعرف على وسائل النقل المختلفة",
    suggestedThemes: [
      { ar: "وسائل النقل البرية", en: "Land Transportation" },
      { ar: "الطائرة والسفر", en: "Airplane and Travel" },
      { ar: "السفينة والبحر", en: "Ship and Sea" },
      { ar: "السلامة المرورية", en: "Traffic Safety" },
    ],
    ageGroups: ["nursery", "kg1", "kg2", "kg3"],
    color: "bg-slate-50 border-slate-200",
  },
  {
    id: "construction",
    titleAr: "البناء والتشييد",
    titleEn: "Construction & Building",
    icon: "🏗️",
    category: "transport",
    categoryAr: "المواصلات والتقنية",
    description: "عالم البناء والأدوات والمواد",
    suggestedThemes: [
      { ar: "كيف نبني بيتاً", en: "How We Build a House" },
      { ar: "أدوات البناء", en: "Construction Tools" },
      { ar: "المهندس المعماري", en: "The Architect" },
      { ar: "أشكال المباني", en: "Building Shapes" },
    ],
    ageGroups: ["kg1", "kg2", "kg3"],
    color: "bg-gray-50 border-gray-200",
  },

  // ===== الطعام والتغذية =====
  {
    id: "fruits",
    titleAr: "الفواكه",
    titleEn: "Fruits",
    icon: "🍎",
    category: "food",
    categoryAr: "الطعام والتغذية",
    description: "التعرف على أنواع الفواكه وفوائدها",
    suggestedThemes: [
      { ar: "فواكه الصيف", en: "Summer Fruits" },
      { ar: "فواكه بلادي - التمر", en: "Fruits of My Country - Dates" },
      { ar: "ألوان الفواكه", en: "Colors of Fruits" },
      { ar: "عصير الفواكه الطازج", en: "Fresh Fruit Juice" },
    ],
    ageGroups: ["nursery", "kg1", "kg2", "kg3"],
    color: "bg-red-50 border-red-200",
  },
  {
    id: "vegetables",
    titleAr: "الخضروات",
    titleEn: "Vegetables",
    icon: "🥕",
    category: "food",
    categoryAr: "الطعام والتغذية",
    description: "التعرف على الخضروات وأهميتها للصحة",
    suggestedThemes: [
      { ar: "خضروات حديقتنا", en: "Vegetables from Our Garden" },
      { ar: "الخضروات الملونة", en: "Colorful Vegetables" },
      { ar: "طبق السلطة الصحي", en: "Healthy Salad Plate" },
      { ar: "من المزرعة إلى المائدة", en: "From Farm to Table" },
    ],
    ageGroups: ["nursery", "kg1", "kg2", "kg3"],
    color: "bg-green-50 border-green-200",
  },
  {
    id: "healthy_eating",
    titleAr: "الغذاء الصحي",
    titleEn: "Healthy Eating",
    icon: "🥗",
    category: "food",
    categoryAr: "الطعام والتغذية",
    description: "أهمية الغذاء الصحي والمتوازن",
    suggestedThemes: [
      { ar: "المجموعات الغذائية", en: "Food Groups" },
      { ar: "وجبة الإفطار الصحية", en: "Healthy Breakfast" },
      { ar: "الحليب ومشتقاته", en: "Milk and Dairy" },
      { ar: "سنة النبي في الطعام", en: "Prophet's Sunnah in Food" },
    ],
    ageGroups: ["kg1", "kg2", "kg3"],
    color: "bg-lime-50 border-lime-200",
  },
];

/**
 * Get templates filtered by age group
 */
export function getTemplatesForAgeGroup(ageGroup?: string): WeeklyPlanTemplate[] {
  if (!ageGroup) return WEEKLY_PLAN_TEMPLATES;
  return WEEKLY_PLAN_TEMPLATES.filter(t => t.ageGroups.includes(ageGroup));
}

/**
 * Get templates filtered by category
 */
export function getTemplatesByCategory(category?: string): WeeklyPlanTemplate[] {
  if (!category) return WEEKLY_PLAN_TEMPLATES;
  return WEEKLY_PLAN_TEMPLATES.filter(t => t.category === category);
}
