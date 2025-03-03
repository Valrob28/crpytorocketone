# Flight Simulator

Un simulateur de vol en 3D utilisant Three.js avec une physique réaliste.

## Fonctionnalités

- Contrôle réaliste d'un avion en 3D
- Système de collision avec l'environnement
- Système de score avec atterrissages
- Effets visuels (explosions) et sonores
- Support pour PC et appareils mobiles (joysticks tactiles)
- Environnement avec piste d'atterrissage, hangars et tour de contrôle

## Technologies utilisées

- Three.js pour les graphismes 3D
- Web Audio API pour les effets sonores
- HTML5 et JavaScript pour le client
- Node.js et Express pour le serveur

## Installation

1. Cloner le dépôt :
```bash
git clone https://github.com/Valrob28/crpytorocketone.git
cd crpytorocketone
```

2. Installer les dépendances :
```bash
npm install
```

3. Lancer le serveur :
```bash
npm start
```

4. Ouvrir le simulateur dans votre navigateur :
```
http://localhost:3000
```

## Contrôles

### PC
- W/S ou Flèches Haut/Bas : Tangage (pitch)
- A/D ou Flèches Gauche/Droite : Roulis (roll)
- ESPACE : Accélération
- SHIFT : Freinage

### Mobile
- Joystick gauche : Contrôle du tangage et du roulis
- Joystick droit : Contrôle de la vue

## Système de score

- +10 points : Atterrissage réussi sur la piste
- -50 points : Crash

## Licence

MIT