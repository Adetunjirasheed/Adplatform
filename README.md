# AdPlatform — Professional Advertising Platform for Businesses

A modern, production-grade full-stack digital advertising platform engineered for Nigerian businesses to launch, fund, and manage advertising campaigns across **TikTok**, **Instagram/Meta**, and **Google Ads / YouTube** in **Nigerian Naira (₦)**.

---

## 🌟 Key Platform Features

### 1. Multi-Platform Ad Campaign Engine
- **TikTok Ads:** Configured on the **$70 USD per day model** with customer selection between **1 and 10 days**. Live conversion to Nigerian Naira (₦) using a configurable exchange rate, plus management/service fee.
- **Instagram / Meta Ads:** Tiered budget options from **₦50,000 to ₦500,000** covering Feed, Stories, and Reels.
- **Google Ads / YouTube:** Search and video advertisement budget tiers from **₦50,000 to ₦500,000**.
- **Multi-Platform Campaigns:** Advertisers can select one, two, or all three networks in a single campaign, with transparent breakdown calculations.

### 2. Nigerian Naira Payment Integration (Paystack)
- Direct integration structure with **Paystack**, Nigeria's leading payment gateway.
- Full server-side transaction initialization, redirect checkout, callback verification, and signature-verified webhook processing.
- **Demo Mode:** Out-of-the-box local testing mode that simulates successful transactions with watermarks (`DEMO PAYMENT — NOT A REAL TRANSACTION`) without charging real funds or calling external payment rails.

### 3. Business Email & Secure Campaign Link
- Automatically generates unique **Campaign IDs** (e.g., `CAM-A7X3K9M2`).
- 10 automated branded email workflows via Nodemailer with persistent database delivery auditing.
- Dedicated public campaign showcase page (`/campaign/CAM-XXXXXXXX`) featuring video player and image displays while keeping customer contact information strictly confidential.

### 4. Comprehensive Customer Dashboard
- Campaign pipeline overview with status tracking:
  - `Draft`
  - `Awaiting Payment`
  - `Payment Confirmed`
  - `Under Review`
  - `Approved`
  - `Awaiting Platform Connection`
  - `Scheduled`
  - `Running`
  - `Completed`
  - `Rejected`
  - `Cancelled`
- Printable, digital payment receipts.
- In-app notification center and profile management with password change verification.

### 5. Enterprise Administrator Control Center
- Financial analytics dashboard: Total revenue, platform advertising budget allocation, and platform profit/service fee margin breakdown.
- Network revenue reporting (TikTok vs. Meta vs. Google).
- Campaign management table with approval, rejection (with reason notifications), email resend, and status update actions.
- User management with instant account suspension and reactivation.
- Exchange rate and service fee modification tools.
- API credential vault for official TikTok, Meta, and Google Ads developer tokens.
- Customer support ticket desk with direct email reply mechanisms.

### 6. Security & Defense-in-Depth
- Password hashing with **bcryptjs** (12 rounds).
- Database-backed session store (`connect-session-sequelize`) with HTTP-only, SameSite lax cookies.
- CSRF protection via **csurf** across all forms.
- Secure HTTP headers via **Helmet**.
- Multi-tier rate limiting via **express-rate-limit** against brute-force attacks.
- Strict MIME type and extension validation on file uploads via **Multer** (50MB max).
- SQL injection prevention via **Sequelize ORM** parameterized queries.

---

## 📁 Project Architecture

