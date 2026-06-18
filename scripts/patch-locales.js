#!/usr/bin/env node
// scripts/patch-locales.js
// Run from project root: node patch-locales.js
// Deep-merges missing keys into every locale file.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.join(__dirname, "..", "src", "i18n", "locales");

// ── Deep merge helper ─────────────────────────────────────────────────────────
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
      out[k] = v; // only add — never overwrite existing translations
    }
  }
  return out;
}

// ── Patches per locale ────────────────────────────────────────────────────────
// Keys that are missing from EN
const EN_PATCH = {
  jobs: {
    applications: "Applications",
  },
  postJob: {
    categoryAlreadyExists: '"{{name}}" already exists — selected for you.',
  },
  toast: {
    messagingComingSoon: "Messaging coming soon",
  },
};

// Keys missing from all non-EN locales
const SHARED_PATCH = {
  categories: {
    title: null, // set per locale below
    subtitle: null,
    searchPlaceholder: null,
    addCategory: null,
    workers: null,
    worker: null,
    noResults: null,
    noResultsSub: null,
    addModal: {
      title: null,
      subtitle: null,
      namePlaceholder: null,
      descriptionPlaceholder: null,
      submit: null,
      cancel: null,
      successMessage: null,
      alreadyExists: null,
      nameRequired: null,
    },
  },
  messages: {
    title: null,
    searchPlaceholder: null,
    directMessage: null,
    viewProfile: null,
    typeMessage: null,
    noConversations: null,
    noConversationsSub: null,
    noMessages: null,
    noMessagesSub: null,
  },
  jobs: {
    applications: null,
  },
  postJob: {
    categoryAlreadyExists: null,
  },
  toast: {
    messagingComingSoon: null,
  },
};

