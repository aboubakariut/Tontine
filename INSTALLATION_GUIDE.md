# 🚀 GUIDE COMPLET - Configuration Tontines Facile

## 📋 Table des matières
1. [Prérequis](#prérequis)
2. [Étape 1 : Cloner le projet](#étape-1--cloner-le-projet)
3. [Étape 2 : Créer la base de données](#étape-2--créer-la-base-de-données)
4. [Étape 3 : Configurer les variables d'environnement](#étape-3--configurer-les-variables-denvironnement)
5. [Étape 4 : Installer les dépendances PHP](#étape-4--installer-les-dépendances-php)
6. [Étape 5 : Démarrer le serveur](#étape-5--démarrer-le-serveur)
7. [Étape 6 : Tester l'application](#étape-6--tester-lapplication)

---

## ✅ Prérequis

Avant de commencer, assurez-vous d'avoir installé :

- **PHP 7.4+** (vérifier : `php --version`)
- **MySQL 5.7+** (vérifier : `mysql --version`)
- **Composer** (optionnel mais recommandé) - vérifier : `composer --version`
- **Git** (vérifier : `git --version`)

### ⚠️ Si vous n'avez pas MySQL

**Option A : Installer MySQL localement**
- **Windows** : https://dev.mysql.com/downloads/mysql/
- **Mac** : `brew install mysql` puis `brew services start mysql`
- **Linux** : `sudo apt install mysql-server`

**Option B : Utiliser XAMPP/WAMP/MAMP** (tout inclus)
- Windows : https://www.apachefriends.org/
- Mac : https://www.mamp.info/
- Linux : Installer via apt

**Démarrer MySQL** :
```bash
# Windows (XAMPP) : voir le Control Panel
# Mac
brew services start mysql

# Linux
sudo service mysql start
```

---

## 🔧 ÉTAPE 1 : Cloner le projet

Aller dans le dossier où vous voulez travailler et exécuter :

```bash
git clone https://github.com/aboubakariut/Tontine.git
cd Tontine
```

Vérifier les fichiers présents :
```bash
ls -la
# Vous devez voir : index.html, app.js, style.css, api.php, config.php, .env.example, etc.
```

---

## 💾 ÉTAPE 2 : Créer la base de données

### 2.1 - Ouvrir MySQL

```bash
# Connexion à MySQL (on vous demande le mot de passe, laissez vide si c'est root sans MDP)
mysql -u root -p

# Ou si pas de mot de passe
mysql -u root
```

### 2.2 - Créer la base de données

Une fois connecté à MySQL (vous voyez `mysql>`), exécutez :

```sql
CREATE DATABASE tontines_facile CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**Résultat attendu :**
```
Query OK, 1 row affected (0.01 sec)
```

### 2.3 - Vérifier la création

```sql
SHOW DATABASES;
```

Vous devez voir `tontines_facile` dans la liste.

### 2.4 - Quitter MySQL

```sql
EXIT;
```

---

## 🔐 ÉTAPE 3 : Configurer les variables d'environnement

### 3.1 - Copier le fichier template

À la racine du projet (`Tontine/`), exécutez :

```bash
cp .env.example .env
```

Cela crée un fichier `.env` avec les valeurs par défaut.

### 3.2 - Éditer le fichier `.env`

Ouvrir le fichier `.env` avec votre éditeur préféré (VS Code, Sublime, Notepad++, etc.)

**Exemple de contenu complet :**

```env
# ═════════════════════════════════════════════════════════
# DATABASE
# ═════════════════════════════════════════════════════════
DB_HOST=localhost
DB_NAME=tontines_facile
DB_USER=root
DB_PASS=
DB_CHARSET=utf8mb4

# ═════════════════════════════════════════════════════════
# SECURITY
# ═════════════════════════════���═══════════════════════════
JWT_SECRET=your_generated_secret_key_here_min_32_chars_1234567890
APP_ENV=development
APP_DEBUG=true

# ═════════════════════════════════════════════════════════
# EMAIL (SMTP) - OPTIONNEL POUR MAINTENANT
# ═════════════════════════════════════════════════════════
MAIL_DRIVER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM_ADDRESS=noreply@tontinesfacile.app
MAIL_FROM_NAME="Tontines Facile"

# ═════════════════════════════════════════════════════════
# MOBILE MONEY - OPTIONNEL POUR MAINTENANT
# ═════════════════════════════════════════════════════════
MOBILE_MONEY_PROVIDER=
MOBILE_MONEY_API_KEY=
MOBILE_MONEY_API_SECRET=
MOBILE_MONEY_MERCHANT_ID=

# ════════════��════════════════════════════════════════════
# SMS - OPTIONNEL POUR MAINTENANT
# ═════════════════════════════════════════════════════════
SMS_PROVIDER=
SMS_ACCOUNT_SID=
SMS_AUTH_TOKEN=
SMS_FROM_NUMBER=

# ═════════════════════════════════════════════════════════
# APP
# ═════════════════════════════════════════════════════════
APP_VERSION=1.0.0
APP_URL=http://localhost:8000
APP_NAME=Tontines Facile

# ═════════════════════════════════════════════════════════
# LIMITS
# ═════════════════════════════════════════════════════════
MAX_LOGIN_ATTEMPTS=5
TOKEN_EXPIRY=604800
INVITE_EXPIRY_DAYS=7
PASSWORD_MIN_LENGTH=8

# ═════════════════════════════════════════════════════════
# FEATURES
# ═════════════════════════════════════════════════════════
FEATURE_2FA=false
FEATURE_EMAIL_VERIFICATION=false
FEATURE_MOBILE_MONEY=false
FEATURE_PUSH_NOTIFICATIONS=true
```

### 3.3 - Générer une clé JWT_SECRET sécurisée

Exécutez cette commande PHP pour générer une clé sécurisée :

```bash
php -r "echo bin2hex(random_bytes(32)) . PHP_EOL;"
```

**Résultat attendu :**
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0
```

### 3.4 - Remplacer dans `.env`

Remplacez la ligne :
```env
JWT_SECRET=your_generated_secret_key_here_min_32_chars_1234567890
```

Par :
```env
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0
```

### 3.5 - Vérifier `.env`

Votre fichier `.env` final devrait ressembler à ça :

```env
DB_HOST=localhost
DB_NAME=tontines_facile
DB_USER=root
DB_PASS=
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0
APP_ENV=development
APP_DEBUG=true
MAIL_DRIVER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_FROM_ADDRESS=noreply@tontinesfacile.app
...
```

✅ **Sauvegardez le fichier !**

---

## 📦 ÉTAPE 4 : Installer les dépendances PHP

### 4.1 - Vérifier Composer

```bash
composer --version
```

Si Composer n'est pas installé, télécharger depuis : https://getcomposer.org/download/

### 4.2 - Installer les dépendances

À la racine du projet (`Tontine/`), exécutez :

```bash
composer install
```

**Cela installe :**
- PHPMailer (pour envoyer des emails)
- Firebase JWT (pour les tokens d'authentification)
- PHPUnit (pour les tests)

**Résultat attendu :**
```
Loading composer repositories with package definitions
Updating dependencies
...
Installing dependencies from lock file (or downloading...)
...
✓ Installed successfully
```

### 4.3 - Vérifier l'installation

Vérifier que le dossier `vendor/` a été créé :

```bash
ls -la vendor/
# Vous devez voir : phpmailer, firebase, etc.
```

---

## 🚀 ÉTAPE 5 : Démarrer le serveur

### 5.1 - Lancer PHP server

À la racine du projet (`Tontine/`), exécutez :

```bash
php -S localhost:8000
```

**Résultat attendu :**
```
Development Server (http://localhost:8000) started
```

🎉 **Le serveur est maintenant actif !**

---

## 🧪 ÉTAPE 6 : Tester l'application

### 6.1 - Test 1 : Vérifier la santé du backend

Ouvrir dans le navigateur ou Postman :

```
http://localhost:8000/api.php?action=health
```

**Résultat attendu :**
```json
{
  "success": true,
  "version": "1.0.0",
  "data": {
    "status": "ok",
    "version": "1.0.0",
    "db": "connected",
    "datetime": "2025-07-02 20:15:30",
    "php_version": "7.4.3",
    "features": [
      "push",
      "email",
      "audit"
    ]
  },
  "message": ""
}
```

✅ **Si vous voyez ça, la base de données est connectée !**

### 6.2 - Test 2 : Accéder à l'application frontend

Ouvrir dans le navigateur :

```
http://localhost:8000/index.html
```

Vous devez voir l'écran de login avec deux options :
- **Créer un compte** (Sign up)
- **Mode démo** (Demo mode)

### 6.3 - Test 3 : Mode démo

Cliquez sur **"Mode Démo"** pour activer le compte de test :

```
Email: demo@tontinesfacile.app
Password: Demo@2025
```

✅ **Vous êtes connecté et voyez le dashboard !**

### 6.4 - Test 4 : Créer un compte

1. Cliquez sur **"Créer un compte"**
2. Remplissez le formulaire :
   - Prénom : Test
   - Nom : User
   - Email : test@example.com
   - Mot de passe : Password123
3. Cliquez sur **"S'inscrire"**

✅ **Un nouveau compte est créé et vous êtes connecté !**

---

## ❌ Troubleshooting

### Erreur : "Connexion DB échouée"

**Cause :** MySQL n'est pas lancé ou les credentials sont mauvais.

**Solution :**
```bash
# Vérifier que MySQL est running
mysql -u root -p
# Si ça marche, MySQL est ok

# Vérifier les credentials dans .env
cat .env | grep DB_
```

### Erreur : "Action manquante"

**Cause :** API appelée sans action.

**Solution :**
```
http://localhost:8000/api.php?action=health
# ✓ Bon

http://localhost:8000/api.php
# ✗ Mauvais
```

### Erreur : "Table 'users' doesn't exist"

**Cause :** Les tables ne sont pas créées.

**Solution :** Aller à http://localhost:8000/api.php?action=health
- Cela crée automatiquement les tables à la première connexion

### Erreur : "Class 'PHPMailer' not found"

**Cause :** Composer n'a pas été exécuté.

**Solution :**
```bash
composer install
```

### Port 8000 déjà utilisé

**Cause :** Un autre service utilise le port 8000.

**Solution :** Utiliser un autre port
```bash
php -S localhost:8001
# Puis accéder à http://localhost:8001/index.html
```

---

## 📝 Résumé des fichiers importants

| Fichier | Rôle |
|---------|------|
| `.env` | Variables d'environnement (⚠️ **NE PAS COMMITTER**) |
| `config.php` | Charge `.env` et expose les constantes |
| `api.php` | Backend API (tous les endpoints) |
| `index.html` | Frontend principal |
| `app.js` | Logique JavaScript (55KB) |
| `style.css` | Styles et thèmes (50KB) |
| `Mailer.php` | Service d'emails |

---

## ✅ Checklist finale

- [ ] MySQL installé et running
- [ ] Base de données `tontines_facile` créée
- [ ] Fichier `.env` copié et configuré
- [ ] `JWT_SECRET` généré et renseigné
- [ ] Composer dependencies installées (`vendor/` existe)
- [ ] Serveur PHP lancé (`php -S localhost:8000`)
- [ ] Health check réussit (action=health)
- [ ] Frontend accessible (index.html)
- [ ] Mode démo fonctionne
- [ ] Création de compte fonctionne

**Quand tout est vert ✅, vous êtes prêt à développer !**

---

## 📞 Support

Si vous avez des problèmes :

1. Vérifiez les logs :
   ```bash
   tail -f /var/log/php-fpm.log  # Linux
   # Ou voir les erreurs dans le navigateur (Dev Tools F12)
   ```

2. Ouvrir une issue : https://github.com/aboubakariut/Tontine/issues

3. Consulter la documentation : Voir `SETUP.md` et `ARCHITECTURE.md`

---

**Bienvenue dans Tontines Facile ! 🎉**
