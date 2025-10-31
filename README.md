![SnackSage Logo](https://res.cloudinary.com/dcy6em3rs/image/upload/v1761905250/Image_in_slide_1_of_SnackSage-removebg-preview_r4o052.png))

# SnackSage: AI-Powered Pantry Management System

## 🧠 Overview

SnackSage is an **AI-powered mobile application** that helps reduce household food waste by integrating **real-time pantry inventory tracking** with **personalized recipe recommendations**. Built using **React Native**, **Express.js**, **MongoDB Atlas**, and **Google Gemini AI** with **Retrieval-Augmented Generation (RAG)**, SnackSage provides a smart, sustainable, and data-driven approach to food management.

**App Link**: (https://drive.google.com/file/d/1kA6ESE-5zJYvPfHHSvZUxs5fqDU3lx2w/view?usp=sharing)
---

## 🚀 Key Features

* **AI-Driven Recipe Suggestions** – Gemini AI + RAG generates recipes using available ingredients and expiring items.
* **Real-Time Inventory Tracking** – Manage pantry items with expiry alerts and category analytics.
* **QR Code Item Entry** – Scan food packaging to auto-fill item details.
* **Conversational Chatbot** – Get interactive cooking assistance and substitution advice.
* **Visual Dashboard** – Donut charts display pantry distribution, expiry alerts, and usage metrics.
* **Sustainability Metrics** – Track waste reduction aligned with **UN SDG 12.3**.

---

## 🧩 Technology Stack

| Layer      | Technologies                    | Purpose                      |
| ---------- | ------------------------------- | ---------------------------- |
| Frontend   | React Native, Expo, Figma       | Cross-platform mobile UI/UX  |
| Backend    | Express.js, Node.js             | REST APIs, business logic    |
| Database   | MongoDB Atlas                   | Cloud NoSQL storage          |
| AI         | Google Gemini API + RAG (FAISS) | Recipe generation & chat     |
| Deployment | Vercel, Expo OTA                | Hosting & continuous updates |
| Testing    | Postman, Jest, Mocha            | Unit & API validation        |

---

## ⚙️ Architecture

* **Client Layer:** React Native handles UI and user interactions.
* **API Layer:** Express.js exposes secured REST endpoints with JWT authentication.
* **Data Layer:** MongoDB Atlas stores users, items, and recipe history.
* **AI Layer:** Google Gemini + RAG retrieves contextual recipes and ensures accurate responses.

---

## 🛠️ Build & Run (Developer Guide)

Follow these steps after cloning the repository: `https://www.github.com/sahilmurhekar/SnackSage`.

### Prerequisites

* Node.js (v18+ recommended) and npm or yarn
* expo-cli (`npm install -g expo-cli`)
* Git
* A MongoDB Atlas cluster (or local MongoDB)
* Google Cloud account with access to Gemini API (set API key)

### 1. Clone the repo

```bash
git clone https://www.github.com/sahilmurhekar/SnackSage.git
cd SnackSage
```

### 2. Backend setup

```bash
cd server
# install dependencies
npm install
# copy example env and update values
cp .env.example .env
# set MONGODB_URI, JWT_SECRET, GEMINI_API_KEY, PORT (optional)
# start the dev server
npm run dev
```

* The server runs on `http://localhost:5000` by default (or the PORT in `.env`).
* Available scripts: `npm run dev` (nodemon), `npm run start` (node), `npm run test`.

### 3. Frontend (Mobile) setup

```bash
cd ../mobile
# install dependencies
npm install
# set environment variables for API base URL (e.g., in app.config.js or .env)
# start Expo
expo start
```

* Open the Expo QR code with Expo Go (iOS/Android) or run on simulator/emulator.
* To build native binaries use `eas build` (configure EAS and credentials) or `expo build` (classic).

### 4. Environment variables (example)

Create `.env` files in `/server` and `/mobile` as required. Example keys:

```
# server/.env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
PORT=5000

# mobile/.env (or app config)
API_BASE_URL=http://localhost:5000/api
```

### 5. Database

* Use MongoDB Atlas free tier or local MongoDB.
* Import any seed/mock data if present: `server/scripts/seed.js` (if included) with `node scripts/seed.js`.

### 6. RAG & AI setup

* Populate the RAG index at server startup or via `server/scripts/ingest_recipes.js`.
* Ensure `GEMINI_API_KEY` is set and the server can reach Gemini endpoints.

### 7. Deployment

* Backend: configure Vercel (serverless functions) or deploy to any Node host. Ensure environment variables are set in the host.
* Frontend: publish via Expo (OTA) or build native apps. For web or static deployments, adapt with `expo-web` or build a React web client.

### 8. Common commands

```bash
# at repo root
# run backend
cd server && npm run dev
# run mobile
cd mobile && expo start
# run tests
cd server && npm test
```

---

## 📱 Core Modules

* **Authentication:** Secure JWT-based login/register.
* **Add Item:** Manual or QR-based item entry with expiry date tracking.
* **Dashboard:** Displays inventory charts and upcoming expiry alerts.
* **Recipe Chat:** Conversational interface with markdown-rendered recipe steps.
* **Analytics:** Visual insights on waste reduction and consumption patterns.

---

## 📦 Deployment

* **Backend:** Hosted on [Vercel](https://vercel.com)
* **Frontend (Mobile):** Expo OTA build (scan via Expo Go app)
* **Database:** MongoDB Atlas (Free Tier Sandbox)

---

## 🔒 Security

* JWT Authentication with token expiry.
* HTTPS for all API communications.
* Input sanitization to prevent injection attacks.
* GDPR-compliant data handling (user data deletion endpoint).

---

## 📈 Future Enhancements

* Voice and RFID-based item entry.
* Offline mode with local caching.
* Integration with Open Food Facts API for live product data.
* Expanded sustainability dashboard with CO₂e savings visualization.

---

## 👩‍💻 Contributors

| Name                      | Reg. No.  | Role                     |
| ------------------------- | --------- | ------------------------ |
| **Diksha Dutta**          | 22BIT0230 | Frontend Developer       |
| **Sahil Rajesh Murhekar** | 22BIT0467 | Full Stack Developer     |
| **Priyanshu Pulak**       | 22BIT0587 | Testing & Documentation  |

**Guide:** Prof. Suganya P, Assistant Professor Sr. Grade 1, VIT Vellore

---

## 📚 References

* [Google Gemini API Docs](https://ai.google.dev/gemini-api)
* [MongoDB Atlas](https://www.mongodb.com/atlas)
* [React Native](https://reactnative.dev)
* [Expo](https://expo.dev)
* [Vercel](https://vercel.com)
* [FAO: Food Waste Statistics](https://www.fao.org/3/i3347e/i3347e.pdf)

---

## 📄 License

This project is licensed under the **MIT License** – feel free to use, modify, and distribute with attribution.


---

> *SnackSage empowers households to cut food waste by up to 30% through intelligent, sustainable, and AI-driven pantry management.*
