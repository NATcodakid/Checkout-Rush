/**
 * scene.js — Three.js 3D scene for Checkout Rush v2.
 *
 * FIRST-PERSON perspective with Raycaster interaction.
 * Features: Manual item scanning, side-queue for customers, improved lighting.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ===== CHARACTER STYLES =====
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
    constructor(container, onScanCallback) {
        this.container = container;
        this.onScan = onScanCallback; // Called when player successfully scans an item

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = new THREE.Clock();
        this.gltfLoader = new GLTFLoader();

        // Interaction
        this.raycaster = new THREE.Raycaster();
        this.mouseVec = new THREE.Vector2();
        this.holdingItem = null; // The item mesh currently picked up

        // Object groups
        this.counter = null;
        this.register = null;
        this.scannerGroup = null;
        this.itemMeshes = [];
        this.baggedMeshes = []; // Items that have been scanned

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
        this.cameraBasePos = new THREE.Vector3(0, 1.65, 1.2);
        this.cameraLookTarget = new THREE.Vector3(0, 0.9, -2);

        this._init();
    }

    _init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x6ec6ff);
        this.scene.fog = new THREE.Fog(0x6ec6ff, 10, 25);

        this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.05, 50);
        this.camera.position.copy(this.cameraBasePos);
        this.camera.lookAt(this.cameraLookTarget);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        this.container.appendChild(this.renderer.domElement);

        this.container.addEventListener('mousemove', (e) => {
            this.mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
            this.mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
        });

        // Click to interact/scan
        this.container.addEventListener('click', (e) => this._onClick(e));

        this._setupLighting();
        this._buildStore();
        this._buildCounter();
        this._buildRegister();
        this._buildScanner();
        this._defineQueuePositions();
        this._preloadModels();

        window.addEventListener('resize', () => this._onResize());

        this._animate();
    }

    // ===== LIGHTING =====
    _setupLighting() {
        const ambient = new THREE.AmbientLight(0xffeedd, 0.6);
        this.scene.add(ambient);

        const hemi = new THREE.HemisphereLight(0x87ceeb, 0xdeb887, 0.3);
        this.scene.add(hemi);

        const main = new THREE.DirectionalLight(0xfff8f0, 0.9);
        main.position.set(2, 6, 3);
        main.castShadow = true;
        main.shadow.mapSize.width = 2048;
        main.shadow.mapSize.height = 2048;
        main.shadow.camera.near = 0.5;
        main.shadow.camera.far = 15;
        this.scene.add(main);

        const fill = new THREE.DirectionalLight(0xaaddff, 0.3);
        fill.position.set(-4, 4, 1);
        this.scene.add(fill);

        // Spot on register
        const registerSpot = new THREE.SpotLight(0xffd166, 0.7, 6, Math.PI / 5, 0.5, 1);
        registerSpot.position.set(1.5, 3.5, 0.5);
        registerSpot.target.position.set(1.5, 0, 0.5);
        this.scene.add(registerSpot);
        this.scene.add(registerSpot.target);
    }

    // ===== ENVIRONMENT =====
    _buildStore() {
        const floorGeo = new THREE.PlaneGeometry(16, 16);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0xf5e6ca, roughness: 0.8 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Walls
        const wallMat = new THREE.MeshStandardMaterial({ color: 0xfaf3e0, roughness: 0.9 });
        const backWall = new THREE.Mesh(new THREE.BoxGeometry(16, 4, 0.2), wallMat);
        backWall.position.set(0, 2, -5);
        backWall.receiveShadow = true;
        this.scene.add(backWall);

        // Shelving (Back wall)
        this._buildShelvingUnit(-3, -4.5);
        this._buildShelvingUnit(0, -4.5);
        this._buildShelvingUnit(3, -4.5);
    }

    _buildShelvingUnit(x, z) {
        const unitGroup = new THREE.Group();
        const shelfMat = new THREE.MeshStandardMaterial({ color: 0xb08968, roughness: 0.6 });
        for (const side of [-0.9, 0.9]) {
            const up = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.8, 0.45), shelfMat);
            up.position.set(side, 1.4, 0);
            unitGroup.add(up);
        }
        for (let y = 0.5; y <= 2.5; y += 0.65) {
            const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.06, 0.45), shelfMat);
            shelf.position.set(0, y, 0);
            shelf.castShadow = true;
            shelf.receiveShadow = true;
            unitGroup.add(shelf);

            // Random props
            const num = Math.floor(Math.random() * 4) + 1;
            for (let i = 0; i < num; i++) {
                const prop = new THREE.Mesh(
                    new THREE.BoxGeometry(0.15, 0.2, 0.15),
                    new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff })
                );
                prop.position.set(-0.6 + i * 0.4, y + 0.13, 0);
                prop.castShadow = true;
                unitGroup.add(prop);
            }
        }
        unitGroup.position.set(x, 0, z);
        this.scene.add(unitGroup);
    }

    _buildCounter() {
        const group = new THREE.Group();
        const topMat = new THREE.MeshStandardMaterial({ color: 0xeae5d9, roughness: 0.4 });
        const mainTop = new THREE.Mesh(new THREE.BoxGeometry(5, 0.08, 1.0), topMat);
        mainTop.position.set(0, 0.92, 0);
        mainTop.castShadow = true;
        mainTop.receiveShadow = true;
        group.add(mainTop);

        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x90caf9, roughness: 0.8 });
        const body = new THREE.Mesh(new THREE.BoxGeometry(5, 0.92, 1.0), bodyMat);
        body.position.set(0, 0.46, 0);
        body.receiveShadow = true;
        group.add(body);

        // Conveyor belt
        const belt = new THREE.Mesh(
            new THREE.BoxGeometry(2.5, 0.015, 0.6),
            new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 })
        );
        belt.position.set(-1.0, 0.965, 0);
        belt.receiveShadow = true;
        group.add(belt);

        this.counter = group;
        this.scene.add(group);
    }

    _buildScanner() {
        const group = new THREE.Group();
        const base = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.05, 0.4),
            new THREE.MeshStandardMaterial({ color: 0x333333 })
        );
        group.add(base);

        const upright = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 0.4, 0.08),
            new THREE.MeshStandardMaterial({ color: 0x222222 })
        );
        upright.position.set(0, 0.2, -0.15);
        group.add(upright);

        // Scanner glass
        const glass = new THREE.Mesh(
            new THREE.BoxGeometry(0.25, 0.3, 0.02),
            new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0x880000, transparent: true, opacity: 0.8 })
        );
        glass.position.set(0, 0.2, -0.1);
        group.add(glass);

        // Hitbox for raycaster (invisible, larger bounds for clicking scanner)
        const hitboxGeo = new THREE.BoxGeometry(0.6, 0.5, 0.6);
        const hitboxMat = new THREE.MeshBasicMaterial({ visible: false });
        this.scannerHitbox = new THREE.Mesh(hitboxGeo, hitboxMat);
        this.scannerHitbox.position.set(0, 0.2, 0);
        this.scannerHitbox.userData.isScanner = true;
        group.add(this.scannerHitbox);

        this.scanLight = new THREE.PointLight(0xff2222, 0, 1.5);
        this.scanLight.position.set(0, 0.2, 0);
        group.add(this.scanLight);

        group.position.set(0.6, 0.96, 0);
        this.scannerGroup = group;
        this.scene.add(group);
    }

    _buildRegister() {
        const group = new THREE.Group();
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(0.6, 0.4, 0.5),
            new THREE.MeshStandardMaterial({ color: 0x263238 })
        );
        body.position.y = 0.2;
        group.add(body);

        this.registerScreen = new THREE.Mesh(
            new THREE.BoxGeometry(0.45, 0.3, 0.02),
            new THREE.MeshStandardMaterial({ color: 0x66ff66, emissive: 0x33cc33, emissiveIntensity: 0.5 })
        );
        this.registerScreen.position.set(0, 0.45, 0.2);
        this.registerScreen.rotation.x = -0.2;
        group.add(this.registerScreen);

        group.position.set(1.8, 0.96, 0.1);
        this.scene.add(group);
    }

    // ===== QUEUE & CHARACTERS =====
    _defineQueuePositions() {
        // Active closer to center/scanner, queue stretches to the right
        this.queuePositions = [
            new THREE.Vector3(0.5, 0, -1.4), // Active
            new THREE.Vector3(2.5, 0, -1.4), // Queue 1
            new THREE.Vector3(4.0, 0, -1.4), // Queue 2
            new THREE.Vector3(5.5, 0, -1.4), // Queue 3
        ];
    }

    _buildCharacter(style) {
        const char = new THREE.Group();
        const bodyMat = new THREE.MeshStandardMaterial({ color: style.bodyColor, roughness: 0.6 });
        const headMat = new THREE.MeshStandardMaterial({ color: style.headColor, roughness: 0.5 });

        const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.65, 12), bodyMat);
        torso.position.y = 0.55;
        torso.castShadow = true;
        char.add(torso);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), headMat);
        head.position.y = 1.08;
        head.castShadow = true;
        char.add(head);

        // Eyes
        const eyeW = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const eyeP = new THREE.MeshBasicMaterial({ color: 0x111111 });
        if (style.eyeStyle === 'big') {
            for (const sx of [-0.09, 0.09]) {
                const w = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), eyeW);
                w.position.set(sx, 1.1, 0.17);
                char.add(w);
                const p = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), eyeP);
                p.position.set(sx, 1.11, 0.22);
                char.add(p);
            }
        }

        // Setup base Y correctly so they don't hover
        char.position.y = 0;
        return char;
    }

    setupQueue(count) {
        this.customerQueue.forEach(c => this.scene.remove(c));
        if (this.activeCustomer) this.scene.remove(this.activeCustomer);
        this.customerQueue = [];
        this.activeCustomer = null;

        for (let i = 0; i < Math.min(count, this.queuePositions.length); i++) {
            const style = CHARACTER_STYLES[Math.floor(Math.random() * CHARACTER_STYLES.length)];
            const char = this._buildCharacter(style);
            char.position.copy(this.queuePositions[i]);
            // Look towards player/counter
            char.lookAt(new THREE.Vector3(char.position.x, 0, 2));

            if (i === 0) {
                // Active customer specifically looks right at player
                char.lookAt(new THREE.Vector3(0, 0, 1));
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
                // Current customer leaves to the left (negative x)
                const leaving = this.activeCustomer;
                this._animateObject(leaving, { x: -4 }, 800, () => this.scene.remove(leaving));
            }
            this.activeCustomer = null;
            if (this.customerQueue.length === 0) {
                resolve(); return;
            }

            setTimeout(() => {
                this.activeCustomer = this.customerQueue.shift();
                this.activeCustomer.lookAt(new THREE.Vector3(0, 0, 1));

                const all = [this.activeCustomer, ...this.customerQueue];
                all.forEach((char, i) => {
                    const target = this.queuePositions[i];
                    this._animateObject(char, { x: target.x, z: target.z }, 500);
                });
                setTimeout(resolve, 550);
            }, 300);
        });
    }

    addToQueue() {
        const count = (this.activeCustomer ? 1 : 0) + this.customerQueue.length;
        if (count >= this.queuePositions.length) return;
        const style = CHARACTER_STYLES[Math.floor(Math.random() * CHARACTER_STYLES.length)];
        const char = this._buildCharacter(style);
        char.position.copy(this.queuePositions[count]);
        char.position.x += 2; // spawn further right
        char.lookAt(new THREE.Vector3(char.position.x, 0, 2));
        this.scene.add(char);
        this.customerQueue.push(char);
        this._animateObject(char, { x: this.queuePositions[count].x }, 600);
    }

    // ===== ITEMS & INTERACTION =====
    _preloadModels() {
        const models = {
            'apple': 'Assets/3d Models /Items/RedApple.glb',
            'bread': 'Assets/3d Models /Items/Bread.glb',
            'beans': 'Assets/3d Models /Items/GreenBeancan.glb',
            'juice': 'Assets/3d Models /Items/GreenBeancan.glb' /* fallback juice to beans for now */
        };

        for (const [key, path] of Object.entries(models)) {
            this.gltfLoader.load(path, (gltf) => {
                const model = gltf.scene;
                model.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
                this.loadedModels[key] = model;
            });
        }
    }

    setItems(items) {
        // Clear old
        this.itemMeshes.forEach(m => this.scene.remove(m));
        this.baggedMeshes.forEach(m => this.scene.remove(m));
        this.itemMeshes = [];
        this.baggedMeshes = [];
        if (this.holdingItem) {
            this.scene.remove(this.holdingItem);
            this.holdingItem = null;
        }

        // Spawn on conveyor
        items.forEach((item, i) => {
            let mesh;
            if (this.loadedModels[item.name.toLowerCase()]) {
                mesh = this.loadedModels[item.name.toLowerCase()].clone();
                mesh.scale.setScalar(0.18);
            } else {
                mesh = new THREE.Mesh(
                    new THREE.BoxGeometry(0.15, 0.15, 0.15),
                    new THREE.MeshStandardMaterial({ color: item.color, roughness: 0.5 })
                );
            }
            mesh.castShadow = true;

            // Interaction data
            mesh.userData = { isItem: true, itemData: item, index: i, scanned: false };

            // Place on left belt closer to center
            mesh.position.set(-1.2 + (i * 0.3), 0.98 + 0.075, 0); // precise Y
            mesh.rotation.y = Math.random() * Math.PI;

            // Hitbox for raycasting to make small models clickable
            const hitbox = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), new THREE.MeshBasicMaterial({ visible: false }));
            hitbox.userData = mesh.userData; // sharing userdata
            mesh.add(hitbox);

            this.itemMeshes.push(mesh);
            this.scene.add(mesh);
        });
    }

    _onClick(e) {
        // Don't interact if click in UI
        if (e.target.tagName === 'BUTTON' || e.target.closest('#checkout-panel')) return;

        this.mouseVec.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouseVec.y = -(e.clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouseVec, this.camera);

        if (this.holdingItem) {
            // Check if clicking scanner
            const intersects = this.raycaster.intersectObject(this.scannerHitbox);
            if (intersects.length > 0) {
                this._scanHoldingItem();
            } else {
                // If they click somewhere else, drop it back on the belt
                this.holdingItem.position.set(-1.0, 1.055, 0); // generic drop pos
                this.itemMeshes.push(this.holdingItem);
                this.holdingItem = null;
            }
        } else {
            // Check if clicking unscanned item
            const intersects = this.raycaster.intersectObjects(this.itemMeshes, true);
            if (intersects.length > 0) {
                // Find root group
                let current = intersects[0].object;
                while (current.parent && current.parent.type !== 'Scene') {
                    if (current.userData && current.userData.isItem) break;
                    current = current.parent;
                }
                if (current && current.userData.isItem) {
                    this._pickUpItem(current);
                }
            }
        }
    }

    _pickUpItem(mesh) {
        this.holdingItem = mesh;
        // Remove from itemMeshes so it isn't picked up twice
        this.itemMeshes = this.itemMeshes.filter(m => m !== mesh);

        // Move directly to camera view instantly (like holding it)
        this.holdingItem.position.set(0.4, 1.2, 0.5); // float in front of right side
        this.holdingItem.rotation.set(0, 0, 0);
    }

    _scanHoldingItem() {
        const item = this.holdingItem;
        this.holdingItem = null;
        item.userData.scanned = true;
        this.baggedMeshes.push(item);

        // Flash scanner
        this.flashScanner();

        // Notify game logic
        if (this.onScan) {
            this.onScan(item.userData.itemData, item.userData.index);
        }

        // Animate off scanner to the bagging area (right side)
        item.position.copy(this.scannerGroup.position);
        item.position.y += 0.2;

        const targetX = 2.2 + Math.random() * 0.4;
        const targetZ = -0.3 + Math.random() * 0.4;
        this._animateObject(item, { x: targetX, z: targetZ }, 300);
    }

    flashScanner() {
        if (!this.scanLight) return;
        this.scanLight.intensity = 1.0;
        setTimeout(() => this.scanLight.intensity = 0, 200);
    }

    flashRegister(correct) {
        if (!this.registerScreen) return;
        this.registerScreen.material.emissive.setHex(correct ? 0x00ff88 : 0xff3333);
        this.registerScreen.material.emissiveIntensity = 1.5;
        setTimeout(() => this.registerScreen.material.emissive.setHex(0x33cc33), 400);
    }

    customerReact(correct) {
        if (!this.activeCustomer) return;
        const c = this.activeCustomer;
        const startY = c.position.y;
        let elapsed = 0;
        const bounce = () => {
            elapsed += 16;
            if (elapsed > 400) { c.position.y = startY; return; }
            if (correct) {
                c.position.y = startY + Math.sin(elapsed / 60 * Math.PI) * 0.15;
            } else {
                c.position.x += (Math.random() - 0.5) * 0.05; // slight shake
            }
            requestAnimationFrame(bounce);
        };
        bounce();
    }

    // ===== RENDER LOOP =====
    _animate() {
        this.animationId = requestAnimationFrame(() => this._animate());
        const elapsed = this.clock.getElapsedTime();

        // Organic mouse sway
        const targetX = this.cameraBasePos.x + this.mouseX * 0.2;
        const targetY = this.cameraBasePos.y + this.mouseY * -0.1;
        this.camera.position.x += (targetX - this.camera.position.x) * 0.1;
        this.camera.position.y += (targetY - this.camera.position.y) * 0.1;

        const lookX = this.cameraLookTarget.x + this.mouseX * 0.4;
        const lookY = this.cameraLookTarget.y + this.mouseY * -0.15;
        this.camera.lookAt(lookX, lookY, this.cameraLookTarget.z);

        // Held item follows camera slightly
        if (this.holdingItem) {
            this.holdingItem.rotation.y = elapsed * 1.5; // spin slowly
            // Float in hand
            this.holdingItem.position.y = 1.2 + Math.sin(elapsed * 5) * 0.02;
        }

        this.renderer.render(this.scene, this.camera);
    }

    _onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    _animateObject(obj, target, dur, onComplete) {
        const startX = obj.position.x;
        const startZ = obj.position.z;
        const dx = (target.x !== undefined ? target.x : startX) - startX;
        const dz = (target.z !== undefined ? target.z : startZ) - startZ;
        const startT = performance.now();
        const tick = () => {
            const t = Math.min((performance.now() - startT) / dur, 1);
            const ease = 1 - Math.pow(1 - t, 3);
            obj.position.x = startX + dx * ease;
            obj.position.z = startZ + dz * ease;
            if (t < 1) requestAnimationFrame(tick);
            else if (onComplete) onComplete();
        };
        requestAnimationFrame(tick);
    }

    dispose() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        this.renderer.dispose();
        if (this.renderer.domElement.parentNode) this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
}
