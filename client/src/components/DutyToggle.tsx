import { trpc } from '@/lib/trpc';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

/**
 * DutyToggle - ON DUTY / OFF DUTY toggle for staff
 * When OFF DUTY, staff won't receive pickup alerts
 */
export function DutyToggle() {
  const { data: dutyStatus, isLoading } = trpc.pickup.dutyStatus.useQuery();
  const utils = trpc.useUtils();
  
  const toggleMutation = trpc.pickup.toggleDuty.useMutation({
    onSuccess: (data) => {
      utils.pickup.dutyStatus.setData(undefined, { isOnDuty: data.isOnDuty });
    },
  });

  if (isLoading) return null;

  const isOnDuty = dutyStatus?.isOnDuty ?? true;

  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={isOnDuty}
        onCheckedChange={(checked) => toggleMutation.mutate({ isOnDuty: checked })}
        disabled={toggleMutation.isPending}
      />
      <Badge
        variant={isOnDuty ? 'default' : 'secondary'}
        className={isOnDuty 
          ? 'bg-green-600 text-white hover:bg-green-700' 
          : 'bg-gray-400 text-white hover:bg-gray-500'
        }
      >
        {isOnDuty ? 'في الخدمة' : 'خارج الخدمة'}
      </Badge>
    </div>
  );
}
