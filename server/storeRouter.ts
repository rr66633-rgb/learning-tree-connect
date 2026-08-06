import { protectedProcedure, publicProcedure, superAdminProcedure, tenantProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, and, desc, sql, inArray, gte, lte } from "drizzle-orm";
import {
  storeCategories,
  storeProducts,
  storeCart,
  storeOrders,
  storeOrderItems,
  organizations,
  users,
  notifications,
} from "../drizzle/schema";
import { getDb } from "./db";

// SECURITY FIX (broken access control): all eleven `admin*` endpoints in this
// router were declared on `protectedProcedure`, which only proves the caller is
// logged in -- NOT that they are staff. Despite their names, every one of them
// was reachable by ANY authenticated account, including a parent. Verified
// against the running app with a real parent session: adminGetProducts,
// adminGetCategories, adminGetOrders, adminGetSalesReport and
// adminCreateCategory all executed successfully for a parent. That exposed
// every order in the nursery (with the buying parents' names, phone numbers and
// addresses) and the full sales report, and allowed a parent to create, edit and
// delete the nursery's store catalogue.
//
// This is the store-router equivalent of the gate already used elsewhere in the
// codebase. It is built on `tenantProcedure` (not `protectedProcedure`) so
// ctx.organizationId is additionally guaranteed to be a real organization,
// rather than being read from ctx.user with an `if (!orgId) throw` afterwards.
const storeAdminProcedure = tenantProcedure.use(({ ctx, next }) => {
  const adminRoles = ['admin', 'super_admin', 'owner', 'principal'];
  if (!adminRoles.includes(ctx.user.role)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'صلاحيات الإدارة مطلوبة' });
  }
  return next({ ctx });
});

const COMMISSION_RATE = 0.10; // 10%

