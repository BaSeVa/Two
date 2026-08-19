/*
 * rng.js — детерминированный генератор псевдослучайных чисел.
 * Вся карта строится только из потока чисел этого ГПСЧ: одинаковое зерно
 * (seed) всегда даёт одинаковый город.
 */
(function (global) {
  'use strict';
  const CM = (global.CM = global.CM || {});

  /** cyrb128 — хэш строки в четыре 32-битных числа. */
  function cyrb128(str) {
    let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
    for (let i = 0; i < str.length; i++) {
      const k = str.charCodeAt(i);
      h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
      h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
      h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
      h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
    h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
    h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
  }

  /** mulberry32 — быстрый 32-битный ГПСЧ с периодом 2^32. */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  class RNG {
    constructor(seed) {
      const h = cyrb128(String(seed));
      // важно смешивать слова хэша умножением: простой XOR всех четырёх
      // выходов cyrb128 всегда даёт 0 и обнуляет зависимость от зерна
      let st = h[0];
      st = (st ^ Math.imul(h[1] ^ (st >>> 13), 0x9E3779B1)) >>> 0;
      st = (st ^ Math.imul(h[2] ^ (st >>> 11), 0x85EBCA6B)) >>> 0;
      st = (st ^ Math.imul(h[3] ^ (st >>> 15), 0xC2B2AE35)) >>> 0;
      this._next = mulberry32(st);
      this._spare = null;
      for (let i = 0; i < 8; i++) this._next(); // прогрев
    }
    /** [0, 1) */
    float() { return this._next(); }
    /** [a, b) */
    range(a, b) { return a + (b - a) * this._next(); }
    /** целое из [a, b] */
    int(a, b) { return Math.floor(a + (b - a + 1) * this._next()); }
    /** true с вероятностью p */
    bool(p) { return this._next() < (p === undefined ? 0.5 : p); }
    /** случайный элемент массива */
    pick(arr) { return arr[Math.floor(this._next() * arr.length)]; }
    /** знак: -1 или 1 */
    sign() { return this._next() < 0.5 ? -1 : 1; }
    /** выбор по весам: [[значение, вес], ...] */
    weighted(pairs) {
      let total = 0;
      for (const p of pairs) total += p[1];
      let r = this._next() * total;
      for (const p of pairs) { r -= p[1]; if (r <= 0) return p[0]; }
      return pairs[pairs.length - 1][0];
    }
    /** нормальное распределение (метод Бокса — Мюллера) */
    gauss(mean, dev) {
      if (this._spare !== null) { const s = this._spare; this._spare = null; return mean + dev * s; }
      let u = 0, v = 0, s = 0;
      do {
        u = this._next() * 2 - 1; v = this._next() * 2 - 1; s = u * u + v * v;
      } while (s >= 1 || s === 0);
      const mul = Math.sqrt(-2 * Math.log(s) / s);
      this._spare = v * mul;
      return mean + dev * u * mul;
    }
    /** перемешивание массива на месте (Фишер — Йетс) */
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(this._next() * (i + 1));
        const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      return arr;
    }
  }

  /** Отдельный поток случайных чисел для части карты (квартал, ячейка...). */
  CM.rngFor = function (seed, tag) { return new RNG(seed + '::' + tag); };
  CM.RNG = RNG;
  CM.cyrb128 = cyrb128;

  /** Случайное зерно в виде читаемой строки. */
  CM.randomSeed = function () {
    const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 8; i++) s += abc[Math.floor(Math.random() * abc.length)];
    return s;
  };
})(window);
