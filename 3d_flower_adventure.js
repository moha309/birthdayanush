// Animate the world from black and white to color after picking the final flower
function animateWorldColorization() {
  let anim = window._worldColorAnim;
  if (!anim.active) return;
  // Make blooming animation slower
  anim.t += 0.0045;
  // Animate sky color
  let skyColor = new THREE.Color().lerpColors(new THREE.Color('#222'), new THREE.Color('#e0eafc'), Math.min(anim.t, 1));
  scene.background = skyColor;
  // Animate ground color
  let grassColor = new THREE.Color().lerpColors(new THREE.Color(0x444444), new THREE.Color(0xb3e6b3), Math.min(anim.t, 1));
  ground.material.color.copy(grassColor);

  // Animate flowers growing and appearing across the terrain
  let flowerAppearT = Math.max(0, anim.t - 0.2);
  for (let i = 0; i < flowerStemInstancedMesh.count; i++) {
    if (flowerBloomState[i] === 2) continue;  // Skip fully bloomed flowers
    let stagger = (i % 100) * 0.002 + Math.floor(i/100)*0.01;
    let appear = flowerAppearT - stagger;
    if (appear > 0.01) {
      let scale = Math.min(1, Math.max(0.001, appear*2));
      
      // Get flower position from stem matrix
      let stemMatrix = new THREE.Matrix4();
      flowerStemInstancedMesh.getMatrixAt(i, stemMatrix);
      let stemPos = new THREE.Vector3();
      stemMatrix.decompose(stemPos, new THREE.Quaternion(), new THREE.Vector3());
      
      // Update stem
      stemMatrix.makeTranslation(stemPos.x, 0.25, stemPos.z);
      stemMatrix.scale(new THREE.Vector3(scale, scale, scale));
      flowerStemInstancedMesh.setMatrixAt(i, stemMatrix);

      // Update petals
      for (let p = 0; p < flowerPetalInstancedMeshes.length; p++) {
        let angle = (p / flowerPetalInstancedMeshes.length) * Math.PI * 2;
        let px = stemPos.x + Math.sin(angle) * 0.16;
        let pz = stemPos.z + Math.cos(angle) * 0.16;
        let petalMatrix = new THREE.Matrix4();
        petalMatrix.makeTranslation(px, 0.5, pz);
        petalMatrix.multiply(new THREE.Matrix4().makeRotationY(angle));
        petalMatrix.multiply(new THREE.Matrix4().makeScale(scale, scale*0.5, scale*0.7));
        flowerPetalInstancedMeshes[p].setMatrixAt(i, petalMatrix);
      }

      // Update center
      let centerMatrix = new THREE.Matrix4();
      centerMatrix.makeTranslation(stemPos.x, 0.5, stemPos.z);
      centerMatrix.scale(new THREE.Vector3(scale, scale, scale));
      flowerCenterInstancedMesh.setMatrixAt(i, centerMatrix);

      if (scale === 1) flowerBloomState[i] = 2;
    }
  }

  // Update all instance matrices
  flowerStemInstancedMesh.instanceMatrix.needsUpdate = true;
  for (let p = 0; p < flowerPetalInstancedMeshes.length; p++) {
    flowerPetalInstancedMeshes[p].instanceMatrix.needsUpdate = true;
  }
  flowerCenterInstancedMesh.instanceMatrix.needsUpdate = true;

  // End animation after t=1.2
  if (anim.t > 1.2) {
    anim.active = false;
    document.getElementById('message').textContent = 'Enjoy diva the day is yours';
  }
}

// Minimal mergeBufferGeometries helper (Three.js compatible)
function mergeBufferGeometries(geometries) {
  const merged = THREE.BufferGeometryUtils ? THREE.BufferGeometryUtils.mergeBufferGeometries(geometries) : null;
  if (merged) return merged;
  // Fallback: manual merge for simple geometries
  let mergedGeometry = new THREE.BufferGeometry();
  let positions = [], normals = [], uvs = [], indices = [];
  let indexOffset = 0;
  for (let geo of geometries) {
    if (!geo) continue;
    const pos = geo.attributes.position.array;
    positions.push(...pos);
    if (geo.attributes.normal) normals.push(...geo.attributes.normal.array);
    if (geo.attributes.uv) uvs.push(...geo.attributes.uv.array);
    if (geo.index) {
      for (let idx of geo.index.array) indices.push(idx + indexOffset);
    } else {
      for (let i = 0; i < pos.length / 3; i++) indices.push(i + indexOffset);
    }
    indexOffset += pos.length / 3;
  }
  mergedGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  if (normals.length) mergedGeometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3));
  if (uvs.length) mergedGeometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));

  mergedGeometry.setIndex(indices);
  return mergedGeometry;
}
// 3D Flower Adventure using Three.js

// 3D Flower Adventure - Enhanced Human Avatar, Flower Field, and Cutscenes
let scene, camera, renderer;
let genie, genieDialogueIndex = 0, genieDialogueActive = false, currentGenieEvent = null;
let avatar, ground;
let flowerStemInstancedMesh, flowerPetalInstancedMeshes = [], flowerCenterInstancedMesh, flowerBloomState = [];
let cutscene = null, cutsceneTimer = 0;
let riddle1Solved = false, riddle2Solved = false;
let riddle1, riddle2, leverState = false, colorButtonState = 0;
let keys = {};

// Paper and Quiz state
let paper = null;
let hasPickedUpPaper = false;
let quizActive = false;
let currentQuizQuestion = 0;

// Player and white block global variables
let player = {
    position: new THREE.Vector3(0, 0, 0)
};
let whiteBlock; // Global white block variable

// Challenge completion tracking
let challengesCompleted = {
    quiz: false,
    whiteBlock: false,
    foot: false
};

// Ensure basketball-related variables are declared at the top of the script
let basketballActive = false;
let basketballScore = 0;
let basketballBall, basketballHoop, basketballBackboard;

// Dart and foot variables
let foot;
let darts = [];
let dartScore = 0;

// Ball variables
let balls = [];

// Quiz questions
const QUIZ_QUESTIONS = [
  {
    question: "How much do you like Suddha (Concepts.wav)",
    answers: ["50%", "100%", "100000000%"]
  },
  {
    question: "How much do you hate me?",
    answers: ["100%", "10000%", "Can't even describe it"]
  },
  {
    question: "Do you want to marry sayed mostafa?",
    answers: ["Yes", "Yessss", "Yassss"]
  },
  {
    question: "Do you like the way I flick my tongue?",
    answers: ["Yeah", "Nah", "Orrrr nahhhhhhh"]
  },
  {
    question: "Are you gonna kill me?",
    answers: ["Yes <3", "100% <3333", "I will stab you"]
  }
];

// Phase-based Genie dialogue system - messages persist until phase completion
const GENIE_PHASES = {
  introduction: "Hey anush (I didn't know if I should say hey anush or hey twin), as you can see this is me sayed. I didn't have much time to work on the charachter. I just kept it as a cone and sphere. We will work together now on getting you to your birthday gift. First thing we have to do is check out this paper there, I seen it but I was waiting for you to pull up.",
  paperPickedUp: "I know it doesn't look like a paper but I did my best :(",
  quizCompleted: "Goooddd girlllllll you answered them all. I know you always wanted to see the monster toes so I built one for you. You have to shoot it 10 times. Press F to shoot it ",
  footKicked: "DAMNNNNN You shot it 10 times with ur dick (#needthat). I think we can say you are over your footphobia",
  whiteBlockCompleted: "Slayyyyy I wanted to make it paint the nails only but I couldn't build the nails. Stay tuned next year tho",
  finalFlowerReached: "Thats it for my mini game. I wanted to do more but ended up keeping it simple. Click the space button to actually get ur gift",
  adventureComplete: "This is what I spent most of the time building. I hope you like ur virtual and actual cake <3 Happy birthday twinnn"
};

// Function to play robotic sound effect
function playGenieRoboticSound() {
  // Create a simple robotic beep sound using Web Audio API
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(220, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(440, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch (error) {
    // Silently fail if Web Audio API is not supported
    console.log("Audio not supported");
  }
}

// Function to create a birthday cake
function createBirthdayLauncher() {
  const cakeGroup = new THREE.Group();
  
  // GIGANTIC cake base (cylinder) - 8x bigger than original
  const cakeBase = new THREE.Mesh(
    new THREE.CylinderGeometry(8, 8, 4, 16),
    new THREE.MeshLambertMaterial({ color: 0xffb3ba })
  );
  cakeBase.position.y = 2;
  cakeGroup.add(cakeBase);
  
  // White frosting layer - 8x bigger
  const frosting = new THREE.Mesh(
    new THREE.CylinderGeometry(7.5, 7.5, 1.5, 16),
    new THREE.MeshLambertMaterial({ color: 0xffffff })
  );
  frosting.position.y = 4.8;
  cakeGroup.add(frosting);
  
  // Add MASSIVE candles with flames - 8x bigger
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const x = Math.cos(angle) * 5.5;
    const z = Math.sin(angle) * 5.5;
    
    // HUGE Candle - 8x bigger
    const candle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 2.5, 8),
      new THREE.MeshLambertMaterial({ color: 0xffff99 })
    );
    candle.position.set(x, 7, z);
    cakeGroup.add(candle);
    
    // HUGE Flame - 8x bigger
    const flame = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 8, 8),
      new THREE.MeshLambertMaterial({ color: 0xff6b35, emissive: 0xff4500, emissiveIntensity: 0.5 })
    );
    flame.position.set(x, 8.5, z);
    cakeGroup.add(flame);
  }
  
  // Create birthday banner - make it vertical and more visible
  const bannerGroup = new THREE.Group();
  
  // Banner poles (left and right) - make them taller for the giant cake
  const poleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 6, 8);
  const poleMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 }); // Brown poles
  
  const leftPole = new THREE.Mesh(poleGeometry, poleMaterial);
  leftPole.position.set(-8, 12, 0);
  bannerGroup.add(leftPole);
  
  const rightPole = new THREE.Mesh(poleGeometry, poleMaterial);
  rightPole.position.set(8, 12, 0);
  bannerGroup.add(rightPole);
  
  // Banner background - make it bigger for the giant cake
  const bannerGeometry = new THREE.PlaneGeometry(16, 3);
  const bannerMaterial = new THREE.MeshLambertMaterial({ 
    color: 0xff69b4, // Hot pink background
    side: THREE.DoubleSide 
  });
  const banner = new THREE.Mesh(bannerGeometry, bannerMaterial);
  banner.position.set(0, 12, 0);
  // Keep it vertical, no rotation
  bannerGroup.add(banner);
  
  // Create larger, more visible text blocks
  const message = "Happy Birthday to the best anush ever!";
  const letterWidth = 0.3;
  const letterHeight = 0.4;
  const letterDepth = 0.15;
  const letterSpacing = 0.35;
  const startX = -(message.length * letterSpacing) / 2;
  
  for (let i = 0; i < message.length; i++) {
    if (message[i] !== ' ') {
      const letterGeometry = new THREE.BoxGeometry(letterWidth, letterHeight, letterDepth);
      const letterMaterial = new THREE.MeshLambertMaterial({ 
        color: 0xffffff,
        emissive: 0x222222,
        emissiveIntensity: 0.2
      }); // White text with slight glow
      const letter = new THREE.Mesh(letterGeometry, letterMaterial);
      letter.position.set(startX + i * letterSpacing, 12, 0.2); // Slightly in front of banner
      bannerGroup.add(letter);
    }
  }
  
  cakeGroup.add(bannerGroup);
  
  return cakeGroup;
}

