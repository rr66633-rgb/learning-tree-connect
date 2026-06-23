/**
 * Custom hooks for parent portal data with optimized caching strategies.
 * 
 * Data categories:
 * - Static: Child profiles, medical info (staleTime: 15min)
 * - Semi-static: Attendance records, finance (staleTime: 5min) 
 * - Dynamic: Notifications, messages (staleTime: 30s)
 * - Real-time: Pickup status (refetchInterval: 5s)
 */
import { trpc } from "@/lib/trpc";

/** 
 * Children data - rarely changes, cache aggressively 
 * Used across multiple pages (Dashboard, DailyReport, Attendance, etc.)
 */
export function useChildren() {
  return trpc.children.list.useQuery(undefined, {
    staleTime: 1000 * 60 * 15, // 15 minutes - child data rarely changes
    gcTime: 1000 * 60 * 30,    // 30 minutes garbage collection
  });
}

/**
 * Auth/profile data - cache for session duration
 */
export function useProfile() {
  return trpc.auth.me.useQuery(undefined, {
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60,    // 1 hour
  });
}

/**
 * Notifications count - refresh frequently for badge updates
 */
export function useNotificationCount() {
  return trpc.notifications.unreadCount.useQuery(undefined, {
    staleTime: 1000 * 30,       // 30 seconds
    refetchInterval: 1000 * 60, // Refetch every minute
  });
}

/**
 * Daily activities/timeline - moderate caching
 */
export function useDailyActivities(childId: number, date: string) {
  return trpc.dailyActivities.byChild.useQuery(
    { childId, date },
    {
      enabled: !!childId,
      staleTime: 1000 * 60 * 3, // 3 minutes
      gcTime: 1000 * 60 * 10,
    }
  );
}

/**
 * Attendance records - moderate caching
 */
export function useAttendance(childId: number) {
  return trpc.attendance.byChild.useQuery(
    { childId },
    {
      enabled: !!childId,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 15,
    }
  );
}

/**
 * Finance/invoices - moderate caching
 */
export function useInvoices() {
  return trpc.finance.invoices.useQuery(undefined, {
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15,
  });
}

/**
 * Announcements - semi-static
 */
export function useAnnouncements() {
  return trpc.announcements.list.useQuery(undefined, {
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30,
  });
}

/**
 * Prefetch commonly needed data for parent portal
 * Call this on Dashboard mount to warm the cache
 */
export function usePrefetchParentData() {
  const utils = trpc.useUtils();
  
  return () => {
    // Prefetch children data (used everywhere)
    utils.children.list.prefetch();
    // Prefetch notification count (shown in header)
    utils.notifications.unreadCount.prefetch();
  };
}
