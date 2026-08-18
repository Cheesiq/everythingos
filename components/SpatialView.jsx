"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

/* Same icon language as the dock's <AppIcon> SVGs, redrawn with canvas path
   calls — a mycelium network, an orbit, sliders, a prompt, a folder, a dial —
   so each app reads by what it does, not an arbitrary initial letter. */
function drawAppIcon(ctx, id, cx, cy, r, color, lineWidth) {
  const u = r / 8;
  const X = px => cx + (px - 8) * u, Y = py => cy + (py - 8) * u;
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color;
  ctx.lineWidth = lineWidth; ctx.lineCap = "round"; ctx.lineJoin = "round";

  if (id === "biome") {
    const pts = [[3, 4], [13, 4], [8, 14], [3, 12], [13, 12]];
    ctx.beginPath();
    pts.forEach(([x, y]) => { ctx.moveTo(X(8), Y(8)); ctx.lineTo(X(x), Y(y)); });
    ctx.stroke();
    ctx.beginPath(); ctx.arc(X(8), Y(8), u * 1.3, 0, Math.PI * 2); ctx.fill();
    pts.forEach(([x, y]) => { ctx.beginPath(); ctx.arc(X(x), Y(y), u, 0, Math.PI * 2); ctx.fill(); });
  } else if (id === "galaxies") {
    ctx.save(); ctx.translate(X(8), Y(8)); ctx.rotate((-24 * Math.PI) / 180);
    ctx.beginPath(); ctx.ellipse(0, 0, 7 * u, 2.6 * u, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    ctx.beginPath(); ctx.arc(X(8), Y(8), u * 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(X(13.6), Y(5.2), u * 1.1, 0, Math.PI * 2); ctx.fill();
  } else if (id === "dynamix") {
    [[4, 10], [8, 5], [12, 8.5]].forEach(([x, ky]) => {
      ctx.beginPath(); ctx.moveTo(X(x), Y(2)); ctx.lineTo(X(x), Y(14)); ctx.stroke();
      ctx.beginPath(); ctx.arc(X(x), Y(ky), u * 1.6, 0, Math.PI * 2); ctx.fill();
    });
  } else if (id === "terminal") {
    roundRectPath(ctx, X(1.5), Y(2.5), 13 * u, 11 * u, 2 * u); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(X(4.5), Y(6.3)); ctx.lineTo(X(7), Y(8)); ctx.lineTo(X(4.5), Y(9.7)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(X(8), Y(10.5)); ctx.lineTo(X(11.2), Y(10.5)); ctx.stroke();
  } else if (id === "files") {
    ctx.beginPath();
    ctx.moveTo(X(2), Y(4.8)); ctx.lineTo(X(6), Y(4.8)); ctx.lineTo(X(7.2), Y(6.3)); ctx.lineTo(X(14), Y(6.3));
    ctx.lineTo(X(14), Y(13)); ctx.lineTo(X(2), Y(13)); ctx.closePath(); ctx.stroke();
  } else if (id === "settings") {
    ctx.beginPath(); ctx.arc(X(8), Y(8), 3.2 * u, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(X(8), Y(8), u, 0, Math.PI * 2); ctx.fill();
    [0, 60, 120, 180, 240, 300].forEach(a => {
      const rad = (a * Math.PI) / 180, c = Math.cos(rad), s = Math.sin(rad);
      ctx.beginPath(); ctx.moveTo(X(8 + c * 4.6), Y(8 + s * 4.6)); ctx.lineTo(X(8 + c * 6.6), Y(8 + s * 6.6)); ctx.stroke();
    });
  }
  ctx.restore();
}

/* Canvas-drawn card face — a colorful icon tile (glow + icon), title, state
   pill. No DOM screenshots; keeps this dependency-free and legible at any
   distance, and reads as a graphic tile rather than a text label. */
function makeCardTexture(id, title, color, state) {
  const W = 640, H = 460;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  const dim = state === "closed";

  roundRectPath(ctx, 0, 0, W, H, 34);
  ctx.fillStyle = "#0a0f13"; ctx.fill();
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, dim ? "rgba(79,240,211,0.05)" : color + "1c");
  bgGrad.addColorStop(1, "rgba(0,0,0,0)");
  roundRectPath(ctx, 0, 0, W, H, 34);
  ctx.fillStyle = bgGrad; ctx.fill();

  /* icon tile: glowing rounded square with the app's own icon */
  const tileX = W / 2, tileY = 172, tileR = 118;
  ctx.save();
  ctx.shadowColor = dim ? "rgba(233,242,240,0.12)" : color;
  ctx.shadowBlur = dim ? 20 : 55;
  const tileGrad = ctx.createLinearGradient(tileX - tileR, tileY - tileR, tileX + tileR, tileY + tileR);
  if (dim) { tileGrad.addColorStop(0, "#232f36"); tileGrad.addColorStop(1, "#161e23"); }
  else { tileGrad.addColorStop(0, color); tileGrad.addColorStop(1, shade(color, -0.35)); }
  roundRectPath(ctx, tileX - tileR, tileY - tileR, tileR * 2, tileR * 2, 40);
  ctx.fillStyle = tileGrad; ctx.fill();
  ctx.restore();

  const iconColor = dim ? "rgba(233,242,240,0.5)" : "#0a0f13";
  drawAppIcon(ctx, id, tileX, tileY, tileR * 0.62, iconColor, tileR * 0.62 * 0.16);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";

  ctx.fillStyle = dim ? "rgba(233,242,240,0.55)" : "#f4f8f7";
  ctx.font = "600 46px 'Space Grotesk', sans-serif";
  ctx.fillText(title, W / 2, 356);

  /* state pill */
  const label = state === "open" ? "open" : state === "min" ? "minimized" : "closed";
  const dotColor = state === "open" ? "#4ff0d3" : state === "min" ? "#f2934a" : "rgba(233,242,240,0.4)";
  ctx.font = "500 26px 'JetBrains Mono', monospace";
  const tw = ctx.measureText(label).width;
  const pillW = tw + 64, pillX = W / 2 - pillW / 2, pillY = 392;
  roundRectPath(ctx, pillX, pillY, pillW, 46, 23);
  ctx.fillStyle = "rgba(255,255,255,0.05)"; ctx.fill();
  ctx.beginPath(); ctx.arc(pillX + 26, pillY + 23, 7, 0, Math.PI * 2);
  ctx.fillStyle = dotColor; ctx.fill();
  ctx.textAlign = "left"; ctx.fillStyle = dotColor === "rgba(233,242,240,0.4)" ? dotColor : "#e9f2f0";
  ctx.fillText(label, pillX + 42, pillY + 24);

  ctx.strokeStyle = dim ? "rgba(233,242,240,0.12)" : color;
  ctx.globalAlpha = dim ? 0.6 : 0.9;
  ctx.lineWidth = 4;
  roundRectPath(ctx, 3, 3, W - 6, H - 6, 32);
  ctx.stroke();
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = amt < 0 ? 0 : 255, p = Math.abs(amt);
  r = Math.round((f - r) * p + r); g = Math.round((f - g) * p + g); b = Math.round((f - b) * p + b);
  return `rgb(${r},${g},${b})`;
}

export default function SpatialView({ appIds, apps, wins, onSelect, onClose, reducedMotion }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x03050a, 0.012);
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);

    /* faint ambient starfield so the void has depth, matching the rest of the OS */
    { const n = 500, pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const r = 20 + Math.random() * 60, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
        pos[i * 3] = r * Math.sin(ph) * Math.cos(th); pos[i * 3 + 1] = r * Math.cos(ph); pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0x7f9791, size: 0.09, sizeAttenuation: true, transparent: true, opacity: 0.55 })));
    }

    /* ---------- cards: fanned arc, billboarded, floating ---------- */
    const n = appIds.length;
    const angStep = 0.37; // fixed step keeps card spacing (not total spread) constant as n grows
    const radius = 10.5;
    const group = new THREE.Group();
    const cards = [];

    appIds.forEach((id, i) => {
      const angle = (i - (n - 1) / 2) * angStep;
      const x = Math.sin(angle) * radius;
      const z = -Math.cos(angle) * radius;
      const y = Math.sin(i * 1.7) * 0.35;

      const w = apps[id];
      const state = wins[id].state;
      const tex = makeCardTexture(id, w.title, w.color, state);
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.44), mat);
      mesh.position.set(x, y, z);
      mesh.userData = { id, baseY: y, phase: i * 1.7 };
      group.add(mesh);
      cards.push(mesh);
    });
    scene.add(group);

    /* ---------- camera controls: drag to orbit, wheel to zoom ---------- */
    let yaw = 0, pitch = 0.06, dist = 8.5, dragging = false, px = 0, py = 0, dragged = false;
    const onDown = e => { dragging = true; dragged = false; px = e.clientX; py = e.clientY; };
    const onUp = () => (dragging = false);
    const onMove = e => {
      if (!dragging) return;
      if (Math.abs(e.clientX - px) + Math.abs(e.clientY - py) > 2) dragged = true;
      yaw -= (e.clientX - px) * 0.003; pitch -= (e.clientY - py) * 0.003;
      pitch = Math.max(-0.6, Math.min(0.6, pitch)); px = e.clientX; py = e.clientY;
    };
    const onWheel = e => { dist *= 1 + Math.sign(e.deltaY) * 0.08; dist = Math.max(4, Math.min(22, dist)); e.preventDefault(); };
    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mousemove", onMove);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    let touchD = 0;
    const onTS = e => {
      if (e.touches.length === 1) { dragging = true; dragged = false; px = e.touches[0].clientX; py = e.touches[0].clientY; }
      else if (e.touches.length === 2) touchD = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    };
    const onTM = e => {
      if (e.touches.length === 1 && dragging) {
        if (Math.abs(e.touches[0].clientX - px) + Math.abs(e.touches[0].clientY - py) > 2) dragged = true;
        yaw -= (e.touches[0].clientX - px) * 0.0035; pitch -= (e.touches[0].clientY - py) * 0.0035;
        pitch = Math.max(-0.6, Math.min(0.6, pitch)); px = e.touches[0].clientX; py = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        dist *= touchD / d; dist = Math.max(4, Math.min(22, dist)); touchD = d;
      }
    };
    canvas.addEventListener("touchstart", onTS, { passive: true });
    canvas.addEventListener("touchmove", onTM, { passive: true });
    window.addEventListener("touchend", onUp);

    /* ---------- hover + click selection via raycast ---------- */
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hovered = null;
    const setPointer = (cx, cy) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((cx - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((cy - rect.top) / rect.height) * 2 + 1;
    };
    const onHoverMove = e => {
      setPointer(e.clientX, e.clientY);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(cards)[0];
      hovered = hit ? hit.object : null;
      canvas.style.cursor = hovered ? "pointer" : dragging ? "grabbing" : "grab";
    };
    const onClick = e => {
      if (dragged) return;
      setPointer(e.clientX, e.clientY);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(cards)[0];
      if (hit) onSelect(hit.object.userData.id);
    };
    canvas.addEventListener("mousemove", onHoverMove);
    canvas.addEventListener("click", onClick);

    /* ---------- loop ---------- */
    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;

      camera.position.x = Math.sin(yaw) * Math.cos(pitch) * dist;
      camera.position.y = Math.sin(pitch) * dist + 0.4;
      camera.position.z = Math.cos(yaw) * Math.cos(pitch) * dist;
      camera.lookAt(0, 0.1, -1.5);

      cards.forEach(m => {
        m.quaternion.copy(camera.quaternion);
        if (!reducedMotion) m.position.y = m.userData.baseY + Math.sin(t * 0.7 + m.userData.phase) * 0.06;
        const isHovered = m === hovered;
        const target = isHovered ? 1.08 : 1;
        m.scale.x += (target - m.scale.x) * Math.min(1, dt * 10);
        m.scale.y = m.scale.x;
      });
      if (!reducedMotion) group.rotation.y = Math.sin(t * 0.05) * 0.03;

      renderer.render(scene, camera);
    });

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      renderer.setAnimationLoop(null);
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("touchstart", onTS);
      canvas.removeEventListener("touchmove", onTM);
      window.removeEventListener("touchend", onUp);
      canvas.removeEventListener("mousemove", onHoverMove);
      canvas.removeEventListener("click", onClick);
      cards.forEach(m => { m.geometry.dispose(); m.material.map.dispose(); m.material.dispose(); });
      renderer.dispose();
    };
  }, [appIds, apps, wins, onSelect, reducedMotion]);

  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="spatial-overlay">
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, display: "block" }} />
      <div className="spatial-hint">drag to look · scroll to zoom · click a window to open</div>
      <button className="spatial-close" onClick={onClose}>Exit spatial view (esc)</button>
    </div>
  );
}
