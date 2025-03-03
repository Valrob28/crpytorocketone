// Constants
const SPACE_ALTITUDE = 2000;
const SPACE_TRANSITION_RANGE = 2000;
const WIND_CHANGE_INTERVAL = 500;

// Control state
const CONTROLS = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
    boost: false,
    brake: false,
    mouseX: 0,
    mouseY: 0,
    joystickLeft: null,
    joystickRight: null
};

// Initialize Three.js
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7FAFFF); // Minecraft-style sky blue

// Add fog
const fogColor = new THREE.Color(0x7FAFFF);
scene.fog = new THREE.Fog(fogColor, 100, 500);

const camera = new THREE.PerspectiveCamera(85, window.innerWidth / window.innerHeight, 0.1, 10000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap;
document.body.appendChild(renderer.domElement);

// Game state
const GAME_STATE = {
    config: {
        isLocalGame: window.location.protocol === 'file:',
        spaceAltitude: SPACE_ALTITUDE,
        spaceTransitionRange: SPACE_TRANSITION_RANGE,
        hasStarted: false,
        isMuted: false,
        debug: false
    },
    player: {
        ship: null,
        health: 100,
        score: 0,
        isAlive: true,
        position: new THREE.Vector3(0, 36, 90),
        rotation: new THREE.Vector3()
    },
    flight: {
        velocity: new THREE.Vector3(),
        speed: 0,
        minSpeed: 0.1,
        maxSpeed: 2,
        takeoffSpeed: 0.5,
        turnRate: 0.02,
        pitchRate: 0.02,
        rollRate: 0.02
    },
    camera: {
        isThirdPerson: true,
        sensitivity: 0.002,
        lastMouseMoveTime: 0,
        offset: new THREE.Vector3(0, 2, 10),
        cockpitOffset: new THREE.Vector3(0, 1.0, -0.6)
    },
    environment: {
        ground: null,
        runway: null,
        hangars: [],
        tower: null,
        windsock: {
            group: null,
            segments: [],
            wind: {
                speed: 0.2,
                direction: 0,
                changeTimer: 0,
                changeInterval: WIND_CHANGE_INTERVAL
            }
        }
    },
    audio: {
        context: null,
        shoot: null,
        explosion: null,
        engine: {
            oscillator: null,
            gainNode: null
        },
        atc: null
    },
    multiplayer: {
        localPlaneId: null,
        otherPlayers: new Map()
    },
    metrics: {
        fps: 0,
        frameCount: 0,
        lastTime: 0,
        metricsVisible: false,
        deltaTime: 1/60
    }
};

// Window resize handler
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.render(scene, camera);
}
window.addEventListener('resize', onWindowResize);

// Utility functions
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Audio functions
function createShootSound() {
    const duration = 0.15;
    const audioCtx = GAME_STATE.audio.context;
    
    const shootBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * duration, audioCtx.sampleRate);
    const channelData = shootBuffer.getChannelData(0);
    
    if (isMobileDevice()) {
        for (let i = 0; i < shootBuffer.length; i++) {
            const t = i / audioCtx.sampleRate;
            const baseFreq = 30;
            const amplitude = Math.exp(-1 * t);
            const noise = (Math.random() * 2 - 1) * Math.exp(-5 * t);
            
            channelData[i] = amplitude * (
                Math.sin(2 * Math.PI * baseFreq * t) +
                1.5 * Math.sin(4 * Math.PI * baseFreq * t) +
                1.25 * Math.sin(8 * Math.PI * baseFreq * t) +
                1.5 * noise
            );
        }
    } else {
        for (let i = 0; i < shootBuffer.length; i++) {
            const t = i / audioCtx.sampleRate;
            const baseFreq = 50;
            const amplitude = Math.exp(-10 * t);
            channelData[i] = amplitude * (
                Math.sin(2 * Math.PI * baseFreq * t) +
                0.7 * Math.sin(4 * Math.PI * baseFreq * t) +
                0.5 * Math.sin(6 * Math.PI * baseFreq * t) +
                0.3 * Math.sin(8 * Math.PI * baseFreq * t)
            );
        }
    }
    
    GAME_STATE.audio.shoot = shootBuffer;
}

