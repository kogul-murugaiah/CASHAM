# 💰 CASHAM — Expense Tracker App

CASHAM is a modern, multi-user finance and expense management platform built with the **Vite + React + TypeScript** stack. It leverages **Supabase** for real-time data and secure backend logic, ensuring a seamless and private experience for tracking personal finances.

---

## 🚀 Live Demo
🔗 [View Live App](https://expense-tracker-five-navy.vercel.app/)

---

## 📌 Features

### ✅ Authentication & Security
* **Multi-user Support:** Secure Email + Password Login & Signup.
* **Data Isolation:** Built with **Supabase Row Level Security (RLS)** to ensure users can only access their own data.
* **Session Management:** Persistent login states and secure logout functionality for both Desktop and Mobile.

### ✅ Financial Management
* **Expense Tracking:** Log expenses with item names, amounts, dates, and optional descriptions.
* **Income Tracking:** Record earnings with sources and account-specific details.
* **Custom Master Data:** Users can create and manage their own:
    * Account Types (e.g., Savings, Credit Card, Cash)
    * Expense Categories (e.g., Food, Travel, Rent)
    * Income Sources (e.g., Salary, Freelance)

### ✅ Analytics & Insights
* **Dynamic Dashboard:** Real-time monthly summary cards for Income, Expenses, and Net Balance.
* **Account-wise Analytics:** Automatic updates as users add or modify account types.
* **Time-based Views:** Dedicated pages for Monthly and Yearly tracking for long-term financial planning.

### ✅ Mobile-First Design
* **Premium Dark UI:** Sleek, modern interface using Tailwind CSS.
* **Intuitive Navigation:** Bottom navigation bar for a native app-like experience on mobile devices.
* **Touch Optimized:** Large action buttons and smooth transitions.

---

## 🛠 Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | Vite, React.js, TypeScript |
| **Styling** | Tailwind CSS |
| **Backend/DB** | Supabase (PostgreSQL + RLS) |
| **Authentication** | Supabase Auth |
| **Deployment** | Vercel |

---

## 📂 Project Structure & Routes

| Page | Route | Description |
| :--- | :--- | :--- |
| **Dashboard** | `/` | Overview of current month stats and balance. |
| **Add Expense** | `/add` | Form to log new expenditures. |
| **Add Income** | `/add-income` | Form to log new earnings. |
| **Monthly** | `/monthly` | Detailed breakdown of the current month. |
| **Yearly** | `/yearly` | Annual financial overview. |
| **Manage** | `/expenses` | View, edit, or delete previous entries. |

---

## 🔐 Security (Row Level Security)

CASHAM is designed as a **true multi-user application**. Unlike basic trackers, all database tables are protected by PostgreSQL RLS policies. This means even if an API key is exposed, data cannot be leaked between users.

**Tables Protected:** `expenses`, `income`, `account_types`, `categories`, `income_sources`.

---

## ⚙️ Local Development

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/kogul-murugaiah/expense-tracker.git](https://github.com/kogul-murugaiah/expense-tracker.git)
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

## 📌 Future Roadmap
* [ ] **Interactive Data Viz:** Integration with Recharts for visual spending trends.
* [ ] **Reports:** Export monthly data to PDF or Excel.
* [ ] **AI Insights:** Automated spending advice based on ML patterns.
* [ ] **Budgets:** Set limits for specific categories and receive alerts.

---

## 👨‍💻 Author
**Kogul M**

[![github](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/kogul-murugaiah)

---
*If you find this project helpful, please consider giving it a ⭐ star!*
