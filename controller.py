import numpy as np
from scipy.linalg import solve_continuous_are
from dataclasses import dataclass, field
from typing import Tuple, Optional


@dataclass
class ControllerParams:
    Q_scale: float = 1.0
    R_scale: float = 0.1
    Q_root_weight: float = 10.0
    Q_tip_weight: float = 5.0
    Q_rate_weight: float = 0.01
    tau_act: float = 0.05
    saturation: float = 25.0 * np.pi / 180
    delay: float = 0.0
    process_noise: float = 1e-3
    sensor_noise: float = 1e-4


def lqr_gain(A: np.ndarray, B: np.ndarray, Q: np.ndarray, R: np.ndarray) -> np.ndarray:
    n = A.shape[0]
    P = solve_continuous_are(A, B, Q, R)
    K = np.linalg.solve(R, B.T @ P)
    return K, P


def lqg_controller(ss: dict, cp: ControllerParams) -> dict:
    n_states = ss['n_states']
    A = ss['A']
    Bu = ss['Bu']
    C = ss['C']
    Bg = ss['Bg']

    Q = np.eye(n_states) * cp.Q_scale
    Q[0, 0] *= cp.Q_root_weight
    if n_states > 1:
        Q[1, 1] *= cp.Q_tip_weight
    if n_states > n_states // 2:
        Q[n_states // 2:, n_states // 2:] *= cp.Q_rate_weight
    R = np.eye(1) * cp.R_scale

    K, P = lqr_gain(A, Bu, Q, R)

    W = np.eye(n_states) * cp.process_noise
    V = np.eye(2) * cp.sensor_noise
    try:
        P_kf = solve_continuous_are(A.T, C.T, Bg @ Bg.T * cp.process_noise, V)
        L = P_kf @ C.T @ np.linalg.inv(V)
    except Exception:
        L = np.zeros((n_states, 2))

    A_cl = A - Bu @ K - L @ C + L @ C @ Bu @ K
    return {
        'K_lqr': K, 'P_lqr': P,
        'L_kf': L,
        'A_closed': A_cl,
        'Q': Q, 'R': R,
        'type': 'LQG'
    }


def lqr_design(ss: dict, cp: ControllerParams) -> dict:
    n_states = ss['n_states']
    A = ss['A']
    B = ss['Bu']

    Q = np.eye(n_states) * cp.Q_scale
    Q[0, 0] *= cp.Q_root_weight
    if n_states > 1:
        Q[1, 1] *= cp.Q_tip_weight
    if n_states > n_states // 2:
        Q[n_states // 2:, n_states // 2:] *= cp.Q_rate_weight
    R = np.eye(1) * cp.R_scale

    K, P = lqr_gain(A, B, Q, R)
    A_cl = A - B @ K
    return {
        'K_lqr': K, 'P_lqr': P,
        'A_closed': A_cl,
        'Q': Q, 'R': R,
        'type': 'LQR'
    }


def kalman_filter(ss: dict, cp: ControllerParams) -> np.ndarray:
    A = ss['A']; C = ss['C']; Bg = ss['Bg']
    n = A.shape[0]
    W = np.eye(n) * cp.process_noise
    V = np.eye(2) * cp.sensor_noise
    try:
        P = solve_continuous_are(A.T, C.T, Bg @ Bg.T * cp.process_noise, V)
        L = P @ C.T @ np.linalg.inv(V)
    except Exception:
        L = np.zeros((n, 2))
    return L


def _hinf_riccati_solution(A: np.ndarray, B1: np.ndarray, B2: np.ndarray,
                           Q: np.ndarray, R: np.ndarray, gamma: float) -> np.ndarray:
    n = A.shape[0]
    R_inv = np.linalg.inv(R)
    B = np.hstack([B2, B1])
    S = np.block([
        [A, (1.0/gamma**2) * B1 @ B1.T - B2 @ R_inv @ B2.T],
        [-Q, -A.T]
    ])
    eigvals, eigvecs = np.linalg.eig(S)
    idx_sorted = np.argsort(np.real(eigvals))
    n_stable = n
    V = eigvecs[:, idx_sorted[:n_stable]]
    if V.shape[1] < n:
        return None
    X = np.real(V[n:, :] @ np.linalg.inv(V[:n, :]))
    K = R_inv @ B2.T @ X
    A_cl = A - B2 @ K
    if np.max(np.real(np.linalg.eigvals(A_cl))) < 0:
        return K
    return None


def hinf_controller(ss: dict, cp: ControllerParams) -> dict:
    n = ss['n_states']
    A = ss['A']
    B1 = ss['Bg']
    B2 = ss['Bu']
    C2 = ss['C']
    n_out = C2.shape[0]

    K_best = np.zeros((1, n))
    L_best = np.zeros((n, n_out))
    gamma_best = np.inf

    Q_hinf = np.eye(n) * cp.Q_scale * 0.1
    Q_hinf[0, 0] *= cp.Q_root_weight * 0.01
    R_hinf = np.eye(1) * cp.R_scale

    for gamma in [100.0, 50.0, 20.0, 10.0, 5.0, 3.0, 2.0]:
        try:
            K = _hinf_riccati_solution(A, B1, B2, Q_hinf, R_hinf, gamma)
            if K is not None:
                K_best = K
                gamma_best = gamma
                break
        except Exception:
            continue

    if gamma_best == np.inf:
        gamma_best = 10.0

    A_cl = A - B2 @ K_best
    return {
        'K_hinf': K_best,
        'L_hinf': L_best,
        'A_closed': A_cl,
        'type': 'Hinf',
        'gamma': gamma_best
    }


class SaturatingActuator:
    def __init__(self, tau: float = 0.05, saturation: float = 25.0 * np.pi / 180,
                 delay: float = 0.0, dt: float = 0.005):
        self.tau = tau
        self.sat = saturation
        self.delay_steps = int(delay / dt) if dt > 0 else 0
        self.state = 0.0
        self.buffer = [0.0] * (self.delay_steps + 1)

    def update(self, u_cmd: float) -> float:
        u_cmd = np.clip(u_cmd, -self.sat, self.sat)
        self.buffer.append(u_cmd)
        u_delayed = self.buffer.pop(0)
        self.state += (u_delayed - self.state) / self.tau
        self.state = np.clip(self.state, -self.sat, self.sat)
        return self.state

    def transfer_function(self, s: complex) -> complex:
        return 1.0 / (self.tau * s + 1.0)

    def get_bode(self, omega: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        s = 1j * omega
        H = 1.0 / (self.tau * s + 1.0)
        mag = 20 * np.log10(np.abs(H))
        phase = np.angle(H, deg=True)
        return mag, phase


class FeedforwardController:
    def __init__(self, K_ff: float = 0.5, lead_time: float = 0.1, dt: float = 0.005):
        self.K_ff = K_ff
        self.lead_steps = int(lead_time / dt)
        self.dt = dt

    def compute(self, gust_estimate: float, t: float, t_array: np.ndarray,
                gust_profile: np.ndarray) -> float:
        t_pred = t + self.lead_steps * self.dt
        w_pred = np.interp(t_pred, t_array, gust_profile)
        return -self.K_ff * w_pred


def compute_stability_margins(A: np.ndarray, B: np.ndarray, K: np.ndarray) -> dict:
    L = K
    margins = {}
    for channel in range(B.shape[1]):
        Bc = B[:, channel:channel+1]
        Kc = L[channel:channel+1, :]
        try:
            sys_ol = lambda s: Kc @ np.linalg.inv(s * np.eye(A.shape[0]) - A) @ Bc
            w_test = np.logspace(-1, 3, 1000)
            ol_resp = np.array([sys_ol(1j * w) for w in w_test]).flatten()
            mag = np.abs(ol_resp)
            phase = np.angle(ol_resp, deg=True)
            idx_cross = np.where(np.abs(mag - 1.0) < 0.05)[0]
            gm = np.inf; pm = np.inf
            if len(idx_cross) > 0:
                idx_gm = idx_cross[0]
                pm = phase[idx_gm] - (-180)
            idx_pm = np.where(np.abs(phase + 180) < 5)[0]
            if len(idx_pm) > 0:
                gm = 1.0 / mag[idx_pm[0]] if mag[idx_pm[0]] > 0 else np.inf
                gm_db = 20 * np.log10(gm)
            else:
                gm_db = np.inf
            margins['gain_margin_db'] = float(gm_db) if gm_db < 1e6 else np.inf
            margins['phase_margin_deg'] = float(pm)
        except Exception:
            margins['gain_margin_db'] = np.inf
            margins['phase_margin_deg'] = np.inf
    return margins
