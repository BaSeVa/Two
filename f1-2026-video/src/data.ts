// Личный зачёт FIA Formula One World Championship 2026 после Гран-при Сингапура.
// Источник: FIA, 2026 Singapore Grand Prix, Doc 91 «Championship Points» (11.10.2026),
// https://www.fia.com/system/files/decision-document/2026_singapore_grand_prix_-_championship_points.pdf
// Чтобы обновить видео, достаточно поменять значения ниже.

export type Team =
  | "Mercedes"
  | "Ferrari"
  | "Red Bull"
  | "McLaren"
  | "Racing Bulls"
  | "Alpine"
  | "Haas"
  | "Audi"
  | "Aston Martin"
  | "Williams"
  | "Cadillac";

export const TEAM_COLORS: Record<Team, string> = {
  Mercedes: "#00D7B6",
  Ferrari: "#E8002D",
  "Red Bull": "#3671C6",
  McLaren: "#FF8000",
  "Racing Bulls": "#6692FF",
  Alpine: "#FF87BC",
  Haas: "#B6BABD",
  Audi: "#F50537",
  "Aston Martin": "#229971",
  Williams: "#64C4FF",
  Cadillac: "#D9D9D9",
};

export type Driver = {
  pos: number;
  code: string;
  firstName: string;
  lastName: string;
  team: Team;
  points: number;
};

export const STANDINGS_AFTER = "ПОСЛЕ ГРАН-ПРИ СИНГАПУРА";
export const RACES_LEFT = 6;
// Следующий этап — по расписанию FIA «2026 United States Grand Prix — Timetable»
export const NEXT_RACE = "ГРАН-ПРИ США · 23–25 ОКТЯБРЯ";
export const SOURCE_NOTE =
  "Источник: FIA · 2026 Singapore Grand Prix · Doc 91 «Championship Points»";

export const STANDINGS: Driver[] = [
  {
    pos: 1,
    code: "ANT",
    firstName: "Кими",
    lastName: "Антонелли",
    team: "Mercedes",
    points: 340,
  },
  {
    pos: 2,
    code: "RUS",
    firstName: "Джордж",
    lastName: "Расселл",
    team: "Mercedes",
    points: 238,
  },
  {
    pos: 3,
    code: "HAM",
    firstName: "Льюис",
    lastName: "Хэмилтон",
    team: "Ferrari",
    points: 229,
  },
  {
    pos: 4,
    code: "VER",
    firstName: "Макс",
    lastName: "Ферстаппен",
    team: "Red Bull",
    points: 221,
  },
  {
    pos: 5,
    code: "LEC",
    firstName: "Шарль",
    lastName: "Леклер",
    team: "Ferrari",
    points: 215,
  },
  {
    pos: 6,
    code: "NOR",
    firstName: "Ландо",
    lastName: "Норрис",
    team: "McLaren",
    points: 201,
  },
  {
    pos: 7,
    code: "PIA",
    firstName: "Оскар",
    lastName: "Пиастри",
    team: "McLaren",
    points: 138,
  },
  {
    pos: 8,
    code: "HAD",
    firstName: "Исак",
    lastName: "Хаджар",
    team: "Red Bull",
    points: 97,
  },
  {
    pos: 9,
    code: "LAW",
    firstName: "Лиам",
    lastName: "Лоусон",
    team: "Racing Bulls",
    points: 75,
  },
  {
    pos: 10,
    code: "GAS",
    firstName: "Пьер",
    lastName: "Гасли",
    team: "Alpine",
    points: 41,
  },
  {
    pos: 11,
    code: "LIN",
    firstName: "Арвид",
    lastName: "Линдблад",
    team: "Racing Bulls",
    points: 38,
  },
  {
    pos: 12,
    code: "COL",
    firstName: "Франко",
    lastName: "Колапинто",
    team: "Alpine",
    points: 27,
  },
  {
    pos: 13,
    code: "BEA",
    firstName: "Оливер",
    lastName: "Бирман",
    team: "Haas",
    points: 23,
  },
  {
    pos: 14,
    code: "HUL",
    firstName: "Нико",
    lastName: "Хюлькенберг",
    team: "Audi",
    points: 13,
  },
  {
    pos: 15,
    code: "BOR",
    firstName: "Габриэл",
    lastName: "Бортолето",
    team: "Audi",
    points: 10,
  },
  {
    pos: 16,
    code: "OCO",
    firstName: "Эстебан",
    lastName: "Окон",
    team: "Haas",
    points: 7,
  },
  {
    pos: 17,
    code: "ALO",
    firstName: "Фернандо",
    lastName: "Алонсо",
    team: "Aston Martin",
    points: 7,
  },
  {
    pos: 18,
    code: "SAI",
    firstName: "Карлос",
    lastName: "Сайнс",
    team: "Williams",
    points: 7,
  },
  {
    pos: 19,
    code: "ALB",
    firstName: "Александер",
    lastName: "Албон",
    team: "Williams",
    points: 5,
  },
  {
    pos: 20,
    code: "TSU",
    firstName: "Юки",
    lastName: "Цунода",
    team: "Racing Bulls",
    points: 1,
  },
  {
    pos: 21,
    code: "STR",
    firstName: "Лэнс",
    lastName: "Стролл",
    team: "Aston Martin",
    points: 0,
  },
  {
    pos: 22,
    code: "BOT",
    firstName: "Валттери",
    lastName: "Боттас",
    team: "Cadillac",
    points: 0,
  },
  {
    pos: 23,
    code: "PER",
    firstName: "Серхио",
    lastName: "Перес",
    team: "Cadillac",
    points: 0,
  },
];

