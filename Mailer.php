<?php
/**
 * ═════════════════════════════════════════════════════════════════
 * TONTINES FACILE — Email Service
 * Gère les emails SMTP (Gmail, SendGrid, etc.)
 * ═════════════════════════════════════════════════════════════════
 */

declare(strict_types=1);

require_once __DIR__ . '/config.php';

class Mailer {
    private static ?object $instance = null;
    
    /**
     * Envoyer un email d'invitation
     */
    public static function sendInvitation(
        string $recipientEmail,
        string $recipientName,
        string $tontineName,
        string $inviteLink,
        string $adminName
    ): bool {
        $subject = "Invitation à rejoindre une tontine — $tontineName";
        $html = self::templateInvitation($recipientName, $tontineName, $inviteLink, $adminName);
        return self::send($recipientEmail, $recipientName, $subject, $html);
    }

    /**
     * Envoyer un rappel de paiement
     */
    public static function sendPaymentReminder(
        string $recipientEmail,
        string $recipientName,
        string $tontineName,
        float $amount,
        string $dueDate
    ): bool {
        $subject = "⏰ Rappel : Paiement dû — $tontineName";
        $html = self::templatePaymentReminder($recipientName, $tontineName, $amount, $dueDate);
        return self::send($recipientEmail, $recipientName, $subject, $html);
    }

    /**
     * Envoyer confirmation de paiement
     */
    public static function sendPaymentConfirmation(
        string $recipientEmail,
        string $recipientName,
        string $tontineName,
        float $amount,
        int $tour
    ): bool {
        $subject = "✅ Paiement confirmé — $tontineName";
        $html = self::templatePaymentConfirmation($recipientName, $tontineName, $amount, $tour);
        return self::send($recipientEmail, $recipientName, $subject, $html);
    }

    /**
     * Envoyer notification de cagnotte versée
     */
    public static function sendDisbursement(
        string $recipientEmail,
        string $recipientName,
        string $tontineName,
        float $amount,
        int $tour
    ): bool {
        $subject = "🎉 Cagnotte reçue ! — $tontineName";
        $html = self::templateDisbursement($recipientName, $tontineName, $amount, $tour);
        return self::send($recipientEmail, $recipientName, $subject, $html);
    }

    /**
     * Envoyer email de vérification
     */
    public static function sendVerification(
        string $recipientEmail,
        string $recipientName,
        string $verificationLink
    ): bool {
        $subject = "Vérifiez votre email — Tontines Facile";
        $html = self::templateVerification($recipientName, $verificationLink);
        return self::send($recipientEmail, $recipientName, $subject, $html);
    }

    /**
     * Envoyer réinitialisation de mot de passe
     */
    public static function sendPasswordReset(
        string $recipientEmail,
        string $recipientName,
        string $resetLink
    ): bool {
        $subject = "Réinitialiser votre mot de passe — Tontines Facile";
        $html = self::templatePasswordReset($recipientName, $resetLink);
        return self::send($recipientEmail, $recipientName, $subject, $html);
    }

