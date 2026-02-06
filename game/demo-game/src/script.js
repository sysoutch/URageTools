// Game variables
let scene, camera, renderer;
let controls;
let player, enemies = [], bullets = [], powerUps = [], explosions = [];
let playerVelocity = new THREE.Vector3();
let onGround = true;
const gravity = -0.05;
const jumpSpeed = 0.35;
const glideGravity = -0.02;
let gameActive = false;
let score = 0;
let lives = 3;
let level = 1;
let keys = {};
let clock = new THREE.Clock();
let basePlayerSpeed = 0.2;
let playerSpeed = basePlayerSpeed;
let speedBoostEndTime = 0;
let enemySpeed = 0.05;
let bulletSpeed = 0.5;
let lastEnemySpawn = 0;
let enemySpawnRate = 1000; // milliseconds
let powerUpSpawnRate = 20000; // milliseconds
let lastPowerUpSpawn = 0;

// Initialize Three.js scene
function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000022);
    scene.fog = new THREE.Fog(0x000022, 20, 100);

    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, 5); // slightly above player

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    
    // Set up OrbitControls for third‑person view
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    // controls.target.set(0, -2, 0); // initially look at player position
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, -2, 0); // initially look at player position
    controls.update();
    document.getElementById('gameContainer').appendChild(renderer.domElement);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 1);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0x00aaff, 1, 100);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);

    // Create ground plane
    const planeGeometry = new THREE.PlaneGeometry(200, 200);
    const planeMaterial = new THREE.MeshPhongMaterial({ color: 0x444444 });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    scene.add(plane);
    
    // Add some cube houses
    const houseGeom = new THREE.BoxGeometry(2, 3, 2);
    const houseMat = new THREE.MeshPhongMaterial({ color: 0x888888 });
    for (let i = 0; i < 10; i++) {
        const house = new THREE.Mesh(houseGeom, houseMat);
        house.position.set((Math.random() - 0.5) * 80, 1.5, (Math.random() - 0.5) * 80);
        house.castShadow = true;
        house.receiveShadow = true;
        scene.add(house);
    }
    
    // Create player as a capsule that walks on a surface
    // Capsule geometry is not bundled in the CDN version of Three.js.
    // Use a cylinder with zero end radius to approximate a capsule.
    const playerGeometry = new THREE.CylinderGeometry(0.4, 0.4, 1.5, 8);
    const playerMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x00aaff,
        shininess: 100,
        emissive: 0x0044aa
    });
    player = new THREE.Mesh(playerGeometry, playerMaterial);
    player.rotation.x = Math.PI;
    // Position player slightly above ground to avoid z-fighting
    player.position.y = 1.25;
    player.castShadow = true;
    
    // Add a glow effect to the player
    const glowGeometry = new THREE.SphereGeometry(0.6, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x0088ff,
        transparent: true,
        opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.copy(player.position);
    scene.add(glow);
    player.userData = { glow: glow };
    
    scene.add(player);

    // Add stars in the background
    createStars();

    // Event listeners - make sure DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupEventListeners);
    } else {
        setupEventListeners();
    }

    // Start animation loop
    animate();
}

function setupEventListeners() {
    window.addEventListener('resize', onWindowResize);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('click', shoot);
    document.getElementById('startButton').addEventListener('click', startGame);
    document.getElementById('restartButton').addEventListener('click', startGame);
}

function createStars() {
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.1,
        sizeAttenuation: true
    });

    const starVertices = [];
    for (let i = 0; i < 10000; i++) {
        const x = (Math.random() - 0.5) * 200;
        const y = (Math.random() - 0.5) * 200;
        const z = (Math.random() - 0.5) * 200;
        starVertices.push(x, y, z);
    }

    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyDown(event) {
    keys[event.key] = true;
}

function onKeyUp(event) {
    keys[event.key] = false;
}

function shoot() {
    if (!gameActive) return;
    
    const bulletGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const bulletMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xffff00,
        emissive: 0xffaa00
    });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    
    bullet.position.copy(player.position);
    bullet.position.z += 0.5;
    bullet.castShadow = true;
    
    // Add velocity to bullet
    bullet.userData = { velocity: new THREE.Vector3(0, 0, bulletSpeed) };
    
    scene.add(bullet);
    bullets.push(bullet);
    
    // Play shoot sound
    playSound('shoot');
}

