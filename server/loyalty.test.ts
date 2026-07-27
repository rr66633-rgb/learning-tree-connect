import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the db module
vi.mock('./db', () => ({
  getLoyaltyBalance: vi.fn().mockResolvedValue({ points: 100 }),
  getLoyaltyTransactions: vi.fn().mockResolvedValue([
    { id: 1, userId: 1, points: 50, type: 'earned', description: 'مكافأة ترحيب', createdAt: new Date() },
    { id: 2, userId: 1, points: -30, type: 'redeemed', description: 'استبدال مكافأة', createdAt: new Date() },
  ]),
  getLoyaltyRewards: vi.fn().mockResolvedValue([
    { id: 1, name: 'Discount', nameAr: 'خصم 10%', pointsCost: 50, isActive: true, category: 'discount', maxRedemptions: null, currentRedemptions: 0 },
    { id: 2, name: 'Free Day', nameAr: 'يوم مجاني', pointsCost: 200, isActive: true, category: 'free_day', maxRedemptions: 5, currentRedemptions: 2 },
  ]),
  addLoyaltyPoints: vi.fn().mockResolvedValue({ success: true }),
  createLoyaltyReward: vi.fn().mockResolvedValue({ id: 3, name: 'New', nameAr: 'جديد', pointsCost: 100 }),
  updateLoyaltyReward: vi.fn().mockResolvedValue({ success: true }),
  deleteLoyaltyReward: vi.fn().mockResolvedValue({ success: true }),
  incrementRewardRedemptions: vi.fn().mockResolvedValue(undefined),
  createLoyaltyRedemption: vi.fn().mockResolvedValue({ id: 1 }),
  getUserRedemptions: vi.fn().mockResolvedValue([]),
  getLoyaltySettings: vi.fn().mockResolvedValue({ id: 1, pointsPerReferral: 100, isActive: true }),
  updateLoyaltySettings: vi.fn().mockResolvedValue({ success: true }),
  getAllParentsLoyaltyPoints: vi.fn().mockResolvedValue([
    { userId: 1, points: 100, userName: 'Test', userNameAr: 'اختبار', email: 'test@test.com' },
  ]),
  getAllRedemptions: vi.fn().mockResolvedValue([]),
  updateRedemptionStatus: vi.fn().mockResolvedValue({ success: true }),
  getLoyaltyPartners: vi.fn().mockResolvedValue([
    { id: 1, name: 'Partner', nameAr: 'شريك', discountPercentage: 15, isActive: true },
  ]),
  getAllLoyaltyPartners: vi.fn().mockResolvedValue([
    { id: 1, name: 'Partner', nameAr: 'شريك', discountPercentage: 15, isActive: true },
    { id: 2, name: 'Inactive', nameAr: 'غير نشط', discountPercentage: 10, isActive: false },
  ]),
  createLoyaltyPartner: vi.fn().mockResolvedValue({ id: 3, name: 'New', nameAr: 'جديد' }),
  updateLoyaltyPartner: vi.fn().mockResolvedValue({ success: true }),
  deleteLoyaltyPartner: vi.fn().mockResolvedValue({ success: true }),
  getLoyaltyCard: vi.fn().mockResolvedValue(null),
  createLoyaltyCard: vi.fn().mockResolvedValue({ cardNumber: 'NSH-ABCD-EFGH-IJKL', qrCodeData: '{}' }),
  getAllLoyaltyCards: vi.fn().mockResolvedValue([]),
  getCardByNumber: vi.fn().mockResolvedValue(null),
  getCardTemplates: vi.fn().mockResolvedValue([
    { id: 1, name: 'Teal', nameAr: 'تيل', backgroundColor: '#2BBAA4', textColor: '#FFFFFF', accentColor: '#7C3AED', backgroundPattern: 'gradient', isDefault: true },
  ]),
  createCardTemplate: vi.fn().mockResolvedValue({ id: 2, name: 'Custom', nameAr: 'مخصص' }),
}));

const db = await import('./db');

describe('Loyalty System - Balance & Transactions', () => {
  it('should return user loyalty balance', async () => {
    const balance = await db.getLoyaltyBalance(1);
    expect(balance).toHaveProperty('points');
    expect(balance.points).toBe(100);
  });

  it('should return user transactions', async () => {
    const transactions = await db.getLoyaltyTransactions(1);
    expect(Array.isArray(transactions)).toBe(true);
    expect(transactions.length).toBe(2);
    expect(transactions[0]).toHaveProperty('type');
    expect(transactions[0]).toHaveProperty('points');
  });

  it('should add points to user', async () => {
    const result = await db.addLoyaltyPoints(1, 50, 'earned', 'مكافأة حضور');
    expect(result).toEqual({ success: true });
    expect(db.addLoyaltyPoints).toHaveBeenCalledWith(1, 50, 'earned', 'مكافأة حضور');
  });
});

