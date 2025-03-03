class GameMap {
    constructor(scene) {
        this.scene = scene;
        this.createBasicEnvironment();
    }

    createBasicEnvironment() {
        // Création d'un sol simple
        const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
        const groundMaterial = new THREE.MeshPhongMaterial({
            color: 0x3a9d23,
            shininess: 10
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Ajout de quelques bâtiments simples
        for (let i = 0; i < 10; i++) {
            const buildingGeometry = new THREE.BoxGeometry(20, 100, 20);
            const buildingMaterial = new THREE.MeshPhongMaterial({
                color: 0x3498db,
                shininess: 100
            });
            const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
            building.position.set(
                Math.random() * 400 - 200,
                50,
                Math.random() * 400 - 200
            );
            building.castShadow = true;
            building.receiveShadow = true;
            this.scene.add(building);
        }
    }
} 