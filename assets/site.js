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

  // Photos du terrain : aperçu avant envoi, 5 photos au plus
  document.querySelectorAll("input[type=file][data-apercu]").forEach((champ) => {
    const zone = document.getElementById(champ.dataset.apercu);
    const info = champ.closest(".champ").querySelector(".erreur");
    champ.addEventListener("change", () => {
      zone.innerHTML = "";
      const fichiers = [...champ.files].filter((f) => f.type.startsWith("image/")).slice(0, 5);
      fichiers.forEach((f) => {
        const img = document.createElement("img");
        img.src = URL.createObjectURL(f);
        img.alt = "Aperçu : " + f.name;
        zone.appendChild(img);
      });
      if (info) info.textContent = champ.files.length > 5 ? "Seules les 5 premières photos seront envoyées." : "";
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
