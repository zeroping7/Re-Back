#!/usr/bin/env python3
"""AUD-13: genera los bucles de motor (4 eléctricos + 4 nitro) → src/assets/engines.bin + engines.json

Cada sonido base se renderiza en régimen estacionario y de forma CIRCULAR (convolución y filtros en
frecuencia, osciladores con nº entero de ciclos), así que cada bucle empalma sin clic. Por base:
7 regímenes (vueltas) × 2 cargas (gas / sin gas). Formato: μ-law 8 bit mono a 24 kHz.
Uso: python3 tools/engines/make_engines.py   (requiere numpy y scipy)
"""
import json, os, sys
import numpy as np
from scipy import signal

SR = 24000
TWO_PI = 2 * np.pi
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "..", "src", "assets")

# ---------------- utilidades circulares ----------------
def circ_filter(x, kind, f, order=2):
    sos = signal.butter(order, f, btype=kind, fs=SR, output="sos")
    n = len(x)
    fr = np.fft.rfftfreq(n, 1 / SR)
    _, h = signal.sosfreqz(sos, worN=fr, fs=SR)
    return np.fft.irfft(np.fft.rfft(x) * np.abs(h), n)

def circ_conv(imp, ir):
    n = len(imp)
    return np.fft.irfft(np.fft.rfft(imp) * np.fft.rfft(ir, n), n)

def place(pos, amps, n):
    imp = np.zeros(n)
    i = np.floor(pos).astype(int)
    fr = pos - i
    np.add.at(imp, i % n, amps * (1 - fr))
    np.add.at(imp, (i + 1) % n, amps * fr)
    return imp

def tone(n, cycles, rng, harmonics):
    """Suma de armónicos con nº entero de ciclos (periódica en n muestras)."""
    tt = np.arange(n) / n
    y = np.zeros(n)
    for k, a in enumerate(harmonics, start=1):
        c = cycles * k
        if c * SR / n > 0.45 * SR:
            continue
        mask = float(np.clip((0.45 * SR - c * SR / n) / 1500.0, 0, 1))
        y += a * mask * np.sin(TWO_PI * (c * tt + rng.uniform(0, 1)))
    return y

def make_ir(modes, crack, thump_amp, thump_f, rng, scale=1.0, n=1100, crack_hi=9000):
    tt = np.arange(n) / SR
    ir = np.zeros(n)
    nz = rng.standard_normal(n) * np.exp(-tt / 0.00035)
    nz = signal.sosfilt(signal.butter(2, [1200, min(crack_hi, 0.45 * SR)], btype="bandpass", fs=SR, output="sos"), nz)
    ir += crack * nz
    for f, dec, a in modes:
        f2 = f * scale * (1 + rng.normal(0, 0.012))
        if f2 > 0.45 * SR:
            continue
        ir += a * np.sin(TWO_PI * f2 * tt + rng.uniform(0, 1.2)) * np.exp(-tt / dec)
    ir += thump_amp * np.sin(TWO_PI * thump_f * scale * tt) * np.exp(-tt / 0.005)
    ir *= 1 - np.exp(-tt / 0.00006)
    return ir

def finish(y, hp, rms_target=0.16):
    n = len(y)
    y = circ_filter(y, "highpass", hp)
    y = y + 0.22 * np.roll(y, int(0.0034 * SR)) + 0.10 * np.roll(y, int(0.0092 * SR))   # suelo
    y = y / (np.max(np.abs(y)) + 1e-9)
    y = np.tanh(1.6 * y)
    y = y - np.mean(y)
    y = y * (rms_target / (np.sqrt(np.mean(y ** 2)) + 1e-9))
    return np.clip(y, -0.98, 0.98)

# ---------------- NITRO ----------------
NITRO = {
    "n1": dict(rpm_max=24000, idle=0.135, irregular=1.0,
               modes=[(950, 0.0042, 1.0), (1950, 0.0036, 0.8), (3300, 0.003, 0.5), (5200, 0.0024, 0.3), (7400, 0.002, 0.15)],
               thump=1.1, thump_f=150, scale=1.0, intake=0.9, mech=0.35, gear_hz=2300, gear_amp=0.05, hp=90),
    "n2": dict(rpm_max=33000, idle=0.105, irregular=0.7,
               modes=[(1200, 0.0034, 1.0), (2500, 0.003, 0.9), (4100, 0.0026, 0.6), (6100, 0.002, 0.4), (8300, 0.0016, 0.2)],
               thump=0.7, thump_f=190, scale=1.18, intake=0.7, mech=0.25, gear_hz=3200, gear_amp=0.04, hp=140),
    "n3": dict(rpm_max=19500, idle=0.17, irregular=1.35,
               modes=[(700, 0.0055, 1.0), (1500, 0.0045, 0.8), (2600, 0.0035, 0.5), (4200, 0.0026, 0.25), (6000, 0.002, 0.1)],
               thump=1.6, thump_f=115, scale=0.84, intake=1.0, mech=0.5, gear_hz=1700, gear_amp=0.07, hp=70),
    "n4": dict(rpm_max=38000, idle=0.095, irregular=0.45,
               modes=[(1500, 0.0038, 1.0), (3000, 0.0034, 1.0), (4500, 0.003, 0.7), (6600, 0.0024, 0.45), (9000, 0.0018, 0.25)],
               thump=0.5, thump_f=210, scale=1.32, intake=0.55, mech=0.2, gear_hz=3800, gear_amp=0.035, hp=170),
}

