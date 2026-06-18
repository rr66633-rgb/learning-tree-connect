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