function playShootSound() {
    if (GAME_STATE.config.isMuted) return;
    
    const audioCtx = GAME_STATE.audio.context;
    const source = audioCtx.createBufferSource();
    source.buffer = GAME_STATE.audio.shoot;
    
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = isMobileDevice() ? 0.5 : 1.0;
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;
    
    const compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.value = -50;
    compressor.knee.value = 40;
    compressor.ratio.value = 12;
    compressor.attack.value = 0;
    compressor.release.value = 0.25;
    
    source.connect(gainNode);
    gainNode.connect(filter);
    filter.connect(compressor);
    compressor.connect(audioCtx.destination);
    
    source.start();
}

function initAudioSystem() {
    try {
        GAME_STATE.audio.context = new (window.AudioContext || window.webkitAudioContext)();
        GAME_STATE.audio.gainControl = GAME_STATE.audio.context.createGain();
        GAME_STATE.audio.gainControl.connect(GAME_STATE.audio.context.destination);
        console.log('Système audio initialisé avec succès');
    } catch (error) {
        console.error('Erreur lors de l\'initialisation du système audio:', error);
    }
}

// Player creation
function createPlayerPlane() {
    const playerGroup = new THREE.Group();
    
    // Materials
    const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });
    const wingMaterial = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });
    const trimMaterial = new THREE.MeshPhongMaterial({ color: 0x2244CC });
    const windowMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x87CEEB,
        transparent: true,
        opacity: 0.5
    });
    const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });

    // Main body (fuselage)
    const bodyGeometry = new THREE.BoxGeometry(0.8, 0.8, 4);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    playerGroup.add(body);

    // Nose
    const noseGeometry = new THREE.BoxGeometry(0.6, 0.6, 0.8);
    const nose = new THREE.Mesh(noseGeometry, bodyMaterial);
    nose.position.z = -2.2;
    nose.position.y = -0.1;
    playerGroup.add(nose);

    // Wings
    const wingGeometry = new THREE.BoxGeometry(7, 0.1, 1.2);
    const wings = new THREE.Mesh(wingGeometry, wingMaterial);
    wings.position.y = 0.3;
    playerGroup.add(wings);

    // Tail wings
    const tailWingGeometry = new THREE.BoxGeometry(2.2, 0.1, 0.8);
    const tailWing = new THREE.Mesh(tailWingGeometry, wingMaterial);
    tailWing.position.z = 1.8;
    tailWing.position.y = 0.2;
    playerGroup.add(tailWing);

    // Vertical stabilizer
    const stabilizerGeometry = new THREE.BoxGeometry(0.1, 0.8, 1.2);
    const stabilizer = new THREE.Mesh(stabilizerGeometry, wingMaterial);
    stabilizer.position.z = 1.8;
    stabilizer.position.y = 0.5;
    playerGroup.add(stabilizer);

    // Windows (cockpit)
    const windowGeometry = new THREE.BoxGeometry(0.82, 0.82, 1.2);
    const windows = new THREE.Mesh(windowGeometry, windowMaterial);
    windows.position.z = -0.8;
    windows.position.y = 0.1;
    playerGroup.add(windows);

    // Landing gear
    const wheelGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 8);
    
    // Main landing gear
    const leftWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    leftWheel.rotation.z = Math.PI / 2;
    leftWheel.position.set(-1, -0.6, 0);
    playerGroup.add(leftWheel);
    
    const rightWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    rightWheel.rotation.z = Math.PI / 2;
    rightWheel.position.set(1, -0.6, 0);
    playerGroup.add(rightWheel);
    
    // Nose wheel
    const noseWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    noseWheel.rotation.z = Math.PI / 2;
    noseWheel.position.set(0, -0.6, -1.5);
    playerGroup.add(noseWheel);

    // Set initial position
    playerGroup.position.copy(GAME_STATE.player.position);
    
    // Add to scene and store in GAME_STATE
    scene.add(playerGroup);
    GAME_STATE.player.ship = playerGroup;
    
    return playerGroup;
}

