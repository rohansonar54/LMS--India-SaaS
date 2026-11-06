# 🧺 LMS - Modern Next.js & MongoDB Laundry Management System with QR Code

A complete, full-stack recreation and modernization of the Laundry Management System built with **Next.js 15 (App Router)**, **MongoDB (Mongoose)**, **Tailwind CSS**, and **QR Code generation/tracking**.

---

## 🚀 Quick Start Guide

### 1. MongoDB Database
A local MongoDB instance is already running via Docker on `mongodb://localhost:27017/lms_db`.
If you prefer MongoDB Atlas (cloud), update `MONGODB_URI` in `.env.local`.

### 2. Install Dependencies
Open PowerShell or Terminal inside the `lms-nextjs` folder:

```bash
cd lms-nextjs
npm install
```

### 3. Start Development Server
```bash
npm run dev
```

Open your browser to: **[http://localhost:3000](http://localhost:3000)**

---

## 🔑 Login Credentials & Demo Data

| Role | Username | Password |
|---|---|---|
| **Admin** | `admin` | `admin` |
| **Staff** | `staff` | `staff123` |

> 💡 **One-Click Demo Data:** Once logged in, click the green **"Seed Demo Data"** button on the bottom-left sidebar to instantly populate sample customers, pricing, inventory supplies, and active orders!

---

## 🌟 Features Implemented

1. **POS Counter Checkout (`/transactions`)**:
   - Customer dropdown with fuzzy search & quick "+ Add Customer" modal.
   - Laundry service selector with automatic kilo-weight price calculation.
   - Consumable supplies deduction (detergent, fabric softener, bags).
   - Cash received calculator with live change display.
   - **Dual Printable Thermal Receipt**: Prints 80mm customer receipt AND basket identification tag with scannable QR Code.
   - One-click **WhatsApp notification** to customer with their order tracking link.

2. **Real-Time Queuing Kanban Board (`/queue`)**:
   - Live stage columns: `Pending` ➔ `Processing` ➔ `Washing` ➔ `Drying` ➔ `Folding` ➔ `Ready for Pickup`.
   - Single-click **"Advance Stage"** button to progress laundry through the cycle.
   - Quick QR Tag preview on each laundry basket card.

3. **Public & Customer Order Tracking (`/tracking` & `/tracking/[orderNumber]`)**:
   - Accessible without login via QR code scan or typing Order Number (e.g. `LMS-1001`).
   - Stepper timeline with timestamps for each operational stage.

4. **Analytics Dashboard (`/dashboard`)**:
   - Live KPI cards: Total Revenue (₱), Active Queue Count, Customer Count, Low Stock Warning.
   - Operational station breakdown.
   - Recent transaction log.

5. **Customer Management (`/customers`)**:
   - Customer directory with search, Add/Edit modals, and deletion.

6. **Inventory Supplies & Stock In/Out (`/supplies`)**:
   - Consumables monitoring (soap, softener, packaging bags, hangers).
   - Low-stock warning indicators (highlighted when under 20 units).
   - Modal forms for **Restock (Stock In)** and **Deduct (Stock Out)** with audit logs.

7. **Sales Reports (`/sales`)**:
   - Revenue calculations filtered by date and order status.
   - Print-ready reporting layout.

8. **Admin Security & Tools (`/staff`, `/logs`, `/settings`)**:
   - Role-Based Access Control (Admin vs. Staff).
   - Staff account registration and removal.
   - Full audit trail logging logins, orders, and edits.
   - Configurable Laundry Service Rates & Pricing per kg/piece.
