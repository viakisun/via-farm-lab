// Procedural equipment models for the Reinfa Pilot Glasshouse.
//
// All shapes are built from MeshBuilder primitives + the PBR materials
// declared in materials.ts. Each function returns the root TransformNode
// so callers can reposition or hide groups in the Babylon Inspector.
//
// Real-world dimensions throughout (mm in the comments, metres in the code).
// Positions are anchored to the ground at the equipment's footprint centre.
import {
  Color3,
  type Mesh,
  MeshBuilder,
  PBRMaterial,
  type Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
} from '@babylonjs/core';

import { getMaterials } from './materials';

interface EquipmentRoot {
  readonly root: TransformNode;
  /** Meshes that should receive shadows + take ambient room lights. */
  readonly meshes: Mesh[];
}

function ground(node: TransformNode, position: Vector3): void {
  node.position = position.clone();
}

// Legacy buildFertigationCabinet has been removed. The single "fertigation
// cabinet" is now split into reference-accurate pieces that match real
// commercial products:
//   buildController     ← Bluelab IntelliDose (wall-mounted)
//   buildPeriPod        ← Bluelab PeriPod M3 triple peristaltic dosing pump
//   buildMixingTank     ← commodity translucent batch mixer
//   buildInlineSensor   ← inline DN32 EC/pH probe T-block
//   buildROFilter       ← GrowoniX EX-series skid-mounted RO filter
// See the plan at .claude/plans/reference-mellow-church.md for sources.

export interface ControllerBuilt extends EquipmentRoot {
  /** Cable-gland port on the bottom edge (probe + dosing tube exit). */
  readonly cableGland: Vector3;
  /** Meshes with non-trivial emissive (LCD, nameplate). Driven by the
   *  scenario focus module — multiplied/dimmed when the controller is
   *  the "main character" of the active scenario. */
  readonly emissiveMeshes: Mesh[];
}

/**
 * Wall-mounted fertigation/EC/pH controller — Bluelab IntelliDose form
 * factor. ~30×22×7 cm white polycarbonate enclosure with a dark LCD
 * panel + 4 navigation buttons. Cable gland on the bottom centre.
 *
 * Position is the *bottom-centre of the mounting face* — i.e. the point
 * where the wall meets the controller's underside. Caller positions the
 * root accordingly.
 */
export function buildController(scene: Scene, position: Vector3): ControllerBuilt {
  const mats = getMaterials(scene);
  const root = new TransformNode('intellidose-controller', scene);
  ground(root, position);

  const meshes: Mesh[] = [];

  // Enclosure — light grey, slight metallic for a polycarbonate look.
  const body = MeshBuilder.CreateBox(
    'controller-body',
    { width: 0.3, depth: 0.07, height: 0.22 },
    scene,
  );
  body.position = new Vector3(0, 0.11, 0);
  const bodyMat = new PBRMaterial('mat-controller-body', scene);
  bodyMat.albedoColor = new Color3(0.92, 0.93, 0.94);
  bodyMat.metallic = 0;
  bodyMat.roughness = 0.45;
  bodyMat.maxSimultaneousLights = 8;
  body.material = bodyMat;
  body.parent = root;
  meshes.push(body);

  // LCD panel — black with a cool emissive cyan glow (segment-display look).
  const lcd = MeshBuilder.CreateBox(
    'controller-lcd',
    { width: 0.24, depth: 0.005, height: 0.1 },
    scene,
  );
  lcd.position = new Vector3(0, 0.15, -0.036);
  const lcdMat = new PBRMaterial('mat-controller-lcd', scene);
  lcdMat.albedoColor = new Color3(0.05, 0.06, 0.08);
  lcdMat.emissiveColor = new Color3(0.18, 0.55, 0.65);
  lcdMat.emissiveIntensity = 1.4;
  lcdMat.disableLighting = true;
  lcd.material = lcdMat;
  lcd.parent = root;

  // 4 nav buttons below the LCD.
  for (let i = 0; i < 4; i++) {
    const btn = MeshBuilder.CreateCylinder(
      `controller-btn-${i}`,
      { diameter: 0.022, height: 0.004, tessellation: 14 },
      scene,
    );
    btn.position = new Vector3((i - 1.5) * 0.045, 0.06, -0.036);
    btn.rotation.x = Math.PI / 2;
    btn.material = mats.alumProfile;
    btn.parent = root;
  }

  // Bluelab nameplate — small, on top edge.
  const plate = MeshBuilder.CreateBox(
    'controller-plate',
    { width: 0.1, depth: 0.003, height: 0.018 },
    scene,
  );
  plate.position = new Vector3(0, 0.205, -0.036);
  const plateMat = new PBRMaterial('mat-controller-plate', scene);
  plateMat.albedoColor = new Color3(0.18, 0.22, 0.3);
  plateMat.metallic = 0.4;
  plateMat.roughness = 0.4;
  plate.material = plateMat;
  plate.parent = root;

  // Cable gland — small grey collar at the bottom centre. Probe + dosing
  // tubes leave the controller from this point and travel down the wall.
  const gland = MeshBuilder.CreateCylinder(
    'controller-gland',
    { diameter: 0.025, height: 0.02, tessellation: 12 },
    scene,
  );
  gland.position = new Vector3(0, -0.01, 0);
  gland.material = mats.alumProfile;
  gland.parent = root;

  return {
    root,
    meshes,
    cableGland: position.add(new Vector3(0, -0.02, 0)),
    emissiveMeshes: [lcd, plate],
  };
}

export interface PeriPodBuilt extends EquipmentRoot {
  /** 3 intake nipples on the back face (Solution A/B/pH from stock tanks). */
  readonly intakes: {
    readonly stockA: Vector3;
    readonly stockB: Vector3;
    readonly pHAcid: Vector3;
  };
  /** 3 outlet nipples on the front face (down into mixing tank). */
  readonly outlets: {
    readonly stockA: Vector3;
    readonly stockB: Vector3;
    readonly pHAcid: Vector3;
  };
  /** Channel status LEDs (3 green) — focus-driven emissive. */
  readonly emissiveMeshes: Mesh[];
}

/**
 * Triple peristaltic dosing pump — Bluelab PeriPod M3 form factor.
 * ~35×25×35 cm white box. Three visible peristaltic rotors on the front
 * face (10 cm black wheels in a row), labelled A / B / pH. Bottom edge
 * carries stainless drip tray + intake/outlet nipples.
 *
 * Real pumps spin under control — animation is out of scope for this PR
 * but `peripod-rotor-{i}` meshes are exposed so a follow-up can hook
 * scene.onBeforeRenderObservable.
 */
