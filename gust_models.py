import numpy as np
from scipy import signal
from typing import Tuple, Callable


def discrete_1cos_gust(t: float, Uds: float = 5.0, L_g: float = 10.0, V: float = 20.0) -> float:
    T_g = 2.0 * L_g / V
    if t <= T_g:
        return 0.5 * Uds * (1.0 - np.cos(np.pi * V * t / L_g))
    return 0.0


def discrete_1cos_vector(t_array: np.ndarray, Uds: float = 5.0, L_g: float = 10.0,
                         V: float = 20.0) -> np.ndarray:
    return np.array([discrete_1cos_gust(t, Uds, L_g, V) for t in t_array])


def gust_penetration_series(t: float, n_strips: int, span: float, V: float,
                            Uds: float = 5.0, L_g: float = 10.0) -> np.ndarray:
    dy = span / n_strips
    w = np.zeros(n_strips)
    for i in range(n_strips):
        y_i = (i + 0.5) * dy
        t_delay = y_i / (V * 0.5)
        w[i] = discrete_1cos_gust(max(0, t - t_delay), Uds, L_g, V)
    return w


def dryden_turbulence_generator(T: float = 10.0, dt: float = 0.005, V: float = 20.0,
                                sigma: float = 1.0, L: float = 100.0,
                                seed: int = 42) -> Tuple[np.ndarray, np.ndarray]:
    rng = np.random.RandomState(seed)
    num_s = int(T / dt)
    t = np.arange(num_s) * dt
    white_noise = rng.randn(num_s) * np.sqrt(1.0 / dt)
    s = 2 * np.pi * 1j * np.fft.fftfreq(num_s, d=dt)
    s[0] = 1e-10
    H_dryden = sigma * np.sqrt(2 * L / (np.pi * V)) * (1 + np.sqrt(3) * L / V * s) / (1 + L / V * s)**2
    W_fft = np.fft.fft(white_noise)
    gust_fft = W_fft * H_dryden[:len(W_fft)] if len(H_dryden) >= len(W_fft) else W_fft * H_dryden
    gust = np.real(np.fft.ifft(gust_fft))
    return t, gust


def von_karman_turbulence_generator(T: float = 10.0, dt: float = 0.005, V: float = 20.0,
                                    sigma: float = 1.0, L: float = 100.0,
                                    seed: int = 42) -> Tuple[np.ndarray, np.ndarray]:
    rng = np.random.RandomState(seed)
    num_s = int(T / dt)
    t = np.arange(num_s) * dt
    white_noise = rng.randn(num_s) * np.sqrt(1.0 / dt)
    s = 2 * np.pi * 1j * np.fft.fftfreq(num_s, d=dt)
    s[0] = 1e-10
    omega_bar = L * s / V
    H_vk = sigma * np.sqrt(2 * L / (np.pi * V)) / (1 + (1.339 * omega_bar)**2)**(5/6)
    H_vk[0] = 0.0
    W_fft = np.fft.fft(white_noise)
    min_len = min(len(W_fft), len(H_vk))
    gust_fft = W_fft[:min_len] * H_vk[:min_len]
    gust = np.real(np.fft.ifft(gust_fft, n=num_s))
    return t, gust


def compute_psd(t: np.ndarray, w: np.ndarray, fs: float = 200.0) -> Tuple[np.ndarray, np.ndarray]:
    f, psd = signal.welch(w, fs=fs, nperseg=min(256, len(w)), scaling='density')
    return f, psd


def von_karman_psd_analytic(f: np.ndarray, sigma: float = 1.0, L: float = 100.0, V: float = 20.0) -> np.ndarray:
    omega = 2 * np.pi * f
    return 4 * sigma**2 * L / V / (1 + (1.339 * L * omega / V)**2)**(5/6)


def multi_gust_schedule(t_array: np.ndarray, gust_type: str = '1cos',
                        params: dict = None) -> np.ndarray:
    if params is None:
        params = {}
    if gust_type == '1cos':
        Uds = params.get('Uds', 5.0)
        L_g = params.get('L_g', 10.0)
        V = params.get('V', 20.0)
        return discrete_1cos_vector(t_array, Uds, L_g, V)
    elif gust_type == 'dryden':
        T = t_array[-1] if len(t_array) > 1 else 10.0
        dt = t_array[1] - t_array[0] if len(t_array) > 1 else 0.005
        V = params.get('V', 20.0)
        sigma = params.get('sigma', 1.0)
        L = params.get('L', 100.0)
        _, w = dryden_turbulence_generator(T, dt, V, sigma, L)
        if len(w) >= len(t_array):
            return w[:len(t_array)]
        return np.pad(w, (0, len(t_array) - len(w)), 'constant')
    elif gust_type == 'vonkarman':
        T = t_array[-1] if len(t_array) > 1 else 10.0
        dt = t_array[1] - t_array[0] if len(t_array) > 1 else 0.005
        V = params.get('V', 20.0)
        sigma = params.get('sigma', 1.0)
        L = params.get('L', 100.0)
        _, w = von_karman_turbulence_generator(T, dt, V, sigma, L)
        if len(w) >= len(t_array):
            return w[:len(t_array)]
        return np.pad(w, (0, len(t_array) - len(w)), 'constant')
    return np.zeros_like(t_array)
