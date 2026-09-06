// Snake 3D Ultra - Cyber-Serpent 3D Model & Kinematics Engine
// Cabeza mecha detallada, ojos láser, lengua bífida holográfica,
// luz frontal dinámica, segmentos con anillos de energía y ondulación fluida.

class Snake3D {
    constructor(scene, gridSize = 1.0, fxEngine = null) {
        this.scene = scene;
        this.gridSize = gridSize;
        this.fx = fxEngine;

        // Estado del juego lógico
        this.gridPositions = []; // [{x, z}]
        this.direction = new THREE.Vector2(0, 1);
        this.nextDirection = new THREE.Vector2(0, 1);
        this.isAlive = true;
        this.isGhost = false;
        this.ghostTimer = 0;

        // Mallas 3D
        this.headGroup = null;
        this.headLight = null;
        this.tongueMesh = null;
        this.segmentMeshes = [];

        // Interpolación visual suave (lerp)
        this.moveProgress = 0; // 0.0 a 1.0 entre pasos lógicos
        this.moveSpeed = 7.5;  // pasos por segundo base
        this.visualPositions = [];
        this.previousGridPositions = [];

        // Estilo & Tema
        this.primaryColor = 0x00f3ff; // Cyan cyber
        this.secondaryColor = 0xff0077; // Magenta
        this.glowColor = 0x00f3ff;

        // Animaciones
        this.slitherTime = 0;
        this.tongueTimer = 0;
        this.targetRotationY = 0;
        this.currentRotationY = 0;
        this.bankAngle = 0;

        this.init();
    }

    init() {
        // Inicializar posiciones de inicio (4 segmentos orientados hacia el norte / arriba en pantalla)
        this.gridPositions = [
            { x: 0, z: -2 },
            { x: 0, z: -1 },
            { x: 0, z: 0 },
            { x: 0, z: 1 }
        ];

        this.previousGridPositions = this.gridPositions.map(p => ({ ...p }));
        this.visualPositions = this.gridPositions.map(p => new THREE.Vector3(p.x * this.gridSize, 0.45, p.z * this.gridSize));

        // Orientada hacia -Z (Arriba en pantalla en vista isométrica)
        this.direction.set(0, -1);
        this.nextDirection.set(0, -1);
        this.inputQueue = []; // Buffer para giros rápidos de esquina
        this.moveProgress = 0;
        this.isAlive = true;
        this.isGhost = false;

        this.buildHead();
        this.buildBody();
    }

