<?php
/* ══════════════════════════════════════════════════════════════════
   TONTINES FACILE — MobileMoney.php
   Gestion informations Mobile Money (non-custodial)
   L'app ne détient jamais aucun fonds : elle affiche simplement
   les coordonnées de l'admin pour que les membres envoient
   directement en pair-à-pair via leur opérateur.
   
   Pays supportés : Cameroun, Côte d'Ivoire, Sénégal, Mali,
                    Burkina Faso, Togo, Bénin, Ghana, Nigeria,
                    Guinée Conakry, Tchad, Congo-Brazzaville
   ══════════════════════════════════════════════════════════════════ */

declare(strict_types=1);

class MobileMoney {

    /* ── Opérateurs supportés par pays ──
       Structure : 'code_operateur' => [
         'name'       => Nom affiché
         'countries'  => Pays supportés (indicatifs)
         'prefixes'   => Préfixes de numéros valides (regex par pays)
         'ussd'       => Format USSD de transfert (optionnel)
         'logo_emoji' => Emoji logo
       ]
    */
    public const OPERATORS = [
        'mtn' => [
            'name'        => 'MTN Mobile Money',
            'countries'   => ['CM', 'CI', 'GH', 'BF', 'BJ', 'GN', 'RW', 'UG', 'ZA', 'ZM'],
            'logo_emoji'  => '🟡',
            'color'       => '#FFCC00',
        ],
        'orange' => [
            'name'        => 'Orange Money',
            'countries'   => ['CM', 'CI', 'SN', 'ML', 'BF', 'GN', 'CD', 'TG', 'MR'],
            'logo_emoji'  => '🟠',
            'color'       => '#FF6600',
        ],
        'wave' => [
            'name'        => 'Wave',
            'countries'   => ['SN', 'CI', 'ML', 'BF', 'GN', 'GW'],
            'logo_emoji'  => '🔵',
            'color'       => '#1B73E8',
        ],
        'moov' => [
            'name'        => 'Moov Money',
            'countries'   => ['CI', 'BF', 'ML', 'TG', 'BJ', 'NE'],
            'logo_emoji'  => '🔴',
            'color'       => '#E52B21',
        ],
        'momo_gh' => [
            'name'        => 'MTN Ghana MoMo',
            'countries'   => ['GH'],
            'logo_emoji'  => '🟡',
            'color'       => '#FFCC00',
        ],
        'mpesa' => [
            'name'        => 'M-Pesa',
            'countries'   => ['KE', 'TZ', 'MZ', 'ET', 'EG', 'ZA', 'GH'],
            'logo_emoji'  => '🟢',
            'color'       => '#00A550',
        ],
        'airtel' => [
            'name'        => 'Airtel Money',
            'countries'   => ['KE', 'TZ', 'UG', 'RW', 'ZM', 'MW', 'CD', 'MG', 'NE', 'NG'],
            'logo_emoji'  => '🔴',
            'color'       => '#ED1C24',
        ],
        'free' => [
            'name'        => 'Free Money',
            'countries'   => ['SN'],
            'logo_emoji'  => '🔴',
            'color'       => '#CC0000',
        ],
    ];

    /* ── Validation du numéro par pays ── */
    private const PHONE_PATTERNS = [
        /* Cameroun : 9 chiffres, commence par 6 */
        'CM' => '/^(\+237|00237)?6[5-9]\d{7}$/',
        /* Côte d'Ivoire : 10 chiffres, commence par 07, 05, 01, 27, 25, 21 */
        'CI' => '/^(\+225|00225)?(07|05|01|27|25|21)\d{8}$/',
        /* Sénégal : 9 chiffres, commence par 7 */
        'SN' => '/^(\+221|00221)?7[05-9]\d{7}$/',
        /* Mali : 8 chiffres, commence par 7 ou 9 */
        'ML' => '/^(\+223|00223)?[79]\d{7}$/',
        /* Burkina Faso : 8 chiffres, commence par 7 */
        'BF' => '/^(\+226|00226)?[67]\d{7}$/',
        /* Ghana : 9-10 chiffres */
        'GH' => '/^(\+233|00233)?[235]\d{8}$/',
        /* Nigeria : 11 chiffres, commence par 070-090 */
        'NG' => '/^(\+234|00234)?0[789]\d{9}$/',
        /* Guinée Conakry : 9 chiffres */
        'GN' => '/^(\+224|00224)?6[0-9]\d{7}$/',
        /* Togo : 8 chiffres */
        'TG' => '/^(\+228|00228)?[79]\d{7}$/',
        /* Bénin : 8 chiffres */
        'BJ' => '/^(\+229|00229)?6[4-9]\d{6}$/',
        /* Kenya : 9-10 chiffres */
        'KE' => '/^(\+254|00254)?[17]\d{8}$/',
        /* Générique international */
        'INT' => '/^\+?[1-9]\d{7,14}$/',
    ];

