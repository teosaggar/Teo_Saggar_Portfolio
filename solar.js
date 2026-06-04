/* ================================================================
   solar.js — Diagramme solaire en temps réel
   Calcule la position du soleil selon ta localisation (ou Istanbul)
   et change la couleur de fond du site en conséquence.
================================================================ */
 
/* ----------------------------------------------------------------
   CENTRE ET RAYON DU DEMI-CERCLE dans le SVG (viewBox 320x220)
---------------------------------------------------------------- */
const SOL_CX = 160;   // centre horizontal
const SOL_CY = 155;   // ligne d'horizon
const SOL_R  = 120;   // rayon du demi-cercle
 
/* ----------------------------------------------------------------
   MATHS : convertir degrés <-> radians
---------------------------------------------------------------- */
function toRad(deg) { return deg * Math.PI / 180; }
function toDeg(rad) { return rad * 180 / Math.PI; }
 
/* ----------------------------------------------------------------
   CALCUL DE LA POSITION DU SOLEIL
   Paramètres :
     date  — objet Date JavaScript
     lat   — latitude en degrés (ex : 41.015 pour Istanbul)
     lon   — longitude en degrés (ex : 28.979 pour Istanbul)
   Retourne :
     alt   — altitude en degrés (hauteur au-dessus de l'horizon)
     az    — azimut en degrés (0=N, 90=E, 180=S, 270=W)
---------------------------------------------------------------- */
function sunPosition(date, lat, lon) {
    // Jour Julien
    const JD = date.getTime() / 86400000 + 2440587.5;
    const n  = JD - 2451545.0;
 
    // Longitude écliptique moyenne et anomalie moyenne
    const L      = (280.460 + 0.9856474 * n) % 360;
    const g      = toRad((357.528 + 0.9856003 * n) % 360);
    const lambda = toRad(L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g));
 
    // Obliquité de l'écliptique
    const epsilon = toRad(23.439 - 0.0000004 * n);
 
    // Ascension droite et déclinaison
    const RA  = Math.atan2(Math.cos(epsilon) * Math.sin(lambda), Math.cos(lambda));
    const dec = Math.asin(Math.sin(epsilon) * Math.sin(lambda));
 
    // Temps sidéral et angle horaire
    const GMST = (18.697375 + 24.065710 * n) % 24;
    const LST  = ((GMST + lon / 15) % 24 + 24) % 24;
    const HA   = toRad((LST - toDeg(RA) / 15) * 15);
 
    // Altitude
    const latR   = toRad(lat);
    const sinAlt = Math.sin(latR) * Math.sin(dec) + Math.cos(latR) * Math.cos(dec) * Math.cos(HA);
    const alt    = toDeg(Math.asin(sinAlt));
 
    // Azimut
    const cosAz = (Math.sin(dec) - Math.sin(toRad(alt)) * Math.sin(latR))
                / (Math.cos(toRad(alt)) * Math.cos(latR));
    let az = toDeg(Math.acos(Math.max(-1, Math.min(1, cosAz))));
    if (Math.sin(HA) > 0) az = 360 - az;
 
    return { alt, az };
}

/* ----------------------------------------------------------------
   CALCUL DE LA POSITION DE LA LUNE (approximation astronomique)
---------------------------------------------------------------- */
function moonPosition(date, lat, lon) {
    const JD = date.getTime() / 86400000 + 2440587.5;
    const n  = JD - 2451545.0;

    const L = (218.316 + 13.176396 * n) % 360;
    const M = (134.963 + 13.064993 * n) % 360;
    const F = (93.272 + 13.229350 * n) % 360;

    const lambda = toRad(L + 6.289 * Math.sin(toRad(M)));
    const beta   = toRad(5.128 * Math.sin(toRad(F)));
    const epsilon = toRad(23.439 - 0.0000004 * n);

    const dec = Math.asin(
        Math.sin(beta) * Math.cos(epsilon) +
        Math.cos(beta) * Math.sin(epsilon) * Math.sin(lambda)
    );
    const RA = Math.atan2(
        Math.sin(lambda) * Math.cos(epsilon) - Math.tan(beta) * Math.sin(epsilon),
        Math.cos(lambda)
    );

    const GMST = (18.697375 + 24.065710 * n) % 24;
    const LST  = ((GMST + lon / 15) % 24 + 24) % 24;
    const HA   = toRad((LST - toDeg(RA) / 15) * 15);

    const latR   = toRad(lat);
    const sinAlt = Math.sin(latR) * Math.sin(dec) + Math.cos(latR) * Math.cos(dec) * Math.cos(HA);
    const alt    = toDeg(Math.asin(sinAlt));

    const cosAz = (Math.sin(dec) - Math.sin(toRad(alt)) * Math.sin(latR))
                / (Math.cos(toRad(alt)) * Math.cos(latR));
    let az = toDeg(Math.acos(Math.max(-1, Math.min(1, cosAz))));
    if (Math.sin(HA) > 0) az = 360 - az;

    return { alt, az };
}
 
