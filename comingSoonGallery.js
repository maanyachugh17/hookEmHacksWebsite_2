/*
 * Cinematic scroll-driven 3D gallery for the Coming Soon page.
 *
 * Add images to assets/comingSoonGallery/ named 1.webp, 2.webp, ...
 * (jpg, jpeg, png, or webp) — picked up automatically in order.
 * Or list exact paths in GALLERY_IMAGES below to control it manually.
 */

const GALLERY_IMAGES = [];

const AUTO_FOLDER = "assets/comingSoonGallery";
const AUTO_MAX = 24;
const AUTO_EXTS = ["webp", "jpg", "jpeg", "png"];

const DEPTH_STEP = 900;

const OFFSETS = [
  { x: "-14vw", y: "-6vh" },
  { x: "13vw", y: "7vh" },
  { x: "-9vw", y: "9vh" },
  { x: "15vw", y: "-9vh" },
  { x: "8vw", y: "-4vh" },
  { x: "-17vw", y: "3vh" },
  { x: "10vw", y: "-8vh" },
  { x: "-7vw", y: "6vh" },
];

function tryLoad(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(url);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

async function resolveImages() {
  if (GALLERY_IMAGES.length) {
    const results = await Promise.all(GALLERY_IMAGES.map(tryLoad));
    return results.filter(Boolean);
  }

  // Probe each index in parallel (webp first), stop after first gap.
  const found = [];
  for (let i = 1; i <= AUTO_MAX; i++) {
    let hit = null;
    for (const ext of AUTO_EXTS) {
      hit = await tryLoad(`${AUTO_FOLDER}/${i}.${ext}`);
      if (hit) break;
    }
    if (!hit) break;
    found.push(hit);
  }
  return found;
}

function waitForDecode(img) {
  if (img.decode) {
    return img.decode().catch(() => {});
  }
  return new Promise((resolve) => {
    if (img.complete) resolve();
    else {
      img.onload = resolve;
      img.onerror = resolve;
    }
  });
}

function buildItems(stage, urls) {
  return urls.map((url) => {
    const figure = document.createElement("figure");
    figure.className = "gallery-item";
    const img = document.createElement("img");
    img.src = url;
    img.alt = "";
    img.draggable = false;
    figure.appendChild(img);
    stage.appendChild(figure);
    return figure;
  });
}

function depthLook(z) {
  let opacity;
  let blur;
  if (z <= 0) {
    const depth = -z;
    opacity = gsap.utils.clamp(0, 1, 1 - depth / (DEPTH_STEP * 3));
    blur = gsap.utils.clamp(0, 9, depth / 180);
  } else {
    const exit = (z - DEPTH_STEP * 0.12) / (DEPTH_STEP * 0.45);
    opacity = gsap.utils.clamp(0, 1, 1 - exit);
    blur = gsap.utils.clamp(0, 5, z / 200);
  }
  return { opacity, blur, zIndex: Math.round(20000 + z) };
}

function applyDepthStyles(items) {
  items.forEach((el) => {
    const z = Number(gsap.getProperty(el, "z"));
    const look = depthLook(z);
    el.style.opacity = look.opacity.toFixed(3);
    el.style.filter = `blur(${look.blur.toFixed(2)}px)`;
    el.style.zIndex = String(look.zIndex);
  });
}

const MUSIC_CANDIDATES = [
  "assets/comingSoonGallery/realbgmusic.mp3",
  "assets/comingSoonGallery/bg.music.mp4",
  "assets/comingSoonGallery/bg-music.mp3",
  "assets/comingSoonGallery/bg-music.m4a",
  "assets/comingSoonGallery/bg-music.mp4",
];

function setupBackgroundMusic() {
  const audio = new Audio();
  audio.loop = true;
  audio.preload = "auto";
  audio.volume = 0.45;

  let srcIndex = 0;

  const loadNextCandidate = () => {
    if (srcIndex >= MUSIC_CANDIDATES.length) return false;
    audio.src = MUSIC_CANDIDATES[srcIndex++];
    audio.load();
    return true;
  };

  audio.addEventListener("error", () => {
    loadNextCandidate();
  });

  loadNextCandidate();

  // Must be called from a click handler — that's the only reliable way
  // browsers allow unmuted autoplay.
  return {
    start() {
      return audio.play().catch(() => {});
    },
  };
}

function playIntroFlash() {
  const overlay = document.getElementById("introFlash");
  if (!overlay) return Promise.resolve();
  const text = overlay.querySelector(".intro-flash-text");

  overlay.hidden = false;
  gsap.set(text, { opacity: 0 });

  return new Promise((resolve) => {
    const invert = (on) => () => overlay.classList.toggle("inverted", on);
    gsap
      .timeline({ onComplete: () => overlay.remove() })
      // Title cuts in, white on black.
      .set(text, { opacity: 1 }, 0.25)
      // Two quick inverted flashes.
      .add(invert(true), 0.85)
      .add(invert(false), 1.01)
      .add(invert(true), 1.35)
      .add(invert(false), 1.47)
      // Hold, then dissolve into the gallery.
      .add(() => resolve(), 1.9)
      .to(overlay, { opacity: 0, duration: 0.65, ease: "power2.inOut" }, 1.9);
  });
}

function dismissStartScreen() {
  const start = document.getElementById("introStart");
  if (!start) return Promise.resolve();
  return gsap
    .to(start, { opacity: 0, duration: 0.45, ease: "power2.inOut" })
    .then(() => start.remove());
}

async function playLoadIn(items) {
  const cue = document.getElementById("galleryScrollCue");
  const header = document.querySelector(".coming-soon-header");

  // Hold everything invisible while we wait for decode.
  items.forEach((el) => {
    el.style.opacity = "0";
  });
  if (cue) gsap.set(cue, { opacity: 0 });
  if (header) gsap.set(header, { opacity: 0 });

  await Promise.all(
    items.slice(0, 5).map((el) => waitForDecode(el.querySelector("img")))
  );

  // Start deeper in the scene, then float forward into place.
  // Opacity/blur are driven via style (not GSAP props) so they don't
  // get locked and fight the depth look.
  const intro = items.slice(0, 5);
  intro.forEach((el) => {
    const restZ = Number(gsap.getProperty(el, "z"));
    const startZ = restZ - DEPTH_STEP * 1.35;
    gsap.set(el, { z: startZ, clearProps: "opacity" });
    const look = depthLook(startZ);
    el.style.opacity = look.opacity.toFixed(3);
    el.style.filter = `blur(${Math.max(look.blur, 12).toFixed(2)}px)`;
    el.style.zIndex = String(look.zIndex);
    el.dataset.restZ = String(restZ);
  });

  // Farther images settle quietly at their resting depth.
  items.slice(5).forEach((el) => {
    const look = depthLook(Number(gsap.getProperty(el, "z")));
    gsap.set(el, { clearProps: "opacity" });
    el.style.opacity = look.opacity.toFixed(3);
    el.style.filter = `blur(${look.blur.toFixed(2)}px)`;
    el.style.zIndex = String(look.zIndex);
  });

  await gsap
    .timeline({ defaults: { ease: "power3.out" } })
    .to(
      intro,
      {
        z: (i, el) => Number(el.dataset.restZ),
        duration: 1.2,
        stagger: 0.1,
        onUpdate: function () {
          intro.forEach((el) => {
            const look = depthLook(Number(gsap.getProperty(el, "z")));
            el.style.opacity = look.opacity.toFixed(3);
            el.style.filter = `blur(${look.blur.toFixed(2)}px)`;
            el.style.zIndex = String(look.zIndex);
          });
        },
      },
      0
    )
    .to(
      header,
      { opacity: 1, duration: 0.8, ease: "power2.out" },
      0.3
    )
    .to(
      cue,
      {
        opacity: 0.45,
        duration: 0.7,
        ease: "power2.out",
        onComplete: () => cue && cue.classList.add("is-visible"),
      },
      0.8
    );
}

// Slow cinematic drift through the gallery. Cancels permanently the moment
// the user scrolls, touches, or presses a key — their scroll takes over.
function startAutoScroll() {
  const SECONDS_PER_IMAGE = 1.4;
  let rafId = null;
  let stopped = false;
  let last = null;

  const events = ["wheel", "touchstart", "keydown", "mousedown", "pointerdown"];
  const stop = () => {
    if (stopped) return;
    stopped = true;
    if (rafId) cancelAnimationFrame(rafId);
    events.forEach((e) => window.removeEventListener(e, stop));
  };
  events.forEach((e) => window.addEventListener(e, stop, { passive: true }));

  const step = (now) => {
    if (stopped) return;
    if (last !== null) {
      const speed = window.innerHeight / (SECONDS_PER_IMAGE * 1000);
      window.scrollBy(0, speed * (now - last));
      const maxScroll =
        document.documentElement.scrollHeight - window.innerHeight;
      if (window.scrollY >= maxScroll - 1) {
        stop();
        return;
      }
    }
    last = now;
    rafId = requestAnimationFrame(step);
  };
  rafId = requestAnimationFrame(step);
  return stop;
}

// Blurred mosaic of every gallery image behind the Coming Soon card.
function buildMosaic(urls) {
  const main = document.querySelector(".coming-soon-main");
  if (!main) return;

  const mosaic = document.createElement("div");
  mosaic.className = "coming-soon-mosaic";
  mosaic.setAttribute("aria-hidden", "true");
  urls.forEach((url) => {
    const img = document.createElement("img");
    img.src = url;
    img.alt = "";
    img.loading = "lazy";
    img.draggable = false;
    mosaic.appendChild(img);
  });

  const shade = document.createElement("div");
  shade.className = "coming-soon-mosaic-shade";
  shade.setAttribute("aria-hidden", "true");

  main.prepend(shade);
  main.prepend(mosaic);

  // Scrubbed to scroll position, so the mosaic breathes in gradually
  // as the viewer arrives instead of popping on.
  gsap.from([mosaic, shade], {
    opacity: 0,
    ease: "none",
    scrollTrigger: {
      trigger: main,
      start: "top bottom",
      end: "top 25%",
      scrub: 0.5,
    },
  });
}

function initGallery(items, section) {
  gsap.registerPlugin(ScrollTrigger);

  const n = items.length;
  const travel = (n + 1) * DEPTH_STEP;

  section.style.height = `${(n + 1) * 100}vh`;

  items.forEach((el, i) => {
    const offset = OFFSETS[i % OFFSETS.length];
    gsap.set(el, {
      xPercent: -50,
      yPercent: -50,
      x: offset.x,
      y: offset.y,
      z: -(i + 1) * DEPTH_STEP,
      force3D: true,
      opacity: 0,
    });
  });

  // Experience starts only after Begin — music unlocks on that same click.
  return {
    start() {
      return playIntroFlash()
        .then(() => playLoadIn(items))
        .then(() => {
          applyDepthStyles(items);

          const tl = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: section,
              start: "top top",
              end: "bottom bottom",
              scrub: 0.7,
              onUpdate: () => applyDepthStyles(items),
              snap: {
                snapTo: 1 / (n + 1),
                duration: { min: 0.2, max: 0.6 },
                ease: "power1.inOut",
                delay: 0.1,
              },
            },
          });

          items.forEach((el) => {
            tl.to(el, { z: `+=${travel}`, duration: 1 }, 0);
          });

          gsap.to("#galleryScrollCue", {
            opacity: 0,
            scrollTrigger: {
              trigger: section,
              start: "top top",
              end: "+=400",
              scrub: true,
            },
          });

          if (window.scrollY < 10) startAutoScroll();
        });
    },
  };
}

