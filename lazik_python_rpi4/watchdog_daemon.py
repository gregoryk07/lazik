import sys
import time
import os
import importlib
import multiprocessing
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from logs import log

def run_target_function(module_name, func_name):
    """Target function that runs in a separate process."""
    try:
        # Dynamically import or reload the module to get code changes
        if module_name in sys.modules:
            mod = importlib.reload(sys.modules[module_name])
        else:
            mod = importlib.import_module(module_name)
        
        # Call the target function
        func = getattr(mod, func_name)
        func()
    except Exception as e:
        log(f"Error in script: {e}", "DAEMON")

class FunctionReloaderHandler(FileSystemEventHandler):
    def __init__(self, module_name, func_name, exclude_dirs=None):
        self.module_name = module_name
        self.func_name = func_name
        self.exclude_dirs = exclude_dirs or []
        self.process = None
        self.restart_process()

    def restart_process(self):
        if self.process and self.process.is_alive():
            log((f"Change detected. Terminating process (PID: {self.process.pid})..."), "DAEMON")
            self.process.terminate()
            self.process.join(timeout=3)
            if self.process.is_alive():
                self.process.kill()

        log(f"Starting {self.module_name}.{self.func_name}()", "DAEMON")
        # Spawn a fresh process running the function
        self.process = multiprocessing.Process(
            target=run_target_function, 
            args=(self.module_name, self.func_name)
        )
        self.process.start()

    def on_modified(self, event):
        if event.is_directory:
            return
        if event.src_path.endswith(('.pyc', '.tmp', '.swp', '.log')):
            return

        path_parts = os.path.normpath(event.src_path).split(os.sep)
        if any(part.startswith('.') for part in path_parts if part and part != '.'):
            return

        for exc_dir in self.exclude_dirs:
            if exc_dir in path_parts:
                return

        log(f"Modification detected in: {event.src_path}", "DAEMON")
        self.restart_process()

if __name__ == "__main__":
    # Required for Windows multiprocessing safety
    multiprocessing.freeze_support()

    watch_dir = "."
    target_module = "lazik"   # Corresponds to main.py
    target_function = "main" # Corresponds to def main():

    excluded_directories = ["logs", "venv", "__pycache__"]

    event_handler = FunctionReloaderHandler(target_module, target_function, exclude_dirs=excluded_directories)
    observer = Observer()
    observer.schedule(event_handler, path=watch_dir, recursive=True)
    
    log(f"Watching '{watch_dir}' to run {target_module}.{target_function}()...", "DAEMON")
    observer.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        log("Stopping daemon...", "DAEMON")
        observer.stop()
        if event_handler.process and event_handler.process.is_alive():
            event_handler.process.terminate()
    observer.join()