import os
import uuid
import shutil
import traceback
from fastapi import FastAPI, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

# Load the secure environment variables
load_dotenv()

# Import your working PyTorch pipeline
from lumina_pipeline import infer_edf, infer_npy

app = FastAPI(title="Lumina Clinical API")

# Allow React to communicate with this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

RESULTS_DB = {}

def process_eeg_task(task_id: str, file_path: str, file_extension: str):
    try:
        # 1. Run Inference
        if file_extension == ".edf":
            summary, epoch_results = infer_edf(file_path)
        else:
            summary, epoch_results = infer_npy(file_path, is_raw=True, orig_fs=256.0)
            
        # 2. THE RENAME FIX
        # React expects "heatmap", so we map your matrix directly to that exact key
        if "explanation" in summary and "heatmap_matrix" in summary["explanation"]:
            summary["explanation"]["heatmap"] = summary["explanation"]["heatmap_matrix"]

        # 3. Save to database
        RESULTS_DB[task_id] = {
            "status": "complete",
            "data": summary
        }
        
    except Exception as e:
        print(f"Error processing task {task_id}: {str(e)}")
        RESULTS_DB[task_id] = {
            "status": "failed",
            "error": str(e)
        }
        RESULTS_DB[task_id] = {"status": "failed", "error": str(e)}
    finally:
        # Clean up the file so we don't bloat the server
        if os.path.exists(file_path):
            os.remove(file_path)

@app.post("/api/v1/analyze")
async def upload_eeg(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    """Receives the file and hands it to the background worker."""
    task_id = str(uuid.uuid4())
    _, ext = os.path.splitext(file.filename)
    file_location = f"temp_{task_id}{ext}"
    
    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(file.file, file_object)
        
    RESULTS_DB[task_id] = {"status": "processing"}
    background_tasks.add_task(process_eeg_task, task_id, file_location, ext.lower())
    
    return JSONResponse(content={"task_id": task_id})

@app.get("/api/v1/results/{task_id}")
async def get_results(task_id: str):
    """React polls this endpoint to check if the analysis is done."""
    result = RESULTS_DB.get(task_id)
    if not result:
        return JSONResponse(status_code=404, content={"error": "Task not found"})
    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)