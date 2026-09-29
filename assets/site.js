// Comportements communs du site : menu, bannière cookies, formulaire de devis, avant/après, filtres
(function () {
  "use strict";

  // En-tête : ombre au défilement
  const entete = document.querySelector(".entete");
  const majEntete = () => entete && entete.classList.toggle("defile", window.scrollY > 8);
  window.addEventListener("scroll", majEntete, { passive: true });
  majEntete();

  // Menu mobile et sous-menu des services
  const boutonMenu = document.querySelector(".bouton-menu");
  const nav = document.querySelector(".nav");
  if (boutonMenu && nav) {
    boutonMenu.addEventListener("click", () => {
      const ouvert = nav.classList.toggle("ouvert");
      boutonMenu.setAttribute("aria-expanded", String(ouvert));
    });
  }
  document.querySelectorAll(".ouvrir-sous-menu").forEach((b) => b.addEventListener("click", () => {
    const ouvert = b.parentElement.classList.toggle("ouvert");
    b.setAttribute("aria-expanded", String(ouvert));
  }));

  // Consentement cookies : choix conservé 6 mois (recommandation CNIL), refuser aussi simple qu'accepter
  const CLE = "consentement-cookies";
  const DUREE = 1000 * 60 * 60 * 24 * 182;
  const lireChoix = () => {
    try {
      const choix = JSON.parse(localStorage.getItem(CLE));
      return choix && Date.now() - choix.date < DUREE ? choix : null;
    } catch { return null; }
  };
  // La mesure d'audience ne se charge qu'après accord explicite
  const appliquer = (choix) => {
    if (choix && choix.mesure && !window.__mesureChargee) {
      window.__mesureChargee = true;
      // Emplacement du script de statistiques : non chargé dans la démonstration
    }
  };
  const enregistrerChoix = (mesure) => {
    const choix = { mesure, date: Date.now() };
    try { localStorage.setItem(CLE, JSON.stringify(choix)); } catch {}
    appliquer(choix);
  };
  const banniere = document.querySelector(".cookies");
  if (banniere) {
    const detail = banniere.querySelector(".cookies-detail");
    const caseMesure = banniere.querySelector("#mesure-audience");
    const montrer = () => {
      const choix = lireChoix();
      if (caseMesure) caseMesure.checked = !!(choix && choix.mesure);
      banniere.classList.add("visible");
    };
    const cacher = () => { banniere.classList.remove("visible"); detail.classList.remove("ouvert"); };
    banniere.querySelector("[data-cookies='accepter']").addEventListener("click", () => { enregistrerChoix(true); cacher(); });
    banniere.querySelector("[data-cookies='refuser']").addEventListener("click", () => { enregistrerChoix(false); cacher(); });
    banniere.querySelector("[data-cookies='personnaliser']").addEventListener("click", () => detail.classList.toggle("ouvert"));
    banniere.querySelector("[data-cookies='enregistrer']").addEventListener("click", () => { enregistrerChoix(caseMesure.checked); cacher(); });
    document.querySelectorAll("[data-gerer-cookies]").forEach((b) => b.addEventListener("click", montrer));
    const choix = lireChoix();
    if (choix) appliquer(choix); else montrer();
  }

  // Avant / après : le curseur découvre la photo « après »
  document.querySelectorAll(".avant-apres input[type=range]").forEach((r) => {
    const maj = () => r.parentElement.style.setProperty("--pos", r.value + "%");
    r.addEventListener("input", maj);
    maj();
  });

  // Réalisations : filtre par type de travaux
  const filtres = document.querySelectorAll(".filtre");
  filtres.forEach((f) => f.addEventListener("click", () => {
    filtres.forEach((x) => x.setAttribute("aria-pressed", String(x === f)));
    const type = f.dataset.type;
    document.querySelectorAll(".realisation[data-type]").forEach((a) => { a.hidden = type !== "tout" && a.dataset.type !== type; });
  }));

  // Formulaire de devis : type de travaux présélectionné depuis la page d'un service (?travaux=…)
  const travaux = new URLSearchParams(location.search).get("travaux");
  if (travaux) {
    const c = document.querySelector(`input[name=travaux][value="${CSS.escape(travaux)}"]`);
    if (c) c.checked = true;
  }

  // Commune : les communes de la zone proposées à la frappe (sans tenir compte des accents), une autre commune reste possible
  document.querySelectorAll("input[data-communes]").forEach((champ) => {
    const liste = document.getElementById(champ.getAttribute("aria-controls"));
    const communes = JSON.parse(champ.dataset.communes);
    const simple = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    let actif = -1;
    const fermer = () => { liste.hidden = true; champ.setAttribute("aria-expanded", "false"); champ.removeAttribute("aria-activedescendant"); actif = -1; };
    const choisir = (c) => {
      champ.value = c;
      fermer();
      const bloc = champ.closest(".champ");
      bloc.classList.remove("invalide");
      bloc.querySelector(".erreur").textContent = "";
    };
    const montrer = () => {
      const q = simple(champ.value.trim());
      const trouvees = communes.filter((c) => simple(c).includes(q));
      liste.innerHTML = "";
      trouvees.forEach((c, i) => {
        const li = document.createElement("li");
        li.id = "commune-" + i;
        li.setAttribute("role", "option");
        li.textContent = c;
        li.addEventListener("mousedown", (e) => { e.preventDefault(); choisir(c); });
        liste.appendChild(li);
      });
      liste.hidden = !trouvees.length || (trouvees.length === 1 && trouvees[0] === champ.value);
      champ.setAttribute("aria-expanded", String(!liste.hidden));
      actif = -1;
    };
    const surligner = (i) => {
      const options = [...liste.children];
      actif = i;
      options.forEach((li, k) => li.setAttribute("aria-selected", String(k === actif)));
      champ.setAttribute("aria-activedescendant", options[actif].id);
      options[actif].scrollIntoView({ block: "nearest" });
    };
    champ.addEventListener("input", montrer);
    champ.addEventListener("focus", montrer);
    champ.addEventListener("blur", fermer);
    champ.addEventListener("keydown", (e) => {
      if (liste.hidden) return;
      const n = liste.children.length;
      if (e.key === "ArrowDown") { e.preventDefault(); surligner((actif + 1) % n); }
      else if (e.key === "ArrowUp") { e.preventDefault(); surligner(actif <= 0 ? n - 1 : actif - 1); }
      else if (e.key === "Enter" && actif >= 0) { e.preventDefault(); choisir(liste.children[actif].textContent); }
      else if (e.key === "Escape") fermer();
    });
  });

  // Photos du terrain : chaque ajout s'ajoute aux précédentes (5 au plus), chaque photo peut être retirée
  document.querySelectorAll("input[type=file][data-apercu]").forEach((champ) => {
    const MAX = 5;
    const zone = document.getElementById(champ.dataset.apercu);
    const info = champ.closest(".champ").querySelector(".erreur");
    const libelle = champ.closest(".depot").querySelector("strong");
    let photos = [];
    const afficher = () => {
      // Le champ garde toutes les photos retenues : c'est lui qui part avec le formulaire
      try { const dt = new DataTransfer(); photos.forEach((f) => dt.items.add(f)); champ.files = dt.files; } catch {}
      zone.innerHTML = "";
      photos.forEach((f, i) => {
        const vignette = document.createElement("div");
        vignette.className = "apercu";
        const img = document.createElement("img");
        img.src = URL.createObjectURL(f);
        img.alt = "Aperçu : " + f.name;
        const retirer = document.createElement("button");
        retirer.type = "button";
        retirer.textContent = "×";
        retirer.setAttribute("aria-label", "Retirer la photo " + f.name);
        retirer.addEventListener("click", () => { photos.splice(i, 1); if (info) info.textContent = ""; afficher(); });
        vignette.append(img, retirer);
        zone.appendChild(vignette);
      });
      libelle.textContent = photos.length ? `Ajouter d'autres photos (${photos.length} sur ${MAX})` : "Ajouter des photos";
    };
    champ.addEventListener("change", () => {
      const nouvelles = [...champ.files].filter((f) => f.type.startsWith("image/") && !photos.some((p) => p.name === f.name && p.size === f.size));
      const place = MAX - photos.length;
      photos = photos.concat(nouvelles.slice(0, place));
      if (info) info.textContent = nouvelles.length > place ? `${MAX} photos au plus : les suivantes n'ont pas été ajoutées.` : "";
      afficher();
    });
  });

  // Formulaires : validation côté navigateur, message d'erreur par champ, piège à robots
  document.querySelectorAll("form[data-formulaire]").forEach((form) => {
    form.setAttribute("novalidate", "");
    const messages = {
      valueMissing: "Ce champ est obligatoire.",
      typeMismatch: "Le format n'est pas valide.",
      patternMismatch: "Le format n'est pas valide.",
    };
    const verifier = (champ) => {
      const bloc = champ.closest(".champ");
      if (!bloc) return true;
      const erreur = bloc.querySelector(".erreur");
      const cle = Object.keys(messages).find((k) => champ.validity[k]);
      bloc.classList.toggle("invalide", !!cle);
      if (erreur) erreur.textContent = cle ? messages[cle] : "";
      return !cle;
    };
    form.querySelectorAll("input:not([type=file]), select, textarea").forEach((c) => c.addEventListener("blur", () => verifier(c)));
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (form.querySelector(".pot-de-miel input").value) return;
      const champs = [...form.querySelectorAll("input[type=text], input[type=email], input[type=tel], select, textarea")].filter((c) => c.closest(".champ"));
      const valides = champs.map(verifier).every(Boolean);
      const groupe = form.querySelector("[data-requis-groupe]");
      const groupeOk = !groupe || !!groupe.querySelector("input:checked");
      if (groupe) groupe.parentElement.querySelector(".erreur").textContent = groupeOk ? "" : "Choisissez au moins un type de travaux.";
      const accord = form.querySelector("[name=accord]");
      const accordErr = form.querySelector(".erreur-accord");
      if (accordErr) accordErr.textContent = accord.checked ? "" : "Votre accord est nécessaire pour traiter la demande.";
      if (!valides || !groupeOk || !accord.checked) {
        const premier = form.querySelector(".invalide input, .invalide select, .invalide textarea") || (groupeOk ? accord : groupe.querySelector("input"));
        if (premier) premier.focus();
        return;
      }
      // Démonstration : aucun envoi. En production, la demande et ses photos partent par e-mail à l'entreprise.
      form.style.display = "none";
      const succes = form.parentElement.querySelector(".succes");
      if (succes) { succes.style.display = "block"; succes.focus(); }
    });
  });

  document.querySelectorAll("[data-annee]").forEach((el) => { el.textContent = new Date().getFullYear(); });
})();