```
adplatform/
├── .env.example                     # Environment variables template
├── .env                             # Active environment configuration
├── package.json                     # Dependencies and npm scripts
├── server.js                        # Express server entry point & middleware stack
├── config/
│   ├── database.js                  # Sequelize SQLite configuration
│   └── email.js                     # Nodemailer SMTP transporter
├── models/
│   ├── index.js                     # Sequelize model loader and relationships
│   ├── User.js                      # User accounts with bcrypt hooks
│   ├── Campaign.js                  # Campaigns with status lifecycle
│   ├── CampaignPlatform.js          # Platform junction with budget & fees
│   ├── Payment.js                   # Payment transaction logs
│   ├── ServiceFee.js                # Platform management fees
│   ├── PlatformSetting.js           # Dynamic platform configs & rates
│   ├── UploadedMedia.js             # Creative asset tracking
│   ├── Notification.js              # User notifications
│   ├── SupportTicket.js             # Support tickets and replies
│   ├── AuditLog.js                  # Admin action audit trail
│   └── EmailLog.js                  # Email dispatch logs
├── middleware/
│   ├── auth.js                      # Auth and role guards (isAuthenticated, isAdmin)
│   ├── security.js                  # Helmet, rate limiters, HPP
│   ├── upload.js                    # Multer file upload & validation
│   ├── validation.js                # express-validator form chains
│   └── demoMode.js                  # Demo mode detection
├── services/
│   ├── pricingService.js            # Currency & platform pricing calculators
│   ├── paymentService.js            # Paystack checkout, verification & webhooks
│   ├── campaignService.js           # Campaign creation, IDs, and notifications
│   ├── emailService.js              # 10 branded HTML email templates
│   └── platformService.js           # Stubs for official TikTok, Meta, Google APIs
├── routes/
│   ├── pages.js                     # Landing page & public campaign viewer
│   ├── auth.js                      # Login, register, password recovery
│   ├── dashboard.js                 # Customer dashboard & notifications
│   ├── campaigns.js                 # Campaign wizard, payment & receipt views
│   ├── payments.js                  # Paystack initialize, callback & webhook
│   ├── admin.js                     # Administrator control center routes
│   └── support.js                   # Contact & support tickets
├── views/
│   ├── layouts/
│   ├── partials/                    # navbar, footer, flash messages
│   ├── pages/                       # home, contact, campaign-view, 404, error
│   ├── auth/                        # login, register, forgot/reset password
│   ├── dashboard/                   # index, create-campaign, detail, payment, receipt
│   └── admin/                       # index, login, users, campaigns, payments, settings, support
├── public/
│   ├── css/                         # main.css, landing.css, auth.css, dashboard.css, admin.css
│   ├── js/                          # main.js, pricing-calculator.js, campaign-form.js, admin.js
│   └── images/                      # logo.svg
├── database/                        # SQLite storage (auto-created)
├── uploads/                         # User uploaded video/image assets
└── seeds/
    └── seed.js                      # Database seeder (Admin & default settings)
```

---

## 🚀 Getting Started (Local Development)

### 1. Prerequisites
Ensure you have **Node.js (v18.0.0 or higher)** and **npm** installed on your computer.

### 2. Installation
Open the project directory in VS Code or your terminal:
```bash
cd "c:\Users\User\New folder (10)\adplatform"
npm install
```

### 3. Initialize & Seed Database
Run the seed script to create all database tables, the default platform administrator, service fees, and exchange rates:
```bash
npm run seed
```

### 4. Start the Application
Start the application server:
```bash
npm start
# or for live reloading during development:
npm run dev
```

Visit the website in your browser:
**`http://localhost:3000`**

---

## 🔑 Default Credentials

### Platform Administrator Account:
- **Admin Portal URL:** `http://localhost:3000/auth/admin/login`
- **Email:** `admin@adplatform.com`
- **Password:** `AdminPass123!`

### Advertiser / Customer Account:
- Register a new business account at `http://localhost:3000/auth/register` or create campaigns directly after login.

---

## 🛠️ Switching from Demo Mode to Production

In `.env`, update the configuration:
1. Set `DEMO_MODE=false`.
2. Provide your live **Paystack Secret Key** and **Public Key** (`PAYSTACK_SECRET_KEY=sk_live_...`).
3. Set `PAYSTACK_CALLBACK_URL=https://yourdomain.com/payments/callback`.
4. Configure live SMTP credentials for real email delivery (e.g. SendGrid, Mailgun, Amazon SES, or Gmail App Password).
5. Set `NODE_ENV=production` and generate a strong `SESSION_SECRET`.

