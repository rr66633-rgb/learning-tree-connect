import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
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

const variantConfig: Record<EmptyStateVariant, {
  icon: typeof FileText;
  title: string;
  description: string;
  iconColor: string;
  bgColor: string;
}> = {
  'daily-report': {
    icon: ClipboardList,
    title: 'لا توجد تقارير يومية بعد',
    description: 'سيظهر هنا التقرير اليومي لطفلك بمجرد أن تقوم المعلمة بإضافته. ستتلقى إشعاراً فور إضافة تقرير جديد.',
    iconColor: 'text-sky-600',
    bgColor: 'bg-sky-50',
  },
  'photos': {
    icon: Camera,
    title: 'لا توجد صور أو فيديو بعد',
    description: 'ستظهر هنا الصور والفيديوهات التي تلتقطها المعلمة لطفلك أثناء الأنشطة اليومية.',
    iconColor: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  'messages': {
    icon: MessageCircle,
    title: 'لا توجد محادثات بعد',
    description: 'يمكنك بدء محادثة مع معلمة طفلك أو إدارة المركز للاستفسار عن أي شيء.',
    iconColor: 'text-violet-600',
    bgColor: 'bg-violet-50',
  },
  'notifications': {
    icon: Bell,
    title: 'لا توجد إشعارات',
    description: 'ستظهر هنا جميع الإشعارات المتعلقة بطفلك مثل التقارير والحضور والرسائل.',
    iconColor: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  'attendance': {
    icon: Calendar,
    title: 'لم يُسجل حضور بعد',
    description: 'سيظهر هنا سجل حضور وانصراف طفلك اليومي بمجرد تسجيله من قبل المعلمة.',
    iconColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  'calendar': {
    icon: Calendar,
    title: 'لا توجد أحداث في هذا الشهر',
    description: 'ستظهر هنا الفعاليات والمناسبات القادمة في المركز.',
    iconColor: 'text-teal-600',
    bgColor: 'bg-teal-50',
  },
  'activities': {
    icon: Sparkles,
    title: 'لا توجد أنشطة حالياً',
    description: 'ستظهر هنا الأنشطة التفاعلية والتعليمية المتاحة لمشاركة الأسرة.',
    iconColor: 'text-pink-600',
    bgColor: 'bg-pink-50',
  },
  'badges': {
    icon: Award,
    title: 'لا توجد شارات بعد',
    description: 'ستحصل على شارات تقديرية عند مشاركتك في أنشطة المركز والتفاعل مع تعليم طفلك.',
    iconColor: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
  },
  'challenges': {
    icon: Target,
    title: 'لا توجد تحديات نشطة',
    description: 'ستظهر هنا التحديات التعليمية التي يمكنك المشاركة فيها مع طفلك.',
    iconColor: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
  'goals': {
    icon: Star,
    title: 'لا توجد أهداف لهذا الشهر',
    description: 'ستظهر هنا الأهداف التعليمية الشهرية لطفلك والتقدم المحرز.',
    iconColor: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
  },
  'observations': {
    icon: BookOpen,
    title: 'لا توجد ملاحظات بعد',
    description: 'ستظهر هنا ملاحظات المعلمة حول تطور طفلك وسلوكه في المركز.',
    iconColor: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
  },
  'finance': {
    icon: CreditCard,
    title: 'لا توجد فواتير',
    description: 'ستظهر هنا الفواتير والمدفوعات المتعلقة برسوم المركز.',
    iconColor: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  'documents': {
    icon: FileText,
    title: 'لا توجد مستندات',
    description: 'ستظهر هنا المستندات والملفات المرفوعة مثل الشهادات والتقارير.',
    iconColor: 'text-slate-600',
    bgColor: 'bg-slate-50',
  },
  'medical': {
    icon: Stethoscope,
    title: 'لا توجد سجلات طبية',
    description: 'ستظهر هنا المعلومات الصحية والطبية لطفلك.',
    iconColor: 'text-red-500',
    bgColor: 'bg-red-50',
  },
  'children': {
    icon: Users,
    title: 'لم يتم تسجيل أي طفل بعد',
    description: 'يرجى التواصل مع إدارة المركز لربط حسابك بملف طفلك.',
    iconColor: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  'development': {
    icon: BookOpen,
    title: 'لا توجد بيانات تطورية بعد',
    description: 'ستظهر هنا معالم تطور طفلك والملاحظات التطورية من المعلمة.',
    iconColor: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  'announcements': {
    icon: Bell,
    title: 'لا توجد إعلانات',
    description: 'ستظهر هنا الإعلانات والتنبيهات من إدارة المركز.',
    iconColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  'transportation': {
    icon: Bus,
    title: 'لا توجد بيانات نقل',
    description: 'ستظهر هنا معلومات خدمة النقل المدرسي لطفلك.',
    iconColor: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  'generic': {
    icon: FileText,
    title: 'لا توجد بيانات',
    description: 'لا توجد بيانات لعرضها حالياً.',
    iconColor: 'text-gray-500',
    bgColor: 'bg-gray-50',
  },
};

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
