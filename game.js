// Snake 3D Ultra - Main Game Architecture & Render Loop
// Post-procesamiento cinematográfico (UnrealBloomPass), iluminación PBR,
// arena reflectiva, 3 modos de cámara dinámicos y HUD reactivo.

class GameEngine {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.arenaSize = 22; // Tamaño de la cuadrícula (22x22)
        this.arenaHalf = Math.floor(this.arenaSize / 2);
        this.gridSize = 1.0;

        // Estado
        this.state = 'START'; // START, PLAYING, PAUSED, GAMEOVER
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('snake3d_highscore') || '0', 10);
        this.combo = 1;
        this.comboTimer = 0;
        this.specialSpawnCounter = 0;

        // Opciones de configuración
        this.cameraMode = 1; // 1: Isométrica 3D (Recomendado/Predeterminado), 0: Tercera Persona, 2: Neo-Arcade Cenital
        this.currentThemeIndex = 0;
        this.highQuality = true;

        // Trauma de cámara (Screen Shake)
        this.cameraTrauma = 0;

        // Definición de Temas Visuales
        this.themes = [
            {
                name: 'Cyberpunk Synthwave',
                primary: 0x00f3ff,     // Cyan Neón
                secondary: 0xff0077,   // Magenta Neón
                food: 0xff0055,        // Rubí Neón
                grid: 0x00f3ff,
                fog: 0x070914,
                boundary: 0x00f3ff,
                ambientLight: 0x1a1233
            },
            {
                name: 'Bioluminiscente',
                primary: 0x00ff88,     // Esmeralda Tóxico
                secondary: 0x9d00ff,   // Violeta Místico
                food: 0x00ffcc,
                grid: 0x00ff88,
                fog: 0x030d0a,
                boundary: 0x00ff88,
                ambientLight: 0x051d14
            },
            {
                name: 'Furia Solar',
                primary: 0xffaa00,     // Oro Fundido
                secondary: 0xff2200,   // Fuego Carmesí
                food: 0xffdd00,
                grid: 0xff7700,
                fog: 0x120803,
                boundary: 0xff4400,
                ambientLight: 0x220c02
            }
        ];

        this.initThree();
        this.initPostProcessing();
        this.initArena();
        this.initEntities();
        this.setupEvents();
        this.updateHUD();

        this.clock = new THREE.Clock();
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    // 1. Inicialización de Three.js (Renderer, Escena, Luces, Sombras PBR)
    initThree() {
        this.scene = new THREE.Scene();
        const currentTheme = this.themes[this.currentThemeIndex];
        this.scene.fog = new THREE.FogExp2(currentTheme.fog, 0.024);

        // Cámara
        this.camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 150);
        this.camera.position.set(0, 22, 22);
        this.cameraTarget = new THREE.Vector3(0, 0, -1);
        this.camera.lookAt(this.cameraTarget);

        // Renderizador WebGL de alto rendimiento
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.25;

        // Limpiar contenedor y agregar canvas
        this.container.innerHTML = '';
        this.container.appendChild(this.renderer.domElement);

        // Iluminación
        this.ambientLight = new THREE.AmbientLight(currentTheme.ambientLight, 1.2);
        this.scene.add(this.ambientLight);

        this.dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
        this.dirLight.position.set(15, 25, 15);
        this.dirLight.castShadow = true;
        this.dirLight.shadow.mapSize.width = 2048;
        this.dirLight.shadow.mapSize.height = 2048;
        this.dirLight.shadow.camera.near = 0.5;
        this.dirLight.shadow.camera.far = 70;
        const d = 20;
        this.dirLight.shadow.camera.left = -d;
        this.dirLight.shadow.camera.right = d;
        this.dirLight.shadow.camera.top = d;
        this.dirLight.shadow.camera.bottom = -d;
        this.dirLight.shadow.bias = -0.0005;
        this.scene.add(this.dirLight);
    }

    // 2. Post-Procesamiento Cinemático (UnrealBloomPass)
    initPostProcessing() {
        try {
            if (typeof THREE.EffectComposer !== 'undefined' && typeof THREE.UnrealBloomPass !== 'undefined') {
                const renderScene = new THREE.RenderPass(this.scene, this.camera);

                const bloomPass = new THREE.UnrealBloomPass(
                    new THREE.Vector2(window.innerWidth, window.innerHeight),
                    1.25,  // bloom strength
                    0.45,  // bloom radius
                    0.32   // bloom threshold
                );
                this.bloomPass = bloomPass;

                this.composer = new THREE.EffectComposer(this.renderer);
                this.composer.addPass(renderScene);
                this.composer.addPass(bloomPass);
            } else {
                this.highQuality = false;
            }
        } catch (e) {
            console.warn("Post-processing no disponible, fallback a WebGL estándar:", e);
            this.highQuality = false;
        }
    }

    // 3. Construcción de la Arena Cuántica (Piso reflectivo, cuadrícula brillante y muros láser)
    initArena() {
        const half = this.arenaHalf;
        const fullSpan = this.arenaSize;

        // A. Suelo reflectivo ultra-tecnológico
        const floorGeo = new THREE.PlaneGeometry(fullSpan * 1.5, fullSpan * 1.5);
        floorGeo.rotateX(-Math.PI / 2);
        const floorMat = new THREE.MeshPhysicalMaterial({
            color: 0x050711,
            metalness: 0.95,
            roughness: 0.18,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1,
            reflectivity: 0.95
        });
        this.floor = new THREE.Mesh(floorGeo, floorMat);
        this.floor.receiveShadow = true;
        this.floor.position.y = 0.0;
        this.scene.add(this.floor);

        // B. Cuadrícula de neón digitalizada
        const gridHelper = new THREE.GridHelper(fullSpan, fullSpan, 0x00f3ff, 0x13243d);
        gridHelper.position.y = 0.02;
        this.gridHelper = gridHelper;
        this.scene.add(gridHelper);

        // C. Muros perimetrales láser holográficos con resplandor
        this.wallGroup = new THREE.Group();
        const wallMat = new THREE.MeshPhysicalMaterial({
            color: 0x00f3ff,
            emissive: 0x00f3ff,
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 0.35,
            roughness: 0.1,
            metalness: 0.8
        });

        const wallHeight = 1.4;
        const wallThickness = 0.2;

        // Crear los 4 muros
        const createWall = (w, h, d, x, y, z) => {
            const geo = new THREE.BoxGeometry(w, h, d);
            const mesh = new THREE.Mesh(geo, wallMat);
            mesh.position.set(x, y, z);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.wallGroup.add(mesh);
        };

        const offset = half + 0.5;
        createWall(fullSpan + 0.4, wallHeight, wallThickness, 0, wallHeight / 2, offset);   // Norte
        createWall(fullSpan + 0.4, wallHeight, wallThickness, 0, wallHeight / 2, -offset);  // Sur
        createWall(wallThickness, wallHeight, fullSpan + 0.4, offset, wallHeight / 2, 0);   // Este
        createWall(wallThickness, wallHeight, fullSpan + 0.4, -offset, wallHeight / 2, 0);  // Oeste

        // Borde superior iluminado (Láser rim)
        const rimMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
        const createRim = (w, h, d, x, y, z) => {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), rimMat);
            mesh.position.set(x, y, z);
            this.wallGroup.add(mesh);
        };
        createRim(fullSpan + 0.4, 0.06, 0.06, 0, wallHeight, offset);
        createRim(fullSpan + 0.4, 0.06, 0.06, 0, wallHeight, -offset);
        createRim(0.06, 0.06, fullSpan + 0.4, offset, wallHeight, 0);
        createRim(0.06, 0.06, fullSpan + 0.4, -offset, wallHeight, 0);

        this.wallMat = wallMat;
        this.rimMat = rimMat;
        this.scene.add(this.wallGroup);
    }

    // 4. Entidades del juego (Serpiente, Frutas, Efectos visuales)
    initEntities() {
        this.fx = new FXEngine(this.scene);
        this.snake = new Snake3D(this.scene, this.gridSize, this.fx);
        this.food = new FoodManager(this.scene, this.gridSize, this.arenaHalf);

        const currentTheme = this.themes[this.currentThemeIndex];
        this.applyTheme(currentTheme);

        this.food.spawnNormalFood(this.snake.gridPositions);
    }

    // 5. Configuración de eventos (Teclado, Pantalla táctil, Redimensionado)
    setupEvents() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.composer.setSize(window.innerWidth, window.innerHeight);
        });

    // 5. Configuración de eventos (Teclado, Pantalla táctil, Redimensionado y Gestos)
    handleInput(action) {
        if (this.state !== 'PLAYING') return;

        let turned = false;
        if (this.cameraMode === 0) {
            // Modo 3ra Persona Cinemática: Giros relativos al frente de la serpiente
            if (action === 'left') {
                turned = this.snake.turnRelative('left');
            } else if (action === 'right') {
                turned = this.snake.turnRelative('right');
            }
        } else {
            // Modos Isométrica 3D y Cenital: Controles 100% alineados con los bordes de la pantalla
            // Arriba: (-Z en Three.js, arriba visualmente)
            // Abajo: (+Z en Three.js, abajo visualmente)
            // Izquierda: (-X en Three.js, izquierda visualmente)
            // Derecha: (+X en Three.js, derecha visualmente)
            if (action === 'up') turned = this.snake.setDirection(0, -1);
            else if (action === 'down') turned = this.snake.setDirection(0, 1);
            else if (action === 'left') turned = this.snake.setDirection(-1, 0);
            else if (action === 'right') turned = this.snake.setDirection(1, 0);
        }

        if (turned && window.soundEngine) {
            window.soundEngine.playTurnSound();
        }
    }

    setupEvents() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.composer.setSize(window.innerWidth, window.innerHeight);
        });

        // Controles de teclado
        window.addEventListener('keydown', (e) => {
            // Iniciar audio en primera tecla
            if (window.soundEngine) window.soundEngine.ensureContext();

            switch (e.key.toLowerCase()) {
                case 'w':
                case 'arrowup':
                    this.handleInput('up');
                    break;
                case 's':
                case 'arrowdown':
                    this.handleInput('down');
                    break;
                case 'a':
                case 'arrowleft':
                    this.handleInput('left');
                    break;
                case 'd':
                case 'arrowright':
                    this.handleInput('right');
                    break;
                case ' ':
                    if (this.state === 'START' || this.state === 'GAMEOVER') {
                        this.startGame();
                    } else if (this.state === 'PLAYING' || this.state === 'PAUSED') {
                        this.togglePause();
                    }
                    break;
                case 'c':
                    this.cycleCamera();
                    break;
                case 'm':
                    this.toggleAudio();
                    break;
                case 't':
                    this.cycleTheme();
                    break;
            }
        });

        // Controles de botones UI
        document.getElementById('btn-start').addEventListener('click', () => this.startGame());
        document.getElementById('btn-restart').addEventListener('click', () => this.startGame());
        document.getElementById('btn-camera').addEventListener('click', () => this.cycleCamera());
        document.getElementById('btn-theme').addEventListener('click', () => this.cycleTheme());
        document.getElementById('btn-audio').addEventListener('click', () => this.toggleAudio());
        document.getElementById('btn-graphics').addEventListener('click', () => this.toggleGraphicsQuality());

        // Controles virtuales para móvil/tablet
        const bindTouch = (id, action) => {
            const btn = document.getElementById(id);
            if (!btn) return;
            const handler = (e) => {
                e.preventDefault();
                if (window.soundEngine) window.soundEngine.ensureContext();
                this.handleInput(action);
            };
            btn.addEventListener('touchstart', handler, { passive: false });
            btn.addEventListener('click', handler);
        };

        bindTouch('dpad-up', 'up');
        bindTouch('dpad-down', 'down');
        bindTouch('dpad-left', 'left');
        bindTouch('dpad-right', 'right');

        // Soporte gestual para deslizamiento táctil (Swipe)
        let touchStartX = 0;
        let touchStartY = 0;
        window.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            }
        }, { passive: true });

        window.addEventListener('touchend', (e) => {
            if (e.changedTouches.length === 1) {
                const diffX = e.changedTouches[0].clientX - touchStartX;
                const diffY = e.changedTouches[0].clientY - touchStartY;
                const absX = Math.abs(diffX);
                const absY = Math.abs(diffY);

                if (Math.max(absX, absY) > 28) {
                    if (window.soundEngine) window.soundEngine.ensureContext();
                    if (absX > absY) {
                        this.handleInput(diffX > 0 ? 'right' : 'left');
                    } else {
                        this.handleInput(diffY > 0 ? 'down' : 'up');
                    }
                }
            }
        }, { passive: true });
    }

    startGame() {
        window.soundEngine.ensureContext();
        window.soundEngine.startMusic();

        this.score = 0;
        this.combo = 1;
        this.comboTimer = 0;
        this.specialSpawnCounter = 0;
        this.cameraTrauma = 0;

        this.fx.clear();
        this.food.clear();
        this.snake.init();

        const currentTheme = this.themes[this.currentThemeIndex];
        this.snake.setTheme(currentTheme.primary, currentTheme.secondary);
        this.food.spawnNormalFood(this.snake.gridPositions, currentTheme.food);

        this.state = 'PLAYING';
        this.updateHUD();

        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-over-screen').classList.add('hidden');
        document.getElementById('pause-screen').classList.add('hidden');
    }

    togglePause() {
        if (this.state === 'PLAYING') {
            this.state = 'PAUSED';
            document.getElementById('pause-screen').classList.remove('hidden');
        } else if (this.state === 'PAUSED') {
            this.state = 'PLAYING';
            document.getElementById('pause-screen').classList.add('hidden');
        }
    }

    gameOver() {
        this.state = 'GAMEOVER';
        this.cameraTrauma = 0.8; // Fuerte temblor de impacto

        window.soundEngine.playGameOverSound();
        window.soundEngine.stopMusic();

        // Guardar record
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('snake3d_highscore', this.highScore.toString());
        }

        // Explosión de partículas en la cabeza
        const headPos = this.snake.visualPositions[0] || new THREE.Vector3(0, 0, 0);
        this.fx.createEatBurst(headPos, 0xff0044, 70);

        // Mostrar pantalla de Game Over
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('final-highscore').textContent = this.highScore;
        document.getElementById('game-over-screen').classList.remove('hidden');
        this.updateHUD();
    }

    // Lógica del paso del grid (Tick de colisiones y comida)
    onGridTick() {
        const head = this.snake.getHeadGrid();
        const half = this.arenaHalf;

        // 1. Colisión con muros
        if (Math.abs(head.x) > half || Math.abs(head.z) > half) {
            if (!this.snake.isGhost) {
                this.gameOver();
                return;
            } else {
                // En modo fantasma envuelve la pantalla (Wrap-around)
                if (head.x > half) head.x = -half;
                else if (head.x < -half) head.x = half;
                if (head.z > half) head.z = -half;
                else if (head.z < -half) head.z = half;
            }
        }

        // 2. Colisión con el propio cuerpo
        const body = this.snake.getBodyGrids();
        for (let i = 0; i < body.length; i++) {
            if (head.x === body[i].x && head.z === body[i].z) {
                if (!this.snake.isGhost) {
                    this.gameOver();
                    return;
                }
            }
        }

        // 3. Comer Alimento Normal
        if (this.food.activeFood) {
            const foodPos = this.food.activeFood.position;
            const dist = Math.hypot(head.x * this.gridSize - foodPos.x, head.z * this.gridSize - foodPos.z);

            if (dist < 0.6) {
                // Comer fruta
                this.snake.grow();
                const gainedPoints = 10 * this.combo;
                this.score += gainedPoints;

                // Combo
                this.combo = Math.min(5, this.combo + 1);
                this.comboTimer = 5.0; // 5 segundos para mantener el combo
                this.cameraTrauma = 0.22; // Sacudida suave al comer

                // Sonido y partículas
                window.soundEngine.playEatSound(1.0 + (this.combo * 0.12));
                this.fx.createEatBurst(foodPos, this.themes[this.currentThemeIndex].food, 45);

                // Incrementar velocidad gradualmente
                this.snake.moveSpeed = Math.min(14.0, 7.5 + (this.score * 0.04));

                // Spawnear siguiente fruta
                this.food.spawnNormalFood(this.snake.gridPositions, this.themes[this.currentThemeIndex].food);

                // Contador para alimentos especiales
                this.specialSpawnCounter++;
                if (this.specialSpawnCounter >= 5 && !this.food.specialFood) {
                    this.specialSpawnCounter = 0;
                    this.food.spawnSpecialFood(this.snake.gridPositions);
                }

                this.showFloatingText(`+${gainedPoints}`, foodPos);
                this.updateHUD();
            }
        }

        // 4. Comer Alimento Especial
        if (this.food.specialFood) {
            const sFoodPos = this.food.specialFood.position;
            const sDist = Math.hypot(head.x * this.gridSize - sFoodPos.x, head.z * this.gridSize - sFoodPos.z);

            if (sDist < 0.7) {
                const sType = this.food.specialFood.userData.type;
                let sPoints = 50 * this.combo;

                if (sType === 'gold') {
                    window.soundEngine.playBonusSound();
                    this.fx.createEatBurst(sFoodPos, 0xffd700, 65);
                    this.showFloatingText(`¡ORO +${sPoints}!`, sFoodPos, '#ffd700');
                } else if (sType === 'speed') {
                    window.soundEngine.playPowerUpSound();
                    this.fx.createEatBurst(sFoodPos, 0x00f3ff, 60);
                    this.snake.moveSpeed = Math.min(16.0, this.snake.moveSpeed + 2.5);
                    this.showFloatingText('¡HIPERVELOCIDAD!', sFoodPos, '#00f3ff');
                } else if (sType === 'ghost') {
                    window.soundEngine.playPowerUpSound();
                    this.fx.createEatBurst(sFoodPos, 0xbd00ff, 60);
                    this.snake.enableGhostMode(6.0);
                    this.showFloatingText('¡MODO FANTASMA!', sFoodPos, '#bd00ff');
                }

                this.score += sPoints;
                this.food.removeSpecialFood();
                this.cameraTrauma = 0.35;
                this.updateHUD();
            }
        }
    }

    // Texto flotante 3D a HUD al comer
    showFloatingText(text, worldPos, color = '#00f3ff') {
        const popup = document.createElement('div');
        popup.className = 'score-popup';
        popup.textContent = text;
        popup.style.color = color;
        popup.style.textShadow = `0 0 10px ${color}`;

        // Proyección 3D a 2D en pantalla
        const tempV = worldPos.clone().project(this.camera);
        const x = (tempV.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-(tempV.y * 0.5) + 0.5) * window.innerHeight;

        popup.style.left = `${x}px`;
        popup.style.top = `${y}px`;

        document.getElementById('hud').appendChild(popup);
        setTimeout(() => popup.remove(), 1000);
    }

    // 6. Animación y Bucle de Renderizado Principal
    animate() {
        requestAnimationFrame(this.animate);

        const delta = Math.min(this.clock.getDelta(), 0.1);
        const elapsedTime = this.clock.getElapsedTime();

        if (this.state === 'PLAYING') {
            // Actualizar contador de combo
            if (this.combo > 1) {
                this.comboTimer -= delta;
                if (this.comboTimer <= 0) {
                    this.combo = 1;
                    this.updateHUD();
                }
            }

            // Actualizar serpiente pasando callback para resolver el paso lógico en sincronía perfecta
            this.snake.update(delta, () => {
                this.onGridTick();
            });

            // Actualizar alimentos
            this.food.update(delta, elapsedTime);
        }

        // Actualizar partículas y efectos
        this.fx.update(delta);

        // Actualizar cámaras dinámicas
        this.updateCamera(delta);

        // Renderizado con Bloom
        if (this.highQuality && this.composer) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }

    // 7. Modos de Cámara Dinámica & Screen Shake
    updateCamera(delta) {
        if (!this.snake || !this.snake.visualPositions[0]) return;

        const headPos = this.snake.visualPositions[0];
        let targetCamPos = new THREE.Vector3();
        let targetLookAt = new THREE.Vector3();

        if (this.cameraMode === 0) {
            // Modo 0: Tercera persona cinemática de persecución
            const dirX = this.snake.direction.x;
            const dirZ = this.snake.direction.y;
            const distBehind = 7.0;
            const height = 4.2;

            targetCamPos.set(
                headPos.x - dirX * distBehind,
                headPos.y + height,
                headPos.z - dirZ * distBehind
            );
            targetLookAt.set(
                headPos.x + dirX * 4.0,
                headPos.y + 0.5,
                headPos.z + dirZ * 4.0
            );

            // Interpolación suave y amortiguada
            this.camera.position.lerp(targetCamPos, delta * 7.0);
            this.cameraTarget.lerp(targetLookAt, delta * 8.0);
            this.camera.lookAt(this.cameraTarget);

        } else if (this.cameraMode === 1) {
            // Modo 1: Isométrica 3D Táctica (Recomendada / Pantalla 1:1)
            targetCamPos.set(0, 22, 21);
            targetLookAt.set(0, 0, -1);

            this.camera.position.lerp(targetCamPos, delta * 5.0);
            this.cameraTarget.lerp(targetLookAt, delta * 5.0);
            this.camera.lookAt(this.cameraTarget);

        } else if (this.cameraMode === 2) {
            // Modo 2: Neo-Arcade Cenital
            targetCamPos.set(0, 28, 4);
            targetLookAt.set(0, 0, 0);

            this.camera.position.lerp(targetCamPos, delta * 5.0);
            this.cameraTarget.lerp(targetLookAt, delta * 5.0);
            this.camera.lookAt(this.cameraTarget);
        }

        // Aplicar Trauma de Cámara (Screen Shake)
        if (this.cameraTrauma > 0) {
            const shake = this.cameraTrauma * this.cameraTrauma * 0.4;
            this.camera.position.x += (Math.random() - 0.5) * shake;
            this.camera.position.y += (Math.random() - 0.5) * shake;
            this.camera.position.z += (Math.random() - 0.5) * shake;
            this.cameraTrauma = Math.max(0, this.cameraTrauma - delta * 1.5);
        }
    }

    cycleCamera() {
        this.cameraMode = (this.cameraMode + 1) % 3;
        const names = ['3ra Persona (A/D Giran)', 'Isométrica 3D (Recomendado)', 'Neo-Arcade Cenital'];
        document.getElementById('btn-camera').textContent = `📹 ${names[this.cameraMode]}`;
    }

    cycleTheme() {
        this.currentThemeIndex = (this.currentThemeIndex + 1) % this.themes.length;
        const theme = this.themes[this.currentThemeIndex];
        this.applyTheme(theme);
        document.getElementById('btn-theme').textContent = `🎨 ${theme.name}`;
    }

    applyTheme(theme) {
        this.scene.fog.color.setHex(theme.fog);
        this.ambientLight.color.setHex(theme.ambientLight);

        if (this.wallMat) {
            this.wallMat.color.setHex(theme.boundary);
            this.wallMat.emissive.setHex(theme.boundary);
        }
        if (this.rimMat) {
            this.rimMat.color.setHex(theme.boundary);
        }
        if (this.gridHelper) {
            this.gridHelper.material.color.setHex(theme.grid);
        }

        this.snake.setTheme(theme.primary, theme.secondary);
        this.food.setThemeColor(theme.food);
        this.fx.setThemeColor(theme.primary);
    }

    toggleAudio() {
        const muted = window.soundEngine.toggleMute();
        document.getElementById('btn-audio').textContent = muted ? '🔇 Silenciado' : '🔊 Audio ON';
    }

    toggleGraphicsQuality() {
        this.highQuality = !this.highQuality;
        document.getElementById('btn-graphics').textContent = this.highQuality ? '⚡ Calidad: ULTRA (Bloom)' : '⚡ Calidad: RÁPIDO';
    }

    updateHUD() {
        document.getElementById('score-val').textContent = this.score;
        document.getElementById('highscore-val').textContent = Math.max(this.score, this.highScore);
        
        const comboEl = document.getElementById('combo-badge');
        if (this.combo > 1) {
            comboEl.textContent = `COMBO x${this.combo}!`;
            comboEl.classList.remove('hidden');
        } else {
            comboEl.classList.add('hidden');
        }
    }
}

// Iniciar motor de juego cuando el DOM esté listo
window.addEventListener('DOMContentLoaded', () => {
    window.gameEngine = new GameEngine();
});
