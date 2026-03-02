import streamlit as st
import numpy as np
import pandas as pd
import plotly.express as px
from scipy.integrate import solve_ivp

def build_dumbbell_adjacency(N, l, lambda_val, kappa):
    V = 2 * N + l
    W = np.zeros((V, V))
    for i in range(N):
        for j in range(N):
            if i != j: W[i, j] = lambda_val / N
    for i in range(N + l, V):
        for j in range(N + l, V):
            if i != j: W[i, j] = lambda_val / N
    for i in range(N - 1, N + l):
        W[i, i + 1] = kappa
        W[i + 1, i] = kappa
    return W

def kuramoto_ode(t, theta, W):
    theta_diff = theta.reshape(1, -1) - theta.reshape(-1, 1)
    return np.sum(W * np.sin(theta_diff), axis=1)

st.title("Evolution of Kuramoto System on Dumbbell Graph")

# Sidebar for hyperparameters
st.sidebar.header("Hyperparameters")
N = st.sidebar.slider("Size of complete graphs (N)", 5, 50, 20)
l = st.sidebar.slider("Chain length (l)", 5, 50, 20)
lambda_val = st.sidebar.slider("Coupling in complete graphs (λ)", 0.0, 10.0, 1.0)
kappa = st.sidebar.slider("Coupling in chain (κ)", 0.0, 10.0, 1.0)
t_max = st.sidebar.slider("Simulation time (T)", 10, 2000, 1000)

if st.button("Run simulation"):
    V = 2 * N + l
    W = build_dumbbell_adjacency(N, l, lambda_val, kappa)
    
    # Initialize random phases
    np.random.seed(42)
    theta0 = np.random.uniform(-np.pi, np.pi, V)
    
    # Integration (downsample to 100 frames for smooth animation)
    t_eval = np.linspace(0, t_max, 100)
    sol = solve_ivp(kuramoto_ode, (0, t_max), theta0, t_eval=t_eval, args=(W,))
    
    # Build DataFrame for Plotly
    records = []
    
    # Define colors: blue for clusters, red for chain
    colors = ['Components (Blue)'] * N + ['Chain (Red)'] * l + ['Components (Blue)'] * N
    
    for frame_idx, t_val in enumerate(sol.t):
        thetas = sol.y[:, frame_idx]
        x = np.cos(thetas)
        y = np.sin(thetas)
        
        for i in range(V):
            records.append({
                "Time": round(t_val, 1),
                "Index": i,
                "x": x[i],
                "y": y[i],
                "Node type": colors[i]
            })
            
    df = pd.DataFrame(records)
    
    # Create animated chart
    fig = px.scatter(
        df, x="x", y="y", animation_frame="Time", color="Node type",
        color_discrete_map={"Components (Blue)": "blue", "Chain (Red)": "red"},
        hover_name="Index", range_x=[-1.5, 1.5], range_y=[-1.5, 1.5],
        width=700, height=700
    )
    
    # Draw unit circle outline
    fig.add_shape(
        type="circle",
        xref="x", yref="y",
        x0=-1, y0=-1, x1=1, y1=1,
        line_color="lightgray",
    )
    
    st.plotly_chart(fig)
