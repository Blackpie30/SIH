# EDUVIA - Next-Gen AI-Powered STEM Learning Platform (SIH)

> **Smart India Hackathon (SIH)** — Transforming STEM education through 24/7 Socratic AI tutoring, Feynman voice evaluations, peer doubt resolution, and cognitive gamification.

---

## 🌟 Overview

**EDUVIA** is an intelligent education ecosystem designed to accelerate student learning in STEM disciplines. It combines real-time AI mentoring with collaborative peer problem solving and gamified habit building.

### Key Modules

1. **Eduvia Landing Page (`Smart Education/eduvia_landing_page/`)**:
   - Platform introduction, feature highlights, live showcase, and community access.
2. **Student Dashboard (`Smart Education/student_dashboard/`)**:
   - Cognitive streak tracker, XP quests, leaderboard standing, active course progress, and weekly velocity charts.
3. **Student Doubt Community (`Smart Education/student_doubt_community/`)**:
   - Peer-to-peer STEM question solving, bounty awards, AI-validated explanations, and university-level discussion threads.
4. **24/7 AI Tutor Workspace (`Smart Education/24_7_ai_tutor_workspace/`)**:
   - Interactive Socratic dialogue, Feynman voice explanation evaluator, multimedia doubt upload, and real-time concept mastery scoring.

---

## 🚀 Tech Stack

- **Frontend**: HTML5, Tailwind CSS, Google Material Symbols, Vanilla JavaScript
- **Backend**: Node.js, Express.js (REST API)
- **Database**: MySQL (`schema.sql`, `mysql2`)
- **AI & ML**: Google Gemini SDK (`@google/genai`) for Socratic dialogue & Feynman audio evaluations
- **Security & Utilities**: JWT auth (`jsonwebtoken`), password hashing (`bcrypt`), file uploads (`multer`), CORS (`cors`)

---

## 📁 Repository Structure

```text
├── controllers/                  # Express route controllers (auth, doubts, tutor, etc.)
├── routes/                       # API route declarations
├── middleware/                   # Authentication & validation middleware
├── services/                     # Business logic & AI integration services
├── Smart Education/              # Frontend UI modules
│   ├── eduvia_landing_page/      # Landing page (code.html)
│   ├── student_dashboard/        # Student dashboard (code.html)
│   ├── student_doubt_community/  # Peer doubt resolution community (code.html)
│   └── 24_7_ai_tutor_workspace/  # 24/7 AI Socratic tutor & Feynman evaluator (code.html)
├── frontend/                     # Client-side API integration scripts
├── utils/                        # Helper functions & database connectors
├── db.js                         # Database pool initialization
├── schema.sql                    # MySQL database schema & tables
├── server.js                     # Main Express server entry point
├── api-spec.md                   # Full REST API specifications & roadmap
├── package.json                  # Dependencies & scripts
└── .env.example                  # Environment configuration template
```

---

## 🛠️ Quick Start

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [MySQL](https://www.mysql.com/) server running locally or remotely

### 2. Installation
```bash
git clone https://github.com/Blackpie30/SIH.git
cd SIH
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env` and fill in your database credentials and API keys:
```bash
cp .env.example .env
```

### 4. Database Setup
Import the schema into MySQL:
```bash
mysql -u root -p < schema.sql
```

### 5. Start Server
```bash
# Production mode
npm start

# Development mode (auto-reload)
npm run dev
```
Server runs by default at `http://localhost:5000`.

### 6. Explore Frontend
Open any of the `code.html` files inside `Smart Education/` directly in your browser or serve them with a static file server. Navigation headers are interconnected with relative paths.

---

## 📖 API Documentation

Detailed endpoint schemas, request/response models, and status codes are documented in [api-spec.md](api-spec.md).

---

## 📄 License
This project is built for Smart India Hackathon (SIH). All rights reserved.
