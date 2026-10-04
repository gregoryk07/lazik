from gpiozero import LED

setupDone = False

ledR = None
ledG = None
ledB = None

ledPrevious = [0, 1, 0]
ledPrevious2 = [0, 1, 0]

def setup():
    global setupDone
    global ledR
    global ledG
    global ledB

    ledR = LED(4, active_high=False)
    ledG = LED(5, active_high=False)
    ledB = LED(6, active_high=False)
    ledR.off()
    ledG.off()
    ledB.off()
    setupDone = True

def rgb(r, g, b):
    global ledPrevious, ledPrevious2
    ledPrevious[0] = ledPrevious2[0]
    ledPrevious[1] = ledPrevious2[1]
    ledPrevious[2] = ledPrevious2[2]
    ledPrevious2[0] = r
    ledPrevious2[1] = g
    ledPrevious2[2] = b
    if not setupDone:
        return
    if r:
        ledR.on()
    else:
        ledR.off()
    if g:
        ledG.on()
    else:
        ledG.off()
    if b:
        ledB.on()
    else:
        ledB.off()

def previousRGB():
    global ledPrevious
    rgb(ledPrevious[0], ledPrevious[1], ledPrevious[2])

if __name__ == "__main__":
    setup()
    rgb(1, 0, 0)
    while True:
        pass