# Letsfifa2026

An interactive, real-time web application dedicated to the 2026 FIFA World Cup. Built with a unified Node.js backend and a modern, glassmorphic frontend UI, it offers fans a dynamic experience to follow the tournament.

## 📋 Specifications

* **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+).
* **Animations**: GSAP (GreenSock Animation Platform) and ScrollTrigger.
* **Backend**: Node.js (CommonJS).
* **Database**: PostgreSQL (`pg` module).
* **Real-time Communication**: WebSockets (`ws` module).
* **Deployment & Process Management**: PM2 and AWS EC2.

## ✨ Features

* **Interactive Match Schedule**: View all 104 matches, organized by date and stage, automatically converted to Indian Standard Time (IST).
* **Live Match Tracking**: Real-time score updates, match statuses, and elapsed times.
* **Standings & Bracket Progression**: Follow the tournament from the Group Stage to the Finals with dynamic knockout brackets.
* **Global Fan Chat**: Connect with other fans globally or in team-specific chat rooms via live WebSockets. Chat opens automatically during active match windows.
* **Host Cities Showcase**: Interactive location pages for the USA, Canada, and Mexico host nations.
* **Where to Watch**: A curated list of official broadcasting partners and streaming platforms (including free and paid options).
* **Developer Sync Console**: An admin dashboard to monitor multi-API confidence rankings and database statistics, with the ability to simulate API outages.
* **Dark/Light Mode**: User-toggleable themes that persist via local storage.
* **Email Notifications**: Subscription system for automatic match event alerts.

## 🔒 Security

* **Admin Authentication**: The Developer Sync Console requires an `x-admin-key` to prevent unauthorized access to administrative functions.
* **Chat Message Sanitization**: All user inputs in the Fan Chat are strictly HTML-escaped to prevent Cross-Site Scripting (XSS) injection attacks.
* **Dev Passcode Encryption**: Simulating live match scenarios requires a verified SHA-256 hashed passcode.
* **Environment Variables**: Sensitive data such as the `DATABASE_URL` and third-party API keys (`API_FOOTBALL_KEY`, `FOOTBALL_DATA_KEY`, `SPORTMONKS_KEY`) are managed securely via environment variables and are never exposed to the client.

## 🚀 How to Run Locally

### Prerequisites
* [Node.js](https://nodejs.org/) (v16+ recommended)
* [PostgreSQL](https://www.postgresql.org/) database installed and running

### 1. Clone the repository
```bash
git clone https://github.com/Raashiyeeee/Letsfifa2026.git
cd Letsfifa2026
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Configure the following environment variables in your system:
* `DATABASE_URL`: Connection string for PostgreSQL (Defaults to `postgres://fifa_user:fifa_password@localhost:5432/fifa_db`).
* `API_FOOTBALL_KEY`: API-Football key (Optional, for live data fetching).
* `FOOTBALL_DATA_KEY`: Football-Data.org key (Optional, for live data fetching).
* `SPORTMONKS_KEY`: Sportmonks API key (Optional, for live data fetching).

### 4. Run the Application
Start the Node.js proxy server:
```bash
npm start
```
*This command executes `node proxy.js`.*

Alternatively, for continuous background running, use PM2:
```bash
npm install -g pm2
pm2 start proxy.js --name fifa-app
```

### 5. Access the Web App
Open your web browser and navigate to the application (by default, the server usually listens on port 8080 or 3000, depending on your configuration).
