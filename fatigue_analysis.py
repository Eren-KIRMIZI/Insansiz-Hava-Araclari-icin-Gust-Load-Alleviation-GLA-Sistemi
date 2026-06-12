import numpy as np
from scipy import signal
from typing import Tuple


def rainflow_counting(series: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    series = series - np.mean(series)
    n = len(series)
    extrema = []
    extrema.append((0, series[0]))
    for i in range(1, n - 1):
        if (series[i] >= series[i - 1] and series[i] > series[i + 1]) or \
           (series[i] <= series[i - 1] and series[i] < series[i + 1]):
            extrema.append((i, series[i]))
    extrema.append((n - 1, series[n - 1]))
    if len(extrema) < 3:
        return np.array([]), np.array([])
    cycles = []
    points = list(extrema)
    i = 0
    while i < len(points) - 2:
        y1 = points[i][1]
        y2 = points[i + 1][1]
        y3 = points[i + 2][1]
        if abs(y3 - y2) >= abs(y2 - y1):
            cycles.append((y1, y2))
            points.pop(i + 1)
            i = max(0, i - 1)
        else:
            i += 1
    for j in range(len(points) - 1):
        cycles.append((points[j][1], points[j + 1][1]))
    cycles = np.array(cycles)
    if len(cycles) == 0:
        return np.array([]), np.array([])
    ranges = np.abs(cycles[:, 0] - cycles[:, 1])
    means = (cycles[:, 0] + cycles[:, 1]) / 2
    return ranges, means


def equivalent_damage(moment_series: np.ndarray, m_exp: float = 3.0) -> float:
    if len(moment_series) < 10:
        return 0.0
    moment_ac = moment_series - np.mean(moment_series)
    sos = signal.butter(2, 0.5, btype='high', fs=200, output='sos')
    moment_hp = signal.sosfilt(sos, moment_ac)
    ranges, means = rainflow_counting(moment_hp)
    if len(ranges) == 0:
        return 0.0
    damage = np.sum(ranges**m_exp)
    return damage


def fatigue_damage_reduction(open_series: np.ndarray,
                             closed_series: np.ndarray) -> dict:
    d_open = equivalent_damage(open_series)
    d_closed = equivalent_damage(closed_series)
    reduction = (d_open - d_closed) / (d_open + 1e-15) * 100
    return {
        'damage_open': float(d_open),
        'damage_closed': float(d_closed),
        'damage_reduction_pct': float(np.clip(reduction, -200, 100))
    }