    // Construcción de la cabeza Mecha-Cobra de alta fidelidad
    buildHead() {
        if (this.headGroup) {
            this.scene.remove(this.headGroup);
        }

        this.headGroup = new THREE.Group();

        // 1. Carcasa principal (Casco aerodinámico mecha)
        const helmGeo = new THREE.ConeGeometry(0.55, 1.2, 5);
        helmGeo.rotateX(Math.PI / 2);
        helmGeo.scale(1.1, 0.65, 1.0);

        const helmMat = new THREE.MeshPhysicalMaterial({
            color: 0x111625,
            metalness: 0.9,
            roughness: 0.2,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1
        });
        const helm = new THREE.Mesh(helmGeo, helmMat);
        helm.castShadow = true;
        helm.receiveShadow = true;
        this.headGroup.add(helm);

        // 2. Visor / Ojos Láser Neón
        const eyeGeo = new THREE.BoxGeometry(0.18, 0.08, 0.4);
        const eyeMat = new THREE.MeshBasicMaterial({
            color: this.primaryColor
        });

        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(0.32, 0.12, 0.15);
        leftEye.rotation.y = 0.35;
        this.headGroup.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(-0.32, 0.12, 0.15);
        rightEye.rotation.y = -0.35;
        this.headGroup.add(rightEye);

        // 3. Cresta dorsal luminosa
        const crestGeo = new THREE.BoxGeometry(0.08, 0.2, 0.8);
        const crestMat = new THREE.MeshBasicMaterial({
            color: this.secondaryColor
        });
        const crest = new THREE.Mesh(crestGeo, crestMat);
        crest.position.set(0, 0.28, -0.1);
        this.headGroup.add(crest);

        // 4. Lengua bífida holográfica retráctil
        const tongueGroup = new THREE.Group();
        const tStemGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6);
        tStemGeo.rotateX(Math.PI / 2);
        const tForkGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.2, 6);
        tForkGeo.rotateX(Math.PI / 2);

        const tMat = new THREE.MeshBasicMaterial({
            color: this.secondaryColor,
            transparent: true,
            opacity: 0.95
        });

        const stem = new THREE.Mesh(tStemGeo, tMat);
        stem.position.z = 0.2;
        tongueGroup.add(stem);

        const forkL = new THREE.Mesh(tForkGeo, tMat);
        forkL.position.set(0.05, 0, 0.45);
        forkL.rotation.y = 0.45;
        tongueGroup.add(forkL);

        const forkR = new THREE.Mesh(tForkGeo, tMat);
        forkR.position.set(-0.05, 0, 0.45);
        forkR.rotation.y = -0.45;
        tongueGroup.add(forkR);

        tongueGroup.position.set(0, -0.05, 0.6);
        tongueGroup.scale.set(0.01, 0.01, 0.01);
        this.headGroup.add(tongueGroup);
        this.tongueMesh = tongueGroup;

        // 5. Faro de proyección frontal dinámico (Ilumina la arena en tiempo real)
        const light = new THREE.PointLight(this.primaryColor, 3.5, 9.0);
        light.position.set(0, 0.3, 0.7);
        light.castShadow = true;
        light.shadow.bias = -0.002;
        this.headGroup.add(light);
        this.headLight = light;

        this.headGroup.position.copy(this.visualPositions[0]);
        this.scene.add(this.headGroup);
    }

    // Crea un segmento articulado con núcleo de energía y armadura
    createSegmentMesh(index, totalSegments) {
        const group = new THREE.Group();
        const factor = index / Math.max(1, totalSegments);

        // Disminución gradual suave hacia la cola
        const scaleFactor = 1.0 - (factor * 0.35);

        // 1. Armazón exterior metálico (Carapace)
        const outerGeo = new THREE.BoxGeometry(0.85 * scaleFactor, 0.55 * scaleFactor, 0.85 * scaleFactor);
        const outerMat = new THREE.MeshPhysicalMaterial({
            color: 0x141a29,
            metalness: 0.85,
            roughness: 0.25,
            clearcoat: 0.8
        });
        const outer = new THREE.Mesh(outerGeo, outerMat);
        outer.castShadow = true;
        outer.receiveShadow = true;
        group.add(outer);

        // 2. Anillo de energía interior resplandeciente (Bloom)
        const ringGeo = new THREE.TorusGeometry(0.48 * scaleFactor, 0.06 * scaleFactor, 6, 24);
        ringGeo.rotateX(Math.PI / 2);

        // Mezclar gradiente de color entre primario y secundario
        const segColor = new THREE.Color().lerpColors(
            new THREE.Color(this.primaryColor),
            new THREE.Color(this.secondaryColor),
            factor
        );

        const ringMat = new THREE.MeshBasicMaterial({
            color: segColor
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        group.add(ring);

        // 3. Aleta dorsal pequeña
        const finGeo = new THREE.BoxGeometry(0.06, 0.15 * scaleFactor, 0.5 * scaleFactor);
        const fin = new THREE.Mesh(finGeo, ringMat);
        fin.position.set(0, 0.28 * scaleFactor, 0);
        group.add(fin);

        group.userData = {
            outer: outer,
            ring: ring,
            fin: fin,
            baseColor: segColor,
            scaleFactor: scaleFactor
        };

        return group;
    }

    // Construye o actualiza los segmentos de la serpiente
    buildBody() {
        // Limpiar segmentos anteriores si los hay
        this.segmentMeshes.forEach(mesh => this.scene.remove(mesh));
        this.segmentMeshes = [];

        // Segmentos (omitiendo la cabeza que tiene su propio grupo)
        for (let i = 1; i < this.gridPositions.length; i++) {
            const seg = this.createSegmentMesh(i, this.gridPositions.length);
            seg.position.copy(this.visualPositions[i]);
            this.scene.add(seg);
            this.segmentMeshes.push(seg);
        }
    }

    // Añade un nuevo segmento al crecer
    grow() {
        const lastIndex = this.gridPositions.length - 1;
        const tailGrid = { ...this.gridPositions[lastIndex] };
        const prevTailGrid = { ...this.previousGridPositions[lastIndex] };

        this.gridPositions.push(tailGrid);
        this.previousGridPositions.push(prevTailGrid);

        const newPos = this.visualPositions[lastIndex].clone();
        this.visualPositions.push(newPos);

        const newSeg = this.createSegmentMesh(this.gridPositions.length - 1, this.gridPositions.length);
        newSeg.position.copy(newPos);
        newSeg.scale.set(0.01, 0.01, 0.01); // animación de inflado al crecer
        this.scene.add(newSeg);
        this.segmentMeshes.push(newSeg);
    }

    // Maneja la entrada de dirección con buffer inteligente (Input Queue)
    // Permite encadenar 2 giros rápidos (p.ej. Derecha luego Abajo) sin perder ninguna pulsación
    setDirection(dx, dz) {
        if (!this.isAlive) return false;

        // Determinar cuál es la última dirección prevista (última en la cola o la actual)
        const lastDir = this.inputQueue.length > 0 
            ? this.inputQueue[this.inputQueue.length - 1] 
            : this.direction;

        // No permitir giro opuesto de 180° sobre sí misma
        if (lastDir.x + dx === 0 && lastDir.y + dz === 0) {
            return false;
        }

        // Tampoco si es exactamente la misma dirección
        if (lastDir.x === dx && lastDir.y === dz) {
            return false;
        }

        // Buffer de hasta 2 movimientos para giros ultra fluidos en esquinas
        if (this.inputQueue.length < 2) {
            this.inputQueue.push(new THREE.Vector2(dx, dz));
            return true;
        }

        return false;
    }

    // Giro relativo para la cámara en 3ra persona ('left' o 'right')
    turnRelative(relativeDir) {
        if (!this.isAlive) return false;

        const lastDir = this.inputQueue.length > 0 
            ? this.inputQueue[this.inputQueue.length - 1] 
            : this.direction;

        let newDx = 0;
        let newDz = 0;

        if (relativeDir === 'left') {
            // Girar 90° hacia la izquierda del frente actual
            newDx = lastDir.y;
            newDz = -lastDir.x;
        } else if (relativeDir === 'right') {
            // Girar 90° hacia la derecha del frente actual
            newDx = -lastDir.y;
            newDz = lastDir.x;
        }

        return this.setDirection(newDx, newDz);
    }

    // Paso lógico discreto de la serpiente (Tick del grid)
    stepGrid() {
        if (!this.isAlive) return;

        // Guardar posiciones anteriores para la interpolación visual continua
        for (let i = 0; i < this.gridPositions.length; i++) {
            this.previousGridPositions[i] = { ...this.gridPositions[i] };
        }

        // Extraer siguiente dirección de la cola si existe
        if (this.inputQueue.length > 0) {
            const next = this.inputQueue.shift();
            this.direction.copy(next);
        }

        // Mover cuerpo: cada segmento toma la posición del anterior
        for (let i = this.gridPositions.length - 1; i > 0; i--) {
            this.gridPositions[i].x = this.gridPositions[i - 1].x;
            this.gridPositions[i].z = this.gridPositions[i - 1].z;
        }

        // Mover cabeza
        this.gridPositions[0].x += this.direction.x;
        this.gridPositions[0].z += this.direction.y; // usamos y para el eje z 3D

        // Calcular ángulo objetivo de rotación para la cabeza
        this.targetRotationY = Math.atan2(this.direction.x, this.direction.y);
    }

    // Actualización de cada cuadro visual (animación a 60fps)
    update(delta = 0.016, onStepCallback = null) {
        if (!this.headGroup || !this.isAlive) return;

        this.slitherTime += delta * 9.0;
        this.moveProgress += delta * this.moveSpeed;

        // Si completamos el paso lógico
        if (this.moveProgress >= 1.0) {
            this.moveProgress -= 1.0;
            this.stepGrid();
            if (onStepCallback) onStepCallback();
        }

        if (!this.isAlive) return;

        // Interpolar posición visual de cada segmento entre el cuadro anterior y el actual
        const t = Math.min(1.0, this.moveProgress);

        for (let i = 0; i < this.gridPositions.length; i++) {
            const prev = this.previousGridPositions[i];
            const curr = this.gridPositions[i];

            if (!prev || !curr) continue;

            const targetX = THREE.MathUtils.lerp(prev.x, curr.x, t) * this.gridSize;
            const targetZ = THREE.MathUtils.lerp(prev.z, curr.z, t) * this.gridSize;

            // Añadir ondulación biológica sinusoidal lateral (slithering wave)
            const waveIntensity = i === 0 ? 0.04 : Math.min(0.14, i * 0.02);
            const waveOffset = Math.sin(this.slitherTime - i * 0.55) * waveIntensity;

            // Vector perpendicular a la dirección del segmento para la ondulación
            let perpX = 0, perpZ = 0;
            if (i < this.gridPositions.length - 1) {
                const dx = curr.x - this.gridPositions[i + 1].x;
                const dz = curr.z - this.gridPositions[i + 1].z;
                perpX = -dz;
                perpZ = dx;
            } else {
                perpX = -this.direction.y;
                perpZ = this.direction.x;
            }

            this.visualPositions[i].set(
                targetX + perpX * waveOffset,
                0.45,
                targetZ + perpZ * waveOffset
            );

            // Actualizar malla correspondiente
            if (i === 0) {
                this.headGroup.position.copy(this.visualPositions[0]);

                // Rotación suave con slerp hacia la nueva dirección
                let diff = this.targetRotationY - this.currentRotationY;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                this.currentRotationY += diff * Math.min(1.0, delta * 18.0);
                this.headGroup.rotation.y = this.currentRotationY;

                // Inclinación bancaria al girar (Bank tilt)
                const turnSpeed = diff * 0.35;
                this.bankAngle = THREE.MathUtils.lerp(this.bankAngle, -turnSpeed, delta * 12.0);
                this.headGroup.rotation.z = this.bankAngle;

            } else {
                const segMesh = this.segmentMeshes[i - 1];
                if (segMesh) {
                    segMesh.position.copy(this.visualPositions[i]);

                    // Orientar segmento hacia el segmento anterior
                    const leaderPos = this.visualPositions[i - 1];
                    segMesh.lookAt(leaderPos.x, leaderPos.y, leaderPos.z);

                    // Escala de inflado si recién se añadió
                    if (segMesh.scale.x < 1.0) {
                        const s = Math.min(1.0, segMesh.scale.x + delta * 6.0);
                        segMesh.scale.set(s, s, s);
                    }
                }
            }
        }

        // Animar lengua bífida que sale periódicamente
        this.tongueTimer += delta;
        if (this.tongueMesh) {
            const tongueCycle = Math.sin(this.tongueTimer * 6.0);
            if (tongueCycle > 0.4) {
                const scaleZ = (tongueCycle - 0.4) * 2.2;
                this.tongueMesh.scale.set(1.0, 1.0, scaleZ);
            } else {
                this.tongueMesh.scale.set(0.01, 0.01, 0.01);
            }
        }

        // Emitir estela de energía en la cola
        if (this.fx && this.visualPositions.length > 2) {
            const tailPos = this.visualPositions[this.visualPositions.length - 1];
            this.fx.createTailTrail(tailPos, this.secondaryColor);
        }

        // Modo Ghost temporal (parpadeo wireframe)
        if (this.isGhost) {
            this.ghostTimer -= delta;
            const ghostPulse = 0.3 + Math.sin(this.slitherTime * 20.0) * 0.25;
            this.segmentMeshes.forEach(mesh => {
                mesh.userData.outer.material.opacity = ghostPulse;
                mesh.userData.outer.material.transparent = true;
            });
            if (this.ghostTimer <= 0) {
                this.isGhost = false;
                this.segmentMeshes.forEach(mesh => {
                    mesh.userData.outer.material.opacity = 1.0;
                    mesh.userData.outer.material.transparent = false;
                });
            }
        }

        return false;
    }

    setTheme(primaryColor, secondaryColor) {
        this.primaryColor = primaryColor;
        this.secondaryColor = secondaryColor;

        if (this.headGroup) {
            this.headLight.color.setHex(primaryColor);
        }

        this.buildHead();
        this.buildBody();
    }

    enableGhostMode(duration = 5.0) {
        this.isGhost = true;
        this.ghostTimer = duration;
    }

    getHeadGrid() {
        return this.gridPositions[0];
    }

    getBodyGrids() {
        return this.gridPositions.slice(1);
    }

    destroy() {
        if (this.headGroup) this.scene.remove(this.headGroup);
        this.segmentMeshes.forEach(mesh => this.scene.remove(mesh));
        this.segmentMeshes = [];
    }
}

window.Snake3D = Snake3D;
