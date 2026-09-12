/**
 * ==============================================================================================
 * MODULE GESTIONNAIRE DE SERVICE WORKER (js/pwa/sw-manager.js)
 * ==============================================================================================
 * Ce module orchestre l'enregistrement et les mises à jour du Service Worker de l'application :
 * 1. Enregistrement du fichier 'sw.js' au démarrage si le navigateur prend en charge les Service Workers.
 * 2. Détection de nouvelles versions du cache et notification de l'utilisateur.
 * 3. Prise en charge du rafraîchissement automatique lors de l'activation d'un nouveau Service Worker.
 * 4. Gestion de la communication par messages (postMessage) avec le Service Worker actif.
 * ==============================================================================================
 */

// Définition de l'objet ServiceWorkerManager exposé globalement sur window
window.SWManager = {

  // Référence vers l'enregistrement actif du Service Worker
  registration: null,

  /**
   * Initialise et enregistre le Service Worker de l'application.
   */
  async register() {
    // Vérification de la compatibilité du navigateur avec l'API 'serviceWorker'
    if (!('serviceWorker' in navigator)) {
      console.warn('[SWManager] Les Service Workers ne sont pas supportés par ce navigateur.');
      return;
    }

    try {
      // Enregistrement du script sw.js situé à la racine du projet avec une portée (scope) globale
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      // Sauvegarde de l'instance d'enregistrement
      this.registration = reg;
      console.log('[SWManager] Service Worker enregistré avec succès avec la portée :', reg.scope);

      // Écoute des mises à jour de version du Service Worker
      reg.addEventListener('updatefound', () => {
        // Récupère le nouveau worker en cours d'installation
        const newWorker = reg.installing;
        if (!newWorker) return;

        // Écoute les changements d'état du nouveau worker
        newWorker.addEventListener('statechange', () => {
          // Si le nouveau worker est entièrement installé et qu'un ancien contrôleur existe déjà
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[SWManager] Une nouvelle version de l\'application Tontine est disponible.');
            // Affiche une notification pour informer l'utilisateur qu'une mise à jour est prête
            if (window.Toast) {
              window.Toast.show('Une nouvelle version est disponible ! Redémarrage en cours...', 'info');
            }
            // Envoie un signal au nouveau worker pour qu'il s'active immédiatement (SKIP_WAITING)
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });

      // Écoute de l'événement controllerchange : déclenché lorsqu'un nouveau Service Worker prend les commandes
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Empêche les rechargements en boucle
        if (!refreshing) {
          refreshing = true;
          // Recharge proprement la page pour appliquer la nouvelle version mise en cache
          window.location.reload();
        }
      });

    } catch (error) {
      // Journalise une erreur si l'enregistrement a échoué (ex: non-HTTPS en production)
      console.error('[SWManager] Échec de l\'enregistrement du Service Worker :', error);
    }
  },

  /**
   * Force la vérification d'une mise à jour auprès du serveur.
   */
  async checkForUpdate() {
    // Si un enregistrement est actif, demande au navigateur de contacter le serveur
    if (this.registration) {
      try {
        await this.registration.update();
        console.log('[SWManager] Recherche manuelle de mise à jour effectuée.');
      } catch (err) {
        console.warn('[SWManager] Impossible de vérifier la mise à jour :', err);
      }
    }
  }
};
