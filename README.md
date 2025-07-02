🛒 Raja Trading Co.

A full-featured web application for managing a small oil trading business: sales (POS), billing, inventory, orders, customer credits & collections, and role-based dashboards (Customer / Staff / Owner).

🚀 Features

🔐 Authentication & Roles

Customer sign‑up & login

Staff & Owner portals (managed by Owner)

🛍️ POS & Billing

Fast point‑of‑sale interface

Auto stock decrement

Print/export bills as PDF

📦 Inventory Management

Add/update products

Low‑stock alerts

Stock adjustments (damage, expiry, etc.)

📝 Order Management

Customers place orders

Staff/Owner view & update order status

💳 Market Credits & Collections

Grant customers credit

Track daily collections with timestamps

Mark credits paid/unpaid

📊 Dashboards & Reports

Real‑time sales metrics

Daily sales & credit reports

Pending payments overview

⚙️ Tech & Tools

React + Vite + TypeScript

Firebase Auth & Firestore

Tailwind CSS for styling

Recharts for charts

React‑Hook‑Form & React‑Hot‑Toast

🛠️ Getting Started

Clone the repo

git clone https://github.com/<your-user>/raja-trading-co.git
cd raja-trading-co

Install dependencies

npm install

Configure Firebase

Create a Firebase project at https://console.firebase.google.com

Enable Authentication (Email/Password, Phone, Google)

Create a Firestore database (in production mode)

Copy your firebaseConfig into src/lib/firebase.ts

Deploy Firestore indexes

npm run deploy-indexes

Run locally

npm run dev

🔧 Environment Variables

Rename .env.example to .env and fill in:

VITE_API_KEY=…
VITE_AUTH_DOMAIN=…
VITE_PROJECT_ID=…
VITE_STORAGE_BUCKET=…
VITE_MESSAGING_SENDER_ID=…
VITE_APP_ID=…

🎨 Screenshots



📁 Folder Structure

├── public/
├── src/
│   ├── components/      # UI & shared components
│   ├── contexts/        # React contexts (Auth, Cart)
│   ├── lib/             # Firebase initialization
│   ├── pages/           # Route views (customer/staff/owner)
│   ├── types/           # TypeScript interfaces & models
│   ├── utils/           # Formatters, helpers
│   └── App.tsx
├── .env.example
├── firestore.indexes.json
├── tailwind.config.js
└── vite.config.ts

📈 Roadmap



🤝 Contributing

Fork it

Create your feature branch (git checkout -b feature/foo)

Commit your changes (git commit -am 'Add foo')

Push to the branch (git push origin feature/foo)

Open a Pull Request
