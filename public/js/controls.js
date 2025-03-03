let velocity = new THREE.Vector3();
let acceleration = new THREE.Vector3();
let rotation = new THREE.Euler();
let rotationVelocity = new THREE.Vector3();
let isLanded = true;
let enginePower = 0;
let liftForce = new THREE.Vector3();

const THRUST_POWER = 0.5;
const MAX_SPEED = 100;
const ROTATION_SPEED = 0.03;
const DRAG_COEFFICIENT = 0.995;
const LIFT_COEFFICIENT = 0.02;
const GRAVITY = -0.1;
const AIR_DENSITY = 0.001;
const WING_AREA = 10;
const LANDING_SPEED_THRESHOLD = 2;
const LANDING_ANGLE_THRESHOLD = 0.1;

const keys = {
    KeyW: false,
    KeyS: false,
    KeyA: false,
    KeyD: false,
    Space: false,
    ShiftLeft: false,
    KeyR: false
};

let mousePosition = { x: 0, y: 0 };
let isMouseDown = false;
let zoomLevel = 1;

function initControls() {
    // Initialisation des contrôles tactiles si sur mobile
    if (isMobile()) {
        initJoysticks();
    }

    // Gestion du clavier
    document.addEventListener('keydown', (e) => {
        if (keys.hasOwnProperty(e.code)) {
            keys[e.code] = true;
            e.preventDefault();
        }
    });

    document.addEventListener('keyup', (e) => {
        if (keys.hasOwnProperty(e.code)) {
            keys[e.code] = false;
            e.preventDefault();
        }
    });

    // Gestion de la souris
    document.addEventListener('mousemove', (e) => {
        mousePosition.x = (e.clientX / window.innerWidth) * 2 - 1;
        mousePosition.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    document.addEventListener('mousedown', (e) => {
        if (e.button === 0) { // Clic gauche
            isMouseDown = true;
            fireMissile();
        }
    });

    document.addEventListener('mouseup', (e) => {
        if (e.button === 0) {
            isMouseDown = false;
        }
    });

    // Gestion du zoom
    document.addEventListener('wheel', (e) => {
        zoomLevel = Math.max(0.5, Math.min(2, zoomLevel + e.deltaY * -0.001));
        updateCameraZoom();
    });

    // Gestion des événements tactiles pour le tir
    if (isMobile()) {
        document.addEventListener('touchstart', handleTouchStart);
        document.addEventListener('touchend', handleTouchEnd);
    }

    // Masquer le curseur en mode jeu
    document.body.style.cursor = 'none';
    
    // Afficher les contrôles
    document.getElementById('controls').classList.remove('hidden');
    document.getElementById('crosshair').classList.remove('hidden');
}

function handleTouchStart(e) {
    // Vérifier si le touch n'est pas sur un joystick
    const touch = e.touches[0];
    const touchX = touch.clientX;
    const touchY = touch.clientY;

    if (!isOnJoystick(touchX, touchY)) {
        isMouseDown = true;
        fireMissile();
    }
}

function handleTouchEnd(e) {
    if (e.touches.length === 0) {
        isMouseDown = false;
    }
}

function isOnJoystick(x, y) {
    // Vérifier si les coordonnées sont dans la zone des joysticks
    if (!rotationJoystick || !thrustJoystick) return false;

    const checkJoystickBounds = (joystick, x, y) => {
        const rect = joystick.container.getBoundingClientRect();
        return x >= rect.left && x <= rect.right && 
               y >= rect.top && y <= rect.bottom;
    };

    return checkJoystickBounds(rotationJoystick, x, y) || 
           checkJoystickBounds(thrustJoystick, x, y);
}

function updateControls() {
    // Mise à jour des contrôles du joystick si sur mobile
    if (isMobile()) {
        updateJoystickControls();
    }

    // Gestion de la poussée
    if (keys.Space) {
        applyThrust();
    } else {
        enginePower = 0;
    }

    // Rotation du vaisseau
    if (keys.KeyD) rotateShip('right');
    if (keys.KeyA) rotateShip('left');
    if (keys.KeyW) rotateShip('up');
    if (keys.KeyS) rotateShip('down');

    // Mode précision
    if (keys.ShiftLeft) {
        enablePrecisionMode();
    } else {
        disablePrecisionMode();
    }

    // Réinitialisation
    if (keys.KeyR) {
        resetPosition();
        soundManager.playWarp();
    }

    // Mise à jour de la physique
    updateShipPhysics();

    // Mise à jour de la caméra
    updateCamera();
}

function rotateShip(direction) {
    const rotationSpeed = keys.ShiftLeft ? 0.01 : 0.03;
    
    switch(direction) {
        case 'right':
            ship.rotation.y -= rotationSpeed;
            break;
        case 'left':
            ship.rotation.y += rotationSpeed;
            break;
        case 'up':
            ship.rotation.x = Math.max(-Math.PI / 3, ship.rotation.x - rotationSpeed);
            break;
        case 'down':
            ship.rotation.x = Math.min(Math.PI / 3, ship.rotation.x + rotationSpeed);
            break;
    }
}

function applyThrust() {
    if (isLanded) {
        // Décollage
        enginePower = 1;
        isLanded = false;
        soundManager.play('engineBoost', { volume: 0.5 });
    } else {
        // Vol normal
        enginePower = keys.ShiftLeft ? 0.5 : 1;
    }
}

function enablePrecisionMode() {
    if (!ship.userData.precisionMode) {
        ship.userData.precisionMode = true;
        soundManager.playAlert();
    }
}

function disablePrecisionMode() {
    ship.userData.precisionMode = false;
}

function updateCamera() {
    if (!camera || !ship) return;

    // Position de base de la caméra
    const cameraOffset = new THREE.Vector3(0, 10, 30);
    cameraOffset.applyQuaternion(ship.quaternion);
    
    // Ajout d'un léger décalage basé sur la vitesse
    const speedOffset = velocity.clone().multiplyScalar(2);
    cameraOffset.add(speedOffset);

    // Application du zoom
    cameraOffset.multiplyScalar(zoomLevel);

    // Position finale de la caméra
    const targetPosition = ship.position.clone().add(cameraOffset);
    camera.position.lerp(targetPosition, 0.1);
    camera.lookAt(ship.position);
}

function updateCameraZoom() {
    if (!camera) return;
    camera.updateProjectionMatrix();
}

function fireMissile() {
    if (!ship) return;

    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(ship.quaternion);

    const position = ship.position.clone();
    position.add(direction.multiplyScalar(10));

    createMissile(position, direction);
    soundManager.play('missile', { volume: 0.3 });

    // Envoi de l'information de tir au serveur
    socket.emit('fireMissile', {
        position: position,
        direction: direction
    });
}

function resetPosition() {
    if (!ship) return;
    
    ship.position.set(0, 2, 0); // Position sur la piste de décollage
    ship.rotation.set(0, 0, 0);
    velocity.set(0, 0, 0);
    angularVelocity.set(0, 0, 0);
    enginePower = 0;
    isLanded = true;
}

function updateShipPhysics() {
    if (!ship) return;

    // Calcul de la portance
    const speed = velocity.length();
    const direction = new THREE.Vector3(0, 1, 0);
    direction.applyQuaternion(ship.quaternion);
    
    // Force de portance (Lift)
    const angle = Math.abs(ship.rotation.z);
    const lift = 0.5 * AIR_DENSITY * speed * speed * WING_AREA * LIFT_COEFFICIENT * Math.sin(angle * 2);
    liftForce.copy(direction).multiplyScalar(lift);

    // Force de traînée (Drag)
    const drag = velocity.clone().multiplyScalar(-AIR_DENSITY * speed);

    // Force de gravité
    const gravity = new THREE.Vector3(0, GRAVITY, 0);

    // Force de poussée (Thrust)
    const thrust = new THREE.Vector3(0, 0, -1);
    thrust.applyQuaternion(ship.quaternion);
    thrust.multiplyScalar(enginePower * THRUST_POWER);

    // Application des forces
    acceleration.set(0, 0, 0);
    acceleration.add(liftForce);
    acceleration.add(drag);
    acceleration.add(gravity);
    acceleration.add(thrust);

    // Mise à jour de la vitesse
    velocity.add(acceleration);

    // Amortissement
    velocity.multiplyScalar(DRAG_COEFFICIENT);

    // Limitation de la vitesse
    if (velocity.length() > MAX_SPEED) {
        velocity.normalize().multiplyScalar(MAX_SPEED);
    }

    // Mise à jour de la position
    if (!isLanded || enginePower > 0) {
        ship.position.add(velocity);
    }

    // Gestion du décollage et de l'atterrissage
    const terrainHeight = gameMap.getTerrainHeight(ship.position.x, ship.position.z);
    if (ship.position.y <= terrainHeight + 2) {
        if (velocity.length() < LANDING_SPEED_THRESHOLD &&
            Math.abs(ship.rotation.x) < LANDING_ANGLE_THRESHOLD &&
            Math.abs(ship.rotation.z) < LANDING_ANGLE_THRESHOLD) {
            // Atterrissage en douceur
            ship.position.y = terrainHeight + 2;
            if (!isLanded) {
                soundManager.play('hit', { volume: 0.3 });
            }
            isLanded = true;
            velocity.set(0, 0, 0);
        } else {
            // Crash
            soundManager.play('explosion');
            resetPosition();
        }
    } else {
        isLanded = false;
    }

    // Mise à jour des effets visuels
    updateEngineEffects();
}

function updateEngineEffects() {
    if (enginePower > 0) {
        createThrustEffect();
        soundManager.updateEngineSound(true, enginePower);
    } else {
        soundManager.updateEngineSound(false, 0);
    }
}

function createThrustEffect() {
    // Création de particules pour l'effet des réacteurs
    const particleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const particleMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff6600,
        transparent: true,
        opacity: 0.8
    });
    const particle = new THREE.Mesh(particleGeometry, particleMaterial);
    
    // Position derrière le vaisseau
    const offset = new THREE.Vector3(0, 0, 2);
    offset.applyQuaternion(ship.quaternion);
    particle.position.copy(ship.position).add(offset);
    
    scene.add(particle);
    
    // Animation de la particule
    const lifeTime = 1000;
    const startTime = Date.now();
    
    function animateParticle() {
        const age = Date.now() - startTime;
        if (age > lifeTime) {
            scene.remove(particle);
            return;
        }
        
        const scale = 1 - (age / lifeTime);
        particle.scale.set(scale, scale, scale);
        particle.material.opacity = scale;
        
        requestAnimationFrame(animateParticle);
    }
    
    animateParticle();
}

function updateHUD() {
    // Mise à jour des informations du HUD
    document.getElementById('speed').textContent = Math.round(velocity.length() * 10);
    document.getElementById('altitude').textContent = Math.round(ship.position.y);
    document.getElementById('playerCount').textContent = otherPlayers.size + 1;
    
    // Mise à jour du compteur de vitesse
    updateSpeedometer();
}

function updateSpeedometer() {
    const canvas = document.getElementById('speedometer');
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = canvas.width / 2 - 10;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Dessin du cercle de fond
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#30f2f2';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Dessin de l'indicateur de vitesse
    const speed = velocity.length();
    const angle = (speed / MAX_SPEED) * Math.PI * 1.5 - Math.PI * 0.75;
    
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
        centerX + Math.cos(angle) * radius,
        centerY + Math.sin(angle) * radius
    );
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 3;
    ctx.stroke();
}

// Demander le verrouillage du pointeur au clic
document.addEventListener('click', () => {
    if (isGameStarted && document.pointerLockElement !== document.body) {
        document.body.requestPointerLock();
    }
}); 