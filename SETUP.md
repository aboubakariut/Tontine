# 🚀 Guide d'Installation — Tontines Facile

## Prérequis

- **PHP** 7.4+
- **MySQL** 5.7+
- **Composer** (optionnel mais recommandé)

## 📦 Installation Rapide

### 1. Cloner le Repo
```bash
git clone https://github.com/aboubakariut/Tontine.git
cd Tontine
```

### 2. Créer la Base de Données
```sql
CREATE DATABASE tontines_facile CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Configuration Environnement
```bash
cp .env.example .env
nano .env
```

### 4. Installer les Dépendances
```bash
composer install
```

### 5. Lancer le Serveur
```bash
php -S localhost:8000
```

### 6. Accéder à l'Application
```
http://localhost:8000/index.html
```

## ⚙️ Configuration Variables

### Sécurité
```bash
# Générer une clé sécurisée
php -r "echo bin2hex(random_bytes(32));"
```

### Email SMTP (Gmail)
1. Aller sur : https://myaccount.google.com/apppasswords
2. Générer un mot de passe d'application
3. Remplir dans .env :
```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=votre-email@gmail.com
MAIL_PASSWORD=votre-password-app
```

## 🆘 Troubleshooting

### Erreur DB
```bash
sudo service mysql status
```

### Tester Email
```php
require 'Mailer.php';
Mailer::sendVerification('test@example.com', 'Test', 'https://example.com');
```

## 📚 Documentation
- **ARCHITECTURE.md** - Architecture technique détaillée
- **README.md** - Documentation générale
- **.env.example** - Variables disponibles

**Bon développement ! 🚀**