init();
animate();

function createHumanAvatar() {
  const group = new THREE.Group();
  // Roblox-style blocky body, all white
  const whiteMat = new THREE.MeshLambertMaterial({color: 0xffffff});
  // Torso (box)
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.52, 0.22), whiteMat);
  torso.position.set(0, 1.32, 0);
  group.add(torso);
  // Legs (boxes)
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.6, 0.18), whiteMat);
  legL.position.set(-0.1, 0.65, 0);
  group.add(legL);
  const legR = legL.clone(); legR.position.x = 0.1;
  group.add(legR);
  // Arms (boxes, attached directly to torso)
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.48, 0.15), whiteMat);
  armL.position.set(-0.265, 1.32, 0);
  group.add(armL);
  const armR = armL.clone(); armR.position.x = 0.265;
  group.add(armR);
  group.armL = armL;
  group.armR = armR;
  // Nails (cylinders, blocky style, attached to arms)
  const handL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.11, 16), whiteMat);
  handL.position.set(-0.265, 1.05, 0);
  handL.rotation.z = Math.PI/2;
  group.add(handL);
  const handR = handL.clone(); handR.position.x = 0.265;
  group.add(handR);
  // Store hand references for easy access
  group.handL = handL;
  group.handR = handR;
  // Head (Roblox-style: box, sits flush on torso, lowered to remove gap)
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.32), whiteMat);
  head.position.set(0, 1.38, 0);
  group.add(head);
  group.head = head;
  // Face (Roblox-style: flat features)
  // Eyes (flat black cylinders, moved down with head)
  const eyeGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.02, 16);
  const eyeMat = new THREE.MeshLambertMaterial({color: 0x222222});
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat); eyeL.position.set(-0.07, 2.26, 0.18); eyeL.rotation.x = Math.PI/2;
  const eyeR = eyeL.clone(); eyeR.position.x = 0.07;
  group.add(eyeL, eyeR);
  // Smile (flat, wide, pink box, moved down with head)
  const smile = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.018, 0.02), new THREE.MeshLambertMaterial({color: 0xf48fb1}));
  smile.position.set(0, 2.21, 0.18);
  group.add(smile);
  // Realistic hair: many strands using BufferGeometry and LineSegments (static, not animated, moved down with head)
  const hairStrandCount = 40000;
  const hairGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(hairStrandCount * 6);
  // True hemisphere using spherical coordinates for even root distribution
  const r = 0.285;
  for (let i = 0; i < hairStrandCount; i++) {
    // Fibonacci sphere, restrict phi to [0, PI/1.1] for upper hemisphere
    const phi = Math.acos(1 - Math.random());
    const phiBiased = phi * Math.pow(Math.random(), 0.5);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    // Lower the root of the hair to cover the neck area
    const y0 = 2.02 + Math.cos(phiBiased) * r; // was 2.12, now 2.02
    const x0 = Math.cos(theta) * Math.sin(phiBiased) * r + (Math.random()-0.5)*0.008;
    const z0 = Math.sin(theta) * Math.sin(phiBiased) * r + (Math.random()-0.5)*0.008;
    // Make strands longer, especially in the back
    let strandLen = 0.32 + Math.random() * 0.22;
    // Extra length for lower hemisphere (back)
    if (phiBiased > Math.PI/2) strandLen += 0.13;
    const x1 = x0 + (Math.random()-0.5)*0.03;
    const y1 = y0 - strandLen;
    const z1 = z0 + (Math.random()-0.5)*0.03;
    positions.set([x0, y0, z0, x1, y1, z1], i*6);
  }
  hairGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const hairMaterial = new THREE.LineBasicMaterial({color: 0x222222, linewidth: 2});
  const hairLines = new THREE.LineSegments(hairGeometry, hairMaterial);
  group.add(hairLines);
  group.hairLines = hairLines;
  // Add a scalp cap for better coverage (moved down with head)
  const scalp = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 18, 12, 0, Math.PI*2, 0, Math.PI/1.1),
    new THREE.MeshLambertMaterial({color: 0x222222, transparent: true, opacity: 0.92})
  );
  scalp.position.y = 2.02;
  group.add(scalp);
  group.position.set(0, 0, -115); // Moved 100 units back
  return group;
}

function createFlower(x, z) {
  // Standalone flower mesh for the final flower (not instanced)
  const group = new THREE.Group();
  // Stem
  const stemGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8);
  const stemMat = new THREE.MeshLambertMaterial({color: 0x4caf50});
  const stemMesh = new THREE.Mesh(stemGeo, stemMat);
  stemMesh.position.y = 0.25;
  group.add(stemMesh);
  // Petal
  const petalGeo = new THREE.SphereGeometry(0.13, 8, 8);
  const petalMat = new THREE.MeshLambertMaterial({color: 0xff69b4});
  const petalMesh = new THREE.Mesh(petalGeo, petalMat);
  petalMesh.position.set(0, 0.5, 0.18);
  group.add(petalMesh);
  // Center
  const centerGeo = new THREE.SphereGeometry(0.09, 8, 8);
  const centerMat = new THREE.MeshLambertMaterial({color: 0xffeb3b});
  const centerMesh = new THREE.Mesh(centerGeo, centerMat);
  centerMesh.position.set(0, 0.5, 0);
  group.add(centerMesh);
  group.position.set(x, 0, z);
  return group;
}

function initPaper() {
    // Create the paper
    const paperGeometry = new THREE.PlaneGeometry(1, 1.4);
    const paperMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xf5f5dc, // Beige color
        side: THREE.DoubleSide
    });
    paper = new THREE.Mesh(paperGeometry, paperMaterial);
    paper.position.set(0, 0.2, -100); // Positioned in front of avatar (avatar starts at -200)
    paper.rotation.x = -Math.PI / 4;
    paper.rotation.y = Math.PI;
    scene.add(paper);
}