/* ----------------------------------------------------------------
   CONVERSION altitude + azimut  →  coordonnées X,Y dans le SVG
   On dessine la moitié sud du ciel (E à W en passant par S)
   az=90 (Est)  → gauche du diagramme (x = CX - R)
   az=180 (Sud) → centre                (x = CX)
   az=270 (Ouest) → droite              (x = CX + R)
---------------------------------------------------------------- */
function altAzToXY(alt, az) {
    const x = SOL_CX + SOL_R * Math.sin(toRad(az - 180));
    const y = SOL_CY - SOL_R * (alt / 90);
    return { x, y };
}

function positionDotLabel(labelId, x, y) {
    const label = document.getElementById(labelId);
    if (!label) return;
    label.setAttribute('x', x.toFixed(1));
    label.setAttribute('y', (y - 11).toFixed(1));
}
 
/* ----------------------------------------------------------------
   COULEUR DE FOND selon l'altitude du soleil
   Retourne [r, g, b]
---------------------------------------------------------------- */
function skyColor(alt) {
    function lerp(a, b, t) { return Math.round(a + (b - a) * Math.max(0, Math.min(1, t))); }
    function lerpColor(c1, c2, t) {
        return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
    }
 
    const NUIT      = [8,   6,  22];   // nuit noire / violet profond
    const CREPUSCULE= [30,  20,  60];  // crépuscule violet
    const AUBE      = [200, 80,  30];  // lever/coucher : orange brûlé
    const MATIN     = [193,146,  58];  // ta couleur d'origine (or chaud)
    const MIDI      = [160,120,  50];  // légèrement plus foncé à midi
 
    if (alt < -12) return NUIT;
    if (alt < -6)  return lerpColor(NUIT, CREPUSCULE, (alt + 12) / 6);
    if (alt < 0)   return lerpColor(CREPUSCULE, AUBE, (alt + 6) / 6);
    if (alt < 10)  return lerpColor(AUBE, MATIN, alt / 10);
    if (alt < 45)  return lerpColor(MATIN, MIDI, (alt - 10) / 35);
    return MIDI;
}
 
/* ----------------------------------------------------------------
   COULEUR DU POINT SOLEIL selon son altitude
---------------------------------------------------------------- */
function sunDotColor(alt) {
    if (alt <= 0)  return 'rgba(255,255,255,0)';  // invisible la nuit
    if (alt < 10)  return '#E8784A';               // orange au lever/coucher
    if (alt < 30)  return '#F0A030';               // orange doré
    return '#F5C842';                               // jaune vif en journée
}
 
/* ----------------------------------------------------------------
   COULEUR DU TEXTE ET DES LIGNES
   Sombre sur fond clair, clair sur fond sombre
---------------------------------------------------------------- */
function fgColor(bg) {
    const lum = 0.299 * bg[0] + 0.587 * bg[1] + 0.114 * bg[2];
    return lum > 90 ? 'rgba(30,20,5,0.75)' : 'rgba(255,235,180,0.75)';
}
 
/* ----------------------------------------------------------------
   DESSINER LA GRILLE (arcs d'altitude + rayons d'azimut)
---------------------------------------------------------------- */
function drawGrid(fg) {
    const arcsGroup   = document.getElementById('solar-grid-arcs');
    const spokesGroup = document.getElementById('solar-grid-spokes');
    arcsGroup.innerHTML   = '';
    spokesGroup.innerHTML = '';
 
    const ns = 'http://www.w3.org/2000/svg';
 
    // 5 arcs d'altitude : 18°, 36°, 54°, 72°, 90°
    for (let a = 18; a <= 90; a += 18) {
        const r    = SOL_R * (1 - a / 90);
        const arc  = document.createElementNS(ns, 'path');
        arc.setAttribute('d', `M ${SOL_CX - r} ${SOL_CY} A ${r} ${r} 0 0 1 ${SOL_CX + r} ${SOL_CY}`);
        arc.setAttribute('stroke', fg);
        arc.setAttribute('fill', 'none');
        arc.setAttribute('stroke-width', '0.5');
        arcsGroup.appendChild(arc);
    }
 
    // Rayons d'azimut : de 90° (Est) à 270° (Ouest) par pas de 30°
    for (let az = 90; az <= 270; az += 30) {
        const tip  = altAzToXY(90, az);
        const line = document.createElementNS(ns, 'line');
        line.setAttribute('x1', String(SOL_CX));
        line.setAttribute('y1', String(SOL_CY));
        line.setAttribute('x2', tip.x.toFixed(1));
        line.setAttribute('y2', tip.y.toFixed(1));
        line.setAttribute('stroke', fg);
        line.setAttribute('stroke-width', '0.5');
        spokesGroup.appendChild(line);
    }
}
 
