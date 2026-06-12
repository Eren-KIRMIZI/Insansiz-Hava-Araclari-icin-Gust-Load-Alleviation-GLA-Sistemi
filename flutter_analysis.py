import numpy as np
from typing import Tuple
from aeroelastic_model import WingParams, AeroelasticModel


def compute_vg_diagram(model: AeroelasticModel, V_range: np.ndarray,
                       n_modes: int = 4) -> Tuple[np.ndarray, np.ndarray, float]:
    n_V = len(V_range)
    n_eig = 2 * n_modes
    damping = np.zeros((n_V, n_eig))
    frequencies = np.zeros((n_V, n_eig))
    v_flutter = np.inf

    base_params = WingParams(
        n_elem=model.p.n_elem, span=model.p.span,
        chord=model.p.chord, EI=model.p.EI, GJ=model.p.GJ,
        EA=model.p.EA, m_per_length=model.p.m_per_length,
        I_moi=model.p.I_moi, c_damping=model.p.c_damping,
        rho=model.p.rho, V_inf=20.0, a0=model.p.a0,
        aoa_trim=model.p.aoa_trim,
        flap_eff=model.p.flap_eff, flap_chord_ratio=model.p.flap_chord_ratio
    )

    for i, V in enumerate(V_range):
        params_i = WingParams(
            n_elem=base_params.n_elem, span=base_params.span,
            chord=base_params.chord, EI=base_params.EI, GJ=base_params.GJ,
            EA=base_params.EA, m_per_length=base_params.m_per_length,
            I_moi=base_params.I_moi, c_damping=base_params.c_damping,
            rho=base_params.rho, V_inf=V, a0=base_params.a0,
            aoa_trim=base_params.aoa_trim,
            flap_eff=base_params.flap_eff,
            flap_chord_ratio=base_params.flap_chord_ratio
        )
        model_i = AeroelasticModel(params_i)
        ss = model_i.build_state_space(n_modes=n_modes, include_lag=False)

        eigvals = np.linalg.eigvals(ss['A'])
        sorted_idx = np.argsort(np.abs(np.imag(eigvals)))[:n_eig]
        eigvals = eigvals[sorted_idx]

        for j, ev in enumerate(eigvals):
            sigma = -np.real(ev)
            omega = np.abs(np.imag(ev))
            damping[i, j] = sigma / np.sqrt(sigma**2 + omega**2) if (sigma**2 + omega**2) > 1e-15 else 0
            frequencies[i, j] = omega / (2 * np.pi)

        if np.min(damping[i, :]) < 0 and v_flutter == np.inf:
            v_flutter = V

    return damping[:, :n_eig//2], frequencies[:, :n_eig//2], v_flutter


def compute_flutter_margin(ss_open: dict, ss_closed: dict) -> dict:
    e_open = np.linalg.eigvals(ss_open['A'])
    e_closed = np.linalg.eigvals(ss_closed['A_closed'])
    def damping_ratio(ev):
        sigma = -np.real(ev)
        omega = np.abs(np.imag(ev))
        if sigma**2 + omega**2 < 1e-15:
            return 0.0
        return sigma / np.sqrt(sigma**2 + omega**2)
    try:
        damping_open = np.array([damping_ratio(ev) for ev in e_open])
        damping_closed = np.array([damping_ratio(ev) for ev in e_closed])
        freq_open = np.abs(np.imag(e_open)) / (2 * np.pi)
        freq_closed = np.abs(np.imag(e_closed)) / (2 * np.pi)
        d_open = np.min(damping_open)
        d_closed = np.min(damping_closed)
        imp = ((d_closed - d_open) / abs(d_open) * 100) if abs(d_open) > 1e-10 else 0
    except Exception:
        damping_open = np.zeros_like(np.real(e_open))
        damping_closed = np.zeros_like(np.real(e_closed))
        freq_open = np.zeros_like(np.real(e_open))
        freq_closed = np.zeros_like(np.real(e_closed))
        d_open = 0; d_closed = 0; imp = 0
    return {
        'damping_open': damping_open,
        'damping_closed': damping_closed,
        'freq_open': freq_open,
        'freq_closed': freq_closed,
        'min_damping_open': float(d_open),
        'min_damping_closed': float(d_closed),
        'flutter_margin_improvement': float(imp)
    }
