import os
from app import create_app
from app.services.background import BackgroundScanner

app = create_app()

if __name__ == '__main__':
    # Start the background scanner thread
    # In debug mode, Werkzeug reloader spawns a child process. Only start the thread in the child process.
    if os.environ.get('WERKZEUG_RUN_MAIN') == 'true' or not app.debug:
        print("[WIDS] Starting background scanner thread...")
        scanner = BackgroundScanner(app)
        scanner.start()
    
    app.run(host='0.0.0.0', port=5000, debug=True)