/* ----------------------------------------------------------------
   MISE À JOUR PRINCIPALE
   Appelée toutes les 60 secondes et au chargement
---------------------------------------------------------------- */
function updateSolar(lat, lon) {
    const solarWidget = document.getElementById('solar-widget');
    if (!solarWidget) return;

    const now = new Date();
    const cur = sunPosition(now, lat, lon);
 
    /* --- Couleurs du widget + fond de page blanc partout --- */
    const bg = [255, 255, 255];
    const fg = fgColor(bg);
    document.body.style.backgroundColor = 'rgb(255,255,255)';
 
    /* --- Grille --- */
    drawGrid(fg);
 
    /* --- Horizon --- */
    const horizon = document.getElementById('solar-horizon');
    horizon.setAttribute('stroke', fg);
 
    /* --- Labels E S W --- */
    ['solar-lbl-e', 'solar-lbl-s', 'solar-lbl-w'].forEach(id => {
        document.getElementById(id).setAttribute('fill', fg);
    });
 
    /* --- Trajectoire du soleil aujourd'hui --- */
    const pathPoints = [];
    for (let h = 0; h <= 24; h += 0.25) {
        const d = new Date(now);
        d.setHours(0, 0, 0, 0);
        d.setTime(d.getTime() + h * 3600000);
        const pos = sunPosition(d, lat, lon);
        // On ne trace que la partie visible (au-dessus de l'horizon, entre E et W)
        if (pos.alt > 0 && pos.az >= 90 && pos.az <= 270) {
            pathPoints.push(altAzToXY(pos.alt, pos.az));
        }
    }
 
    const sunPath = document.getElementById('solar-path');
    if (pathPoints.length > 1) {
        const d = pathPoints
            .map((p, i) => (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ' ' + p.y.toFixed(1))
            .join(' ');
        sunPath.setAttribute('d', d);
        sunPath.setAttribute('stroke', fg.replace('0.75', '0.4'));
    }
 
    /* --- Point soleil --- */
    const dot = document.getElementById('solar-dot');
    if (cur.alt > 0 && cur.az >= 90 && cur.az <= 270) {
        const pt = altAzToXY(cur.alt, cur.az);
        dot.setAttribute('cx', pt.x.toFixed(1));
        dot.setAttribute('cy', pt.y.toFixed(1));
        dot.setAttribute('r', '5');
        dot.setAttribute('fill', sunDotColor(cur.alt));
        positionDotLabel('solar-dot-label', pt.x, pt.y);
    } else {
        dot.setAttribute('r', '0'); // caché la nuit
    }

    /* --- Point lune (visible après coucher du soleil) --- */
    const moon = moonPosition(now, lat, lon);
    const moonDot = document.getElementById('moon-dot');
    const moonAltEl = document.getElementById('solar-moon-alt');
    const moonAzEl = document.getElementById('solar-moon-az');
    const isNight = cur.alt <= 0;

    if (moonDot && moonAltEl && moonAzEl) {
        if (isNight && moon.alt > 0 && moon.az >= 90 && moon.az <= 270) {
            const mpt = altAzToXY(moon.alt, moon.az);
            moonDot.setAttribute('cx', mpt.x.toFixed(1));
            moonDot.setAttribute('cy', mpt.y.toFixed(1));
            moonDot.setAttribute('r', '4');
            moonDot.setAttribute('fill', '#9AA8C4');
            positionDotLabel('moon-dot-label', mpt.x, mpt.y);
            moonAltEl.textContent = 'LUNE ALT ' + moon.alt.toFixed(1) + '°';
            moonAzEl.textContent  = 'LUNE AZ  ' + moon.az.toFixed(1) + '°';
            moonAltEl.setAttribute('visibility', 'visible');
            moonAzEl.setAttribute('visibility', 'visible');
        } else {
            moonDot.setAttribute('r', '0');
            moonAltEl.textContent = '';
            moonAzEl.textContent  = '';
            moonAltEl.setAttribute('visibility', 'hidden');
            moonAzEl.setAttribute('visibility', 'hidden');
        }

        moonAltEl.setAttribute('fill', fg);
        moonAzEl.setAttribute('fill', fg);
    }
 
    /* --- Texte d'information --- */
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
 
    document.getElementById('solar-time').textContent = hh + ':' + mm + ':' + ss;
    document.getElementById('solar-alt').textContent  = 'ALT  ' + cur.alt.toFixed(1) + '°';
    document.getElementById('solar-az').textContent   = 'AZ  '  + cur.az.toFixed(1)  + '°';
 
    document.getElementById('solar-time').setAttribute('fill', fg);
    document.getElementById('solar-alt').setAttribute('fill', fg);
    document.getElementById('solar-az').setAttribute('fill', fg);
}
 
/* ----------------------------------------------------------------
   DÉMARRAGE : géolocalisation ou Istanbul par défaut
---------------------------------------------------------------- */
function startSolar() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            pos  => {
                const lat = pos.coords.latitude;
                const lon = pos.coords.longitude;
                updateSolar(lat, lon);
                setInterval(() => updateSolar(lat, lon), 1000);
            },
            ()   => {
                // Refus ou erreur → Istanbul
                updateSolar(41.015, 28.979);
                setInterval(() => updateSolar(41.015, 28.979), 1000);
            }
        );
    } else {
        // Navigateur sans géolocalisation → Istanbul
        updateSolar(41.015, 28.979);
        setInterval(() => updateSolar(41.015, 28.979), 1000);
    }
}
 
// Lancer au chargement de la page
startSolar();