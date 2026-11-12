<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>LogicX – Application</title>
  <meta name="description" content="Application LogicX à télécharger.">
  <link rel="stylesheet" href="/css/style.css">
</head>
<body data-section="accueil">
  <main class="page" id="app"><p class="muted">Chargement…</p></main>

  <!-- Modale pour agrandir les captures d'écran -->
  <div id="imgModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:1000;align-items:center;justify-content:center;padding:16px;">
    <div style="position:relative;max-width:100%;max-height:100%;display:flex;align-items:center;justify-content:center;">
      <button onclick="closeModal()" style="position:absolute;top:-40px;right:0;background:transparent;border:none;color:#fff;font-size:28px;cursor:pointer;padding:4px 12px;">&times;</button>
      <img id="modalImg" src="" alt="Capture agrandie" style="max-width:100%;max-height:85vh;object-fit:contain;border-radius:12px;">
    </div>
  </div>

  <script type="module">
    import { db } from "/js/config.js";
    import { renderTopbar, renderTabbar, esc, addDownload, updateDownload, markDone } from "/js/nav.js";
    import { collection, getDocs, query, where, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

    renderTopbar(`<a href="/" style="font-size:13px;font-weight:600;color:#0369A1">Toutes les applications</a>`);
    renderTabbar("accueil");

    const appId = decodeURIComponent(location.pathname.split("/").filter(Boolean)[1] || "");
    const main = document.getElementById("app");
    const DOWNLOAD_PATH = "M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z";
    const STAR_PATH = "M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.6 1-5.8-4.2-4.1 5.8-.8z";

    const snap = await getDocs(query(collection(db, "apps"), where("package", "==", appId), limit(1)));

    if (snap.empty) {
      main.innerHTML = `<h1 style="margin:0;font-size:22px">Application introuvable</h1>
        <a class="pill" href="/" style="align-self:flex-start">Retour à l'accueil</a>`;
    } else {
      const a = snap.docs[0].data();
      document.title = `${a.nom} – LogicX`;

      const reviewsSnap = await getDocs(query(collection(db, "reviews"), where("appSlug", "==", appId)));
      const ratings = reviewsSnap.docs.map(d => d.data().rating).filter(r => typeof r === "number");
      const count = ratings.length;
      const average = count ? ratings.reduce((s, r) => s + r, 0) / count : 0;
      const dist = [5, 4, 3, 2, 1].map(n => {
        const c = ratings.filter(r => Math.round(r) === n).length;
        return count ? Math.round((c / count) * 100) : 0;
      });

      const pub = a.publishedAt?.toMillis ? a.publishedAt.toMillis() : (a.publishedAt ? new Date(a.publishedAt).getTime() : 0);
      const miseAJourRecente = pub && Date.now() - pub < 7 * 24 * 3600 * 1000;

      const captures = Array.isArray(a.captures) ? a.captures.filter(Boolean) : [];
      const apkLink = a.apkUrl || a.lienApk || "";
      const tailleMo = a.tailleOctets ? (a.tailleOctets / 1048576).toFixed(1) : "--";
      const nomFichier = `${a.nom || appId}-${a.version || ""}.apk`.replace(/\s+/g, "-");

      // Déclenche le téléchargement d'un fichier à partir d'une adresse
      const declencher = (href, nom) => {
        const lien = document.createElement("a");
        lien.href = href;
        lien.download = nom;
        lien.rel = "noopener";
        document.body.appendChild(lien);
        lien.click();
        lien.remove();
      };

      let enCours = false;

      // Téléchargement avec progression : l'APK est lu par morceaux, puis enregistré
      const telecharger = async () => {
        if (!apkLink || enCours) return;
        enCours = true;
        const bouton = document.getElementById("dl");
        const contenuBouton = bouton ? bouton.innerHTML : "";

        addDownload({
          slug: appId,
          name: a.nom,
          logo: a.logo || "",
          color: "#f59e0b",
          initials: a.nom ? a.nom.substring(0, 2).toUpperCase() : "AP",
          version: a.version || "1.0",
          total: a.tailleOctets || 0
        });

        try {
          const reponse = await fetch(apkLink);
          if (!reponse.ok || !reponse.body) throw new Error("reponse invalide");

          const total = Number(reponse.headers.get("content-length")) || a.tailleOctets || 0;
          updateDownload(appId, { total });

          const lecteur = reponse.body.getReader();
          const morceaux = [];
          let recu = 0;
          let dernier = 0;
          for (;;) {
            const { done, value } = await lecteur.read();
            if (done) break;
            morceaux.push(value);
            recu += value.length;
            if (Date.now() - dernier > 250) {
              const pct = total ? Math.min(99, Math.round((recu / total) * 100)) : 0;
              updateDownload(appId, { progress: pct, recu });
              if (bouton) bouton.textContent = pct + " %";
              dernier = Date.now();
            }
          }

          const url = URL.createObjectURL(new Blob(morceaux, { type: "application/vnd.android.package-archive" }));
          declencher(url, nomFichier);
          setTimeout(() => URL.revokeObjectURL(url), 60000);
          updateDownload(appId, { status: "terminé", progress: 100, recu, total: recu, vu: false });
        } catch (erreur) {
          // Repli : téléchargement direct du lien, sans suivi de progression
          declencher(apkLink, nomFichier);
          markDone(appId);
        } finally {
          enCours = false;
          if (bouton) bouton.innerHTML = contenuBouton;
        }
      };

      main.innerHTML = `
        <nav style="font-size:12px;color:#94a3b8"><a href="/">Accueil</a> › <span style="color:#475569;font-weight:500">${esc(a.nom)}</span></nav>

        <section style="display:flex;align-items:center;gap:16px">
          <div style="width:80px;height:80px;border-radius:18px;overflow:hidden;flex-shrink:0;${a.logo ? "" : "background:#f59e0b;color:#FFFFFF;font-size:24px;font-weight:800;display:flex;align-items:center;justify-content:center;"}">
            ${a.logo ? `<img src="data:image/png;base64,${a.logo}" alt="" style="width:100%;height:100%;display:block;object-fit:cover">` : esc(a.nom ? a.nom.substring(0, 2).toUpperCase() : "AP")}
          </div>
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px">
            <h1 style="margin:0;font-size:18px;font-weight:700;line-height:1.2">${esc(a.nom)}</h1>
            <span style="font-size:12px;color:#64748b">Version ${esc(a.version || "1.0")} · Android</span>
            ${miseAJourRecente ? `<span style="align-self:flex-start;margin-top:6px;padding:3px 10px;border-radius:999px;background:#FFF7ED;border:1px solid #FFD8A8;color:#E65100;font-size:11px;font-weight:600">Mise à jour disponible</span>` : ""}
          </div>
          <div style="flex-shrink:0">
            ${apkLink
              ? `<button id="dl" aria-label="Télécharger l'APK" style="background:#0284c7;color:#fff;border:none;padding:8px 16px;border-radius:999px;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;">
                   <svg aria-hidden="true" width="18" height="18" viewBox="0 -960 960 960" fill="currentColor"><path d="${DOWNLOAD_PATH}"/></svg> Installer
                 </button>`
              : `<span style="font-size:13px;font-weight:600;color:#64748b;background:#f1f5f9;padding:6px 12px;border-radius:999px;">Bientôt</span>`}
          </div>
        </section>

        <section style="border-top:1px solid #f1f5f9;border-bottom:1px solid #f1f5f9;padding:4px 0">
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;text-align:center">
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 4px;border-right:1px solid #f1f5f9">
              <div style="display:flex;align-items:center;gap:4px;font-size:14px;font-weight:600;color:#334155">
                <span>${count ? average.toFixed(1) : "--"}</span>
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#334155" stroke-width="2.5" stroke-linejoin="round"><path d="${STAR_PATH}"/></svg>
              </div>
              <span style="font-size:12px;color:#475569;margin-top:4px">${count} avis</span>
            </div>
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 4px;border-right:1px solid #f1f5f9">
              <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#334155" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 8.5a4 4 0 0 1 8 0"></path><path d="M9.5 5.5L8.5 3.5M14.5 5.5l1-2"></path><path d="M8 8.5h8v7a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 8 15.5z"></path><path d="M5 11v4M19 11v4"></path><path d="M10 17.5V20M14 17.5V20"></path></svg>
              <span style="font-size:12px;font-weight:600;color:#334155;margin-top:4px">${esc(a.androidMin || "5.0")}+</span>
            </div>
            <div id="dl2" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 4px;${apkLink ? "cursor:pointer" : ""}">
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#334155" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"></path></svg>
              <span style="font-size:12px;font-weight:600;color:#1e293b;margin-top:4px">${esc(tailleMo)} Mo</span>
            </div>
          </div>
        </section>

        ${captures.length ? `
        <div style="display:flex;flex-shrink:0;gap:12px;overflow-x:auto;margin:0 -16px;padding:4px 16px 8px;scroll-snap-type:x mandatory;">
          ${captures.map(url => {
            const src = url.startsWith("http") || url.startsWith("data:") ? url : `data:image/png;base64,${url}`;
            return `<div class="capture-thumb" data-src="${esc(src)}" style="flex:0 0 150px;height:280px;border-radius:12px;border:1px solid #E2E8F0;overflow:hidden;background:#0f172a;cursor:pointer;scroll-snap-align:start;display:flex;align-items:center;justify-content:center;">
                      <img src="${esc(src)}" alt="Capture d'écran" loading="lazy" style="width:100%;height:100%;object-fit:contain;">
                    </div>`;
          }).join("")}
        </div>` : ""}

        <section style="display:flex;flex-direction:column;gap:8px">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <h2 style="margin:0;font-size:16px;font-weight:700">À propos de l'appli</h2>
            <span aria-hidden="true" style="color:#0284c7;font-weight:700;font-size:18px">›</span>
          </div>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#475569">${esc(a.description || "")}</p>
        </section>

        <section style="display:flex;flex-direction:column;gap:10px">
          <h2 style="margin:0;font-size:16px;font-weight:700">Informations complémentaires</h2>
          <div style="border:1px solid #E2E8F0;border-radius:12px;padding:0 14px;background:#FFFFFF">
            <div style="display:flex;justify-content:space-between;gap:12px;padding:11px 0;border-bottom:1px solid #f1f5f9;font-size:14px"><span style="color:#94a3b8">Développeur</span><span style="font-weight:600;color:#334155">LogicX</span></div>
            <div style="display:flex;justify-content:space-between;gap:12px;padding:11px 0;font-size:14px"><span style="color:#94a3b8">Catégorie</span><span style="font-weight:600;color:#334155">${esc(a.categorie || "Applications")}</span></div>
          </div>
        </section>

        <section style="display:flex;flex-direction:column;gap:12px">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <h2 style="margin:0;font-size:16px;font-weight:700">Notes et avis</h2>
            <a href="/apps/${encodeURIComponent(appId)}/avis" style="font-size:12px;font-weight:600;color:#0284c7">Tout voir</a>
          </div>
          <div style="display:flex;align-items:center;gap:16px;background:#f8fafc;padding:12px;border-radius:12px;border:1px solid #f1f5f9">
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding-right:16px;border-right:1px solid #E2E8F0;flex-shrink:0">
              <span style="font-size:30px;font-weight:800;color:#1e293b">${count ? average.toFixed(1) : "--"}</span>
              <div aria-hidden="true" style="font-size:12px;letter-spacing:1px;margin:2px 0">${[1, 2, 3, 4, 5].map(i => `<span style="color:${count && i <= Math.round(average) ? "#0284c7" : "#cbd5e1"}">★</span>`).join("")}</div>
              <span style="font-size:11px;color:#94a3b8">${count} avis</span>
            </div>
            <div style="flex:1;display:flex;flex-direction:column;gap:4px;font-size:12px">
              ${[5, 4, 3, 2, 1].map((n, i) => `
                <div style="display:flex;align-items:center;gap:8px">
                  <span style="width:8px;font-size:10px;font-weight:500;color:#64748b">${n}</span>
                  <div style="flex:1;height:6px;background:#E2E8F0;border-radius:999px;overflow:hidden">
                    <div style="height:100%;width:${dist[i]}%;background:#0284c7;border-radius:999px"></div>
                  </div>
                </div>`).join("")}
            </div>
          </div>
          <a href="/apps/${encodeURIComponent(appId)}/avis" style="display:block;text-align:center;padding:10px 0;border-radius:12px;border:1px solid #0284c7;color:#0284c7;font-size:12px;font-weight:600">Rédiger un avis</a>
        </section>
      `;

      // Gestionnaires de téléchargement
      document.getElementById("dl")?.addEventListener("click", telecharger);
      if (apkLink) document.getElementById("dl2")?.addEventListener("click", telecharger);

      // Gestion de la modale d'agrandissement des captures
      const modal = document.getElementById("imgModal");
      const modalImg = document.getElementById("modalImg");

      document.querySelectorAll(".capture-thumb").forEach(thumb => {
        thumb.addEventListener("click", () => {
          modalImg.src = thumb.getAttribute("data-src");
          modal.style.display = "flex";
        });
      });

      window.closeModal = function() {
        modal.style.display = "none";
        modalImg.src = "";
      };

      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
      });
    }
  </script>
</body>
</html>