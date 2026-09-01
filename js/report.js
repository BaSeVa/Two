/* ============================================================
   report.js — формирование печатных протоколов и итогового отчёта
   ============================================================ */

(function (global) {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[c]);
  }

  function fmt(n) {
    const v = Number(n) || 0;
    return v.toFixed(2);
  }

  function fmtSigned(n) {
    const v = Number(n) || 0;
    return (v >= 0 ? "+" : "") + v.toFixed(2);
  }

  function eventHeader(state) {
    const ev = state.event;
    const disc = global.ISUData.DISCIPLINES[ev.discipline] || ev.discipline;
    const segList = global.ISUData.SEGMENTS[ev.discipline] || [];
    const seg = (segList.find((s) => s.id === ev.segment) || {}).label || ev.segment;
    return `
      <div class="rep-header">
        <h1>${esc(ev.name || "Соревнование по фигурному катанию")}</h1>
        <div class="rep-sub">${esc(ev.place || "")}${ev.place && ev.date ? " · " : ""}${esc(ev.date || "")}</div>
        <div class="rep-sub">${esc(disc)} — ${esc(seg)}</div>
      </div>`;
  }

  function judgesBlock(state) {
    const ev = state.event;
    const rows = [];
    if (ev.referee) rows.push(`<div>Главный судья/рефери: ${esc(ev.referee)}</div>`);
    if (ev.controller) rows.push(`<div>Технический контролёр: ${esc(ev.controller)}</div>`);
    if (ev.specialist) rows.push(`<div>Технический специалист: ${esc(ev.specialist)}</div>`);
    const judges = (ev.judges || []).slice(0, ev.judgesCount);
    rows.push(
      `<div>Судейская бригада: ${judges.map((j, i) => `№${i + 1} ${esc(j)}`).join(", ")}</div>`
    );
    return `<div class="rep-judges">${rows.join("")}</div>`;
  }

  function elementsTable(state, totals) {
    const judgesCount = state.event.judgesCount;
    const judgeHeaders = Array.from({ length: judgesCount }, (_, i) => `<th>J${i + 1}</th>`).join("");
    const rows = totals.elementDetails
      .map(
        (d) => `
        <tr>
          <td>${d.number}</td>
          <td class="left">${esc(d.label)}</td>
          <td>${fmt(d.base)}</td>
          ${(d.goe || [])
            .concat(Array(judgesCount).fill(""))
            .slice(0, judgesCount)
            .map((g) => `<td>${g === "" || g === undefined || g === null ? "" : g}</td>`)
            .join("")}
          <td>${fmtSigned(d.goePoints)}</td>
          <td><b>${fmt(d.total)}</b></td>
        </tr>`
      )
      .join("");
    return `
      <table class="rep-table">
        <thead>
          <tr>
            <th>№</th><th class="left">Элемент</th><th>База</th>${judgeHeaders}<th>GOE</th><th>Итого</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr><td colspan="${3 + judgesCount + 1}" class="left"><b>Сумма баллов за элементы (TES)</b></td><td><b>${fmt(totals.TES)}</b></td></tr>
        </tfoot>
      </table>`;
  }

  function componentsTable(state, totals) {
    const judgesCount = state.event.judgesCount;
    const judgeHeaders = Array.from({ length: judgesCount }, (_, i) => `<th>J${i + 1}</th>`).join("");
    const rows = totals.componentDetails
      .map(
        (c) => `
        <tr>
          <td class="left">${esc(c.name)}</td>
          ${Array.from({ length: judgesCount }, (_, i) => `<td>${c.values[i] !== undefined && c.values[i] !== "" ? c.values[i] : ""}</td>`).join("")}
          <td><b>${fmt(c.mean)}</b></td>
        </tr>`
      )
      .join("");
    return `
      <table class="rep-table">
        <thead><tr><th class="left">Компонент</th>${judgeHeaders}<th>Среднее</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr><td colspan="${judgesCount + 1}" class="left">Сумма среднего × коэффициент (${totals.componentFactor})</td><td><b>${fmt(totals.TCS)}</b></td></tr>
        </tfoot>
      </table>`;
  }

  function deductionsTable(totals) {
    const applied = totals.deductionDetails.filter((d) => d.points > 0);
    if (applied.length === 0) {
      return `<div class="rep-note">Сбавки: отсутствуют</div>`;
    }
    const rows = applied
      .map((d) => `<tr><td class="left">${esc(d.label)}${d.perCount ? ` × ${d.count}` : ""}</td><td>-${fmt(d.points)}</td></tr>`)
      .join("");
    return `
      <table class="rep-table">
        <thead><tr><th class="left">Сбавка</th><th>Баллы</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td class="left"><b>Итого сбавок</b></td><td><b>-${fmt(totals.deductionsTotal)}</b></td></tr></tfoot>
      </table>`;
  }

  function totalsSummary(totals) {
    return `
      <table class="rep-table rep-summary">
        <tbody>
          <tr><td class="left">Сумма баллов за элементы (TES)</td><td>${fmt(totals.TES)}</td></tr>
          <tr><td class="left">Сумма баллов за компоненты программы (TCS)</td><td>${fmt(totals.TCS)}</td></tr>
          <tr><td class="left">Сбавки</td><td>-${fmt(totals.deductionsTotal)}</td></tr>
          <tr class="rep-grand"><td class="left"><b>Итоговая сумма баллов (TSS)</b></td><td><b>${fmt(totals.TSS)}</b></td></tr>
        </tbody>
      </table>`;
  }

  function generateSkaterReport(state, skaterId) {
    const skater = state.skaters.find((s) => s.id === skaterId);
    if (!skater) return "<p>Участник не найден.</p>";
    const totals = global.Scoring.computeProtocol(state, skaterId);
    return `
      ${eventHeader(state)}
      <div class="rep-skater">
        <h2>№${esc(skater.startNo)} ${esc(skater.name || "Без имени")} ${skater.country ? "(" + esc(skater.country) + ")" : ""}</h2>
      </div>
      ${judgesBlock(state)}
      <h3>Элементы программы</h3>
      ${elementsTable(state, totals)}
      <h3>Компоненты программы</h3>
      ${componentsTable(state, totals)}
      <h3>Сбавки</h3>
      ${deductionsTable(totals)}
      <h3>Итог</h3>
      ${totalsSummary(totals)}
      <div class="rep-footer">Протокол сформирован приложением для судейства ISU · ${new Date().toLocaleString("ru-RU")}</div>
    `;
  }

  function generateResultsReport(state) {
    const ranking = global.Scoring.rankSkaters(state);
    const rows = ranking
      .map(
        (r) => `
        <tr>
          <td>${r.place}</td>
          <td>${esc(r.skater.startNo)}</td>
          <td class="left">${esc(r.skater.name || "Без имени")}</td>
          <td class="left">${esc(r.skater.country || "")}</td>
          <td>${fmt(r.totals.TES)}</td>
          <td>${fmt(r.totals.TCS)}</td>
          <td>-${fmt(r.totals.deductionsTotal)}</td>
          <td><b>${fmt(r.totals.TSS)}</b></td>
        </tr>`
      )
      .join("");
    return `
      ${eventHeader(state)}
      ${judgesBlock(state)}
      <h3>Итоговые результаты</h3>
      <table class="rep-table">
        <thead>
          <tr><th>Место</th><th>№</th><th class="left">Участник</th><th class="left">Страна/Клуб</th><th>TES</th><th>TCS</th><th>Сбавки</th><th>TSS</th></tr>
        </thead>
        <tbody>${rows || `<tr><td colspan="8">Нет участников</td></tr>`}</tbody>
      </table>
      <div class="rep-footer">Протокол сформирован приложением для судейства ISU · ${new Date().toLocaleString("ru-RU")}</div>
    `;
  }

  global.Report = {
    generateSkaterReport,
    generateResultsReport,
  };
})(window);
