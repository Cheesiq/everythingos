// Galaxy catalogue — each entry becomes a page at /galaxy/[slug].
export const GALAXIES = {
  aurelia: {
    name: "Aurelia", subtitle: "SBc GRAND-DESIGN SPIRAL", accent: "#7fb4ff",
    desc: "A grand-design spiral seen from above the disk plane. Four sweeping arms of hot blue giants wind around an ancient amber core.",
    cfg: {
      starCount: 130000, radius: 320, arms: 4, armWind: 1.9, armTightness: 0.8,
      armSpread: 0.55, diskThickness: 9, bulgeFrac: 0.22, bulgeSize: 42, bulgeFlatten: 0.65,
      haloFrac: 0.05, barred: false, barAngle: 0,
      coreColor: 0xffe0b0, armColor: 0x86b4ff, hotColor: 0xcfe4ff, hotFrac: 0.12,
      nebulaColor: 0x3a5fae, dustColor: 0x120a06,
      starSize: 1.0, spinSpeed: 0.008, camDist: 420, camHeight: 160
    }
  },
  vorthex: {
    name: "Vorthex", subtitle: "SBb BARRED SPIRAL", accent: "#c49bff",
    desc: "A barred spiral — stars stream along a central bar before unwinding into two violet arms. Denser, older, stranger.",
    cfg: {
      starCount: 120000, radius: 300, arms: 2, armWind: 2.4, armTightness: 0.75,
      armSpread: 0.5, diskThickness: 11, bulgeFrac: 0.26, bulgeSize: 38, bulgeFlatten: 0.55,
      haloFrac: 0.06, barred: true, barAngle: 0.6,
      coreColor: 0xffd9a8, armColor: 0xb08aff, hotColor: 0xe8d5ff, hotFrac: 0.09,
      nebulaColor: 0x54308f, dustColor: 0x0e0712,
      starSize: 1.05, spinSpeed: 0.011, camDist: 400, camHeight: 150
    }
  },
  mycelium: {
    name: "Mycelium Reach", subtitle: "IRREGULAR · BIOLUMINESCENT CLASS", accent: "#4ff0d3",
    desc: "The Biome's home waters. A loose irregular galaxy glowing cyan-green, its arms tangled like hyphae reaching through dark matter.",
    cfg: {
      starCount: 110000, radius: 280, arms: 5, armWind: 1.2, armTightness: 0.65,
      armSpread: 1.1, diskThickness: 22, bulgeFrac: 0.14, bulgeSize: 30, bulgeFlatten: 0.9,
      haloFrac: 0.1, barred: false, barAngle: 0,
      coreColor: 0xd8ffe9, armColor: 0x35e0c0, hotColor: 0xa8fff0, hotFrac: 0.16,
      nebulaColor: 0x0d6e5c, dustColor: 0x04120e,
      starSize: 1.1, spinSpeed: 0.006, camDist: 380, camHeight: 130
    }
  }
};
export const GALAXY_SLUGS = Object.keys(GALAXIES);
