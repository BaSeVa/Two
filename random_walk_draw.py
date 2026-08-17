import random
import turtle

STEPS = 100
LINE_LENGTH = 20
BACKGROUND = (1.0, 1.0, 1.0)  # фон холста turtle, для имитации прозрачности

DEFAULT_COLOR_HEX = "#3454d1"
DEFAULT_ALPHA_PERCENT = 100.0

# 0 -> вниз, 1 -> вверх, 2 -> влево, 3 -> вправо
DIRECTIONS = {
    0: 270,
    1: 90,
    2: 180,
    3: 0,
}


def hex_to_rgb01(hex_color):
    hex_color = hex_color.strip().lstrip("#")
    return tuple(int(hex_color[i:i + 2], 16) / 255 for i in (0, 2, 4))


def blend_with_background(color, alpha, background=BACKGROUND):
    return tuple(alpha * c + (1 - alpha) * bg for c, bg in zip(color, background))


def color_for_line(target_rgb, alpha):
    return blend_with_background(target_rgb, alpha)


def ask_settings():
    hex_input = input(
        f"Цвет линий в HEX (Enter — {DEFAULT_COLOR_HEX}): "
    ).strip()
    target_rgb = hex_to_rgb01(hex_input) if hex_input else hex_to_rgb01(DEFAULT_COLOR_HEX)

    alpha_input = input(
        f"Прозрачность линий, 0-100% (Enter — {DEFAULT_ALPHA_PERCENT:.0f}%): "
    ).strip()
    alpha_percent = float(alpha_input) if alpha_input else DEFAULT_ALPHA_PERCENT
    alpha = max(0.0, min(100.0, alpha_percent)) / 100

    return target_rgb, alpha


def draw_random_walk(steps=STEPS, length=LINE_LENGTH):
    target_rgb, alpha = ask_settings()

    screen = turtle.Screen()
    screen.title("Случайное рисование")
    pen = turtle.Turtle()
    pen.speed(0)

    pen.pencolor(*color_for_line(target_rgb, alpha))

    current_length = length
    previous_number = None

    for _ in range(steps):
        number = random.randint(0, 3)
        if number == previous_number:
            current_length += 0.01
        pen.setheading(DIRECTIONS[number])
        pen.forward(current_length)
        previous_number = number

    screen.exitonclick()


if __name__ == "__main__":
    draw_random_walk()