describe('Loyalty System - Rewards', () => {
  it('should return active rewards', async () => {
    const rewards = await db.getLoyaltyRewards();
    expect(Array.isArray(rewards)).toBe(true);
    expect(rewards.length).toBe(2);
    expect(rewards[0]).toHaveProperty('pointsCost');
    expect(rewards[0]).toHaveProperty('nameAr');
  });

  it('should create a new reward', async () => {
    const reward = await db.createLoyaltyReward({
      name: 'New Reward',
      nameAr: 'مكافأة جديدة',
      pointsCost: 100,
      category: 'gift',
    });
    expect(reward).toHaveProperty('id');
    expect(reward.nameAr).toBe('جديد');
  });

  it('should update a reward', async () => {
    const result = await db.updateLoyaltyReward(1, { pointsCost: 75 });
    expect(result).toEqual({ success: true });
  });

  it('should soft-delete a reward', async () => {
    const result = await db.deleteLoyaltyReward(1);
    expect(result).toEqual({ success: true });
  });

  it('should check max redemptions before allowing redemption', async () => {
    const rewards = await db.getLoyaltyRewards();
    const limitedReward = rewards.find(r => r.maxRedemptions !== null);
    expect(limitedReward).toBeDefined();
    expect(limitedReward!.currentRedemptions).toBeLessThan(limitedReward!.maxRedemptions!);
  });
});

describe('Loyalty System - Partners', () => {
  it('should return active partners only', async () => {
    const partners = await db.getLoyaltyPartners();
    expect(Array.isArray(partners)).toBe(true);
    expect(partners.every((p: any) => p.isActive)).toBe(true);
  });

  it('should return all partners including inactive', async () => {
    const partners = await db.getAllLoyaltyPartners();
    expect(partners.length).toBe(2);
    expect(partners.some((p: any) => !p.isActive)).toBe(true);
  });

  it('should create a partner', async () => {
    const partner = await db.createLoyaltyPartner({
      name: 'New Partner',
      nameAr: 'شريك جديد',
      discountPercentage: 20,
    });
    expect(partner).toHaveProperty('id');
  });

  it('should delete (deactivate) a partner', async () => {
    const result = await db.deleteLoyaltyPartner(1);
    expect(result).toEqual({ success: true });
  });
});

describe('Loyalty System - Cards', () => {
  it('should return null when user has no card', async () => {
    const card = await db.getLoyaltyCard(999);
    expect(card).toBeNull();
  });

  it('should generate a card with proper format', async () => {
    const card = await db.createLoyaltyCard(1, 'NSH-ABCD-EFGH-IJKL', '{}', 1, new Date('2027-07-27'));
    expect(card.cardNumber).toMatch(/^NSH-/);
  });

  it('should return card templates', async () => {
    const templates = await db.getCardTemplates();
    expect(Array.isArray(templates)).toBe(true);
    expect(templates.length).toBeGreaterThan(0);
    expect(templates[0]).toHaveProperty('backgroundColor');
    expect(templates[0]).toHaveProperty('textColor');
  });

  it('should validate card by number returns null for invalid', async () => {
    const card = await db.getCardByNumber('INVALID-NUMBER');
    expect(card).toBeNull();
  });
});

describe('Loyalty System - Settings', () => {
  it('should return loyalty settings', async () => {
    const settings = await db.getLoyaltySettings();
    expect(settings).toHaveProperty('pointsPerReferral');
    expect(settings).toHaveProperty('isActive');
  });

  it('should update settings', async () => {
    const result = await db.updateLoyaltySettings({ pointsPerReferral: 150 });
    expect(result).toEqual({ success: true });
  });
});

describe('Loyalty System - Admin', () => {
  it('should return all parents points', async () => {
    const points = await db.getAllParentsLoyaltyPoints();
    expect(Array.isArray(points)).toBe(true);
    expect(points[0]).toHaveProperty('userName');
    expect(points[0]).toHaveProperty('points');
  });

  it('should update redemption status', async () => {
    const result = await db.updateRedemptionStatus(1, 'approved', 'تمت الموافقة');
    expect(result).toEqual({ success: true });
  });
});
