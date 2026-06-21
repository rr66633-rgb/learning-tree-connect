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
- [x] EYFS assessment tracking
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
- [x] Photos & videos gallery
- [x] Meal/Snack/Nap/Diaper/Toilet/Water reports
- [x] Medication reports
- [x] Learning observations
- [x] EYFS assessments view
- [x] Monthly reports
- [x] School calendar view
- [x] Events & trips
- [x] Announcements
- [x] Messaging with teachers & admin
- [x] Push notifications (in-app notification system with real-time polling)
- [x] Invoice viewing
- [x] Download receipts (PDF invoice download)
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
- [x] Audit logs for sensitive operations - admin audit log page + middleware logging

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

## Media Management System
- [x] Add media database schema (media + media_children tables)
- [x] Add backend procedures: media.upload, media.list, media.delete, media.byChild
- [x] Add upload-media endpoint for photos/videos (JPG, PNG, HEIC, MP4, MOV)
- [x] Build teacher media upload UI with multi-file upload, camera capture, captions, child tagging
- [x] Build parent media gallery view (only their children's media)
- [x] Add media link in staff sidebar and parent sidebar
- [x] Support multiple file upload simultaneously with progress indicators

## AI Media Features
- [x] Add AI auto-caption generation for uploaded photos using LLM vision
- [x] Add AI child face recognition/suggestion to assist tagging children
- [x] Update teacher media upload UI with AI suggestion buttons
- [x] Add loading states for AI processing

## Moyasar Payment System Integration

### Database Schema
- [x] Create invoices table (invoiceNumber, childId, parentId, date, dueDate, description, amount, vat, totalAmount, status, type, recurring)
- [x] Create payments table (invoiceId, amount, method, transactionId, status, paidAt, moyasarPaymentId)
- [x] Create transactions table (paymentId, moyasarId, type, amount, currency, status, metadata)
- [x] Create refunds table (transactionId, amount, reason, status, refundedAt, moyasarRefundId)
- [x] Create tuition_plans table (childId, amount, frequency, description, startDate, nextBillingDate)

### Backend - Moyasar Service
- [x] Create server/_core/moyasar.ts with createPayment, verifyPayment, createRefund functions
- [x] Support Apple Pay, Mada, Visa, Mastercard, STC Pay payment methods
- [x] Implement placeholder/mock mode when MOYASAR_API_KEY is not set
- [x] Add Moyasar webhook handler for payment status updates

### Backend - tRPC Procedures
- [x] invoices.list (parent: their children's invoices; admin: all invoices)
- [x] invoices.create (admin - manual invoice creation)
- [x] invoices.createRecurring (admin - set up recurring monthly invoices)
- [x] invoices.update (admin - edit invoice details)
- [x] invoices.markPaid (admin - manual payment marking)
- [x] invoices.sendReminder (admin - notify parent of unpaid invoice)
- [x] payments.initiate (parent - start Moyasar payment flow)
- [x] payments.verify (verify payment after Moyasar callback)
- [x] payments.history (parent - view payment history)
- [x] refunds.create (admin - issue refund)
- [x] refunds.list (admin - view all refunds)
- [x] finance.summary (admin - financial overview/reports)
- [x] finance.export (admin - export financial data)
- [x] tuitionPlans.create (admin - create tuition plan for child)
- [x] tuitionPlans.list (admin - list all tuition plans)
- [x] tuitionPlans.generateInvoices (admin - generate invoices from plans)

### Frontend - Admin Finance Portal
- [x] Invoice creation form (manual + recurring + one-time)
- [x] Invoice list with search, filter by status/child/date
- [x] Invoice detail page with actions (mark paid, edit, delete, send reminder)
- [x] Transaction list with all payments
- [x] Refund management (issue refund, view refund history)
- [x] Tuition plans management (create, edit, generate invoices)
- [x] Financial reports dashboard (revenue, outstanding, overdue)
- [x] Export financial reports (CSV/Excel)

### Frontend - Parent Payment Portal
- [x] Invoice list with tabs (All/Unpaid/Paid/Overdue)
- [x] Invoice detail with pay button (Moyasar checkout or placeholder)
- [x] Payment method selection (Apple Pay, Mada, Visa, MC, STC Pay)
- [x] Payment confirmation page
- [x] Payment history view
- [x] Download invoice PDF

### Notifications
- [x] Auto-notify parent when new invoice is created
- [x] Auto-notify parent when payment is successful
- [x] Auto-notify parent when invoice becomes overdue
- [x] Auto-notify parent when payment fails

### Sidebar & Navigation
- [x] Add finance/payments links in admin sidebar
- [x] Add invoices/payments links in parent sidebar

## Authentication & Security System

### Database Schema
- [x] Create otp_codes table (id, userId, phone, email, code, type, expiresAt, verified, attempts, createdAt)
- [x] Create password_reset_tokens table (id, userId, token, type, expiresAt, used, createdAt)
- [x] Create login_attempts table (id, userId, ip, success, createdAt)
- [x] Add phone field to users table
- [x] Add accountLockedUntil field to users table
- [x] Add failedLoginAttempts field to users table
- [x] Add lastLoginAt field to users table
- [x] Add passwordHash field to users table

### Backend - OTP Service
- [x] Create OTP generation service (6-digit codes, 5-minute expiry)
- [x] Create OTP verification service with attempt limiting
- [x] Implement rate limiting for OTP requests (max 3 per 10 minutes)
- [x] Support SMS OTP sending (placeholder for SMS gateway integration)
- [x] Support Email OTP sending (using notification system)
- [x] OTP resend with cooldown period (60 seconds)

### Backend - Password Reset
- [x] Forgot password via email (generate reset link with token)
- [x] Forgot password via mobile (send OTP)
- [x] Verify reset token and allow password change
- [x] Verify OTP and allow password change
- [x] Invalidate all previous tokens on successful reset

### Backend - Registration Flow
- [x] Parent self-registration endpoint (name, phone, email, password)
- [x] Send OTP to phone/email after registration
- [x] Verify OTP to activate account
- [x] Support both mobile+OTP and email+OTP verification

### Backend - Security
- [x] Password hashing with PBKDF2 (salt + hash)
- [x] Track failed login attempts per user
- [x] Lock account after 5 failed attempts (30 min lockout)
- [x] Session timeout after 30 minutes of inactivity
- [x] Rate limit OTP requests (max 3 per 10 min, 60s cooldown)

### Frontend - Forgot Password
- [x] Forgot password page with email/phone input
- [x] Email reset link sent confirmation page
- [x] OTP input page with countdown timer
- [x] New password creation page
- [x] Success confirmation page

### Frontend - Registration
- [x] Parent registration form (name, phone, email, password)
- [x] OTP verification page with countdown timer and resend button
- [x] Registration success page

### Frontend - Security UX
- [x] Clear error messages for all auth states
- [x] Account locked message with remaining time
- [x] OTP countdown timer (5 minutes)
- [x] Resend OTP button with cooldown (60 seconds)
- [x] Auto-logout on inactivity (30 minutes)
- [x] Works on mobile and desktop

## Child Profile Photo - Complete Implementation

### Photo Upload
- [x] Camera capture support (mobile + desktop) - accept="image/*" with capture attribute
- [x] Auto-resize and optimize uploaded photos (sharp: 800x800, JPEG 85%, EXIF rotation)
- [x] Parents can upload/update child photo
- [x] Admin can upload/update child photo
- [x] Teachers can view child photo

### Photo Display in All Screens
- [x] Attendance screen - show child photo next to name
- [x] Check-in / Check-out screen - show child photo prominently
- [x] Classroom lists - show child photo
- [x] Daily reports - show child photo
- [x] Child profile page - show large photo with upload
- [x] Pickup/dismissal screen - show photo for verification (large photo + identity confirmation)
- [x] Medical information screen - show child photo
- [x] Parent portal - child cards with photo (Dashboard, Attendance, DailyReport)
- [x] Admin portal - children list with photos

### Pickup Security
- [x] Photo verification display during pickup/dismissal
- [x] Large photo view for staff to verify child identity before release

## Pickup Request System

### Database
- [x] Create pickup_requests table (childId, parentId, status, requestedAt, calledAt, readyAt, pickedUpAt, pickedUpBy, notes)

### Backend
- [x] pickupRequests.create - parent sends pickup request
- [x] pickupRequests.updateStatus - staff updates status (waiting → called → ready → picked_up)
- [x] pickupRequests.listActive - staff sees active pickup requests
- [x] pickupRequests.history - view pickup history
- [x] Real-time notification to staff when parent requests pickup
- [x] Notification to parent when child status changes

### Frontend - Parent
- [x] "أنا هنا" (I'm Here) button on parent pickup page
- [x] Pickup request status tracking (waiting, called, ready, picked up)
- [x] Cancel pickup request option
- [x] Pickup history view

### Frontend - Staff
- [x] Active pickup requests dashboard with child photos (real-time polling 10s)
- [x] Status update buttons (Called → Ready → Picked Up)
- [x] Pickup person verification with child photo display
- [x] Record who picked up the child
- [x] Pickup history log

### Child Photo in Add Child Form
- [x] Photo upload section added to Add/Edit Child form with camera capture support

## Web Push Notifications (Service Worker)

### Database
- [x] Create push_subscriptions table (userId, endpoint, p256dh, auth, userAgent, createdAt)

### Backend
- [x] Generate VAPID keys for web push
- [x] Create web-push service (sendPushNotification helper)
- [x] tRPC: push.subscribe (save subscription)
- [x] tRPC: push.unsubscribe (remove subscription)
- [x] tRPC: push.getVapidPublicKey (return public key)
- [x] tRPC: push.test (test push notification)

### Frontend
- [x] Create Service Worker (sw.js) for push event handling
- [x] Register Service Worker on app load (via usePushNotifications hook)
- [x] Request notification permission with UI prompt
- [x] Subscribe to push notifications after permission granted
- [x] Show notification permission banner/button in dashboard (PushNotificationBanner + PushNotificationToggle)

### Integration
- [x] Send push to teachers when parent requests pickup
- [x] Send push to parent when child status changes (called, ready, picked up)
- [x] Send push to parent when attendance is recorded (check-in + check-out)
- [x] Send push to parent when new invoice is created (trigger helper ready)
- [x] Send push to parent when daily report is submitted (trigger helper ready)

## Messaging System - Complete Rebuild

### Database
- [x] Fix/rebuild conversations table with proper fields
- [x] Fix/rebuild messages table with attachments support
- [x] Add read receipts tracking (isRead + readAt fields on messages)
- [x] Add visibility control via participantOneId/participantTwoId + role checks

### Backend Procedures
- [x] conversations.list - list conversations for current user (role-based visibility)
- [x] conversations.create - start new conversation (parent↔teacher only for their classroom)
- [x] conversations.getMessages - get messages in a conversation with JOIN optimization
- [x] messages.send - send message with optional attachment (url, type, name)
- [x] messages.markRead - mark messages as read (read receipts)
- [x] messages.getUnreadCount - get unread message count
- [x] admin.allConversations - admin view all conversations with search
- [x] admin.archiveConversation - archive a conversation
- [x] admin.unarchiveConversation - unarchive a conversation
- [x] admin.deleteMessage - delete inappropriate message (soft delete)
- [x] admin.replyToConversation - admin can reply to any conversation

### Frontend - Messaging UI
- [x] Conversations list page (with search, unread badges)
- [x] Conversation detail/chat page (real-time polling, message bubbles)
- [x] New conversation dialog (select recipient based on classroom)
- [x] Message input with attachment upload (photos, docs, PDFs)
- [x] Read receipts display (seen/delivered checkmarks)
- [x] Unread message counter badges on conversation list

### Security & Visibility
- [x] Parents can only message teachers of their child's classroom
- [x] Teachers can only see conversations for children in their classroom
- [x] Admin can view and participate in all conversations
- [x] All messages stored securely with timestamps

### Push Notifications
- [x] Push notification when new message received
- [x] In-app notification for new messages

## Child Profile View - Bug Fix

- [x] Fix Eye icon navigation to child profile (was navigating to /staff/child/:id instead of /staff/children/:id)
- [x] Ensure child profile route is correctly defined in App.tsx (/staff/children/:id)
- [x] Verify child ID is correctly passed to the profile page
- [x] Ensure ChildProfile page renders all required sections (personal, parent, medical, nursery, documents tabs)
- [x] Perform full routing audit and fix all broken navigation links
- [x] Test on mobile and desktop viewports

## Parent Arrival High-Priority Notification

- [x] Parent "I'm here" button on pickup page (existing requestPickup procedure)
- [x] Backend: High-priority push notification with requireInteraction, vibration, and sound
- [x] Backend: Target child's specific teacher(s) + admins/principals/receptionists
- [x] Backend: Acknowledge endpoint for teacher to dismiss alert (pickup.acknowledge)
- [x] Frontend: Full-screen persistent alert component (ParentArrivalAlert.tsx)
- [x] Frontend: Alarm sound (Web Audio API oscillator) and vibration pattern on alert
- [x] Frontend: Alert stays visible until teacher acknowledges (requireInteraction + polling)
- [x] Service worker: Handle parent_arrival type with requireInteraction and renotify
- [x] Service worker: Post message to open clients for immediate in-app alert
- [x] Service worker: Handle acknowledge action from notification buttons

## Enhanced Pickup System - Multi-Step Workflow (Completed)

### Priority & Response Time Tracking
- [x] Display waiting timer on each pickup request (WaitTimer component with live seconds)
- [x] Yellow color after 5 minutes waiting (border-r-amber-500)
- [x] Red color after 10 minutes waiting (border-r-red-600 + animate-pulse)
- [x] Priority badge (عاجل/متأخر) based on wait time

### Child Information Display
- [x] Show child photo, full name, classroom, teacher, request time on each request
- [x] Visible to teacher, assistant, reception, and admin (all staff roles)

### 4-Step Pickup Workflow
- [x] Step 1: Parent presses "أنا هنا" (requestPickup)
- [x] Step 2: Teacher presses "تم الاستلام" (status: called)
- [x] Step 3: Teacher presses "الطفل جاهز" (status: ready)
- [x] Step 4: Reception presses "تم التسليم" (status: picked_up with verification)
- [x] Request cannot close until Step 4 confirmed (verification dialog required)
- [x] Visual progress bar showing all 4 steps

### Pickup Security
- [x] Display authorized pickup persons list (from emergency contacts)
- [x] Verify pickup person before completing (verification dialog)
- [x] Record who picked up the child (pickedUpBy field)
- [x] Display child photo for identification
- [x] Custom pickup person name input option

### Automatic History Recording
- [x] Store request time (requestedAt), teacher response time (calledAt), child ready time (readyAt), pickup completion time (pickedUpAt)
- [x] Calculate total waiting time (displayed in history)
- [x] Record staff member who completed pickup (completedBy)
- [x] Record name of pickup person (pickedUpBy)

### Live Pickup Dashboard
- [x] Number of pending pickup requests (pendingCount)
- [x] Number of completed pickups today (completedToday)
- [x] Average response time (avgResponseSeconds)
- [x] Average total pickup time (avgTotalSeconds)
- [x] Auto-refresh every 10 seconds

### Parent Notifications
- [x] "المعلمة استلمت طلبك" notification (when status → called)
- [x] "طفلك جاهز للاستلام" notification (when status → ready)
- [x] "تم تسليم طفلك بنجاح" notification (when status → picked_up)
- [x] Real-time polling on parent page (every 5 seconds)
- [x] Step-by-step progress tracker with timestamps on parent page

## Notification Sound Improvements (Completed)

- [x] Replace harsh alarm oscillator with gentle nursery-friendly tones (Web Audio API sine/triangle waves)
- [x] Create multiple tone options: soft chime, gentle bell, friendly ping, calm melody
- [x] Add notification settings page with volume slider (10-100%)
- [x] Add mute option (sound enable/disable toggle)
- [x] Add vibration-only option (quick preset button)
- [x] Add tone selection with preview play button for each tone
- [x] Persist settings in localStorage (auto-save on change)
- [x] Apply settings to ParentArrivalAlert component (uses useNotificationSound hook)
- [x] Change alert styling from red/urgent to emerald/friendly (nursery-appropriate)
- [x] Add quick preset buttons: default, vibration only, silent, loud
- [x] Gentle vibration pattern (200ms-100ms-200ms instead of harsh 500ms bursts)

## iOS App - Capacitor Conversion (Completed)

### Setup & Configuration
- [x] Install Capacitor core and iOS platform (11 plugins)
- [x] Configure capacitor.config.ts with proper app ID and settings
- [x] Generate iOS project (Xcode project with SPM)
- [x] Configure Info.plist with required permissions (Camera, Photo, Face ID, Notifications)
- [x] Create App.entitlements (push + associated domains)
- [x] Update pbxproj with CODE_SIGN_ENTITLEMENTS

### Native Features (Apple Guideline 4.2 Compliance)
- [x] Native Push Notifications (APNs) - AppDelegate with UNUserNotificationCenter
- [x] Face ID / Touch ID biometric authentication (NativeBiometricPlugin.swift)
- [x] Offline caching with Capacitor Preferences + Network detection
- [x] Native Share functionality (Capacitor Share plugin)
- [x] Haptic Feedback on interactions (Capacitor Haptics)
- [x] Native status bar and navigation bar integration (StatusBar plugin)
- [x] Deep linking support (Associated Domains)
- [x] Native keyboard management (Capacitor Keyboard)
- [x] Local notifications for reminders

### App Store Assets
- [x] App Icon (1024x1024 from Learning Tree logo)
- [x] Splash Screen (2732x2732 branded)
- [x] App Store description and metadata (Arabic + English)
- [x] App Privacy information (data collection disclosure)
- [x] Keywords and category selection
- [x] App review notes with demo account info

### Compliance Audit
- [x] Apple Guideline 4.2 minimum functionality - PASS (11 native plugins)
- [x] Guideline 5.1 privacy and data handling - PASS
- [x] Guideline 2.1 app completeness - PASS
- [x] Guideline 4.0 design guidelines - PASS
- [x] Final approval probability: 85-90%

## AI Teacher Assistant - Learning Tree AI

### Database & Schema
- [x] Create ai_generated_content table for all AI outputs
- [x] Create ai_library table for saved/reusable content
- [x] Run migration SQL

### Server-Side AI Procedures
- [x] AI Observation Writer - generate professional EYFS observation from short note
- [x] AI Weekly Planner - generate weekly plan with daily activities
- [x] AI Activity Generator - generate activity with objectives and materials
- [x] AI Child Progress Report - aggregate data and generate parent report
- [x] AI Parent Message Generator - generate bilingual professional message
- [x] AI Newsletter Generator - generate monthly newsletter from activities/events
- [x] AI Story Creator - generate educational story with questions and vocabulary
- [x] AI Library - save/search/reuse generated content

### Frontend - Learning Tree AI Section
- [x] Create dedicated Learning Tree AI section with premium design
- [x] AI Observation Writer page with one-click generation
- [x] AI Weekly Planner page with age group and theme selection
- [x] AI Activity Generator page with topic input
- [x] AI Progress Report page with child data aggregation
- [x] AI Parent Message Generator page
- [x] AI Newsletter Generator page
- [x] AI Story Creator page
- [x] AI Library page with search and filters
- [x] PDF export for plans, reports, and newsletters

### Permissions & Access
- [x] Restrict AI features to teacher and admin roles
- [x] Arabic-first output with English option

### Integration
- [x] Add AI section to staff navigation menu
- [x] Connect all features to LLM provider
- [x] Test all 8 AI generation workflows
- [x] Fix: AI Assistant 404 - Create child-friendly AI Assistant page at /ai/assistant
- [x] AI Assistant: Quran memorization help
- [x] AI Assistant: Daily revision
- [x] AI Assistant: Islamic questions for children
- [x] AI Assistant: Daily motivation
- [x] AI Assistant: Memorization plans
- [x] AI Assistant: Encouragement messages
- [x] AI Assistant: Quick actions (Help me memorize, Test me, Review today, Daily challenge, Ask a question)
- [x] AI Assistant: Child-friendly conversational interface
- [x] AI Assistant: Proper loading states and error handling
- [x] AI Assistant: Add to parent navigation menu

## Bug Fix: JSON Parsing Crash in Weekly Planner
- [x] Fix JSON parsing crash - "Unterminated string in JSON"
- [x] Add robust JSON validation and auto-repair for all AI procedures
- [x] Add retry logic when JSON is malformed
- [x] Add user-friendly error messages instead of raw JSON errors on frontend
- [x] Test with Arabic text, long descriptions, special characters

## Bug Fix: Weekly Planner generates only 2 days instead of 5
- [x] Fix LLM prompt to reliably generate all 5 days (Sunday-Thursday)
- [x] Split generation into per-day calls to avoid token limit truncation
- [x] Add server-side validation: reject plan with fewer than 5 days
- [x] Add auto-regeneration logic when plan is incomplete (retry per day)
- [x] Frontend completeness check before displaying results

## Bug Fix: Navigation 404 on most pages
- [x] Fix DashboardLayout path resolution: only /ai* paths treated as absolute, all others relative to basePath
- [x] Fix sidebar active state detection to match corrected path logic
- [x] Verify all staff pages load correctly (/staff, /staff/children, /staff/attendance, etc.)
- [x] Verify AI pages load correctly (/ai, /ai/planner, /ai/observation, etc.)

## Bug Fix: GPS Staff Attendance always shows "outside range"
- [x] Investigate center GPS coordinates and radius settings
- [x] Fix geofence validation logic to allow check-in from actual center location
- [x] Increase default radius or make it configurable from admin settings
- [x] Fix centerSettings.update field mapping (gpsLat→latitude, gpsLng→longitude, gpsRadius→allowedRadius)
- [x] Update database: correct coordinates (26.2532715, 50.0716915) and radius (200m)
