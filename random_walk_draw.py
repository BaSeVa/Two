import random
import time
import turtle

STEPS = 100
LINE_LENGTH = 1

DEFAULT_ALPHA_PERCENT = 100.0
DEFAULT_INCREMENT = 0.0001
DEFAULT_CANVAS_COLOR_HEX = "#f5f2ea"

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


def save_image(screen, filename):
    if not filename.lower().endswith(".eps"):
        filename += ".eps"
    screen.getcanvas().postscript(file=filename, colormode="color")

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


def blend_with_background(color, alpha, background):
    return tuple(alpha * c + (1 - alpha) * bg for c, bg in zip(color, background))


def color_for_digit(target_rgb, alpha, background):
    return blend_with_background(target_rgb, alpha, background)


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


def wait_for_start_click(screen):
    coords = {}

    def handle_click(x, y):
        coords["x"] = x
        coords["y"] = y

    screen.onclick(handle_click)
    root = screen.getcanvas().winfo_toplevel()
    while "x" not in coords:
        root.update()
        time.sleep(0.02)
    screen.onclick(None)
    return coords["x"], coords["y"]


def make_walkers(start_points, length):
    walkers = []
    for start_x, start_y in start_points:
        pen = turtle.Turtle()
        pen.speed(0)
        pen.hideturtle()
        pen.penup()
        pen.goto(start_x, start_y)
        pen.setheading(0)
        pen.pendown()
        walkers.append({"pen": pen, "current_length": length, "previous_number": None})
    return walkers


def run_walkers(walkers, steps, colors_by_digit, alpha, increment, background_rgb):
    for _ in range(steps):
        for state in walkers:
            pen = state["pen"]
            number = random.randint(0, 3)
            if number == state["previous_number"]:
                state["current_length"] += increment
            pen.pencolor(*color_for_digit(colors_by_digit[number], alpha, background_rgb))
            pen.setheading(DIRECTIONS[number])
            pen.forward(state["current_length"])
            state["previous_number"] = number


def ask_start_point(screen):
    half = 300
    margin = 20
    presets = {
        "1": ("середина", (0, 0)),
        "2": ("левый верхний угол", (-half + margin, half - margin)),
        "3": ("левый нижний угол", (-half + margin, -half + margin)),
        "4": ("правый верхний угол", (half - margin, half - margin)),
        "5": ("правый нижний угол", (half - margin, -half + margin)),
    }
    print("Точка начала:")
    for key, (label, _) in presets.items():
        print(f"  {key} — {label}")
    print("  Enter — кликнуть по холсту")
    choice = input("Выбор: ").strip()
    if choice in presets:
        return presets[choice][1]
    print("Кликните по холсту, чтобы задать точку начала...")
    return wait_for_start_click(screen)


def ask_start_points(screen):
    points = [ask_start_point(screen)]
    while True:
        more = input("Добавить ещё одну точку начала? (y/N): ").strip().lower()
        if more != "y":
            break
        points.append(ask_start_point(screen))
    return points


def draw_random_walk(steps=STEPS, length=LINE_LENGTH):
    screen = turtle.Screen()
    screen.title("Случайное рисование")
    screen.setup(width=600, height=600)

    bg_hex_input = input(f"Цвет холста в HEX (Enter — {DEFAULT_CANVAS_COLOR_HEX}): ").strip()
    bg_hex = bg_hex_input if bg_hex_input else DEFAULT_CANVAS_COLOR_HEX
    screen.bgcolor(bg_hex)
    background_rgb = hex_to_rgb01(bg_hex)

    start_points = ask_start_points(screen)

    walkers = make_walkers(start_points, length)
    run_walkers(walkers, steps, *ask_settings(), background_rgb)

    while True:
        again = input(
            "Запустить ещё раз поверх текущего рисунка, из тех же точек? (y/N): "
        ).strip().lower()
        if again != "y":
            break
        walkers = make_walkers(start_points, length)
        run_walkers(walkers, steps, *ask_settings(), background_rgb)

    filename = input(
        "Сохранить картинку в файл? Введите имя файла (Enter — пропустить): "
    ).strip()
    if filename:
        saved_as = save_image(screen, filename)
        print(f"Картинка сохранена: {saved_as}")

    screen.exitonclick()


if __name__ == "__main__":
    draw_random_walk()