def nitro_layers(p):
    """Regímenes (fracción de vueltas máximas): del ralentí al tope, reparto geométrico (razón ≈ 1,4 entre vecinos)."""
    i = p["idle"]
    return [i * (1.0 / i) ** (k / 6.0) for k in range(7)]

def render_nitro(p, R, th, ls, seed):
    rng = np.random.default_rng(seed)
    n = int(round(ls * SR))
    ls = n / SR
    K = max(2, int(round(R * p["rpm_max"] / 60.0 * ls)))
    R_act = K / ls * 60.0 / p["rpm_max"]
    period = n / K
    pos = (np.arange(K) + rng.uniform(0, 1)) * period
    sev = p["irregular"] * np.clip(1 - (R_act - p["idle"]) / 0.30, 0, 1) * (1 - 0.65 * th)
    amp = (0.55 + 0.45 * R_act) * (1 + rng.normal(0, 0.04 + 0.25 * sev, K))
    weak = rng.random(K) < sev * 0.45
    amp[weak] *= rng.uniform(0.15, 0.5, weak.sum())
    pos = pos + rng.normal(0, (0.006 + 0.10 * sev) * period, K)
    which = rng.integers(0, 3, K)
    irs_h = [make_ir(p["modes"], 0.30, p["thump"], p["thump_f"], np.random.default_rng(seed + 7), p["scale"] * (1 + 0.007 * (k - 1))) for k in range(3)]
    soft = [(f, d * 1.1, a * s) for (f, d, a), s in zip(p["modes"], [1.0, 0.35, 0.12, 0.04, 0.02])]
    irs_s = [make_ir(soft, 0.05, p["thump"] * 1.5, p["thump_f"], np.random.default_rng(seed + 8), p["scale"] * (1 + 0.007 * (k - 1)), crack_hi=3500) for k in range(3)]
    wh, ws = th ** 0.8, 1 - 0.7 * th
    y = np.zeros(n)
    for k in range(3):
        m = which == k
        y += circ_conv(place(pos[m], amp[m] * wh, n), irs_h[k])
        y += 0.8 * circ_conv(place(pos[m], amp[m] * ws, n), irs_s[k])
    tt = np.arange(n) / n
    intake = circ_filter(rng.standard_normal(n), "bandpass", [600, 3500]) * (1 + 0.5 * np.sin(TWO_PI * K * tt))
    y += intake * p["intake"] * (0.10 + 0.90 * th * R_act ** 1.2) * 1.2
    mech = circ_conv(place(np.arange(K) * period + rng.uniform(0, period), 0.5 * rng.uniform(0.6, 1.2, K), n),
                     make_ir([(4200, 0.0008, 1.0)], 0.4, 0, 100, rng, n=600))
    y += mech * p["mech"] * (0.3 + 0.7 * R_act)
    gc = max(1, int(round(R_act * p["gear_hz"] * ls)))
    y += tone(n, gc, rng, [1.0, 0.4, 0.15]) * p["gear_amp"] * R_act ** 1.2
    y = y + 0.35 * circ_filter(y, "bandpass", [800, 1400]) + 0.25 * circ_filter(y, "bandpass", [2400, 3600])
    return finish(y, p["hp"]), R_act

# ---------------- ELÉCTRICO ----------------
ELEC = {
    "e1": dict(type="brushless", rpm_max=36000, k=6, comm=1.0, hum=0.8, gear_ratio=4.2, gear_amp=0.12, reduction=3.2, pwm=8200, air=0.7, rumble=0.6, hp=150),
    "e2": dict(type="brushless", rpm_max=24000, k=9, comm=1.2, hum=1.3, gear_ratio=5.5, gear_amp=0.16, reduction=2.7, pwm=6800, air=1.0, rumble=1.2, hp=100),
    "e3": dict(type="brushed", rpm_max=20000, segments=6, comm=1.0, spark=1.0, hum=1.0, gear_ratio=5.0, gear_amp=0.20, reduction=3.5, pwm=7500, air=0.6, rumble=1.0, hp=110),
    "e4": dict(type="brushed", rpm_max=9500, segments=6, comm=1.1, spark=0.6, hum=1.6, gear_ratio=9.0, gear_amp=0.30, reduction=5.5, pwm=5600, air=0.4, rumble=1.8, hp=80),
}
ELEC_LAYERS = [0.07, 0.11, 0.17, 0.26, 0.40, 0.62, 1.0]

