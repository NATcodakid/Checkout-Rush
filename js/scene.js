/**
 * scene.js — Checkout Rush 3D scene.
 *
 * First-person perspective with raycaster item pickup & scanning.
 * Detailed "Fall Guys" style characters with arms, legs, shoes, hats.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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
        this.gltfLoader = new GLTFLoader();

        // Interaction
        this.raycaster = new THREE.Raycaster();
        this.mouseVec = new THREE.Vector2();
        this.holdingItem = null;
        this.holdingOrigPos = null; // Where it was before pickup

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

        // Animation
        this.animationId = null;
        this.mouseX = 0;
        this.mouseY = 0;
        this.cameraBasePos = new THREE.Vector3(0, 1.6, 1.4);
        this.cameraLookTarget = new THREE.Vector3(0, 0.95, -1);

        this._init();
    }

    _init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb);
        this.scene.fog = new THREE.Fog(0x87ceeb, 12, 30);

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.05, 50);
        this.camera.position.copy(this.cameraBasePos);
        this.camera.lookAt(this.cameraLookTarget);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.1;
        this.container.appendChild(this.renderer.domElement);

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
        this.scene.add(new THREE.AmbientLight(0xfff5e6, 0.65));
        this.scene.add(new THREE.HemisphereLight(0x87ceeb, 0xdeb887, 0.35));

        const sun = new THREE.DirectionalLight(0xfff8f0, 1.0);
        sun.position.set(3, 8, 4);
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        sun.shadow.camera.near = 0.5;
        sun.shadow.camera.far = 20;
        sun.shadow.camera.left = -6;
        sun.shadow.camera.right = 6;
        sun.shadow.camera.top = 6;
        sun.shadow.camera.bottom = -6;
        this.scene.add(sun);

        const fill = new THREE.DirectionalLight(0xaaddff, 0.35);
        fill.position.set(-3, 4, 2);
        this.scene.add(fill);

        // Warm spot on counter
        const warm = new THREE.SpotLight(0xffd166, 0.5, 8, Math.PI / 4, 0.6, 1);
        warm.position.set(0, 4, 1);
        warm.target.position.set(0, 0, 0);
        this.scene.add(warm);
        this.scene.add(warm.target);
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

        // Shelves on back wall
        this._buildShelf(-2.5, -4.2);
        this._buildShelf(0, -4.2);
        this._buildShelf(2.5, -4.2);

        // Floor mat in front of counter
        const mat = new THREE.Mesh(
            new THREE.PlaneGeometry(2.5, 1.2),
            new THREE.MeshStandardMaterial({ color: 0x3a6b35, roughness: 0.9 })
        );
        mat.rotation.x = -Math.PI / 2;
        mat.position.set(0, 0.005, -1.5);
        this.scene.add(mat);
    }

    _buildShelf(x, z) {
        const g = new THREE.Group();
        const wood = new THREE.MeshStandardMaterial({ color: 0xb08968, roughness: 0.6 });

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

            const n = 2 + Math.floor(Math.random() * 3);
            for (let i = 0; i < n; i++) {
                const h = 0.12 + Math.random() * 0.12;
                const c = [0xe63946, 0x48cae4, 0xffd166, 0x06d6a0, 0xfb8500, 0x7b2cbf, 0xff6b35][Math.floor(Math.random() * 7)];
                const p = new THREE.Mesh(
                    new THREE.BoxGeometry(0.12, h, 0.12),
                    new THREE.MeshStandardMaterial({ color: c })
                );
                p.position.set(-0.55 + i * 0.35, y + 0.025 + h / 2, 0);
                p.castShadow = true;
                g.add(p);
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
        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.32, 0.02, 8, 24),
            new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00cc66, emissiveIntensity: 0.8 })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.04;
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

    // ===== REGISTER =====
    _buildRegister() {
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

        g.position.set(1.9, 0.96, 0.05);
        this.scene.add(g);
    }

    // ===== CHARACTERS =====
    _buildCharacter(style) {
        const char = new THREE.Group();

        const bodyMat = new THREE.MeshStandardMaterial({ color: style.bodyColor, roughness: 0.55 });
        const headMat = new THREE.MeshStandardMaterial({ color: style.headColor, roughness: 0.5 });
        const legMat = new THREE.MeshStandardMaterial({ color: style.legColor, roughness: 0.6 });
        const shoeMat = new THREE.MeshStandardMaterial({ color: style.shoeColor, roughness: 0.7 });
        const armMat = new THREE.MeshStandardMaterial({ color: style.armColor, roughness: 0.6 });
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

        // ---- HEAD ----
        let headMesh;
        if (style.headShape === 'box') {
            headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.3), headMat);
        } else if (style.headShape === 'tall') {
            headMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 0.55, 10), headMat);
        } else {
            headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), headMat);
        }
        headMesh.position.y = 1.02;
        headMesh.castShadow = true;
        char.add(headMesh);

        // ---- EYES ----
        const eyeY = style.headShape === 'tall' ? 1.08 : 1.04;
        const eyeZ = style.headShape === 'box' ? 0.16 : 0.17;

        if (style.eyeStyle === 'big') {
            for (const sx of [-0.08, 0.08]) {
                const w = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), eyeWhite);
                w.position.set(sx, eyeY, eyeZ);
                char.add(w);
                const p = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), eyeBlack);
                p.position.set(sx, eyeY + 0.01, eyeZ + 0.05);
                char.add(p);
            }
        } else if (style.eyeStyle === 'dot') {
            for (const sx of [-0.06, 0.06]) {
                const d = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), eyeBlack);
                d.position.set(sx, eyeY, eyeZ + 0.01);
                char.add(d);
            }
        } else if (style.eyeStyle === 'cutout') {
            // Ghost-style cutout eyes + mouth
            for (const sx of [-0.07, 0.07]) {
                const hole = new THREE.Mesh(
                    new THREE.CircleGeometry(0.04, 8),
                    eyeBlack
                );
                hole.position.set(sx, eyeY, eyeZ + 0.01);
                char.add(hole);
            }
            // Wavy mouth
            const mouth = new THREE.Mesh(
                new THREE.BoxGeometry(0.12, 0.03, 0.01),
                eyeBlack
            );
            mouth.position.set(0, eyeY - 0.1, eyeZ + 0.01);
            char.add(mouth);
        } else if (style.eyeStyle === 'stalk') {
            // Stalked eyes (lobster)
            for (const sx of [-0.1, 0.1]) {
                const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.15, 6), bodyMat);
                stalk.position.set(sx, eyeY + 0.12, 0.05);
                char.add(stalk);
                const eyeball = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), eyeWhite);
                eyeball.position.set(sx, eyeY + 0.2, 0.05);
                char.add(eyeball);
                const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), eyeBlack);
                pupil.position.set(sx, eyeY + 0.21, 0.1);
                char.add(pupil);
            }
        }

        // ---- HATS / ACCESSORIES ----
        const hatY = style.headShape === 'tall' ? 1.32 : 1.22;

        if (style.hatType === 'pirate') {
            const brim = new THREE.Mesh(
                new THREE.CylinderGeometry(0.22, 0.22, 0.03, 12),
                new THREE.MeshStandardMaterial({ color: 0x1d3557 })
            );
            brim.position.set(0, hatY, 0);
            char.add(brim);
            const crown = new THREE.Mesh(
                new THREE.CylinderGeometry(0.12, 0.16, 0.12, 8),
                new THREE.MeshStandardMaterial({ color: 0x1d3557 })
            );
            crown.position.set(0, hatY + 0.08, 0);
            char.add(crown);
            // Skull emblem
            const skull = new THREE.Mesh(
                new THREE.SphereGeometry(0.03, 6, 4),
                eyeWhite
            );
            skull.position.set(0, hatY + 0.08, 0.13);
            char.add(skull);
        } else if (style.hatType === 'chef') {
            const chefHat = new THREE.Mesh(
                new THREE.CylinderGeometry(0.18, 0.15, 0.25, 10),
                new THREE.MeshStandardMaterial({ color: 0xffffff })
            );
            chefHat.position.set(0, hatY + 0.1, 0);
            char.add(chefHat);
            // Puff top
            const puff = new THREE.Mesh(
                new THREE.SphereGeometry(0.2, 10, 8),
                new THREE.MeshStandardMaterial({ color: 0xffffff })
            );
            puff.position.set(0, hatY + 0.25, 0);
            char.add(puff);
        } else if (style.hatType === 'gradcap') {
            const board = new THREE.Mesh(
                new THREE.BoxGeometry(0.35, 0.02, 0.35),
                new THREE.MeshStandardMaterial({ color: 0x222222 })
            );
            board.position.set(0, hatY + 0.02, 0);
            char.add(board);
            // Tassel
            const tassel = new THREE.Mesh(
                new THREE.CylinderGeometry(0.01, 0.01, 0.12, 4),
                new THREE.MeshStandardMaterial({ color: 0xffd166 })
            );
            tassel.position.set(0.15, hatY - 0.04, 0.15);
            char.add(tassel);
        } else if (style.hatType === 'leaves') {
            // Carrot leaves
            for (let i = 0; i < 3; i++) {
                const leaf = new THREE.Mesh(
                    new THREE.ConeGeometry(0.04, 0.3, 4),
                    new THREE.MeshStandardMaterial({ color: 0x38b000 })
                );
                leaf.position.set((i - 1) * 0.06, hatY + 0.2, 0);
                leaf.rotation.z = (i - 1) * 0.3;
                char.add(leaf);
            }
        } else if (style.hatType === 'antennae') {
            // Lobster antennae
            for (const sx of [-0.08, 0.08]) {
                const ant = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.01, 0.015, 0.25, 4),
                    new THREE.MeshStandardMaterial({ color: 0xff4444 })
                );
                ant.position.set(sx, hatY + 0.12, 0);
                ant.rotation.z = sx > 0 ? -0.3 : 0.3;
                char.add(ant);
            }
        } else if (style.hatType === 'antenna') {
            // Robot antenna
            const pole = new THREE.Mesh(
                new THREE.CylinderGeometry(0.015, 0.015, 0.15, 6),
                new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.5 })
            );
            pole.position.set(0, hatY + 0.08, 0);
            char.add(pole);
            const ball = new THREE.Mesh(
                new THREE.SphereGeometry(0.04, 8, 6),
                new THREE.MeshStandardMaterial({ color: 0xff6b35, emissive: 0xff3300, emissiveIntensity: 0.5 })
            );
            ball.position.set(0, hatY + 0.17, 0);
            char.add(ball);
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
            'apple': 'Assets/3d Models /Items/RedApple.glb',
            'bread': 'Assets/3d Models /Items/Bread.glb',
            'beans': 'Assets/3d Models /Items/GreenBeancan.glb',
        };
        for (const [key, path] of Object.entries(models)) {
            this.gltfLoader.load(path, (gltf) => {
                const m = gltf.scene;
                m.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
                this.loadedModels[key] = m;
            }, undefined, () => { /* silently skip missing models */ });
        }
    }

    setItems(items) {
        this.itemMeshes.forEach(m => this.scene.remove(m));
        this.baggedMeshes.forEach(m => this.scene.remove(m));
        this.itemMeshes = [];
        this.baggedMeshes = [];
        if (this.holdingItem) { this.scene.remove(this.holdingItem); this.holdingItem = null; }

        items.forEach((item, i) => {
            let mesh;
            const key = item.name.toLowerCase();
            if (this.loadedModels[key]) {
                mesh = this.loadedModels[key].clone();
                mesh.scale.setScalar(0.2);
            } else {
                // Procedural shape based on color
                const geo = i % 3 === 0
                    ? new THREE.SphereGeometry(0.09, 10, 8)
                    : i % 3 === 1
                        ? new THREE.BoxGeometry(0.14, 0.14, 0.14)
                        : new THREE.CylinderGeometry(0.07, 0.07, 0.15, 8);
                mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: item.color, roughness: 0.45 }));
            }
            mesh.castShadow = true;

            mesh.userData = { isItem: true, itemData: item, index: i, scanned: false };

            // Place on belt — centered in camera view
            const spacing = 0.35;
            const startX = -0.4 - ((items.length - 1) * spacing) / 2;
            mesh.position.set(startX + i * spacing, 0.99, 0);
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

    // ===== INTERACTION =====
    _onClick(e) {
        if (e.target.tagName === 'BUTTON' || e.target.closest('.floating-receipt') || e.target.closest('.floating-payment')) return;

        this.mouseVec.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouseVec.y = -(e.clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouseVec, this.camera);

        if (this.holdingItem) {
            // Try to scan
            const hits = this.raycaster.intersectObject(this.scannerHitbox);
            if (hits.length > 0) {
                this._scanItem();
            } else {
                // Drop back — smooth animation
                const item = this.holdingItem;
                const origPos = this.holdingOrigPos;
                this.holdingItem = null;
                this.holdingOrigPos = null;
                this.itemMeshes.push(item);
                this._animateObj(item, { x: origPos.x, y: origPos.y, z: origPos.z }, 200);
            }
        } else {
            // Try to pick up
            const hits = this.raycaster.intersectObjects(this.itemMeshes, true);
            if (hits.length > 0) {
                let obj = hits[0].object;
                while (obj.parent && obj.parent.type !== 'Scene') {
                    if (obj.userData && obj.userData.isItem) break;
                    obj = obj.parent;
                }
                if (obj && obj.userData && obj.userData.isItem) {
                    this._pickUp(obj);
                }
            }
        }
    }

    _pickUp(mesh) {
        this.holdingItem = mesh;
        this.holdingOrigPos = mesh.position.clone();
        this.itemMeshes = this.itemMeshes.filter(m => m !== mesh);

        // Smooth animate to "held" position
        this._animateObj(mesh, { x: 0.35, y: 1.25, z: 0.6 }, 200);

        // Pulse the scan ring to hint where to click
        if (this.scanRing) {
            this.scanRing.material.emissiveIntensity = 1.5;
            setTimeout(() => { if (this.scanRing) this.scanRing.material.emissiveIntensity = 0.8; }, 600);
        }
    }

    _scanItem() {
        const item = this.holdingItem;
        this.holdingItem = null;
        this.holdingOrigPos = null;
        item.userData.scanned = true;

        this.flashScanner();
        if (this.onScan) this.onScan(item.userData.itemData, item.userData.index);

        // Animate to bagged area (right of scanner)
        const bagX = 1.5 + Math.random() * 0.5;
        const bagZ = -0.2 + Math.random() * 0.3;
        this._animateObj(item, { x: bagX, y: 0.99, z: bagZ }, 300);
        this.baggedMeshes.push(item);
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

        // Held item: gentle bob + spin
        if (this.holdingItem) {
            this.holdingItem.rotation.y = t * 1.2;
            this.holdingItem.position.y = 1.25 + Math.sin(t * 4) * 0.015;
        }

        // Pulse scan ring
        if (this.scanRing && this.holdingItem) {
            this.scanRing.material.emissiveIntensity = 0.8 + Math.sin(t * 6) * 0.4;
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
