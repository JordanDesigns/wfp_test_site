/* ==========================================================================
   Williams Funeral Products site behaviour
   No dependencies. Everything degrades gracefully without JS.
   ========================================================================== */
(function () {
  "use strict";

  document.documentElement.classList.remove("no-js");

  var DESKTOP = window.matchMedia("(min-width: 1280px)");
  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ------------------------------------------------------------------
     Sticky header shading
     ------------------------------------------------------------------ */
  var head = document.querySelector("[data-head]");
  if (head) {
    var onScroll = function () {
      head.classList.toggle("is-stuck", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ------------------------------------------------------------------
     Desktop dropdown menus
     ------------------------------------------------------------------ */
  var navItems = Array.prototype.slice.call(
    document.querySelectorAll("[data-dropdown]")
  );

  function closeDropdown(item) {
    var trigger = item.querySelector("[data-dropdown-trigger]");
    var panel = item.querySelector("[data-dropdown-panel]");
    if (!trigger || !panel) return;
    trigger.setAttribute("aria-expanded", "false");
    panel.setAttribute("data-open", "false");
  }

  function openDropdown(item) {
    navItems.forEach(function (other) {
      if (other !== item) closeDropdown(other);
    });
    var trigger = item.querySelector("[data-dropdown-trigger]");
    var panel = item.querySelector("[data-dropdown-panel]");
    if (!trigger || !panel) return;
    trigger.setAttribute("aria-expanded", "true");
    panel.setAttribute("data-open", "true");
  }

  function closeAllDropdowns() {
    navItems.forEach(closeDropdown);
  }

  navItems.forEach(function (item) {
    var trigger = item.querySelector("[data-dropdown-trigger]");
    if (!trigger) return;
    var panel = item.querySelector("[data-dropdown-panel]");
    var hoverTimer;

    // The top-level item is a link to its own category page, so a click has
    // to be allowed through rather than only toggling the panel. The panel
    // is still reachable by hover, by focus and by ArrowDown.
    var isLink = trigger.tagName === "A" && trigger.hasAttribute("href");

    trigger.addEventListener("click", function (event) {
      if (isLink) return;
      event.preventDefault();
      var isOpen = trigger.getAttribute("aria-expanded") === "true";
      if (isOpen) {
        closeDropdown(item);
      } else {
        openDropdown(item);
      }
    });

    // Tabbing onto the trigger reveals its sub-items, so keyboard users
    // reach them without having to activate the link first.
    trigger.addEventListener("focus", function () {
      if (DESKTOP.matches) openDropdown(item);
    });

    trigger.addEventListener("keydown", function (event) {
      if (event.key !== "ArrowDown" && event.key !== "Down") return;
      event.preventDefault();
      openDropdown(item);
      if (!panel) return;
      // The panel starts at visibility:hidden. Focus is refused while the
      // computed value is still hidden, so force a style flush between
      // opening the panel and moving into it.
      void panel.offsetHeight;
      var first = panel.querySelector("a");
      if (first) first.focus();
    });

    // Hover intent on pointer devices only, which keeps touch taps from
    // opening and instantly closing the panel.
    item.addEventListener("mouseenter", function () {
      if (!DESKTOP.matches) return;
      window.clearTimeout(hoverTimer);
      openDropdown(item);
    });

    item.addEventListener("mouseleave", function () {
      if (!DESKTOP.matches) return;
      hoverTimer = window.setTimeout(function () {
        closeDropdown(item);
      }, 180);
    });

    // Close when focus leaves the whole item (keyboard tabbing out).
    item.addEventListener("focusout", function (event) {
      if (!item.contains(event.relatedTarget)) closeDropdown(item);
    });
  });

  document.addEventListener("click", function (event) {
    if (!event.target.closest("[data-dropdown]")) closeAllDropdowns();
  });

  /* ------------------------------------------------------------------
     Mobile drawer
     ------------------------------------------------------------------ */
  var burger = document.querySelector("[data-burger]");
  var drawer = document.querySelector("[data-drawer]");

  function setDrawer(open) {
    if (!burger || !drawer) return;
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    drawer.setAttribute("data-open", open ? "true" : "false");
    drawer.setAttribute("aria-hidden", open ? "false" : "true");
    document.body.classList.toggle("is-locked", open);
  }

  if (burger && drawer) {
    setDrawer(false);

    burger.addEventListener("click", function () {
      var open = burger.getAttribute("aria-expanded") === "true";
      setDrawer(!open);
    });

    // Any navigation out of the drawer should close it.
    drawer.addEventListener("click", function (event) {
      if (event.target.closest("a")) setDrawer(false);
    });

    // Accordion sections inside the drawer.
    drawer.querySelectorAll("[data-acc-trigger]").forEach(function (trigger) {
      trigger.addEventListener("click", function () {
        var panel = document.getElementById(
          trigger.getAttribute("aria-controls")
        );
        if (!panel) return;
        var open = trigger.getAttribute("aria-expanded") === "true";
        trigger.setAttribute("aria-expanded", open ? "false" : "true");
        panel.setAttribute("data-open", open ? "false" : "true");
      });
    });
  }

  // Leaving mobile width with the drawer open would otherwise strand
  // the scroll lock.
  var onBreakpoint = function () {
    if (DESKTOP.matches) setDrawer(false);
  };
  if (DESKTOP.addEventListener) {
    DESKTOP.addEventListener("change", onBreakpoint);
  } else if (DESKTOP.addListener) {
    DESKTOP.addListener(onBreakpoint);
  }

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    closeAllDropdowns();
    if (burger && burger.getAttribute("aria-expanded") === "true") {
      setDrawer(false);
      burger.focus();
    }
  });

  /* ------------------------------------------------------------------
     Scroll reveal
     ------------------------------------------------------------------ */
  var revealables = document.querySelectorAll("[data-reveal]");
  if (revealables.length) {
    if (REDUCED.matches || !("IntersectionObserver" in window)) {
      revealables.forEach(function (el) {
        el.classList.add("is-in");
      });
    } else {
      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-in");
            observer.unobserve(entry.target);
          });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
      );
      revealables.forEach(function (el) {
        observer.observe(el);
      });
    }
  }

  /* ------------------------------------------------------------------
     Deep links to product anchors
     The nav links straight to products (caskets-containers#eco300).
     Product images load after the browser has already jumped, the layout
     shifts underneath it, and the visitor is left parked near the top of
     the page. Re-apply the jump once everything has finished loading,
     unless the visitor has started scrolling themselves in the meantime.
     ------------------------------------------------------------------ */
  (function fixFragmentScroll() {
    if (!window.location.hash || window.location.hash === "#") return;

    var id = window.location.hash.slice(1);
    var target = null;
    try {
      target = document.getElementById(decodeURIComponent(id));
    } catch (e) {
      target = document.getElementById(id);
    }
    if (!target) return;

    var userMoved = false;
    var markMoved = function () {
      userMoved = true;
    };
    window.addEventListener("wheel", markMoved, { passive: true, once: true });
    window.addEventListener("touchmove", markMoved, { passive: true, once: true });
    window.addEventListener("keydown", markMoved, { once: true });

    var settle = function () {
      if (userMoved) return;
      target.scrollIntoView({ block: "start", behavior: "auto" });
    };

    window.addEventListener("load", function () {
      settle();
      // One more pass for anything that finished decoding on the same frame.
      window.setTimeout(settle, 150);
    });
  })();

  /* ------------------------------------------------------------------
     Current-page highlighting
     The header markup is identical on every page, so the active item is
     resolved at runtime from the URL rather than hand-edited per page.
     ------------------------------------------------------------------ */
  (function markCurrent() {
    /* Pages are served without the .html extension, so the same page can be
       reached as /about, /about.html, or under the /wfp_site/ prefix on the
       GitHub Pages preview. Both the URL and each href are reduced to a bare
       page key before they are compared, and the home page answers to "",
       "index" and "./" alike. Returns null for mailto:, tel: and absolute
       links so they can never collide with a page name. */
    function pageKey(value) {
      var s = String(value).split("#")[0].split("?")[0];
      if (/^[a-z][a-z0-9+.-]*:/i.test(s) || s.indexOf("//") === 0) return null;
      s = s.replace(/^.*\//, "").replace(/\.html$/, "");
      return s === "" || s === "index" ? "home" : s;
    }

    var path = pageKey(window.location.pathname);

    document.querySelectorAll(".nav__item").forEach(function (item) {
      var links = item.querySelectorAll("a[href]");
      var hit = Array.prototype.some.call(links, function (link) {
        return pageKey(link.getAttribute("href")) === path;
      });
      if (hit) {
        item.classList.add("is-current");
        var direct = item.querySelector(":scope > a.nav__link");
        if (direct) direct.setAttribute("aria-current", "page");
      }
    });

    document.querySelectorAll(".drawer a[href]").forEach(function (link) {
      if (pageKey(link.getAttribute("href")) === path) {
        link.setAttribute("aria-current", "page");
      }
    });
  })();

  /* ------------------------------------------------------------------
     Footer year
     ------------------------------------------------------------------ */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  /* ------------------------------------------------------------------
     Inquiry form
     ------------------------------------------------------------------ */
  var form = document.querySelector("[data-inquiry-form]");
  if (form) {
    var status = form.querySelector("[data-form-status]");
    var submit = form.querySelector("[data-form-submit]");

    // Pre-select the product when arriving from a product page via
    // contact?product=The+Cypress
    var params = new URLSearchParams(window.location.search);
    var wanted = params.get("product");
    if (wanted) {
      var select = form.querySelector("#inq-product");
      if (select) {
        var matched = Array.prototype.some.call(select.options, function (opt) {
          if (opt.value.toLowerCase() === wanted.toLowerCase()) {
            select.value = opt.value;
            return true;
          }
          return false;
        });
        if (!matched) {
          var message = form.querySelector("#inq-message");
          if (message && !message.value) {
            message.value = "I would like to inquire about: " + wanted + "\n\n";
          }
        }
      }
    }

    function showError(field, text) {
      var slot = form.querySelector('[data-error-for="' + field.id + '"]');
      field.setAttribute("aria-invalid", "true");
      if (slot) slot.textContent = text;
    }

    function clearError(field) {
      var slot = form.querySelector('[data-error-for="' + field.id + '"]');
      field.removeAttribute("aria-invalid");
      if (slot) slot.textContent = "";
    }

    function validate() {
      var ok = true;
      var firstBad = null;

      form.querySelectorAll("[required]").forEach(function (field) {
        clearError(field);
        var value = (field.value || "").trim();

        if (!value) {
          showError(field, "This field is required.");
          ok = false;
        } else if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
          showError(field, "Please enter a valid email address.");
          ok = false;
        }

        if (!ok && !firstBad && field.getAttribute("aria-invalid") === "true") {
          firstBad = field;
        }
      });

      if (firstBad) firstBad.focus();
      return ok;
    }

    form.querySelectorAll("input, select, textarea").forEach(function (field) {
      field.addEventListener("input", function () {
        if (field.getAttribute("aria-invalid") === "true") clearError(field);
      });
    });

    function setStatus(state, text) {
      if (!status) return;
      status.hidden = false;
      status.setAttribute("data-state", state);
      status.textContent = text;
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      if (!validate()) {
        setStatus("err", "Please correct the highlighted fields and try again.");
        return;
      }

      // Honeypot: silently accept and do nothing for bots.
      var trap = form.querySelector('[name="_gotcha"]');
      if (trap && trap.value) return;

      var endpoint = form.getAttribute("action") || "";

      // FORMSPREE-PENDING: until a real endpoint is supplied, fall back to
      // opening the visitor's mail client so no inquiry is ever lost.
      if (!endpoint || endpoint.indexOf("FORMSPREE_ENDPOINT") !== -1) {
        var data = new FormData(form);
        var lines = [];
        data.forEach(function (value, key) {
          if (key.charAt(0) === "_" || !String(value).trim()) return;
          lines.push(key.replace(/_/g, " ") + ": " + value);
        });
        var href =
          "mailto:billa@williamsfuneralproducts.com" +
          "?subject=" + encodeURIComponent("Website inquiry") +
          "&body=" + encodeURIComponent(lines.join("\n"));
        window.location.href = href;
        setStatus(
          "ok",
          "Opening your email application. If nothing happens, please email billa@williamsfuneralproducts.com directly."
        );
        return;
      }

      if (submit) {
        submit.disabled = true;
        submit.dataset.label = submit.textContent;
        submit.textContent = "Sending…";
      }
      setStatus("ok", "Sending your inquiry…");

      fetch(endpoint, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" }
      })
        .then(function (response) {
          if (!response.ok) throw new Error("Request failed");
          form.reset();
          setStatus(
            "ok",
            "Thank you, your inquiry has been sent. We will be in touch shortly."
          );
        })
        .catch(function () {
          setStatus(
            "err",
            "Something went wrong sending your inquiry. Please email billa@williamsfuneralproducts.com or call us directly."
          );
        })
        .then(function () {
          if (submit) {
            submit.disabled = false;
            submit.textContent = submit.dataset.label || "Send inquiry";
          }
        });
    });
  }
})();
