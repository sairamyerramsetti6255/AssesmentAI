# Pbshope.com AI Readiness Platform - Detailed Modules & Features

## Table of Contents
1. [Module 0: Authentication & User Management](#module-0-authentication--user-management)
2. [Module 1: Manager Pre-Assessment & Deep Research](#module-1-manager-pre-assessment--deep-research)
3. [Module 2: Document Intelligence & AI Extraction](#module-2-document-intelligence--ai-extraction)
4. [Module 3: AI Dynamic Question Generation Engine](#module-3-ai-dynamic-question-generation-engine)
5. [Module 4: Live Assessment Session (Sales Rep)](#module-4-live-assessment-session-sales-rep)
6. [Module 5: Voice Recording & Transcription](#module-5-voice-recording--transcription)
7. [Module 6: Question Management (Modify/Skip/Delete)](#module-6-question-management-modifyskipdelete)
8. [Module 7: Assessment Scoring & Results](#module-7-assessment-scoring--results)
9. [Module 8: Gap Analysis & Recommendations](#module-8-gap-analysis--recommendations)
10. [Module 9: PoC Plan Generator](#module-9-poc-plan-generator)
11. [Module 10: Proposal Generator](#module-10-proposal-generator)
12. [Module 11: Reports & Analytics Dashboard](#module-11-reports--analytics-dashboard)
13. [Module 12: Chatbot AI Assistant](#module-12-chatbot-ai-assistant)
14. [Module 13: Notification System](#module-13-notification-system)
15. [Module 14: Admin Panel](#module-14-admin-panel)
16. [Module 15: Audit & Compliance](#module-15-audit--compliance)

---

## Module 0: Authentication & User Management

### Overview
Secure role-based access control for three user types: Super Admin, Sales Manager, Sales Rep.

### Features

| Feature ID | Feature Name | Description |
|------------|--------------|-------------|
| AUTH-01 | Email/Password Login | Secure login with Supabase Auth |
| AUTH-02 | Magic Link Login | Passwordless email link for client self-assessment |
| AUTH-03 | Role-Based Dashboard | Different dashboard views per role |
| AUTH-04 | User Registration | Admin-only user creation |
| AUTH-05 | Password Reset | Forgot password flow |
| AUTH-06 | Session Management | Auto-logout after inactivity |
| AUTH-07 | Role Switching | (Admin only) Impersonate other roles for testing |

### Role Permissions Matrix

| Permission | Super Admin | Sales Manager | Sales Rep |
|------------|-------------|---------------|-----------|
| View all assessments | ✅ | ✅ | ❌ (only assigned) |
| Create pre-assessment | ✅ | ✅ | ❌ |
| Upload documents | ✅ | ✅ | ❌ |
| Assign assessments to reps | ✅ | ✅ | ❌ |
| Conduct live sessions | ✅ | ❌ | ✅ |
| Modify/delete questions | ✅ | ❌ | ✅ (during session) |
| Generate PoC & proposals | ✅ | ✅ | ❌ |
| Manage users | ✅ | ❌ | ❌ |
| Manage masters | ✅ | ❌ | ❌ |
| View all reports | ✅ | ✅ | ❌ |
| Export data | ✅ | ✅ | ❌ |

### API Endpoints
```javascript
POST   /api/auth/login
POST   /api/auth/register
POST   /api/auth/magic-link
GET    /api/auth/me
POST   /api/auth/logout
POST   /api/auth/forgot-password
PUT    /api/auth/reset-password
GET    /api/users                    // Admin only
PUT    /api/users/:id/role           // Admin only
DELETE /api/users/:id                // Admin only