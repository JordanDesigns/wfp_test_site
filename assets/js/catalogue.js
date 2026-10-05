/* ==========================================================================
   Full catalogue viewer for phones and tablets
   Mobile browsers will not scroll an embedded PDF, so below 900px the pages
   are drawn with PDF.js into the same scrolling frame. PDF.js is fetched only
   when the section nears the screen. Without JS, the open button remains.
   ========================================================================== */
(function () {
  "use strict";

  var viewer = document.querySelector("[data-catalogue]");
  if (!viewer || !("IntersectionObserver" in window)) return;

  var MOBILE = window.matchMedia("(max-width: 899px)");
  var PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
  var started = false;

  function loadScript(src, done, fail) {
    var s = document.createElement("script");
    s.src = src;
    s.onload = done;
    s.onerror = fail;
    document.head.appendChild(s);
  }

  function build(pdf) {
    var pages = document.createElement("div");
    pages.className = "catalogue__pages";
    pages.setAttribute("tabindex", "0");
    pages.setAttribute("aria-label", "Catalogue pages, scroll to read");

    var draw = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        draw.unobserve(entry.target);
        render(pdf, entry.target);
      });
    }, { root: pages, rootMargin: "100% 0px" });

    for (var n = 1; n <= pdf.numPages; n++) {
      var slot = document.createElement("div");
      slot.className = "catalogue__page";
      slot.setAttribute("data-page", n);
      pages.appendChild(slot);
      draw.observe(slot);
    }

    viewer.appendChild(pages);
    viewer.classList.add("catalogue__viewer--paged");
  }

  function render(pdf, slot) {
    var n = +slot.getAttribute("data-page");
    pdf.getPage(n).then(function (page) {
      var ratio = Math.min(window.devicePixelRatio || 1, 2);
      var base = page.getViewport({ scale: 1 });
      var scale = (slot.clientWidth * ratio) / base.width;
      var view = page.getViewport({ scale: scale });

      var canvas = document.createElement("canvas");
      canvas.width = Math.floor(view.width);
      canvas.height = Math.floor(view.height);
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", "Catalogue page " + n + " of " + pdf.numPages);

      page.render({ canvasContext: canvas.getContext("2d"), viewport: view }).promise.then(function () {
        slot.appendChild(canvas);
      });
    });
  }

  function start() {
    if (started) return;
    started = true;
    loadScript(PDFJS + "pdf.min.js", function () {
      var lib = window.pdfjsLib;
      lib.GlobalWorkerOptions.workerSrc = PDFJS + "pdf.worker.min.js";
      lib.getDocument(viewer.getAttribute("data-catalogue")).promise.then(build);
    }, function () { /* CDN unreachable: the open button still works */ });
  }

  var near = new IntersectionObserver(function (entries) {
    if (entries[0].isIntersecting && MOBILE.matches) {
      near.disconnect();
      start();
    }
  }, { rootMargin: "600px 0px" });
  near.observe(viewer.closest("section") || viewer);
})();
