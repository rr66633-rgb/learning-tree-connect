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

## Platform Redesign - Two Separate Apps

### Database Schema Updates
- [x] Add classes table (id, name, ageGroup, capacity, teacherId)
- [x] Add staff_attendance table (id, userId, checkIn, checkOut, gpsLat, gpsLng, device, status)
- [x] Add center_settings table (lat, lng, radius, name)
- [x] Add daily_activities table (id, childId, type, details, timestamp, recordedBy)
- [x] Add calendar_events table (id, title, description, date, type, classId)
- [x] Add announcements table (id, title, content, audience, createdAt)
- [x] Add documents table (id, name, type, url, childId, requiresSignature)
- [x] Add signatures table (id, documentId, parentId, signedAt)
- [x] Add medical_info table (id, childId, conditions, medications, allergies)
- [x] Add emergency_contacts table (id, childId, name, phone, relationship)
- [x] Add enrollment table (id, childId, status, startDate, endDate, classId)
- [x] Add waiting_list table (id, childName, parentName, phone, status, createdAt)
- [x] Update users table with expanded roles (super_admin, principal, teacher, assistant, accountant, receptionist)

### Staff App Features
- [x] Role-based dashboard for each staff role
- [x] Child management with class assignment
- [x] Class management (create, edit, assign teachers)
- [x] Staff management with role assignment
- [x] Parent management
- [x] Enrollment management with waiting list
- [x] GPS staff attendance (check-in/out with geolocation) - full UI implemented
- [x] Daily childcare log (individual + bulk mode)
- [x] Invoice management with automatic billing
- [x] Financial reports
- [x] Attendance reports
- [ ] EYFS assessment tracking
- [x] Document management
- [x] Internal messaging
- [x] Notification center
- [x] Analytics dashboard
- [x] School calendar management
- [x] Announcements

### Parent App Features
- [x] Separate parent interface (mobile-first)
- [x] Child profile view
- [x] Daily timeline with all activities
- [x] Daily reports view
- [x] Attendance history with check-in/out times
- [ ] Photos & videos gallery
- [x] Meal/Snack/Nap/Diaper/Toilet/Water reports
- [x] Medication reports
- [ ] Learning observations
- [ ] EYFS assessments view
- [x] Monthly reports
- [x] School calendar view
- [x] Events & trips
- [x] Announcements
- [x] Messaging with teachers & admin
- [ ] Push notifications
- [x] Invoice viewing
- [ ] Download receipts
- [x] Digital signature for forms
- [x] Emergency contacts management
- [x] Medical information

### GPS Staff Attendance
- [x] Geolocation check-in/out within configurable radius - frontend UI complete
- [x] Admin configurable center location and radius - settings UI complete
- [x] Record GPS coordinates and device info
- [x] Warning message if outside allowed area - toast implemented
- [x] Attendance reports and history