function startGame() {
    gameActive = true;
    score = 0;
    lives = 3;
    level = 1;
    player.position.set(0, -2, 0);
    updateUI();
    
    // Hide screens
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameOverScreen').style.display = 'none';
    
    // Clear enemies and bullets
    enemies.forEach(enemy => scene.remove(enemy));
    bullets.forEach(bullet => scene.remove(bullet));
    enemies = [];
    bullets = [];
}

function updateUI() {
    document.getElementById('score').textContent = `Score: ${score}`;
    document.getElementById('lives').textContent = `Lives: ${lives}`;
    document.getElementById('level').textContent = `Level: ${level}`;
    document.getElementById('finalScore').textContent = `Score: ${score}`;
}

function spawnEnemy() {
    if (!gameActive) return;
    
    // Randomly choose enemy type
    const enemyTypes = ['octahedron', 'cube', 'sphere'];
    const enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
    
    let enemyGeometry, enemyMaterial;
    
    switch(enemyType) {
        case 'cube':
            enemyGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
            enemyMaterial = new THREE.MeshPhongMaterial({ 
                color: 0xff0000,
                shininess: 50,
                emissive: 0xaa0000
            });
            break;
        case 'sphere':
            enemyGeometry = new THREE.SphereGeometry(0.5, 16, 16);
            enemyMaterial = new THREE.MeshPhongMaterial({ 
                color: 0xff5555,
                shininess: 50,
                emissive: 0xaa0000
            });
            break;
        default: // octahedron
            enemyGeometry = new THREE.OctahedronGeometry(0.5, 0);
            enemyMaterial = new THREE.MeshPhongMaterial({ 
                color: 0xff0000,
                shininess: 50,
                emissive: 0xaa0000
            });
    }
    
    const enemy = new THREE.Mesh(enemyGeometry, enemyMaterial);
    
    // Position enemy at random location above the player
    enemy.position.set(
        (Math.random() - 0.5) * 10,
        5,
        (Math.random() - 0.5) * 10
    );
    
    enemy.castShadow = true;
    scene.add(enemy);
    enemies.push(enemy);
}

function updateEnemies() {
    const delta = clock.getDelta();
    const time = clock.getElapsedTime();
    
    // Move enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        enemy.position.y -= enemySpeed;
        
        // Remove enemies that go below the player
        if (enemy.position.y < -5) {
            scene.remove(enemy);
            enemies.splice(i, 1);
            continue;
        }
        
        // Check collision with player
        const distance = player.position.distanceTo(enemy.position);
        if (distance < 1) {
            scene.remove(enemy);
            enemies.splice(i, 1);
            lives--;
            updateUI();
            if (lives <= 0) {
                gameOver();
            }
        }
    }
    
    // Spawn new enemies
    if (time - lastEnemySpawn > enemySpawnRate / 1000) {
        spawnEnemy();
        lastEnemySpawn = time;
        
        // Increase difficulty
        if (enemySpawnRate > 500) {
            enemySpawnRate -= 10;
        }
    }
    
    // Spawn power-ups occasionally
    spawnPowerUp();
}

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.position.add(bullet.userData.velocity);
        
        // Remove bullets that go too far
        if (bullet.position.z > 20) {
            scene.remove(bullet);
            bullets.splice(i, 1);
            continue;
        }
        
        // Check bullet-enemy collisions
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            const distance = bullet.position.distanceTo(enemy.position);
            if (distance < 0.8) {
                scene.remove(bullet);
                scene.remove(enemy);
                bullets.splice(i, 1);
                enemies.splice(j, 1);
                score += 100;
                updateUI();
                
                // Create explosion effect
                createExplosion(enemy.position);
                break;
            }
        }
    }
}

