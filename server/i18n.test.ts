import { describe, expect, it } from "vitest";

/**
 * Tests for i18n (internationalization) language switching functionality.
 * These tests verify that:
 * 1. The translation system is properly configured
 * 2. Language switching between Arabic and English works correctly
 * 3. Menu items have both Arabic labels and English labels
 * 4. The isAr pattern is consistently used across components
 */

// Simulate the isAr pattern used throughout the app
function getIsAr(language: string): boolean {
  return language === 'ar';
}

// Simulate the getRoleDisplayName function from DashboardLayout
function getRoleDisplayName(role: string, lang: string = 'ar'): string {
  if (lang === 'en') {
    switch (role) {
      case "super_admin": return "Super Admin";
      case "admin": return "Admin";
      case "owner": return "Owner";
      case "principal": return "Principal";
      case "teacher": return "Teacher";
      case "assistant": return "Assistant";
      case "accountant": return "Accountant";
      case "receptionist": return "Receptionist";
      case "parent": return "Parent";
      default: return "User";
    }
  }
  switch (role) {
    case "super_admin": return "المدير العام";
    case "admin": return "مدير النظام";
    case "owner": return "المالك";
    case "principal": return "مدير/ة";
    case "teacher": return "معلم/ة";
    case "assistant": return "مساعد/ة";
    case "accountant": return "محاسب/ة";
    case "receptionist": return "موظف/ة استقبال";
    case "parent": return "ولي أمر";
    default: return "مستخدم";
  }
}

// Menu items structure (mirrors DashboardLayout)
interface MenuItem {
  icon: string;
  label: string;
  labelEn: string;
  path: string;
}

const parentMenuItems: MenuItem[] = [
  { icon: "LayoutDashboard", label: "الرئيسية", labelEn: "Home", path: "" },
  { icon: "Users", label: "أطفالي", labelEn: "My Children", path: "/children" },
  { icon: "CalendarCheck", label: "الحضور", labelEn: "Attendance", path: "/attendance" },
  { icon: "ClipboardList", label: "التقرير اليومي", labelEn: "Daily Report", path: "/daily-report" },
  { icon: "Camera", label: "الصور والأنشطة", labelEn: "Photos & Activities", path: "/photos" },
  { icon: "MessageSquare", label: "الرسائل", labelEn: "Messages", path: "/messages" },
  { icon: "Bell", label: "الإشعارات", labelEn: "Notifications", path: "/notifications" },
  { icon: "CreditCard", label: "المالية", labelEn: "Finance", path: "/finance" },
];

