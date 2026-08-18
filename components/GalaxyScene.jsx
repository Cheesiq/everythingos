"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

function gauss() { let s = 0; for (let i = 0; i < 4; i++) s += Math.random(); return (s / 4 - 0.5) * 2.4; }

// Soft radial sprite texture generated at runtime — used for nebula clouds.
function makeCloudTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,0.85)");
  g.addColorStop(0.35, "rgba(255,255,255,0.28)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

export default function GalaxyScene({ cfg }) {
  const canvasRef = useRef(null);
  const [fps, setFps] = useState("—");
  const [stars, setStars] = useState("—");
  const [vrLabel, setVrLabel] = useState("Enter VR");
  const [vrDisabled, setVrDisabled] = useState(false);
  const xrRef = useRef({ session: null, trigger: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
    // M1 Air guard: fanless chip throttles hard above ~1.5x at retina sizes.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020308, 0.0009);
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 5000);
    const dolly = new THREE.Group();
    dolly.position.set(0, cfg.camHeight, cfg.camDist);
    dolly.add(camera);
    scene.add(dolly);

    /* ---------- stars ---------- */
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    const count = isMobile ? Math.floor(cfg.starCount * 0.45) : cfg.starCount;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const col = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const t = Math.random();
      let x, y, z, mix;
      if (t < cfg.bulgeFrac) {
        const r = Math.abs(gauss()) * cfg.bulgeSize;
        const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
        x = r * Math.sin(ph) * Math.cos(th); y = r * Math.cos(ph) * cfg.bulgeFlatten; z = r * Math.sin(ph) * Math.sin(th);
        mix = 0;
      } else if (t < cfg.bulgeFrac + cfg.haloFrac) {
        const r = cfg.radius * (0.5 + Math.random() * 0.9);
        const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
        x = r * Math.sin(ph) * Math.cos(th); y = r * Math.cos(ph) * 0.6; z = r * Math.sin(ph) * Math.sin(th);
        mix = 0.9;
      } else {
        const arm = Math.floor(Math.random() * cfg.arms);
        const d = Math.pow(Math.random(), cfg.armTightness);
        const radius = d * cfg.radius;
        const baseAngle = (arm / cfg.arms) * Math.PI * 2 + (cfg.barred && radius < cfg.radius * 0.25 ? 0 : d * cfg.armWind * Math.PI * 2);
        const spread = (0.5 - Math.abs(gauss()) * 0.18) * cfg.armSpread * (0.3 + d);
        const angle = baseAngle + spread;
        x = radius * Math.cos(angle); z = radius * Math.sin(angle);
        if (cfg.barred && radius < cfg.radius * 0.25) {
          z *= 0.35;
          const nx = x * Math.cos(cfg.barAngle) - z * Math.sin(cfg.barAngle);
          const nz = x * Math.sin(cfg.barAngle) + z * Math.cos(cfg.barAngle);
          x = nx; z = nz;
        }
        y = gauss() * cfg.diskThickness * (1.2 - d * 0.8);
        mix = d;
      }
      positions[i3] = x; positions[i3 + 1] = y; positions[i3 + 2] = z;
      if (Math.random() < cfg.hotFrac * mix) col.setHex(cfg.hotColor);
      else {
        col.setHex(cfg.coreColor).lerp(new THREE.Color(cfg.armColor), Math.min(1, mix * 1.2));
        col.offsetHSL((Math.random() - 0.5) * 0.03, 0, (Math.random() - 0.5) * 0.12);
      }
      colors[i3] = col.r; colors[i3 + 1] = col.g; colors[i3 + 2] = col.b;
      sizes[i] = (mix < 0.05 ? 2.4 : 1.0) * (0.6 + Math.random() * 1.4) * cfg.starSize;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    const starMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
      uniforms: { uScale: { value: window.innerHeight * 0.5 } },
      vertexShader: `attribute float aSize; varying vec3 vColor; uniform float uScale;
        void main(){ vColor = color; vec4 mv = modelViewMatrix * vec4(position,1.0);
        gl_PointSize = aSize * uScale / max(1.0,-mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec3 vColor;
        void main(){ vec2 uv = gl_PointCoord - 0.5; float d = length(uv);
        float a = smoothstep(0.5, 0.0, d); a *= a; gl_FragColor = vec4(vColor, a); }`
    });
    const galaxyGroup = new THREE.Group();
    galaxyGroup.add(new THREE.Points(geo, starMat));

    /* ---------- nebula clouds (billboard sprites along the arms) ---------- */
    const cloudTex = makeCloudTexture();
    const nebulaCount = isMobile ? 40 : 90;
    const nebCol = new THREE.Color(cfg.nebulaColor);
    for (let i = 0; i < nebulaCount; i++) {
      const arm = Math.floor(Math.random() * cfg.arms);
      const d = 0.15 + Math.pow(Math.random(), 0.9) * 0.8;
      const radius = d * cfg.radius;
      const angle = (arm / cfg.arms) * Math.PI * 2 + d * cfg.armWind * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
      const mat = new THREE.SpriteMaterial({
        map: cloudTex, color: nebCol.clone().offsetHSL((Math.random() - 0.5) * 0.06, 0, (Math.random() - 0.5) * 0.1),
        transparent: true, opacity: 0.05 + Math.random() * 0.09,
        blending: THREE.AdditiveBlending, depthWrite: false
      });
      const s = new THREE.Sprite(mat);
      s.position.set(radius * Math.cos(angle), gauss() * cfg.diskThickness * 0.9, radius * Math.sin(angle));
      const sc = cfg.radius * (0.12 + Math.random() * 0.22);
      s.scale.set(sc, sc, 1);
      galaxyGroup.add(s);
    }
    /* ---------- dark dust lanes (subtractive sprites hugging arm inner edges) ---------- */
    const dustCount = isMobile ? 25 : 60;
    const dustCol = new THREE.Color(cfg.dustColor);
    for (let i = 0; i < dustCount; i++) {
      const arm = Math.floor(Math.random() * cfg.arms);
      const d = 0.2 + Math.pow(Math.random(), 0.9) * 0.7;
      const radius = d * cfg.radius * 0.96;
      const angle = (arm / cfg.arms) * Math.PI * 2 + d * cfg.armWind * Math.PI * 2 + 0.12 + (Math.random() - 0.5) * 0.18;
      const mat = new THREE.SpriteMaterial({
        map: cloudTex, color: dustCol, transparent: true,
        opacity: 0.16 + Math.random() * 0.14, depthWrite: false
        // normal blending — dark sprites genuinely occlude light behind them
      });
      const s = new THREE.Sprite(mat);
      s.position.set(radius * Math.cos(angle), gauss() * cfg.diskThickness * 0.5, radius * Math.sin(angle));
      const sc = cfg.radius * (0.06 + Math.random() * 0.12);
      s.scale.set(sc * 1.8, sc, 1);
      galaxyGroup.add(s);
    }
    scene.add(galaxyGroup);

    /* ---------- distant universe backdrop ---------- */
    { const n = 1200, pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const r = 2600 + Math.random() * 1400, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
        pos[i * 3] = r * Math.sin(ph) * Math.cos(th); pos[i * 3 + 1] = r * Math.cos(ph); pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0x8899bb, size: 1.3, sizeAttenuation: false, transparent: true, opacity: 0.5 })));
    }

    /* ---------- bloom (skipped on mobile for battery/thermals) ---------- */
    let composer = null;
    if (!isMobile) {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.55, 0.85, 0.0);
      composer.addPass(bloom);
    }

    /* ---------- controls ---------- */
    let yaw = 0, pitch = -0.35, dist = cfg.camDist, dragging = false, px = 0, py = 0;
    const keys = {};
    const onDown = e => { dragging = true; px = e.clientX; py = e.clientY; };
    const onUp = () => (dragging = false);
    const onMove = e => {
      if (!dragging) return;
      yaw -= (e.clientX - px) * 0.004; pitch -= (e.clientY - py) * 0.004;
      pitch = Math.max(-1.35, Math.min(1.35, pitch)); px = e.clientX; py = e.clientY;
    };
    const onWheel = e => { dist *= 1 + Math.sign(e.deltaY) * 0.08; dist = Math.max(cfg.radius * 0.05, Math.min(cfg.radius * 6, dist)); e.preventDefault(); };
    const onKeyDown = e => (keys[e.key.toLowerCase()] = true);
    const onKeyUp = e => (keys[e.key.toLowerCase()] = false);
    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mousemove", onMove);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    let touchD = 0;
    const onTS = e => {
      if (e.touches.length === 1) { dragging = true; px = e.touches[0].clientX; py = e.touches[0].clientY; }
      else if (e.touches.length === 2) touchD = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    };
    const onTM = e => {
      if (e.touches.length === 1 && dragging) {
        yaw -= (e.touches[0].clientX - px) * 0.005; pitch -= (e.touches[0].clientY - py) * 0.005;
        pitch = Math.max(-1.35, Math.min(1.35, pitch)); px = e.touches[0].clientX; py = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        dist *= touchD / d; dist = Math.max(cfg.radius * 0.05, Math.min(cfg.radius * 6, dist)); touchD = d;
      }
    };
    canvas.addEventListener("touchstart", onTS, { passive: true });
    canvas.addEventListener("touchmove", onTM, { passive: true });
    window.addEventListener("touchend", onUp);

    /* ---------- VR availability ---------- */
    if (navigator.xr?.isSessionSupported) {
      navigator.xr.isSessionSupported("immersive-vr")
        .then(ok => { if (!ok) { setVrLabel("VR not available"); setVrDisabled(true); } })
        .catch(() => { setVrLabel("VR not available"); setVrDisabled(true); });
    } else { setVrLabel("VR not available"); setVrDisabled(true); }
    xrRef.current.renderer = renderer;

    /* ---------- loop ---------- */
    setStars((count / 1000).toFixed(0) + "k");
    const clock = new THREE.Clock();
    const flyOffset = new THREE.Vector3();
    const gazeDir = new THREE.Vector3();
    let fpsAcc = 0, fpsN = 0, fpsT = 0;

    renderer.setAnimationLoop(() => {
      const dt = Math.min(clock.getDelta(), 0.05);
      galaxyGroup.rotation.y += dt * cfg.spinSpeed;

      if (renderer.xr.isPresenting) {
        if (xrRef.current.trigger) {
          camera.getWorldDirection(gazeDir);
          dolly.position.addScaledVector(gazeDir, dt * cfg.radius * 0.12);
        }
        renderer.render(scene, camera); // bloom composer isn't XR-aware; render direct in VR
      } else {
        const speed = (keys["shift"] ? 3 : 1) * cfg.radius * 0.25 * dt;
        flyOffset.set(0, 0, 0);
        if (keys["w"]) flyOffset.z -= speed;
        if (keys["s"]) flyOffset.z += speed;
        if (keys["a"]) flyOffset.x -= speed;
        if (keys["d"]) flyOffset.x += speed;
        if (flyOffset.lengthSq() > 0) {
          flyOffset.applyQuaternion(camera.quaternion);
          dolly.position.add(flyOffset);
        } else {
          dolly.position.x = Math.sin(yaw) * Math.cos(pitch) * dist;
          dolly.position.y = Math.sin(-pitch) * dist + cfg.camHeight * 0.3;
          dolly.position.z = Math.cos(yaw) * Math.cos(pitch) * dist;
        }
        camera.lookAt(0, 0, 0);
        if (composer) composer.render(); else renderer.render(scene, camera);
      }

      fpsAcc += dt; fpsN++; fpsT += dt;
      if (fpsT > 1) { setFps(String(Math.round(fpsN / fpsAcc))); fpsAcc = 0; fpsN = 0; fpsT = 0; }
    });

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      if (composer) composer.setSize(window.innerWidth, window.innerHeight);
      starMat.uniforms.uScale.value = window.innerHeight * 0.5;
    };
    window.addEventListener("resize", onResize);

    return () => {
      renderer.setAnimationLoop(null);
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("touchstart", onTS);
      canvas.removeEventListener("touchmove", onTM);
      window.removeEventListener("touchend", onUp);
      geo.dispose(); starMat.dispose(); cloudTex.dispose();
      renderer.dispose();
    };
  }, [cfg]);

  async function toggleVR() {
    const { session, renderer } = xrRef.current;
    if (session) { session.end(); return; }
    try {
      const s = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] });
      xrRef.current.session = s;
      setVrLabel("Exit VR");
      s.addEventListener("end", () => { xrRef.current.session = null; setVrLabel("Enter VR"); });
      s.addEventListener("selectstart", () => (xrRef.current.trigger = true));
      s.addEventListener("selectend", () => (xrRef.current.trigger = false));
      await renderer.xr.setSession(s);
    } catch (e) {
      setVrLabel("VR blocked (" + (e.name || "error") + ")");
    }
  }

  return (
    <>
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, display: "block" }} />
      <div className="gxy-stats">stars <b>{stars}</b> · fps <b>{fps}</b></div>
      <button className="gxy-vrbtn" onClick={toggleVR} disabled={vrDisabled}>{vrLabel}</button>
    </>
  );
}
