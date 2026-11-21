/* ============================================================
   סיור flythrough קולנועי — הווידאו מתנגן לפי הגלילה
   סטאק (Playbook): Lenis + GSAP/ScrollTrigger + SplitText
   ============================================================ */
(function () {
  "use strict";

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const SplitText = window.SplitText;
  const Lenis = window.Lenis;
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const video = document.getElementById("fly");
  const loader = document.getElementById("loader");
  const loaderPct = document.getElementById("loaderPct");
  const bar = document.getElementById("progressBar");

  let videoReady = false;
  let scrollProgress = 0;
  let displayTime = 0;

  // בחירת מקור וידאו לפי גודל מסך — גרסת 720p קלה למובייל
  (function pickVideoSource() {
    const mobile = window.innerWidth <= 820;
    const src = mobile ? video.dataset.srcMobile : video.dataset.srcDesktop;
    if (src) video.src = src;
  })();

  // אם הספריות לא נטענו — מציגים הכול ומפעילים את הווידאו כסרטון רגיל
  if (!gsap || !ScrollTrigger) {
    document.documentElement.classList.remove("js");
    if (loader) loader.classList.add("is-hidden");
    video.removeAttribute("muted"); video.muted = true; video.loop = true;
    video.play().catch(() => {});
    return;
  }
  document.documentElement.classList.add("js");
  gsap.registerPlugin(ScrollTrigger);
  if (typeof SplitText !== "undefined") gsap.registerPlugin(SplitText);

  /* ---------- Lenis ---------- */
  if (Lenis && !REDUCED) {
    const lenis = new Lenis({ 
      duration: 1.4, 
      smoothWheel: true,
      wheelMultiplier: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
    });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    window.lenis = lenis;
  }

  /* ---------- גלילה → התקדמות ---------- */
  ScrollTrigger.create({
    trigger: "#cinematicWrap",
    start: "top top",
    end: "bottom bottom",
    onUpdate: (self) => {
      scrollProgress = self.progress;
      bar.style.width = (self.progress * 100).toFixed(1) + "%";
    },
  });

  /* ---------- לולאת scrub: גלילה → זמן בווידאו ---------- */
  function render() {
    if (videoReady && video.duration) {
      const target = scrollProgress * (video.duration - 0.05);
      displayTime += (target - displayTime) * 0.14;   // החלקה עדינה
      if (Math.abs(video.currentTime - displayTime) > 0.012) {
        try { video.currentTime = displayTime; } catch (_) {}
      }
    }
  }
  gsap.ticker.add(render);

  /* ---------- אנימציות טקסט ---------- */
  function buildAnimations() {
    if (REDUCED) {
      document.querySelectorAll(".reveal, [data-split]").forEach((e) => (e.style.opacity = 1));
      return;
    }

    // הופעה פשוטה ואלגנטית ללא קפיצות (אלמנטים של ה-Hero מטופלים ב-heroIntro)
    gsap.utils.toArray(".reveal").forEach((el) => {
      if (el.closest("#hero")) return;
      gsap.fromTo(el, { opacity: 0, y: 15 }, {
        opacity: 1, y: 0, duration: 1.8, ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 90%" },
      });
    });

    // אנימציה לאתר המפורט (Detailed Site)
    gsap.utils.toArray(".reveal-ds").forEach((el) => {
      if (el.classList.contains("ds-title")) return;
      gsap.fromTo(el, { opacity: 0, y: 30 }, {
        opacity: 1, y: 0, duration: 1.4, ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 85%" },
      });
    });

    // כותרות גדולות נחשפות מתוך מסכה — מרשים יותר מ-fade רגיל
    gsap.utils.toArray(".ds-title.reveal-ds").forEach((el) => {
      gsap.fromTo(el,
        { opacity: 0, y: 50, clipPath: "inset(0 0 100% 0)" },
        {
          opacity: 1, y: 0, clipPath: "inset(0 0 -10% 0)",
          duration: 1.3, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 85%" },
        }
      );
    });

    // כרטיסים נכנסים בתלת-מימד (rotateY + עומק)
    document.querySelectorAll("[data-tilt]").forEach((card) => {
      const fromStart = card.classList.contains("card--start");
      gsap.from(card, {
        opacity: 0,
        z: -140,
        rotateY: fromStart ? 12 : -12,
        y: 30,
        duration: 1.8, ease: "power2.out",
        scrollTrigger: { trigger: card, start: "top 85%" },
      });
    });

    // אנימציית מונה למפרט הנכס (Amenities Counter)
    document.querySelectorAll(".amenity-val").forEach((el) => {
      const targetCount = parseInt(el.getAttribute("data-count"), 10);
      if (isNaN(targetCount)) return;

      gsap.to(el, {
        innerHTML: targetCount,
        duration: 2.5,
        ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 85%" },
        snap: { innerHTML: 1 },
        onUpdate: function() {
          el.innerHTML = Math.ceil(this.targets()[0].innerHTML);
        }
      });
    });

  }

  /* ---------- כניסת ה-Hero — רצף מבוים: כותרת → טקסטים → תגיות ---------- */
  function heroIntro() {
    const title = document.getElementById("heroTitle");
    if (!title) return;
    const items = gsap.utils.toArray("#hero .reveal");

    if (REDUCED) {
      gsap.set(title, { opacity: 1 });
      items.forEach((el) => (el.style.opacity = 1));
      return;
    }

    const tl = gsap.timeline({ defaults: { ease: "power3.out" }, delay: 0.1 });

    if (typeof SplitText !== "undefined") {
      const split = new SplitText(title, { type: "words,chars", charsClass: "split-char" });
      tl.set(title, { opacity: 1 }).from(split.chars, {
        opacity: 0,
        y: 60,
        rotateX: -70,
        transformOrigin: "50% 100%",
        stagger: { each: 0.045, from: "center" },
        duration: 1.2,
      });
    } else {
      tl.fromTo(title, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1.2 });
    }

    tl.fromTo("#hero .eyebrow", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.9 }, "-=0.75")
      .fromTo("#hero .hero-sub", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.9 }, "-=0.55")
      .fromTo("#hero .hero-meta", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.9 }, "-=0.6")
      .fromTo("#hero .cue", { opacity: 0 }, { opacity: 1, duration: 1.1 }, "-=0.4");
  }

  /* ---------- Letterbox + HUD סצנה ---------- */
  function initCinemaHud() {
    const hudNum = document.getElementById("hudNum");
    const hudName = document.getElementById("hudName");
    const scenes = gsap.utils.toArray("main.scroll > section[data-scene]");
    if (!hudNum || !scenes.length) return;

    // הפסים וה-HUD פעילים מתחילת הסצנות ועד סוף הסיור
    ScrollTrigger.create({
      trigger: "#scene-1",
      start: "top 80%",
      endTrigger: "#cinematicWrap",
      end: "bottom bottom",
      onToggle: (self) => {
        document.body.classList.toggle("is-cinema", self.isActive);
        // דאקינג: חזק בטיסה, עדין באתר המפורט, רגיל בפתיחה
        ambience.duck = self.isActive ? 1.3 : (self.progress > 0 ? 0.6 : 1);
        ambienceApply(1.8);
      },
    });

    scenes.forEach((scene) => {
      ScrollTrigger.create({
        trigger: scene,
        start: "top center",
        end: "bottom center",
        onToggle: (self) => {
          if (!self.isActive) return;
          hudNum.textContent = String(scene.dataset.scene).padStart(2, "0");
          if (hudName) hudName.textContent = scene.dataset.sceneName || "";
        },
      });
    });
  }

  /* ---------- Lightbox לגלריה ---------- */
  function initLightbox() {
    const lb = document.getElementById("lightbox");
    if (!lb) return;
    const lbImg = document.getElementById("lbImg");
    const lbCaption = document.getElementById("lbCaption");
    const lbCounter = document.getElementById("lbCounter");
    const items = Array.from(document.querySelectorAll("#galleryGrid .gallery-item"));
    if (!items.length) return;
    let index = 0;

    function show(i) {
      index = (i + items.length) % items.length;
      const item = items[index];
      const src = item.querySelector("img");
      const h = item.querySelector("h3");
      lbImg.src = src.getAttribute("src");
      lbImg.alt = src.alt || "";
      lbCaption.textContent = h ? h.textContent : "";
      lbCounter.textContent = (index + 1) + " / " + items.length;
    }

    function open(i) {
      show(i);
      lb.hidden = false;
      lb.classList.add("is-open");
      document.body.style.overflow = "hidden";
      if (window.lenis) window.lenis.stop();
    }

    function close() {
      lb.classList.remove("is-open");
      lb.hidden = true;
      document.body.style.overflow = "";
      if (window.lenis) window.lenis.start();
    }

    items.forEach((item, i) => item.addEventListener("click", () => open(i)));
    document.getElementById("lbClose").addEventListener("click", close);
    document.getElementById("lbNext").addEventListener("click", () => show(index + 1));
    document.getElementById("lbPrev").addEventListener("click", () => show(index - 1));
    lb.addEventListener("click", (e) => { if (e.target === lb) close(); });

    document.addEventListener("keydown", (e) => {
      if (lb.hidden) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") show(index + 1);   // RTL: שמאלה = הבאה
      if (e.key === "ArrowRight") show(index - 1);
    });

    // החלקה במובייל
    let touchX = null;
    lb.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", (e) => {
      if (touchX === null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
      touchX = null;
    }, { passive: true });
  }

  /* ---------- Fade-in לתמונות גלריה בטעינה ---------- */
  function initImageFade() {
    document.querySelectorAll(".gallery-item img").forEach((img) => {
      const mark = () => img.classList.add("is-loaded");
      if (img.complete && img.naturalWidth) mark();
      else img.addEventListener("load", mark, { once: true });
    });
  }

  /* ---------- טבעת קורסור (דסקטופ בלבד) ---------- */
  function initCursor() {
    if (REDUCED || !window.matchMedia("(pointer: fine)").matches) return;
    const ring = document.createElement("div");
    ring.className = "cursor-ring";
    ring.setAttribute("aria-hidden", "true");
    document.body.appendChild(ring);

    gsap.set(ring, { xPercent: -50, yPercent: -50, x: -100, y: -100 });
    const xTo = gsap.quickTo(ring, "x", { duration: 0.35, ease: "power3.out" });
    const yTo = gsap.quickTo(ring, "y", { duration: 0.35, ease: "power3.out" });

    window.addEventListener("mousemove", (e) => { xTo(e.clientX); yTo(e.clientY); }, { passive: true });
    document.addEventListener("mouseover", (e) => {
      ring.classList.toggle("is-active", !!e.target.closest("a, button, .gallery-item, input"));
    });
  }

  /* ---------- סיור 360 — טעינה בלחיצה (Facade) ---------- */
  function initTourFacade() {
    const facade = document.getElementById("tourFacade");
    if (!facade) return;
    facade.addEventListener("click", () => {
      const wrap = facade.closest(".tour-embed");
      const iframe = document.createElement("iframe");
      iframe.src = facade.dataset.tourSrc;
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
      iframe.allowFullscreen = true;
      wrap.appendChild(iframe);
      wrap.classList.add("is-loaded");
    }, { once: true });
  }

  /* ---------- כפתורים מגנטיים (Magnetic Buttons) ---------- */
  function initMagneticButtons() {
    const magneticElements = document.querySelectorAll(".ds-btn, .side-nav__dot, .bts-cta__btn");
    
    magneticElements.forEach((btn) => {
      btn.addEventListener("mousemove", (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        
        gsap.to(btn, {
          x: x * 0.4,
          y: y * 0.4,
          duration: 0.4,
          ease: "power2.out"
        });
      });
      
      btn.addEventListener("mouseleave", () => {
        gsap.to(btn, {
          x: 0,
          y: 0,
          duration: 0.7,
          ease: "elastic.out(1, 0.3)"
        });
      });
    });
  }

  /* ---------- אפקט השתקפות אור בכרטיסיות (Mouse Glow) ---------- */
  function initCardGlow() {
    const cards = document.querySelectorAll(".card, .card-outro");
    cards.forEach(card => {
      card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty("--mouse-x", `${x}px`);
        card.style.setProperty("--mouse-y", `${y}px`);
      });
    });
  }

  /* ---------- ניווט וסנכרון גלילה ---------- */
  function initNavigation() {
    const navLinks = document.querySelectorAll(".nav-link");
    const extraLinks = document.querySelectorAll(".site-footer__nav a, .bts-cta__btn");
    const sideDots = document.querySelectorAll(".side-nav__dot");
    const sections = document.querySelectorAll("main.scroll > section, .detailed-site > section");

    function scrollToSection(e) {
      e.preventDefault();
      const targetId = e.currentTarget.getAttribute("data-target");
      const targetElement = document.getElementById(targetId);
      if (targetElement && window.lenis) {
        window.lenis.scrollTo(targetElement, {
          offset: 0,
          duration: 1.6
        });
      } else if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth" });
      }
    }

    navLinks.forEach(link => link.addEventListener("click", scrollToSection));
    sideDots.forEach(dot => dot.addEventListener("click", scrollToSection));
    extraLinks.forEach(link => link.addEventListener("click", scrollToSection));



    ScrollTrigger.create({
      trigger: document.body,
      start: "top top",
      end: "bottom bottom",
      onUpdate: () => {
        let currentActiveId = "hero";
        const scrollPos = window.scrollY || window.pageYOffset;
        const windowHeight = window.innerHeight;

        sections.forEach(section => {
          const top = section.offsetTop;
          const height = section.offsetHeight;
          if (scrollPos >= top - windowHeight / 2 && scrollPos < top + height - windowHeight / 2) {
            currentActiveId = section.id;
          }
        });

        // עדכון נקודות הניווט הצידיות
        sideDots.forEach(dot => {
          if (dot.getAttribute("data-target") === currentActiveId) {
            dot.classList.add("active");
          } else {
            dot.classList.remove("active");
          }
        });

        // עדכון תפריט עליון
        navLinks.forEach(link => {
          if (link.getAttribute("data-target") === currentActiveId) {
            link.classList.add("active");
          } else {
            link.classList.remove("active");
          }
        });

      }
    });
  }

  /* ---------- טעינת הווידאו ---------- */
  function updatePct() {
    if (!video.duration || !video.buffered.length) return;
    const p = Math.min(100, (video.buffered.end(video.buffered.length - 1) / video.duration) * 100);
    loaderPct.textContent = Math.round(p);
  }

  let started = false;
  let videoDataReady = false;

  function tryStart() {
    if (started) return;
    
    // בודק אם הפונטים נטענו במלואם
    const fontsReady = document.fonts ? document.fonts.status === 'loaded' : true;
    
    if (videoDataReady && fontsReady) {
      executeStartup();
    } else if (videoDataReady) {
      // אם הווידאו מוכן אך הפונטים עדיין לא, נמתין להם
      if (document.fonts) {
        document.fonts.ready.then(() => {
          tryStart();
        }).catch(() => {
          // מנגנון גיבוי במקרה של שגיאה בטעינת הפונטים
          executeStartup();
        });
      } else {
        executeStartup();
      }
    }
  }

  function executeStartup() {
    if (started) return;
    started = true;
    videoReady = true;
    try { video.pause(); } catch (_) {}
    loaderPct.textContent = "100";

    buildAnimations();
    initCardGlow();
    initMagneticButtons();
    initNavigation();
    initCinemaHud();
    initLightbox();
    initTourFacade();
    initImageFade();
    initCursor();

    ScrollTrigger.refresh();
    setTimeout(() => {
      loader.classList.add("is-hidden");
      heroIntro();
    }, 450);
  }

  function onReady() {
    videoDataReady = true;
    tryStart();
  }

  video.addEventListener("progress", updatePct);
  video.addEventListener("loadeddata", onReady);
  video.addEventListener("canplay", onReady);
  video.addEventListener("error", () => {
    loader.querySelector(".loader__txt").textContent =
      "שגיאת טעינה — ודאו ש-assets/flythrough.mp4 קיים והאתר מוגש דרך start.bat.";
  });

  if (video.readyState >= 2) onReady();
  else video.load();
  video.play().then(() => video.pause()).catch(() => {});
  // forced-start אחרי 8 שניות גם אם הווידאו לא נטען
  setTimeout(() => { if (!started) executeStartup(); }, 8000);

  window.addEventListener("load", () => ScrollTrigger.refresh());
  let rt;
  window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => ScrollTrigger.refresh(), 200); });

  /* ---------- Hamburger Menu ---------- */
  (function initHamburger() {
    const btn = document.getElementById("hamburgerBtn");
    const nav = document.getElementById("mobileNav");
    if (!btn || !nav) return;

    function openMenu() {
      btn.classList.add("is-open");
      nav.classList.add("is-open");
      document.body.style.overflow = "hidden";
      btn.setAttribute("aria-label", "סגור תפריט");
    }

    function closeMenu() {
      btn.classList.remove("is-open");
      nav.classList.remove("is-open");
      document.body.style.overflow = "";
      btn.setAttribute("aria-label", "פתח תפריט");
    }

    btn.addEventListener("click", () => {
      btn.classList.contains("is-open") ? closeMenu() : openMenu();
    });

    nav.querySelectorAll(".mobile-nav__link").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        closeMenu();
        const targetId = link.getAttribute("data-target");
        const target = document.getElementById(targetId);
        if (!target) return;
        setTimeout(() => {
          if (window.lenis) {
            window.lenis.scrollTo(target, { duration: 1.6 });
          } else {
            target.scrollIntoView({ behavior: "smooth" });
          }
        }, 350);
      });
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });
  })();

  /* ---------- Header & Side-Nav light/dark state ---------- */
  (function initLightState() {
    const header = document.querySelector(".header");
    const sideNav = document.querySelector(".side-nav");
    const detailedSite = document.querySelector(".detailed-site");
    const btsSection = document.querySelector(".ds-bts");
    if (!header || !detailedSite) return;

    function setLight() {
      header.classList.add("header--light");
      if (sideNav) sideNav.classList.add("is-light");
    }
    function setDark() {
      header.classList.remove("header--light");
      if (sideNav) sideNav.classList.remove("is-light");
    }

    // הפעלת מצב בהיר כשנכנסים לאתר המפורט
    ScrollTrigger.create({
      trigger: detailedSite,
      start: "top 72px",
      onEnter: setLight,
      onLeaveBack: setDark,
    });

    // חזרה למצב כהה כשנכנסים ל"מאחורי הקלעים" (משם והלאה הכול כהה: קשר + פוטר)
    if (btsSection) {
      ScrollTrigger.create({
        trigger: btsSection,
        start: "top 72px",
        onEnter: setDark,
        onLeaveBack: setLight,
      });
    }
  })();

  /* ---------- סאונד אווירה (רוח) + דאקינג לפי אזור ---------- */
  // duck: 1 בפתיחה, 1.3 בזמן הטיסה (חזק), 0.6 באתר המפורט (עדין ברקע)
  const ambience = { audio: null, on: false, base: 0.35, duck: 1 };

  function ambienceApply(duration) {
    if (!ambience.on || !ambience.audio) return;
    gsap.to(ambience.audio, {
      volume: Math.min(1, ambience.base * ambience.duck),
      duration: duration || 1.5,
      ease: "power1.out",
      overwrite: "auto",
    });
  }

  (function initAmbience() {
    const btn = document.getElementById("soundToggle");
    if (!btn) return;

    btn.addEventListener("click", () => {
      // נוצר רק בלחיצה ראשונה — לא מוריד את הקובץ סתם
      if (!ambience.audio) {
        ambience.audio = new Audio(btn.dataset.src);
        ambience.audio.loop = true;
        ambience.audio.volume = 0;
      }
      ambience.on = !ambience.on;
      btn.classList.toggle("is-on", ambience.on);
      btn.setAttribute("aria-pressed", String(ambience.on));
      btn.setAttribute("aria-label", ambience.on ? "השתקת סאונד אווירה" : "הפעלת סאונד אווירה");
      if (ambience.on) {
        ambience.audio.play().catch(() => {});
        ambienceApply(1.5);
      } else {
        gsap.to(ambience.audio, {
          volume: 0, duration: 0.8, ease: "power1.out", overwrite: "auto",
          onComplete: () => ambience.audio.pause(),
        });
      }
    });
  })();

  /* ---------- שנה בפוטר ---------- */
  (function initFooterYear() {
    const yearEl = document.getElementById("footerYear");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  })();

  /* ---------- Contact Form ---------- */
  (function initContactForm() {
    const form = document.getElementById("contactForm");
    const feedback = document.getElementById("formFeedback");
    if (!form || !feedback) return;

    function showFeedback(msg, type) {
      feedback.textContent = msg;
      feedback.className = "form-feedback form-feedback--" + type;
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("fieldName");
      const phone = document.getElementById("fieldPhone");

      let valid = true;

      [name, phone].forEach((f) => f.classList.remove("is-invalid"));

      if (!name.value.trim() || name.value.trim().length < 2) {
        name.classList.add("is-invalid");
        valid = false;
      }
      if (!phone.value.trim() || !/^[\d\s\-\+\(\)]{7,}$/.test(phone.value.trim())) {
        phone.classList.add("is-invalid");
        valid = false;
      }

      if (!valid) {
        showFeedback("אנא מלאו שם וטלפון תקין.", "error");
        return;
      }

      // ליד → וואטסאפ של הסוכן (data-whatsapp על הטופס, פורמט 9725XXXXXXXX)
      const wa = (form.dataset.whatsapp || (window.BIZ && window.BIZ.WHATSAPP) || "").replace(/\D/g, "");
      if (wa) {
        const email = document.getElementById("fieldEmail");
        const msg = `ליד חדש מהאתר של ${form.dataset.property || "הנכס"} 🏡\nשם: ${name.value.trim()}\nטלפון: ${phone.value.trim()}` + (email && email.value.trim() ? `\nאימייל: ${email.value.trim()}` : "");
        window.open(`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`, "_blank");
      }
      showFeedback("תודה! פנייתכם התקבלה. ניצור קשר בהקדם.", "success");
      form.reset();
      if (gsap) gsap.fromTo(feedback, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" });

      // הכפתור הופך לאישור "✓ נשלח" לכמה שניות
      const btn = form.querySelector(".ds-btn");
      if (btn && gsap) {
        const original = btn.textContent;
        btn.textContent = "✓ נשלח";
        btn.classList.add("is-sent");
        btn.disabled = true;
        gsap.fromTo(btn, { scale: 0.95 }, { scale: 1, duration: 0.5, ease: "elastic.out(1, 0.4)" });
        setTimeout(() => {
          btn.textContent = original;
          btn.classList.remove("is-sent");
          btn.disabled = false;
        }, 2600);
      }
    });
  })();

})();
