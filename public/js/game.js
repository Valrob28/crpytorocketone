let scene, camera, renderer, ship;
let isGameStarted = false;
let skybox;
let gameMap;

// Configuration de base de Three.js
function initThree() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 20000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // Création du skybox
    createSkybox();

    // Lumière ambiante
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    // Lumière directionnelle (soleil)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(100, 100, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    scene.add(directionalLight);

    // Création de la carte
    gameMap = new GameMap(scene);
    
    // Position initiale de la caméra
    camera.position.set(0, 100, 200);
    camera.lookAt(0, 0, 0);
}

function createSkybox() {
    const loader = new THREE.CubeTextureLoader();
    const texture = loader.load([
        'textures/skybox/px.jpg', // droite
        'textures/skybox/nx.jpg', // gauche
        'textures/skybox/py.jpg', // haut
        'textures/skybox/ny.jpg', // bas
        'textures/skybox/pz.jpg', // devant
        'textures/skybox/nz.jpg'  // derrière
    ]);
    scene.background = texture;
}

function createEnvironment() {
    // Création de l'île principale
    createIsland();
    
    // Création des planètes
    createPlanets();
    
    // Création des bâtiments
    createBuildings();
    
    // Création des pistes d'atterrissage
    createRunways();
    
    // Création de l'océan
    createOcean();
    
    // Création des effets atmosphériques
    createAtmosphericEffects();
}

function createIsland() {
    // Géométrie de l'île avec relief
    const geometry = new THREE.PlaneGeometry(1000, 1000, 128, 128);
    const material = new THREE.MeshPhongMaterial({
        color: 0x3a9d23,
        shininess: 10,
        wireframe: false
    });

    // Création du relief
    const vertices = geometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const z = vertices[i + 2];
        vertices[i + 1] = Math.sin(x * 0.02) * Math.cos(z * 0.02) * 20;
    }

    const island = new THREE.Mesh(geometry, material);
    island.rotation.x = -Math.PI / 2;
    island.receiveShadow = true;
    scene.add(island);

    // Ajout de détails (rochers, végétation)
    addTerrainDetails();
}

function addTerrainDetails() {
    // Ajout de rochers
    const rockGeometry = new THREE.DodecahedronGeometry(5);
    const rockMaterial = new THREE.MeshPhongMaterial({ color: 0x666666 });
    
    for (let i = 0; i < 50; i++) {
        const rock = new THREE.Mesh(rockGeometry, rockMaterial);
        rock.position.set(
            Math.random() * 800 - 400,
            Math.random() * 5,
            Math.random() * 800 - 400
        );
        rock.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        rock.scale.set(
            Math.random() * 0.5 + 0.5,
            Math.random() * 0.5 + 0.5,
            Math.random() * 0.5 + 0.5
        );
        rock.castShadow = true;
        rock.receiveShadow = true;
        scene.add(rock);
    }

    // Ajout d'arbres futuristes
    const treeGeometry = new THREE.CylinderGeometry(0, 4, 20, 4);
    const treeMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff88 });
    
    for (let i = 0; i < 100; i++) {
        const tree = new THREE.Mesh(treeGeometry, treeMaterial);
        tree.position.set(
            Math.random() * 800 - 400,
            10,
            Math.random() * 800 - 400
        );
        tree.castShadow = true;
        scene.add(tree);
    }
}

function createBuildings() {
    const cityGeometry = new THREE.BoxGeometry(20, 100, 20);
    const cityMaterial = new THREE.MeshPhongMaterial({
        color: 0x3498db,
        shininess: 100,
        transparent: true,
        opacity: 0.8
    });

    // Création d'une ville futuriste
    for (let i = 0; i < 20; i++) {
        const building = new THREE.Mesh(cityGeometry, cityMaterial);
        building.position.set(
            Math.random() * 400 - 200,
            50,
            Math.random() * 400 - 200
        );
        building.scale.y = Math.random() * 2 + 0.5;
        building.castShadow = true;
        building.receiveShadow = true;
        scene.add(building);

        // Ajout de lumières aux fenêtres
        addBuildingLights(building);
    }
}

