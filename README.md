# PocketMind 💸
### Smart Expense Sharing & Settlement Platform

PocketMind is a full-stack expense-sharing application designed to help friends, roommates, and groups manage shared expenses, track balances, and simplify settlements in one place.

🔗 **Live Demo:** [Try PocketMind](https://pocketmind-git-preview-vedantchopde11s-projects.vercel.app/) 
💻 **GitHub Repository:** [PocketMind](https://github.com/VedantChopde11/PocketMind)

---

## ✨ Features

- 💰 **Expense Management** — Create and manage shared expenses with payer and split details.
- 👥 **Group Management** — Organize expenses and members into groups.
- 🧮 **Balance Tracking** — Track who owes whom and calculate outstanding balances.
- 🔄 **Debt Simplification** — Reduce the number of transactions needed to settle group debts.
- 💳 **Settlement Management** — Record payments and track outstanding balances.
- 🔐 **Authentication** — Manage user authentication using Clerk.
- ⚡ **Reactive Data** — Use Convex for backend operations and reactive data updates.

## 🛠️ Tech Stack

| Category | Technology |
|---|---|
| Framework | Next.js |
| Frontend | React |
| Backend & Database | Convex |
| Authentication | Clerk |
| AI Integration | Google Generative AI, where implemented |
| Background Workflows | Inngest, where implemented |
| Email Integration | Resend, where implemented |

## 🧮 How It Works

1. Sign in to PocketMind.
2. Create or join an expense-sharing group.
3. Add shared expenses and specify who paid.
4. Split expenses among group members.
5. View balances to identify who owes whom.
6. Record settlements to update outstanding balances.

## 🏗️ Architecture

```text
              ┌────────────────────┐
              │    Next.js / React │
              │    User Interface  │
              └─────────┬──────────┘
                        │
                        ▼
              ┌────────────────────┐
              │    Clerk Auth      │
              │   Authentication   │
              └────────────────────┘
                        │
                        ▼
              ┌────────────────────┐
              │   Convex Backend   │
              │ Queries / Mutations│
              └─────────┬──────────┘
                        │
                        ▼
              ┌────────────────────┐
              │ Expense & Group    │
              │ Data Management    │
              └────────────────────┘
```

## 🚀 Getting Started

### Prerequisites

- Node.js
- npm
- A Convex account and configured deployment
- A Clerk account and application

### 1. Clone the repository

```bash
git clone https://github.com/VedantChopde11/PocketMind.git
cd PocketMind
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file in the project root and configure the variables required by your application.

Example:

```env
NEXT_PUBLIC_CONVEX_URL=your_convex_deployment_url
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
```

Use the exact variable names required by your source code. Additional configuration may be required for AI, email, or background workflow integrations.

**Important:** Never commit real API keys, database credentials, or secret keys to GitHub.

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

Ensure your Convex deployment and authentication configuration are active before testing the application.

## 🔮 Future Enhancements

- AI-powered receipt scanning and expense extraction.
- Monthly spending analytics and visual reports.
- Automated expense notifications and settlement reminders.
- Exportable expense and settlement history.
- Multi-currency expense tracking.
- Automated tests for settlement calculations and balance consistency.

*These are potential future enhancements, not claims of existing functionality.*

## 👨‍💻 Author

**Vedant Chopde**  
Engineering Student | Full-Stack Developer

- GitHub: [VedantChopde11](https://github.com/VedantChopde11)
- Project: [PocketMind](https://github.com/VedantChopde11/PocketMind)

---

⭐ If you find this project interesting, consider starring the repository!
