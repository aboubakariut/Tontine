# 🏗️ Architecture — Tontines Facile

## Vue d'ensemble

```
┌───────────────────────────────────────────┐
│ CLIENT (Frontend)                         │
│ HTML5 + JS + CSS + PWA                    │
└────────────────┬────────────────────────┘
                 │ HTTP(S)
                 ▼
┌───────────────────────────────────────────┐
│ API (Backend PHP)                         │
│ api.php + config + Mailer                 │
└────────────────┬────────────────────────┘
                 │
        ┌────────┼────────┐
        ▼        ▼        ▼
   ┌────────┐┌────────┐┌──────────┐
   │MySQL   ││ SMTP   ││ Mobile   │
   │  DB    ││ Email  ││  Money   │
   └────────┘└────────┘└──────────┘
```

## 📂 Structure

```
Tontine/
├── index.html           ← Page principale
├── app.js              ← Frontend (55KB)
├── style.css           ← Styles + thèmes
├── api.php             ← Backend API
├── config.php          ← Configuration
├── Mailer.php          ← Emails
├── composer.json       ← Dépendances
├── .env.example        ← Variables
├── SETUP.md            ← Installation
├── ARCHITECTURE.md     ← Ce fichier
└── README.md           ← Docs générale
```

## 🔐 Sécurité

✅ Passwords : BCRYPT (cost=12)
✅ Tokens : JWT (7 jours)
✅ Injections : Prepared statements
✅ CORS : Headers sécurisés

## 📡 API Endpoints (25+)

**Auth** : register, login, demo, logout, changePassword, health
**Tontines** : createTontine, getTontines, getTontine, searchTontine, updateTontine
**Memberships** : joinTontine, approveMember
**Payments** : recordPayment, nextTour, getTransactions
**Emails** : sendInvite, getInvitations
**Audit** : getGlobalLog, getNotifications, markRead, getStats
**Admin** : sendReminder

## 📚 Technologies

- **Frontend** : HTML5 + Vanilla JS (ES6+) + CSS3
- **Backend** : PHP 7.4+
- **Database** : MySQL 5.7+
- **Email** : PHPMailer + SMTP
- **Auth** : JWT
- **PWA** : Service Worker

## 🎯 Roadmap

✅ **V1.0** - Frontend + Backend + DB + Auth
🔄 **V1.1** - Configuration + Email + Deployment
🚀 **V1.2** - Mobile Money + SMS + 2FA
🌟 **V2.0** - Mobile app + Admin dashboard

**Dernière mise à jour : 2025-07-02**
