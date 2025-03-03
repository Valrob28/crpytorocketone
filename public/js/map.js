class GameMap {
    constructor(scene) {
        this.scene = scene;
        this.buildings = [];
        this.createLaunchPad();
        this.createBuildings();
        this.createTerrain();
    }

    createLaunchPad() {
        // Création de la piste de décollage principale
        const padGeometry = new THREE.CylinderGeometry(20, 20, 2, 32);
        const padMaterial = new THREE.MeshPhongMaterial({
            color: 0x444444,
            metalness: 0.8,
            roughness: 0.2
        });
        this.launchPad = new THREE.Mesh(padGeometry, padMaterial);
        this.launchPad.position.set(0, 1, 0);
        this.launchPad.receiveShadow = true;
        this.scene.add(this.launchPad);

        // Lumières de la piste
        const lights = 8;
        for (let i = 0; i < lights; i++) {
            const angle = (i / lights) * Math.PI * 2;
            const light = new THREE.PointLight(0x30f2f2, 0.5, 30);
            light.position.set(
                Math.cos(angle) * 18,
                2,
                Math.sin(angle) * 18
            );
            this.launchPad.add(light);

            // Marqueur visuel pour la lumière
            const markerGeometry = new THREE.SphereGeometry(0.5, 8, 8);
            const markerMaterial = new THREE.MeshPhongMaterial({
                color: 0x30f2f2,
                emissive: 0x30f2f2,
                emissiveIntensity: 0.5
            });
            const marker = new THREE.Mesh(markerGeometry, markerMaterial);
            marker.position.copy(light.position);
            this.launchPad.add(marker);
        }
    }

    createBuildings() {
        const buildingCount = 50;
        const mapSize = 1000;
        const minDistance = 100; // Distance minimale du centre

        for (let i = 0; i < buildingCount; i++) {
            // Position aléatoire
            let x, z;
            do {
                x = (Math.random() - 0.5) * mapSize;
                z = (Math.random() - 0.5) * mapSize;
            } while (Math.sqrt(x * x + z * z) < minDistance);

            const height = Math.random() * 100 + 50;
            const width = Math.random() * 20 + 10;
            const depth = Math.random() * 20 + 10;

            const building = this.createBuilding(width, height, depth);
            building.position.set(x, height / 2, z);
            building.rotation.y = Math.random() * Math.PI * 2;

            this.buildings.push(building);
            this.scene.add(building);
        }
    }

    createBuilding(width, height, depth) {
        const building = new THREE.Group();

        // Corps principal
        const bodyGeometry = new THREE.BoxGeometry(width, height, depth);
        const bodyMaterial = new THREE.MeshPhongMaterial({
            color: 0x3498db,
            metalness: 0.8,
            roughness: 0.2,
            transparent: true,
            opacity: 0.9
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        building.add(body);

        // Fenêtres
        const windowSize = 2;
        const windowSpacing = 5;
        const windowsPerRow = Math.floor(width / windowSpacing);
        const windowRows = Math.floor(height / windowSpacing);

        const windowGeometry = new THREE.BoxGeometry(windowSize, windowSize, 0.1);
        const windowMaterial = new THREE.MeshPhongMaterial({
            color: 0xffff00,
            emissive: 0xffff00,
            emissiveIntensity: 0.5
        });

        for (let row = 0; row < windowRows; row++) {
            for (let col = 0; col < windowsPerRow; col++) {
                if (Math.random() > 0.3) { // 70% de chances d'avoir une fenêtre
                    const window = new THREE.Mesh(windowGeometry, windowMaterial);
                    window.position.set(
                        (col - windowsPerRow / 2) * windowSpacing,
                        (row - windowRows / 2) * windowSpacing,
                        depth / 2 + 0.1
                    );
                    building.add(window);
                }
            }
        }

        // Antennes sur le toit
        if (Math.random() > 0.5) {
            const antennaGeometry = new THREE.CylinderGeometry(0.5, 0.5, 20, 8);
            const antennaMaterial = new THREE.MeshPhongMaterial({ color: 0x666666 });
            const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
            antenna.position.y = height / 2 + 10;
            building.add(antenna);
        }

        building.castShadow = true;
        building.receiveShadow = true;
        return building;
    }

    createTerrain() {
        // Création du terrain avec relief
        const size = 2000;
        const resolution = 128;
        const geometry = new THREE.PlaneGeometry(size, size, resolution, resolution);
        
        // Génération du bruit de Perlin pour le relief
        const vertices = geometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i] / 100;
            const z = vertices[i + 2] / 100;
            vertices[i + 1] = this.perlinNoise(x, z) * 20;
        }

        const material = new THREE.MeshPhongMaterial({
            color: 0x3a9d23,
            shininess: 10,
            wireframe: false
        });

        const terrain = new THREE.Mesh(geometry, material);
        terrain.rotation.x = -Math.PI / 2;
        terrain.receiveShadow = true;
        this.scene.add(terrain);
    }

    perlinNoise(x, z) {
        // Implémentation simple du bruit de Perlin
        const X = Math.floor(x) & 255;
        const Z = Math.floor(z) & 255;
        x -= Math.floor(x);
        z -= Math.floor(z);
        const u = this.fade(x);
        const v = this.fade(z);
        
        const A = this.p[X] + Z;
        const B = this.p[X + 1] + Z;
        
        return this.lerp(v,
            this.lerp(u, this.grad(this.p[A], x, z), 
                        this.grad(this.p[B], x - 1, z)),
            this.lerp(u, this.grad(this.p[A + 1], x, z - 1),
                        this.grad(this.p[B + 1], x - 1, z - 1)));
    }

    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    lerp(t, a, b) {
        return a + t * (b - a);
    }

    grad(hash, x, z) {
        const h = hash & 15;
        const grad = 1 + (h & 7);
        return ((h & 8) ? -grad : grad) * x + ((h & 4) ? -grad : grad) * z;
    }

    // Table de permutation pour le bruit de Perlin
    p = new Array(512);
    constructor() {
        // Initialisation de la table de permutation
        const permutation = new Array(256).fill(0).map((_, i) => i);
        for (let i = 255; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [permutation[i], permutation[j]] = [permutation[j], permutation[i]];
        }
        for (let i = 0; i < 512; i++) {
            this.p[i] = permutation[i & 255];
        }
    }

    checkCollisions(position, radius) {
        // Vérification des collisions avec les bâtiments
        for (const building of this.buildings) {
            const distance = position.distanceTo(building.position);
            const minDistance = radius + Math.max(building.scale.x, building.scale.z) * 0.5;
            
            if (distance < minDistance) {
                return true;
            }
        }
        return false;
    }

    getTerrainHeight(x, z) {
        // Retourne la hauteur du terrain à une position donnée
        return this.perlinNoise(x / 100, z / 100) * 20;
    }
} 