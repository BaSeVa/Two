// Личный зачёт FIA Formula One World Championship 2026 после Гран-при Сингапура.
// fia.com был недоступен из окружения сборки, поэтому таблица сведена по
// совпадающим публикациям: Forbes, GPFans, Motorsport Week, RaceFans (12–13.10.2026).
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
export const SOURCE_NOTE =
  "Данные: личный зачёт FIA F1 2026 после ГП Сингапура (Forbes, GPFans, Motorsport Week, RaceFans)";

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