function init() {
  // Create scene and renderer first
  scene = new THREE.Scene();
  // Start with black and white world
  scene.background = new THREE.Color('#222');

  // Create message container (hidden by default)
  const messageContainer = document.createElement('div');
  messageContainer.id = 'message';
  messageContainer.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 10px 20px;
    border-radius: 5px;
    font-family: Arial, sans-serif;
    font-size: 16px;
    z-index: 1000;
    text-align: center;
    display: none;
  `;
  document.body.appendChild(messageContainer);

  // Create paper dialogue element
  const paperDialogue = document.createElement('div');
  paperDialogue.id = 'paper-dialogue';
  paperDialogue.style.cssText = `
    position: absolute;
    min-width: 140px;
    background: rgba(0,0,0,0.85);
    color: #fff;
    padding: 10px 16px;
    border-radius: 12px;
    font-family: Arial, sans-serif;
    font-size: 1.2em;
    font-weight: bold;
    text-align: center;
    display: none;
    pointer-events: none;
    z-index: 1000;
    text-shadow: 0 2px 4px rgba(0,0,0,0.5);
    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
  `;
  paperDialogue.textContent = 'Press K to read';
  document.body.appendChild(paperDialogue);

  // Create white block dialogue (similar to paper dialogue)
  const whiteBlockDialogue = document.createElement('div');
  whiteBlockDialogue.id = 'whiteblock-dialogue';
  whiteBlockDialogue.style.cssText = `
    position: absolute;
    background: rgba(0,0,0,0.85);
    color: #fff;
    padding: 10px 16px;
    border-radius: 12px;
    font-family: Arial, sans-serif;
    font-size: 1.2em;
    font-weight: bold;
    text-align: center;
    display: none;
    pointer-events: none;
    z-index: 1000;
    text-shadow: 0 2px 4px rgba(0,0,0,0.5);
    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
  `;
  whiteBlockDialogue.textContent = 'Press G to interact';
  document.body.appendChild(whiteBlockDialogue);

  // Create genie dialogue popup
  const dialoguePopup = document.createElement('div');
  dialoguePopup.id = 'genie-dialogue-popup';
  dialoguePopup.style.cssText = `
    position: absolute;
    min-width: 220px;
    background: rgba(30,40,60,0.92);
    color: #fff;
    padding: 16px 18px;
    border-radius: 16px;
    font-family: monospace;
    font-size: 1.15em;
    text-align: center;
    display: none;
    pointer-events: none;
    z-index: 1000;
  `;
  document.body.appendChild(dialoguePopup);

  // Create login screen
  const loginScreen = document.createElement('div');
  loginScreen.id = 'login-screen';
  loginScreen.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(45deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 20000;
    font-family: 'Arial', sans-serif;
  `;

  const loginContainer = document.createElement('div');
  loginContainer.style.cssText = `
    background: rgba(255, 255, 255, 0.95);
    padding: 40px;
    border-radius: 25px;
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
    text-align: center;
    max-width: 400px;
    width: 90%;
    backdrop-filter: blur(10px);
    border: 2px solid rgba(255, 255, 255, 0.3);
  `;

  const loginTitle = document.createElement('h1');
  loginTitle.style.cssText = `
    color: #ff6b9d;
    font-size: 2.5em;
    margin-bottom: 10px;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
    font-weight: bold;
  `;
  loginTitle.textContent = '🌸 Anush\'s Birthday 🌸';

  const loginSubtitle = document.createElement('p');
  loginSubtitle.style.cssText = `
    color: #666;
    font-size: 1.2em;
    margin-bottom: 30px;
    font-style: italic;
  `;
  loginSubtitle.textContent = 'I told u the password before';

  const passwordInput = document.createElement('input');
  passwordInput.type = 'password';
  passwordInput.placeholder = 'Enter password...';
  passwordInput.style.cssText = `
    width: 100%;
    padding: 15px;
    font-size: 1.1em;
    border: 2px solid #ff9a9e;
    border-radius: 15px;
    margin-bottom: 20px;
    text-align: center;
    background: rgba(255, 255, 255, 0.8);
    outline: none;
    transition: all 0.3s ease;
  `;

  const loginButton = document.createElement('button');
  loginButton.textContent = '✨ Enter the Game ✨';
  loginButton.style.cssText = `
    width: 100%;
    padding: 15px;
    font-size: 1.2em;
    background: linear-gradient(45deg, #ff6b9d, #c44569);
    color: white;
    border: none;
    border-radius: 15px;
    cursor: pointer;
    font-weight: bold;
    transition: all 0.3s ease;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.2);
  `;

  const errorMessage = document.createElement('div');
  errorMessage.style.cssText = `
    color: #e74c3c;
    margin-top: 15px;
    font-size: 1em;
    display: none;
  `;
  errorMessage.textContent = '❌ Oops! Wrong password. Try again!';

  // Add cute decorative elements
  const decoration = document.createElement('div');
  decoration.style.cssText = `
    font-size: 3em;
    margin-bottom: 20px;
    animation: bounce 2s infinite;
  `;
  decoration.textContent = '🧚‍♀️';

  // Add CSS animation for decoration
  const loginStyle = document.createElement('style');
  loginStyle.textContent = `
    @keyframes bounce {
      0%, 20%, 50%, 80%, 100% {
        transform: translateY(0);
      }
      40% {
        transform: translateY(-10px);
      }
      60% {
        transform: translateY(-5px);
      }
    }
    
    #login-screen input:focus {
      border-color: #c44569;
      box-shadow: 0 0 10px rgba(255, 107, 157, 0.3);
    }
    
    #login-screen button:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(255, 107, 157, 0.4);
    }
  `;
  document.head.appendChild(loginStyle);

  // Login functionality
  const checkPassword = () => {
    const password = passwordInput.value;
    if (password === '13JULY2004') {
      loginScreen.style.display = 'none';
      // Start the game intro
      setTimeout(() => {
        triggerGeniePhase('introduction');
      }, 1000);
    } else {
      errorMessage.style.display = 'block';
      passwordInput.value = '';
      passwordInput.style.animation = 'shake 0.5s';
      setTimeout(() => {
        errorMessage.style.display = 'none';
        passwordInput.style.animation = '';
      }, 3000);
    }
  };

  loginButton.addEventListener('click', checkPassword);
  passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      checkPassword();
    }
  });

  // Add shake animation
  loginStyle.textContent += `
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-5px); }
      75% { transform: translateX(5px); }
    }
  `;

  loginContainer.appendChild(decoration);
  loginContainer.appendChild(loginTitle);
  loginContainer.appendChild(loginSubtitle);
  loginContainer.appendChild(passwordInput);
  loginContainer.appendChild(loginButton);
  loginContainer.appendChild(errorMessage);
  loginScreen.appendChild(loginContainer);
  document.body.appendChild(loginScreen);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.1, 1000);
  camera.position.set(0, 4, 12);

  renderer = new THREE.WebGLRenderer({antialias: true});
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Lighting (white, but dim for b&w effect)
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);
  const dir = new THREE.DirectionalLight(0xffffff, 0.4);
  dir.position.set(10, 20, 10);
  scene.add(dir);

  // Create the genie first (since dialogue depends on it)
  createGenie();

  // Initialize paper
  initPaper();

  // Ground (much bigger, light grey)
  const groundGeo = new THREE.BoxGeometry(500, 1, 500); // Expanded by 100 units (was 400x400)
  const groundMat = new THREE.MeshLambertMaterial({color: 0xf0f0f0}); // Very light grey
  ground = new THREE.Mesh(groundGeo, groundMat);
  ground.position.y = -0.5;
  scene.add(ground);

  // Avatar (human form)
  avatar = createHumanAvatar();
  avatar.rotation.y = Math.PI; // Rotate 180 degrees to face forward toward game elements
  scene.add(avatar);

  // Flower field: instanced mesh for performance
  const flowerCountX = 96, flowerCountZ = 96, flowerSpacing = 4;
  const totalFlowers = flowerCountX * flowerCountZ;
  // Flower geometry (stem, multiple petals, center as separate instanced meshes)
  const stemGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8);
  const stemMat = new THREE.MeshLambertMaterial({color: 0x4caf50});
  const petalGeo = new THREE.SphereGeometry(0.09, 8, 8); // smaller, more petal-like
  const petalMat = new THREE.MeshLambertMaterial({color: 0xff69b4});
  const centerGeo = new THREE.SphereGeometry(0.09, 8, 8);
  const centerMat = new THREE.MeshLambertMaterial({color: 0xffeb3b});
  // Create instanced meshes with maximum possible flowers
  flowerStemInstancedMesh = new THREE.InstancedMesh(stemGeo, stemMat, totalFlowers);
  flowerCenterInstancedMesh = new THREE.InstancedMesh(centerGeo, centerMat, totalFlowers);
  flowerStemInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  flowerCenterInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  
  // Multiple petals per flower (6 petals arranged in a circle)
  const PETAL_COUNT = 6;
  flowerPetalInstancedMeshes = [];
  for (let p = 0; p < PETAL_COUNT; p++) {
    let mesh = new THREE.InstancedMesh(petalGeo, petalMat, totalFlowers);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(mesh);
    flowerPetalInstancedMeshes.push(mesh);
  }
  flowerStemInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  flowerCenterInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(flowerStemInstancedMesh);
  scene.add(flowerCenterInstancedMesh);
  // Store bloom state for each flower
  flowerBloomState = [];
  let idx = 0;
  // Initialize all matrices to ensure proper updates
  const identityMatrix = new THREE.Matrix4();
  for (let i = 0; i < totalFlowers; i++) {
    flowerStemInstancedMesh.setMatrixAt(i, identityMatrix);
    flowerCenterInstancedMesh.setMatrixAt(i, identityMatrix);
    for (let p = 0; p < PETAL_COUNT; p++) {
      flowerPetalInstancedMeshes[p].setMatrixAt(i, identityMatrix);
    }
  }
  
  // Place flowers across the terrain
  for (let ix = 0; ix < flowerCountX; ix++) {
    for (let iz = 0; iz < flowerCountZ; iz++) {
      let x = -190 + ix * flowerSpacing + (Math.random()-0.5)*1.5;
      let z = -190 + iz * flowerSpacing + (Math.random()-0.5)*1.5;
      // Avoid placing flowers around the glass
      if (z > 120 && Math.abs(x) < 40) continue;
      
      // Stem
      let stemMatrix = new THREE.Matrix4();
      stemMatrix.setPosition(x, 0, z);
      stemMatrix.scale(new THREE.Vector3(0.001, 0.001, 0.001));
      flowerStemInstancedMesh.setMatrixAt(idx, stemMatrix);
      
      // Petals (arranged in a circle)
      for (let p = 0; p < PETAL_COUNT; p++) {
        let angle = (p / PETAL_COUNT) * Math.PI * 2;
        let px = x + Math.sin(angle) * 0.16;
        let pz = z + Math.cos(angle) * 0.16;
        let petalMatrix = new THREE.Matrix4();
        petalMatrix.setPosition(px, 0.5, pz);
        // Petal faces outward
        petalMatrix.multiply(new THREE.Matrix4().makeRotationY(angle));
        // Flatten petal
        petalMatrix.multiply(new THREE.Matrix4().makeScale(1, 0.5, 0.7));
        // Start hidden
        petalMatrix.scale(new THREE.Vector3(0.001, 0.001, 0.001));
        flowerPetalInstancedMeshes[p].setMatrixAt(idx, petalMatrix);
      }
      
      // Center (offset above stem)
      let centerMatrix = new THREE.Matrix4();
      centerMatrix.setPosition(x, 0.5, z);
      centerMatrix.scale(new THREE.Vector3(0.001, 0.001, 0.001));
      flowerCenterInstancedMesh.setMatrixAt(idx, centerMatrix);
      
      flowerBloomState[idx] = 0; // 0 = hidden, 1 = blooming, 2 = fully visible
      idx++;
    }
  }
  // Update the count and force matrix updates for all meshes
  const actualFlowerCount = idx;
  console.log(`Placed ${actualFlowerCount} flowers out of ${totalFlowers} possible`);
  
  flowerStemInstancedMesh.count = actualFlowerCount;
  flowerCenterInstancedMesh.count = actualFlowerCount;
  for (let p = 0; p < flowerPetalInstancedMeshes.length; p++) {
    flowerPetalInstancedMeshes[p].count = actualFlowerCount;
  }
  
  // Force matrix updates
  flowerStemInstancedMesh.instanceMatrix.needsUpdate = true;
  flowerCenterInstancedMesh.instanceMatrix.needsUpdate = true;
  for (let p = 0; p < flowerPetalInstancedMeshes.length; p++) {
    flowerPetalInstancedMeshes[p].instanceMatrix.needsUpdate = true;
  }

  // Place a single flower in a glass container behind the door
  const glassGeo = new THREE.CylinderGeometry(3, 3, 7, 32);
  const glassMat = new THREE.MeshLambertMaterial({color: 0xcccccc, transparent: true, opacity: 0.35});
  let glass = new THREE.Mesh(glassGeo, glassMat);
  glass.position.set(0, 3.5, 60); // Match the final flower position
  glass.visible = false; // Start invisible until white block is completed
  scene.add(glass);
  scene.glass = glass;

  // Create and add the final flower (standalone mesh)
  let finalFlower = createFlower(0, 60); // Moved further ahead, past the white block
  finalFlower.isFinal = true;
  finalFlower.position.y = 0.5;
  finalFlower.visible = false; // Start invisible until white block is completed
  scene.add(finalFlower);
  scene.finalFlower = finalFlower;

  window.addEventListener('resize', onWindowResize);
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  // Animation state for world colorization
  window._worldColorAnim = {
    active: false,
    t: 0
  };

  // Intro cutscene
  cutscene = 'intro';
  cutsceneTimer = 0;

  // Create quiz UI
  createQuizUI();
  
  // Create white block but keep it initially hidden until foot challenge is completed
  createWhiteBlock();
  if (whiteBlock) {
    whiteBlock.visible = false;
  }
  
  // Trigger genie introduction will happen after successful login
}

function animate() {
  requestAnimationFrame(animate);
  // No hair animation
  if (avatar) animateLimbs();
  if (cutscene) handleCutscene();
  else {
    handleInput();
    updateCamera();
    if (window._worldColorAnim.active) animateWorldColorization();
    updateGenieDialogue();
    updateGeniePosition(); // Update genie position to follow player
  }
  // Update paper dialogue position
  updatePaperDialogue();
  // Update white block dialogue position
  updateWhiteBlockDialogue();

  if (basketballActive) updateSoccerBall();
  animateFoot();
  updateDarts();
  updateBalls();
  
  // Animate and check gem collection
  if (scene.gems) {
    scene.gems.forEach(gem => {
      if (!gem.userData.collected) {
        // Rotate the gem for visual appeal
        gem.rotation.y += 0.02;
        gem.children[0].rotation.x += 0.01; // Rotate the gem itself
        
        // Bob up and down
        gem.position.y = 1.5 + Math.sin(Date.now() * 0.003) * 0.3;
        
        // Check if player is close enough to collect
        const distance = avatar.position.distanceTo(gem.position);
        if (distance < 2) {
          // Collect the gem
          gem.userData.collected = true;
          gem.visible = false;
          
          // Show quiz-style popup message
          showGemPopup(gem.userData.message);
          
          // Play collection sound
          playGenieRoboticSound();
        }
      }
    });
  }
  
  // Animate falling blossoms if they exist
  if (scene.fallingBlossoms) {
    animateFallingBlossoms(scene.fallingBlossoms);
  }
  
  renderer.render(scene, camera);
}

