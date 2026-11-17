
import * as THREE from 'three';


export function createFlameGeometry(): THREE.BufferGeometry {
  const segments = 24;
  const rings = 20;
  const height = 0.55;
  const maxRadius = 0.115;

  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= rings; i++) {
    const u = i / rings;

    // Narrow base, fuller middle, pointed tip.
    const profile = Math.pow(
        Math.sin(Math.PI * Math.pow(u, 0.78)),
        0.8
    );

    const radius = 0.018 + maxRadius * profile * (1 - u * 0.3);

    const y = u * height;

    for (let j = 0; j <= segments; j++) {
      const angle = (j / segments) * Math.PI * 2;

      // Slightly irregular silhouette.
      const variation =
        1 +
        Math.sin(angle * 3 + u * 5) * 0.035 +
        Math.cos(angle * 2 - u * 7) * 0.025;

      positions.push(
        Math.cos(angle) * radius * variation,
        y,
        Math.sin(angle) * radius * variation
      );
    }
  }

  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < segments; j++) {
      const a = i * (segments + 1) + j;
      const b = a + segments + 1;

      indices.push(a, b, a + 1);
      indices.push(b, b + 1, a + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3)
  );

  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  geometry.userData.basePositions = new Float32Array(positions);

  return geometry;
}


export function bendFlame(
  geometry: THREE.BufferGeometry,
  bendZ: number,
  flickerX: number
): void {
  const pos = geometry.attributes.position;
  const base: Float32Array = geometry.userData.basePositions;

  if (!base) return;

  for (let i = 0; i < pos.count; i++) {
    const bx = base[i * 3];
    const by = base[i * 3 + 1];
    const bz = base[i * 3 + 2];
    const heightFactor = Math.pow(
      Math.max(0, by / 0.55),
      2
    );
    pos.setX(
      i,
      bx + flickerX * heightFactor
    );

    pos.setY(
      i,
      by * (1 - Math.abs(bendZ) * 0.25 * heightFactor)
    );

    pos.setZ(
      i,
      bz - bendZ * heightFactor
    );
  }

  pos.needsUpdate = true;
}

export function noise(
    t: number,
    frequency: number,
    offset = 0
): number {
    return (
        Math.sin(t * frequency + offset) * 0.5 +
        Math.sin(t * frequency * 0.63 + offset * 1.7) * 0.3 +
        Math.sin(t * frequency * 1.37 + offset * 0.4) * 0.2
    );
}

export function createFlameGlow(): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;

    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(
        64, 64, 2,
        64, 64, 64
    );

    gradient.addColorStop(0, 'rgba(255, 180, 70, 0.35)');
    gradient.addColorStop(0.3, 'rgba(255, 120, 30, 0.15)');
    gradient.addColorStop(1, 'rgba(255, 80, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.8
    });

    const sprite = new THREE.Sprite(material);

    sprite.position.y = 0.23;
    sprite.scale.set(0.65, 0.8, 1);

    return sprite;
}