// Per-locale translations
const PATCHES = {
  en: EN_PATCH,

  es: {
    categories: {
      title: "Explorar Categorías",
      subtitle: "{{count}}+ categorías — busca o añade la tuya",
      searchPlaceholder: "Buscar categorías...",
      addCategory: "+ Añadir Categoría",
      workers: "{{count}} trabajadores",
      worker: "{{count}} trabajador",
      noResults: "No se encontraron categorías",
      noResultsSub: "Intenta otra búsqueda o añade la tuya.",
      addModal: {
        title: "Añadir una Categoría",
        subtitle: "¿No encuentras tu habilidad? Añádela y la revisaremos.",
        namePlaceholder: "Nombre de categoría (ej. Piloto de Drones)",
        descriptionPlaceholder: "Descripción breve (opcional)",
        submit: "Enviar Categoría",
        cancel: "Cancelar",
        successMessage: "Tu categoría ha sido añadida.",
        alreadyExists: "Esta categoría ya existe.",
        nameRequired: "Por favor ingresa un nombre de categoría.",
      },
    },
    messages: {
      title: "Mensajes",
      searchPlaceholder: "Buscar conversaciones...",
      directMessage: "Mensaje directo",
      viewProfile: "Ver Perfil →",
      typeMessage: "Escribe un mensaje...",
      noConversations: "Aún no hay conversaciones",
      noConversationsSub:
        "Inicia una conversación visitando el perfil de un trabajador.",
      noMessages: "Aún no hay mensajes",
      noMessagesSub: "Envía un mensaje para iniciar la conversación.",
    },
    jobs: { applications: "Solicitudes" },
    postJob: {
      categoryAlreadyExists: '"{{name}}" ya existe — seleccionada para ti.',
    },
    toast: { messagingComingSoon: "Mensajería próximamente" },
  },

  fr: {
    categories: {
      title: "Parcourir les Catégories",
      subtitle: "{{count}}+ catégories — cherchez ou ajoutez la vôtre",
      searchPlaceholder: "Rechercher des catégories...",
      addCategory: "+ Ajouter une Catégorie",
      workers: "{{count}} travailleurs",
      worker: "{{count}} travailleur",
      noResults: "Aucune catégorie trouvée",
      noResultsSub: "Essayez une autre recherche ou ajoutez la vôtre.",
      addModal: {
        title: "Ajouter une Catégorie",
        subtitle:
          "Vous ne trouvez pas votre compétence ? Ajoutez-la, nous la vérifierons.",
        namePlaceholder: "Nom de catégorie (ex. Pilote de Drone)",
        descriptionPlaceholder: "Brève description (facultatif)",
        submit: "Soumettre la Catégorie",
        cancel: "Annuler",
        successMessage: "Votre catégorie a été ajoutée.",
        alreadyExists: "Cette catégorie existe déjà.",
        nameRequired: "Veuillez entrer un nom de catégorie.",
      },
    },
    messages: {
      title: "Messages",
      searchPlaceholder: "Rechercher des conversations...",
      directMessage: "Message direct",
      viewProfile: "Voir le Profil →",
      typeMessage: "Tapez un message...",
      noConversations: "Aucune conversation pour l'instant",
      noConversationsSub:
        "Démarrez une conversation en visitant le profil d'un travailleur.",
      noMessages: "Aucun message pour l'instant",
      noMessagesSub: "Envoyez un message pour démarrer la conversation.",
    },
    jobs: { applications: "Candidatures" },
    postJob: {
      categoryAlreadyExists: '"{{name}}" existe déjà — sélectionnée pour vous.',
    },
    toast: { messagingComingSoon: "Messagerie bientôt disponible" },
  },

  pt: {
    categories: {
      title: "Explorar Categorias",
      subtitle: "{{count}}+ categorias — pesquise ou adicione a sua",
      searchPlaceholder: "Pesquisar categorias...",
      addCategory: "+ Adicionar Categoria",
      workers: "{{count}} trabalhadores",
      worker: "{{count}} trabalhador",
      noResults: "Nenhuma categoria encontrada",
      noResultsSub: "Tente outra pesquisa ou adicione a sua.",
      addModal: {
        title: "Adicionar uma Categoria",
        subtitle: "Não encontra a sua habilidade? Adicione-a e iremos rever.",
        namePlaceholder: "Nome da categoria (ex. Piloto de Drone)",
        descriptionPlaceholder: "Breve descrição (opcional)",
        submit: "Enviar Categoria",
        cancel: "Cancelar",
        successMessage: "A sua categoria foi adicionada.",
        alreadyExists: "Esta categoria já existe.",
        nameRequired: "Por favor insira um nome de categoria.",
      },
    },
    messages: {
      title: "Mensagens",
      searchPlaceholder: "Pesquisar conversas...",
      directMessage: "Mensagem direta",
      viewProfile: "Ver Perfil →",
      typeMessage: "Escreva uma mensagem...",
      noConversations: "Ainda não há conversas",
      noConversationsSub:
        "Inicie uma conversa visitando o perfil de um trabalhador.",
      noMessages: "Ainda não há mensagens",
      noMessagesSub: "Envie uma mensagem para iniciar a conversa.",
    },
    jobs: { applications: "Candidaturas" },
    postJob: {
      categoryAlreadyExists: '"{{name}}" já existe — selecionada para você.',
    },
    toast: { messagingComingSoon: "Mensagens em breve" },
  },

  zh: {
    categories: {
      title: "浏览类别",
      subtitle: "{{count}}+ 个类别 — 搜索或添加您的类别",
      searchPlaceholder: "搜索类别...",
      addCategory: "+ 添加类别",
      workers: "{{count}} 名工人",
      worker: "{{count}} 名工人",
      noResults: "未找到类别",
      noResultsSub: "尝试不同的搜索，或添加您自己的类别。",
      addModal: {
        title: "添加类别",
        subtitle: "找不到您的技能？添加后我们将进行审核。",
        namePlaceholder: "类别名称（例如：无人机飞手）",
        descriptionPlaceholder: "简短描述（可选）",
        submit: "提交类别",
        cancel: "取消",
        successMessage: "您的类别已成功添加。",
        alreadyExists: "该类别已存在。",
        nameRequired: "请输入类别名称。",
      },
    },
    messages: {
      title: "消息",
      searchPlaceholder: "搜索对话...",
      directMessage: "私信",
      viewProfile: "查看资料 →",
      typeMessage: "输入消息...",
      noConversations: "暂无对话",
      noConversationsSub: "访问工人的个人资料即可开始对话。",
      noMessages: "暂无消息",
      noMessagesSub: "发送消息以开始对话。",
    },
    jobs: { applications: "申请" },
    postJob: { categoryAlreadyExists: '"{{name}}" 已存在 — 已为您选择。' },
    toast: { messagingComingSoon: "消息功能即将上线" },
  },

  ha: {
    categories: {
      title: "Bincika Rukunoni",
      subtitle: "Rukunoni {{count}}+ — nema ko ƙara naka",
      searchPlaceholder: "Nema rukunoni...",
      addCategory: "+ Ƙara Rukuni",
      workers: "Ma'aikata {{count}}",
      worker: "Ma'aikaci {{count}}",
      noResults: "Ba a sami rukunoni ba",
      noResultsSub: "Gwada bincike daban ko ƙara naka.",
      addModal: {
        title: "Ƙara Rukuni",
        subtitle: "Ba ka sami ƙwarewarka? Ƙara ta muna kuwa za mu duba.",
        namePlaceholder: "Sunan rukuni (misali: Matukin jirgin sama)",
        descriptionPlaceholder: "Gajeren bayani (zaɓi)",
        submit: "Aika Rukuni",
        cancel: "Soke",
        successMessage: "An ƙara rukuninku.",
        alreadyExists: "Wannan rukuni yana nan tuni.",
        nameRequired: "Da fatan za a shigar da sunan rukuni.",
      },
    },
    messages: {
      title: "Saƙonni",
      searchPlaceholder: "Nema tattaunawoyi...",
      directMessage: "Saƙon kai tsaye",
      viewProfile: "Duba Bayani →",
      typeMessage: "Rubuta saƙo...",
      noConversations: "Babu tattaunawoyi har yanzu",
      noConversationsSub: "Fara tattaunawa ta ziyartar bayanin ma'aikaci.",
      noMessages: "Babu saƙonni har yanzu",
      noMessagesSub: "Aika saƙo don fara tattaunawa.",
    },
    jobs: { applications: "Aikace-aikace" },
    postJob: {
      categoryAlreadyExists: '"{{name}}" yana nan tuni — an zaɓa maka.',
    },
    toast: { messagingComingSoon: "Saƙonni za su zo ba da daɗewa ba" },
  },

  yo: {
    categories: {
      title: "Ṣàwárí Àwọn Ẹ̀ka",
      subtitle: "Àwọn ẹ̀ka {{count}}+ — wá tàbí fikún tirẹ",
      searchPlaceholder: "Wá àwọn ẹ̀ka...",
      addCategory: "+ Fikún Ẹ̀ka",
      workers: "Àwọn òṣìṣẹ́ {{count}}",
      worker: "Òṣìṣẹ́ {{count}}",
      noResults: "A kò rí ẹ̀ka kankan",
      noResultsSub: "Gbìyànjú ìwádìí mìíràn tàbí fikún tirẹ.",
      addModal: {
        title: "Fikún Ẹ̀ka",
        subtitle: "Kò rí ògbón rẹ? Fikún rẹ, a ó ṣàtúnyẹ̀wò.",
        namePlaceholder: "Orúkọ ẹ̀ka (fún àpẹẹrẹ: Awakọ̀ Drone)",
        descriptionPlaceholder: "Àpèjúwe kúkúrú (àṣàyàn)",
        submit: "Fi Ẹ̀ka Ránṣẹ́",
        cancel: "Fagilé",
        successMessage: "A ti fikún ẹ̀ka rẹ.",
        alreadyExists: "Ẹ̀ka yìí ti wà tẹ́lẹ̀.",
        nameRequired: "Jọwọ tẹ orúkọ ẹ̀ka.",
      },
    },
    messages: {
      title: "Àwọn Ifiranṣẹ́",
      searchPlaceholder: "Wá àwọn ìjíròrò...",
      directMessage: "Ifiranṣẹ́ tààrà",
      viewProfile: "Wo Ìfọ̀kànsìn →",
      typeMessage: "Tẹ ifiranṣẹ́...",
      noConversations: "Kò sí ìjíròrò títí di isisiyi",
      noConversationsSub: "Bẹ̀rẹ̀ ìjíròrò nípa ṣíbẹ̀wò profaìlì òṣìṣẹ́.",
      noMessages: "Kò sí ifiranṣẹ́ títí di isisiyi",
      noMessagesSub: "Fi ifiranṣẹ́ ránṣẹ́ láti bẹ̀rẹ̀ ìjíròrò.",
    },
    jobs: { applications: "Àwọn Ìbéèrè" },
    postJob: {
      categoryAlreadyExists: '"{{name}}" ti wà tẹ́lẹ̀ — a ti yan fún ọ.',
    },
    toast: { messagingComingSoon: "Ifiranṣẹ́ ń bọ̀ laipẹ" },
  },

  ig: {
    categories: {
      title: "Chọọ Ụdị",
      subtitle: "Ụdị {{count}}+ — chọọ ma ọ bụ tinye nke gị",
      searchPlaceholder: "Chọọ ụdị...",
      addCategory: "+ Tinye Ụdị",
      workers: "Ndị ọrụ {{count}}",
      worker: "Onye ọrụ {{count}}",
      noResults: "Ahụghị ụdị ọ bụla",
      noResultsSub: "Nwaa ọchịchọ ọzọ ma ọ bụ tinye nke gị.",
      addModal: {
        title: "Tinye Ụdị",
        subtitle: "Achụghị nka gị? Tinye ya anyị ga-atụleghachi ya.",
        namePlaceholder: "Aha ụdị (dị ka: Onye nduzi ụgbọ elu drone)",
        descriptionPlaceholder: "Nkọwa dị mkpụmkpụ (nhọrọ)",
        submit: "Zipu Ụdị",
        cancel: "Kagbuo",
        successMessage: "Atigbu ụdị gị.",
        alreadyExists: "Ụdị a adịlarị.",
        nameRequired: "Biko tinye aha ụdị.",
      },
    },
    messages: {
      title: "Ọ Ozi",
      searchPlaceholder: "Chọọ mkparịta ụka...",
      directMessage: "Ozi ozugbo",
      viewProfile: "Lee Profaịlụ →",
      typeMessage: "Dee ozi...",
      noConversations: "Enweghị mkparịta ụka ọ bụla n'oge a",
      noConversationsSub: "Bido mkparịta ụka site na nleta profaịlụ onye ọrụ.",
      noMessages: "Enweghị ozi ọ bụla n'oge a",
      noMessagesSub: "Ziga ozi iji bido mkparịta ụka.",
    },
    jobs: { applications: "Ng촉arịta" },
    postJob: {
      categoryAlreadyExists: '"{{name}}" adịlarị — anyị họọrọ ya maka gị.',
    },
    toast: { messagingComingSoon: "Ozi na-abịa n'oge na-adịghị anya" },
  },

  ar: {
    categories: {
      title: "تصفح الفئات",
      subtitle: "أكثر من {{count}} فئة — ابحث أو أضف فئتك",
      searchPlaceholder: "ابحث عن الفئات...",
      addCategory: "+ إضافة فئة",
      workers: "{{count}} عمال",
      worker: "{{count}} عامل",
      noResults: "لم يتم العثور على فئات",
      noResultsSub: "جرّب بحثاً مختلفاً أو أضف فئتك الخاصة.",
      addModal: {
        title: "إضافة فئة",
        subtitle: "لم تجد مهارتك؟ أضفها وسنراجعها.",
        namePlaceholder: "اسم الفئة (مثال: طيار طائرة بدون طيار)",
        descriptionPlaceholder: "وصف قصير (اختياري)",
        submit: "إرسال الفئة",
        cancel: "إلغاء",
        successMessage: "تمت إضافة فئتك.",
        alreadyExists: "هذه الفئة موجودة بالفعل.",
        nameRequired: "يرجى إدخال اسم الفئة.",
      },
    },
    messages: {
      title: "الرسائل",
      searchPlaceholder: "البحث في المحادثات...",
      directMessage: "رسالة مباشرة",
      viewProfile: "عرض الملف الشخصي →",
      typeMessage: "اكتب رسالة...",
      noConversations: "لا توجد محادثات بعد",
      noConversationsSub: "ابدأ محادثة بزيارة ملف العامل الشخصي.",
      noMessages: "لا توجد رسائل بعد",
      noMessagesSub: "أرسل رسالة لبدء المحادثة.",
    },
    jobs: { applications: "الطلبات" },
    postJob: {
      categoryAlreadyExists: '"{{name}}" موجودة بالفعل — تم تحديدها لك.',
    },
    toast: { messagingComingSoon: "المراسلة قادمة قريباً" },
  },
};

// ── Apply patches ─────────────────────────────────────────────────────────────
let totalAdded = 0;

for (const [locale, patch] of Object.entries(PATCHES)) {
  const file = path.join(LOCALES_DIR, `${locale}.json`);
  if (!fs.existsSync(file)) {
    console.log(`⚠️  Skipping ${locale} — file not found: ${file}`);
    continue;
  }
  const existing = JSON.parse(fs.readFileSync(file, "utf8"));
  const merged = deepMerge(existing, patch);

  // Count added keys
  const before = JSON.stringify(existing).length;
  const after = JSON.stringify(merged).length;
  const changed = after > before;

  fs.writeFileSync(file, JSON.stringify(merged, null, 2) + "\n", "utf8");

  if (changed) {
    console.log(`✅  ${locale.toUpperCase()} — patched`);
    totalAdded++;
  } else {
    console.log(`⏭️   ${locale.toUpperCase()} — already up to date`);
  }
}

console.log(
  `\n✅  Done. Patched ${totalAdded} locale file(s). Run check-locales.js to verify.\n`,
);
