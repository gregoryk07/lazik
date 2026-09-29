from gpiozero import LED

setupDone = False

ledR = None
ledG = None
ledB = None

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

if __name__ == "__main__":
    setup()
    rgb(1, 0, 0)
    while True:
        pass