import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from scipy import signal
import aeroelastic_model as am
import gust_models as gm
import simulation as sim
import controller as ctrl


plt.rcParams.update({
    'figure.dpi': 150,
    'font.size': 10,
    'axes.grid': True,
    'grid.alpha': 0.3,
    'lines.linewidth': 1.5
})


def plot_gust_profiles(t: np.ndarray, w_discrete: np.ndarray,
                       w_dryden: np.ndarray, w_vk: np.ndarray,
                       save_path: str = None):
    fig, axes = plt.subplots(3, 1, figsize=(10, 8), sharex=True)
    axes[0].plot(t, w_discrete, 'b-', label='1-Cosine Discrete Gust')
    axes[0].set_ylabel('w (m/s)'); axes[0].set_title('Gust Profiles')
    axes[0].legend(); axes[0].grid(True, alpha=0.3)

    axes[1].plot(t, w_dryden, 'r-', alpha=0.7, label='Dryden Turbulence')
    axes[1].set_ylabel('w (m/s)'); axes[1].legend(); axes[1].grid(True, alpha=0.3)

    axes[2].plot(t, w_vk, 'g-', alpha=0.7, label='Von Kármán Turbulence')
    axes[2].set_xlabel('Time (s)'); axes[2].set_ylabel('w (m/s)')
    axes[2].legend(); axes[2].grid(True, alpha=0.3)

    plt.tight_layout()
    if save_path:
        fig.savefig(save_path, bbox_inches='tight')
    plt.close(fig)


def plot_gust_psd(t: np.ndarray, w_dryden: np.ndarray, save_path: str = None):
    fig, ax = plt.subplots(figsize=(8, 5))
    f, psd = signal.welch(w_dryden, fs=1/(t[1]-t[0]), nperseg=256)
    ax.loglog(f, psd, 'b-', label='Simulated PSD')
    ax.set_xlabel('Frequency (Hz)'); ax.set_ylabel('PSD (m²/s³)')
    ax.set_title('Dryden Turbulence Power Spectral Density')
    ax.legend(); ax.grid(True, alpha=0.3, which='both')
    plt.tight_layout()
    if save_path:
        fig.savefig(save_path, bbox_inches='tight')
    plt.close(fig)


def plot_comparison(result: sim.SimulationResult, save_path: str = None):
    fig, axes = plt.subplots(3, 1, figsize=(10, 10), sharex=True)

    axes[0].plot(result.t, result.y_open[:, 0], 'r-', alpha=0.7, label='Open Loop')
    axes[0].plot(result.t, result.y_closed[:, 0], 'b-', alpha=0.7, label='Closed Loop (GLA)')
    axes[0].set_ylabel('Root Bending Moment (Nm)')
    axes[0].set_title('Gust Load Alleviation Performance')
    axes[0].legend(); axes[0].grid(True, alpha=0.3)

    axes[1].plot(result.t, result.y_open[:, 1], 'r-', alpha=0.7, label='Open Loop')
    axes[1].plot(result.t, result.y_closed[:, 1], 'b-', alpha=0.7, label='Closed Loop (GLA)')
    axes[1].set_ylabel('Tip Displacement (m)')
    axes[1].legend(); axes[1].grid(True, alpha=0.3)

    axes[2].plot(result.t, result.w_gust, 'g-', alpha=0.5, label='Gust Input')
    axes[2].plot(result.t, result.u_control * 180 / np.pi, 'm-', label='Control Deflection (°)')
    axes[2].set_xlabel('Time (s)')
    axes[2].set_ylabel('Gust / Control')
    axes[2].legend(); axes[2].grid(True, alpha=0.3)

    plt.tight_layout()
    if save_path:
        fig.savefig(save_path, bbox_inches='tight')
    plt.close(fig)


def plot_modal_analysis(omega: np.ndarray, freq_hz: np.ndarray,
                        phi: np.ndarray, n_elem: int, save_path: str = None):
    n_modes = len(omega)
    span = np.linspace(0, 1.5, n_elem + 1)
    fig, axes = plt.subplots(n_modes, 1, figsize=(8, 2 * n_modes))
    if n_modes == 1:
        axes = [axes]
    for i in range(n_modes):
        mode_shape = phi[::2, i]
        if len(mode_shape) > len(span):
            mode_shape = mode_shape[:len(span)]
        axes[i].plot(span, mode_shape / np.max(np.abs(mode_shape)), 'b-o', markersize=3)
        axes[i].set_ylabel(f'Mode {i+1}')
        axes[i].set_title(f'Mode {i+1}: {freq_hz[i]:.2f} Hz')
        axes[i].grid(True, alpha=0.3)
    axes[-1].set_xlabel('Span (m)')
    plt.tight_layout()
    if save_path:
        fig.savefig(save_path, bbox_inches='tight')
    plt.close(fig)