// Define the updateCamera function to handle camera updates in the scene
function updateCamera() {
    // Third-person camera: behind and above the avatar, looking forward
    const camTarget = new THREE.Vector3(
        avatar.position.x,
        avatar.position.y + 1.5,
        avatar.position.z
    );
    
    // Fixed camera position directly behind and above the avatar
    camera.position.set(
        avatar.position.x,
        avatar.position.y + 3.5,
        avatar.position.z - 6
    );
    
    // Always look at the avatar
    camera.lookAt(camTarget);
}

// Window resize handler
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyUp(e) {
    keys[e.key] = false;
}

// Quiz UI initialization
function createQuizUI() {
    const quizContainer = document.createElement('div');
    quizContainer.id = 'quizContainer';
    quizContainer.style.cssText = `
        display: none;
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.9);
        padding: 20px;
        border-radius: 10px;
        color: white;
        text-align: center;
        font-family: Arial, sans-serif;
        min-width: 300px;
        z-index: 1000;
    `;
    document.body.appendChild(quizContainer);
}

function createBall() {
    const ballGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const ballMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 }); // Red color
    const ball = new THREE.Mesh(ballGeometry, ballMaterial);
    ball.position.set(avatar.position.x, avatar.position.y + 1.5, avatar.position.z - 1);
    ball.userData = {
        velocity: new THREE.Vector3(0, 0.2, -0.5) // Initial velocity for projectile motion
    };
    scene.add(ball);
    balls.push(ball);
}

function updateBalls() {
    balls.forEach((ball, index) => {
        // Apply velocity to the ball
        ball.position.add(ball.userData.velocity);

        // Apply gravity
        ball.userData.velocity.y -= 0.01;

        // Check for collision with the foot
        if (foot && ball.position.distanceTo(foot.position) < 2) {
            scene.remove(ball);
            balls.splice(index, 1);
            console.log('Ball hit the foot!');
        }

        // Remove ball if it goes too far
        if (ball.position.y < 0 || ball.position.z < -50) {
            scene.remove(ball);
            balls.splice(index, 1);
        }
    });
}

let footHitCount = 0; // Counter to track hits on the foot

function updateDarts() {
    darts.forEach((dart, index) => {
        // Apply velocity to the dart
        dart.position.add(dart.userData.velocity);

        // Apply gravity
        dart.userData.velocity.y -= 0.01;

        // Check for collision with the foot
        if (foot && dart.position.distanceTo(foot.position) < 2) {
            scene.remove(dart);
            darts.splice(index, 1);
            footHitCount++;
            console.log(`Foot hit count: ${footHitCount}`);

            // Check if the foot has been hit 10 times
            if (footHitCount >= 10) {
                scene.remove(foot);
                foot = null;
                console.log('Foot challenge completed! White block revealed.');

                // Mark foot challenge as completed
                challengesCompleted.foot = true;
                
                // Trigger genie phase for foot kick
                triggerGeniePhase('footKicked');
                
                // Reveal the white block (make it visible)
                if (whiteBlock) {
                    whiteBlock.visible = true;
                }
                
                // Show completion message
                document.getElementById('message').textContent = 'Foot challenge complete! The white block has appeared ahead!';
                setTimeout(() => {
                    document.getElementById('message').textContent = 'Head forward to find the white block and press G to interact';
                }, 3000);
                setTimeout(() => {
                    document.getElementById('message').textContent = 'WASD/Arrows to move, F to shoot, R to restart';
                }, 6000);
              }
        }

        // Remove dart if it goes too far (updated bounds for new map layout)
        if (dart.position.z < -150 || dart.position.z > 100 || dart.position.y < -10) {
            scene.remove(dart);
            darts.splice(index, 1);
        }
    });
}

function showQuizQuestion() {
    if (currentQuizQuestion >= QUIZ_QUESTIONS.length) {
        endQuiz();
        return;
    }

    const question = QUIZ_QUESTIONS[currentQuizQuestion];
    const quizContainer = document.getElementById('quizContainer');
    quizContainer.style.display = 'block';
    
    quizContainer.innerHTML = `
        <h2>Question ${currentQuizQuestion + 1}/${QUIZ_QUESTIONS.length}</h2>
        <p>${question.question}</p>
        <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 20px;">
            ${question.answers.map((answer, index) => `
                <button 
                    style="padding: 10px; margin: 5px; background: #444; border: none; color: white; cursor: pointer; border-radius: 5px;"
                    onclick="handleQuizAnswer(${index})"
                    onmouseover="this.style.background='#666'"
                    onmouseout="this.style.background='#444'"
                >${answer}</button>
            `).join('')}
        </div>
    `;
}

function handleQuizAnswer(answerIndex) {
    // Just move to next question without scoring
    currentQuizQuestion++;
    showQuizQuestion();
}

function endQuiz() {
    const quizContainer = document.getElementById('quizContainer');
    quizContainer.innerHTML = `
        <h2>1st challenge done, goooooddddddd girllllllllll</h2>
    `;

    // Trigger genie phase for quiz completion
    triggerGeniePhase('quizCompleted');

    // Create the huge foot
    createFoot();

    // Automatically hide the quiz container after 5 seconds
    setTimeout(() => {
        quizContainer.style.display = 'none';
    }, 5000);
}

// Close quiz and reset state
function closeQuiz() {
    const quizContainer = document.getElementById('quizContainer');
    quizContainer.style.display = 'none';
    quizActive = false;
    // Reset quiz state
    currentQuizQuestion = 0;
}

// Function to check if all challenges are completed
function checkAllChallengesComplete() {
    if (challengesCompleted.quiz && challengesCompleted.foot && challengesCompleted.whiteBlock) {
        // All challenges completed - final flower is already visible from white block completion
        
        // Trigger genie phase for final flower reveal
        triggerGeniePhase('finalFlowerReached');
        
        document.getElementById('message').textContent = 'All challenges complete! The magical flower is now available!';
        setTimeout(() => {
            document.getElementById('message').textContent = 'Head to the  flower to complete the game!';
        }, 4000);
        setTimeout(() => {
            document.getElementById('message').textContent = 'WASD/Arrows to move, Space to interact/throw, R to restart';
        }, 8000);
        
        console.log('All challenges completed! Final flower revealed.');
    }
}

function createGenie() {
    // Create genie mesh (floating sphere + cylinder)
    genie = new THREE.Group();
    const genieBody = new THREE.Mesh(
        new THREE.SphereGeometry(0.6, 24, 16),
        new THREE.MeshLambertMaterial({color: 0x66e0ff})
    );
    genieBody.position.y = 1.2;
    genie.add(genieBody);

    const genieBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.4, 0.7, 16),
        new THREE.MeshLambertMaterial({color: 0x222266})
    );
    genieBase.position.y = 0.35;
    genie.add(genieBase);

    // Eyes (robotic)
    const eyeGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.04, 16);
    const eyeMat = new THREE.MeshLambertMaterial({color: 0xffffff});
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.18, 1.35, 0.56);
    eyeL.rotation.x = Math.PI/2;
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.18;
    genie.add(eyeL, eyeR);

    // Position genie near the player (in front and to the right)
    genie.position.set(3, 0, -195); // Positioned clearly in front of avatar (avatar at -200)
    scene.add(genie);
}

// Update paper dialogue position
function updatePaperDialogue() {
  const paperDialogue = document.getElementById('paper-dialogue');
  if (!paperDialogue || !paper) return;

  // Project paper position to screen coordinates
  const vector = paper.position.clone();
  vector.y += 2.5; // Position dialogue higher above the paper
  vector.project(camera);

  // Convert to screen coordinates
  const x = (vector.x + 1) * window.innerWidth / 2;
  const y = -(vector.y - 1) * window.innerHeight / 2;

  // Update position
  paperDialogue.style.transform = `translate(${x}px, ${y}px)`;

  // Check if paper is in front of the camera
  const isFacing = paper.position.clone().sub(camera.position).normalize().dot(camera.getWorldDirection(new THREE.Vector3())) > 0;
  
  // Check distance to paper (using same radius as pickup interaction)
  const dx = avatar.position.x - paper.position.x;
  const dy = avatar.position.y - paper.position.y;
  const dz = avatar.position.z - paper.position.z;
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const isNearby = distance < 3; // Same radius as pickup interaction

  // Show/hide dialogue based on visibility and distance
  paperDialogue.style.display = (isFacing && isNearby && !hasPickedUpPaper) ? 'block' : 'none';
}

// Update white block dialogue position and visibility
function updateWhiteBlockDialogue() {
  const whiteBlockDialogue = document.getElementById('whiteblock-dialogue');
  if (!whiteBlockDialogue || !whiteBlock) return;

  // Project white block position to screen coordinates
  const vector = whiteBlock.position.clone();
  vector.y = 2; // Position dialogue at avatar height for better visibility
  vector.project(camera);

  // Convert to screen coordinates
  const x = (vector.x + 1) * window.innerWidth / 2;
  const y = -(vector.y - 1) * window.innerHeight / 2;

  // Update position
  whiteBlockDialogue.style.transform = `translate(${x}px, ${y}px)`;

  // Check if white block is in front of the camera
  const isFacing = whiteBlock.position.clone().sub(camera.position).normalize().dot(camera.getWorldDirection(new THREE.Vector3())) > 0;
  
  // Check distance to white block (using same radius as interaction)
  const dx = avatar.position.x - whiteBlock.position.x;
  const dy = avatar.position.y - whiteBlock.position.y;
  const dz = avatar.position.z - whiteBlock.position.z;
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const isNearby = distance < 20; // Same radius as white block interaction

  // Show/hide dialogue based on visibility, distance, and white block visibility
  whiteBlockDialogue.style.display = (isFacing && isNearby && whiteBlock.visible && !challengesCompleted.whiteBlock) ? 'block' : 'none';
}

