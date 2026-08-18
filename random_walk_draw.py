import random
import turtle

STEPS = 100
LINE_LENGTH = 1
BACKGROUND = (1.0, 1.0, 1.0)  # фон холста turtle, для имитации прозрачности

DEFAULT_ALPHA_PERCENT = 100.0
DEFAULT_INCREMENT = 0.0001

# 0 -> вниз, 1 -> вверх, 2 -> влево, 3 -> вправо
DIRECTIONS = {
    0: 270,
    1: 90,
    2: 180,
    3: 0,
}

DIGIT_LABELS = {
    0: "0 (вниз)",
    1: "1 (вверх)",
    2: "2 (влево)",
    3: "3 (вправо)",
}

DEFAULT_COLOR_HEX_BY_DIGIT = {
    0: "#3454d1",
    1: "#d1344f",
    2: "#2e9e6b",
    3: "#c76a1e",
}


def save_image(pen, filename):
    if not filename.lower().endswith(".eps"):
        filename += ".eps"
    pen.getscreen().getcanvas().postscript(file=filename, colormode="color")

    try:
        from PIL import Image

        png_filename = filename[:-4] + ".png"
        Image.open(filename).save(png_filename)
        return png_filename
    except Exception:
        return filename


def hex_to_rgb01(hex_color):
    hex_color = hex_color.strip().lstrip("#")
    return tuple(int(hex_color[i:i + 2], 16) / 255 for i in (0, 2, 4))


def blend_with_background(color, alpha, background=BACKGROUND):
    return tuple(alpha * c + (1 - alpha) * bg for c, bg in zip(color, background))


def color_for_digit(target_rgb, alpha):
    return blend_with_background(target_rgb, alpha)


def ask_settings():
    colors_by_digit = {}
    for digit, label in DIGIT_LABELS.items():
        default_hex = DEFAULT_COLOR_HEX_BY_DIGIT[digit]
        hex_input = input(f"Цвет линий для цифры {label} в HEX (Enter — {default_hex}): ").strip()
        colors_by_digit[digit] = hex_to_rgb01(hex_input) if hex_input else hex_to_rgb01(default_hex)

    alpha_input = input(
        f"Прозрачность линий, 0-100% (Enter — {DEFAULT_ALPHA_PERCENT:.0f}%): "
    ).strip()
    alpha_percent = float(alpha_input) if alpha_input else DEFAULT_ALPHA_PERCENT
    alpha = max(0.0, min(100.0, alpha_percent)) / 100

    increment_input = input(
        f"Прирост длины при повторе числа, px, шаг 0.0001 (Enter — {DEFAULT_INCREMENT:.4f}): "
    ).strip()
    increment = float(increment_input) if increment_input else DEFAULT_INCREMENT

    return colors_by_digit, alpha, increment


def run_once(pen, steps, length, colors_by_digit, alpha, increment):
    pen.penup()
    pen.goto(0, 0)
    pen.setheading(0)
    pen.pendown()

    current_length = length
    previous_number = None

    for _ in range(steps):
        number = random.randint(0, 3)
        if number == previous_number:
            current_length += increment
        pen.pencolor(*color_for_digit(colors_by_digit[number], alpha))
        pen.setheading(DIRECTIONS[number])
        pen.forward(current_length)
        previous_number = number


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

    filename = input(
        "Сохранить картинку в файл? Введите имя файла (Enter — пропустить): "
    ).strip()
    if filename:
        saved_as = save_image(pen, filename)
        print(f"Картинка сохранена: {saved_as}")

    screen.exitonclick()


if __name__ == "__main__":
    draw_random_walk()
