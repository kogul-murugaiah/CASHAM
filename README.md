# 💰 CASHAM — Expense Tracker App

CASHAM is a modern, premium multi-user finance and expense management platform built with the **Vite + React + TypeScript** stack. It leverages **Supabase** for real-time data and secure backend logic, ensuring a high-end, private experience for tracking personal finances with a mobile-first philosophy.

---

## 🚀 Live Demo
🔗 [View Live App](https://expense-tracker-five-navy.vercel.app/)

---

## 📌 Features

### ✅ Premium UI/UX
* **High-End Aesthetics:** Sleek dark mode interface featuring glassmorphism and subtle micro-animations.
* **Premium Typography:** Integrated with the **Outfit** Google Font for a modern, tech-forward look.
* **Refined Iconography:** Professional SVG icons replace emojis for a mature user experience.

### ✅ Authentication & Security
* **Multi-user Support:** Secure Email + Password Login & Signup.
* **Data Isolation:** Powered by **Supabase Row Level Security (RLS)** to guarantee individual user privacy.
* **Dynamic Header:** Personalized mobile header showing user initials and email.

### ✅ Financial Management
* **Unified Tracking:** Dedicated pages for total control over **Expense** and **Income** history.
* **Inline Management:** "Edit" and "Delete" entries directly within history tables via glassy modals.
* **Excel Export:** Download your financial history to a professional Excel format for external reporting.
* **Custom Master Data:** personalized setup for Account Types, Expense Categories, and Income Sources.

### ✅ Mobile-First Design
* **Dual Header System:** Specialized top and bottom navigation bars for native-app ergonomics.
* **Quick Access Hub:** Centralized FAB (+) for instant "one-tap" record entries.
* **Balanced Navigation:** 5-tab bottom layout: **Home**, **Expense**, **Add (+)**, **Income**, and **More**.

---

## 🛠 Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | Vite, React.js, TypeScript |
| **Styling** | Tailwind CSS v4, Glassmorphism |
| **Fonts** | Outfit (Google Fonts) |
| **Backend/DB** | Supabase (PostgreSQL + RLS) |
| **Authentication** | Supabase Auth |
| **Utilities** | XLSX (Excel Export), React Icons (Feather) |

---

## 📂 Project Structure & Routes

| Page | Route | Description |
| :--- | :--- | :--- |
| **Dashboard** | `/dashboard` | Monthly summary cards and account-wise balance. |
| **Add Expense** | `/add` | Quick form to log new spending. |
| **Add Income** | `/add-income` | Quick form to log new earnings. |
| **Expense Tracker** | `/expense-tracking` | Detailed history, trends, and itemized deletions/edits. |
| **Income Tracker** | `/income-tracking` | Detailed history, sources, and itemized deletions/edits. |

---

## 🔐 Security (Row Level Security)

CASHAM is designed as a **true multi-user application**. All database tables are protected by PostgreSQL RLS policies. This means data is isolated at the database level, preventing any leaks between different users even if API keys are exposed.

**Tables Protected:** `expenses`, `income`, `account_types`, `categories`, `income_sources`.

---

## ⚙️ Local Development

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/kogul-murugaiah/expense-tracker.git
    cd expense-tracker
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Variables:**
    Create a `.env` file in the root directory:
    ```env
    VITE_SUPABASE_URL=your_supabase_project_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  **Start the development server:**
    ```bash
    npm run dev
    ```

5.  **Mobile Testing:**
    To view on your phone (same Wi-Fi), run:
    ```bash
    npm run dev -- --host
    ```

---

## 👨‍💻 Author
**Kogul M**

[![github](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/kogul-murugaiah)

---
*If you find this project helpful, please consider giving it a ⭐ star!*