// Add event listener for picking up the basketball
window.addEventListener('click', function(event) {
    if (!basketballActive || !basketballBall) return;

    // Raycaster to detect clicks on the ball
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Convert mouse position to normalized device coordinates (-1 to +1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObject(basketballBall);
    if (intersects.length > 0) {
        // Reset ball position to player's hand or starting point
        basketballBall.position.set(0, 1.2, -6.5);
        basketballBall.userData.velocity.set(0, 0, 0);
    }
});

function onKeyDown(e) {
  // Handle paper pickup
  if (e.key.toLowerCase() === 'k' && paper && !hasPickedUpPaper) {
    // Get distance between avatar and paper in all dimensions
    const dx = avatar.position.x - paper.position.x;
    const dy = avatar.position.y - paper.position.y;
    const dz = avatar.position.z - paper.position.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    // Check if player is within pickup radius (3 units in any direction)
    if (distance < 3) {
        hasPickedUpPaper = true;
        scene.remove(paper);
        paper = null;
        // Hide the "Press K" dialogue and show first quiz question
        const paperDialogue = document.getElementById('paper-dialogue');
        if (paperDialogue) paperDialogue.style.display = 'none';
        
        // Trigger genie phase for paper pickup
        triggerGeniePhase('paperPickedUp');
        
        // Start quiz immediately
        showQuizQuestion();
    }
  }

  // Handle existing dialogue
  // Remove space key dialogue advancement - phases persist until completion
  keys[e.key] = true;
  if (cutscene) return;
  // Interact with the flower in the glass container behind the door
  if (e.key === ' ' && scene.finalFlower &&
      Math.abs(avatar.position.x - scene.finalFlower.position.x) < 3.5 &&
      Math.abs(avatar.position.z - scene.finalFlower.position.z) < 3.5 &&
      !window._worldColorAnim.active) {
    
    // Trigger genie phase for final flower completion
    triggerGeniePhase('adventureComplete');
    
    document.getElementById('message').textContent = 'You didnt want to say what is ur fav so I went with this';
    window._worldColorAnim.active = true;
    window._worldColorAnim.t = 0;
    
    // Hide the glass and flower after picking
    scene.glass.visible = false;
    scene.finalFlower.visible = false;
    
    // Create trees around the scene
    const trees = createTrees();
    scene.trees = trees;
    
    // Create falling blossoms
    const fallingBlossoms = createFallingBlossoms();
    scene.fallingBlossoms = fallingBlossoms;
    
    // Make genie disappear 10 seconds after bloom
    setTimeout(() => {
        if (genie) {
            genie.visible = false;
            // Also hide any genie dialogue
            const geniePopup = document.getElementById('genie-dialogue-popup');
            if (geniePopup) {
                geniePopup.style.display = 'none';
            }
        }
    }, 10000);
    
    // Create GIGANTIC birthday cake in front of avatar after a short delay
    setTimeout(() => {
      const birthdayCake = createBirthdayLauncher();
      birthdayCake.position.set(
        avatar.position.x + 15, // Much further away since cake is MASSIVE
        0,
        avatar.position.z + 15
      );
      scene.add(birthdayCake);
      scene.birthdayCake = birthdayCake;
      
      // Create gems around the birthday cake now that it exists!
      createPostBloomGems();
      
      // Show confetti
      showConfetti();
      
      // Trigger final genie phase for adventure completion
      triggerGeniePhase('adventureComplete');
      
      document.getElementById('message').textContent = 'Happy Birthday Anush! 🎂!';
      
      // Create the lake as the final spectacular effect
      setTimeout(() => {
        const lake = createLake();
        scene.lake = lake;
        document.getElementById('message').textContent = ' Explore the map and check out the lake and trees';
      }, 3000);
    }, 2000);
  }
  // Restart (minimal: reset avatar position and cutscene)
  if (e.key === 'r') {
    avatar.position.set(0, 0, -200); // Pushed further back to accommodate paper before foot
    cutscene = 'intro';
    cutsceneTimer = 0;
    document.getElementById('message').textContent = 'WASD/Arrows to move, Space to interact, R to restart';
  }

  // Throw a dart
  if (keys['f'] || keys['F']) {
    createDart();
  }

  // Throw a ball
  if (keys['b']) {
    createBall();
  }
}

// Genie dialogue popup logic
function showGenieDialogue(text) {
  let popup = document.getElementById('genie-dialogue-popup');
  popup.textContent = text;
  popup.style.display = 'block';
  
  // Position at a fixed, always visible location (center-top of screen)
  popup.style.left = '50%';
  popup.style.top = '20%';
  popup.style.transform = 'translateX(-50%)'; // Center horizontally
  popup.style.position = 'fixed'; // Ensure it's always visible
}

function hideGenieDialogue() {
  document.getElementById('genie-dialogue-popup').style.display = 'none';
}

function updateGenieDialogue() {
  // This function is called every frame to update dialogue positioning if needed
  // For now, we use fixed positioning so no updates needed per frame
  // The dialogue stays in a fixed, visible position
}

// Update genie position to follow player
function updateGeniePosition() {
  if (!genie || !avatar) return;
  
  // Desired distance from player
  const desiredDistance = 5; // Increase the distance from 3 to 5
  const minDistance = 4; // Adjust minimum distance accordingly
  const followSpeed = 0.02;

  // Calculate target position (keeping genie to the right and slightly ahead)
  const offsetRight = 3; // Distance to the right of avatar
  const offsetForward = 2; // Distance in front of avatar
  const targetX = avatar.position.x + offsetRight;
  const targetZ = avatar.position.z + offsetForward; // Put genie in front, not behind

  // Get current distance to target position
  const dx = targetX - genie.position.x;
  const dz = targetZ - genie.position.z;
  const currentDistance = Math.sqrt(dx * dx + dz * dz);

  // Only move if we're too far from the target position
  if (currentDistance > 1) { // Smaller threshold since we want genie to stay close
    // Smoothly move towards target position
    genie.position.x += (targetX - genie.position.x) * followSpeed;
    genie.position.z += (targetZ - genie.position.z) * followSpeed;
  }

  // Add floating animation
  const floatHeight = Math.sin(performance.now() * 0.002) * 0.1;
  genie.position.y = 0.2 + floatHeight;

  // Make genie face forward like the avatar
  genie.rotation.y = Math.PI;
}

// Dart and foot logic
function createFoot() {
    const footGroup = new THREE.Group();

    // Create the sole (rectangle)
    const soleGeometry = new THREE.BoxGeometry(4, 0.5, 8); // Scaled up 10x
    const soleMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 }); // Brown color
    const sole = new THREE.Mesh(soleGeometry, soleMaterial);
    sole.position.set(0, 0.25, 0);
    footGroup.add(sole);

    // Create toes (cylinders)
    const toeMaterial = new THREE.MeshLambertMaterial({ color: 0xffd700 }); // Golden color
    const toeGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 16); // Scaled up 10x

    const toePositions = [
        [-1.5, 0.75, 3.5],
        [-0.5, 0.75, 4],
        [0.5, 0.75, 4],
        [1.5, 0.75, 3.5],
    ];

    toePositions.forEach(([x, y, z]) => {
        const toe = new THREE.Mesh(toeGeometry, toeMaterial);
        toe.rotation.x = Math.PI / 2; // Rotate to stand upright
        toe.position.set(x, y, z);
        footGroup.add(toe);
    });

    // Create the ankle (cylinder)
    const ankleGeometry = new THREE.CylinderGeometry(1.5, 1.5, 2, 16); // Scaled up 10x
    const ankleMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 }); // Same color as sole
    const ankle = new THREE.Mesh(ankleGeometry, ankleMaterial);
    ankle.position.set(0, 1.5, -3); // Position above the sole
    footGroup.add(ankle);

    // Rotate the foot to face the player
    footGroup.rotation.y = Math.PI; // Rotate 180 degrees

    // Add the foot to the scene
    footGroup.position.set(0, 0.5, -95); // Moved 100 units back (was at 5)
    scene.add(footGroup);

    foot = footGroup;
    console.log('Gigantic foot with ankle created, rotated to face the player, and added to the scene.');
}

function createDart() {
    // Only allow dart shooting during the foot challenge
    if (!foot || challengesCompleted.foot) {
        return; // No foot available or foot challenge already completed
    }

    const dartGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 16);
    const dartMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 }); // Red color
    const dart = new THREE.Mesh(dartGeometry, dartMaterial);
    dart.rotation.x = Math.PI / 2; // Rotate to face forward
    dart.position.set(avatar.position.x, avatar.position.y + 1.5, avatar.position.z);

    // Calculate direction towards the foot
    const direction = new THREE.Vector3().subVectors(foot.position, dart.position).normalize();
    dart.userData.velocity = direction.multiplyScalar(2.0); // Increased velocity for better long-range shooting

    scene.add(dart);
    darts.push(dart);
    
    // Show feedback
    const distanceToFoot = avatar.position.distanceTo(foot.position);
    document.getElementById('message').textContent = 'Dart fired! Distance to target: ' + Math.round(distanceToFoot);
}

function animateLimbs() {
    // Animate arms and legs only when moving
    const t = performance.now() * 0.003;
    let isMoving = false;
    if (keys['ArrowLeft'] || keys['a'] || keys['ArrowRight'] || keys['d'] || keys['ArrowUp'] || keys['w'] || keys['ArrowDown'] || keys['s']) {
        isMoving = true;
    }
    // Arms swing
    if (avatar.armL && avatar.armR) {
        if (isMoving) {
            avatar.armL.rotation.x = Math.sin(t) * 0.5;
            avatar.armR.rotation.x = -Math.sin(t) * 0.5;
        } else {
            avatar.armL.rotation.x = 0;
            avatar.armR.rotation.x = 0;
        }
    }
    // Legs swing
    if (avatar.children[0] && avatar.children[1]) {
        if (isMoving) {
            avatar.children[0].rotation.x = -Math.sin(t) * 0.4; // legL
            avatar.children[1].rotation.x = Math.sin(t) * 0.4;  // legR
        } else {
            avatar.children[0].rotation.x = 0;
            avatar.children[1].rotation.x = 0;
        }
    }
}

function handleCutscene() {
    if (cutscene === 'intro') {
        // Pan from above to player
        cutsceneTimer++;
        camera.position.set(0, 10 - cutsceneTimer * 0.08, -15 + cutsceneTimer * 0.2);
        camera.lookAt(0, 1.5, -15);
        if (cutsceneTimer > 60) {
            cutscene = null;
            document.getElementById('message').textContent = 'WASD/Arrows to move, Space to interact/throw, R to restart';
        }
    } else if (cutscene === 'win') {
        cutsceneTimer++;
        camera.position.x += (0 - camera.position.x) * 0.05;
        camera.position.z += (24 - camera.position.z) * 0.05;
        camera.position.y += (5 - camera.position.y) * 0.05;
        camera.lookAt(0, 1.5, 24);
        if (cutsceneTimer > 80) {
            document.getElementById('message').textContent = 'You reached the flower field! 🌸🎉';
        } else {
            document.getElementById('message').textContent = 'Wow! So many flowers!';
        }
    }
}