### Security & Routing
- [x] Separate routing: /parent/* and /staff/*
- [x] Role-based access control for all new roles
- [x] Teachers access only assigned classes
- [x] Parents access only their own children
- [ ] Audit logs for sensitive operations - middleware needed

### Mobile & PWA
- [x] Mobile-first responsive design
- [x] Optimized for iPhone and iPad
- [x] Fast performance

## Bug Fixes
- [x] Fix children attendance page - children names not displaying in the table
- [x] Implement automatic daily database backup system
- [x] Fix Children Management page (/staff/children) showing "No children registered" despite data existing
- [x] Create daily backup Heartbeat cron job after deployment (task_uid: JtL44VYLLGeyeP4qpvVVjX, runs daily at 3:00 AM UTC)

## Daily Care Record Fixes
- [x] Fix empty child dropdown in Daily Care Record page (uses firstName + lastName)
- [x] Add search functionality inside the child dropdown
- [x] Add all 14 daily care activity types (Arrival, Breakfast, Morning Snack, Lunch, Afternoon Snack, Nap Start, Nap End, Diaper Change, Toilet Visit, Medication, Mood, Learning Activity, Outdoor Play, Departure)
- [x] Add Child Check-out/Departure module (departure time, picked up by, relationship, notes, status)
- [x] Add departure database schema and API
- [x] Display departure information in parent portal
- [x] Run full testing on Daily Care module (150 tests passing)

## Critical Fix: Child Dropdowns & Check-In/Check-Out System
- [x] Fix empty child dropdown in Daily Care and Daily Reports pages
- [x] Ensure children.list returns children for teacher's assigned class
- [x] Display child names correctly in all dropdown menus
- [x] Build complete Child Check-In system (arrival time, dropped off by, notes)
- [x] Build complete Child Check-Out system (departure time, picked up by, relationship, digital signature, notes)
- [x] Parents receive instant notification on child arrival/departure
- [x] Display today's arrival/departure times on parent app
- [x] Show real-time list of children currently in the center
- [x] Teachers and admins can view all check-in/check-out records
- [x] Generate attendance reports with arrival and departure times
- [x] End-to-end testing of the entire feature (150 tests passing)

## Attendance System Redesign
- [x] Make attendance status always editable by teachers and administrators
- [x] Allow status changes: Present, Absent, Late, Checked In, Checked Out
- [x] Allow changing absent back to present immediately
- [x] Add confirmation dialog before status changes
- [x] Add attendance audit log (previous status, new status, user, timestamp)
- [x] Display attendance history for each child
- [x] Ensure immediate database updates on status change
- [x] Update all pages, reports, and parent notifications to reflect changes
- [x] End-to-end testing of status change workflow (158 tests passing)

## Finance Table UI Fixes
- [x] Fix child names not displayed in invoices table (join with children table)
- [x] Fix invoice amounts not displayed correctly (use total field instead of amount)
- [x] Make invoices table fully responsive on mobile (horizontal scroll + responsive cards)
- [x] Ensure all columns visible on mobile with clear status badges

## Finance Module Major Improvements
- [x] Make invoice cards clickable to open detail page
- [x] Add invoice status management (Pending/Paid toggle with payment method)
- [x] Add payment method field (Cash, Bank Transfer, Card) to schema
- [x] Create full invoice details page with all info
- [x] Add action buttons: Mark Paid/Pending, Edit, Delete, Download PDF, Print, Send to Parent
- [x] Print invoice via browser print (professional layout with Learning Tree branding)
- [x] Generate professional PDF invoices with jsPDF (Learning Tree branding, table, VAT)
- [x] Fix mobile responsiveness for invoice cards and buttons
- [x] Add search and filtering (by child, status, date)
- [x] Fix routing for multi-segment paths (/staff/invoice/:id)

## Phase 9: Responsive Design & Document Management
- [x] Fix responsive design: sidebar fixed, content area scrolls independently
- [x] Fix responsive design: dialog/modal components have max-height with internal scrolling
- [x] Fix responsive design: SidebarInset has overflow-y-auto for proper scrolling
- [x] Child document management: database schema (child_documents table with status, type, notes)
- [x] Child document management: API endpoints (upload, list, approve, reject, delete via tRPC childDocuments router)
- [x] Child document management: Staff UI in ChildProfile documents tab (view/approve/reject/download)
- [x] Child document management: Parent UI to upload/manage documents in parent Children page
- [x] Profile photo upload: admin can upload/replace child photo via ChildProfile header
- [x] Profile photo upload: parent can upload/replace child photo via parent Children page
- [x] Profile photo: display in children list table (staff), attendance page, child profile header
- [x] Parent portal: parents can edit their child's information (parentUpdate procedure with ownership check)
- [x] Parent portal: parents can upload documents for their children
- [x] Added /api/upload-document endpoint for FormData file uploads (PDF, images, docs)
- [x] Added /api/upload-photo endpoint for FormData photo uploads

## Critical: Role-Based Access System Fix
- [x] Fix role-based routing: parent users must see Parent Portal
- [x] Fix DashboardLayout sidebar to show correct navigation per role
- [x] Add role-based redirect after OAuth login (parent→/parent, staff→/staff, admin→/staff)
- [x] Handle "user" role (default) - redirect to appropriate portal or show role selection
- [x] Ensure route protection: /parent/* only for parents, /staff/* only for staff/admin
- [x] Parent Portal sidebar: My Children, Attendance, Daily Reports, Photos & Activities, Messages, Notifications, Invoices & Payments, Documents, Profile Settings
- [x] Staff Portal sidebar: Dashboard, Children, Classes, Attendance, Reports, Activities, Messages
- [x] Admin Portal sidebar: Full system access including all staff items + User management + Settings
- [x] Verify all 158 tests still pass after changes

## Parent Registration & Approval Workflow Fix
- [x] Fix OAuth: auto-assign 'parent' role to new registrations (instead of 'user')
- [x] Add parentRegisterChild procedure so parents can add children themselves
- [x] Add "Register New Child" button and form in parent Children page
- [x] Add admin approval dashboard for pending parents (approve/reject)
- [x] Add users.approve and users.reject procedures for admin
- [x] Ensure parents can immediately access Parent Portal after role assignment
- [x] Test complete workflow: register → approve → add child → access portal
- [x] Add isActive=false for new parent registrations (pending admin approval)
- [x] Add getPendingParents, approveParent, rejectParent functions to db.ts
- [x] Update parentProcedure to check isActive (block unapproved parents)
- [x] Update PendingRolePage with better messaging and refresh button
- [x] Convert existing 'user' role users to 'parent' + isActive=false
- [x] All 158 tests pass