    /**
     * Méthode principale d'envoi SMTP
     */
    private static function send(
        string $to,
        string $toName,
        string $subject,
        string $html
    ): bool {
        $config = [
            'host'   => MAIL_HOST,
            'port'   => MAIL_PORT,
            'auth'   => true,
            'user'   => MAIL_USERNAME,
            'pass'   => MAIL_PASSWORD,
            'secure' => MAIL_PORT == 465 ? 'ssl' : 'tls',
        ];

        try {
            if (class_exists('PHPMailer\\PHPMailer\\PHPMailer')) {
                return self::sendWithPHPMailer($to, $toName, $subject, $html, $config);
            }
            return self::sendWithNativeMail($to, $toName, $subject, $html);
        } catch (Throwable $e) {
            error_log("Email error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Envoyer avec PHPMailer
     */
    private static function sendWithPHPMailer(
        string $to,
        string $toName,
        string $subject,
        string $html,
        array $config
    ): bool {
        $mail = new \PHPMailer\\PHPMailer\\PHPMailer(true);
        $mail->isSMTP();
        $mail->Host       = $config['host'];
        $mail->Port       = $config['port'];
        $mail->SMTPAuth   = $config['auth'];
        $mail->Username   = $config['user'];
        $mail->Password   = $config['pass'];
        $mail->SMTPSecure = $config['secure'];
        $mail->setFrom(MAIL_FROM_ADDRESS, MAIL_FROM_NAME);
        $mail->addAddress($to, $toName);
        $mail->Subject = $subject;
        $mail->isHTML(true);
        $mail->Body = $html;
        $mail->CharSet = 'UTF-8';
        return $mail->send();
    }

    /**
     * Envoyer avec mail() natif (fallback)
     */
    private static function sendWithNativeMail(
        string $to,
        string $toName,
        string $subject,
        string $html
    ): bool {
        $headers = "MIME-Version: 1.0\r\n";
        $headers .= "Content-type: text/html; charset=UTF-8\r\n";
        $headers .= "From: " . MAIL_FROM_NAME . " <" . MAIL_FROM_ADDRESS . ">\r\n";
        $headers .= "Reply-To: " . MAIL_FROM_ADDRESS . "\r\n";
        return mail($to, $subject, $html, $headers);
    }

    private static function templateInvitation(string $name, string $tontineName, string $link, string $adminName): string {
        return <<<HTML
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #0f6b4a; margin: 0;">Tontines Facile</h1>
            </div>
            <div style="background: #f8f9fa; padding: 30px; border-radius: 8px;">
                <p>Bonjour <strong>$name</strong>,</p>
                <p>$adminName vous invite à rejoindre la tontine <strong>$tontineName</strong> ! 🎉</p>
                <p>Une tontine est un groupe d'épargne collective où chaque membre contribue régulièrement et reçoit la cagnotte à tour de rôle.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="$link" style="display: inline-block; background: #0f6b4a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">Accepter l'invitation</a>
                </div>
                <p style="color: #666; font-size: 12px;">Ou copiez ce lien : <code>$link</code></p>
            </div>
            <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
                <p>© 2025 Tontines Facile — Gérez vos tontines en toute transparence</p>
            </div>
        </div>
        HTML;
    }

    private static function templatePaymentReminder(string $name, string $tontineName, float $amount, string $dueDate): string {
        $formattedAmount = number_format($amount, 0, ',', ' ');
        return <<<HTML
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #0f6b4a; margin: 0;">⏰ Rappel de paiement</h1>
            </div>
            <div style="background: #fff3cd; padding: 20px; border-left: 4px solid #ffc107; border-radius: 4px;">
                <p>Bonjour $name,</p>
                <p>Votre paiement pour la tontine <strong>$tontineName</strong> est attendu :</p>
                <div style="background: white; padding: 15px; border-radius: 4px; margin: 20px 0;">
                    <p style="margin: 0;">📅 <strong>Date limite :</strong> $dueDate</p>
                    <p style="margin: 10px 0 0 0;">💰 <strong>Montant :</strong> $formattedAmount FCFA</p>
                </div>
            </div>
        </div>
        HTML;
    }

    private static function templatePaymentConfirmation(string $name, string $tontineName, float $amount, int $tour): string {
        $formattedAmount = number_format($amount, 0, ',', ' ');
        return <<<HTML
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #28a745; margin: 0;">✅ Paiement confirmé</h1>
            </div>
            <div style="background: #d4edda; padding: 20px; border-left: 4px solid #28a745; border-radius: 4px;">
                <p>Bonjour $name,</p>
                <p>Votre paiement a été enregistré avec succès ! 🎉</p>
                <div style="background: white; padding: 15px; border-radius: 4px; margin: 20px 0;">
                    <p style="margin: 0;">💰 <strong>Montant :</strong> $formattedAmount FCFA</p>
                    <p style="margin: 10px 0 0 0;">🔄 <strong>Tontine :</strong> $tontineName (Tour $tour)</p>
                </div>
            </div>
        </div>
        HTML;
    }

    private static function templateDisbursement(string $name, string $tontineName, float $amount, int $tour): string {
        $formattedAmount = number_format($amount, 0, ',', ' ');
        return <<<HTML
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #0f6b4a; margin: 0;">🎉 Cagnotte reçue !</h1>
            </div>
            <div style="background: #d1ecf1; padding: 20px; border-left: 4px solid #0c5460; border-radius: 4px;">
                <p>Bonjour $name,</p>
                <p>Félicitations ! Vous êtes le bénéficiaire du tour $tour ! 🏆</p>
                <div style="background: white; padding: 15px; border-radius: 4px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 24px; color: #0f6b4a;"><strong>$formattedAmount FCFA</strong></p>
                </div>
            </div>
        </div>
        HTML;
    }

    private static function templateVerification(string $name, string $link): string {
        return <<<HTML
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #0f6b4a; text-align: center;">Vérifiez votre email</h1>
            <div style="background: #f8f9fa; padding: 30px; border-radius: 8px;">
                <p>Bonjour $name,</p>
                <p>Merci de vous être inscrit à Tontines Facile ! Cliquez sur le lien ci-dessous :</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="$link" style="display: inline-block; background: #0f6b4a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">Vérifier mon email</a>
                </div>
            </div>
        </div>
        HTML;
    }

    private static function templatePasswordReset(string $name, string $link): string {
        return <<<HTML
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #0f6b4a; text-align: center;">Réinitialiser votre mot de passe</h1>
            <div style="background: #f8f9fa; padding: 30px; border-radius: 8px;">
                <p>Bonjour $name,</p>
                <p>Vous avez demandé la réinitialisation. Cliquez sur le lien ci-dessous :</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="$link" style="display: inline-block; background: #0f6b4a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">Réinitialiser</a>
                </div>
                <p style="color: #666; font-size: 12px;">Ce lien expire dans 1 heure.</p>
            </div>
        </div>
        HTML;
    }
}