function animateFoot() {
    if (!foot) return;

    // Move the foot left and right
    const t = performance.now() * 0.002;
    foot.position.x = Math.sin(t) * 5;
}

function handleInput() {
    // Genie dialogue trigger is now handled automatically on game start
    let moved = false;
    if (keys['ArrowLeft'] || keys['a']) { avatar.position.x -= 0.22; moved = true; }
    if (keys['ArrowRight'] || keys['d']) { avatar.position.x += 0.22; moved = true; }
    if (keys['ArrowUp'] || keys['w']) { avatar.position.z += 0.22; moved = true; }
    if (keys['ArrowDown'] || keys['s']) { avatar.position.z -= 0.22; moved = true; }
    // World boundaries (keep avatar within ground)
    avatar.position.x = Math.max(-195, Math.min(195, avatar.position.x));
    avatar.position.z = Math.max(-195, Math.min(195, avatar.position.z));
    
    // Update player position to match avatar position (fixes white block interaction)
    player.position.copy(avatar.position);
}

// White block and color selection logic (removed duplicate - using updated version below)

function paintNails(color) {
    if (avatar && avatar.armL && avatar.armR) {
        const handMaterial = new THREE.MeshLambertMaterial({ color });
        avatar.armL.material = handMaterial;
        avatar.armR.material = handMaterial;
        console.log(`Nails painted with color: ${color.toString(16)}`);
    }
}

// Function to color avatar nails with a hex color value from the color picker UI
function colorAvatarNails(hexColor) {
    if (avatar && avatar.handL && avatar.handR) {
        // Convert hex color to integer
        const color = parseInt(hexColor.replace('#', ''), 16);
        const handMaterial = new THREE.MeshLambertMaterial({ color: color });
        
        // Apply material to avatar's nails only (not the arms)
        avatar.handL.material = handMaterial;
        avatar.handR.material = handMaterial;
        
        // Log the color change
        console.log(`Avatar nails colored with: ${hexColor}`);
    } else {
        console.warn('Avatar nails not found. Make sure the avatar has handL and handR properties.');
    }
}

// Helper function to create text sprites
function createTextSprite(message, parameters) {
    if (parameters === undefined) parameters = {};
    
    const fontface = parameters.fontface || 'Comic Sans MS';
    const fontsize = parameters.fontsize || 30;
    const borderThickness = parameters.borderThickness || 4;
    const borderColor = parameters.borderColor || { r:0, g:0, b:0, a:1.0 };
    const backgroundColor = parameters.backgroundColor || { r:255, g:255, b:255, a:1.0 };
    const textColor = parameters.textColor || { r:0, g:0, b:0, a:1.0 };
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = "Bold " + fontsize + "px " + fontface;
    
    // Get size data (height depends only on font size)
    const metrics = context.measureText(message);
    const textWidth = metrics.width;
    
    // Background color
    context.fillStyle   = "rgba(" + backgroundColor.r + "," + backgroundColor.g + "," + backgroundColor.b + "," + backgroundColor.a + ")";
    // Border color
    context.strokeStyle = "rgba(" + borderColor.r + "," + borderColor.g + "," + borderColor.b + "," + borderColor.a + ")";
    context.lineWidth = borderThickness;
    // Draw rounded rectangle
    roundRect(context, borderThickness/2, borderThickness/2, textWidth + borderThickness, fontsize * 1.4 + borderThickness, 6);
    
    // Text color
    context.fillStyle = "rgba(" + textColor.r + "," + textColor.g + "," + textColor.b + "," + textColor.a + ")";
    context.fillText(message, borderThickness, fontsize + borderThickness);
    
    // Canvas contents will be used for a texture
    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(10, 5, 1.0);
    
    return sprite;
}

// Function to draw a rounded rectangle
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.lineTo(x+w-r, y);
    ctx.quadraticCurveTo(x+w, y, x+w, y+r);
    ctx.lineTo(x+w, y+h-r);
    ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
    ctx.lineTo(x+r, y+h);
    ctx.quadraticCurveTo(x, y+h, x, y+h-r);
    ctx.lineTo(x, y+r);
    ctx.quadraticCurveTo(x, y, x+r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();   
}

function createWhiteBlock() {
    const whiteBlockGeometry = new THREE.BoxGeometry(5, 10, 5);
    const whiteBlockMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff }); // White color
    whiteBlock = new THREE.Mesh(whiteBlockGeometry, whiteBlockMaterial); // Assign to global variable
    whiteBlock.position.set(0, 5, 0); // Position the white block before the magic flower
    scene.add(whiteBlock);
    
    // Add a floating text above the white block
    const textSprite = createTextSprite("Press G to interact", { fontsize: 24, borderColor: {r:0, g:0, b:0, a:1.0}, backgroundColor: {r:255, g:255, b:255, a:0.8} });
    textSprite.position.set(0, 12, 0); // Position above the white block
    whiteBlock.add(textSprite);
    
    // Gems will be created after the bloom instead of during initial setup
    scene.gems = []; // Initialize empty gems array
    
    // Add floating animation to the white block
    function animateWhiteBlock() {
        requestAnimationFrame(animateWhiteBlock);
        // Simple bobbing animation
        whiteBlock.position.y = 5 + Math.sin(Date.now() * 0.001) * 0.5;
        // Removed rotation to keep white block facing forward
    }
    animateWhiteBlock();

    // Add interaction logic
    document.addEventListener('keydown', (event) => {
        if (event.key === 'g' || event.key === 'G') {
            if (avatar.position.distanceTo(whiteBlock.position) < 20) { // Use avatar instead of player
                console.log('Player is near the white block. Showing color plate.');
                showColorPlate();
            } else {
                console.log('Player is too far from the white block.');
                // Add a helpful message to guide the player
                document.getElementById('message').textContent = 'Move closer to the white block and press G to interact';
                // Reset the message after 3 seconds
                setTimeout(() => {
                    document.getElementById('message').textContent = 'WASD/Arrows to move, Space to interact/throw, R to restart';
                }, 3000);
            }
        }
    });
}

// Function to display a color selection UI when interacting with the white block
function showColorPlate() {
    // Check if color plate UI already exists
    let colorPlateUI = document.getElementById('colorPlateUI');
    if (colorPlateUI) {
        colorPlateUI.style.display = 'block';
        return;
    }
    
    // Create color plate container
    colorPlateUI = document.createElement('div');
    colorPlateUI.id = 'colorPlateUI';
    colorPlateUI.style.cssText = `
        display: block;
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(255, 255, 255, 0.9);
        padding: 20px;
        border-radius: 10px;
        color: #333;
        text-align: center;
        font-family: 'Comic Sans MS', cursive, sans-serif;
        min-width: 300px;
        z-index: 1000;
        box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
    `;
    
    // Add title
    const title = document.createElement('h2');
    title.textContent = '💅 Choose a Color for Your Nails';
    title.style.marginBottom = '15px';
    colorPlateUI.appendChild(title);
    
    // Create color options
    const colors = [
        { name: 'Pink', hex: '#ff69b4' },
        { name: 'Blue', hex: '#6495ed' },
        { name: 'Purple', hex: '#9370db' },
        { name: 'Yellow', hex: '#ffd700' },
        { name: 'Orange', hex: '#ffa500' },
        { name: 'Green', hex: '#3cb371' }
    ];
    
    // Create color grid
    const colorGrid = document.createElement('div');
    colorGrid.style.cssText = `
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
        margin-bottom: 20px;
    `;
    
    colors.forEach(color => {
        const colorButton = document.createElement('div');
        colorButton.style.cssText = `
            background-color: ${color.hex};
            height: 60px;
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7);
            transition: transform 0.2s, box-shadow 0.2s;
        `;
        colorButton.textContent = color.name;
        colorButton.addEventListener('mouseover', () => {
            colorButton.style.transform = 'scale(1.05)';
            colorButton.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.3)';
        });
        colorButton.addEventListener('mouseout', () => {
            colorButton.style.transform = 'scale(1)';
            colorButton.style.boxShadow = 'none';
        });
        colorButton.addEventListener('click', () => {
            colorAvatarNails(color.hex);
            colorPlateUI.style.display = 'none';
              // Mark white block challenge as completed
            challengesCompleted.whiteBlock = true;

            // Reveal the final flower and glass now that white block is completed
            if (scene.finalFlower) scene.finalFlower.visible = true;
            if (scene.glass) scene.glass.visible = true;
              // Trigger genie phase for white block completion
            triggerGeniePhase('whiteBlockCompleted');

            // Hide the white block after completion
            whiteBlock.visible = false;
            
            document.getElementById('message').textContent = `Your nails are now ${color.name}! White block challenge complete!`;
            
            // Check if all challenges are completed
            checkAllChallengesComplete();
            
            setTimeout(() => {
                document.getElementById('message').textContent = 'WASD/Arrows to move, Space to interact/throw, R to restart';
            }, 4000);
        });
        colorGrid.appendChild(colorButton);
    });
    
    colorPlateUI.appendChild(colorGrid);
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.style.cssText = `
        padding: 8px 20px;
        background-color: #ff6b6b;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-family: 'Comic Sans MS', cursive, sans-serif;
        transition: background-color 0.2s;
    `;
    closeButton.addEventListener('mouseover', () => {
        closeButton.style.backgroundColor = '#ff5252';
    });
    closeButton.addEventListener('mouseout', () => {
        closeButton.style.backgroundColor = '#ff6b6b';
    });
    closeButton.addEventListener('click', () => {
        colorPlateUI.style.display = 'none';
    });
    colorPlateUI.appendChild(closeButton);
    
    // Add keyboard listener for ESC key
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            colorPlateUI.style.display = 'none';
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
    
       
    document.body.appendChild(colorPlateUI);
}

