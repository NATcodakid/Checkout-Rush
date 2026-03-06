/**
 * scene.js — Three.js 3D scene for Checkout Rush v2.
 *
 * FIRST-PERSON perspective: player stands behind the counter.
 * Features: detailed store, GLB loading, styled characters (Fall-Guys-like),
 * customer queue system, improved lighting.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ===== CHARACTER STYLE DEFINITIONS =====
// Inspired by reference: chunky, colorful bodies with big googly eyes,
// fun hats/accessories, stubby limbs
const CHARACTER_STYLES = [
    { name: 'Ghost Kid', bodyColor: 0xf4d35e, headColor: 0xffffff, headShape: 'box', hatColor: null, eyeStyle: 'cutout', accentColor: 0x333333 },
    { name: 'Pirate Gal', bodyColor: 0x48cae4, headColor: 0xe8c9a0, headShape: 'round', hatColor: 0x1d3557, eyeStyle: 'dot', accentColor: 0xffd166 },
    { name: 'Carrot Dude', bodyColor: 0xfb8500, headColor: 0xfb8500, headShape: 'tall', hatColor: 0x38b000, eyeStyle: 'big', accentColor: 0x38b000 },
    { name: 'Lobster', bodyColor: 0xe63946, headColor: 0xe63946, headShape: 'round', hatColor: null, eyeStyle: 'stalk', accentColor: 0xff6b6b },
    { name: 'Graduate', bodyColor: 0x333333, headColor: 0xdeb887, headShape: 'round', hatColor: 0x222222, eyeStyle: 'dot', accentColor: 0xffd166 },
    { name: 'Alien', bodyColor: 0x06d6a0, headColor: 0x80ffdb, headShape: 'round', hatColor: null, eyeStyle: 'big', accentColor: 0x00b4d8 },
    { name: 'Chef', bodyColor: 0xffffff, headColor: 0xf4d6b0, headShape: 'round', hatColor: 0xffffff, eyeStyle: 'dot', accentColor: 0xe63946 },
    { name: 'Robot', bodyColor: 0x90a4ae, headColor: 0xb0bec5, headShape: 'box', hatColor: 0xff6b35, eyeStyle: 'big', accentColor: 0x00e676 },
];

export class CheckoutScene {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = new THREE.Clock();
        this.gltfLoader = new GLTFLoader();

        // Object groups
        this.counter = null;
        this.register = null;
        this.itemMeshes = [];
        this.scannerGroup = null;

        // Customer queue
        this.customerQueue = [];     // array of THREE.Group
        this.activeCustomer = null;  // the one at the counter
        this.queuePositions = [];    // world positions for queue slots

        // Loaded models cache
        this.loadedModels = {};

        // Animation
        this.animationId = null;
        this.mouseX = 0;
        this.mouseY = 0;
        this.cameraBasePos = new THREE.Vector3(0, 1.65, 1.2);
        this.cameraLookTarget = new THREE.Vector3(0, 0.9, -2);

        this._init();
    }

    _init() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x6ec6ff);

        // Subtle fog
        this.scene.fog = new THREE.Fog(0x6ec6ff, 12, 25);

        // FIRST-PERSON Camera — standing behind the counter
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.05,
            50
        );
        this.camera.position.copy(this.cameraBasePos);
        this.camera.lookAt(this.cameraLookTarget);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.3;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.container.appendChild(this.renderer.domElement);

        // Mouse look (subtle head movement)
        this.container.addEventListener('mousemove', (e) => {
            this.mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
            this.mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
        });

        // Build the world
        this._setupLighting();
        this._buildStore();
        this._buildCounter();
        this._buildRegister();
        this._buildScanner();
        this._defineQueuePositions();

        // Preload GLB models
        this._preloadModels();

        // Resize
        window.addEventListener('resize', () => this._onResize());

        // Start
        this._animate();
    }

    // ===== LIGHTING (improved) =====
    _setupLighting() {
        // Warm ambient — interior store feel
        const ambient = new THREE.AmbientLight(0xffeedd, 0.5);
        this.scene.add(ambient);

        // Hemisphere light — sky blue from above, warm ground bounce
        const hemi = new THREE.HemisphereLight(0x87ceeb, 0xdeb887, 0.4);
        this.scene.add(hemi);

        // Main directional (overhead fluorescent feel)
        const main = new THREE.DirectionalLight(0xfff8f0, 1.0);
        main.position.set(2, 8, 3);
        main.castShadow = true;
        main.shadow.mapSize.width = 2048;
        main.shadow.mapSize.height = 2048;
        main.shadow.camera.near = 0.5;
        main.shadow.camera.far = 20;
        main.shadow.camera.left = -8;
        main.shadow.camera.right = 8;
        main.shadow.camera.top = 8;
        main.shadow.camera.bottom = -8;
        main.shadow.bias = -0.001;
        this.scene.add(main);

        // Fill from the side (window light)
        const fill = new THREE.DirectionalLight(0xaaddff, 0.3);
        fill.position.set(-4, 4, 1);
        this.scene.add(fill);

        // Warm overhead spot on register area
        const registerSpot = new THREE.SpotLight(0xffd166, 0.8, 6, Math.PI / 6, 0.5, 1);
        registerSpot.position.set(1.5, 3.5, 0.5);
        registerSpot.target.position.set(1.5, 0, 0.5);
        this.scene.add(registerSpot);
        this.scene.add(registerSpot.target);

        // Ceiling lights (decorative glowing panels)
        for (let x = -2; x <= 2; x += 4) {
            const lightPanel = new THREE.Mesh(
                new THREE.BoxGeometry(1.5, 0.05, 0.5),
                new THREE.MeshBasicMaterial({ color: 0xfff8e1 })
            );
            lightPanel.position.set(x, 3.98, -1);
            this.scene.add(lightPanel);

            const panelLight = new THREE.PointLight(0xfff5e6, 0.3, 5, 2);
            panelLight.position.set(x, 3.8, -1);
            this.scene.add(panelLight);
        }
    }

    // ===== STORE ENVIRONMENT =====
    _buildStore() {
        // FLOOR — polished tile pattern
        const floorGeo = new THREE.PlaneGeometry(16, 16);
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0xf5e6ca,
            roughness: 0.4,
            metalness: 0.05,
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Checkerboard tiles
        const tileColors = [0xe8d5b0, 0xf5e6ca];
        for (let x = -6; x < 6; x++) {
            for (let z = -4; z < 8; z++) {
                const color = tileColors[(x + z + 20) % 2];
                const tile = new THREE.Mesh(
                    new THREE.PlaneGeometry(1, 1),
                    new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.02 })
                );
                tile.rotation.x = -Math.PI / 2;
                tile.position.set(x + 0.5, 0.002, z + 0.5);
                tile.receiveShadow = true;
                this.scene.add(tile);
            }
        }

        // WALLS
        // Back wall (behind customers)
        this._addWall(0, 2, -5, 16, 4, 0);
        // Left wall
        this._addWall(-8, 2, 0, 0.2, 4, 16);
        // Right wall
        this._addWall(8, 2, 0, 0.2, 4, 16);
        // Ceiling
        const ceiling = new THREE.Mesh(
            new THREE.PlaneGeometry(16, 16),
            new THREE.MeshStandardMaterial({ color: 0xfaf8f5, roughness: 0.9 })
        );
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.y = 4;
        this.scene.add(ceiling);

        // SHELVING UNITS (behind the customers, along back wall)
        this._buildShelvingUnit(-4, -4.5);
        this._buildShelvingUnit(-1, -4.5);
        this._buildShelvingUnit(2, -4.5);
        this._buildShelvingUnit(5, -4.5);

        // Side shelves
        this._buildSideShelf(-5, -2);
        this._buildSideShelf(-5, 0);

        // EXIT sign
        this._buildExitSign(5, 3.3, -4.8);

        // Floor mat (in front of counter)
        const mat = new THREE.Mesh(
            new THREE.PlaneGeometry(3, 1.5),
            new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.9 })
        );
        mat.rotation.x = -Math.PI / 2;
        mat.position.set(0, 0.003, -1.5);
        this.scene.add(mat);

        // Shopping baskets stack (decorative, near entrance)
        this._buildBasketStack(4.5, -3.5);

        // Potted plant
        this._buildPlant(-3.5, 2.5);
    }

    _addWall(x, y, z, w, h, d) {
        const wall = new THREE.Mesh(
            new THREE.BoxGeometry(w || 0.2, h, d || 0.2),
            new THREE.MeshStandardMaterial({ color: 0xfaf3e0, roughness: 0.85 })
        );
        wall.position.set(x, y, z);
        wall.receiveShadow = true;
        this.scene.add(wall);
    }

    _buildShelvingUnit(x, z) {
        const unitGroup = new THREE.Group();
        const shelfMat = new THREE.MeshStandardMaterial({ color: 0xb08968, roughness: 0.6 });

        // Uprights
        for (const side of [-0.9, 0.9]) {
            const upright = new THREE.Mesh(
                new THREE.BoxGeometry(0.06, 2.8, 0.45),
                shelfMat
            );
            upright.position.set(side, 1.4, 0);
            upright.castShadow = true;
            unitGroup.add(upright);
        }

        // Shelves
        for (let y = 0.5; y <= 2.5; y += 0.65) {
            const shelf = new THREE.Mesh(
                new THREE.BoxGeometry(1.9, 0.06, 0.45),
                shelfMat
            );
            shelf.position.set(0, y, 0);
            shelf.castShadow = true;
            shelf.receiveShadow = true;
            unitGroup.add(shelf);

            // Products on shelf
            const prodColors = [0xe63946, 0x457b9d, 0x2a9d8f, 0xf4a261, 0xe76f51, 0x7b2cbf, 0x06d6a0, 0xffd166];
            const numProducts = 3 + Math.floor(Math.random() * 3);
            for (let p = 0; p < numProducts; p++) {
                const pColor = prodColors[Math.floor(Math.random() * prodColors.length)];
                const h = 0.12 + Math.random() * 0.15;
                const w = 0.08 + Math.random() * 0.1;
                const isRound = Math.random() > 0.6;
                const geo = isRound
                    ? new THREE.CylinderGeometry(w * 0.5, w * 0.5, h, 8)
                    : new THREE.BoxGeometry(w, h, w);
                const prod = new THREE.Mesh(geo,
                    new THREE.MeshStandardMaterial({ color: pColor, roughness: 0.5 })
                );
                prod.position.set(-0.6 + p * 0.35 + Math.random() * 0.1, y + 0.03 + h / 2, Math.random() * 0.1 - 0.05);
                prod.castShadow = true;
                unitGroup.add(prod);
            }
        }

        unitGroup.position.set(x, 0, z);
        this.scene.add(unitGroup);
    }

    _buildSideShelf(x, z) {
        const group = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0xb08968, roughness: 0.6 });

        // Small shelf unit rotated to face right
        for (let y = 0.8; y <= 1.8; y += 0.5) {
            const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 1.2), mat);
            shelf.position.set(0, y, 0);
            group.add(shelf);
        }
        // Uprights
        for (const dz of [-0.55, 0.55]) {
            const up = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2, 0.04), mat);
            up.position.set(0, 1, dz);
            group.add(up);
        }

        group.position.set(x, 0, z);
        this.scene.add(group);
    }

    _buildExitSign(x, y, z) {
        const sign = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 0.3, 0.05),
            new THREE.MeshStandardMaterial({
                color: 0x00c853,
                emissive: 0x00c853,
                emissiveIntensity: 0.5,
                roughness: 0.3,
            })
        );
        sign.position.set(x, y, z);
        this.scene.add(sign);
    }

    _buildBasketStack(x, z) {
        for (let i = 0; i < 3; i++) {
            const basket = new THREE.Mesh(
                new THREE.BoxGeometry(0.5, 0.15, 0.35),
                new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.6 })
            );
            basket.position.set(x, 0.08 + i * 0.16, z);
            basket.rotation.y = Math.random() * 0.2 - 0.1;
            basket.castShadow = true;
            this.scene.add(basket);
        }
    }

    _buildPlant(x, z) {
        // Pot
        const pot = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15, 0.12, 0.3, 8),
            new THREE.MeshStandardMaterial({ color: 0xbc6c25, roughness: 0.7 })
        );
        pot.position.set(x, 0.15, z);
        pot.castShadow = true;
        this.scene.add(pot);

        // Leaves
        for (let i = 0; i < 5; i++) {
            const leaf = new THREE.Mesh(
                new THREE.SphereGeometry(0.12, 6, 4),
                new THREE.MeshStandardMaterial({ color: 0x38b000, roughness: 0.6 })
            );
            const angle = (i / 5) * Math.PI * 2;
            leaf.position.set(
                x + Math.cos(angle) * 0.08,
                0.4 + Math.random() * 0.15,
                z + Math.sin(angle) * 0.08
            );
            leaf.scale.set(1, 1.3, 1);
            this.scene.add(leaf);
        }
    }

    // ===== CHECKOUT COUNTER (first-person scale) =====
    _buildCounter() {
        const group = new THREE.Group();

        // Counter top — wide L-shaped checkout
        const topMat = new THREE.MeshStandardMaterial({
            color: 0xf0ebe0,
            roughness: 0.25,
            metalness: 0.02,
        });

        // Main counter section (in front of player)
        const mainTop = new THREE.Mesh(new THREE.BoxGeometry(4, 0.08, 0.9), topMat);
        mainTop.position.set(0, 0.92, 0);
        mainTop.castShadow = true;
        mainTop.receiveShadow = true;
        group.add(mainTop);

        // Counter body
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x90caf9, roughness: 0.6 });
        const body = new THREE.Mesh(new THREE.BoxGeometry(4, 0.92, 0.9), bodyMat);
        body.position.set(0, 0.46, 0);
        body.castShadow = true;
        group.add(body);

        // Conveyor belt (dark strip on counter)
        const belt = new THREE.Mesh(
            new THREE.BoxGeometry(2.5, 0.015, 0.45),
            new THREE.MeshStandardMaterial({ color: 0x2c2c2c, roughness: 0.4 })
        );
        belt.position.set(-0.5, 0.965, -0.15);
        group.add(belt);

        // Belt ridges
        for (let i = 0; i < 10; i++) {
            const ridge = new THREE.Mesh(
                new THREE.BoxGeometry(0.015, 0.018, 0.42),
                new THREE.MeshStandardMaterial({ color: 0x444444 })
            );
            ridge.position.set(-1.5 + i * 0.28, 0.968, -0.15);
            group.add(ridge);
        }

        // Item divider bar
        const divider = new THREE.Mesh(
            new THREE.BoxGeometry(0.05, 0.1, 0.9),
            new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.3, roughness: 0.4 })
        );
        divider.position.set(0.9, 1.0, 0);
        group.add(divider);

        // Bags holder on our side
        const bagHolder = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.5, 0.3),
            new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.7 })
        );
        bagHolder.position.set(-1.8, 0.7, 0.3);
        group.add(bagHolder);

        // Paper bags on holder
        for (let i = 0; i < 2; i++) {
            const bag = new THREE.Mesh(
                new THREE.BoxGeometry(0.15, 0.35, 0.1),
                new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.8 })
            );
            bag.position.set(-1.8 + i * 0.17, 0.9 + 0.18, 0.3);
            group.add(bag);
        }

        this.counter = group;
        this.scene.add(group);
    }

    // ===== SCANNER =====
    _buildScanner() {
        const group = new THREE.Group();

        // Scanner base
        const base = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 0.04, 0.35),
            new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.3 })
        );
        base.position.y = 0.02;
        group.add(base);

        // Scanner upright
        const upright = new THREE.Mesh(
            new THREE.BoxGeometry(0.25, 0.35, 0.06),
            new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3 })
        );
        upright.position.set(0, 0.215, -0.15);
        group.add(upright);

        // Scanner glass (red glow)
        const glass = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.25, 0.02),
            new THREE.MeshStandardMaterial({
                color: 0xff0000,
                emissive: 0xff0000,
                emissiveIntensity: 0.3,
                roughness: 0.1,
                transparent: true,
                opacity: 0.8
            })
        );
        glass.position.set(0, 0.19, -0.11);
        group.add(glass);

        // Red scan light
        const scanLight = new THREE.PointLight(0xff3333, 0.3, 1.5, 2);
        scanLight.position.set(0, 0.2, -0.05);
        group.add(scanLight);
        this.scanLight = scanLight;

        group.position.set(0.4, 0.96, -0.1);
        this.scannerGroup = group;
        this.scene.add(group);
    }

    // ===== CASH REGISTER =====
    _buildRegister() {
        const group = new THREE.Group();

        // Main body (modern POS style)
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(0.55, 0.35, 0.4),
            new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.3, metalness: 0.15 })
        );
        body.position.y = 0.175;
        body.castShadow = true;
        group.add(body);

        // Screen (tilted towards player)
        const screen = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.28, 0.025),
            new THREE.MeshStandardMaterial({
                color: 0x66ff66,
                emissive: 0x33cc33,
                emissiveIntensity: 0.5,
                roughness: 0.1,
            })
        );
        screen.position.set(0, 0.4, 0.18);
        screen.rotation.x = -0.25;
        group.add(screen);
        this.registerScreen = screen;

        // Keypad buttons
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 3; c++) {
                const btn = new THREE.Mesh(
                    new THREE.BoxGeometry(0.06, 0.025, 0.06),
                    new THREE.MeshStandardMaterial({
                        color: r === 3 ? 0x06d6a0 : 0xdddddd,
                        roughness: 0.5
                    })
                );
                btn.position.set(-0.08 + c * 0.08, 0.36, -0.05 + r * 0.08);
                group.add(btn);
            }
        }

        // Cash drawer
        const drawer = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.08, 0.3),
            new THREE.MeshStandardMaterial({ color: 0x1a237e, roughness: 0.4 })
        );
        drawer.position.set(0, 0.04, 0.32);
        group.add(drawer);

        group.position.set(1.5, 0.96, 0.15);
        this.register = group;
        this.scene.add(group);
    }

    // ===== CUSTOMER QUEUE POSITIONS =====
    _defineQueuePositions() {
        // Position 0 = at the counter (active checkout)
        // Positions 1-4 = queue behind, going back toward the door
        this.queuePositions = [
            new THREE.Vector3(0, 0, -1.4),     // at counter
            new THREE.Vector3(0, 0, -2.6),     // 1st in queue
            new THREE.Vector3(0.15, 0, -3.6),  // 2nd
            new THREE.Vector3(-0.1, 0, -4.5),  // 3rd (near back wall)
        ];
    }

    // ===== BUILD A STYLED CHARACTER =====
    /**
     * Creates a chunky, Fall Guys–inspired character.
     * @param {Object} style — from CHARACTER_STYLES
     * @returns {THREE.Group}
     */
    _buildCharacter(style) {
        const char = new THREE.Group();
        char.userData.styleName = style.name;

        const bodyMat = new THREE.MeshStandardMaterial({ color: style.bodyColor, roughness: 0.5 });
        const headMat = new THREE.MeshStandardMaterial({ color: style.headColor, roughness: 0.45 });

        // ==== BODY — chunky bean shape ====
        // Torso (rounded cylinder)
        const torso = new THREE.Mesh(
            new THREE.CylinderGeometry(0.22, 0.26, 0.65, 12),
            bodyMat
        );
        torso.position.y = 0.55;
        torso.castShadow = true;
        char.add(torso);

        // ==== HEAD ====
        let head;
        if (style.headShape === 'box') {
            // Ghost/Robot box head
            head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.35, 0.3), headMat);
        } else if (style.headShape === 'tall') {
            // Carrot tall head
            head = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.55, 10), headMat);
        } else {
            // Round head
            head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), headMat);
        }
        head.position.y = 1.08;
        head.castShadow = true;
        char.add(head);

        // ==== EYES — big googly style ====
        const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const eyePupilMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

        if (style.eyeStyle === 'cutout') {
            // Ghost-style: holes in the head
            for (const sx of [-0.08, 0.08]) {
                const hole = new THREE.Mesh(
                    new THREE.SphereGeometry(0.055, 8, 6),
                    new THREE.MeshBasicMaterial({ color: 0x111111 })
                );
                hole.position.set(sx, 1.1, 0.16);
                char.add(hole);
            }
            // Jagged mouth
            const mouth = new THREE.Mesh(
                new THREE.BoxGeometry(0.15, 0.04, 0.05),
                new THREE.MeshBasicMaterial({ color: 0x111111 })
            );
            mouth.position.set(0, 0.97, 0.16);
            char.add(mouth);
        } else if (style.eyeStyle === 'stalk') {
            // Lobster stalked eyes
            for (const sx of [-0.1, 0.1]) {
                // Stalk
                const stalk = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.02, 0.02, 0.15, 6),
                    bodyMat
                );
                stalk.position.set(sx, 1.27, 0.05);
                char.add(stalk);
                // Eye ball
                const eyeBall = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), eyeWhiteMat);
                eyeBall.position.set(sx, 1.36, 0.05);
                char.add(eyeBall);
                const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), eyePupilMat);
                pupil.position.set(sx, 1.36, 0.1);
                char.add(pupil);
            }
        } else if (style.eyeStyle === 'big') {
            // Big googly eyes (like reference)
            for (const sx of [-0.09, 0.09]) {
                const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), eyeWhiteMat);
                eyeWhite.position.set(sx, 1.1, 0.17);
                char.add(eyeWhite);
                const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), eyePupilMat);
                pupil.position.set(sx, 1.11, 0.23);
                char.add(pupil);
            }
        } else {
            // Simple dot eyes
            for (const sx of [-0.07, 0.07]) {
                const dot = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), eyePupilMat);
                dot.position.set(sx, 1.1, 0.18);
                char.add(dot);
            }
        }

        // ==== HAT / ACCESSORY ====
        if (style.hatColor !== null) {
            if (style.name === 'Pirate Gal') {
                // Pirate hat
                const brim = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.22, 0.22, 0.03, 12),
                    new THREE.MeshStandardMaterial({ color: style.hatColor, roughness: 0.5 })
                );
                brim.position.set(0, 1.25, 0);
                char.add(brim);
                const crown = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.08, 0.15, 0.15, 8),
                    new THREE.MeshStandardMaterial({ color: style.hatColor, roughness: 0.5 })
                );
                crown.position.set(0, 1.35, 0);
                char.add(crown);
                // Skull emblem
                const skull = new THREE.Mesh(
                    new THREE.SphereGeometry(0.03, 6, 4),
                    new THREE.MeshBasicMaterial({ color: 0xffffff })
                );
                skull.position.set(0, 1.33, 0.13);
                char.add(skull);
            } else if (style.name === 'Graduate') {
                // Mortarboard
                const board = new THREE.Mesh(
                    new THREE.BoxGeometry(0.35, 0.025, 0.35),
                    new THREE.MeshStandardMaterial({ color: style.hatColor, roughness: 0.4 })
                );
                board.position.set(0, 1.28, 0);
                char.add(board);
                // Tassel
                const tassel = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.008, 0.008, 0.12, 4),
                    new THREE.MeshStandardMaterial({ color: style.accentColor })
                );
                tassel.position.set(0.12, 1.22, 0.12);
                char.add(tassel);
            } else if (style.name === 'Carrot Dude') {
                // Leaf top
                for (let i = 0; i < 3; i++) {
                    const leaf = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.01, 0.04, 0.2, 4),
                        new THREE.MeshStandardMaterial({ color: style.hatColor, roughness: 0.5 })
                    );
                    const angle = (i / 3) * Math.PI * 2;
                    leaf.position.set(Math.cos(angle) * 0.04, 1.42, Math.sin(angle) * 0.04);
                    leaf.rotation.x = Math.cos(angle) * 0.3;
                    leaf.rotation.z = Math.sin(angle) * 0.3;
                    char.add(leaf);
                }
            } else if (style.name === 'Chef') {
                // Chef hat
                const hatBase = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.18, 0.18, 0.04, 12),
                    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 })
                );
                hatBase.position.set(0, 1.27, 0);
                char.add(hatBase);
                const puff = new THREE.Mesh(
                    new THREE.SphereGeometry(0.16, 8, 6),
                    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 })
                );
                puff.position.set(0, 1.4, 0);
                char.add(puff);
            } else if (style.name === 'Robot') {
                // Antenna
                const antenna = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.015, 0.015, 0.2, 6),
                    new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.5, roughness: 0.3 })
                );
                antenna.position.set(0, 1.35, 0);
                char.add(antenna);
                const bulb = new THREE.Mesh(
                    new THREE.SphereGeometry(0.04, 8, 6),
                    new THREE.MeshStandardMaterial({
                        color: style.hatColor,
                        emissive: style.hatColor,
                        emissiveIntensity: 0.6
                    })
                );
                bulb.position.set(0, 1.47, 0);
                char.add(bulb);
            }
        }

        // ==== ARMS — stubby nubs ====
        for (const side of [-1, 1]) {
            const arm = new THREE.Mesh(
                new THREE.CylinderGeometry(0.055, 0.05, 0.25, 6),
                bodyMat
            );
            arm.position.set(side * 0.3, 0.6, 0);
            arm.rotation.z = side * 0.4;
            arm.castShadow = true;
            char.add(arm);

            // Hand (stubby sphere)
            const hand = new THREE.Mesh(
                new THREE.SphereGeometry(0.05, 6, 4),
                new THREE.MeshStandardMaterial({ color: style.headColor, roughness: 0.5 })
            );
            hand.position.set(side * 0.38, 0.45, 0);
            char.add(hand);
        }

        // ==== LEGS — short stumps ====
        for (const side of [-0.1, 0.1]) {
            const leg = new THREE.Mesh(
                new THREE.CylinderGeometry(0.07, 0.08, 0.2, 8),
                bodyMat
            );
            leg.position.set(side, 0.13, 0);
            leg.castShadow = true;
            char.add(leg);

            // Shoe
            const shoe = new THREE.Mesh(
                new THREE.BoxGeometry(0.1, 0.06, 0.15),
                new THREE.MeshStandardMaterial({
                    color: style.name === 'Ghost Kid' ? 0xbc6c25 : 0x333333,
                    roughness: 0.6
                })
            );
            shoe.position.set(side, 0.03, 0.02);
            char.add(shoe);
        }

        return char;
    }

    // ===== CUSTOMER QUEUE SYSTEM =====

    /**
     * Populate the queue with N customers.
     * @param {number} count — how many total customers (including active one)
     * @param {Array} customerDataArray — array of { customer } data per round
     */
    setupQueue(count) {
        // Clear existing
        this._clearAllCustomers();

        // Pick random styles (no duplicates adjacent)
        const styles = [];
        const pool = [...CHARACTER_STYLES];
        for (let i = 0; i < Math.min(count, this.queuePositions.length); i++) {
            const idx = Math.floor(Math.random() * pool.length);
            styles.push(pool[idx]);
        }

        // Build characters and place them
        styles.forEach((style, i) => {
            const char = this._buildCharacter(style);
            const pos = this.queuePositions[i];
            char.position.copy(pos);
            char.lookAt(new THREE.Vector3(0, 0, 2)); // face toward counter/player
            char.userData.queueIndex = i;
            this.scene.add(char);

            if (i === 0) {
                this.activeCustomer = char;
            } else {
                this.customerQueue.push(char);
            }
        });
    }

    /**
     * Advance the queue: remove active customer (walk away), move next one up.
     * Returns a promise that resolves when animation completes.
     */
    advanceQueue() {
        return new Promise((resolve) => {
            // Slide active customer to the side (they leave)
            if (this.activeCustomer) {
                const leaving = this.activeCustomer;
                this._animateObject(leaving, { x: -4, z: leaving.position.z }, 600, () => {
                    this.scene.remove(leaving);
                    leaving.traverse(c => {
                        if (c.geometry) c.geometry.dispose();
                        if (c.material) c.material.dispose();
                    });
                });
            }

            this.activeCustomer = null;

            if (this.customerQueue.length === 0) {
                resolve();
                return;
            }

            // Move everyone forward one position
            setTimeout(() => {
                const nextActive = this.customerQueue.shift();
                this.activeCustomer = nextActive;

                // Animate all queue members forward
                const allChars = [nextActive, ...this.customerQueue];
                allChars.forEach((char, i) => {
                    if (i < this.queuePositions.length) {
                        const target = this.queuePositions[i];
                        this._animateObject(char, { x: target.x, z: target.z }, 500);
                    }
                });

                setTimeout(resolve, 550);
            }, 300);
        });
    }

    /**
     * Add a new customer to the back of the queue.
     */
    addToQueue() {
        const allCount = (this.activeCustomer ? 1 : 0) + this.customerQueue.length;
        if (allCount >= this.queuePositions.length) return;

        const style = CHARACTER_STYLES[Math.floor(Math.random() * CHARACTER_STYLES.length)];
        const char = this._buildCharacter(style);
        const posIdx = allCount;
        if (posIdx < this.queuePositions.length) {
            const startPos = this.queuePositions[posIdx].clone();
            startPos.x += 3; // enter from right
            char.position.copy(startPos);
            char.lookAt(new THREE.Vector3(0, 0, 2));
            this.scene.add(char);
            this.customerQueue.push(char);
            // Animate walking in
            this._animateObject(char, {
                x: this.queuePositions[posIdx].x,
                z: this.queuePositions[posIdx].z
            }, 600);
        }
    }

    _clearAllCustomers() {
        const all = [...this.customerQueue];
        if (this.activeCustomer) all.push(this.activeCustomer);
        all.forEach(c => {
            this.scene.remove(c);
            c.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        });
        this.customerQueue = [];
        this.activeCustomer = null;
    }

    _animateObject(obj, target, durationMs, onComplete) {
        const startX = obj.position.x;
        const startZ = obj.position.z;
        const dx = (target.x !== undefined ? target.x : startX) - startX;
        const dz = (target.z !== undefined ? target.z : startZ) - startZ;
        const startTime = performance.now();

        const tick = () => {
            const elapsed = performance.now() - startTime;
            const t = Math.min(elapsed / durationMs, 1);
            // Ease out cubic
            const ease = 1 - Math.pow(1 - t, 3);
            obj.position.x = startX + dx * ease;
            obj.position.z = startZ + dz * ease;

            if (t < 1) {
                requestAnimationFrame(tick);
            } else if (onComplete) {
                onComplete();
            }
        };
        requestAnimationFrame(tick);
    }

    // ===== GROCERY ITEMS ON COUNTER =====
    setItems(items) {
        this.clearItems();

        items.forEach((item, i) => {
            const group = new THREE.Group();

            // Check if we have a GLB for this item
            const modelKey = item.name.toLowerCase();
            if (this.loadedModels[modelKey]) {
                const model = this.loadedModels[modelKey].clone();
                model.scale.setScalar(0.15);
                model.castShadow = true;
                group.add(model);
            } else {
                // Fallback procedural shapes (improved)
                let geo;
                const shape = modelKey;
                if (['apple', 'tomato'].includes(shape)) {
                    geo = new THREE.SphereGeometry(0.08, 12, 8);
                } else if (['grapes'].includes(shape)) {
                    // Cluster of small spheres
                    for (let g = 0; g < 6; g++) {
                        const grape = new THREE.Mesh(
                            new THREE.SphereGeometry(0.03, 8, 6),
                            new THREE.MeshStandardMaterial({ color: item.color, roughness: 0.4 })
                        );
                        grape.position.set(
                            (Math.random() - 0.5) * 0.06,
                            g * 0.02,
                            (Math.random() - 0.5) * 0.06
                        );
                        grape.castShadow = true;
                        group.add(grape);
                    }
                    geo = null;
                } else if (['milk', 'juice'].includes(shape)) {
                    geo = new THREE.BoxGeometry(0.08, 0.18, 0.08);
                } else if (['bread'].includes(shape)) {
                    geo = new THREE.BoxGeometry(0.15, 0.08, 0.1);
                } else if (['banana', 'carrot'].includes(shape)) {
                    geo = new THREE.CylinderGeometry(0.02, 0.04, 0.15, 8);
                } else if (['egg'].includes(shape)) {
                    geo = new THREE.SphereGeometry(0.04, 8, 6);
                } else if (['cheese'].includes(shape)) {
                    // Wedge shape
                    geo = new THREE.CylinderGeometry(0.02, 0.07, 0.06, 3);
                } else if (['cookie', 'donut'].includes(shape)) {
                    geo = new THREE.TorusGeometry(0.04, 0.015, 8, 12);
                } else if (['pizza'].includes(shape)) {
                    geo = new THREE.CylinderGeometry(0.02, 0.1, 0.04, 3);
                } else if (['watermelon'].includes(shape)) {
                    geo = new THREE.SphereGeometry(0.1, 10, 8);
                } else if (['candy'].includes(shape)) {
                    geo = new THREE.SphereGeometry(0.035, 8, 6);
                } else {
                    geo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
                }

                if (geo) {
                    const mat = new THREE.MeshStandardMaterial({
                        color: item.color,
                        roughness: 0.45,
                    });
                    const mesh = new THREE.Mesh(geo, mat);
                    mesh.castShadow = true;
                    group.add(mesh);
                }
            }

            // Position on conveyor belt
            const spacing = 0.35;
            const startX = -1.2;
            group.position.set(startX + i * spacing, 1.02, -0.15);

            this.itemMeshes.push(group);
            this.scene.add(group);
        });
    }

    clearItems() {
        this.itemMeshes.forEach(m => {
            this.scene.remove(m);
            m.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        });
        this.itemMeshes = [];
    }

    // ===== PRELOAD GLB MODELS =====
    _preloadModels() {
        const models = {
            apple: 'Assets/3d Models /Items/RedApple.glb',
        };

        Object.entries(models).forEach(([key, path]) => {
            this.gltfLoader.load(
                path,
                (gltf) => {
                    const model = gltf.scene;
                    model.traverse(child => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });
                    this.loadedModels[key] = model;
                    console.log(`Loaded model: ${key}`);
                },
                undefined,
                (err) => console.warn(`Could not load model ${key}:`, err)
            );
        });
    }

    // ===== REGISTER FEEDBACK =====
    flashRegister(correct) {
        if (!this.registerScreen) return;
        const flashColor = correct ? 0x00ff88 : 0xff3333;
        this.registerScreen.material.emissive.setHex(flashColor);
        this.registerScreen.material.emissiveIntensity = 1.2;
        setTimeout(() => {
            this.registerScreen.material.emissive.setHex(0x33cc33);
            this.registerScreen.material.emissiveIntensity = 0.5;
        }, 500);
    }

    // Scanner flash
    flashScanner() {
        if (!this.scanLight) return;
        this.scanLight.intensity = 1.5;
        setTimeout(() => { this.scanLight.intensity = 0.3; }, 300);
    }

    // ===== CUSTOMER REACTIONS =====
    customerReact(correct) {
        if (!this.activeCustomer) return;
        const char = this.activeCustomer;

        if (correct) {
            // Happy bounce
            const startY = char.position.y;
            let elapsed = 0;
            const bounce = () => {
                elapsed += 16;
                if (elapsed > 600) { char.position.y = startY; return; }
                char.position.y = startY + Math.sin(elapsed / 80 * Math.PI) * 0.12;
                requestAnimationFrame(bounce);
            };
            bounce();
        } else {
            // Sad shake
            const startX = char.position.x;
            let elapsed = 0;
            const shake = () => {
                elapsed += 16;
                if (elapsed > 400) { char.position.x = startX; return; }
                char.position.x = startX + Math.sin(elapsed / 25 * Math.PI) * 0.06;
                requestAnimationFrame(shake);
            };
            shake();
        }
    }

    // ===== ANIMATION LOOP =====
    _animate() {
        this.animationId = requestAnimationFrame(() => this._animate());
        const elapsed = this.clock.getElapsedTime();

        // Subtle first-person head sway (mouse-based)
        const targetX = this.cameraBasePos.x + this.mouseX * 0.3;
        const targetY = this.cameraBasePos.y + this.mouseY * -0.1;
        this.camera.position.x += (targetX - this.camera.position.x) * 0.05;
        this.camera.position.y += (targetY - this.camera.position.y) * 0.05;

        // Look target follows mouse too
        const lookX = this.cameraLookTarget.x + this.mouseX * 0.5;
        const lookY = this.cameraLookTarget.y + this.mouseY * -0.15;
        this.camera.lookAt(lookX, lookY, this.cameraLookTarget.z);

        // Breathing sway
        this.camera.position.y += Math.sin(elapsed * 1.2) * 0.005;

        // Customer idle animations
        if (this.activeCustomer) {
            this.activeCustomer.position.y = Math.sin(elapsed * 1.8) * 0.015;
        }
        this.customerQueue.forEach((char, i) => {
            char.position.y = Math.sin(elapsed * 1.5 + i * 0.7) * 0.01;
        });

        // Items gentle hover
        this.itemMeshes.forEach((item, i) => {
            item.position.y = 1.02 + Math.sin(elapsed * 2.5 + i * 0.8) * 0.008;
        });

        // Scanner pulse
        if (this.scanLight) {
            this.scanLight.intensity = 0.2 + Math.sin(elapsed * 3) * 0.1;
        }

        this.renderer.render(this.scene, this.camera);
    }

    _onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    dispose() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        this._clearAllCustomers();
        this.clearItems();
        this.renderer.dispose();
        if (this.renderer.domElement.parentNode) {
            this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
    }
}
