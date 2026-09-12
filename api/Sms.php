<?php
/* ══════════════════════════════════════════════════════════════════
   TONTINES FACILE — Sms.php
   Envoi de SMS : rappels de paiement, OTP (2FA), notifications
   Provider supporté : Twilio (international)
                       Africa's Talking (Afrique)
                       Termii (Nigeria/Afrique de l'Ouest)
   ══════════════════════════════════════════════════════════════════ */

declare(strict_types=1);

if (!function_exists('env')) {
    function env(string $key, string $default = ''): string {
        return $_ENV[$key] ?? getenv($key) ?: $default;
    }
}

class Sms {

    /* ── Constantes depuis l'environnement ── */
    private static function provider(): string  { return strtolower(env('SMS_PROVIDER', 'twilio')); }
    private static function accountSid(): string { return env('SMS_ACCOUNT_SID', ''); }
    private static function authToken(): string  { return env('SMS_AUTH_TOKEN', ''); }
    private static function fromNumber(): string { return env('SMS_FROM_NUMBER', ''); }
    private static function atApiKey(): string   { return env('AT_API_KEY', ''); }
    private static function atUsername(): string { return env('AT_USERNAME', ''); }
    private static function termiiKey(): string  { return env('TERMII_API_KEY', ''); }

    /**
     * Envoie un SMS via le provider configuré.
     * Retourne true si l'envoi a réussi, false sinon.
     * Silencieux (ne lève pas d'exception) pour ne jamais bloquer l'expérience.
     */
    public static function send(string $to, string $message): bool {
        try {
            $to = self::normalizePhone($to);
            if (!$to) return false;

            return match(self::provider()) {
                'twilio'         => self::sendTwilio($to, $message),
                'africastalking' => self::sendAfricasTalking($to, $message),
                'at'             => self::sendAfricasTalking($to, $message),
                'termii'         => self::sendTermii($to, $message),
                default          => false,
            };
        } catch (Throwable $e) {
            error_log('[SMS] Erreur envoi vers ' . $to . ': ' . $e->getMessage());
            return false;
        }
    }

    /* ── Twilio ── */
    private static function sendTwilio(string $to, string $message): bool {
        $sid   = self::accountSid();
        $token = self::authToken();
        $from  = self::fromNumber();
        if (!$sid || !$token || !$from) return false;

        $url  = "https://api.twilio.com/2010-04-01/Accounts/$sid/Messages.json";
        $data = http_build_query(['To' => $to, 'From' => $from, 'Body' => $message]);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $data,
            CURLOPT_USERPWD        => "$sid:$token",
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 10,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $result = json_decode($response, true);
        return $httpCode === 201 && isset($result['sid']);
    }

    /* ── Africa's Talking ── */
    private static function sendAfricasTalking(string $to, string $message): bool {
        $apiKey   = self::atApiKey();
        $username = self::atUsername();
        if (!$apiKey || !$username) return false;

        $url  = 'https://api.africastalking.com/version1/messaging';
        $data = http_build_query([
            'username' => $username,
            'to'       => $to,
            'message'  => $message,
        ]);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $data,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 10,
            CURLOPT_HTTPHEADER     => ["apiKey: $apiKey", 'Accept: application/json'],
        ]);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $result = json_decode($response, true);
        $status = $result['SMSMessageData']['Recipients'][0]['status'] ?? '';
        return $httpCode === 201 && $status === 'Success';
    }

    /* ── Termii ── */
    private static function sendTermii(string $to, string $message): bool {
        $apiKey = self::termiiKey();
        if (!$apiKey) return false;

        $url  = 'https://api.ng.termii.com/api/sms/send';
        $body = json_encode([
            'to'       => $to,
            'from'     => 'TontinesFacile',
            'sms'      => $message,
            'type'     => 'plain',
            'api_key'  => $apiKey,
            'channel'  => 'generic',
        ]);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $body,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 10,
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        ]);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $result = json_decode($response, true);
        return $httpCode === 200 && ($result['code'] ?? '') === 'ok';
    }

    /* ── Normalisation numéros de téléphone ──
       Accepte les formats locaux (07 xx xx xx xx) et internationaux (+225...).
       Retourne le format E.164 (+CCXXXXXXXXX) ou '' si invalide. */
    public static function normalizePhone(string $phone): string {
        /* Supprimer tout ce qui n'est pas chiffre ou + */
        $phone = preg_replace('/[^\d+]/', '', $phone);

        /* Déjà en format international */
        if (str_starts_with($phone, '+')) {
            return strlen($phone) >= 10 ? $phone : '';
        }

        /* Préfixe 00 → + */
        if (str_starts_with($phone, '00')) {
            return '+' . substr($phone, 2);
        }

        /* Numéros locaux courants en Afrique de l'Ouest :
           On retourne le numéro tel quel (sans indicatif) pour les providers
           locaux qui le gèrent (Africa's Talking, etc.)
           Pour Twilio, il faut impérativement l'indicatif pays. */
        return strlen($phone) >= 8 ? $phone : '';
    }

    /* ═══════════════════════════════════════════════════════
       MESSAGES PRÉ-DÉFINIS
       ═══════════════════════════════════════════════════════ */

    /**
     * Rappel de paiement à un membre.
     * @param string $to          Numéro de téléphone du destinataire
     * @param string $firstname   Prénom du membre
     * @param string $tontineName Nom de la tontine
     * @param string $amount      Montant formaté (ex: "25 000 FCFA")
     * @param string $deadline    Date limite (ex: "15/11/2025")
     */
    public static function sendPaymentReminder(
        string $to, string $firstname, string $tontineName,
        string $amount, string $deadline
    ): bool {
        $appUrl = env('APP_URL', 'https://tontine-iota.vercel.app');
        $message = "Bonjour $firstname ! Rappel : votre mise de $amount pour « $tontineName » est attendue avant le $deadline. Connectez-vous : $appUrl";
        return self::send($to, $message);
    }

    /**
     * Code OTP pour la 2FA.
     * @param string $to   Numéro du destinataire
     * @param string $code Code à 6 chiffres
     */
    public static function sendOTP(string $to, string $code): bool {
        $message = "Tontines Facile — Votre code de vérification : $code. Valable 5 minutes. Ne le communiquez à personne.";
        return self::send($to, $message);
    }

    /**
     * Notification d'approbation d'adhésion.
     */
    public static function sendMemberApproved(string $to, string $firstname, string $tontineName): bool {
        $appUrl = env('APP_URL', 'https://tontine-iota.vercel.app');
        $message = "Bonne nouvelle $firstname ! Votre demande d'adhésion à « $tontineName » a été acceptée. Connectez-vous : $appUrl";
        return self::send($to, $message);
    }

    /**
     * Notification de réception de la cagnotte.
     */
    public static function sendDisbursementNotification(string $to, string $firstname, string $amount, string $tontineName): bool {
        $message = "Félicitations $firstname ! Vous avez reçu $amount de la tontine « $tontineName ». Votre tour est arrivé ! 🎉";
        return self::send($to, $message);
    }
}