    /**
     * Valider un numéro Mobile Money pour un opérateur donné.
     * Si le pays n'est pas spécifié, on utilise une validation générique.
     * Retourne le numéro nettoyé (chiffres uniquement) ou '' si invalide.
     */
    public static function validateNumber(string $number, string $operator = '', string $country = ''): string {
        /* Garder uniquement les chiffres et le + initial */
        $clean = preg_replace('/[^\d+]/', '', $number);

        $pattern = self::PHONE_PATTERNS[$country] ?? self::PHONE_PATTERNS['INT'];
        if (!preg_match($pattern, $clean)) {
            return '';
        }

        /* Retourner le numéro sans indicatif pays (juste les chiffres locaux) */
        return preg_replace('/^\+\d{1,3}|^00\d{1,3}/', '', $clean);
    }

    /**
     * Obtenir la liste des opérateurs disponibles pour un pays.
     * Si country est vide, retourner tous les opérateurs.
     */
    public static function getOperatorsForCountry(string $country = ''): array {
        if (!$country) return self::OPERATORS;

        return array_filter(self::OPERATORS, function ($op) use ($country) {
            return in_array(strtoupper($country), $op['countries'], true);
        });
    }

    /**
     * Obtenir les informations d'un opérateur.
     */
    public static function getOperator(string $code): ?array {
        return self::OPERATORS[strtolower($code)] ?? null;
    }

    /**
     * Générer un lien de paiement / instructions pour l'utilisateur.
     * Retourne un tableau avec toutes les infos nécessaires à l'affichage.
     */
    public static function getPaymentInfo(
        string $operator,
        string $number,
        float  $amount,
        string $currency = 'FCFA',
        string $reference = ''
    ): array {
        $op = self::getOperator($operator);
        if (!$op) {
            return ['error' => 'Opérateur inconnu'];
        }

        $formattedAmount = number_format($amount, 0, ',', ' ') . ' ' . $currency;
        $instructions    = self::buildInstructions($operator, $number, $amount, $currency, $reference);

        return [
            'operator'          => $operator,
            'operatorName'      => $op['name'],
            'operatorEmoji'     => $op['logo_emoji'],
            'operatorColor'     => $op['color'],
            'number'            => $number,
            'formattedAmount'   => $formattedAmount,
            'instructions'      => $instructions,
            'reference'         => $reference,
        ];
    }

    /**
     * Construire les instructions de paiement selon l'opérateur.
     */
    private static function buildInstructions(
        string $operator, string $number, float $amount,
        string $currency, string $reference
    ): array {
        $formattedAmount = number_format($amount, 0, ',', ' ') . ' ' . $currency;
        $ref = $reference ? " (Réf: $reference)" : '';

        return match($operator) {
            'mtn' => [
                "Composez *126# sur votre téléphone",
                "Choisissez : Transférer de l'argent",
                "Entrez le numéro : $number",
                "Entrez le montant : $formattedAmount",
                "Motif/Note : Cotisation tontine$ref",
                "Confirmez avec votre code PIN MTN MoMo",
            ],
            'orange' => [
                "Composez #144# sur votre téléphone",
                "Choisissez : Transfert d'argent",
                "Entrez le numéro : $number",
                "Entrez le montant : $formattedAmount",
                "Motif : Cotisation tontine$ref",
                "Validez avec votre code PIN Orange Money",
            ],
            'wave' => [
                "Ouvrez l'application Wave",
                "Appuyez sur 'Envoyer'",
                "Entrez le numéro : $number",
                "Montant : $formattedAmount",
                "Note : Cotisation tontine$ref",
                "Confirmez l'envoi",
            ],
            'moov' => [
                "Composez *555# sur votre téléphone",
                "Sélectionnez : Transfert",
                "Entrez le numéro : $number",
                "Entrez le montant : $formattedAmount",
                "Note : Cotisation tontine$ref",
                "Confirmez avec votre PIN Moov Money",
            ],
            'mpesa' => [
                "Composez *150*00# (M-Pesa)",
                "Choisissez : Envoi d'argent",
                "Entrez le numéro : $number",
                "Entrez le montant : $formattedAmount",
                "Note : Cotisation tontine$ref",
                "Confirmez avec votre PIN M-Pesa",
            ],
            default => [
                "Envoyez $formattedAmount au numéro : $number",
                "Via votre opérateur Mobile Money habituel",
                "Note : Cotisation tontine$ref",
                "Prenez une capture d'écran pour confirmer",
            ],
        };
    }
}
