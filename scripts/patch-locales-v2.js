#!/usr/bin/env node
// scripts/patch-locales-v2.js
// Run: node scripts/patch-locales-v2.js
// Adds ALL keys found in the hardcoded-string audit to all 9 locale files.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.join(__dirname, "..", "src", "i18n", "locales");

function deepMerge(target, source) {
  const out = { ...target };
  for (const [k, v] of Object.entries(source)) {
    if (
      v &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      typeof out[k] === "object"
    ) {
      out[k] = deepMerge(out[k], v);
    } else if (!(k in out)) {
      out[k] = v;
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// All new keys grouped by namespace
// ─────────────────────────────────────────────────────────────────────────────
const PATCHES = {
  en: {
    // ── verification ─────────────────────────────────────────────────────────
    verification: {
      selectIdType: "Select ID Type",
      tapToChange: "Tap to change",
      uploadInstruction: "Click to upload or drag and drop",
      uploadHint: "JPG, PNG or PDF — max 10MB",
      accountStatus: "ACCOUNT STATUS",
      pendingTitle: "Verification under review",
      pendingBody:
        "Your documents have been submitted and are being reviewed by our team. This usually takes 24–48 hours. You'll receive a notification once the review is complete.",
      verifiedTitle: "Account Verified",
      verifiedBody:
        "Your account is fully verified. Workers can see your Verified badge and are more likely to respond quickly.",
      rejectedTitle: "Verification Rejected",
      rejectedBody:
        "Your verification was rejected. Please review the reason and re-submit with a valid document.",
      tryAgain: "Try Again",
      heroTitle: "Account Verification",
      submitBtn: "Submit for Verification",
      uploadIdLabel: "Upload ID Document",
      uploadCacLabel: "Upload CAC / Registration Document",
      uploadTitle: "Upload Document",
      chooseSource: "Choose source",
      errorFilePicker: "Could not open file picker",
      errorIdType: "Please select an ID type",
      errorIdNumber: "Please enter your ID number",
      errorCompanyName: "Please enter your company name",
      errorRegNumber: "Please enter your registration number",
      errorDocument: "Please upload a verification document",
      successSubmit: "Verification submitted! We'll review within 24–48 hours.",
      submissionDate: "Submitted: {{date}}",
    },
    // ── featured ─────────────────────────────────────────────────────────────
    featured: {
      title: "⭐ Featured Listing",
      subtitle: "Appear at the top of search and get more visibility",
      categoryLabel: "Feature in specific category (optional):",
      allCategories: "All categories",
      bestValue: "Best Value",
      activeListing: "Featured listing is active",
      activeExpires: "Expires {{date}}",
      activateBtn: "⭐ Activate Featured Listing",
      selectPackage: "Please select a package",
      summary: "{{name}} — {{currency}} {{price}} for {{days}} days",
      errorLoad: "Failed to load featured options",
    },
    // ── subscriptions ─────────────────────────────────────────────────────────
    subscriptions: {
      title: "Choose Your Plan",
      subtitle: "Hire smarter, faster, and at scale",
      cancel: "Cancel",
      cancelTitle: "Cancel Subscription",
      cancelMessage:
        "Are you sure? You'll keep access until the end of the billing period.",
      keepPlan: "Keep Plan",
      cancelSub: "Cancel Subscription",
      cancelSuccess: "Subscription cancelled. Access remains until period end.",
      errorLoad: "Failed to load plans",
      errorCancel: "Failed to cancel subscription",
      disclaimer:
        "Payments processed securely. Cancel anytime. All prices in USD.",
      currentPlan: "Current Plan",
      freePlan: "Free Plan",
      upgradeTo: "Upgrade to {{name}}",
      activating: "Activating...",
      activeLabel: "Active: {{name}}",
      renews: "Renews {{date}}",
    },
    // ── disputes (new strings only — rest already exist) ──────────────────────
    disputes: {
      bookingDispute: "Booking dispute",
      hirer: "Hirer",
      worker: "Worker",
      payment: "Payment",
      errorLoad: "Failed to load disputes.",
    },
    // ── posts (new strings only) ───────────────────────────────────────────────
    posts: {
      errorPermission: "Camera roll permission required.",
      errorEmpty: "Write something before posting.",
      errorEmptyFeed: "Write something first.",
      errorPermissionFeed: "Permission required.",
      errorLoad: "Failed to load posts.",
      errorLoadFeed: "Failed to load feed.",
      comment: "Comment",
      repost: "Repost",
      reposted: "Reposted",
    },
    // ── messages (new strings) ─────────────────────────────────────────────────
    messages: {
      viewAttachment: "View attachment",
      errorPermission: "Permission denied",
      attachTitle: "Attach",
      chooseType: "Choose type",
    },
    // ── workerProfile (new strings) ────────────────────────────────────────────
    workerProfile: {
      yearsExperience: "YEARS EXPERIENCE",
      serviceRadius: "SERVICE RADIUS",
      memberSince: "MEMBER SINCE",
      reviews: "Reviews",
    },
    // ── payments (using existing orphaned keys — just ensure they exist) ───────
    payments: {
      receiptTitle: "Payment Receipt",
      youPaid: "You paid",
      receipt: "Receipt",
      release: "Release",
      noTransactions: "No transactions yet",
      noTransactionsSub:
        "Your payment history will appear here once you book a worker.",
      releaseSuccess: "Payment released to worker!",
    },
    // ── browse (new strings) ───────────────────────────────────────────────────
    browse: {
      availableOnly: "Available only",
      hourlyRate: "HOURLY RATE",
      maxDistance: "MAX DISTANCE",
      genderPreference: "GENDER PREFERENCE",
      locationDenied: "Location permission denied",
      voiceSearchSoon: "Voice search coming soon",
    },
    // ── bookingDetail (new strings) ────────────────────────────────────────────
    bookingDetail: {
      confirmTransfer: "Confirm Your Transfer",
      submitConfirmation: "Submit Confirmation",
      submitHash: "Submit Transaction Hash",
      submitTransaction: "Submit Transaction",
      namePlaceholder: "Your name on the transfer",
      paymentEscrow: "Payment already in escrow.",
      transferConfirmed: "Transfer confirmed! We'll verify within 24 hours.",
      txSubmitted: "Submitted! We'll verify your transaction.",
      paymentReleased: "Payment released to worker!",
      videoCallSoon: "Video call coming soon",
      messagesSoon: "Messages coming soon",
    },
    // ── jobDetail (new strings) ────────────────────────────────────────────────
    jobDetail: {
      messagesSoon: "Messages coming soon",
      stripeCardSoon: "Stripe card payment coming soon",
      bankTransferSoon: "Bank transfer details coming soon",
      insuranceSoon: "Insurance payment via Stripe coming soon",
      releaseSoon: "Release payment coming soon",
      videoCallSoon: "Video call coming soon",
      disputeSoon: "Dispute system coming soon",
    },
    // ── categoryDetail (new strings) ───────────────────────────────────────────
    categoryDetail: {
      notFound: "Category not found",
      noWorkers: "No workers found in this category",
      browseOther: "Browse other categories",
      workersAvailable: "{{count}} workers available",
    },
    // ── createBooking additions ────────────────────────────────────────────────
    createBooking: {
      notOffered: "Not offered",
      addressPlaceholder: "Full address where the job will take place",
    },
    // ── common additions ───────────────────────────────────────────────────────
    common: {
      hirer: "Hirer",
      noMatch: "No currencies match",
    },
    // ── auth additions ─────────────────────────────────────────────────────────
    auth: {
      hirerAppOnly:
        "This is the Hirer app. Please install the Worker app to register as a worker.",
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // ES — Spanish
  // ───────────────────────────────────────────────────────────────────────────
  es: {
    verification: {
      selectIdType: "Seleccionar tipo de ID",
      tapToChange: "Toca para cambiar",
      uploadInstruction: "Haz clic para subir o arrastra aquí",
      uploadHint: "JPG, PNG o PDF — máx 10MB",
      accountStatus: "ESTADO DE CUENTA",
      pendingTitle: "Verificación en revisión",
      pendingBody:
        "Tus documentos han sido enviados y están siendo revisados por nuestro equipo. Esto tarda entre 24 y 48 horas. Recibirás una notificación cuando finalice.",
      verifiedTitle: "Cuenta Verificada",
      verifiedBody:
        "Tu cuenta está completamente verificada. Los trabajadores pueden ver tu insignia y es más probable que respondan.",
      rejectedTitle: "Verificación Rechazada",
      rejectedBody:
        "Tu verificación fue rechazada. Por favor revisa el motivo y vuelve a enviar un documento válido.",
      tryAgain: "Intentar de nuevo",
      heroTitle: "Verificación de Cuenta",
      submitBtn: "Enviar para Verificación",
      uploadIdLabel: "Subir Documento de ID",
      uploadCacLabel: "Subir Documento de Registro / CAC",
      uploadTitle: "Subir Documento",
      chooseSource: "Elegir fuente",
      errorFilePicker: "No se pudo abrir el selector de archivos",
      errorIdType: "Por favor selecciona un tipo de ID",
      errorIdNumber: "Por favor ingresa tu número de ID",
      errorCompanyName: "Por favor ingresa el nombre de tu empresa",
      errorRegNumber: "Por favor ingresa el número de registro",
      errorDocument: "Por favor sube un documento de verificación",
      successSubmit: "¡Verificación enviada! Revisaremos en 24–48 horas.",
      submissionDate: "Enviado: {{date}}",
    },
    featured: {
      title: "⭐ Listado Destacado",
      subtitle: "Aparece al inicio de la búsqueda y obtén más visibilidad",
      categoryLabel: "Destacar en categoría específica (opcional):",
      allCategories: "Todas las categorías",
      bestValue: "Mejor Valor",
      activeListing: "Listado destacado activo",
      activeExpires: "Expira {{date}}",
      activateBtn: "⭐ Activar Listado Destacado",
      selectPackage: "Por favor selecciona un paquete",
      summary: "{{name}} — {{currency}} {{price}} por {{days}} días",
      errorLoad: "Error al cargar opciones destacadas",
    },
    subscriptions: {
      title: "Elige Tu Plan",
      subtitle: "Contrata de forma más inteligente, rápida y escalable",
      cancel: "Cancelar",
      cancelTitle: "Cancelar Suscripción",
      cancelMessage:
        "¿Estás seguro? Mantendrás el acceso hasta el final del período de facturación.",
      keepPlan: "Mantener Plan",
      cancelSub: "Cancelar Suscripción",
      cancelSuccess:
        "Suscripción cancelada. El acceso continúa hasta el final del período.",
      errorLoad: "Error al cargar los planes",
      errorCancel: "Error al cancelar la suscripción",
      disclaimer:
        "Pagos procesados de forma segura. Cancela cuando quieras. Precios en USD.",
      currentPlan: "Plan Actual",
      freePlan: "Plan Gratuito",
      upgradeTo: "Mejorar a {{name}}",
      activating: "Activando...",
      activeLabel: "Activo: {{name}}",
      renews: "Renueva el {{date}}",
    },
    disputes: {
      bookingDispute: "Disputa de reserva",
      hirer: "Contratante",
      worker: "Trabajador",
      payment: "Pago",
      errorLoad: "Error al cargar disputas.",
    },
    posts: {
      errorPermission: "Se requiere permiso para la galería.",
      errorEmpty: "Escribe algo antes de publicar.",
      errorEmptyFeed: "Escribe algo primero.",
      errorPermissionFeed: "Permiso requerido.",
      errorLoad: "Error al cargar publicaciones.",
      errorLoadFeed: "Error al cargar el feed.",
      comment: "Comentar",
      repost: "Repostear",
      reposted: "Reposteado",
    },
    messages: {
      viewAttachment: "Ver archivo adjunto",
      errorPermission: "Permiso denegado",
      attachTitle: "Adjuntar",
      chooseType: "Elegir tipo",
    },
    workerProfile: {
      yearsExperience: "AÑOS DE EXPERIENCIA",
      serviceRadius: "RADIO DE SERVICIO",
      memberSince: "MIEMBRO DESDE",
      reviews: "Reseñas",
    },
    payments: {
      receiptTitle: "Recibo de Pago",
      youPaid: "Pagaste",
      receipt: "Recibo",
      release: "Liberar",
      noTransactions: "Sin transacciones aún",
      noTransactionsSub:
        "Tu historial de pagos aparecerá aquí cuando reserves un trabajador.",
      releaseSuccess: "¡Pago liberado al trabajador!",
    },
    browse: {
      availableOnly: "Solo disponibles",
      hourlyRate: "TARIFA POR HORA",
      maxDistance: "DISTANCIA MÁXIMA",
      genderPreference: "PREFERENCIA DE GÉNERO",
      locationDenied: "Permiso de ubicación denegado",
      voiceSearchSoon: "Búsqueda por voz próximamente",
    },
    bookingDetail: {
      confirmTransfer: "Confirmar Tu Transferencia",
      submitConfirmation: "Enviar Confirmación",
      submitHash: "Enviar Hash de Transacción",
      submitTransaction: "Enviar Transacción",
      namePlaceholder: "Tu nombre en la transferencia",
      paymentEscrow: "El pago ya está en custodia.",
      transferConfirmed:
        "¡Transferencia confirmada! Verificaremos en 24 horas.",
      txSubmitted: "¡Enviado! Verificaremos tu transacción.",
      paymentReleased: "¡Pago liberado al trabajador!",
      videoCallSoon: "Videollamada próximamente",
      messagesSoon: "Mensajes próximamente",
    },
    jobDetail: {
      messagesSoon: "Mensajes próximamente",
      stripeCardSoon: "Pago con tarjeta Stripe próximamente",
      bankTransferSoon: "Detalles de transferencia bancaria próximamente",
      insuranceSoon: "Pago de seguro vía Stripe próximamente",
      releaseSoon: "Liberación de pago próximamente",
      videoCallSoon: "Videollamada próximamente",
      disputeSoon: "Sistema de disputas próximamente",
    },
    categoryDetail: {
      notFound: "Categoría no encontrada",
      noWorkers: "No se encontraron trabajadores en esta categoría",
      browseOther: "Explorar otras categorías",
      workersAvailable: "{{count}} trabajadores disponibles",
    },
    createBooking: {
      notOffered: "No disponible",
      addressPlaceholder: "Dirección completa donde se realizará el trabajo",
    },
    common: { hirer: "Contratante", noMatch: "Sin coincidencias de moneda" },
    auth: {
      hirerAppOnly:
        "Esta es la app de Contratantes. Instala la app de Trabajadores para registrarte como trabajador.",
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // FR — French
  // ───────────────────────────────────────────────────────────────────────────
  fr: {
    verification: {
      selectIdType: "Sélectionner le type d'ID",
      tapToChange: "Appuyer pour changer",
      uploadInstruction: "Cliquer pour télécharger ou glisser-déposer",
      uploadHint: "JPG, PNG ou PDF — max 10 Mo",
      accountStatus: "STATUT DU COMPTE",
      pendingTitle: "Vérification en cours",
      pendingBody:
        "Vos documents ont été soumis et sont examinés par notre équipe. Cela prend habituellement 24 à 48 heures. Vous recevrez une notification une fois l'examen terminé.",
      verifiedTitle: "Compte Vérifié",
      verifiedBody:
        "Votre compte est entièrement vérifié. Les travailleurs peuvent voir votre badge Vérifié et sont plus susceptibles de répondre rapidement.",
      rejectedTitle: "Vérification Rejetée",
      rejectedBody:
        "Votre vérification a été rejetée. Veuillez vérifier la raison et soumettre à nouveau un document valide.",
      tryAgain: "Réessayer",
      heroTitle: "Vérification du Compte",
      submitBtn: "Soumettre pour Vérification",
      uploadIdLabel: "Télécharger le Document d'Identité",
      uploadCacLabel: "Télécharger le Document d'Enregistrement",
      uploadTitle: "Télécharger le Document",
      chooseSource: "Choisir la source",
      errorFilePicker: "Impossible d'ouvrir le sélecteur de fichiers",
      errorIdType: "Veuillez sélectionner un type d'ID",
      errorIdNumber: "Veuillez entrer votre numéro d'ID",
      errorCompanyName: "Veuillez entrer le nom de votre entreprise",
      errorRegNumber: "Veuillez entrer le numéro d'enregistrement",
      errorDocument: "Veuillez télécharger un document de vérification",
      successSubmit:
        "Vérification soumise ! Nous examinerons dans les 24–48 heures.",
      submissionDate: "Soumis le : {{date}}",
    },
    featured: {
      title: "⭐ Annonce Mise en Avant",
      subtitle:
        "Apparaissez en haut des résultats de recherche pour plus de visibilité",
      categoryLabel:
        "Mettre en avant dans une catégorie spécifique (optionnel) :",
      allCategories: "Toutes les catégories",
      bestValue: "Meilleur Rapport Qualité-Prix",
      activeListing: "Annonce mise en avant active",
      activeExpires: "Expire le {{date}}",
      activateBtn: "⭐ Activer l'Annonce Mise en Avant",
      selectPackage: "Veuillez sélectionner un forfait",
      summary: "{{name}} — {{currency}} {{price}} pour {{days}} jours",
      errorLoad: "Impossible de charger les options de mise en avant",
    },
    subscriptions: {
      title: "Choisissez Votre Forfait",
      subtitle: "Recrutez plus intelligemment, rapidement et à grande échelle",
      cancel: "Annuler",
      cancelTitle: "Annuler l'Abonnement",
      cancelMessage:
        "Êtes-vous sûr ? Vous conserverez l'accès jusqu'à la fin de la période de facturation.",
      keepPlan: "Conserver le Forfait",
      cancelSub: "Annuler l'Abonnement",
      cancelSuccess:
        "Abonnement annulé. L'accès reste actif jusqu'à la fin de la période.",
      errorLoad: "Impossible de charger les forfaits",
      errorCancel: "Impossible d'annuler l'abonnement",
      disclaimer:
        "Paiements traités en toute sécurité. Annulez à tout moment. Tous les prix en USD.",
      currentPlan: "Forfait Actuel",
      freePlan: "Forfait Gratuit",
      upgradeTo: "Passer à {{name}}",
      activating: "Activation...",
      activeLabel: "Actif : {{name}}",
      renews: "Renouvellement le {{date}}",
    },
    disputes: {
      bookingDispute: "Litige de réservation",
      hirer: "Recruteur",
      worker: "Travailleur",
      payment: "Paiement",
      errorLoad: "Impossible de charger les litiges.",
    },
    posts: {
      errorPermission: "Autorisation d'accès à la galerie requise.",
      errorEmpty: "Écrivez quelque chose avant de publier.",
      errorEmptyFeed: "Écrivez quelque chose d'abord.",
      errorPermissionFeed: "Autorisation requise.",
      errorLoad: "Impossible de charger les publications.",
      errorLoadFeed: "Impossible de charger le fil.",
      comment: "Commenter",
      repost: "Republier",
      reposted: "Republié",
    },
    messages: {
      viewAttachment: "Voir la pièce jointe",
      errorPermission: "Permission refusée",
      attachTitle: "Joindre",
      chooseType: "Choisir le type",
    },
    workerProfile: {
      yearsExperience: "ANNÉES D'EXPÉRIENCE",
      serviceRadius: "RAYON DE SERVICE",
      memberSince: "MEMBRE DEPUIS",
      reviews: "Avis",
    },
    payments: {
      receiptTitle: "Reçu de Paiement",
      youPaid: "Vous avez payé",
      receipt: "Reçu",
      release: "Libérer",
      noTransactions: "Aucune transaction pour l'instant",
      noTransactionsSub:
        "Votre historique de paiements apparaîtra ici une fois que vous aurez réservé un travailleur.",
      releaseSuccess: "Paiement libéré au travailleur !",
    },
    browse: {
      availableOnly: "Disponibles uniquement",
      hourlyRate: "TARIF HORAIRE",
      maxDistance: "DISTANCE MAXIMALE",
      genderPreference: "PRÉFÉRENCE DE GENRE",
      locationDenied: "Permission de localisation refusée",
      voiceSearchSoon: "Recherche vocale bientôt disponible",
    },
    bookingDetail: {
      confirmTransfer: "Confirmer Votre Virement",
      submitConfirmation: "Soumettre la Confirmation",
      submitHash: "Soumettre le Hash de Transaction",
      submitTransaction: "Soumettre la Transaction",
      namePlaceholder: "Votre nom sur le virement",
      paymentEscrow: "Le paiement est déjà en dépôt.",
      transferConfirmed:
        "Virement confirmé ! Nous vérifierons dans les 24 heures.",
      txSubmitted: "Soumis ! Nous vérifierons votre transaction.",
      paymentReleased: "Paiement libéré au travailleur !",
      videoCallSoon: "Appel vidéo bientôt disponible",
      messagesSoon: "Messages bientôt disponibles",
    },
    jobDetail: {
      messagesSoon: "Messages bientôt disponibles",
      stripeCardSoon: "Paiement par carte Stripe bientôt disponible",
      bankTransferSoon: "Détails du virement bancaire bientôt disponibles",
      insuranceSoon: "Paiement d'assurance via Stripe bientôt disponible",
      releaseSoon: "Libération du paiement bientôt disponible",
      videoCallSoon: "Appel vidéo bientôt disponible",
      disputeSoon: "Système de litiges bientôt disponible",
    },
    categoryDetail: {
      notFound: "Catégorie introuvable",
      noWorkers: "Aucun travailleur trouvé dans cette catégorie",
      browseOther: "Parcourir d'autres catégories",
      workersAvailable: "{{count}} travailleurs disponibles",
    },
    createBooking: {
      notOffered: "Non proposé",
      addressPlaceholder: "Adresse complète où le travail aura lieu",
    },
    common: { hirer: "Recruteur", noMatch: "Aucune devise correspondante" },
    auth: {
      hirerAppOnly:
        "Ceci est l'application Recruteur. Installez l'application Travailleur pour vous inscrire en tant que travailleur.",
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // PT — Portuguese
  // ───────────────────────────────────────────────────────────────────────────
  pt: {
    verification: {
      selectIdType: "Selecionar Tipo de ID",
      tapToChange: "Toque para alterar",
      uploadInstruction: "Clique para carregar ou arraste aqui",
      uploadHint: "JPG, PNG ou PDF — máx 10MB",
      accountStatus: "STATUS DA CONTA",
      pendingTitle: "Verificação em análise",
      pendingBody:
        "Os seus documentos foram enviados e estão sendo analisados pela nossa equipa. Isto normalmente demora 24 a 48 horas. Receberá uma notificação quando a análise estiver concluída.",
      verifiedTitle: "Conta Verificada",
      verifiedBody:
        "A sua conta está totalmente verificada. Os trabalhadores podem ver o seu emblema Verificado e têm maior probabilidade de responder rapidamente.",
      rejectedTitle: "Verificação Rejeitada",
      rejectedBody:
        "A sua verificação foi rejeitada. Por favor reveja o motivo e reenvie um documento válido.",
      tryAgain: "Tentar Novamente",
      heroTitle: "Verificação de Conta",
      submitBtn: "Enviar para Verificação",
      uploadIdLabel: "Carregar Documento de ID",
      uploadCacLabel: "Carregar Documento de Registo / CAC",
      uploadTitle: "Carregar Documento",
      chooseSource: "Escolher origem",
      errorFilePicker: "Não foi possível abrir o seletor de ficheiros",
      errorIdType: "Por favor selecione um tipo de ID",
      errorIdNumber: "Por favor insira o seu número de ID",
      errorCompanyName: "Por favor insira o nome da sua empresa",
      errorRegNumber: "Por favor insira o número de registo",
      errorDocument: "Por favor carregue um documento de verificação",
      successSubmit: "Verificação enviada! Iremos analisar em 24–48 horas.",
      submissionDate: "Enviado: {{date}}",
    },
    featured: {
      title: "⭐ Listagem Destacada",
      subtitle: "Apareça no topo das pesquisas e obtenha mais visibilidade",
      categoryLabel: "Destacar em categoria específica (opcional):",
      allCategories: "Todas as categorias",
      bestValue: "Melhor Valor",
      activeListing: "Listagem destacada ativa",
      activeExpires: "Expira {{date}}",
      activateBtn: "⭐ Ativar Listagem Destacada",
      selectPackage: "Por favor selecione um pacote",
      summary: "{{name}} — {{currency}} {{price}} por {{days}} dias",
      errorLoad: "Falha ao carregar opções em destaque",
    },
    subscriptions: {
      title: "Escolha o Seu Plano",
      subtitle: "Contrate de forma mais inteligente, rápida e escalável",
      cancel: "Cancelar",
      cancelTitle: "Cancelar Subscrição",
      cancelMessage:
        "Tem a certeza? Manterá o acesso até ao final do período de faturação.",
      keepPlan: "Manter Plano",
      cancelSub: "Cancelar Subscrição",
      cancelSuccess:
        "Subscrição cancelada. O acesso mantém-se até ao final do período.",
      errorLoad: "Falha ao carregar planos",
      errorCancel: "Falha ao cancelar a subscrição",
      disclaimer:
        "Pagamentos processados com segurança. Cancele quando quiser. Preços em USD.",
      currentPlan: "Plano Atual",
      freePlan: "Plano Gratuito",
      upgradeTo: "Atualizar para {{name}}",
      activating: "A ativar...",
      activeLabel: "Ativo: {{name}}",
      renews: "Renova em {{date}}",
    },
    disputes: {
      bookingDispute: "Disputa de reserva",
      hirer: "Contratante",
      worker: "Trabalhador",
      payment: "Pagamento",
      errorLoad: "Falha ao carregar disputas.",
    },
    posts: {
      errorPermission: "Permissão para galeria necessária.",
      errorEmpty: "Escreva algo antes de publicar.",
      errorEmptyFeed: "Escreva algo primeiro.",
      errorPermissionFeed: "Permissão necessária.",
      errorLoad: "Falha ao carregar publicações.",
      errorLoadFeed: "Falha ao carregar o feed.",
      comment: "Comentar",
      repost: "Repostar",
      reposted: "Repostado",
    },
    messages: {
      viewAttachment: "Ver anexo",
      errorPermission: "Permissão negada",
      attachTitle: "Anexar",
      chooseType: "Escolher tipo",
    },
    workerProfile: {
      yearsExperience: "ANOS DE EXPERIÊNCIA",
      serviceRadius: "RAIO DE SERVIÇO",
      memberSince: "MEMBRO DESDE",
      reviews: "Avaliações",
    },
    payments: {
      receiptTitle: "Recibo de Pagamento",
      youPaid: "Pagou",
      receipt: "Recibo",
      release: "Libertar",
      noTransactions: "Sem transações ainda",
      noTransactionsSub:
        "O seu historial de pagamentos aparecerá aqui quando reservar um trabalhador.",
      releaseSuccess: "Pagamento libertado ao trabalhador!",
    },
    browse: {
      availableOnly: "Apenas disponíveis",
      hourlyRate: "TAXA HORÁRIA",
      maxDistance: "DISTÂNCIA MÁXIMA",
      genderPreference: "PREFERÊNCIA DE GÉNERO",
      locationDenied: "Permissão de localização negada",
      voiceSearchSoon: "Pesquisa por voz em breve",
    },
    bookingDetail: {
      confirmTransfer: "Confirmar a Sua Transferência",
      submitConfirmation: "Enviar Confirmação",
      submitHash: "Enviar Hash de Transação",
      submitTransaction: "Enviar Transação",
      namePlaceholder: "O seu nome na transferência",
      paymentEscrow: "O pagamento já está em custódia.",
      transferConfirmed: "Transferência confirmada! Verificaremos em 24 horas.",
      txSubmitted: "Enviado! Verificaremos a sua transação.",
      paymentReleased: "Pagamento libertado ao trabalhador!",
      videoCallSoon: "Videochamada em breve",
      messagesSoon: "Mensagens em breve",
    },
    jobDetail: {
      messagesSoon: "Mensagens em breve",
      stripeCardSoon: "Pagamento com cartão Stripe em breve",
      bankTransferSoon: "Detalhes de transferência bancária em breve",
      insuranceSoon: "Pagamento de seguro via Stripe em breve",
      releaseSoon: "Liberação de pagamento em breve",
      videoCallSoon: "Videochamada em breve",
      disputeSoon: "Sistema de disputas em breve",
    },
    categoryDetail: {
      notFound: "Categoria não encontrada",
      noWorkers: "Nenhum trabalhador encontrado nesta categoria",
      browseOther: "Explorar outras categorias",
      workersAvailable: "{{count}} trabalhadores disponíveis",
    },
    createBooking: {
      notOffered: "Não disponível",
      addressPlaceholder: "Endereço completo onde o trabalho se realizará",
    },
    common: { hirer: "Contratante", noMatch: "Nenhuma moeda correspondente" },
    auth: {
      hirerAppOnly:
        "Esta é a app de Contratantes. Instale a app de Trabalhadores para se registar como trabalhador.",
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // ZH — Chinese Simplified
  // ───────────────────────────────────────────────────────────────────────────
  zh: {
    verification: {
      selectIdType: "选择证件类型",
      tapToChange: "点击更改",
      uploadInstruction: "点击上传或拖放文件",
      uploadHint: "JPG、PNG 或 PDF — 最大 10MB",
      accountStatus: "账户状态",
      pendingTitle: "验证审核中",
      pendingBody:
        "您的文件已提交，我们的团队正在审核。通常需要 24–48 小时。审核完成后您将收到通知。",
      verifiedTitle: "账户已验证",
      verifiedBody:
        "您的账户已完全验证。工人可以看到您的已验证徽章，更有可能快速响应。",
      rejectedTitle: "验证被拒绝",
      rejectedBody: "您的验证被拒绝。请查看原因并重新提交有效文件。",
      tryAgain: "重试",
      heroTitle: "账户验证",
      submitBtn: "提交验证",
      uploadIdLabel: "上传身份证件",
      uploadCacLabel: "上传注册文件 / CAC",
      uploadTitle: "上传文件",
      chooseSource: "选择来源",
      errorFilePicker: "无法打开文件选择器",
      errorIdType: "请选择证件类型",
      errorIdNumber: "请输入您的证件号码",
      errorCompanyName: "请输入您的公司名称",
      errorRegNumber: "请输入注册号码",
      errorDocument: "请上传验证文件",
      successSubmit: "验证已提交！我们将在 24–48 小时内审核。",
      submissionDate: "提交时间：{{date}}",
    },
    featured: {
      title: "⭐ 推荐列表",
      subtitle: "出现在搜索顶部，获得更多曝光",
      categoryLabel: "在特定类别中推荐（可选）：",
      allCategories: "所有类别",
      bestValue: "最超值",
      activeListing: "推荐列表已激活",
      activeExpires: "到期时间：{{date}}",
      activateBtn: "⭐ 激活推荐列表",
      selectPackage: "请选择套餐",
      summary: "{{name}} — {{currency}} {{price}}，共 {{days}} 天",
      errorLoad: "加载推荐选项失败",
    },
    subscriptions: {
      title: "选择您的方案",
      subtitle: "更智能、更快速、更大规模地招聘",
      cancel: "取消",
      cancelTitle: "取消订阅",
      cancelMessage: "确定要取消吗？您将保留访问权限直到账单周期结束。",
      keepPlan: "保留方案",
      cancelSub: "取消订阅",
      cancelSuccess: "订阅已取消。访问权限保留至周期结束。",
      errorLoad: "加载方案失败",
      errorCancel: "取消订阅失败",
      disclaimer: "安全处理付款。随时取消。所有价格均以美元计。",
      currentPlan: "当前方案",
      freePlan: "免费方案",
      upgradeTo: "升级到 {{name}}",
      activating: "激活中...",
      activeLabel: "已激活：{{name}}",
      renews: "续订日期：{{date}}",
    },
    disputes: {
      bookingDispute: "预订纠纷",
      hirer: "招聘方",
      worker: "工人",
      payment: "付款",
      errorLoad: "加载纠纷失败。",
    },
    posts: {
      errorPermission: "需要相册访问权限。",
      errorEmpty: "发布前请先写点内容。",
      errorEmptyFeed: "请先写点什么。",
      errorPermissionFeed: "需要权限。",
      errorLoad: "加载帖子失败。",
      errorLoadFeed: "加载动态失败。",
      comment: "评论",
      repost: "转发",
      reposted: "已转发",
    },
    messages: {
      viewAttachment: "查看附件",
      errorPermission: "权限被拒绝",
      attachTitle: "附件",
      chooseType: "选择类型",
    },
    workerProfile: {
      yearsExperience: "工作年限",
      serviceRadius: "服务范围",
      memberSince: "注册时间",
      reviews: "评价",
    },
    payments: {
      receiptTitle: "付款收据",
      youPaid: "您已支付",
      receipt: "收据",
      release: "释放",
      noTransactions: "暂无交易",
      noTransactionsSub: "预订工人后，您的付款记录将显示在这里。",
      releaseSuccess: "已向工人释放付款！",
    },
    browse: {
      availableOnly: "仅显示可用",
      hourlyRate: "时薪",
      maxDistance: "最大距离",
      genderPreference: "性别偏好",
      locationDenied: "位置权限被拒绝",
      voiceSearchSoon: "语音搜索即将推出",
    },
    bookingDetail: {
      confirmTransfer: "确认您的转账",
      submitConfirmation: "提交确认",
      submitHash: "提交交易哈希",
      submitTransaction: "提交交易",
      namePlaceholder: "转账中的您的姓名",
      paymentEscrow: "付款已在托管中。",
      transferConfirmed: "转账已确认！我们将在 24 小时内验证。",
      txSubmitted: "已提交！我们将验证您的交易。",
      paymentReleased: "已向工人释放付款！",
      videoCallSoon: "视频通话即将推出",
      messagesSoon: "消息功能即将推出",
    },
    jobDetail: {
      messagesSoon: "消息功能即将推出",
      stripeCardSoon: "Stripe 卡支付即将推出",
      bankTransferSoon: "银行转账详情即将推出",
      insuranceSoon: "Stripe 保险支付即将推出",
      releaseSoon: "付款释放即将推出",
      videoCallSoon: "视频通话即将推出",
      disputeSoon: "纠纷系统即将推出",
    },
    categoryDetail: {
      notFound: "未找到类别",
      noWorkers: "此类别未找到工人",
      browseOther: "浏览其他类别",
      workersAvailable: "{{count}} 名工人可用",
    },
    createBooking: {
      notOffered: "不提供",
      addressPlaceholder: "工作地点完整地址",
    },
    common: { hirer: "招聘方", noMatch: "没有匹配的货币" },
    auth: { hirerAppOnly: "这是招聘方应用。请安装工人应用以注册为工人。" },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // HA — Hausa
  // ───────────────────────────────────────────────────────────────────────────
  ha: {
    verification: {
      selectIdType: "Zaɓi Nau'in ID",
      tapToChange: "Taɓa don canza",
      uploadInstruction: "Danna don ɗora ko ja-da-ajiye",
      uploadHint: "JPG, PNG ko PDF — mafi yawa 10MB",
      accountStatus: "HALIN ASUSUN",
      pendingTitle: "An duba takaddun tabbatarwa",
      pendingBody:
        "An ƙaddamar da takaddunka kuma ƙungiyarmu na dubawa. Wannan yawanci yana ɗaukar awowi 24–48. Za ka sami sanarwa da zarar duba ta ƙare.",
      verifiedTitle: "An Tabbatar da Asusun",
      verifiedBody:
        "An tabbatar da asusunka gaba ɗaya. Ma'aikata na iya ganin alama ta Tabbatarwa kuma sun fi son amsa cikin sauri.",
      rejectedTitle: "An Ƙi Tabbatarwa",
      rejectedBody:
        "An ƙi tabbatarwarka. Da fatan za a duba dalilin kuma sake ƙaddamar da takarda mai inganci.",
      tryAgain: "Sake Gwadawa",
      heroTitle: "Tabbatarwar Asusun",
      submitBtn: "Ƙaddamar don Tabbatarwa",
      uploadIdLabel: "Ɗora Takarda ta ID",
      uploadCacLabel: "Ɗora Takarda ta Rajista",
      uploadTitle: "Ɗora Takarda",
      chooseSource: "Zaɓi tushe",
      errorFilePicker: "Ba a iya buɗe zaɓin fayil ɗin ba",
      errorIdType: "Da fatan za a zaɓi nau'in ID",
      errorIdNumber: "Da fatan za a shigar da lambar ID",
      errorCompanyName: "Da fatan za a shigar da sunan kamfaninka",
      errorRegNumber: "Da fatan za a shigar da lambar rajista",
      errorDocument: "Da fatan za a ɗora takarda ta tabbatarwa",
      successSubmit: "An ƙaddamar da tabbatarwa! Za mu duba cikin awowi 24–48.",
      submissionDate: "An ƙaddamar: {{date}}",
    },
    featured: {
      title: "⭐ Jerin Da Ya Fita Gaban",
      subtitle: "Bayyana a saman bincike don ƙarin ganuwa",
      categoryLabel: "Fita gaba a rukuni na musamman (zaɓi):",
      allCategories: "Dukkan rukunoni",
      bestValue: "Mafi Darajar Kuɗi",
      activeListing: "Jerin da ya fita gaba yana aiki",
      activeExpires: "Yana ƙarewa {{date}}",
      activateBtn: "⭐ Kunna Jerin Da Ya Fita Gaban",
      selectPackage: "Da fatan za a zaɓi fakiti",
      summary: "{{name}} — {{currency}} {{price}} na kwanaki {{days}}",
      errorLoad: "Kuskure wajen ɗora zaɓuɓɓukan da suka fita gaba",
    },
    subscriptions: {
      title: "Zaɓi Tsarin Ka",
      subtitle: "Yi hayar ma'aikata da hankali, da sauri, da girma",
      cancel: "Soke",
      cancelTitle: "Soke Biyan Kuɗi na Yau da Kullum",
      cancelMessage:
        "Ka tabbata? Za ka riƙe damar shiga har zuwa ƙarshen lokacin biyan kuɗi.",
      keepPlan: "Riƙe Tsarin",
      cancelSub: "Soke Biyan Kuɗi",
      cancelSuccess:
        "An soke biyan kuɗi na yau da kullum. Damar shiga ta kasance har ƙarshen lokaci.",
      errorLoad: "Kuskure wajen ɗora tsare-tsaren",
      errorCancel: "Kuskure wajen soke biyan kuɗi",
      disclaimer:
        "Ana sarrafa biyan kuɗi da aminci. Soke a kowane lokaci. Dukkan farashi a cikin USD.",
      currentPlan: "Tsarin Na Yanzu",
      freePlan: "Tsarin Kyauta",
      upgradeTo: "Haɓaka zuwa {{name}}",
      activating: "Ana kunna...",
      activeLabel: "Mai aiki: {{name}}",
      renews: "Sabuntawa {{date}}",
    },
    disputes: {
      bookingDispute: "Rigimar ajiya",
      hirer: "Mai hayar",
      worker: "Ma'aikaci",
      payment: "Biyan kuɗi",
      errorLoad: "Kuskure wajen ɗora rigimomi.",
    },
    posts: {
      errorPermission: "Ana buƙatar izinin hotuna.",
      errorEmpty: "Rubuta wani abu kafin buga.",
      errorEmptyFeed: "Rubuta wani abu da farko.",
      errorPermissionFeed: "Ana buƙatar izini.",
      errorLoad: "Kuskure wajen ɗora wallafe-wallafe.",
      errorLoadFeed: "Kuskure wajen ɗora feed.",
      comment: "Sharhi",
      repost: "Sake buga",
      reposted: "An sake buga",
    },
    messages: {
      viewAttachment: "Duba abin da aka ɗora",
      errorPermission: "An hana izini",
      attachTitle: "Ɗora",
      chooseType: "Zaɓi nau'i",
    },
    workerProfile: {
      yearsExperience: "SHEKARUN KWAREWA",
      serviceRadius: "YANKIN AIKI",
      memberSince: "MEMBA TUNDA",
      reviews: "Shaidun",
    },
    payments: {
      receiptTitle: "Rasit na Biyan Kuɗi",
      youPaid: "Ka biya",
      receipt: "Rasit",
      release: "Sakin",
      noTransactions: "Babu ma'amaloli tukuna",
      noTransactionsSub:
        "Tarihin biyan kuɗinka zai bayyana nan da zarar ka ajiye ma'aikaci.",
      releaseSuccess: "An sake biyan kuɗi ga ma'aikaci!",
    },
    browse: {
      availableOnly: "Masu samuwa kawai",
      hourlyRate: "KUƊIN AWA",
      maxDistance: "MAFI NISA",
      genderPreference: "FIFIKON JINSI",
      locationDenied: "An hana izinin wuri",
      voiceSearchSoon: "Bincike da murya za ya zo",
    },
    bookingDetail: {
      confirmTransfer: "Tabbatar da Canjin Ka",
      submitConfirmation: "Ƙaddamar da Tabbaci",
      submitHash: "Ƙaddamar da Hash na Ma'amala",
      submitTransaction: "Ƙaddamar da Ma'amala",
      namePlaceholder: "Sunanka a cikin canjin",
      paymentEscrow: "Biyan kuɗi yana a tsare tukuna.",
      transferConfirmed: "An tabbatar da canjin! Za mu tabbata cikin awa 24.",
      txSubmitted: "An ƙaddamar! Za mu tabbatar da ma'amalarka.",
      paymentReleased: "An sake biyan kuɗi ga ma'aikaci!",
      videoCallSoon: "Kiran bidiyo zai zo ba da daɗewa",
      messagesSoon: "Saƙonni za su zo ba da daɗewa",
    },
    jobDetail: {
      messagesSoon: "Saƙonni za su zo ba da daɗewa",
      stripeCardSoon: "Biyan kuɗi da katunan Stripe za ya zo",
      bankTransferSoon: "Bayanan canjin banki za su zo",
      insuranceSoon: "Biyan kuɗi na insho ta Stripe za ya zo",
      releaseSoon: "Sakin biyan kuɗi zai zo",
      videoCallSoon: "Kiran bidiyo zai zo",
      disputeSoon: "Tsarin rigima zai zo",
    },
    categoryDetail: {
      notFound: "Ba a sami rukuni ba",
      noWorkers: "Ba a sami ma'aikata a wannan rukuni ba",
      browseOther: "Bincika sauran rukunoni",
      workersAvailable: "Ma'aikata {{count}} suna samuwa",
    },
    createBooking: {
      notOffered: "Ba a bayar da shi ba",
      addressPlaceholder: "Cikakken adireshin inda aikin zai gudana",
    },
    common: { hirer: "Mai hayar", noMatch: "Babu kuɗin da ya dace" },
    auth: {
      hirerAppOnly:
        "Wannan shine app na masu hayar. Shigar da app na ma'aikata don rajista a matsayin ma'aikaci.",
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // YO — Yoruba
  // ───────────────────────────────────────────────────────────────────────────
  yo: {
    verification: {
      selectIdType: "Yan Iru ID",
      tapToChange: "Tẹ lati yipada",
      uploadInstruction: "Tẹ lati gbé kalẹ̀ tàbí fa wọlé",
      uploadHint: "JPG, PNG tàbí PDF — ó pọ̀ jùlọ 10MB",
      accountStatus: "IPO ÀKÁǸTÌ",
      pendingTitle: "Ìmúṣẹ́ wa lábẹ́ àyẹ̀wò",
      pendingBody:
        "A ti fi àwọn ìwé rẹ sílẹ̀ tí ẹgbẹ́ wa sì ń ṣàyẹ̀wò wọn. Èyí máa ń gba wákàtí 24–48. Ìwọ yóò gba ìwífún nígbà tí àyẹ̀wò bá parí.",
      verifiedTitle: "Àkáǹtì Ti Jẹ́ Ìmúṣẹ́",
      verifiedBody:
        "Àkáǹtì rẹ ti jẹ́ ìmúṣẹ́ pátápátá. Àwọn òṣìṣẹ́ lè rí àmi Ìmúṣẹ́ rẹ tí wọn sì ṣeéṣe kí wọ́n fèsì ni kíákíá.",
      rejectedTitle: "Ìmúṣẹ́ Ti Kọ",
      rejectedBody:
        "Ìmúṣẹ́ rẹ ti kọ. Jọwọ ṣàyẹ̀wò ìdí tí kọ́ ó sì tún fi ìwé tó tọ́ sílẹ̀.",
      tryAgain: "Gbìyànjú Lẹ́ẹ̀kan Sí",
      heroTitle: "Ìmúṣẹ́ Àkáǹtì",
      submitBtn: "Fi Sílẹ̀ fún Ìmúṣẹ́",
      uploadIdLabel: "Gbé Ìwé ID Kalẹ̀",
      uploadCacLabel: "Gbé Ìwé Ìforúkọsílẹ̀ / CAC Kalẹ̀",
      uploadTitle: "Gbé Ìwé Kalẹ̀",
      chooseSource: "Yan orisun",
      errorFilePicker: "A kò lè ṣí olùyan fáìlì",
      errorIdType: "Jọwọ yan iru ID",
      errorIdNumber: "Jọwọ tẹ nọ́mbà ID rẹ",
      errorCompanyName: "Jọwọ tẹ orúkọ ilé-iṣẹ́ rẹ",
      errorRegNumber: "Jọwọ tẹ nọ́mbà ìforúkọsílẹ̀",
      errorDocument: "Jọwọ gbé ìwé ìmúṣẹ́ kalẹ̀",
      successSubmit: "Ìmúṣẹ́ ti fi sílẹ̀! A ó ṣàyẹ̀wò láàárín wákàtí 24–48.",
      submissionDate: "Ti fi sílẹ̀: {{date}}",
    },
    featured: {
      title: "⭐ Àkójọ Tí A Fìyàjú",
      subtitle: "Fara hàn ní orí àwọn ìwádìí tí o sì gba ìfojúsọ́nà púpọ̀",
      categoryLabel: "Fi yàjú nínú ẹ̀ka pàtàkì (àṣàyàn):",
      allCategories: "Gbogbo ẹ̀ka",
      bestValue: "Iye Tó Dára Jùlọ",
      activeListing: "Àkójọ tí a fìyàjú ṣiṣẹ́",
      activeExpires: "Parí {{date}}",
      activateBtn: "⭐ Ṣiṣẹ́ Àkójọ Tí A Fìyàjú",
      selectPackage: "Jọwọ yan ìdìpọ̀",
      summary: "{{name}} — {{currency}} {{price}} fún ọjọ́ {{days}}",
      errorLoad: "Kò ṣeéṣe láti gbé àwọn àṣàyàn fíyàjú wọlé",
    },
    subscriptions: {
      title: "Yan Ètò Rẹ",
      subtitle: "Gbà àwọn òṣìṣẹ́ pẹ̀lú ọgbọ́n, ní ìyára, àti ní ìwọ̀n ńlá",
      cancel: "Fagilé",
      cancelTitle: "Fagilé Ìforúkọsílẹ̀",
      cancelMessage:
        "Ṣe o dájú? Iwọ yóò ní ànfààní wọlé títí di òpin àkókò ìsanwó.",
      keepPlan: "Pa Ètò Mọ́",
      cancelSub: "Fagilé Ìforúkọsílẹ̀",
      cancelSuccess:
        "Ìforúkọsílẹ̀ ti fagilé. Ànfààní wọlé wà títí di òpin àkókò.",
      errorLoad: "Kò ṣeéṣe láti gbé àwọn ètò wọlé",
      errorCancel: "Kò ṣeéṣe láti fagilé ìforúkọsílẹ̀",
      disclaimer:
        "Ìsanwó tí a ṣe ní ààbò. Fagilé nígbàkúgbà. Gbogbo iye ní USD.",
      currentPlan: "Ètò Lọ́wọ́lọ́wọ́",
      freePlan: "Ètò Ọfẹ̀",
      upgradeTo: "Gòkè sí {{name}}",
      activating: "Ń ṣiṣẹ́...",
      activeLabel: "Ń ṣiṣẹ́: {{name}}",
      renews: "Tún sọ di tuntun {{date}}",
    },
    disputes: {
      bookingDispute: "Àríyànjiyàn pẹ̀lú ìpamọ́",
      hirer: "Agbanisíṣẹ́",
      worker: "Òṣìṣẹ́",
      payment: "Ìsanwó",
      errorLoad: "Kò ṣeéṣe láti gbé àwọn àríyànjiyàn wọlé.",
    },
    posts: {
      errorPermission: "A nílò ìgbàláàyè fún àwọn fọ́tò.",
      errorEmpty: "Kọ ohun kan ṣáájú ìtẹ̀jáde.",
      errorEmptyFeed: "Kọ ohun kan lákọ̀ọ́kọ́.",
      errorPermissionFeed: "A nílò ìgbàláàyè.",
      errorLoad: "Kò ṣeéṣe láti gbé àwọn ìfiweranṣẹ́ wọlé.",
      errorLoadFeed: "Kò ṣeéṣe láti gbé feed wọlé.",
      comment: "Ṣèsọ̀rọ̀",
      repost: "Tún fiweranṣẹ́",
      reposted: "Ti tún fiweranṣẹ́",
    },
    messages: {
      viewAttachment: "Wo ohun tó so mọ́",
      errorPermission: "A kọ ìgbàláàyè",
      attachTitle: "So Mọ́",
      chooseType: "Yan irú",
    },
    workerProfile: {
      yearsExperience: "ỌDÚN ÌRÍRÍ",
      serviceRadius: "ÌJÁRÙN IṢẸ́",
      memberSince: "ỌMỌ ÈGBẹ́ LÁTI",
      reviews: "Àwọn Àtúnyẹ̀wò",
    },
    payments: {
      receiptTitle: "Ìwé Ẹ̀rí Ìsanwó",
      youPaid: "O san",
      receipt: "Ìwé Ẹ̀rí",
      release: "Jọ̀ sílẹ̀",
      noTransactions: "Kò sí ìdúnàádúrà títí di isisiyi",
      noTransactionsSub:
        "Ìtàn ìsanwó rẹ yóò fara hàn níbí lẹ́yìn tí o bá pè òṣìṣẹ́.",
      releaseSuccess: "Ìsanwó ti jọ̀ sílẹ̀ fún òṣìṣẹ́!",
    },
    browse: {
      availableOnly: "Àwọn tó wà nìkan",
      hourlyRate: "ÌYÁ ÀÁ WÁKÀTÍ",
      maxDistance: "ÌJÁ TÓBI JÙLỌ",
      genderPreference: "ÀṢÀYÀN ÌBÁLÒPỌ̀",
      locationDenied: "A kọ ìgbàláàyè ìbùdó",
      voiceSearchSoon: "Ìwádìí ohun ń bọ̀ laipẹ",
    },
    bookingDetail: {
      confirmTransfer: "Jẹ́rìí sí Gbígbé Rẹ",
      submitConfirmation: "Fi Ìjẹ́rìísí Sílẹ̀",
      submitHash: "Fi Hash Ìdúnàádúrà Sílẹ̀",
      submitTransaction: "Fi Ìdúnàádúrà Sílẹ̀",
      namePlaceholder: "Orúkọ rẹ nínú gbígbé",
      paymentEscrow: "Ìsanwó ti wà ní àmójútó tẹ́lẹ̀.",
      transferConfirmed: "Gbígbé ti jẹ́rìí! A ó ṣàyẹ̀wò láàárín wákàtí 24.",
      txSubmitted: "Ti fi sílẹ̀! A ó ṣàyẹ̀wò ìdúnàádúrà rẹ.",
      paymentReleased: "Ìsanwó ti jọ̀ sílẹ̀ fún òṣìṣẹ́!",
      videoCallSoon: "Ipe fidio ń bọ̀ laipẹ",
      messagesSoon: "Àwọn ifiranṣẹ́ ń bọ̀ laipẹ",
    },
    jobDetail: {
      messagesSoon: "Àwọn ifiranṣẹ́ ń bọ̀ laipẹ",
      stripeCardSoon: "Ìsanwó káàdì Stripe ń bọ̀",
      bankTransferSoon: "Àlàyé gbígbé banki ń bọ̀",
      insuranceSoon: "Ìsanwó ìṣedúró via Stripe ń bọ̀",
      releaseSoon: "Ìjọ̀ ìsanwó ń bọ̀",
      videoCallSoon: "Ipe fidio ń bọ̀",
      disputeSoon: "Ètò àríyànjiyàn ń bọ̀",
    },
    categoryDetail: {
      notFound: "A kò rí ẹ̀ka",
      noWorkers: "A kò rí àwọn òṣìṣẹ́ nínú ẹ̀ka yìí",
      browseOther: "Ṣàwárí àwọn ẹ̀ka mìíràn",
      workersAvailable: "Àwọn òṣìṣẹ́ {{count}} wà",
    },
    createBooking: {
      notOffered: "A kò pèṣè",
      addressPlaceholder: "Àdírẹ́ẹ̀sì tó péye níbi tí iṣẹ́ yóò wáyé",
    },
    common: { hirer: "Agbanisíṣẹ́", noMatch: "Kò sí owo tó bá mu" },
    auth: {
      hirerAppOnly:
        "Èyí ni app Agbanisíṣẹ́. Ṣàgbékalẹ̀ app Òṣìṣẹ́ láti forúkọ sílẹ̀ gẹ́gẹ́ bí òṣìṣẹ́.",
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // IG — Igbo
  // ───────────────────────────────────────────────────────────────────────────
  ig: {
    verification: {
      selectIdType: "Họrọ Ụdị ID",
      tapToChange: "Kụọ iji gbanwee",
      uploadInstruction: "Pịa iji bulite ma ọ bụ dọọ wepụta",
      uploadHint: "JPG, PNG ma ọ bụ PDF — nke ka 10MB",
      accountStatus: "ỌNỌDỤ AKAỤNTỤ",
      pendingTitle: "Nkwenye na-atụleghachi",
      pendingBody:
        "Edonyela akwụkwọ gị ma ndị otu anyị na-atụleghachi ha. Nke a na-ewe oge nke 24–48 awa. Ị ga-enweta ọkwa mgbe ntụleghachi gasịrị.",
      verifiedTitle: "E Kwenyere Akaụntụ",
      verifiedBody:
        "Akaụntụ gị erụọla nkwenye zuru oke. Ndị ọrụ nwere ike ịhụ akara Nkwenye gị ma ha nwere ike naghachi ngwa ngwa.",
      rejectedTitle: "Akọwapụtara Nkwenye",
      rejectedBody:
        "Akatọwapụtara nkwenye gị. Biko nyochaa ihe mere si ziga akwụkwọ dị mma ọzọ.",
      tryAgain: "Nwaa Ọzọ",
      heroTitle: "Nkwenye Akaụntụ",
      submitBtn: "Zipu maka Nkwenye",
      uploadIdLabel: "Bulite Akwụkwọ ID",
      uploadCacLabel: "Bulite Akwụkwọ Ndebanye Aha / CAC",
      uploadTitle: "Bulite Akwụkwọ",
      chooseSource: "Họrọ isi iyi",
      errorFilePicker: "Enweghị ike imeghe nhọrọ faịlụ",
      errorIdType: "Biko họrọ ụdị ID",
      errorIdNumber: "Biko tinye nọmbụ ID gị",
      errorCompanyName: "Biko tinye aha ụlọ ọrụ gị",
      errorRegNumber: "Biko tinye nọmbụ ndebanye aha",
      errorDocument: "Biko bulite akwụkwọ nkwenye",
      successSubmit: "Ezigara nkwenye! Anyị ga-atụleghachi n'ime awa 24–48.",
      submissionDate: "Ezigara: {{date}}",
    },
    featured: {
      title: "⭐ Ndepụta Dị Iche",
      subtitle: "Pụta ìhè n'elu nchọcha wee nweta ọchịchọ ọzọ",
      categoryLabel: "Pụta ìhè n'ụdị nke pụrụ iche (nhọrọ):",
      allCategories: "Ụdị niile",
      bestValue: "Ọnụahịa Kacha Mma",
      activeListing: "Ndepụta dị iche na-arụ ọrụ",
      activeExpires: "Ga-agwụ {{date}}",
      activateBtn: "⭐ Malite Ndepụta Dị Iche",
      selectPackage: "Biko họrọ ngwugwu",
      summary: "{{name}} — {{currency}} {{price}} maka ụbọchị {{days}}",
      errorLoad: "Ọ dịghị mma ibudata nhọrọ dị iche",
    },
    subscriptions: {
      title: "Họrọ Atụmatụ Gị",
      subtitle: "Were ndị ọrụ n'ụzọ nziri ezi, ngwa ngwa, na nnukwu ogo",
      cancel: "Kagbuo",
      cancelTitle: "Kagbuo Ndebanye Aha",
      cancelMessage:
        "Ị dị n'obi? Ị ga-anọgide nweta ohere ruo n'ọgwụgwụ oge ụgwọ.",
      keepPlan: "Jide Atụmatụ",
      cancelSub: "Kagbuo Ndebanye Aha",
      cancelSuccess: "Akagbuola ndebanye aha. Ohere dị ruo n'ọgwụgwụ oge.",
      errorLoad: "Ọ dịghị mma ibudata atụmatụ",
      errorCancel: "Ọ dịghị mma ikagbuo ndebanye aha",
      disclaimer:
        "Na-ahazi ịkwụ ụgwọ n'ụzọ dị nchebe. Kagbuo n'oge ọ bụla. Ọnụahịa niile na USD.",
      currentPlan: "Atụmatụ Ugbu A",
      freePlan: "Atụmatụ Efu",
      upgradeTo: "Kwalite gaa {{name}}",
      activating: "Na-amalite...",
      activeLabel: "Na-arụ ọrụ: {{name}}",
      renews: "Na-akwalite {{date}}",
    },
    disputes: {
      bookingDispute: "esemokwu ntinye aha",
      hirer: "Onye ọrụ na-enye",
      worker: "Onye ọrụ",
      payment: "Ịkwụ ụgwọ",
      errorLoad: "Ọ dịghị mma ibudata esemokwu.",
    },
    posts: {
      errorPermission: "Achọrọ ikike maka foto.",
      errorEmpty: "Dee ihe tupu itinye n'ọha.",
      errorEmptyFeed: "Dee ihe nke mbụ.",
      errorPermissionFeed: "Achọrọ ikike.",
      errorLoad: "Ọ dịghị mma ibudata ọkwa.",
      errorLoadFeed: "Ọ dịghị mma ibudata nzọụkwụ.",
      comment: "Kọmenti",
      repost: "Tụgharịa",
      reposted: "Atụgharịala",
    },
    messages: {
      viewAttachment: "Lee ihe etinyere",
      errorPermission: "Akọwapụtara ikike",
      attachTitle: "Tinye",
      chooseType: "Họrọ ụdị",
    },
    workerProfile: {
      yearsExperience: "AFỌ NDỤ IHE NKÀ",
      serviceRadius: "RADIUS ỌRỤ",
      memberSince: "ONYE OTU SITE",
      reviews: "Nyocha",
    },
    payments: {
      receiptTitle: "Nnapụta Ịkwụ Ụgwọ",
      youPaid: "Ị kwụọla",
      receipt: "Nnapụta",
      release: "Hapụ",
      noTransactions: "Enweghị azụmahịa ọ bụla n'oge a",
      noTransactionsSub:
        "Ihe omume ịkwụ ụgwọ gị ga-apụta ebe a mgbe ị dere ọrụ ọnye ọrụ.",
      releaseSuccess: "Ehapụrọla ịkwụ ụgwọ nye onye ọrụ!",
    },
    browse: {
      availableOnly: "Ndị dị naanị",
      hourlyRate: "ỌNỤ AHỊ N'AĄ AWA",
      maxDistance: "ỌNỤ ANYA KACHA",
      genderPreference: "NHỌRỌ ỤDỊ MMADỤ",
      locationDenied: "Akọwapụtara ikike ọnọdụ ebe",
      voiceSearchSoon: "Nchọcha olu na-abịa n'oge na-adịghị anya",
    },
    bookingDetail: {
      confirmTransfer: "Gosi Nnyefe Gị",
      submitConfirmation: "Zipu Nkwenye",
      submitHash: "Zipu Hash Azụmahịa",
      submitTransaction: "Zipu Azụmahịa",
      namePlaceholder: "Aha gị n'ime nnyefe",
      paymentEscrow: "Ịkwụ ụgwọ adịlarị n'ọchịchọ.",
      transferConfirmed: "Anakwenyela nnyefe! Anyị ga-arụ ọrụ n'ime awa 24.",
      txSubmitted: "Ezigara! Anyị ga-anakwenye azụmahịa gị.",
      paymentReleased: "Ehapụrọla ịkwụ ụgwọ nye onye ọrụ!",
      videoCallSoon: "Ịkpọ oku vidiyo na-abịa n'oge na-adịghị anya",
      messagesSoon: "Ozi na-abịa n'oge na-adịghị anya",
    },
    jobDetail: {
      messagesSoon: "Ozi na-abịa n'oge na-adịghị anya",
      stripeCardSoon: "Ịkwụ ụgwọ kaadị Stripe na-abịa",
      bankTransferSoon: "Nkọwa nnyefe ụlọ akụ na-abịa",
      insuranceSoon: "Ịkwụ ụgwọ nchedo site na Stripe na-abịa",
      releaseSoon: "Ịhapụ ịkwụ ụgwọ na-abịa",
      videoCallSoon: "Ịkpọ oku vidiyo na-abịa",
      disputeSoon: "Sistemụ esemokwu na-abịa",
    },
    categoryDetail: {
      notFound: "Ahụghị ụdị",
      noWorkers: "Ahụghị ndị ọrụ n'ụdị a",
      browseOther: "Chọọ ụdị ndị ọzọ",
      workersAvailable: "Ndị ọrụ {{count}} dị",
    },
    createBooking: {
      notOffered: "Anaghị enye",
      addressPlaceholder: "Adreesị zuru oke ebe ọrụ ga-eme",
    },
    common: { hirer: "Onye na-enye ọrụ", noMatch: "Enweghị ego dabara" },
    auth: {
      hirerAppOnly:
        "Nke a bụ ngwa onye na-enye ọrụ. Tụnye ngwa Onye Ọrụ iji debanye aha dị ka onye ọrụ.",
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // AR — Arabic
  // ───────────────────────────────────────────────────────────────────────────
  ar: {
    verification: {
      selectIdType: "اختر نوع الهوية",
      tapToChange: "اضغط للتغيير",
      uploadInstruction: "انقر للرفع أو اسحب وأفلت",
      uploadHint: "JPG أو PNG أو PDF — الحد الأقصى 10 ميغابايت",
      accountStatus: "حالة الحساب",
      pendingTitle: "التحقق قيد المراجعة",
      pendingBody:
        "تم تقديم مستنداتك وفريقنا يراجعها. يستغرق هذا عادةً 24-48 ساعة. ستتلقى إشعاراً عند اكتمال المراجعة.",
      verifiedTitle: "تم التحقق من الحساب",
      verifiedBody:
        "تم التحقق من حسابك بالكامل. يمكن للعمال رؤية شارة التحقق الخاصة بك وهم أكثر عرضة للرد بسرعة.",
      rejectedTitle: "تم رفض التحقق",
      rejectedBody: "تم رفض تحققك. يرجى مراجعة السبب وإعادة تقديم وثيقة صالحة.",
      tryAgain: "حاول مجدداً",
      heroTitle: "التحقق من الحساب",
      submitBtn: "إرسال للتحقق",
      uploadIdLabel: "رفع وثيقة الهوية",
      uploadCacLabel: "رفع وثيقة التسجيل / السجل التجاري",
      uploadTitle: "رفع وثيقة",
      chooseSource: "اختر المصدر",
      errorFilePicker: "تعذر فتح منتقي الملفات",
      errorIdType: "يرجى اختيار نوع الهوية",
      errorIdNumber: "يرجى إدخال رقم هويتك",
      errorCompanyName: "يرجى إدخال اسم شركتك",
      errorRegNumber: "يرجى إدخال رقم التسجيل",
      errorDocument: "يرجى رفع وثيقة التحقق",
      successSubmit: "تم تقديم طلب التحقق! سنراجعه خلال 24-48 ساعة.",
      submissionDate: "تم التقديم: {{date}}",
    },
    featured: {
      title: "⭐ إدراج مميز",
      subtitle: "اظهر في أعلى نتائج البحث واحصل على مزيد من الظهور",
      categoryLabel: "تميز في فئة محددة (اختياري):",
      allCategories: "جميع الفئات",
      bestValue: "أفضل قيمة",
      activeListing: "الإدراج المميز نشط",
      activeExpires: "ينتهي {{date}}",
      activateBtn: "⭐ تفعيل الإدراج المميز",
      selectPackage: "يرجى اختيار حزمة",
      summary: "{{name}} — {{currency}} {{price}} لمدة {{days}} أيام",
      errorLoad: "فشل تحميل خيارات الإدراج المميز",
    },
    subscriptions: {
      title: "اختر خطتك",
      subtitle: "وظّف بذكاء، بسرعة، وعلى نطاق أوسع",
      cancel: "إلغاء",
      cancelTitle: "إلغاء الاشتراك",
      cancelMessage: "هل أنت متأكد؟ ستحتفظ بحق الوصول حتى نهاية فترة الفوترة.",
      keepPlan: "الاحتفاظ بالخطة",
      cancelSub: "إلغاء الاشتراك",
      cancelSuccess: "تم إلغاء الاشتراك. يستمر الوصول حتى نهاية الفترة.",
      errorLoad: "فشل تحميل الخطط",
      errorCancel: "فشل إلغاء الاشتراك",
      disclaimer:
        "تتم معالجة المدفوعات بأمان. إلغاء في أي وقت. جميع الأسعار بالدولار الأمريكي.",
      currentPlan: "الخطة الحالية",
      freePlan: "الخطة المجانية",
      upgradeTo: "الترقية إلى {{name}}",
      activating: "جارٍ التفعيل...",
      activeLabel: "نشط: {{name}}",
      renews: "يتجدد في {{date}}",
    },
    disputes: {
      bookingDispute: "نزاع حجز",
      hirer: "صاحب العمل",
      worker: "العامل",
      payment: "الدفع",
      errorLoad: "فشل تحميل النزاعات.",
    },
    posts: {
      errorPermission: "مطلوب إذن الوصول إلى الصور.",
      errorEmpty: "اكتب شيئاً قبل النشر.",
      errorEmptyFeed: "اكتب شيئاً أولاً.",
      errorPermissionFeed: "الإذن مطلوب.",
      errorLoad: "فشل تحميل المنشورات.",
      errorLoadFeed: "فشل تحميل الخلاصة.",
      comment: "تعليق",
      repost: "إعادة نشر",
      reposted: "تمت إعادة النشر",
    },
    messages: {
      viewAttachment: "عرض المرفق",
      errorPermission: "تم رفض الإذن",
      attachTitle: "إرفاق",
      chooseType: "اختر النوع",
    },
    workerProfile: {
      yearsExperience: "سنوات الخبرة",
      serviceRadius: "نطاق الخدمة",
      memberSince: "عضو منذ",
      reviews: "التقييمات",
    },
    payments: {
      receiptTitle: "إيصال الدفع",
      youPaid: "دفعت",
      receipt: "إيصال",
      release: "إصدار",
      noTransactions: "لا توجد معاملات بعد",
      noTransactionsSub: "سيظهر سجل مدفوعاتك هنا بمجرد حجز عامل.",
      releaseSuccess: "تم إصدار الدفعة للعامل!",
    },
    browse: {
      availableOnly: "المتاحون فقط",
      hourlyRate: "الأجر بالساعة",
      maxDistance: "أقصى مسافة",
      genderPreference: "تفضيل الجنس",
      locationDenied: "تم رفض إذن الموقع",
      voiceSearchSoon: "البحث الصوتي قريباً",
    },
    bookingDetail: {
      confirmTransfer: "تأكيد تحويلك",
      submitConfirmation: "إرسال التأكيد",
      submitHash: "إرسال تجزئة المعاملة",
      submitTransaction: "إرسال المعاملة",
      namePlaceholder: "اسمك في التحويل",
      paymentEscrow: "الدفعة موجودة بالفعل في الضمان.",
      transferConfirmed: "تم تأكيد التحويل! سنتحقق خلال 24 ساعة.",
      txSubmitted: "تم الإرسال! سنتحقق من معاملتك.",
      paymentReleased: "تم إصدار الدفعة للعامل!",
      videoCallSoon: "مكالمة الفيديو قريباً",
      messagesSoon: "الرسائل قريباً",
    },
    jobDetail: {
      messagesSoon: "الرسائل قريباً",
      stripeCardSoon: "الدفع ببطاقة Stripe قريباً",
      bankTransferSoon: "تفاصيل التحويل البنكي قريباً",
      insuranceSoon: "دفع التأمين عبر Stripe قريباً",
      releaseSoon: "إصدار الدفع قريباً",
      videoCallSoon: "مكالمة الفيديو قريباً",
      disputeSoon: "نظام النزاعات قريباً",
    },
    categoryDetail: {
      notFound: "الفئة غير موجودة",
      noWorkers: "لم يتم العثور على عمال في هذه الفئة",
      browseOther: "تصفح فئات أخرى",
      workersAvailable: "{{count}} عامل متاح",
    },
    createBooking: {
      notOffered: "غير متاح",
      addressPlaceholder: "العنوان الكامل لمكان العمل",
    },
    common: { hirer: "صاحب العمل", noMatch: "لا توجد عملات مطابقة" },
    auth: {
      hirerAppOnly:
        "هذا هو تطبيق أصحاب العمل. قم بتثبيت تطبيق العمال للتسجيل كعامل.",
    },
  },
};

// ── Apply ─────────────────────────────────────────────────────────────────────
let total = 0;
for (const [locale, patch] of Object.entries(PATCHES)) {
  const file = path.join(LOCALES_DIR, `${locale}.json`);
  if (!fs.existsSync(file)) {
    console.log(`⚠️  ${locale} — file not found`);
    continue;
  }
  const existing = JSON.parse(fs.readFileSync(file, "utf8"));
  const merged = deepMerge(existing, patch);
  fs.writeFileSync(file, JSON.stringify(merged, null, 2) + "\n", "utf8");
  console.log(`✅  ${locale.toUpperCase()} — patched`);
  total++;
}
console.log(`\n✅  Done. Patched ${total} locale files.\n`);
console.log(
  "Now run: node scripts/check-hardcoded.js to see remaining code fixes needed.\n",
);
