/* geometry.js — небольшой набор геометрических утилит. */
(function (global) {
  'use strict';
  const CM = (global.CM = global.CM || {});
  const TAU = Math.PI * 2;

  const G = {
    TAU,
    lerp: (a, b, t) => a + (b - a) * t,
    clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
    smoothstep(t) { t = G.clamp(t, 0, 1); return t * t * (3 - 2 * t); },

    dist(a, b) { const dx = a[0] - b[0], dy = a[1] - b[1]; return Math.hypot(dx, dy); },

    polyCentroid(poly) {
      let x = 0, y = 0, a = 0;
      for (let i = 0, n = poly.length; i < n; i++) {
        const p = poly[i], q = poly[(i + 1) % n];
        const cross = p[0] * q[1] - q[0] * p[1];
        a += cross; x += (p[0] + q[0]) * cross; y += (p[1] + q[1]) * cross;
      }
      if (Math.abs(a) < 1e-9) { // вырожденный многоугольник — среднее вершин
        let sx = 0, sy = 0;
        for (const p of poly) { sx += p[0]; sy += p[1]; }
        return [sx / poly.length, sy / poly.length];
      }
      a *= 0.5;
      return [x / (6 * a), y / (6 * a)];
    },

    polyArea(poly) {
      let a = 0;
      for (let i = 0, n = poly.length; i < n; i++) {
        const p = poly[i], q = poly[(i + 1) % n];
        a += p[0] * q[1] - q[0] * p[1];
      }
      return Math.abs(a) * 0.5;
    },

    pointInPolygon(pt, poly) {
      let inside = false;
      const x = pt[0], y = pt[1];
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
      return inside;
    },

    /** Квадрат расстояния от точки до отрезка. */
    distSqToSegment(p, a, b) {
      const vx = b[0] - a[0], vy = b[1] - a[1];
      const wx = p[0] - a[0], wy = p[1] - a[1];
      const len2 = vx * vx + vy * vy;
      let t = len2 > 0 ? (wx * vx + wy * vy) / len2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const dx = wx - vx * t, dy = wy - vy * t;
      return dx * dx + dy * dy;
    },

    /** Минимальное расстояние от точки до ломаной. */
    distToPolyline(p, pts) {
      let best = Infinity;
      for (let i = 0; i < pts.length - 1; i++) {
        const d = G.distSqToSegment(p, pts[i], pts[i + 1]);
        if (d < best) best = d;
      }
      return Math.sqrt(best);
    },

    /** Сглаживание ломаной сплайном Катмулла — Рома. */
    smoothPath(pts, samples) {
      if (pts.length < 3) return pts.slice();
      const out = [];
      const n = pts.length;
      const at = (i) => pts[G.clamp(i, 0, n - 1)];
      for (let i = 0; i < n - 1; i++) {
        const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
        for (let s = 0; s < samples; s++) {
          const t = s / samples, t2 = t * t, t3 = t2 * t;
          out.push([
            0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
            0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
          ]);
        }
      }
      out.push(pts[n - 1].slice());
      return out;
    },

    /** Габаритный прямоугольник набора точек. */
    bounds(pts) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of pts) {
        if (p[0] < minX) minX = p[0];
        if (p[1] < minY) minY = p[1];
        if (p[0] > maxX) maxX = p[0];
        if (p[1] > maxY) maxY = p[1];
      }
      return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
    },
  };

  CM.G = G;
})(window);
