/**
 * scene.js — Three.js 3D scene for Checkout Rush.
 *
 * Creates: checkout counter, cash register, grocery items on the counter,
 * customer characters, and the cozy mini-market environment.
 *
 * Uses Three.js r160 via import maps (see index.html).
 */

import * as THREE from 'three';

// ===== SCENE MANAGER =====

export class CheckoutScene {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = new THREE.Clock();

        // Object references
        this.counter = null;
        this.register = null;
        this.itemMeshes = [];
        this.customerMesh = null;
        this.customerGroup = null;

        // Animation state
        this.animationId = null;
        this.customerBob = 0;

        this._init();
    }

    _init() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb); // light sky blue

        // Fog for depth
        this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.02);

        // Camera — looking down at counter from an isometric-ish angle
        this.camera = new THREE.PerspectiveCamera(
            50,
            window.innerWidth / window.innerHeight,
            0.1,
            100
        );
        this.camera.position.set(0, 5, 7);
        this.camera.lookAt(0, 1, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        this.container.appendChild(this.renderer.domElement);

        // Lighting
        this._setupLighting();

        // Environment — floor, walls, shelves
        this._buildEnvironment();

        // Checkout counter
        this._buildCounter();

        // Cash register
        this._buildRegister();

        // Resize handler
        window.addEventListener('resize', () => this._onResize());

        // Start render loop
        this._animate();
    }

    // ===== LIGHTING =====
    _setupLighting() {
        // Warm ambient
        const ambient = new THREE.AmbientLight(0xfff5e6, 0.6);
        this.scene.add(ambient);

        // Main directional (sun through window)
        const sun = new THREE.DirectionalLight(0xffffff, 0.9);
        sun.position.set(5, 10, 5);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.near = 0.5;
        sun.shadow.camera.far = 30;
        sun.shadow.camera.left = -10;
        sun.shadow.camera.right = 10;
        sun.shadow.camera.top = 10;
        sun.shadow.camera.bottom = -10;
        this.scene.add(sun);

        // Fill light from left
        const fill = new THREE.DirectionalLight(0x88ccff, 0.3);
        fill.position.set(-5, 3, 2);
        this.scene.add(fill);

        // Point light above register (warm glow)
        const registerLight = new THREE.PointLight(0xffd166, 0.6, 8, 2);
        registerLight.position.set(0, 3.5, 0);
        this.scene.add(registerLight);
    }

    // ===== ENVIRONMENT =====
    _buildEnvironment() {
        // Floor
        const floorGeo = new THREE.PlaneGeometry(20, 20);
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0xdeb887,
            roughness: 0.8,
            metalness: 0.05,
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Floor pattern — checkerboard-ish tiles
        for (let x = -4; x < 5; x++) {
            for (let z = -2; z < 8; z++) {
                if ((x + z) % 2 === 0) {
                    const tileGeo = new THREE.PlaneGeometry(1, 1);
                    const tileMat = new THREE.MeshStandardMaterial({
                        color: 0xc9a96e,
                        roughness: 0.9,
                    });
                    const tile = new THREE.Mesh(tileGeo, tileMat);
                    tile.rotation.x = -Math.PI / 2;
                    tile.position.set(x + 0.5, 0.005, z + 0.5);
                    tile.receiveShadow = true;
                    this.scene.add(tile);
                }
            }
        }

        // Back wall
        const wallGeo = new THREE.PlaneGeometry(20, 8);
        const wallMat = new THREE.MeshStandardMaterial({
            color: 0xfaf3e0,
            roughness: 0.9,
        });
        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.position.set(0, 4, -3);
        wall.receiveShadow = true;
        this.scene.add(wall);

        // Shelves on back wall
        this._buildShelf(-3, 2.5, -2.8);
        this._buildShelf(0, 2.5, -2.8);
        this._buildShelf(3, 2.5, -2.8);
        this._buildShelf(-3, 3.8, -2.8);
        this._buildShelf(0, 3.8, -2.8);
        this._buildShelf(3, 3.8, -2.8);

        // Decorative boxes on shelves
        this._addShelfItems();

        // "OPEN" sign
        this._buildSign();
    }

    _buildShelf(x, y, z) {
        const shelfGeo = new THREE.BoxGeometry(2.5, 0.08, 0.5);
        const shelfMat = new THREE.MeshStandardMaterial({
            color: 0x8b6914,
            roughness: 0.7,
        });
        const shelf = new THREE.Mesh(shelfGeo, shelfMat);
        shelf.position.set(x, y, z);
        shelf.castShadow = true;
        shelf.receiveShadow = true;
        this.scene.add(shelf);
    }

    _addShelfItems() {
        const colors = [0xe63946, 0x457b9d, 0x2a9d8f, 0xf4a261, 0xe76f51, 0x264653];
        const positions = [
            [-3.5, 2.7, -2.7], [-3, 2.7, -2.7], [-2.5, 2.7, -2.7],
            [-0.5, 2.7, -2.7], [0, 2.7, -2.7], [0.5, 2.7, -2.7],
            [2.5, 2.7, -2.7], [3, 2.7, -2.7], [3.5, 2.7, -2.7],
            [-3.5, 4.0, -2.7], [-3, 4.0, -2.7],
            [-0.3, 4.0, -2.7], [0.3, 4.0, -2.7],
            [2.5, 4.0, -2.7], [3, 4.0, -2.7], [3.5, 4.0, -2.7],
        ];
        positions.forEach((pos, i) => {
            const size = 0.2 + Math.random() * 0.15;
            const geo = Math.random() > 0.5
                ? new THREE.BoxGeometry(size, size * 1.2, size)
                : new THREE.CylinderGeometry(size * 0.4, size * 0.4, size * 1.2, 8);
            const mat = new THREE.MeshStandardMaterial({
                color: colors[i % colors.length],
                roughness: 0.6,
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(...pos);
            mesh.castShadow = true;
            this.scene.add(mesh);
        });
    }

    _buildSign() {
        // Simple "OPEN" sign on the wall
        const signGeo = new THREE.BoxGeometry(1.8, 0.7, 0.05);
        const signMat = new THREE.MeshStandardMaterial({
            color: 0x06d6a0,
            roughness: 0.4,
            emissive: 0x06d6a0,
            emissiveIntensity: 0.3,
        });
        const sign = new THREE.Mesh(signGeo, signMat);
        sign.position.set(0, 5.2, -2.9);
        this.scene.add(sign);

        // Neon glow effect
        const glowGeo = new THREE.BoxGeometry(1.9, 0.8, 0.02);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0x06d6a0,
            transparent: true,
            opacity: 0.15,
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.set(0, 5.2, -2.85);
        this.scene.add(glow);
    }

    // ===== CHECKOUT COUNTER =====
    _buildCounter() {
        const counterGroup = new THREE.Group();

        // Main counter surface
        const topGeo = new THREE.BoxGeometry(5, 0.12, 1.8);
        const topMat = new THREE.MeshStandardMaterial({
            color: 0xf5f0e1,
            roughness: 0.3,
            metalness: 0.05,
        });
        const top = new THREE.Mesh(topGeo, topMat);
        top.position.y = 1.2;
        top.castShadow = true;
        top.receiveShadow = true;
        counterGroup.add(top);

        // Counter body
        const bodyGeo = new THREE.BoxGeometry(5, 1.2, 1.8);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x8ecae6,
            roughness: 0.7,
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.6;
        body.castShadow = true;
        body.receiveShadow = true;
        counterGroup.add(body);

        // Conveyor belt stripe
        const beltGeo = new THREE.BoxGeometry(3.5, 0.02, 0.6);
        const beltMat = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.5,
        });
        const belt = new THREE.Mesh(beltGeo, beltMat);
        belt.position.set(-0.5, 1.27, -0.3);
        counterGroup.add(belt);

        // Belt lines
        for (let i = 0; i < 8; i++) {
            const lineGeo = new THREE.BoxGeometry(0.02, 0.025, 0.55);
            const lineMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
            const line = new THREE.Mesh(lineGeo, lineMat);
            line.position.set(-2 + i * 0.5, 1.28, -0.3);
            counterGroup.add(line);
        }

        // Divider
        const divGeo = new THREE.BoxGeometry(0.08, 0.15, 1.8);
        const divMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
        const div = new THREE.Mesh(divGeo, divMat);
        div.position.set(1.5, 1.34, 0);
        counterGroup.add(div);

        this.counter = counterGroup;
        this.scene.add(counterGroup);
    }

    // ===== CASH REGISTER =====
    _buildRegister() {
        const registerGroup = new THREE.Group();

        // Body
        const bodyGeo = new THREE.BoxGeometry(0.8, 0.5, 0.6);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x264653,
            roughness: 0.4,
            metalness: 0.2,
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.25;
        body.castShadow = true;
        registerGroup.add(body);

        // Screen
        const screenGeo = new THREE.BoxGeometry(0.5, 0.35, 0.05);
        const screenMat = new THREE.MeshStandardMaterial({
            color: 0x88ff88,
            emissive: 0x44cc44,
            emissiveIntensity: 0.4,
            roughness: 0.2,
        });
        const screen = new THREE.Mesh(screenGeo, screenMat);
        screen.position.set(0, 0.55, 0.28);
        screen.rotation.x = -0.2;
        registerGroup.add(screen);

        // Buttons (decorative)
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                const btnGeo = new THREE.BoxGeometry(0.08, 0.03, 0.08);
                const btnMat = new THREE.MeshStandardMaterial({
                    color: 0xffffff,
                    roughness: 0.6,
                });
                const btn = new THREE.Mesh(btnGeo, btnMat);
                btn.position.set(-0.12 + c * 0.12, 0.51, -0.05 + r * 0.12);
                registerGroup.add(btn);
            }
        }

        // Cash drawer (slightly open)
        const drawerGeo = new THREE.BoxGeometry(0.7, 0.12, 0.35);
        const drawerMat = new THREE.MeshStandardMaterial({
            color: 0x1d3557,
            roughness: 0.5,
        });
        const drawer = new THREE.Mesh(drawerGeo, drawerMat);
        drawer.position.set(0, 0.06, 0.45);
        registerGroup.add(drawer);

        registerGroup.position.set(2, 1.26, 0);
        this.register = registerGroup;
        this.scene.add(registerGroup);
    }

    // ===== GROCERY ITEMS ON COUNTER =====
    /**
     * Display items on the counter conveyor belt.
     * @param {Array} items — array of { name, emoji, color, price }
     */
    setItems(items) {
        // Clear previous items
        this.clearItems();

        items.forEach((item, i) => {
            const group = new THREE.Group();

            // Item body — simple low-poly shape
            let geo;
            const shape = item.name.toLowerCase();
            if (['apple', 'tomato', 'grapes'].includes(shape)) {
                geo = new THREE.SphereGeometry(0.18, 8, 6);
            } else if (['milk', 'juice'].includes(shape)) {
                geo = new THREE.BoxGeometry(0.18, 0.35, 0.18);
            } else if (['bread', 'pizza'].includes(shape)) {
                geo = new THREE.BoxGeometry(0.3, 0.15, 0.2);
            } else if (['banana', 'carrot'].includes(shape)) {
                geo = new THREE.CylinderGeometry(0.05, 0.08, 0.3, 6);
            } else {
                geo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
            }

            const mat = new THREE.MeshStandardMaterial({
                color: item.color,
                roughness: 0.5,
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.castShadow = true;
            group.add(mesh);

            // Price tag (small white box)
            const tagGeo = new THREE.BoxGeometry(0.15, 0.08, 0.01);
            const tagMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const tag = new THREE.Mesh(tagGeo, tagMat);
            tag.position.set(0, -0.2, 0.12);
            group.add(tag);

            // Position on conveyor
            const spacing = 0.65;
            const startX = -1.5;
            group.position.set(startX + i * spacing, 1.5, -0.3);

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

    // ===== CUSTOMER =====
    /**
     * Show a customer standing across the counter.
     * @param {{ bodyColor: number, headColor: number }} customerData
     */
    setCustomer(customerData) {
        this.clearCustomer();

        this.customerGroup = new THREE.Group();

        // Body
        const bodyGeo = new THREE.CylinderGeometry(0.3, 0.35, 0.9, 8);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: customerData.bodyColor,
            roughness: 0.6,
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.45;
        body.castShadow = true;
        this.customerGroup.add(body);

        // Head
        const headGeo = new THREE.SphereGeometry(0.22, 8, 6);
        const headMat = new THREE.MeshStandardMaterial({
            color: customerData.headColor,
            roughness: 0.5,
        });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.1;
        head.castShadow = true;
        this.customerGroup.add(head);

        // Eyes
        const eyeGeo = new THREE.SphereGeometry(0.04, 6, 4);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.08, 1.14, 0.18);
        this.customerGroup.add(leftEye);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.08, 1.14, 0.18);
        this.customerGroup.add(rightEye);

        // Smile
        const smileGeo = new THREE.TorusGeometry(0.06, 0.015, 4, 8, Math.PI);
        const smileMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
        const smile = new THREE.Mesh(smileGeo, smileMat);
        smile.position.set(0, 1.05, 0.19);
        smile.rotation.x = Math.PI;
        this.customerGroup.add(smile);

        // Arms
        for (const side of [-1, 1]) {
            const armGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.5, 6);
            const armMat = new THREE.MeshStandardMaterial({
                color: customerData.bodyColor,
                roughness: 0.6,
            });
            const arm = new THREE.Mesh(armGeo, armMat);
            arm.position.set(side * 0.4, 0.5, 0);
            arm.rotation.z = side * 0.3;
            arm.castShadow = true;
            this.customerGroup.add(arm);
        }

        // Position customer across the counter
        this.customerGroup.position.set(0, 0, -1.8);
        this.scene.add(this.customerGroup);
    }

    clearCustomer() {
        if (this.customerGroup) {
            this.scene.remove(this.customerGroup);
            this.customerGroup.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
            this.customerGroup = null;
        }
    }

    // ===== ANIMATIONS =====
    /**
     * Flash the register screen green or red.
     */
    flashRegister(correct) {
        if (!this.register) return;
        const screen = this.register.children.find(c =>
            c.material && c.material.emissive
        );
        if (!screen) return;

        const origColor = 0x44cc44;
        const flashColor = correct ? 0x00ff88 : 0xff3333;

        screen.material.emissive.setHex(flashColor);
        screen.material.emissiveIntensity = 1.0;

        setTimeout(() => {
            screen.material.emissive.setHex(origColor);
            screen.material.emissiveIntensity = 0.4;
        }, 500);
    }

    /**
     * Make the customer react — happy bounce or sad shake.
     */
    customerReact(correct) {
        if (!this.customerGroup) return;

        if (correct) {
            // Happy bounce
            const startY = this.customerGroup.position.y;
            let elapsed = 0;
            const bounce = () => {
                elapsed += 16;
                if (elapsed > 600) {
                    this.customerGroup.position.y = startY;
                    return;
                }
                this.customerGroup.position.y = startY + Math.sin(elapsed / 100 * Math.PI) * 0.15;
                requestAnimationFrame(bounce);
            };
            bounce();
        } else {
            // Sad shake
            const startX = this.customerGroup.position.x;
            let elapsed = 0;
            const shake = () => {
                elapsed += 16;
                if (elapsed > 400) {
                    this.customerGroup.position.x = startX;
                    return;
                }
                this.customerGroup.position.x = startX + Math.sin(elapsed / 30 * Math.PI) * 0.08;
                requestAnimationFrame(shake);
            };
            shake();
        }
    }

    // ===== RENDER LOOP =====
    _animate() {
        this.animationId = requestAnimationFrame(() => this._animate());

        const delta = this.clock.getDelta();
        const elapsed = this.clock.getElapsedTime();

        // Customer idle bob
        if (this.customerGroup) {
            this.customerGroup.position.y = Math.sin(elapsed * 1.5) * 0.03;
        }

        // Items gentle float
        this.itemMeshes.forEach((item, i) => {
            item.position.y = 1.5 + Math.sin(elapsed * 2 + i * 0.5) * 0.02;
            item.rotation.y = Math.sin(elapsed * 0.8 + i) * 0.1;
        });

        this.renderer.render(this.scene, this.camera);
    }

    _onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    // ===== CLEANUP =====
    dispose() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        this.clearItems();
        this.clearCustomer();
        this.renderer.dispose();
        if (this.renderer.domElement.parentNode) {
            this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
    }
}