// Controls setup
function initControls() {
    // Keyboard controls
    window.addEventListener('keydown', (event) => {
        switch(event.code) {
            case 'KeyW': case 'ArrowUp': CONTROLS.forward = true; break;
            case 'KeyS': case 'ArrowDown': CONTROLS.backward = true; break;
            case 'KeyA': case 'ArrowLeft': CONTROLS.left = true; break;
            case 'KeyD': case 'ArrowRight': CONTROLS.right = true; break;
            case 'Space': CONTROLS.boost = true; break;
            case 'ShiftLeft': case 'ShiftRight': CONTROLS.brake = true; break;
        }
    });

    window.addEventListener('keyup', (event) => {
        switch(event.code) {
            case 'KeyW': case 'ArrowUp': CONTROLS.forward = false; break;
            case 'KeyS': case 'ArrowDown': CONTROLS.backward = false; break;
            case 'KeyA': case 'ArrowLeft': CONTROLS.left = false; break;
            case 'KeyD': case 'ArrowRight': CONTROLS.right = false; break;
            case 'Space': CONTROLS.boost = false; break;
            case 'ShiftLeft': case 'ShiftRight': CONTROLS.brake = false; break;
        }
    });

    // Mouse controls
    window.addEventListener('mousemove', (event) => {
        if (document.pointerLockElement === renderer.domElement) {
            CONTROLS.mouseX += event.movementX * GAME_STATE.camera.sensitivity;
            CONTROLS.mouseY += event.movementY * GAME_STATE.camera.sensitivity;
            GAME_STATE.camera.lastMouseMoveTime = Date.now();
        }
    });

    // Mobile controls (joysticks)
    if (isMobileDevice()) {
        const leftJoystickOptions = {
            zone: document.getElementById('leftJoystick'),
            mode: 'static',
            position: { left: '50px', bottom: '50px' },
            size: 120,
            color: 'white'
        };

        const rightJoystickOptions = {
            zone: document.getElementById('rightJoystick'),
            mode: 'static',
            position: { right: '50px', bottom: '50px' },
            size: 120,
            color: 'white'
        };

        CONTROLS.joystickLeft = nipplejs.create(leftJoystickOptions);
        CONTROLS.joystickRight = nipplejs.create(rightJoystickOptions);

        CONTROLS.joystickLeft.on('move', (event, data) => {
            const force = Math.min(data.force, 1);
            CONTROLS.forward = data.angle.degree < 180;
            CONTROLS.backward = data.angle.degree >= 180;
            CONTROLS.left = data.angle.degree > 90 && data.angle.degree < 270;
            CONTROLS.right = data.angle.degree < 90 || data.angle.degree > 270;
        });

        CONTROLS.joystickLeft.on('end', () => {
            CONTROLS.forward = CONTROLS.backward = CONTROLS.left = CONTROLS.right = false;
        });

        CONTROLS.joystickRight.on('move', (event, data) => {
            CONTROLS.mouseX = (data.angle.degree < 180 ? 1 : -1) * data.force / 50;
            CONTROLS.mouseY = (data.angle.degree > 90 && data.angle.degree < 270 ? 1 : -1) * data.force / 50;
        });

        CONTROLS.joystickRight.on('end', () => {
            CONTROLS.mouseX = CONTROLS.mouseY = 0;
        });
    }
}