export function buildPeriPod(scene: Scene, position: Vector3): PeriPodBuilt {
  const mats = getMaterials(scene);
  const root = new TransformNode('peripod-m3', scene);
  ground(root, position);

  const meshes: Mesh[] = [];

  // Enclosure — white shell, slightly textured look.
  const body = MeshBuilder.CreateBox(
    'peripod-body',
    { width: 0.35, depth: 0.25, height: 0.35 },
    scene,
  );
  body.position = new Vector3(0, 0.175, 0);
  const bodyMat = new PBRMaterial('mat-peripod-body', scene);
  bodyMat.albedoColor = new Color3(0.94, 0.94, 0.94);
  bodyMat.metallic = 0;
  bodyMat.roughness = 0.55;
  bodyMat.maxSimultaneousLights = 8;
  body.material = bodyMat;
  body.parent = root;
  meshes.push(body);

  const emissiveMeshes: Mesh[] = [];
  // 3 peristaltic rotor faces on the front.
  const labels = ['A', 'B', 'pH'] as const;
  for (let i = 0; i < labels.length; i++) {
    const xOff = (i - 1) * 0.105;
    // Recess plate (slightly inset for shadow).
    const recess = MeshBuilder.CreateCylinder(
      `peripod-recess-${i}`,
      { diameter: 0.105, height: 0.005, tessellation: 20 },
      scene,
    );
    recess.position = new Vector3(xOff, 0.2, -0.124);
    recess.rotation.x = Math.PI / 2;
    const recessMat = new PBRMaterial(`mat-peripod-recess-${i}`, scene);
    recessMat.albedoColor = new Color3(0.78, 0.78, 0.78);
    recessMat.metallic = 0.1;
    recessMat.roughness = 0.5;
    recess.material = recessMat;
    recess.parent = root;

    // Rotor face — black wheel with 3 visible roller bumps (simulated as
    // small flat cylinders around the rim).
    const rotor = MeshBuilder.CreateCylinder(
      `peripod-rotor-${i}`,
      { diameter: 0.092, height: 0.008, tessellation: 24 },
      scene,
    );
    rotor.position = new Vector3(xOff, 0.2, -0.128);
    rotor.rotation.x = Math.PI / 2;
    const rotorMat = new PBRMaterial(`mat-peripod-rotor-${i}`, scene);
    rotorMat.albedoColor = new Color3(0.08, 0.08, 0.1);
    rotorMat.metallic = 0.2;
    rotorMat.roughness = 0.4;
    rotor.material = rotorMat;
    rotor.parent = root;

    // 3 roller bumps at 120° intervals.
    for (let r = 0; r < 3; r++) {
      const angle = (r / 3) * Math.PI * 2;
      const bumpX = Math.cos(angle) * 0.03;
      const bumpY = Math.sin(angle) * 0.03;
      const bump = MeshBuilder.CreateCylinder(
        `peripod-bump-${i}-${r}`,
        { diameter: 0.012, height: 0.012, tessellation: 12 },
        scene,
      );
      bump.position = new Vector3(xOff + bumpX, 0.2 + bumpY, -0.132);
      bump.rotation.x = Math.PI / 2;
      bump.material = mats.alumProfile;
      bump.parent = root;
    }

    // Tiny channel label below each rotor (just an emissive dot).
    const led = MeshBuilder.CreateCylinder(
      `peripod-led-${i}`,
      { diameter: 0.008, height: 0.003, tessellation: 10 },
      scene,
    );
    led.position = new Vector3(xOff, 0.135, -0.126);
    led.rotation.x = Math.PI / 2;
    const ledMat = new PBRMaterial(`mat-peripod-led-${i}`, scene);
    ledMat.albedoColor = new Color3(0.2, 0.85, 0.35);
    ledMat.emissiveColor = new Color3(0.2, 0.85, 0.35);
    ledMat.emissiveIntensity = 1.3;
    ledMat.disableLighting = true;
    led.material = ledMat;
    led.parent = root;
    emissiveMeshes.push(led);
  }

  // Stainless drip tray at the base.
  const tray = MeshBuilder.CreateBox(
    'peripod-tray',
    { width: 0.34, depth: 0.24, height: 0.01 },
    scene,
  );
  tray.position = new Vector3(0, 0.005, 0);
  tray.material = mats.stainless;
  tray.parent = root;

  // Compute intake/outlet world positions.
  const intakes = {
    stockA: position.add(new Vector3(-0.105, 0.2, 0.13)),
    stockB: position.add(new Vector3(0, 0.2, 0.13)),
    pHAcid: position.add(new Vector3(0.105, 0.2, 0.13)),
  };
  const outlets = {
    stockA: position.add(new Vector3(-0.105, 0.04, 0)),
    stockB: position.add(new Vector3(0, 0.04, 0)),
    pHAcid: position.add(new Vector3(0.105, 0.04, 0)),
  };

  return { root, meshes, intakes, outlets, emissiveMeshes };
}

export interface MixingTankBuilt extends EquipmentRoot {
  /** 4 inlet ports on the rim (Solution A/B/pH from PeriPod + RO water). */
  readonly inlets: {
    readonly stockA: Vector3;
    readonly stockB: Vector3;
    readonly pHAcid: Vector3;
    readonly ro: Vector3;
  };
  /** Single outlet at the base, feeds the supply pump. */
  readonly outlet: Vector3;
}

/**
 * Batch mixing tank — translucent PE box that visibly holds the
 * combined nutrient solution. 30×30×50 cm. Inlets on the rim, single
 * outlet at floor level for the supply line.
 */
export function buildMixingTank(scene: Scene, position: Vector3): MixingTankBuilt {
  const mats = getMaterials(scene);
  const root = new TransformNode('mixing-tank', scene);
  ground(root, position);

  const meshes: Mesh[] = [];

  // Translucent shell.
  const shell = MeshBuilder.CreateBox(
    'mixing-shell',
    { width: 0.3, depth: 0.3, height: 0.5 },
    scene,
  );
  shell.position = new Vector3(0, 0.25, 0);
  shell.material = mats.translucentPE;
  shell.parent = root;
  meshes.push(shell);

  // Liquid surface inside — opaque coloured slab so we can read the
  // tank as "full of nutrient solution". Pool-EC material recolour is
  // wired via the basinLiquids hook in Canvas; for the mixing tank we
  // just give it a neutral fresh teal.
  const liquid = MeshBuilder.CreateBox(
    'mixing-liquid',
    { width: 0.27, depth: 0.27, height: 0.32 },
    scene,
  );
  liquid.position = new Vector3(0, 0.18, 0);
  const liquidMat = new PBRMaterial('mat-mixing-liquid', scene);
  liquidMat.albedoColor = new Color3(0.3, 0.62, 0.66);
  liquidMat.emissiveColor = new Color3(0.1, 0.22, 0.24);
  liquidMat.emissiveIntensity = 0.4;
  liquidMat.alpha = 0.85;
  liquidMat.metallic = 0;
  liquidMat.roughness = 0.3;
  liquidMat.maxSimultaneousLights = 8;
  liquid.material = liquidMat;
  liquid.parent = root;

  // Lid frame (open-top, just a thin rim around the opening).
  const rim = MeshBuilder.CreateBox(
    'mixing-rim',
    { width: 0.32, depth: 0.32, height: 0.015 },
    scene,
  );
  rim.position = new Vector3(0, 0.505, 0);
  rim.material = mats.alumProfile;
  rim.parent = root;

  // Static impeller — a thin cross at the bottom hinting at agitation.
  for (let i = 0; i < 2; i++) {
    const blade = MeshBuilder.CreateBox(
      `mixing-blade-${i}`,
      { width: 0.18, depth: 0.012, height: 0.012 },
      scene,
    );
    blade.position = new Vector3(0, 0.04, 0);
    blade.rotation.y = (i * Math.PI) / 2;
    blade.material = mats.stainless;
    blade.parent = root;
  }
  // Impeller shaft.
  const shaft = MeshBuilder.CreateCylinder(
    'mixing-shaft',
    { diameter: 0.014, height: 0.45, tessellation: 10 },
    scene,
  );
  shaft.position = new Vector3(0, 0.27, 0);
  shaft.material = mats.stainless;
  shaft.parent = root;

  const inlets = {
    stockA: position.add(new Vector3(-0.12, 0.5, -0.1)),
    stockB: position.add(new Vector3(0, 0.5, -0.1)),
    pHAcid: position.add(new Vector3(0.12, 0.5, -0.1)),
    ro: position.add(new Vector3(0, 0.5, 0.12)),
  };
  const outlet = position.add(new Vector3(0.15, 0.05, 0));
  return { root, meshes, inlets, outlet };
}

export interface InlineSensorBuilt extends EquipmentRoot {
  readonly inPort: Vector3;
  readonly outPort: Vector3;
  /** Probe-indicator LEDs (EC + pH). */
  readonly emissiveMeshes: Mesh[];
}

