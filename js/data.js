/* ============================================================
   data.js — справочные данные системы судейства ISU
   Значения баллов (Scale of Values) являются ПРИМЕРНЫМИ /
   справочными и могут не совпадать с официальной таблицей ISU
   текущего сезона. Все таблицы можно отредактировать на вкладке
   «Настройки» — вставьте туда актуальные официальные значения.
   ============================================================ */

(function (global) {
  "use strict";

  // ---------- Дисциплины и сегменты ----------
  const DISCIPLINES = {
    men: "Мужское одиночное катание",
    ladies: "Женское одиночное катание",
    pairs: "Парное катание",
    dance: "Танцы на льду",
  };

  const SEGMENTS = {
    men: [
      { id: "sp", label: "Короткая программа" },
      { id: "fs", label: "Произвольная программа" },
    ],
    ladies: [
      { id: "sp", label: "Короткая программа" },
      { id: "fs", label: "Произвольная программа" },
    ],
    pairs: [
      { id: "sp", label: "Короткая программа" },
      { id: "fs", label: "Произвольная программа" },
    ],
    dance: [
      { id: "rd", label: "Ритм-танец" },
      { id: "fd", label: "Произвольный танец" },
    ],
  };

  // Компоненты программы (одинаковый набор из 5 для всех дисциплин, правила с 2018 г.)
  const COMPONENT_NAMES = [
    "Мастерство катания (Skating Skills)",
    "Владение переходами (Transitions)",
    "Исполнение (Performance)",
    "Композиция (Composition)",
    "Интерпретация музыки (Interpretation of the Music)",
  ];

  // Множитель суммы компонентов (PCS factor). Примерные значения — уточняйте по актуальным
  // коммюнике ISU для конкретного сезона и дисциплины.
  const DEFAULT_PCS_FACTORS = {
    men: { sp: 1.0, fs: 2.0 },
    ladies: { sp: 0.8, fs: 1.6 },
    pairs: { sp: 0.8, fs: 1.6 },
    dance: { rd: 0.8, fd: 1.2 },
  };

  // ---------- Базовые значения прыжков ----------
  // ключ: код прыжка (T,S,Lo,F,Lz,A) -> { 1:.., 2:.., 3:.., 4:.. } базовая стоимость по числу оборотов
  const DEFAULT_JUMPS = {
    T: { name: "Тулуп", 1: 0.4, 2: 1.3, 3: 4.2, 4: 9.5 },
    S: { name: "Сальхов", 1: 0.4, 2: 1.3, 3: 4.3, 4: 9.7 },
    Lo: { name: "Риттбергер", 1: 0.5, 2: 1.7, 3: 4.9, 4: 10.5 },
    F: { name: "Флип", 1: 0.5, 2: 1.8, 3: 5.3, 4: 11.0 },
    Lz: { name: "Лутц", 1: 0.6, 2: 2.1, 3: 5.9, 4: 11.5 },
    A: { name: "Аксель", 1: 1.1, 2: 3.3, 3: 8.0, 4: 12.5 },
  };

  // ---------- Базовые значения вращений ----------
  // код -> { name, B/1/2/3/4: значение }
  const DEFAULT_SPINS = {
    SSp: { name: "Волчок (Sit Spin)", B: 1.0, 1: 1.3, 2: 1.5, 3: 2.1, 4: 2.7 },
    CSp: { name: "Заклон/либела (Camel Spin)", B: 1.0, 1: 1.3, 2: 1.5, 3: 2.3, 4: 2.9 },
    LSp: { name: "Либела стоя (Layback/Layover Spin)", B: 1.0, 1: 1.3, 2: 1.5, 3: 2.1, 4: 2.7 },
    CoSp: { name: "Комбинированное вращение (Combination Spin)", B: 1.5, 1: 1.7, 2: 2.0, 3: 2.5, 4: 3.0 },
    CCoSp: { name: "Со сменой ноги, комб. (Change Combination Spin)", B: 2.0, 1: 2.5, 2: 3.0, 3: 3.5, 4: 4.5 },
    FSSp: { name: "Прыжок в волчок (Flying Sit Spin)", B: 1.7, 1: 2.0, 2: 2.3, 3: 3.0, 4: 3.6 },
    FCSp: { name: "Прыжок в заклон (Flying Camel Spin)", B: 2.0, 1: 2.3, 2: 2.6, 3: 3.2, 4: 3.9 },
    FCoSp: { name: "Прыжок в комб. вращение (Flying Combination Spin)", B: 2.0, 1: 2.3, 2: 2.6, 3: 3.2, 4: 3.9 },
    FCCoSp: { name: "Прыжок в комб. со сменой ноги", B: 2.3, 1: 2.7, 2: 3.0, 3: 3.6, 4: 4.7 },
  };

  // ---------- Дорожки шагов и хореографические элементы ----------
  const DEFAULT_STEPS = {
    StSq: { name: "Дорожка шагов (Step Sequence)", 1: 1.8, 2: 2.6, 3: 3.3, 4: 3.9 },
  };

  const DEFAULT_OTHER = {
    ChSq: { name: "Хореографическая последовательность (Choreo Sequence)", value: 2.0 },
  };

  // ---------- Танцевальные элементы (упрощённо) ----------
  const DEFAULT_DANCE = {
    TW: { name: "Твиззлы (Twizzles)", 1: 1.5, 2: 2.0, 3: 2.5, 4: 3.0 },
    DiS: { name: "Дорожка по диагонали (Dance Step Sequence)", 1: 2.0, 2: 2.6, 3: 3.4, 4: 4.1 },
    STL: { name: "Прямая дорожка (Straight Line Step Sequence)", 1: 1.8, 2: 2.4, 3: 3.1, 4: 3.8 },
    CuSt: { name: "Круговая дорожка (Circular Step Sequence)", 1: 1.9, 2: 2.5, 3: 3.2, 4: 3.9 },
    RoLi: { name: "Ротационное лифт (Rotational Lift)", 1: 3.5, 2: 4.0, 3: 4.6, 4: 5.3 },
    StaLi: { name: "Стационарный лифт (Stationary Lift)", 1: 3.3, 2: 3.8, 3: 4.4, 4: 5.0 },
    CuLi: { name: "Круговой лифт (Curve Lift)", 1: 3.4, 2: 3.9, 3: 4.5, 4: 5.1 },
  };

  // Процент от базовой стоимости на 1 шаг GOE (упрощённая модель, редактируется в Настройках)
  const DEFAULT_GOE_PERCENT = 10; // 10% базовой стоимости за каждый шаг GOE

  // ---------- Сбавки (deductions) ----------
  const DEFAULT_DEDUCTIONS = [
    { id: "fall", label: "Падение", value: 1.0, perCount: true },
    { id: "time", label: "Нарушение времени программы", value: 1.0, perCount: false },
    { id: "music", label: "Нарушение требований к музыке/костюму", value: 1.0, perCount: false },
    { id: "illegal", label: "Запрещённый элемент/движение", value: 2.0, perCount: false },
    { id: "interruption1", label: "Прерывание программы (до 10 сек)", value: 1.0, perCount: false },
    { id: "interruption2", label: "Прерывание программы (10–20 сек)", value: 2.0, perCount: false },
    { id: "interruption3", label: "Прерывание программы (более 20 сек)", value: 3.0, perCount: false },
    { id: "extra", label: "Лишний элемент", value: 1.0, perCount: false },
    { id: "late", label: "Позднее начало", value: 1.0, perCount: false },
    { id: "device", label: "Нарушение — падение партнёра/поддержки (пары)", value: 1.0, perCount: true },
  ];

  function defaultData() {
    return {
      jumps: JSON.parse(JSON.stringify(DEFAULT_JUMPS)),
      spins: JSON.parse(JSON.stringify(DEFAULT_SPINS)),
      steps: JSON.parse(JSON.stringify(DEFAULT_STEPS)),
      other: JSON.parse(JSON.stringify(DEFAULT_OTHER)),
      dance: JSON.parse(JSON.stringify(DEFAULT_DANCE)),
      goePercent: DEFAULT_GOE_PERCENT,
      pcsFactors: JSON.parse(JSON.stringify(DEFAULT_PCS_FACTORS)),
      deductions: JSON.parse(JSON.stringify(DEFAULT_DEDUCTIONS)),
    };
  }

  global.ISUData = {
    DISCIPLINES,
    SEGMENTS,
    COMPONENT_NAMES,
    defaultData,
  };
})(window);