function updatePlayer() {
    if (!gameActive) return;
    // Apply physics
    const dt = 0.016; // approx frame time
    const gravityToApply = (onGround && keys['Space']) ? glideGravity : gravity;
    playerVelocity.y += gravityToApply * dt;
    player.position.addScaledVector(playerVelocity, dt);
    // Simple ground collision
    if (player.position.y <= 1) {
        player.position.y = 1;
        playerVelocity.y = 0;
        onGround = true;
    } else {
        onGround = false;
    }
    // Reset temporary speed boost if its time is over
    if (speedBoostEndTime > 0 && clock.getElapsedTime() > speedBoostEndTime) {
        playerSpeed = basePlayerSpeed;
        speedBoostEndTime = 0;
    }
    
    // Handle player movement in XZ plane
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    let move = new THREE.Vector3();
    if (keys['ArrowUp'] || keys['w'] || keys['W']) {
        move.add(forward);
    }
    if (keys['ArrowDown'] || keys['s'] || keys['S']) {
        move.sub(forward);
    }
    if (keys['ArrowRight'] || keys['d'] || keys['D']) {
        move.add(right);
    }
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
        move.sub(right);
    }
    if (move.lengthSq() > 0) {
        move.normalize();
        player.position.addScaledVector(move, playerSpeed);
    }
    // Jump
    if (keys['Space'] && onGround) {
        playerVelocity.y = jumpSpeed;
        onGround = false;
    }
    
    // Keep player within bounds
    player.position.x = Math.max(-5, Math.min(5, player.position.x));
    player.position.y = Math.max(-2, Math.min(2, player.position.y));
    
    // Add a slight visual effect when moving
    if (keys['ArrowLeft'] || keys['a'] || keys['A'] || keys['ArrowRight'] || keys['d'] || keys['D']) {
        player.material.emissive.setHex(0x0066ff);
    } else {
        player.material.emissive.setHex(0x0044aa);
    }
}

function gameOver() {
    gameActive = false;
    document.getElementById('gameOverScreen').style.display = 'flex';
}

// ----------------- Power‑up handling -----------------
// Spawn a power‑up at random intervals.  Each power‑up can be
// either a life bonus or a temporary speed boost.
function spawnPowerUp() {
    const time = clock.getElapsedTime();
    if (time - lastPowerUpSpawn < powerUpSpawnRate / 1000) return;

    const types = ['life', 'speed'];
    const type = types[Math.floor(Math.random() * types.length)];

    const geometry = new THREE.SphereGeometry(0.2, 8, 8);
    const material = new THREE.MeshPhongMaterial({
        color: type === 'life' ? 0x00ff00 : 0xff0000,
        emissive: type === 'life' ? 0x004400 : 0x440000,
    });
    const power = new THREE.Mesh(geometry, material);
    power.position.set(
        (Math.random() - 0.5) * 8,
        5,
        (Math.random() - 0.5) * 8
    );
    power.castShadow = true;
    power.userData = {
        type,
        velocity: new THREE.Vector3(0, -0.05, 0),
    };
    scene.add(power);
    powerUps.push(power);
    lastPowerUpSpawn = time;
}

// Update existing power‑ups: move them, check for collision with
// the player, and apply the effect.
function updatePowerUps() {
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const power = powerUps[i];
        power.position.add(power.userData.velocity);

        // Remove if it goes out of bounds
        if (power.position.y < -5) {
            scene.remove(power);
            powerUps.splice(i, 1);
            continue;
        }

        const dist = player.position.distanceTo(power.position);
        if (dist < 1) {
            scene.remove(power);
            powerUps.splice(i, 1);
            if (power.userData.type === 'life') {
                lives++;
                updateUI();
            } else if (power.userData.type === 'speed') {
                playerSpeed = basePlayerSpeed * 1.5;
                speedBoostEndTime = clock.getElapsedTime() + 5; // 5 seconds
            }
        }
    }
}

function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    
    if (gameActive) {
        updatePlayer();
        updateEnemies();
        updateBullets();
        updatePowerUps();
        updateExplosions();
    }
    
    // Rotate player slowly
    player.rotation.y += 0.01;
    
    // Update player glow effect
    if (player.userData && player.userData.glow) {
        player.userData.glow.position.copy(player.position);
    }
    
    // Rotate enemies
    enemies.forEach(enemy => {
        enemy.rotation.x += 0.01;
        enemy.rotation.y += 0.01;
    });
    
    renderer.render(scene, camera);
    // Update camera controls to follow the player
    if (controls) {
        controls.target.copy(player.position);
        controls.update();
    }
}

function createExplosion(position) {
    const explosionGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const explosionMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xffff00,
        emissive: 0xffaa00,
        transparent: true,
        opacity: 0.8
    });
    const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
    
    explosion.position.copy(position);
    scene.add(explosion);
    explosions.push({
        mesh: explosion,
        life: 1.0
    });
    
    // Play explosion sound
    playSound('explosion');
}

function updateExplosions() {
    for (let i = explosions.length - 1; i >= 0; i--) {
        const explosion = explosions[i];
        explosion.life -= 0.02;
        explosion.mesh.material.opacity = explosion.life;
        
        if (explosion.life <= 0) {
            scene.remove(explosion.mesh);
            explosions.splice(i, 1);
        }
    }
}

// Start the game
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
