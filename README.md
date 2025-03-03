# Starship Battle

Un jeu multijoueur de combat spatial en 3D inspiré du Starship, avec une physique réaliste et des graphismes immersifs.

## 🚀 Fonctionnalités

- Combat spatial multijoueur en temps réel
- Physique réaliste (inertie, gravité, collisions)
- Environnement 3D détaillé avec planètes et bâtiments futuristes
- Effets sonores et visuels inspirés de Star Wars
- Mini-map dynamique
- Interface utilisateur moderne et intuitive

## 🛠 Prérequis

- Node.js v14 ou supérieur
- Un navigateur web moderne avec support WebGL

## 📦 Installation

1. Clonez le dépôt :
```bash
git clone https://github.com/votre-username/starship-battle.git
cd starship-battle
```

2. Installez les dépendances :
```bash
npm install
```

3. Téléchargez les ressources nécessaires :
- Placez les textures de skybox dans `public/textures/skybox/`
- Placez les textures des planètes dans `public/textures/planets/`
- Placez les effets sonores dans `public/sounds/`

## 🎮 Lancement

1. Démarrez le serveur :
```bash
npm start
```

2. Ouvrez votre navigateur et accédez à :
```
http://localhost:3000
```

## 🕹 Contrôles

- **ZQSD / Flèches** : Contrôle de la rotation
- **Espace** : Propulsion
- **Clic gauche** : Tir de missiles
- **R** : Réinitialisation de la position
- **Shift** : Mode précision (rotation plus lente)
- **Molette** : Zoom de la caméra

## 🌍 Environnement de jeu

- Grande île futuriste avec relief
- 10 planètes en orbite
- Bâtiments et structures futuristes
- Pistes d'atterrissage
- Océan dynamique
- Effets atmosphériques

## 🔧 Configuration

Le jeu est configuré pour fonctionner à 60 FPS sur la plupart des machines modernes. Vous pouvez ajuster les paramètres graphiques dans le code source si nécessaire.

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou à soumettre une pull request.

## 📝 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🙏 Crédits

- Three.js pour le moteur 3D
- Socket.IO pour la communication en temps réel
- Effets sonores inspirés de Star Wars