function addBuildingLights(building) {
    const light = new THREE.PointLight(0xffff00, 1, 20);
    light.position.set(
        building.position.x,
        building.position.y + 50,
        building.position.z
    );
    scene.add(light);
}

function createRunways() {
    // Création des pistes d'atterrissage
    const runwayGeometry = new THREE.PlaneGeometry(200, 30);
    const runwayMaterial = new THREE.MeshPhongMaterial({
        color: 0x333333,
        shininess: 30
    });

    // Création de plusieurs pistes
    const runwayPositions = [
        { x: 0, z: 0, rotation: 0 },
        { x: 200, z: 200, rotation: Math.PI / 4 },
        { x: -200, z: -200, rotation: -Math.PI / 4 }
    ];

    runwayPositions.forEach(pos => {
        const runway = new THREE.Mesh(runwayGeometry, runwayMaterial);
        runway.rotation.x = -Math.PI / 2;
        runway.rotation.z = pos.rotation;
        runway.position.set(pos.x, 0.1, pos.z);
        runway.receiveShadow = true;
        scene.add(runway);

        // Ajout des marquages
        addRunwayMarkings(runway);
    });
}

function addRunwayMarkings(runway) {
    const markingGeometry = new THREE.PlaneGeometry(10, 2);
    const markingMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });

    for (let i = -90; i <= 90; i += 20) {
        const marking = new THREE.Mesh(markingGeometry, markingMaterial);
        marking.position.set(i, 0.2, 0);
        marking.rotation.x = -Math.PI / 2;
        runway.add(marking);
    }
}

function createPlanets() {
    const planetColors = [0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff, 0x44ffff];
    const planetTextures = [
        'textures/planets/mars.jpg',
        'textures/planets/venus.jpg',
        'textures/planets/mercury.jpg'
    ];

    for (let i = 0; i < 10; i++) {
        const radius = Math.random() * 100 + 50;
        const distance = Math.random() * 8000 + 2000;
        const angle = (i / 10) * Math.PI * 2;
        
        const planetGeometry = new THREE.SphereGeometry(radius, 32, 32);
        const planetMaterial = new THREE.MeshPhongMaterial({ 
            color: planetColors[i % planetColors.length],
            shininess: 30
        });
        const planet = new THREE.Mesh(planetGeometry, planetMaterial);
        
        planet.position.x = Math.cos(angle) * distance;
        planet.position.z = Math.sin(angle) * distance;
        planet.position.y = Math.random() * 2000;
        
        // Ajout d'anneaux pour certaines planètes
        if (Math.random() > 0.5) {
            addPlanetRings(planet);
        }

        scene.add(planet);

        // Animation de rotation
        const rotationSpeed = Math.random() * 0.002;
        planet.userData = { rotationSpeed };
    }
}

function addPlanetRings(planet) {
    const ringGeometry = new THREE.RingGeometry(
        planet.geometry.parameters.radius * 1.5,
        planet.geometry.parameters.radius * 2,
        32
    );
    const ringMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    planet.add(ring);
}

function createOcean() {
    const oceanGeometry = new THREE.PlaneGeometry(10000, 10000, 128, 128);
    const oceanMaterial = new THREE.MeshPhongMaterial({
        color: 0x006994,
        transparent: true,
        opacity: 0.8,
        shininess: 100
    });
    
    const ocean = new THREE.Mesh(oceanGeometry, oceanMaterial);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = -10;
    ocean.receiveShadow = true;
    scene.add(ocean);
}

function createAtmosphericEffects() {
    // Brouillard
    scene.fog = new THREE.FogExp2(0x88ccee, 0.0003);
}