/**
 * Inline EC + pH sensor housing — DN32 stainless T-block sitting on the
 * supply pipe. Two black PE probes rise out of the top of the block
 * with green/cyan emissive indicator LEDs.
 */
export function buildInlineSensor(scene: Scene, position: Vector3): InlineSensorBuilt {
  const mats = getMaterials(scene);
  const root = new TransformNode('inline-sensor', scene);
  ground(root, position);

  const meshes: Mesh[] = [];
  const emissiveMeshes: Mesh[] = [];

  // T-block body.
  const block = MeshBuilder.CreateBox(
    'sensor-block',
    { width: 0.08, depth: 0.05, height: 0.05 },
    scene,
  );
  block.position = new Vector3(0, 0.085, 0);
  block.material = mats.stainless;
  block.parent = root;
  meshes.push(block);

  // 2 probes (EC, pH) — black PE rods.
  const probeLabels = ['EC', 'pH'] as const;
  for (let i = 0; i < probeLabels.length; i++) {
    const xOff = (i - 0.5) * 0.04;
    const probe = MeshBuilder.CreateCylinder(
      `sensor-probe-${probeLabels[i]?.toLowerCase()}`,
      { diameter: 0.013, height: 0.07, tessellation: 12 },
      scene,
    );
    probe.position = new Vector3(xOff, 0.135, 0);
    const probeMat = new PBRMaterial(`mat-sensor-probe-${i}`, scene);
    probeMat.albedoColor = new Color3(0.08, 0.08, 0.1);
    probeMat.metallic = 0;
    probeMat.roughness = 0.55;
    probe.material = probeMat;
    probe.parent = root;

    // Cap with indicator LED.
    const cap = MeshBuilder.CreateCylinder(
      `sensor-cap-${i}`,
      { diameter: 0.02, height: 0.022, tessellation: 12 },
      scene,
    );
    cap.position = new Vector3(xOff, 0.181, 0);
    cap.material = mats.alumProfile;
    cap.parent = root;

    const led = MeshBuilder.CreateCylinder(
      `sensor-led-${i}`,
      { diameter: 0.01, height: 0.004, tessellation: 10 },
      scene,
    );
    led.position = new Vector3(xOff, 0.194, 0);
    const ledMat = new PBRMaterial(`mat-sensor-led-${i}`, scene);
    // EC LED = green, pH LED = cyan, for at-a-glance disambiguation.
    if (i === 0) {
      ledMat.albedoColor = new Color3(0.2, 0.85, 0.35);
      ledMat.emissiveColor = new Color3(0.2, 0.85, 0.35);
    } else {
      ledMat.albedoColor = new Color3(0.25, 0.75, 0.95);
      ledMat.emissiveColor = new Color3(0.25, 0.75, 0.95);
    }
    ledMat.emissiveIntensity = 1.6;
    ledMat.disableLighting = true;
    led.material = ledMat;
    led.parent = root;
    emissiveMeshes.push(led);
  }

  // Cable gland on the side.
  const gland = MeshBuilder.CreateCylinder(
    'sensor-gland',
    { diameter: 0.012, height: 0.015, tessellation: 10 },
    scene,
  );
  gland.position = new Vector3(0.045, 0.1, 0);
  gland.rotation.z = Math.PI / 2;
  gland.material = mats.alumProfile;
  gland.parent = root;

  return {
    root,
    meshes,
    inPort: position.add(new Vector3(-0.04, 0.085, 0)),
    outPort: position.add(new Vector3(0.04, 0.085, 0)),
    emissiveMeshes,
  };
}

export interface ROFilterBuilt extends EquipmentRoot {
  readonly rawIn: Vector3;
  readonly polishedOut: Vector3;
  readonly wasteOut: Vector3;
  /** Pressure-gauge faces + needles (4 emissive meshes total). */
  readonly emissiveMeshes: Mesh[];
}

/**
 * Reverse-osmosis filter skid — GrowoniX EX-series form factor.
 * Aluminium frame with 2 horizontal blue membrane housings stacked
 * vertically + 1 white pre-filter cylinder on the side + 2 stainless
 * pressure gauges on a front panel.
 */
export function buildROFilter(scene: Scene, position: Vector3): ROFilterBuilt {
  const mats = getMaterials(scene);
  const root = new TransformNode('ro-filter', scene);
  ground(root, position);

  const meshes: Mesh[] = [];
  const emissiveMeshes: Mesh[] = [];

  // Frame — open box of alu profile (4 verticals + 2 horizontal top rails).
  const frameW = 0.6;
  const frameD = 0.4;
  const frameH = 0.8;
  for (const xs of [-1, 1]) {
    for (const zs of [-1, 1]) {
      const leg = MeshBuilder.CreateBox(
        `ro-frame-leg-${xs > 0 ? 'r' : 'l'}-${zs > 0 ? 'b' : 'f'}`,
        { width: 0.03, depth: 0.03, height: frameH },
        scene,
      );
      leg.position = new Vector3(xs * (frameW / 2 - 0.015), frameH / 2, zs * (frameD / 2 - 0.015));
      leg.material = mats.alumProfile;
      leg.parent = root;
    }
  }
  for (const zs of [-1, 1]) {
    const rail = MeshBuilder.CreateBox(
      `ro-frame-rail-top-${zs > 0 ? 'b' : 'f'}`,
      { width: frameW, depth: 0.03, height: 0.03 },
      scene,
    );
    rail.position = new Vector3(0, frameH - 0.015, zs * (frameD / 2 - 0.015));
    rail.material = mats.alumProfile;
    rail.parent = root;
  }

  // Membrane housings — 2 horizontal blue cylinders stacked.
  const memMat = new PBRMaterial('mat-ro-membrane', scene);
  memMat.albedoColor = new Color3(0.1, 0.3, 0.55);
  memMat.metallic = 0.15;
  memMat.roughness = 0.45;
  memMat.maxSimultaneousLights = 8;
  for (let i = 0; i < 2; i++) {
    const y = 0.22 + i * 0.18;
    const housing = MeshBuilder.CreateCylinder(
      `ro-membrane-${i}`,
      { diameter: 0.1, height: 0.48, tessellation: 22 },
      scene,
    );
    housing.position = new Vector3(0, y, -0.05);
    housing.rotation.z = Math.PI / 2;
    housing.material = memMat;
    housing.parent = root;
    meshes.push(housing);

    // End caps in alu — visible at both ends.
    for (const xSign of [-1, 1]) {
      const cap = MeshBuilder.CreateCylinder(
        `ro-membrane-cap-${i}-${xSign > 0 ? 'r' : 'l'}`,
        { diameter: 0.108, height: 0.02, tessellation: 18 },
        scene,
      );
      cap.position = new Vector3(xSign * 0.25, y, -0.05);
      cap.rotation.z = Math.PI / 2;
      cap.material = mats.alumProfile;
      cap.parent = root;
    }
  }

  // Pre-filter — white vertical cylinder on the side.
  const prefilter = MeshBuilder.CreateCylinder(
    'ro-prefilter',
    { diameter: 0.12, height: 0.3, tessellation: 22 },
    scene,
  );
  prefilter.position = new Vector3(0, 0.16, 0.14);
  prefilter.material = mats.glossWhite;
  prefilter.parent = root;
  meshes.push(prefilter);
  // Pre-filter head (alu cap + inlet/outlet stubs).
  const preHead = MeshBuilder.CreateCylinder(
    'ro-prefilter-head',
    { diameter: 0.13, height: 0.04, tessellation: 18 },
    scene,
  );
  preHead.position = new Vector3(0, 0.33, 0.14);
  preHead.material = mats.alumProfile;
  preHead.parent = root;

  // Front panel with 2 pressure gauges.
  const panel = MeshBuilder.CreateBox(
    'ro-panel',
    { width: 0.2, depth: 0.012, height: 0.18 },
    scene,
  );
  panel.position = new Vector3(0.22, 0.55, -0.18);
  panel.material = mats.alumProfile;
  panel.parent = root;
  for (let i = 0; i < 2; i++) {
    const yOff = i === 0 ? 0.04 : -0.04;
    const gauge = MeshBuilder.CreateCylinder(
      `ro-gauge-${i}`,
      { diameter: 0.062, height: 0.025, tessellation: 18 },
      scene,
    );
    gauge.position = new Vector3(0.22, 0.55 + yOff, -0.19);
    gauge.rotation.x = Math.PI / 2;
    const gaugeMat = new PBRMaterial(`mat-ro-gauge-${i}`, scene);
    gaugeMat.albedoColor = new Color3(0.85, 0.86, 0.88);
    gaugeMat.metallic = 0.6;
    gaugeMat.roughness = 0.25;
    gauge.material = gaugeMat;
    gauge.parent = root;

    // Gauge face — dark circle.
    const face = MeshBuilder.CreateCylinder(
      `ro-gauge-face-${i}`,
      { diameter: 0.052, height: 0.003, tessellation: 18 },
      scene,
    );
    face.position = new Vector3(0.22, 0.55 + yOff, -0.198);
    face.rotation.x = Math.PI / 2;
    const faceMat = new PBRMaterial(`mat-ro-gauge-face-${i}`, scene);
    faceMat.albedoColor = new Color3(0.1, 0.11, 0.13);
    faceMat.emissiveColor = new Color3(0.3, 0.35, 0.42);
    faceMat.emissiveIntensity = 0.5;
    faceMat.disableLighting = true;
    face.material = faceMat;
    face.parent = root;
    emissiveMeshes.push(face);

    // Needle — thin emissive line.
    const needle = MeshBuilder.CreateBox(
      `ro-gauge-needle-${i}`,
      { width: 0.025, depth: 0.0015, height: 0.0015 },
      scene,
    );
    needle.position = new Vector3(0.22, 0.55 + yOff, -0.2);
    needle.rotation.y = ((i === 0 ? -1 : 1) * Math.PI) / 5;
    const needleMat = new PBRMaterial(`mat-ro-needle-${i}`, scene);
    needleMat.albedoColor = new Color3(0.95, 0.95, 0.95);
    needleMat.emissiveColor = new Color3(0.95, 0.95, 0.95);
    needleMat.emissiveIntensity = 1.0;
    needleMat.disableLighting = true;
    needle.material = needleMat;
    needle.parent = root;
    emissiveMeshes.push(needle);
  }

  // Port positions (raw input on left side, polished output on right
  // side, waste at bottom).
  const rawIn = position.add(new Vector3(-0.3, 0.22, -0.05));
  const polishedOut = position.add(new Vector3(0.3, 0.4, -0.05));
  const wasteOut = position.add(new Vector3(0, 0.05, 0.2));
  return { root, meshes, rawIn, polishedOut, wasteOut, emissiveMeshes };
}

