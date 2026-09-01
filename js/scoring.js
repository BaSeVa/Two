/* ============================================================
   scoring.js — расчёт оценок по системе ISU (упрощённая модель)
   TES (Total Element Score) + TCS (Total Component Score)
   − сбавки = TSS (Total Segment Score)
   ============================================================ */

(function (global) {
  "use strict";

  function round2(x) {
    return Math.round((x + Number.EPSILON) * 100) / 100;
  }

  // Урезанное среднее: убираем один максимум и один минимум (если оценок > 2),
  // как упрощённая имитация схемы отбора судейских оценок ISU.
  function trimmedMean(values) {
    const arr = (values || [])
      .filter((v) => v !== null && v !== undefined && v !== "" && !Number.isNaN(Number(v)))
      .map(Number)
      .sort((a, b) => a - b);
    if (arr.length === 0) return 0;
    if (arr.length <= 2) {
      return round2(arr.reduce((a, b) => a + b, 0) / arr.length);
    }
    const trimmed = arr.slice(1, arr.length - 1);
    return round2(trimmed.reduce((a, b) => a + b, 0) / trimmed.length);
  }

  function jumpPartValue(settings, code, rev) {
    const j = settings.jumps[code];
    if (!j) return 0;
    return Number(j[rev]) || 0;
  }

  // Формирует читаемое обозначение элемента (напр. "3Lz+3T<<", "CCSp4", "StSq3")
  function elementLabel(el) {
    if (el.kind === "jump") {
      const base = (el.parts || []).map((p) => `${p.rev}${p.code}`).join("+");
      let suffix = "";
      if (el.flags.invalid) suffix += " (не засчитан)";
      else {
        if (el.flags.down) suffix += "<<";
        else if (el.flags.under) suffix += "<";
        if (el.flags.edge) suffix += "e";
        if (el.flags.seq) suffix += " SEQ";
      }
      return base + suffix;
    }
    if (el.kind === "spin") return `${el.code}${el.level}` + (el.flags.invalid ? " (не засчитан)" : "");
    if (el.kind === "step") return `${el.code}${el.level}` + (el.flags.invalid ? " (не засчитан)" : "");
    if (el.kind === "dance") return `${el.code}${el.level}` + (el.flags.invalid ? " (не засчитан)" : "");
    if (el.kind === "choreo") return `${el.code}` + (el.flags.invalid ? " (не засчитан)" : "");
    return el.code || "?";
  }

  function elementBaseValue(settings, el) {
    if (el.kind === "jump") {
      let sum = 0;
      const parts = el.parts || [];
      parts.forEach((p, idx) => {
        let rev = p.rev;
        if (el.flags.down && idx === parts.length - 1) {
          rev = Math.max(1, rev - 1);
        }
        sum += jumpPartValue(settings, p.code, rev);
      });
      if (el.flags.under) sum *= 0.7;
      if (el.flags.seq) sum *= 0.8;
      return round2(sum);
    }
    if (el.kind === "spin") {
      const s = settings.spins[el.code];
      if (!s) return 0;
      return Number(s[el.level]) || 0;
    }
    if (el.kind === "step") {
      const s = settings.steps[el.code];
      if (!s) return 0;
      return Number(s[el.level]) || 0;
    }
    if (el.kind === "dance") {
      const s = settings.dance[el.code];
      if (!s) return 0;
      return Number(s[el.level]) || 0;
    }
    if (el.kind === "choreo") {
      const s = settings.other[el.code];
      if (!s) return 0;
      return Number(s.value) || 0;
    }
    return 0;
  }

  function computeElement(settings, el) {
    if (el.flags && el.flags.invalid) {
      return { base: 0, goeMean: 0, goePoints: 0, total: 0, label: elementLabel(el) };
    }
    const base = elementBaseValue(settings, el);
    let goeMean = trimmedMean(el.goe);
    const capped = el.flags && (el.flags.under || el.flags.down);
    if (capped && goeMean > 0) goeMean = 0; // при недокруте/даунгрейде положительный GOE запрещён
    const goePercent = (settings.goePercent || 10) / 100;
    const goePoints = round2(base * goePercent * goeMean);
    const total = round2(base + goePoints);
    return { base, goeMean, goePoints, total, label: elementLabel(el) };
  }

  function computeProtocol(state, skaterId) {
    const settings = state.settings;
    const protocol = state.protocols[skaterId] || global.Storage.emptyProtocol();
    const event = state.event;

    let TES = 0;
    const elementDetails = (protocol.elements || []).map((el, idx) => {
      const d = computeElement(settings, el);
      TES += d.total;
      return Object.assign({ number: idx + 1, id: el.id, kind: el.kind, goe: el.goe || [] }, d);
    });
    TES = round2(TES);

    const componentDetails = global.ISUData.COMPONENT_NAMES.map((name, i) => {
      const raw = (protocol.components && protocol.components[i]) || [];
      const mean = trimmedMean(raw);
      return { name, mean, values: raw };
    });
    const factorTable = settings.pcsFactors[event.discipline] || {};
    const factor = Number(factorTable[event.segment]) || 1;
    const componentSum = componentDetails.reduce((a, c) => a + c.mean, 0);
    const TCS = round2(componentSum * factor);

    let deductionsTotal = 0;
    const deductionDetails = settings.deductions.map((d) => {
      const count = (protocol.deductions && protocol.deductions[d.id]) || 0;
      const pts = d.perCount ? count * d.value : count > 0 ? d.value : 0;
      deductionsTotal += pts;
      return Object.assign({}, d, { count, points: round2(pts) });
    });
    deductionsTotal = round2(deductionsTotal);

    const TSS = round2(TES + TCS - deductionsTotal);

    return {
      TES,
      TCS,
      deductionsTotal,
      TSS,
      elementDetails,
      componentDetails,
      componentFactor: factor,
      deductionDetails,
    };
  }

  function rankSkaters(state) {
    const results = state.skaters.map((sk) => {
      const totals = computeProtocol(state, sk.id);
      return { skater: sk, totals };
    });
    results.sort((a, b) => b.totals.TSS - a.totals.TSS);
    results.forEach((r, i) => {
      r.place = i + 1;
    });
    return results;
  }

  global.Scoring = {
    round2,
    trimmedMean,
    elementLabel,
    elementBaseValue,
    computeElement,
    computeProtocol,
    rankSkaters,
  };
})(window);
