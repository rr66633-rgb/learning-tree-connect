import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

// Arabic error messages for user-friendly error display
function getArabicErrorMessage(code: string): string {
  switch (code) {
    case 'UNAUTHORIZED':
      return 'يرجى تسجيل الدخول للمتابعة';
    case 'FORBIDDEN':
      return 'ليس لديك صلاحية للوصول إلى هذا المحتوى';
    case 'NOT_FOUND':
      return 'العنصر المطلوب غير موجود';
    case 'BAD_REQUEST':
      return 'البيانات المدخلة غير صحيحة';
    case 'CONFLICT':
      return 'يوجد تعارض مع بيانات موجودة مسبقاً';
    case 'TOO_MANY_REQUESTS':
      return 'تم تجاوز الحد الأقصى للطلبات. يرجى المحاولة لاحقاً';
    case 'TIMEOUT':
      return 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى';
    case 'INTERNAL_SERVER_ERROR':
      return 'حدث خطأ في الخادم. يرجى المحاولة لاحقاً';
    case 'PARSE_ERROR':
      return 'خطأ في تنسيق البيانات المرسلة';
    case 'METHOD_NOT_SUPPORTED':
      return 'هذا الإجراء غير مدعوم';
    case 'UNPROCESSABLE_CONTENT':
      return 'لا يمكن معالجة البيانات المرسلة';
    case 'PAYLOAD_TOO_LARGE':
      return 'حجم البيانات المرسلة كبير جداً';
    default:
      return 'حدث خطأ غير متوقع. يرجى المحاولة لاحقاً';
  }
}

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        arabicMessage: error.message || getArabicErrorMessage(error.code),
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
