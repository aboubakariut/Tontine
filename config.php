<?php
/**
 * ═════════════════════════════════════════════════════════════════
 * TONTINES FACILE — Configuration Centralisée
 * Charge les variables depuis .env et les expose à l'API
 * ═════════════════════════════════════════════════════════════════
 */

declare(strict_types=1);

/* ─── Charger fichier .env ─── */
function loadEnv(string $path = '.env'): void {
    if (!file_exists($path)) {
        // Si pas de .env, utiliser des valeurs par défaut (développement)
        return;
    }
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (str_starts_with($line, '#')) continue; // Ignorer commentaires
        if (strpos($line, '=') === false) continue;
        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value, " \t\"'");
        if (!$key || !$value) continue;
        putenv("$key=$value");
        $_ENV[$key] = $value;
    }
}

loadEnv(__DIR__ . '/.env');

/* ═════════════════════════════════════════════════════════════════
   CONFIG FINALE
   ═════════════════════════════════════════════════════════════════ */

// Database
define('DB_HOST',    getenv('DB_HOST') ?: 'localhost');
define('DB_NAME',    getenv('DB_NAME') ?: 'tontines_facile');
define('DB_USER',    getenv('DB_USER') ?: 'root');
define('DB_PASS',    getenv('DB_PASS') ?: '');
define('DB_CHARSET', getenv('DB_CHARSET') ?: 'utf8mb4');

// Security
define('JWT_SECRET',        getenv('JWT_SECRET') ?: 'TontinesFacile_S3cr3t_K3y_2025!');
define('APP_ENV',           getenv('APP_ENV') ?: 'development');
define('APP_DEBUG',         (bool) getenv('APP_DEBUG'));
define('PASSWORD_MIN_LENGTH', (int) (getenv('PASSWORD_MIN_LENGTH') ?: 8));
define('MAX_LOGIN_ATTEMPTS', (int) (getenv('MAX_LOGIN_ATTEMPTS') ?: 5));
define('TOKEN_EXPIRY',       (int) (getenv('TOKEN_EXPIRY') ?: 604800)); // 7 jours

// App
define('APP_VERSION', getenv('APP_VERSION') ?: '1.0.0');
define('APP_NAME',    getenv('APP_NAME') ?: 'Tontines Facile');
define('APP_URL',     getenv('APP_URL') ?: 'http://localhost');

// Email
define('MAIL_DRIVER',        getenv('MAIL_DRIVER') ?: 'smtp');
define('MAIL_HOST',          getenv('MAIL_HOST') ?: 'smtp.gmail.com');
define('MAIL_PORT',          (int) (getenv('MAIL_PORT') ?: 587));
define('MAIL_USERNAME',      getenv('MAIL_USERNAME') ?: '');
define('MAIL_PASSWORD',      getenv('MAIL_PASSWORD') ?: '');
define('MAIL_FROM_ADDRESS',  getenv('MAIL_FROM_ADDRESS') ?: 'noreply@tontinesfacile.app');
define('MAIL_FROM_NAME',     getenv('MAIL_FROM_NAME') ?: APP_NAME);

// Mobile Money
define('MOBILE_MONEY_PROVIDER',   getenv('MOBILE_MONEY_PROVIDER') ?: '');
define('MOBILE_MONEY_API_KEY',    getenv('MOBILE_MONEY_API_KEY') ?: '');
define('MOBILE_MONEY_API_SECRET', getenv('MOBILE_MONEY_API_SECRET') ?: '');

// SMS
define('SMS_PROVIDER',      getenv('SMS_PROVIDER') ?: '');
define('SMS_ACCOUNT_SID',   getenv('SMS_ACCOUNT_SID') ?: '');
define('SMS_AUTH_TOKEN',    getenv('SMS_AUTH_TOKEN') ?: '');
define('SMS_FROM_NUMBER',   getenv('SMS_FROM_NUMBER') ?: '');

// Features
define('FEATURE_2FA',                  (bool) getenv('FEATURE_2FA'));
define('FEATURE_EMAIL_VERIFICATION',  (bool) getenv('FEATURE_EMAIL_VERIFICATION'));
define('FEATURE_MOBILE_MONEY',        (bool) getenv('FEATURE_MOBILE_MONEY'));
define('FEATURE_PUSH_NOTIFICATIONS',  (bool) getenv('FEATURE_PUSH_NOTIFICATIONS'));

// Expirations
define('INVITE_EXPIRY_DAYS', (int) (getenv('INVITE_EXPIRY_DAYS') ?: 7));
define('INVITE_EXPIRY',      "+{INVITE_EXPIRY_DAYS} days");

/* ─── Mode production stricte ─── */
if (APP_ENV === 'production') {
    error_reporting(0);
    ini_set('display_errors', '0');
    ini_set('log_errors', '1');
} else {
    error_reporting(E_ALL);
    ini_set('display_errors', APP_DEBUG ? '1' : '0');
}

return true;