// Update player movement
function updatePlayerMovement(deltaTime) {
    const player = GAME_STATE.player.ship;
    if (!player) return;

    // Update rotation
    if (CONTROLS.left) player.rotation.y += GAME_STATE.flight.turnRate * deltaTime;
    if (CONTROLS.right) player.rotation.y -= GAME_STATE.flight.turnRate * deltaTime;
    if (CONTROLS.forward) player.rotation.x -= GAME_STATE.flight.pitchRate * deltaTime;
    if (CONTROLS.backward) player.rotation.x += GAME_STATE.flight.pitchRate * deltaTime;

    // Update speed
    if (CONTROLS.boost) {
        GAME_STATE.flight.speed = Math.min(
            GAME_STATE.flight.speed + 0.1 * deltaTime,
            GAME_STATE.flight.maxSpeed
        );
    } else if (CONTROLS.brake) {
        GAME_STATE.flight.speed = Math.max(
            GAME_STATE.flight.speed - 0.2 * deltaTime,
            GAME_STATE.flight.minSpeed
        );
    }

    // Update position
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(player.quaternion);
    direction.multiplyScalar(GAME_STATE.flight.speed * deltaTime * 60);
    player.position.add(direction);

    // Update camera
    updateCamera();
}

// Update camera position
function updateCamera() {
    if (!GAME_STATE.player.ship) return;

    const offset = GAME_STATE.camera.isThirdPerson ? 
        GAME_STATE.camera.offset : 
        GAME_STATE.camera.cockpitOffset;

    const targetPosition = GAME_STATE.player.ship.position.clone();
    targetPosition.add(offset);
    camera.position.lerp(targetPosition, 0.1);
    camera.lookAt(GAME_STATE.player.ship.position);
}

// Collision detection
function checkCollisions() {
    if (!GAME_STATE.player.ship || !GAME_STATE.player.isAlive) return;

    const playerPosition = GAME_STATE.player.ship.position;
    const playerBoundingBox = new THREE.Box3().setFromObject(GAME_STATE.player.ship);

    // Ground collision
    if (playerPosition.y < 35.5) {
        if (GAME_STATE.flight.speed > GAME_STATE.flight.takeoffSpeed) {
            handleCrash('Collision avec le sol !');
            return;
        } else {
            // Safe landing on runway
            if (Math.abs(playerPosition.x) < 5 && Math.abs(playerPosition.z) < 100) {
                GAME_STATE.flight.speed = 0;
                playerPosition.y = 35.5;
                updateScore(10, 'Atterrissage réussi !');
            } else {
                handleCrash('Atterrissage hors piste !');
                return;
            }
        }
    }

    // Structure collisions
    GAME_STATE.environment.hangars.forEach(hangar => {
        const hangarBoundingBox = new THREE.Box3().setFromObject(hangar);
        if (playerBoundingBox.intersectsBox(hangarBoundingBox)) {
            handleCrash('Collision avec un hangar !');
            return;
        }
    });
}

// Handle crash
function handleCrash(message) {
    if (!GAME_STATE.player.isAlive) return;

    GAME_STATE.player.isAlive = false;
    GAME_STATE.player.health = 0;
    createExplosionEffect(GAME_STATE.player.ship.position.clone());
    updateScore(-50, message);
    
    GAME_STATE.player.ship.visible = false;
    
    setTimeout(() => {
        showGameOver(message);
    }, 2000);
}

