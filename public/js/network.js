let socket;
const otherPlayers = new Map();
let lastUpdateTime = Date.now();
const UPDATE_INTERVAL = 16; // ~60fps

function initNetwork(pseudo) {
    // Initialisation de Socket.IO
    socket = io();

    // Gestion des événements de connexion
    socket.on('connect', () => {
        console.log('Connecté au serveur');
        // Envoi des informations du joueur
        socket.emit('playerJoin', { 
            pseudo,
            position: { x: 0, y: 100, z: 0 },
            rotation: { x: 0, y: 0, z: 0 }
        });
    });

    // Réception de la liste des joueurs
    socket.on('players', (players) => {
        updatePlayers(players);
    });

    // Réception des mises à jour de position
    socket.on('playerMoved', (data) => {
        if (data.id !== socket.id) {
            updatePlayerPosition(data);
        }
    });

    // Réception des tirs de missiles
    socket.on('missilesFired', (data) => {
        if (data.playerId !== socket.id) {
            createMissile(data.position, data.direction);
        }
    });

    // Gestion des collisions
    socket.on('playerHit', (data) => {
        if (data.targetId === socket.id) {
            handleHit();
        }
    });

    // Gestion de la déconnexion des autres joueurs
    socket.on('playerDisconnected', (playerId) => {
        removePlayer(playerId);
    });

    // Démarrage de la boucle de mise à jour
    setInterval(sendUpdate, UPDATE_INTERVAL);
}

function updatePlayers(players) {
    // Supprimer les joueurs déconnectés
    for (const [id, player] of otherPlayers) {
        if (!players.find(p => p.id === id)) {
            removePlayer(id);
        }
    }

    // Mettre à jour ou ajouter les joueurs
    players.forEach(playerData => {
        if (playerData.id === socket.id) return; // Ignorer notre propre vaisseau

        let player = otherPlayers.get(playerData.id);
        
        if (!player) {
            // Créer un nouveau vaisseau pour le joueur
            player = createPlayerShip(playerData);
            otherPlayers.set(playerData.id, player);
        }

        // Mettre à jour la position et la rotation avec interpolation
        updatePlayerPosition({
            id: playerData.id,
            position: playerData.position,
            rotation: playerData.rotation
        });
    });

    // Mise à jour du HUD et de la mini-map
    updateHUD();
    updateMinimap();
}

function createPlayerShip(playerData) {
    // Création d'un vaisseau pour un autre joueur
    const shipGeometry = new THREE.Group();

    // Corps principal
    const bodyGeometry = new THREE.ConeGeometry(5, 20, 8);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xff0000,  // Couleur différente pour les autres joueurs
        shininess: 100
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.x = Math.PI / 2;
    shipGeometry.add(body);

    // Ailes
    const wingGeometry = new THREE.BoxGeometry(15, 2, 5);
    const wingMaterial = new THREE.MeshPhongMaterial({ color: 0xcc0000 });
    const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
    leftWing.position.set(-7.5, 0, 5);
    const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
    rightWing.position.set(7.5, 0, 5);
    shipGeometry.add(leftWing);
    shipGeometry.add(rightWing);

    // Nom du joueur
    const textSprite = createPlayerLabel(playerData.pseudo);
    textSprite.position.set(0, 10, 0);
    shipGeometry.add(textSprite);

    scene.add(shipGeometry);

    return {
        mesh: shipGeometry,
        pseudo: playerData.pseudo,
        lastPosition: new THREE.Vector3(),
        lastRotation: new THREE.Euler(),
        targetPosition: new THREE.Vector3(),
        targetRotation: new THREE.Euler(),
        interpolationStart: Date.now()
    };
}

function createPlayerLabel(text) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;

    context.font = 'Bold 24px Arial';
    context.fillStyle = '#ffffff';
    context.textAlign = 'center';
    context.fillText(text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ 
        map: texture,
        transparent: true
    });
    return new THREE.Sprite(spriteMaterial);
}

function updatePlayerPosition(data) {
    const player = otherPlayers.get(data.id);
    if (!player) return;

    // Sauvegarde des positions actuelles pour l'interpolation
    player.lastPosition.copy(player.mesh.position);
    player.lastRotation.copy(player.mesh.rotation);

    // Définition des positions cibles
    player.targetPosition.set(data.position.x, data.position.y, data.position.z);
    player.targetRotation.set(data.rotation.x, data.rotation.y, data.rotation.z);

    // Réinitialisation du temps d'interpolation
    player.interpolationStart = Date.now();
}