async function setupComingSoonGallery() {
  const section = document.getElementById("galleryScroll");
  const stage = document.getElementById("galleryStage");
  const flash = document.getElementById("introFlash");
  const startBtn = document.getElementById("introStartBtn");
  const music = setupBackgroundMusic();

  if (!section || !stage || typeof gsap === "undefined") {
    if (flash) flash.remove();
    return;
  }

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const urls = reducedMotion ? [] : await resolveImages();
  if (!urls.length) {
    if (flash) flash.remove();
    section.remove();
    document.getElementById("introStart")?.remove();
    return;
  }

  const items = buildItems(stage, urls);
  document.body.classList.add("has-gallery");
  buildMosaic(urls);
  const gallery = initGallery(items, section);

  gsap.from(".coming-soon-card", {
    opacity: 0,
    y: 48,
    ease: "none",
    scrollTrigger: {
      trigger: ".coming-soon-main",
      start: "top 80%",
      end: "top 20%",
      scrub: 0.5,
    },
  });

  const begin = () => {
    if (startBtn) startBtn.disabled = true;
    // Same user click that hits Begin — browsers allow audio from this.
    music.start();
    document.body.classList.remove("awaiting-begin");
    dismissStartScreen().then(() => gallery.start());
  };

  if (startBtn) {
    startBtn.addEventListener("click", begin, { once: true });
  } else {
    music.start();
    gallery.start();
  }
}

document.addEventListener("DOMContentLoaded", setupComingSoonGallery);
