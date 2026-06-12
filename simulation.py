import numpy as np
from scipy.integrate import solve_ivp
from dataclasses import dataclass, field
from typing import Tuple, Optional, Callable


@dataclass
class SimulationResult:
    t: np.ndarray
    x_open: np.ndarray
    x_closed: np.ndarray
    w_gust: np.ndarray
    u_control: np.ndarray
    y_open: np.ndarray
    y_closed: np.ndarray
    metrics: dict = field(default_factory=dict)


def simulate_gla(ss: dict, t: np.ndarray, w_gust: np.ndarray,
                 K: np.ndarray, controller_type: str = 'LQR',
                 L_kf: np.ndarray = None,
                 ff_controller: Callable = None,
                 ff_params: dict = None) -> SimulationResult:
    A = ss['A']; Bu = ss['Bu']; Bg = ss['Bg']
    C = ss['C']; D = ss['D']
    n_states = A.shape[0]
    dt = t[1] - t[0]

    x0 = np.zeros(n_states)

    def open_loop(t_, x_):
        w = np.interp(t_, t, w_gust)
        return A @ x_ + Bg.flatten() * w

    sol_open = solve_ivp(open_loop, [t[0], t[-1]], x0, t_eval=t, method='RK45', rtol=1e-8, atol=1e-10)
    x_open = sol_open.y.T

    n_out = C.shape[0]
    y_open = (C @ x_open.T).T

    u_store = np.zeros(len(t))

    def closed_loop(t_, x_):
        w = np.interp(t_, t, w_gust)
        if controller_type == 'LQR':
            u = (-K @ x_).item()
        elif controller_type == 'LQG':
            u = (-K @ x_).item()
        elif controller_type == 'Hinf':
            u = (-K @ x_).item()
        else:
            u = 0.0
        if ff_controller is not None:
            u_ff = ff_controller.compute(w, t_, t, w_gust)
            u += u_ff
        u = np.clip(u, -25.0 * np.pi / 180, 25.0 * np.pi / 180)
        idx = int(np.clip(t_ / dt, 0, len(t) - 1))
        u_store[idx] = u
        return A @ x_ + Bu.flatten() * u + Bg.flatten() * w

    sol_closed = solve_ivp(closed_loop, [t[0], t[-1]], x0, t_eval=t, method='RK45', rtol=1e-8, atol=1e-10)
    x_closed = sol_closed.y.T
    y_closed = (C @ x_closed.T).T

    result = SimulationResult(
        t=t, x_open=x_open, x_closed=x_closed,
        w_gust=w_gust, u_control=u_store,
        y_open=y_open, y_closed=y_closed
    )
    return result


def compute_metrics(result: SimulationResult, ss: dict) -> dict:
    y_open = result.y_open
    y_closed = result.y_closed
    t = result.t

    root_moment_open = np.abs(y_open[:, 0])
    root_moment_closed = np.abs(y_closed[:, 0])
    tip_disp_open = np.abs(y_open[:, 1])
    tip_disp_closed = np.abs(y_closed[:, 1])

    peak_moment_open = np.max(root_moment_open)
    peak_moment_closed = np.max(root_moment_closed)
    moment_reduction = (peak_moment_open - peak_moment_closed) / peak_moment_open * 100 if peak_moment_open > 1e-10 else 0

    peak_disp_open = np.max(tip_disp_open)
    peak_disp_closed = np.max(tip_disp_closed)
    disp_reduction = (peak_disp_open - peak_disp_closed) / peak_disp_open * 100 if peak_disp_open > 1e-10 else 0

    rms_moment_open = np.sqrt(np.mean(root_moment_open**2))
    rms_moment_closed = np.sqrt(np.mean(root_moment_closed**2))
    rms_reduction = (rms_moment_open - rms_moment_closed) / rms_moment_open * 100 if rms_moment_open > 1e-10 else 0

    dt_s = t[1] - t[0] if len(t) > 1 else 0.005
    if len(t) > 1 and len(y_open) > 1 and len(y_closed) > 1:
        rms_acc_open = np.sqrt(np.mean(np.diff(y_open[:, 1])**2)) / dt_s
        rms_acc_closed = np.sqrt(np.mean(np.diff(y_closed[:, 1])**2)) / dt_s
        acc_reduction = (rms_acc_open - rms_acc_closed) / rms_acc_open * 100 if rms_acc_open > 1e-10 else 0
    else:
        rms_acc_open = 0; rms_acc_closed = 0; acc_reduction = 0

    settling_idx = max(1, int(0.5 * len(t)))
    energy_open = np.trapezoid(root_moment_open[settling_idx:]**2, t[settling_idx:])
    energy_closed = np.trapezoid(root_moment_closed[settling_idx:]**2, t[settling_idx:])
    energy_reduction = (energy_open - energy_closed) / energy_open * 100 if energy_open > 1e-10 else 0

    weight_saving = moment_reduction * 0.3
    max_control = np.max(np.abs(result.u_control))

    metrics = {
        'peak_moment_reduction_pct': float(moment_reduction),
        'peak_disp_reduction_pct': float(disp_reduction),
        'rms_moment_reduction_pct': float(rms_reduction),
        'rms_acceleration_reduction_pct': float(acc_reduction),
        'vibration_energy_reduction_pct': float(energy_reduction),
        'potential_weight_saving_pct': float(weight_saving),
        'max_control_deflection_deg': float(max_control * 180 / np.pi),
        'peak_moment_open': float(peak_moment_open),
        'peak_moment_closed': float(peak_moment_closed),
        'peak_disp_open': float(peak_disp_open),
        'peak_disp_closed': float(peak_disp_closed),
    }
    return metrics


def monte_carlo_analysis(ss_template: dict, n_samples: int = 100, **sim_kwargs) -> Tuple[list, dict]:
    results = []
    rng = np.random.RandomState(42)
    for _ in range(n_samples):
        pert = 1.0 + 0.2 * rng.randn()
        ss = dict(ss_template)
        A_pert = ss_template['A'] * (1.0 + 0.1 * rng.randn())
        ss['A'] = A_pert
        try:
            res = simulate_gla(ss, **sim_kwargs)
            met = compute_metrics(res, ss)
            results.append(met)
        except Exception:
            continue
    if not results:
        return [], {}
    metrics_keys = results[0].keys()
    stats = {}
    for key in metrics_keys:
        vals = [r[key] for r in results]
        stats[key] = {
            'mean': float(np.mean(vals)),
            'std': float(np.std(vals)),
            'min': float(np.min(vals)),
            'max': float(np.max(vals))
        }
    return results, stats