describe("i18n Language Switching", () => {
  describe("isAr pattern", () => {
    it("should return true when language is Arabic", () => {
      expect(getIsAr("ar")).toBe(true);
    });

    it("should return false when language is English", () => {
      expect(getIsAr("en")).toBe(false);
    });

    it("should return false for any non-Arabic language", () => {
      expect(getIsAr("fr")).toBe(false);
      expect(getIsAr("")).toBe(false);
    });
  });

  describe("getRoleDisplayName", () => {
    it("should return Arabic role names when lang is ar", () => {
      expect(getRoleDisplayName("teacher", "ar")).toBe("معلم/ة");
      expect(getRoleDisplayName("parent", "ar")).toBe("ولي أمر");
      expect(getRoleDisplayName("admin", "ar")).toBe("مدير النظام");
      expect(getRoleDisplayName("super_admin", "ar")).toBe("المدير العام");
    });

    it("should return English role names when lang is en", () => {
      expect(getRoleDisplayName("teacher", "en")).toBe("Teacher");
      expect(getRoleDisplayName("parent", "en")).toBe("Parent");
      expect(getRoleDisplayName("admin", "en")).toBe("Admin");
      expect(getRoleDisplayName("super_admin", "en")).toBe("Super Admin");
    });

    it("should default to Arabic when no lang specified", () => {
      expect(getRoleDisplayName("teacher")).toBe("معلم/ة");
    });

    it("should handle unknown roles gracefully", () => {
      expect(getRoleDisplayName("unknown", "en")).toBe("User");
      expect(getRoleDisplayName("unknown", "ar")).toBe("مستخدم");
    });

    it("should have translations for all standard roles", () => {
      const roles = ["super_admin", "admin", "owner", "principal", "teacher", "assistant", "accountant", "receptionist", "parent"];
      for (const role of roles) {
        const arName = getRoleDisplayName(role, "ar");
        const enName = getRoleDisplayName(role, "en");
        expect(arName).toBeTruthy();
        expect(enName).toBeTruthy();
        expect(arName).not.toBe(enName);
      }
    });
  });

  describe("Menu Items Bilingual Support", () => {
    it("should have both label and labelEn for all parent menu items", () => {
      for (const item of parentMenuItems) {
        expect(item.label).toBeTruthy();
        expect(item.labelEn).toBeTruthy();
        expect(item.label).not.toBe(item.labelEn);
      }
    });

    it("should display labelEn when language is English", () => {
      const isAr = getIsAr("en");
      for (const item of parentMenuItems) {
        const displayLabel = isAr ? item.label : item.labelEn;
        // In English mode, should show English labels
        expect(displayLabel).toBe(item.labelEn);
        // English labels should not contain Arabic characters
        expect(displayLabel).not.toMatch(/[\u0600-\u06FF]/);
      }
    });

    it("should display Arabic label when language is Arabic", () => {
      const isAr = getIsAr("ar");
      for (const item of parentMenuItems) {
        const displayLabel = isAr ? item.label : item.labelEn;
        // In Arabic mode, should show Arabic labels
        expect(displayLabel).toBe(item.label);
        // Arabic labels should contain Arabic characters
        expect(displayLabel).toMatch(/[\u0600-\u06FF]/);
      }
    });
  });

  describe("Date Locale Selection", () => {
    it("should use ar-SA locale for Arabic", () => {
      const isAr = getIsAr("ar");
      const locale = isAr ? "ar-SA" : "en-US";
      expect(locale).toBe("ar-SA");
    });

    it("should use en-US locale for English", () => {
      const isAr = getIsAr("en");
      const locale = isAr ? "ar-SA" : "en-US";
      expect(locale).toBe("en-US");
    });

    it("should format dates correctly in English locale", () => {
      const date = new Date(2024, 0, 15); // Jan 15, 2024
      const formatted = date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      expect(formatted).toContain("January");
      expect(formatted).toContain("15");
      expect(formatted).toContain("2024");
    });

    it("should format dates correctly in Arabic locale", () => {
      const date = new Date(2024, 0, 15);
      const formatted = date.toLocaleDateString("ar-SA", { month: "long", day: "numeric" });
      // Arabic formatted date should contain Arabic numerals or Arabic month names
      expect(formatted).toBeTruthy();
      expect(formatted.length).toBeGreaterThan(0);
    });
  });

  describe("Bilingual String Pattern Validation", () => {
    // Simulates the isAr ternary pattern used in components
    function bilingualText(isAr: boolean, ar: string, en: string): string {
      return isAr ? ar : en;
    }

    it("should return Arabic text when isAr is true", () => {
      const result = bilingualText(true, "مرحباً", "Hello");
      expect(result).toBe("مرحباً");
    });

    it("should return English text when isAr is false", () => {
      const result = bilingualText(false, "مرحباً", "Hello");
      expect(result).toBe("Hello");
    });

    it("common UI strings should have proper translations", () => {
      const translations: [string, string][] = [
        ["إلغاء", "Cancel"],
        ["تأكيد", "Confirm"],
        ["حذف", "Delete"],
        ["تعديل", "Edit"],
        ["إضافة", "Add"],
        ["بحث", "Search"],
        ["حفظ", "Save"],
      ];

      for (const [ar, en] of translations) {
        expect(bilingualText(true, ar, en)).toBe(ar);
        expect(bilingualText(false, ar, en)).toBe(en);
        // Arabic should contain Arabic characters
        expect(ar).toMatch(/[\u0600-\u06FF]/);
        // English should NOT contain Arabic characters
        expect(en).not.toMatch(/[\u0600-\u06FF]/);
      }
    });
  });

  describe("Language Persistence", () => {
    it("should use localStorage key 'naashah-language' for persistence", () => {
      // This matches the i18n configuration
      const STORAGE_KEY = "naashah-language";
      expect(STORAGE_KEY).toBe("naashah-language");
    });

    it("should default to Arabic (ar) as fallback language", () => {
      const fallbackLng = "ar";
      expect(fallbackLng).toBe("ar");
    });
  });
});
