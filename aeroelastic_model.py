import numpy as np
from scipy.linalg import eigh, solve_continuous_lyapunov
from dataclasses import dataclass, field
from typing import Tuple, Optional


@dataclass
class WingParams:
    n_elem: int = 10
    span: float = 1.5
    chord: float = 0.25
    EI: float = 150.0
    GJ: float = 100.0
    EA: float = 1e6
    m_per_length: float = 0.45
    I_moi: float = 0.002
    c_damping: float = 0.02
    rho: float = 1.225
    V_inf: float = 20.0
    a0: float = 2.0 * np.pi
    aoa_trim: float = 2.0 * np.pi / 180
    x_ac: float = 0.25
    x_cg: float = 0.30
    flap_chord_ratio: float = 0.25
    flap_eff: float = 0.5


class AeroelasticModel:
    def __init__(self, params: WingParams):
        self.p = params
        self.n = params.n_elem
        self.n_dof = 2 * (self.n + 1)
        self.M = np.zeros((self.n_dof, self.n_dof))
        self.C = np.zeros((self.n_dof, self.n_dof))
        self.K = np.zeros((self.n_dof, self.n_dof))
        self.Q_aero = np.zeros((self.n_dof, self.n_dof))
        self.B_control = np.zeros((self.n_dof, 1))
        self.G_gust = np.zeros((self.n_dof, 1))
        self._build_structural_matrices()
        self._build_aerodynamic_matrices()
        self._assemble_system()

    def _build_structural_matrices(self):
        p = self.p
        L_e = p.span / self.n
        nd = self.n_dof
        for i in range(self.n):
            idx = 2 * i
            ke = np.zeros((4, 4))
            ke[0, 0] = 12; ke[0, 1] = 6 * L_e; ke[0, 2] = -12; ke[0, 3] = 6 * L_e
            ke[1, 0] = 6 * L_e; ke[1, 1] = 4 * L_e**2; ke[1, 2] = -6 * L_e; ke[1, 3] = 2 * L_e**2
            ke[2, 0] = -12; ke[2, 1] = -6 * L_e; ke[2, 2] = 12; ke[2, 3] = -6 * L_e
            ke[3, 0] = 6 * L_e; ke[3, 1] = 2 * L_e**2; ke[3, 2] = -6 * L_e; ke[3, 3] = 4 * L_e**2
            ke *= p.EI / L_e**3
            me = np.zeros((4, 4))
            me[0, 0] = 156; me[0, 1] = 22 * L_e; me[0, 2] = 54; me[0, 3] = -13 * L_e
            me[1, 0] = 22 * L_e; me[1, 1] = 4 * L_e**2; me[1, 2] = 13 * L_e; me[1, 3] = -3 * L_e**2
            me[2, 0] = 54; me[2, 1] = 13 * L_e; me[2, 2] = 156; me[2, 3] = -22 * L_e
            me[3, 0] = -13 * L_e; me[3, 1] = -3 * L_e**2; me[3, 2] = -22 * L_e; me[3, 3] = 4 * L_e**2
            me *= p.m_per_length * L_e / 420
            for r in range(4):
                for c in range(4):
                    if idx + r < nd and idx + c < nd:
                        self.K[idx + r, idx + c] += ke[r, c]
                        self.M[idx + r, idx + c] += me[r, c]
            kt = p.GJ / L_e * np.array([[1, -1], [-1, 1]])
            idx_t = 2 * i + 1
            for r in range(2):
                for c in range(2):
                    if idx_t + r < nd and idx_t + c < nd:
                        self.K[idx_t + r, idx_t + c] += kt[r, c]
                        self.M[idx_t + r, idx_t + c] += p.I_moi * L_e / 6 * (1 if r == c else 0.5)
        bc_idx = [0, 1]
        for mat in [self.M, self.C, self.K]:
            mat[bc_idx, :] = 0
            mat[:, bc_idx] = 0
            for j, idx in enumerate(bc_idx):
                mat[idx, idx] = 1.0
        self._bc = np.zeros(nd, dtype=bool)
        self._bc[0] = self._bc[1] = True
        self._free = np.where(~self._bc)[0]

    def _build_aerodynamic_matrices(self):
        p = self.p
        L_e = p.span / self.n
        q_inf = 0.5 * p.rho * p.V_inf**2
        for i in range(self.n):
            idx = 2 * i + 2
            if idx >= self.n_dof:
                continue
            L_aero = q_inf * p.chord * p.a0 * L_e
            self.Q_aero[idx, idx + 1] = L_aero
            self.Q_aero[idx + 1, idx + 1] = L_aero * (p.x_ac - p.x_cg) * p.chord
            b1 = q_inf * p.chord * p.flap_eff * p.flap_chord_ratio * L_e
            self.B_control[idx, 0] = b1
            b_g = q_inf * p.chord * p.a0 * L_e / p.V_inf
            self.G_gust[idx, 0] = b_g

    def _assemble_system(self):
        p = self.p
        self.C = p.c_damping * self.M + 1e-4 * self.K
        L_e = self.p.span / self.n
        q_inf = 0.5 * self.p.rho * self.p.V_inf**2
        for i in range(self.n):
            idx = 2 * i + 2
            if idx >= self.n_dof:
                continue
            c_aero = q_inf * self.p.chord * self.p.a0 * L_e / self.p.V_inf
            self.C[idx, idx] += c_aero
        free_idx = self._free
        Mf = self.M[free_idx][:, free_idx]
        Kf = self.K[free_idx][:, free_idx]
        self._Mf = Mf
        self._Kf = Kf
        self._free_idx = free_idx

    def compute_modes(self, n_modes: int = 6) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        free_idx = self._free
        Mf = self.M[free_idx][:, free_idx]
        Kf = self.K[free_idx][:, free_idx]
        eigvals, eigvecs = eigh(Kf, Mf)
        idx = np.argsort(eigvals)
        eigvals = eigvals[idx[:n_modes]]
        eigvecs = eigvecs[:, idx[:n_modes]]
        omega = np.sqrt(np.maximum(eigvals, 0))
        freq_hz = omega / (2 * np.pi)
        phi_full = np.zeros((self.n_dof, n_modes))
        phi_full[free_idx, :] = eigvecs
        for j in range(n_modes):
            phi_full[:, j] = phi_full[:, j] / np.max(np.abs(phi_full[:, j]))
        return omega, freq_hz, phi_full

    def build_state_space(self, n_modes: int = 4, include_lag: bool = True) -> dict:
        omega, freq_hz, phi_full = self.compute_modes(n_modes)
        free_idx = self._free
        Mf = self.M[free_idx][:, free_idx]
        Cf = self.C[free_idx][:, free_idx]
        Kf = self.K[free_idx][:, free_idx]
        Qf = self.Q_aero[free_idx][:, free_idx]
        Bf = self.B_control[free_idx, :]
        Gf = self.G_gust[free_idx, :]

        phi = phi_full[free_idx, :]

        M_mod = phi.T @ Mf @ phi
        C_mod = phi.T @ Cf @ phi
        K_mod = phi.T @ Kf @ phi
        Q_mod = phi.T @ Qf @ phi
        B_mod = phi.T @ Bf
        G_mod = phi.T @ Gf

        xi = M_mod
        n_states = 2 * n_modes
        A = np.zeros((n_states, n_states))
        A[:n_modes, n_modes:] = np.eye(n_modes)
        A[n_modes:, :n_modes] = -np.linalg.solve(xi, K_mod - Q_mod)
        A[n_modes:, n_modes:] = -np.linalg.solve(xi, C_mod)

        Bu = np.zeros((n_states, 1))
        Bu[n_modes:, :] = np.linalg.solve(xi, B_mod)

        Bg = np.zeros((n_states, 1))
        Bg[n_modes:, :] = np.linalg.solve(xi, G_mod)

        n_lag = 0
        if include_lag:
            n_lag = 2
            n_states += n_lag
            A_new = np.zeros((n_states, n_states))
            A_new[:2*n_modes, :2*n_modes] = A
            beta_vals = [0.05, 0.3]
            for j in range(n_lag):
                idx = 2 * n_modes + j
                A_new[idx, idx] = -beta_vals[j] * self.p.V_inf / (self.p.chord / 2)
            A = A_new
            Bu = np.vstack([Bu, np.zeros((n_lag, 1))])
            Bg = np.vstack([Bg, np.zeros((n_lag, 1))])

        C_out = np.zeros((2, n_states))
        L_e = self.p.span / self.n

        C_out[0, :n_modes] = phi_full[2, :n_modes] * (6 * self.p.EI / L_e**2)
        C_out[0, :n_modes] += phi_full[3, :n_modes] * (4 * self.p.EI / L_e)
        tip_dof = -2
        C_out[1, :n_modes] = phi_full[tip_dof, :n_modes]

        ss = {
            'A': A, 'Bu': Bu, 'Bg': Bg, 'C': C_out,
            'D': np.zeros((2, 1)),
            'omega': omega, 'freq_hz': freq_hz,
            'phi': phi, 'n_modes': n_modes,
            'n_states': n_states, 'n_lag': n_lag,
            'n_outputs': 2, 'n_inputs': 1
        }
        return ss

    def compute_gramians(self, ss: dict) -> dict:
        A = ss['A']
        Bu = ss['Bu']
        C = ss['C']
        try:
            Wc = solve_continuous_lyapunov(A, -Bu @ Bu.T)
            Wo = solve_continuous_lyapunov(A.T, -C.T @ C)
        except Exception:
            Wc = np.eye(A.shape[0])
            Wo = np.eye(A.shape[0])
        hsv = np.sqrt(np.abs(np.linalg.eigvalsh(Wc @ Wo)))
        hsv = np.sort(hsv)[::-1]
        return {'Wc': Wc, 'Wo': Wo, 'hsv': hsv}
