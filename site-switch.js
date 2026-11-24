/* 115 工科賽｜六入口全站自由切換（桌機／手機共用）。不修改既有職種、地圖及日程功能。 */
(function () {
  "use strict";
  if (window.__GK_SIX_SWITCH_READY__) return;
  window.__GK_SIX_SWITCH_READY__ = true;

  var script = document.currentScript;
  var root = new URL(".", script && script.src ? script.src : location.href);
  var entries = [
    {id:"services", label:"大會服務圖", icon:"⌖", href:"sixth/index.html?view=services#explorer"},
    {id:"skills", label:"職種查詢", icon:"⌕", href:"skills.html"},
    {id:"venues", label:"試場地圖", icon:"▣", href:"venues.html"},
    {id:"agenda", label:"競賽日程", icon:"▤", href:"agenda.html"},
    {id:"ceremony", label:"頒獎典禮", icon:"✦", href:"ceremony.html"},
    {id:"transport", label:"交通與停車", icon:"↗", href:"transport.html?route=overview"},
    {id:"walk", label:"步行與入場", icon:"↝", href:"transport.html?route=coach-walk"}
  ];
  var bar, overlay, bottom, trigger, closeButton, lastFocus;

  function selectedSkill() {
    var params = new URLSearchParams(location.search);
    var choice = params.get("skill") || params.get("program");
    if (/^(0[1-9]|1[0-9]|2[0-9])$/.test(choice || "")) {
      try { sessionStorage.setItem("gk115-last-skill", choice); } catch (_) {}
      return choice;
    }
    try {
      var previous = sessionStorage.getItem("gk115-last-skill");
      return /^(0[1-9]|1[0-9]|2[0-9])$/.test(previous || "") ? previous : null;
    } catch (_) { return null; }
  }
  function skillAwareUrl(path) {
    var dest = new URL(path, root);
    var file = dest.pathname.substring(dest.pathname.lastIndexOf("/") + 1);
    var skill = selectedSkill();
    if (skill && (file === "skills.html" || file === "venues.html"))
      dest.searchParams.set("skill", skill);
    return dest.href;
  }
  function updateSkillLink(a, path) {
    var refresh = function () { a.href = skillAwareUrl(path); };
    refresh();
    a.addEventListener("pointerenter", refresh);
    a.addEventListener("focus", refresh);
    a.addEventListener("click", refresh);
  }
  function url(path) { return new URL(path, root).href; }
  function node(tag, className, text) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (text != null) e.textContent = text;
    return e;
  }
  function link(item, className) {
    var a = node("a", className);
    a.href = url(item.href);
    a.dataset.sixEntry = item.id;
    updateSkillLink(a, item.href);
    var icon = node("span", "six-switch-icon", item.icon);
    icon.setAttribute("aria-hidden", "true");
    a.appendChild(icon);
    a.appendChild(node("span", "six-switch-label", item.label));
    return a;
  }
  function activeEntry() {
    var pathname = location.pathname.toLowerCase();
    var file = pathname.substring(pathname.lastIndexOf("/") + 1);
    var nested = pathname.indexOf("/sixth/") !== -1;
    if (nested) {var q=new URLSearchParams(location.search);return file === "traffic.html" ? "walk" : (!q.get("program") && (q.get("view")==="services" || q.get("service")) ? "services" : "venues");}
    if (file === "individual.html" || file === "skills.html") return "skills";
    if (file === "floor.html" || file === "venues.html") return "venues";
    if (file === "agenda.html") return "agenda";
    if (file === "ceremony.html") return "ceremony";
    if (file === "transport.html") {
      var route = (new URLSearchParams(location.search).get("route") || "").toLowerCase();
      return route.indexOf("walk") >= 0 || route.indexOf("pedestrian") >= 0 ? "walk" : "transport";
    }
    return "home";
  }
  function updateCurrent() {
    var current = activeEntry();
    document.querySelectorAll("[data-six-entry]").forEach(function (a) {
      var isCurrent = a.dataset.sixEntry === current;
      a.classList.toggle("is-current", isCurrent);
      if (isCurrent) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    if (!bottom) return;
    bottom.querySelectorAll("[data-six-short]").forEach(function (a) {
      var same = a.dataset.sixShort === current;
      a.classList.toggle("is-current", same);
      if (same) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    if (trigger) {
      var viaAll = current === "services" || current === "ceremony" || current === "transport" || current === "walk";
      trigger.classList.toggle("is-current", viaAll);
      trigger.setAttribute("aria-label", viaAll ? "全部功能，目前位於" + (entries.find(function (x) {return x.id === current;}) || {}).label : "展開七個主要功能");
    }
  }
  function closePanel() {
    if (!overlay || overlay.hidden) return;
    overlay.hidden = true;
    document.body.classList.remove("six-switch-open");
    if (trigger) trigger.setAttribute("aria-expanded", "false");
    if (lastFocus && lastFocus.isConnected) lastFocus.focus();
  }
  function openPanel() {
    if (!overlay || !overlay.hidden) return;
    lastFocus = document.activeElement;
    overlay.hidden = false;
    document.body.classList.add("six-switch-open");
    if (trigger) trigger.setAttribute("aria-expanded", "true");
    updateCurrent();
    if (closeButton) closeButton.focus();
  }
  function makeBar() {
    bar = node("nav", "six-switch-bar");
    bar.setAttribute("aria-label", "七項主要功能");
    var row = node("div", "six-switch-inner");
    entries.forEach(function (x) { row.appendChild(link(x, "six-switch-tab")); });
    bar.appendChild(row);
    var head = document.querySelector(".site-top, .site-header");
    if (head) head.insertAdjacentElement("afterend", bar);
    else document.body.insertAdjacentElement("afterbegin", bar);
  }
  function makeOverlay() {
    overlay = node("div", "six-switch-overlay");
    overlay.id = "sixSwitchOverlay";
    overlay.hidden = true;
    var backdrop = node("div", "six-switch-backdrop");
    backdrop.addEventListener("click", closePanel);
    overlay.appendChild(backdrop);
    var panel = node("section", "six-switch-panel");
    panel.id = "sixSwitchPanel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-labelledby", "sixSwitchHeading");
    var header = node("div", "six-switch-panel-head");
    var heading = node("h2", "", "切換功能");
    heading.id = "sixSwitchHeading";
    header.appendChild(heading);
    closeButton = node("button", "six-switch-close", "關閉 ✕");
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "關閉功能選單");
    closeButton.addEventListener("click", closePanel);
    header.appendChild(closeButton);
    panel.appendChild(header);
    panel.appendChild(node("p", "six-switch-intro", "七個主要功能可直接切換，不必返回首頁。"));
    var grid = node("div", "six-switch-grid");
    entries.forEach(function (x) { grid.appendChild(link(x, "six-switch-grid-link")); });
    panel.appendChild(grid);
    overlay.appendChild(panel);
    overlay.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.preventDefault(); closePanel(); return; }
      if (e.key !== "Tab") return;
      var focusables = panel.querySelectorAll('a[href],button:not([disabled])');
      if (!focusables.length) return;
      var first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    document.body.appendChild(overlay);
  }
  function shortLink(id, label, icon, href) {
    var a = node("a", "six-switch-bottom-link");
    a.href = url(href);
    a.dataset.sixShort = id;
    updateSkillLink(a, href);
    var i = node("span", "six-switch-bottom-icon", icon);
    i.setAttribute("aria-hidden", "true");
    a.appendChild(i);
    a.appendChild(node("span", "", label));
    return a;
  }
  function makeBottom() {
    bottom = document.querySelector(".adaptive-bottom-nav");
    if (!bottom) {
      bottom = node("nav", "adaptive-bottom-nav");
      document.body.appendChild(bottom);
    }
    bottom.setAttribute("aria-label", "手機功能快捷導覽");
    bottom.replaceChildren(
      shortLink("home", "首頁", "⌂", "index.html"),
      shortLink("skills", "職種", "⌕", "skills.html"),
      shortLink("venues", "場域", "▣", "venues.html"),
      shortLink("agenda", "日程", "▤", "agenda.html")
    );
    trigger = node("button", "six-switch-all", "");
    trigger.type = "button";
    trigger.setAttribute("aria-controls", "sixSwitchPanel");
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.setAttribute("aria-expanded", "false");
    var i = node("span", "six-switch-bottom-icon", "☷");
    i.setAttribute("aria-hidden", "true");
    trigger.appendChild(i);
    trigger.appendChild(node("span", "", "全部"));
    trigger.addEventListener("click", openPanel);
    bottom.appendChild(trigger);
  }
  function init() {
    if (!document.body || document.querySelector(".six-switch-bar")) return;
    makeBar();
    makeOverlay();
    makeBottom();
    updateCurrent();
    window.addEventListener("popstate", updateCurrent);
    window.addEventListener("pageshow", updateCurrent);
    document.addEventListener("change", function(){setTimeout(updateCurrent,0);});
    document.addEventListener("click", function (e) {
      if (e.target.closest("#transportNav, [data-quick-route], #serviceModeButton, #siteTabs, #serviceList, #pinLayer, #globalProgram, #mapSelect")) {
        setTimeout(updateCurrent, 0);
      }
    });
    if (window.matchMedia) {
      var media = window.matchMedia("(min-width: 768px)");
      if (media.addEventListener) media.addEventListener("change", function (e) { if (e.matches) closePanel(); });
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();