function createStarship() {
    // Création d'un vaisseau spatial plus détaillé
    const shipGeometry = new THREE.Group();

    // Corps principal
    const bodyGeometry = new THREE.ConeGeometry(5, 20, 8);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x999999,
        shininess: 100
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.x = Math.PI / 2;
    shipGeometry.add(body);

    // Ailes
    const wingGeometry = new THREE.BoxGeometry(15, 2, 5);
    const wingMaterial = new THREE.MeshPhongMaterial({ color: 0x666666 });
    const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
    leftWing.position.set(-7.5, 0, 5);
    const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
    rightWing.position.set(7.5, 0, 5);
    shipGeometry.add(leftWing);
    shipGeometry.add(rightWing);

    // Réacteurs
    const engineGeometry = new THREE.CylinderGeometry(1, 1, 3, 8);
    const engineMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
    const leftEngine = new THREE.Mesh(engineGeometry, engineMaterial);
    leftEngine.position.set(-3, 0, 8);
    const rightEngine = new THREE.Mesh(engineGeometry, engineMaterial);
    rightEngine.position.set(3, 0, 8);
    shipGeometry.add(leftEngine);
    shipGeometry.add(rightEngine);

    // Cockpit
    const cockpitGeometry = new THREE.SphereGeometry(3, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const cockpitMaterial = new THREE.MeshPhongMaterial({
        color: 0x3498db,
        transparent: true,
        opacity: 0.7,
        shininess: 100
    });
    const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
    cockpit.position.set(0, 2, -5);
    cockpit.rotation.x = Math.PI;
    shipGeometry.add(cockpit);

    ship = shipGeometry;
    ship.castShadow = true;
    scene.add(ship);
    
    // Position initiale sur la piste de décollage
    resetPosition();
    
    // Attacher la caméra au vaisseau
    ship.add(camera);
    camera.position.set(0, 10, -30);
    camera.lookAt(0, 0, 30);
}

function animate() {
    requestAnimationFrame(animate);
    
    if (isGameStarted) {
        // Mise à jour des contrôles et de la physique
        updateControls();
        
        // Animation des planètes
        scene.traverse(object => {
            if (object.userData && object.userData.rotationSpeed) {
                object.rotation.y += object.userData.rotationSpeed;
            }
        });

        // Mise à jour du réseau et des autres joueurs
        updateGameLoop();

        // Mise à jour du HUD
        updateHUD();

        // Envoi des mises à jour au serveur
        if (socket) {
            socket.emit('updatePosition', {
                position: ship.position.clone(),
                rotation: ship.rotation.clone(),
                velocity: velocity.clone()
            });
        }
    }
    
    renderer.render(scene, camera);
}

function updateHUD() {
    // Mise à jour des informations du HUD
    const speed = velocity.length() * 10;
    document.getElementById('speed').textContent = Math.round(speed);
    document.getElementById('altitude').textContent = Math.round(ship.position.y);
    document.getElementById('playerCount').textContent = otherPlayers.size + 1;
    
    // Mise à jour de la mini-carte
    updateMinimap();
    
    // Mise à jour du compteur de vitesse
    updateSpeedometer(speed);
}

function updateSpeedometer(speed) {
    const canvas = document.getElementById('speedometer').querySelector('canvas');
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
    
    // Dessin des graduations
    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const startRadius = radius - 5;
        const endRadius = radius;
        
        ctx.beginPath();
        ctx.moveTo(
            centerX + Math.cos(angle) * startRadius,
            centerY + Math.sin(angle) * startRadius
        );
        ctx.lineTo(
            centerX + Math.cos(angle) * endRadius,
            centerY + Math.sin(angle) * endRadius
        );
        ctx.stroke();
    }
    
    // Dessin de l'aiguille
    const maxSpeed = 1000;
    const angle = ((speed / maxSpeed) * Math.PI * 1.5) - Math.PI * 0.75;
    
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
        centerX + Math.cos(angle) * radius * 0.8,
        centerY + Math.sin(angle) * radius * 0.8
    );
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Affichage numérique
    ctx.fillStyle = '#30f2f2';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(speed)} km/h`, centerX, centerY + 20);
}

function startGame() {
    const pseudo = document.getElementById('pseudoInput').value;
    if (pseudo.trim() === '') {
        alert('Veuillez entrer un pseudo');
        return;
    }

    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('minimap').classList.remove('hidden');
    document.getElementById('speedometer').classList.remove('hidden');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('crosshair').classList.remove('hidden');
    
    initThree();
    createStarship();
    initControls();
    initNetwork(pseudo);
    
    isGameStarted = true;
    animate();
    startBackgroundMusic();
}

// Gestion du redimensionnement de la fenêtre
window.addEventListener('resize', () => {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
}); 