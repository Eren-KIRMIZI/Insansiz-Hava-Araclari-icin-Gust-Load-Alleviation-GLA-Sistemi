import numpy as np
from scipy.linalg import solve_continuous_lyapunov, svd
from typing import Tuple


def compute_hankel_singular_values(A: np.ndarray, B: np.ndarray, C: np.ndarray) -> np.ndarray:
    try:
        Wc = solve_continuous_lyapunov(A, -B @ B.T)
        Wo = solve_continuous_lyapunov(A.T, -C.T @ C)
        eigvals = np.linalg.eigvalsh(Wc @ Wo)
        hsv = np.sqrt(np.abs(eigvals))
        return np.sort(hsv)[::-1]
    except Exception:
        return np.array([])


def balanced_truncation(A: np.ndarray, B: np.ndarray, C: np.ndarray,
                        D: np.ndarray, r: int) -> Tuple[np.ndarray, ...]:
    try:
        from scipy.linalg import sqrtm
        n = A.shape[0]
        Wc = solve_continuous_lyapunov(A, -B @ B.T)
        Wo = solve_continuous_lyapunov(A.T, -C.T @ C)
        Rc = sqrtm(Wc)
        Rc_inv = np.linalg.inv(Rc)
        H = Rc.T @ Wo @ Rc
        T, Sigma = np.linalg.eigh(H)
        idx = np.argsort(T)[::-1]
        T = T[idx]
        Sigma = Sigma[:, idx]
        T_half_inv = np.diag(1.0 / np.sqrt(np.maximum(T[:r], 1e-15)))
        V = Rc @ Sigma
        V1 = V[:, :r]
        W1 = V1.T @ Rc_inv
        Ar = W1 @ A @ V1
        Br = W1 @ B
        Cr = C @ V1
        Dr = D
        return Ar, Br, Cr, Dr, T[:r]
    except Exception:
        return A, B, C, D, np.array([])


def select_modes_by_energy(omega: np.ndarray, phi: np.ndarray, M_mod: np.ndarray,
                           K_mod: np.ndarray, energy_threshold: float = 0.95) -> Tuple[np.ndarray, int]:
    n_modes = len(omega)
    modal_energy = np.zeros(n_modes)
    for i in range(n_modes):
        modal_energy[i] = np.abs(K_mod[i, i])
    total = modal_energy.sum()
    frac = modal_energy / total
    sorted_idx = np.argsort(frac)[::-1]
    cumsum = 0
    n_selected = 0
    for i in sorted_idx:
        cumsum += frac[i]
        n_selected += 1
        if cumsum >= energy_threshold:
            break
    return sorted_idx[:n_selected], n_selected


def modal_strain_energy_contribution(K_physical: np.ndarray, modes: np.ndarray) -> np.ndarray:
    n_modes = modes.shape[1]
    energy = np.zeros(n_modes)
    for i in range(n_modes):
        energy[i] = modes[:, i].T @ K_physical @ modes[:, i]
    return energy / np.sum(energy)


def verify_reduction(full_ss: dict, reduced_ss: dict,
                     t: np.ndarray, w_gust: np.ndarray) -> dict:
    from scipy.integrate import solve_ivp
    def full_dyn(t_, x_):
        return full_ss['A'] @ x_ + full_ss['Bg'].flatten() * np.interp(t_, t, w_gust)
    def red_dyn(t_, x_):
        return reduced_ss['A'] @ x_ + reduced_ss['Bg'].flatten() * np.interp(t_, t, w_gust)
    nf = full_ss['A'].shape[0]
    x0f = np.zeros(nf)
    sol_f = solve_ivp(full_dyn, [t[0], t[-1]], x0f, t_eval=t, method='RK45')
    nr = reduced_ss['A'].shape[0]
    x0r = np.zeros(nr)
    sol_r = solve_ivp(red_dyn, [t[0], t[-1]], x0r, t_eval=t, method='RK45')
    y_full = (full_ss['C'] @ sol_f.y).T
    y_red = (reduced_ss['C'] @ sol_r.y).T
    err = np.linalg.norm(y_full - y_red, axis=0) / np.linalg.norm(y_full, axis=0)
    return {
        'y_full': y_full, 'y_red': y_red,
        'error': err, 'max_error': np.max(err),
        'mean_error': np.mean(err)
    }
