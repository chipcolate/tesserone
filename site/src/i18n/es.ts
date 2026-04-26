import type { Strings } from './types';

const strongOpen = '<strong class="text-[var(--color-fg)]">';
const strongClose = '</strong>';
const linkOpen = (href: string) =>
  `<a href="${href}" class="text-[var(--color-accent)] hover:underline">`;
const linkClose = '</a>';
const prose = 'text-[var(--color-fg-muted)]';

export const es: Strings = {
  htmlLang: 'es',
  meta: {
    defaultTitle: 'Tesserone — Tus tarjetas de fidelidad, en tu teléfono',
    defaultDescription:
      'Un gestor de tarjetas de fidelidad sencillo y local-first. Sin nube, sin cuentas, sin rastreo. Código abierto.',
    privacyTitle: 'Política de privacidad — Tesserone',
    privacyDescription:
      'Tesserone no recopila datos. Esta página explica qué significa eso, con palabras sencillas y en los términos que piden las tiendas.',
  },
  hero: {
    eyebrow: 'Tesserone',
    headlineLine1: 'Tus tarjetas de fidelidad.',
    headlineLine2: 'En tu teléfono.',
    headlineLine3: 'Sin más.',
    subheading:
      'Un gestor de tarjetas de fidelidad sencillo, con la sensación familiar de una pila de tarjetas. Sin nube, sin cuentas, sin rastreo. Tus tarjetas viven en tu dispositivo — donde deben estar.',
  },
  features: {
    headingLine1: 'Todo lo que los clásicos hacían.',
    headingLine2: 'Nada de lo que hacían mal.',
    items: {
      localFirst: {
        title: 'Local-first',
        body: 'Tus tarjetas viven en tu dispositivo. Sin cuentas, sin registros, sin sincronización.',
      },
      zeroCloud: {
        title: 'Cero nube',
        body: 'No hay servidores. No hay backend. No tenemos una base de datos donde puedas acabar.',
      },
      zeroTracking: {
        title: 'Cero rastreo',
        body: 'Sin analíticas. Sin telemetría. Sin SDK de terceros. La app no hace ninguna llamada de red.',
      },
      instantCheckout: {
        title: 'Lista en la caja',
        body: 'Toca una tarjeta para girarla. El brillo de la pantalla sube al máximo solo, para un escaneo fiable.',
      },
      familiarStack: {
        title: 'Una pila de tarjetas familiar',
        body: 'Tarjetas que se deslizan, se expanden y se giran exactamente como esperas. Sin sorpresas, sin curva de aprendizaje.',
      },
      allFormats: {
        title: 'Todos los formatos',
        body: 'EAN-13, CODE-128, QR, Aztec, PDF417, DataMatrix — cualquier código de barras que lleven tus tarjetas.',
      },
      noLockIn: {
        title: 'Sin candado',
        body: 'Exporta toda tu colección a un simple archivo JSON. Haz copias, muévelo entre dispositivos o compártelo — los datos son tuyos.',
      },
      openSource: {
        title: 'Código abierto, para siempre',
        body: 'Apache 2.0. Lee el código. Audítalo. Haz un fork. Construye el tuyo. Ese es el trato.',
      },
    },
  },
  backstory: {
    eyebrow: 'Por qué la hicimos',
    headingLine1: 'Teníamos apps sencillas.',
    headingLine2: 'Funcionaban.',
    p1: 'Durante años, las apps de tarjetas de fidelidad simplemente funcionaban. Escaneabas un código de barras. La app lo guardaba. En la caja, lo sacabas. Listo.',
    p2: 'Luego las apps en las que confiábamos fueron adquiridas. Los nuevos dueños las «modernizaron». De repente hacían falta cuentas. Luego sincronización en la nube que nadie había pedido. Luego anuncios. Luego un muro de pago para funciones que antes eran gratuitas. Luego las tarjetas empezaron a desaparecer porque el servidor de alguien había tenido un mal día. Luego la app quería nuestro correo para mostrar un código de barras.',
    p3: 'Nos cansamos de ver herramientas sencillas canibalizadas por empresas que trataban nuestras tarjetas como un canal de captación y no como una funcionalidad.',
    p4: 'Así que construimos una nueva, como las de antes. Bien hecha. Para nosotros, y para quien eche de menos cuando las apps hacían una sola cosa y respetaban tu dispositivo lo suficiente como para quedarse fuera de la nube.',
  },
  os: {
    eyebrow: 'Código abierto, simple por diseño',
    heading: 'Cada línea, auditable.',
    body: 'Tesserone se publica bajo licencia Apache 2.0. Eso significa que puedes leerla, auditarla, hacer un fork o construir la tuya. Sin telemetría, sin analíticas, sin servidores — y nada que tengas que creernos de palabra.',
    badgeLicense: 'Licencia Apache 2.0',
    badgeTelemetry: 'Cero telemetría',
    badgeServers: 'Sin servidores',
    cta: 'Ver en GitHub',
  },
  stores: {
    appleSup: 'Descargar en la',
    appleMain: 'App Store',
    appleAria: 'Descargar en la App Store',
    googleSup: 'Disponible en',
    googleMain: 'Google Play',
    googleAria: 'Disponible en Google Play',
  },
  footer: {
    copyright: 'Con licencia Apache 2.0.',
    privacy: 'Privacidad',
    github: 'GitHub',
    issues: 'Incidencias',
    languageLabel: 'Idioma',
  },
  themeToggle: {
    ariaLabel: 'Cambiar tema',
  },
  privacy: {
    back: '← Volver a Tesserone',
    title: 'Política de privacidad',
    effectiveDateLabel: 'Fecha de entrada en vigor',
    effectiveDate: '20 de abril de 2026',
    sections: {
      oneSentence: {
        title: 'En una frase',
        body: `<p class="${prose}">Tesserone no recopila, transmite ni comparte ninguno de tus datos. Todo lo que introduces se queda en tu dispositivo.</p>`,
      },
      whatWeCollect: {
        title: 'Qué datos recopilamos',
        body: `<p class="${prose}">${strongOpen}Ninguno.${strongClose} Tesserone no recopila ninguna información personal, analíticas de uso, informes de fallos, identificadores de dispositivo ni ningún otro dato. No hay cuentas, ni registro, ni perfil. La app no se comunica con ningún servidor que gestionemos — porque no gestionamos ninguno.</p>`,
      },
      whatAppStores: {
        title: 'Qué datos almacena la app',
        body: `<p class="${prose}">Las tarjetas de fidelidad que añades (nombre, código de barras, notas, logo o color elegido, logos personalizados subidos) se almacenan ${strongOpen}localmente en tu dispositivo${strongClose} mediante el almacenamiento estándar del sistema operativo. Estos datos nunca salen de tu dispositivo salvo que tú los exportes explícitamente con la función Exportar.</p>`,
      },
      permissions: {
        title: 'Permisos que solicitamos',
        body: `<ul class="list-disc space-y-3 pl-6 ${prose} marker:text-[var(--color-accent)]"><li>${strongOpen}Cámara${strongClose} — se usa solo cuando pulsas «Escanear» para leer un código de barras. Los fotogramas se procesan en el dispositivo y no se guardan ni transmiten.</li><li>${strongOpen}Galería de fotos${strongClose} — se usa solo cuando eliges una imagen personalizada como logo de una tarjeta. La imagen se copia al almacenamiento privado de la app; no se accede a la galería en segundo plano.</li></ul>`,
      },
      thirdParties: {
        title: 'Terceros',
        body: `<p class="${prose}">La app no contiene ${strongOpen}ningún SDK de terceros, red publicitaria, servicio de analíticas ni herramienta de rastreo${strongClose}. No hace peticiones de red en uso normal.</p>`,
      },
      children: {
        title: 'Privacidad de menores',
        body: `<p class="${prose}">Tesserone no recopila conscientemente información de nadie — incluidos menores de 13 años (o la edad mínima equivalente en tu jurisdicción). Como no recopilamos datos, no hay nada que borrar o exportar a petición.</p>`,
      },
      rights: {
        title: 'Tus derechos (GDPR, CCPA)',
        body: `<p class="${prose}">Normativas como el GDPR y la CCPA te dan derecho a acceder, corregir o borrar los datos personales que tengamos sobre ti. Chipcolate no guarda datos personales de los usuarios de Tesserone, así que no hay nada que facilitarte ni borrar. Tus datos residen íntegramente en tu dispositivo, bajo tu control — puedes eliminar una tarjeta o desinstalar la app en cualquier momento para borrarlos.</p>`,
      },
      changes: {
        title: 'Cambios en esta política',
        body: `<p class="${prose}">Si esta política cambia, actualizaremos la fecha de arriba y lo indicaremos en las notas de versión de la app. Como el enfoque es «no recopilar nada», los cambios sustanciales solo ocurrirían junto a un rediseño importante.</p>`,
      },
      contact: {
        title: 'Contacto',
        body: `<p class="${prose}">¿Dudas sobre esta política? Lo más rápido es abrir una incidencia en ${linkOpen('https://github.com/chipcolate/tesserone/issues')}github.com/chipcolate/tesserone/issues${linkClose}. Si prefieres email, escríbenos a ${linkOpen('mailto:tesserone@chipcolate.com')}tesserone@chipcolate.com${linkClose}.</p>`,
      },
    },
  },
};
