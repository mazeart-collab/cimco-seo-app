# Contexte du projet : Outil de pages SEO locales Cimco

## Objectif
Web app qui génère et édite des pages SEO locales "Faire construire à [commune]" pour cimco.fr (courtier en construction de maisons individuelles en Auvergne-Rhône-Alpes, bureaux à Vourles).

## Stack technique
- React + Vite + Tailwind CSS + icônes `lucide-react`
- Hébergement : Vercel (site statique + fonctions serverless dans `/api/dvf.js` et `/api/generate.js`)
- Base de données des annonces Cimco stockée dans `src/data/annonces.json`

## Règles strictes
- **Données réelles uniquement** : aucun chiffre, prix, témoignage ou annonce inventé. Les prix terrains/maisons DVF affichent toujours uniquement une moyenne par commune, avec leur source et leur période.
- **SEO & Similarité** : chaque page doit contenir des données propres à la commune pour éviter le contenu dupliqué.
- **Style de code** : composants propres, interface moderne et épurée (style SaaS), responsive.
- **Façon de travailler** : exécute exactement ce qui est demandé sans prendre d'initiatives non sollicitées. Réponses directes et concises, ton naturel, pas de tirets cadratins en français.
