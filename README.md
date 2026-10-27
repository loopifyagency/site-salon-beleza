# Salon Beleza – site vitrine

Site statique (HTML / CSS / JavaScript, **aucune étape de build**) du salon *Salon Beleza – Prothésiste ongulaire*, 8 rue Avel Sterenn, 29200 Brest.

Direction artistique : **« Néon sur lin »**. Un salon blanc, une enseigne rose néon, des palmes séchées et des ongles en amande. Le fil rouge visuel est l'**amande** : cadres photo, tubes néon, lames de palmes, avatars, « doigts » des chiffres clés, gouttes de vernis.

## Lancer en local

```bash
python3 -m http.server 8080   # puis http://localhost:8080
```

N'importe quel hébergement statique convient (Netlify, Vercel, GitHub Pages, OVH…) : il suffit de publier le dossier tel quel.

## Structure

```
index.html            tout le contenu (français), SEO et données structurées LocalBusiness
css/style.css         tokens (palette, polices), composants, une mise en page par section
js/main.js            horaires, menu, carrousel, SMS, puis mise en scène GSAP / Lenis
vendor/               GSAP + ScrollTrigger + Lenis (copie locale, pas de CDN)
assets/img/           photos du salon (agrandies ×2,5 ; originaux ≈ 200 px)
assets/fonts/         Caprasimo (titres) + Figtree (texte), auto-hébergées
favicon.svg, robots.txt
```

## Modifier le contenu

| Quoi | Où |
| --- | --- |
| Téléphone | `index.html` : chercher `0635185293` / `06 35 18 52 93` (liens `tel:` et `sms:`), et `js/main.js` (constante `PHONE`) |
| Horaires | `index.html` : liste `data-hours`, JSON-LD (`openingHoursSpecification`), pied de page. Le statut « Ouvert maintenant » est calculé dans `js/main.js` (`initHours`, heure de Paris) |
| Prestations et **tarifs** | section `#prestations` : chaque carte a une pastille `Tarif sur demande` à remplacer par le prix |
| Chiffres clés | section `#chiffres` : `data-count` (valeur finale) et `data-from` (valeur de départ) |
| Avis | section `#avis` : texte repris **mot pour mot** des avis fournis (fautes comprises) |
| Photos | `assets/img/` : garder les mêmes noms, ou mettre à jour les `src` / `alt` |
| Palette | variables `:root` en haut de `css/style.css` |

## Points à compléter / valider

- **Prestations** : les intitulés et descriptions (pose et allongement, nail art, effets, French, sur mesure, entretien) sont rédigés à partir des avis et des photos ; à valider par Axelle, avec les tarifs.
- **Chiffres clés** : aucun chiffre commercial n'a été fourni, donc seuls des faits vérifiables sont affichés (6 jours sur 7, 10 ongles, et deux clins d'œil aux avis de Flavie et Martine). Remplacer par les vrais chiffres (années d'expérience, nombre de clientes…).
- **Dimanche** : la fiche indique « dimanche (Toussaint) : fermé » ; vérifier les horaires habituels du dimanche.
- **Réseaux sociaux** : aucun lien fourni, rien n'est affiché dans le pied de page. Ajouter Instagram / Facebook dans `.footer__cols`.
- **Prise de rendez-vous** : par téléphone et SMS (message prérempli). Pour une réservation en ligne, remplacer les boutons de `#rdv` par le lien de l'outil choisi.
- **Photos** : les cinq photos fournies font environ 200 px de large ; elles sont utilisées en petits formats pour rester nettes. Des fichiers plus grands (≥ 1200 px de large) permettraient un hero plein écran, et une vidéo 16:9 en boucle peut s'ajouter au hero.
- **SEO** : ajouter `<link rel="canonical">`, une image `og:image` et un `sitemap.xml` une fois le nom de domaine connu.
- **Carte** : l'iframe Google Maps utilise `maps?q=…&output=embed` ; à contrôler une fois le site en ligne.

## Mouvement et accessibilité

- GSAP + ScrollTrigger + Lenis (défilement inertiel) : parallaxe multicouche, titres masqués lettre par lettre ou mot par mot, section pinnée (« Un rendez-vous, quatre temps »), défilement horizontal piloté par le scroll (prestations), éventail de photos, bandeaux dont la vitesse suit le scroll, compteurs, boutons magnétiques, cartes à inclinaison 3D, curseur sur souris.
- Les animations ne touchent que `transform` / `opacity` (plus quelques `clip-path` pour les révélations par masque).
- **Sans JavaScript** ou avec **`prefers-reduced-motion`** : le site reste complet (étapes empilées, prestations en défilement natif, éventail statique, pas de préchargeur).
- Sur mobile (< 900 px) : sections pinnées simplifiées, bouton « Appeler » flottant.
- Contrastes AA, focus visible, navigation clavier (carrousel : flèches, pause, précédent / suivant), lien d'évitement. Audit axe-core : 0 violation.
