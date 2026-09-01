/* ============================================================
   storage.js — состояние приложения и сохранение в localStorage
   ============================================================ */

(function (global) {
  "use strict";

  const STORAGE_KEY = "isuJudgingApp_v1";

  function uid(prefix) {
    return (prefix || "id") + "_" + Math.random().toString(36).slice(2, 10);
  }

  function emptyEvent() {
    return {
      name: "",
      place: "",
      date: "",
      discipline: "men",
      segment: "sp",
      judgesCount: 5,
      judges: ["Судья 1", "Судья 2", "Судья 3", "Судья 4", "Судья 5"],
      referee: "",
      controller: "",
      specialist: "",
    };
  }

  function newSkater(startNo) {
    return {
      id: uid("sk"),
      startNo: startNo || 1,
      name: "",
      country: "",
    };
  }

  function emptyProtocol() {
    return {
      elements: [],
      components: {}, // componentIndex -> [значения по судьям]
      deductions: {}, // deductionId -> количество (для perCount) или 0/1
    };
  }

  function defaultState() {
    return {
      event: emptyEvent(),
      skaters: [],
      protocols: {},
      settings: global.ISUData.defaultData(),
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      // подстраховка от неполных данных при обновлении структуры
      const def = defaultState();
      return Object.assign(def, parsed, {
        event: Object.assign(def.event, parsed.event || {}),
        settings: Object.assign(def.settings, parsed.settings || {}),
      });
    } catch (e) {
      console.warn("Не удалось загрузить сохранённые данные, создаю новые.", e);
      return defaultState();
    }
  }

  function save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Ошибка сохранения в localStorage", e);
    }
  }

  function exportJSON(state) {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const fname = (state.event.name || "sorevnovanie").replace(/[^\wа-яА-ЯёЁ\-]+/g, "_");
    a.href = url;
    a.download = `protokol_${fname}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function clearAll() {
    localStorage.removeItem(STORAGE_KEY);
  }

  global.Storage = {
    STORAGE_KEY,
    uid,
    emptyEvent,
    newSkater,
    emptyProtocol,
    defaultState,
    load,
    save,
    exportJSON,
    clearAll,
  };
})(window);
