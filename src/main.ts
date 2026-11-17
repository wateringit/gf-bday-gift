import * as THREE from 'three';
import { DRACOLoader, GLTFLoader } from 'three/examples/jsm/Addons.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { bendFlame, createFlameGeometry, noise } from './assets/flamephysics';
import { now } from 'three/examples/jsm/libs/tween.module.js';

const MODEL_URL = "./happy-bday.glb";

const canvas = document.querySelector<HTMLCanvasElement>("#app")!;
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  canvas
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const fov = 50;
const aspect = window.innerWidth / window.innerHeight;
const near = 0.1;
const far = 1000;

const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
const scene = new THREE.Scene();

// MODEL LOADING

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

const gltf = await loader.loadAsync(MODEL_URL);
gltf.scene.rotateY(10);
scene.add(gltf.scene);
const initialCakeRotation = gltf.scene.rotation.clone();
let startingCakeRotationY = 0;
let cakeRotationDelta = 0;
// FLAME SETUP

const flameGroup = new THREE.Group();
const flameVisual = new THREE.Group();

// Materials
const outerMaterial = new THREE.MeshBasicMaterial({
  color: 0xff6500,
  transparent: true,
  opacity: 0.55,
  side: THREE.DoubleSide,
  depthWrite: false
});

const innerMaterial = new THREE.MeshBasicMaterial({
  color: 0xffc12e,
  transparent: true,
  opacity: 0.9,
  side: THREE.DoubleSide,
  depthWrite: false
});

const coreMaterial = new THREE.MeshBasicMaterial({
  color: 0xffffd1,
  transparent: true,
  opacity: 0.95,
  side: THREE.DoubleSide,
  depthWrite: false
});

const outerFlame = new THREE.Mesh(createFlameGeometry(), outerMaterial);
const innerFlame = new THREE.Mesh(createFlameGeometry(), innerMaterial);
const coreFlame = new THREE.Mesh(createFlameGeometry(), coreMaterial);

// Outer envelope
outerFlame.scale.set(1, 1, 1);

// Yellow inner region
innerFlame.scale.set(0.62, 0.78, 0.62);
innerFlame.position.y = 0.015;

// Small bright core
coreFlame.scale.set(0.28, 0.42, 0.28);
coreFlame.position.y = 0.025;

flameVisual.add(outerFlame, innerFlame, coreFlame);

const candleLight = new THREE.PointLight(0xffaa44, 1.5, 10);
candleLight.position.set(0, 1, 0);

flameGroup.position.y = 3.3;
flameGroup.add(flameVisual, candleLight);
scene.add(flameGroup);

// LIGHTING

const color = 0xFFFFFF;
const intensity = 0.5;

const light = new THREE.AmbientLight(color, intensity);
scene.add(light);

// CANDLE INTERACTION

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let isBlowingOut = false;
let blowOutProgress = 0;

function onCanvasPointerDown(event: PointerEvent) {
  if (!started || !flameGroup.visible || isBlowingOut) {
    return;
  }

  const rect = renderer.domElement.getBoundingClientRect();

  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  const intersects = raycaster.intersectObjects(flameGroup.children, true);

  if (intersects.length > 0) {
    isBlowingOut = true;
    blowOutProgress = 0;
  }
}

renderer.domElement.addEventListener('pointerdown', onCanvasPointerDown);

// CAMERA / INTRO

const introPosition = new THREE.Vector3(7, 5, 7);
const originalPosition = new THREE.Vector3(4, 7, 6);

camera.position.copy(introPosition);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.02;

const originalTarget = new THREE.Vector3(0, 0, 0);
controls.target.copy(originalTarget);
controls.update();

const introTarget = controls.target.clone();

controls.enabled = false;

let started = false;
let transitionProgress = 0;

const startButton = document.getElementById('start-button');

