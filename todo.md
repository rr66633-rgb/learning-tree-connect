# Learning Tree Connect - TODO

## Core Infrastructure
- [x] Database schema (children, attendance, daily reports, messages, invoices, loyalty, notifications)
- [x] tRPC routers for all modules
- [x] Role-based authorization middleware (admin, teacher, parent permissions)

## Authentication
- [x] Manus OAuth integration
- [x] Role-aware access control (admin/teacher/parent procedures)

## Child Management
- [x] Child profiles create/list/delete
- [x] Medical records & allergies
- [x] Emergency contacts
- [x] Class assignment
- [x] Child profile detail/edit screen

## Attendance System
- [x] Daily attendance tracking
- [x] Check-in/Check-out
- [x] Attendance reports by date

## Daily Reports
- [x] Meals, sleep, activities tracking
- [x] Teacher notes
- [x] Photo upload support (S3 integration complete)

## Messaging
- [x] Parent-teacher conversations
- [x] Message list with polling
- [x] Unread message count

## Billing & Finance
- [x] Invoice generation
- [x] Saudi VAT (15%) support
- [x] Payment tracking
- [x] Financial summary

## Loyalty Program
- [x] Rewards catalog
- [x] Live points balance display
- [x] Earn/redeem points UI flow
- [x] Transaction history UI

## Notifications
- [x] In-app notifications
- [x] Unread count
- [x] Mark as read / Mark all read

## Reports & Analytics
- [x] Enrollment statistics
- [x] Revenue dashboard
- [x] Attendance dashboard

## Arabic RTL Support
- [x] RTL layout with IBM Plex Sans Arabic
- [x] Arabic UI labels and navigation
- [x] OAuth portal title (controlled by platform settings - set via VITE_APP_TITLE)

## Design
- [x] Premium modern UI with educational colors
- [x] Dashboard layout with sidebar
- [x] Responsive design
- [x] Soft green/teal color palette

## Testing & Demo Data
- [x] Create demo data: 20 children, 5 teachers, 20 parents
- [x] Create realistic daily reports for demo children
- [x] Create attendance records for demo
- [x] Create invoices and payment records for demo
- [x] Create loyalty points and transactions for demo
- [x] Implement photo upload in daily reports
- [x] Test login flow
- [x] Test dashboard statistics
- [x] Test child management CRUD
- [x] Test attendance check-in/out
- [x] Test daily reports creation
- [x] Test messaging system
- [x] Test loyalty program
- [x] Test finance/invoices
- [x] Take screenshots of all modules

## Branding Update
- [x] Upload Learning Tree logo and use it on login page and dashboard
- [x] Replace all placeholder branding with Learning Tree branding
- [x] Apply Learning Tree brand colors consistently (Navy Blue, Forest Green, Sky Blue)
- [x] Verify all pages work with real data
- [x] Take screenshots of all modules (Login, Dashboard, Children, Attendance, Daily Reports, Messaging, Loyalty, Finance)
- [x] Fix all remaining bugs

## Critical Security Fixes
- [x] Data isolation: parents can only see their own children's data
- [x] Data isolation: parents can only see their own invoices
- [x] Data isolation: parents can only see attendance for their own children
- [x] Data isolation: parents can only see daily reports for their own children
- [x] Data isolation: parents can only see their own loyalty points
- [x] Upload endpoint: require authentication
- [x] Role-based navigation: different sidebar menus for admin, teacher, parent
- [x] Write tests for data isolation (20 tests)
- [x] Write tests for upload authentication

## Sidebar Permission Refinement
- [x] Verify teacher sidebar excludes المالية and برنامج الولاء (shows: لوحة التحكم، الأطفال، الحضور، التقارير اليومية، الرسائل، الإشعارات)
- [x] Verify parent sidebar shows correct items: لوحة التحكم، الأطفال، الحضور، التقارير اليومية، الرسائل، المالية، برنامج الولاء، الإشعارات
- [x] Retake and verify role-based screenshots after sidebar fixes

## User Management (Admin Only)
- [x] Backend: tRPC procedures for listing all users with role filter
- [x] Backend: tRPC procedure for creating new user (teacher/parent)
- [x] Backend: tRPC procedure for updating user info (name, email, phone, role)
- [x] Backend: tRPC procedure for deleting/deactivating user
- [x] Backend: tRPC procedure for linking parent to child
- [x] Frontend: User management page with table showing all users
- [x] Frontend: Add user dialog with role selection (teacher/parent)
- [x] Frontend: Edit user dialog for modifying user details
- [x] Frontend: Filter users by role (all/teacher/parent)
- [x] Frontend: Search users by name or email
- [x] Navigation: Add user management link to admin sidebar only
- [x] Route: Register /users path in App.tsx
- [x] Tests: Admin can list/create/update/delete users
- [x] Tests: Teacher/Parent cannot access user management

## Export Users List
- [x] Frontend: Add export button (Excel/CSV) to users management page
- [x] Frontend: Implement client-side CSV generation from displayed table data
- [x] Frontend: Implement client-side Excel (XLSX) generation using SheetJS
- [x] Frontend: Export respects current filters (role/search)

## Production Deployment Preparation
- [x] Remove all Manus branding from UI (logos, text, footer)
- [x] Remove "Made with Manus" text/badge (none found in UI)
- [x] Replace Manus logo with Learning Tree logo in all locations (already done)
- [x] Clean up demo/seed data and replace with production-ready setup
- [x] Configure custom domain: portal.learningtreeco.com (guide created)
- [x] Generate deployment guide document
- [x] Generate backup guide document
- [x] Final verification before publish (all 150 tests passing)

## PWA Configuration
- [x] Generate icon 512x512 from official logo
- [x] Generate icon 192x192 from official logo
- [x] Generate Apple Touch Icon 180x180
- [x] Generate favicon 32x32 and 16x16
- [x] Create manifest.json with proper PWA config
- [x] Update index.html with all meta tags and icon links
- [x] Upload icons via manus-upload-file --webdev
- [x] Verify PWA works correctly
- [x] Redeploy application