/** Raw-water PE tank — translucent cylinder. */
export function buildRawWaterTank(scene: Scene, position: Vector3): EquipmentRoot {
  const mats = getMaterials(scene);
  const root = new TransformNode('raw-water-tank', scene);
  ground(root, position);

  const tank = MeshBuilder.CreateCylinder(
    'raw-water-tank-body',
    { diameter: 0.6, height: 1.1, tessellation: 24 },
    scene,
  );
  tank.position = new Vector3(0, 0.55, 0);
  tank.material = mats.translucentPE;
  tank.parent = root;

  // Faint water surface sitting inside — narrower cylinder, ~60% full.
  const water = MeshBuilder.CreateCylinder(
    'raw-water-water',
    { diameter: 0.56, height: 0.62, tessellation: 24 },
    scene,
  );
  water.position = new Vector3(0, 0.32, 0);
  const waterMat = new StandardMaterial('raw-water-mat', scene);
  waterMat.diffuseColor = new Color3(0.55, 0.7, 0.85);
  waterMat.alpha = 0.65;
  waterMat.specularColor = new Color3(0.2, 0.25, 0.3);
  water.material = waterMat;
  water.parent = root;

  return { root, meshes: [tank] };
}

export interface DosingTanksBuilt extends EquipmentRoot {
  /** Liquid-level cylinder per tank. Y scale = remaining / capacity. */
  readonly levels: { readonly stockA: Mesh; readonly stockB: Mesh; readonly pHAcid: Mesh };
}

/** A/B/pH dosing tanks — three small translucent cylinders in a row.
 *  Inside each tank we add a coloured liquid cylinder whose Y scale tracks
 *  the remaining-volume ratio (set by the demo controller). */
export function buildDosingTanks(scene: Scene, position: Vector3): DosingTanksBuilt {
  const mats = getMaterials(scene);
  const root = new TransformNode('dosing-tanks', scene);
  ground(root, position);

  const meshes: Mesh[] = [];
  const labels = ['A', 'B', 'pH'] as const;
  const spacing = 0.32;
  const tankH = 0.5;
  const liquidMaxH = tankH - 0.06;
  const liquids: Mesh[] = [];
  for (let i = 0; i < labels.length; i++) {
    const xOff = (i - (labels.length - 1) / 2) * spacing;
    const tank = MeshBuilder.CreateCylinder(
      `dosing-tank-${labels[i]?.toLowerCase()}`,
      { diameter: 0.28, height: tankH, tessellation: 20 },
      scene,
    );
    tank.position = new Vector3(xOff, 0.25, 0);
    tank.material = mats.translucentPE;
    tank.parent = root;
    meshes.push(tank);

    const liquid = MeshBuilder.CreateCylinder(
      `dosing-liquid-${labels[i]?.toLowerCase()}`,
      { diameter: 0.24, height: liquidMaxH, tessellation: 18 },
      scene,
    );
    // Pivot at the cylinder bottom so Y scale 0..1 drops the level
    // realistically. Babylon cylinders are centred on origin → bake an
    // offset so scaling.y modulates the visible top.
    liquid.position = new Vector3(xOff, 0.03 + liquidMaxH / 2, 0);
    const liquidMat = new PBRMaterial(`mat-dosing-liquid-${labels[i]?.toLowerCase()}`, scene);
    // A = green NPK, B = pink micro, pH = amber acid.
    const tints = [
      new Color3(0.3, 0.65, 0.4),
      new Color3(0.8, 0.32, 0.55),
      new Color3(0.92, 0.74, 0.3),
    ];
    liquidMat.albedoColor = tints[i] ?? new Color3(0.5, 0.5, 0.5);
    liquidMat.emissiveColor = (tints[i] ?? new Color3(0.5, 0.5, 0.5)).scale(0.4);
    liquidMat.emissiveIntensity = 0.6;
    liquidMat.metallic = 0;
    liquidMat.roughness = 0.3;
    liquidMat.alpha = 0.9;
    liquidMat.maxSimultaneousLights = 8;
    liquid.material = liquidMat;
    liquid.parent = root;
    liquid.metadata = { baseHeight: liquidMaxH };
    liquids.push(liquid);

    const cap = MeshBuilder.CreateCylinder(
      `dosing-cap-${labels[i]?.toLowerCase()}`,
      { diameter: 0.16, height: 0.05, tessellation: 16 },
      scene,
    );
    cap.position = new Vector3(xOff, 0.525, 0);
    cap.material = mats.glossWhite;
    cap.parent = root;
  }

  const stockA = liquids[0];
  const stockB = liquids[1];
  const pHAcid = liquids[2];
  if (!stockA || !stockB || !pHAcid) throw new Error('dosing tanks: missing liquid meshes');
  return { root, meshes, levels: { stockA, stockB, pHAcid } };
}

