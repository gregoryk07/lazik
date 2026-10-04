from datetime import datetime

lastLog = ""


def log(log, label="MAIN"):
    global lastLog
    if(log == lastLog):
        return
    lastLog = log
    now = datetime.now()
    nowFormatted = now.strftime("%Y-%m-%d %H:%M:%S")
    with open("logs/" + str(now.strftime("%Y-%m-%d")) + "-logdump.log", "a") as file:
        file.write(f"[{nowFormatted}] [ {label} ] {str(log)}\n")
    color_prefix = "\033[37m"
    color_reset = "\033[0m"
    color_timeformat_prefix = "\033[37m"
    if label == "MAIN":
        color_prefix = "\033[94m"
    elif label == "WARN":
        color_prefix = "\033[33m"
    elif label in ["ERROR", "FATAL"]:
        color_prefix = "\033[31m"
    elif label == "USB":
        color_prefix = "\033[32m"
    elif label == "USB DATA":
        color_prefix = "\033[92m"
    elif label == "USB SETUP":
        color_prefix = "\033[38;5;39m"
    elif label == "DAEMON":
        color_prefix = "\033[38;5;208m"
    with open("logs/" + str(now.strftime("%Y-%m-%d")) + "-logdump-raw.log", "a") as file:
        file.write(color_timeformat_prefix + "[" + nowFormatted + "] " + color_reset + color_prefix + "[ " + label + " ] " + color_reset + str(log) + "\n")
    print(color_prefix + "[ " + label + " ] " + color_reset + str(log))