startButton?.addEventListener('click', () => {
  if (started) {
    return;
  }

  started = true;

  startingCakeRotationY = gltf.scene.rotation.y;

  cakeRotationDelta =
    THREE.MathUtils.euclideanModulo(
      initialCakeRotation.y - startingCakeRotationY + Math.PI,
      Math.PI * 2
    ) - Math.PI;

  startButton.classList.add('opacity-0', 'pointer-events-none');
});

// ANIMATION

const timer = new THREE.Timer();

function animate() {
  requestAnimationFrame(animate);
  timer.update();
  const delta = timer.getDelta();
  const t = timer.getElapsed();

  // Rotate the cake until the user starts the experience
  if (!started) {
    gltf.scene.rotation.y += delta * 0.35;
  }

  // Transition the camera to its original position
  if (started && transitionProgress < 1) {
    transitionProgress = Math.min(transitionProgress + delta * 0.7, 1);

    const eased = 1 - Math.pow(1 - transitionProgress, 3);
    gltf.scene.rotation.y = startingCakeRotationY + cakeRotationDelta * eased;
    camera.position.lerpVectors(introPosition, originalPosition, eased);
    controls.target.lerpVectors(introTarget, originalTarget, eased);

    camera.lookAt(controls.target);

    if (transitionProgress >= 1) {
      camera.position.copy(originalPosition);
      controls.target.copy(originalTarget);
      camera.lookAt(originalTarget);

      console.log("Before OrbitControls:", camera.position.toArray());

      controls.enabled = true;
      controls.update();

      console.log("After OrbitControls:", camera.position.toArray());
    }
  }

  // EXISTING FLAME LOGIC

  if (flameGroup.visible && started) {
    if (isBlowingOut) {
      blowOutProgress += delta * 4;
      const p = Math.min(blowOutProgress, 1);
      const gustBend = Math.sin(p * Math.PI * 0.65) * 0.55;
      const shrink = 1 - Math.pow(p, 1.5);

      bendFlame(outerFlame.geometry, gustBend, 0);
      bendFlame(innerFlame.geometry, gustBend * 0.85, 0);
      bendFlame(coreFlame.geometry, gustBend * 0.3, 0);

      flameGroup.scale.set(shrink, shrink * (1 - p * 0.4), shrink);
      outerMaterial.opacity = 0.75 * shrink;
      candleLight.intensity = 1.5 * shrink;

      if (p >= 1) {
        flameGroup.visible = false;
        isBlowingOut = false;

        bendFlame(outerFlame.geometry, 0, 0);
        bendFlame(innerFlame.geometry, 0, 0);

        flameGroup.scale.set(1, 1, 1);
      }
    } else {
      const breath = noise(t, 1.8, 0.5);
      const turbulence = noise(t, 8.5, 2.1);
      const microFlicker = noise(t, 19.0, 4.7);

      const bodyMotion = breath * 0.035 + turbulence * 0.012;
      const tipMotion = breath * 0.025 + turbulence * 0.045 + microFlicker * 0.012;

      const scaleXZ = 1 - bodyMotion * 0.5;
      const scaleY = 1 + bodyMotion * 1.8;

      flameGroup.scale.set(scaleXZ, scaleY, scaleXZ);

      bendFlame(outerFlame.geometry, turbulence * 0.018, tipMotion);
      bendFlame(innerFlame.geometry, turbulence * 0.014, tipMotion * 0.8);
      bendFlame(coreFlame.geometry, turbulence * 0.008, tipMotion * 0.5);

      flameGroup.rotation.z = noise(t, 2.2, 1.3) * 0.025;
      flameGroup.rotation.x = noise(t, 1.7, 3.8) * 0.015;

      outerMaterial.opacity = 0.69 + breath * 0.045 + turbulence * 0.025;

      candleLight.intensity =
        1.5 +
        noise(t, 2.5, 5.2) * 0.18 +
        noise(t, 12.0, 8.1) * 0.08;
    }
  }

  // Only update OrbitControls after the camera transition
  if (controls.enabled) {
    controls.update();
  }

  renderer.render(scene, camera);
}

animate();

// RESPONSIVE RESIZING

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});