/** Apply a remaining-volume fraction (0..1) to a dosing tank liquid mesh.
 *  Re-positions the mesh so the bottom stays anchored at the same Y. */
export function setDosingLiquidLevel(mesh: Mesh, fraction: number): void {
  const meta = mesh.metadata as { baseHeight?: number } | null;
  const baseH = meta?.baseHeight ?? 0.44;
  const clamped = Math.max(0, Math.min(1, fraction));
  mesh.scaling.y = clamped;
  // Cylinder is centred on origin → shift its Y so the bottom stays put.
  const baseY = 0.03; // bottom of the liquid column
  mesh.position.y = baseY + (baseH * clamped) / 2;
}

/**
 * World-space centres of the 4 dosing tank tops, given the dosing cluster
 * position (matches buildDosingTanks layout). Used by piping for dosing
 * supply line endpoints.
 */
export function dosingTankTopPositions(clusterPosition: Vector3): Vector3[] {
  const spacing = 0.32;
  const count = 3;
  const out: Vector3[] = [];
  for (let i = 0; i < count; i++) {
    const xOff = (i - (count - 1) / 2) * spacing;
    out.push(new Vector3(clusterPosition.x + xOff, clusterPosition.y + 0.55, clusterPosition.z));
  }
  return out;
}

/**
 * RO water buffer tank — sits beside the raw water tank. Smaller cylinder
 * used as a polished-water reservoir between RO filter and fertigation.
 * Visually a half-height stainless cylinder with a brushed cap.
 */
export function buildROBuffer(scene: Scene, position: Vector3): EquipmentRoot {
  const mats = getMaterials(scene);
  const root = new TransformNode('ro-buffer', scene);
  ground(root, position);

  const meshes: Mesh[] = [];

  const tank = MeshBuilder.CreateCylinder(
    'ro-buffer-tank',
    { diameter: 0.45, height: 0.85, tessellation: 24 },
    scene,
  );
  tank.position = new Vector3(0, 0.425, 0);
  tank.material = mats.stainless;
  tank.parent = root;
  meshes.push(tank);

  const cap = MeshBuilder.CreateCylinder(
    'ro-buffer-cap',
    { diameter: 0.3, height: 0.04, tessellation: 16 },
    scene,
  );
  cap.position = new Vector3(0, 0.87, 0);
  cap.material = mats.alumProfile;
  cap.parent = root;

  // Small nameplate — neutral grey alu (industrial look). The previous
  // green emissive plate read as a toy and washed out the rest of the
  // tank under the dark CEA lighting.
  const plate = MeshBuilder.CreateBox(
    'ro-buffer-plate',
    { width: 0.18, height: 0.06, depth: 0.005 },
    scene,
  );
  plate.position = new Vector3(0, 0.7, 0.225);
  plate.material = mats.alumProfile;
  plate.parent = root;

  return { root, meshes };
}

/** CO₂ cylinders × 2 with regulators and a short connecting hose. */
export function buildCO2Cylinders(scene: Scene, position: Vector3): EquipmentRoot {
  const mats = getMaterials(scene);
  const root = new TransformNode('co2-cylinders', scene);
  ground(root, position);

  const meshes: Mesh[] = [];
  for (let i = 0; i < 2; i++) {
    const x = (i - 0.5) * 0.32;
    const cyl = MeshBuilder.CreateCylinder(
      `co2-cyl-${i}`,
      { diameter: 0.2, height: 1.4, tessellation: 20 },
      scene,
    );
    cyl.position = new Vector3(x, 0.7, 0);
    cyl.material = mats.co2Cylinder;
    cyl.parent = root;
    meshes.push(cyl);

    // Regulator stack on top.
    const valveBody = MeshBuilder.CreateBox(
      `co2-valve-${i}`,
      { width: 0.12, depth: 0.12, height: 0.1 },
      scene,
    );
    valveBody.position = new Vector3(x, 1.45, 0);
    valveBody.material = mats.alumProfile;
    valveBody.parent = root;

    const dial = MeshBuilder.CreateCylinder(
      `co2-dial-${i}`,
      { diameter: 0.08, height: 0.04, tessellation: 16 },
      scene,
    );
    dial.position = new Vector3(x + 0.07, 1.5, 0);
    dial.rotation.z = Math.PI / 2;
    dial.material = mats.stainless;
    dial.parent = root;
  }

  // Connecting hose between regulators.
  const connector = MeshBuilder.CreateTube(
    'co2-connector',
    {
      path: [new Vector3(-0.16, 1.5, 0), new Vector3(0, 1.6, 0), new Vector3(0.16, 1.5, 0)],
      radius: 0.012,
      tessellation: 8,
    },
    scene,
  );
  const connMat = new StandardMaterial('co2-connector-mat', scene);
  connMat.diffuseColor = new Color3(0.18, 0.18, 0.2);
  connector.material = connMat;
  connector.parent = root;

  return { root, meshes };
}

/** Industrial ultrasonic humidifier — small tower with a misting cap. */
export function buildHumidifier(scene: Scene, position: Vector3): EquipmentRoot {
  const mats = getMaterials(scene);
  const root = new TransformNode('humidifier', scene);
  ground(root, position);

  const body = MeshBuilder.CreateBox('humid-body', { width: 0.4, depth: 0.4, height: 0.8 }, scene);
  body.position = new Vector3(0, 0.4, 0);
  body.material = mats.glossWhite;
  body.parent = root;

  // Top mist nozzle.
  const nozzle = MeshBuilder.CreateCylinder(
    'humid-nozzle',
    { diameterTop: 0.16, diameterBottom: 0.22, height: 0.12, tessellation: 16 },
    scene,
  );
  nozzle.position = new Vector3(0, 0.86, 0);
  nozzle.material = mats.alumProfile;
  nozzle.parent = root;

  // Mist plume — soft emissive sphere.
  const plume = MeshBuilder.CreateSphere('humid-plume', { diameter: 0.32, segments: 12 }, scene);
  plume.position = new Vector3(0, 1.05, 0);
  const plumeMat = new StandardMaterial('humid-plume-mat', scene);
  plumeMat.diffuseColor = new Color3(0.9, 0.95, 1.0);
  plumeMat.emissiveColor = new Color3(0.5, 0.6, 0.7);
  plumeMat.alpha = 0.18;
  plumeMat.disableLighting = true;
  plume.material = plumeMat;
  plume.parent = root;

  return { root, meshes: [body] };
}

/** Stainless work bench with an inset sink + tap. */
export function buildBenchAndSink(scene: Scene, position: Vector3): EquipmentRoot {
  const mats = getMaterials(scene);
  const root = new TransformNode('bench-sink', scene);
  ground(root, position);

  const benchTop = MeshBuilder.CreateBox(
    'bench-top',
    { width: 2.4, depth: 0.6, height: 0.05 },
    scene,
  );
  benchTop.position = new Vector3(0, 0.9, 0);
  benchTop.material = mats.stainless;
  benchTop.parent = root;

  // Cabinet body beneath.
  const cabinet = MeshBuilder.CreateBox(
    'bench-cabinet',
    { width: 2.3, depth: 0.55, height: 0.85 },
    scene,
  );
  cabinet.position = new Vector3(0, 0.45, 0);
  cabinet.material = mats.glossWhite;
  cabinet.parent = root;

  // Sink — a dark inset square at the +X end.
  const sink = MeshBuilder.CreateBox(
    'bench-sink',
    { width: 0.5, depth: 0.45, height: 0.18 },
    scene,
  );
  sink.position = new Vector3(0.85, 0.82, 0);
  const sinkMat = new PBRMaterial('bench-sink-mat', scene);
  sinkMat.albedoColor = new Color3(0.25, 0.27, 0.3);
  sinkMat.metallic = 0.8;
  sinkMat.roughness = 0.25;
  sinkMat.maxSimultaneousLights = 8;
  sink.material = sinkMat;
  sink.parent = root;

  // Tap — short cylinder + elbow.
  const tapBase = MeshBuilder.CreateCylinder(
    'bench-tap-base',
    { diameter: 0.04, height: 0.25, tessellation: 12 },
    scene,
  );
  tapBase.position = new Vector3(1.05, 1.06, -0.18);
  tapBase.material = mats.stainless;
  tapBase.parent = root;

  const tapArm = MeshBuilder.CreateTube(
    'bench-tap-arm',
    {
      path: [
        new Vector3(1.05, 1.18, -0.18),
        new Vector3(1.05, 1.18, -0.08),
        new Vector3(0.95, 1.12, 0.0),
      ],
      radius: 0.02,
      tessellation: 10,
    },
    scene,
  );
  tapArm.material = mats.stainless;
  tapArm.parent = root;

  return { root, meshes: [benchTop, cabinet] };
}

