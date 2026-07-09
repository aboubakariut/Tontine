<?php
/* ══════════════════════════════════════════════════════════════════
   TONTINES FACILE — api.php
   Backend PHP : Auth, Tontines, Paiements, Journal d'audit
   ══════════════════════════════════════════════════════════════════ */

declare(strict_types=1);

/* ─── CONFIGURATION (variables d'environnement Vercel / .env) ─── */

/* En local (php -S, etc.) il n'y a pas de variables d'env Vercel :
   on charge le fichier .env à la racine du projet s'il existe.
   Sur Vercel, ce fichier n'est pas présent (ou pas déployé) et les
   vraies variables d'environnement définies dans le dashboard prennent le relai. */
if (!function_exists('tf_load_dotenv')) {
    function tf_load_dotenv(string $path): void {
        if (!is_file($path)) return;
        foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) continue;
            [$key, $value] = explode('=', $line, 2);
            $key   = trim($key);
            $value = trim(trim($value), " \t\"'");
            if ($key === '' || getenv($key) !== false) continue; // ne pas écraser une vraie var d'env déjà définie
            putenv("$key=$value");
            $_ENV[$key] = $value;
        }
    }
}
tf_load_dotenv(__DIR__ . '/../.env');

function env(string $key, string $default = ''): string {
    return $_ENV[$key] ?? getenv($key) ?: $default;
}

define('DB_HOST',          env('DB_HOST',    'localhost'));
define('DB_PORT',          env('DB_PORT',    '3306'));
define('DB_NAME',          env('DB_NAME',    'tontines_facile'));
define('DB_USER',          env('DB_USER',    'root'));
define('DB_PASS',          env('DB_PASS',    ''));
define('DB_CHARSET',       env('DB_CHARSET', 'utf8mb4'));
define('DB_SSL',           env('DB_HOST', 'localhost') !== 'localhost');
define('JWT_SECRET',       env('JWT_SECRET', 'change-this-secret-in-production'));
define('APP_VERSION',      '1.0.0');
define('APP_URL',          env('APP_URL',    'https://tontine-iota.vercel.app'));
define('VAPID_PUBLIC_KEY', env('VAPID_PUBLIC_KEY', ''));
define('SMTP_HOST',        env('SMTP_HOST',  ''));
define('SMTP_PORT',        (int) env('SMTP_PORT', '587'));
define('SMTP_USER',        env('SMTP_USER',  ''));
define('SMTP_PASS',        env('SMTP_PASS',  ''));
define('MAX_LOGIN_ATTEMPTS', 5);
define('TOKEN_EXPIRY',     86400 * 7); // 7 jours

/* ─── HEADERS ─── */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

