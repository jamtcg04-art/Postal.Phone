/* Malice Gaol: the 3D gaol, built on The Postal Trace renderer, rig and kit */
(function () {
var HALF = Math.PI / 2;
  var W = { on: false, gl: null, cv: null, scene: null, models: {}, tex: {}, last: 0, keys: {}, hover: null, labels: null, ready: false, barks: {}, areas: {} };
  var W_VS = 'attribute vec3 aP; attribute vec3 aN; attribute vec2 aU; uniform mat4 uM; uniform mat4 uVP; uniform vec2 uRes; varying vec3 vN; varying vec2 vU; varying float vD; varying vec3 vW;' +
    'void main(){ vec4 w = uM * vec4(aP,1.0); vW = w.xyz; vec4 c = uVP * w; vec2 g = uRes * 0.5; c.xy = floor(c.xy / c.w * g + 0.5) / g * c.w; gl_Position = c; vN = mat3(uM) * aN; vU = aU; vD = c.z; }';
  var W_FS = 'precision mediump float; varying vec3 vN; varying vec2 vU; varying float vD; varying vec3 vW; uniform sampler2D uT; uniform float uUseT; uniform vec3 uC; uniform vec3 uL; uniform vec3 uFog; uniform vec2 uFogR; uniform float uHue; uniform float uLit; uniform float uSel; uniform vec3 uCam; uniform vec2 uFlow; uniform float uFade; uniform vec3 uHole; uniform float uA;' +
    'float bay2(vec2 a){ a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); } float bay4(vec2 a){ return bay2(0.5 * a) * 0.25 + bay2(a); }' +
    'vec3 hue(vec3 c, float a){ float s = sin(a), k = cos(a); vec3 r = vec3(dot(c, vec3(0.213+0.787*k-0.213*s, 0.715-0.715*k-0.715*s, 0.072-0.072*k+0.928*s)), dot(c, vec3(0.213-0.213*k+0.143*s, 0.715+0.285*k+0.140*s, 0.072-0.072*k-0.283*s)), dot(c, vec3(0.213-0.213*k-0.787*s, 0.715-0.715*k+0.715*s, 0.072+0.928*k+0.072*s))); float l = dot(r, vec3(0.213, 0.715, 0.072)); return clamp(mix(vec3(l), r, 1.1), 0.0, 1.0); }' +
    'void main(){ if (uA < 0.999 && bay4(gl_FragCoord.xy) > uA) discard; if (uFade > 0.5) { float hd = distance(gl_FragCoord.xy, uHole.xy) / uHole.z; if (hd < 1.0) { vec2 q = mod(floor(gl_FragCoord.xy), 2.0); if (hd < 0.65) { if (q.x + q.y > 0.5) discard; } else if (q.x + q.y == 1.0) discard; } } vec4 t = uUseT > 0.5 ? texture2D(uT, vU + uFlow) : vec4(1.0); if (t.a < 0.5) discard; vec3 c = t.rgb * uC; if (uHue != 0.0) c = hue(c, uHue);' +
    ' float l = uLit > 0.5 ? 0.58 + 0.55 * max(dot(normalize(vN), uL), 0.0) : 1.0; c *= l; c += uSel * vec3(0.18, 0.14, 0.05);' +
    ' float d = distance(vW.xz, uCam.xz); float f = clamp((d - uFogR.x) / (uFogR.y - uFogR.x), 0.0, 1.0); c = mix(c, uFog, f);' +
    ' vec2 p = floor(gl_FragCoord.xy); float dth = mod(p.x + p.y * 2.0, 4.0) / 4.0 - 0.375; c += dth / 32.0; gl_FragColor = vec4(c, 1.0); }';
  function wB64(s, T) { var bin = atob(s), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new T(u.buffer); }
  function wShader(gl, type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
  function wInit() {
    if (W.gl) return true;
    var cv = document.createElement('canvas'); cv.id = 'world'; cv.setAttribute('aria-label', 'The scene around you. Click the ground to walk, click a person or a thing to go to it.');
    cv.tabIndex = 0;
    document.body.insertBefore(cv, document.body.firstChild);
    var gl = cv.getContext('webgl', { antialias: false });
    if (!gl) { cv.remove(); return false; }
    W.cv = cv; W.gl = gl;
    var pr = gl.createProgram();
    gl.attachShader(pr, wShader(gl, gl.VERTEX_SHADER, W_VS)); gl.attachShader(pr, wShader(gl, gl.FRAGMENT_SHADER, W_FS)); gl.linkProgram(pr);
    gl.useProgram(pr); W.pr = pr;
    W.a = { P: gl.getAttribLocation(pr, 'aP'), N: gl.getAttribLocation(pr, 'aN'), U: gl.getAttribLocation(pr, 'aU') };
    W.u = {}; ['uM', 'uVP', 'uRes', 'uT', 'uUseT', 'uC', 'uL', 'uFog', 'uFogR', 'uHue', 'uLit', 'uSel', 'uCam', 'uFlow', 'uFade', 'uHole', 'uA'].forEach(function (n) { W.u[n] = gl.getUniformLocation(pr, n); });
    gl.enable(gl.DEPTH_TEST);
    var zb = document.createElement('div'); zb.id = 'wzoom';
    zb.innerHTML = '<button type="button" data-z="in" title="Zoom in (<)" aria-label="Zoom in">&lt;</button><button type="button" data-z="out" title="Zoom out (>)" aria-label="Zoom out">&gt;</button>';
    document.body.insertBefore(zb, cv.nextSibling);
    zb.querySelectorAll('[data-z]').forEach(function (b) { b.addEventListener('click', function () { if (W.on && W.scene) wZoom(b.getAttribute('data-z') === 'in' ? 1 / 1.25 : 1.25); }); });
    var lb = document.createElement('div'); lb.id = 'wlabels'; document.body.insertBefore(lb, cv.nextSibling); W.labels = lb;
    wBindInput();
    W.ready = true;
    return true;
  }
  function wTex(key, uri) {
    if (W.tex[key]) return W.tex[key];
    var gl = W.gl, t = gl.createTexture(), entry = { t: t, ok: false };
    W.tex[key] = entry;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([128, 128, 128, 255]));
    var im = new Image();
    im.onload = function () {
      var c = document.createElement('canvas'), p2 = function (n) { var v = 1; while (v < n) v *= 2; return Math.min(v, /^mv_/.test(key) ? 512 : 256); };
      c.width = p2(im.width); c.height = p2(im.height); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
      if (entry.clamp) gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); else { gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); }
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, entry.clamp ? gl.CLAMP_TO_EDGE : gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, entry.clamp ? gl.CLAMP_TO_EDGE : gl.REPEAT);
      entry.ok = true;
    };
    im.src = uri;
    return entry;
  }
  function wBuf(P, N, U) {
    var gl = W.gl, mk = function (a) { var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, a, gl.STATIC_DRAW); return b; };
    return { p: mk(P), n: mk(N), u: mk(U), k: P.length / 3 };
  }
  function wModel(name) {
    if (W.models[name]) return W.models[name];
    if (!W3D.models[name] && PROC[name]) return (W.models[name] = wProcModel(PROC[name]()));
    var M = W3D.models[name], out = { parts: [], h: M.sz[1], w: M.sz[0], d: M.sz[2], mn: M.mn, sz: M.sz };
    M.parts.forEach(function (pt) {
      var q = wB64(pt.p, Int16Array), n = wB64(pt.n, Int8Array), u = wB64(pt.u, Int16Array);
      // V71: indexed parts store each distinct corner once; expand back to one corner per triangle point
      if (pt.i) {
        var ix = wB64(pt.i, pt.iw === 4 ? Uint32Array : Uint16Array), q2 = new Int16Array(ix.length * 3), n2 = new Int8Array(ix.length * 3), u2 = new Int16Array(ix.length * 2);
        for (var a = 0; a < ix.length; a++) { var v = ix[a]; q2[a * 3] = q[v * 3]; q2[a * 3 + 1] = q[v * 3 + 1]; q2[a * 3 + 2] = q[v * 3 + 2]; n2[a * 3] = n[v * 3]; n2[a * 3 + 1] = n[v * 3 + 1]; n2[a * 3 + 2] = n[v * 3 + 2]; u2[a * 2] = u[v * 2]; u2[a * 2 + 1] = u[v * 2 + 1]; }
        q = q2; n = n2; u = u2;
      }
      var P = new Float32Array(q.length), N = new Float32Array(n.length), U = new Float32Array(u.length);
      for (var i = 0; i < q.length; i++) { var a = i % 3; P[i] = (q[i] + 32768) / 65535 * M.sz[a] + M.mn[a]; N[i] = n[i] / 127; }
      for (var j = 0; j < u.length; j++) U[j] = (j % 2 ? 1 - u[j] / 4096 : u[j] / 4096);
      var b = wBuf(P, N, U); b.c = pt.c; b.t = pt.t ? wTex(pt.t, W3D.tex[pt.t]) : null;
      out.parts.push(b);
    });
    W.models[name] = out;
    return out;
  }
  function wQuad(w, h, rep, center) {
    var x0 = center ? -w / 2 : 0, P = new Float32Array([x0, 0, 0, x0 + w, 0, 0, x0 + w, h, 0, x0, 0, 0, x0 + w, h, 0, x0, h, 0]);
    var N = new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]);
    var U = new Float32Array([0, 1, rep, 1, rep, 1 - rep, 0, 1, rep, 1 - rep, 0, 1 - rep].map(function (v, i) { return i % 2 ? (v === 1 ? 1 : 0) : v; }));
    U = new Float32Array([0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0]);
    return wBuf(P, N, U);
  }
  function wGround(x0, z0, x1, z1, rep, y) {
    var P = new Float32Array([x0, y, z0, x0, y, z1, x1, y, z1, x0, y, z0, x1, y, z1, x1, y, z0]);
    var N = new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]);
    var ux = (x1 - x0) / rep, uz = (z1 - z0) / rep;
    var U = new Float32Array([0, 0, 0, uz, ux, uz, 0, 0, ux, uz, ux, 0]);
    return wBuf(P, N, U);
  }
  // ---- matrices ----
  function mMul(a, b) { var o = new Float32Array(16); for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) { var s = 0; for (var k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; } return o; }
  function mTRS(x, y, z, ry, sx, sy, sz, rx, rz) {
    var c = Math.cos(ry), s = Math.sin(ry);
    var M = new Float32Array([c * sx, 0, -s * sx, 0, 0, sy, 0, 0, s * sz, 0, c * sz, 0, x, y, z, 1]);
    if (rx) { var cx = Math.cos(rx), sxx = Math.sin(rx); M = mMul(M, new Float32Array([1, 0, 0, 0, 0, cx, sxx, 0, 0, -sxx, cx, 0, 0, 0, 0, 1])); }
    if (rz) { var cz = Math.cos(rz), szz = Math.sin(rz); M = mMul(M, new Float32Array([cz, szz, 0, 0, -szz, cz, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])); }
    return M;
  }
  function wViewProj(cam, aspect) {
    var yaw = cam.yaw, pitch = cam.pitch, d = 40;
    var fx = Math.cos(pitch) * Math.sin(yaw), fy = Math.sin(pitch), fz = Math.cos(pitch) * Math.cos(yaw);
    var ex = cam.x + fx * d, ey = fy * d, ez = cam.z + fz * d;
    var zx = fx, zy = fy, zz = fz;
    var xx = zz, xy = 0, xz = -zx, xl = Math.hypot(xx, xz); xx /= xl; xz /= xl;
    var yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    if (W.res) {
      var h0 = cam.zoom, w0 = h0 * aspect, pxw = 2 * w0 / W.res[0], pyh = 2 * h0 / W.res[1];
      var sx = xx * ex + xy * ey + xz * ez, sy = yx * ex + yy * ey + yz * ez;
      var ddx = sx - Math.round(sx / pxw) * pxw, ddy = sy - Math.round(sy / pyh) * pyh;
      ex -= xx * ddx + yx * ddy; ey -= xy * ddx + yy * ddy; ez -= xz * ddx + yz * ddy;
    }
    var V = new Float32Array([xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0, -(xx * ex + xy * ey + xz * ez), -(yx * ex + yy * ey + yz * ez), -(zx * ex + zy * ey + zz * ez), 1]);
    var h = cam.zoom, w = h * aspect, n = 1, f = 120;
    var Pm = new Float32Array([1 / w, 0, 0, 0, 0, 1 / h, 0, 0, 0, 0, -2 / (f - n), 0, 0, 0, -(f + n) / (f - n), 1]);
    W.view = { V: V, P: Pm, ex: ex, ey: ey, ez: ez, fx: fx, fy: fy, fz: fz, rx: [xx, xy, xz], ry: [yx, yy, yz], w: w, h: h };
    return mMul(Pm, V);
  }
  function wProject(x, y, z) {
    var v = W.view, dx = x - v.ex, dy = y - v.ey, dz = z - v.ez;
    var sx = (dx * v.rx[0] + dy * v.rx[1] + dz * v.rx[2]) / v.w, sy = (dx * v.ry[0] + dy * v.ry[1] + dz * v.ry[2]) / v.h;
    var r = W.cv.getBoundingClientRect();
    return { x: r.left + (sx + 1) / 2 * r.width, y: r.top + (1 - sy) / 2 * r.height };
  }
  function wGroundAt(cx, cy) {
    var v = W.view, r = W.cv.getBoundingClientRect();
    var sx = ((cx - r.left) / r.width) * 2 - 1, sy = 1 - ((cy - r.top) / r.height) * 2;
    var ox = v.ex + v.rx[0] * sx * v.w + v.ry[0] * sy * v.h, oy = v.ey + v.rx[1] * sx * v.w + v.ry[1] * sy * v.h, oz = v.ez + v.rx[2] * sx * v.w + v.ry[2] * sy * v.h;
    var t = oy / v.fy, x = ox - v.fx * t, z = oz - v.fz * t, sc = W.scene;
    // V141: a raised floor (a gallery, a stair) is hit before the ground under it
    if (sc && sc.lift && sc.liftTop) {
      var tt = (oy - sc.liftTop) / v.fy, xt = ox - v.fx * tt, zt = oz - v.fz * tt;
      var LP = sc.liftPick || sc.lift; if (LP(xt, zt) > sc.liftTop - 0.05) return { x: xt, z: zt };
      for (var i = 0; i < 3; i++) { var hh = LP(x, z), t2 = (oy - hh) / v.fy; x = ox - v.fx * t2; z = oz - v.fz * t2; }
    }
    return { x: x, z: z };
  }
  // ---- drawing ----
  function wDraw(buf, M, o) {
    var gl = W.gl, u = W.u; o = o || {};
    gl.uniformMatrix4fv(u.uM, false, M);
    var c = o.c || buf.c || [1, 1, 1];
    gl.uniform3fv(u.uC, c);
    var t = o.t || buf.t;
    if (t && t.ok) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, t.t); gl.uniform1f(u.uUseT, 1); } else gl.uniform1f(u.uUseT, 0);
    gl.uniform2f(u.uFlow, o.flow ? o.flow[0] : 0, o.flow ? o.flow[1] : 0); gl.uniform1f(u.uHue, o.hue || 0); gl.uniform1f(u.uLit, o.unlit ? 0 : 1); gl.uniform1f(u.uSel, o.sel ? 1 : 0); gl.uniform1f(u.uFade, o.fade ? 1 : 0); gl.uniform1f(u.uA, o.a !== undefined ? o.a : 1);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf.p); gl.enableVertexAttribArray(W.a.P); gl.vertexAttribPointer(W.a.P, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf.n); gl.enableVertexAttribArray(W.a.N); gl.vertexAttribPointer(W.a.N, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf.u); gl.enableVertexAttribArray(W.a.U); gl.vertexAttribPointer(W.a.U, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, buf.k);
  }
  function wInstM(it) {
    var m = wModel(it.m), s = it.h ? it.h / m.h : (it.s || 1);
    var cx = m.mn[0] + m.sz[0] / 2, cz = m.mn[2] + m.sz[2] / 2;
    var M = mTRS(it.x, it.y || 0, it.z, it.r || 0, s * (it.sx || 1), s * (it.sy || 1), s * (it.sz || 1), it.rx || 0, it.rz || 0);
    return mMul(M, new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -cx, it.spin ? 0 : -m.mn[1], -cz, 1]));
  }
  function wTurnTo(p, sc, dt, reach) {
    if (p._f0 === undefined) p._f0 = p.face !== undefined ? p.face : Math.atan2(sc.pl.x - p.x, sc.pl.z - p.z);
    if (p._fc === undefined) p._fc = p._f0;
    if (p.sit || p.noTurn) return p._f0;
    var d = Math.hypot(sc.pl.x - p.x, sc.pl.z - p.z), want = d < reach || (W.hover && W.hover.person === p) ? Math.atan2(sc.pl.x - p.x, sc.pl.z - p.z) : p._f0;
    var df = want - p._fc; while (df > Math.PI) df -= 2 * Math.PI; while (df < -Math.PI) df += 2 * Math.PI;
    p._fc += df * Math.min(1, dt * 3.5);
    return p._fc;
  }
  function wLying(p) {
    if (!W3D.models.human) return;
    var m = wModel('human'), s = 1.72 / m.h, cx = m.mn[0] + m.sz[0] / 2, cz = m.mn[2] + m.sz[2] / 2;
    var M = mMul(mTRS(p.x, 0.27, p.z, p.face || 0, s, s, s, Math.PI / 2, 0), new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -cx, -m.mn[1], -cz, 1]));
    m.parts.forEach(function (b) { wDraw(b, M, { c: (p.coat || [0.3, 0.28, 0.26]).map(function (v) { return v * 0.8; }), sel: !!p.sel }); });
  }
  function wHuman(x, y, z, face, sit, sway, coat, sel) {
    var m = wModel('human'), s = 1.72 / m.h, cx = m.mn[0] + m.sz[0] / 2, cz = m.mn[2] + m.sz[2] / 2;
    var M = mMul(mTRS(x, y, z, face + (W.humanTurn || 0), s, s * (sit ? 0.74 : 1), s, 0, sway), new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -cx, -m.mn[1], -cz, 1]));
    var skin = [0.62, 0.5, 0.42];
    m.parts.forEach(function (b) { wDraw(b, M, { c: coat || [0.3, 0.28, 0.26], sel: sel }); });
  }
  // light: additive glows (lamp pools, window shafts, firelight)
  function wLights(ts) {
    var sc = W.scene, L = sc.lights; if (!L || !L.length) return;
    var now = performance.now(); if (L.some(function (l) { return l.until && now > l.until; })) L = sc.lights = L.filter(function (l) { return !l.until || now <= l.until; });
    var gl = W.gl;
    if (!W.lflat) {
      W.lflat = wBuf(new Float32Array([-0.5, 0, -0.5, -0.5, 0, 0.5, 0.5, 0, 0.5, -0.5, 0, -0.5, 0.5, 0, 0.5, 0.5, 0, -0.5]), new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]), new Float32Array([0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0]));
      W.lvert = wBuf(new Float32Array([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0]), new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]), new Float32Array([0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0]));
    }
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false);
    gl.uniform3fv(W.u.uFog, [0, 0, 0]);
    L.forEach(function (l) {
      var t = wTex(l.tex || 'l_pool', W3D.tex[l.tex || 'l_pool']); t.clamp = true;
      var a = l.flick ? 0.78 + 0.22 * Math.sin(ts / 70 + l.x * 3) * Math.sin(ts / 113 + l.z) : 1, c = (l.c || [0.5, 0.35, 0.15]).map(function (v) { return v * a; });
      var M = l.flat ? mTRS(l.x, l.y || 0.14, l.z, l.r || 0, l.w || 3, 1, l.d || l.w || 3) : mTRS(l.x, l.y || 0, l.z, l.r !== undefined ? l.r : sc.cam.yaw, l.w || 1.5, l.h || 2.5, 1, 0, l.rz || 0);
      wDraw(l.flat ? W.lflat : W.lvert, M, { t: t, c: c, unlit: true });
    });
    gl.uniform3fv(W.u.uFog, sc.fog || [0.11, 0.14, 0.16]);
    gl.depthMask(true); gl.disable(gl.BLEND);
  }
  // passing remarks, Disco-style: people mutter and voices pipe up as you walk by
  function wShadow(x, z, r, y) {
    var gl = W.gl, M = mTRS(x, 0.07 + (y || 0), z, 0, r, 1, r);   // V164: lower, now ground patches lie flat (a hem no longer sits under it)
    gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(-24, -48);
    gl.enable(gl.BLEND); gl.blendFunc(gl.DST_COLOR, gl.ZERO); gl.depthMask(false); gl.uniform3fv(W.u.uFog, [1, 1, 1]);
    wDraw(W.blob, M, { c: [0.52, 0.52, 0.56], unlit: true });
    gl.depthMask(true); gl.disable(gl.BLEND); gl.uniform3fv(W.u.uFog, (W.scene && W.scene.fog) || [0.11, 0.14, 0.16]);
    gl.polygonOffset(0, 0); gl.disable(gl.POLYGON_OFFSET_FILL);
  }
  // see-through: a tall prop standing between the camera and the player (or someone close by you could talk to) is drawn as a stipple.
  // The test is exact for the prop's box: a ray from the target toward the camera, against the prop's rotated bounds.
  var NOFADE = /^(mm_|stall$|f_stall|e_markettent|tent$|barrel|f_barrel|pt_barrel|mk_crate|crates$|f_crate|f_box|pt_box|pt_chest|sacks|mk_wagon|b_cart|pt_cart|cart$|banner|b_lamp|pt_lamp|signpost|well$|fountain|block$|d_bench|f_bench|f_table|f_stool|f_shelf|keg$|lantern|coffin|mn_cart)/;
  function wOccTargets(sc) {
    var pl = sc.pl, lift = sc.lift ? sc.lift(pl.x, pl.z) : 0, up = lift > 0.3, t = [[pl.x, 0.25 + lift, pl.z, up], [pl.x, 0.9 + lift, pl.z, up], [pl.x, 1.55 + lift, pl.z, up]];
    return t;
  }
  function wOccludes(it, m, occ) {
    if (it.nofade || !occ || !occ.length || !W.view) return false;
    // small street things (barrels, crates, sacks, stalls, canopies, carts, lamps) never turn to stipple; only buildings, trees and walls do
    if (it.nofade !== false && NOFADE.test(it.m)) return false;
    var s = it.h ? it.h / m.h : (it.s || 1), y0 = it.y || 0, H = m.sz[1] * s * (it.sy || 1) + y0;
    if (H < 1.15) return false;
    var hx = m.sz[0] * s * (it.sx || 1) / 2, hz = m.sz[2] * s * (it.sz || 1) / 2;
    if (hx > 30 || hz > 30) return false;
    var c = Math.cos(it.r || 0), sn = Math.sin(it.r || 0), v = W.view;
    // ray direction in the prop's own frame (the inverse of x' = c x + s z, z' = -s x + c z)
    var dx = c * v.fx - sn * v.fz, dz = sn * v.fx + c * v.fz, dy = v.fy;
    for (var k = 0; k < occ.length; k++) {
      var p = occ[k], ox = p[0] - it.x, oz = p[2] - it.z, lx = c * ox - sn * oz, lz = sn * ox + c * oz, ly = p[1];
      // standing inside or on top of the box (a cart you ride, a porch) is not being hidden by it
      if (p[3] && Math.abs(lx) < hx && Math.abs(lz) < hz) continue;
      var t0 = -1e9, t1 = 1e9, ok = true;
      [[lx, dx, -hx, hx], [ly, dy, y0, H], [lz, dz, -hz, hz]].forEach(function (a) {
        if (!ok) return;
        if (Math.abs(a[1]) < 1e-6) { if (a[0] < a[2] || a[0] > a[3]) ok = false; return; }
        var ta = (a[2] - a[0]) / a[1], tb = (a[3] - a[0]) / a[1]; if (ta > tb) { var q = ta; ta = tb; tb = q; }
        if (ta > t0) t0 = ta; if (tb < t1) t1 = tb; if (t0 > t1) ok = false;
      });
      if (ok && t1 > 0.05) return true;
    }
    return false;
  }
  // V120: name tags and speech bubbles are kept as lasting elements, one per owner, instead of being rebuilt every frame.
  // Each one follows its owner smoothly; when tags would overlap, the lift that clears them eases in and out instead of
  // hopping; and a speech bubble whose speaker you walk away from lingers a moment and fades rather than vanishing.
  function wStep(dt) {
    var sc = W.scene, pl = sc.pl, k = W.keys, mx = 0, mz = 0;
    if (W.frozen && !W.cut) { pl.moving = false; pl.goal = null; return; }
    if (W.cut) k = {};
    if (k.w || k.arrowup) mz -= 1; if (k.s || k.arrowdown) mz += 1; if (k.a || k.arrowleft) mx -= 1; if (k.d || k.arrowright) mx += 1;
    var speed = (k.shift || (pl.goal && pl.goal.run)) ? 7.6 : 4.2;
    if (mx || mz) {
      var yaw = sc.cam.yaw, fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
      var vx = (rx * mx - fx * mz), vz = (rz * mx - fz * mz), l = Math.hypot(vx, vz);
      wMoveTo(pl.x + vx / l * speed * dt, pl.z + vz / l * speed * dt);
      pl.face = Math.atan2(vx, vz); pl.moving = true; pl.goal = null;
    } else if (pl.goal) {
      if (!W.cut && !pl.goal.wp) {
        var path = (sc.route && sc.route(pl.x, pl.z, pl.goal.x, pl.goal.z)) || wPath(sc, pl.x, pl.z, pl.goal.x, pl.goal.z);
        pl.goal.wp = path || [{ x: pl.goal.x, z: pl.goal.z }];
        var last = pl.goal.wp[pl.goal.wp.length - 1]; pl.goal.x = last.x; pl.goal.z = last.z;
      }
      var wp = pl.goal.wp && pl.goal.wp.length > 1 ? pl.goal.wp[0] : pl.goal;
      if (wp !== pl.goal && Math.hypot(wp.x - pl.x, wp.z - pl.z) < 0.25) { pl.goal.wp.shift(); wp = pl.goal.wp.length > 1 ? pl.goal.wp[0] : pl.goal; }
      var dx = wp.x - pl.x, dz = wp.z - pl.z, d = Math.hypot(dx, dz);
      if (wp !== pl.goal && d < 0.15) d = 0.16;
      if (d < 0.15 && wp === pl.goal) { pl.moving = false; var g = pl.goal; pl.goal = null; if (g.then) g.then(); }
      else { var st = Math.min(d, speed * dt), ox = pl.x, oz = pl.z; wMoveTo(pl.x + dx / d * st, pl.z + dz / d * st); pl.face = Math.atan2(dx, dz); pl.moving = true; if (Math.hypot(pl.x - ox, pl.z - oz) < st * 0.2) { pl.stuck = (pl.stuck || 0) + dt; if (pl.stuck > 0.4) { pl.stuck = 0; var g2 = pl.goal; pl.goal = null; pl.moving = false; if (g2 && g2.then && Math.hypot(g2.x - pl.x, g2.z - pl.z) < 2.5) g2.then(); } } else pl.stuck = 0; }
    } else pl.moving = !!(W.cut && W.cut.walk && W.cut.moving);
    if (sc.tick) sc.tick(sc);
  }
  function wMoveTo(x, z) {
    var sc = W.scene, b = sc.bounds;
    if (W.cut) { sc.pl.x = x; sc.pl.z = z; return; }
    x = Math.max(b[0], Math.min(b[2], x)); z = Math.max(b[1], Math.min(b[3], z));
    sc.solid.forEach(function (s) {
      if (s.off && s.off()) return;
      if (s.r) { var dx = x - s.x, dz = z - s.z, d = Math.hypot(dx, dz); if (d < s.r) { x = s.x + dx / (d || 1) * s.r; z = s.z + dz / (d || 1) * s.r; } }
      else if (x > s.x0 && x < s.x1 && z > s.z0 && z < s.z1) {
        var e = [x - s.x0, s.x1 - x, z - s.z0, s.z1 - z], m = Math.min.apply(null, e);
        if (m === e[0]) x = s.x0; else if (m === e[1]) x = s.x1; else if (m === e[2]) z = s.z0; else z = s.z1;
      }
    });
    W.scene.pl.x = x; W.scene.pl.z = z;
  }
  // ---- click-to-move pathing: A* on a coarse grid around solids, then string-pulled ----
  function wBlocked(sc, x, z, pad) {
    var b = sc.bounds; if (x < b[0] || x > b[2] || z < b[1] || z > b[3]) return true;
    for (var i = 0; i < sc.solid.length; i++) {
      var s = sc.solid[i];
      if (s.off && s.off()) continue;
      if (s.r) { if (Math.hypot(x - s.x, z - s.z) < s.r + pad) return true; }
      else if (x > s.x0 - pad && x < s.x1 + pad && z > s.z0 - pad && z < s.z1 + pad) return true;
    }
    return false;
  }
  function wClear(sc, ax, az, bx, bz, pad) {
    var d = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(d / 0.15));
    for (var i = 1; i <= n; i++) { var t = i / n; if (wBlocked(sc, ax + (bx - ax) * t, az + (bz - az) * t, pad)) return false; }
    return true;
  }
  function wPath(sc, x0, z0, x1, z1) {
    var PAD = 0.12;
    if (!wBlocked(sc, x1, z1, PAD) && wClear(sc, x0, z0, x1, z1, PAD)) return [{ x: x1, z: z1 }];
    var C = 0.35, b = sc.bounds, nx = Math.floor((b[2] - b[0]) / C) + 1, nz = Math.floor((b[3] - b[1]) / C) + 1;
    if (nx * nz > 90000) return null;
    var key = sc.solid.length + ':' + b.join(',') + ':' + sc.solid.map(function (s) { return s.off && s.off() ? 1 : 0; }).join('');
    if (!sc.navGrid || sc.navKey !== key) {
      var g = new Uint8Array(nx * nz);
      for (var j = 0; j < nz; j++) for (var i = 0; i < nx; i++) g[j * nx + i] = wBlocked(sc, b[0] + i * C, b[1] + j * C, 0.2) ? 1 : 0;
      sc.navGrid = g; sc.navKey = key;
    }
    var G = sc.navGrid;
    function cell(x, z) { return [Math.max(0, Math.min(nx - 1, Math.round((x - b[0]) / C))), Math.max(0, Math.min(nz - 1, Math.round((z - b[1]) / C)))]; }
    function nearFree(c) {
      if (!G[c[1] * nx + c[0]]) return c;
      for (var r = 1; r < 14; r++) { var best = null, bd = 1e9;
        for (var dj = -r; dj <= r; dj++) for (var di = -r; di <= r; di++) {
          if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
          var i = c[0] + di, j = c[1] + dj; if (i < 0 || j < 0 || i >= nx || j >= nz || G[j * nx + i]) continue;
          var dd = di * di + dj * dj; if (dd < bd) { bd = dd; best = [i, j]; }
        }
        if (best) return best; }
      return null;
    }
    var s = nearFree(cell(x0, z0)), t = nearFree(cell(x1, z1));
    if (!s || !t) return null;
    var N = nx * nz, gs = new Float32Array(N).fill(1e9), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N), heap = [];
    function push(n, f) { heap.push([f, n]); var k = heap.length - 1; while (k > 0) { var p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; var tmp = heap[p]; heap[p] = heap[k]; heap[k] = tmp; k = p; } }
    function pop() { var top = heap[0], end = heap.pop(); if (heap.length) { heap[0] = end; var k = 0; for (;;) { var l = 2 * k + 1, r = l + 1, m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; var tmp = heap[m]; heap[m] = heap[k]; heap[k] = tmp; k = m; } } return top; }
    var si = s[1] * nx + s[0], ti = t[1] * nx + t[0]; gs[si] = 0; push(si, 0);
    var NB = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]], found = false, iter = 0;
    while (heap.length && iter++ < 60000) {
      var cur = pop()[1]; if (closed[cur]) continue; closed[cur] = 1;
      if (cur === ti) { found = true; break; }
      var ci = cur % nx, cj = (cur - ci) / nx;
      for (var k = 0; k < 8; k++) {
        var ni = ci + NB[k][0], nj = cj + NB[k][1]; if (ni < 0 || nj < 0 || ni >= nx || nj >= nz) continue;
        var nn = nj * nx + ni; if (G[nn] || closed[nn]) continue;
        if (NB[k][0] && NB[k][1] && (G[cj * nx + ni] || G[nj * nx + ci])) continue;
        var ng = gs[cur] + NB[k][2]; if (ng < gs[nn]) { gs[nn] = ng; from[nn] = cur; push(nn, ng + Math.hypot(ni - t[0], nj - t[1])); }
      }
    }
    if (!found) return null;
    var pts = [], c2 = ti; while (c2 !== -1) { var ii = c2 % nx; pts.push({ x: b[0] + ii * C, z: b[1] + ((c2 - ii) / nx) * C }); c2 = from[c2]; }
    pts.reverse();
    var goalFree = !wBlocked(sc, x1, z1, PAD) && t[0] === cell(x1, z1)[0] && t[1] === cell(x1, z1)[1];
    if (goalFree) pts[pts.length - 1] = { x: x1, z: z1 };
    var out = [], ax = x0, az = z0, i0 = 0;
    while (i0 < pts.length - 1) {
      var far = i0 + 1;
      for (var q = pts.length - 1; q > i0 + 1; q--) if (wClear(sc, ax, az, pts[q].x, pts[q].z, PAD)) { far = q; break; }
      out.push(pts[far]); ax = pts[far].x; az = pts[far].z; i0 = far;
    }
    if (!out.length) out.push(pts[pts.length - 1]);
    return out;
  }
  W.path = wPath; W.blocked = wBlocked;
  function wPick(cx, cy) {
    var sc = W.scene, best = null, bd = 1e9;
    sc.people.forEach(function (p) {
      if (p.hidden && p.hidden()) return;
      var a = wProject(p.x, (p.y || 0), p.z), b = wProject(p.x, (p.y || 0) + 1.6, p.z), w = Math.abs(a.y - b.y) * 0.5;
      if (cx > a.x - w && cx < a.x + w && cy < a.y && cy > b.y) { var d = Math.abs(cx - a.x); if (d < bd) { bd = d; best = { person: p }; } }
    });
    if (best) return best;
    sc.things.forEach(function (t) {
      var a = wProject(t.x, t.hy || 0.6, t.z), d = Math.hypot(cx - a.x, cy - a.y), r = Math.abs(wProject(t.x, 0, t.z).x - wProject(t.x + (t.pr || 1.2), 0, t.z).x) + 14;
      if (d < r && d < bd) { bd = d; best = { thing: t, prop: t.prop }; }
    });
    return best;
  }
  function wZoom(f, cx, cy) {
    var sc = W.scene, c = sc.cam, z0 = c.zoom, z1 = Math.max(3.2, Math.min(15, z0 * f)); f = z1 / z0;
    c.zoom = z1; W.zoom = z1;
    if (W.cut || f === 1) return;
    var pan = sc.pan || (sc.pan = [0, 0]);
    if (cx !== undefined && W.view) {
      var g = wGroundAt(cx, cy), dx = (g.x - c.x) * (1 - f), dz = (g.z - c.z) * (1 - f);
      c.x += dx; c.z += dz; pan[0] += dx; pan[1] += dz;
      // the place's framing offset fades as you zoom in; hold the point under the cursor still against that too
      var co = sc.camOff || [0, 0], kk = function (z) { return Math.max(0, Math.min(1, (z - 3.2) / ((sc.zoomIn || 7.5) - 3.2))); }, dk = kk(z1) - kk(z0);
      pan[0] -= co[0] * dk; pan[1] -= co[1] * dk;
    } else { var pf = f < 1 ? f : 1 / f; pan[0] *= pf; pan[1] *= pf; }   // in: you hold your place on the screen; out: the view comes back round you
    // you never zoom yourself off the screen
    var lim = z1 * 0.85, m = Math.hypot(pan[0], pan[1]); if (m > lim) { pan[0] *= lim / m; pan[1] *= lim / m; }
  }
  function wNearest() {
    var sc = W.scene, best = null, bd = 2.6;
    sc.people.concat(sc.things).forEach(function (o) { if (o.follow || (o.hidden && o.hidden())) return; var d = Math.hypot(o.x - sc.pl.x, o.z - sc.pl.z); if (d < bd) { bd = d; best = o; } });
    return best;
  }
  function wCyl(r0, r1, y0, y1, seg, ox, oz) {
    var P = [], N = [];
    ox = ox || 0; oz = oz || 0;
    for (var i = 0; i < seg; i++) {
      var a = i / seg * Math.PI * 2, b = (i + 1) / seg * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
      P.push(ox + ca * r0, y0, oz + sa * r0, ox + cb * r0, y0, oz + sb * r0, ox + cb * r1, y1, oz + sb * r1, ox + ca * r0, y0, oz + sa * r0, ox + cb * r1, y1, oz + sb * r1, ox + ca * r1, y1, oz + sa * r1);
      var na = [ca, 0.25, sa], nb = [cb, 0.25, sb]; N.push.apply(N, na.concat(nb, nb, na, nb, na));
      P.push(ox, y1, oz, ox + ca * r1, y1, oz + sa * r1, ox + cb * r1, y1, oz + sb * r1); N.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
    }
    var U = new Float32Array(P.length / 3 * 2);
    return wBuf(new Float32Array(P), new Float32Array(N), U);
  }
  function wFigure() {
    var parts = [
      [wCyl(0.34, 0.2, 0, 1.15, 7), [0.22, 0.25, 0.31]],
      [wCyl(0.21, 0.17, 1.15, 1.42, 7), [0.25, 0.28, 0.34]],
      [wCyl(0.07, 0.07, 1.42, 1.5, 6), [0.62, 0.5, 0.42]],
      [wCyl(0.12, 0.11, 1.5, 1.7, 7), [0.66, 0.53, 0.44]],
      [wCyl(0.13, 0.12, 1.66, 1.92, 7), [0.12, 0.12, 0.14]],
      [wCyl(0.135, 0.135, 1.86, 1.89, 7), [0.72, 0.58, 0.3]],
      [wCyl(0.09, 0.09, 0.62, 1.0, 6, 0.27, 0.05), [0.42, 0.44, 0.46]],
      [wCyl(0.075, 0.07, 0.75, 1.3, 5, -0.27, 0), [0.2, 0.22, 0.27]],
      [wCyl(0.075, 0.07, 0.6, 1.3, 5, 0.25, 0.08), [0.2, 0.22, 0.27]]
    ];
    return parts.map(function (p) { p[0].c = p[1]; return p[0]; });
  }
  function wDisc() {
    var P = [], N = [], U = [], n = 10;
    for (var i = 0; i < n; i++) {
      var a = i / n * Math.PI * 2, b = (i + 1) / n * Math.PI * 2;
      P.push(0, 0, 0, Math.cos(b), 0, Math.sin(b), Math.cos(a), 0, Math.sin(a));
      for (var j = 0; j < 3; j++) { N.push(0, 1, 0); U.push(0, 0); }
    }
    return wBuf(new Float32Array(P), new Float32Array(N), new Float32Array(U));
  }
  function mNew() { return { P: [], N: [], U: [] }; }
  function mTri(m, a, b, c, ua, ub, uc) {
    var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz) || 1;
    [a, b, c].forEach(function (p) { m.P.push(p[0], p[1], p[2]); m.N.push(nx / l, ny / l, nz / l); });
    m.U.push(ua[0], ua[1], ub[0], ub[1], uc[0], uc[1]);
  }
  function mQuad(m, a, b, c, d, uw, uh) { mTri(m, a, b, c, [0, 0], [uw, 0], [uw, uh]); mTri(m, a, c, d, [0, 0], [uw, uh], [0, uh]); }
  function mBox(m, x0, y0, z0, x1, y1, z1, t) {
    t = t || 1; var w = (x1 - x0) / t, h = (y1 - y0) / t, d = (z1 - z0) / t;
    mQuad(m, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], w, h);
    mQuad(m, [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], w, h);
    mQuad(m, [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], d, h);
    mQuad(m, [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], d, h);
    mQuad(m, [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], w, d);
  }
  // a frustum (earthworks, mounds): bottom rect, top rect inset by k
  function mMound(m, x0, z0, x1, z1, h, k, t) {
    t = t || 2; var a = [x0, 0, z1], b = [x1, 0, z1], c = [x1, 0, z0], d = [x0, 0, z0];
    var A = [x0 + k, h, z1 - k], B = [x1 - k, h, z1 - k], C = [x1 - k, h, z0 + k], D = [x0 + k, h, z0 + k];
    var w = (x1 - x0) / t, dd = (z1 - z0) / t, s = Math.hypot(k, h) / t;
    mQuad(m, a, b, B, A, w, s); mQuad(m, b, c, C, B, dd, s); mQuad(m, c, d, D, C, w, s); mQuad(m, d, a, A, D, dd, s); mQuad(m, A, B, C, D, w, dd);
  }
  function mCyl(m, cx, cy, cz, r0, r1, h, seg, axis, t, cap) {
    t = t || 1;
    var pt = function (a, r, y) { var u = Math.cos(a) * r, v = Math.sin(a) * r; return axis === 'x' ? [cx + y, cy + u, cz + v] : axis === 'z' ? [cx + u, cy + v, cz + y] : [cx + u, cy + y, cz + v]; };
    for (var i = 0; i < seg; i++) {
      var a = i / seg * Math.PI * 2, b = (i + 1) / seg * Math.PI * 2, uw = (2 * Math.PI * Math.max(r0, r1) / seg) / t;
      mQuad(m, pt(b, r0, 0), pt(a, r0, 0), pt(a, r1, h), pt(b, r1, h), uw, h / t);
      if (cap && r1 > 0) mTri(m, pt(a, r1, h), pt(b, r1, h), pt(0, 0, h), [0, 0], [r1 / t, 0], [0, r1 / t]);
      if (cap && r0 > 0) mTri(m, pt(b, r0, 0), pt(a, r0, 0), pt(0, 0, 0), [0, 0], [r0 / t, 0], [0, r0 / t]);
    }
  }
  function mRock(m, cx, cy, cz, r, seed, flat) {
    var rs = function (i) { var x = Math.sin(seed * 91.7 + i * 12.9) * 43758.5; return x - Math.floor(x); };
    var rows = 4, seg = 7, P = [];
    for (var j = 0; j <= rows; j++) { P.push([]); for (var i = 0; i < seg; i++) {
      var ph = j / rows * Math.PI, th = i / seg * Math.PI * 2, k = 0.75 + rs(j * 10 + i) * 0.45;
      if (j === 0 || j === rows) k = 1;
      P[j].push([cx + Math.sin(ph) * Math.cos(th) * r * k, cy + Math.max(-0.1, Math.cos(ph)) * r * (flat || 0.7) * k, cz + Math.sin(ph) * Math.sin(th) * r * k]);
    } }
    for (var j2 = 0; j2 < rows; j2++) for (var i2 = 0; i2 < seg; i2++) {
      var a = P[j2][i2], b = P[j2][(i2 + 1) % seg], c = P[j2 + 1][(i2 + 1) % seg], d = P[j2 + 1][i2];
      mTri(m, a, d, c, [0, 0], [0, 1], [1, 1]); mTri(m, a, c, b, [0, 0], [1, 1], [1, 0]);
    }
  }
  function wProcModel(parts) {
    var mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9], out = { parts: [] };
    parts.forEach(function (p) {
      for (var i = 0; i < p.m.P.length; i++) { var a = i % 3; mn[a] = Math.min(mn[a], p.m.P[i]); mx[a] = Math.max(mx[a], p.m.P[i]); }
      var b = wBuf(new Float32Array(p.m.P), new Float32Array(p.m.N), new Float32Array(p.m.U));
      b.c = p.c || [1, 1, 1]; b.t = p.t ? wTex(p.t, W3D.tex[p.t]) : null; b.unlit = p.unlit;
      out.parts.push(b);
    });
    out.mn = mn; out.sz = [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]]; out.w = out.sz[0]; out.h = out.sz[1]; out.d = out.sz[2];
    return out;
  }
  function pp(fn, t, c, unlit) { var m = mNew(); fn(m); return { m: m, t: t, c: c, unlit: unlit }; }
  var WOOD = [0.62, 0.52, 0.42], DARKW = [0.42, 0.34, 0.27];
  var PROC = {
    palisade: function () { return [pp(function (m) { for (var i = 0; i < 8; i++) { var x = i * 0.42, h = 2.8 + ((i * 37) % 5) * 0.08; mCyl(m, x, 0, 0, 0.21, 0.21, h, 6, 'y', 1); mCyl(m, x, h, 0, 0.21, 0.02, 0.45, 6, 'y', 1); } mBox(m, -0.2, 1.9, -0.32, 3.15, 2.1, -0.2, 1); }, 't_bark', [0.8, 0.7, 0.6])]; },
    tent: function () { return [
      pp(function (m) { var w = 1.5, L = 3.4, h = 2; mQuad(m, [-w, 0, 0], [-w, 0, L], [0, h, L], [0, h, 0], L / 2, 1.2); mQuad(m, [0, h, 0], [0, h, L], [w, 0, L], [w, 0, 0], L / 2, 1.2); mTri(m, [w, 0, L], [0, h, L], [-w, 0, L], [0, 0], [0.5, 1], [1, 0]); mTri(m, [-w, 0, 0], [0, h, 0], [w, 0, 0], [0, 0], [0.5, 1], [1, 0]); }, 't_canvas', [0.82, 0.78, 0.66]),
      pp(function (m) { mTri(m, [0.55, 0, L3()], [0, 1.25, L3()], [-0.55, 0, L3()], [0, 0], [0.5, 1], [1, 0]); }, null, [0.08, 0.07, 0.06], true)]; function L3() { return 3.41; } },
    bunker: function () { return [
      pp(function (m) { mMound(m, -2.6, -2, 2.6, 2, 1.7, 0.9, 1.5); }, 't_earth', [0.75, 0.7, 0.62]),
      pp(function (m) { mBox(m, -1.6, 0.85, 1.55, 1.6, 1.05, 1.62, 1); mBox(m, -0.55, 0, 1.3, 0.55, 1.2, 1.7, 1); }, null, [0.05, 0.05, 0.05], true),
      pp(function (m) { mBox(m, -0.7, 0, 1.25, -0.55, 1.35, 1.75, 0.5); mBox(m, 0.55, 0, 1.25, 0.7, 1.35, 1.75, 0.5); mBox(m, -0.75, 1.3, 1.2, 0.75, 1.45, 1.78, 0.5); }, 't_planks', DARKW)]; },
    berm: function () { return [pp(function (m) { mMound(m, -4, -0.9, 4, 0.9, 1.1, 0.6, 1.5); }, 't_earth', [0.72, 0.67, 0.58])]; },
    sandbags: function () { return [pp(function (m) { for (var r = 0; r < 3; r++) for (var i = 0; i < 6; i++) { var x = i * 0.52 + (r % 2) * 0.26; mBox(m, x, r * 0.26, 0, x + 0.48, r * 0.26 + 0.25, 0.4, 0.5); } }, 't_sand', [0.85, 0.8, 0.68])]; },
    cannon: function () { return [
      pp(function (m) { mCyl(m, 0, 0.75, -0.2, 0.17, 0.12, 2.0, 8, 'z', 0.6, true); mCyl(m, 0, 0.75, -0.5, 0.22, 0.22, 0.32, 8, 'z', 0.6, true); }, 't_iron', [0.45, 0.45, 0.45]),
      pp(function (m) { mCyl(m, -0.42, 0.55, 0, 0.55, 0.55, 0.1, 10, 'x', 0.5, true); mCyl(m, 0.32, 0.55, 0, 0.55, 0.55, 0.1, 10, 'x', 0.5, true); mBox(m, -0.28, 0.35, -1.6, 0.28, 0.65, 0.3, 0.5); }, 't_planks', DARKW)]; },
    cart: function () { return [
      pp(function (m) { mBox(m, -0.7, 0.6, -1.3, 0.7, 0.75, 1.3, 0.6); mBox(m, -0.7, 0.75, -1.3, -0.62, 1.1, 1.3, 0.6); mBox(m, 0.62, 0.75, -1.3, 0.7, 1.1, 1.3, 0.6); mBox(m, -0.5, 0.55, 1.3, -0.42, 0.65, 2.9, 0.6); mBox(m, 0.42, 0.55, 1.3, 0.5, 0.65, 2.9, 0.6); }, 't_planks', WOOD),
      pp(function (m) { mCyl(m, -0.85, 0.6, -0.2, 0.6, 0.6, 0.1, 10, 'x', 0.5, true); mCyl(m, 0.75, 0.6, -0.2, 0.6, 0.6, 0.1, 10, 'x', 0.5, true); }, 't_planks', DARKW)]; },
    coffin: function () { return [pp(function (m) { mBox(m, -0.35, 0, -1, 0.35, 0.5, 1, 0.5); }, 't_planks', [0.85, 0.75, 0.55]), pp(function (m) { mBox(m, -0.37, 0.2, -0.3, 0.37, 0.28, -0.22, 1); mBox(m, -0.37, 0.2, 0.4, 0.37, 0.28, 0.48, 1); }, null, [0.06, 0.06, 0.06])]; },
    millwheel: function () { return [pp(function (m) { mCyl(m, -0.3, 0, 0, 1.8, 1.8, 0.12, 14, 'x', 0.8); mCyl(m, 0.25, 0, 0, 1.8, 1.8, 0.12, 14, 'x', 0.8); for (var i = 0; i < 12; i++) { var a = i / 12 * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a); var y = c * 1.7, z = sn * 1.7; mBox(m, -0.3, y - 0.05, z - 0.25, 0.37, y + 0.05, z + 0.25, 0.5); } mCyl(m, -0.6, 0, 0, 0.2, 0.2, 1.3, 6, 'x', 0.5, true); }, 't_planks', DARKW)]; },
    stall: function () { return [
      pp(function (m) { [[-1.2, -0.6], [1.2, -0.6], [-1.2, 0.6], [1.2, 0.6]].forEach(function (q) { mBox(m, q[0] - 0.06, 0, q[1] - 0.06, q[0] + 0.06, q[1] > 0 ? 2.2 : 1.8, q[1] + 0.06, 0.5); }); mBox(m, -1.25, 0.8, -0.65, 1.25, 0.9, 0.2, 0.6); }, 't_planks', WOOD),
      pp(function (m) { mQuad(m, [-1.35, 1.75, -0.85], [1.35, 1.75, -0.85], [1.35, 2.25, 0.75], [-1.35, 2.25, 0.75], 2, 1.2); mQuad(m, [1.35, 1.75, -0.85], [-1.35, 1.75, -0.85], [-1.35, 2.25, 0.75], [1.35, 2.25, 0.75], 2, 1.2); }, 't_canvas', [0.7, 0.45, 0.35])]; },
    rock1: function () { return [pp(function (m) { mRock(m, 0, 0, 0, 0.9, 1); }, 't_stone', [0.7, 0.7, 0.68])]; },
    rock2: function () { return [pp(function (m) { mRock(m, 0, 0, 0, 1.4, 2, 0.5); mRock(m, 1.1, 0, 0.6, 0.6, 3); }, 't_stone', [0.65, 0.66, 0.62])]; },
    whitestones: function () { return [pp(function (m) { for (var i = 0; i < 11; i++) { var a = i / 11 * Math.PI * 2; mRock(m, Math.cos(a) * 1.2, 0, Math.sin(a) * 1.2, 0.18, i + 5); } }, 't_stone', [1.25, 1.25, 1.2])]; },
    stump: function () { return [pp(function (m) { mCyl(m, 0, 0, 0, 0.32, 0.26, 0.6, 7, 'y', 0.6, true); }, 't_bark', [0.7, 0.62, 0.55])]; },
    splinters: function () { return [pp(function (m) { mCyl(m, 0, 0, 0, 0.28, 0.12, 2.2, 5, 'y', 0.6, true); mCyl(m, 0.1, 1.6, 0, 0.1, 0.02, 0.9, 4, 'x', 0.5); }, 't_charred', [0.6, 0.55, 0.5])]; },
    pole: function () { return [pp(function (m) { mCyl(m, 0, 0, 0, 0.06, 0.05, 2.3, 5, 'y', 0.5, true); }, 't_bark', [0.8, 0.75, 0.65]), pp(function (m) { mBox(m, -0.12, 2.0, -0.04, 0.12, 2.45, 0.04, 1); }, null, [0.08, 0.08, 0.1])]; },
    signpost: function () { return [pp(function (m) { mCyl(m, 0, 0, 0, 0.1, 0.09, 2.6, 6, 'y', 0.5, true); mBox(m, -0.05, 2.1, -0.08, 1.0, 2.35, 0.08, 0.5); mBox(m, -0.95, 1.7, -0.08, 0.05, 1.95, 0.08, 0.5); }, 't_planks', WOOD)]; },
    barrel: function () { return [pp(function (m) { mCyl(m, 0, 0, 0, 0.36, 0.42, 0.45, 8, 'y', 0.5); mCyl(m, 0, 0.45, 0, 0.42, 0.36, 0.45, 8, 'y', 0.5, true); }, 't_planks', [0.62, 0.42, 0.32])]; },
    barrels: function () { return [pp(function (m) { [[0, 0, 0], [0.85, 0, 0.1], [0.42, 0, 0.75], [0.42, 0.9, 0.3]].forEach(function (q) { mCyl(m, q[0], q[1], q[2], 0.36, 0.42, 0.45, 8, 'y', 0.5); mCyl(m, q[0], q[1] + 0.45, q[2], 0.42, 0.36, 0.45, 8, 'y', 0.5, true); }); }, 't_planks', [0.55, 0.36, 0.28])]; },
    block: function () { return [pp(function (m) { mCyl(m, 0, 0, 0, 0.42, 0.42, 0.75, 8, 'y', 0.5, true); }, 't_bark', [0.75, 0.65, 0.55]), pp(function (m) { mBox(m, -0.05, 0.75, -0.05, 0.05, 1.2, 0.05, 0.3); mBox(m, -0.05, 1.1, -0.2, 0.05, 1.25, 0.05, 0.3); }, 't_iron', [0.6, 0.6, 0.6])]; },
    fire: function () { return [pp(function (m) { for (var i = 0; i < 8; i++) { var a = i / 8 * Math.PI * 2; mRock(m, Math.cos(a) * 0.65, 0, Math.sin(a) * 0.65, 0.16, i + 20); } }, 't_stone', [0.55, 0.55, 0.52]), pp(function (m) { mCyl(m, 0, 0, 0, 0.42, 0.0, 0.7, 6, 'y', 1); }, null, [1.0, 0.55, 0.18], true), pp(function (m) { mCyl(m, 0, 0, 0, 0.25, 0.0, 0.45, 5, 'y', 1); }, null, [1.0, 0.85, 0.45], true)]; },
    ruinwall: function () { return [pp(function (m) { mBox(m, 0, 0, 0, 4, 2.6, 0.5, 1); mBox(m, 4, 0, 0, 5.2, 1.4, 0.5, 1); mBox(m, 5.2, 0, 0, 7.5, 3.2, 0.5, 1); }, 't_stone', [0.72, 0.7, 0.65])]; },
    gable: function () { return [pp(function (m) { mBox(m, 0, 0, 0, 1.2, 3.4, 0.5, 1); mBox(m, 3.8, 0, 0, 5, 3.4, 0.5, 1); mBox(m, 0, 3.4, 0, 5, 4.2, 0.5, 1); mBox(m, 1.2, 4.2, 0, 3.8, 5, 0.5, 1); }, 't_stone', [0.72, 0.7, 0.65])]; },
    altar: function () { return [pp(function (m) { mBox(m, -0.9, 0, -0.4, 0.9, 0.95, 0.4, 0.6); mBox(m, -1.0, 0.95, -0.5, 1.0, 1.08, 0.5, 0.6); }, 't_stone', [0.85, 0.82, 0.76])]; },
    banner: function () { return [pp(function (m) { mBox(m, -0.04, 0, -0.04, 0.04, 3, 0.04, 0.5); }, 't_planks', DARKW), pp(function (m) { mQuad(m, [0.04, 2.9, 0], [1.2, 2.8, 0.05], [1.15, 1.9, 0.1], [0.04, 2.0, 0], 1, 1); mQuad(m, [0.04, 2.0, 0], [1.15, 1.9, 0.1], [1.2, 2.8, 0.05], [0.04, 2.9, 0], 1, 1); }, 't_canvas', [0.6, 0.18, 0.16])]; },
    counter: function () { return [pp(function (m) { mBox(m, -1.6, 0, -0.4, 1.6, 1.0, 0.4, 0.6); }, 't_planks', WOOD), pp(function (m) { mBox(m, -1.7, 0, -1.4, 1.7, 2.4, -1.25, 0.6); mBox(m, -1.7, 0.9, -1.4, 1.7, 0.95, -1.0, 0.6); mBox(m, -1.7, 1.6, -1.4, 1.7, 1.65, -1.0, 0.6); }, 't_planks', DARKW),
      pp(function (m) { for (var r = 0; r < 2; r++) for (var i = 0; i < 9; i++) mCyl(m, -1.5 + i * 0.37, 0.95 + r * 0.7, -1.2, 0.1, 0.1, 0.32, 6, 'y', 0.4, true); }, null, [0.55, 0.65, 0.5])]; },
    chair: function () { return [pp(function (m) { mBox(m, -0.3, 0.45, -0.3, 0.3, 0.52, 0.3, 0.4); [[-0.27, -0.27], [0.27, -0.27], [-0.27, 0.27], [0.27, 0.27]].forEach(function (q) { mBox(m, q[0] - 0.03, 0, q[1] - 0.03, q[0] + 0.03, 0.45, q[1] + 0.03, 0.4); }); mBox(m, -0.3, 0.52, -0.3, 0.3, 1.2, -0.25, 0.4); }, 't_planks', [0.7, 0.3, 0.25])]; },
    clock: function () { return [pp(function (m) { mBox(m, -0.15, 0, -0.15, 0.15, 3.2, 0.15, 0.5); }, 't_planks', DARKW), pp(function (m) { mCyl(m, 0, 2.9, 0.16, 0.42, 0.42, 0.06, 12, 'z', 1, true); }, null, [0.9, 0.86, 0.72], true), pp(function (m) { mBox(m, -0.02, 2.88, 0.23, 0.02, 3.2, 0.25, 1); mBox(m, -0.02, 2.88, 0.23, 0.22, 2.92, 0.25, 1); }, null, [0.05, 0.05, 0.05], true)]; },
    lantern: function () { return [pp(function (m) { mBox(m, -0.12, 0, -0.12, 0.12, 0.3, 0.12, 1); }, null, [1.0, 0.85, 0.4], true)]; },
    bridge: function () { return [pp(function (m) { mBox(m, -1.4, 0.5, -6, 1.4, 0.7, 6, 0.8); for (var z = -6; z <= 6; z += 2) { mBox(m, -1.5, -0.4, z - 0.15, -1.2, 1.5, z + 0.15, 0.5); mBox(m, 1.2, -0.4, z - 0.15, 1.5, 1.5, z + 0.15, 0.5); } mBox(m, -1.5, 1.3, -6, -1.35, 1.42, 6, 0.8); mBox(m, 1.35, 1.3, -6, 1.5, 1.42, 6, 0.8); }, 't_planks', DARKW)]; },
    weir: function () { return [pp(function (m) { for (var i = 0; i < 9; i++) mRock(m, i * 0.95, 0, (i % 2) * 0.3, 0.42, i + 40, 0.45); }, 't_stone', [0.6, 0.62, 0.6])]; },
    hut: function () { return [pp(function (m) { mBox(m, -1.6, 0, -1.3, 1.6, 1.9, 1.3, 0.7); }, 't_bark', [0.6, 0.55, 0.48]), pp(function (m) { mQuad(m, [-1.9, 1.8, 1.6], [1.9, 1.8, 1.6], [1.9, 3, 0], [-1.9, 3, 0], 2, 1); mQuad(m, [1.9, 1.8, -1.6], [-1.9, 1.8, -1.6], [-1.9, 3, 0], [1.9, 3, 0], 2, 1); mTri(m, [1.6, 1.9, 1.3], [1.6, 1.9, -1.3], [1.6, 3, 0], [0, 0], [1, 0], [0.5, 1]); mTri(m, [-1.6, 1.9, -1.3], [-1.6, 1.9, 1.3], [-1.6, 3, 0], [0, 0], [1, 0], [0.5, 1]); }, 't_hay', [0.7, 0.62, 0.45]), pp(function (m) { mBox(m, -0.4, 0, 1.3, 0.4, 1.4, 1.34, 1); }, null, [0.07, 0.06, 0.05], true)]; },
    shed: function () { return [pp(function (m) { mBox(m, -1.4, 0, -1.1, 1.4, 1.8, 1.1, 0.6); mBox(m, -1.55, 1.8, -1.25, 1.55, 1.95, 1.25, 0.6); }, 't_planks', DARKW), pp(function (m) { mBox(m, -0.35, 0, 1.1, 0.35, 1.3, 1.14, 1); }, 't_iron', [0.5, 0.5, 0.5])]; },
    table: function () { return [pp(function (m) { mBox(m, -0.8, 0.75, -0.45, 0.8, 0.82, 0.45, 0.5); [[-0.72, -0.38], [0.72, -0.38], [-0.72, 0.38], [0.72, 0.38]].forEach(function (q) { mBox(m, q[0] - 0.04, 0, q[1] - 0.04, q[0] + 0.04, 0.75, q[1] + 0.04, 0.4); }); }, 't_planks', WOOD)]; },
    sacks: function () { return [pp(function (m) { [[0, 0], [0.62, 0.1], [0.3, 0.55], [0.3, 0.2, 0.45]].forEach(function (q) { mRock(m, q[0], q[2] || 0, q[1], 0.36, q[0] * 10 + 3, 0.9); }); }, 't_canvas', [1.15, 1.12, 1.02])]; },
    crate: function () { return [pp(function (m) { mBox(m, -0.4, 0, -0.4, 0.4, 0.8, 0.4, 0.8); }, 't_planks', [0.75, 0.62, 0.45])]; },
    raft: function () { return [pp(function (m) { for (var i = 0; i < 7; i++) mCyl(m, -1.4, 0.15, -0.9 + i * 0.3, 0.14, 0.14, 2.8, 6, 'x', 0.6, true); }, 't_bark', [0.7, 0.62, 0.52])]; },
    rope: function () { return [pp(function (m) { mCyl(m, 0, 0, 0, 0.08, 0.07, 1.9, 5, 'y', 0.5, true); mCyl(m, 0, 1.7, 0, 0.025, 0.025, 3.2, 4, 'z', 0.5); }, 't_bark', [0.75, 0.7, 0.6])]; },
    stretcher: function () { return [pp(function (m) { mBox(m, -0.35, 0.25, -1, 0.35, 0.3, 1, 0.5); }, 't_canvas', [0.7, 0.68, 0.6]), pp(function (m) { mBox(m, -0.4, 0.25, -1.2, -0.34, 0.33, 1.2, 0.5); mBox(m, 0.34, 0.25, -1.2, 0.4, 0.33, 1.2, 0.5); mBox(m, -0.3, 0.3, -0.8, 0.3, 0.45, 0.85, 0.5); }, 't_planks', DARKW)]; }
  };
  var RG = null, RG_NJ = 22;
  function wRigOk() { return typeof W3D !== 'undefined' && !!W3D.rig && !!W.gl && !W.rigOff; }
  function wRigInit() {
    if (RG) return RG.ok ? RG : null;
    RG = { ok: false };
    try {
      var R = W3D.rig, gl = W.gl;
      var VS = 'attribute vec3 aP; attribute vec3 aN; attribute vec4 aJ; attribute vec4 aWt; attribute vec2 aU; uniform mat4 uB[22]; uniform mat4 uM; uniform mat4 uVP; uniform vec2 uRes; varying vec3 vN; varying vec2 vU; varying float vD; varying vec3 vW;' +
        'void main(){ mat4 S = uB[int(aJ.x + 0.5)] * aWt.x + uB[int(aJ.y + 0.5)] * aWt.y + uB[int(aJ.z + 0.5)] * aWt.z + uB[int(aJ.w + 0.5)] * aWt.w; vec4 w = uM * (S * vec4(aP, 1.0)); vW = w.xyz; vec4 c = uVP * w; vec2 g = uRes * 0.5; c.xy = floor(c.xy / c.w * g + 0.5) / g * c.w; gl_Position = c; vN = mat3(uM) * (mat3(S) * aN); vU = aU; vD = c.z; }';
      var pr = gl.createProgram();
      gl.attachShader(pr, wShader(gl, gl.VERTEX_SHADER, VS)); gl.attachShader(pr, wShader(gl, gl.FRAGMENT_SHADER, W_FS)); gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
      RG.pr = pr;
      RG.a = { P: gl.getAttribLocation(pr, 'aP'), N: gl.getAttribLocation(pr, 'aN'), J: gl.getAttribLocation(pr, 'aJ'), Wt: gl.getAttribLocation(pr, 'aWt'), U: gl.getAttribLocation(pr, 'aU') };
      RG.u = {}; ['uB', 'uM', 'uVP', 'uRes', 'uT', 'uUseT', 'uC', 'uL', 'uFog', 'uFogR', 'uHue', 'uLit', 'uSel', 'uCam', 'uFlow', 'uFade', 'uHole', 'uA'].forEach(function (n) { RG.u[n] = gl.getUniformLocation(pr, n === 'uB' ? 'uB[0]' : n); });
      var q = wB64(R.p, Int16Array), n = wB64(R.n, Int8Array), nv = q.length / 3, P = new Float32Array(q.length), N = new Float32Array(n.length);
      for (var i = 0; i < q.length; i++) { var a = i % 3; P[i] = (q[i] + 32768) / 65535 * R.sz[a] + R.mn[a]; N[i] = n[i] / 127; }
      var mk = function (arr, tgt) { var b = gl.createBuffer(); gl.bindBuffer(tgt || gl.ARRAY_BUFFER, b); gl.bufferData(tgt || gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW); return b; };
      RG.bp = mk(P); RG.bn = mk(N); RG.bj = mk(wB64(R.jw, Uint8Array)); RG.bi = mk(wB64(R.i, Uint16Array), gl.ELEMENT_ARRAY_BUFFER);
      RG.nv = nv; RG.groups = R.groups; RG.parts = R.parts; RG.par = R.par; RG.bt = R.bt; RG.ibm = new Float32Array(R.ibm); RG.fps = R.fps;
      RG.clips = {};
      for (var k in R.clips) {
        var c = R.clips[k], qi = wB64(c.q, Int16Array), ti = wB64(c.t, Int16Array), Q = new Float32Array(c.n * RG_NJ * 4), T = new Float32Array(c.n * 3);
        for (var f = 0; f < c.n * RG_NJ; f++) {
          var x = qi[f * 3] / 32767, y = qi[f * 3 + 1] / 32767, z = qi[f * 3 + 2] / 32767;
          Q[f * 4] = x; Q[f * 4 + 1] = y; Q[f * 4 + 2] = z; Q[f * 4 + 3] = Math.sqrt(Math.max(0, 1 - x * x - y * y - z * z));
        }
        for (var j = 0; j < c.n * 3; j++) T[j] = ti[j] / 8000;
        RG.clips[k] = { n: c.n, d: c.d, Q: Q, T: T };
      }
      RG.pose = new Float32Array(RG_NJ * 4 + 3); RG.pose2 = new Float32Array(RG_NJ * 4 + 3);
      RG.G = new Float32Array(RG_NJ * 16); RG.S = new Float32Array(RG_NJ * 16); RG.L = new Float32Array(16);
      RG.ok = true;
    } catch (e) { RG.ok = false; W.rigOff = true; setTimeout(function () { throw e; }); }
    return RG.ok ? RG : null;
  }
  // one moment of one movement, as a set of joint turns (and where the hips are)
  function wRigSample(c, t, loop, out) {
    var n = c.n, f = t * RG.fps;
    if (loop) { f = f % (n - 1); if (f < 0) f += n - 1; } else f = Math.max(0, Math.min(n - 1, f));
    var i0 = Math.floor(f), i1 = Math.min(n - 1, i0 + 1), a = f - i0, Q = c.Q, o0 = i0 * RG_NJ * 4, o1 = i1 * RG_NJ * 4;
    for (var j = 0; j < RG_NJ * 4; j += 4) {
      var x0 = Q[o0 + j], y0 = Q[o0 + j + 1], z0 = Q[o0 + j + 2], w0 = Q[o0 + j + 3], x1 = Q[o1 + j], y1 = Q[o1 + j + 1], z1 = Q[o1 + j + 2], w1 = Q[o1 + j + 3];
      if (x0 * x1 + y0 * y1 + z0 * z1 + w0 * w1 < 0) { x1 = -x1; y1 = -y1; z1 = -z1; w1 = -w1; }
      out[j] = x0 + (x1 - x0) * a; out[j + 1] = y0 + (y1 - y0) * a; out[j + 2] = z0 + (z1 - z0) * a; out[j + 3] = w0 + (w1 - w0) * a;
    }
    var T = c.T, p = RG_NJ * 4;
    out[p] = T[i0 * 3] + (T[i1 * 3] - T[i0 * 3]) * a; out[p + 1] = T[i0 * 3 + 1] + (T[i1 * 3 + 1] - T[i0 * 3 + 1]) * a; out[p + 2] = T[i0 * 3 + 2] + (T[i1 * 3 + 2] - T[i0 * 3 + 2]) * a;
  }
  function wRigMix(a, b, w) {   // a = a*(1-w) + b*w, joint by joint
    for (var j = 0; j < RG_NJ * 4; j += 4) {
      var s = a[j] * b[j] + a[j + 1] * b[j + 1] + a[j + 2] * b[j + 2] + a[j + 3] * b[j + 3] < 0 ? -1 : 1;
      for (var k = 0; k < 4; k++) a[j + k] = a[j + k] * (1 - w) + b[j + k] * s * w;
    }
    var p = RG_NJ * 4; for (var m = 0; m < 3; m++) a[p + m] = a[p + m] * (1 - w) + b[p + m] * w;
  }
  // turns -> joint matrices -> the matrices the skin is drawn with
  function wRigBones(pose) {
    var G = RG.G, S = RG.S, L = RG.L, I = RG.ibm;
    for (var j = 0; j < RG_NJ; j++) {
      var o = j * 4, x = pose[o], y = pose[o + 1], z = pose[o + 2], w = pose[o + 3], l = Math.hypot(x, y, z, w) || 1; x /= l; y /= l; z /= l; w /= l;
      L[0] = 1 - 2 * (y * y + z * z); L[1] = 2 * (x * y + z * w); L[2] = 2 * (x * z - y * w); L[3] = 0;
      L[4] = 2 * (x * y - z * w); L[5] = 1 - 2 * (x * x + z * z); L[6] = 2 * (y * z + x * w); L[7] = 0;
      L[8] = 2 * (x * z + y * w); L[9] = 2 * (y * z - x * w); L[10] = 1 - 2 * (x * x + y * y); L[11] = 0;
      var p = RG.par[j], g = j * 16;
      if (p < 0) { var pp = RG_NJ * 4; L[12] = pose[pp]; L[13] = pose[pp + 1]; L[14] = pose[pp + 2]; L[15] = 1; for (var k = 0; k < 16; k++) G[g + k] = L[k]; }
      else {
        var t = RG.bt[j]; L[12] = t[0]; L[13] = t[1]; L[14] = t[2]; L[15] = 1;
        var q = p * 16;
        for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) G[g + c * 4 + r] = G[q + r] * L[c * 4] + G[q + 4 + r] * L[c * 4 + 1] + G[q + 8 + r] * L[c * 4 + 2] + G[q + 12 + r] * L[c * 4 + 3];
      }
      for (var c2 = 0; c2 < 4; c2++) for (var r2 = 0; r2 < 4; r2++) S[g + c2 * 4 + r2] = G[g + r2] * I[g + c2 * 4] + G[g + 4 + r2] * I[g + c2 * 4 + 1] + G[g + 8 + r2] * I[g + c2 * 4 + 2] + G[g + 12 + r2] * I[g + c2 * 4 + 3];
    }
    return S;
  }
  // a figure's movement state: what it is doing, what it was doing (for the blend), and anything it has been told to do once
  var RG_LOOP = { idle: 1, talk: 1, arms: 1, no: 1, rail: 1, lantern: 1, torch: 1, walk: 1, formal: 1, jog: 1, sprint: 1, carry: 1, sit: 1, sittalk: 1, crouch: 1, kneel: 1, chop: 1, drive: 1, push: 1, pidle: 1, sidle: 1, yes: 1 };
  function wRigState(p) { return p._rg || (p._rg = { c: null, t: Math.random() * 3, pc: null, pt: 0, bw: 1, acts: [] }); }
  // tell a figure to do something once: a shot, a blow, a flinch. hold keeps the last frame (falling down)
  function wRigAct(p, clip, delay, hold, w) {
    if (!p || !RG || !RG.clips || !RG.clips[clip]) { if (p) (p._rgq = p._rgq || []).push([clip, delay, hold, w]); return; }
    var st = wRigState(p); st.acts.push({ c: clip, t: -(delay || 0), hold: !!hold, w: w });
  }
  function wRigPose(p, want, dt, rate) {
    var st = wRigState(p);
    if (p._rgq) { var qq = p._rgq; p._rgq = null; qq.forEach(function (a) { wRigAct(p, a[0], a[1], a[2], a[3]); }); }
    // a one-off movement under way takes over until it ends
    var act = null;
    while (st.acts.length) {
      var a = st.acts[0]; a.t += dt;
      if (a.t < 0) break;
      var ac = RG.clips[a.c];
      if (a.t > ac.d && !a.hold) { st.acts.shift(); continue; }
      act = a; break;
    }
    var cur = act ? 'act:' + act.c : want;
    if (st.c !== cur) { st.pc = st.c; st.pt = st.t; st.ploop = st.loop; st.c = cur; st.t = act ? act.t : (st.keep && st.keep[want]) || Math.random() * 0.5; st.bw = st.pc ? 0 : 1; }
    if (!act && st.c === want) { st.t += dt * (rate || 1); } else if (act) st.t = act.t;
    st.loop = !act && !!RG_LOOP[want];
    st.pt += dt; st.bw = Math.min(1, st.bw + dt / 0.16);
    var cn = act ? act.c : want, c = RG.clips[cn] || RG.clips.idle;
    wRigSample(c, st.t, st.loop, RG.pose);
    // V135: a one-off movement played only in part (a big hit staggers you rather than throwing you flat)
    st.bt = (st.bt || 0) + dt * (rate || 1);
    if (act && act.w !== undefined && act.w < 1) {
      var bc = RG.clips[want] || RG.clips.idle; RG.pose3 = RG.pose3 || new Float32Array(RG_NJ * 4 + 3);
      wRigSample(bc, st.bt, !!RG_LOOP[want], RG.pose3);
      var ramp = Math.min(1, act.t / 0.12, Math.max(0, (RG.clips[act.c].d - act.t) / 0.2));
      wRigMix(RG.pose3, RG.pose, act.w * ramp); RG.pose.set(RG.pose3);
    }
    if (st.bw < 1 && st.pc) {
      var pn = st.pc.indexOf('act:') === 0 ? st.pc.slice(4) : st.pc, pc = RG.clips[pn];
      if (pc) { wRigSample(pc, st.pt, !!st.ploop, RG.pose2); wRigMix(RG.pose2, RG.pose, st.bw); return RG.pose2; }
    }
    return RG.pose;
  }
  var RG_IRON = [0.36, 0.37, 0.4], RG_SKIN = [0.62, 0.5, 0.42], RG_BOOT = [0.1, 0.085, 0.075], RG_HAT = [0.12, 0.11, 0.11];
  var RG_WPN = { pistol: [0.3, 0.24, 0.18], musket: [0.36, 0.25, 0.15], sabre: [0.62, 0.64, 0.68], club: [0.34, 0.25, 0.16], axe: [0.4, 0.3, 0.2], case: [0.36, 0.24, 0.14] };
  function wRigFrameUniforms() {
    var gl = W.gl, u = RG.u, fr = W.fr;
    if (!fr || RG.fno === W.fno) return;
    RG.fno = W.fno;
    gl.uniformMatrix4fv(u.uVP, false, fr.VP); gl.uniform2f(u.uRes, fr.px, fr.py); gl.uniform3fv(u.uL, fr.L); gl.uniform3fv(u.uFog, fr.fog); gl.uniform2f(u.uFogR, fr.fogR[0], fr.fogR[1]);
    gl.uniform3f(u.uCam, fr.cam[0], 0, fr.cam[2]); gl.uniform1i(u.uT, 0); if (fr.hole) gl.uniform3f(u.uHole, fr.hole[0], fr.hole[1], fr.hole[2]);
    gl.uniform1f(u.uUseT, 0); gl.uniform2f(u.uFlow, 0, 0); gl.uniform1f(u.uHue, 0); gl.uniform1f(u.uLit, 1); gl.uniform1f(u.uFade, 0); gl.uniform1f(u.uA, 1);
  }
  // draw one figure. o: c (coat), br (breeches), wc (waistcoat), head (draw the face), hat ('hat' | 'shako'), wpn, extra parts, sel, dim
  function wRigDraw(p, x, y, z, face, want, o) {
    if (!wRigOk() || !wRigInit()) return false;
    var gl = W.gl, u = RG.u, dt = W.dt || 0.016;
    var pose = wRigPose(p, want, dt, o.rate);
    if (o.stoop) wRigStoop(pose, o.stoop);
    var S = wRigBones(pose), sc = 0.94 * (o.s || 1);
    // V131: two guns: the left arm takes the right arm's aim, mirrored
    if (o.dual && W3D.rigRev && /^(act:)?(pidle|pshoot|paim)$/.test(wRigState(p).c || '')) wRigMirror();
    var M = mTRS(x, y, z, face, sc, sc, sc);
    gl.useProgram(RG.pr); wRigFrameUniforms();
    gl.uniformMatrix4fv(u.uB, false, S); gl.uniformMatrix4fv(u.uM, false, M); gl.uniform1f(u.uSel, o.sel ? 1 : 0);
    var dim = o.dim || 1, bd = o.body && wRigBody(o.body);
    if (bd) {
      // V129: a dressed body of its own (the Westphalian soldier): textured cloth, flat-coloured kit
      wRigBind(bd);
      var tx = bd.tex[o.tex] || bd.tex[Object.keys(bd.tex)[0]];
      bd.groups.forEach(function (g) {
        if ((o.drop && o.drop.indexOf(g[0]) >= 0) || (!o.head && (g[0] === 'head' || g[0] === 'Shako material'))) return;
        if (g[4] && tx && tx.ok) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tx.t); gl.uniform1f(u.uUseT, 1); gl.uniform3f(u.uC, dim, dim, dim); }
        else { var c = (o.gcol && o.gcol[g[0]]) || g[3] || o.c || [0.3, 0.3, 0.3]; gl.uniform1f(u.uUseT, 0); gl.uniform3f(u.uC, c[0] * dim, c[1] * dim, c[2] * dim); }
        gl.drawElements(gl.TRIANGLES, g[2], bd.it, g[1] * bd.ib);
      });
      gl.uniform1f(u.uUseT, 0);
      // what the soldier wears or carries that is not part of his own model: caps, hats, gold, a greatcoat's skirts, his weapon
      var more = (o.more || []).filter(function (m) { return o.head || !/^(hat|cap|capband)$/.test(m[0]); });
      if (o.hat && o.head) more.push([o.hat, o.hatc || RG_HAT]);
      if (o.wpn) { more.push([o.wpn, RG_WPN[o.wpn] || [0.3, 0.3, 0.3]]); if (RG.parts[o.wpn + '_m']) more.push([o.wpn + '_m', RG_IRON]); }
      if (more.length) {
        wRigBind(RG);
        more.forEach(function (m) { var gm = RG.parts[m[0]]; if (!gm) return; gl.uniform3f(u.uC, m[1][0] * dim, m[1][1] * dim, m[1][2] * dim); gl.drawElements(gl.TRIANGLES, gm[2], gl.UNSIGNED_SHORT, gm[1] * 2); });
      }
      wRigUnbind(); gl.useProgram(W.pr);
      var G0 = RG.G, hx0 = G0[5 * 16 + 12] * sc, hy0 = G0[5 * 16 + 13] * sc, hz0 = G0[5 * 16 + 14] * sc, cf0 = Math.cos(face), sf0 = Math.sin(face);
      p._hd = [x + hx0 * cf0 + hz0 * sf0, y + hy0, z - hx0 * sf0 + hz0 * cf0, W.fno];
      if (o.wpn === 'revolver') wRigRevolvers(o, M);
      return true;
    }
    wRigBind(RG);
    var coat = o.c || [0.3, 0.28, 0.26];
    var cols = [coat, o.br || coat.map(function (v) { return v * 0.62 + 0.03; }), RG_SKIN, RG_BOOT, RG_HAT, o.wc || coat.map(function (v) { return Math.min(1, v * 1.25 + 0.1); }), [0.3, 0.3, 0.3], RG_SKIN, coat, coat];
    // V164: what they are wearing: a shirt, a tunic, a dress; short sleeves show the forearm
    var fit = o.fit; if (fit) for (var fk in fit.cols) cols[fk] = fit.cols[fk];
    RG.groups.forEach(function (g) {
      if (g[0] === 7 && !o.head) return;
      var c = cols[g[0]]; gl.uniform3f(u.uC, c[0] * dim, c[1] * dim, c[2] * dim); gl.drawElements(gl.TRIANGLES, g[2], gl.UNSIGNED_SHORT, g[1] * 2);
    });
    var draw = function (nm, c) { var g = RG.parts[nm]; if (!g) return; gl.uniform3f(u.uC, c[0] * dim, c[1] * dim, c[2] * dim); gl.drawElements(gl.TRIANGLES, g[2], gl.UNSIGNED_SHORT, g[1] * 2); };
    if (fit) fit.parts.forEach(function (q) { draw(q[0], q[1]); });
    else if (o.skirt !== false) draw('skirt', [coat[0] * 0.92, coat[1] * 0.92, coat[2] * 0.92]);
    if (o.hat) draw(o.hat, o.hatc || RG_HAT);
    if (o.wpn) { draw(o.wpn, RG_WPN[o.wpn] || [0.3, 0.3, 0.3]); draw(o.wpn + '_m', RG_IRON); }
    (o.parts || []).forEach(function (nm) { draw(nm, RG_WPN[nm] || [0.3, 0.3, 0.3]); });
    wRigUnbind();
    gl.useProgram(W.pr);
    // where the head is now, for a portrait to sit on
    var G = RG.G, hx = G[5 * 16 + 12] * sc, hy = G[5 * 16 + 13] * sc, hz = G[5 * 16 + 14] * sc, cf = Math.cos(face), sf = Math.sin(face);
    p._hd = [x + hx * cf + hz * sf, y + hy, z - hx * sf + hz * cf, W.fno];
    if (o.wpn === 'revolver') wRigRevolvers(o, M);
    return true;
  }
  // the left arm as the right arm's mirror image (for a second pistol), joint by joint
  function wRigMirror() {
    var R = W3D.rigRev, G = RG.G, S = RG.S, I = RG.ibm, sx = [-1, 1, 1, 1], T = new Float32Array(16);
    R.mir.forEach(function (m) {
      var li = m[0] * 16, ri = m[1] * 16, C = m[2];
      for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) T[c * 4 + r] = G[ri + c * 4 + r] * sx[r] * sx[c];
      for (var c2 = 0; c2 < 4; c2++) for (var r2 = 0; r2 < 4; r2++) G[li + c2 * 4 + r2] = T[r2] * C[c2 * 4] + T[4 + r2] * C[c2 * 4 + 1] + T[8 + r2] * C[c2 * 4 + 2] + T[12 + r2] * C[c2 * 4 + 3];
      for (var c3 = 0; c3 < 4; c3++) for (var r3 = 0; r3 < 4; r3++) S[li + c3 * 4 + r3] = G[li + r3] * I[li + c3 * 4] + G[li + 4 + r3] * I[li + c3 * 4 + 1] + G[li + 8 + r3] * I[li + c3 * 4 + 2] + G[li + 12 + r3] * I[li + c3 * 4 + 3];
    });
  }
  // the revolver in the hand (or one in each), drawn as a model of its own off the hand's bone
  function wRigRevolvers(o, M) {
    var R = W3D.rigRev; if (!R || !W3D.models.revolver) return;
    if (!R.KR) { R.KR = new Float32Array(R.kr); R.KL = new Float32Array(R.kl); }
    var m = wModel('revolver'), t = o.rvTex ? wTex(o.rvTex, W3D.tex[o.rvTex]) : null;
    [[R.hr, R.KR]].concat(o.dual ? [[R.hl, R.KL]] : []).forEach(function (h) {
      var Mw = mMul(mMul(M, RG.G.subarray(h[0] * 16, h[0] * 16 + 16)), h[1]);
      m.parts.forEach(function (b) { wDraw(b, Mw, { t: t, sel: o.sel, c: o.dim ? [o.dim, o.dim, o.dim] : null }); });
    });
  }
  function wRigBind(b) {
    var gl = W.gl, a = RG.a;
    gl.bindBuffer(gl.ARRAY_BUFFER, b.bp); gl.enableVertexAttribArray(a.P); gl.vertexAttribPointer(a.P, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, b.bn); gl.enableVertexAttribArray(a.N); gl.vertexAttribPointer(a.N, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, b.bj); gl.enableVertexAttribArray(a.J); gl.vertexAttribPointer(a.J, 4, gl.UNSIGNED_BYTE, false, 8, 0);
    gl.enableVertexAttribArray(a.Wt); gl.vertexAttribPointer(a.Wt, 4, gl.UNSIGNED_BYTE, true, 8, 4);
    if (a.U >= 0) { if (b.bu) { gl.bindBuffer(gl.ARRAY_BUFFER, b.bu); gl.enableVertexAttribArray(a.U); gl.vertexAttribPointer(a.U, 2, gl.FLOAT, false, 0, 0); } else { gl.disableVertexAttribArray(a.U); gl.vertexAttrib2f(a.U, 0, 0); } }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b.bi);
  }
  function wRigUnbind() {
    var gl = W.gl, a = RG.a; gl.disableVertexAttribArray(a.J); gl.disableVertexAttribArray(a.Wt); if (a.U >= 0) gl.disableVertexAttribArray(a.U);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
  }
  // other bodies on the same bones, built the first time someone wears one
  function wRigBody(key) {
    RG.bodies = RG.bodies || {};
    if (RG.bodies[key] !== undefined) return RG.bodies[key];
    var D = W3D.rigBodies && W3D.rigBodies[key]; if (!D) return (RG.bodies[key] = null);
    try {
      var gl = W.gl, q = wB64(D.p, Int16Array), n = wB64(D.n, Int8Array), uv = wB64(D.u, Int16Array), P = new Float32Array(q.length), N = new Float32Array(n.length), U = new Float32Array(uv.length);
      for (var i = 0; i < q.length; i++) { var a = i % 3; P[i] = (q[i] + 32768) / 65535 * D.sz[a] + D.mn[a]; N[i] = n[i] / 127; }
      for (var j = 0; j < uv.length; j++) U[j] = j % 2 ? 1 - uv[j] / 4096 : uv[j] / 4096;
      var mk = function (arr, tgt) { var b = gl.createBuffer(); gl.bindBuffer(tgt || gl.ARRAY_BUFFER, b); gl.bufferData(tgt || gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW); return b; };
      var big = P.length / 3 > 65535, ext = big && gl.getExtension('OES_element_index_uint');
      if (big && !ext) return (RG.bodies[key] = null);
      var bd = { bp: mk(P), bn: mk(N), bu: mk(U), bj: mk(wB64(D.jw, Uint8Array)), bi: mk(wB64(D.i, big ? Uint32Array : Uint16Array), gl.ELEMENT_ARRAY_BUFFER), it: big ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, ib: big ? 4 : 2, groups: D.groups, tex: {} };
      for (var t in D.tex) bd.tex[t] = wTex('rig_' + key + '_' + t, D.tex[t]);
      if (D.texOf) { var src = wRigBody(D.texOf); if (src) bd.tex = src.tex; }
      return (RG.bodies[key] = bd);
    } catch (e) { setTimeout(function () { throw e; }); return (RG.bodies[key] = null); }
  }
  // how fast a figure is really going, so its feet keep pace with the ground
  function wRigSpeed(p, dt) {
    var st = wRigState(p);
    if (st.lx === undefined) { st.lx = p.x; st.lz = p.z; st.v = 0; }
    var v = dt > 0 ? Math.hypot(p.x - st.lx, p.z - st.lz) / dt : 0; st.lx = p.x; st.lz = p.z;
    if (v > 12) v = st.v;   // a jump (a scene move), not a stride
    st.v += (v - st.v) * Math.min(1, dt * 8);
    return st.v;
  }
  function wRigGait(p, moving, run, dt) {
    var v = wRigSpeed(p, dt);
    if (!moving && v < 0.25) return ['idle', 1];
    if (run || v > 4.6) return v > 6.5 ? ['sprint', Math.max(0.7, Math.min(1.6, v / 7))] : ['jog', Math.max(0.7, Math.min(1.7, v / 3.6))];
    return ['walk', Math.max(0.6, Math.min(2.1, (v || 1.4) / 1.45))];
  }
  function wRigHash(s) { s = String(s || ''); var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
  // the player: the courier's coat, the hat with its band, the case on the chest; a pistol out when it comes to that
  function wRigPlayer(pl, y, dt) {
    if (!wRigOk()) return false;
    var fast = W.keys.shift || (pl.goal && pl.goal.run), fs = W.rigFight && W.rigFight.pl;
    var g = wRigGait(pl, pl.moving, fast, dt), want = g[0];
    var pw = (fs && W.rigPlWpn && W.rigPlWpn()) || {};
    if (fs && want === 'idle') want = pw.stance || fs.stance || 'pidle';
    if (pl.sit) want = 'sit';
    var po = { c: [0.22, 0.25, 0.31], br: [0.25, 0.23, 0.2], wc: [0.42, 0.4, 0.34], head: true, hat: 'hat', wpn: fs ? (pw.wpn || 'pistol') : null, dual: fs && pw.dual, rvTex: fs && pw.rvTex, parts: ['case'], rate: g[1] };
    // V133: the courier in a soldier's kit: the Westphalian cut and belts, in his own coat's colours, his satchel still on his chest
    if (W3D.rigBodies && W3D.rigBodies.soldier_g && !W.plPlain) { po.body = 'soldier_g'; po.tex = 'courier'; po.drop = ['Shako material', 'Havresac 01'].concat(S.worn && S.worn.sabre && pw.wpn !== 'sabre' ? [] : ['Sabre briquet Material']); po.gcol = { Crosbelt: [0.58, 0.52, 0.4], Cartouchiere: [0.16, 0.12, 0.09] }; po.more = [['hat', [0.12, 0.12, 0.14]], ['case', [0.42, 0.28, 0.16]]]; po.hat = null; }
    // V148: the carter's frieze greatcoat: grey, caped, to the calf
    if (S && S.worn && S.worn.frieze_coat && has('frieze_coat') && po.drop) po.drop = po.drop.concat(['Cartouchiere', 'Crosbelt', 'Soldat torso']);   // the cartridge box and the cross-belts go under the coat
    if (S && S.worn && S.worn.frieze_coat && has('frieze_coat')) po.more = (po.more || []).concat([['coat_lining', [0.31, 0.31, 0.3]], ['coat_body', [0.41, 0.41, 0.39]], ['skirt_long', [0.4, 0.4, 0.38]], ['sleeves', [0.42, 0.42, 0.4]], ['cape', [0.45, 0.45, 0.43]], ['cape2', [0.46, 0.46, 0.44]], ['collar', [0.43, 0.43, 0.41]], ['collar_in', [0.31, 0.31, 0.3]], ['stock', [0.08, 0.08, 0.09]]]);
    if (S && S.worn && S.worn.frieze_coat && has('frieze_coat')) po.more = po.more.map(function (m) { return m[0] === 'case' ? ['case_coat', m[1]] : m; });
    // V158/V159: walking or running, the capes hang from the shoulders instead of riding on the swinging arms. The fit eases between the
    // two over about half a second as you start and stop, through five steps built into the rig
    if (S && S.worn && S.worn.frieze_coat && has('frieze_coat')) {
      var cbT = pl.moving && !W.rigFight ? 1 : 0;
      pl._cb = pl._cb === undefined ? cbT : pl._cb + Math.max(-1, Math.min(1, cbT - pl._cb)) * Math.min(1, (dt || 0.016) * 3.2);
      if (Math.abs(pl._cb - cbT) < 0.01) pl._cb = cbT;
      var cbk = Math.round(pl._cb * 4);
      po.more = po.more.map(function (m) { return m[0] === 'cape' ? ['cape_b' + cbk, m[1]] : m[0] === 'cape2' ? ['cape2_b' + cbk, m[1]] : m; });
    }
    return wRigDraw(pl, pl.x, y, pl.z, pl.face, want, po);
  }
  // V129: who wears the coat. The Crown's line in blue facings, the Provost's men in red, deserters in what is left of green
  var RG_KIT = ['Havresac 01', 'Cartouchiere', 'Crosbelt'];
  var RG_UNI = { red: ['lisle', 'mott', 'p1', 'p2', 'p3', 'hcorp', 'h1', 'h2', 'nhc', 'nh1', 'nh2', 'fp1', 'fp2', 'corvane'], blue: ['skerry', 'pike', 'coyle', 'drill', 'dunmore', 'hesk', 'bridge', 'ostrey', 'tallis', 'pell', 'loader', 'gunner'], green: ['tobin', 'd1', 'd2'] };
  var RG_OFFICER = { lisle: 1, corvane: 1, ostrey: 1, tallis: 1 };
  function wRigUniform(id, name) {
    var t = null;
    for (var k in RG_UNI) if (RG_UNI[k].indexOf(id) >= 0) t = k;
    if (!t && name) t = /deserter/i.test(name) ? 'green' : /provost/i.test(name) ? 'red' : /\b(sergeant|corporal|sentry|captain|major|lieutenant|private|trooper)\b/i.test(name) ? 'blue' : null;
    if (!t) return null;
    var officer = RG_OFFICER[id] || (name && /captain|major|marshal|lieutenant/i.test(name)), h = wRigHash(id + (name || ''));
    var GOLD = [0.66, 0.52, 0.22], gold = officer ? [['epaulette_l', GOLD], ['epaulette_r', GOLD], ['gorget', [0.7, 0.6, 0.32]]] : [];
    // deserters: the Crown's coat with the facings gone dull, no shako, no pack; a forage cap or whatever hat they could find
    if (t === 'green') return { body: h % 2 ? 'soldier' : 'soldier_g', tex: 'green', drop: ['Shako material', 'Havresac 01'], dim: 0.85, more: h % 3 ? [['cap', [0.15, 0.18, 0.14]], ['capband', [0.42, 0.36, 0.2]]] : [['hat', [0.2, 0.17, 0.13]]] };
    // the Provost's men: trousers; the riders in greatcoats; officers in gold
    if (t === 'red') {
      var rider = name && /rider|trooper|corporal/i.test(name) && !officer;
      return { body: 'soldier', tex: 'red', drop: officer ? RG_KIT : rider ? ['Havresac 01'] : null, more: gold.concat(rider ? [['skirt', [0.3, 0.29, 0.27]]] : []) };
    }
    // the Crown's line: gaiters; off duty (not in a fight) a forage cap instead of the shako
    var off = !W.rigFight;
    return { body: 'soldier_g', tex: 'blue', drop: (officer ? RG_KIT : []).concat(off ? ['Shako material'] : []), more: gold.concat(off ? [['cap', [0.12, 0.15, 0.24]], ['capband', [0.64, 0.52, 0.24]]] : []) };
  }
  // someone you can talk to: the body under the portrait (or the whole man, with portraits off)
  var RG_PEOPLE = { axeman: { wpn: 'axe', idle: 'idle' }, ring: { idle: 'sit' } };
  function wRigPerson(p, y, face, sel, heads, dt) {
    if (!wRigOk()) return false;
    var cfg = RG_PEOPLE[p.id] || {}, h = wRigHash(p.id), g = wRigGait(p, p.moving, p.run, dt), want = g[0];
    if (want === 'idle') want = p.sit ? 'sit' : (p.rgIdle || cfg.idle || ['idle', 'idle', 'arms', 'idle', 'talk'][h % 5]);
    if (W.hover && W.hover.person === p && want === 'idle') want = 'talk';
    var un = p.rgUni !== undefined ? p.rgUni : (p.rgUni = wRigUniform(p.id, p.name));
    var o = { c: p.coat, head: !heads, hat: heads ? null : (h % 3 ? 'hat' : null), sel: sel, wpn: cfg.wpn, rate: g[1] };
    if (un) for (var k in un) o[k] = un[k]; else wDress(p, o, h, true);
    if (o.fit && o.fit.holds && /^(arms|talk|no|yes|rail)$/.test(want)) want = 'idle';
    return wRigDraw(p, p.x, y, p.z, face, want, o);
  }
  // everyone else in the world, and the men you fight
  function wRigExtra(p, y, face, dt) {
    if (!wRigOk()) return false;
    var h = p._rgh !== undefined ? p._rgh : (p._rgh = wRigHash((p.id || '') + p.hue + Math.round((p.home ? p.home[0] : p.x) * 10))), want, rate = 1;
    if (p.down) want = 'death';
    else if (p.flee) { want = 'sprint'; rate = 1.1; }
    else {
      var g = wRigGait(p, p.walk && !!p.goal, false, dt); want = g[0]; rate = g[1];
      if (p.goal && p.goal.back && want === 'walk') rate = -rate;
      if (want === 'idle') want = p.sit ? 'sit' : p.rgStance || p.rgIdle || ['idle', 'arms', 'idle', 'talk', 'idle', 'arms', 'idle'][h % 7];
      if (p.mounted) want = 'drive';
    }
    if (p.down && !wRigState(p).fell) { wRigState(p).fell = 1; wRigAct(p, 'death', 0, true); }
    if (!p.down && wRigState(p).fell) { wRigState(p).fell = 0; wRigState(p).acts = []; }
    var un = p.rgUni !== undefined ? p.rgUni : (p.rgUni = p.cast || !p.id ? null : wRigUniform(p.id, null));
    if (un) { var o2 = { c: p.coat, head: true, sel: !!p.sel, wpn: p.rgWpn, dual: p.rgDual, rvTex: p.rgRvTex, rate: rate }; for (var k2 in un) o2[k2] = un[k2]; return wRigDraw(p, p.x, y, p.z, face, want, o2); }
    var oe = { c: p.coat, head: true, hat: p.rgHat !== undefined ? p.rgHat : (h % 4 === 0 ? null : h % 4 === 3 && p.cast ? 'shako' : 'hat'), sel: !!p.sel, wpn: p.rgWpn, dual: p.rgDual, rvTex: p.rgRvTex, rate: rate };
    wDress(p, oe, h, false);
    if (oe.fit && oe.fit.holds && /^(arms|talk|no|yes|rail)$/.test(want)) want = 'idle';   // a stick or a basket in hand: stand easy
    return wRigDraw(p, p.x, y, p.z, face, want, oe);
  }

  // ===================================================================================================
  // V164: EVERYDAY CLOTHES. Townsfolk no longer all wear the same coat: men in coats, in waistcoats over shirtsleeves, in shirts
  // with the sleeves rolled, in work tunics or smocks, in long weather coats; women in dresses, some with an apron, a shawl or a
  // head-kerchief. The Quarter Cut wear an oxblood neckerchief and an armband of the same, so you can pick them out of a crowd.
  // ===================================================================================================
  var RG_LINEN = [[0.8, 0.76, 0.66], [0.72, 0.7, 0.64], [0.84, 0.8, 0.7], [0.7, 0.64, 0.54]];
  var RG_WOOL = [[0.36, 0.3, 0.24], [0.3, 0.32, 0.28], [0.4, 0.34, 0.26], [0.26, 0.27, 0.3], [0.42, 0.38, 0.3]];
  var RG_SCARF = [[0.92, 0.9, 0.84], [0.22, 0.27, 0.42], [0.5, 0.22, 0.16], [0.3, 0.38, 0.26], [0.88, 0.84, 0.7], [0.36, 0.26, 0.34]];
  var RG_MEN = { karrow: 1, keeper: 1, teamster: 1, cooper: 1, tam: 1, boy: 1, milky: 1, r1: 1, r2: 1, r3: 1, hobb: 1, nim: 1, ring: 1, axeman: 1, fowler: 1, magpie: 1, dice: 1, baker: 1, bell: 1, weeper: 1 };
  var RG_WOMEN = { marl: 1, quill: 1, nell: 1, miller: 1, mira: 1, orla: 1, senna: 1, ines: 1 };
  var RG_QC = { hobb: 1, nim: 1, cooper: 1, teamster: 1, ring: 1 };
  var RG_QC_RED = [0.5, 0.09, 0.07];
  // trades that dress for the work
  var RG_FIT_ID = { baker: 'shirt_apron', cooper: 'rolled_apron', axeman: 'rolled', teamster: 'greatcoat', marl: 'dress_apron', quill: 'dress_shawl', nell: 'dress_shawl', miller: 'dress_apron', magpie: 'waistcoat', dice: 'shirt', tam: 'tunic', hobb: 'waistcoat', nim: 'rolled', ring: 'coat', bell: 'shirt_apron' };
  var RG_FITS_MEN = ['coat', 'waistcoat', 'shirt', 'rolled', 'tunic', 'tunic_rolled', 'greatcoat', 'coat', 'waistcoat'];
  var RG_FITS_WOMEN = ['dress', 'dress_apron', 'dress_shawl', 'dress_short', 'dress_apron'];
  var RG_FIT_NAMES = { coat: 'Coat', waistcoat: 'Waistcoat and shirtsleeves', shirt: 'Work shirt', rolled: 'Shirt, sleeves rolled', shirt_apron: 'Shirt and apron', rolled_apron: 'Sleeves rolled, apron', tunic: 'Work tunic', tunic_rolled: 'Tunic, sleeves rolled', greatcoat: 'Weather coat', dress: 'Dress', dress_apron: 'Dress and apron', dress_shawl: 'Dress and shawl', dress_short: 'Dress, short sleeves', plain: 'Plain coat (old look)' };
  function wRigFemale(p, h, named) {
    if (p.rgFemale !== undefined) return !!p.rgFemale;
    if (RG_WOMEN[p.id]) return true;
    if (RG_MEN[p.id]) return false;
    if (named) return !!RG_WOMEN[p.id] || /\b(wife|widow|mother|goodwife|girl|woman|lady|maid|sister|dame|granny)\b/i.test(p.name || '');
    // townsfolk: about two in five are women, but not the men who fight, nor those sat drinking with the gang
    if (p.cast || p.rgWpn || /^qcdrink/.test(p.id || '')) return false;
    return (h >> 3) % 5 < 2;
  }
  function wMix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function wSc(a, k) { return [Math.min(1, a[0] * k), Math.min(1, a[1] * k), Math.min(1, a[2] * k)]; }
  function wDress(p, o, h, named) {
    if (p.rgOutfit === 'plain') return;
    var f = p._fit;
    if (!f || f.k !== (p.rgOutfit || '') ) f = p._fit = wFitFor(p, o.c || [0.3, 0.28, 0.26], h, named);
    o.fit = f;
    if (f.s) o.s = f.s; if (f.stoop) o.stoop = f.stoop;
    if (o.head) { if (f.hat !== undefined && p.rgHat === undefined) { o.hat = f.hat; o.hatc = f.hatc; } }
  }
  function wFitFor(p, coat, h, named) {
    var female = wRigFemale(p, h, named), qc = !!RG_QC[p.id] || /^qcdrink/.test(p.id || '');
    var kind = p.rgOutfit || RG_FIT_ID[p.id] || (female ? RG_FITS_WOMEN : RG_FITS_MEN)[(h >> 2) % (female ? RG_FITS_WOMEN.length : RG_FITS_MEN.length)];
    var linen = RG_LINEN[(h >> 5) % RG_LINEN.length], wool = RG_WOOL[(h >> 4) % RG_WOOL.length], skin = RG_SKIN;
    var cols = {}, parts = [], hat, hatc;
    var top = coat, dark = wSc(coat, 0.72);
    var setTop = function (c, sleeve, fore) { cols[0] = c; cols[8] = sleeve || c; cols[9] = fore || sleeve || c; };
    if (/^dress/.test(kind)) {
      var dc = wMix(wSc(coat, 1.35), [0.5, 0.42, 0.36], 0.25);
      setTop(dc, kind === 'dress_short' ? dc : linen, kind === 'dress_short' ? skin : (h % 2 ? linen : dc));
      cols[5] = wSc(dc, 0.8); cols[1] = wSc(dc, 0.85);
      parts.push(['dress', wSc(dc, 0.94)]);
      if (kind === 'dress_apron') parts.push(['apron', linen]);
      if (kind === 'dress_shawl') parts.push(['cape2_b0', wool]);
      hat = 'headscarf'; hatc = RG_SCARF[(h >> 6) % RG_SCARF.length];
    } else if (kind === 'waistcoat') { setTop(coat, linen, linen); cols[5] = wSc(coat, 0.85); hat = h % 3 ? 'flatcap' : 'hat'; hatc = h % 3 ? wool : RG_HAT; }
    else if (kind === 'shirt' || kind === 'shirt_apron') { setTop(linen); cols[5] = wSc(linen, 0.9); cols[1] = wSc(wool, 0.9); if (kind === 'shirt_apron') parts.push(['apron', [0.86, 0.84, 0.78]]); hat = h % 2 ? 'flatcap' : null; hatc = wool; }
    else if (kind === 'rolled' || kind === 'rolled_apron') { setTop(linen, linen, skin); cols[5] = wSc(linen, 0.9); cols[1] = wSc(wool, 0.9); if (kind === 'rolled_apron') parts.push(['apron', [0.5, 0.38, 0.26]]); hat = h % 3 ? null : 'flatcap'; hatc = wool; }
    else if (kind === 'tunic' || kind === 'tunic_rolled') { var tc = wMix(coat, wool, 0.5); setTop(tc, tc, kind === 'tunic_rolled' ? skin : tc); cols[5] = wSc(tc, 0.88); parts.push(['tunic', wSc(tc, 0.95)]); hat = h % 2 ? 'hat' : 'flatcap'; hatc = h % 2 ? RG_HAT : wSc(tc, 0.8); }
    else if (kind === 'greatcoat') { var gc = wMix(dark, [0.3, 0.29, 0.27], 0.5); setTop(gc); cols[5] = wSc(gc, 0.8); parts.push(['skirt_long', gc], ['collar', wSc(gc, 0.92)]); hat = 'hat'; hatc = RG_HAT; }
    else { setTop(coat); parts.push(['skirt', wSc(coat, 0.92)]); }
    if (qc) { parts.push(['neckerchief', RG_QC_RED], ['armband', RG_QC_RED]); }
    return { k: p.rgOutfit || '', kind: kind, cols: cols, parts: parts, hat: hat, hatc: hatc };
  }

  // ===================================================================================================
  // V165: AGE, TRADE, WEATHER, THINGS CARRIED, AND WHO IS WITH WHOM. Old people stoop and walk slowly; children are smaller. A
  // smith or a cooper wears a leather waistcoat, a carter a blue sash. On the river and the high ground more people wear weather coats
  // and shawls; in the market at midday more are in shirtsleeves. Some carry a basket, a bundle, a stick or a pipe. Farm hands wear
  // straw hats, river men knitted caps, older women bonnets. The rebels wear a feather in the hat; the town's mourners a black band.
  // ===================================================================================================
  // bend the back forward a little at each joint of the spine, and the neck back up so the head still looks ahead
  function wRigStoop(pose, k) {
    var mulX = function (j, a) {
      var o = j * 4, x = pose[o], y = pose[o + 1], z = pose[o + 2], w = pose[o + 3], s = Math.sin(a / 2), c = Math.cos(a / 2);
      // pose quaternion times a turn about the joint's own x axis
      pose[o] = w * s + x * c; pose[o + 1] = y * c + z * s; pose[o + 2] = z * c - y * s; pose[o + 3] = w * c - x * s;
    };
    mulX(1, RG_STOOP_SIGN * 0.16 * k); mulX(2, RG_STOOP_SIGN * 0.2 * k); mulX(3, RG_STOOP_SIGN * 0.14 * k); mulX(4, -RG_STOOP_SIGN * 0.3 * k); mulX(7, RG_ARM_FIX * 0.5 * k); mulX(11, RG_ARM_FIX * 0.5 * k);   // the arms still hang straight down
  }
  var RG_STOOP_SIGN = 1, RG_ARM_FIX = 1;
  var RG_KIDS = { boy: 1, milky: 1, tam: 1, r3: 1 };
  var RG_OLD = { quill: 1, karrow: 1, keeper: 1, miller: 1 };
  var RG_REBEL = { r1: 1, r2: 1, r3: 1 };
  var RG_MOURN = { nell: 1, weeper: 1 };
  var RG_FARM = { cross: 1, oak: 1, mill: 1, millhouse: 1, siblings: 1, hut: 1, hermits: 1, bearers: 1 };
  var RG_RIVER = { ford: 1, upperford: 1, mill: 1 };
  var RG_COLD = { ford: 1, upperford: 1, ridge: 1, hermits: 1, malice: 1 };
  var RG_LEATHER = [0.42, 0.28, 0.17], RG_CARTER = [0.2, 0.28, 0.5], RG_STRAW = [0.8, 0.7, 0.44], RG_BLACK = [0.07, 0.07, 0.08];
  // trades: the leather waistcoat, the carter's sash; things kept in the hand
  var RG_TRADE = { cooper: { vest: RG_LEATHER }, tam: { vest: RG_LEATHER }, axeman: { vest: RG_LEATHER }, fowler: { vest: RG_LEATHER, hat: 'strawhat' }, teamster: { sash: RG_CARTER }, karrow: { item: 'stick' }, quill: { item: 'stick' }, magpie: { item: 'pipe' }, dice: { item: 'pipe' }, keeper: { item: 'pipe' }, marl: { item: 'basket' }, miller: { item: 'basket' } };
  function wLine(add, m, x0, z0, x1, z1, o) {
    var mod = wModel(m), s = o && o.h ? o.h / mod.h : (o && o.s) || 1, len = Math.hypot(x1 - x0, z1 - z0), seg = mod.w * s * 0.98;
    var n = Math.max(1, Math.round(len / seg)), r = Math.atan2(-(z1 - z0), x1 - x0);
    for (var i = 0; i < n; i++) { var f = (i + 0.5) / n, it = { r: r }; for (var k in o || {}) it[k] = o[k]; add(m, x0 + (x1 - x0) * f, z0 + (z1 - z0) * f, it); }
  }
  function wRoom(add, x0, z0, x1, z1, o) {
    o = o || {};
    var back = o.wall || 'mk_brick', win = o.win || 'mk_brickwin', low = o.low || back, n = 0;
    function run(xa, za, xb, zb, tall, gapAt) {
      var len = Math.hypot(xb - xa, zb - za), k = Math.max(1, Math.round(len / 2)), r = Math.atan2(-(zb - za), xb - xa);
      for (var i = 0; i < k; i++) {
        var f = (i + 0.5) / k, x = xa + (xb - xa) * f, z = za + (zb - za) * f;
        if (gapAt !== undefined && Math.abs(i - gapAt) < 0.5) continue;
        var m = tall ? ((o.wins || []).indexOf(n) >= 0 ? win : back) : low; n++;
        add(m, x, z, { h: 3.12 * (o.hs || 1), sy: tall ? 1 : 0.28, r: r, s: undefined, sx: len / k / 2 });
      }
    }
    run(x0, z0, x1, z0, true); run(x0, z0, x0, z1, true);
    run(x1, z0, x1, z1, false); run(x0, z1, x1, z1, false, o.door);
  }
  var GR = [0.6, 0.62, 0.55], MUD = [0.85, 0.82, 0.78], WATER = [0.0001, 0.00003];
  var trees = function (add, list) { list.forEach(function (t) { add(t[2], t[0], t[1], { h: t[3], r: t[0] * 1.7 + t[1] }); }); };
  function wLineZ(add, m, x0, z0, x1, z1, o) {
    var mod = wModel(m), s = o && o.h ? o.h / mod.h : 1, len = Math.hypot(x1 - x0, z1 - z0), seg = mod.d * s * 0.995;
    var n = Math.max(1, Math.round(len / seg)), r = Math.atan2(x1 - x0, z1 - z0);
    for (var i = 0; i < n; i++) { var f = (i + 0.5) / n, it = { r: r, sz: len / n / (mod.d * s) }; for (var k in o || {}) it[k] = o[k]; add(m, x0 + (x1 - x0) * f, z0 + (z1 - z0) * f, it); }
  }
  PROC.millstone = function () { return [pp(function (m) { mCyl(m, 0, 0, 0, 0.75, 0.75, 0.3, 14, 'y', 0.6, true); mCyl(m, 0, 0.3, 0, 0.72, 0.72, 0.28, 14, 'y', 0.6, true); mCyl(m, 0, 0.58, 0, 0.12, 0.12, 0.6, 6, 'y', 0.4, true); }, 't_stone', [0.78, 0.76, 0.72])]; };
  PROC.bars = function () { return [pp(function (m) { for (var i = 0; i < 9; i++) mCyl(m, i * 0.25, 0, 0, 0.03, 0.03, 2.3, 5, 'y', 0.4, true); mBox(m, -0.05, 2.2, -0.04, 2.05, 2.3, 0.04, 0.5); mBox(m, -0.05, 1.0, -0.04, 2.05, 1.08, 0.04, 0.5); }, 't_iron', [0.42, 0.42, 0.44])]; };
  var IRON = [0.2, 0.2, 0.22], BAND = [0.16, 0.15, 0.14], PWD = [0.55, 0.42, 0.3];
  PROC.keg = function () {
    return [
      pp(function (m) { mCyl(m, 0, 0, 0, 0.3, 0.34, 0.36, 10, 'y', 0.6, false); mCyl(m, 0, 0.36, 0, 0.34, 0.3, 0.36, 10, 'y', 0.6, true); }, 't_planks', PWD),
      pp(function (m) { [0.06, 0.36, 0.66].forEach(function (y) { mCyl(m, 0, y, 0, y === 0.36 ? 0.35 : 0.33, y === 0.36 ? 0.35 : 0.33, 0.05, 10, 'y', 0.3, false); }); }, null, BAND),
      // the Crown's broad arrow, stencilled in white on the staves
      pp(function (m) { stick(m, [0, 0.3, 0.345], [0, 0.48, 0.345], 0.02); stick(m, [0, 0.48, 0.345], [-0.07, 0.4, 0.345], 0.018); stick(m, [0, 0.48, 0.345], [0.07, 0.4, 0.345], 0.018); }, null, [0.85, 0.83, 0.78], true),
      pp(function (m) { mCyl(m, 0.02, 0.72, 0.02, 0.025, 0.02, 0.12, 5, 'y', 0.2, true); }, null, [0.6, 0.55, 0.4])
    ];
  };
  PROC.brazier = function () {
    return [
      pp(function (m) { for (var i = 0; i < 3; i++) { var a = i / 3 * Math.PI * 2; stick(m, [Math.cos(a) * 0.42, 0, Math.sin(a) * 0.42], [Math.cos(a) * 0.2, 0.72, Math.sin(a) * 0.2], 0.035); } mCyl(m, 0, 0.66, 0, 0.22, 0.4, 0.26, 10, 'y', 0.5, true); }, 't_iron', IRON),
      pp(function (m) { for (var i = 0; i < 7; i++) { var a = i / 7 * Math.PI * 2; mRock(m, Math.cos(a) * 0.2, 0.9, Math.sin(a) * 0.2, 0.09, i + 40); } }, null, [0.5, 0.2, 0.06], true)
    ];
  };
  PROC.flame = function () { return [pp(function (m) { mCyl(m, 0, 0, 0, 0.26, 0.0, 0.55, 6, 'y', 1); }, null, [1.0, 0.55, 0.18], true), pp(function (m) { mCyl(m, 0, 0, 0, 0.15, 0.0, 0.36, 5, 'y', 1); }, null, [1.0, 0.85, 0.45], true)]; };
  PROC.fountain = function () {
    return [
      pp(function (m) { mCyl(m, 0, 0, 0, 1.6, 1.6, 0.55, 14, 'y', 0.5, false); mCyl(m, 0, 0, 0, 1.38, 1.38, 0.5, 14, 'y', 0.5, false); mCyl(m, 0, 0, 0, 0.32, 0.26, 1.7, 8, 'y', 0.5, true); mCyl(m, 0, 1.7, 0, 0.55, 0.3, 0.22, 10, 'y', 0.5, true); }, 't_stone', [0.7, 0.68, 0.64]),
      pp(function (m) { mCyl(m, 0, 0.42, 0, 1.38, 1.38, 0.02, 14, 'y', 1, true); }, 't_water', [0.55, 0.62, 0.66])
    ];
  };
  PROC.scorch = function () { return [pp(function (m) { mCyl(m, 0, 0, 0, 1.6, 1.4, 0.02, 9, 'y', 1, true); }, null, [0.05, 0.05, 0.05])]; };
  function stick(m, a, b, w) {
    var h = w / 2;
    mQuad(m, [a[0] - h, a[1], a[2]], [a[0] + h, a[1], a[2]], [b[0] + h, b[1], b[2]], [b[0] - h, b[1], b[2]], 1, 1);
    mQuad(m, [a[0], a[1], a[2] - h], [a[0], a[1], a[2] + h], [b[0], b[1], b[2] + h], [b[0], b[1], b[2] - h], 1, 1);
  }
(function () {
    var STONE = [0.74, 0.71, 0.67], GLASS = [0.8, 0.78, 0.74], BRICK = 'Wall_Brick_A_Diffuse_1K.png', TRIM = 'Wall_Trim_A_Diffuse_1K.png', WALLC = [0.8, 0.78, 0.74];
    // a length of nave wall broken down to a jagged stump, in the same dressed stone as the standing walls (4 long, 0.6 thick)
    PROC.ch_ruin = function () {
      var H = [3.3, 3.0, 2.2, 2.5, 1.6, 1.1, 1.3, 0.6];
      return [pp(function (m) { H.forEach(function (h, i) { mBox(m, -2 + i * 0.5, 0, -0.3, -1.5 + i * 0.5, h, 0.3, 1.2); }); }, BRICK, WALLC),
        pp(function (m) { mBox(m, -2.05, 0, -0.36, 2.05, 0.3, 0.36, 1); }, TRIM, WALLC)];
    };
    // the bell tower: a square shaft of the same stone with a door on the south face, slit windows, and an open belfry on top (3.6 square, 12 high)
    PROC.ch_tower = function () {
      var T = 9.2;
      return [
        pp(function (m) {
          mBox(m, -1.8, 0, -1.8, 1.8, T, -1.4, 2); mBox(m, -1.8, 0, -1.4, -1.4, T, 1.8, 2); mBox(m, 1.4, 0, -1.4, 1.8, T, 1.8, 2);
          mBox(m, -1.4, 0, 1.4, -0.55, T, 1.8, 2); mBox(m, 0.55, 0, 1.4, 1.4, T, 1.8, 2); mBox(m, -0.55, 2.4, 1.4, 0.55, T, 1.8, 2);
          [[-1.8, -1.4], [1.4, 1.8]].forEach(function (q) { mBox(m, q[0], T + 0.2, -1.4, q[1], T + 1.0, 1.4, 1); });
          mBox(m, -1.4, T + 0.2, -1.8, 1.4, T + 1.0, -1.4, 1); mBox(m, -1.4, T + 0.2, 1.4, 1.4, T + 1.0, 1.8, 1);
        }, BRICK, WALLC),
        pp(function (m) {
          mBox(m, -1.95, 4.6, -1.95, 1.95, 4.8, 1.95, 1); mBox(m, -1.95, T, -1.95, 1.95, T + 0.2, 1.95, 1);
          [[-1.8, -1.8], [1.3, -1.8], [-1.8, 1.3], [1.3, 1.3]].forEach(function (q) { mBox(m, q[0], T + 0.2, q[1], q[0] + 0.5, T + 2.8, q[1] + 0.5, 1); });
          mBox(m, -1.95, T + 2.8, -1.95, 1.95, T + 3.05, 1.95, 1);
          mBox(m, -0.7, 2.4, 1.8, 0.7, 2.6, 1.9, 1);
        }, TRIM, WALLC),
        pp(function (m) {
          mBox(m, -0.55, 0, 1.42, 0.55, 2.4, 1.5, 1);
          [[6.2, 1.82], [6.2, -1.82]].forEach(function (q) { mBox(m, -0.12, q[0], q[1] - 0.04, 0.12, q[0] + 1.1, q[1] + 0.04, 1); });
          [[6.2, 1.82], [6.2, -1.82]].forEach(function (q) { mBox(m, q[1] - 0.04, q[0], -0.12, q[1] + 0.04, q[0] + 1.1, 0.12, 1); });
          mBox(m, -1.9, T + 2.75, -1.9, 1.9, T + 2.8, 1.9, 1);
        }, null, [0.06, 0.06, 0.07]),
        pp(function (m) { mCyl(m, 0, T + 1.2, 0, 0.5, 0.3, 0.7, 12, 'y', 0.5, true); }, 't_iron', [0.62, 0.48, 0.3])
      ];
    };
    function rnd(s) { var x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
    // rubble: a low heap of fallen ashlar and broken brick, with a few loose stones round the edge
    PROC.ch_rubble = function () {
      var parts = [pp(function (m) {
        for (var i = 0; i < 16; i++) {
          var a = rnd(i) * 6.283, d = Math.sqrt(rnd(i + 40)) * 1.05, x = Math.cos(a) * d, z = Math.sin(a) * d * 0.8, w = 0.22 + rnd(i + 7) * 0.32, h = 0.14 + rnd(i + 9) * 0.22, y = Math.max(0, (1.05 - d) * 0.42 - h * 0.3);
          mBox(m, x - w / 2, y, z - w * 0.4, x + w / 2, y + h, z + w * 0.4, 0.5);
        }
        mRock(m, 0, 0, 0, 0.62, 3, true);
      }, BRICK, WALLC)];
      parts.push(pp(function (m) {
        for (var i = 0; i < 12; i++) { var a = rnd(i + 90) * 6.283, d = 0.4 + rnd(i + 120) * 0.95, x = Math.cos(a) * d, z = Math.sin(a) * d * 0.8, y = rnd(i + 130) * 0.25 * (1.2 - d); mBox(m, x - 0.13, Math.max(0, y), z - 0.06, x + 0.13, Math.max(0, y) + 0.08, z + 0.06, 0.4); }
      }, 't_stone', [0.6, 0.4, 0.33]));
      return parts;
    };
    // a single fallen block of dressed stone, and a broken column drum
    PROC.ch_block = function () { return [pp(function (m) { mBox(m, -0.55, 0, -0.3, 0.55, 0.5, 0.3, 0.6); mBox(m, -0.5, 0.5, -0.26, 0.2, 0.62, 0.26, 0.6); }, BRICK, WALLC)]; };
    PROC.ch_drum = function () { return [pp(function (m) { mCyl(m, 0, 0, 0, 0.42, 0.42, 0.55, 10, 'y', 0.6, true); mCyl(m, 0, 0.55, 0, 0.42, 0.3, 0.12, 10, 'y', 0.6, true); }, TRIM, WALLC)]; };
    // loose bricks scattered in the grass
    PROC.ch_bricks = function () { return [pp(function (m) { for (var i = 0; i < 9; i++) { var x = (rnd(i + 200) - 0.5) * 1.6, z = (rnd(i + 230) - 0.5) * 1.2; mBox(m, x - 0.12, 0, z - 0.06, x + 0.12, 0.08, z + 0.06, 0.4); } }, 't_stone', [0.6, 0.4, 0.33])]; };
    // the bell: bronze, a crack up one side, hung from an oak headstock
    PROC.ch_bell = function () {
      return [
        pp(function (m) { mCyl(m, 0, 0, 0, 0.62, 0.5, 0.12, 14, 'y', 0.5, true); mCyl(m, 0, 0.12, 0, 0.5, 0.34, 0.62, 14, 'y', 0.5, false); mCyl(m, 0, 0.74, 0, 0.34, 0.2, 0.16, 14, 'y', 0.5, true); mCyl(m, 0, 0.9, 0, 0.08, 0.08, 0.14, 6, 'y', 0.5, true); }, 't_iron', [0.62, 0.48, 0.3]),
        pp(function (m) { mBox(m, -1.9, 1.04, -0.14, 1.9, 1.3, 0.14, 0.6); }, 't_planks', [0.5, 0.36, 0.24])
      ];
    };
    // a straight stone stair up the back wall of the tower, to a trap in the boards above
    PROC.ch_stair = function () {
      return [pp(function (m) { for (var i = 0; i < 11; i++) mBox(m, -2.2 + i * 0.4, 0, -0.5, -1.8 + i * 0.4, (i + 1) * 0.27, 0.5, 0.6); mBox(m, 2.2, 0, -0.5, 2.9, 3.0, 0.5, 0.6); }, BRICK, [0.9, 0.87, 0.82]),
        pp(function (m) { for (var i = 0; i < 11; i++) mBox(m, -2.2 + i * 0.4, (i + 1) * 0.27 - 0.04, -0.52, -1.8 + i * 0.4, (i + 1) * 0.27 + 0.01, 0.52, 0.4); }, TRIM, WALLC),
        pp(function (m) { mBox(m, 2.1, 3.0, -0.6, 3.0, 3.1, 0.6, 0.5); }, null, [0.05, 0.05, 0.06])];
    };
    PROC.ch_towerb = function () {
      // the same tower for standing on top of: no cap over the belfry, and no little bell (the real one hangs there)
      var T = 9.2, P = PROC.ch_tower();
      P[1] = pp(function (m) { mBox(m, -1.95, 4.6, -1.95, 1.95, 4.8, 1.95, 1); mBox(m, -1.95, T, -1.95, 1.95, T + 0.2, 1.95, 1); [[-1.8, -1.8], [1.3, -1.8], [-1.8, 1.3], [1.3, 1.3]].forEach(function (q) { mBox(m, q[0], T + 0.2, q[1], q[0] + 0.5, T + 2.4, q[1] + 0.5, 1); mBox(m, q[0] - 0.05, T + 2.4, q[1] - 0.05, q[0] + 0.55, T + 2.6, q[1] + 0.55, 1); }); mBox(m, -0.7, 2.4, 1.8, 0.7, 2.6, 1.9, 1); }, TRIM, WALLC);
      P[2] = pp(function (m) { mBox(m, -0.55, 0, 1.42, 0.55, 2.4, 1.5, 1); [[6.2, 1.82], [6.2, -1.82]].forEach(function (q) { mBox(m, -0.12, q[0], q[1] - 0.04, 0.12, q[0] + 1.1, q[1] + 0.04, 1); mBox(m, q[1] - 0.04, q[0], -0.12, q[1] + 0.04, q[0] + 1.1, 0.12, 1); }); }, null, [0.06, 0.06, 0.07]);
      return P.slice(0, 3);
    };
    PROC.ch_trap = function () { return [pp(function (m) { mBox(m, -0.5, 0, -0.5, 0.5, 0.04, 0.5, 0.5); }, null, [0.04, 0.04, 0.05]), pp(function (m) { mBox(m, -0.58, 0, -0.58, 0.58, 0.05, -0.5, 0.5); mBox(m, -0.58, 0, 0.5, 0.58, 0.05, 0.58, 0.5); }, 't_planks', [0.45, 0.33, 0.22])]; };
    // V78: what is left of the nave roof over the altar end: boards on the rafters with holes rained through, a few patched with
    // sailcloth, the rafters running on bare past the broken edge, tie-beams across the open half. Built in place (nave coordinates).
    PROC.ch_roof = function () {
      var EW = 7.35, Y0 = 5.6, RISE = 2.5, Z0 = -12.95, NS = 8, SW = 0.99, BANDS = [0, 0.36, 0.7, 1.0];
      var HOLE = { '-1,5,1': 1, '-1,6,0': 1, '-1,7,1': 1, '-1,7,2': 1, '-1,3,2': 1, '1,6,1': 1, '1,7,0': 1, '1,7,1': 1, '1,2,1': 1, '1,7,2': 1, '-1,2,1': 2, '1,4,0': 2, '1,1,2': 2, '-1,6,2': 2 };
      function P(s, f, th) { return [s * EW * (1 - f), Y0 + RISE * f + (th || 0)]; }
      function cell(m, s, f0, f1, z0, z1, th) {
        var a = P(s, f0, th), b = P(s, f1, th);
        mQuad(m, [a[0], a[1], z0], [a[0], a[1], z1], [b[0], b[1], z1], [b[0], b[1], z0], 1.2, 1);
        mQuad(m, [a[0], a[1], z1], [a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], 1.2, 1);
      }
      function slat(m, s, f0, f1, z, w) {
        var a = P(s, f0, 0.06), b = P(s, f1, 0.06), a2 = P(s, f0, -0.16), b2 = P(s, f1, -0.16);
        mQuad(m, [a[0], a[1], z - w], [a[0], a[1], z + w], [b[0], b[1], z + w], [b[0], b[1], z - w], 1, 0.2);
        mQuad(m, [a[0], a[1], z + w], [a[0], a[1], z - w], [b[0], b[1], z - w], [b[0], b[1], z + w], 1, 0.2);
        [z - w, z + w].forEach(function (zz) { mQuad(m, [a2[0], a2[1], zz], [a[0], a[1], zz], [b[0], b[1], zz], [b2[0], b2[1], zz], 1, 0.2); mQuad(m, [a[0], a[1], zz], [a2[0], a2[1], zz], [b2[0], b2[1], zz], [b[0], b[1], zz], 1, 0.2); });
      }
      return [
        pp(function (m) {
          for (var sd = -1; sd <= 1; sd += 2) for (var i = 0; i < NS; i++) for (var b = 0; b < 3; b++) {
            if (HOLE[sd + ',' + i + ',' + b]) continue;
            cell(m, sd, BANDS[b], BANDS[b + 1], Z0 + i * SW, Z0 + (i + 1) * SW, 0);
          }
          // the bounding marks: floor level at the two far corners, so the roof is placed in nave coordinates
          mBox(m, -7.45, 0, -12.96, -7.44, 0.01, -12.95, 1); mBox(m, 7.44, 0, -2.31, 7.45, 0.01, -2.3, 1);
        }, 't_wooddark', [0.62, 0.52, 0.44]),
        pp(function (m) { for (var k in HOLE) if (HOLE[k] === 2) { var q = k.split(',').map(Number); cell(m, q[0], BANDS[q[2]] + 0.02, BANDS[q[2] + 1] - 0.02, Z0 + q[1] * SW + 0.05, Z0 + (q[1] + 1) * SW - 0.05, 0.04); } }, 't_canvas', [0.66, 0.6, 0.48]),
        pp(function (m) {
          [-12.7, -11.1, -9.5, -7.9, -6.3, -4.7].forEach(function (z, i) { slat(m, -1, 0, 1, z, 0.09); if (i < 5) slat(m, 1, 0, 1, z, 0.09); else slat(m, 1, 0, 0.45, z, 0.09); });
          slat(m, -1, 0, 0.62, -3.2, 0.09); slat(m, 1, 0, 0.3, -3.2, 0.09);
          mBox(m, -0.13, Y0 + RISE - 0.1, -12.95, 0.13, Y0 + RISE + 0.16, -4.3, 1);
          [-10.3, -6.3, -2.5].forEach(function (z) { mBox(m, -6.8, Y0 - 0.32, z - 0.13, 6.8, Y0 - 0.06, z + 0.13, 1); });
          mBox(m, -0.11, Y0 - 0.06, -6.42, 0.11, Y0 + RISE - 0.1, -6.18, 1);
        }, 't_planks', [0.5, 0.38, 0.28])
      ];
    };
    PROC.ch_rope = function () { return [pp(function (m) { mCyl(m, 0, 0, 0, 0.025, 0.025, 3.4, 5, 'y', 0.3, true); mCyl(m, 0, 0.9, 0, 0.06, 0.06, 0.5, 6, 'y', 0.3, true); }, null, [0.55, 0.46, 0.32])]; };
    PROC.ch_beam = function () { return [pp(function (m) { mBox(m, -0.12, 0, -0.12, 0.12, 2.6, 0.12, 0.5); }, 't_planks', [0.45, 0.33, 0.22])]; };
})();
(function () {
    var Q = Math.PI / 2, BLACK = [0.07, 0.07, 0.08], IRON = [0.16, 0.16, 0.17], WOOD = [0.36, 0.27, 0.19];
    PROC.cp_gibbet = function () {
      return [
        pp(function (m) {
          mBox(m, -0.14, 0, -0.14, 0.14, 4.4, 0.14, 0.5);                 // the post
          mBox(m, -0.1, 4.1, -0.1, 1.9, 4.34, 0.1, 0.5);                  // the arm
          mBox(m, -0.5, 0, -0.5, 0.5, 0.2, 0.5, 0.5);                      // the foot
        }, 't_planks', WOOD),
        pp(function (m) {
          // two ropes, cut short at the knot, and a board nailed to the post
          mCyl(m, 1.0, 3.5, 0, 0.022, 0.022, 0.75, 4, 'y', 0.2, true); mCyl(m, 1.6, 3.6, 0, 0.022, 0.022, 0.65, 4, 'y', 0.2, true);
        }, null, [0.5, 0.42, 0.3]),
        pp(function (m) { mBox(m, -0.3, 2.2, 0.15, 0.3, 2.6, 0.19, 0.3); }, null, [0.62, 0.58, 0.5])
      ];
    };
})();


  // =====================================================================
  //  MALICE GAOL: the 3D gaol. Everything above this line is The Postal
  //  Trace's own renderer, rig and procedural kit, carried over as is.
  //  Below: input, the frame loop, name tags, and the gaol's places.
  // =====================================================================
  var CB = {}, CTX = null, CUR = null;
  function has() { return false; }
  function okM(m) { return !!(W3D.models[m] || PROC[m]); }
  function shafts(list, z, xs, rz) { xs.forEach(function (x) { list.push({ x: x, z: z + 0.45, y: 0, w: 1.4, h: 3.2, tex: 'l_shaft', r: 0, rz: rz || 0.35, c: [0.22, 0.22, 0.26] }, { x: x + 0.6, z: z + 1.6, flat: true, w: 1.8, d: 2.2, c: [0.14, 0.14, 0.16] }); }); }
  // a line of iron bars (each length is 2.05 along its own x)
  function barsLine(add, x0, z0, x1, z1, o) {
    var len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 2.05)), r = Math.atan2(-(z1 - z0), x1 - x0), sx = len / n / 2.05;
    for (var i = 0; i < n; i++) { var f = i / n, it = { r: r, sx: sx, tint: (o && o.tint) || null }; add('bars', x0 + (x1 - x0) * f, z0 + (z1 - z0) * f, it); }
  }
  PROC.gl_drain = function () { return [pp(function (m) { mBox(m, -0.32, 0, -0.32, 0.32, 0.03, 0.32, 0.5); }, null, [0.02, 0.02, 0.025]), pp(function (m) { for (var i = 0; i < 6; i++) mBox(m, -0.3 + i * 0.115, 0.03, -0.3, -0.26 + i * 0.115, 0.06, 0.3, 0.3); mBox(m, -0.34, 0.03, -0.34, 0.34, 0.06, -0.3, 0.3); mBox(m, -0.34, 0.03, 0.3, 0.34, 0.06, 0.34, 0.3); }, 't_iron', [0.3, 0.3, 0.32])]; };
  PROC.gl_shelf = function () { return [pp(function (m) { mBox(m, -1.0, 0, -0.42, 1.0, 0.5, 0.42, 0.6); }, 't_stone', [0.55, 0.54, 0.52]), pp(function (m) { mBox(m, -0.9, 0.5, -0.36, 0.9, 0.6, 0.36, 0.5); }, 't_canvas', [0.42, 0.38, 0.3])]; };
  PROC.gl_bucket = function () { return [pp(function (m) { mCyl(m, 0, 0, 0, 0.18, 0.22, 0.38, 9, 'y', 0.5, false); }, 't_planks', [0.4, 0.32, 0.24]), pp(function (m) { mCyl(m, 0, 0.3, 0, 0.225, 0.225, 0.04, 9, 'y', 0.3, false); }, null, [0.2, 0.2, 0.22])]; };
  PROC.gl_nine = function () { return [pp(function (m) { mBox(m, -0.35, 0, -0.03, 0.35, 0.45, 0.03, 0.5); }, 't_planks', [0.3, 0.25, 0.2]), pp(function (m) { mBox(m, -0.08, 0.08, 0.03, 0.08, 0.37, 0.05, 0.3); mBox(m, -0.08, 0.3, 0.03, 0.12, 0.37, 0.05, 0.3); mBox(m, 0.05, 0.08, 0.03, 0.12, 0.37, 0.05, 0.3); mBox(m, -0.08, 0.22, 0.03, 0.12, 0.27, 0.05, 0.3); }, null, [0.6, 0.12, 0.08], true)]; };
  PROC.gl_door = function () { return [pp(function (m) { mBox(m, -0.6, 0, -0.08, 0.6, 2.2, 0.08, 0.6); }, 't_planks', [0.36, 0.28, 0.2]), pp(function (m) { [0.35, 1.1, 1.85].forEach(function (y) { mBox(m, -0.62, y, -0.1, 0.62, y + 0.12, 0.1, 0.4); }); mBox(m, -0.2, 1.4, -0.1, 0.2, 1.65, 0.1, 0.4); }, 't_iron', [0.25, 0.25, 0.27])]; };
  PROC.gl_chest = function () { return [pp(function (m) { mBox(m, -0.6, 0, -0.38, 0.6, 0.62, 0.38, 0.6); }, 't_planks', [0.32, 0.25, 0.18]), pp(function (m) { [-0.45, 0.45].forEach(function (x) { mBox(m, x - 0.06, 0, -0.4, x + 0.06, 0.64, 0.4, 0.3); }); mBox(m, -0.62, 0.55, -0.4, 0.62, 0.64, 0.4, 0.3); mBox(m, -0.1, 0.3, 0.38, 0.1, 0.5, 0.44, 0.3); }, 't_iron', [0.28, 0.28, 0.3]), pp(function (m) { mBox(m, -0.4, 0.2, 0.385, 0.4, 0.28, 0.39, 0.2); }, null, [0.85, 0.85, 0.8], true)]; };
  PROC.gl_oven = function () { return [pp(function (m) { mBox(m, -1.1, 0, -0.9, 1.1, 1.6, 0.9, 1); mBox(m, -0.9, 1.6, -0.7, 0.9, 2.1, 0.7, 1); mBox(m, -0.3, 2.1, -0.3, 0.3, 3.4, 0.3, 1); }, 'Wall_Brick_A_Diffuse_1K.png', [0.75, 0.55, 0.45]), pp(function (m) { mBox(m, -0.5, 0.5, 0.9, 0.5, 1.1, 0.95, 1); }, null, [0.9, 0.42, 0.1], true)]; };
  PROC.gl_lectern = function () { return [pp(function (m) { mBox(m, -0.08, 0, -0.08, 0.08, 1.0, 0.08, 0.4); mBox(m, -0.3, 0, -0.3, 0.3, 0.06, 0.3, 0.4); }, 't_planks', [0.4, 0.3, 0.22]), pp(function (m) { mQuad(m, [-0.32, 1.0, -0.25], [0.32, 1.0, -0.25], [0.32, 1.18, 0.2], [-0.32, 1.18, 0.2], 1, 1); }, 't_planks', [0.45, 0.34, 0.24]), pp(function (m) { mBox(m, -0.26, 1.12, -0.18, 0.26, 1.16, 0.14, 0.3); }, null, [0.82, 0.78, 0.66])]; };
  PROC.gl_trestle = function () { return [pp(function (m) { mBox(m, -1.6, 0.86, -0.5, 1.6, 0.94, 0.5, 0.5); [[-1.4, -0.4], [1.4, -0.4], [-1.4, 0.4], [1.4, 0.4]].forEach(function (q) { mBox(m, q[0] - 0.05, 0, q[1] - 0.05, q[0] + 0.05, 0.86, q[1] + 0.05, 0.4); }); }, 't_planks', [0.62, 0.55, 0.45]), pp(function (m) { mBox(m, -1.55, 0.94, -0.45, 1.55, 0.95, 0.45, 0.4); }, null, [0.85, 0.83, 0.76])]; };
  PROC.gl_cot = function () { return [pp(function (m) { mBox(m, -0.45, 0.35, -1, 0.45, 0.45, 1, 0.5); [[-0.4, -0.95], [0.4, -0.95], [-0.4, 0.95], [0.4, 0.95]].forEach(function (q) { mBox(m, q[0] - 0.04, 0, q[1] - 0.04, q[0] + 0.04, 0.35, q[1] + 0.04, 0.3); }); }, 't_iron', [0.32, 0.32, 0.34]), pp(function (m) { mBox(m, -0.42, 0.45, -0.97, 0.42, 0.55, 0.97, 0.5); }, 't_canvas', [0.6, 0.58, 0.52])]; };
  PROC.gl_sheet = function () { return [pp(function (m) { mBox(m, -0.38, 0.55, -0.9, 0.38, 0.72, 0.9, 0.5); mBox(m, -0.18, 0.72, -0.85, 0.18, 0.82, -0.55, 0.3); }, 't_canvas', [0.86, 0.85, 0.8])]; };
  PROC.gl_scaffold = function () { return [pp(function (m) { mBox(m, -1.4, 1.6, -1.2, 1.4, 1.75, 1.2, 0.5); [[-1.3, -1.1], [1.3, -1.1], [-1.3, 1.1], [1.3, 1.1]].forEach(function (q) { mBox(m, q[0] - 0.09, 0, q[1] - 0.09, q[0] + 0.09, 1.6, q[1] + 0.09, 0.4); }); mBox(m, -0.1, 1.75, -0.1, 0.1, 4.4, 0.1, 0.4); mBox(m, -0.1, 4.2, -0.1, 1.5, 4.36, 0.1, 0.4); for (var i = 0; i < 6; i++) mBox(m, 1.4 + i * 0.3, i * 0.27, -0.5, 1.7 + i * 0.3, i * 0.27 + 0.08, 0.5, 0.4); }, 't_planks', [0.78, 0.68, 0.52]), pp(function (m) { mCyl(m, 1.3, 3.3, 0, 0.025, 0.025, 0.9, 4, 'y', 0.2, true); mCyl(m, 1.3, 3.15, 0, 0.12, 0.12, 0.12, 6, 'y', 0.2, false); }, null, [0.55, 0.46, 0.32])]; };
  PROC.gl_lamp = function () { return [pp(function (m) { mBox(m, -0.3, 0, -0.3, 0.3, 0.06, 0.3, 0.3); [[-0.28, -0.28], [0.28, -0.28], [-0.28, 0.28], [0.28, 0.28]].forEach(function (q) { mBox(m, q[0] - 0.03, 0, q[1] - 0.03, q[0] + 0.03, 0.7, q[1] + 0.03, 0.2); }); mBox(m, -0.32, 0.7, -0.32, 0.32, 0.78, 0.32, 0.3); }, 't_iron', [0.2, 0.2, 0.22]), pp(function (m) { mBox(m, -0.18, 0.1, -0.18, 0.18, 0.6, 0.18, 0.3); }, null, [1.0, 0.82, 0.45], true)]; };

  // ---------- input: click the ground to walk, click a person or a thing to go to it; WASD to walk; wheel or pinch to zoom ----------
  function wBindInput() {
    var cv = W.cv;
    cv.addEventListener('pointermove', function (e) { if (!W.on || !W.scene) return; W.hover = wPick(e.clientX, e.clientY); cv.style.cursor = W.hover ? 'pointer' : ''; });
    var pinch = null;
    cv.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); }, { passive: true });
    cv.addEventListener('touchmove', function (e) {
      if (!pinch || e.touches.length !== 2 || !W.on || !W.scene) return;
      var d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      if (Math.abs(d / pinch - 1) > 0.06) { wZoom(pinch / d, (e.touches[0].clientX + e.touches[1].clientX) / 2, (e.touches[0].clientY + e.touches[1].clientY) / 2); pinch = d; } e.preventDefault();
    }, { passive: false });
    cv.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; }, { passive: true });
    cv.addEventListener('wheel', function (e) { if (!W.on || !W.scene) return; e.preventDefault(); wZoom(e.deltaY > 0 ? 1.12 : 1 / 1.12, e.clientX, e.clientY); }, { passive: false });
    cv.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || !W.on || !W.scene) return;
      cv.focus();
      var h = wPick(e.clientX, e.clientY), pl = W.scene.pl;
      if (h && (h.person || h.thing)) {
        var o = h.person || h.thing, ax = o.ax !== undefined ? o.ax : o.x, az = o.az !== undefined ? o.az : o.z + 1.2;
        pl.goal = { x: ax, z: az, run: e.shiftKey, then: function () { pl.face = Math.atan2(o.x - pl.x, o.z - pl.z); o.act(); } };
      } else {
        var g = wGroundAt(e.clientX, e.clientY), now = performance.now(), run = e.shiftKey || (W.lastClick && now - W.lastClick < 320);
        W.lastClick = now; pl.goal = { x: g.x, z: g.z, run: run };
      }
    });
    document.addEventListener('keydown', function (e) {
      if (!W.on || !W.scene) return;
      var t = e.target && e.target.tagName; if (t === 'INPUT' || t === 'TEXTAREA') return;
      var md = document.getElementById('modal'); if (md && !md.hidden) return;
      var k = e.key.toLowerCase(); W.keys.shift = e.shiftKey;
      if (['w', 'a', 's', 'd'].indexOf(k) >= 0) W.keys[k] = true;
      if (k === 'e' && document.activeElement === W.cv) { var n = wNearest(); if (n) { e.preventDefault(); n.act(); } }
      if ((e.key === '<' || e.key === ',') && document.activeElement === W.cv) wZoom(1 / 1.15);
      if ((e.key === '>' || e.key === '.') && document.activeElement === W.cv) wZoom(1.15);
    });
    document.addEventListener('keyup', function (e) { W.keys[e.key.toLowerCase()] = false; W.keys.shift = e.shiftKey; });
    window.addEventListener('blur', function () { W.keys = {}; });
  }

  // ---------- the frame ----------
  var PL_LOOK = { id: 'gaol_prisoner', name: 'prisoner', rgOutfit: 'rolled', rgFemale: false };
  function gFrame(ts) {
    if (!W.on) { W.raf = 0; return; }
    W.raf = requestAnimationFrame(gFrame);
    var dt = Math.min(0.05, (ts - (W.last || ts)) / 1000); W.last = ts; W.dt = dt; W.fno = (W.fno || 0) + 1;
    var sc = W.scene; if (!sc) return;
    try { wStep(dt); } catch (e) {}
    // the anonymous: men walking their circle in the yard, women at the grate, carpenters at their timber
    sc.extras.forEach(function (p) {
      if (p.ring && !p.goal) { p.ang = (p.ang || 0) - 0.5; var R = p.ring; p.goal = { x: R[0] + Math.cos(p.ang) * R[2], z: R[1] + Math.sin(p.ang) * R[2], sp: 1.3 }; }
      if (p.goal && !p.down) {
        var gx = p.goal.x - p.x, gz = p.goal.z - p.z, gd = Math.hypot(gx, gz), st = (p.goal.sp || 2.4) * dt;
        if (gd <= st || gd < 0.02) { p.x = p.goal.x; p.z = p.goal.z; p.goal = null; p.walk = false; }
        else { p.x += gx / gd * st; p.z += gz / gd * st; p.walk = true; p.face = Math.atan2(gx, gz); }
      }
    });
    var gl = W.gl, cv = W.cv, r = cv.getBoundingClientRect();
    if (!r.width || !r.height) return;
    var px = Math.max(1, Math.round(r.width / 3)), py = Math.max(1, Math.round(r.height / 3));
    if (cv.width !== px || cv.height !== py) { cv.width = px; cv.height = py; }
    gl.viewport(0, 0, px, py);
    var fog = sc.fog;
    gl.clearColor(fog[0], fog[1], fog[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    var cam = sc.cam, co = sc.camOff || [0, 0], kz = Math.max(0, Math.min(1, (cam.zoom - 3.2) / ((sc.zoomIn || 7.5) - 3.2)));
    var pan = sc.pan || (sc.pan = [0, 0]);
    if (sc.pl.moving) { var dk = Math.exp(-dt * 1.6); pan[0] *= dk; pan[1] *= dk; }
    var tx = sc.pl.x + co[0] * kz + pan[0], tz = sc.pl.z + co[1] * kz + pan[1];
    cam.x += (tx - cam.x) * Math.min(1, dt * 3); cam.z += (tz - cam.z) * Math.min(1, dt * 3);
    W.res = [px, py];
    var VP = wViewProj(cam, px / py);
    gl.uniformMatrix4fv(W.u.uVP, false, VP); gl.uniform2f(W.u.uRes, px, py);
    gl.uniform3fv(W.u.uL, sc.light); gl.uniform3fv(W.u.uFog, fog); gl.uniform2f(W.u.uFogR, sc.fogR[0], sc.fogR[1]);
    gl.uniform3f(W.u.uCam, cam.x, 0, cam.z); gl.uniform1i(W.u.uT, 0);
    W.fr = { VP: VP, px: px, py: py, L: sc.light, fog: fog, fogR: sc.fogR, cam: [cam.x, 0, cam.z] };
    gl.enable(gl.POLYGON_OFFSET_FILL);
    if (!W.I4) W.I4 = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    sc.grounds.forEach(function (g, gi) { gl.polygonOffset(-gi * 2, -gi * 4); wDraw(g.buf, W.I4, { t: g.t, c: g.c, flow: g.flow ? [ts * g.flow[0] % 1, ts * g.flow[1] % 1] : null }); });
    gl.polygonOffset(0, 0); gl.disable(gl.POLYGON_OFFSET_FILL);
    var occ = wOccTargets(sc), fogEnd = sc.fogR[1];
    var kx = Math.hypot(VP[0], VP[4], VP[8]), ky = Math.hypot(VP[1], VP[5], VP[9]);
    (function () { var p = sc.pl, hy = 0.9, nx = VP[0] * p.x + VP[4] * hy + VP[8] * p.z + VP[12], ny = VP[1] * p.x + VP[5] * hy + VP[9] * p.z + VP[13];
      W.fr.hole = [(nx + 1) / 2 * px, (ny + 1) / 2 * py, Math.max(6, 2.2 * ky * py / 2)]; gl.uniform3f(W.u.uHole, W.fr.hole[0], W.fr.hole[1], W.fr.hole[2]); })();
    sc.props.forEach(function (it) {
      if (it.show && !it.show()) return;
      if (it._r === undefined) {
        var mm = wModel(it.m), s0 = it.h ? it.h / mm.h : (it.s || 1), hx = mm.sz[0] * s0 * (it.sx || 1), hy = mm.sz[1] * s0 * (it.sy || 1) * 1.3, hz = mm.sz[2] * s0 * (it.sz || 1);
        it._r = Math.hypot(hx, hy, hz) / 2 + 0.3; it._cy = (it.y || 0) + hy / 2;
      }
      if (Math.hypot(it.x - cam.x, it.z - cam.z) - it._r > fogEnd) return;
      var ndx = VP[0] * it.x + VP[4] * it._cy + VP[8] * it.z + VP[12], ndy = VP[1] * it.x + VP[5] * it._cy + VP[9] * it.z + VP[13];
      if (Math.abs(ndx) - it._r * kx > 1.02 || Math.abs(ndy) - it._r * ky > 1.02) return;
      if (it.flick) { it.M = null; it.sy = 0.85 + 0.25 * Math.abs(Math.sin(ts / 90 + it.x)); }
      if (it.sway) { it.M = null; it.rz = Math.sin(ts / 700 + it.x) * it.sway; }
      if (!it.M) it.M = wInstM(it);
      var m = wModel(it.m), sel = W.hover && W.hover.prop === it, fd = wOccludes(it, m, occ);
      if (it.tint && !it._tc) it._tc = m.parts.map(function (b) { return (b.c || [1, 1, 1]).map(function (v, i) { return v * it.tint[i]; }); });
      var mt = null; if (it.mat) { if (!it._mt) { it._mt = W3D.tex[it.mat] ? wTex(it.mat, W3D.tex[it.mat]) : null; it._mtAll = !m.parts.some(function (b) { return b.t; }); } mt = it._mt; }
      m.parts.forEach(function (b, bi) { wDraw(b, it.M, { sel: sel, fade: fd, unlit: b.unlit || it.unlit, c: it.tint ? it._tc[bi] : null, t: mt && !b.unlit && (b.t || it._mtAll) ? mt : null }); });
    });
    // you
    var pl = sc.pl, drawn = false;
    if (wRigOk()) {
      var g = wRigGait(pl, pl.moving, W.keys.shift || (pl.goal && pl.goal.run), dt), o = { c: [0.46, 0.43, 0.38], br: [0.24, 0.22, 0.2], head: true, rate: g[1] };
      PL_LOOK._fit = PL_LOOK._fit || null; pl.rgOutfit = 'rolled'; pl.rgFemale = false; pl.id = 'gaol_prisoner';
      wDress(pl, o, 7, true); o.hat = null;
      drawn = wRigDraw(pl, pl.x, 0, pl.z, pl.face, pl.sit && !pl.moving ? 'sit' : g[0], o);
    }
    if (!drawn) { if (!W.fig) W.fig = wFigure(); var Mp = mTRS(pl.x, 0, pl.z, pl.face, 1, 1, 1); W.fig.forEach(function (b) { wDraw(b, Mp, { c: b.c }); }); }
    wShadow(pl.x, pl.z, 0.5, 0);
    // the people you can talk to
    sc.people.forEach(function (p) {
      if (p.hidden && p.hidden()) return;
      var sel = W.hover && W.hover.person === p, face = wTurnTo(p, sc, dt, 4.5), ok = false;
      if (wRigOk()) ok = wRigPerson(p, p.y || 0, face, sel, false, dt);
      if (!ok) { if (!W.fig) W.fig = wFigure(); var M = mTRS(p.x, 0, p.z, face, 1, p.sit ? 0.74 : 1, 1); W.fig.forEach(function (b, i) { wDraw(b, M, { c: i < 2 ? p.coat : b.c, sel: sel }); }); }
      wShadow(p.x, p.z, 0.55);
    });
    sc.extras.forEach(function (p) {
      if (p.show && !p.show()) return;
      var fc = p.ring || p.goal ? p.face : wTurnTo(p, sc, dt, 3.2), ok = false;
      if (wRigOk()) ok = wRigExtra(p, p.y || 0, fc, dt);
      if (!ok) { if (!W.fig) W.fig = wFigure(); var M = mTRS(p.x, 0, p.z, fc, 1, p.sit ? 0.74 : 1, 1); W.fig.forEach(function (b, i) { wDraw(b, M, { c: i < 2 ? p.coat : b.c }); }); }
      if (!p.down) wShadow(p.x, p.z, 0.5);
    });
    wLights(ts);
    gTags();
  }
  // ---------- name tags over people, doors and things you can look at ----------
  function gTags() {
    var sc = W.scene, lb = W.labels; if (!lb) return;
    var list = [];
    sc.people.forEach(function (p) { if (!(p.hidden && p.hidden())) list.push([p, p.name, 'p', 2.15]); });
    sc.things.forEach(function (t) {
      var near = Math.hypot(t.x - sc.pl.x, t.z - sc.pl.z) < 3.4, hov = W.hover && W.hover.thing === t;
      if (t.door || near || hov) list.push([t, (t.door ? '› ' : '') + t.name, t.door ? (t.off ? 'd off' : 'd') : 't', (t.hy || 0.6) + 0.5]);
    });
    var seen = {};
    list.forEach(function (L) {
      var o = L[0], key = (L[2][0]) + ':' + o.id; seen[key] = 1;
      var el = W.tagEls[key];
      if (!el) { el = W.tagEls[key] = document.createElement('div'); el.className = 'wtag'; lb.appendChild(el); }
      var cls = 'wtag ' + L[2] + ((W.hover && (W.hover.person === o || W.hover.thing === o)) ? ' hov' : '');
      if (el.className !== cls) el.className = cls;
      if (el._t !== L[1]) { el._t = L[1]; el.textContent = L[1]; }
      var q = wProject(o.x, L[3] + (o.y || 0), o.z), r = W.cv.getBoundingClientRect();
      var vis = q.x > r.left - 40 && q.x < r.right + 40 && q.y > r.top && q.y < r.bottom;
      el.style.display = vis ? '' : 'none';
      el.style.transform = 'translate(' + Math.round(q.x) + 'px,' + Math.round(q.y) + 'px) translate(-50%,-100%)';
    });
    Object.keys(W.tagEls).forEach(function (k) { if (!seen[k]) { W.tagEls[k].remove(); delete W.tagEls[k]; } });
  }

  // ---------- building a place ----------
  var VOIDG = [-90, -90, 90, 90, 4, 0, 'gravel', [0.02, 0.02, 0.025]];
  var BRICK = 'Wall_Brick_A_Diffuse_1K.png', STONEC = [0.6, 0.6, 0.62], DARKSTONE = [0.42, 0.42, 0.45];
  function gBuild(id, ctx) {
    var L = PLACES[id];
    var props = [], add = function (m, x, z, o) { if (!okM(m)) return {}; var it = { m: m, x: x, z: z }; for (var k in o || {}) it[k] = o[k]; props.push(it); return it; };
    var lights = [], marks = {};
    L.props(add, lights, marks, ctx);
    props.forEach(function (it) {
      if (it.m === 'fire') lights.push({ x: it.x, z: it.z, flat: true, w: 5 * (it.s || 1), c: [0.5, 0.26, 0.08], flick: true }, { x: it.x, z: it.z, w: 1.6 * (it.s || 1), h: 2.2 * (it.s || 1), tex: 'l_beam', c: [0.45, 0.22, 0.06], flick: true });
      if (it.m === 'lantern' || it.m === 'gl_lamp') lights.push({ x: it.x, z: it.z, flat: true, w: 3.6, c: [0.42, 0.3, 0.12], flick: true });
    });
    var people = (ctx.people || []).map(function (q, i) {
      var sp = (L.spots && L.spots[q.id]) || [i * 1.2 - 1, 0], o = sp[2] || {};
      var p = { id: 'gl_' + q.id, name: q.name, x: sp[0], z: sp[1], face: o.face, sit: o.sit, y: o.y, ax: o.ax, az: o.az, coat: o.coat || [0.3, 0.28, 0.26], rgOutfit: o.outfit, rgFemale: o.female, rgHat: o.hat, rgIdle: o.idle, noTurn: o.noTurn,
        act: function () { if (CB.talk) CB.talk(q.id); } };
      return p;
    });
    var things = [];
    (ctx.objs || []).forEach(function (q) {
      var sp = L.ospots && L.ospots[q.id]; if (!sp) return; var o = sp[2] || {};
      things.push({ kind: 'thing', id: 'o_' + q.id, name: q.name, x: sp[0], z: sp[1], hy: o.hy || 0.8, pr: o.pr || 1, ax: o.ax, az: o.az, prop: o.mark ? marks[o.mark] : null, act: function () { if (CB.look) CB.look(q.id); } });
    });
    var byPos = {};
    var order = Object.keys(L.exits || {});
    (ctx.exits || []).slice().sort(function (a, b) { return order.indexOf(a.id) - order.indexOf(b.id); }).forEach(function (q) { var sp = L.exits && L.exits[q.id]; if (!sp) return; var k = sp[0] + ',' + sp[1]; if (!byPos[k] || (!byPos[k].ok && q.ok)) byPos[k] = q; });
    (ctx.exits || []).forEach(function (q) {
      var sp = L.exits && L.exits[q.id]; if (!sp) return; var o = sp[2] || {};
      if (byPos[sp[0] + ',' + sp[1]] !== q) return;
      things.push({ kind: 'thing', door: true, off: !q.ok, id: 'x_' + q.id, name: q.name, x: sp[0], z: sp[1], hy: o.hy || 1.6, pr: o.pr || 1.1, ax: o.ax, az: o.az, act: function () { if (CB.go) CB.go(q.id); } });
    });
    var night = !!ctx.night;
    var grounds = L.grounds.map(function (g, gi) { if (gi === 0) g = [-150, -150, 150, 150].concat(g.slice(4)); return { buf: wGround(g[0], g[1], g[2], g[3], g[4], g[5]), t: wTex(g[6], W3D.tex[g[6]]), c: night && L.outdoor ? g[7].map(function (v) { return v * 0.55; }) : g[7], flow: g[8] }; });
    var st = (ctx.start && L.starts && L.starts[ctx.start]) || L.start;
    var extras = (typeof L.extras === 'function' ? L.extras(ctx) : (L.extras || [])).map(function (e, i) {
      var o = e[3] || {};
      return { id: 'gx_' + id + i, x: e[0], z: e[1], hue: e[2] || 0, sit: o.sit, face: o.face, down: o.down, y: o.y, coat: o.coat, ring: o.ring, ang: o.ang, rgOutfit: o.outfit, rgFemale: o.female, rgHat: o.hat, rgIdle: o.idle, show: o.show, name: o.name };
    });
    return {
      id: id, zoomIn: L.zoom || 7.5, camOff: L.camOff,
      pl: { x: st[0], z: st[1], face: st[2] !== undefined ? st[2] : Math.PI, moving: false },
      cam: { x: st[0], z: st[1], yaw: Math.PI / 4, pitch: 0.62, zoom: L.zoom || 7.5 },
      fog: night ? (L.nightFog || [0.03, 0.035, 0.05]) : L.fog, fogR: L.fogR || [11, 24], light: night ? (L.nightLight || [0.18, 0.3, 0.2]) : (L.light || [0.4, 0.85, 0.3]),
      grounds: grounds, props: props, people: people, things: things, lights: lights, extras: extras,
      solid: (L.solid || []).concat(people.map(function (p) { return { x: p.x, z: p.z, r: 0.35 }; })),
      bounds: L.bounds
    };
  }

  // ---------- the gaol under Fort Malice ----------
  // The camera looks from the south-east, so tall walls stand on the north (low z) and west (low x) sides of a room and only
  // knee-high stubs on the near sides, the way The Postal Trace cuts its rooms away.
  function stoneRoom(add, x0, z0, x1, z1, o) {
    o = o || {};
    if (okM(o.wall || 'mk_brick')) wRoom(add, x0, z0, x1, z1, { wall: o.wall || 'mk_brick', win: o.win || 'mk_brickwin', wins: o.wins || [], door: o.door, hs: o.hs });
    props_tint(add, o.tint);
  }
  function props_tint() {}
  var PLACES = {};

  PLACES.cell = {
    props: function (add, lights) {
      var T = [0.55, 0.55, 0.58];
      // the back wall of the Row, cut into the rock: Cell Eight, Cell Nine, Cell Ten side by side
      if (okM('mk_brick')) {
        for (var x = -7; x < 7; x += 2) add('mk_brick', x + 1, -3, { h: 3.12, sx: 1, tint: T, mat: 'mv_mwall' });
        for (var z = -3; z < 2; z += 2) add('mk_brick', -7, z + 1, { h: 3.12, r: Math.PI / 2, sx: 1, tint: T, mat: 'mv_mwall' });
      } else {
        add('mn_wall_a', -4, -3.1, { h: 3.2 }); add('mn_wall_a', 0.5, -3.1, { h: 3.2 }); add('mn_wall_a', 5, -3.1, { h: 3.2 });
      }
      // bars between the cells, and along the front onto the corridor
      barsLine(add, -2.5, -3, -2.5, 2); barsLine(add, 2.5, -3, 2.5, 2);
      barsLine(add, -7, 2, -3.1, 2); barsLine(add, 3.1, 2, 7, 2);
      add('gl_door', -2.85, 2, { r: 0 }); add('gl_door', 2.85, 2, { r: 0 });
      // Cell Nine's own door, oak and strap iron, with the number over it
      add('gl_door', 0, 2.02, {}); barsLine(add, -2.5, 2, -0.6, 2); barsLine(add, 0.6, 2, 2.5, 2);
      add('gl_nine', 0, 2.06, { y: 2.3 });
      add('gl_shelf', 1.2, -2.3, { r: 0 }); add('gl_bucket', 2.0, 0.9, {}); add('gl_drain', 0, -0.4, {});
      // Tobit's cell to the west, with his shelf and his slate; another man's to the east
      add('gl_shelf', -4.8, -2.3, {}); add('gl_shelf', 4.8, -2.3, {}); add('gl_bucket', -6.2, 1.2, {});
      // the corridor beyond: a lamp in a niche
      add('lantern', 0.8, 3.2, { y: 1.6 }); add('lantern', -6, 3.2, { y: 1.6 });
      lights.push({ x: 0, z: -0.4, w: 0.8, h: 2.4, tex: 'l_shaft', r: 0, rz: 0.1, c: [0.1, 0.11, 0.13] });
    },
    spots: { tobit: [-4.6, -1.7, { sit: true, face: 0.6, outfit: 'shirt', coat: [0.4, 0.36, 0.3], hat: null, noTurn: true, ax: -2.9, az: -0.8 }], bask: [0.6, 3.0, { face: Math.PI, outfit: 'greatcoat', coat: [0.2, 0.2, 0.24], idle: 'lantern', ax: 0.4, az: 1.5 }] },
    ospots: { nine: [0, 2.1, { hy: 2.8, ax: 0, az: 1.3 }], wall: [-1.2, -2.9, { hy: 1.4, ax: -1.2, az: -2.0 }], drain: [0, -0.4, { hy: 0.2, ax: 0.4, az: 0.3 }], door: [0.5, 2.0, { hy: 1.5, ax: 0.5, az: 1.3 }] },
    exits: { yard: [-1.3, 1.9, { hy: 0.5, ax: -1.2, az: 1.3 }], records: [-1.3, 1.9, { hy: 0.5, ax: -1.2, az: 1.3 }], wall: [-1.3, 1.9, { hy: 0.5, ax: -1.2, az: 1.3 }] },
    extras: [[4.6, -1.8, 1.4, { sit: true, face: -0.5, outfit: 'shirt' }]],
    grounds: [VOIDG, [-7, -3, 7, 2, 2, 0.02, 't_stone', [0.5, 0.5, 0.52]], [-7, 2, 7, 4.2, 2, 0.03, 'gravel', [0.4, 0.4, 0.42]]],
    solid: [{ x0: 0.1, x1: 2.3, z0: -2.8, z1: -1.8 }, { x: 2.0, z: 0.9, r: 0.3 }],
    bounds: [-2.2, -2.6, 2.2, 1.6], start: [0, 0.6, Math.PI], zoom: 5.4, camOff: [-0.5, -0.6],
    fog: [0.045, 0.045, 0.05], fogR: [8, 18], light: [0.25, 0.6, 0.3], nightLight: [0.12, 0.35, 0.2], nightFog: [0.02, 0.02, 0.028]
  };

  PLACES.yard = {
    outdoor: true,
    props: function (add, lights, marks, ctx) {
      var H = { h: 4.2, tint: [0.78, 0.76, 0.74] };
      if (okM('c_walk')) {
        wLineZ(add, 'c_walk', -14, -14, 14, -14, H); wLineZ(add, 'c_walk', -14, -14, -14, 10, H); wLineZ(add, 'c_walk', 14, -14, 14, 10, H);
        wLineZ(add, 'c_walk', -14, 10, -3, 10, H); wLineZ(add, 'c_walk', 3, 10, 14, 10, H);
        add('c_gate', 0, 10, { h: 4.3, r: Math.PI / 2 });
        [[14, -14], [-14, 10], [14, 10]].forEach(function (t, i) { add('c_tower', t[0], t[1], { h: 4.6, r: i * 0.7 }); add('c_towertop', t[0], t[1], { h: 4.8, y: 4.6, r: i * 0.7 }); });
        add('c_towerdoor', -14, -2, { h: 4.6, r: 0.3 }); add('c_towertop', -14, -2, { h: 4.8, y: 4.6, r: 0.3 });
      } else {
        for (var x = -14; x < 14; x += 2) add('mk_brick', x + 1, -14, { h: 4.2, sx: 1 });
      }
      // the bell tower where the wall drops lowest, with the lamp in its cage on top
      add('ch_tower', -12, -12, { r: Math.PI / 4 }); add('gl_lamp', -12, -12, { y: 12.3 });
      // the grate across the yard, men on this side, women beyond
      barsLine(add, 6, -14, 6, 10);
      add('f_bench', -6, 1.8, { h: 0.58, r: Math.PI / 2 });
      add('gl_scaffold', 0, -6, { show: function () { return CTX && CTX.hrs >= 40; } });
      add('f_crate', 2.2, -7.6, { h: 0.5, show: function () { return CTX && CTX.hrs >= 40; } });
      add('f_barrel', -12.6, 8.4, { h: 1 }); add('f_barrel', -11.8, 8.9, { h: 1 }); add('gl_bucket', 4.6, 8.2, {});
      if (ctx.night) lights.push({ x: -8, z: -8, flat: true, w: 6, c: [0.35, 0.3, 0.16] });
    },
    spots: { comrade: [-2.8, 6.2, { face: Math.PI * 0.85, outfit: 'tunic', coat: [0.34, 0.3, 0.24], hat: null, ax: -2.8, az: 7.4 }], brannock: [-6, 2.6, { sit: true, face: Math.PI, outfit: 'tunic', coat: [0.3, 0.33, 0.26], ax: -6, az: 3.8 }], ysolde: [7.4, -1, { face: -Math.PI / 2, outfit: 'dress_shawl', female: true, coat: [0.28, 0.34, 0.28], hat: null, ax: 5.2, az: -1 }] },
    ospots: { tower: [-11.4, -10.6, { hy: 3.4, ax: -10, az: -9 }], gallows: [0, -6, { hy: 2.2, ax: 1.2, az: -3.6 }], grate: [6, 3, { hy: 1.4, ax: 5, az: 3 }] },
    exits: { cell: [0, 9.4, { hy: 2.4, ax: 0, az: 8.4 }], chapel: [-12.6, -9.4, { hy: 2.4, ax: -11, az: -8.4 }], kitchen: [-13.4, -2, { hy: 2.4, ax: -12.2, az: -2 }], infirmary: [-13.4, 5, { hy: 2.4, ax: -12.2, az: 5 }], records: [3.6, 9.4, { hy: 2.4, ax: 3.6, az: 8.4 }] },
    extras: function (ctx) {
      var e = [];
      for (var i = 0; i < 9; i++) { var a = i / 9 * Math.PI * 2; e.push([-3 + Math.cos(a) * 4.5, -1 + Math.sin(a) * 4.5, i * 0.7, { ring: [-3, -1, 4.5], ang: a, outfit: ['shirt', 'rolled', 'tunic', 'waistcoat'][i % 4] }]); }
      e.push([-7.4, 2.4, 2.2, { face: 0.4, outfit: 'rolled' }], [-4.6, 3, 3.1, { face: -0.6, outfit: 'tunic' }]);
      e.push([8.6, -4, 0.8, { female: true, outfit: 'dress', face: -1.4 }], [9.2, 2.6, 1.9, { female: true, outfit: 'dress_apron', sit: true, face: -1.2 }], [11, -8, 2.6, { female: true, outfit: 'dress_shawl', face: -2.2 }]);
      if (ctx.hrs >= 40) e.push([1.4, -6.6, 0.3, { outfit: 'rolled_apron', idle: 'chop', face: -1.4 }], [-1.6, -7.2, 1.2, { outfit: 'shirt_apron', face: 1.2 }]);
      e.push([2.4, 9.0, 0.1, { name: 'Turnkey', outfit: 'greatcoat', coat: [0.18, 0.18, 0.22], face: Math.PI }], [-2.4, 9.0, 0.5, { name: 'Turnkey', outfit: 'greatcoat', coat: [0.18, 0.18, 0.22], face: Math.PI }]);
      return e;
    },
    grounds: [[-40, -40, 40, 40, 3.6, 0, 'grass', [0.4, 0.42, 0.38]], [-14, -14, 14, 10, 2.4, 0.04, 't_paving', [0.62, 0.6, 0.58]], [-8, -6, 2, 4, 2.4, 0.08, 'mud', [0.7, 0.66, 0.62]]],
    solid: [{ x0: -6.9, x1: -5.1, z0: 1.4, z1: 2.2 }, { x: -12, z: -12, r: 2.6 }, { x: -12.2, z: 8.6, r: 1 }],
    bounds: [-12.8, -12.8, 5.6, 9], start: [0, 7.6, Math.PI], zoom: 8.5, camOff: [-0.8, -1.6],
    fog: [0.16, 0.17, 0.19], fogR: [16, 34], light: [0.45, 0.75, 0.35], nightFog: [0.03, 0.035, 0.05], nightLight: [0.15, 0.3, 0.25]
  };

  PLACES.chapel = {
    props: function (add, lights, marks, ctx) {
      var GLASS = [0.8, 0.78, 0.74];
      if (okM('g_window')) {
        wLine(add, 'g_window', -7, -12.6, -7, -1.0, { h: 5.6, tint: GLASS });
        wLine(add, 'g_window2', -7, -12.6, 7, -12.6, { h: 5.6, tint: GLASS });
        [[-7, -12.6, 6.2], [7, -12.6, 6.2], [-7, -1.0, 6.2], [7, -1.0, 6.2]].forEach(function (p) { add('g_post6', p[0], p[1], { h: p[2], tint: [0.72, 0.7, 0.67] }); });
        add('g_post', -2.4, -1.0, { h: 2.4 }); add('g_post', 2.4, -1.0, { h: 2.4 });
      } else {
        for (var x = -7; x < 7; x += 2) add('mk_brick', x + 1, -12.6, { h: 5, sx: 1 });
        for (var z = -12.6; z < -1; z += 2) add('mk_brick', -7, z + 1, { h: 5, r: Math.PI / 2, sx: 1 });
      }
      add('ch_ruin', 7, -9.6, { r: Math.PI / 2, sy: 0.55 }); add('ch_ruin', 7, -5.2, { r: Math.PI / 2, sy: 0.4 });
      add('ch_ruin', -4.6, -1.0, { r: Math.PI, sy: 0.35 }); add('ch_ruin', 4.6, -1.0, { sy: 0.35 });
      add('altar', 0, -11.4, {}); add('banner', -1.6, -12.2, { r: 0.1 }); add('banner', 1.6, -12.2, { r: -0.1 });
      add('lantern', -0.7, -11.4, { y: 1.05 }); add('lantern', 0.7, -11.4, { y: 1.05 });
      [-9.2, -7.6, -6, -4.4].forEach(function (z) { add('f_bench', -2.8, z, { h: 0.58 }); add('f_bench', 2.8, z, { h: 0.58 }); });
      add('ch_rope', -6.2, -2.0, { y: 1.6, sway: 0.03 }); add('ch_beam', -6.6, -1.5, {});
      add('gl_lectern', -4.2, -10.4, { r: 0.5 });
      if (ctx.assize) { add('gl_trestle', 0, -9.8, {}); add('papers', -0.4, -9.8, { h: 0.04, y: 0.95, r: 0.2 }); add('f_chair', -1.2, -10.8, { h: 1.2 }); add('f_chair', 0, -10.8, { h: 1.2 }); add('f_chair', 1.2, -10.8, { h: 1.2 }); add('f_box', 2.6, -9.6, { h: 0.6 }); }
      shafts(lights, -12.6, [-4.5, 4.5]); shafts(lights, -12.6, [0], 0.25);
    },
    spots: { quill: [1.8, -10.2, { face: 0.4, outfit: 'greatcoat', coat: [0.1, 0.1, 0.12], hat: null, ax: 1.8, az: -9 }] },
    ospots: { rope: [-6.2, -2.0, { hy: 2.4, ax: -5.2, az: -2.6 }], candles: [0.6, -11.4, { hy: 1.4, ax: 0.6, az: -10.2 }], register: [-4.2, -10.4, { hy: 1.4, ax: -3.6, az: -9.6 }] },
    exits: { yard: [0, -1.2, { hy: 2.2, ax: 0, az: -2.0 }] },
    extras: function (ctx) {
      if (!ctx.assize) return [[-2.8, -6.6, 0.9, { sit: true, face: Math.PI, outfit: 'shirt' }], [3.2, -5, 2.4, { sit: true, face: Math.PI, outfit: 'rolled' }]];
      var e = [[-1.2, -10.4, 0.2, { sit: true, face: 0, outfit: 'greatcoat', coat: [0.22, 0.2, 0.2], name: 'Crake' }], [0, -10.4, 0.6, { sit: true, face: 0, outfit: 'coat', coat: [0.3, 0.26, 0.22], name: 'Holloway' }], [1.2, -10.4, 1.2, { sit: true, face: 0, outfit: 'coat', coat: [0.2, 0.24, 0.2], name: 'Pruett' }]];
      [-9.2, -7.6, -6, -4.4].forEach(function (z, i) { [-3.6, -2.2, 2.2, 3.6].forEach(function (x, j) { e.push([x, z + 0.1, i * 1.3 + j, { sit: true, face: Math.PI, outfit: ['shirt', 'rolled', 'tunic', 'dress'][(i + j) % 4], female: (i + j) % 4 === 3 }]); }); });
      return e;
    },
    grounds: [VOIDG, [-7, -12.6, 7, -1, 2.4, 0.02, 't_tiles', [0.6, 0.58, 0.55]], [-1, -11, 1, -1, 2, 0.05, 't_rug1', [0.7, 0.4, 0.36]]],
    solid: [{ x: 0, z: -11.4, r: 1.1 }, { x0: -3.9, x1: -1.7, z0: -9.6, z1: -4 }, { x0: 1.7, x1: 3.9, z0: -9.6, z1: -4 }, { x: -4.2, z: -10.4, r: 0.4 }, { x: -6.4, z: -1.6, r: 0.4 }],
    bounds: [-6.4, -12, 6.4, -1.6], start: [0, -2.2, Math.PI], zoom: 7.2, camOff: [-0.6, -1.4],
    fog: [0.07, 0.07, 0.08], fogR: [14, 28], light: [0.35, 0.6, 0.3]
  };

  PLACES.kitchen = {
    props: function (add, lights) {
      stoneRoom(add, -6, -5, 6, 5, { wins: [2], door: 3 });
      add('gl_oven', -3.4, -4.0, {}); add('gl_oven', 0.4, -4.0, {}); add('fire', -3.4, -3.0, { s: 0.45, flick: true }); add('fire', 0.4, -3.0, { s: 0.45, flick: true });
      add('gl_trestle', -1.2, 0.2, {}); add('gl_trestle', 2.4, 0.2, {});
      add('sacks', 4.4, -3.6, { s: 0.9, tint: [0.95, 0.9, 0.8] }); add('sacks', 5, -2.4, { s: 0.8, tint: [0.95, 0.9, 0.8] });
      add('f_barrel', -5.2, 3.6, { h: 1 }); add('f_barrel', -4.4, 4.1, { h: 1 }); add('f_shelf', 5.4, 1.4, { h: 2, r: -Math.PI / 2 });
      add('gl_drain', 4.8, -4.4, {});
    },
    spots: {},
    ospots: { chute: [4.8, -4.4, { hy: 0.4, ax: 4.2, az: -3.4 }], gage: [-2.6, 1.6, { hy: 2.3, ax: -2.6, az: 2.6 }] },
    exits: { yard: [0, 4.9, { hy: 1.6, ax: 0, az: 4.0 }] },
    extras: [[-2.6, 1.4, 0.4, { face: Math.PI, female: true, outfit: 'dress_apron', coat: [0.42, 0.3, 0.28], name: 'Mother Gage', idle: 'arms' }], [-1.4, -0.6, 1.4, { face: 0, outfit: 'rolled_apron', idle: 'push' }], [2.4, -0.6, 2.9, { face: 0, outfit: 'rolled', idle: 'push' }], [3.6, 1.2, 1.9, { face: Math.PI, outfit: 'shirt_apron', idle: 'push' }]],
    grounds: [VOIDG, [-6, -5, 6, 5, 2, 0.02, 't_cobble2', [0.6, 0.56, 0.52]]],
    solid: [{ x0: -4.6, x1: 1.6, z0: -5, z1: -3.1 }, { x0: -2.9, x1: 0.5, z0: -0.4, z1: 0.8 }, { x0: 0.7, x1: 4.1, z0: -0.4, z1: 0.8 }, { x0: 3.8, x1: 6, z0: -4.2, z1: -1.8 }, { x0: -6, x1: -3.8, z0: 3, z1: 5 }, { x0: 4.9, x1: 6, z0: 0.4, z1: 2.4 }],
    bounds: [-5.5, -4.5, 5.5, 4.6], start: [0, 3.8, Math.PI], zoom: 6.2, camOff: [-0.6, -1.4],
    fog: [0.07, 0.05, 0.04], fogR: [12, 26], light: [0.35, 0.55, 0.25]
  };

  PLACES.infirmary = {
    props: function (add, lights) {
      stoneRoom(add, -7, -5, 7, 5, { wins: [1, 4], door: 4 });
      [-5, -2.6, -0.2].forEach(function (x) { add('gl_cot', x, -3.4, {}); });
      [3.4, 5.4].forEach(function (x) { add('gl_cot', x, -3.4, {}); });
      add('gl_sheet', 5.4, -3.4, {});
      add('brazier', 1.6, 0.4, {}); add('fire', 1.6, 0.4, { s: 0.35, flick: true, y: 0.8 });
      add('gl_trestle', -4.6, 1.6, {}); add('papers', -4.2, 1.6, { h: 0.04, y: 0.95, r: 0.3 }); add('lantern', -5.4, 1.6, { y: 0.95 });
      add('f_shelf', -6.4, -0.6, { h: 2, r: Math.PI / 2 }); add('f_shelf', 6.4, 1.6, { h: 2, r: -Math.PI / 2 });
      shafts(lights, -5, [-3.5, 3.5]);
    },
    spots: { hesketh: [-3.4, 0.4, { face: 0.6, outfit: 'shirt_apron', coat: [0.5, 0.46, 0.4], hat: null, ax: -3, az: 1.4 }] },
    ospots: { tray: [-4.6, 1.6, { hy: 1.2, ax: -4.6, az: 2.7 }], shelf: [6.2, 1.6, { hy: 1.8, ax: 5.2, az: 1.6 }], sheet: [5.4, -3.4, { hy: 0.9, ax: 5.4, az: -2.0 }] },
    exits: { yard: [1, 4.9, { hy: 1.6, ax: 1, az: 4.0 }] },
    extras: [[-2.6, -3.4, 1.1, { down: true, face: Math.PI / 2, y: 0.55, outfit: 'shirt' }], [-0.2, -3.0, 2.8, { sit: true, face: 0.2, outfit: 'shirt', y: 0.1 }]],
    grounds: [VOIDG, [-7, -5, 7, 5, 2, 0.02, 't_check', [0.6, 0.6, 0.58]]],
    solid: [{ x0: -5.6, x1: 0.4, z0: -4.6, z1: -2.3 }, { x0: 2.8, x1: 6.0, z0: -4.6, z1: -2.3 }, { x: 1.6, z: 0.4, r: 0.6 }, { x0: -6.3, x1: -2.9, z0: 1.0, z1: 2.2 }, { x0: -7, x1: -5.8, z0: -1.6, z1: 0.4 }, { x0: 5.8, x1: 7, z0: 0.6, z1: 2.6 }],
    bounds: [-6.5, -4.5, 6.5, 4.6], start: [1, 3.8, Math.PI], zoom: 6.6, camOff: [-0.6, -1.4],
    fog: [0.06, 0.055, 0.05], fogR: [12, 26], light: [0.35, 0.55, 0.25]
  };

  PLACES.records = {
    props: function (add, lights, marks, ctx) {
      stoneRoom(add, -6, -5, 6, 5, { wall: 'mk_wall', win: 'mk_wallwin', wins: [1, 4], door: 3 });
      add('f_shelfwide', -3.6, -4.5, { h: 2.2 }); add('f_shelfwide', -1.2, -4.5, { h: 2.2 }); add('f_shelf', -5.5, -2.4, { h: 2.1, r: Math.PI / 2 }); add('f_shelf', -5.5, -0.6, { h: 2.1, r: Math.PI / 2 }); add('f_shelf', -5.5, 1.2, { h: 2.1, r: Math.PI / 2 });
      add('f_doortall', 2.6, -4.9, { h: 3.0 });
      add('gl_chest', 2.6, -3.8, {});
      add('f_tablesq', -2.8, 0.4, { h: 1 }); add('papers', -2.8, 0.4, { h: 0.04, y: 1, r: 0.3 }); add('f_chair2', -2.8, -0.6, { h: 1.18 });
      add('lantern', -2.2, 0.1, { y: 1 }); add('clock', 0.6, -4.6, { s: 0.85 });
      if (!ctx.night) { add('mk_chimney', 5.5, 0.6, { h: 3.1, r: -Math.PI / 2 }); add('fire', 4.9, 0.6, { s: 0.55, flick: true }); add('gl_bucket', 1.4, 2.4, {}); }
      if (ctx.night) lights.push({ x: -3.4, z: -4.4, y: 0, w: 1.4, h: 3.4, tex: 'l_shaft', r: 0, rz: 0.4, c: [0.16, 0.18, 0.26] }, { x: -2.6, z: -2.6, flat: true, w: 2.2, d: 2.6, c: [0.1, 0.11, 0.16] });
      else shafts(lights, -5, [-3.4, 1.0]);
    },
    spots: { pruett: [-2.8, -0.7, { sit: true, face: 0, outfit: 'coat', coat: [0.24, 0.27, 0.22], hat: null, noTurn: true, ax: -2.8, az: 1.6 }] },
    ospots: { chest: [2.6, -3.8, { hy: 0.9, ax: 2.6, az: -2.6 }], desk: [-2.8, 0.4, { hy: 1.3, ax: -1.6, az: 1.2 }] },
    exits: { yard: [0, 4.9, { hy: 1.6, ax: 0, az: 4.0 }], cell: [0, 4.9, { hy: 1.6, ax: 0, az: 4.0 }] },
    extras: [],
    grounds: [VOIDG, [-6, -5, 6, 5, 2, 0.02, 't_planks', [0.55, 0.48, 0.42]], [-1, -2, 3.4, 1.6, 3, 0.05, 't_rug2', [0.6, 0.4, 0.36]]],
    solid: [{ x0: -5, x1: 0.2, z0: -5, z1: -4 }, { x0: -6, x1: -4.9, z0: -3.2, z1: 2 }, { x0: 1.9, x1: 3.3, z0: -4.4, z1: -3.3 }, { x0: -3.6, x1: -2, z0: -0.4, z1: 1.2 }, { x: -2.8, z: -0.7, r: 0.4 }, { x0: 4.9, x1: 6, z0: -0.4, z1: 1.6 }],
    bounds: [-5.5, -4.5, 5.5, 4.6], start: [0, 3.8, Math.PI], zoom: 6.0, camOff: [-0.6, -1.4],
    fog: [0.06, 0.05, 0.045], fogR: [12, 26], light: [0.35, 0.55, 0.25], nightFog: [0.015, 0.016, 0.024], nightLight: [0.1, 0.25, 0.2]
  };

  PLACES.wall = {
    outdoor: true,
    props: function (add, lights) {
      var H = { h: 4.2, tint: [0.7, 0.7, 0.74] };
      if (okM('c_walk')) { wLineZ(add, 'c_walk', -10, -10, 10, -10, H); wLineZ(add, 'c_walk', -10, -10, -10, 10, H); add('c_tower', 10, -10, { h: 4.6 }); add('c_towertop', 10, -10, { h: 4.8, y: 4.6 }); }
      add('ch_tower', -8, -8, { r: Math.PI / 4 }); add('gl_lamp', -8, -8, { y: 12.3 });
      add('gl_door', -6.5, -6.6, { r: -Math.PI / 4 });
      add('f_barrel', 2, -8.6, { h: 1 }); add('gl_scaffold', 4, 2, { show: function () { return CTX && CTX.hrs >= 40; } });
      lights.push({ x: -4, z: -3, flat: true, w: 7, c: [0.3, 0.26, 0.14] });
    },
    spots: {},
    ospots: { postern: [-6.5, -6.6, { hy: 1.6, ax: -5.6, az: -5.6 }], angle: [-9, -4.5, { hy: 3.4, ax: -8, az: -3.6 }] },
    exits: { cell: [4, 7, { hy: 1.6, ax: 4, az: 6.2 }], records: [7, 2, { hy: 1.6, ax: 6.2, az: 2 }] },
    extras: [],
    grounds: [[-40, -40, 40, 40, 3.6, 0, 'grass', [0.3, 0.32, 0.3]], [-10, -10, 10, 10, 2.4, 0.04, 't_paving', [0.55, 0.53, 0.52]]],
    solid: [{ x: -8, z: -8, r: 2.6 }, { x: 2, z: -8.6, r: 0.6 }],
    bounds: [-9.2, -9.2, 9, 9], start: [-1, 1, -2.4], zoom: 8.2, camOff: [-0.8, -1.4],
    fog: [0.03, 0.035, 0.05], fogR: [14, 30], light: [0.15, 0.3, 0.25], nightFog: [0.025, 0.03, 0.045], nightLight: [0.14, 0.3, 0.24]
  };

  // ---------- what the game calls ----------
  function gShow(id, ctx) {
    if (!PLACES[id]) return gHide();
    if (!wInit()) return false;
    if (!W.blob) W.blob = wDisc();
    if (!W.tagEls) W.tagEls = {};
    CTX = ctx;
    var key = id + '|' + (ctx.night ? 1 : 0) + '|' + (ctx.assize ? 1 : 0) + '|' + (ctx.hrs >= 40 ? 1 : 0);
    var fresh = !W.scene || CUR !== key;
    if (fresh) {
      var prev = W.scene;
      W.scene = gBuild(id, ctx);
      if (prev && W.scene.id === prev.id) { W.scene.pl.x = prev.pl.x; W.scene.pl.z = prev.pl.z; W.scene.pl.face = prev.pl.face; W.scene.cam = prev.cam; }
      CUR = key;
    } else {
      // the same place: refresh who is here and what can be looked at, keep where you stand
      var nb = gBuild(id, ctx);
      W.scene.people = nb.people.map(function (p) { var old = W.scene.people.filter(function (q) { return q.id === p.id; })[0]; return old ? Object.assign(old, { act: p.act, name: p.name }) : p; });
      W.scene.things = nb.things; W.scene.solid = nb.solid;
    }
    document.body.classList.add('w3d');
    W.on = true;
    if (!W.raf) W.raf = requestAnimationFrame(gFrame);
    return true;
  }
  function gHide() {
    W.on = false; document.body.classList.remove('w3d');
    if (W.tagEls) Object.keys(W.tagEls).forEach(function (k) { W.tagEls[k].remove(); delete W.tagEls[k]; });
  }
  window.G3D = { show: gShow, hide: gHide, on: function (cbs) { CB = cbs; }, ok: function () { return typeof W3D !== 'undefined' && !!W3D.models; }, places: PLACES };

})();
