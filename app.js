/* =============================================================
   Aksharum · Social media page: interactions
   - footer year
   - cursor spotlight on the cards (mouse / trackpad only)
   - Share dialog:
       1. Link  or  QR code
       2. All channels (this page)  or  one platform
       3. Copy / share the link, or download / share the QR code
   ============================================================= */
(function () {
  'use strict';

  var canonical = document.querySelector('link[rel="canonical"]');
  var PAGE_URL = canonical ? canonical.href : location.href;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var noop = function () {};

  function prettyUrl(url) {
    return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
  }

  /* ---------- Footer year ---------- */
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Spotlight that follows the mouse on each card ---------- */
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.link').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  /* ---------- Share dialog ---------- */
  var dialog = document.getElementById('share-dialog');
  var openBtn = document.getElementById('share');
  if (!dialog || !openBtn) return;

  // Very old browsers without <dialog>: fall back to a plain share / copy.
  if (typeof dialog.showModal !== 'function') {
    openBtn.addEventListener('click', function () {
      if (navigator.share) navigator.share({ title: document.title, url: PAGE_URL }).catch(noop);
      else window.prompt('Copy this link:', PAGE_URL);
    });
    return;
  }

  var svg = function (d) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"/></svg>';
  };
  var ICONS = {
    download: svg('M12 3v12M7 10l5 5 5-5M5 21h14'),
    share: svg('M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13'),
    copy: svg('M9 9h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2V9zM5 15H4a1 1 0 0 1-1-1V5a2 2 0 0 1 2-2h9a1 1 0 0 1 1 1v1'),
    open: svg('M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5'),
    check: svg('M5 12.5l4.5 4.5L19 7')
  };

  // The channel list is read from the cards on the page, so links live in one place only.
  var channels = Array.prototype.map.call(document.querySelectorAll('.links .link'), function (a) {
    var name = a.querySelector('.name').textContent.trim();
    return {
      id: a.getAttribute('data-id'),
      name: name,
      url: a.href,
      icon: a.querySelector('.icon').innerHTML,
      // Wording; a card can override these with data-title / data-open / data-share-text (the Website card does)
      title: a.getAttribute('data-title') || 'Aksharum on ' + name,
      openName: a.getAttribute('data-open') || name,
      shareText: a.getAttribute('data-share-text') || 'Follow Aksharum on ' + name
    };
  });
  var ALL = {
    id: 'aksharum',
    name: 'All channels',
    url: PAGE_URL,
    isAll: true,
    icon: '<img src="logo.png" alt="">'
  };

  function byId(id) { return document.getElementById(id); }
  var el = {
    kicker: byId('share-kicker'),
    title: byId('share-title'),
    back: byId('share-back'),
    close: byId('share-close'),
    steps: dialog.querySelectorAll('.step'),
    allDesc: byId('share-all-desc'),
    platforms: byId('share-platforms'),
    resultBody: byId('share-result-body'),
    qr: byId('share-qr'),
    canvas: byId('share-qr-canvas'),
    cardIcon: byId('share-card-icon'),
    cardName: byId('share-card-name'),
    cardUrl: byId('share-card-url'),
    primary: byId('share-primary'),
    secondary: byId('share-secondary')
  };

  // Platform tiles for step 2
  channels.forEach(function (ch) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'pf ' + ch.id;
    b.setAttribute('data-target', ch.id);
    b.innerHTML = '<span class="icon" aria-hidden="true">' + ch.icon + '</span>';
    var label = document.createElement('span');
    label.className = 'pf-name';
    label.textContent = ch.name;
    b.appendChild(label);
    el.platforms.appendChild(b);
  });

  function findTarget(id) {
    if (id === ALL.id) return ALL;
    for (var i = 0; i < channels.length; i++) if (channels[i].id === id) return channels[i];
    return ALL;
  }

  var canShareFiles = false;
  try {
    canShareFiles = !!(navigator.canShare && window.File &&
      navigator.canShare({ files: [new File(['x'], 'qr.png', { type: 'image/png' })] }));
  } catch (e) { /* not supported */ }

  /* ---------- Steps ---------- */
  var state = { step: 'method', method: null, target: null };

  function heading() {
    var isQR = state.method === 'qr';
    var t = state.target;
    if (state.step === 'method') return ['Share', 'How would you like to share?'];
    if (state.step === 'target') {
      return isQR ? ['QR code', 'What should the QR code open?'] : ['Link', 'What should the link open?'];
    }
    var label = t.isAll ? 'All channels' : t.name;
    return isQR
      ? ['QR code · ' + label, t.isAll ? 'Scan to see all our channels' : 'Scan to open ' + t.openName]
      : ['Link · ' + label, 'Your link is ready'];
  }

  function go(step, isBack) {
    state.step = step;
    el.steps.forEach(function (s) {
      s.hidden = s.getAttribute('data-step') !== step;
      s.classList.toggle('back', !!isBack);
    });
    if (step === 'target') {
      el.allDesc.textContent = state.method === 'qr'
        ? 'One QR code that opens this page'
        : 'One link that opens this page';
    }
    if (step === 'result') renderResult();

    var h = heading();
    el.kicker.textContent = h[0];
    el.title.textContent = h[1];
    el.back.classList.toggle('is-hidden', step === 'method');
    el.title.focus({ preventScroll: true });
  }

  function renderResult() {
    var t = state.target;
    var isQR = state.method === 'qr';

    el.resultBody.className = 'result-body ' + t.id + (isQR ? ' is-qr' : '');
    el.qr.hidden = !isQR;
    el.cardIcon.innerHTML = t.icon;
    el.cardName.textContent = t.isAll ? 'All Aksharum channels' : t.title;
    el.cardUrl.textContent = isQR ? prettyUrl(t.url) : t.url;

    if (isQR) {
      paintQR(t);
      prepareCard(t);
      setAction(el.primary, 'download', 'Download QR', ICONS.download);
      if (canShareFiles) setAction(el.secondary, 'share-qr', 'Share QR', ICONS.share);
      else setAction(el.secondary, 'copy', 'Copy link', ICONS.copy);
    } else {
      setAction(el.primary, 'copy', 'Copy link', ICONS.copy);
      if (navigator.share) setAction(el.secondary, 'share-link', 'Share…', ICONS.share);
      else setAction(el.secondary, 'open', 'Open link', ICONS.open);
    }
  }

  function setAction(btn, action, label, icon) {
    clearTimeout(btn._timer);
    btn.setAttribute('data-action', action);
    btn.classList.remove('is-done');
    btn.innerHTML = icon + '<span>' + label + '</span>';
  }

  function flash(btn, label) {
    var original = btn.innerHTML;
    clearTimeout(btn._timer);
    btn.classList.add('is-done');
    btn.innerHTML = ICONS.check + '<span>' + label + '</span>';
    btn._timer = setTimeout(function () {
      btn.classList.remove('is-done');
      btn.innerHTML = original;
    }, 1800);
  }

  /* ---------- Open / close ---------- */
  function openDialog() {
    state.method = null;
    state.target = null;
    dialog.classList.remove('closing');
    dialog.showModal();
    document.documentElement.classList.add('no-scroll');
    go('method');
  }

  function closeDialog() {
    if (!dialog.open || dialog.classList.contains('closing')) return;
    if (reduceMotion.matches) { dialog.close(); return; }

    dialog.classList.add('closing');
    var timer = setTimeout(finish, 450);
    function onEnd(e) { if (e.target === dialog && !e.pseudoElement) finish(); }
    function finish() {
      clearTimeout(timer);
      dialog.removeEventListener('animationend', onEnd);
      if (dialog.open) dialog.close();
    }
    dialog.addEventListener('animationend', onEnd);
  }

  dialog.addEventListener('close', function () {
    dialog.classList.remove('closing');
    document.documentElement.classList.remove('no-scroll');
    openBtn.focus({ preventScroll: true });
  });

  // Esc key: animate out instead of vanishing
  dialog.addEventListener('cancel', function (e) {
    e.preventDefault();
    closeDialog();
  });

  // Tap / click on the dimmed backdrop closes the dialog
  var pressedBackdrop = false;
  dialog.addEventListener('pointerdown', function (e) { pressedBackdrop = e.target === dialog; });
  dialog.addEventListener('click', function (e) {
    if (e.target === dialog && pressedBackdrop) { closeDialog(); return; }

    var method = e.target.closest('[data-method]');
    if (method) {
      state.method = method.getAttribute('data-method');
      go('target');
      return;
    }
    var target = e.target.closest('[data-target]');
    if (target) {
      state.target = findTarget(target.getAttribute('data-target'));
      go('result');
    }
  });

  openBtn.addEventListener('click', openDialog);
  el.close.addEventListener('click', closeDialog);
  el.back.addEventListener('click', function () {
    go(state.step === 'result' ? 'target' : 'method', true);
  });
  el.primary.addEventListener('click', onAction);
  el.secondary.addEventListener('click', onAction);

  /* ---------- Actions ---------- */
  function shareText(t) {
    return t.isAll ? 'Follow Aksharum on social media' : t.shareText;
  }
  function fileName(t) {
    return 'aksharum-' + (t.isAll ? 'all-channels' : t.id) + '-qr.png';
  }

  function onAction(e) {
    var btn = e.currentTarget;
    var t = state.target;
    var action = btn.getAttribute('data-action');

    if (action === 'copy') {
      copyText(t.url).then(
        function () { flash(btn, 'Copied!'); },
        function () {
          // Clipboard blocked: select the URL so it can be copied by hand
          var sel = window.getSelection();
          sel.removeAllRanges();
          var range = document.createRange();
          range.selectNodeContents(el.cardUrl);
          sel.addRange(range);
        }
      );
    } else if (action === 'open') {
      window.open(t.url, '_blank', 'noopener');
    } else if (action === 'share-link') {
      navigator.share({ title: 'Aksharum', text: shareText(t), url: t.url }).catch(noop);
    } else if (action === 'download') {
      prepareCard(t).then(function (blob) {
        downloadBlob(blob, fileName(t));
        flash(btn, 'Downloaded');
      }, noop);
    } else if (action === 'share-qr') {
      var send = function (blob) {
        var file = new File([blob], fileName(t), { type: 'image/png' });
        return navigator.share({ files: [file], title: 'Aksharum', text: shareText(t) + ': ' + t.url });
      };
      // Use the ready-made image straight away so the browser still counts this as a user tap
      var ready = cardBlobs[t.id];
      (ready ? send(ready) : prepareCard(t).then(send)).catch(noop);
    }
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(function () { return legacyCopy(text); });
    }
    return legacyCopy(text);
  }
  function legacyCopy(text) {
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
      dialog.appendChild(ta); // must live inside the open modal to be selectable
      ta.select();
      ta.setSelectionRange(0, text.length);
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      ta.remove();
      if (ok) resolve(); else reject();
    });
  }

  function downloadBlob(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    dialog.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  /* ---------- QR drawing ---------- */
  var QR_DOT = '#1e1546';  // very dark purple: high contrast for reliable scanning
  var QR_EYE = '#5b3fc0';  // brand purple for the three corner "eyes"

  var logo = new Image();
  var logoReady = new Promise(function (resolve) {
    logo.onload = resolve;
    logo.onerror = resolve;
  });
  logo.src = window.AKSHARUM_QR_LOGO || 'logo.png';

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Draws a branded QR code (rounded dots, purple eyes, logo in the middle).
  // Error correction "H" lets up to 30% of the code be covered; the logo uses about 6%.
  function drawQR(canvas, text, quietModules) {
    var qr = qrcode(0, 'H');
    qr.addData(text);
    qr.make();

    var n = qr.getModuleCount();
    var S = canvas.width;
    var ctx = canvas.getContext('2d');
    // Whole-pixel squares keep edges razor sharp; leftover pixels just widen the white margin.
    var cell = Math.max(1, Math.floor(S / (n + quietModules * 2)));
    var off = Math.floor((S - cell * n) / 2);

    ctx.clearRect(0, 0, S, S);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, S, S);

    // Square hole in the middle for the logo (odd size so it sits dead centre)
    var k = Math.floor(n * 0.24);
    if (k % 2 === 0) k -= 1;
    var ls = (n - k) / 2;
    var le = ls + k;

    function isEye(r, c) {
      return (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
    }

    // Style tuned so ZXing, OpenCV and jsQR all decode every link at every size:
    // full-size dots with softly rounded corners (no gaps, which blur on low-res screens)
    // and only slightly rounded corner eyes (heavily rounded eyes confuse some scanners).
    ctx.fillStyle = QR_DOT;
    ctx.beginPath();
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        if (!qr.isDark(r, c) || isEye(r, c)) continue;
        if (r >= ls && r < le && c >= ls && c < le) continue;
        roundRect(ctx, off + c * cell, off + r * cell, cell, cell, cell * 0.25);
      }
    }
    ctx.fill();

    [[0, 0], [0, n - 7], [n - 7, 0]].forEach(function (p) {
      var x = off + p[1] * cell;
      var y = off + p[0] * cell;
      ctx.fillStyle = QR_EYE;
      ctx.beginPath(); roundRect(ctx, x, y, 7 * cell, 7 * cell, 0.5 * cell); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); roundRect(ctx, x + cell, y + cell, 5 * cell, 5 * cell, 0.35 * cell); ctx.fill();
      ctx.fillStyle = QR_EYE;
      ctx.beginPath(); roundRect(ctx, x + 2 * cell, y + 2 * cell, 3 * cell, 3 * cell, 0.25 * cell); ctx.fill();
    });

    // Logo tile
    var lx = off + ls * cell + cell * 0.35;
    var lw = k * cell - cell * 0.7;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); roundRect(ctx, lx, lx, lw, lw, lw * 0.24); ctx.fill();
    ctx.strokeStyle = 'rgba(126, 99, 206, 0.28)';
    ctx.lineWidth = Math.max(1, cell * 0.12);
    ctx.stroke();
    if (logo.complete && logo.naturalWidth) {
      var box = lw * 0.74; // tested: a bigger logo starts to confuse some scanners
      var scale = Math.min(box / logo.naturalWidth, box / logo.naturalHeight);
      var w = logo.naturalWidth * scale;
      var h = logo.naturalHeight * scale;
      ctx.drawImage(logo, lx + (lw - w) / 2, lx + (lw - h) / 2, w, h);
    }
  }

  // 4-module white margin ("quiet zone") as the QR standard requires, so phones scan it first time
  var QUIET = 4;

  // Match the canvas to the real screen pixels it occupies, so nothing gets blurred by scaling.
  function paintQR(t) {
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    var cssSize = el.qr.getBoundingClientRect().width || 272;
    var px = Math.round(cssSize * dpr);
    if (el.canvas.width !== px) el.canvas.width = el.canvas.height = px;

    drawQR(el.canvas, t.url, QUIET);
    el.canvas.setAttribute('aria-label', 'QR code. Scanning it opens ' + t.url);
    if (!logo.complete) {
      logoReady.then(function () {
        if (state.target === t && state.method === 'qr') drawQR(el.canvas, t.url, QUIET);
      });
    }
  }

  // Redraw on rotate / resize while a QR code is showing
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (dialog.open && state.step === 'result' && state.method === 'qr') paintQR(state.target);
    }, 150);
  });

  // Downloadable image: QR code with a caption underneath. Built ahead of time
  // so "Share QR" can hand it to the share sheet instantly.
  var cardPromises = {};
  var cardBlobs = {};

  function prepareCard(t) {
    if (!cardPromises[t.id]) {
      cardPromises[t.id] = makeCard(t).then(function (blob) {
        cardBlobs[t.id] = blob;
        return blob;
      });
      cardPromises[t.id].catch(function () { delete cardPromises[t.id]; });
    }
    return cardPromises[t.id];
  }

  function makeCard(t) {
    var fonts = (document.fonts && document.fonts.load)
      ? Promise.all([
          document.fonts.load('800 56px "Plus Jakarta Sans"'),
          document.fonts.load('600 30px "Plus Jakarta Sans"')
        ]).catch(noop)
      : Promise.resolve();

    return Promise.all([fonts, logoReady]).then(function () {
      var W = 1080, H = 1240;
      var c = document.createElement('canvas');
      c.width = W; c.height = H;
      var ctx = c.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);

      var q = document.createElement('canvas');
      q.width = q.height = 860;
      drawQR(q, t.url, QUIET);
      ctx.drawImage(q, (W - 860) / 2, 70);

      ctx.textAlign = 'center';
      fitText(ctx, t.isAll ? 'Aksharum on social media' : t.title, 800, 56, '#0d1222', W / 2, 1022, W - 120);
      fitText(ctx, prettyUrl(t.url), 600, 30, '#5b6478', W / 2, 1080, W - 120);

      var g = ctx.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, '#9a82e6');
      g.addColorStop(1, '#6a4fc4');
      ctx.fillStyle = g;
      ctx.fillRect(0, H - 18, W, 18);

      return new Promise(function (resolve, reject) {
        c.toBlob(function (blob) { if (blob) resolve(blob); else reject(new Error('toBlob failed')); }, 'image/png');
      });
    });
  }

  function fitText(ctx, text, weight, size, color, x, y, maxWidth) {
    var family = '"Plus Jakarta Sans", system-ui, -apple-system, "Segoe UI", sans-serif';
    do {
      ctx.font = weight + ' ' + size + 'px ' + family;
      size -= 2;
    } while (ctx.measureText(text).width > maxWidth && size > 14);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }
})();