function interpolatePositions() {
    const now = Date.now();

    otherPlayers.forEach(player => {
        const delta = (now - player.interpolationStart) / UPDATE_INTERVAL;
        if (delta <= 1) {
            // Interpolation linéaire des positions
            player.mesh.position.lerpVectors(
                player.lastPosition,
                player.targetPosition,
                delta
            );

            // Interpolation sphérique des rotations
            player.mesh.rotation.x = THREE.MathUtils.lerp(
                player.lastRotation.x,
                player.targetRotation.x,
                delta
            );
            player.mesh.rotation.y = THREE.MathUtils.lerp(
                player.lastRotation.y,
                player.targetRotation.y,
                delta
            );
            player.mesh.rotation.z = THREE.MathUtils.lerp(
                player.lastRotation.z,
                player.targetRotation.z,
                delta
            );
        }
    });
}

function removePlayer(playerId) {
    const player = otherPlayers.get(playerId);
    if (player) {
        scene.remove(player.mesh);
        otherPlayers.delete(playerId);
    }
}

function sendUpdate() {
    if (socket && ship) {
        const now = Date.now();
        if (now - lastUpdateTime >= UPDATE_INTERVAL) {
            socket.emit('updatePosition', {
                position: ship.position.clone(),
                rotation: ship.rotation.clone(),
                velocity: velocity.clone()
            });
            lastUpdateTime = now;
        }
    }
}

function handleHit() {
    // Effet visuel de dégât
    createExplosionEffect(ship.position);
    playExplosionSound();
    
    // Réinitialisation de la position si trop de dégâts
    if (Math.random() < 0.3) { // 30% de chance de réinitialisation
        resetPosition();
    }
}

function createExplosionEffect(position) {
    const particleCount = 20;
    const particles = new THREE.Group();
    
    for (let i = 0; i < particleCount; i++) {
        const geometry = new THREE.SphereGeometry(0.2, 8, 8);
        const material = new THREE.MeshBasicMaterial({
            color: 0xff6600,
            transparent: true,
            opacity: 1
        });
        const particle = new THREE.Mesh(geometry, material);
        
        // Position aléatoire autour du point d'impact
        particle.position.copy(position).add(
            new THREE.Vector3(
                (Math.random() - 0.5) * 5,
                (Math.random() - 0.5) * 5,
                (Math.random() - 0.5) * 5
            )
        );
        
        // Vélocité aléatoire
        particle.userData.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2
        );
        
        particles.add(particle);
    }
    
    scene.add(particles);
    
    // Animation des particules
    const startTime = Date.now();
    const duration = 1000; // 1 seconde
    
    function animateExplosion() {
        const elapsed = Date.now() - startTime;
        if (elapsed > duration) {
            scene.remove(particles);
            return;
        }
        
        const progress = elapsed / duration;
        
        particles.children.forEach(particle => {
            particle.position.add(particle.userData.velocity);
            particle.material.opacity = 1 - progress;
            particle.scale.multiplyScalar(0.98);
        });
        
        requestAnimationFrame(animateExplosion);
    }
    
    animateExplosion();
}

// Ajout de la fonction d'interpolation à la boucle d'animation
function updateGameLoop() {
    interpolatePositions();
    updateHUD();
    updateMinimap();
}

function updateServerPosition(data) {
    if (socket) {
        socket.emit('updatePosition', data);
    }
}

function createMissile(position, direction) {
    // Création du missile
    const geometry = new THREE.SphereGeometry(1, 8, 8);
    const material = new THREE.MeshPhongMaterial({ color: 0xff6600 });
    const missile = new THREE.Mesh(geometry, material);
    
    missile.position.copy(position);
    scene.add(missile);

    // Animation du missile
    const speed = 5;
    const lifeTime = 3000; // 3 secondes
    const velocity = direction.multiplyScalar(speed);

    const startTime = Date.now();
    function animateMissile() {
        if (Date.now() - startTime > lifeTime) {
            scene.remove(missile);
            return;
        }

        missile.position.add(velocity);
        requestAnimationFrame(animateMissile);
    }

    animateMissile();
}

function updateMinimap() {
    const minimap = document.getElementById('minimap');
    const ctx = minimap.getContext('2d');
    
    ctx.clearRect(0, 0, minimap.width, minimap.height);
    
    // Dessiner notre position
    const centerX = minimap.width / 2;
    const centerY = minimap.height / 2;
    
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Dessiner les autres joueurs
    ctx.fillStyle = 'red';
    otherPlayers.forEach(player => {
        const relativeX = (player.mesh.position.x - ship.position.x) / 20;
        const relativeZ = (player.mesh.position.z - ship.position.z) / 20;
        
        ctx.beginPath();
        ctx.arc(centerX + relativeX, centerY + relativeZ, 3, 0, Math.PI * 2);
        ctx.fill();
    });
} 