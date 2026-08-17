import random
import turtle

STEPS = 100
LINE_LENGTH = 20

# 0 -> вниз, 1 -> вверх, 2 -> влево, 3 -> вправо
DIRECTIONS = {
    0: 270,
    1: 90,
    2: 180,
    3: 0,
}


def draw_random_walk(steps=STEPS, length=LINE_LENGTH):
    screen = turtle.Screen()
    screen.title("Случайное рисование")
    pen = turtle.Turtle()
    pen.speed(0)

    current_length = length
    previous_number = None

    for _ in range(steps):
        number = random.randint(0, 3)
        if number == previous_number:
            current_length += 0.1
        pen.setheading(DIRECTIONS[number])
        pen.forward(current_length)
        previous_number = number

    screen.exitonclick()


if __name__ == "__main__":
    draw_random_walk()
