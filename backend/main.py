"""
FastAPI backend for Kuramoto simulation.
"""
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from reduced import run_reduced

app = FastAPI(title="Kuramoto Vis API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ReducedRequest(BaseModel):
    mode: Literal["dumbbell", "complete"] = Field(default="dumbbell", description="Dumbbell graph or one isolated complete graph")
    N: int = Field(ge=1, le=50, default=20, description="Size of complete graphs")
    l: int = Field(ge=1, le=50, default=20, description="Chain length (dumbbell only)")
    lambda_val: float = Field(gt=0.0, le=10.0, default=1.0, description="Coupling in complete graphs")
    kappa: float = Field(ge=0.0, le=10.0, default=1.0, description="Coupling in chain (dumbbell only)")
    t_max: Optional[float] = Field(gt=0, le=20000, default=None, description="Simulation time; default 3/lambda_2")
    n_frames: int = Field(ge=20, le=2000, default=300, description="Number of output frames")
    seed: int = Field(ge=0, default=41, description="Seed for the uniform initial phases")


MAX_AUTO_T = 20000


@app.post("/simulate/reduced")
def simulate_reduced(req: ReducedRequest):
    """Run the Watanabe–Strogatz reduction next to the full system; see reduced.run_reduced."""
    try:
        result = run_reduced(
            N=req.N,
            l=req.l,
            lambda_val=req.lambda_val,
            kappa=req.kappa if req.mode == "dumbbell" else 0.0,
            t_max=req.t_max,
            n_frames=req.n_frames,
            seed=req.seed,
            mode=req.mode,
            max_auto_t=MAX_AUTO_T,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    """Health check."""
    return {"status": "ok"}
