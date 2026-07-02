# 🏗️ Architecture — Tontines Facile

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (Frontend)                         │
│  index.html (PWA) + app.js + style.css (Responsive Mobile)  │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP(S)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    API (Backend PHP)                         │
│  api.php (Router) + config.php + Mailer.php                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                ┌────────┼────────┐
                ▼        ▼        ▼
           ┌────────┐ ┌────────┐ ┌──────────┐
           │ MySQL  │ │ SMTP   │ │ Mobile   │
           │   DB   │ │ Email  │ │ Money    │
           └────────┘ └────────┘ └──────────┘
```

---

## 📂 Structure des Fichiers

```
Tontine/
├── index.html           ← Page principale (PWA)
├── app.js              ← Logique frontend (55KB, 12 pages)
├── style.css           ← Styles + 5 thèmes
├── api.php             ← Backend API (55KB, 25+ endpoints)
├── config.php          ← Configuration centralisée (.env)
├── Mailer.php          ← Service d'emails
├── composer.json       ← Dépendances PHP
├── .gitignore          ← Fichiers à ignorer
├── .env.example        ← Template variables d'env
├── SETUP.md            ← Guide d'installation
├── ARCHITECTURE.md     ← Ce fichier
├── README.md           ← Documentation générale
└── (logs/, uploads/)   ← Dossiers créés à l'exécution
```

---

## 🔄 Flux Utilisateur

### 1️⃣ Authentication
```
User → [Login/Register Form]
       ↓
     API.login() / API.register()
       ↓
     Auth.validateToken() [JWT check]
       ↓
     Créer session & retourner token
       ↓
     Stocker en localStorage + redirect Dashboard
```

### 2️⃣ Créer Tontine
```
User → [Formulaire]
       ↓
     API.createTontine()
       ↓
     Valider inputs
       ↓
     INSERT INTO tontines + memberships (creator = admin)
       ↓
     Audit log + success response
       ↓
     Redirect détail tontine