// Create explosion effect
function createExplosionEffect(position) {
    const particleCount = 50;
    const particles = new THREE.Group();
    
    for (let i = 0; i < particleCount; i++) {
        const geometry = new THREE.SphereGeometry(0.1, 4, 4);
        const material = new THREE.MeshPhongMaterial({
            color: Math.random() > 0.5 ? 0xff4500 : 0xff8c00,
            emissive: 0xff4500,
            emissiveIntensity: 0.5
        });
        
        const particle = new THREE.Mesh(geometry, material);
        particle.position.copy(position);
        particle.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            Math.random() * 2,
            (Math.random() - 0.5) * 2
        );
        
        particles.add(particle);
    }
    
    scene.add(particles);
    
    let elapsed = 0;
    function animateExplosion() {
        elapsed += GAME_STATE.metrics.deltaTime;
        
        particles.children.forEach(particle => {
            particle.position.add(particle.velocity.clone().multiplyScalar(GAME_STATE.metrics.deltaTime));
            particle.velocity.y -= GAME_STATE.metrics.deltaTime * 9.8;
            particle.material.opacity = 1 - (elapsed / 2);
            particle.material.transparent = true;
            particle.scale.multiplyScalar(0.98);
        });
        
        if (elapsed < 2) {
            requestAnimationFrame(animateExplosion);
        } else {
            scene.remove(particles);
        }
    }
    
    animateExplosion();
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    const currentTime = performance.now();
    GAME_STATE.metrics.deltaTime = (currentTime - GAME_STATE.metrics.lastTime) / 1000;
    GAME_STATE.metrics.lastTime = currentTime;

    if (GAME_STATE.config.hasStarted && GAME_STATE.player.isAlive) {
        updatePlayerMovement(GAME_STATE.metrics.deltaTime);
        checkCollisions();
    }

    renderer.render(scene, camera);
}

// Score system
function initScoreSystem() {
    const scoreOverlay = document.getElementById('scoreOverlay');
    scoreOverlay.innerHTML = 'Score: 0';
}

function updateScore(points, message = '') {
    GAME_STATE.player.score += points;
    
    const scoreOverlay = document.getElementById('scoreOverlay');
    scoreOverlay.innerHTML = `Score: ${GAME_STATE.player.score}`;
    
    if (message) {
        showMessage(message, points > 0 ? '#4CAF50' : '#f44336');
    }
    
    // Score animation
    scoreOverlay.style.transform = 'scale(1.2)';
    setTimeout(() => {
        scoreOverlay.style.transform = 'scale(1)';
    }, 200);
}

function showMessage(message, color = '#ffffff') {
    const messageElement = document.createElement('div');
    messageElement.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: ${color};
        font-family: Arial, sans-serif;
        font-size: 24px;
        font-weight: bold;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
        pointer-events: none;
        transition: opacity 0.5s;
        z-index: 1000;
    `;
    messageElement.textContent = message;
    document.body.appendChild(messageElement);
    
    setTimeout(() => {
        messageElement.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(messageElement);
        }, 500);
    }, 2000);
}

function showGameOver(message) {
    const gameOverElement = document.createElement('div');
    gameOverElement.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 20px 40px;
        border-radius: 10px;
        text-align: center;
        font-family: Arial, sans-serif;
        z-index: 1000;
    `;
    
    gameOverElement.innerHTML = `
        <h2>Game Over</h2>
        <p>${message}</p>
        <p>Score final : ${GAME_STATE.player.score}</p>
        <button onclick="location.reload()" style="
            padding: 10px 20px;
            font-size: 18px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            margin-top: 20px;
        ">Rejouer</button>
    `;
    
    document.body.appendChild(gameOverElement);
}

