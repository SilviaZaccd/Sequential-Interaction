(function () {
  var stage = document.getElementById('stage');
  var paper = document.getElementById('paper');
  var card = document.getElementById('card');
  var ball = document.getElementById('ball');
  var ringCircle = document.querySelector('#ring circle');
  var bin = document.getElementById('bin');
  var hint = document.getElementById('hint');
  var steps = document.querySelectorAll('#steps li');
  var end = document.getElementById('end');

  var RING = 339.3;
  var GROUND_RX = 72;
  var HINTS = [
    'Drag the paper upward to pick it up',
    'Drag sideways to flip it over',
    'Press and hold to crumple it',
    'Flick it into the bin'
  ];

  var step, x, y, rx, ry, crumple, held, holdTimer, anim;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function easeOutBack(t) { var c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function groundPos() { return { x: stage.clientWidth * 0.4, y: stage.clientHeight * 0.72 }; }
  function handPos() { return { x: stage.clientWidth * 0.4, y: stage.clientHeight * 0.5 }; }

  function tween(dur, ease, fn, done) {
    cancelAnimationFrame(anim);
    var t0 = performance.now();
    (function frame(now) {
      var t = clamp((now - t0) / dur, 0, 1);
      fn(ease(t));
      if (t < 1) anim = requestAnimationFrame(frame);
      else if (done) done();
    })(t0);
  }

  function render() {
    paper.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    var lift = 1 - rx / GROUND_RX;
    paper.style.setProperty('--sy', (10 + lift * 70) + 'px');
    paper.style.setProperty('--ss', (1 - lift * 0.15 - crumple * 0.6).toFixed(3));
    paper.style.setProperty('--so', (0.8 - lift * 0.45).toFixed(3));
    card.style.setProperty('--rx', rx + 'deg');
    var s = 1 - crumple * 0.75;
    var jitter = crumple > 0 ? Math.sin(crumple * 40) * 6 * crumple : 0;
    card.style.transform = paper.classList.contains('ground') ? '' :
      'rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) rotateZ(' + jitter + 'deg) scale(' + s + ')';
    card.style.setProperty('--wr', crumple.toFixed(3));
    card.style.opacity = crumple < 0.6 ? 1 : 1 - (crumple - 0.6) / 0.4;
    var b = clamp((crumple - 0.45) / 0.55, 0, 1);
    ball.style.opacity = b;
    ball.style.transform = 'scale(' + (0.2 + b * 0.8) + ') rotate(' + (b * 90) + 'deg)';
  }

  function setStep(n) {
    step = n;
    steps.forEach(function (li, i) {
      li.classList.toggle('done', i < n);
      li.classList.toggle('cur', i === n);
    });
    hint.textContent = HINTS[n] || '';
  }

  function reset() {
    cancelAnimationFrame(anim);
    var g = groundPos();
    x = g.x; y = g.y; rx = GROUND_RX; ry = 0; crumple = 0;
    paper.style.visibility = '';
    paper.classList.add('ground');
    end.classList.remove('on');
    setStep(0);
    render();
  }

  // ---- Pointer handling ----
  var start = null;
  var samples = [];

  paper.addEventListener('pointerdown', function (e) {
    if (step > 3) return;
    try { paper.setPointerCapture(e.pointerId); } catch (err) {}
    paper.classList.add('dragging');
    cancelAnimationFrame(anim);
    start = { px: e.clientX, py: e.clientY, x: x, y: y, ry: ry };
    samples = [{ t: performance.now(), x: e.clientX, y: e.clientY }];
    if (step === 2) startHold();
  });

  paper.addEventListener('pointermove', function (e) {
    if (!start) return;
    var dx = e.clientX - start.px;
    var dy = e.clientY - start.py;

    if (step === 0) {
      paper.classList.remove('ground');
      var p = clamp(-dy / 220, 0, 1);
      var g = groundPos(), h = handPos();
      rx = GROUND_RX * (1 - p);
      y = g.y + (h.y - g.y) * p;
      render();
    } else if (step === 1) {
      ry = clamp(start.ry + Math.abs(dx) / 260 * 180, 0, 180);
      render();
    } else if (step === 3) {
      x = start.x + dx;
      y = start.y + dy;
      samples.push({ t: performance.now(), x: e.clientX, y: e.clientY });
      if (samples.length > 6) samples.shift();
      render();
    }
  });

  function release(e) {
    if (!start) return;
    paper.classList.remove('dragging');
    var s = start;
    start = null;

    if (step === 0) {
      var from = rx, fromY = y, h = handPos(), g = groundPos();
      if (rx < GROUND_RX * 0.45) {
        tween(450, easeOutBack, function (t) {
          rx = from * (1 - t); y = fromY + (h.y - fromY) * t; render();
        }, function () { setStep(1); });
      } else {
        tween(380, easeOut, function (t) {
          rx = from + (GROUND_RX - from) * t; y = fromY + (g.y - fromY) * t; render();
        }, function () { paper.classList.add('ground'); render(); });
      }
    } else if (step === 1) {
      var r0 = ry;
      var target = ry > 90 ? 180 : 0;
      tween(500, easeOutBack, function (t) { ry = r0 + (target - r0) * t; render(); },
        function () { if (target === 180) setStep(2); });
    } else if (step === 2) {
      stopHold();
    } else if (step === 3) {
      throwBall();
    }
  }
  paper.addEventListener('pointerup', release);
  paper.addEventListener('pointercancel', release);

  // ---- Crumple (press and hold) ----
  var lastHold;
  function startHold() {
    paper.classList.add('holding');
    lastHold = performance.now();
    cancelAnimationFrame(holdTimer);
    (function grow(now) {
      crumple = clamp(crumple + (now - lastHold) / 1400, 0, 1);
      lastHold = now;
      ringCircle.style.strokeDashoffset = RING * (1 - crumple);
      render();
      if (crumple >= 1) { finishCrumple(); return; }
      holdTimer = requestAnimationFrame(grow);
    })(lastHold);
  }
  function stopHold() {
    paper.classList.remove('holding');
    cancelAnimationFrame(holdTimer);
    if (crumple >= 1) return;
    lastHold = performance.now();
    (function relax(now) {
      crumple = clamp(crumple - (now - lastHold) / 900, 0, 1);
      lastHold = now;
      ringCircle.style.strokeDashoffset = RING * (1 - crumple);
      render();
      if (crumple > 0 && step === 2) holdTimer = requestAnimationFrame(relax);
    })(lastHold);
  }
  function finishCrumple() {
    paper.classList.remove('holding');
    start = null;
    paper.classList.remove('dragging');
    setStep(3);
  }

  // ---- Throw ----
  function throwBall() {
    var a = samples[0], b = samples[samples.length - 1];
    var dt = Math.max(16, b.t - a.t) / 1000;
    var vx = (b.x - a.x) / dt, vy = (b.y - a.y) / dt;
    if (Math.hypot(vx, vy) < 300) { returnToHand(); return; }

    var G = 2600;
    var groundY = stage.clientHeight * 0.86;
    var last = performance.now();
    (function fly(now) {
      var d = Math.min(0.033, (now - last) / 1000);
      last = now;
      var prevY = y;
      vy += G * d;
      x += vx * d;
      y += vy * d;

      var r = bin.getBoundingClientRect();
      var rimY = r.top + 11;
      if (vy > 0 && prevY <= rimY && y >= rimY && x > r.left - 30 && x < r.right + 30) {
        dropIntoBin(r);
        return;
      }
      if (y > groundY || x < -100 || x > stage.clientWidth + 100) {
        y = Math.min(y, groundY);
        render();
        hint.textContent = 'Missed. Try again';
        setTimeout(returnToHand, 450);
        return;
      }
      render();
      anim = requestAnimationFrame(fly);
    })(last);
  }

  function returnToHand() {
    var fx = x, fy = y, h = handPos();
    tween(500, easeOutBack, function (t) {
      x = fx + (h.x - fx) * t; y = fy + (h.y - fy) * t; render();
    }, function () { hint.textContent = HINTS[3]; });
  }

  function dropIntoBin(r) {
    var fx = x, fy = y, cx = (r.left + r.right) / 2, by = r.top + 70;
    tween(300, easeOut, function (t) {
      x = fx + (cx - fx) * t; y = fy + (by - fy) * t; render();
    }, function () {
      paper.style.visibility = 'hidden';
      bin.classList.remove('wobble');
      void bin.offsetWidth;
      bin.classList.add('wobble');
      setStep(4);
      setTimeout(function () { end.classList.add('on'); }, 700);
    });
  }

  document.getElementById('restart').addEventListener('click', reset);
  window.addEventListener('resize', function () { if (step === 0) reset(); });

  reset();
})();
