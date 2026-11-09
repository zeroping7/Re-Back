import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { carOnStand } from './showroom.js';
import { CARS } from './cars.js';

// Fotos de los coches para las tarjetas (UX-10). Solo se usa desde tests/previews.mjs.
export function carPreviews(w = 360, h = 220) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(w, h, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const scene = new THREE.Scene();
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.6;
  scene.add(new THREE.HemisphereLight('#dfe8ff', '#5a4632', 0.9));
  const key = new THREE.DirectionalLight('#fff1dc', 2.6);
  key.position.set(3, 6, 4); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3 });
  scene.add(key);
  const rim = new THREE.DirectionalLight('#8fb4ff', 1.8);
  rim.position.set(-4, 3, -5); scene.add(rim);
  // sombra suave en el suelo, sin suelo visible
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.ShadowMaterial({ opacity: 0.35 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.5; ground.receiveShadow = true;
  scene.add(ground);
  const cam = new THREE.PerspectiveCamera(30, w / h, 0.1, 50);
  const out = {};
  for (const def of CARS) {
    const m = carOnStand(def, def.color);
    m.rotation.y = -0.75;
    scene.add(m);
    const box = new THREE.Box3().setFromObject(m), c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
    const r = Math.max(s.x, s.z, s.y * 1.6);
    cam.position.set(c.x + r * 0.15, c.y + r * 0.5, c.z + r * 1.55);
    cam.lookAt(c.x, c.y - s.y * 0.05, c.z);
    renderer.render(scene, cam);
    out[def.id] = renderer.domElement.toDataURL('image/webp', 0.88);
    scene.remove(m);
  }
  renderer.dispose();
  return out;
}
