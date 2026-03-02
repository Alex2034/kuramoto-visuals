"""
FastAPI backend for Kuramoto simulation.
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from kuramoto import run_simulation

app = FastAPI(title="Kuramoto Vis API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SimulateRequest(BaseModel):
    N: int = Field(ge=5, le=50, default=20, description="Size of complete graphs")
    l: int = Field(ge=5, le=50, default=20, description="Chain length")
    lambda_val: float = Field(ge=0.0, le=10.0, default=1.0, description="Coupling in complete graphs")
    kappa: float = Field(ge=0.0, le=10.0, default=1.0, description="Coupling in chain")
    t_max: float = Field(ge=10, le=2000, default=1000, description="Simulation time")


@app.post("/simulate")
def simulate(req: SimulateRequest):
    """Run Kuramoto simulation and return times + frames for animation."""
    try:
        result = run_simulation(
            N=req.N,
            l=req.l,
            lambda_val=req.lambda_val,
            kappa=req.kappa,
            t_max=req.t_max,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    """Health check."""
    return {"status": "ok"}
