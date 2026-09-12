# 🌿 Tontines Facile

[![PHP](https://img.shields.io/badge/PHP-8.1+-777BB4?logo=php&logoColor=white)](https://www.php.net/)
[![MySQL](https://img.shields.io/badge/MySQL-5.7+-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?logo=vercel)](https://vercel.com/)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?logo=pwa)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Application web PWA de gestion de tontines** — transparente, sécurisée, accessible hors-ligne.  
Gérez vos épargnes collectives avec vos famille, amis et collègues partout en Afrique de l'Ouest.

🔗 **Démo en ligne** : [tontine-iota.vercel.app](https://tontine-iota.vercel.app)

---

## ✨ Fonctionnalités

### 💰 Gestion des tontines
- Créer, modifier et fermer des tontines
- Invitations par email ou code partageable
- Approbation des membres (optionnelle)
- Gestion des tours et des bénéficiaires
- Suivi des dettes et pénalités

### 💳 Paiements
- Enregistrement manuel des paiements (par l'admin)
- Déclaration de paiement par les membres avec capture d'écran
- **Mobile Money** (MTN, Orange, Wave, Moov, M-Pesa, et plus) — 12 pays supportés
- Export CSV des transactions

### 📣 Notifications & Communication
- Notifications in-app en temps réel (Server-Sent Events)
- **Rappels par email** (via Brevo — 300 emails/jour gratuits)
- **Rappels par SMS** (Twilio / Africa's Talking / Termii)
- Push notifications (PWA)
- Chat intégré : 1-à-1 et groupes par tontine

### 👤 Comptes utilisateurs
- Inscription, connexion sécurisée (BCRYPT cost=12)
- Authentification par token (7 jours)
- Blocage temporel après 5 tentatives échouées (30 min)
- Réinitialisation de mot de passe par email
- Photo de profil personnalisée

### 🔐 Sécurité
| Mesure | Détail |
|--------|--------|
| Mots de passe | BCRYPT (cost=12) |
| Sessions | Tokens opaques 64 hex-chars |
| Injections SQL | Prepared statements PDO |
| Rate limiting | 1 reset/5 min, 5 tentatives login |
| CORS | Restreint au domaine de prod |
| Headers | HSTS, X-Frame-Options, CSP |

### 📱 PWA
- Installation sur mobile (icône d'accueil)
- Mode hors-ligne avec données en cache
- Background sync des actions en attente
- Push notifications

---

## 🏗️ Architecture

```
Tontines/
├── index.html          ← Shell SPA
├── app.js              ← Frontend (navigation, state, UI)
├── improvements.js     ← Extensions UI (chat, contacts, avancé)
├── style.css           ← Styles + thèmes (emerald, ocean, sunset...)
├── sw.js               ← Service Worker (cache, push, sync)
├── vercel.json         ← Config déploiement + headers sécurité
├── .env.example        ← Template des variables d'environnement
├── api/
│   ├── api.php         ← Backend (35+ endpoints REST)
│   ├── Mailer.php      ← Emails HTML via Brevo API
│   ├── Sms.php         ← SMS (Twilio/AfricasTalking/Termii)
│   └── MobileMoney.php ← Infos Mobile Money multi-pays
└── config.php          ← Chargement .env + constantes
```

### Stack technique
| Couche | Technologie |
|--------|-------------|
| Frontend | HTML5 + Vanilla JS ES6+ + CSS3 |
| Backend | PHP 8.1+ |
| Base de données | MySQL 5.7+ / TiDB Cloud |
| Auth | Token opaque (64 hex) |
| Email | Brevo API (ex-Sendinblue) |
| SMS | Twilio / Africa's Talking / Termii |
| Déploiement | Vercel (serverless PHP) |
| PWA | Service Worker + Web Push |

---

## 🚀 Installation

### Prérequis
- PHP 8.1+
- MySQL 5.7+ (ou TiDB Cloud)
- Compte [Brevo](https://www.brevo.com) (gratuit, 300 emails/jour)

### Installation locale

```bash
# 1. Cloner le repo
git clone https://github.com/aboubakariut/Tontine.git
cd Tontine

# 2. Configurer l'environnement
cp .env.example .env
# → Éditer .env avec vos vraies valeurs

# 3. Créer la base de données MySQL
mysql -u root -p -e "CREATE DATABASE tontines_facile CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 4. Lancer le serveur de développement
php -S localhost:8000

# 5. Ouvrir dans le navigateur
open http://localhost:8000
```

> Les tables MySQL sont créées automatiquement lors du premier appel à l'API.

### Variables d'environnement

Voir [`.env.example`](.env.example) pour la liste complète. Variables essentielles :

```env
DB_HOST=localhost
DB_USER=root
DB_PASS=your_password
DB_NAME=tontines_facile
JWT_SECRET=your-long-random-secret-min-32-chars
APP_URL=http://localhost:8000
BREVO_API_KEY=your_brevo_api_key
```

### Déploiement Vercel

```bash
# Installer Vercel CLI
npm i -g vercel

# Déployer
vercel --prod

# Définir les variables d'environnement dans le dashboard Vercel
# Project Settings > Environment Variables
```

---

## 📡 API Reference

L'API est accessible via `POST /api/api.php` avec un body JSON `{ "action": "...", ...params }`.

### Auth
| Action | Description |
|--------|-------------|
| `register` | Créer un compte |
| `login` | Connexion |
| `demo` | Mode démo |
| `logout` | Déconnexion |
| `changePassword` | Modifier le mot de passe |
| `forgotPassword` | Demande reset par email |
| `resetPassword` | Réinitialiser avec le token |

### Tontines
| Action | Description |
|--------|-------------|
| `createTontine` | Créer une tontine |
| `getTontines` | Mes tontines |
| `getTontine` | Détails d'une tontine |
| `searchTontine` | Rechercher par code |
| `updateTontine` | Modifier (admin) |
| `closeTontine` | Fermer (admin) |
| `deleteTontine` | Supprimer définitivement (admin) |

### Paiements
| Action | Description |
|--------|-------------|
| `recordPayment` | Valider un paiement (admin) |
| `declarePayment` | Déclarer avoir payé (membre) |
| `rejectPayment` | Rejeter une déclaration (admin) |
| `nextTour` | Passer au tour suivant (admin) |
| `settleDebt` | Régler une dette (admin) |
| `getTransactions` | Historique des transactions |
| `exportData` | Export CSV |

### Membres
| Action | Description |
|--------|-------------|
| `joinTontine` | Rejoindre une tontine |
| `approveMember` | Approuver/rejeter (admin) |
| `addMemberDirect` | Ajouter directement (admin) |
| `updateMemberRole` | Changer rôle (admin) |
| `removeMember` | Retirer un membre (admin) |
| `getPendingMembers` | Demandes en attente (admin) |

### Mobile Money
| Action | Description |
|--------|-------------|
| `updateTontineMomo` | Configurer numéro MoMo (admin) |
| `getMomoInfo` | Instructions de paiement |

### Autres
| Action | Description |
|--------|-------------|
| `sendInvite` | Invitation par email |
| `getInvitations` | Invitations reçues |
| `sendReminder` | Rappels email+SMS (admin) |
| `getNotifications` | Notifications |
| `markNotificationsRead` | Marquer comme lues |
| `getGlobalLog` | Journal d'audit (paginé) |
| `getStats` | Statistiques |
| `health` | Health check |

---

## 🗺️ Roadmap

- ✅ **V1.0** — Frontend SPA + Backend PHP + Auth JWT + DB MySQL
- ✅ **V1.1** — Email (Brevo), invitations, rappels, audit log, chat, contacts
- 🔄 **V1.2** — SMS (Twilio/AT/Termii), Mobile Money multi-pays, Export CSV *(en cours)*
- 🚀 **V1.3** — 2FA (TOTP + SMS), tableau de bord admin global
- 🌟 **V2.0** — Application mobile React Native

---

## 🤝 Contribuer

1. Fork le projet
2. Créer une branche : `git checkout -b feature/ma-fonctionnalite`
3. Commiter : `git commit -m 'feat: ajouter ma fonctionnalité'`
4. Pousser : `git push origin feature/ma-fonctionnalite`
5. Ouvrir une Pull Request

---

## 📄 Licence

MIT — voir [LICENSE](LICENSE)

---

*Fait avec ❤️ pour les communautés d'Afrique de l'Ouest*