// Create environment
function createEnvironment() {
    console.log('Création de l\'environnement...');
    
    // Ground
    const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
    const groundMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x3a9d23,  // Vert pour l'herbe
        side: THREE.DoubleSide 
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = Math.PI / 2;
    ground.position.y = 35;
    scene.add(ground);
    GAME_STATE.environment.ground = ground;

    // Runway
    const runwayGeometry = new THREE.PlaneGeometry(10, 200);
    const runwayMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x333333,  // Gris foncé pour l'asphalte
        side: THREE.DoubleSide 
    });
    const runway = new THREE.Mesh(runwayGeometry, runwayMaterial);
    runway.rotation.x = Math.PI / 2;
    runway.position.y = 35.1;  // Légèrement au-dessus du sol
    scene.add(runway);
    GAME_STATE.environment.runway = runway;

    // Runway markings
    const createRunwayMarking = (position) => {
        const markingGeometry = new THREE.PlaneGeometry(0.5, 4);
        const markingMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xFFFFFF,
            side: THREE.DoubleSide 
        });
        const marking = new THREE.Mesh(markingGeometry, markingMaterial);
        marking.rotation.x = Math.PI / 2;
        marking.position.copy(position);
        marking.position.y = 35.15;  // Légèrement au-dessus de la piste
        scene.add(marking);
    };

    // Add runway markings
    for (let z = -90; z <= 90; z += 10) {
        createRunwayMarking(new THREE.Vector3(0, 0, z));
    }

    // Hangars
    const hangarGeometry = new THREE.BoxGeometry(15, 10, 20);
    const hangarMaterial = new THREE.MeshPhongMaterial({ color: 0x666666 });
    
    // Hangar 1 (gauche)
    const hangar1 = new THREE.Mesh(hangarGeometry, hangarMaterial);
    hangar1.position.set(-20, 40, -30);
    scene.add(hangar1);
    GAME_STATE.environment.hangars.push(hangar1);

    // Hangar 2 (droite)
    const hangar2 = new THREE.Mesh(hangarGeometry, hangarMaterial);
    hangar2.position.set(20, 40, -30);
    scene.add(hangar2);
    GAME_STATE.environment.hangars.push(hangar2);

    // Control tower
    const towerBaseGeometry = new THREE.BoxGeometry(8, 20, 8);
    const towerTopGeometry = new THREE.BoxGeometry(10, 5, 10);
    const towerMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 });
    const towerGlassMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x88ccff,
        transparent: true,
        opacity: 0.6
    });

    const towerBase = new THREE.Mesh(towerBaseGeometry, towerMaterial);
    const towerTop = new THREE.Mesh(towerTopGeometry, towerGlassMaterial);
    
    towerBase.position.set(-30, 45, 0);
    towerTop.position.set(-30, 57.5, 0);
    
    scene.add(towerBase);
    scene.add(towerTop);
    
    GAME_STATE.environment.tower = new THREE.Group();
    GAME_STATE.environment.tower.add(towerBase);
    GAME_STATE.environment.tower.add(towerTop);
}

// Initialize game
function initGame() {
    console.log('Initialisation du jeu...');
    
    // Ensure scene is visible
    scene.background = new THREE.Color(0x7FAFFF);
    scene.fog = new THREE.Fog(0x7FAFFF, 100, 500);
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    // Add directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(100, 100, 100);
    scene.add(directionalLight);
    
    // Create environment first
    console.log('Création de l\'environnement...');
    createEnvironment();
    
    console.log('Création de l\'avion...');
    createPlayerPlane();
    
    // Position initiale de l'avion sur la piste
    GAME_STATE.player.ship.position.set(0, 35.5, 80);  // Sur la piste, prêt à décoller
    
    console.log('Initialisation des contrôles...');
    initControls();
    
    console.log('Initialisation du système audio...');
    initAudioSystem();
    
    console.log('Initialisation du système de score...');
    initScoreSystem();
    
    // Set initial camera position behind the plane
    camera.position.set(0, 38, 90);
    camera.lookAt(GAME_STATE.player.ship.position);
    
    console.log('Démarrage de l\'animation...');
    animate();
    
    // Force first render
    renderer.render(scene, camera);
}

// Start game on button click or Enter key
document.getElementById('startButton').addEventListener('click', startGame);
document.addEventListener('keydown', (event) => {
    if (event.code === 'Enter' && !GAME_STATE.config.hasStarted) {
        startGame();
    }
});

function startGame() {
    console.log('Démarrage du jeu...');
    GAME_STATE.config.hasStarted = true;
    document.getElementById('startScreen').style.display = 'none';
    initGame();
}

// Export functions and variables
export {
    scene,
    camera,
    renderer,
    GAME_STATE,
    CONTROLS,
    isMobileDevice,
    createShootSound,
    playShootSound,
    initAudioSystem,
    createPlayerPlane,
    initControls,
    updatePlayerMovement,
    updateCamera,
    animate,
    initGame,
    checkCollisions,
    handleCrash,
    createExplosionEffect,
    updateScore,
    showMessage,
    showGameOver
};