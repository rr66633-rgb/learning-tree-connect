import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import {
  FileText, Camera, MessageCircle, Bell, Calendar,
  BookOpen, Award, Target, ClipboardList, CreditCard,
  Heart, Users, Stethoscope, Bus, Star, Sparkles
} from "lucide-react";

type EmptyStateVariant =
  | 'daily-report'
  | 'photos'
  | 'messages'
  | 'notifications'
  | 'attendance'
  | 'calendar'
  | 'activities'
  | 'badges'
  | 'challenges'
  | 'goals'
  | 'observations'
  | 'finance'
  | 'documents'
  | 'medical'
  | 'children'
  | 'development'
  | 'announcements'
  | 'transportation'
  | 'generic';

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
  compact?: boolean;
}

const getVariantConfig = (isAr: boolean): Record<EmptyStateVariant, {
  icon: typeof FileText;
  title: string;
  description: string;
  iconColor: string;
  bgColor: string;
}> => ({
  'daily-report': {
    icon: ClipboardList,
    title: isAr ? 'لا توجد تقارير يومية بعد' : 'No daily reports yet',
    description: isAr ? 'سيظهر هنا التقرير اليومي لطفلك بمجرد أن تقوم المعلمة بإضافته. ستتلقى إشعاراً فور إضافة تقرير جديد.' : 'Your child\'s daily report will appear here once the teacher adds it. You will receive a notification when a new report is added.',
    iconColor: 'text-sky-600',
    bgColor: 'bg-sky-50',
  },
  'photos': {
    icon: Camera,
    title: isAr ? 'لا توجد صور أو فيديو بعد' : 'No photos or videos yet',
    description: isAr ? 'ستظهر هنا الصور والفيديوهات التي تلتقطها المعلمة لطفلك أثناء الأنشطة اليومية.' : 'Photos and videos taken by the teacher during daily activities will appear here.',
    iconColor: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  'messages': {
    icon: MessageCircle,
    title: isAr ? 'لا توجد محادثات بعد' : 'No conversations yet',
    description: isAr ? 'يمكنك بدء محادثة مع معلمة طفلك أو إدارة المركز للاستفسار عن أي شيء.' : 'You can start a conversation with your child\'s teacher or the center administration.',
    iconColor: 'text-violet-600',
    bgColor: 'bg-violet-50',
  },
  'notifications': {
    icon: Bell,
    title: isAr ? 'لا توجد إشعارات' : 'No notifications',
    description: isAr ? 'ستظهر هنا جميع الإشعارات المتعلقة بطفلك مثل التقارير والحضور والرسائل.' : 'All notifications related to your child such as reports, attendance, and messages will appear here.',
    iconColor: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  'attendance': {
    icon: Calendar,
    title: isAr ? 'لم يُسجل حضور بعد' : 'No attendance recorded yet',
    description: isAr ? 'سيظهر هنا سجل حضور وانصراف طفلك اليومي بمجرد تسجيله من قبل المعلمة.' : 'Your child\'s daily attendance record will appear here once registered by the teacher.',
    iconColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  'calendar': {
    icon: Calendar,
    title: isAr ? 'لا توجد أحداث في هذا الشهر' : 'No events this month',
    description: isAr ? 'ستظهر هنا الفعاليات والمناسبات القادمة في المركز.' : 'Upcoming events and occasions at the center will appear here.',
    iconColor: 'text-teal-600',
    bgColor: 'bg-teal-50',
  },
  'activities': {
    icon: Sparkles,
    title: isAr ? 'لا توجد أنشطة حالياً' : 'No activities currently',
    description: isAr ? 'ستظهر هنا الأنشطة التفاعلية والتعليمية المتاحة لمشاركة الأسرة.' : 'Interactive and educational activities available for family participation will appear here.',
    iconColor: 'text-pink-600',
    bgColor: 'bg-pink-50',
  },
  'badges': {
    icon: Award,
    title: isAr ? 'لا توجد شارات بعد' : 'No badges yet',
    description: isAr ? 'ستحصل على شارات تقديرية عند مشاركتك في أنشطة المركز والتفاعل مع تعليم طفلك.' : 'You will earn badges when you participate in center activities and engage with your child\'s learning.',
    iconColor: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
  },
  'challenges': {
    icon: Target,
    title: isAr ? 'لا توجد تحديات نشطة' : 'No active challenges',
    description: isAr ? 'ستظهر هنا التحديات التعليمية التي يمكنك المشاركة فيها مع طفلك.' : 'Educational challenges you can participate in with your child will appear here.',
    iconColor: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
  'goals': {
    icon: Star,
    title: isAr ? 'لا توجد أهداف لهذا الشهر' : 'No goals for this month',
    description: isAr ? 'ستظهر هنا الأهداف التعليمية الشهرية لطفلك والتقدم المحرز.' : 'Your child\'s monthly educational goals and progress will appear here.',
    iconColor: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
  },
  'observations': {
    icon: BookOpen,
    title: isAr ? 'لا توجد ملاحظات بعد' : 'No observations yet',
    description: isAr ? 'ستظهر هنا ملاحظات المعلمة حول تطور طفلك وسلوكه في المركز.' : 'Teacher observations about your child\'s development and behavior will appear here.',
    iconColor: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
  },
  'finance': {
    icon: CreditCard,
    title: isAr ? 'لا توجد فواتير' : 'No invoices',
    description: isAr ? 'ستظهر هنا الفواتير والمدفوعات المتعلقة برسوم المركز.' : 'Invoices and payments related to center fees will appear here.',
    iconColor: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  'documents': {
    icon: FileText,
    title: isAr ? 'لا توجد مستندات' : 'No documents',
    description: isAr ? 'ستظهر هنا المستندات والملفات المرفوعة مثل الشهادات والتقارير.' : 'Uploaded documents and files such as certificates and reports will appear here.',
    iconColor: 'text-slate-600',
    bgColor: 'bg-slate-50',
  },
  'medical': {
    icon: Stethoscope,
    title: isAr ? 'لا توجد سجلات طبية' : 'No medical records',
    description: isAr ? 'ستظهر هنا المعلومات الصحية والطبية لطفلك.' : 'Your child\'s health and medical information will appear here.',
    iconColor: 'text-red-500',
    bgColor: 'bg-red-50',
  },
  'children': {
    icon: Users,
    title: isAr ? 'لم يتم تسجيل أي طفل بعد' : 'No children registered yet',
    description: isAr ? 'يرجى التواصل مع إدارة المركز لربط حسابك بملف طفلك.' : 'Please contact the center administration to link your account to your child\'s profile.',
    iconColor: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  'development': {
    icon: BookOpen,
    title: isAr ? 'لا توجد بيانات تطورية بعد' : 'No developmental data yet',
    description: isAr ? 'ستظهر هنا معالم تطور طفلك والملاحظات التطورية من المعلمة.' : 'Your child\'s developmental milestones and teacher observations will appear here.',
    iconColor: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  'announcements': {
    icon: Bell,
    title: isAr ? 'لا توجد إعلانات' : 'No announcements',
    description: isAr ? 'ستظهر هنا الإعلانات والتنبيهات من إدارة المركز.' : 'Announcements and alerts from the center administration will appear here.',
    iconColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  'transportation': {
    icon: Bus,
    title: isAr ? 'لا توجد بيانات نقل' : 'No transportation data',
    description: isAr ? 'ستظهر هنا معلومات خدمة النقل المدرسي لطفلك.' : 'Your child\'s school transportation service information will appear here.',
    iconColor: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  'generic': {
    icon: FileText,
    title: isAr ? 'لا توجد بيانات' : 'No data',
    description: isAr ? 'لا توجد بيانات لعرضها حالياً.' : 'No data to display currently.',
    iconColor: 'text-gray-500',
    bgColor: 'bg-gray-50',
  },
});

export function EmptyState({
  variant = 'generic',
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
  compact = false,
}: EmptyStateProps) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const variantConfig = getVariantConfig(isAr);
  const config = variantConfig[variant];
  const Icon = config.icon;
  const displayTitle = title || config.title;
  const displayDescription = description || config.description;

  if (compact) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-6 px-4 text-center", className)}>
        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center mb-3", config.bgColor)}>
          <Icon className={cn("h-5 w-5", config.iconColor)} />
        </div>
        <p className="text-sm font-medium text-foreground mb-1">{displayTitle}</p>
        <p className="text-xs text-muted-foreground max-w-[250px]">{displayDescription}</p>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 px-6 text-center",
      className
    )}>
      <div className={cn(
        "w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-transform",
        config.bgColor
      )}>
        <Icon className={cn("h-8 w-8", config.iconColor)} />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-2">{displayTitle}</h3>
      <p className="text-sm text-muted-foreground max-w-[320px] leading-relaxed mb-5">
        {displayDescription}
      </p>
      {(actionLabel && (actionHref || onAction)) && (
        actionHref ? (
          <Link href={actionHref}>
            <Button variant="outline" size="sm" className="gap-2">
              {actionLabel}
            </Button>
          </Link>
        ) : (
          <Button variant="outline" size="sm" className="gap-2" onClick={onAction}>
            {actionLabel}
          </Button>
        )
      )}
    </div>
  );
}

export default EmptyState;
