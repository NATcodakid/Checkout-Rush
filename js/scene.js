/**
 * scene.js — Checkout Rush 3D scene.
 *
 * First-person perspective with raycaster item pickup & scanning.
 * Detailed "Fall Guys" style characters with arms, legs, shoes, hats.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// ===== CHARACTER STYLES =====
const CHARACTER_STYLES = [
    // --- Original 8 (refined) ---
    {
        name: 'Ghost Kid', bodyColor: 0xf4d35e, headColor: 0xffffff,
        headShape: 'box', hatType: null, eyeStyle: 'cutout',
        shoeColor: 0x8B4513, legColor: 0x4169E1, armColor: 0xf4d35e,
        accessory: 'scarf', scarfColor: 0xe63946
    },
    {
        name: 'Pirate Gal', bodyColor: 0x48cae4, headColor: 0xe8c9a0,
        headShape: 'round', hatType: 'pirate', eyeStyle: 'dot',
        shoeColor: 0x8B4513, legColor: 0x48cae4, armColor: 0x48cae4,
        accessory: 'earring'
    },
    {
        name: 'Carrot Dude', bodyColor: 0xfb8500, headColor: 0xfb8500,
        headShape: 'tall', hatType: 'leaves', eyeStyle: 'big',
        shoeColor: 0x654321, legColor: 0xfb8500, armColor: 0xfb8500
    },
    {
        name: 'Lobster', bodyColor: 0xe63946, headColor: 0xe63946,
        headShape: 'round', hatType: 'antennae', eyeStyle: 'stalk',
        shoeColor: 0xe63946, legColor: 0xe63946, armColor: 0xe63946,
        accessory: 'claws'
    },
    {
        name: 'Graduate', bodyColor: 0x333333, headColor: 0xdeb887,
        headShape: 'round', hatType: 'gradcap', eyeStyle: 'dot',
        shoeColor: 0x222222, legColor: 0x333333, armColor: 0x333333,
        accessory: 'glasses'
    },
    {
        name: 'Alien', bodyColor: 0x06d6a0, headColor: 0x80ffdb,
        headShape: 'round', hatType: null, eyeStyle: 'big',
        shoeColor: 0x555555, legColor: 0x06d6a0, armColor: 0x06d6a0,
        accessory: 'glow'
    },
    {
        name: 'Chef', bodyColor: 0xffffff, headColor: 0xf4d6b0,
        headShape: 'round', hatType: 'chef', eyeStyle: 'dot',
        shoeColor: 0x111111, legColor: 0xffffff, armColor: 0xffffff,
        accessory: 'apron', apronColor: 0xff6b6b
    },
    {
        name: 'Robot', bodyColor: 0x90a4ae, headColor: 0xb0bec5,
        headShape: 'box', hatType: 'antenna', eyeStyle: 'big',
        shoeColor: 0x555555, legColor: 0x90a4ae, armColor: 0x90a4ae,
        accessory: 'bolts'
    },
    // --- New characters ---
    {
        name: 'Wizard', bodyColor: 0x5e548e, headColor: 0xf4d6b0,
        headShape: 'round', hatType: 'wizard', eyeStyle: 'dot',
        shoeColor: 0x4a4e69, legColor: 0x5e548e, armColor: 0x5e548e,
        accessory: 'beard'
    },
    {
        name: 'Cowboy', bodyColor: 0xc9822b, headColor: 0xdeb887,
        headShape: 'round', hatType: 'cowboy', eyeStyle: 'dot',
        shoeColor: 0x654321, legColor: 0x4169E1, armColor: 0xc9822b,
        accessory: 'bandana', bandanaColor: 0xe63946
    },
    {
        name: 'Punk', bodyColor: 0x111111, headColor: 0xf0c8a0,
        headShape: 'round', hatType: 'mohawk', eyeStyle: 'big',
        shoeColor: 0x111111, legColor: 0x111111, armColor: 0x111111,
        accessory: 'studs'
    },
    {
        name: 'Princess', bodyColor: 0xff87ab, headColor: 0xf5deb3,
        headShape: 'round', hatType: 'crown', eyeStyle: 'big',
        shoeColor: 0xff5c8d, legColor: 0xff87ab, armColor: 0xff87ab,
        accessory: 'necklace', necklaceColor: 0xffd700
    },
    {
        name: 'Ninja', bodyColor: 0x2d2d2d, headColor: 0x2d2d2d,
        headShape: 'round', hatType: 'headband', eyeStyle: 'narrow',
        shoeColor: 0x111111, legColor: 0x2d2d2d, armColor: 0x2d2d2d,
        accessory: null, headbandColor: 0xe63946
    },
    {
        name: 'Snowman', bodyColor: 0xf0f0f0, headColor: 0xf8f8f8,
        headShape: 'round', hatType: 'tophat', eyeStyle: 'dot',
        shoeColor: 0xf0f0f0, legColor: 0xf0f0f0, armColor: 0xf0f0f0,
        accessory: 'scarf', scarfColor: 0x06d6a0
    },
    {
        name: 'Viking', bodyColor: 0x8d6e4c, headColor: 0xf4d6b0,
        headShape: 'round', hatType: 'viking', eyeStyle: 'big',
        shoeColor: 0x654321, legColor: 0x6b4226, armColor: 0x8d6e4c,
        accessory: 'beard'
    },
    {
        name: 'Panda', bodyColor: 0xf5f5f5, headColor: 0xf5f5f5,
        headShape: 'round', hatType: null, eyeStyle: 'panda',
        shoeColor: 0x222222, legColor: 0x222222, armColor: 0x222222,
        accessory: null
    },
    {
        name: 'Astronaut', bodyColor: 0xe0e0e0, headColor: 0xf0f0f0,
        headShape: 'round', hatType: 'helmet', eyeStyle: 'big',
        shoeColor: 0x888888, legColor: 0xe0e0e0, armColor: 0xe0e0e0,
        accessory: 'backpack', backpackColor: 0xf57c00
    },
    {
        name: 'Cactus', bodyColor: 0x4caf50, headColor: 0x66bb6a,
        headShape: 'tall', hatType: 'flower', eyeStyle: 'dot',
        shoeColor: 0x795548, legColor: 0x4caf50, armColor: 0x4caf50,
        accessory: null
    },
    {
        name: 'Penguin', bodyColor: 0x263238, headColor: 0x263238,
        headShape: 'round', hatType: null, eyeStyle: 'big',
        shoeColor: 0xffa000, legColor: 0x263238, armColor: 0x263238,
        accessory: 'belly', bellyColor: 0xffffff
    },
    {
        name: 'Firefighter', bodyColor: 0xd32f2f, headColor: 0xdeb887,
        headShape: 'round', hatType: 'firehat', eyeStyle: 'dot',
        shoeColor: 0x222222, legColor: 0xd32f2f, armColor: 0xd32f2f,
        accessory: 'badge'
    },
    {
        name: 'Bunny', bodyColor: 0xffcdd2, headColor: 0xffcdd2,
        headShape: 'round', hatType: 'bunny_ears', eyeStyle: 'big',
        shoeColor: 0xff8a80, legColor: 0xffcdd2, armColor: 0xffcdd2,
        accessory: 'bowtie', bowtieColor: 0xff5252
    },
    {
        name: 'Musician', bodyColor: 0x7c4dff, headColor: 0xf0c8a0,
        headShape: 'round', hatType: 'beret', eyeStyle: 'dot',
        shoeColor: 0x222222, legColor: 0x311b92, armColor: 0x7c4dff,
        accessory: 'glasses'
    },
    {
        name: 'Bee', bodyColor: 0xfdd835, headColor: 0xfdd835,
        headShape: 'round', hatType: 'bee_antennae', eyeStyle: 'big',
        shoeColor: 0x222222, legColor: 0x222222, armColor: 0xfdd835,
        accessory: 'stripes'
    },
    {
        name: 'Fox', bodyColor: 0xff7043, headColor: 0xff7043,
        headShape: 'round', hatType: 'fox_ears', eyeStyle: 'narrow',
        shoeColor: 0x222222, legColor: 0xff7043, armColor: 0xff7043,
        accessory: 'tail'
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

        this._resizeHandler = () => this._onResize();
        window.addEventListener('resize', this._resizeHandler);
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
        // Floor — warm checkerboard tile
        const floorGroup = new THREE.Group();
        const tileSize = 1.0;
        const tileCount = 10;
        const tileLight = new THREE.MeshStandardMaterial({ color: 0xf2e6d0, roughness: 0.65 });
        const tileDark = new THREE.MeshStandardMaterial({ color: 0xe0d0b8, roughness: 0.7 });
        for (let x = -tileCount; x < tileCount; x++) {
            for (let z = -tileCount; z < tileCount; z++) {
                const isLight = (x + z) % 2 === 0;
                const tile = new THREE.Mesh(
                    new THREE.PlaneGeometry(tileSize, tileSize),
                    isLight ? tileLight : tileDark
                );
                tile.rotation.x = -Math.PI / 2;
                tile.position.set(x * tileSize + 0.5, 0, z * tileSize + 0.5);
                tile.receiveShadow = true;
                floorGroup.add(tile);
            }
        }
        this.scene.add(floorGroup);

        // Back wall
        const wallMat = new THREE.MeshStandardMaterial({ color: 0xfaf3e0, roughness: 0.85 });
        const back = new THREE.Mesh(new THREE.BoxGeometry(20, 5, 0.15), wallMat);
        back.position.set(0, 2.5, -4.5);
        back.receiveShadow = true;
        this.scene.add(back);

        // Wall baseboards
        const baseboard = new THREE.Mesh(
            new THREE.BoxGeometry(20, 0.12, 0.04),
            new THREE.MeshStandardMaterial({ color: 0xb08968, roughness: 0.7 })
        );
        baseboard.position.set(0, 0.06, -4.38);
        this.scene.add(baseboard);

        // Side wall (left)
        const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 5, 20), wallMat);
        sideL.position.set(-5, 2.5, 0);
        this.scene.add(sideL);

        // Right wall (partial, for depth)
        const sideR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 5, 10), wallMat);
        sideR.position.set(5, 2.5, -5);
        this.scene.add(sideR);

        // Ceiling strip lights
        for (const cx of [-2, 0, 2]) {
            const fixture = new THREE.Mesh(
                new THREE.BoxGeometry(0.15, 0.04, 2.5),
                new THREE.MeshStandardMaterial({ color: 0xeeeeee, emissive: 0xfff8f0, emissiveIntensity: 0.15 })
            );
            fixture.position.set(cx, 3.8, -2);
            this.scene.add(fixture);
        }

        // Floor mat in front of counter
        const mat = new THREE.Mesh(
            new THREE.PlaneGeometry(2.5, 1.2),
            new THREE.MeshStandardMaterial({ color: 0x3a6b35, roughness: 0.85 })
        );
        mat.rotation.x = -Math.PI / 2;
        mat.position.set(0, 0.005, -1.5);
        this.scene.add(mat);

        // "CHECKOUT" sign above counter area
        const signBacking = new THREE.Mesh(
            new THREE.BoxGeometry(1.8, 0.4, 0.05),
            new THREE.MeshStandardMaterial({ color: 0x1a3a5c, roughness: 0.5 })
        );
        signBacking.position.set(0, 2.8, -0.3);
        this.scene.add(signBacking);

        // Sign glow
        const signLight = new THREE.RectAreaLight(0x44aaff, 0.8, 1.6, 0.3);
        signLight.position.set(0, 2.8, -0.22);
        this.scene.add(signLight);

        // Wall poster — "SALE" (left wall area)
        const poster = new THREE.Mesh(
            new THREE.PlaneGeometry(0.7, 0.9),
            new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.5, side: THREE.DoubleSide })
        );
        poster.position.set(-2, 2.0, -4.35);
        this.scene.add(poster);
        const posterInner = new THREE.Mesh(
            new THREE.PlaneGeometry(0.6, 0.8),
            new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, side: THREE.DoubleSide })
        );
        posterInner.position.set(-2, 2.0, -4.34);
        this.scene.add(posterInner);

        // Wall clock
        const clockFace = new THREE.Mesh(
            new THREE.CircleGeometry(0.2, 20),
            new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide })
        );
        clockFace.position.set(2.5, 2.5, -4.34);
        this.scene.add(clockFace);
        const clockBorder = new THREE.Mesh(
            new THREE.TorusGeometry(0.2, 0.015, 8, 24),
            new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.4 })
        );
        clockBorder.position.set(2.5, 2.5, -4.33);
        this.scene.add(clockBorder);
        const clockHand1 = new THREE.Mesh(
            new THREE.BoxGeometry(0.01, 0.14, 0.005),
            new THREE.MeshBasicMaterial({ color: 0x111111 })
        );
        clockHand1.position.set(2.5, 2.57, -4.32);
        this.scene.add(clockHand1);
        const clockHand2 = new THREE.Mesh(
            new THREE.BoxGeometry(0.008, 0.1, 0.005),
            new THREE.MeshBasicMaterial({ color: 0x111111 })
        );
        clockHand2.position.set(2.54, 2.5, -4.32);
        clockHand2.rotation.z = Math.PI / 2;
        this.scene.add(clockHand2);

        // Small potted plant on floor
        const pot = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.1, 0.2, 8),
            new THREE.MeshStandardMaterial({ color: 0xb5651d, roughness: 0.8 })
        );
        pot.position.set(-3, 0.1, -3.5);
        this.scene.add(pot);
        const soil = new THREE.Mesh(
            new THREE.CircleGeometry(0.11, 8),
            new THREE.MeshStandardMaterial({ color: 0x3e2723 })
        );
        soil.rotation.x = -Math.PI / 2;
        soil.position.set(-3, 0.2, -3.5);
        this.scene.add(soil);
        const plant = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 8, 6),
            new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.7 })
        );
        plant.position.set(-3, 0.4, -3.5);
        this.scene.add(plant);

        // Ceiling (subtle)
        const ceiling = new THREE.Mesh(
            new THREE.PlaneGeometry(12, 12),
            new THREE.MeshStandardMaterial({ color: 0xf5f0e8, roughness: 0.9 })
        );
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.set(0, 3.9, -2);
        this.scene.add(ceiling);
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

            const keys = Object.keys(this.loadedModels);
            if (keys.length > 0) {
                const itemsCount = 4 + Math.floor(Math.random() * 3);
                for (let i = 0; i < itemsCount; i++) {
                    const randomKey = keys[Math.floor(Math.random() * keys.length)];
                    const model = this.loadedModels[randomKey].clone();
                    const baseScale = this.modelNormalizedScales[randomKey] || 0.1;
                    model.scale.setScalar(baseScale * 0.6);

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
        const topMat = new THREE.MeshStandardMaterial({ color: 0xf5ede0, roughness: 0.25, metalness: 0.02 });
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x4a90d9, roughness: 0.6 });
        const trimMat = new THREE.MeshStandardMaterial({ color: 0x3a7bc8, roughness: 0.5 });
        const metalTrim = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.5, roughness: 0.3 });

        // Main body
        const body = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.88, 0.88), bodyMat);
        body.position.set(0, 0.44, 0);
        body.receiveShadow = true;
        body.castShadow = true;
        g.add(body);

        // Top trim strip
        const topTrim = new THREE.Mesh(new THREE.BoxGeometry(4.55, 0.04, 0.92), trimMat);
        topTrim.position.set(0, 0.89, 0);
        g.add(topTrim);

        // Bottom kickplate
        const kick = new THREE.Mesh(
            new THREE.BoxGeometry(4.5, 0.06, 0.02),
            new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.3 })
        );
        kick.position.set(0, 0.03, 0.45);
        g.add(kick);

        // Countertop with slight overhang
        const top = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.06, 1.15), topMat);
        top.position.set(0, 0.93, 0);
        top.castShadow = true;
        top.receiveShadow = true;
        g.add(top);

        // Metal edge strip on front of counter
        const edgeStrip = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.06, 0.01), metalTrim);
        edgeStrip.position.set(0, 0.93, 0.58);
        g.add(edgeStrip);

        // Conveyor belt (recessed)
        const beltRecess = new THREE.Mesh(
            new THREE.BoxGeometry(1.9, 0.015, 0.52),
            new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.3 })
        );
        beltRecess.position.set(-0.4, 0.955, 0);
        beltRecess.receiveShadow = true;
        g.add(beltRecess);

        // Belt surface lines
        for (let bx = -1.2; bx <= 0.5; bx += 0.12) {
            const line = new THREE.Mesh(
                new THREE.BoxGeometry(0.005, 0.002, 0.48),
                new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 })
            );
            line.position.set(bx, 0.963, 0);
            g.add(line);
        }

        // Belt side rails (chrome)
        for (const sz of [-0.26, 0.26]) {
            const rail = new THREE.Mesh(
                new THREE.BoxGeometry(1.9, 0.025, 0.018),
                metalTrim
            );
            rail.position.set(-0.4, 0.975, sz);
            g.add(rail);
        }

        // Scanner window embedded in counter (flat glass panel)
        const scanGlass = new THREE.Mesh(
            new THREE.BoxGeometry(0.35, 0.005, 0.35),
            new THREE.MeshStandardMaterial({
                color: 0x003322, emissive: 0x004433,
                emissiveIntensity: 0.3, transparent: true, opacity: 0.8, metalness: 0.1
            })
        );
        scanGlass.position.set(0.9, 0.965, 0);
        g.add(scanGlass);

        // Scanner red line
        const scanLine = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 0.002, 0.004),
            new THREE.MeshBasicMaterial({ color: 0xff2222 })
        );
        scanLine.position.set(0.9, 0.968, 0);
        g.add(scanLine);
        this._scanLine = scanLine;

        // Bagging area label (small bump)
        const bagLabel = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.003, 0.15),
            new THREE.MeshStandardMaterial({ color: 0xd0d0c0, roughness: 0.4 })
        );
        bagLabel.position.set(1.8, 0.965, 0);
        g.add(bagLabel);

        // Divider rod on conveyor belt
        const dividerRod = new THREE.Mesh(
            new THREE.CylinderGeometry(0.012, 0.012, 0.48, 8),
            metalTrim
        );
        dividerRod.position.set(-1.3, 0.975, 0);
        dividerRod.rotation.x = Math.PI / 2;
        g.add(dividerRod);

        // Card reader terminal on right side
        const readerBase = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.04, 0.18),
            new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5 })
        );
        readerBase.position.set(2.1, 0.98, 0.25);
        g.add(readerBase);
        const readerScreen = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.13, 0.01),
            new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0x1a3a1a, emissiveIntensity: 0.2 })
        );
        readerScreen.position.set(2.1, 1.04, 0.34);
        readerScreen.rotation.x = -0.4;
        g.add(readerScreen);

        // Paper bag behind counter (bagging area)
        const bagMat = new THREE.MeshStandardMaterial({ color: 0xc4a882, roughness: 0.85 });
        const bag = new THREE.Group();
        const bagFront = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.35), bagMat);
        bagFront.position.set(0, 0.175, 0.12);
        bag.add(bagFront);
        const bagBack = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.35), bagMat);
        bagBack.position.set(0, 0.175, -0.12);
        bag.add(bagBack);
        const bagLeft = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.35), bagMat);
        bagLeft.position.set(-0.15, 0.175, 0);
        bagLeft.rotation.y = Math.PI / 2;
        bag.add(bagLeft);
        const bagRight = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.35), bagMat);
        bagRight.position.set(0.15, 0.175, 0);
        bagRight.rotation.y = Math.PI / 2;
        bag.add(bagRight);
        bag.position.set(1.9, 0.96, -0.15);
        g.add(bag);

        // Small "LANE OPEN" sign
        const signPole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.015, 0.015, 0.5, 6),
            metalTrim
        );
        signPole.position.set(-2.1, 1.22, 0);
        g.add(signPole);
        const laneSign = new THREE.Mesh(
            new THREE.BoxGeometry(0.35, 0.12, 0.02),
            new THREE.MeshStandardMaterial({ color: 0x06d6a0, emissive: 0x06d6a0, emissiveIntensity: 0.15 })
        );
        laneSign.position.set(-2.1, 1.5, 0);
        g.add(laneSign);

        this.counter = g;
        this.scene.add(g);
    }

    // ===== SCANNER (invisible functional group — visuals are on the register) =====
    _buildScanner() {
        const g = new THREE.Group();

        // Glow ring on counter surface
        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.28, 0.015, 8, 32),
            new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00cc66, emissiveIntensity: 0.8 })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.02;
        ring.visible = false;
        g.add(ring);
        this.scanRing = ring;

        // Invisible hitbox
        this.scannerHitbox = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 0.6, 0.8),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        this.scannerHitbox.position.set(0, 0.2, 0);
        this.scannerHitbox.userData.isScanner = true;
        g.add(this.scannerHitbox);

        // Scan flash light
        this.scanLight = new THREE.PointLight(0x00ffaa, 0, 2.5);
        this.scanLight.position.set(0, 0.3, 0);
        g.add(this.scanLight);

        g.position.set(0.9, 0.96, 0);
        this.scannerGroup = g;
        this.scene.add(g);
    }

    // ===== REGISTER =====
    _buildRegister() {
        this._buildProceduralRegister();

        this.gltfLoader.load('Assets/3d_Models/Register.glb', (gltf) => {
            const model = gltf.scene;

            const box = new THREE.Box3().setFromObject(model);
            const size = new THREE.Vector3();
            box.getSize(size);
            const maxDim = Math.max(size.x, size.y, size.z);
            const targetHeight = 0.45;
            const scale = targetHeight / maxDim;
            model.scale.setScalar(scale);

            const center = new THREE.Vector3();
            box.getCenter(center);
            model.position.set(
                1.6 - center.x * scale,
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

            if (this._proceduralRegister) {
                this.scene.remove(this._proceduralRegister);
                this._proceduralRegister = null;
            }

            this.registerModel = model;
            this.scene.add(model);
        }, undefined, () => { /* keep procedural fallback */ });
    }

    _buildProceduralRegister() {
        const g = new THREE.Group();
        const darkMetal = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, metalness: 0.4, roughness: 0.5 });
        const lightMetal = new THREE.MeshStandardMaterial({ color: 0x2a2a3e, metalness: 0.3, roughness: 0.6 });

        // Main body
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.3, 0.4), darkMetal);
        body.position.y = 0.15;
        body.castShadow = true;
        g.add(body);

        // Cash drawer front
        const drawer = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.02), lightMetal);
        drawer.position.set(0, 0.08, 0.21);
        g.add(drawer);

        // Drawer handle
        const handle = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.015, 0.015),
            new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.6 })
        );
        handle.position.set(0, 0.1, 0.225);
        g.add(handle);

        // Screen mount
        const screenPole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.02, 0.25, 8),
            new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.5 })
        );
        screenPole.position.set(0, 0.42, -0.1);
        g.add(screenPole);

        // Screen
        this.registerScreen = new THREE.Mesh(
            new THREE.BoxGeometry(0.32, 0.22, 0.015),
            new THREE.MeshStandardMaterial({ color: 0x22cc66, emissive: 0x11aa44, emissiveIntensity: 0.4 })
        );
        this.registerScreen.position.set(0, 0.52, -0.04);
        this.registerScreen.rotation.x = -0.3;
        g.add(this.registerScreen);

        // Screen bezel
        const bezel = new THREE.Mesh(
            new THREE.BoxGeometry(0.35, 0.25, 0.01),
            darkMetal
        );
        bezel.position.set(0, 0.52, -0.048);
        bezel.rotation.x = -0.3;
        g.add(bezel);

        // Keypad area
        const keypad = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.01, 0.15),
            new THREE.MeshStandardMaterial({ color: 0x333355, roughness: 0.3 })
        );
        keypad.position.set(0, 0.31, 0.05);
        g.add(keypad);

        // Key buttons (tiny bumps)
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                const key = new THREE.Mesh(
                    new THREE.BoxGeometry(0.04, 0.01, 0.03),
                    new THREE.MeshStandardMaterial({ color: 0x555577, roughness: 0.3 })
                );
                key.position.set(-0.05 + c * 0.05, 0.32, -0.02 + r * 0.04);
                g.add(key);
            }
        }

        g.position.set(1.6, 0.96, 0);
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
        } else if (style.eyeStyle === 'narrow') {
            for (const sx of [-0.06, 0.06]) {
                const slit = new THREE.Mesh(
                    new THREE.BoxGeometry(0.09, 0.02, 0.01),
                    eyeWhite
                );
                slit.position.set(sx, eyeY, eyeZ + 0.01);
                headGroup.add(slit);
                const pupil = new THREE.Mesh(
                    new THREE.BoxGeometry(0.035, 0.018, 0.01),
                    eyeBlack
                );
                pupil.position.set(sx, eyeY, eyeZ + 0.02);
                headGroup.add(pupil);
            }
        } else if (style.eyeStyle === 'panda') {
            for (const sx of [-0.08, 0.08]) {
                const patch = new THREE.Mesh(
                    new THREE.CircleGeometry(0.07, 10),
                    eyeBlack
                );
                patch.position.set(sx, eyeY, eyeZ - 0.005);
                headGroup.add(patch);
                const w = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), eyeWhite);
                w.position.set(sx, eyeY + 0.01, eyeZ + 0.01);
                headGroup.add(w);
                const p = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 4), eyeBlack);
                p.position.set(sx, eyeY + 0.015, eyeZ + 0.04);
                headGroup.add(p);
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
        } else if (style.hatType === 'wizard') {
            const cone = new THREE.Mesh(
                new THREE.ConeGeometry(0.16, 0.35, 10),
                new THREE.MeshStandardMaterial({ color: 0x5e548e })
            );
            cone.position.set(0, hatY + 0.18, 0);
            headGroup.add(cone);
            const brim = new THREE.Mesh(
                new THREE.CylinderGeometry(0.22, 0.22, 0.02, 12),
                new THREE.MeshStandardMaterial({ color: 0x5e548e })
            );
            brim.position.set(0, hatY + 0.01, 0);
            headGroup.add(brim);
            const starDec = new THREE.Mesh(
                new THREE.SphereGeometry(0.025, 6, 4),
                new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffd700, emissiveIntensity: 0.6 })
            );
            starDec.position.set(0, hatY + 0.28, 0.12);
            headGroup.add(starDec);
        } else if (style.hatType === 'cowboy') {
            const brim = new THREE.Mesh(
                new THREE.CylinderGeometry(0.28, 0.28, 0.02, 12),
                new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.8 })
            );
            brim.position.set(0, hatY, 0);
            headGroup.add(brim);
            const crown = new THREE.Mesh(
                new THREE.CylinderGeometry(0.12, 0.15, 0.14, 8),
                new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.8 })
            );
            crown.position.set(0, hatY + 0.08, 0);
            headGroup.add(crown);
        } else if (style.hatType === 'mohawk') {
            for (let i = 0; i < 5; i++) {
                const spike = new THREE.Mesh(
                    new THREE.ConeGeometry(0.03, 0.12 + Math.sin(i * 0.7) * 0.04, 4),
                    new THREE.MeshStandardMaterial({ color: 0xff1744 })
                );
                spike.position.set(0, hatY + 0.06, -0.08 + i * 0.04);
                headGroup.add(spike);
            }
        } else if (style.hatType === 'crown') {
            const base = new THREE.Mesh(
                new THREE.CylinderGeometry(0.17, 0.18, 0.08, 8),
                new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.7, roughness: 0.2 })
            );
            base.position.set(0, hatY + 0.04, 0);
            headGroup.add(base);
            for (let i = 0; i < 5; i++) {
                const point = new THREE.Mesh(
                    new THREE.ConeGeometry(0.025, 0.07, 4),
                    new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.7, roughness: 0.2 })
                );
                const angle = (i / 5) * Math.PI * 2;
                point.position.set(Math.sin(angle) * 0.13, hatY + 0.11, Math.cos(angle) * 0.13);
                headGroup.add(point);
            }
            const gem = new THREE.Mesh(
                new THREE.SphereGeometry(0.025, 6, 4),
                new THREE.MeshStandardMaterial({ color: 0xe91e63, emissive: 0xe91e63, emissiveIntensity: 0.4 })
            );
            gem.position.set(0, hatY + 0.06, 0.17);
            headGroup.add(gem);
        } else if (style.hatType === 'headband') {
            const band = new THREE.Mesh(
                new THREE.TorusGeometry(0.19, 0.015, 6, 20),
                new THREE.MeshStandardMaterial({ color: style.headbandColor || 0xe63946 })
            );
            band.position.set(0, hatY - 0.05, 0);
            headGroup.add(band);
            const knot = new THREE.Mesh(
                new THREE.BoxGeometry(0.04, 0.08, 0.02),
                new THREE.MeshStandardMaterial({ color: style.headbandColor || 0xe63946 })
            );
            knot.position.set(-0.18, hatY - 0.1, 0);
            headGroup.add(knot);
        } else if (style.hatType === 'tophat') {
            const brim = new THREE.Mesh(
                new THREE.CylinderGeometry(0.22, 0.22, 0.02, 12),
                new THREE.MeshStandardMaterial({ color: 0x222222 })
            );
            brim.position.set(0, hatY, 0);
            headGroup.add(brim);
            const top = new THREE.Mesh(
                new THREE.CylinderGeometry(0.13, 0.14, 0.2, 10),
                new THREE.MeshStandardMaterial({ color: 0x222222 })
            );
            top.position.set(0, hatY + 0.11, 0);
            headGroup.add(top);
            const ribbon = new THREE.Mesh(
                new THREE.CylinderGeometry(0.141, 0.141, 0.025, 10),
                new THREE.MeshStandardMaterial({ color: 0xe63946 })
            );
            ribbon.position.set(0, hatY + 0.04, 0);
            headGroup.add(ribbon);
        } else if (style.hatType === 'viking') {
            const helm = new THREE.Mesh(
                new THREE.SphereGeometry(0.22, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55),
                new THREE.MeshStandardMaterial({ color: 0x8d8d8d, metalness: 0.5, roughness: 0.4 })
            );
            helm.position.set(0, hatY + 0.02, 0);
            headGroup.add(helm);
            for (const sx of [-0.2, 0.2]) {
                const horn = new THREE.Mesh(
                    new THREE.ConeGeometry(0.035, 0.2, 6),
                    new THREE.MeshStandardMaterial({ color: 0xf5f5dc })
                );
                horn.position.set(sx, hatY + 0.1, 0);
                horn.rotation.z = sx > 0 ? -0.5 : 0.5;
                headGroup.add(horn);
            }
        } else if (style.hatType === 'helmet') {
            const dome = new THREE.Mesh(
                new THREE.SphereGeometry(0.22, 12, 8),
                new THREE.MeshStandardMaterial({ color: 0xe0e0e0, metalness: 0.3, roughness: 0.3 })
            );
            dome.position.set(0, hatY - 0.02, 0);
            headGroup.add(dome);
            const visor = new THREE.Mesh(
                new THREE.SphereGeometry(0.19, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.45),
                new THREE.MeshStandardMaterial({ color: 0x42a5f5, transparent: true, opacity: 0.6, metalness: 0.5 })
            );
            visor.position.set(0, hatY - 0.02, 0.02);
            visor.rotation.x = 0.3;
            headGroup.add(visor);
        } else if (style.hatType === 'flower') {
            const stem = new THREE.Mesh(
                new THREE.CylinderGeometry(0.01, 0.01, 0.12, 4),
                new THREE.MeshStandardMaterial({ color: 0x66bb6a })
            );
            stem.position.set(0, hatY + 0.08, 0);
            headGroup.add(stem);
            for (let i = 0; i < 5; i++) {
                const petal = new THREE.Mesh(
                    new THREE.SphereGeometry(0.04, 6, 4),
                    new THREE.MeshStandardMaterial({ color: 0xff80ab })
                );
                const a = (i / 5) * Math.PI * 2;
                petal.position.set(Math.sin(a) * 0.05, hatY + 0.16, Math.cos(a) * 0.05);
                headGroup.add(petal);
            }
            const center = new THREE.Mesh(
                new THREE.SphereGeometry(0.025, 6, 4),
                new THREE.MeshStandardMaterial({ color: 0xffd600 })
            );
            center.position.set(0, hatY + 0.16, 0);
            headGroup.add(center);
        } else if (style.hatType === 'firehat') {
            const base = new THREE.Mesh(
                new THREE.CylinderGeometry(0.21, 0.23, 0.04, 10),
                new THREE.MeshStandardMaterial({ color: 0xd32f2f })
            );
            base.position.set(0, hatY, 0);
            headGroup.add(base);
            const dome = new THREE.Mesh(
                new THREE.SphereGeometry(0.14, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.5),
                new THREE.MeshStandardMaterial({ color: 0xd32f2f })
            );
            dome.position.set(0, hatY + 0.02, 0);
            headGroup.add(dome);
            const shield = new THREE.Mesh(
                new THREE.CircleGeometry(0.04, 6),
                new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.5 })
            );
            shield.position.set(0, hatY + 0.04, 0.14);
            headGroup.add(shield);
        } else if (style.hatType === 'bunny_ears') {
            for (const sx of [-0.07, 0.07]) {
                const ear = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.035, 0.045, 0.28, 8),
                    new THREE.MeshStandardMaterial({ color: 0xffcdd2 })
                );
                ear.position.set(sx, hatY + 0.14, 0);
                ear.rotation.z = sx > 0 ? -0.1 : 0.1;
                headGroup.add(ear);
                const inner = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.015, 0.025, 0.2, 6),
                    new THREE.MeshStandardMaterial({ color: 0xff8a80 })
                );
                inner.position.set(sx, hatY + 0.14, 0.02);
                inner.rotation.z = sx > 0 ? -0.1 : 0.1;
                headGroup.add(inner);
            }
        } else if (style.hatType === 'beret') {
            const beret = new THREE.Mesh(
                new THREE.SphereGeometry(0.18, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.45),
                new THREE.MeshStandardMaterial({ color: 0x7c4dff })
            );
            beret.position.set(0.04, hatY + 0.02, 0);
            beret.rotation.z = 0.25;
            headGroup.add(beret);
        } else if (style.hatType === 'bee_antennae') {
            for (const sx of [-0.06, 0.06]) {
                const ant = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.008, 0.008, 0.18, 4),
                    new THREE.MeshStandardMaterial({ color: 0x222222 })
                );
                ant.position.set(sx, hatY + 0.1, 0.02);
                ant.rotation.z = sx > 0 ? -0.2 : 0.2;
                headGroup.add(ant);
                const tip = new THREE.Mesh(
                    new THREE.SphereGeometry(0.025, 6, 4),
                    new THREE.MeshStandardMaterial({ color: 0x222222 })
                );
                tip.position.set(sx + (sx > 0 ? -0.03 : 0.03), hatY + 0.2, 0.02);
                headGroup.add(tip);
            }
        } else if (style.hatType === 'fox_ears') {
            for (const sx of [-0.12, 0.12]) {
                const ear = new THREE.Mesh(
                    new THREE.ConeGeometry(0.06, 0.14, 4),
                    new THREE.MeshStandardMaterial({ color: 0xff7043 })
                );
                ear.position.set(sx, hatY + 0.08, 0);
                ear.rotation.z = sx > 0 ? -0.15 : 0.15;
                headGroup.add(ear);
                const inner = new THREE.Mesh(
                    new THREE.ConeGeometry(0.03, 0.08, 4),
                    new THREE.MeshStandardMaterial({ color: 0xffccbc })
                );
                inner.position.set(sx, hatY + 0.07, 0.02);
                inner.rotation.z = sx > 0 ? -0.15 : 0.15;
                headGroup.add(inner);
            }
        }

        // ---- ACCESSORIES ----
        if (style.accessory === 'glasses') {
            const glassMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
            for (const sx of [-0.08, 0.08]) {
                const frame = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.008, 6, 12), glassMat);
                frame.position.set(sx, eyeY, eyeZ + 0.03);
                headGroup.add(frame);
            }
            const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.008, 0.008), glassMat);
            bridge.position.set(0, eyeY + 0.02, eyeZ + 0.04);
            headGroup.add(bridge);
        }
        if (style.accessory === 'scarf') {
            const scarf = new THREE.Mesh(
                new THREE.TorusGeometry(0.22, 0.035, 6, 12),
                new THREE.MeshStandardMaterial({ color: style.scarfColor || 0xe63946 })
            );
            scarf.position.set(0, 0.85, 0);
            scarf.rotation.x = Math.PI / 2;
            char.add(scarf);
            const tail = new THREE.Mesh(
                new THREE.BoxGeometry(0.06, 0.18, 0.025),
                new THREE.MeshStandardMaterial({ color: style.scarfColor || 0xe63946 })
            );
            tail.position.set(0.18, 0.78, 0.08);
            tail.rotation.z = -0.3;
            char.add(tail);
        }
        if (style.accessory === 'beard') {
            const beard = new THREE.Mesh(
                new THREE.SphereGeometry(0.12, 8, 6, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.5),
                new THREE.MeshStandardMaterial({ color: 0xbcaaa4 })
            );
            beard.position.set(0, mouthY - 0.06, eyeZ - 0.06);
            headGroup.add(beard);
        }
        if (style.accessory === 'earring') {
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(0.025, 0.005, 6, 8),
                new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8 })
            );
            ring.position.set(-0.2, -0.04, 0);
            headGroup.add(ring);
        }
        if (style.accessory === 'claws') {
            for (const side of [-1, 1]) {
                const claw = new THREE.Mesh(
                    new THREE.SphereGeometry(0.08, 8, 6),
                    new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.4 })
                );
                claw.position.set(side * 0.35, 0.45, 0.08);
                claw.scale.set(1, 0.6, 1.2);
                char.add(claw);
            }
        }
        if (style.accessory === 'bolts') {
            for (const sx of [-0.18, 0.18]) {
                const bolt = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.025, 0.025, 0.04, 6),
                    new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8 })
                );
                bolt.position.set(sx, 0, 0.01);
                bolt.rotation.x = Math.PI / 2;
                headGroup.add(bolt);
            }
        }
        if (style.accessory === 'glow') {
            const glow = new THREE.PointLight(0x06d6a0, 0.6, 2);
            glow.position.set(0, 1.0, 0.3);
            char.add(glow);
        }
        if (style.accessory === 'apron') {
            const apron = new THREE.Mesh(
                new THREE.PlaneGeometry(0.3, 0.25),
                new THREE.MeshStandardMaterial({ color: style.apronColor || 0xff6b6b, side: THREE.DoubleSide })
            );
            apron.position.set(0, 0.5, 0.22);
            char.add(apron);
        }
        if (style.accessory === 'bandana') {
            const bandana = new THREE.Mesh(
                new THREE.PlaneGeometry(0.15, 0.1),
                new THREE.MeshStandardMaterial({ color: style.bandanaColor || 0xe63946, side: THREE.DoubleSide })
            );
            bandana.position.set(0, mouthY + 0.01, eyeZ + 0.03);
            headGroup.add(bandana);
        }
        if (style.accessory === 'necklace') {
            const necklace = new THREE.Mesh(
                new THREE.TorusGeometry(0.14, 0.012, 6, 16),
                new THREE.MeshStandardMaterial({ color: style.necklaceColor || 0xffd700, metalness: 0.8, roughness: 0.2 })
            );
            necklace.position.set(0, 0.82, 0.08);
            necklace.rotation.x = Math.PI / 2 + 0.2;
            char.add(necklace);
            const pendant = new THREE.Mesh(
                new THREE.SphereGeometry(0.025, 6, 4),
                new THREE.MeshStandardMaterial({ color: 0xe91e63, emissive: 0xe91e63, emissiveIntensity: 0.3 })
            );
            pendant.position.set(0, 0.72, 0.2);
            char.add(pendant);
        }
        if (style.accessory === 'studs') {
            const studMat = new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.9 });
            for (let i = 0; i < 3; i++) {
                const stud = new THREE.Mesh(new THREE.SphereGeometry(0.015, 4, 4), studMat);
                stud.position.set(-0.2, 0.5 + i * 0.08, 0.16);
                char.add(stud);
            }
        }
        if (style.accessory === 'belly') {
            const belly = new THREE.Mesh(
                new THREE.SphereGeometry(0.16, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.6),
                new THREE.MeshStandardMaterial({ color: style.bellyColor || 0xffffff })
            );
            belly.position.set(0, 0.5, 0.1);
            belly.rotation.x = -0.1;
            char.add(belly);
        }
        if (style.accessory === 'badge') {
            const badgeAcc = new THREE.Mesh(
                new THREE.CircleGeometry(0.04, 6),
                new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.6, side: THREE.DoubleSide })
            );
            badgeAcc.position.set(0.12, 0.7, 0.22);
            char.add(badgeAcc);
        }
        if (style.accessory === 'backpack') {
            const pack = new THREE.Mesh(
                new THREE.BoxGeometry(0.2, 0.22, 0.12),
                new THREE.MeshStandardMaterial({ color: style.backpackColor || 0xf57c00 })
            );
            pack.position.set(0, 0.58, -0.24);
            char.add(pack);
        }
        if (style.accessory === 'bowtie') {
            for (const sx of [-0.04, 0.04]) {
                const wing = new THREE.Mesh(
                    new THREE.ConeGeometry(0.04, 0.06, 4),
                    new THREE.MeshStandardMaterial({ color: style.bowtieColor || 0xff5252 })
                );
                wing.position.set(sx, 0.84, 0.22);
                wing.rotation.z = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
                char.add(wing);
            }
            const center = new THREE.Mesh(
                new THREE.SphereGeometry(0.015, 6, 4),
                new THREE.MeshStandardMaterial({ color: style.bowtieColor || 0xff5252 })
            );
            center.position.set(0, 0.84, 0.22);
            char.add(center);
        }
        if (style.accessory === 'stripes') {
            const stripeMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
            for (let i = 0; i < 3; i++) {
                const stripe = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.245, 0.245, 0.03, 12),
                    stripeMat
                );
                stripe.position.y = 0.45 + i * 0.1;
                char.add(stripe);
            }
        }
        if (style.accessory === 'tail') {
            const tail = new THREE.Mesh(
                new THREE.CylinderGeometry(0.025, 0.04, 0.25, 6),
                new THREE.MeshStandardMaterial({ color: 0xff7043 })
            );
            tail.position.set(0, 0.35, -0.22);
            tail.rotation.x = -0.6;
            char.add(tail);
            const tip = new THREE.Mesh(
                new THREE.SphereGeometry(0.04, 6, 4),
                new THREE.MeshStandardMaterial({ color: 0xffffff })
            );
            tip.position.set(0, 0.24, -0.32);
            char.add(tip);
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

    _pickUniqueStyle(usedIndices) {
        const pool = CHARACTER_STYLES.map((s, i) => i).filter(i => !usedIndices.has(i));
        if (pool.length === 0) return CHARACTER_STYLES[Math.floor(Math.random() * CHARACTER_STYLES.length)];
        const idx = pool[Math.floor(Math.random() * pool.length)];
        usedIndices.add(idx);
        return CHARACTER_STYLES[idx];
    }

    setupQueue(count) {
        this.customerQueue.forEach(c => this.scene.remove(c));
        if (this.activeCustomer) this.scene.remove(this.activeCustomer);
        this.removePatienceBar();
        this.customerQueue = [];
        this.activeCustomer = null;
        this._usedStyleIndices = new Set();

        const cnt = Math.min(count, this.queuePositions.length);
        for (let i = 0; i < cnt; i++) {
            const style = this._pickUniqueStyle(this._usedStyleIndices);
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
        if (!this._usedStyleIndices) this._usedStyleIndices = new Set();
        if (this._usedStyleIndices.size >= CHARACTER_STYLES.length) this._usedStyleIndices.clear();
        const style = this._pickUniqueStyle(this._usedStyleIndices);
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
        // Target heights for each item category on the counter (in world units)
        this.targetHeights = {
            pizza: 0.22,
            watermelon: 0.30,
            banana: 0.18,
            milk: 0.32,
            bread: 0.22,
            juice: 0.26,
            beans: 0.24,
            apple: 0.16,
            tomato: 0.16,
            carrot: 0.20,
            cheese: 0.14,
            donut: 0.10,
            grapes: 0.18,
            egg: 0.12,
            candy: 0.12,
            cookie: 0.10
        };
        this.modelNormalizedScales = {};

        for (const [key, path] of Object.entries(models)) {
            this.gltfLoader.load(path, (gltf) => {
                const m = gltf.scene;
                m.traverse(c => {
                    if (c.isMesh) {
                        c.castShadow = true;
                        c.receiveShadow = true;
                        if (c.material) {
                            c.material.envMapIntensity = 2.0;
                            if (c.material.metalness > 0.5) c.material.metalness = 0.3;
                            if (c.material.roughness < 0.2) c.material.roughness = 0.3;
                            c.material.needsUpdate = true;
                        }
                    }
                });

                const box = new THREE.Box3().setFromObject(m);
                const size = new THREE.Vector3();
                box.getSize(size);
                const maxDim = Math.max(size.x, size.y, size.z);
                const target = this.targetHeights[key] || 0.18;
                const normalizedScale = maxDim > 0 ? target / maxDim : 0.15;
                this.modelNormalizedScales[key] = normalizedScale;

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
            const counterY = 0.96;
            let itemScale = 1;

            if (this.loadedModels[key]) {
                mesh = this.loadedModels[key].clone();
                itemScale = this.modelNormalizedScales[key] || 0.15;
                mesh.scale.setScalar(itemScale);

                const box = new THREE.Box3().setFromObject(mesh);
                mesh.position.y = counterY - box.min.y + 0.005;
            } else {
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

            const spacing = 0.35;
            const startX = -0.4 - ((items.length - 1) * spacing) / 2;
            mesh.position.x = startX + i * spacing;
            mesh.position.z = 0;
            mesh.rotation.y = Math.random() * Math.PI;

            const hitSize = Math.max(0.4, 0.25 / itemScale);
            const hitbox = new THREE.Mesh(
                new THREE.BoxGeometry(hitSize, hitSize, hitSize),
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

        const scannerPos = this.scannerGroup.position;
        const scanY = scannerPos.y + 0.12;

        // Scale down to a uniform scan size during flight
        const scanScale = 0.08;
        this._animateObj(mesh, { x: scannerPos.x, y: scanY, z: scannerPos.z }, 250);
        this._animateScale(mesh, { x: scanScale, y: scanScale, z: scanScale }, 250, () => {

            this.flashScanner();
            mesh.userData.scanned = true;
            if (this.onScan) this.onScan(mesh.userData.itemData, mesh.userData.index);

            if (this.scanRing) {
                this.scanRing.material.emissiveIntensity = 2.0;
                setTimeout(() => { if (this.scanRing) this.scanRing.material.emissiveIntensity = 0.8; }, 350);
            }

            // Slide to bag area and fade out
            setTimeout(() => {
                const bagX = 1.8 + Math.random() * 0.3;
                const bagZ = -0.15 + Math.random() * 0.3;
                this._animateObj(mesh, { x: bagX, y: 0.97, z: bagZ }, 280, () => {
                    this.scene.remove(mesh);
                    this.scanning = false;
                });
                this._animateScale(mesh, { x: 0.001, y: 0.001, z: 0.001 }, 280);
            }, 200);
        });
    }

    flashScanner() {
        if (!this.scanLight) return;
        this.scanLight.intensity = 3.0;
        this.scanLight.color.setHex(0x00ffaa);
        setTimeout(() => { this.scanLight.intensity = 0; }, 250);

        // Flash the embedded scan line
        if (this._scanLine) {
            this._scanLine.material.color.setHex(0x00ff88);
            setTimeout(() => { this._scanLine.material.color.setHex(0xff2222); }, 300);
        }

        this.spawnParticles(this.scannerGroup.position, 0x00ffcc, 12);
    }

    flashRegister(correct) {
        if (!this.registerScreen) return;
        this.registerScreen.material.emissive.setHex(correct ? 0x00ff88 : 0xff3333);
        this.registerScreen.material.emissiveIntensity = 2.0;
        setTimeout(() => {
            this.registerScreen.material.emissive.setHex(0x33cc33);
            this.registerScreen.material.emissiveIntensity = 0.5;
        }, 500);

        // JUICE: Register particles
        const pos = new THREE.Vector3();
        this.registerScreen.getWorldPosition(pos);
        this.spawnParticles(pos, correct ? 0x00ff88 : 0xff3333, 15);
    }

    // ===== JUICE: Particles =====
    spawnParticles(pos, colorHex, count) {
        if (!this.particles) this.particles = [];

        const geo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
        const mat = new THREE.MeshBasicMaterial({ color: colorHex });

        for (let i = 0; i < count; i++) {
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(pos);
            mesh.position.y += 0.2; // slight offset up

            // Random velocity
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.03 + Math.random() * 0.05;
            const vy = 0.04 + Math.random() * 0.06;

            mesh.userData = {
                vx: Math.cos(angle) * speed,
                vy: vy,
                vz: Math.sin(angle) * speed,
                life: 1.0,
                decay: 0.02 + Math.random() * 0.03
            };

            this.scene.add(mesh);
            this.particles.push(mesh);
        }
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
        const halfW = (this._patienceBarFillW || 0.86) / 2;
        this.patienceBarFill.scale.x = Math.max(0.001, pct);
        this.patienceBarFill.position.x = -halfW * (1 - pct);

        const r = Math.min(1, 2 - pct * 2);
        const g = Math.min(1, pct * 2);
        this.patienceBarFill.material.color.setRGB(r, g, 0.1);

        // Update glow color to match fill
        if (this.patienceBar && this.patienceBar.children.length >= 4) {
            this.patienceBar.children[3].material.color.setRGB(r, g, 0.1);
            this.patienceBar.children[3].material.opacity = pct < 0.3 ? 0.25 : 0.15;
        }
    }

    ensurePatienceBar() {
        if (!this.patienceBar && this.activeCustomer && this.patienceMax > 0) {
            this._createPatienceBar(this.activeCustomer);
        }
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
        const W = 0.9;
        const H = 0.12;

        // Dark background bar (simple planes for reliability)
        const bgGeo = new THREE.PlaneGeometry(W, H);
        const bgMat = new THREE.MeshBasicMaterial({
            color: 0x1a1a2e, transparent: true, opacity: 0.9, side: THREE.DoubleSide
        });
        barGroup.add(new THREE.Mesh(bgGeo, bgMat));

        // White border frame
        const borderGeo = new THREE.PlaneGeometry(W + 0.04, H + 0.04);
        const borderMat = new THREE.MeshBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 0.35, side: THREE.DoubleSide
        });
        const border = new THREE.Mesh(borderGeo, borderMat);
        border.position.z = -0.002;
        barGroup.add(border);

        // Green fill bar
        const fillW = W - 0.04;
        const fillGeo = new THREE.PlaneGeometry(fillW, H - 0.04);
        const fillMat = new THREE.MeshBasicMaterial({ color: 0x06d6a0, side: THREE.DoubleSide });
        const fill = new THREE.Mesh(fillGeo, fillMat);
        fill.position.z = 0.002;
        barGroup.add(fill);

        // Emissive glow behind the bar for visibility
        const glowGeo = new THREE.PlaneGeometry(W + 0.12, H + 0.12);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0x06d6a0, transparent: true, opacity: 0.15, side: THREE.DoubleSide
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.z = -0.004;
        barGroup.add(glow);

        barGroup.position.set(0, 1.75, 0);
        char.add(barGroup);

        this.patienceBar = barGroup;
        this.patienceBarFill = fill;
        this._patienceBarFillW = fillW;
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

        // Animate embedded scanner red line
        if (this._scanLine) {
            this._scanLine.position.z = Math.sin(t * 3) * 0.12;
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

        // Process Particles
        if (this.particles && this.particles.length > 0) {
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.position.x += p.userData.vx;
                p.position.y += p.userData.vy;
                p.position.z += p.userData.vz;
                p.userData.vy -= 0.005; // gravity

                p.userData.life -= p.userData.decay;
                p.scale.setScalar(Math.max(0, p.userData.life));

                if (p.userData.life <= 0) {
                    this.scene.remove(p);
                    this.particles.splice(i, 1);
                }
            }
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

    _animateScale(obj, target, dur, onDone) {
        const sx = obj.scale.x, sy = obj.scale.y, sz = obj.scale.z;
        const dx = (target.x !== undefined ? target.x : sx) - sx;
        const dy = (target.y !== undefined ? target.y : sy) - sy;
        const dz = (target.z !== undefined ? target.z : sz) - sz;
        const start = performance.now();
        const tick = () => {
            const p = Math.min((performance.now() - start) / dur, 1);
            const ease = 1 - Math.pow(1 - p, 3);
            obj.scale.x = sx + dx * ease;
            obj.scale.y = sy + dy * ease;
            obj.scale.z = sz + dz * ease;
            if (p < 1) requestAnimationFrame(tick);
            else if (onDone) onDone();
        };
        requestAnimationFrame(tick);
    }

    dispose() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);
        this.renderer.dispose();
        if (this.renderer.domElement.parentNode)
            this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
}