export const LEADER = STANDINGS[0];
export const GAP_P1_P2 = STANDINGS[0].points - STANDINGS[1].points;

// Этапы 2026 года в порядке проведения (колонки таблицы FIA)
export const ROUNDS = [
  "Австралия",
  "Китай",
  "Япония",
  "Майами",
  "Канада",
  "Монако",
  "Барселона",
  "Австрия",
  "Великобритания",
  "Бельгия",
  "Венгрия",
  "Нидерланды",
  "Италия",
  "Мадрид",
  "Азербайджан",
  "Бахрейн",
  "Сингапур",
];

// Очки за каждый этап (Гран-при + спринт), по данным FIA Doc 91
export const ROUND_POINTS: Record<string, number[]> = {
  ANT: [18, 29, 25, 28, 31, 25, 0, 15, 8, 25, 15, 23, 25, 25, 10, 18, 20],
  RUS: [25, 26, 12, 17, 8, 0, 18, 25, 23, 0, 6, 23, 18, 10, 25, 0, 2],
  HAM: [12, 21, 8, 10, 21, 18, 25, 10, 22, 12, 10, 14, 8, 0, 8, 15, 15],
  VER: [8, 0, 4, 14, 17, 0, 12, 18, 3, 15, 18, 3, 15, 18, 18, 25, 33],
  LEC: [15, 19, 15, 10, 16, 0, 0, 4, 29, 18, 12, 17, 0, 12, 12, 12, 24],
  NOR: [10, 5, 10, 26, 7, 0, 15, 6, 18, 6, 25, 31, 12, 15, 0, 2, 13],
  PIA: [0, 3, 18, 22, 5, 12, 10, 12, 2, 10, 0, 12, 10, 4, 0, 8, 10],
  HAD: [0, 4, 0, 0, 10, 15, 8, 8, 10, 8, 8, 0, 0, 0, 15, 10, 1],
  LAW: [0, 8, 2, 0, 6, 10, 4, 2, 9, 0, 4, 6, 0, 8, 0, 6, 10],
  GAS: [1, 8, 6, 1, 4, 6, 6, 0, 1, 0, 0, 2, 6, 0, 0, 0, 0],
  LIN: [4, 0, 0, 0, 1, 8, 2, 1, 6, 2, 1, 0, 4, 2, 6, 1, 0],
  COL: [0, 1, 0, 6, 8, 0, 1, 0, 2, 1, 0, 0, 2, 6, 0, 0, 0],
  BEA: [6, 11, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 3],
  HUL: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 4, 0, 1, 0, 0, 6],
  BOR: [2, 0, 0, 0, 0, 0, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 0],
  OCO: [0, 0, 1, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0],
  ALO: [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 2, 0, 0, 0, 4, 0],
  SAI: [0, 2, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
  ALB: [0, 0, 0, 1, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  TSU: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
  STR: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  BOT: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  PER: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
};