def render_electric(p, R, pos, ls, seed):
    rng = np.random.default_rng(seed)
    n = int(round(ls * SR))
    ls = n / SR
    M = max(1, int(round(R * p["rpm_max"] / 60.0 * ls)))       # ciclos del rotor por bucle
    R_act = M / ls * 60.0 / p["rpm_max"]
    r = R_act
    load = 0.8 * pos
    tt = np.arange(n) / n
    y = np.zeros(n)
    y += tone(n, M, rng, [1, 0.6, 0.4, 0.25, 0.15, 0.1]) * p["hum"] * (0.03 + 0.07 * load)
    if p["type"] == "brushless":
        wob = 1 + 0.30 * np.sin(TWO_PI * (M * tt + 0.08))
        y += tone(n, M * p["k"], rng, [1.0, 0.35, 0.14]) * wob * p["comm"] * (0.06 + 0.24 * load) * r ** 0.5
    else:
        cnt = M * p["segments"]
        per = n / cnt
        ps = (np.arange(cnt) + rng.uniform(0, 1)) * per + rng.normal(0, 0.018 * per, cnt)
        a = (0.6 + 0.4 * load) * (1 + rng.normal(0, 0.12, cnt)) * (0.3 + 0.7 * r)
        ir_b = make_ir([(2400, 0.0010, 1.0), (4300, 0.0006, 0.6), (900, 0.002, 0.5)], 0.15, 0.0, 100, rng, n=500)
        y += circ_conv(place(ps, a, n), ir_b) * p["comm"] * 0.5
        nsp = int(ls * (60 + 500 * p["spark"]))
        keep = rng.random(nsp) < load * r
        tsp = rng.uniform(0, n, nsp)[keep]
        ir_s = make_ir([(5200, 0.0004, 1.0)], 1.0, 0.0, 100, rng, n=250)
        y += circ_conv(place(tsp, rng.uniform(0.3, 1.4, len(tsp)), n), ir_s) * 0.14 * p["spark"]
    gc = max(1, int(round(M * p["gear_ratio"])))
    red = max(1, int(round(M / p["reduction"])))
    y += tone(n, gc, rng, [1.0, 0.5, 0.2]) * p["gear_amp"] * (0.3 + 0.7 * r) * (0.55 + 0.45 * load) * (1 + 0.25 * np.sin(TWO_PI * (red * tt + 0.1)))
    pc = max(1, int(round(p["pwm"] * ls)))
    y += np.sin(TWO_PI * (pc * tt + 0.3)) * 0.012 * pos * (1 - 0.5 * r)
    y += circ_filter(rng.standard_normal(n), "bandpass", [1200, 7000]) * (0.008 + 0.06 * r ** 2 * (0.5 + load)) * p["air"]
    y += circ_filter(rng.standard_normal(n), "lowpass", 500) * r * 0.05 * p["rumble"]
    y = y + 0.4 * circ_filter(y, "bandpass", [700, 1300]) + 0.3 * circ_filter(y, "bandpass", [2200, 3300])
    return finish(y, p["hp"]), R_act

# ---------------- empaquetado μ-law ----------------
MU = 255.0
def mulaw(x):
    y = np.sign(x) * np.log1p(MU * np.abs(x)) / np.log1p(MU)
    return np.clip(np.round((y + 1) / 2 * 255), 0, 255).astype(np.uint8)

def main():
    os.makedirs(OUT, exist_ok=True)
    blob = bytearray()
    meta = {"sr": SR, "mu": MU, "bases": {}}
    seed = 1000
    for key in ["e1", "e2", "e3", "e4", "n1", "n2", "n3", "n4"]:
        nitro = key[0] == "n"
        p = (NITRO if nitro else ELEC)[key]
        layers = nitro_layers(p) if nitro else ELEC_LAYERS
        loops = []
        for load in ("on", "off"):
            for li, R in enumerate(layers):
                seed += 1
                if nitro:
                    ls = 2.0 if li == 0 else 1.5 if li == 1 else 1.0
                    y, Ra = render_nitro(p, R, 1.0 if load == "on" else 0.0, ls, seed)
                else:
                    y, Ra = render_electric(p, R, 1.0 if load == "on" else 0.0, 1.0, seed)
                q = mulaw(y)
                loops.append({"load": load, "layer": li, "r": round(float(Ra), 5), "off": len(blob), "len": len(q)})
                blob += q.tobytes()
        meta["bases"][key] = {"type": "nitro" if nitro else "electric", "idle": p.get("idle", 0.0), "loops": loops}
        print(key, "ok", [round(l["r"], 3) for l in loops[:7]], flush=True)
    with open(os.path.join(OUT, "engines.bin"), "wb") as f:
        f.write(blob)
    with open(os.path.join(OUT, "engines.json"), "w") as f:
        json.dump(meta, f, separators=(",", ":"))
    print("engines.bin", len(blob) // 1024, "KB")

if __name__ == "__main__":
    main()
