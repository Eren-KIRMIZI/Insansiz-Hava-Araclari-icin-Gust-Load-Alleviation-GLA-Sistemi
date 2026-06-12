import sys, os, json, asyncio, time, math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
import uvicorn

from aeroelastic_model import WingParams, AeroelasticModel
from gust_models import discrete_1cos_vector
from controller import ControllerParams, lqr_design
from simulation import simulate_gla, compute_metrics


app = FastAPI(title="GLA Digital Twin")

static_dir = Path(__file__).parent / "static"
static_dir.mkdir(exist_ok=True)
(static_dir / "js").mkdir(exist_ok=True)


class GLASimEngine:
    def __init__(self):
        self.params = WingParams(
            n_elem=10, span=1.5, chord=0.25,
            EI=20.0, GJ=15.0, m_per_length=0.35,
            I_moi=0.0015, c_damping=0.01,
            rho=1.225, V_inf=20.0, a0=2*np.pi,
            flap_eff=1.0, flap_chord_ratio=0.35
        )
        self.model = AeroelasticModel(self.params)
        self.ss = self.model.build_state_space(n_modes=4, include_lag=False)

        self.cp = ControllerParams(
            Q_scale=10.0, R_scale=0.1,
            Q_root_weight=500.0, Q_tip_weight=50.0,
            tau_act=0.05, saturation=25.0*math.pi/180
        )
        self.lqr = lqr_design(self.ss, self.cp)
        self.K = self.lqr['K_lqr']

        self.gla_active = True
        self.t = 0.0
        self.dt = 0.016
        self.x = np.zeros(self.ss['n_states'])
        self.u = 0.0
        self.gust_amp = 10.0
        self.gust_len = 8.0
        self.gust_offset = 0.5

        self.history_len = 300
        self.t_hist = []
        self.moment_open_hist = []
        self.moment_closed_hist = []
        self.disp_hist = []
        self.control_hist = []
        self.gust_hist = []

        self._reset()

    def _reset(self):
        self.t = 0.0
        self.x = np.zeros(self.ss['n_states'])
        self.u = 0.0
        self.t_hist = []
        self.moment_open_hist = []
        self.moment_closed_hist = []
        self.disp_hist = []
        self.control_hist = []
        self.gust_hist = []

    def set_gla(self, active: bool):
        self.gla_active = active

    def set_gust(self, amp: float, length: float):
        self.gust_amp = amp
        self.gust_len = length

    def step(self):
        A = self.ss['A']; Bu = self.ss['Bu']; Bg = self.ss['Bg']
        C = self.ss['C']

        tg = max(0, self.t - self.gust_offset)
        T_g = 2.0 * self.gust_len / self.params.V_inf
        if tg <= T_g:
            w_g = 0.5 * self.gust_amp * (1.0 - math.cos(math.pi * self.params.V_inf * tg / self.gust_len))
        else:
            w_g = 0.0

        x_open = np.copy(self.x)
        if self.gla_active:
            u_i = (-self.K @ self.x).item()
            u_i = np.clip(u_i, -25.0*math.pi/180, 25.0*math.pi/180)
        else:
            u_i = 0.0
        self.u = u_i

        dx = A @ self.x + Bu.flatten() * u_i + Bg.flatten() * w_g
        self.x = self.x + dx * self.dt
        self.t += self.dt

        y = (C @ self.x).flatten()
        y_open = (C @ x_open).flatten()

        self.t_hist.append(self.t)
        self.moment_open_hist.append(float(y_open[0]))
        self.moment_closed_hist.append(float(y[0]))
        self.disp_hist.append(float(y[1]))
        self.control_hist.append(float(u_i * 180 / math.pi))
        self.gust_hist.append(float(w_g))

        max_len = self.history_len
        if len(self.t_hist) > max_len:
            self.t_hist = self.t_hist[-max_len:]
            self.moment_open_hist = self.moment_open_hist[-max_len:]
            self.moment_closed_hist = self.moment_closed_hist[-max_len:]
            self.disp_hist = self.disp_hist[-max_len:]
            self.control_hist = self.control_hist[-max_len:]
            self.gust_hist = self.gust_hist[-max_len:]

        n_elem = self.params.n_elem
        span = self.params.span
        phi = self.ss['phi']
        q = self.x[:self.ss['n_modes']]
        tip_idx = min(2 * n_elem, phi.shape[0] - 2)
        tip_disp = float(phi[tip_idx, :self.ss['n_modes']] @ q)
        disp_profile = []
        for i in range(n_elem + 1):
            idx = 2 * i
            if idx < phi.shape[0]:
                d = float(phi[idx, :self.ss['n_modes']] @ q)
                disp_profile.append({'x': i * span / n_elem, 'z': d})

        return {
            't': self.t,
            'moment_open': float(y_open[0]),
            'moment_closed': float(y[0]),
            'tip_disp': float(y[1]),
            'control_deg': float(u_i * 180 / math.pi),
            'gust': float(w_g),
            'gla_active': self.gla_active,
            'disp_profile': disp_profile,
            'history': {
                't': self.t_hist[-100:],
                'moment_open': self.moment_open_hist[-100:],
                'moment_closed': self.moment_closed_hist[-100:],
                'disp': self.disp_hist[-100:],
                'control': self.control_hist[-100:],
                'gust': self.gust_hist[-100:],
            }
        }


engine = GLASimEngine()


@app.get("/api/state")
async def get_state():
    return engine.step()


@app.post("/api/gla/{active}")
async def set_gla(active: bool):
    engine.set_gla(active)
    return {"gla_active": active}


@app.post("/api/gust")
async def set_gust(amp: float = 10.0, length: float = 8.0):
    engine.set_gust(amp, length)
    return {"gust_amp": amp, "gust_len": length}


@app.post("/api/reset")
async def reset():
    engine._reset()
    return {"status": "reset"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    running = True

    async def reader():
        nonlocal running
        while running:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=0.1)
                msg = json.loads(data)
                if "gla" in msg:
                    engine.set_gla(msg["gla"])
                elif "gust_amp" in msg:
                    engine.set_gust(msg["gust_amp"], msg.get("gust_len", 8.0))
                elif "reset" in msg:
                    engine._reset()
            except asyncio.TimeoutError:
                continue
            except (json.JSONDecodeError, WebSocketDisconnect):
                running = False
                break

    async def writer():
        nonlocal running
        while running:
            try:
                state = engine.step()
                await websocket.send_json(state)
                await asyncio.sleep(engine.dt)
            except WebSocketDisconnect:
                running = False
                break

    await asyncio.gather(reader(), writer())


@app.get("/", response_class=HTMLResponse)
async def get_html():
    return (static_dir / "index.html").read_text(encoding="utf-8")


app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
