import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export type CorePreset = "kernel" | "ast" | "sandbox";

interface CompilerCoreSceneProps {
  scrollProgress?: number;
  activeStageIndex?: number;
}

function createCodePanelTexture(
  renderer: THREE.WebGLRenderer,
  title: string,
  lines: { text: string; color: string }[],
  accentHex: string
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    // Deep obsidian panel surface
    ctx.fillStyle = "#0b0e17";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle header bar
    ctx.fillStyle = "#131826";
    ctx.fillRect(0, 0, canvas.width, 46);

    // Top accent rule
    ctx.fillStyle = accentHex;
    ctx.fillRect(0, 0, canvas.width, 4);

    // Outer frame border
    ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

    // Header title
    ctx.font = "600 18px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#e2e8f0";
    ctx.fillText(title, 20, 30);

    // Code lines
    ctx.font = "500 17px 'JetBrains Mono', monospace";
    lines.forEach((line, idx) => {
      const y = 84 + idx * 34;
      ctx.fillStyle = "#475569";
      ctx.fillText(String(idx + 1).padStart(2, "0"), 20, y);
      ctx.fillStyle = line.color;
      ctx.fillText(line.text, 58, y);
    });
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  texture.needsUpdate = true;
  return texture;
}

function createRadialShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 120);
    grad.addColorStop(0, "rgba(56, 189, 248, 0.32)");
    grad.addColorStop(0.45, "rgba(15, 23, 42, 0.45)");
    grad.addColorStop(1, "rgba(8, 9, 13, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function CompilerCoreScene({
  scrollProgress = 0,
  activeStageIndex = 0,
}: CompilerCoreSceneProps) {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const [webglSupported, setWebglSupported] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [preset, setPreset] = useState<CorePreset>("kernel");
  const [exploded, setExploded] = useState<number>(22);
  const [dockCollapsed, setDockCollapsed] = useState(false);

  // Mutable refs read inside the Three.js loop without tearing down WebGL
  const stateRef = useRef({
    preset: "kernel" as CorePreset,
    exploded: 0.22,
    scrollProgress: 0,
    activeStageIndex: 0,
    pointerX: 0,
    pointerY: 0,
    reducedMotion: false,
  });

  const triggerRenderRef = useRef<() => void>(() => {});

  useEffect(() => {
    stateRef.current.preset = preset;
    stateRef.current.exploded = exploded / 100;
    triggerRenderRef.current();
  }, [preset, exploded]);

  useEffect(() => {
    stateRef.current.scrollProgress = scrollProgress;
    stateRef.current.activeStageIndex = activeStageIndex;
    triggerRenderRef.current();
  }, [scrollProgress, activeStageIndex]);

  // Keyboard shortcut 'H' to collapse/expand bottom HUD dock
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === "h" || e.key === "H") {
        setDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => {
      setReducedMotion(mq.matches);
      stateRef.current.reducedMotion = mq.matches;
    };
    updateMotion();
    mq.addEventListener("change", updateMotion);
    return () => mq.removeEventListener("change", updateMotion);
  }, []);

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    // Probe WebGL2 / WebGL1 & detect software renderer
    const probeCanvas = document.createElement("canvas");
    const probeGl = (probeCanvas.getContext("webgl2") ||
      probeCanvas.getContext("webgl")) as WebGLRenderingContext | null;

    if (!probeGl) {
      setWebglSupported(false);
      return;
    }

    const isSoftwareGl = (() => {
      const ext = probeGl.getExtension("WEBGL_debug_renderer_info");
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probeGl.RENDERER;
      const gpu = String(probeGl.getParameter(param));
      probeGl.getExtension("WEBGL_lose_context")?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        preserveDrawingBuffer: true,
        powerPreference: "high-performance",
      });
    } catch {
      setWebglSupported(false);
      return;
    }

    const width = mount.clientWidth || 640;
    const height = mount.clientHeight || 520;

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    mount.innerHTML = "";
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x08090d, 0.045);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0.8, 8.8);
    camera.lookAt(0, 0, 0);

    // Studio reflection environment via RoomEnvironment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04
    ).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    // 3-Point Warm/Cool Studio Lighting
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x1e1b4b, 1.1);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.2);
    keyLight.position.set(5, 7, 6);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 20;
      const d = 5;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLightCyan = new THREE.PointLight(0x06b6d4, 4.5, 14);
    rimLightCyan.position.set(-4.5, 2.5, -3.5);
    scene.add(rimLightCyan);

    const rimLightViolet = new THREE.PointLight(0x8b5cf6, 3.8, 14);
    rimLightViolet.position.set(4.5, -2.2, -3.0);
    scene.add(rimLightViolet);

    // Root composite assembly group
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // Materials with calibrated roughness/metalness contrast (>= 0.25 delta)
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0x131722,
      metalness: 0.82,
      roughness: 0.58,
    });

    const brushedTrimMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.92,
      roughness: 0.2,
      emissive: 0x0284c7,
      emissiveIntensity: 0.25,
    });

    const violetTrimMat = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      metalness: 0.88,
      roughness: 0.24,
      emissive: 0x6d28d9,
      emissiveIntensity: 0.22,
    });

    const kernelMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.55,
      metalness: 0.15,
      roughness: 0.12,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });

    const shieldWireMat = new THREE.MeshStandardMaterial({
      color: 0x60a5fa,
      metalness: 0.5,
      roughness: 0.3,
      wireframe: true,
      transparent: true,
      opacity: 0.32,
    });

    // 1. PRIMARY SILHOUETTE: Beveled Octagonal Sandbox Chassis (Upper & Lower Caps + 8 Columns)
    const octShape = new THREE.Shape();
    const octRadius = 1.35;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const x = Math.cos(angle) * octRadius;
      const y = Math.sin(angle) * octRadius;
      if (i === 0) octShape.moveTo(x, y);
      else octShape.lineTo(x, y);
    }
    octShape.closePath();

    const holePath = new THREE.Path();
    const innerRadius = 0.92;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const x = Math.cos(angle) * innerRadius;
      const y = Math.sin(angle) * innerRadius;
      if (i === 0) holePath.moveTo(x, y);
      else holePath.lineTo(x, y);
    }
    holePath.closePath();
    octShape.holes.push(holePath);

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: 0.22,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.04,
      bevelThickness: 0.04,
    };
    const capGeo = new THREE.ExtrudeGeometry(octShape, extrudeSettings);
    capGeo.center();

    const upperCap = new THREE.Mesh(capGeo, chassisMat);
    upperCap.rotation.x = Math.PI / 2;
    upperCap.position.y = 1.05;
    rootGroup.add(upperCap);

    const lowerCap = new THREE.Mesh(capGeo, chassisMat);
    lowerCap.rotation.x = Math.PI / 2;
    lowerCap.position.y = -1.05;
    rootGroup.add(lowerCap);

    // 2. INNER EXECUTION KERNEL: Multi-faceted Crystalline GCC Core
    const kernelGroup = new THREE.Group();
    rootGroup.add(kernelGroup);

    const coreGeo = new THREE.OctahedronGeometry(0.72, 1);
    const coreMesh = new THREE.Mesh(coreGeo, kernelMat);
    kernelGroup.add(coreMesh);

    const shieldGeo = new THREE.IcosahedronGeometry(0.96, 1);
    const shieldMesh = new THREE.Mesh(shieldGeo, shieldWireMat);
    kernelGroup.add(shieldMesh);

    // 8 radial cooling / containment fins around the core
    const finGeo = new THREE.BoxGeometry(0.12, 1.35, 0.28);
    const fins: THREE.Mesh[] = [];
    for (let i = 0; i < 8; i++) {
      const fin = new THREE.Mesh(
        finGeo,
        i % 2 === 0 ? chassisMat : brushedTrimMat
      );
      const angle = (i / 8) * Math.PI * 2;
      fin.position.set(Math.cos(angle) * 1.18, 0, Math.sin(angle) * 1.18);
      fin.rotation.y = -angle;
      rootGroup.add(fin);
      fins.push(fin);
    }

    // 3. SECONDARY READ: Three Counter-Rotating Gimbal Rings (AST, Optimizer, Cgroup)
    const gimbalRing1 = new THREE.Group();
    const torus1Geo = new THREE.TorusGeometry(1.78, 0.035, 16, 64);
    const torus1Mesh = new THREE.Mesh(torus1Geo, brushedTrimMat);
    gimbalRing1.add(torus1Mesh);
    rootGroup.add(gimbalRing1);

    const gimbalRing2 = new THREE.Group();
    const torus2Geo = new THREE.TorusGeometry(2.18, 0.03, 16, 64);
    const torus2Mesh = new THREE.Mesh(torus2Geo, violetTrimMat);
    gimbalRing2.rotation.x = Math.PI / 3;
    gimbalRing2.add(torus2Mesh);
    rootGroup.add(gimbalRing2);

    const gimbalRing3 = new THREE.Group();
    const torus3Geo = new THREE.TorusGeometry(2.58, 0.022, 16, 64);
    const torus3Mesh = new THREE.Mesh(torus3Geo, chassisMat);
    gimbalRing3.rotation.y = Math.PI / 4;
    gimbalRing3.add(torus3Mesh);
    rootGroup.add(gimbalRing3);

    // 4. FLOATING CODE & TERMINAL PANELS (3 procedural textured plates)
    const panelGeo = new THREE.PlaneGeometry(1.85, 1.15);

    const texSource = createCodePanelTexture(
      renderer,
      "main.c · C17 Source",
      [
        { text: "#include <stdio.h>", color: "#38bdf8" },
        { text: "int main(void) {", color: "#e2e8f0" },
        { text: '  printf("Ready\\n");', color: "#4ade80" },
        { text: "  scanf(\"%d\", &n);", color: "#facc15" },
        { text: "  return 0;", color: "#c084fc" },
        { text: "}", color: "#e2e8f0" },
      ],
      "#38bdf8"
    );

    const texAsm = createCodePanelTexture(
      renderer,
      "GCC 13.2 · x86_64 -O2",
      [
        { text: "main:", color: "#c084fc" },
        { text: "  sub   rsp, 24", color: "#94a3b8" },
        { text: "  lea   rdi, .LC0[rip]", color: "#38bdf8" },
        { text: "  call  printf@PLT", color: "#4ade80" },
        { text: "  xor   eax, eax", color: "#94a3b8" },
        { text: "  ret", color: "#f43f5e" },
      ],
      "#8b5cf6"
    );

    const texPty = createCodePanelTexture(
      renderer,
      "node-pty · Alpine 3.20",
      [
        { text: "$ gcc -O2 main.c", color: "#94a3b8" },
        { text: "$ ./main.out", color: "#38bdf8" },
        { text: "Enter two numbers: 42 58", color: "#e2e8f0" },
        { text: "Sum = 100", color: "#4ade80" },
        { text: "Exit Code: 0 (38ms)", color: "#38bdf8" },
        { text: "cgroups: 128MB · 64 PIDs", color: "#c084fc" },
      ],
      "#10b981"
    );

    const createPanelMesh = (tex: THREE.CanvasTexture) => {
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        color: 0xffffff,
        roughness: 0.25,
        metalness: 0.1,
        side: THREE.DoubleSide,
      });
      return new THREE.Mesh(panelGeo, mat);
    };

    const panel1 = createPanelMesh(texSource);
    const panel2 = createPanelMesh(texAsm);
    const panel3 = createPanelMesh(texPty);

    const panelsGroup = new THREE.Group();
    panelsGroup.add(panel1, panel2, panel3);
    rootGroup.add(panelsGroup);

    // 5. INSTANCED ORBITING DATA TOKENS (48 instances)
    const tokenCount = 48;
    const tokenGeo = new THREE.OctahedronGeometry(0.065, 0);
    const tokenMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.2,
      metalness: 0.8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.4,
    });
    const tokenInstanced = new THREE.InstancedMesh(
      tokenGeo,
      tokenMat,
      tokenCount
    );
    const palette = [
      new THREE.Color(0x38bdf8),
      new THREE.Color(0x60a5fa),
      new THREE.Color(0xa855f7),
      new THREE.Color(0x34d399),
    ];

    const dummyMatrix = new THREE.Matrix4();
    const dummyPos = new THREE.Vector3();
    const dummyQuat = new THREE.Quaternion();
    const dummyScale = new THREE.Vector3(1, 1, 1);
    const dummyEuler = new THREE.Euler();

    for (let i = 0; i < tokenCount; i++) {
      tokenInstanced.setColorAt(i, palette[i % palette.length]);
    }
    if (tokenInstanced.instanceColor) {
      tokenInstanced.instanceColor.needsUpdate = true;
    }
    tokenInstanced.frustumCulled = false;
    rootGroup.add(tokenInstanced);

    // 6. GROUNDING: Contact Shadow Plane & Precision Ring
    const shadowTex = createRadialShadowTexture();
    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(6.5, 6.5),
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.75,
      })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -2.45;
    scene.add(shadowPlane);

    const floorRingGeo = new THREE.RingGeometry(1.9, 1.94, 64);
    const floorRingMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.22,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const floorRing = new THREE.Mesh(floorRingGeo, floorRingMat);
    floorRing.rotation.x = -Math.PI / 2;
    floorRing.position.y = -2.42;
    scene.add(floorRing);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Animation & Software-WebGL Pacing
    let frameId = 0;
    let isDisposed = false;
    let lastTime = performance.now();
    let currentExploded = stateRef.current.exploded;
    let currentRotX = 0;
    let currentRotY = 0;

    function updateScene(now: number) {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      const elapsed = now * 0.001;

      const {
        preset: activePreset,
        exploded: targetExploded,
        scrollProgress: scrollProg,
        pointerX,
        pointerY,
        reducedMotion: isReduced,
      } = stateRef.current;

      const presetOffset =
        activePreset === "ast" ? 0.35 : activePreset === "sandbox" ? 0.65 : 0;
      const effectiveTargetExploded = Math.min(
        1,
        targetExploded + scrollProg * 0.45 + presetOffset * 0.25
      );

      currentExploded = THREE.MathUtils.damp(
        currentExploded,
        effectiveTargetExploded,
        6,
        dt || 0.016
      );

      const targetRotY =
        pointerX * 0.45 +
        scrollProg * Math.PI * 0.65 +
        (activePreset === "ast" ? 0.6 : activePreset === "sandbox" ? -0.6 : 0);
      const targetRotX = pointerY * 0.28 + scrollProg * 0.25;

      currentRotY = THREE.MathUtils.damp(
        currentRotY,
        targetRotY,
        5,
        dt || 0.016
      );
      currentRotX = THREE.MathUtils.damp(
        currentRotX,
        targetRotX,
        5,
        dt || 0.016
      );

      rootGroup.rotation.y =
        currentRotY + (isReduced ? 0 : elapsed * 0.18);
      rootGroup.rotation.x = currentRotX;

      // Explode upper & lower octagonal chassis caps
      upperCap.position.y = 1.05 + currentExploded * 0.75;
      lowerCap.position.y = -1.05 - currentExploded * 0.75;

      // Expand radial fins
      const finRadius = 1.18 + currentExploded * 0.65;
      for (let i = 0; i < fins.length; i++) {
        const angle = (i / 8) * Math.PI * 2;
        fins[i].position.set(
          Math.cos(angle) * finRadius,
          0,
          Math.sin(angle) * finRadius
        );
      }

      // Kernel pulse & rotation
      const kernelScale =
        activePreset === "kernel"
          ? 1.08
          : activePreset === "sandbox"
            ? 0.92
            : 1.0;
      coreMesh.scale.setScalar(kernelScale);
      if (!isReduced) {
        coreMesh.rotation.y = -elapsed * 0.45;
        coreMesh.rotation.z = elapsed * 0.25;
        shieldMesh.rotation.y = elapsed * 0.2;
      }

      // Gimbal rings rotation
      const ringScale = 1 + currentExploded * 0.18;
      gimbalRing1.scale.setScalar(ringScale);
      gimbalRing2.scale.setScalar(ringScale);
      gimbalRing3.scale.setScalar(ringScale);

      if (!isReduced) {
        gimbalRing1.rotation.z = elapsed * 0.32;
        gimbalRing1.rotation.x = Math.sin(elapsed * 0.4) * 0.35;
        gimbalRing2.rotation.y = -elapsed * 0.28;
        gimbalRing3.rotation.x = elapsed * 0.22;
      }

      // Floating code panels orbit at 3 angles
      const panelRadius = 2.75 + currentExploded * 0.65;
      const baseAngles = [0.35, (Math.PI * 2) / 3 + 0.35, (Math.PI * 4) / 3 + 0.35];
      const yOffsets = [0.45, -0.35, 0.15];
      [panel1, panel2, panel3].forEach((panel, idx) => {
        const ang =
          baseAngles[idx] + (isReduced ? 0 : elapsed * 0.12);
        panel.position.set(
          Math.cos(ang) * panelRadius,
          yOffsets[idx] + (isReduced ? 0 : Math.sin(elapsed * 1.4 + idx) * 0.1),
          Math.sin(ang) * panelRadius
        );
        panel.lookAt(camera.position);
      });

      // Update instanced orbiting tokens
      for (let i = 0; i < tokenCount; i++) {
        const t = i / tokenCount;
        const orbitAngle =
          t * Math.PI * 4 + (isReduced ? 0 : elapsed * (0.35 + (i % 3) * 0.08));
        const r = 1.55 + (i % 4) * 0.38 + currentExploded * 0.45;
        const y = Math.sin(orbitAngle * 1.5 + i) * 1.15;

        dummyPos.set(Math.cos(orbitAngle) * r, y, Math.sin(orbitAngle) * r);
        dummyEuler.set(elapsed + i, elapsed * 0.5, 0);
        dummyQuat.setFromEuler(dummyEuler);
        const s = 0.85 + (i % 3) * 0.2;
        dummyScale.set(s, s, s);
        dummyMatrix.compose(dummyPos, dummyQuat, dummyScale);
        tokenInstanced.setMatrixAt(i, dummyMatrix);
      }
      tokenInstanced.instanceMatrix.needsUpdate = true;
    }

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === "function") {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (isDisposed) return;
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    }

    function tick() {
      if (isDisposed) return;
      updateScene(performance.now());
      renderer.render(scene, camera);

      if (stateRef.current.reducedMotion) {
        return;
      }
      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = window.requestAnimationFrame(tick);
      }
    }

    triggerRenderRef.current = () => {
      if (isDisposed) return;
      if (stateRef.current.reducedMotion) {
        updateScene(performance.now());
        renderer.render(scene, camera);
      }
    };

    // Pointer parallax listener
    const handlePointerMove = (e: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      stateRef.current.pointerX = Math.max(-1, Math.min(1, nx));
      stateRef.current.pointerY = Math.max(-1, Math.min(1, ny));
      if (stateRef.current.reducedMotion) {
        triggerRenderRef.current();
      }
    };

    const handleResize = () => {
      if (!mount || isDisposed) return;
      const w = mount.clientWidth || 640;
      const h = mount.clientHeight || 520;
      if (w <= 0 || h <= 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      updateScene(performance.now());
      renderer.render(scene, camera);
    };

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => handleResize())
        : null;
    if (resizeObserver) {
      resizeObserver.observe(mount);
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("resize", handleResize);

    // Start loop
    tick();

    return () => {
      isDisposed = true;
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("resize", handleResize);

      capGeo.dispose();
      coreGeo.dispose();
      shieldGeo.dispose();
      finGeo.dispose();
      torus1Geo.dispose();
      torus2Geo.dispose();
      torus3Geo.dispose();
      panelGeo.dispose();
      tokenGeo.dispose();
      floorRingGeo.dispose();

      texSource.dispose();
      texAsm.dispose();
      texPty.dispose();
      shadowTex.dispose();
      envTexture.dispose();

      chassisMat.dispose();
      brushedTrimMat.dispose();
      violetTrimMat.dispose();
      kernelMat.dispose();
      shieldWireMat.dispose();
      tokenMat.dispose();

      renderer.dispose();
    };
  }, []);

  return (
    <div className="core-scene-wrapper" data-testid="compiler-3d-scene">
      {webglSupported ? (
        <div
          ref={canvasMountRef}
          className="core-canvas-mount"
          aria-label="Interactive 3D C Compiler Sandbox Core"
        />
      ) : (
        <div
          className="core-fallback-diagram"
          role="img"
          aria-label="PrayogCode Architecture Schematic"
        >
          <svg viewBox="0 0 400 320" className="core-fallback-svg">
            <defs>
              <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#08090d" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="200" cy="160" r="130" fill="url(#coreGlow)" />
            <circle
              cx="200"
              cy="160"
              r="110"
              fill="none"
              stroke="#1e293b"
              strokeWidth="1.5"
              strokeDasharray="6 4"
            />
            <circle
              cx="200"
              cy="160"
              r="82"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeOpacity="0.6"
            />
            <polygon
              points="200,105 248,132 248,188 200,215 152,188 152,132"
              fill="#0f172a"
              stroke="#38bdf8"
              strokeWidth="2"
            />
            <text
              x="200"
              y="156"
              textAnchor="middle"
              fill="#f8fafc"
              fontFamily="JetBrains Mono, monospace"
              fontSize="13"
              fontWeight="700"
            >
              GCC 13.2 CORE
            </text>
            <text
              x="200"
              y="176"
              textAnchor="middle"
              fill="#38bdf8"
              fontFamily="JetBrains Mono, monospace"
              fontSize="11"
            >
              Alpine 3.20 · PTY
            </text>
          </svg>
        </div>
      )}

      {/* Unified Collapsible Bottom Control Dock (Zero backdrop-filter over WebGL) */}
      <div
        className={`core-bottom-dock ${dockCollapsed ? "collapsed" : ""}`}
        role="region"
        aria-label="3D Core Inspection Controls"
      >
        <button
          type="button"
          className="dock-collapse-toggle"
          onClick={() => setDockCollapsed((prev) => !prev)}
          aria-expanded={!dockCollapsed}
          aria-label={
            dockCollapsed ? "Show 3D Scene Controls" : "Hide 3D Scene Controls"
          }
        >
          <span>{dockCollapsed ? "▴ Show Controls" : "▾ Hide Controls"}</span>
        </button>

        {!dockCollapsed && (
          <div className="dock-controls-body">
            <div className="dock-preset-group" role="group" aria-label="Core Layer Focus">
              <button
                type="button"
                className={`dock-preset-btn ${preset === "kernel" ? "active" : ""}`}
                onClick={() => setPreset("kernel")}
              >
                GCC Kernel
              </button>
              <button
                type="button"
                className={`dock-preset-btn ${preset === "ast" ? "active" : ""}`}
                onClick={() => setPreset("ast")}
              >
                AST Gimbal
              </button>
              <button
                type="button"
                className={`dock-preset-btn ${preset === "sandbox" ? "active" : ""}`}
                onClick={() => setPreset("sandbox")}
              >
                Sandbox Shield
              </button>
            </div>

            <div className="dock-slider-group">
              <label htmlFor="exploded-view-slider" className="dock-slider-label">
                <span>Explode</span>
                <span className="tabular-nums">{exploded}%</span>
              </label>
              <input
                id="exploded-view-slider"
                type="range"
                min={0}
                max={100}
                value={exploded}
                onChange={(e) => setExploded(Number(e.target.value))}
                className="dock-range-input"
              />
            </div>

            {reducedMotion && (
              <span className="dock-motion-note">Reduced Motion</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default CompilerCoreScene;