// Function to create a birthday cake
function createBirthdayLauncher() {
  const cakeGroup = new THREE.Group();
  
  // Cake base (cylinder)
  const cakeGeometry = new THREE.CylinderGeometry(1.2, 1.2, 0.6, 16);
  const cakeMaterial = new THREE.MeshLambertMaterial({ color: 0xffb3ba }); // Light pink
  const cakeBase = new THREE.Mesh(cakeGeometry, cakeMaterial);
  cakeBase.position.y = 0.3;
  cakeGroup.add(cakeBase);
  
  // Cake frosting layer
  const frostingGeometry = new THREE.CylinderGeometry(1.1, 1.1, 0.2, 16);
  const frostingMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff }); // White frosting
  const frosting = new THREE.Mesh(frostingGeometry, frostingMaterial);
  frosting.position.y = 0.7;
  cakeGroup.add(frosting);
  
  // Candles
  const candleGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8);
  const candleMaterial = new THREE.MeshLambertMaterial({ color: 0xffff99 }); // Light yellow
  
  // Add multiple candles in a circle
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const candleX = Math.cos(angle) * 0.7;
    const candleZ = Math.sin(angle) * 0.7;
    
    const candle = new THREE.Mesh(candleGeometry, candleMaterial);
    candle.position.set(candleX, 1.0, candleZ);
    cakeGroup.add(candle);
    
    // Flame on top of each candle
    const flameGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const flameMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xff6b35,
      emissive: 0xff4500,
      emissiveIntensity: 0.3
    });
    const flame = new THREE.Mesh(flameGeometry, flameMaterial);
    flame.position.set(candleX, 1.25, candleZ);
    cakeGroup.add(flame);
  }
  
  // Decorative cherries
  const cherryGeometry = new THREE.SphereGeometry(0.08, 8, 8);
  const cherryMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 }); // Red cherries
  
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI/4;
    const cherryX = Math.cos(angle) * 0.5;
    const cherryZ = Math.sin(angle) * 0.5;
    
    const cherry = new THREE.Mesh(cherryGeometry, cherryMaterial);
    cherry.position.set(cherryX, 0.85, cherryZ);
    cakeGroup.add(cherry);
  }
  
  return cakeGroup;
}

// 3D Birthday Cake
let birthdayCake;
function createBirthdayCake() {
  // Create the birthday cake only once
  if (birthdayCake) {
    birthdayCake.visible = true;
    birthdayCake.rotation.y = 0; // Reset rotation
    birthdayCake.position.set(0, 0, 0); // Reset position
    return birthdayCake;
  }
  
  // New cake instance
  birthdayCake = createBirthdayLauncher();
  birthdayCake.position.set(0, 0, 0);
  scene.add(birthdayCake);
  
  // Add candles light animation
  birthdayCake.traverse((child) => {
    if (child.isMesh && child.material.emissive) {
      child.material.emissiveIntensity = 0;
      gsap.to(child.material, {
        emissiveIntensity: 1,
        duration: 0.5,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut"
      });
    }
  });
  
  return birthdayCake;
}

// Function to handle the end of the game or level
function endGame() {
  // Stop all animations
  gsap.globalTimeline.pause();
  
  // Hide all game elements
  scene.traverse((child) => {
    if (child.isMesh) child.visible = false;
  });
  
  // Show the birthday cake
  const cake = createBirthdayCake();
  cake.visible = true;
  cake.position.set(0, 0, 0);
  
  // Camera animation to focus on the cake
  gsap.to(camera.position, {
    x: 0,
    y: 2,
    z: 5,
    duration: 2,
    ease: "power2.inOut",
    onUpdate: () => {
      camera.lookAt(0, 1, 0);
    }
  });
  
  // Show message
  const message = document.getElementById('message');
  message.style.display = 'block';
  message.textContent = 'Congratulations! You found the magical flower! 🎉🌸';
  message.style.fontSize = '2em';
  message.style.color = '#fff';
  message.style.textAlign = 'center';
  message.style.position = 'absolute';
  message.style.top = '50%';
  message.style.left = '50%';
  message.style.transform = 'translate(-50%, -50%)';
  
  // Restart option
  setTimeout(() => {
    message.textContent += '\n\nPress R to restart the adventure';
    window.addEventListener('keydown', (e) => {
      if (e.key === 'r' || e.key === 'R') {
        location.reload();
      }
    });
  }, 3000);
}

// Function to trigger the win sequence (e.g., after picking the final flower)
function triggerWinSequence() {
  // Show all game elements
  scene.traverse((child) => {
    if (child.isMesh) child.visible = true;
  });
  
  // Hide the final flower and glass
  if (scene.finalFlower) scene.finalFlower.visible = false;
  if (scene.glass) scene.glass.visible = false;
  
  // Show the birthday cake
  const cake = createBirthdayCake();
  cake.visible = true;
  cake.position.set(0, 0, 0);
  
  // Play celebration sound
  playCelebrationSound();
  
  // Show confetti
  showConfetti();
  
  // Show message
  const message = document.getElementById('message');
  message.style.display = 'block';
  message.textContent = 'Congratulations! You found the magical flower! 🎉🌸';
  message.style.fontSize = '2em';
  message.style.color = '#fff';
  message.style.textAlign = 'center';
  message.style.position = 'absolute';
  message.style.top = '50%';
  message.style.left = '50%';
  message.style.transform = 'translate(-50%, -50%)';
  
  // Restart option
  setTimeout(() => {
    message.textContent += '\n\nPress R to restart the adventure';
    window.addEventListener('keydown', (e) => {
      if (e.key === 'r' || e.key === 'R') {
        location.reload();
      }
    });
  }, 3000);
}

// Confetti system
let confettiActive = false;
function showConfetti() {
  if (confettiActive) return;
  confettiActive = true;
  
  const colors = [0xffcc00, 0xff6699, 0x66ffcc, 0x6699ff];
  
  for (let i = 0; i < 50; i++) {
    const confetti = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.05, 0.05),
      new THREE.MeshLambertMaterial({ color: colors[Math.floor(Math.random() * colors.length)] })
    );
    confetti.position.set(
      (Math.random() - 0.5) * 10,
      5 + Math.random() * 5,
      (Math.random() - 0.5) * 10
    );
    confetti.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    scene.add(confetti);
    
    // Animate confetti falling
    setTimeout(() => {
      const fallInterval = setInterval(() => {
        confetti.position.y -= 0.1;
        confetti.rotation.x += 0.05;
        confetti.rotation.z += 0.05;
        if (confetti.position.y < 0) {
          scene.remove(confetti);
          clearInterval(fallInterval);
        }
      }, 50);
    }, i * 50);
  }
  
  setTimeout(() => {
    confettiActive = false;
  }, 5000);
}

// Function to create a collectible gem
function createGem(color, message, position) {
  const gemGroup = new THREE.Group();
  
  // Create a diamond-shaped gem using octahedron
  const gemGeometry = new THREE.OctahedronGeometry(0.8, 0);
  const gemMaterial = new THREE.MeshLambertMaterial({ 
    color: color,
    emissive: color,
    emissiveIntensity: 0.3,
    transparent: true,
    opacity: 0.8
  });
  const gem = new THREE.Mesh(gemGeometry, gemMaterial);
  gem.position.y = 1.5; // Floating height
  gemGroup.add(gem);
  
  // Add a rotating glow ring around the gem
  const ringGeometry = new THREE.RingGeometry(1.2, 1.4, 16);
  const ringMaterial = new THREE.MeshLambertMaterial({ 
    color: color,
    emissive: color,
    emissiveIntensity: 0.5,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide
  });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.rotation.x = -Math.PI / 2; // Lay flat
  ring.position.y = 0.1;
  gemGroup.add(ring);
  
  // Store gem data
  gemGroup.userData = {
    message: message,
    collected: false
  };
  
  // Position the gem
  gemGroup.position.copy(position);
  
  return gemGroup;
}

