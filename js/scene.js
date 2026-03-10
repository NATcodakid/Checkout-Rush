/**
 * scene.js — Checkout Rush 3D scene.
 *
 * First-person perspective with raycaster item pickup & scanning.
 * Detailed "Fall Guys" style characters with arms, legs, shoes, hats.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// ===== CHARACTER STYLES (matching reference image) =====
const CHARACTER_STYLES = [
    {
        name: 'Ghost Kid', bodyColor: 0xf4d35e, headColor: 0xffffff,
        headShape: 'box', hatType: null, eyeStyle: 'cutout',
        shoeColor: 0x8B4513, legColor: 0x4169E1, armColor: 0xf4d35e
    },
    {
        name: 'Pirate Gal', bodyColor: 0x48cae4, headColor: 0xe8c9a0,
        headShape: 'round', hatType: 'pirate', eyeStyle: 'dot',
        shoeColor: 0x8B4513, legColor: 0x48cae4, armColor: 0x48cae4
    },
    {
        name: 'Carrot Dude', bodyColor: 0xfb8500, headColor: 0xfb8500,
        headShape: 'tall', hatType: 'leaves', eyeStyle: 'big',
        shoeColor: 0x654321, legColor: 0xfb8500, armColor: 0xfb8500
    },
    {
        name: 'Lobster', bodyColor: 0xe63946, headColor: 0xe63946,
        headShape: 'round', hatType: 'antennae', eyeStyle: 'stalk',
        shoeColor: 0xe63946, legColor: 0xe63946, armColor: 0xe63946
    },
    {
        name: 'Graduate', bodyColor: 0x333333, headColor: 0xdeb887,
        headShape: 'round', hatType: 'gradcap', eyeStyle: 'dot',
        shoeColor: 0x222222, legColor: 0x333333, armColor: 0x333333
    },
    {
        name: 'Alien', bodyColor: 0x06d6a0, headColor: 0x80ffdb,
        headShape: 'round', hatType: null, eyeStyle: 'big',
        shoeColor: 0x555555, legColor: 0x06d6a0, armColor: 0x06d6a0
    },
    {
        name: 'Chef', bodyColor: 0xffffff, headColor: 0xf4d6b0,
        headShape: 'round', hatType: 'chef', eyeStyle: 'dot',
        shoeColor: 0x111111, legColor: 0xffffff, armColor: 0xffffff
    },
    {
        name: 'Robot', bodyColor: 0x90a4ae, headColor: 0xb0bec5,
        headShape: 'box', hatType: 'antenna', eyeStyle: 'big',
        shoeColor: 0x555555, legColor: 0x90a4ae, armColor: 0x90a4ae
    },
];

export class CheckoutScene {
    constructor(container, onScanCallback) {
        this.container = container;
        this.onScan = onScanCallback;

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = new THREE.Clock();
        this.loadingManager = new THREE.LoadingManager();
        this.loadingManager.onLoad = () => {
            if (this.onModelsLoaded) this.onModelsLoaded();
        };
        this.gltfLoader = new GLTFLoader(this.loadingManager);

        // Interaction
        this.raycaster = new THREE.Raycaster();
        this.mouseVec = new THREE.Vector2();
        this.scanning = false; // Lock during scan animation

        // Object groups
        this.counter = null;
        this.scannerGroup = null;
        this.scannerHitbox = null;
        this.scanLight = null;
        this.registerScreen = null;
        this.itemMeshes = [];
        this.baggedMeshes = [];

        // Customer queue
        this.customerQueue = [];
        this.activeCustomer = null;
        this.queuePositions = [];

        // Models
        this.loadedModels = {};
        this.registerModel = null;

        // Patience bar
        this.patienceBar = null;
        this.patienceBarFill = null;
        this.patienceMax = 0;
        this.patienceCurrent = 0;

        // Customer animation
        this.customerIdleTime = 0;

        // Animation
        this.animationId = null;
        this.mouseX = 0;
        this.mouseY = 0;
        this.cameraBasePos = new THREE.Vector3(0, 1.6, 1.4);
        this.cameraLookTarget = new THREE.Vector3(0, 0.95, -1);

        this._init();
    }

    waitForLoad() {
        return new Promise(resolve => {
            if (Object.keys(this.loadedModels).length > 0) return resolve();
            this.onModelsLoaded = resolve;
            setTimeout(resolve, 3000); // 3s safety fallback
        });
    }

    _init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb);
        this.scene.fog = new THREE.Fog(0x87ceeb, 12, 30);

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.05, 50);
        this.camera.position.copy(this.cameraBasePos);
        this.camera.lookAt(this.cameraLookTarget);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.container.appendChild(this.renderer.domElement);

        // Stunning PBR lighting using PMREM environment
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

        this.container.addEventListener('mousemove', (e) => {
            this.mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
            this.mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
        });
        this.container.addEventListener('click', (e) => this._onClick(e));

        this._setupLighting();
        this._buildStore();
        this._buildCounter();
        this._buildScanner();
        this._buildRegister();
        this._defineQueuePositions();
        this._preloadModels();

        window.addEventListener('resize', () => this._onResize());
        this._animate();
    }

    // ===== LIGHTING =====
    _setupLighting() {
        // Subtle ambient from environment. Let PMREM handle most of the work.
        this.scene.add(new THREE.HemisphereLight(0x87ceeb, 0xf0e0c8, 0.2));

        // Main directional (sun) — toned down due to environment map
        const sun = new THREE.DirectionalLight(0xfff8f0, 1.2);
        sun.position.set(3, 8, 4);
        sun.castShadow = true;
        sun.shadow.mapSize.set(4096, 4096);
        sun.shadow.camera.near = 0.5;
        sun.shadow.camera.far = 20;
        sun.shadow.camera.left = -6;
        sun.shadow.camera.right = 6;
        sun.shadow.camera.top = 6;
        sun.shadow.camera.bottom = -6;
        sun.shadow.bias = -0.0005;
        this.scene.add(sun);

        // Fill from left
        const fill = new THREE.DirectionalLight(0xaaddff, 0.5);
        fill.position.set(-3, 4, 2);
        this.scene.add(fill);

        // Front fill (directly on counter items)
        const front = new THREE.DirectionalLight(0xfff0e0, 0.4);
        front.position.set(0, 3, 3);
        this.scene.add(front);

        // Rim/back light to separate characters from background
        const rim = new THREE.DirectionalLight(0xccddff, 0.3);
        rim.position.set(0, 5, -4);
        this.scene.add(rim);

        // Warm spot on counter
        const warm = new THREE.SpotLight(0xffd166, 0.7, 8, Math.PI / 4, 0.5, 1);
        warm.position.set(0, 4, 1);
        warm.target.position.set(0, 0.95, 0);
        this.scene.add(warm);
        this.scene.add(warm.target);

        // Overhead store lights (practical lighting feel)
        const overhead1 = new THREE.PointLight(0xfff5e0, 0.4, 10, 1.5);
        overhead1.position.set(-2, 3.5, -2);
        this.scene.add(overhead1);
        const overhead2 = new THREE.PointLight(0xfff5e0, 0.4, 10, 1.5);
        overhead2.position.set(2, 3.5, -2);
        this.scene.add(overhead2);
    }

    // ===== ENVIRONMENT =====
    _buildStore() {
        // Floor — warm tile
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(20, 20),
            new THREE.MeshStandardMaterial({ color: 0xf0e0c8, roughness: 0.75 })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Back wall
        const wallMat = new THREE.MeshStandardMaterial({ color: 0xfaf3e0, roughness: 0.9 });
        const back = new THREE.Mesh(new THREE.BoxGeometry(20, 5, 0.15), wallMat);
        back.position.set(0, 2.5, -4.5);
        back.receiveShadow = true;
        this.scene.add(back);

        // Side wall (left)
        const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 5, 20), wallMat);
        sideL.position.set(-5, 2.5, 0);
        this.scene.add(sideL);

        // Shelves are populated post-load via _populateShelves

        // Floor mat in front of counter
        const mat = new THREE.Mesh(
            new THREE.PlaneGeometry(2.5, 1.2),
            new THREE.MeshStandardMaterial({ color: 0x3a6b35, roughness: 0.9 })
        );
        mat.rotation.x = -Math.PI / 2;
        mat.position.set(0, 0.005, -1.5);
        this.scene.add(mat);
    }

    _populateShelves() {
        this._buildShelf(-2.5, -4.2);
        this._buildShelf(0, -4.2);
        this._buildShelf(2.5, -4.2);
    }

    _buildShelf(x, z) {
        const g = new THREE.Group();
        const wood = new THREE.MeshStandardMaterial({ color: 0xb08968, roughness: 0.8 });

        // Uprights
        for (const sx of [-0.8, 0.8]) {
            const u = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.6, 0.4), wood);
            u.position.set(sx, 1.3, 0);
            u.castShadow = true;
            g.add(u);
        }
        // Shelves + products
        for (let y = 0.4; y <= 2.4; y += 0.5) {
            const s = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.05, 0.4), wood);
            s.position.set(0, y, 0);
            s.castShadow = true;
            s.receiveShadow = true;
            g.add(s);

            // Populate shelf with actual food models (clone random keys)
            const keys = Object.keys(this.loadedModels);
            if (keys.length > 0) {
                // Determine item count based on shelf width
                const itemsCount = 4 + Math.floor(Math.random() * 3);
                for (let i = 0; i < itemsCount; i++) {
                    const randomKey = keys[Math.floor(Math.random() * keys.length)];
                    const model = this.loadedModels[randomKey].clone();
                    // Custom fallback scales for background items
                    const bgScales = {
                        apple: 0.1, banana: 0.15, bread: 0.12, beans: 0.12,
                        juice: 0.12, milk: 0.12, egg: 0.1, cheese: 0.15,
                        carrot: 0.1, cookie: 0.1, candy: 0.1, donut: 0.1,
                        tomato: 0.1, grapes: 0.1, watermelon: 0.2, pizza: 0.2
                    };
                    const s = bgScales[randomKey] || 0.1;
                    model.scale.setScalar(s * 0.8); // Slightly smaller on shelves

                    // Calculate bounding box after scale to sit perfectly flat on shelf Y
                    const box = new THREE.Box3().setFromObject(model);
                    const yOffset = y + 0.025 - box.min.y;

                    const shelfX = -0.7 + (1.4 / (itemsCount - 1)) * i;
                    const randomZ = (Math.random() - 0.5) * 0.1; // Slight depth variance
                    model.position.set(shelfX, yOffset, randomZ);
                    model.rotation.y = Math.random() * Math.PI;
                    // No shadows from items themselves to keep it cheap
                    model.traverse(c => { if (c.isMesh) { c.castShadow = false; c.receiveShadow = false; } });
                    g.add(model);
                }
            } else {
                // Fallback colored boxes if models aren't loaded yet
                for (let i = 0; i < 4; i++) {
                    const box = new THREE.Mesh(
                        new THREE.BoxGeometry(0.15, 0.2, 0.15),
                        new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(Math.random(), 0.7, 0.6), roughness: 0.4 })
                    );
                    box.position.set(-0.6 + i * 0.4, y + 0.12, 0);
                    g.add(box);
                }
            }
        }
        g.position.set(x, 0, z);
        this.scene.add(g);
    }

    // ===== COUNTER =====
    _buildCounter() {
        const g = new THREE.Group();
        const topMat = new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.35, metalness: 0.05 });
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x90caf9, roughness: 0.7 });

        // Body
        const body = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.9, 0.9), bodyMat);
        body.position.set(0, 0.45, 0);
        body.receiveShadow = true;
        g.add(body);

        // Countertop
        const top = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.07, 1.1), topMat);
        top.position.set(0, 0.92, 0);
        top.castShadow = true;
        top.receiveShadow = true;
        g.add(top);

        // Conveyor belt (center-left, where items go)
        const belt = new THREE.Mesh(
            new THREE.BoxGeometry(1.8, 0.02, 0.5),
            new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4 })
        );
        belt.position.set(-0.4, 0.96, 0);
        belt.receiveShadow = true;
        g.add(belt);

        // Belt side rails
        for (const sx of [-0.25, 0.25]) {
            const rail = new THREE.Mesh(
                new THREE.BoxGeometry(1.8, 0.03, 0.02),
                new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.5 })
            );
            rail.position.set(-0.4, 0.975, sx);
            g.add(rail);
        }

        this.counter = g;
        this.scene.add(g);
    }

    // ===== SCANNER =====
    _buildScanner() {
        const g = new THREE.Group();

        // Base
        const base = new THREE.Mesh(
            new THREE.BoxGeometry(0.45, 0.06, 0.45),
            new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.3 })
        );
        g.add(base);

        // Upright
        const upright = new THREE.Mesh(
            new THREE.BoxGeometry(0.35, 0.45, 0.08),
            new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
        );
        upright.position.set(0, 0.25, -0.17);
        g.add(upright);

        // Red scanner window
        const glass = new THREE.Mesh(
            new THREE.BoxGeometry(0.28, 0.32, 0.02),
            new THREE.MeshStandardMaterial({
                color: 0xff2222, emissive: 0x880000,
                emissiveIntensity: 0.6, transparent: true, opacity: 0.85
            })
        );
        glass.position.set(0, 0.25, -0.12);
        g.add(glass);

        // Glow ring around base (green "SCAN HERE" indicator)
        // Hidden by default; shown only during active item scanning
        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.32, 0.02, 8, 24),
            new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00cc66, emissiveIntensity: 0.8 })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.04;
        ring.visible = false; // hidden until items need scanning
        g.add(ring);
        this.scanRing = ring;

        // Large invisible hitbox for easy clicking
        this.scannerHitbox = new THREE.Mesh(
            new THREE.BoxGeometry(1.0, 0.7, 1.0),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        this.scannerHitbox.position.set(0, 0.25, 0);
        this.scannerHitbox.userData.isScanner = true;
        g.add(this.scannerHitbox);

        // Scan flash light
        this.scanLight = new THREE.PointLight(0xff2222, 0, 2.0);
        this.scanLight.position.set(0, 0.3, 0);
        g.add(this.scanLight);

        g.position.set(0.9, 0.96, 0);
        this.scannerGroup = g;
        this.scene.add(g);
    }

    // ===== REGISTER (at scanner position) =====
    _buildRegister() {
        // Build procedural fallback first (where scanner is)
        this._buildProceduralRegister();

        // Load GLB register at scanner position  
        this.gltfLoader.load('Assets/3d_Models/Register.glb', (gltf) => {
            const model = gltf.scene;

            // Auto-scale based on bounding box
            const box = new THREE.Box3().setFromObject(model);
            const size = new THREE.Vector3();
            box.getSize(size);
            const maxDim = Math.max(size.x, size.y, size.z);
            const targetHeight = 0.5; // desired height on counter
            const scale = targetHeight / maxDim;
            model.scale.setScalar(scale);

            // Position at scanner location (right side of counter)
            const center = new THREE.Vector3();
            box.getCenter(center);
            model.position.set(
                0.9 - center.x * scale,
                0.96 - box.min.y * scale,
                0 - center.z * scale
            );

            model.traverse(c => {
                if (c.isMesh) {
                    c.castShadow = true;
                    c.receiveShadow = true;
                    if (c.material) {
                        c.material.envMapIntensity = 2.0;
                        if (c.material.metalness > 0.5) c.material.metalness = 0.3;
                        c.material.needsUpdate = true;
                    }
                }
            });

            // Remove procedural register if GLB loaded
            if (this._proceduralRegister) {
                this.scene.remove(this._proceduralRegister);
                this._proceduralRegister = null;
            }

            this.registerModel = model;
            this.scene.add(model);
            console.log('[CR] Register GLB loaded at scanner pos, scale:', scale.toFixed(3));
        }, undefined, (err) => {
            console.warn('[CR] Register GLB failed, using procedural fallback', err);
        });
    }

    _buildProceduralRegister() {
        const g = new THREE.Group();
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(0.55, 0.35, 0.45),
            new THREE.MeshStandardMaterial({ color: 0x263238, metalness: 0.2 })
        );
        body.position.y = 0.175;
        body.castShadow = true;
        g.add(body);

        this.registerScreen = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.25, 0.02),
            new THREE.MeshStandardMaterial({ color: 0x55ee55, emissive: 0x33cc33, emissiveIntensity: 0.5 })
        );
        this.registerScreen.position.set(0, 0.42, 0.18);
        this.registerScreen.rotation.x = -0.25;
        g.add(this.registerScreen);

        g.position.set(0.9, 0.96, 0); // Same as scanner position
        this._proceduralRegister = g;
        this.scene.add(g);
    }

    // ===== WALLPAPER =====
    applyWallpaper(wallpaperConfig) {
        if (!wallpaperConfig) return;
        // Find back wall mesh
        this.scene.traverse(child => {
            if (child.isMesh && child.geometry?.parameters?.width === 20
                && child.geometry?.parameters?.height === 5
                && child.geometry?.parameters?.depth === 0.15) {
                // This is the back wall
                child.material.color.setHex(wallpaperConfig.color);
                child.material.needsUpdate = true;
            }
        });
        // Update floor mat color if provided
        if (wallpaperConfig.floorColor) {
            this.scene.traverse(child => {
                if (child.isMesh && child.geometry?.type === 'PlaneGeometry'
                    && child.geometry?.parameters?.width === 2.5
                    && child.geometry?.parameters?.height === 1.2) {
                    child.material.color.setHex(wallpaperConfig.floorColor);
                    child.material.needsUpdate = true;
                }
            });
        }
    }

    // ===== CHARACTERS =====
    _buildCharacter(style) {
        const char = new THREE.Group();

        // High-quality vinyl aesthetic for characters
        const bodyMat = new THREE.MeshStandardMaterial({ color: style.bodyColor, roughness: 0.3, metalness: 0.1 });
        const headMat = new THREE.MeshStandardMaterial({ color: style.headColor, roughness: 0.4, metalness: 0.05 });
        const shoeMat = new THREE.MeshStandardMaterial({ color: style.shoeColor, roughness: 0.7 });
        const legMat = new THREE.MeshStandardMaterial({ color: style.legColor, roughness: 0.6 });
        const armMat = new THREE.MeshStandardMaterial({ color: style.armColor, roughness: 0.3, metalness: 0.1 });
        const eyeWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const eyeBlack = new THREE.MeshBasicMaterial({ color: 0x111111 });

        // ---- LEGS + SHOES ----
        for (const sx of [-0.1, 0.1]) {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 8), legMat);
            leg.position.set(sx, 0.15, 0);
            leg.castShadow = true;
            char.add(leg);

            const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.15), shoeMat);
            shoe.position.set(sx, 0.04, 0.02);
            shoe.castShadow = true;
            char.add(shoe);
        }

        // ---- TORSO (chunky bean shape) ----
        const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.55, 12), bodyMat);
        torso.position.y = 0.58;
        torso.castShadow = true;
        char.add(torso);

        // ---- ARMS ----
        for (const side of [-1, 1]) {
            const armGroup = new THREE.Group();
            const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.35, 8), armMat);
            arm.position.y = -0.15;
            armGroup.add(arm);

            // Hand (small sphere)
            const hand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), headMat);
            hand.position.y = -0.33;
            armGroup.add(hand);

            armGroup.position.set(side * 0.27, 0.7, 0);
            armGroup.rotation.z = side * 0.3; // arms slightly out
            armGroup.rotation.x = 0.1; // slightly forward
            char.add(armGroup);
        }

        // ---- HEAD GROUP (for look-around animation) ----
        const headGroup = new THREE.Group();
        headGroup.position.y = 1.02;
        char.add(headGroup);

        let headMesh;
        if (style.headShape === 'box') {
            headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.3), headMat);
        } else if (style.headShape === 'tall') {
            headMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 0.55, 10), headMat);
        } else {
            headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), headMat);
        }
        headMesh.castShadow = true;
        headGroup.add(headMesh);

        // ---- EARS (on round/box heads) ----
        if (style.headShape === 'round' || style.headShape === 'box') {
            for (const sx of [-0.2, 0.2]) {
                const ear = new THREE.Mesh(
                    new THREE.SphereGeometry(0.045, 8, 6),
                    headMat
                );
                ear.position.set(sx, 0, 0);
                ear.scale.set(0.6, 1, 0.7);
                headGroup.add(ear);
            }
        }

        // ---- EYES ----
        const eyeY = style.headShape === 'tall' ? 0.06 : 0.02;
        const eyeZ = style.headShape === 'box' ? 0.16 : 0.17;

        if (style.eyeStyle === 'big') {
            for (const sx of [-0.08, 0.08]) {
                const w = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), eyeWhite);
                w.position.set(sx, eyeY, eyeZ);
                headGroup.add(w);
                const p = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), eyeBlack);
                p.position.set(sx, eyeY + 0.01, eyeZ + 0.05);
                headGroup.add(p);
                // Eyebrow
                const brow = new THREE.Mesh(
                    new THREE.BoxGeometry(0.08, 0.015, 0.01),
                    eyeBlack
                );
                brow.position.set(sx, eyeY + 0.07, eyeZ + 0.02);
                brow.rotation.z = sx > 0 ? -0.15 : 0.15;
                headGroup.add(brow);
            }
        } else if (style.eyeStyle === 'dot') {
            for (const sx of [-0.06, 0.06]) {
                const d = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), eyeBlack);
                d.position.set(sx, eyeY, eyeZ + 0.01);
                headGroup.add(d);
            }
        } else if (style.eyeStyle === 'cutout') {
            for (const sx of [-0.07, 0.07]) {
                const hole = new THREE.Mesh(
                    new THREE.CircleGeometry(0.04, 8),
                    eyeBlack
                );
                hole.position.set(sx, eyeY, eyeZ + 0.01);
                headGroup.add(hole);
            }
        } else if (style.eyeStyle === 'stalk') {
            for (const sx of [-0.1, 0.1]) {
                const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.15, 6), bodyMat);
                stalk.position.set(sx, 0.12, 0.05);
                headGroup.add(stalk);
                const eyeball = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), eyeWhite);
                eyeball.position.set(sx, 0.2, 0.05);
                headGroup.add(eyeball);
                const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), eyeBlack);
                pupil.position.set(sx, 0.21, 0.1);
                headGroup.add(pupil);
            }
        }

        // ---- MOUTH ----
        const mouthY = style.headShape === 'tall' ? -0.08 : -0.06;
        if (style.eyeStyle === 'cutout') {
            // Ghost wavy mouth
            const mouth = new THREE.Mesh(
                new THREE.BoxGeometry(0.12, 0.03, 0.01),
                eyeBlack
            );
            mouth.position.set(0, mouthY, eyeZ + 0.01);
            headGroup.add(mouth);
        } else if (style.eyeStyle === 'stalk') {
            // Lobster smile — wider
            const smile = new THREE.Mesh(
                new THREE.TorusGeometry(0.06, 0.012, 6, 10, Math.PI),
                eyeBlack
            );
            smile.position.set(0, mouthY - 0.03, 0.18);
            smile.rotation.x = Math.PI;
            headGroup.add(smile);
        } else {
            // Default smile arc
            const smile = new THREE.Mesh(
                new THREE.TorusGeometry(0.04, 0.01, 6, 10, Math.PI),
                eyeBlack
            );
            smile.position.set(0, mouthY, eyeZ + 0.01);
            smile.rotation.x = Math.PI;
            headGroup.add(smile);
        }

        // ---- BLUSH CHEEKS (round heads only) ----
        if (style.headShape === 'round' && style.eyeStyle !== 'stalk') {
            for (const sx of [-0.14, 0.14]) {
                const blush = new THREE.Mesh(
                    new THREE.CircleGeometry(0.035, 8),
                    new THREE.MeshBasicMaterial({ color: 0xff9999, transparent: true, opacity: 0.4 })
                );
                blush.position.set(sx, mouthY + 0.02, eyeZ - 0.01);
                headGroup.add(blush);
            }
        }

        // ---- NAME BADGE on torso ----
        const badge = new THREE.Mesh(
            new THREE.PlaneGeometry(0.15, 0.08),
            new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
        );
        badge.position.set(0.08, 0.65, 0.21);
        char.add(badge);

        // Store headGroup reference for animation
        char.userData.headGroup = headGroup;

        // ---- HATS / ACCESSORIES (local to headGroup) ----
        const hatY = style.headShape === 'tall' ? 0.30 : 0.20;

        if (style.hatType === 'pirate') {
            const brim = new THREE.Mesh(
                new THREE.CylinderGeometry(0.22, 0.22, 0.03, 12),
                new THREE.MeshStandardMaterial({ color: 0x1d3557 })
            );
            brim.position.set(0, hatY, 0);
            headGroup.add(brim);
            const crown = new THREE.Mesh(
                new THREE.CylinderGeometry(0.12, 0.16, 0.12, 8),
                new THREE.MeshStandardMaterial({ color: 0x1d3557 })
            );
            crown.position.set(0, hatY + 0.08, 0);
            headGroup.add(crown);
            const skull = new THREE.Mesh(
                new THREE.SphereGeometry(0.03, 6, 4),
                eyeWhite
            );
            skull.position.set(0, hatY + 0.08, 0.13);
            headGroup.add(skull);
        } else if (style.hatType === 'chef') {
            const chefHat = new THREE.Mesh(
                new THREE.CylinderGeometry(0.18, 0.15, 0.25, 10),
                new THREE.MeshStandardMaterial({ color: 0xffffff })
            );
            chefHat.position.set(0, hatY + 0.1, 0);
            headGroup.add(chefHat);
            const puff = new THREE.Mesh(
                new THREE.SphereGeometry(0.2, 10, 8),
                new THREE.MeshStandardMaterial({ color: 0xffffff })
            );
            puff.position.set(0, hatY + 0.25, 0);
            headGroup.add(puff);
        } else if (style.hatType === 'gradcap') {
            const board = new THREE.Mesh(
                new THREE.BoxGeometry(0.35, 0.02, 0.35),
                new THREE.MeshStandardMaterial({ color: 0x222222 })
            );
            board.position.set(0, hatY + 0.02, 0);
            headGroup.add(board);
            const tassel = new THREE.Mesh(
                new THREE.CylinderGeometry(0.01, 0.01, 0.12, 4),
                new THREE.MeshStandardMaterial({ color: 0xffd166 })
            );
            tassel.position.set(0.15, hatY - 0.04, 0.15);
            headGroup.add(tassel);
        } else if (style.hatType === 'leaves') {
            for (let i = 0; i < 3; i++) {
                const leaf = new THREE.Mesh(
                    new THREE.ConeGeometry(0.04, 0.3, 4),
                    new THREE.MeshStandardMaterial({ color: 0x38b000 })
                );
                leaf.position.set((i - 1) * 0.06, hatY + 0.2, 0);
                leaf.rotation.z = (i - 1) * 0.3;
                headGroup.add(leaf);
            }
        } else if (style.hatType === 'antennae') {
            for (const sx of [-0.08, 0.08]) {
                const ant = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.01, 0.015, 0.25, 4),
                    new THREE.MeshStandardMaterial({ color: 0xff4444 })
                );
                ant.position.set(sx, hatY + 0.12, 0);
                ant.rotation.z = sx > 0 ? -0.3 : 0.3;
                headGroup.add(ant);
            }
        } else if (style.hatType === 'antenna') {
            const pole = new THREE.Mesh(
                new THREE.CylinderGeometry(0.015, 0.015, 0.15, 6),
                new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.5 })
            );
            pole.position.set(0, hatY + 0.08, 0);
            headGroup.add(pole);
            const ball = new THREE.Mesh(
                new THREE.SphereGeometry(0.04, 8, 6),
                new THREE.MeshStandardMaterial({ color: 0xff6b35, emissive: 0xff3300, emissiveIntensity: 0.5 })
            );
            ball.position.set(0, hatY + 0.17, 0);
            headGroup.add(ball);
        }

        return char;
    }

    // ===== QUEUE =====
    _defineQueuePositions() {
        this.queuePositions = [
            new THREE.Vector3(0, 0, -1.5),    // Active — directly facing player
            new THREE.Vector3(2.0, 0, -1.5),   // Queue 1
            new THREE.Vector3(3.5, 0, -1.5),   // Queue 2
            new THREE.Vector3(5.0, 0, -1.5),   // Queue 3
        ];
    }

    setupQueue(count) {
        this.customerQueue.forEach(c => this.scene.remove(c));
        if (this.activeCustomer) this.scene.remove(this.activeCustomer);
        this.removePatienceBar();
        this.customerQueue = [];
        this.activeCustomer = null;

        const cnt = Math.min(count, this.queuePositions.length);
        for (let i = 0; i < cnt; i++) {
            const style = CHARACTER_STYLES[Math.floor(Math.random() * CHARACTER_STYLES.length)];
            const char = this._buildCharacter(style);
            char.position.copy(this.queuePositions[i]);
            char.lookAt(new THREE.Vector3(char.position.x, 0, 2));

            if (i === 0) {
                char.lookAt(new THREE.Vector3(0, 0, 1.4));
                this.activeCustomer = char;
                if (this.patienceMax > 0) this._createPatienceBar(char);
            } else {
                this.customerQueue.push(char);
            }
            this.scene.add(char);
        }
    }

    advanceQueue() {
        return new Promise((resolve) => {
            if (this.activeCustomer) {
                const leaving = this.activeCustomer;
                this._animateObj(leaving, { x: -5 }, 700, () => this.scene.remove(leaving));
            }
            this.activeCustomer = null;

            if (this.customerQueue.length === 0) { resolve(); return; }

            setTimeout(() => {
                this.activeCustomer = this.customerQueue.shift();
                this.activeCustomer.lookAt(new THREE.Vector3(0, 0, 1.4));

                // Add patience bar to new active customer
                this.removePatienceBar();
                if (this.patienceMax > 0) this._createPatienceBar(this.activeCustomer);
                this.patienceCurrent = this.patienceMax;

                const all = [this.activeCustomer, ...this.customerQueue];
                all.forEach((c, i) => {
                    if (this.queuePositions[i]) {
                        this._animateObj(c, { x: this.queuePositions[i].x, z: this.queuePositions[i].z }, 500);
                    }
                });
                setTimeout(resolve, 550);
            }, 350);
        });
    }

    addToQueue() {
        const cnt = (this.activeCustomer ? 1 : 0) + this.customerQueue.length;
        if (cnt >= this.queuePositions.length) return;
        const style = CHARACTER_STYLES[Math.floor(Math.random() * CHARACTER_STYLES.length)];
        const char = this._buildCharacter(style);
        const pos = this.queuePositions[cnt];
        char.position.set(pos.x + 3, 0, pos.z);
        char.lookAt(new THREE.Vector3(char.position.x, 0, 2));
        this.scene.add(char);
        this.customerQueue.push(char);
        this._animateObj(char, { x: pos.x }, 600);
    }

    // ===== ITEMS =====
    _preloadModels() {
        const models = {
            'apple': 'Assets/3d_Models/Items/RedApple.glb',
            'banana': 'Assets/3d_Models/Items/Banana.glb',
            'bread': 'Assets/3d_Models/Items/Bread.glb',
            'beans': 'Assets/3d_Models/Items/GreenBeancan.glb',
            'juice': 'Assets/3d_Models/Items/Juice.glb',
            'milk': 'Assets/3d_Models/Items/Milk.glb',
            'egg': 'Assets/3d_Models/Items/Egg.glb',
            'cheese': 'Assets/3d_Models/Items/Cheese.glb',
            'carrot': 'Assets/3d_Models/Items/Carrot.glb',
            'cookie': 'Assets/3d_Models/Items/Cookie.glb',
            'candy': 'Assets/3d_Models/Items/Candy.glb',
            'donut': 'Assets/3d_Models/Items/Donut.glb',
            'tomato': 'Assets/3d_Models/Items/Tomato.glb',
            'grapes': 'Assets/3d_Models/Items/Grapes.glb',
            'watermelon': 'Assets/3d_Models/Items/Watermelon.glb',
            'pizza': 'Assets/3d_Models/Items/Pizza.glb',
        };
        // Per-model scales based on realistic physical proportions
        this.modelScales = {
            pizza: 0.30,        // Huge
            watermelon: 0.28,   // Huge
            banana: 0.22,       // Medium/Large
            milk: 0.18,         // Medium/Large
            bread: 0.18,        // Medium/Large
            juice: 0.14,        // Medium
            beans: 0.14,        // Medium
            apple: 0.11,        // Medium/Small
            tomato: 0.11,       // Medium/Small
            carrot: 0.22,       // Long (needs scale to match length)
            cheese: 0.12,       // Small
            donut: 0.12,        // Small
            grapes: 0.12,       // Small
            egg: 0.10,          // Very Small
            candy: 0.10,        // Very Small
            cookie: 0.09        // Tiny
        };
        for (const [key, path] of Object.entries(models)) {
            this.gltfLoader.load(path, (gltf) => {
                const m = gltf.scene;
                m.traverse(c => {
                    if (c.isMesh) {
                        c.castShadow = true;
                        c.receiveShadow = true;
                        // Fix dark GLBs: boost env map intensity, clamp metalness
                        if (c.material) {
                            c.material.envMapIntensity = 2.0;
                            if (c.material.metalness > 0.5) c.material.metalness = 0.3;
                            if (c.material.roughness < 0.2) c.material.roughness = 0.3;
                            c.material.needsUpdate = true;
                        }
                    }
                });
                this.loadedModels[key] = m;
            }, undefined, () => { /* silently skip missing models */ });
        }
    }

    setItems(items) {
        this.itemMeshes.forEach(m => this.scene.remove(m));
        this.baggedMeshes.forEach(m => this.scene.remove(m));
        this.itemMeshes = [];
        this.baggedMeshes = [];
        this.scanning = false;

        items.forEach((item, i) => {
            let mesh;
            const key = item.name.toLowerCase();
            const counterY = 0.96; // counter surface height

            if (this.loadedModels[key]) {
                mesh = this.loadedModels[key].clone();
                const s = (this.modelScales && this.modelScales[key]) || 0.15;
                mesh.scale.setScalar(s);

                // Auto-position Y so item sits ON counter (not through it)
                const box = new THREE.Box3().setFromObject(mesh);
                const yOffset = counterY - box.min.y + 0.01; // +0.01 tiny lift
                mesh.position.y = yOffset;
            } else {
                // Procedural shape based on color
                const geo = i % 3 === 0
                    ? new THREE.SphereGeometry(0.09, 10, 8)
                    : i % 3 === 1
                        ? new THREE.BoxGeometry(0.14, 0.14, 0.14)
                        : new THREE.CylinderGeometry(0.07, 0.07, 0.15, 8);
                mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: item.color, roughness: 0.45 }));
                mesh.position.y = 0.99;
            }
            mesh.castShadow = true;

            mesh.userData = { isItem: true, itemData: item, index: i, scanned: false };

            // Place on belt — centered in camera view
            const spacing = 0.35;
            const startX = -0.4 - ((items.length - 1) * spacing) / 2;
            mesh.position.x = startX + i * spacing;
            mesh.position.z = 0;
            mesh.rotation.y = Math.random() * Math.PI;

            // Invisible hitbox for easy clicking
            const hitbox = new THREE.Mesh(
                new THREE.BoxGeometry(0.35, 0.35, 0.35),
                new THREE.MeshBasicMaterial({ visible: false })
            );
            hitbox.userData = mesh.userData;
            mesh.add(hitbox);

            this.itemMeshes.push(mesh);
            this.scene.add(mesh);
        });
    }

    /**
     * Add a soft PointLight above each unscanned item so they
     * gently glow without touching GLB materials.
     * Also shows the scan ring as an additional cue.
     */
    highlightItems() {
        this._itemsHighlighted = true;
        if (this.scanRing) this.scanRing.visible = true;

        // Remove stale lights first
        this._clearItemLights();
        this._itemHighlightLights = [];

        this.itemMeshes.forEach((mesh) => {
            const light = new THREE.PointLight(0x44ffcc, 1.2, 0.8);
            light.position.set(
                mesh.position.x,
                mesh.position.y + 0.4,
                mesh.position.z
            );
            this.scene.add(light);
            this._itemHighlightLights.push({ light, mesh });
        });
    }

    /** Remove all item highlight lights. */
    clearHighlights() {
        this._itemsHighlighted = false;
        if (this.scanRing) this.scanRing.visible = false;
        this._clearItemLights();
    }

    _clearItemLights() {
        if (!this._itemHighlightLights) return;
        this._itemHighlightLights.forEach(({ light }) => this.scene.remove(light));
        this._itemHighlightLights = [];
    }

    // ===== INTERACTION — Single-click auto-scan =====
    _onClick(e) {
        if (e.target.tagName === 'BUTTON' || e.target.closest('.floating-receipt') || e.target.closest('.floating-payment')) return;
        if (this.scanning) return;

        this.mouseVec.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouseVec.y = -(e.clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouseVec, this.camera);

        // Raycast against all item meshes (recursive = true to hit children/hitboxes)
        const hits = this.raycaster.intersectObjects(this.itemMeshes, true);
        if (hits.length > 0) {
            // Walk up from hit to find the root mesh that's in itemMeshes[]
            let obj = hits[0].object;
            let rootItem = null;
            while (obj) {
                if (this.itemMeshes.includes(obj)) { rootItem = obj; break; }
                obj = obj.parent;
            }
            if (rootItem && rootItem.userData && rootItem.userData.isItem) {
                this._autoScan(rootItem);
            }
        }
    }

    _autoScan(mesh) {
        this.scanning = true;
        this.itemMeshes = this.itemMeshes.filter(m => m !== mesh);

        // Step 1: Animate item to scanner position (200ms)
        const scannerPos = this.scannerGroup.position;
        this._animateObj(mesh, { x: scannerPos.x, y: scannerPos.y + 0.15, z: scannerPos.z }, 200, () => {

            // Step 2: Flash scanner + notify game logic (after arriving)
            this.flashScanner();
            mesh.userData.scanned = true;
            if (this.onScan) this.onScan(mesh.userData.itemData, mesh.userData.index);

            // Pulse scan ring
            if (this.scanRing) {
                this.scanRing.material.emissiveIntensity = 2.0;
                setTimeout(() => { if (this.scanRing) this.scanRing.material.emissiveIntensity = 0.8; }, 400);
            }

            // Step 3: After brief pause, slide to bag area (300ms) and scale down
            setTimeout(() => {
                const bagX = 1.6 + Math.random() * 0.4;
                const bagZ = -0.2 + Math.random() * 0.3;
                this._animateObj(mesh, { x: bagX, y: 0.99, z: bagZ }, 300, () => {
                    this.scanning = false;
                });
                // Tween scale separately to simulate falling into a deep bag/box
                this._animateObj(mesh.scale, { x: 0.01, y: 0.01, z: 0.01 }, 300);

                this.baggedMeshes.push(mesh);
            }, 350);
        });
    }

    flashScanner() {
        if (!this.scanLight) return;
        this.scanLight.intensity = 2.0;
        setTimeout(() => { this.scanLight.intensity = 0; }, 250);
    }

    flashRegister(correct) {
        if (!this.registerScreen) return;
        this.registerScreen.material.emissive.setHex(correct ? 0x00ff88 : 0xff3333);
        this.registerScreen.material.emissiveIntensity = 2.0;
        setTimeout(() => {
            this.registerScreen.material.emissive.setHex(0x33cc33);
            this.registerScreen.material.emissiveIntensity = 0.5;
        }, 500);
    }

    // ===== PATIENCE BAR =====
    setPatienceMax(seconds) {
        this.patienceMax = seconds;
        this.patienceCurrent = seconds;
    }

    updatePatience(remaining) {
        this.patienceCurrent = remaining;
        if (!this.patienceBarFill) return;
        const pct = Math.max(0, remaining / this.patienceMax);
        this.patienceBarFill.scale.x = pct;
        this.patienceBarFill.position.x = -0.25 * (1 - pct);
        // Color: green → yellow → red
        const r = pct < 0.5 ? 1 : pct * 2 - 1 < 0 ? 1 : 2 - pct * 2;
        const g = pct > 0.5 ? 1 : pct * 2;
        this.patienceBarFill.material.color.setRGB(
            Math.min(1, 2 - pct * 2),
            Math.min(1, pct * 2),
            0.1
        );
    }

    removePatienceBar() {
        if (this.patienceBar) {
            if (this.patienceBar.parent) this.patienceBar.parent.remove(this.patienceBar);
            this.patienceBar = null;
            this.patienceBarFill = null;
        }
    }

    _createPatienceBar(char) {
        this.removePatienceBar();
        const barGroup = new THREE.Group();

        // Background (dark)
        const bgGeo = new THREE.PlaneGeometry(0.5, 0.06);
        const bgMat = new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
        const bg = new THREE.Mesh(bgGeo, bgMat);
        barGroup.add(bg);

        // Fill (green → red)
        const fillGeo = new THREE.PlaneGeometry(0.5, 0.05);
        const fillMat = new THREE.MeshBasicMaterial({ color: 0x06d6a0, side: THREE.DoubleSide });
        const fill = new THREE.Mesh(fillGeo, fillMat);
        fill.position.z = 0.001;
        barGroup.add(fill);

        // Position above head
        barGroup.position.set(0, 1.55, 0);
        char.add(barGroup);

        this.patienceBar = barGroup;
        this.patienceBarFill = fill;
    }

    customerReact(correct) {
        if (!this.activeCustomer) return;
        const c = this.activeCustomer;
        const startY = c.position.y;
        const startX = c.position.x;
        let t = 0;
        const anim = () => {
            t += 16;
            if (t > 500) { c.position.y = startY; c.position.x = startX; return; }
            if (correct) {
                c.position.y = startY + Math.sin(t / 80 * Math.PI) * 0.12;
            } else {
                c.position.x = startX + Math.sin(t / 30 * Math.PI) * 0.03;
            }
            requestAnimationFrame(anim);
        };
        anim();
    }

    // Angry customer stomp/shake when patience runs out
    customerAngry() {
        if (!this.activeCustomer) return;
        const c = this.activeCustomer;
        const startY = c.position.y;
        const startX = c.position.x;

        // Turn body red
        const originalColors = [];
        c.traverse(child => {
            if (child.isMesh && child.material && child.material.color) {
                originalColors.push({ mesh: child, color: child.material.color.getHex() });
                child.material.color.setHex(0xff2222);
            }
        });

        let t = 0;
        const angryAnim = () => {
            t += 16;
            if (t > 1500) {
                c.position.y = startY;
                c.position.x = startX;
                c.rotation.z = 0;
                // Restore original colors
                originalColors.forEach(({ mesh, color }) => {
                    mesh.material.color.setHex(color);
                });
                return;
            }
            // Violent shaking
            c.position.x = startX + Math.sin(t / 20 * Math.PI) * 0.06;
            c.rotation.z = Math.sin(t / 25 * Math.PI) * 0.08;
            // Stomping
            c.position.y = startY + Math.abs(Math.sin(t / 100 * Math.PI)) * 0.15;

            requestAnimationFrame(angryAnim);
        };
        angryAnim();
    }

    // ===== RENDER LOOP =====
    _animate() {
        this.animationId = requestAnimationFrame(() => this._animate());
        const t = this.clock.getElapsedTime();

        // Smooth mouse-driven camera sway
        const tx = this.cameraBasePos.x + this.mouseX * 0.15;
        const ty = this.cameraBasePos.y + this.mouseY * -0.08;
        this.camera.position.x += (tx - this.camera.position.x) * 0.08;
        this.camera.position.y += (ty - this.camera.position.y) * 0.08;

        const lx = this.cameraLookTarget.x + this.mouseX * 0.3;
        const ly = this.cameraLookTarget.y + this.mouseY * -0.12;
        this.camera.lookAt(lx, ly, this.cameraLookTarget.z);

        // Pulse scan ring when actively scanning
        if (this.scanRing && this.scanRing.visible) {
            this.scanRing.material.emissiveIntensity = 0.8 + Math.sin(t * 8) * 0.6;
        }

        // Gently bob item highlight lights so player notices the items
        if (this._itemsHighlighted && this._itemHighlightLights?.length) {
            this._itemHighlightLights.forEach(({ light, mesh }, idx) => {
                const pulse = 0.8 + Math.abs(Math.sin(t * 2.5 + idx * 1.1)) * 0.8;
                light.intensity = pulse;
                // Keep light tracking mesh x/z in case mesh was moved during scan
                light.position.x = mesh.position.x;
                light.position.z = mesh.position.z;
            });
        }

        // Customer idle animation — gentle bobbing, sway, and head look-around
        if (this.activeCustomer) {
            this.activeCustomer.position.y = Math.sin(t * 1.5) * 0.015;
            this.activeCustomer.rotation.z = Math.sin(t * 0.8) * 0.02;

            // Head look-around — organic combination of sine waves
            const head = this.activeCustomer.userData.headGroup;
            if (head) {
                // Look left/right (Y rotation) with organic speed variation
                head.rotation.y = Math.sin(t * 0.6) * 0.25 + Math.sin(t * 1.1) * 0.1;
                // Subtle nod up/down
                head.rotation.x = Math.sin(t * 0.4 + 1.5) * 0.06;
            }
        }
        // Queue customers also bob and look around (offset phases)
        this.customerQueue.forEach((cust, i) => {
            cust.position.y = Math.sin(t * 1.3 + i * 1.2) * 0.01;
            const qHead = cust.userData.headGroup;
            if (qHead) {
                qHead.rotation.y = Math.sin(t * 0.5 + i * 2.0) * 0.3 + Math.sin(t * 0.9 + i) * 0.15;
                qHead.rotation.x = Math.sin(t * 0.35 + i * 1.5) * 0.05;
            }
        });

        // Patience bar billboard
        if (this.patienceBar) {
            this.patienceBar.lookAt(this.camera.position);
        }

        this.renderer.render(this.scene, this.camera);
    }

    _onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    // ===== ANIMATION HELPER =====
    _animateObj(obj, target, dur, onDone) {
        const sx = obj.position.x, sy = obj.position.y, sz = obj.position.z;
        const dx = (target.x !== undefined ? target.x : sx) - sx;
        const dy = (target.y !== undefined ? target.y : sy) - sy;
        const dz = (target.z !== undefined ? target.z : sz) - sz;
        const start = performance.now();
        const tick = () => {
            const p = Math.min((performance.now() - start) / dur, 1);
            const ease = 1 - Math.pow(1 - p, 3); // ease-out cubic
            obj.position.x = sx + dx * ease;
            obj.position.y = sy + dy * ease;
            obj.position.z = sz + dz * ease;
            if (p < 1) requestAnimationFrame(tick);
            else if (onDone) onDone();
        };
        requestAnimationFrame(tick);
    }

    dispose() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        this.renderer.dispose();
        if (this.renderer.domElement.parentNode)
            this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
}
