"""Синтезирует звуковую дорожку public/sfx.wav: сигналы стартовых огней, рёв мотора и акценты.

Тайминги рассчитаны на 30 fps и порядок сцен в src/F1Video.tsx.
Запуск: python3 scripts/make_sfx.py
"""

import wave
from pathlib import Path

import numpy as np

SR = 44100
FPS = 30
TOTAL = 824 / FPS  # длительность F1DriversChampionship2026

t = np.arange(int(SR * TOTAL)) / SR
out = np.zeros_like(t)


def at(frame: int) -> float:
    return frame / FPS


def add(sig: np.ndarray, start: float) -> None:
    i = int(start * SR)
    n = min(len(sig), len(out) - i)
    out[i : i + n] += sig[:n]


# Пять сигналов стартовых огней (Intro: первый огонь на 14-м кадре, шаг 12)
for k in range(5):
    n = int(0.14 * SR)
    tt = np.arange(n) / SR
    env = np.minimum(1, tt / 0.005) * np.exp(-tt * 18)
    add(0.35 * np.sin(2 * np.pi * 1046 * tt) * env, at(14 + 12 * k))

# Мотор: старт на «огни погасли» (80-й кадр), переключения передач, затем сброс газа
lights_out = at(80)
rpm = np.zeros_like(t)
gears = [0.7, 0.9, 1.1, 1.3, 1.5]
cursor = lights_out
for g in gears:
    m = (t >= cursor) & (t < cursor + g)
    x = (t[m] - cursor) / g
    rpm[m] = 0.45 + 0.55 * (1 - (1 - x) ** 2)
    cursor += g
decel = t >= cursor
rpm[decel] = 0.45 + 0.55 * np.exp(-(t[decel] - cursor) * 0.9)
rpm[t < lights_out] = 0

freq = 70 + 230 * rpm
phase = np.cumsum(2 * np.pi * freq / SR)
engine = sum(np.sin(h * phase) / h**0.8 for h in range(1, 9))
rng = np.random.default_rng(7)
noise = np.convolve(rng.standard_normal(len(t)), np.ones(30) / 30, mode="same")
engine = np.tanh(1.6 * (engine + 0.6 * noise * rpm))

vol = np.interp(
    t,
    [lights_out, lights_out + 0.25, at(330), at(330) + 2.5, TOTAL],
    [0.0, 0.32, 0.26, 0.0, 0.0],
)
vol[t < lights_out] = 0
out += engine * vol


def thump(level: float) -> np.ndarray:
    n = int(0.6 * SR)
    tt = np.arange(n) / SR
    f = 55 + 60 * np.exp(-tt * 20)
    return level * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 7)


def ding(level: float) -> np.ndarray:
    n = int(1.2 * SR)
    tt = np.arange(n) / SR
    tone = sum(np.sin(2 * np.pi * f * tt) / i for i, f in enumerate([1318, 1976, 2637], start=1))
    return level * tone * np.exp(-tt * 4)


add(thump(0.8), at(80))  # огни погасли
add(thump(0.7), at(86 + 244))  # лидер на финише
add(ding(0.12), at(86 + 244))
add(thump(0.7), at(568 + 28))  # P1 на подиуме
add(thump(0.9), at(704 + 12))  # «+102»
add(ding(0.12), at(704 + 12))

out = np.clip(out / max(1.0, np.abs(out).max() / 0.9), -1, 1)
pcm = (out * 32767).astype(np.int16)
stereo = np.repeat(pcm[:, None], 2, axis=1)

dest = Path(__file__).resolve().parent.parent / "public" / "sfx.wav"
with wave.open(str(dest), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(stereo.tobytes())
print(f"wrote {dest} ({TOTAL:.2f}s)")