```

### 3️⃣ Rejoindre Tontine
```
User → [Code d'invitation]
       ↓
     API.searchTontine(code)
       ↓
     Afficher preview
       ↓
     User clique "Confirmer"
       ↓
     API.joinTontine()
       ↓
     INSERT memberships (status = pending/active)
       ↓
     Si approve needed → Notify admin
     Sinon → Auto-accepted
       ↓
     Update current_members count
```

### 4️⃣ Paiement
```
User → [Enregistrer paiement]
       ↓
     API.recordPayment()
       ↓
     [Admin check] ✓
       ↓
     INSERT payments (status = paid)
       ↓
     UPDATE tontines.pot += amount
       ↓
     Audit log + Notification (email/push)
       ↓
     Update UI en temps réel
```

### 5️⃣ Versement Cagnotte
```
Admin → [Lancer prochain tour]
        ↓
      API.nextTour()
        ↓
      Identifier bénéficiaire (tour_order)
        ↓
      INSERT disbursements (amount = pot)
        ↓
      UPDATE tontines (current_tour++, pot=0, status)
        ↓
      Notify bénéficiaire (email + push)
        ↓
      Audit log
```

---

## 🗄️ Schéma Base de Données

### Tables Principales

```
users (8 colonnes)
  ├─ id (PK)
  ├─ firstname, lastname, email (UNIQUE)
  ├─ phone, password (BCRYPT), invite_code
  ├─ avatar, role, is_active
  └─ login_attempts, last_login, timestamps

tontines (20 colonnes)
  ├─ id (PK)
  ├─ name, description
  ├─ amount, frequency (enum)
  ├─ max_members, current_members
  ├─ status (active/pending/closed/paused)
  ├─ start_date, current_tour, total_tours
  ├─ pot, invite_code
  ├─ require_approval, public_log, random_order, penalties
  ├─ created_by (FK → users)
  └─ timestamps

memberships (8 colonnes)
  ├─ id (PK)
  ├─ tontine_id (FK)
  ├─ user_id (FK)
  ├─ role (admin/member)
  ├─ status (active/pending/rejected/left)
  ├─ tour_order
  └─ timestamps

payments (13 colonnes)
  ├─ id (PK)
  ├─ tontine_id, user_id, recorded_by (FK)
  ├─ tour, amount
  ├─ status (paid/pending/late/cancelled)
  ├─ penalty, notes
  └─ timestamps

disbursements (9 colonnes)
  ├─ id (PK)
  ├─ tontine_id, user_id, disbursed_by (FK)
  ├─ tour, amount, notes
  └─ timestamps

audit_log (10 colonnes)
  ├─ tontine_id, user_id
  ├─ action_type, action, detail
  ├─ ip_address, user_agent
  └─ created_at

notifications (7 colonnes)
  ├─ user_id, tontine_id
  ├─ type, title, body
  ├─ is_read
  └─ created_at
```

---

## 🔐 Sécurité

### Authentication
- ✅ Passwords hachés en BCRYPT (cost=12)
- ✅ JWT tokens (7 jours expiry)
- ✅ Login attempts limit (5 tentatives)
- ✅ SQL injections prevented (prepared statements)
- ✅ XSS protection (JSON encoding)

### À Implémenter
- ⚠️ 2FA (SMS ou authenticator)
- ⚠️ Email verification
- ⚠️ Rate limiting
- ⚠️ HTTPS enforcement
- ⚠️ CORS restrictions

---

## 📡 API Endpoints

### Auth (6)
- `POST /api.php?action=register` — Créer compte
- `POST /api.php?action=login` — Se connecter
- `POST /api.php?action=demo` — Mode démo
- `POST /api.php?action=logout` — Déconnexion
- `POST /api.php?action=changePassword` — Changer MDP
- `GET /api.php?action=health` — Vérifier statut

### Profile (1)
- `POST /api.php?action=updateProfile` — Modifier profil

### Tontines (5)
- `GET /api.php?action=getTontines` — Lister mes tontines
- `GET /api.php?action=getTontine` — Détail tontine
- `POST /api.php?action=createTontine` — Créer tontine
- `GET /api.php?action=searchTontine` — Rechercher par code
- `POST /api.php?action=updateTontine` — Modifier (admin)

### Memberships (2)
- `POST /api.php?action=joinTontine` — Rejoindre/Demander
- `POST /api.php?action=approveMember` — Approuver (admin)

### Payments (3)
- `POST /api.php?action=recordPayment` — Enregistrer paiement
- `POST /api.php?action=nextTour` — Lancer prochain tour (admin)
- `GET /api.php?action=getTransactions` — Historique transactions

### Invitations (2)
- `POST /api.php?action=sendInvite` — Envoyer invitation (admin)
- `GET /api.php?action=getInvitations` — Récupérer invitations

### Audit & Notifications (4)
- `GET /api.php?action=getGlobalLog` — Journal global
- `GET /api.php?action=getNotifications` — Notifications
- `POST /api.php?action=markNotificationsRead` — Marquer lues
- `GET /api.php?action=getStats` — Statistiques

### Admin (1)
- `POST /api.php?action=sendReminder` — Envoyer rappel (admin)

**Total : 25+ endpoints fonctionnels**

---

## 🎨 Frontend Architecture

### Pages (12)
```
1. auth             → Login/Register
2. dashboard        → Vue d'ensemble
3. my-tontines      → Mes tontines (filtrable)
4. tontine-detail   → Détail + 4 tabs (overview, members, payments, log)
5. create-tontine   → Créer tontine (3 sections)
6. join-tontine     → Rejoindre (code + invitations)
7. profile          → Mon profil
8. settings         → Paramètres (thème, notif, sécu)
9. transactions     → Historique paiements
10. audit-log       → Journal audit complet
11. invite          → Inviter amis (email + partage)
12. (splash)        → Écran de démarrage (PWA)
```

### State Management
```javascript
const App = {
  currentPage,
  currentUser,
  currentTontine,
  settings: { theme, fontSize, notifications, security },
  demoData: { users, tontines, transactions, ... }
}
```

### Key Modules
- `Auth` — Login/Register
- `Nav` — Navigation + History
- `Dashboard` — Vue d'ensemble
- `MyTontines` — Lister + filtrer
- `TontineDetail` — Détail + actions
- `CreateTontine` — Création
- `JoinTontine` — Rejoindre
- `Profile` — Profil utilisateur
- `Settings` — Préférences
- `Transactions` — Historique
- `AuditLog` — Journal complet
- `Invite` — Invitations
- `UI` — Helpers (formatting, modales, toasts)
- `Modal` — Modales génériques
- `Toast` — Notifications temporaires
- `Storage` — LocalStorage wrapper

### Styling
- **5 Thèmes CSS** : emerald, ocean, sunset, midnight, gold
- **Responsive design** : Mobile-first
- **Dark mode ready**
- **Fonts** : Sora (UI) + JetBrains Mono (code)

---

## 🚀 Performance

### Frontend
- ✅ Single page app (SPA) — pas de rechargement
- ✅ 50KB CSS optimisé
- ✅ 55KB JavaScript compressé
- ✅ PWA installable
- ✅ Offline demo mode

### Backend
- ✅ Prepared statements (PDO)
- ✅ Indexes sur FK et filtres courants
- ✅ Lazy loading members/transactions
- ✅ Limit 50 par requête par défaut

### À Optimiser
- ⚠️ Ajouter caching (Redis)
- ⚠️ Minifier JavaScript
- ⚠️ Gzip compression
- ⚠️ CDN pour assets

---

## 🧪 Testing

### À Implémenter
```bash
phpunit                          # Unit tests backend
npm test                         # Jest tests frontend
phpcs *.php                      # Code style check
```

### Scenarios à Tester
1. Créer tontine → Rejoindre → Payer → Recevoir cagnotte
2. Admin approuve/refuse membres
3. Pénalité paiement tardif
4. Fermeture tontine après tous tours
5. Audit trail immuable

---

## 📚 Technologies

| Layer | Tech | Version |
|-------|------|---------|
| Frontend | HTML5 + Vanilla JS | ES6+ |
| Styling | CSS3 | 3.0 |
| Backend | PHP | 7.4+ / 8.0+ |
| Database | MySQL | 5.7+ |
| Email | PHPMailer / SMTP | 6.8 |
| Auth | JWT | Custom |
| PWA | Service Worker | Native |

---

## 📊 Modèle Métier

**Tontine = Groupe d'épargne collective**

1. **Création** : Admin crée, invite membres
2. **Tours** : Chaque tour, tous paient montant fixe
3. **Cagnotte** : Total = montant × nombre membres
4. **Bénéficiaire** : À chaque tour, un membre reçoit la cagnotte
5. **Ordre** : Peuvent être séquentiels ou aléatoires
6. **Fermeture** : Après N tours (1 tour par membre)

**Exemple :**
```
Tontine: "Famille Koffi"
- Montant: 25,000 FCFA/mois
- Membres: 8
- Cagnotte par tour: 200,000 FCFA
- Tours: 8 (8 mois)
- Bénéficiaires: Marie (T1), Jean (T2), ..., Awa (T8)
```

---

## 🎯 Roadmap

### ✅ V1.0 (Current)
- Frontend complet
- Backend API
- DB + Auth
- PWA

### 🔄 V1.1 (In Progress)
- [ ] Configuration .env
- [ ] Email service
- [ ] Deployment guide

### 🚀 V1.2 (Soon)
- [ ] Mobile Money
- [ ] SMS notifications
- [ ] 2FA

### 🌟 V2.0 (Future)
- [ ] Mobile app (React Native)
- [ ] Admin dashboard
- [ ] Webhooks
- [ ] API publique
- [ ] Multi-langue
- [ ] Analytics

---

**Dernière mise à jour : 2025-07-02**