/** NDIR wall-mounted CO₂ sensor — small box with a faint emissive LCD. */
export function buildNDIRWallSensor(scene: Scene, position: Vector3): EquipmentRoot {
  const mats = getMaterials(scene);
  const root = new TransformNode('ndir-wall-sensor', scene);
  ground(root, position);

  const body = MeshBuilder.CreateBox('ndir-body', { width: 0.2, depth: 0.06, height: 0.12 }, scene);
  body.position = new Vector3(0, 0, 0);
  body.material = mats.glossWhite;
  body.parent = root;

  const lcd = MeshBuilder.CreateBox('ndir-lcd', { width: 0.13, depth: 0.005, height: 0.05 }, scene);
  lcd.position = new Vector3(0, 0.01, -0.032);
  const lcdMat = new PBRMaterial('ndir-lcd-mat', scene);
  lcdMat.albedoColor = new Color3(0.05, 0.1, 0.15);
  lcdMat.emissiveColor = new Color3(0.2, 0.55, 0.45);
  lcdMat.emissiveIntensity = 1.8;
  lcdMat.disableLighting = true;
  lcdMat.maxSimultaneousLights = 8;
  lcd.material = lcdMat;
  lcd.parent = root;

  return { root, meshes: [body] };
}

/** NDIR 4-channel monitor — wall display, larger LCD. */
export function buildNDIR4ChMonitor(scene: Scene, position: Vector3): EquipmentRoot {
  const mats = getMaterials(scene);
  const root = new TransformNode('ndir-4ch-monitor', scene);
  ground(root, position);

  const body = MeshBuilder.CreateBox('ndir4-body', { width: 0.4, depth: 0.08, height: 0.3 }, scene);
  body.position = new Vector3(0, 0, 0);
  body.material = mats.glossWhite;
  body.parent = root;

  const lcd = MeshBuilder.CreateBox(
    'ndir4-lcd',
    { width: 0.32, depth: 0.005, height: 0.22 },
    scene,
  );
  lcd.position = new Vector3(0, 0.01, -0.043);
  const lcdMat = new PBRMaterial('ndir4-lcd-mat', scene);
  lcdMat.albedoColor = new Color3(0.05, 0.08, 0.12);
  lcdMat.emissiveColor = new Color3(0.32, 0.62, 0.85);
  lcdMat.emissiveIntensity = 1.6;
  lcdMat.disableLighting = true;
  lcdMat.maxSimultaneousLights = 8;
  lcd.material = lcdMat;
  lcd.parent = root;

  return { root, meshes: [body] };
}

/** HVAC column — tall free-standing climate unit. */
export function buildHVACColumn(scene: Scene, position: Vector3): EquipmentRoot {
  const mats = getMaterials(scene);
  const root = new TransformNode('hvac-column', scene);
  ground(root, position);

  const body = MeshBuilder.CreateBox('hvac-body', { width: 0.5, depth: 0.5, height: 1.8 }, scene);
  body.position = new Vector3(0, 0.9, 0);
  body.material = mats.glossWhite;
  body.parent = root;

  // Top grille — horizontal slat stripes (5 thin boxes).
  for (let i = 0; i < 5; i++) {
    const slat = MeshBuilder.CreateBox(
      `hvac-slat-${i}`,
      { width: 0.45, depth: 0.02, height: 0.02 },
      scene,
    );
    slat.position = new Vector3(0, 1.45 + i * 0.05, -0.245);
    slat.material = mats.alumProfile;
    slat.parent = root;
  }

  return { root, meshes: [body] };
}

/** Power outlets — small decorative wall boxes. */
export function buildPowerOutlets(scene: Scene, positions: readonly Vector3[]): EquipmentRoot {
  const mats = getMaterials(scene);
  const root = new TransformNode('power-outlets', scene);
  const meshes: Mesh[] = [];
  for (let i = 0; i < positions.length; i++) {
    const p = positions[i];
    if (!p) continue;
    const outlet = MeshBuilder.CreateBox(
      `outlet-${i}`,
      { width: 0.1, depth: 0.04, height: 0.1 },
      scene,
    );
    outlet.position = p.clone();
    outlet.material = mats.glossWhite;
    outlet.parent = root;
    meshes.push(outlet);
  }
  return { root, meshes };
}

/** Submersible pump — small pale-blue box (per 2D 수중펌프 callout). */
export function buildSubmersiblePump(scene: Scene, position: Vector3): EquipmentRoot {
  const mats = getMaterials(scene);
  const root = new TransformNode('submersible-pump', scene);
  ground(root, position);

  const body = MeshBuilder.CreateBox('pump-body', { width: 0.32, depth: 0.32, height: 0.4 }, scene);
  body.position = new Vector3(0, 0.2, 0);
  const pumpMat = new PBRMaterial('mat-pump', scene);
  pumpMat.albedoColor = new Color3(0.72, 0.82, 0.88);
  pumpMat.metallic = 0.2;
  pumpMat.roughness = 0.4;
  pumpMat.maxSimultaneousLights = 8;
  body.material = pumpMat;
  body.parent = root;

  // Small grill on top.
  const grill = MeshBuilder.CreateCylinder(
    'pump-grill',
    { diameter: 0.16, height: 0.04, tessellation: 16 },
    scene,
  );
  grill.position = new Vector3(0, 0.42, 0);
  grill.material = mats.alumProfile;
  grill.parent = root;

  return { root, meshes: [body] };
}

/** Office desk — large wood-top desk for the annex east wall. */
export function buildOfficeDesk(
  scene: Scene,
  position: Vector3,
  opts: { lengthM?: number; depthM?: number } = {},
): EquipmentRoot {
  const root = new TransformNode('office-desk', scene);
  ground(root, position);

  const lengthM = opts.lengthM ?? 2.5;
  const depthM = opts.depthM ?? 0.6;

  // Top — warm-walnut PBR.
  const top = MeshBuilder.CreateBox(
    'desk-top',
    { width: depthM, depth: lengthM, height: 0.04 },
    scene,
  );
  top.position = new Vector3(0, 0.74, 0);
  const topMat = new PBRMaterial('mat-desk-top', scene);
  topMat.albedoColor = new Color3(0.18, 0.22, 0.32);
  topMat.metallic = 0.0;
  topMat.roughness = 0.42;
  topMat.maxSimultaneousLights = 8;
  top.material = topMat;
  top.parent = root;

  // Legs / pedestal — simple box at each end.
  const legMat = new PBRMaterial('mat-desk-leg', scene);
  legMat.albedoColor = new Color3(0.12, 0.14, 0.18);
  legMat.metallic = 0.4;
  legMat.roughness = 0.35;
  legMat.maxSimultaneousLights = 8;
  for (const zSign of [-1, 1]) {
    const leg = MeshBuilder.CreateBox(
      `desk-leg-${zSign > 0 ? 'r' : 'l'}`,
      { width: depthM - 0.05, depth: 0.05, height: 0.72 },
      scene,
    );
    leg.position = new Vector3(0, 0.36, zSign * (lengthM / 2 - 0.1));
    leg.material = legMat;
    leg.parent = root;
  }

  // Modesty panel (rear).
  const panel = MeshBuilder.CreateBox(
    'desk-panel',
    { width: 0.04, depth: lengthM - 0.3, height: 0.5 },
    scene,
  );
  panel.position = new Vector3(-depthM / 2 + 0.04, 0.4, 0);
  panel.material = legMat;
  panel.parent = root;

  return { root, meshes: [top] };
}

