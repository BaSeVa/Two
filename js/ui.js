/* ============================================================
   ui.js — рендеринг интерфейса и обработка событий
   ============================================================ */

(function (global) {
  "use strict";

  const App = {
    state: null,
    ui: {
      activeTab: "event",
      protocolSkaterId: null,
      addElementOpen: false,
      addElementDraft: null,
      settingsSubtab: "jumps",
    },
  };

  function persist() {
    global.Storage.save(App.state);
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);
  }

  function opt(value, label, selected) {
    return `<option value="${esc(value)}" ${String(value) === String(selected) ? "selected" : ""}>${esc(label)}</option>`;
  }

  function buildGoeOptions(selected) {
    let html = `<option value="">—</option>`;
    for (let i = 5; i >= -5; i--) {
      html += opt(i, (i > 0 ? "+" : "") + i, selected);
    }
    return html;
  }

  function buildPcsOptions(selected) {
    let html = `<option value="">—</option>`;
    const selNum = selected === "" || selected === null || selected === undefined ? null : Number(selected);
    for (let i = 100; i >= 1; i--) {
      const v = (i * 0.25).toFixed(2);
      const isSelected = selNum !== null && Math.abs(Number(v) - selNum) < 1e-9;
      html += `<option value="${v}" ${isSelected ? "selected" : ""}>${v}</option>`;
    }
    return html;
  }

  /* ---------------------- Вкладка: Соревнование ---------------------- */

  function renderEventTab() {
    const ev = App.state.event;
    const segments = global.ISUData.SEGMENTS[ev.discipline] || [];
    const disciplineOptions = Object.entries(global.ISUData.DISCIPLINES)
      .map(([k, v]) => opt(k, v, ev.discipline))
      .join("");
    const segmentOptions = segments.map((s) => opt(s.id, s.label, ev.segment)).join("");

    const judgeInputs = Array.from({ length: ev.judgesCount }, (_, i) => `
      <div class="field">
        <label>Судья №${i + 1}</label>
        <input type="text" data-action="set-judge-name" data-idx="${i}" value="${esc(ev.judges[i] || "")}" />
      </div>`).join("");

    document.getElementById("tab-event").innerHTML = `
      <div class="card">
        <h2>Данные соревнования</h2>
        <div class="grid">
          <div class="field"><label>Название соревнования</label>
            <input type="text" data-action="set-event-field" data-field="name" value="${esc(ev.name)}" placeholder="Например: Кубок региона по фигурному катанию" /></div>
          <div class="field"><label>Место проведения</label>
            <input type="text" data-action="set-event-field" data-field="place" value="${esc(ev.place)}" /></div>
          <div class="field"><label>Дата</label>
            <input type="date" data-action="set-event-field" data-field="date" value="${esc(ev.date)}" /></div>
          <div class="field"><label>Дисциплина</label>
            <select data-action="set-discipline">${disciplineOptions}</select></div>
          <div class="field"><label>Сегмент программы</label>
            <select data-action="set-event-field" data-field="segment">${segmentOptions}</select></div>
          <div class="field"><label>Количество судей</label>
            <input type="number" min="2" max="9" data-action="set-judges-count" value="${ev.judgesCount}" /></div>
        </div>
      </div>

      <div class="card">
        <h2>Судейская бригада</h2>
        <div class="grid">${judgeInputs}</div>
      </div>

      <div class="card">
        <h2>Технический персонал</h2>
        <div class="grid">
          <div class="field"><label>Главный судья / рефери</label>
            <input type="text" data-action="set-event-field" data-field="referee" value="${esc(ev.referee)}" /></div>
          <div class="field"><label>Технический контролёр</label>
            <input type="text" data-action="set-event-field" data-field="controller" value="${esc(ev.controller)}" /></div>
          <div class="field"><label>Технический специалист</label>
            <input type="text" data-action="set-event-field" data-field="specialist" value="${esc(ev.specialist)}" /></div>
        </div>
      </div>
    `;
  }

  /* ---------------------- Вкладка: Участники ---------------------- */

  function renderSkatersTab() {
    const rows = App.state.skaters
      .map(
        (sk) => `
        <div class="skater-row">
          <input type="number" class="cell-input" style="text-align:left" data-action="set-skater-field" data-id="${sk.id}" data-field="startNo" value="${esc(sk.startNo)}" />
          <input type="text" class="cell-input" style="text-align:left" data-action="set-skater-field" data-id="${sk.id}" data-field="name" placeholder="ФИО / название пары" value="${esc(sk.name)}" />
          <input type="text" class="cell-input" style="text-align:left" data-action="set-skater-field" data-id="${sk.id}" data-field="country" placeholder="Страна / клуб" value="${esc(sk.country)}" />
          <div class="row-actions">
            <button class="btn btn-small btn-danger" data-action="delete-skater" data-id="${sk.id}">Удалить</button>
          </div>
        </div>`
      )
      .join("");

    document.getElementById("tab-skaters").innerHTML = `
      <div class="card">
        <div class="section-title">
          <h2>Участники (${App.state.skaters.length})</h2>
          <div>
            <button class="btn" data-action="sort-skaters">Сортировать по №</button>
            <button class="btn btn-primary" data-action="add-skater">+ Добавить участника</button>
          </div>
        </div>
        <div class="skater-list">${rows || '<div class="hint">Участники ещё не добавлены.</div>'}</div>
      </div>
    `;
  }

  /* ---------------------- Вкладка: Протокол ---------------------- */

  function defaultDraft() {
    const settings = App.state.settings;
    return {
      kind: "jump",
      partsCount: 1,
      parts: [{ code: Object.keys(settings.jumps)[0], rev: 3 }],
      spinCode: Object.keys(settings.spins)[0],
      stepCode: Object.keys(settings.steps)[0],
      danceCode: Object.keys(settings.dance)[0],
      choreoCode: Object.keys(settings.other)[0],
      level: "3",
    };
  }

  function renderAddElementForm() {
    const container = document.getElementById("addElementForm");
    if (!container) return;
    if (!App.ui.addElementOpen) {
      container.innerHTML = "";
      return;
    }
    const settings = App.state.settings;
    const d = App.ui.addElementDraft;
    const kindOptions = [
      ["jump", "Прыжок / каскад"],
      ["spin", "Вращение"],
      ["step", "Дорожка шагов"],
      ["choreo", "Хореографическая посл-ть"],
      ["dance", "Танцевальный элемент"],
    ].map(([k, l]) => opt(k, l, d.kind)).join("");

    let specific = "";
    if (d.kind === "jump") {
      const partsHtml = d.parts
        .map(
          (p, i) => `
          <div class="field" style="display:inline-flex;flex-direction:row;gap:6px;margin-right:10px;">
            <select data-action="draft-jump-code" data-idx="${i}">
              ${Object.entries(settings.jumps).map(([code, j]) => opt(code, `${j.name} (${code})`, p.code)).join("")}
            </select>
            <select data-action="draft-jump-rev" data-idx="${i}">
              ${[1, 2, 3, 4].map((r) => opt(r, r + " об.", p.rev)).join("")}
            </select>
          </div>`
        )
        .join("");
      specific = `
        <div class="field"><label>Количество прыжков в связке</label>
          <select data-action="draft-parts-count">${[1, 2, 3].map((n) => opt(n, n, d.partsCount)).join("")}</select>
        </div>
        <div class="field"><label>Прыжки</label><div>${partsHtml}</div></div>`;
    } else if (d.kind === "spin") {
      specific = `
        <div class="field"><label>Тип вращения</label>
          <select data-action="draft-field" data-field="spinCode">${Object.entries(settings.spins).map(([c, s]) => opt(c, `${s.name} (${c})`, d.spinCode)).join("")}</select></div>
        <div class="field"><label>Уровень</label>
          <select data-action="draft-field" data-field="level">${["B", 1, 2, 3, 4].map((l) => opt(l, l, d.level)).join("")}</select></div>`;
    } else if (d.kind === "step") {
      specific = `
        <div class="field"><label>Тип дорожки</label>
          <select data-action="draft-field" data-field="stepCode">${Object.entries(settings.steps).map(([c, s]) => opt(c, `${s.name} (${c})`, d.stepCode)).join("")}</select></div>
        <div class="field"><label>Уровень</label>
          <select data-action="draft-field" data-field="level">${[1, 2, 3, 4].map((l) => opt(l, l, d.level)).join("")}</select></div>`;
    } else if (d.kind === "dance") {
      specific = `
        <div class="field"><label>Танцевальный элемент</label>
          <select data-action="draft-field" data-field="danceCode">${Object.entries(settings.dance).map(([c, s]) => opt(c, `${s.name} (${c})`, d.danceCode)).join("")}</select></div>
        <div class="field"><label>Уровень</label>
          <select data-action="draft-field" data-field="level">${[1, 2, 3, 4].map((l) => opt(l, l, d.level)).join("")}</select></div>`;
    } else if (d.kind === "choreo") {
      specific = `
        <div class="field"><label>Элемент</label>
          <select data-action="draft-field" data-field="choreoCode">${Object.entries(settings.other).map(([c, s]) => opt(c, `${s.name} (${c})`, d.choreoCode)).join("")}</select></div>`;
    }

    container.innerHTML = `
      <div class="card" style="border-color:var(--accent)">
        <h3>Новый элемент</h3>
        <div class="grid">
          <div class="field"><label>Тип элемента</label><select data-action="draft-kind">${kindOptions}</select></div>
          ${specific}
        </div>
        <div style="margin-top:12px;display:flex;gap:8px;">
          <button class="btn btn-primary" data-action="confirm-add-element">Добавить в протокол</button>
          <button class="btn btn-ghost" data-action="cancel-add-element">Отмена</button>
        </div>
      </div>`;
  }

  function elementFlagsHtml(el) {
    const f = el.flags;
    const mk = (key, label, title) => `
      <label class="flag-toggle" title="${esc(title)}">
        <input type="checkbox" data-action="set-flag" data-id="${el.id}" data-flag="${key}" ${f[key] ? "checked" : ""} />${label}
      </label>`;
    let items = "";
    if (el.kind === "jump") {
      items += mk("under", "<", "Недокрут (< 1/4 оборота)");
      items += mk("down", "<<", "Даунгрейд");
      items += mk("edge", "e", "Неясное ребро");
      items += mk("seq", "SEQ", "Прыжковая секвенция (80% суммы)");
    }
    items += mk("invalid", "✕", "Не засчитан (запрещённый/повторный элемент)");
    return `<div class="element-actions" style="flex-wrap:wrap;gap:8px;">${items}</div>`;
  }

  function renderProtocolTab() {
    const state = App.state;
    const skaters = state.skaters;
    const options = skaters.map((s) => opt(s.id, `№${s.startNo} — ${s.name || "Без имени"}`, App.ui.protocolSkaterId)).join("");

    if (skaters.length && !App.ui.protocolSkaterId) {
      App.ui.protocolSkaterId = skaters[0].id;
    }

    const wrap = document.getElementById("tab-protocol");

    if (skaters.length === 0) {
      wrap.innerHTML = `<div class="card"><div class="hint">Сначала добавьте участников на вкладке «Участники».</div></div>`;
      return;
    }

    const skaterId = App.ui.protocolSkaterId;
    const protocol = state.protocols[skaterId] || (state.protocols[skaterId] = global.Storage.emptyProtocol());
    const judgesCount = state.event.judgesCount;
    const totals = global.Scoring.computeProtocol(state, skaterId);

    const judgeHeaders = Array.from({ length: judgesCount }, (_, i) => `<th>J${i + 1}</th>`).join("");

    const elementRows = totals.elementDetails
      .map((d, idx) => {
        const el = protocol.elements[idx];
        const goeCells = Array.from({ length: judgesCount }, (_, j) => `
          <td><select class="cell-input" data-action="set-goe" data-id="${el.id}" data-judge="${j}">${buildGoeOptions(el.goe[j] ?? "")}</select></td>`).join("");
        return `
          <tr>
            <td>${d.number}</td>
            <td class="left">${esc(d.label)} ${elementFlagsHtml(el)}</td>
            <td>${d.base.toFixed(2)}</td>
            ${goeCells}
            <td>${d.goePoints >= 0 ? "+" : ""}${d.goePoints.toFixed(2)}</td>
            <td><b>${d.total.toFixed(2)}</b></td>
            <td>
              <div class="row-actions">
                <button class="btn btn-small" data-action="move-element" data-id="${el.id}" data-dir="-1" title="Вверх">↑</button>
                <button class="btn btn-small" data-action="move-element" data-id="${el.id}" data-dir="1" title="Вниз">↓</button>
                <button class="btn btn-small btn-danger" data-action="delete-element" data-id="${el.id}" title="Удалить">✕</button>
              </div>
            </td>
          </tr>`;
      })
      .join("");

    const componentRows = totals.componentDetails
      .map((c, i) => {
        const cells = Array.from({ length: judgesCount }, (_, j) => `
          <td><select class="cell-input" data-action="set-component" data-comp="${i}" data-judge="${j}">${buildPcsOptions(c.values[j] ?? "")}</select></td>`).join("");
        return `<tr><td class="left">${esc(c.name)}</td>${cells}<td><b>${c.mean.toFixed(2)}</b></td></tr>`;
      })
      .join("");

    const deductionRows = state.settings.deductions
      .map((d) => {
        const count = (protocol.deductions && protocol.deductions[d.id]) || 0;
        const control = d.perCount
          ? `<input type="number" min="0" class="cell-input" style="width:70px" data-action="set-deduction-count" data-ded="${d.id}" value="${count}" />`
          : `<input type="checkbox" data-action="set-deduction-flag" data-ded="${d.id}" ${count > 0 ? "checked" : ""} />`;
        return `<tr><td class="left">${esc(d.label)} <span class="pill">-${d.value.toFixed(2)}${d.perCount ? " × шт." : ""}</span></td><td>${control}</td></tr>`;
      })
      .join("");

    wrap.innerHTML = `
      <div class="protocol-select">
        <label>Участник:</label>
        <select data-action="select-skater-protocol">${options}</select>
        <button class="btn" data-action="open-skater-print">Печать протокола</button>
      </div>

      <div class="card">
        <div class="section-title">
          <h3>Элементы программы</h3>
          <button class="btn btn-primary" data-action="toggle-add-element">${App.ui.addElementOpen ? "Скрыть форму" : "+ Добавить элемент"}</button>
        </div>
        <div id="addElementForm"></div>
        <div class="data-table-wrap">
          <table>
            <thead><tr><th>№</th><th class="left">Элемент</th><th>База</th>${judgeHeaders}<th>GOE</th><th>Итого</th><th>Действия</th></tr></thead>
            <tbody>${elementRows || `<tr><td colspan="${5 + judgesCount}">Элементы не добавлены</td></tr>`}</tbody>
          </table>
        </div>
        <div class="hint">GOE: выберите значение от −5 до +5 для каждого судьи. «Итого» = урезанное среднее (без мин. и макс.) × ${state.settings.goePercent}% от базовой стоимости.</div>
      </div>

      <div class="card">
        <h3>Компоненты программы</h3>
        <div class="data-table-wrap">
          <table>
            <thead><tr><th class="left">Компонент</th>${judgeHeaders}<th>Среднее</th></tr></thead>
            <tbody>${componentRows}</tbody>
          </table>
        </div>
        <div class="hint">Коэффициент компонентов для текущего сегмента: <b>${totals.componentFactor}</b></div>
      </div>

      <div class="card">
        <h3>Сбавки</h3>
        <div class="data-table-wrap">
          <table><thead><tr><th class="left">Нарушение</th><th>Значение</th></tr></thead><tbody>${deductionRows}</tbody></table>
        </div>
      </div>

      <div class="totals-bar">
        <div>TES: <b>${totals.TES.toFixed(2)}</b></div>
        <div>TCS: <b>${totals.TCS.toFixed(2)}</b></div>
        <div>Сбавки: <b>-${totals.deductionsTotal.toFixed(2)}</b></div>
        <div>TSS: <b>${totals.TSS.toFixed(2)}</b></div>
      </div>
    `;

    renderAddElementForm();
  }

  /* ---------------------- Вкладка: Результаты ---------------------- */

  function renderResultsTab() {
    const state = App.state;
    const ranking = global.Scoring.rankSkaters(state);
    const rows = ranking
      .map(
        (r) => `
        <tr class="${r.place <= 3 ? "rank-" + r.place : ""}">
          <td>${r.place}</td>
          <td>${esc(r.skater.startNo)}</td>
          <td class="left">${esc(r.skater.name || "Без имени")}</td>
          <td class="left">${esc(r.skater.country || "")}</td>
          <td>${r.totals.TES.toFixed(2)}</td>
          <td>${r.totals.TCS.toFixed(2)}</td>
          <td>-${r.totals.deductionsTotal.toFixed(2)}</td>
          <td><b>${r.totals.TSS.toFixed(2)}</b></td>
          <td><button class="btn btn-small" data-action="open-skater-print-from-results" data-id="${r.skater.id}">Протокол</button></td>
        </tr>`
      )
      .join("");

    document.getElementById("tab-results").innerHTML = `
      <div class="card">
        <div class="section-title">
          <h2>Итоговые результаты</h2>
          <button class="btn btn-primary" data-action="open-results-print">Печать итогового протокола</button>
        </div>
        <div class="data-table-wrap">
          <table class="results-table">
            <thead><tr><th>Место</th><th>№</th><th class="left">Участник</th><th class="left">Страна/Клуб</th><th>TES</th><th>TCS</th><th>Сбавки</th><th>TSS</th><th></th></tr></thead>
            <tbody>${rows || `<tr><td colspan="9">Нет участников</td></tr>`}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  /* ---------------------- Вкладка: Настройки ---------------------- */

  const SETTINGS_SECTIONS = {
    jumps: "Базовые значения прыжков",
    spins: "Базовые значения вращений",
    steps: "Дорожки шагов",
    other: "Хореографические элементы",
    dance: "Танцевальные элементы",
    deductions: "Сбавки",
    goe: "GOE и коэффициенты компонентов",
  };

  function renderSettingsTab() {
    const tabsHtml = Object.entries(SETTINGS_SECTIONS)
      .map(([k, label]) => `<button class="btn ${App.ui.settingsSubtab === k ? "btn-primary" : "btn-ghost"}" data-action="settings-subtab" data-sub="${k}">${label}</button>`)
      .join("");

    let body = "";
    const sub = App.ui.settingsSubtab;
    if (sub === "goe") {
      body = `
        <div class="grid">
          <div class="field"><label>Процент базовой стоимости на 1 шаг GOE (%)</label>
            <input type="number" step="0.5" min="1" max="30" id="goePercentInput" value="${App.state.settings.goePercent}" /></div>
        </div>
        <div class="field" style="margin-top:14px;">
          <label>Коэффициенты компонентов программы (JSON: дисциплина → сегмент → коэффициент)</label>
          <textarea id="pcsFactorsInput">${esc(JSON.stringify(App.state.settings.pcsFactors, null, 2))}</textarea>
        </div>
        <div style="margin-top:12px;display:flex;gap:8px;">
          <button class="btn btn-primary" data-action="save-goe-settings">Сохранить</button>
          <button class="btn btn-danger" data-action="reset-settings-section" data-sub="goe">Сбросить по умолчанию</button>
        </div>`;
    } else {
      body = `
        <div class="field">
          <label>Таблица «${SETTINGS_SECTIONS[sub]}» в формате JSON</label>
          <textarea id="settingsJsonInput">${esc(JSON.stringify(App.state.settings[sub], null, 2))}</textarea>
        </div>
        <div style="margin-top:12px;display:flex;gap:8px;">
          <button class="btn btn-primary" data-action="save-settings-json" data-sub="${sub}">Сохранить</button>
          <button class="btn btn-danger" data-action="reset-settings-section" data-sub="${sub}">Сбросить по умолчанию</button>
        </div>`;
    }

    document.getElementById("tab-settings").innerHTML = `
      <div class="card">
        <h2>Настройки таблиц оценок</h2>
        <div class="hint">Значения по умолчанию являются примерными (справочными) и могут не совпадать с официальной таблицей ISU текущего сезона. Отредактируйте таблицы ниже, чтобы использовать актуальные официальные значения.</div>
        <div class="settings-tabs" style="margin-top:14px;">${tabsHtml}</div>
        ${body}
      </div>
    `;
  }

  /* ---------------------- Общий рендер ---------------------- */

  function renderAll() {
    renderEventTab();
    renderSkatersTab();
    renderProtocolTab();
    renderResultsTab();
    renderSettingsTab();
  }

  const TAB_RENDERERS = {
    event: renderEventTab,
    skaters: renderSkatersTab,
    protocol: renderProtocolTab,
    results: renderResultsTab,
    settings: renderSettingsTab,
  };

  function switchTab(tab) {
    App.ui.activeTab = tab;
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.toggle("active", p.id === "tab-" + tab));
    // Пересчитываем содержимое вкладки при каждом переключении, чтобы избежать устаревших данных
    const renderer = TAB_RENDERERS[tab];
    if (renderer) renderer();
  }

  /* ---------------------- Печать ---------------------- */

  function openPrint(html) {
    document.getElementById("printArea").innerHTML = html;
    document.getElementById("printOverlay").hidden = false;
  }

  function closePrint() {
    document.getElementById("printOverlay").hidden = true;
  }

  /* ---------------------- Обработчики событий ---------------------- */

  function onChange(e) {
    const t = e.target;
    const action = t.dataset.action;
    if (!action) return;
    const state = App.state;

    switch (action) {
      case "set-event-field": {
        state.event[t.dataset.field] = t.value;
        persist();
        if (t.dataset.field !== "date" && t.dataset.field !== "name" && t.dataset.field !== "place") renderAll();
        else { renderResultsTab(); renderProtocolTab(); }
        break;
      }
      case "set-discipline": {
        state.event.discipline = t.value;
        const segs = global.ISUData.SEGMENTS[t.value] || [];
        state.event.segment = segs[0] ? segs[0].id : "";
        persist();
        renderAll();
        break;
      }
      case "set-judges-count": {
        let n = Math.max(2, Math.min(9, parseInt(t.value, 10) || 2));
        const judges = state.event.judges;
        while (judges.length < n) judges.push("Судья " + (judges.length + 1));
        judges.length = Math.max(judges.length, n);
        state.event.judgesCount = n;
        persist();
        renderAll();
        break;
      }
      case "set-judge-name": {
        state.event.judges[Number(t.dataset.idx)] = t.value;
        persist();
        break;
      }
      case "set-skater-field": {
        const sk = state.skaters.find((s) => s.id === t.dataset.id);
        if (sk) {
          sk[t.dataset.field] = t.dataset.field === "startNo" ? Number(t.value) || 0 : t.value;
          persist();
          renderResultsTab();
          renderProtocolTab();
        }
        break;
      }
      case "select-skater-protocol": {
        App.ui.protocolSkaterId = t.value;
        renderProtocolTab();
        break;
      }
      case "draft-kind": {
        App.ui.addElementDraft.kind = t.value;
        renderAddElementForm();
        break;
      }
      case "draft-field": {
        App.ui.addElementDraft[t.dataset.field] = t.value;
        break;
      }
      case "draft-parts-count": {
        const n = Number(t.value);
        const d = App.ui.addElementDraft;
        const settings = state.settings;
        while (d.parts.length < n) d.parts.push({ code: Object.keys(settings.jumps)[0], rev: 3 });
        d.parts.length = n;
        App.ui.addElementDraft.partsCount = n;
        renderAddElementForm();
        break;
      }
      case "draft-jump-code": {
        App.ui.addElementDraft.parts[Number(t.dataset.idx)].code = t.value;
        break;
      }
      case "draft-jump-rev": {
        App.ui.addElementDraft.parts[Number(t.dataset.idx)].rev = Number(t.value);
        break;
      }
      case "set-goe": {
        const protocol = state.protocols[App.ui.protocolSkaterId];
        const el = protocol.elements.find((x) => x.id === t.dataset.id);
        if (el) {
          el.goe[Number(t.dataset.judge)] = t.value === "" ? null : Number(t.value);
          persist();
          renderProtocolTab();
        }
        break;
      }
      case "set-component": {
        const protocol = state.protocols[App.ui.protocolSkaterId];
        const idx = Number(t.dataset.comp);
        if (!protocol.components[idx]) protocol.components[idx] = [];
        protocol.components[idx][Number(t.dataset.judge)] = t.value === "" ? null : Number(t.value);
        persist();
        renderProtocolTab();
        break;
      }
      case "set-deduction-count": {
        const protocol = state.protocols[App.ui.protocolSkaterId];
        protocol.deductions[t.dataset.ded] = Math.max(0, Number(t.value) || 0);
        persist();
        renderProtocolTab();
        break;
      }
      case "set-deduction-flag": {
        const protocol = state.protocols[App.ui.protocolSkaterId];
        protocol.deductions[t.dataset.ded] = t.checked ? 1 : 0;
        persist();
        renderProtocolTab();
        break;
      }
      case "set-flag": {
        const protocol = state.protocols[App.ui.protocolSkaterId];
        const el = protocol.elements.find((x) => x.id === t.dataset.id);
        if (el) {
          el.flags[t.dataset.flag] = t.checked;
          if (t.dataset.flag === "down" && t.checked) el.flags.under = false;
          if (t.dataset.flag === "under" && t.checked) el.flags.down = false;
          persist();
          renderProtocolTab();
        }
        break;
      }
      default:
        break;
    }
  }

  function onClick(e) {
    const t = e.target.closest("[data-action]");
    if (!t) return;
    const action = t.dataset.action;
    const state = App.state;

    switch (action) {
      case "add-skater": {
        const nextNo = state.skaters.length ? Math.max(...state.skaters.map((s) => s.startNo || 0)) + 1 : 1;
        const sk = global.Storage.newSkater(nextNo);
        state.skaters.push(sk);
        state.protocols[sk.id] = global.Storage.emptyProtocol();
        persist();
        renderSkatersTab();
        renderProtocolTab();
        renderResultsTab();
        break;
      }
      case "delete-skater": {
        if (!confirm("Удалить участника и его протокол?")) return;
        state.skaters = state.skaters.filter((s) => s.id !== t.dataset.id);
        delete state.protocols[t.dataset.id];
        if (App.ui.protocolSkaterId === t.dataset.id) App.ui.protocolSkaterId = null;
        persist();
        renderSkatersTab();
        renderProtocolTab();
        renderResultsTab();
        break;
      }
      case "sort-skaters": {
        state.skaters.sort((a, b) => (a.startNo || 0) - (b.startNo || 0));
        persist();
        renderSkatersTab();
        break;
      }
      case "toggle-add-element": {
        App.ui.addElementOpen = !App.ui.addElementOpen;
        if (App.ui.addElementOpen) App.ui.addElementDraft = defaultDraft();
        renderProtocolTab();
        break;
      }
      case "cancel-add-element": {
        App.ui.addElementOpen = false;
        renderProtocolTab();
        break;
      }
      case "confirm-add-element": {
        const d = App.ui.addElementDraft;
        const judgesCount = state.event.judgesCount;
        const el = {
          id: global.Storage.uid("el"),
          kind: d.kind,
          flags: { under: false, down: false, edge: false, seq: false, invalid: false },
          goe: Array(judgesCount).fill(null),
        };
        if (d.kind === "jump") el.parts = d.parts.map((p) => ({ code: p.code, rev: Number(p.rev) }));
        if (d.kind === "spin") { el.code = d.spinCode; el.level = d.level; }
        if (d.kind === "step") { el.code = d.stepCode; el.level = d.level; }
        if (d.kind === "dance") { el.code = d.danceCode; el.level = d.level; }
        if (d.kind === "choreo") { el.code = d.choreoCode; }
        const protocol = state.protocols[App.ui.protocolSkaterId];
        protocol.elements.push(el);
        App.ui.addElementOpen = false;
        persist();
        renderProtocolTab();
        renderResultsTab();
        break;
      }
      case "delete-element": {
        const protocol = state.protocols[App.ui.protocolSkaterId];
        protocol.elements = protocol.elements.filter((x) => x.id !== t.dataset.id);
        persist();
        renderProtocolTab();
        renderResultsTab();
        break;
      }
      case "move-element": {
        const protocol = state.protocols[App.ui.protocolSkaterId];
        const idx = protocol.elements.findIndex((x) => x.id === t.dataset.id);
        const dir = Number(t.dataset.dir);
        const newIdx = idx + dir;
        if (newIdx < 0 || newIdx >= protocol.elements.length) return;
        const [item] = protocol.elements.splice(idx, 1);
        protocol.elements.splice(newIdx, 0, item);
        persist();
        renderProtocolTab();
        break;
      }
      case "open-skater-print": {
        openPrint(global.Report.generateSkaterReport(state, App.ui.protocolSkaterId));
        break;
      }
      case "open-skater-print-from-results": {
        openPrint(global.Report.generateSkaterReport(state, t.dataset.id));
        break;
      }
      case "open-results-print": {
        openPrint(global.Report.generateResultsReport(state));
        break;
      }
      case "settings-subtab": {
        App.ui.settingsSubtab = t.dataset.sub;
        renderSettingsTab();
        break;
      }
      case "save-settings-json": {
        const sub = t.dataset.sub;
        const textarea = document.getElementById("settingsJsonInput");
        try {
          const parsed = JSON.parse(textarea.value);
          state.settings[sub] = parsed;
          persist();
          renderAll();
          alert("Сохранено.");
        } catch (err) {
          alert("Ошибка в формате JSON: " + err.message);
        }
        break;
      }
      case "save-goe-settings": {
        const pct = Number(document.getElementById("goePercentInput").value) || 10;
        const textarea = document.getElementById("pcsFactorsInput");
        try {
          const parsed = JSON.parse(textarea.value);
          state.settings.goePercent = pct;
          state.settings.pcsFactors = parsed;
          persist();
          renderAll();
          alert("Сохранено.");
        } catch (err) {
          alert("Ошибка в формате JSON: " + err.message);
        }
        break;
      }
      case "reset-settings-section": {
        if (!confirm("Сбросить эту таблицу к значениям по умолчанию?")) return;
        const def = global.ISUData.defaultData();
        const sub = t.dataset.sub;
        if (sub === "goe") {
          state.settings.goePercent = def.goePercent;
          state.settings.pcsFactors = def.pcsFactors;
        } else {
          state.settings[sub] = def[sub];
        }
        persist();
        renderAll();
        break;
      }
      default:
        break;
    }
  }

  function initTopActions() {
    document.getElementById("btnExport").addEventListener("click", () => global.Storage.exportJSON(App.state));
    document.getElementById("fileImport").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result);
          App.state = parsed;
          persist();
          App.ui.protocolSkaterId = App.state.skaters[0] ? App.state.skaters[0].id : null;
          renderAll();
          alert("Данные загружены.");
        } catch (err) {
          alert("Не удалось прочитать файл: " + err.message);
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    });
    document.getElementById("btnReset").addEventListener("click", () => {
      if (!confirm("Удалить все данные (соревнование, участники, протоколы, настройки)? Это действие необратимо.")) return;
      global.Storage.clearAll();
      App.state = global.Storage.defaultState();
      App.ui.protocolSkaterId = null;
      persist();
      renderAll();
    });
    document.getElementById("btnPrint").addEventListener("click", () => window.print());
    document.getElementById("btnClosePrint").addEventListener("click", closePrint);
  }

  function init() {
    App.state = global.Storage.load();
    document.getElementById("tabs").addEventListener("click", (e) => {
      const btn = e.target.closest(".tab-btn");
      if (!btn) return;
      switchTab(btn.dataset.tab);
    });
    document.getElementById("content").addEventListener("change", onChange);
    document.getElementById("content").addEventListener("click", onClick);
    initTopActions();
    renderAll();
  }

  global.App = App;
  global.UI = { init };
})(window);