/* ─── RESPONSE HELPER ─── */
function respond(bool $success, $data = null, string $message = '', int $code = 200): void {
    http_response_code($code);
    $out = ['success' => $success, 'version' => APP_VERSION];
    if ($data !== null) $out['data'] = $data;
    if ($message)       $out['message'] = $message;
    echo json_encode($out, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

function error(string $msg, int $code = 400): void { respond(false, null, $msg, $code); }
function success($data = null, string $msg = ''): void { respond(true, $data, $msg); }

/* ─── INPUT ─── */
$raw   = file_get_contents('php://input');
$input = json_decode($raw, true) ?? [];

/* Lire l'action depuis : POST JSON > GET param > query string parsée */
$action = trim($input['action'] ?? '');
if (!$action) {
    /* Vercel peut ne pas peupler $_GET correctement — on parse manuellement */
    $qs = $_SERVER['QUERY_STRING'] ?? '';
    parse_str($qs, $qsParams);
    $action = trim($_GET['action'] ?? $qsParams['action'] ?? $_REQUEST['action'] ?? '');
}

/* Health check rapide sans action (simple GET sur api.php) */
if (!$action && $_SERVER['REQUEST_METHOD'] === 'GET') {
    success([
        'status'   => 'ok',
        'version'  => APP_VERSION,
        'db'       => 'not_tested',
        'hint'     => 'Ajouter ?action=health pour tester la BD',
        'datetime' => date('Y-m-d H:i:s'),
    ]);
}

if (!$action) error('Action manquante — envoyez {action:"..."} en POST JSON ou ?action=... en GET', 400);

/* ══════════════════════════════════════════════════════════════════
   DATABASE
   ══════════════════════════════════════════════════════════════════ */
class DB {
    private static ?PDO $pdo = null;

    public static function get(): PDO {
        if (self::$pdo) return self::$pdo;
        try {
            $portStr = DB_PORT ? ';port='.DB_PORT : '';
            $dsn  = 'mysql:host='.DB_HOST.';dbname='.DB_NAME.';charset='.DB_CHARSET.$portStr;
            $opts = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];
            /* SSL pour TiDB Cloud (obligatoire) */
            if (DB_SSL) {
                $opts[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = false;
                foreach (['/etc/ssl/certs/ca-certificates.crt', '/etc/ssl/cert.pem', '/etc/pki/tls/certs/ca-bundle.crt'] as $ca) {
                    if (file_exists($ca)) { $opts[PDO::MYSQL_ATTR_SSL_CA] = $ca; break; }
                }
            }
            self::$pdo = new PDO($dsn, DB_USER, DB_PASS, $opts);

            /* La migration (CREATE TABLE ...) est coûteuse sur une base
               distante (TiDB) et n'a besoin de tourner qu'une seule fois.
               On vérifie d'abord si la table 'users' existe déjà avant
               de relancer tout le script de migration à chaque requête. */
            $exists = self::$pdo->query("SHOW TABLES LIKE 'users'")->fetch();
            if (!$exists) {
                self::migrate();
            }
            /* Migrations incrémentales : ajoute les nouvelles colonnes/tables
               (photo de profil, contacts, chat) sans jamais toucher aux données
               existantes, que la base soit neuve ou déjà en production. */
            self::migrateIncremental();
        } catch (PDOException $e) {
            error('Connexion DB échouée : ' . $e->getMessage(), 500);
        }
        return self::$pdo;
    }

    /* Ajoute une colonne seulement si elle n'existe pas encore (compatible
       MySQL/TiDB anciens qui ne supportent pas ADD COLUMN IF NOT EXISTS) */
    private static function addColumnIfMissing(string $table, string $column, string $definition): void {
        $pdo = self::$pdo;
        $stmt = $pdo->prepare(
            "SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?"
        );
        $stmt->execute([$table, $column]);
        if (!(int)$stmt->fetchColumn()) {
            $pdo->exec("ALTER TABLE `$table` ADD COLUMN `$column` $definition");
        }
    }

    public static function migrateIncremental(): void {
        $pdo = self::$pdo;

        /* ── Photo de profil ──
           Hébergement serverless (Vercel) = pas de disque persistant,
           on stocke donc l'image (déjà redimensionnée/compressée côté
           client) directement en base, encodée en base64. */
        self::addColumnIfMissing('users', 'avatar_photo', 'LONGTEXT NULL');

        /* ── Contacts ── */
        $pdo->exec("CREATE TABLE IF NOT EXISTS contacts (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            user_id     INT NOT NULL,
            contact_id  INT NOT NULL,
            status      ENUM('pending','accepted','blocked') DEFAULT 'pending',
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_pair (user_id, contact_id),
            FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (contact_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        /* ── Chat ── */
        $pdo->exec("CREATE TABLE IF NOT EXISTS conversations (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            is_group    TINYINT(1) DEFAULT 0,
            title       VARCHAR(120) NULL,
            created_by  INT NOT NULL,
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        $pdo->exec("CREATE TABLE IF NOT EXISTS conversation_participants (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            conversation_id INT NOT NULL,
            user_id         INT NOT NULL,
            last_read_at    DATETIME NULL,
            UNIQUE KEY uniq_conv_user (conversation_id, user_id),
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id)         REFERENCES users(id)         ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        $pdo->exec("CREATE TABLE IF NOT EXISTS messages (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            conversation_id INT NOT NULL,
            sender_id       INT NOT NULL,
            body            TEXT NOT NULL,
            created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
            FOREIGN KEY (sender_id)       REFERENCES users(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    }

    public static function migrate(): void {
        $pdo = self::$pdo;
        $pdo->exec("SET FOREIGN_KEY_CHECKS = 0");

        /* ── users ── */
        $pdo->exec("CREATE TABLE IF NOT EXISTS users (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            firstname   VARCHAR(60)  NOT NULL,
            lastname    VARCHAR(60)  NOT NULL,
            email       VARCHAR(120) NOT NULL UNIQUE,
            phone       VARCHAR(30),
            password    VARCHAR(255) NOT NULL,
            invite_code VARCHAR(20)  NOT NULL UNIQUE,
            avatar      VARCHAR(10)  DEFAULT '',
            role        VARCHAR(40)  DEFAULT 'Membre',
            is_active   TINYINT(1)   DEFAULT 1,
            login_attempts INT       DEFAULT 0,
            last_login  DATETIME,
            created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
            updated_at  DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        /* ── tokens ── */
        $pdo->exec("CREATE TABLE IF NOT EXISTS tokens (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            user_id    INT          NOT NULL,
            token      VARCHAR(255) NOT NULL UNIQUE,
            expires_at DATETIME     NOT NULL,
            created_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        /* ── tontines ── */
        $pdo->exec("CREATE TABLE IF NOT EXISTS tontines (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            name            VARCHAR(120) NOT NULL,
            description     TEXT,
            amount          DECIMAL(15,2) NOT NULL,
            frequency       ENUM('weekly','biweekly','monthly','quarterly') DEFAULT 'monthly',
            max_members     INT          DEFAULT 10,
            current_members INT          DEFAULT 1,
            status          ENUM('active','pending','closed','paused') DEFAULT 'active',
            start_date      DATE,
            current_tour    INT          DEFAULT 0,
            total_tours     INT          DEFAULT 0,
            pot             DECIMAL(15,2) DEFAULT 0,
            require_approval TINYINT(1)  DEFAULT 1,
            public_log      TINYINT(1)   DEFAULT 1,
            random_order    TINYINT(1)   DEFAULT 0,
            penalties       TINYINT(1)   DEFAULT 0,
            penalty_rate    DECIMAL(5,2) DEFAULT 0,
            invite_code     VARCHAR(20)  NOT NULL UNIQUE,
            created_by      INT          NOT NULL,
            next_payment_date DATE,
            created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP,
            updated_at      DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        /* ── memberships ── */
        $pdo->exec("CREATE TABLE IF NOT EXISTS memberships (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            tontine_id  INT NOT NULL,
            user_id     INT NOT NULL,
            role        ENUM('admin','member') DEFAULT 'member',
            status      ENUM('active','pending','rejected','left') DEFAULT 'pending',
            tour_order  INT DEFAULT 0,
            joined_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_membership (tontine_id, user_id),
            FOREIGN KEY (tontine_id) REFERENCES tontines(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        /* ── payments ── */
        $pdo->exec("CREATE TABLE IF NOT EXISTS payments (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            tontine_id  INT NOT NULL,
            user_id     INT NOT NULL,
            recorded_by INT NOT NULL,
            tour        INT NOT NULL,
            amount      DECIMAL(15,2) NOT NULL,
            status      ENUM('paid','pending','late','cancelled') DEFAULT 'pending',
            penalty     DECIMAL(15,2) DEFAULT 0,
            notes       TEXT,
            paid_at     DATETIME,
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tontine_id)  REFERENCES tontines(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id)     REFERENCES users(id),
            FOREIGN KEY (recorded_by) REFERENCES users(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        /* ── disbursements ── */
        $pdo->exec("CREATE TABLE IF NOT EXISTS disbursements (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            tontine_id  INT NOT NULL,
            user_id     INT NOT NULL,
            tour        INT NOT NULL,
            amount      DECIMAL(15,2) NOT NULL,
            disbursed_by INT NOT NULL,
            notes       TEXT,
            disbursed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tontine_id)   REFERENCES tontines(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id)      REFERENCES users(id),
            FOREIGN KEY (disbursed_by) REFERENCES users(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        /* ── invitations ── */
        $pdo->exec("CREATE TABLE IF NOT EXISTS invitations (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            tontine_id  INT NOT NULL,
            invited_by  INT NOT NULL,
            email       VARCHAR(120) NOT NULL,
            message     TEXT,
            token       VARCHAR(60)  NOT NULL UNIQUE,
            status      ENUM('pending','accepted','rejected','expired') DEFAULT 'pending',
            expires_at  DATETIME,
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tontine_id) REFERENCES tontines(id) ON DELETE CASCADE,
            FOREIGN KEY (invited_by) REFERENCES users(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        /* ── audit_log ── */
        $pdo->exec("CREATE TABLE IF NOT EXISTS audit_log (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            tontine_id  INT,
            user_id     INT,
            action_type ENUM('payment','admin','member','system','security') DEFAULT 'system',
            action      VARCHAR(120) NOT NULL,
            detail      TEXT,
            ip_address  VARCHAR(45),
            user_agent  VARCHAR(255),
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tontine_id) REFERENCES tontines(id) ON DELETE SET NULL,
            FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        /* ── notifications ── */
        $pdo->exec("CREATE TABLE IF NOT EXISTS notifications (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            user_id     INT NOT NULL,
            tontine_id  INT,
            type        VARCHAR(40) NOT NULL,
            title       VARCHAR(120) NOT NULL,
            body        TEXT,
            is_read     TINYINT(1) DEFAULT 0,
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (tontine_id) REFERENCES tontines(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        /* ── password_resets ── */
        $pdo->exec("CREATE TABLE IF NOT EXISTS password_resets (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            user_id    INT NOT NULL,
            token      VARCHAR(64) NOT NULL UNIQUE,
            expires_at DATETIME NOT NULL,
            used_at    DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        /* ── push_subscriptions ── */
        $pdo->exec("CREATE TABLE IF NOT EXISTS push_subscriptions (
            id           INT AUTO_INCREMENT PRIMARY KEY,
            user_id      INT NOT NULL,
            subscription TEXT NOT NULL,
            created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_user_sub (user_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
    }

    public static function q(string $sql, array $params = []): \PDOStatement {
        $stmt = self::get()->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }

    public static function row(string $sql, array $params = []): ?array {
        return self::q($sql, $params)->fetch() ?: null;
    }

    public static function rows(string $sql, array $params = []): array {
        return self::q($sql, $params)->fetchAll();
    }

    public static function insert(string $sql, array $params = []): int {
        self::q($sql, $params);
        return (int) self::get()->lastInsertId();
    }
}

/* ══════════════════════════════════════════════════════════════════
   AUTH HELPERS
   ══════════════════════════════════════════════════════════════════ */
class Auth {
    public static function generateToken(): string {
        return bin2hex(random_bytes(32));
    }

    public static function generateInviteCode(string $prefix = 'TF'): string {
        do {
            $code = $prefix . '-' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 6));
            $exists = DB::row("SELECT id FROM tontines WHERE invite_code = ?", [$code])
                   ?? DB::row("SELECT id FROM users WHERE invite_code = ?", [$code]);
        } while ($exists);
        return $code;
    }

    public static function createSession(int $userId): string {
        $token = self::generateToken();
        $expires = date('Y-m-d H:i:s', time() + TOKEN_EXPIRY);
        DB::insert("INSERT INTO tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
            [$userId, $token, $expires]);
        DB::q("UPDATE users SET last_login = NOW() WHERE id = ?", [$userId]);
        return $token;
    }

    public static function validateToken(string $token): ?array {
        if (!$token) return null;
        return DB::row(
            "SELECT u.* FROM users u
             JOIN tokens t ON t.user_id = u.id
             WHERE t.token = ? AND t.expires_at > NOW() AND u.is_active = 1",
            [$token]
        );
    }

    public static function requireAuth(array $input): array {
        $token = trim($input['token'] ?? '');
        $user = self::validateToken($token);
        if (!$user) error('Non authentifié. Veuillez vous connecter.', 401);
        return $user;
    }

    public static function requireAdmin(array $input, int $tontineId): array {
        $user = self::requireAuth($input);
        $m = DB::row(
            "SELECT * FROM memberships WHERE tontine_id = ? AND user_id = ? AND role = 'admin' AND status = 'active'",
            [$tontineId, $user['id']]
        );
        if (!$m) error('Accès refusé : vous n\'êtes pas administrateur de cette tontine.', 403);
        return $user;
    }

    public static function userToPublic(array $u): array {
        unset($u['password'], $u['login_attempts']);
        return $u;
    }
}

/* ══════════════════════════════════════════════════════════════════
   AUDIT
   ══════════════════════════════════════════════════════════════════ */
function audit(string $type, string $action, string $detail = '', ?int $userId = null, ?int $tontineId = null): void {
    DB::insert(
        "INSERT INTO audit_log (tontine_id, user_id, action_type, action, detail, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
            $tontineId, $userId, $type, $action, $detail,
            $_SERVER['REMOTE_ADDR'] ?? '',
            substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255)
        ]
    );
}

function notify(int $userId, string $type, string $title, string $body = '', ?int $tontineId = null): void {
    DB::insert(
        "INSERT INTO notifications (user_id, tontine_id, type, title, body) VALUES (?, ?, ?, ?, ?)",
        [$userId, $tontineId, $type, $title, $body]
    );
}

/* ══════════════════════════════════════════════════════════════════
   VALIDATION
   ══════════════════════════════════════════════════════════════════ */
function validate(array $rules, array $data): void {
    foreach ($rules as $field => $rule) {
        $val = $data[$field] ?? null;
        foreach (explode('|', $rule) as $r) {
            if ($r === 'required' && ($val === null || $val === ''))
                error("Le champ '$field' est obligatoire.");
            if (str_starts_with($r, 'min:') && strlen((string)$val) < (int)substr($r, 4))
                error("Le champ '$field' doit contenir au moins " . substr($r, 4) . " caractères.");
            if (str_starts_with($r, 'max:') && strlen((string)$val) > (int)substr($r, 4))
                error("Le champ '$field' ne peut dépasser " . substr($r, 4) . " caractères.");
            if ($r === 'email' && $val && !filter_var($val, FILTER_VALIDATE_EMAIL))
                error("L'adresse email '$field' est invalide.");
            if ($r === 'numeric' && $val !== null && !is_numeric($val))
                error("Le champ '$field' doit être numérique.");
            if (str_starts_with($r, 'minval:') && (float)$val < (float)substr($r, 7))
                error("La valeur minimale pour '$field' est " . substr($r, 7) . ".");
        }
    }
}

/* ══════════════════════════════════════════════════════════════════
   TONTINE HELPERS
   ══════════════════════════════════════════════════════════════════ */
function getTontineForUser(int $tontineId, int $userId): array {
    $t = DB::row("SELECT * FROM tontines WHERE id = ?", [$tontineId]);
    if (!$t) error('Tontine introuvable.', 404);
    $m = DB::row("SELECT * FROM memberships WHERE tontine_id = ? AND user_id = ? AND status = 'active'", [$tontineId, $userId]);
    if (!$m) error('Vous n\'êtes pas membre de cette tontine.', 403);
    $t['user_role'] = $m['role'];
    $t['user_order'] = $m['tour_order'];
    return $t;
}

function formatTontineResponse(array $t, int $userId): array {
    $t['amount'] = (float)$t['amount'];
    $t['pot']    = (float)$t['pot'];
    $t['badge']  = match($t['status']) {
        'active'  => 'badge-active',
        'pending' => 'badge-pending',
        default   => 'badge-closed'
    };
    $t['badge_text'] = match($t['status']) {
        'active'  => 'Actif',
        'pending' => 'En attente',
        'paused'  => 'Pausé',
        default   => 'Fermé'
    };

    /* ── Alias camelCase attendus par le frontend (app.js) ──
       Les colonnes SQL sont en snake_case, mais tout le JS lit
       currentMembers, maxMembers, inviteCode, etc. */
    $t['currentMembers']   = (int)($t['current_members'] ?? 0);
    $t['maxMembers']       = (int)($t['max_members'] ?? 0);
    $t['currentTour']      = (int)($t['current_tour'] ?? 0);
    $t['totalTours']       = (int)($t['total_tours'] ?? 0);
    $t['inviteCode']       = $t['invite_code'] ?? '';
    $t['nextPaymentDate']  = $t['next_payment_date'] ? date('d/m/Y', strtotime($t['next_payment_date'])) : '—';
    $t['badgeText']        = $t['badge_text'];
    $t['userRole']         = $t['user_role'] ?? null;

    /* Members */
    $members = DB::rows(
        "SELECT u.id, u.firstname, u.lastname, u.avatar, u.avatar_photo, m.role, m.tour_order,
                CONCAT(UPPER(LEFT(u.firstname,1)), UPPER(LEFT(u.lastname,1))) as initials
         FROM memberships m JOIN users u ON u.id = m.user_id
         WHERE m.tontine_id = ? AND m.status = 'active'
         ORDER BY m.tour_order ASC",
        [$t['id']]
    );

    /* Check payment status per member for current tour */
    foreach ($members as &$m) {
        $pay = DB::row(
            "SELECT status FROM payments WHERE tontine_id = ? AND user_id = ? AND tour = ?",
            [$t['id'], $m['id'], $t['current_tour']]
        );
        $m['paid'] = $pay && $m['status'] === 'paid';
        $m['name'] = $m['firstname'] . ' ' . $m['lastname'];
    }
    $t['members'] = $members;
    /* S'assurer que currentMembers reflète le nombre réel de membres actifs
       (utile juste après la création, avant toute mise à jour du compteur) */
    $t['currentMembers'] = count($members) ?: $t['currentMembers'];

    /* Next beneficiary */
    $bene = DB::row(
        "SELECT u.firstname, u.lastname FROM memberships m JOIN users u ON u.id = m.user_id
         WHERE m.tontine_id = ? AND m.tour_order = ?",
        [$t['id'], $t['current_tour']]
    );
    $t['next_beneficiary'] = $bene ? $bene['firstname'] . ' ' . substr($bene['lastname'], 0, 1) . '.' : '—';
    $t['nextBeneficiary']  = $t['next_beneficiary'];

    /* Log */
    $log = DB::rows(
        "SELECT al.action_type as type, al.action, al.detail,
                COALESCE(CONCAT(u.firstname,' ', LEFT(u.lastname,1),'.'), 'Système') as user,
                DATE_FORMAT(al.created_at, '%d/%m/%Y %H:%i') as time
         FROM audit_log al
         LEFT JOIN users u ON u.id = al.user_id
         WHERE al.tontine_id = ?
         ORDER BY al.created_at DESC LIMIT 20",
        [$t['id']]
    );
    $t['log'] = $log;

    return $t;
}

function computeNextPaymentDate(string $frequency, ?string $startDate): string {
    $date = $startDate ? new DateTime($startDate) : new DateTime();
    $now  = new DateTime();
    while ($date <= $now) {
        match($frequency) {
            'weekly'    => $date->modify('+1 week'),
            'biweekly'  => $date->modify('+2 weeks'),
            'quarterly' => $date->modify('+3 months'),
            default     => $date->modify('+1 month'),
        };
    }
    return $date->format('Y-m-d');
}

/* ══════════════════════════════════════════════════════════════════
   ROUTER
   ══════════════════════════════════════════════════════════════════ */
try {
    DB::get(); // Initialize DB & run migrations

    switch ($action) {

        /* ────────────────────────────────────
           AUTH: REGISTER
           ──────────────────────────────────── */
        case 'register': {
            validate([
                'firstname' => 'required|max:60',
                'lastname'  => 'required|max:60',
                'email'     => 'required|email',
                'password'  => 'required|min:8',
            ], $input);

            $email = strtolower(trim($input['email']));
            if (DB::row("SELECT id FROM users WHERE email = ?", [$email]))
                error('Un compte existe déjà avec cet email.');

            $inviteCode = Auth::generateInviteCode('TF');
            $avatar     = strtoupper(substr($input['firstname'], 0, 1) . substr($input['lastname'], 0, 1));
            $hash       = password_hash($input['password'], PASSWORD_BCRYPT, ['cost' => 12]);

            $uid = DB::insert(
                "INSERT INTO users (firstname, lastname, email, phone, password, invite_code, avatar)
                 VALUES (?, ?, ?, ?, ?, ?, ?)",
                [
                    trim($input['firstname']), trim($input['lastname']),
                    $email, trim($input['phone'] ?? ''),
                    $hash, $inviteCode, $avatar
                ]
            );

            $token = Auth::createSession($uid);
            $user  = Auth::userToPublic(DB::row("SELECT * FROM users WHERE id = ?", [$uid]));
            audit('security', 'Inscription', "Nouveau compte créé : $email", $uid);

            /* Email de bienvenue (best-effort, ne bloque jamais l'inscription) */
            require_once __DIR__ . '/Mailer.php';
            try { Mailer::sendWelcome($email, trim($input['firstname']), $inviteCode); } catch (Throwable $e) {}

            success(['user' => $user, 'token' => $token], 'Compte créé avec succès !');
        }

        /* ────────────────────────────────────
           AUTH: LOGIN
           ──────────────────────────────────── */
        case 'login': {
            validate(['email' => 'required', 'password' => 'required'], $input);

            $email = strtolower(trim($input['email']));
            $user  = DB::row("SELECT * FROM users WHERE email = ? OR phone = ?", [$email, $email]);

            if (!$user) error('Identifiants incorrects.');
            if (!$user['is_active']) error('Compte désactivé. Contactez le support.');
            if ($user['login_attempts'] >= MAX_LOGIN_ATTEMPTS)
                error('Compte temporairement bloqué. Réessayez dans 30 minutes.');

            if (!password_verify($input['password'], $user['password'])) {
                DB::q("UPDATE users SET login_attempts = login_attempts + 1 WHERE id = ?", [$user['id']]);
                error('Identifiants incorrects.');
            }

            DB::q("UPDATE users SET login_attempts = 0 WHERE id = ?", [$user['id']]);
            $token = Auth::createSession($user['id']);
            audit('security', 'Connexion', 'Connexion réussie', $user['id']);
            success(['user' => Auth::userToPublic($user), 'token' => $token], 'Bienvenue !');
        }

        /* ────────────────────────────────────
           AUTH: DEMO
           ──────────────────────────────────── */
        case 'demo': {
            $demo = DB::row("SELECT * FROM users WHERE email = ?", ['demo@tontinesfacile.app']);
            if (!$demo) {
                $code = 'TF-DEMO1';
                $hash = password_hash('Demo@2025', PASSWORD_BCRYPT);
                $uid  = DB::insert(
                    "INSERT INTO users (firstname,lastname,email,phone,password,invite_code,avatar,role)
                     VALUES (?,?,?,?,?,?,?,?)",
                    ['Demo','Utilisateur','demo@tontinesfacile.app','+225 07 00 00 00 00',$hash,$code,'DU','Démo']
                );
                $demo = DB::row("SELECT * FROM users WHERE id = ?", [$uid]);
            }
            $token = Auth::createSession($demo['id']);
            success(['user' => Auth::userToPublic($demo), 'token' => $token], 'Mode démo activé');
        }

        /* ────────────────────────────────────
           AUTH: LOGOUT
           ──────────────────────────────────── */
        case 'logout': {
            $token = trim($input['token'] ?? '');
            if ($token) DB::q("DELETE FROM tokens WHERE token = ?", [$token]);
            success(null, 'Déconnexion réussie.');
        }

        /* ────────────────────────────────────
           AUTH: CHANGE PASSWORD
           ──────────────────────────────────── */
        case 'changePassword': {
            $user = Auth::requireAuth($input);
            validate(['current' => 'required', 'newPassword' => 'required|min:8'], $input);
            if (!password_verify($input['current'], $user['password']))
                error('Mot de passe actuel incorrect.');
            $hash = password_hash($input['newPassword'], PASSWORD_BCRYPT, ['cost' => 12]);
            DB::q("UPDATE users SET password = ? WHERE id = ?", [$hash, $user['id']]);
            audit('security', 'Changement de mot de passe', '', $user['id']);
            success(null, 'Mot de passe modifié avec succès.');
        }

        /* ────────────────────────────────────
           PROFILE: UPDATE
           ──────────────────────────────────── */
        case 'updateProfile': {
            $user = Auth::requireAuth($input);
            validate(['firstname' => 'required|max:60', 'lastname' => 'required|max:60', 'email' => 'required|email'], $input);
            $email = strtolower(trim($input['email']));
            $exists = DB::row("SELECT id FROM users WHERE email = ? AND id != ?", [$email, $user['id']]);
            if ($exists) error('Cet email est déjà utilisé.');
            $avatar = strtoupper(substr($input['firstname'], 0, 1) . substr($input['lastname'], 0, 1));
            DB::q(
                "UPDATE users SET firstname=?, lastname=?, email=?, phone=?, avatar=? WHERE id=?",
                [trim($input['firstname']), trim($input['lastname']), $email, trim($input['phone'] ?? ''), $avatar, $user['id']]
            );
            audit('member', 'Profil mis à jour', '', $user['id']);
            $updated = Auth::userToPublic(DB::row("SELECT * FROM users WHERE id = ?", [$user['id']]));
            success($updated, 'Profil mis à jour !');
        }

        /* ────────────────────────────────────
           TONTINES: CREATE
           ──────────────────────────────────── */
        case 'createTontine': {
            $user = Auth::requireAuth($input);
            validate([
                'name'   => 'required|max:120',
                'amount' => 'required|numeric|minval:100',
            ], $input);

            $inviteCode = Auth::generateInviteCode('TF');
            $maxMembers = max(2, min(100, (int)($input['maxMembers'] ?? 10)));
            $startDate  = $input['startDate'] ?? date('Y-m-d');
            $frequency  = in_array($input['frequency'] ?? '', ['weekly','biweekly','monthly','quarterly'])
                          ? $input['frequency'] : 'monthly';
            $nextDate   = computeNextPaymentDate($frequency, $startDate);

            $tid = DB::insert(
                "INSERT INTO tontines (name, description, amount, frequency, max_members, status, start_date,
                  require_approval, public_log, random_order, penalties, invite_code, created_by,
                  total_tours, next_payment_date)
                 VALUES (?,?,?,?,?,'active',?,?,?,?,?,?,?,?,?)",
                [
                    trim($input['name']),
                    trim($input['description'] ?? ''),
                    (float)$input['amount'],
                    $frequency,
                    $maxMembers,
                    $startDate,
                    (int)($input['requireApproval'] ?? 1),
                    (int)($input['publicLog'] ?? 1),
                    (int)($input['randomOrder'] ?? 0),
                    (int)($input['penalties'] ?? 0),
                    $inviteCode,
                    $user['id'],
                    $maxMembers,
                    $nextDate
                ]
            );

            /* Creator becomes admin member */
            DB::insert(
                "INSERT INTO memberships (tontine_id, user_id, role, status, tour_order) VALUES (?,?,'admin','active',1)",
                [$tid, $user['id']]
            );

            audit('admin', 'Tontine créée', "Nouvelle tontine : " . trim($input['name']), $user['id'], $tid);

            $tontine = DB::row("SELECT * FROM tontines WHERE id = ?", [$tid]);
            success(formatTontineResponse($tontine, $user['id']), 'Tontine créée avec succès !');
        }

        /* ────────────────────────────────────
           TONTINES: GET ALL (user's)
           ──────────────────────────────────── */
        case 'getTontines': {
            $user = Auth::requireAuth($input);
            $tontines = DB::rows(
                "SELECT t.*, m.role as user_role
                 FROM tontines t
                 JOIN memberships m ON m.tontine_id = t.id
                 WHERE m.user_id = ? AND m.status = 'active'
                 ORDER BY t.created_at DESC",
                [$user['id']]
            );
            $result = array_map(fn($t) => formatTontineResponse($t, $user['id']), $tontines);
            success($result);
        }

        /* ────────────────────────────────────
           TONTINES: GET ONE
           ──────────────────────────────────── */
        case 'getTontine': {
            $user = Auth::requireAuth($input);
            $tid  = (int)($input['tontineId'] ?? 0);
            if (!$tid) error('ID de tontine manquant.');
            $tontine = getTontineForUser($tid, $user['id']);
            success(formatTontineResponse($tontine, $user['id']));
        }

        /* ────────────────────────────────────
           TONTINES: SEARCH BY CODE
           ──────────────────────────────────── */
        case 'searchTontine': {
            $code = strtoupper(trim($input['code'] ?? ''));
            if (!$code) error('Code d\'invitation manquant.');
            $t = DB::row(
                "SELECT t.*, CONCAT(u.firstname,' ',u.lastname) as admin_name
                 FROM tontines t JOIN users u ON u.id = t.created_by
                 WHERE t.invite_code = ?",
                [$code]
            );
            if (!$t) error('Aucune tontine trouvée avec ce code.');
            if ($t['status'] === 'closed') error('Cette tontine est fermée.');
            if ($t['current_members'] >= $t['max_members']) error('Cette tontine est complète.');
            success([
                'name'    => $t['name'],
                'amount'  => (float)$t['amount'],
                'members' => $t['current_members'] . '/' . $t['max_members'],
                'admin'   => $t['admin_name'],
                'start'   => $t['start_date'] ? date('d/m/Y', strtotime($t['start_date'])) : '—',
                'desc'    => $t['description'] ?? '',
                'freq'    => $t['frequency'],
                'tontineId' => $t['id']
            ]);
        }

        /* ────────────────────────────────────
           TONTINES: JOIN REQUEST
           ──────────────────────────────────── */
        case 'joinTontine': {
            $user = Auth::requireAuth($input);
            $code = strtoupper(trim($input['code'] ?? ''));
            if (!$code) error('Code d\'invitation manquant.');

            $t = DB::row("SELECT * FROM tontines WHERE invite_code = ?", [$code]);
            if (!$t) error('Code invalide.');
            if ($t['status'] === 'closed') error('Cette tontine est fermée.');
            if ($t['current_members'] >= $t['max_members']) error('Tontine complète.');

            /* Already member? */
            $exists = DB::row("SELECT * FROM memberships WHERE tontine_id = ? AND user_id = ?", [$t['id'], $user['id']]);
            if ($exists) {
                if ($exists['status'] === 'active') error('Vous êtes déjà membre de cette tontine.');
                if ($exists['status'] === 'pending') error('Votre demande est déjà en cours d\'examen.');
            }

            $status = $t['require_approval'] ? 'pending' : 'active';
            $order  = $t['current_members'] + 1;

            if ($exists) {
                DB::q("UPDATE memberships SET status = ?, tour_order = ? WHERE id = ?", [$status, $order, $exists['id']]);
            } else {
                DB::insert("INSERT INTO memberships (tontine_id, user_id, role, status, tour_order) VALUES (?,?,'member',?,?)",
                    [$t['id'], $user['id'], $status, $order]);
            }

            if ($status === 'active') {
                DB::q("UPDATE tontines SET current_members = current_members + 1 WHERE id = ?", [$t['id']]);
                audit('member', 'Nouveau membre', "{$user['firstname']} {$user['lastname']} a rejoint la tontine", $user['id'], $t['id']);
            } else {
                audit('member', 'Demande d\'adhésion', "{$user['firstname']} {$user['lastname']} a demandé à rejoindre", $user['id'], $t['id']);
                /* Notify admin */
                notify($t['created_by'], 'join_request',
                    'Nouvelle demande d\'adhésion',
                    "{$user['firstname']} {$user['lastname']} souhaite rejoindre votre tontine.",
                    $t['id']);
            }

            $msg = $status === 'active' ? 'Vous avez rejoint la tontine !' : 'Demande envoyée ! L\'administrateur va l\'examiner.';
            success(['status' => $status], $msg);
        }

        /* ────────────────────────────────────
           MEMBERSHIPS: ADD DIRECTLY (admin)
           L'admin ajoute un utilisateur existant (par email ou téléphone)
           directement comme membre actif, sans passer par une invitation.
           ──────────────────────────────────── */
        case 'addMemberDirect': {
            $tid = (int)($input['tontineId'] ?? 0);
            $admin = Auth::requireAdmin($input, $tid);
            $identifier = trim($input['identifier'] ?? '');
            if (!$identifier) error('Email ou téléphone requis.');

            $t = DB::row("SELECT * FROM tontines WHERE id = ?", [$tid]);
            if (!$t) error('Tontine introuvable.');
            if ($t['status'] === 'closed') error('Cette tontine est fermée.');
            if ($t['current_members'] >= $t['max_members']) error('Cette tontine est complète.');

            $member = DB::row("SELECT * FROM users WHERE email = ? OR phone = ?",
                [strtolower($identifier), $identifier]);
            if (!$member) error('Aucun compte Tontines Facile trouvé avec cet email ou ce numéro. Utilisez plutôt l\'invitation par email.');

            $exists = DB::row("SELECT * FROM memberships WHERE tontine_id = ? AND user_id = ?", [$tid, $member['id']]);
            if ($exists && $exists['status'] === 'active') error('Cette personne est déjà membre de la tontine.');

            $order = $t['current_members'] + 1;
            if ($exists) {
                DB::q("UPDATE memberships SET status='active', tour_order=? WHERE id=?", [$order, $exists['id']]);
            } else {
                DB::insert("INSERT INTO memberships (tontine_id, user_id, role, status, tour_order) VALUES (?,?,'member','active',?)",
                    [$tid, $member['id'], $order]);
            }
            DB::q("UPDATE tontines SET current_members = current_members + 1 WHERE id = ?", [$tid]);

            audit('admin', 'Membre ajouté', "{$member['firstname']} {$member['lastname']} ajouté(e) directement par l'administrateur", $admin['id'], $tid);
            notify($member['id'], 'member', 'Ajouté(e) à une tontine',
                "Vous avez été ajouté(e) à la tontine « {$t['name']} » par {$admin['firstname']}.", $tid);

            success(['userId' => $member['id']], "{$member['firstname']} {$member['lastname']} a été ajouté(e) à la tontine !");
        }

        /* ────────────────────────────────────
           MEMBERSHIPS: APPROVE / REJECT
           ──────────────────────────────────── */
        case 'approveMember': {
            $user = Auth::requireAdmin($input, (int)($input['tontineId'] ?? 0));
            $tid  = (int)$input['tontineId'];
            $mid  = (int)($input['memberId'] ?? 0);
            $act  = $input['action'] === 'approve' ? 'active' : 'rejected';

            $member = DB::row("SELECT m.*, u.firstname, u.lastname FROM memberships m JOIN users u ON u.id = m.user_id WHERE m.id = ? AND m.tontine_id = ?", [$mid, $tid]);
            if (!$member) error('Membre introuvable.');

            DB::q("UPDATE memberships SET status = ? WHERE id = ?", [$act, $mid]);
            if ($act === 'active') {
                DB::q("UPDATE tontines SET current_members = current_members + 1 WHERE id = ?", [$tid]);
                audit('admin', 'Membre approuvé', "{$member['firstname']} {$member['lastname']} a été accepté", $user['id'], $tid);
                notify($member['user_id'], 'approved', 'Adhésion acceptée', 'Votre demande a été acceptée !', $tid);
            } else {
                audit('admin', 'Membre refusé', "{$member['firstname']} {$member['lastname']} a été refusé", $user['id'], $tid);
                notify($member['user_id'], 'rejected', 'Adhésion refusée', 'Votre demande a été refusée.', $tid);
            }
            success(null, $act === 'active' ? 'Membre approuvé.' : 'Demande refusée.');
        }

        /* ────────────────────────────────────
           PAYMENTS: RECORD
           ──────────────────────────────────── */
        case 'recordPayment': {
            $user = Auth::requireAuth($input);
            $tid  = (int)($input['tontineId'] ?? 0);
            $mid  = (int)($input['memberId'] ?? 0);

            $t = DB::row("SELECT * FROM tontines WHERE id = ?", [$tid]);
            if (!$t) error('Tontine introuvable.');

            /* Admin OR self-payment */
            $isAdmin = (bool)DB::row("SELECT id FROM memberships WHERE tontine_id=? AND user_id=? AND role='admin' AND status='active'", [$tid, $user['id']]);
            $targetUserId = $mid ?: $user['id'];
            if (!$isAdmin && $targetUserId !== $user['id']) error('Non autorisé.', 403);

            /* Check member */
            $targetMember = DB::row("SELECT u.* FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.tontine_id=? AND m.user_id=? AND m.status='active'", [$tid, $targetUserId]);
            if (!$targetMember) error('Membre introuvable dans cette tontine.');

            /* Already paid this tour? */
            $already = DB::row("SELECT id FROM payments WHERE tontine_id=? AND user_id=? AND tour=?", [$tid, $targetUserId, $t['current_tour']]);
            if ($already) error('Ce membre a déjà payé pour ce tour.');

            $payId = DB::insert(
                "INSERT INTO payments (tontine_id, user_id, recorded_by, tour, amount, status, paid_at)
                 VALUES (?,?,?,?,?,'paid',NOW())",
                [$tid, $targetUserId, $user['id'], $t['current_tour'], (float)$t['amount']]
            );

            /* Update pot */
            DB::q("UPDATE tontines SET pot = pot + ? WHERE id = ?", [(float)$t['amount'], $tid]);

            $name = $targetMember['firstname'] . ' ' . $targetMember['lastname'];
            audit('payment', 'Paiement enregistré',
                "$name — " . number_format((float)$t['amount'], 0, ',', ' ') . " FCFA (Tour " . $t['current_tour'] . ")",
                $user['id'], $tid);

            notify($targetUserId, 'payment_confirmed', 'Paiement confirmé',
                'Votre mise de ' . number_format((float)$t['amount'], 0, ',', ' ') . ' FCFA a été enregistrée.', $tid);

            success(['paymentId' => $payId], 'Paiement enregistré avec succès !');
        }

        /* ────────────────────────────────────
           PAYMENTS: NEXT TOUR (admin)
           ──────────────────────────────────── */
        case 'nextTour': {
            $tid  = (int)($input['tontineId'] ?? 0);
            $user = Auth::requireAdmin($input, $tid);

            $t = DB::row("SELECT * FROM tontines WHERE id = ?", [$tid]);
            if (!$t) error('Tontine introuvable.');
            if ($t['current_tour'] >= $t['total_tours']) error('Tous les tours sont terminés.');

            /* Find beneficiary */
            $bene = DB::row(
                "SELECT u.id, u.firstname, u.lastname FROM memberships m JOIN users u ON u.id=m.user_id
                 WHERE m.tontine_id=? AND m.tour_order=? AND m.status='active'",
                [$tid, $t['current_tour']]
            );

            /* Disburse */
            if ($bene) {
                DB::insert(
                    "INSERT INTO disbursements (tontine_id, user_id, tour, amount, disbursed_by)
                     VALUES (?,?,?,?,?)",
                    [$tid, $bene['id'], $t['current_tour'], (float)$t['pot'], $user['id']]
                );
                DB::q("UPDATE tontines SET pot = 0 WHERE id = ?", [$tid]);
                audit('admin', 'Cagnotte versée',
                    "Tour {$t['current_tour']} — " . number_format((float)$t['pot'], 0, ',', ' ') . " FCFA versés à {$bene['firstname']} {$bene['lastname']}",
                    $user['id'], $tid);
                notify($bene['id'], 'disbursement', 'Cagnotte reçue !',
                    'Vous avez reçu ' . number_format((float)$t['pot'], 0, ',', ' ') . ' FCFA.', $tid);
            }

            $newTour  = $t['current_tour'] + 1;
            $nextDate = computeNextPaymentDate($t['frequency'], $t['start_date']);
            $newStatus = $newTour > $t['total_tours'] ? 'closed' : 'active';

            DB::q("UPDATE tontines SET current_tour=?, next_payment_date=?, status=? WHERE id=?",
                [$newTour, $nextDate, $newStatus, $tid]);

            audit('admin', 'Nouveau tour lancé', "Tour $newTour démarré", $user['id'], $tid);
            success(['newTour' => $newTour, 'status' => $newStatus], "Tour $newTour lancé !");
        }

        /* ────────────────────────────────────
           TRANSACTIONS: GET
           ──────────────────────────────────── */
        case 'getTransactions': {
            $user = Auth::requireAuth($input);
            $payments = DB::rows(
                "SELECT p.id, 'out' as type, 'Mise tontine' as name, t.name as tontine,
                        p.amount, DATE_FORMAT(p.paid_at,'%d/%m/%Y') as date, p.status
                 FROM payments p JOIN tontines t ON t.id = p.tontine_id
                 WHERE p.user_id = ?
                 ORDER BY p.created_at DESC LIMIT 50",
                [$user['id']]
            );
            $disbursements = DB::rows(
                "SELECT d.id, 'in' as type, 'Cagnotte reçue' as name, t.name as tontine,
                        d.amount, DATE_FORMAT(d.disbursed_at,'%d/%m/%Y') as date, 'received' as status
                 FROM disbursements d JOIN tontines t ON t.id = d.tontine_id
                 WHERE d.user_id = ?
                 ORDER BY d.disbursed_at DESC LIMIT 20",
                [$user['id']]
            );
            $all = array_merge($payments, $disbursements);
            usort($all, fn($a, $b) => strcmp($b['date'], $a['date']));
            success($all);
        }

        /* ────────────────────────────────────
           AUDIT LOG: GLOBAL
           ──────────────────────────────────── */
        case 'getGlobalLog': {
            $user = Auth::requireAuth($input);
            $log = DB::rows(
                "SELECT al.action_type as type, al.action, al.detail,
                        COALESCE(CONCAT(u.firstname,' ',LEFT(u.lastname,1),'.'), 'Système') as user,
                        DATE_FORMAT(al.created_at, '%d/%m/%Y %H:%i') as time
                 FROM audit_log al
                 LEFT JOIN memberships m ON m.tontine_id = al.tontine_id AND m.user_id = ?
                 LEFT JOIN users u ON u.id = al.user_id
                 WHERE al.user_id = ? OR (al.tontine_id IS NOT NULL AND m.status = 'active')
                 ORDER BY al.created_at DESC LIMIT 50",
                [$user['id'], $user['id']]
            );
            success($log);
        }

        /* ────────────────────────────────────
           INVITATIONS: SEND
           ──────────────────────────────────── */
        /* ────────────────────────────────────
           INVITATIONS: GET PENDING
           ──────────────────────────────────── */
        case 'getInvitations': {
            $user = Auth::requireAuth($input);
            $invites = DB::rows(
                "SELECT i.id, t.name as tontine, CONCAT(u.firstname,' ',u.lastname) as `from`,
                        t.amount, i.token as code,
                        CASE t.frequency WHEN 'weekly' THEN 'Hebdo.' WHEN 'biweekly' THEN 'Bi-mens.'
                          WHEN 'monthly' THEN 'Mensuel' ELSE 'Trimestr.' END as freq
                 FROM invitations i
                 JOIN tontines t ON t.id = i.tontine_id
                 JOIN users u ON u.id = i.invited_by
                 WHERE i.email = ? AND i.status = 'pending' AND i.expires_at > NOW()",
                [$user['email']]
            );
            success($invites);
        }

        /* ────────────────────────────────────
           NOTIFICATIONS: GET
           ──────────────────────────────────── */
        case 'getNotifications': {
            $user = Auth::requireAuth($input);
            $notifs = DB::rows(
                "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30",
                [$user['id']]
            );
            $unread = DB::row("SELECT COUNT(*) as n FROM notifications WHERE user_id = ? AND is_read = 0", [$user['id']]);
            success(['notifications' => $notifs, 'unread' => (int)$unread['n']]);
        }

        /* ────────────────────────────────────
           NOTIFICATIONS: MARK READ
           ──────────────────────────────────── */
        case 'markNotificationsRead': {
            $user = Auth::requireAuth($input);
            DB::q("UPDATE notifications SET is_read = 1 WHERE user_id = ?", [$user['id']]);
            success(null, 'Notifications marquées comme lues.');
        }

        /* ────────────────────────────────────
           TONTINES: UPDATE (admin)
           ──────────────────────────────────── */
        case 'updateTontine': {
            $tid  = (int)($input['tontineId'] ?? 0);
            $user = Auth::requireAdmin($input, $tid);
            $t    = DB::row("SELECT * FROM tontines WHERE id = ?", [$tid]);
            if (!$t) error('Tontine introuvable.');

            $updates = [];
            $params  = [];

            if (!empty($input['name']))        { $updates[] = 'name = ?';        $params[] = trim($input['name']); }
            if (!empty($input['description'])) { $updates[] = 'description = ?'; $params[] = trim($input['description']); }
            if (!empty($input['status']) && in_array($input['status'], ['active','paused','closed'])) {
                $updates[] = 'status = ?'; $params[] = $input['status'];
            }

            if (!$updates) error('Aucune modification détectée.');
            $params[] = $tid;
            DB::q("UPDATE tontines SET " . implode(', ', $updates) . " WHERE id = ?", $params);
            audit('admin', 'Tontine mise à jour', implode(', ', array_map(fn($k) => "$k modifié", array_keys($input))), $user['id'], $tid);
            success(null, 'Tontine mise à jour.');
        }

        /* ────────────────────────────────────
           STATS: GLOBAL
           ──────────────────────────────────── */
        case 'getStats': {
            $user = Auth::requireAuth($input);
            $tontinesCount = DB::row("SELECT COUNT(*) as n FROM memberships WHERE user_id=? AND status='active'", [$user['id']]);
            $totalPaid     = DB::row("SELECT COALESCE(SUM(amount),0) as n FROM payments WHERE user_id=? AND status='paid'", [$user['id']]);
            $totalReceived = DB::row("SELECT COALESCE(SUM(amount),0) as n FROM disbursements WHERE user_id=?", [$user['id']]);
            $pendingPayments = DB::row("SELECT COUNT(*) as n FROM payments WHERE user_id=? AND status='pending'", [$user['id']]);
            success([
                'tontines'        => (int)$tontinesCount['n'],
                'totalPaid'       => (float)$totalPaid['n'],
                'totalReceived'   => (float)$totalReceived['n'],
                'pendingPayments' => (int)$pendingPayments['n'],
            ]);
        }

        /* ────────────────────────────────────
           MOT DE PASSE OUBLIÉ
           ──────────────────────────────────── */
        case 'forgotPassword': {
            validate(['email' => 'required|email'], $input);
            $email = strtolower(trim($input['email']));

            /* Toujours répondre success (sécurité : ne pas révéler si l'email existe) */
            $user = DB::row("SELECT * FROM users WHERE email = ?", [$email]);
            if ($user) {
                /* Supprimer les anciens tokens */
                DB::q("DELETE FROM password_resets WHERE user_id = ? OR expires_at < NOW()", [$user['id']]);

                $token   = bin2hex(random_bytes(32));
                $expires = date('Y-m-d H:i:s', strtotime('+1 hour'));

                DB::insert("INSERT INTO password_resets (user_id, token, expires_at) VALUES (?,?,?)",
                    [$user['id'], $token, $expires]);

                /* Envoi email */
                require_once __DIR__ . '/Mailer.php';
                Mailer::sendPasswordReset($email, $user['firstname'], $token);
                audit('security', 'Demande réinitialisation', "Email: $email", $user['id']);
            }

            success(null, 'Si cet email est enregistré, vous recevrez un lien de réinitialisation.');
        }

        /* ────────────────────────────────────
           RÉINITIALISATION MOT DE PASSE
           ──────────────────────────────────── */
        case 'resetPassword': {
            validate(['token' => 'required', 'password' => 'required|min:8'], $input);
            $token = trim($input['token']);

            /* Créer la table si elle n'existe pas */
            DB::get()->exec("CREATE TABLE IF NOT EXISTS password_resets (
                id         INT AUTO_INCREMENT PRIMARY KEY,
                user_id    INT NOT NULL,
                token      VARCHAR(64) NOT NULL UNIQUE,
                expires_at DATETIME NOT NULL,
                used_at    DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

            $reset = DB::row(
                "SELECT * FROM password_resets WHERE token = ? AND expires_at > NOW() AND used_at IS NULL",
                [$token]
            );
            if (!$reset) error('Lien invalide ou expiré. Faites une nouvelle demande.');

            $hash = password_hash($input['password'], PASSWORD_BCRYPT, ['cost' => 12]);
            DB::q("UPDATE users SET password = ?, login_attempts = 0 WHERE id = ?", [$hash, $reset['user_id']]);
            DB::q("UPDATE password_resets SET used_at = NOW() WHERE id = ?", [$reset['id']]);
            DB::q("DELETE FROM tokens WHERE user_id = ?", [$reset['user_id']]); /* Invalider toutes les sessions */

            audit('security', 'Mot de passe réinitialisé', '', $reset['user_id']);
            success(null, 'Mot de passe modifié avec succès. Vous pouvez vous connecter.');
        }

        /* ────────────────────────────────────
           PUSH SUBSCRIPTIONS
           ──────────────────────────────────── */
        case 'savePushSubscription': {
            $user = Auth::requireAuth($input);
            $sub  = trim($input['subscription'] ?? '');
            if (!$sub) error('Subscription manquante.');

            /* Créer la table si nécessaire */
            DB::get()->exec("CREATE TABLE IF NOT EXISTS push_subscriptions (
                id           INT AUTO_INCREMENT PRIMARY KEY,
                user_id      INT NOT NULL,
                subscription TEXT NOT NULL,
                created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_user_sub (user_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

            DB::q("INSERT INTO push_subscriptions (user_id, subscription) VALUES (?,?)
                   ON DUPLICATE KEY UPDATE subscription = VALUES(subscription)",
                [$user['id'], $sub]);
            success(null, 'Abonnement push enregistré.');
        }

        /* ────────────────────────────────────
           AVATAR UPDATE
           ──────────────────────────────────── */
        case 'updateAvatar': {
            $user   = Auth::requireAuth($input);
            $avatar = trim($input['avatar'] ?? '');
            if (!$avatar) error('Avatar manquant.');

            $isBase64 = str_starts_with($avatar, 'data:image/');
            $isEmoji  = mb_strlen($avatar) <= 4 && !$isBase64;

            if ($isBase64) {
                /* Limite de taille (image déjà redimensionnée/compressée côté
                   client) pour éviter de stocker des images trop lourdes en base */
                if (strlen($avatar) > 900_000) {
                    error('Image trop volumineuse. Choisissez une photo plus légère.');
                }
                $initials = strtoupper(substr($user['firstname'], 0, 1) . substr($user['lastname'], 0, 1));
                DB::q("UPDATE users SET avatar = ?, avatar_photo = ? WHERE id = ?", [$initials, $avatar, $user['id']]);
                audit('member', 'Photo de profil mise à jour', '', $user['id']);
                success(['avatar' => $initials, 'avatar_photo' => $avatar], 'Photo mise à jour !');
            } else {
                /* Emoji ou initiales : on efface une éventuelle photo précédente */
                DB::q("UPDATE users SET avatar = ?, avatar_photo = NULL WHERE id = ?", [$avatar, $user['id']]);
                audit('member', 'Photo de profil mise à jour', '', $user['id']);
                success(['avatar' => $avatar, 'avatar_photo' => null], 'Photo mise à jour !');
            }
        }

        /* ────────────────────────────────────
           MEMBRES EN ATTENTE
           ──────────────────────────────────── */
        case 'getPendingMembers': {
            $user = Auth::requireAuth($input);
            $tid  = (int)($input['tontineId'] ?? 0);
            if (!$tid) error('ID de tontine manquant.');

            /* Vérifier que l'user est admin */
            $isAdmin = (bool)DB::row(
                "SELECT id FROM memberships WHERE tontine_id=? AND user_id=? AND role='admin' AND status='active'",
                [$tid, $user['id']]
            );
            if (!$isAdmin) error('Accès refusé.', 403);

            $pending = DB::rows(
                "SELECT m.id, m.tour_order,
                        CONCAT(u.firstname,' ',u.lastname) as name,
                        CONCAT(UPPER(LEFT(u.firstname,1)),UPPER(LEFT(u.lastname,1))) as initials,
                        u.email, u.phone,
                        DATE_FORMAT(m.joined_at,'%d/%m/%Y') as requested_at
                 FROM memberships m JOIN users u ON u.id = m.user_id
                 WHERE m.tontine_id = ? AND m.status = 'pending'
                 ORDER BY m.joined_at ASC",
                [$tid]
            );
            success($pending);
        }

        /* ────────────────────────────────────
           INVITATION PAR EMAIL (améliorée)
           ──────────────────────────────────── */
        case 'sendInvite': {
            $user = Auth::requireAuth($input);
            $tid  = (int)($input['tontineId'] ?? 0);
            validate(['email' => 'required|email'], $input);

            $t = DB::row("SELECT * FROM tontines WHERE id = ?", [$tid]);
            if (!$t) error('Tontine introuvable.');
            $isAdmin = (bool)DB::row(
                "SELECT id FROM memberships WHERE tontine_id=? AND user_id=? AND role='admin' AND status='active'",
                [$tid, $user['id']]
            );
            if (!$isAdmin) error('Seul l\'administrateur peut envoyer des invitations.', 403);

            $email   = strtolower(trim($input['email']));
            $token   = bin2hex(random_bytes(20));
            $expires = date('Y-m-d H:i:s', strtotime('+7 days'));

            DB::insert(
                "INSERT INTO invitations (tontine_id, invited_by, email, message, token, expires_at)
                 VALUES (?,?,?,?,?,?)
                 ON DUPLICATE KEY UPDATE token=VALUES(token), expires_at=VALUES(expires_at), status='pending'",
                [$tid, $user['id'], $email, trim($input['message'] ?? ''), $token, $expires]
            );

            /* Envoi email réel */
            require_once __DIR__ . '/Mailer.php';
            $freqMap = ['weekly'=>'Hebdomadaire','biweekly'=>'Bi-mensuel','monthly'=>'Mensuel','quarterly'=>'Trimestriel'];
            $inviteUrl = APP_URL . "/index.html?action=invite&token=$token";
            Mailer::sendInvitation(
                $email,
                $user['firstname'] . ' ' . $user['lastname'],
                $t['name'],
                number_format((float)$t['amount'], 0, ',', ' '),
                $freqMap[$t['frequency']] ?? $t['frequency'],
                $inviteUrl,
                trim($input['message'] ?? '')
            );

            audit('admin', 'Invitation envoyée', "Email: $email — Tontine: {$t['name']}", $user['id'], $tid);
            success(['token' => $token], "Invitation envoyée à $email !");
        }

        /* ────────────────────────────────────
           RAPPELS (améliorés avec emails)
           ──────────────────────────────────── */
        case 'sendReminder': {
            $tid  = (int)($input['tontineId'] ?? 0);
            $user = Auth::requireAdmin($input, $tid);

            $t = DB::row("SELECT * FROM tontines WHERE id = ?", [$tid]);
            $unpaid = DB::rows(
                "SELECT u.id, u.firstname, u.lastname, u.email
                 FROM memberships m JOIN users u ON u.id=m.user_id
                 WHERE m.tontine_id=? AND m.status='active'
                 AND u.id NOT IN (SELECT user_id FROM payments WHERE tontine_id=? AND tour=? AND status='paid')",
                [$tid, $tid, $t['current_tour']]
            );

            require_once __DIR__ . '/Mailer.php';
            foreach ($unpaid as $m) {
                notify($m['id'], 'payment_reminder', 'Rappel de paiement',
                    'Votre mise de ' . number_format((float)$t['amount'], 0, ',', ' ') . ' FCFA est attendue.', $tid);
                /* Envoi email de rappel */
                Mailer::sendPaymentReminder(
                    $m['email'], $m['firstname'], $t['name'],
                    number_format((float)$t['amount'], 0, ',', ' '),
                    $t['next_payment_date'] ?? date('d/m/Y', strtotime('+7 days')),
                    APP_URL
                );
            }

            $count = count($unpaid);
            audit('admin', 'Rappels envoyés', "$count rappels (email + notif) — Tour {$t['current_tour']}", $user['id'], $tid);
            success(['count' => $count], "$count rappel(s) envoyé(s) !");
        }

        /* ────────────────────────────────────
           INSCRIPTION (améliorée avec email de bienvenue)
           ──────────────────────────────────── */
        /* ────────────────────────────────────
           SERVER-SENT EVENTS (notifications temps réel)
           ──────────────────────────────────── */
        case 'sse': {
            $token = trim($_GET['token'] ?? '');
            $user  = Auth::validateToken($token);
            if (!$user) { http_response_code(401); exit; }

            header('Content-Type: text/event-stream');
            header('Cache-Control: no-cache');
            header('Connection: keep-alive');
            header('X-Accel-Buffering: no');

            $lastId = (int)($_GET['lastId'] ?? 0);
            $count  = 0;

            while ($count < 30) { /* Max 30 secondes */
                $notifs = DB::rows(
                    "SELECT * FROM notifications WHERE user_id=? AND id>? AND is_read=0 ORDER BY id ASC LIMIT 5",
                    [$user['id'], $lastId]
                );
                foreach ($notifs as $n) {
                    echo "id: {$n['id']}\n";
                    echo "data: " . json_encode($n) . "\n\n";
                    $lastId = $n['id'];
                    ob_flush(); flush();
                }
                echo ": heartbeat\n\n";
                ob_flush(); flush();
                sleep(1);
                $count++;
            }
            exit;
        }

        /* ────────────────────────────────────
           HEALTH CHECK
           ──────────────────────────────────── */
        case 'health': {
            /* Migration supplémentaire pour password_resets */
            DB::get()->exec("CREATE TABLE IF NOT EXISTS password_resets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                token VARCHAR(64) NOT NULL UNIQUE,
                expires_at DATETIME NOT NULL,
                used_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

            success([
                'status'      => 'ok',
                'version'     => APP_VERSION,
                'db'          => 'connected',
                'datetime'    => date('Y-m-d H:i:s'),
                'php_version' => PHP_VERSION,
                'features'    => ['push','email','audit','csrf','rate_limit'],
            ]);
        }


        /* ────────────────────────────────────
           TONTINES: FERMER (admin)
           ──────────────────────────────────── */
        case 'closeTontine': {
            $tid  = (int)($input['tontineId'] ?? 0);
            $user = Auth::requireAdmin($input, $tid);
            if (!$tid) error('ID tontine manquant.');
            $t = DB::row("SELECT * FROM tontines WHERE id = ?", [$tid]);
            if (!$t) error('Tontine introuvable.');
            if ($t['status'] === 'closed') error('Cette tontine est déjà fermée.');
            DB::q("UPDATE tontines SET status = 'closed' WHERE id = ?", [$tid]);
            audit('admin', 'Tontine fermée', "Tontine #{$tid} — {$t['name']}", $user['id'], $tid);
            success(null, 'Tontine fermée avec succès.');
        }

        /* ────────────────────────────────────
           CONTACTS
           ──────────────────────────────────── */
        case 'searchUsers': {
            $user = Auth::requireAuth($input);
            $q = trim($input['query'] ?? '');
            if (mb_strlen($q) < 2) error('Entrez au moins 2 caractères.');
            $like = '%' . $q . '%';
            $results = DB::rows(
                "SELECT id, firstname, lastname, email, phone, avatar, avatar_photo, invite_code,
                        CONCAT(UPPER(LEFT(firstname,1)), UPPER(LEFT(lastname,1))) as initials
                 FROM users
                 WHERE id != ? AND (email = ? OR phone = ? OR invite_code = ? OR firstname LIKE ? OR lastname LIKE ?)
                 LIMIT 15",
                [$user['id'], $q, $q, strtoupper($q), $like, $like]
            );
            /* Statut de contact déjà existant (pour ne pas ré-inviter) */
            foreach ($results as &$r) {
                $existing = DB::row("SELECT status FROM contacts WHERE user_id = ? AND contact_id = ?", [$user['id'], $r['id']]);
                $r['contactStatus'] = $existing['status'] ?? null;
                $r['name'] = trim($r['firstname'] . ' ' . $r['lastname']);
            }
            success($results);
        }

        case 'getContacts': {
            $user = Auth::requireAuth($input);
            $base = "SELECT u.id, u.firstname, u.lastname, u.avatar, u.avatar_photo, u.invite_code,
                        CONCAT(UPPER(LEFT(u.firstname,1)), UPPER(LEFT(u.lastname,1))) as initials,
                        c.status, c.created_at
                     FROM contacts c JOIN users u ON u.id = c.contact_id";

            $accepted = DB::rows("$base WHERE c.user_id = ? AND c.status = 'accepted' ORDER BY u.firstname ASC", [$user['id']]);
            $incoming = DB::rows(
                "SELECT u.id, u.firstname, u.lastname, u.avatar, u.avatar_photo,
                        CONCAT(UPPER(LEFT(u.firstname,1)), UPPER(LEFT(u.lastname,1))) as initials,
                        c.created_at
                 FROM contacts c JOIN users u ON u.id = c.user_id
                 WHERE c.contact_id = ? AND c.status = 'pending' ORDER BY c.created_at DESC",
                [$user['id']]
            );
            $outgoing = DB::rows("$base WHERE c.user_id = ? AND c.status = 'pending' ORDER BY c.created_at DESC", [$user['id']]);

            foreach ([&$accepted, &$incoming, &$outgoing] as &$list) {
                foreach ($list as &$r) $r['name'] = trim($r['firstname'] . ' ' . $r['lastname']);
            }
            success(['accepted' => $accepted, 'incoming' => $incoming, 'outgoing' => $outgoing]);
        }

        case 'addContact': {
            $user = Auth::requireAuth($input);
            $contactId = (int)($input['contactId'] ?? 0);
            if (!$contactId) error('Utilisateur manquant.');
            if ($contactId === $user['id']) error('Vous ne pouvez pas vous ajouter vous-même.');
            $target = DB::row("SELECT id FROM users WHERE id = ?", [$contactId]);
            if (!$target) error('Utilisateur introuvable.');

            $existing = DB::row("SELECT status FROM contacts WHERE user_id = ? AND contact_id = ?", [$user['id'], $contactId]);
            if ($existing) error($existing['status'] === 'accepted' ? 'Déjà dans vos contacts.' : 'Demande déjà envoyée.');

            DB::q("INSERT INTO contacts (user_id, contact_id, status) VALUES (?, ?, 'pending')", [$user['id'], $contactId]);
            audit('member', 'Demande de contact envoyée', '', $user['id']);
            success(null, 'Demande de contact envoyée !');
        }

        case 'respondContact': {
            $user = Auth::requireAuth($input);
            $contactId = (int)($input['contactId'] ?? 0);
            $decision  = $input['decision'] ?? ''; // 'accept' | 'decline' | 'block'
            if (!$contactId || !in_array($decision, ['accept', 'decline', 'block'], true)) {
                error('Requête invalide.');
            }
            $req = DB::row("SELECT * FROM contacts WHERE user_id = ? AND contact_id = ? AND status = 'pending'", [$contactId, $user['id']]);
            if (!$req) error('Demande introuvable.');

            if ($decision === 'accept') {
                DB::q("UPDATE contacts SET status = 'accepted' WHERE user_id = ? AND contact_id = ?", [$contactId, $user['id']]);
                /* Relation symétrique : les deux se voient mutuellement comme contacts */
                $mirror = DB::row("SELECT id FROM contacts WHERE user_id = ? AND contact_id = ?", [$user['id'], $contactId]);
                if ($mirror) {
                    DB::q("UPDATE contacts SET status = 'accepted' WHERE user_id = ? AND contact_id = ?", [$user['id'], $contactId]);
                } else {
                    DB::q("INSERT INTO contacts (user_id, contact_id, status) VALUES (?, ?, 'accepted')", [$user['id'], $contactId]);
                }
                success(null, 'Contact ajouté !');
            } elseif ($decision === 'block') {
                DB::q("UPDATE contacts SET status = 'blocked' WHERE user_id = ? AND contact_id = ?", [$contactId, $user['id']]);
                success(null, 'Utilisateur bloqué.');
            } else {
                DB::q("DELETE FROM contacts WHERE user_id = ? AND contact_id = ?", [$contactId, $user['id']]);
                success(null, 'Demande refusée.');
            }
        }

        case 'removeContact': {
            $user = Auth::requireAuth($input);
            $contactId = (int)($input['contactId'] ?? 0);
            if (!$contactId) error('Contact manquant.');
            DB::q("DELETE FROM contacts WHERE (user_id = ? AND contact_id = ?) OR (user_id = ? AND contact_id = ?)",
                [$user['id'], $contactId, $contactId, $user['id']]);
            success(null, 'Contact supprimé.');
        }

        /* ────────────────────────────────────
           CHAT
           ──────────────────────────────────── */
        case 'getConversations': {
            $user = Auth::requireAuth($input);
            $convs = DB::rows(
                "SELECT c.id, c.is_group, c.title,
                        (SELECT body FROM messages WHERE conversation_id = c.id ORDER BY id DESC LIMIT 1) as last_message,
                        (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY id DESC LIMIT 1) as last_at,
                        (SELECT COUNT(*) FROM messages m
                            WHERE m.conversation_id = c.id
                            AND m.created_at > COALESCE(cp.last_read_at, '1970-01-01')
                            AND m.sender_id != ?) as unread
                 FROM conversations c
                 JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = ?
                 ORDER BY last_at DESC",
                [$user['id'], $user['id']]
            );
            foreach ($convs as &$c) {
                if (!$c['is_group']) {
                    $other = DB::row(
                        "SELECT u.id, u.firstname, u.lastname, u.avatar, u.avatar_photo,
                                CONCAT(UPPER(LEFT(u.firstname,1)), UPPER(LEFT(u.lastname,1))) as initials
                         FROM conversation_participants cp JOIN users u ON u.id = cp.user_id
                         WHERE cp.conversation_id = ? AND cp.user_id != ? LIMIT 1",
                        [$c['id'], $user['id']]
                    );
                    $c['title'] = $other ? trim($other['firstname'] . ' ' . $other['lastname']) : 'Conversation';
                    $c['avatar'] = $other['avatar'] ?? null;
                    $c['avatar_photo'] = $other['avatar_photo'] ?? null;
                    $c['otherUserId'] = $other['id'] ?? null;
                }
            }
            success($convs);
        }

        case 'startConversation': {
            $user = Auth::requireAuth($input);
            $otherId = (int)($input['userId'] ?? 0);
            if (!$otherId) error('Utilisateur manquant.');
            if ($otherId === $user['id']) error('Impossible de démarrer une conversation avec vous-même.');

            /* Réutilise une conversation 1-à-1 existante si elle existe déjà */
            $existing = DB::row(
                "SELECT cp1.conversation_id as id
                 FROM conversation_participants cp1
                 JOIN conversation_participants cp2 ON cp2.conversation_id = cp1.conversation_id
                 JOIN conversations c ON c.id = cp1.conversation_id
                 WHERE cp1.user_id = ? AND cp2.user_id = ? AND c.is_group = 0",
                [$user['id'], $otherId]
            );
            if ($existing) { success(['conversationId' => (int)$existing['id']]); }

            $convId = DB::insert("INSERT INTO conversations (is_group, created_by) VALUES (0, ?)", [$user['id']]);
            DB::q("INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?), (?, ?)",
                [$convId, $user['id'], $convId, $otherId]);
            success(['conversationId' => (int)$convId]);
        }

        case 'getMessages': {
            $user = Auth::requireAuth($input);
            $convId = (int)($input['conversationId'] ?? 0);
            if (!$convId) error('Conversation manquante.');
            $isParticipant = DB::row("SELECT id FROM conversation_participants WHERE conversation_id = ? AND user_id = ?", [$convId, $user['id']]);
            if (!$isParticipant) error('Accès refusé.', 403);

            $sinceId = (int)($input['sinceId'] ?? 0);
            $params = [$convId];
            $sql = "SELECT m.id, m.sender_id, m.body, m.created_at,
                           CONCAT(UPPER(LEFT(u.firstname,1)), UPPER(LEFT(u.lastname,1))) as sender_initials
                    FROM messages m JOIN users u ON u.id = m.sender_id
                    WHERE m.conversation_id = ?";
            if ($sinceId) { $sql .= " AND m.id > ?"; $params[] = $sinceId; }
            $sql .= " ORDER BY m.id ASC LIMIT 200";
            $messages = DB::rows($sql, $params);

            DB::q("UPDATE conversation_participants SET last_read_at = NOW() WHERE conversation_id = ? AND user_id = ?", [$convId, $user['id']]);
            success($messages);
        }

        case 'sendMessage': {
            $user = Auth::requireAuth($input);
            $convId = (int)($input['conversationId'] ?? 0);
            $body   = trim($input['body'] ?? '');
            if (!$convId || !$body) error('Message vide.');
            if (mb_strlen($body) > 2000) error('Message trop long.');
            $isParticipant = DB::row("SELECT id FROM conversation_participants WHERE conversation_id = ? AND user_id = ?", [$convId, $user['id']]);
            if (!$isParticipant) error('Accès refusé.', 403);

            $msgId = DB::insert("INSERT INTO messages (conversation_id, sender_id, body) VALUES (?, ?, ?)", [$convId, $user['id'], $body]);
            DB::q("UPDATE conversation_participants SET last_read_at = NOW() WHERE conversation_id = ? AND user_id = ?", [$convId, $user['id']]);
            success(['id' => (int)$msgId], 'Message envoyé.');
        }

        default:
            error("Action '$action' non reconnue.", 404);
    }

} catch (PDOException $e) {
    error('Erreur base de données : ' . $e->getMessage(), 500);
} catch (Throwable $e) {
    error('Erreur serveur : ' . $e->getMessage(), 500);
}
