import os
import sys
import uvicorn

if __name__ == "__main__":
    # Ensure current directory is in sys.path
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from main import app
    port = int(os.environ.get("PORT", 5000))
    host = os.environ.get("HOST", "0.0.0.0")
    print(f"🚀 Launching Resume Porter Python FastAPI Server on port {port}...")
    uvicorn.run(app, host=host, port=port)
