import random
import turtle

STEPS = 100
LINE_LENGTH = 1
BACKGROUND = (1.0, 1.0, 1.0)  # фон холста turtle, для имитации прозрачности

DEFAULT_COLOR_HEX = "#3454d1"
DEFAULT_ALPHA_PERCENT = 100.0
DEFAULT_INCREMENT = 0.001

# 0 -> вниз, 1 -> вверх, 2 -> влево, 3 -> вправо
DIRECTIONS = {
    0: 270,
    1: 90,
    2: 180,
    3: 0,
}

# порядок направлений по часовой стрелке для режима "спираль": вправо, вниз, влево, вверх
SPIRAL_ORDER = [3, 0, 2, 1]


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

    increment_input = input(
        f"Прирост длины при повторе числа, px, шаг 0.001 (Enter — {DEFAULT_INCREMENT:.3f}): "
    ).strip()
    increment = float(increment_input) if increment_input else DEFAULT_INCREMENT

    mode_input = input(
        "Траектория: (о)бычная случайная или (с)пираль (Enter — обычная): "
    ).strip().lower()
    mode = "spiral" if mode_input.startswith("с") or mode_input.startswith("s") else "random"

    return target_rgb, alpha, increment, mode


def run_once(pen, steps, length, target_rgb, alpha, increment, mode):
    pen.penup()
    pen.goto(0, 0)
    pen.setheading(0)
    pen.pendown()
    pen.pencolor(*color_for_line(target_rgb, alpha))

    current_length = length
    previous_number = None

    spiral_dir_index = 0
    spiral_side_len = 1
    spiral_side_progress = 0
    spiral_sides_at_len = 0

    for _ in range(steps):
        number = random.randint(0, 3)
        direction = SPIRAL_ORDER[spiral_dir_index] if mode == "spiral" else number

        if number == previous_number:
            current_length += increment
        pen.setheading(DIRECTIONS[direction])
        pen.forward(current_length)
        previous_number = number

        if mode == "spiral":
            spiral_side_progress += 1
            if spiral_side_progress >= spiral_side_len:
                spiral_side_progress = 0
                spiral_dir_index = (spiral_dir_index + 1) % 4
                spiral_sides_at_len += 1
                if spiral_sides_at_len >= 2:
                    spiral_sides_at_len = 0
                    spiral_side_len += 1


def draw_random_walk(steps=STEPS, length=LINE_LENGTH):
    screen = turtle.Screen()
    screen.title("Случайное рисование")
    pen = turtle.Turtle()
    pen.speed(0)
    pen.hideturtle()

    run_once(pen, steps, length, *ask_settings())

    while True:
        again = input(
            "Запустить ещё раз поверх текущего рисунка, начиная из начальной точки? (y/N): "
        ).strip().lower()
        if again != "y":
            break
        run_once(pen, steps, length, *ask_settings())

    screen.exitonclick()


if __name__ == "__main__":
    draw_random_walk()