function generateOrderNumber(): string {
  const prefix = "NS";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export const storeRouter = router({
  // ============ PUBLIC: Get organizations with active store ============
  getStoreOrganizations: publicProcedure.query(async () => {
    const db = (await getDb())!;
    // Get organizations that have at least one active product
    const orgs = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        nameAr: organizations.nameAr,
        logo: organizations.logoUrl,
      })
      .from(organizations)
      .where(eq(organizations.status, "active"));
    
    // Filter to only orgs with products
    const orgsWithProducts = [];
    for (const org of orgs) {
      const [productCount] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(storeProducts)
        .where(and(eq(storeProducts.organizationId, org.id), eq(storeProducts.isActive, true)));
      if (productCount && productCount.count > 0) {
        orgsWithProducts.push(org);
      }
    }
    return orgsWithProducts;
  }),

  // ============ PUBLIC: Get products by organization ============
  getProducts: publicProcedure
    .input(z.object({ organizationId: z.number(), categoryId: z.number().optional() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions = [
        eq(storeProducts.organizationId, input.organizationId),
        eq(storeProducts.isActive, true),
      ];
      if (input.categoryId) {
        conditions.push(eq(storeProducts.categoryId, input.categoryId));
      }
      const products = await db
        .select()
        .from(storeProducts)
        .where(and(...conditions))
        .orderBy(desc(storeProducts.createdAt));
      return products;
    }),

  // ============ PUBLIC: Get categories by organization ============
  getCategories: publicProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const categories = await db
        .select()
        .from(storeCategories)
        .where(and(eq(storeCategories.organizationId, input.organizationId), eq(storeCategories.isActive, true)))
        .orderBy(storeCategories.sortOrder);
      return categories;
    }),

  // ============ PUBLIC: Get single product ============
  getProduct: publicProcedure
    .input(z.object({ productId: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const [product] = await db
        .select()
        .from(storeProducts)
        .where(eq(storeProducts.id, input.productId));
      if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "المنتج غير موجود" });
      return product;
    }),

  // ============ CART ============
  getCart: protectedProcedure.query(async ({ ctx }) => {
    const db = (await getDb())!;
    const cartItems = await db
      .select({
        id: storeCart.id,
        productId: storeCart.productId,
        quantity: storeCart.quantity,
        product: {
          id: storeProducts.id,
          name: storeProducts.name,
          nameAr: storeProducts.nameAr,
          price: storeProducts.price,
          imageUrl: storeProducts.imageUrl,
          organizationId: storeProducts.organizationId,
          stock: storeProducts.stock,
          isActive: storeProducts.isActive,
        },
      })
      .from(storeCart)
      .innerJoin(storeProducts, eq(storeCart.productId, storeProducts.id))
      .where(eq(storeCart.userId, ctx.user.id));
    return cartItems;
  }),

  addToCart: protectedProcedure
    .input(z.object({ productId: z.number(), quantity: z.number().min(1).default(1) }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      // Check product exists and is active
      const [product] = await db
        .select()
        .from(storeProducts)
        .where(and(eq(storeProducts.id, input.productId), eq(storeProducts.isActive, true)));
      if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "المنتج غير متوفر" });
      
      // Check stock
      if (product.stock !== -1 && product.stock !== null && product.stock < input.quantity) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "الكمية المطلوبة غير متوفرة" });
      }

      // Check if already in cart
      const [existing] = await db
        .select()
        .from(storeCart)
        .where(and(eq(storeCart.userId, ctx.user.id), eq(storeCart.productId, input.productId)));
      
      if (existing) {
        await db.update(storeCart)
          .set({ quantity: existing.quantity + input.quantity })
          .where(eq(storeCart.id, existing.id));
      } else {
        // SECURITY FIX: previously omitted organizationId entirely --
        // storeCart.organizationId is NOT NULL with no default, so this
        // would fail outright. The store is an intentional cross-org
        // marketplace (a parent from any organization can browse/buy from
        // any nursery's store), so organizationId here identifies which
        // nursery's store the product belongs to (not the buyer's own
        // organization) -- taken from the already-fetched product record.
        await db.insert(storeCart).values({
          userId: ctx.user.id,
          productId: input.productId,
          quantity: input.quantity,
          organizationId: product.organizationId,
        });
      }
      return { success: true };
    }),

  updateCartItem: protectedProcedure
    .input(z.object({ cartItemId: z.number(), quantity: z.number().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      await db.update(storeCart)
        .set({ quantity: input.quantity })
        .where(and(eq(storeCart.id, input.cartItemId), eq(storeCart.userId, ctx.user.id)));
      return { success: true };
    }),

  removeFromCart: protectedProcedure
    .input(z.object({ cartItemId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      await db.delete(storeCart)
        .where(and(eq(storeCart.id, input.cartItemId), eq(storeCart.userId, ctx.user.id)));
      return { success: true };
    }),

  clearCart: protectedProcedure.mutation(async ({ ctx }) => {
    const db = (await getDb())!;
    await db.delete(storeCart).where(eq(storeCart.userId, ctx.user.id));
    return { success: true };
  }),

  // ============ ORDERS ============
  createOrder: protectedProcedure
    .input(z.object({ notes: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      // Get cart items
      const cartItems = await db
        .select({
          id: storeCart.id,
          productId: storeCart.productId,
          quantity: storeCart.quantity,
          product: {
            id: storeProducts.id,
            name: storeProducts.name,
            nameAr: storeProducts.nameAr,
            price: storeProducts.price,
            organizationId: storeProducts.organizationId,
            stock: storeProducts.stock,
          },
        })
        .from(storeCart)
        .innerJoin(storeProducts, eq(storeCart.productId, storeProducts.id))
        .where(eq(storeCart.userId, ctx.user.id));

      if (cartItems.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "السلة فارغة" });
      }

      // All items must be from the same organization
      const orgIdSet = new Set(cartItems.map(item => item.product.organizationId));
      const orgIds = Array.from(orgIdSet);
      if (orgIds.length > 1) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن الطلب من أكثر من حضانة في نفس الوقت" });
      }

      const organizationId = orgIds[0]!;
      
      // Calculate totals
      const subtotal = cartItems.reduce((sum, item) => {
        return sum + (Number(item.product.price) * item.quantity);
      }, 0);
      const commission = Math.round(subtotal * COMMISSION_RATE * 100) / 100;
      const total = subtotal;

      const orderNumber = generateOrderNumber();

      // Create order
      const [orderResult] = await db.insert(storeOrders).values({
        orderNumber,
        userId: ctx.user.id,
        organizationId,
        subtotal: String(subtotal),
        commission: String(commission),
        total: String(total),
        status: "pending",
        notes: input.notes || null,
      });

      const orderId = orderResult.insertId;

      // Create order items
      for (const item of cartItems) {
        const itemTotal = Number(item.product.price) * item.quantity;
        await db.insert(storeOrderItems).values({
          orderId,
          productId: item.product.id,
          productName: item.product.name,
          productNameAr: item.product.nameAr,
          price: String(item.product.price),
          quantity: item.quantity,
          total: String(itemTotal),
        });

        // Decrease stock if applicable
        if (item.product.stock !== null && item.product.stock !== -1) {
          await db.update(storeProducts)
            .set({ stock: sql`${storeProducts.stock} - ${item.quantity}` })
            .where(eq(storeProducts.id, item.product.id));
        }
      }

      // Clear cart
      await db.delete(storeCart).where(eq(storeCart.userId, ctx.user.id));

      // Send notification to nursery admin/staff
      try {
        const orgStaff = await db
          .select({ id: users.id })
          .from(users)
          .where(and(
            eq(users.organizationId, organizationId),
            inArray(users.role, ["admin", "principal", "owner", "receptionist"]),
            eq(users.isActive, true)
          ));
        for (const staff of orgStaff) {
          await db.insert(notifications).values({
            userId: staff.id,
            organizationId,
            title: "New Store Order",
            titleAr: "طلب جديد من المتجر",
            body: `New order #${orderNumber} received - Total: ${total} SAR`,
            bodyAr: `تم استلام طلب جديد #${orderNumber} - المبلغ: ${total} ر.س`,
            type: "payment",
            link: "/staff/store",
            metadata: { orderId, orderNumber, total },
          });
        }
      } catch (e) {
        console.error("Failed to send store order notification:", e);
      }

      return { orderId, orderNumber, total };
    }),

  // Get Moyasar payment config for store checkout
  getPaymentConfig: protectedProcedure.query(async () => {
    const { getMoyasarPublishableKey, isMoyasarConfigured } = await import("./_core/moyasar");
    return {
      isConfigured: isMoyasarConfigured(),
      publishableKey: getMoyasarPublishableKey(),
    };
  }),

  // Verify store payment
  verifyPayment: protectedProcedure
    .input(z.object({ orderId: z.number(), moyasarPaymentId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const [order] = await db
        .select()
        .from(storeOrders)
        .where(and(eq(storeOrders.id, input.orderId), eq(storeOrders.userId, ctx.user.id)));
      
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });

      const { fetchMoyasarPayment, isMoyasarConfigured } = await import("./_core/moyasar");
      
      if (isMoyasarConfigured()) {
        const payment = await fetchMoyasarPayment(input.moyasarPaymentId);
        if (payment.status === "paid") {
          await db.update(storeOrders)
            .set({ status: "paid", moyasarPaymentId: input.moyasarPaymentId, paymentMethod: payment.source?.type || "creditcard" })
            .where(eq(storeOrders.id, input.orderId));
          return { status: "paid" };
        } else if (payment.status === "failed") {
          await db.update(storeOrders)
            .set({ status: "cancelled", moyasarPaymentId: input.moyasarPaymentId })
            .where(eq(storeOrders.id, input.orderId));
          return { status: "failed" };
        }
        return { status: "pending" };
      }
      
      // Mock mode
      await db.update(storeOrders)
        .set({ status: "paid", moyasarPaymentId: input.moyasarPaymentId })
        .where(eq(storeOrders.id, input.orderId));
      return { status: "paid" };
    }),

  // Get user orders
  getMyOrders: protectedProcedure.query(async ({ ctx }) => {
    const db = (await getDb())!;
    const orders = await db
      .select()
      .from(storeOrders)
      .where(eq(storeOrders.userId, ctx.user.id))
      .orderBy(desc(storeOrders.createdAt));
    return orders;
  }),

  getOrderDetails: protectedProcedure
    .input(z.object({ orderId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const [order] = await db
        .select()
        .from(storeOrders)
        .where(and(eq(storeOrders.id, input.orderId), eq(storeOrders.userId, ctx.user.id)));
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });
      
      const items = await db
        .select()
        .from(storeOrderItems)
        .where(eq(storeOrderItems.orderId, input.orderId));
      
      return { ...order, items };
    }),

  // ============ NURSERY ADMIN: Product Management ============
  adminGetProducts: storeAdminProcedure.query(async ({ ctx }) => {
    const db = (await getDb())!;
    const orgId = ctx.user.organizationId;
    if (!orgId) throw new TRPCError({ code: "FORBIDDEN", message: "غير مصرح" });
    const products = await db
      .select()
      .from(storeProducts)
      .where(eq(storeProducts.organizationId, orgId))
      .orderBy(desc(storeProducts.createdAt));
    return products;
  }),

  adminCreateProduct: storeAdminProcedure
    .input(z.object({
      name: z.string().min(1),
      nameAr: z.string().min(1),
      description: z.string().optional(),
      descriptionAr: z.string().optional(),
      price: z.string(),
      compareAtPrice: z.string().optional(),
      imageUrl: z.string().optional(),
      images: z.array(z.string()).optional(),
      type: z.enum(["product", "service"]).default("product"),
      stock: z.number().default(0),
      categoryId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const orgId = ctx.user.organizationId;
      if (!orgId) throw new TRPCError({ code: "FORBIDDEN", message: "غير مصرح" });
      
      const [result] = await db.insert(storeProducts).values({
        organizationId: orgId,
        name: input.name,
        nameAr: input.nameAr,
        description: input.description || null,
        descriptionAr: input.descriptionAr || null,
        price: input.price,
        compareAtPrice: input.compareAtPrice || null,
        imageUrl: input.imageUrl || null,
        images: input.images || null,
        type: input.type,
        stock: input.type === "service" ? -1 : input.stock,
        categoryId: input.categoryId || null,
      });
      return { id: result.insertId };
    }),

  adminUpdateProduct: storeAdminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      nameAr: z.string().min(1).optional(),
      description: z.string().optional(),
      descriptionAr: z.string().optional(),
      price: z.string().optional(),
      compareAtPrice: z.string().optional(),
      imageUrl: z.string().optional(),
      images: z.array(z.string()).optional(),
      type: z.enum(["product", "service"]).optional(),
      stock: z.number().optional(),
      categoryId: z.number().nullable().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const orgId = ctx.user.organizationId;
      if (!orgId) throw new TRPCError({ code: "FORBIDDEN", message: "غير مصرح" });
      
      const { id, ...updates } = input;
      const [existing] = await db.select({ id: storeProducts.id }).from(storeProducts)
        .where(and(eq(storeProducts.id, id), eq(storeProducts.organizationId, orgId)))
        .limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "المنتج غير موجود" });
      await db.update(storeProducts)
        .set(updates as any)
        .where(and(eq(storeProducts.id, id), eq(storeProducts.organizationId, orgId)));
      return { success: true };
    }),

  adminDeleteProduct: storeAdminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const orgId = ctx.user.organizationId;
      if (!orgId) throw new TRPCError({ code: "FORBIDDEN", message: "غير مصرح" });
      const [existing] = await db.select({ id: storeProducts.id }).from(storeProducts)
        .where(and(eq(storeProducts.id, input.id), eq(storeProducts.organizationId, orgId)))
        .limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "المنتج غير موجود" });
      
      await db.update(storeProducts)
        .set({ isActive: false })
        .where(and(eq(storeProducts.id, input.id), eq(storeProducts.organizationId, orgId)));
      return { success: true };
    }),

  // ============ NURSERY ADMIN: Category Management ============
  adminGetCategories: storeAdminProcedure.query(async ({ ctx }) => {
    const db = (await getDb())!;
    const orgId = ctx.user.organizationId;
    if (!orgId) throw new TRPCError({ code: "FORBIDDEN", message: "غير مصرح" });
    const categories = await db
      .select()
      .from(storeCategories)
      .where(eq(storeCategories.organizationId, orgId))
      .orderBy(storeCategories.sortOrder);
    return categories;
  }),

  adminCreateCategory: storeAdminProcedure
    .input(z.object({
      name: z.string().min(1),
      nameAr: z.string().min(1),
      icon: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const orgId = ctx.user.organizationId;
      if (!orgId) throw new TRPCError({ code: "FORBIDDEN", message: "غير مصرح" });
      
      const [result] = await db.insert(storeCategories).values({
        organizationId: orgId,
        name: input.name,
        nameAr: input.nameAr,
        icon: input.icon || null,
      });
      return { id: result.insertId };
    }),

  adminDeleteCategory: storeAdminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const orgId = ctx.user.organizationId;
      if (!orgId) throw new TRPCError({ code: "FORBIDDEN", message: "غير مصرح" });
      await db.update(storeCategories)
        .set({ isActive: false })
        .where(and(eq(storeCategories.id, input.id), eq(storeCategories.organizationId, orgId)));
      return { success: true };
    }),

  // ============ NURSERY ADMIN: Order Management ============
  adminGetOrders: storeAdminProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const orgId = ctx.user.organizationId;
      if (!orgId) throw new TRPCError({ code: "FORBIDDEN", message: "غير مصرح" });
      
      const conditions = [eq(storeOrders.organizationId, orgId)];
      if (input?.status) {
        conditions.push(eq(storeOrders.status, input.status as any));
      }
      
      const orders = await db
        .select()
        .from(storeOrders)
        .where(and(...conditions))
        .orderBy(desc(storeOrders.createdAt));
      return orders;
    }),

  adminUpdateOrderStatus: storeAdminProcedure
    .input(z.object({
      orderId: z.number(),
      status: z.enum(["processing", "ready", "completed", "cancelled"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const orgId = ctx.user.organizationId;
      if (!orgId) throw new TRPCError({ code: "FORBIDDEN", message: "غير مصرح" });
      const [existing] = await db.select({ id: storeOrders.id }).from(storeOrders)
        .where(and(eq(storeOrders.id, input.orderId), eq(storeOrders.organizationId, orgId)))
        .limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });
      
      await db.update(storeOrders)
        .set({ status: input.status })
        .where(and(eq(storeOrders.id, input.orderId), eq(storeOrders.organizationId, orgId)));
      return { success: true };
    }),

  adminGetOrderDetails: storeAdminProcedure
    .input(z.object({ orderId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const orgId = ctx.user.organizationId;
      if (!orgId) throw new TRPCError({ code: "FORBIDDEN", message: "غير مصرح" });
      
      const [order] = await db
        .select()
        .from(storeOrders)
        .where(and(eq(storeOrders.id, input.orderId), eq(storeOrders.organizationId, orgId)));
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });
      
      const items = await db
        .select()
        .from(storeOrderItems)
        .where(eq(storeOrderItems.orderId, input.orderId));
      
      return { ...order, items };
    }),

  // ============ SUPER ADMIN: All Orders & Commission Reports ============
  // SECURITY FIX: migrated from an inline `ctx.user.role !== "super_admin"`
  // check on `protectedProcedure` to the shared `superAdminProcedure` from
  // server/_core/trpc.ts -- this is genuinely a deliberate cross-organization
  // endpoint (the platform operator reviewing orders/commission across every
  // nursery-run store), so it now builds on the single canonical gate instead
  // of its own copy of the same check.
  superAdminGetAllOrders: superAdminProcedure
    .input(z.object({ status: z.string().optional(), organizationId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions: any[] = [];
      if (input?.status) conditions.push(eq(storeOrders.status, input.status as any));
      if (input?.organizationId) conditions.push(eq(storeOrders.organizationId, input.organizationId));
      
      const orders = await db
        .select()
        .from(storeOrders)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(storeOrders.createdAt));
      return orders;
    }),

  // ============ NURSERY ADMIN: Sales Report ============
  adminGetSalesReport: storeAdminProcedure
    .input(z.object({ period: z.enum(["week", "month", "year"]).default("month") }).optional())
    .query(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const orgId = ctx.user.organizationId;
      if (!orgId) throw new TRPCError({ code: "FORBIDDEN", message: "غير مصرح" });

      const period = input?.period || "month";
      const now = new Date();
      let startDate: Date;
      if (period === "week") {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (period === "month") {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else {
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      }

      // Summary stats
      const [summary] = await db
        .select({
          totalOrders: sql<number>`COUNT(*)`,
          totalRevenue: sql<string>`COALESCE(SUM(total), 0)`,
          totalCommission: sql<string>`COALESCE(SUM(commission), 0)`,
          paidOrders: sql<number>`SUM(CASE WHEN status IN ('paid', 'processing', 'ready', 'completed') THEN 1 ELSE 0 END)`,
          cancelledOrders: sql<number>`SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END)`,
          pendingOrders: sql<number>`SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)`,
        })
        .from(storeOrders)
        .where(and(eq(storeOrders.organizationId, orgId), gte(storeOrders.createdAt, startDate)));

      // Daily sales for chart
      const dailySales = await db
        .select({
          date: sql<string>`DATE(createdAt)`,
          revenue: sql<string>`COALESCE(SUM(total), 0)`,
          orders: sql<number>`COUNT(*)`,
        })
        .from(storeOrders)
        .where(and(
          eq(storeOrders.organizationId, orgId),
          gte(storeOrders.createdAt, startDate),
          inArray(storeOrders.status, ["paid", "processing", "ready", "completed"])
        ))
        .groupBy(sql`DATE(createdAt)`)
        .orderBy(sql`DATE(createdAt)`);

      // Top selling products
      const topProducts = await db
        .select({
          productName: storeOrderItems.productNameAr,
          totalQuantity: sql<number>`SUM(${storeOrderItems.quantity})`,
          totalRevenue: sql<string>`SUM(${storeOrderItems.total})`,
        })
        .from(storeOrderItems)
        .innerJoin(storeOrders, eq(storeOrderItems.orderId, storeOrders.id))
        .where(and(
          eq(storeOrders.organizationId, orgId),
          gte(storeOrders.createdAt, startDate),
          inArray(storeOrders.status, ["paid", "processing", "ready", "completed"])
        ))
        .groupBy(storeOrderItems.productNameAr)
        .orderBy(desc(sql`SUM(${storeOrderItems.quantity})`))
        .limit(10);

      // Orders by status for pie chart
      const ordersByStatus = await db
        .select({
          status: storeOrders.status,
          count: sql<number>`COUNT(*)`,
        })
        .from(storeOrders)
        .where(and(eq(storeOrders.organizationId, orgId), gte(storeOrders.createdAt, startDate)))
        .groupBy(storeOrders.status);

      return {
        summary: {
          totalOrders: summary?.totalOrders || 0,
          totalRevenue: summary?.totalRevenue || "0",
          totalCommission: summary?.totalCommission || "0",
          netRevenue: String(Number(summary?.totalRevenue || 0) - Number(summary?.totalCommission || 0)),
          paidOrders: summary?.paidOrders || 0,
          cancelledOrders: summary?.cancelledOrders || 0,
          pendingOrders: summary?.pendingOrders || 0,
        },
        dailySales,
        topProducts,
        ordersByStatus,
      };
    }),

  // SECURITY FIX: migrated to the shared `superAdminProcedure` -- see
  // superAdminGetAllOrders above.
  superAdminGetCommissionReport: superAdminProcedure.query(async () => {
    const db = (await getDb())!;
    const [totals] = await db
      .select({
        totalOrders: sql<number>`COUNT(*)`,
        totalRevenue: sql<string>`COALESCE(SUM(total), 0)`,
        totalCommission: sql<string>`COALESCE(SUM(commission), 0)`,
        paidOrders: sql<number>`SUM(CASE WHEN status IN ('paid', 'processing', 'ready', 'completed') THEN 1 ELSE 0 END)`,
      })
      .from(storeOrders);
    
    return {
      totalOrders: totals?.totalOrders || 0,
      totalRevenue: totals?.totalRevenue || "0",
      totalCommission: totals?.totalCommission || "0",
      paidOrders: totals?.paidOrders || 0,
    };
  }),
});