/** Simple stainless workbench — counter top + cabinet body, no sink. */
export function buildWorkbench(
  scene: Scene,
  position: Vector3,
  opts: { lengthM?: number } = {},
): EquipmentRoot {
  const mats = getMaterials(scene);
  const root = new TransformNode('workbench', scene);
  ground(root, position);

  const lengthM = opts.lengthM ?? 1.0;

  const top = MeshBuilder.CreateBox(
    'workbench-top',
    { width: 0.55, depth: lengthM, height: 0.05 },
    scene,
  );
  top.position = new Vector3(0, 0.9, 0);
  top.material = mats.stainless;
  top.parent = root;

  const cabinet = MeshBuilder.CreateBox(
    'workbench-cabinet',
    { width: 0.5, depth: lengthM - 0.05, height: 0.85 },
    scene,
  );
  cabinet.position = new Vector3(0, 0.45, 0);
  cabinet.material = mats.glossWhite;
  cabinet.parent = root;

  return { root, meshes: [top, cabinet] };
}

/** Decorative pipe run between two world points — for the annex→main hose. */
export function buildDecorativeHose(scene: Scene, name: string, path: Vector3[]): EquipmentRoot {
  const root = new TransformNode(`deco-hose-${name}`, scene);

  const hose = MeshBuilder.CreateTube(
    `deco-hose-${name}-tube`,
    { path, radius: 0.022, tessellation: 10 },
    scene,
  );
  const hoseMat = new StandardMaterial(`deco-hose-mat-${name}`, scene);
  hoseMat.diffuseColor = new Color3(0.22, 0.24, 0.27);
  hose.material = hoseMat;
  hose.parent = root;

  return { root, meshes: [hose] };
}

/** Vertical mullion — aluminium bar that divides a long glass wall into
 *  separate panes (the meeting-room glazing system the rooms inherited).
 *  profileX/profileZ let the dividing-wall mullion be wider in X so it
 *  protrudes both faces of the partition. */
export function buildMullion(
  scene: Scene,
  position: Vector3,
  opts: { heightM?: number; profileX?: number; profileZ?: number } = {},
): EquipmentRoot {
  const mats = getMaterials(scene);
  const heightM = opts.heightM ?? 3.0;
  const profileX = opts.profileX ?? 0.06;
  const profileZ = opts.profileZ ?? 0.06;
  const root = new TransformNode(
    `mullion-${position.x.toFixed(2)}-${position.z.toFixed(2)}`,
    scene,
  );
  ground(root, position);

  const bar = MeshBuilder.CreateBox(
    'mullion-bar',
    { width: profileX, depth: profileZ, height: heightM },
    scene,
  );
  bar.position = new Vector3(0, heightM / 2, 0);
  bar.material = mats.alumProfile;
  bar.parent = root;

  return { root, meshes: [bar] };
}

/** External door frame — aluminium profile outline + handle. Placed on a
 *  glass wall so the door reads as a sliding-glass entrance without cutting
 *  the wall geometry (the wall's already CSG-cut for the opening; this is
 *  the visible frame around it). */
export function buildDoorFrame(
  scene: Scene,
  position: Vector3,
  opts: { widthM?: number; heightM?: number } = {},
): EquipmentRoot {
  const mats = getMaterials(scene);
  const widthM = opts.widthM ?? 0.9;
  const heightM = opts.heightM ?? 2.1;
  const profile = 0.04;
  const root = new TransformNode('door-frame', scene);
  ground(root, position);

  // Top header bar.
  const top = MeshBuilder.CreateBox(
    'door-frame-top',
    { width: widthM + profile * 2, depth: profile, height: profile },
    scene,
  );
  top.position = new Vector3(0, heightM + profile / 2, 0);
  top.material = mats.alumProfile;
  top.parent = root;

  // Left and right side jambs.
  for (const sign of [-1, 1] as const) {
    const jamb = MeshBuilder.CreateBox(
      `door-frame-jamb-${sign > 0 ? 'r' : 'l'}`,
      { width: profile, depth: profile, height: heightM },
      scene,
    );
    jamb.position = new Vector3(sign * (widthM / 2 + profile / 2), heightM / 2, 0);
    jamb.material = mats.alumProfile;
    jamb.parent = root;
  }

  // Handle on the inner side of the right jamb.
  const handle = MeshBuilder.CreateCylinder(
    'door-handle',
    { diameter: 0.025, height: 0.18, tessellation: 12 },
    scene,
  );
  handle.position = new Vector3(widthM / 2 - 0.08, heightM / 2 - 0.05, 0);
  handle.rotation.z = Math.PI / 2;
  handle.material = mats.alumProfile;
  handle.parent = root;

  return { root, meshes: [top] };
}

/** Nutrient solution tank that sits inside a rack — dark-blue translucent PE box. */
export function buildNutrientTank(scene: Scene, position: Vector3): EquipmentRoot {
  const root = new TransformNode('nutrient-tank', scene);
  ground(root, position);

  const tank = MeshBuilder.CreateBox(
    'nutrient-tank-body',
    { width: 0.6, depth: 0.4, height: 0.45 },
    scene,
  );
  tank.position = new Vector3(0, 0.225, 0);
  const tankMat = new PBRMaterial('mat-nutrient-tank', scene);
  tankMat.albedoColor = new Color3(0.12, 0.2, 0.42);
  tankMat.metallic = 0.0;
  tankMat.roughness = 0.55;
  tankMat.maxSimultaneousLights = 8;
  tank.material = tankMat;
  tank.parent = root;

  // Faint level line — narrower box inside, 70% full.
  const water = MeshBuilder.CreateBox(
    'nutrient-tank-water',
    { width: 0.56, depth: 0.36, height: 0.3 },
    scene,
  );
  water.position = new Vector3(0, 0.165, 0);
  const waterMat = new StandardMaterial('mat-nutrient-water', scene);
  waterMat.diffuseColor = new Color3(0.5, 0.6, 0.8);
  waterMat.alpha = 0.6;
  water.material = waterMat;
  water.parent = root;

  return { root, meshes: [tank] };
}

/**
 * Environmental probe — small black PE cylinder + alu cable bracket.
 * Used inside basins (EC, pH probes) — leaves the basin from the rim
 * with a short straight cable.
 */
