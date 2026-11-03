const TABS = [
  { id: "accueil",   href: "/",                 label: "Accueil",   icon: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>' },
  { id: "recherche", href: "/recherche",        label: "Recherche", icon: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>' },
  { id: "apps",      href: "/mes-applications", label: "Mes apps",  icon: '<path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/>' },
  { id: "compte",    href: "/compte",           label: "Compte",    icon: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/>' }
];

// --- Téléchargements (stockés sur l'appareil) ---
export function getDownloads() {
  try { return JSON.parse(localStorage.getItem("downloads") || "[]"); } catch { return []; }
}
function saveDownloads(list) {
  try { localStorage.setItem("downloads", JSON.stringify(list)); } catch {}
}
export function addDownload(app) {
  const list = getDownloads().filter(d => d.slug !== app.slug);
  list.unshift({ slug: app.slug, name: app.name, color: app.color, initials: app.initials,
                 version: app.version, status: "en cours", at: Date.now() });
  saveDownloads(list);
}
export function markDone(slug) {
  saveDownloads(getDownloads().map(d => d.slug === slug ? { ...d, status: "terminé" } : d));
}
export function removeDownload(slug) {
  saveDownloads(getDownloads().filter(d => d.slug !== slug));
}

// --- Barre du bas ---
// activeId : "accueil", "recherche", "apps" ou "compte" (les pages liées au profil => "compte")
export function renderTabbar(activeId) {
  const inProgress = getDownloads().filter(d => d.status === "en cours").length;
  const nav = document.createElement("nav");
  nav.className = "tabbar";
  nav.setAttribute("aria-label", "Navigation principale");
  nav.innerHTML = TABS.map(t => `
    <a href="${t.href}" class="tab"${t.id === activeId ? ' aria-current="page"' : ""}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${t.icon}</svg>
      <span>${t.label}</span>
      ${t.id === "apps" && inProgress > 0
        ? `<span class="badge" aria-label="${inProgress} téléchargement(s) en cours">${inProgress}</span>`
        : ""}
    </a>`).join("");
  document.body.appendChild(nav);
}

// Échappe les textes venant de Firestore avant de les insérer dans le HTML
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Logo officiel (disque bleu avec flèche de téléchargement)
export const LOGO_SVG = `<svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="56" fill="#0369A1"/><path d="M60 36V72M42 56L60 74L78 56" fill="none" stroke="#FFFFFF" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/><rect x="42" y="84" width="36" height="7" rx="3.5" fill="#FFFFFF"/></svg>`;

// Haut de page commun
export function renderTopbar(rightHtml = "") {
  const header = document.createElement("header");
  header.className = "topbar";
  header.innerHTML = `<a class="brand" href="/">${LOGO_SVG}LogicX</a>${rightHtml}`;
  document.body.prepend(header);
}
