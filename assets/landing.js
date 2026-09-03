(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let showcasePaused = reduceMotion.matches;
  const motionButtons = Array.from(document.querySelectorAll("[data-motion-toggle]"));

  const syncMotionButtons = () => {
    document.body.classList.toggle("showcase-paused", showcasePaused);
    motionButtons.forEach((button) => {
      const label = showcasePaused ? button.dataset.playLabel : button.dataset.pauseLabel;
      button.setAttribute("aria-pressed", String(showcasePaused));
      button.firstElementChild.textContent = showcasePaused ? "▶" : "Ⅱ";
      button.lastElementChild.textContent = label;
    });
  };

  motionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      showcasePaused = !showcasePaused;
      syncMotionButtons();
      document.dispatchEvent(new CustomEvent("wird:motion", { detail: { paused: showcasePaused } }));
    });
  });
  syncMotionButtons();

  const revealItems = document.querySelectorAll("[data-reveal]");
  if (reduceMotion.matches || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -12% 0px" });

    revealItems.forEach((item) => revealObserver.observe(item));
  }

  document.querySelectorAll("[data-tabs]").forEach((gallery) => {
    const tabs = Array.from(gallery.querySelectorAll('[role="tab"]'));
    const panels = tabs.map((tab) => document.getElementById(tab.getAttribute("aria-controls")));
    const tabList = gallery.querySelector('[role="tablist"]');

    const selectTab = (nextTab, focus = false) => {
      const nextIndex = tabs.indexOf(nextTab);
      tabs.forEach((tab, index) => {
        const selected = index === nextIndex;
        tab.setAttribute("aria-selected", String(selected));
        tab.tabIndex = selected ? 0 : -1;
        panels[index].hidden = !selected;
        requestAnimationFrame(() => panels[index].classList.toggle("is-active", selected));

        const video = panels[index].querySelector("video");
        if (video) {
          if (selected && !showcasePaused) {
            video.currentTime = 0;
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        }
      });
      tabList.style.setProperty("--tab-index", nextIndex);
      if (focus) nextTab.focus();
    };

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => selectTab(tab));
      tab.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const current = tabs.indexOf(tab);
        let next = current;
        if (event.key === "Home") next = 0;
        if (event.key === "End") next = tabs.length - 1;
        if (event.key === "ArrowRight") next = (current + 1) % tabs.length;
        if (event.key === "ArrowLeft") next = (current - 1 + tabs.length) % tabs.length;
        selectTab(tabs[next], true);
      });
    });
  });

  const inlineVideos = document.querySelectorAll("video[muted][playsinline]:not([data-orb-video])");
  const inlineVideoVisibility = new WeakMap();
  const syncInlineVideo = (video) => {
    const shouldPlay = inlineVideoVisibility.get(video) && !video.closest("[hidden]") && !showcasePaused;
    if (shouldPlay) video.play().catch(() => {});
    else video.pause();
  };
  if ("IntersectionObserver" in window) {
    const videoObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        inlineVideoVisibility.set(video, entry.isIntersecting);
        syncInlineVideo(video);
      });
    }, { threshold: .28, rootMargin: "12% 0px" });
    inlineVideos.forEach((video) => videoObserver.observe(video));
  } else {
    inlineVideos.forEach((video) => {
      inlineVideoVisibility.set(video, true);
      syncInlineVideo(video);
    });
  }
  document.addEventListener("wird:motion", () => inlineVideos.forEach(syncInlineVideo));

  document.querySelectorAll("[data-carousel]").forEach((carousel) => {
    const track = carousel.querySelector(".highlights-track");
    const cards = Array.from(track.querySelectorAll(".highlight-card"));
    const dotsHost = carousel.querySelector(".carousel-dots");
    const previousButton = carousel.querySelector("[data-carousel-prev]");
    const nextButton = carousel.querySelector("[data-carousel-next]");
    const toggleButton = carousel.querySelector("[data-carousel-toggle]");
    const cardLabel = carousel.dataset.cardLabel || "Show feature";
    const pauseLabel = carousel.dataset.pauseLabel || "Pause automatic movement";
    const playLabel = carousel.dataset.playLabel || "Play automatic movement";
    let activeIndex = 0;
    let autoplay = !reduceMotion.matches;
    let autoplayTimer;
    let scrollTimer;

    const dots = cards.map((_, index) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.setAttribute("aria-label", `${cardLabel} ${index + 1}`);
      dot.addEventListener("click", () => {
        stopAutoplay();
        goTo(index);
      });
      dotsHost.append(dot);
      return dot;
    });

    const setActive = (index) => {
      activeIndex = Math.max(0, Math.min(cards.length - 1, index));
      dots.forEach((dot, dotIndex) => dot.setAttribute("aria-current", String(dotIndex === activeIndex)));
    };

    const goTo = (index) => {
      const normalized = (index + cards.length) % cards.length;
      const left = cards[normalized].offsetLeft - (track.clientWidth - cards[normalized].offsetWidth) / 2;
      track.scrollTo({ left, behavior: reduceMotion.matches ? "auto" : "smooth" });
      setActive(normalized);
    };

    const scheduleAutoplay = () => {
      window.clearTimeout(autoplayTimer);
      if (!autoplay || document.hidden) return;
      autoplayTimer = window.setTimeout(() => {
        goTo(activeIndex + 1);
        scheduleAutoplay();
      }, 6150);
    };

    const updateToggle = () => {
      toggleButton.setAttribute("aria-pressed", String(!autoplay));
      toggleButton.setAttribute("aria-label", autoplay ? pauseLabel : playLabel);
      toggleButton.firstElementChild.textContent = autoplay ? "Ⅱ" : "▶";
    };

    const stopAutoplay = () => {
      autoplay = false;
      window.clearTimeout(autoplayTimer);
      updateToggle();
    };

    previousButton.addEventListener("click", () => { stopAutoplay(); goTo(activeIndex - 1); });
    nextButton.addEventListener("click", () => { stopAutoplay(); goTo(activeIndex + 1); });
    toggleButton.addEventListener("click", () => {
      autoplay = !autoplay;
      updateToggle();
      scheduleAutoplay();
    });

    ["pointerdown", "wheel", "touchstart"].forEach((eventName) => {
      track.addEventListener(eventName, stopAutoplay, { passive: true, once: true });
    });

    track.addEventListener("scroll", () => {
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => {
        const center = track.scrollLeft + track.clientWidth / 2;
        let nearest = 0;
        let nearestDistance = Infinity;
        cards.forEach((card, index) => {
          const cardCenter = card.offsetLeft + card.offsetWidth / 2;
          const distance = Math.abs(cardCenter - center);
          if (distance < nearestDistance) {
            nearest = index;
            nearestDistance = distance;
          }
        });
        setActive(nearest);
      }, 90);
    }, { passive: true });

    document.addEventListener("visibilitychange", scheduleAutoplay);
    setActive(0);
    updateToggle();
    scheduleAutoplay();
  });

  const clamp = (value, minimum = 0, maximum = 1) => Math.min(maximum, Math.max(minimum, value));
  const interpolate = (first, second, progress) => first + (second - first) * progress;
  const smoothstep = (value) => {
    const progress = clamp(value);
    return progress * progress * (3 - 2 * progress);
  };

  const createSadaOrb = (canvas) => {
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return null;

    const add = (first, second) => ({ x: first.x + second.x, y: first.y + second.y, z: first.z + second.z });
    const scale = (vector, amount) => ({ x: vector.x * amount, y: vector.y * amount, z: vector.z * amount });
    const length = (vector) => Math.hypot(vector.x, vector.y, vector.z);
    const normalized = (vector) => scale(vector, 1 / Math.max(length(vector), .000001));
    const dot = (first, second) => first.x * second.x + first.y * second.y + first.z * second.z;
    const cross = (first, second) => ({
      x: first.y * second.z - first.z * second.y,
      y: first.z * second.x - first.x * second.z,
      z: first.x * second.y - first.y * second.x
    });
    const hash = (first, second) => {
      const value = Math.sin(first * 12.9898 + second * 78.233) * 43758.5453;
      return value - Math.floor(value);
    };
    const rotate = (vector, yaw, tilt) => {
      const sineTilt = Math.sin(tilt);
      const cosineTilt = Math.cos(tilt);
      const sineYaw = Math.sin(yaw);
      const cosineYaw = Math.cos(yaw);
      const rotatedX = vector.x * cosineYaw + vector.z * sineYaw;
      const rotatedZ = -vector.x * sineYaw + vector.z * cosineYaw;
      return {
        x: rotatedX,
        y: vector.y * cosineTilt - rotatedZ * sineTilt,
        z: vector.y * sineTilt + rotatedZ * cosineTilt
      };
    };
    const normalizedDepth = (depth, radius) => radius > 0 ? clamp(depth / radius * .5 + .5) : .5;
    const orbitVector = (angle, radius, basisU, basisV) => ({
      x: (basisU.x * Math.cos(angle) + basisV.x * Math.sin(angle)) * radius,
      y: (basisU.y * Math.cos(angle) + basisV.y * Math.sin(angle)) * radius,
      z: (basisU.z * Math.cos(angle) + basisV.z * Math.sin(angle)) * radius
    });

    const sphericalInterpolate = (first, second, progress) => {
      if (progress <= 0) return first;
      if (progress >= 1) return second;
      const firstLength = Math.max(length(first), .000001);
      const secondLength = Math.max(length(second), .000001);
      const firstDirection = scale(first, 1 / firstLength);
      const secondDirection = scale(second, 1 / secondLength);
      const cosine = clamp(dot(firstDirection, secondDirection), -1, 1);
      let direction;

      if (cosine > .9995) {
        direction = normalized(add(scale(firstDirection, 1 - progress), scale(secondDirection, progress)));
      } else if (cosine < -.9995) {
        const reference = Math.abs(firstDirection.x) < .8 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
        const perpendicular = normalized(cross(firstDirection, reference));
        direction = add(scale(firstDirection, Math.cos(Math.PI * progress)), scale(perpendicular, Math.sin(Math.PI * progress)));
      } else {
        const angle = Math.acos(cosine);
        const denominator = Math.sin(angle);
        direction = add(
          scale(firstDirection, Math.sin((1 - progress) * angle) / denominator),
          scale(secondDirection, Math.sin(progress * angle) / denominator)
        );
      }

      return scale(direction, interpolate(firstLength, secondLength, progress));
    };

    const workingEndpoints = (time) => {
      const workingTime = time * 3.9;
      const sphereRadius = 20 / 2 * .82;
      const radiusScale = Math.pow(20 / 300, .6);
      const ghostRadius = Math.max(.3, .9 * 2.4 * radiusScale);
      const yaw = workingTime * .12;
      const tilt = .3;
      const endpoints = [];

      for (let orbit = 0; orbit < 3; orbit += 1) {
        const first = hash(orbit, 1.7);
        const second = hash(orbit, 5.2);
        const third = hash(orbit, 8.9);
        const orbitRadius = sphereRadius * (.45 + .52 * first);
        const theta = first * 2 * Math.PI;
        const phi = Math.acos(2 * second - 1);
        const normal = {
          x: Math.sin(phi) * Math.cos(theta),
          y: Math.cos(phi),
          z: Math.sin(phi) * Math.sin(theta)
        };
        let basisU = { x: -normal.y, y: normal.x, z: 0 };
        basisU = scale(basisU, 1 / Math.max(.000001, Math.hypot(basisU.x, basisU.y)));
        const basisV = {
          x: normal.y * basisU.z - normal.z * basisU.y,
          y: normal.z * basisU.x - normal.x * basisU.z,
          z: normal.x * basisU.y - normal.y * basisU.x
        };
        const speed = (.25 + .55 * third) * (third > .5 ? 1 : -1);

        for (let ghost = 0; ghost < 10; ghost += 1) {
          const angle = ghost / 10 * 2 * Math.PI;
          const vector = rotate(orbitVector(angle, orbitRadius, basisU, basisV), yaw, tilt);
          const depth = normalizedDepth(vector.z, orbitRadius);
          endpoints.push({ vector, radius: ghostRadius, depth, energy: .05 + depth * .08, opacity: .5 * (.4 + .6 * depth) });
        }

        for (let particle = 0; particle < 3; particle += 1) {
          const angle = workingTime * speed + particle / 3 * 2 * Math.PI + second * 6;
          const vector = rotate(orbitVector(angle, orbitRadius, basisU, basisV), yaw, tilt);
          const depth = normalizedDepth(vector.z, orbitRadius);
          endpoints.push({
            vector,
            radius: Math.max(.3, (2.88 + 3.84 * depth) * radiusScale),
            depth,
            energy: .62 + depth * .38,
            opacity: 1
          });
        }

        const seedAngle = workingTime * speed + second * 6 + Math.PI / 3;
        const seedVector = rotate(orbitVector(seedAngle, orbitRadius, basisU, basisV), yaw, tilt);
        endpoints.push({ vector: seedVector, radius: .3, depth: normalizedDepth(seedVector.z, orbitRadius), energy: 0, opacity: 0 });
      }

      return endpoints;
    };

    const listeningEndpoints = (time) => {
      const listeningTime = time * 3.998;
      const sphereRadius = 20 / 2 * .874;
      const radiusScale = Math.pow(20 / 300, .6);
      const yaw = listeningTime * .18;
      const endpoints = [];

      for (let ring = 0; ring <= 5; ring += 1) {
        const latitude = -Math.PI / 2 + ring / 5 * Math.PI;
        const cosine = Math.cos(latitude);
        const sine = Math.sin(latitude);
        const wave = .62 * Math.sin(listeningTime * 2.1 - ring * .52) + .38 * Math.sin(listeningTime * 1.27 + ring * .83);
        const ringRadius = sphereRadius * (.88 + .105 * wave);
        const pointCount = Math.max(1, Math.round(Math.abs(cosine) * 13));

        for (let point = 0; point < pointCount; point += 1) {
          const longitude = point / pointCount * 2 * Math.PI;
          const vector = rotate({
            x: cosine * Math.cos(longitude) * ringRadius,
            y: sine * ringRadius,
            z: cosine * Math.sin(longitude) * ringRadius
          }, yaw, .38);
          const depth = normalizedDepth(vector.z, sphereRadius);
          const crest = Math.max(0, wave);
          endpoints.push({
            vector,
            radius: Math.max(.3, (.96 + 2.72 * depth) * (1 + .4 * crest) * radiusScale),
            depth,
            energy: Math.min(1, crest * (.45 + depth * .45)),
            opacity: 1
          });
        }
      }

      return endpoints;
    };

    const mixColor = (first, second, progress) => first.map((channel, index) => Math.round(interpolate(channel, second[index], progress)));
    const palette = {
      ink: [214, 214, 214],
      mutedInk: [133, 133, 133],
      accent: [35, 143, 141],
      greenGlint: [73, 166, 125]
    };
    let cssSize = 0;
    let targetBlend = 0;
    let listeningBlend = 0;
    let previousTime = performance.now();
    let isVisible = true;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      cssSize = Math.max(1, Math.min(bounds.width, bounds.height));
      const density = Math.min(window.devicePixelRatio || 1, 2);
      const pixelSize = Math.max(1, Math.round(cssSize * density));
      if (canvas.width !== pixelSize || canvas.height !== pixelSize) {
        canvas.width = pixelSize;
        canvas.height = pixelSize;
      }
      context.setTransform(density, 0, 0, density, 0, 0);
    };

    const draw = (now) => {
      if (!cssSize) resize();
      const delta = Math.min(.05, Math.max(0, (now - previousTime) / 1000));
      previousTime = now;
      const response = 1 - Math.exp(-delta / .105);
      listeningBlend = interpolate(listeningBlend, targetBlend, response);
      if (Math.abs(listeningBlend - targetBlend) < .0005) listeningBlend = targetBlend;

      context.clearRect(0, 0, cssSize, cssSize);
      const time = now / 1000;
      const working = workingEndpoints(time);
      const listening = listeningEndpoints(time);
      const displayScale = cssSize / 20;
      const dots = working.slice(0, Math.min(working.length, listening.length)).map((workingDot, identity) => {
        const listeningDot = listening[identity];
        const vector = sphericalInterpolate(workingDot.vector, listeningDot.vector, listeningBlend);
        return {
          identity,
          x: cssSize / 2 + vector.x * displayScale,
          y: cssSize / 2 - vector.y * displayScale,
          radius: Math.max(.3 * displayScale, interpolate(workingDot.radius, listeningDot.radius, listeningBlend) * displayScale),
          depth: interpolate(workingDot.depth, listeningDot.depth, listeningBlend),
          energy: interpolate(workingDot.energy, listeningDot.energy, listeningBlend),
          opacity: interpolate(workingDot.opacity, listeningDot.opacity, listeningBlend)
        };
      }).sort((first, second) => first.depth === second.depth ? first.identity - second.identity : first.depth - second.depth);

      dots.forEach((orbDot) => {
        const depth = clamp(orbDot.depth);
        const energy = clamp(orbDot.energy);
        const depthInk = mixColor(palette.mutedInk, palette.ink, depth);
        const sadaInk = mixColor(depthInk, palette.accent, .1 + depth * .14);
        const color = mixColor(sadaInk, palette.greenGlint, energy * .5);
        context.beginPath();
        context.arc(orbDot.x, orbDot.y, orbDot.radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${clamp(orbDot.opacity)})`;
        context.fill();
      });
    };

    const animate = (now) => {
      if (isVisible && !document.hidden && !showcasePaused) draw(now);
      requestAnimationFrame(animate);
    };

    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(canvas);
    else window.addEventListener("resize", resize, { passive: true });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([entry]) => { isVisible = entry.isIntersecting; }, { rootMargin: "30% 0px" }).observe(canvas);
    }
    resize();
    if (reduceMotion.matches) {
      targetBlend = 1;
      listeningBlend = 1;
      draw(600);
    } else {
      requestAnimationFrame(animate);
    }

    return {
      setState(progress) {
        targetBlend = clamp(progress);
      }
    };
  };

  const sadaOrbRenderers = new Map();
  document.querySelectorAll("[data-sada-orb]").forEach((canvas) => {
    const renderer = createSadaOrb(canvas);
    if (renderer) sadaOrbRenderers.set(canvas, renderer);
  });

  const orbStory = document.querySelector("[data-orb-story]");
  if (orbStory && !reduceMotion.matches) {
    let framePending = false;
    let storyIsVisible = true;
    let productShouldPlay = false;
    const productVideo = orbStory.querySelector("[data-orb-video]");
    const syncProductVideo = () => {
      if (!productVideo) return;
      if (storyIsVisible && productShouldPlay && !showcasePaused) productVideo.play().catch(() => {});
      else productVideo.pause();
    };
    const updateOrbStory = () => {
      const bounds = orbStory.getBoundingClientRect();
      const travel = Math.max(1, bounds.height - window.innerHeight);
      const progress = Math.min(1, Math.max(0, -bounds.top / travel));
      const activeProgress = smoothstep((progress - .06) / .22);
      const settledProgress = smoothstep((progress - .5) / .18);
      const stateProgress = activeProgress * (1 - settledProgress);
      const shrinkProgress = smoothstep((progress - .32) / .28);
      const contentProgress = smoothstep((progress - .5) / .28);
      orbStory.style.setProperty("--orb-progress", progress.toFixed(4));
      orbStory.style.setProperty("--orb-state", stateProgress.toFixed(4));
      orbStory.style.setProperty("--orb-shrink", shrinkProgress.toFixed(4));
      orbStory.style.setProperty("--orb-content", contentProgress.toFixed(4));
      const orbCanvas = orbStory.querySelector("[data-sada-orb]");
      sadaOrbRenderers.get(orbCanvas)?.setState(stateProgress);
      const shouldPlay = contentProgress > .08;
      if (shouldPlay && !productShouldPlay && productVideo) productVideo.currentTime = 0;
      if (!shouldPlay && productShouldPlay && productVideo) {
        productVideo.pause();
        productVideo.currentTime = 0;
      }
      productShouldPlay = shouldPlay;
      syncProductVideo();
      framePending = false;
    };

    const requestUpdate = () => {
      if (framePending) return;
      framePending = true;
      requestAnimationFrame(updateOrbStory);
    };

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate, { passive: true });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([entry]) => {
        storyIsVisible = entry.isIntersecting;
        syncProductVideo();
      }, { threshold: 0, rootMargin: "16% 0px" }).observe(orbStory);
    }
    document.addEventListener("wird:motion", syncProductVideo);
    updateOrbStory();
  } else if (orbStory) {
    orbStory.style.setProperty("--orb-progress", "1");
    orbStory.style.setProperty("--orb-state", "1");
    orbStory.style.setProperty("--orb-shrink", "1");
    orbStory.style.setProperty("--orb-content", "1");
  }
})();