// Function to show gem collection popup message
function showGemPopup(message) {
    // Create popup container if it doesn't exist
    let gemPopup = document.getElementById('gemPopup');
    if (!gemPopup) {
        gemPopup = document.createElement('div');
        gemPopup.id = 'gemPopup';
        gemPopup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 15px;
            font-family: Arial, sans-serif;
            font-size: 18px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            z-index: 2000;
            border: 3px solid #fff;
            min-width: 400px;
            max-width: 500px;
            animation: gemPopupFadeIn 0.5s ease-out;
            display: none;
        `;
        
        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes gemPopupFadeIn {
                from { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.8); 
                }
                to { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1); 
                }
            }
            @keyframes gemPopupFadeOut {
                from { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1); 
                }
                to { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.8); 
                }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(gemPopup);
    }
    
    // Set the message and show popup
    gemPopup.innerHTML = `
        <div style="margin-bottom: 20px;">
            <div style="font-size: 48px; margin-bottom: 10px;">💎</div>
            <h2 style="margin: 0 0 15px 0; color: #fff;">Gem Collected!</h2>
            <p style="margin: 0; line-height: 1.4;">${message}</p>
        </div>
        <button 
            style="
                padding: 12px 24px; 
                background: #28a745; 
                border: none; 
                color: white; 
                cursor: pointer; 
                border-radius: 8px;
                font-size: 16px;
                font-weight: bold;
                box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
                transition: all 0.3s ease;
            "
            onclick="hideGemPopup()"
            onmouseover="this.style.background='#218838'; this.style.transform='translateY(-2px)'"
            onmouseout="this.style.background='#28a745'; this.style.transform='translateY(0)'"
        >Continue Adventure</button>
    `;
    
    gemPopup.style.display = 'block';
    
    // Auto-hide after 6 seconds
    setTimeout(() => {
        hideGemPopup();
    }, 6000);
}

function hideGemPopup() {
    const gemPopup = document.getElementById('gemPopup');
    if (gemPopup) {
        gemPopup.style.animation = 'gemPopupFadeOut 0.3s ease-in';
        setTimeout(() => {
            gemPopup.style.display = 'none';
            gemPopup.style.animation = 'gemPopupFadeIn 0.5s ease-out';
        }, 300);
    }
}

// Function to trigger phase-based genie dialogue that persists
function triggerGeniePhase(phaseName) {
  if (!GENIE_PHASES[phaseName]) {
    console.log(`Genie phase '${phaseName}' not found`);
    return;
  }
  
  console.log(`Triggering genie phase: ${phaseName}`);
  
  // Show the persistent message for this phase
  const message = GENIE_PHASES[phaseName];
  showGenieDialogue(message);
  playGenieRoboticSound();
  
  // Keep dialogue visible (no auto-hide)
  genieDialogueActive = true;
}

// Function to create trees mainly in front of the player
function createTrees() {
  const trees = [];
  const treeCount = 60; // Even more trees for spectacular effect
  
  for (let i = 0; i < treeCount; i++) {
    const treeGroup = new THREE.Group();
    
    // Randomize tree size
    const treeScale = 0.8 + Math.random() * 0.8; // Bigger trees
    
    // Tree trunk
    const trunkGeometry = new THREE.CylinderGeometry(
      0.4 * treeScale, 
      0.6 * treeScale, 
      5 * treeScale, 
      8
    );
    const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 }); // Brown
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 2.5 * treeScale;
    treeGroup.add(trunk);
    
    // Tree canopy (multiple spheres for natural look)
    const canopyColors = [0x228B22, 0x32CD32, 0x90EE90, 0x00FF00, 0x7CFC00]; // More green variations
    const canopyCount = 3 + Math.floor(Math.random() * 3); // 3-5 canopies per tree
    
    for (let j = 0; j < canopyCount; j++) {
      const canopyGeometry = new THREE.SphereGeometry(
        (2 + Math.random() * 1.5) * treeScale, 
        8, 6
      );
      const canopyMaterial = new THREE.MeshLambertMaterial({ 
        color: canopyColors[j % canopyColors.length] 
      });
      const canopy = new THREE.Mesh(canopyGeometry, canopyMaterial);
      canopy.position.set(
        (Math.random() - 0.5) * 2 * treeScale,
        (4 + Math.random() * 2) * treeScale,
        (Math.random() - 0.5) * 2 * treeScale
      );
      treeGroup.add(canopy);
    }
    
    // Add many pink blossoms to each tree
    const blossomCount = 20 + Math.floor(Math.random() * 15); // 20-35 blossoms per tree
    for (let j = 0; j < blossomCount; j++) {
      const blossomGeometry = new THREE.SphereGeometry(0.12 + Math.random() * 0.08, 6, 6);
      const blossomMaterial = new THREE.MeshLambertMaterial({ 
        color: 0xFFB6C1, // Light pink
        emissive: 0xFF69B4,
        emissiveIntensity: 0.4
      });
      const blossom = new THREE.Mesh(blossomGeometry, blossomMaterial);
      blossom.position.set(
        (Math.random() - 0.5) * 5 * treeScale,
        (3 + Math.random() * 4) * treeScale,
        (Math.random() - 0.5) * 5 * treeScale
      );
      treeGroup.add(blossom);
    }
    
    // Position trees to cover the whole expanded map with flowers
    let x, z;
    // Spread trees across the entire expanded map area
    x = (Math.random() - 0.5) * 300; // Expanded width coverage (was 200)
    z = (Math.random() - 0.5) * 300; // Expanded depth coverage (was 200)
    
    treeGroup.position.set(x, 0, z);
    scene.add(treeGroup);
    trees.push(treeGroup);
  }
  
  return trees;
}

// Function to create massive amounts of falling blossoms from the sky
function createFallingBlossoms() {
  const blossoms = [];
  const blossomColors = [0xFFB6C1, 0xFF69B4, 0xFFC0CB, 0xFFE4E1, 0xFF1493, 0xFFA0C9]; // More pink variations
  const blossomCount = 500; // Much more blossoms!
  
  for (let i = 0; i < blossomCount; i++) {
    // Create different blossom shapes
    let blossomGeometry;
    const shapeType = Math.random();
    
    if (shapeType < 0.6) {
      // Petal-shaped (plane)
      blossomGeometry = new THREE.PlaneGeometry(0.2 + Math.random() * 0.3, 0.2 + Math.random() * 0.3);
    } else if (shapeType < 0.8) {
      // Small flower (sphere)
      blossomGeometry = new THREE.SphereGeometry(0.08 + Math.random() * 0.06, 6, 6);
    } else {
      // Star-shaped (cone)
      blossomGeometry = new THREE.ConeGeometry(0.1 + Math.random() * 0.1, 0.05, 5);
    }
    
    const blossomMaterial = new THREE.MeshLambertMaterial({ 
      color: blossomColors[Math.floor(Math.random() * blossomColors.length)],
      transparent: true,
      opacity: 0.7 + Math.random() * 0.3,
      side: THREE.DoubleSide,
      emissive: 0xFF69B4,
      emissiveIntensity: 0.1 + Math.random() * 0.2
    });
    const blossom = new THREE.Mesh(blossomGeometry, blossomMaterial);
    
    // Position blossoms to cover the whole expanded map
    let x, z;
    // Full expanded map coverage for spectacular effect
    x = (Math.random() - 0.5) * 350; // Even wider spread (was 250)
    z = (Math.random() - 0.5) * 350; // Full coverage everywhere (was 250)
    
    blossom.position.set(
      x,
      15 + Math.random() * 20,     // Higher starting point
      z
    );
    
    // Random rotation
    blossom.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );
    
    // Store fall properties with more variation
    blossom.userData = {
      fallSpeed: 0.01 + Math.random() * 0.04,      // Varied fall speeds
      rotationSpeed: (Math.random() - 0.5) * 0.15, // More rotation
      swayAmount: Math.random() * 0.08,            // More sway
      spinSpeed: (Math.random() - 0.5) * 0.1       // Additional spin
    };
    
    scene.add(blossom);
    blossoms.push(blossom);
  }
  
  return blossoms;
}

// Function to animate massive amounts of falling blossoms
function animateFallingBlossoms(blossoms) {
  blossoms.forEach(blossom => {
    if (blossom.userData) {
      // Fall down at varied speeds
      blossom.position.y -= blossom.userData.fallSpeed;
      
      // Enhanced swaying motion - multiple wave patterns
      const time = Date.now() * 0.001;
      blossom.position.x += Math.sin(time + blossom.position.z * 0.01) * blossom.userData.swayAmount;
      blossom.position.z += Math.cos(time * 0.7 + blossom.position.x * 0.01) * blossom.userData.swayAmount * 0.5;
      
      // Complex rotation for natural falling effect
      blossom.rotation.x += blossom.userData.rotationSpeed;
      blossom.rotation.y += blossom.userData.spinSpeed;
      blossom.rotation.z += blossom.userData.rotationSpeed * 0.7;
      
      // Add slight scale pulsing for magical effect
      const scale = 1 + Math.sin(time * 2 + blossom.position.x) * 0.1;
      blossom.scale.set(scale, scale, scale);
      
      // Reset position when it falls below ground with more variation
      if (blossom.position.y < -2) {
        blossom.position.y = 15 + Math.random() * 25; // Higher reset
        blossom.position.x = (Math.random() - 0.5) * 200; // Wider reset area
        blossom.position.z = (Math.random() - 0.5) * 200;
        
        // Randomize properties on reset
        blossom.userData.fallSpeed = 0.01 + Math.random() * 0.04;
        blossom.userData.swayAmount = Math.random() * 0.08;
      }
    }
  });
}

// Function to create a beautiful lake in front of the player
function createLake() {
  const lakeGroup = new THREE.Group();
  
  // Main lake surface
  const lakeGeometry = new THREE.PlaneGeometry(40, 25);
  const lakeMaterial = new THREE.MeshLambertMaterial({ 
    color: 0x4169E1, // Royal blue
    transparent: true,
    opacity: 0.7,
    emissive: 0x191970,
    emissiveIntensity: 0.2
  });
  const lake = new THREE.Mesh(lakeGeometry, lakeMaterial);
  lake.rotation.x = -Math.PI / 2; // Lay flat
  lake.position.set(0, 0.1, 45); // Beyond the birthday cake
  lakeGroup.add(lake);
  
  // Add some lily pads
  for (let i = 0; i < 15; i++) {
    const lilyGeometry = new THREE.CircleGeometry(0.8 + Math.random() * 0.5, 8);
    const lilyMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x228B22,
      transparent: true,
      opacity: 0.8
    });
    const lily = new THREE.Mesh(lilyGeometry, lilyMaterial);
    lily.rotation.x = -Math.PI / 2;
    lily.position.set(
      (Math.random() - 0.5) * 35,
      0.15,
      40 + Math.random() * 20  // Around the lake area
    );
    lakeGroup.add(lily);
    
    // Add a flower on some lily pads
    if (Math.random() > 0.5) {
      const flowerGeometry = new THREE.SphereGeometry(0.15, 6, 6);
      const flowerMaterial = new THREE.MeshLambertMaterial({
        color: 0xFFFFFF, // White water lily
        emissive: 0xFFE4E1,
        emissiveIntensity: 0.3
      });
      const flower = new THREE.Mesh(flowerGeometry, flowerMaterial);
      flower.position.copy(lily.position);
      flower.position.y = 0.3;
      lakeGroup.add(flower);
    }
  }
  
  // Add some sparkles on the water
  for (let i = 0; i < 30; i++) {
    const sparkleGeometry = new THREE.SphereGeometry(0.05, 4, 4);
    const sparkleMaterial = new THREE.MeshLambertMaterial({
      color: 0x87CEEB, // Sky blue
      emissive: 0x87CEEB,
      emissiveIntensity: 0.6
    });
    const sparkle = new THREE.Mesh(sparkleGeometry, sparkleMaterial);
    sparkle.position.set(
      (Math.random() - 0.5) * 35,
      0.2,
      35 + Math.random() * 20  // Around the lake area
    );
    lakeGroup.add(sparkle);
  }
  
  scene.add(lakeGroup);
  return lakeGroup;
}

// Function to create gems after the bloom - celebration rewards!
function createPostBloomGems() {
    const gems = [];
    
    // Get the actual birthday cake position from the scene
    const cake = scene.birthdayCake;
    if (!cake) {
        console.warn('Birthday cake not found, using default positions');
        return;
    }
    
    const cakeX = cake.position.x;
    const cakeZ = cake.position.z;
    const radius = 12; // Distance from cake center
    
    // Gem 1: You are the funniest (Diamond)
    const gem1 = createGem(
        0xffffff, // Diamond white
        "Why anush is the best 💎\n\nYou are the funniest",
        new THREE.Vector3(cakeX + radius, 2, cakeZ) // Right of cake
    );
    scene.add(gem1);
    gems.push(gem1);
    
    // Gem 2: You are the most diva (Gold)
    const gem2 = createGem(
        0xffd700, // Gold
        "Why anush is the best 💎\n\nYou are the most diva",
        new THREE.Vector3(cakeX - radius, 2, cakeZ) // Left of cake
    );
    scene.add(gem2);
    gems.push(gem2);
    
    // Gem 3: You are one of the nicest people ever (Purple)
    const gem3 = createGem(
        0x9932cc, // Purple
        "Why anush is the best 💎\n\nYou are one of the nicest people ever",
        new THREE.Vector3(cakeX, 2, cakeZ + radius) // Behind cake
    );
    scene.add(gem3);
    gems.push(gem3);
    
    // Gem 4: You have the best style ever (Cyan)
    const gem4 = createGem(
        0x00ffff, // Cyan
        "Why anush is the best 💎\n\nYou have the best style ever",
        new THREE.Vector3(cakeX, 2, cakeZ - radius) // In front of cake
    );
    scene.add(gem4);
    gems.push(gem4);
    
    // Gem 5: You got the best nails ever (Pink)
    const gem5 = createGem(
        0xff1493, // Pink
        "Why anush is the best 💎\n\nYou got the best nails ever",
        new THREE.Vector3(cakeX + radius * 0.7, 2, cakeZ + radius * 0.7) // Diagonal from cake
    );
    scene.add(gem5);
    gems.push(gem5);
    
    // Store gems globally
    scene.gems = gems;
    
    // Give player instructions to collect the special gems
    setTimeout(() => {
        document.getElementById('message').textContent = '💎 Special gems have appeared around the cake! Collect them to discover why Anush is the best! 💎';
    }, 8000);
}