# Architecture Decision Record: Nasha'a Platform Strategy

**Date:** 2026-06-22
**Status:** Approved
**Decision Makers:** Project Owner

---

## Context

The current application (Learning Tree Connect) serves a single nursery: **Learning Tree Nursery**. A strategic decision has been made to reserve the architecture for a future SaaS platform called **نشأة (Nasha'a)** — a nursery and kindergarten management platform serving multiple organizations.

---

## Decision

### Current Product

| Field | Value |
|-------|-------|
| Name (Arabic) | شجرة التعلم |
| Name (English) | Learning Tree |
| Scope | Single nursery (Learning Tree Nursery) |
| Status | Active — focus on stabilization and completion |

### Future Product

| Field | Value |
|-------|-------|
| Name (Arabic) | نشأة |
| Name (English) | Nasha'a |
| Scope | Multi-tenant SaaS platform for nurseries & kindergartens |
| Status | Reserved — architecture preparation only |

---

## Principles

1. **Do NOT convert** the current Learning Tree application into a multi-tenant platform yet.
2. **Focus on stabilizing** and completing Learning Tree first.
3. **Ensure compatibility** — all future development decisions must remain compatible with Nasha'a platform expansion.
4. **Keep separate** — Learning Tree App remains separate from Nasha'a.
5. **Duplicable architecture** — the current system should be structured so it can later be duplicated and converted into the Nasha'a platform.

---

## Future Nasha'a Platform Capabilities

When the time comes to build Nasha'a, it will support:

- Multiple nurseries (multi-tenant)
- Multiple branches per nursery
- Parents portal
- Teachers portal
- Administrators portal
- AI tools (content generation, assessments, reports)
- Attendance system
- Pickup/drop-off system
- Messaging system
- Reports & analytics
- Payments & invoicing
- Events management
- Curriculum planning

---

## Branding Placeholders

### Arabic
```
نشأة
```

### English
```
Nasha'a
```

### Tagline (suggested)
```
Arabic: منصة إدارة الحضانات ورياض الأطفال
English: Nursery & Kindergarten Management Platform
```

---

## Development Guidelines for Compatibility

To ensure the current codebase remains compatible with future Nasha'a conversion:

### Database Design
- Keep `tenantId` concept in mind but do NOT add it to tables yet
- Use clear foreign key relationships that can later be scoped per tenant
- Avoid hardcoding nursery-specific business logic in shared utilities

### Code Organization
- Keep business logic in service layers (not in route handlers)
- Use configuration files for nursery-specific settings (name, logo, colors)
- Avoid embedding "Learning Tree" strings deep in business logic — use constants/config

### Configuration
- All branding (name, logo, colors) should come from environment variables or config
- Center-specific settings (GPS location, radius, working hours) should be in database
- Feature flags should be database-driven, not hardcoded

### API Design
- Keep API endpoints RESTful and resource-based
- Avoid nursery-specific assumptions in API contracts
- Use role-based access that can later be extended with tenant scoping

### Authentication
- Current: Single-tenant OAuth (Manus OAuth)
- Future: Multi-tenant auth with organization selection
- Keep auth logic isolated in auth module for easy replacement

---

## Migration Path (Future Reference)

When ready to build Nasha'a:

1. Fork/duplicate the Learning Tree codebase
2. Add `organizations` table and `tenantId` to all data tables
3. Add organization selection after login
4. Replace single-tenant config with per-organization settings
5. Add subscription/billing layer
6. Add organization onboarding flow
7. Rebrand UI to Nasha'a
8. Deploy as separate application

---

## What NOT to Do Now

- Do NOT add multi-tenancy code
- Do NOT change the current branding
- Do NOT add organization management
- Do NOT add subscription billing
- Do NOT refactor for SaaS patterns prematurely
- Do NOT split the codebase into microservices

---

## Review Schedule

This decision should be reviewed when:
- Learning Tree application is fully stable and feature-complete
- Business decision is made to start Nasha'a development
- Significant architectural changes are proposed that might affect compatibility