export function buildEnvProbe(scene: Scene, position: Vector3, label: 'EC' | 'pH'): EquipmentRoot {
  const mats = getMaterials(scene);
  const root = new TransformNode(`env-probe-${label}`, scene);
  ground(root, position);

  const meshes: Mesh[] = [];

  // Probe body — black PE rod, mostly submerged.
  const body = MeshBuilder.CreateCylinder(
    `probe-body-${label}`,
    { diameter: 0.012, height: 0.08, tessellation: 12 },
    scene,
  );
  body.position = new Vector3(0, 0.04, 0);
  const probeMat = new PBRMaterial(`mat-probe-${label}`, scene);
  probeMat.albedoColor = new Color3(0.07, 0.07, 0.08);
  probeMat.metallic = 0;
  probeMat.roughness = 0.6;
  probeMat.maxSimultaneousLights = 8;
  body.material = probeMat;
  body.parent = root;
  meshes.push(body);

  // Top cap (sensor electronics).
  const cap = MeshBuilder.CreateCylinder(
    `probe-cap-${label}`,
    { diameter: 0.018, height: 0.025, tessellation: 12 },
    scene,
  );
  cap.position = new Vector3(0, 0.095, 0);
  cap.material = mats.stainless;
  cap.parent = root;
  meshes.push(cap);

  // Indicator LED on the cap — green by default.
  // Phase E-I: probe LED diameter ↑ + emissive ↑ for visibility from iso cam.
  const led = MeshBuilder.CreateCylinder(
    `probe-led-${label}`,
    { diameter: 0.012, height: 0.006, tessellation: 10 },
    scene,
  );
  led.position = new Vector3(0.005, 0.108, 0);
  const ledMat = new PBRMaterial(`mat-probe-led-${label}`, scene);
  ledMat.albedoColor = new Color3(0.2, 0.8, 0.3);
  ledMat.emissiveColor = new Color3(0.2, 0.8, 0.3);
  ledMat.emissiveIntensity = 1.5;
  ledMat.disableLighting = true;
  led.material = ledMat;
  led.parent = root;

  return { root, meshes };
}

/**
 * Ceiling HVAC unit — small box hanging from the ceiling with a coloured
 * indicator strip (blue = cooling, red = heating, off = idle).
 * Demo controller swaps the indicator emissive based on scenario T setpoint.
 */
export function buildHVACCeiling(
  scene: Scene,
  position: Vector3,
): EquipmentRoot & { indicator: Mesh } {
  const mats = getMaterials(scene);
  const root = new TransformNode('hvac-ceiling', scene);
  root.position = position.clone();

  const meshes: Mesh[] = [];

  // Hanging strap from ceiling — short alu rod.
  const strap = MeshBuilder.CreateBox(
    'hvac-strap',
    { width: 0.04, depth: 0.04, height: 0.18 },
    scene,
  );
  strap.position = new Vector3(0, 0.09, 0);
  strap.material = mats.alumProfile;
  strap.parent = root;

  // Main body (the AHU).
  const body = MeshBuilder.CreateBox('hvac-body', { width: 0.5, depth: 0.5, height: 0.2 }, scene);
  body.position = new Vector3(0, -0.1, 0);
  body.material = mats.paintWhite;
  body.parent = root;
  meshes.push(body);

  // Front grille (visible blades).
  const grille = MeshBuilder.CreateBox(
    'hvac-grille',
    { width: 0.46, depth: 0.005, height: 0.16 },
    scene,
  );
  grille.position = new Vector3(0, -0.1, 0.252);
  grille.material = mats.fanGrille;
  grille.parent = root;

  // Indicator strip — wide thin emissive band, default neutral.
  // Phase E-I: enlarged 2× so it reads from the iso camera.
  const indicator = MeshBuilder.CreateBox(
    'hvac-indicator',
    { width: 0.42, depth: 0.008, height: 0.05 },
    scene,
  );
  indicator.position = new Vector3(0, -0.005, 0.254);
  const indMat = new PBRMaterial('mat-hvac-indicator', scene);
  indMat.albedoColor = new Color3(0.5, 0.5, 0.5);
  indMat.emissiveColor = new Color3(0.5, 0.5, 0.5);
  indMat.emissiveIntensity = 0.5;
  indMat.disableLighting = true;
  indMat.maxSimultaneousLights = 8;
  indicator.material = indMat;
  indicator.parent = root;
  meshes.push(indicator);

  return { root, meshes, indicator };
}

/**
 * Pass-through panel — an aluminium plate bolted onto the A/B dividing
 * wall, replacing a section of glass so the supply + return mains have a
 * clean visible crossing point instead of phantom-clipping through the
 * partition. Holes are rendered as stainless grommets with dark voids.
 */
export interface PassThroughPanelOptions {
  /** Panel centre Z position (on the dividing wall axis). */
  readonly zCentre: number;
  /** Panel centre Y position. */
  readonly yCentre: number;
  /** Panel extent along the wall (Z direction). */
  readonly widthZ: number;
  /** Panel height (Y direction). */
  readonly heightY: number;
  /** Pipe hole positions in panel-local coordinates (Z, Y). */
  readonly holes: readonly { readonly z: number; readonly y: number; readonly radius: number }[];
}

export function buildPassThroughPanel(
  scene: Scene,
  positionX: number,
  opts: PassThroughPanelOptions,
): EquipmentRoot {
  const mats = getMaterials(scene);
  const root = new TransformNode('pass-through-panel', scene);
  root.position = new Vector3(positionX, opts.yCentre, opts.zCentre);

  const meshes: Mesh[] = [];

  const plateThickness = 0.04;
  const panel = MeshBuilder.CreateBox(
    'pt-panel',
    { width: plateThickness, depth: opts.widthZ, height: opts.heightY },
    scene,
  );
  panel.material = mats.alumProfile;
  panel.parent = root;
  meshes.push(panel);

  for (let i = 0; i < opts.holes.length; i++) {
    const hole = opts.holes[i];
    if (!hole) continue;

    const grommet = MeshBuilder.CreateCylinder(
      `pt-hole-grommet-${i}`,
      { diameter: hole.radius * 2.4, height: plateThickness + 0.02, tessellation: 18 },
      scene,
    );
    grommet.rotation.z = Math.PI / 2;
    grommet.position = new Vector3(0, hole.y, hole.z);
    grommet.material = mats.stainless;
    grommet.parent = root;
    meshes.push(grommet);

    const inner = MeshBuilder.CreateCylinder(
      `pt-hole-inner-${i}`,
      { diameter: hole.radius * 2, height: plateThickness + 0.03, tessellation: 16 },
      scene,
    );
    inner.rotation.z = Math.PI / 2;
    inner.position = new Vector3(0, hole.y, hole.z);
    const voidMat = new PBRMaterial(`mat-pt-void-${i}`, scene);
    voidMat.albedoColor = new Color3(0.05, 0.05, 0.06);
    voidMat.metallic = 0;
    voidMat.roughness = 0.9;
    voidMat.maxSimultaneousLights = 8;
    inner.material = voidMat;
    inner.parent = root;
    meshes.push(inner);
  }

  return { root, meshes };
}

/**
 * Booster / recirculation pump — small horizontal-motor pump on a stainless
 * base. Used for the fertigation booster (annex, beside fert cabinet) and
 * bed-return recirculation (main room, beside each nutrient tank).
 */
export function buildBoosterPump(scene: Scene, position: Vector3): EquipmentRoot {
  const mats = getMaterials(scene);
  const root = new TransformNode('booster-pump', scene);
  ground(root, position);

  const meshes: Mesh[] = [];

  const base = MeshBuilder.CreateBox(
    'booster-base',
    { width: 0.18, depth: 0.22, height: 0.04 },
    scene,
  );
  base.position = new Vector3(0, 0.02, 0);
  base.material = mats.stainless;
  base.parent = root;
  meshes.push(base);

  const motor = MeshBuilder.CreateCylinder(
    'booster-motor',
    { diameter: 0.12, height: 0.18, tessellation: 18 },
    scene,
  );
  motor.rotation.z = Math.PI / 2;
  motor.position = new Vector3(0, 0.13, 0);
  motor.material = mats.stainless;
  motor.parent = root;
  meshes.push(motor);

  const head = MeshBuilder.CreateCylinder(
    'booster-head',
    { diameter: 0.085, height: 0.07, tessellation: 14 },
    scene,
  );
  head.rotation.z = Math.PI / 2;
  head.position = new Vector3(0.11, 0.13, 0);
  head.material = mats.alumProfile;
  head.parent = root;
  meshes.push(head);

  return { root, meshes };
}