def plot_control_bode(K: np.ndarray, ss: dict, save_path: str = None):
    A = ss['A']; B = ss['Bu']
    omega = np.logspace(-1, 2, 1000)
    mag = np.zeros(len(omega))
    phase = np.zeros(len(omega))
    for i, w in enumerate(omega):
        s = 1j * w
        H = K @ np.linalg.inv(s * np.eye(A.shape[0]) - A) @ B
        mag[i] = 20 * np.log10(np.abs(H)[0, 0] + 1e-15)
        phase[i] = np.angle(H[0, 0], deg=True)

    fig, axes = plt.subplots(2, 1, figsize=(8, 6), sharex=True)
    axes[0].semilogx(omega, mag)
    axes[0].axhline(y=0, color='gray', linestyle='--', alpha=0.5)
    axes[0].set_ylabel('Magnitude (dB)')
    axes[0].set_title('Controller Bode Diagram')
    axes[0].grid(True, alpha=0.3, which='both')

    axes[1].semilogx(omega, phase)
    axes[1].axhline(y=-180, color='gray', linestyle='--', alpha=0.5)
    axes[1].set_xlabel('Frequency (rad/s)')
    axes[1].set_ylabel('Phase (°)')
    axes[1].grid(True, alpha=0.3, which='both')

    plt.tight_layout()
    if save_path:
        fig.savefig(save_path, bbox_inches='tight')
    plt.close(fig)


def plot_monte_carlo(stats: dict, save_path: str = None):
    metrics_names = [k for k in stats.keys() if 'reduction' in k or 'saving' in k]
    n_metrics = len(metrics_names)
    fig, axes = plt.subplots(1, n_metrics, figsize=(4 * n_metrics, 4))
    if n_metrics == 1:
        axes = [axes]
    for ax, name in zip(axes, metrics_names):
        s = stats[name]
        labels = ['Mean', 'Min', 'Max']
        values = [s['mean'], s['min'], s['max']]
        bars = ax.bar(labels, values, color=['blue', 'red', 'orange'], alpha=0.7)
        ax.set_ylabel('%')
        ax.set_title(name.replace('_', ' ').title())
        ax.grid(True, alpha=0.3, axis='y')
        for bar, val in zip(bars, values):
            ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.5,
                    f'{val:.1f}', ha='center', fontsize=8)
    plt.tight_layout()
    if save_path:
        fig.savefig(save_path, bbox_inches='tight')
    plt.close(fig)


def plot_vg_diagram(velocities: np.ndarray, damping: np.ndarray,
                    frequencies: np.ndarray, save_path: str = None):
    fig, axes = plt.subplots(2, 1, figsize=(8, 8), sharex=True)
    for i in range(damping.shape[1]):
        axes[0].plot(velocities, damping[:, i], label=f'Mode {i+1}')
    axes[0].axhline(y=0, color='k', linestyle='--', alpha=0.5)
    axes[0].set_ylabel('Damping Ratio ζ')
    axes[0].set_title('V-g Diagram')
    axes[0].legend(); axes[0].grid(True, alpha=0.3)

    for i in range(frequencies.shape[1]):
        axes[1].plot(velocities, frequencies[:, i], label=f'Mode {i+1}')
    axes[1].set_xlabel('Velocity (m/s)')
    axes[1].set_ylabel('Frequency (Hz)')
    axes[1].set_title('V-ω Diagram')
    axes[1].legend(); axes[1].grid(True, alpha=0.3)

    plt.tight_layout()
    if save_path:
        fig.savefig(save_path, bbox_inches='tight')
    plt.close(fig)


def plot_metrics_radar(metrics: dict, save_path: str = None):
    keys = ['peak_moment_reduction_pct', 'peak_disp_reduction_pct',
            'rms_moment_reduction_pct', 'rms_acceleration_reduction_pct',
            'vibration_energy_reduction_pct']
    values = [metrics.get(k, 0) for k in keys]
    n = len(keys)
    angles = np.linspace(0, 2 * np.pi, n, endpoint=False).tolist()
    values += values[:1]
    angles += angles[:1]

    fig, ax = plt.subplots(figsize=(6, 6), subplot_kw=dict(polar=True))
    ax.fill(angles, values, alpha=0.25)
    ax.plot(angles, values, linewidth=2)
    ax.set_xticks(angles[:-1])
    ax.set_xticklabels([k.replace('_', '\n').title() for k in keys], fontsize=7)
    ax.set_ylim(0, max(values) * 1.2 if max(values) > 0 else 100)
    ax.set_title('GLA Performance Metrics', fontsize=12, pad=20)
    plt.tight_layout()
    if save_path:
        fig.savefig(save_path, bbox_inches='tight')
    plt.close(fig)
