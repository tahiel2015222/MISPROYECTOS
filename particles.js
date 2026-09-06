// Snake 3D Ultra - Visual Effects & Particle Engine
// Gestiona polvo ambiental, explosiones al comer, ondas de choque en el suelo y estelas.

class FXEngine {
    constructor(scene) {
        this.scene = scene;
        this.burstParticles = [];
        this.shockwaves = [];
        this.ambientParticles = null;
        this.tailParticles = [];
        this.initAmbientDust();
    }

    // Polvo estelar / datos flotantes en el espacio de la arena
    initAmbientDust() {
        const count = 350;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const velocities = [];

        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 60;
            positions[i * 3 + 1] = Math.random() * 20;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 60;

            velocities.push({
                x: (Math.random() - 0.5) * 0.02,
                y: (Math.random() - 0.5) * 0.02,
                z: (Math.random() - 0.5) * 0.02
            });
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        // Textura procedural circular para las partículas
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.3, 'rgba(0, 255, 255, 0.8)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 32, 32);

        const texture = new THREE.CanvasTexture(canvas);

        const material = new THREE.PointsMaterial({
            size: 0.8,
            map: texture,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            color: 0x00f3ff
        });

        this.ambientParticles = new THREE.Points(geometry, material);
        this.ambientVelocities = velocities;
        this.scene.add(this.ambientParticles);
    }

    // Explosión de chispas 3D al comer
    createEatBurst(pos, color = 0x00ffff, count = 40) {
        const geo = new THREE.SphereGeometry(0.12, 6, 6);
        const mat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 1
        });

        for (let i = 0; i < count; i++) {
            const mesh = new THREE.Mesh(geo, mat.clone());
            mesh.position.copy(pos);
            mesh.position.y += 0.3;

            const speed = 0.15 + Math.random() * 0.35;
            const angleTheta = Math.random() * Math.PI * 2;
            const anglePhi = Math.random() * Math.PI;

            const velocity = new THREE.Vector3(
                Math.sin(anglePhi) * Math.cos(angleTheta) * speed,
                Math.abs(Math.cos(anglePhi)) * speed + 0.1,
                Math.sin(anglePhi) * Math.sin(angleTheta) * speed
            );

            this.scene.add(mesh);
            this.burstParticles.push({
                mesh: mesh,
                velocity: velocity,
                life: 1.0,
                decay: 0.02 + Math.random() * 0.02,
                scaleDecay: 0.96
            });
        }

        // Onda expansiva en el suelo (Shockwave ring)
        this.createShockwave(pos, color);
    }

    // Anillo de choque luminoso en el piso
    createShockwave(pos, color = 0x00ffff) {
        const ringGeo = new THREE.RingGeometry(0.2, 0.45, 32);
        ringGeo.rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const shockwave = new THREE.Mesh(ringGeo, ringMat);
        shockwave.position.set(pos.x, 0.08, pos.z);
        this.scene.add(shockwave);

        this.shockwaves.push({
            mesh: shockwave,
            scale: 1,
            maxScale: 9.0,
            opacity: 0.9
        });
    }

    // Estela de energía de la cola
    createTailTrail(pos, color = 0x00ffff) {
        if (Math.random() > 0.4) return; // optimización de tasa de emisión

        const geo = new THREE.SphereGeometry(0.18, 4, 4);
        const mat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending
        });

        const particle = new THREE.Mesh(geo, mat);
        particle.position.copy(pos);
        particle.position.y += 0.2 + (Math.random() - 0.5) * 0.2;
        particle.position.x += (Math.random() - 0.5) * 0.3;
        particle.position.z += (Math.random() - 0.5) * 0.3;

        this.scene.add(particle);
        this.tailParticles.push({
            mesh: particle,
            life: 1.0,
            decay: 0.05
        });
    }

    // Actualización de cada fotograma
    update(delta = 0.016) {
        // Actualizar polvo ambiental
        if (this.ambientParticles) {
            const positions = this.ambientParticles.geometry.attributes.position.array;
            for (let i = 0; i < this.ambientVelocities.length; i++) {
                positions[i * 3] += this.ambientVelocities[i].x;
                positions[i * 3 + 1] += this.ambientVelocities[i].y;
                positions[i * 3 + 2] += this.ambientVelocities[i].z;

                // Rebotar en límites espaciales
                if (Math.abs(positions[i * 3]) > 30) this.ambientVelocities[i].x *= -1;
                if (positions[i * 3 + 1] < 0.5 || positions[i * 3 + 1] > 22) this.ambientVelocities[i].y *= -1;
                if (Math.abs(positions[i * 3 + 2]) > 30) this.ambientVelocities[i].z *= -1;
            }
            this.ambientParticles.geometry.attributes.position.needsUpdate = true;
            this.ambientParticles.rotation.y += 0.0004;
        }

        // Actualizar chispas de comida
        for (let i = this.burstParticles.length - 1; i >= 0; i--) {
            const p = this.burstParticles[i];
            p.mesh.position.add(p.velocity);
            p.velocity.y -= 0.009; // gravedad leve
            p.life -= p.decay;
            p.mesh.material.opacity = p.life;
            p.mesh.scale.multiplyScalar(p.scaleDecay);

            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                p.mesh.geometry.dispose();
                p.mesh.material.dispose();
                this.burstParticles.splice(i, 1);
            }
        }

        // Actualizar ondas de choque
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const sw = this.shockwaves[i];
            sw.scale += 0.35;
            sw.mesh.scale.set(sw.scale, 1, sw.scale);
            sw.opacity -= 0.035;
            sw.mesh.material.opacity = Math.max(0, sw.opacity);

            if (sw.opacity <= 0 || sw.scale >= sw.maxScale) {
                this.scene.remove(sw.mesh);
                sw.mesh.geometry.dispose();
                sw.mesh.material.dispose();
                this.shockwaves.splice(i, 1);
            }
        }

        // Actualizar partículas de estela de cola
        for (let i = this.tailParticles.length - 1; i >= 0; i--) {
            const tp = this.tailParticles[i];
            tp.life -= tp.decay;
            tp.mesh.material.opacity = tp.life * 0.7;
            tp.mesh.scale.multiplyScalar(0.94);

            if (tp.life <= 0) {
                this.scene.remove(tp.mesh);
                tp.mesh.geometry.dispose();
                tp.mesh.material.dispose();
                this.tailParticles.splice(i, 1);
            }
        }
    }

    setThemeColor(ambientColor) {
        if (this.ambientParticles) {
            this.ambientParticles.material.color.setHex(ambientColor);
        }
    }

    clear() {
        this.burstParticles.forEach(p => {
            this.scene.remove(p.mesh);
            p.mesh.geometry.dispose();
            p.mesh.material.dispose();
        });
        this.burstParticles = [];

        this.shockwaves.forEach(sw => {
            this.scene.remove(sw.mesh);
            sw.mesh.geometry.dispose();
            sw.mesh.material.dispose();
        });
        this.shockwaves = [];

        this.tailParticles.forEach(tp => {
            this.scene.remove(tp.mesh);
            tp.mesh.geometry.dispose();
            tp.mesh.material.dispose();
        });
        this.tailParticles = [];
    }
}

window.FXEngine = FXEngine;

