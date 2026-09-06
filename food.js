// Snake 3D Ultra - Procedural 3D Food & Collectibles Engine
// Modela alimentos 3D de alta fidelidad con núcleos de plasma, anillos orbitales,
// luces dinámicas que iluminan el suelo y animaciones de levitación.

class FoodManager {
    constructor(scene, gridSize, arenaHalf) {
        this.scene = scene;
        this.gridSize = gridSize;
        this.arenaHalf = arenaHalf;
        this.activeFood = null;
        this.specialFood = null;
        this.specialTimer = 0;
        this.themeColor = 0xff0055;
    }

    // Crea el objeto 3D del alimento normal (Plasma Core con anillos orbitales)
    createNormalFoodMesh(color = 0xff0055) {
        const group = new THREE.Group();

        // 1. Núcleo de plasma poliédrico reflectivo
        const coreGeo = new THREE.IcosahedronGeometry(0.48, 1);
        const coreMat = new THREE.MeshPhysicalMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 1.0,
            roughness: 0.15,
            metalness: 0.8,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1
        });
        const core = new THREE.Mesh(coreGeo, coreMat);
        core.castShadow = true;
        group.add(core);

        // 2. Anillo orbital holográfico 1
        const ringGeo1 = new THREE.TorusGeometry(0.72, 0.04, 8, 32);
        const ringMat1 = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending
        });
        const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
        ring1.rotation.x = Math.PI / 3;
        group.add(ring1);

        // 3. Anillo orbital holográfico 2
        const ringGeo2 = new THREE.TorusGeometry(0.85, 0.03, 8, 32);
        const ringMat2 = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending
        });
        const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
        ring2.rotation.y = Math.PI / 4;
        group.add(ring2);

        // 4. Luz puntual dinámica para iluminar el suelo y la serpiente
        const light = new THREE.PointLight(color, 1.8, 5.0);
        light.position.set(0, 0.2, 0);
        group.add(light);

        // Referencias para animación
        group.userData = {
            core: core,
            ring1: ring1,
            ring2: ring2,
            light: light,
            type: 'normal',
            points: 10,
            baseColor: color,
            timeOffset: Math.random() * 10
        };

        return group;
    }

    // Crea el objeto 3D del alimento especial místico (Golden / Power-up)
    createSpecialFoodMesh(type = 'gold') {
        const group = new THREE.Group();
        let mainColor = 0xffd700;
        let points = 50;

        if (type === 'speed') {
            mainColor = 0x00f3ff;
            points = 25;
        } else if (type === 'ghost') {
            mainColor = 0xbd00ff;
            points = 35;
        }

        // Núcleo octaedro o cristalino complejo
        const coreGeo = new THREE.OctahedronGeometry(0.55, 0);
        const coreMat = new THREE.MeshPhysicalMaterial({
            color: mainColor,
            emissive: mainColor,
            emissiveIntensity: 1.4,
            roughness: 0.1,
            metalness: 0.9,
            clearcoat: 1.0
        });
        const core = new THREE.Mesh(coreGeo, coreMat);
        core.castShadow = true;
        group.add(core);

        // Aura exterior pulsante (wireframe flotante)
        const auraGeo = new THREE.OctahedronGeometry(0.72, 0);
        const auraMat = new THREE.MeshBasicMaterial({
            color: mainColor,
            wireframe: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        const aura = new THREE.Mesh(auraGeo, auraMat);
        group.add(aura);

        // Mini satélites orbitando
        const satellites = [];
        const satGeo = new THREE.SphereGeometry(0.1, 8, 8);
        const satMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        for (let i = 0; i < 3; i++) {
            const sat = new THREE.Mesh(satGeo, satMat);
            group.add(sat);
            satellites.push(sat);
        }

        // Luz dinámica calibrada
        const light = new THREE.PointLight(mainColor, 2.6, 6.5);
        light.position.set(0, 0.3, 0);
        group.add(light);

        group.userData = {
            core: core,
            aura: aura,
            satellites: satellites,
            light: light,
            type: type,
            points: points,
            baseColor: mainColor,
            timeOffset: Math.random() * 10
        };

        return group;
    }

    // Genera una posición de cuadrícula libre que no colisione con la serpiente
    getRandomGridPosition(occupiedPositions = []) {
        const half = this.arenaHalf - 1;
        let pos;
        let attempts = 0;
        const maxAttempts = 200;

        const isOccupied = (x, z) => {
            return occupiedPositions.some(p => Math.abs(p.x - x) < 0.5 && Math.abs(p.z - z) < 0.5);
        };

        do {
            const gx = (Math.floor(Math.random() * (half * 2 + 1)) - half) * this.gridSize;
            const gz = (Math.floor(Math.random() * (half * 2 + 1)) - half) * this.gridSize;
            pos = new THREE.Vector3(gx, 0.5, gz);
            attempts++;
        } while (isOccupied(pos.x, pos.z) && attempts < maxAttempts);

        return pos;
    }

    // Spawnea alimento normal
    spawnNormalFood(occupiedPositions = [], color = null) {
        if (this.activeFood) {
            this.scene.remove(this.activeFood);
        }

        const foodColor = color || this.themeColor;
        this.activeFood = this.createNormalFoodMesh(foodColor);
        const pos = this.getRandomGridPosition(occupiedPositions);
        this.activeFood.position.copy(pos);
        this.activeFood.scale.set(0.01, 0.01, 0.01); // animación de aparición
        this.scene.add(this.activeFood);
        return this.activeFood;
    }

    // Spawnea alimento especial temporal
    spawnSpecialFood(occupiedPositions = [], type = null) {
        if (this.specialFood) {
            this.scene.remove(this.specialFood);
            this.specialFood = null;
        }

        const types = ['gold', 'speed', 'ghost'];
        const chosenType = type || types[Math.floor(Math.random() * types.length)];

        this.specialFood = this.createSpecialFoodMesh(chosenType);
        const pos = this.getRandomGridPosition([...occupiedPositions, this.activeFood ? this.activeFood.position : {x:999, z:999}]);
        this.specialFood.position.copy(pos);
        this.specialFood.scale.set(0.01, 0.01, 0.01);
        this.scene.add(this.specialFood);

        this.specialTimer = 12.0; // 12 segundos disponible
        return this.specialFood;
    }

    // Actualización de animaciones de comida
    update(delta = 0.016, elapsedTime = 0) {
        // Actualizar comida normal
        if (this.activeFood) {
            const ud = this.activeFood.userData;
            
            // Pop-in scale
            if (this.activeFood.scale.x < 1.0) {
                const s = Math.min(1.0, this.activeFood.scale.x + delta * 5.0);
                this.activeFood.scale.set(s, s, s);
            }

            // Levitación sinusoidal
            const t = elapsedTime * 2.5 + ud.timeOffset;
            this.activeFood.position.y = 0.55 + Math.sin(t) * 0.16;

            // Rotación de núcleo y anillos
            ud.core.rotation.x += delta * 1.8;
            ud.core.rotation.y += delta * 2.2;
            ud.ring1.rotation.x += delta * 2.8;
            ud.ring1.rotation.z += delta * 1.5;
            ud.ring2.rotation.y += delta * -2.4;
            ud.ring2.rotation.x += delta * 1.2;

            // Pulso de luz y emisión suave
            const pulse = 1.0 + Math.sin(t * 2) * 0.25;
            ud.light.intensity = 1.8 * pulse;
            ud.core.material.emissiveIntensity = 1.0 * pulse;
        }

        // Actualizar comida especial
        if (this.specialFood) {
            const sud = this.specialFood.userData;

            if (this.specialFood.scale.x < 1.0) {
                const s = Math.min(1.0, this.specialFood.scale.x + delta * 5.0);
                this.specialFood.scale.set(s, s, s);
            }

            this.specialTimer -= delta;

            // Parpadeo en los últimos 3 segundos
            if (this.specialTimer <= 3.0) {
                const blink = Math.sin(elapsedTime * 18) > 0;
                this.specialFood.visible = blink;
            } else {
                this.specialFood.visible = true;
            }

            if (this.specialTimer <= 0) {
                this.removeSpecialFood();
                return;
            }

            const st = elapsedTime * 3.2 + sud.timeOffset;
            this.specialFood.position.y = 0.65 + Math.sin(st) * 0.22;

            sud.core.rotation.y += delta * 3.0;
            sud.core.rotation.z += delta * 1.5;
            sud.aura.rotation.x -= delta * 2.0;
            sud.aura.rotation.y += delta * 2.5;

            // Rotación de satélites en círculo
            if (sud.satellites) {
                sud.satellites.forEach((sat, i) => {
                    const angle = st * 2.5 + (i * Math.PI * 2 / 3);
                    const dist = 0.9;
                    sat.position.set(Math.cos(angle) * dist, Math.sin(st * 3 + i) * 0.2, Math.sin(angle) * dist);
                });
            }

            const sPulse = 1.0 + Math.sin(st * 3) * 0.35;
            sud.light.intensity = 2.6 * sPulse;
        }
    }

    removeSpecialFood() {
        if (this.specialFood) {
            this.scene.remove(this.specialFood);
            this.specialFood = null;
            this.specialTimer = 0;
        }
    }

    setThemeColor(color) {
        this.themeColor = color;
        if (this.activeFood) {
            this.activeFood.userData.core.material.color.setHex(color);
            this.activeFood.userData.core.material.emissive.setHex(color);
            this.activeFood.userData.ring2.material.color.setHex(color);
            this.activeFood.userData.light.color.setHex(color);
        }
    }

    clear() {
        if (this.activeFood) {
            this.scene.remove(this.activeFood);
            this.activeFood = null;
        }
        this.removeSpecialFood();
    }
}

window.FoodManager = FoodManager;

