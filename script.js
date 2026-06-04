
/* ================================================================
   script.js — Animations et interactions du portfolio
   Contient :
     1. Apparition des projets au scroll
     2. Transition de page (fondu au chargement et au clic)
================================================================ */
 
 
/* ================================================================
   1. APPARITION DES PROJETS AU SCROLL
   Les sections de projet apparaissent progressivement quand
   on scrolle vers elles (elles montent depuis le bas).
================================================================ */
 
// On sélectionne les trois sections de projets
const sectionsAProjets = document.querySelectorAll(
    '.project-preview-S6, .project-preview-S5, .project-preview-S4'
);
 
// IntersectionObserver : surveille quand un élément entre dans l'écran
const observateur = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
        // Quand l'élément est visible à 20%, on lui ajoute la classe "visible"
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, {
    threshold: 0.2  // déclenche quand 20% de l'élément est visible
});
 
// On dit à l'observateur de surveiller chaque section
sectionsAProjets.forEach(function(section) {
    observateur.observe(section);
});
 
 
/* ================================================================
   2. TRANSITION DE PAGE (FONDU)
   La page apparaît en fondu au chargement.
   Quand on clique sur un lien, la page disparaît en fondu
   avant de naviguer vers la page suivante.
================================================================ */
 
// Fondu entrant : la page part de invisible et devient visible
document.body.style.opacity = '0';
document.body.style.transition = 'opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
 
window.addEventListener('load', function() {
    document.body.style.opacity = '1';
});
 
// Fondu sortant : au clic sur un lien interne
document.querySelectorAll('a').forEach(function(lien) {
    lien.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
 
        // On ignore les liens vides, les ancres (#), et les liens externes
        if (!href || href.startsWith('#') || href.startsWith('http')) {
            return;
        }
 
        // Empêche la navigation immédiate
        e.preventDefault();
 
        // Fondu vers invisible
        document.body.style.opacity = '0';
 
        // Après 0.8 secondes (durée du fondu), on navigue
        setTimeout(function() {
            window.location.href = href;
        }, 800);
    });
});

/* ================================================================
   3. PANNEAU TEXTE TIRABLE (gauche)
================================================================ */
(function () {
    const drawer = document.getElementById('sideDrawer');
    const handle = document.getElementById('drawerHandle');
    // Si la page n'a pas de drawer (autres pages non encore modifiées), on sort proprement.
    if (!drawer || !handle) return;
    function setOpenState(isOpen) {
        drawer.classList.toggle('open', isOpen);
        drawer.classList.toggle('closed', !isOpen);
        handle.setAttribute('aria-expanded', String(isOpen));
    }
    // État initial: fermé
    setOpenState(false);
    // Clic poignée: ouvre/ferme
    handle.addEventListener('click', function () {
        const isOpen = drawer.classList.contains('open');
        setOpenState(!isOpen);
    });
    // Optionnel: touche Echap pour fermer
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            setOpenState(false);
        }
    });
})();

/* ================================================================
   4. LIGHTBOX — page Observation
================================================================ */
(function () {
 
    /* On vérifie qu'on est bien sur la page avec la grille masonry */
    const grille = document.querySelector('.masonry-grid');
    if (!grille) return;
 
    /* --- Créer la lightbox dans le HTML --- */
    /* On crée les éléments directement en JS, pas besoin de les écrire dans le HTML */
    const lightbox = document.createElement('div');
    lightbox.id = 'lightbox';
 
    const closebtn = document.createElement('span');
    closebtn.id = 'lightbox-close';
    closebtn.textContent = '×';
 
    const imgAgrandie = document.createElement('img');
 
    lightbox.appendChild(closebtn);
    lightbox.appendChild(imgAgrandie);
    document.body.appendChild(lightbox);
 
    /* --- Ouvrir la lightbox --- */
    function ouvrir(src) {
        imgAgrandie.src = src;
        lightbox.classList.add('active');
        /* Empêche le scroll de la page derrière */
        document.body.style.overflow = 'hidden';
    }
 
    /* --- Fermer la lightbox --- */
    function fermer() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
        /* On vide le src pour éviter l'image précédente lors de la prochaine ouverture */
        setTimeout(function() { imgAgrandie.src = ''; }, 300);
    }
 
    /* --- Clic sur une photo de la grille --- */
    grille.addEventListener('click', function(e) {
        const img = e.target.closest('.masonry-item img');
        if (!img) return;
        ouvrir(img.src);
    });
 
    /* --- Fermer en cliquant sur le fond ou la croix --- */
    lightbox.addEventListener('click', function(e) {
        /* Si on clique sur l'image elle-même, on ne ferme pas */
        if (e.target === imgAgrandie) return;
        fermer();
    });
 
    /* --- Fermer avec la touche Echap --- */
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') fermer();
    });
 
})();