#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Сборка дизайн-системы Portfolio Pulse (слой v39).

Что делает:
 1) подключает вшитый вариативный шрифт Inter (кириллица + латиница, файлы в assets/fonts);
 2) выпускает слой токенов с исправленным контрастом (WCAG AA) вместо 427 безымянных цветов;
 3) поднимает типографический порог: ни один размер текста не остаётся меньше 12 px;
 4) сводит скругления, тени и z-index к небольшому набору значений;
 5) включает табличные цифры для чисел и дат.

Скрипт идемпотентен: результат пишется в assets/pulse-system-v39.css.
Запуск: python3 tools/build_system_css.py
"""
import os, re, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")
SOURCES = ["app-v24-efaffe6e05.css", "workforce-v28.css", "ux-v31.css"]
OUT = os.path.join(ASSETS, "pulse-system-v39.css")

MIN_FONT_PX = 12.0            # типографический порог (ТЗ: не мельче 12-13 px)
RADIUS_ALLOWED = [0, 8, 12, 20, 999]
Z_ALLOWED = [1, 10, 100, 1000, 5000]


# ── цветовые утилиты ────────────────────────────────────────────────
def hex2rgb(h):
    h = h.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def rgb2hex(c):
    return "#%02x%02x%02x" % tuple(max(0, min(255, int(round(v)))) for v in c)


def lum(rgb):
    def f(v):
        v /= 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = (f(v) for v in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a, b):
    la, lb = lum(hex2rgb(a)), lum(hex2rgb(b))
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def darken_to(color, bg, target=4.6):
    """Затемняет цвет, сохраняя оттенок, пока контраст с фоном не достигнет цели."""
    rgb = list(hex2rgb(color))
    if contrast(color, bg) >= target:
        return color
    for k in range(1, 101):
        f = 1 - k / 100 * 0.85
        cand = rgb2hex([v * f for v in rgb])
        if contrast(cand, bg) >= target:
            return cand
    return "#000000"


def desaturate_ok(rgb):
    """Признак нейтрального серо-зелёного семейства: низкая насыщенность."""
    r, g, b = rgb
    mx, mn = max(rgb), min(rgb)
    return (mx - mn) <= 42 and mx <= 200


# ── парсер CSS ──────────────────────────────────────────────────────
def parse_rules(css):
    """Возвращает список (media_condition, selector, body)."""
    rules, i, n = [], 0, len(css)
    stack, buf = [], ""
    while i < n:
        ch = css[i]
        if ch == "{":
            head = buf.strip()
            buf = ""
            if head.startswith("@media") or head.startswith("@supports") or head.startswith("@container"):
                # сохраняем только условие, без ключевого слова: иначе вложенные
                # медиа-блоки склеятся в невалидный CSS
                cond = re.sub(r"^@(media|supports|container)\s*", "", head).strip()
                stack.append(cond)
                i += 1
                continue
            if head.startswith("@keyframes") or head.startswith("@-webkit-keyframes"):
                # пропускаем тело целиком
                depth, j = 1, i + 1
                while j < n and depth:
                    if css[j] == "{":
                        depth += 1
                    elif css[j] == "}":
                        depth -= 1
                    j += 1
                i = j
                continue
            j, depth = i + 1, 1
            while j < n and depth:
                if css[j] == "{":
                    depth += 1
                elif css[j] == "}":
                    depth -= 1
                j += 1
            rules.append((" and ".join(stack), head, css[i + 1:j - 1]))
            i = j
            continue
        if ch == "}":
            if stack:
                stack.pop()
            buf = ""
            i += 1
            continue
        buf += ch
        i += 1
    return rules


def num(v):
    try:
        return float(re.sub(r"[^0-9.\-]", "", v) or 0)
    except ValueError:
        return 0.0


def snap_radius(value):
    parts = [p.strip() for p in re.split(r"\s+", value.strip())]
    out = []
    for p in parts:
        m = re.match(r"(-?[\d.]+)px$", p)
        if not m:
            if p in ("0", "50%", "9999px"):
                out.append(p if p != "50%" else "999px")
                continue
            out.append(p)
            continue
        v = float(m.group(1))
        best = min(RADIUS_ALLOWED, key=lambda a: abs(a - v))
        if v <= 2:
            best = 0
        out.append("0" if best == 0 else f"{best}px")
    # короткая запись, если все одинаковые
    if len(set(out)) == 1:
        return out[0]
    return " ".join(out)


def snap_shadow(value):
    v = value.strip()
    if "inset" in v or "none" in v:
        return v
    blurs = [float(x) for x in re.findall(r"(\d+(?:\.\d+)?)px", v)]
    if not blurs:
        return v
    depth = max(blurs)
    return "var(--elev-1)" if depth < 30 else "var(--elev-2)"


# ── 1. шрифт ────────────────────────────────────────────────────────
def font_faces():
    faces, unicode_ranges = [], {}
    for f in sorted(os.listdir(os.path.join(ASSETS, "fonts"))):
        if not f.endswith(".woff2"):
            continue
        idx = int(re.search(r"-(\d+)\.woff2$", f).group(1))
        unicode_ranges[idx] = f
    # порядок и диапазоны фиксированы Google Fonts: 0-1 кириллица, 2-3 латиница
    ranges = {
        0: "U+0460-052F, U+1C80-1C8A, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F",
        1: "U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116",
        2: "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, "
           "U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, "
           "U+2C60-2C7F, U+A720-A7FF",
        3: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, "
           "U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
    }
    for idx, f in sorted(unicode_ranges.items()):
        faces.append(
            "@font-face{font-family:'InterPulse';font-style:normal;font-weight:100 900;"
            f"font-display:swap;src:url('./fonts/{f}') format('woff2');"
            f"unicode-range:{ranges[idx]};}}"
        )
    return "\n".join(faces)


# ── 2. токены ───────────────────────────────────────────────────────
def token_block():
    paper, canvas, softer = "#ffffff", "#f5f6f3", "#f0f2ef"

    bgs = [paper, canvas, softer]

    def ensure(color, target=4.6):
        """Тёмный вариант цвета, проходящий контраст на всех светлых фонах."""
        out = color
        while min(contrast(out, bg) for bg in bgs) < target:
            rgb = hex2rgb(out)
            out = rgb2hex([v * 0.97 for v in rgb])
            if out == "#000000":
                break
        return out

    ink900, ink700, ink600 = "#10231e", "#263b34", "#4c5b55"
    muted, faint = ensure("#5f706a"), ensure("#7b8a85")
    data_risk, data_warn, data_ok, data_info = ensure("#c7544c"), ensure("#b8892f"), ensure("#16836c"), ensure("#487a90")
    return f""":root{{
  /* ── фундамент: шрифт ───────────────────────────────────────── */
  --font-sans:'InterPulse','Inter','Manrope',-apple-system,'Segoe UI',Arial,sans-serif;
  --font-geist-sans:var(--font-sans);
  --font-display:var(--font-sans);
  --font-mono:'SFMono-Regular',Consolas,'Liberation Mono',monospace;

  /* ── чернила и бумага: 3 уровня вместо 47 оттенков ───────────── */
  --ink-950:{ink900};  --ink-900:{ink900};  --ink-800:{ink700};
  --ink-700:{ink700};  --ink-600:{ink600};  --ink-500:{muted};
  --ink-400:{faint};
  --color-text:{ink900};
  --color-text-muted:{muted};
  --color-text-faint:{faint};
  --v11-ink:{ink900};
  --v11-muted:{muted};
  --muted:{muted};

  /* ── цвет данных: только смысл, не украшение ─────────────────── */
  --data-ok:{data_ok};
  --data-warn:{data_warn};
  --data-risk:{data_risk};
  --data-info:{data_info};
  --green-600:{data_ok};
  --green-500:{data_ok};
  --amber-500:{data_warn};
  --amber-600:{data_warn};
  --red-500:{data_risk};
  --blue-500:{data_info};
  --v11-gold:{data_warn};
  --color-accent:{data_warn};
  --color-warning:{data_warn};
  --color-danger:{data_risk};
  --color-info:{data_info};

  /* ── бумага ──────────────────────────────────────────────────── */
  --surface:{paper};
  --color-surface:{paper};
  --canvas:{canvas};
  --color-bg:{canvas};
  --canvas-2:{softer};
  --color-surface-muted:{softer};
  --v11-paper:#fffefa;
  --v11-ivory:{canvas};
  --line:#dde3de;
  --line-soft:#eaeeea;
  --color-border:#dde3de;
  --v11-line:#dfe3dc;

  /* ── геометрия: 4 радиуса вместо 35 ──────────────────────────── */
  --radius-sm:8px;
  --radius-md:12px;
  --radius-lg:20px;
  --radius-pill:999px;

  /* ── высота: 2 тени вместо 98 ────────────────────────────────── */
  --elev-1:0 1px 2px rgba(6,35,29,.04), 0 8px 24px rgba(6,35,29,.05);
  --elev-2:0 24px 64px rgba(3,35,28,.16);
  --shadow-sm:var(--elev-1);
  --shadow-lg:var(--elev-2);
  --shadow-premium:var(--elev-1);
  --v11-shadow:var(--elev-1);

  /* ── слои: 5 именованных вместо 16 безымянных ────────────────── */
  --z-base:1;
  --z-sticky:10;
  --z-header:100;
  --z-overlay:1000;
  --z-modal:5000;

  /* ── типографическая шкала ───────────────────────────────────── */
  --text-caption:12px;
  --text-body:14.5px;
  --text-card-title:15px;
  --text-section:22px;
  --text-page:30px;
  --text-kpi:34px;
  --leading-tight:1.25;
  --leading-body:1.45;
}}"""


# ── 3-5. преобразования существующего CSS ───────────────────────────
def is_light(color):
    """Светлый цвет — вероятно текст на тёмном фоне; такой не трогаем."""
    return lum(hex2rgb(color)) > 0.45


def parse_color(v):
    v = v.strip()
    m = re.match(r"^#([0-9a-fA-F]{3,8})$", v)
    if m:
        h = m.group(1)
        if len(h) in (3, 6):
            return hex2rgb(h)
        return None
    m = re.match(r"^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$", v)
    if m:
        r, g, b = (int(m.group(i)) for i in (1, 2, 3))
        a = m.group(4)
        if a is not None and float(a) < 0.95:
            return None          # полупрозрачный — оставляем как есть
        return (r, g, b)
    return None


def norm_text_color(v):
    """Тёмный текст, не проходящий контраст на бумаге, затемняем с сохранением оттенка."""
    rgb = parse_color(v)
    if rgb is None:
        return None
    h = rgb2hex(rgb)
    l = lum(hex2rgb(h))
    bgs = ["#ffffff", "#f5f6f3", "#fffefa"]
    worst = min(contrast(h, b) for b in bgs)
    if worst >= 4.5:
        return None
    # светлый текст на тёмном фоне не трогаем: затемнять его нельзя.
    # Исключение — «светло-серый на светлом»: он не читается ни там, ни там.
    if l > 0.42 and l < 0.55 and worst < 3.0:
        pass
    elif l > 0.42:
        return None
    out = h
    for _ in range(140):
        out = rgb2hex([c * 0.97 for c in hex2rgb(out)])
        if min(contrast(out, b) for b in bgs) >= 4.6:
            break
    return out


def build_overrides():
    typo, geometry, shadow, zfix = [], [], [], []
    stats = {"size_rules": 0, "radius_rules": 0, "shadow_rules": 0, "z_rules": 0,
             "color_rules": 0, "important": 0, "icon_stroke_rules": 0, "icon_size_rules": 0, "bg_rules": 0, "gradient_rules": 0}
    seen = set()
    for fname in SOURCES:
        css = open(os.path.join(ASSETS, fname), encoding="utf-8", errors="ignore").read()
        for media, selector, body in parse_rules(css):
            if not selector or selector.startswith("@"):
                continue
            decls = [d.strip() for d in body.split(";") if d.strip()]
            out = []
            for d in decls:
                imp = " !important" if "!important" in d else ""
                plain = d.replace("!important", "").strip()
                prop, _, value = plain.partition(":")
                prop, value = prop.strip(), value.strip()
                if prop == "font-size":
                    v = num(value)
                    if v and v < MIN_FONT_PX:
                        out.append(f"font-size:{MIN_FONT_PX:g}px{imp}")
                        stats["size_rules"] += 1
                        if imp:
                            stats["important"] += 1
                        continue
                if prop == "border-radius":
                    snapped = snap_radius(value)
                    if snapped != value:
                        out.append(f"border-radius:{snapped}{imp}")
                        stats["radius_rules"] += 1
                        continue
                if prop == "box-shadow":
                    snapped = snap_shadow(value)
                    if snapped != value:
                        out.append(f"box-shadow:{snapped}{imp}")
                        stats["shadow_rules"] += 1
                        continue
                if prop == "z-index":
                    val = num(value)
                    best = min(Z_ALLOWED, key=lambda a: abs(a - val))
                    if best != val:
                        out.append(f"z-index:{best}{imp}")
                        stats["z_rules"] += 1
                        continue
                # цвет текста: только затемнение, только тёмных оттенков
                if prop == "color":
                    fixed = norm_text_color(value)
                    if fixed:
                        out.append(f"color:{fixed}{imp}")
                        stats["color_rules"] += 1
                        if imp:
                            stats["important"] += 1
                        continue
                # тёплый кремовый фон: убираем песочный оттенок, остаётся бумага
                if prop in ("background-color", "background"):
                    rgb = parse_color(value)
                    if rgb:
                        r0, g0, b0 = rgb
                        if r0 > 235 and g0 > 228 and (r0 - b0) <= 14 and b0 > 195:
                            out.append(f"{prop}:var({'--surface' if r0 >= 250 else '--canvas-2'}){imp}")
                            stats["bg_rules"] += 1
                            continue
                # градиенты: убираем зелёный хром и песочные подложки, оставляем фотографии
                if prop in ("background-image", "background") and "linear-gradient" in value:
                    stops = [(int(a), int(b), int(c)) for a, b, c in
                             re.findall(r"rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)", value)]
                    stops += [hex2rgb(h) for h in re.findall(r"#([0-9a-fA-F]{3,6})\b", value)
                              if len(h) in (3, 6)]
                    if stops:
                        green = any(g > r + 20 and g < 140 and r < 70 for r, g, b in stops)
                        warm = all(r > 232 and (r - b) <= 16 and b > 195 for r, g, b in stops)
                        if green or warm:
                            out.append(f"background-image:none{imp}")
                            stats["gradient_rules"] += 1
                            if warm:
                                out.append(f"background-color:var(--surface){imp}")
                            elif green:
                                # зелёная заливка органа управления становится чернилами
                                out.append(f"background-color:var(--ink-950){imp}")
                                if re.search(r"button|cta|fab|primary|trigger|chip", selector, re.I):
                                    out.append(f"color:#fff{imp}")
                            continue
                # иконки: единый штрих и единый минимальный размер в интерфейсе
                if "ui-icon" in selector and prop == "stroke-width":
                    if value.strip() != "1.6":
                        out.append(f"stroke-width:1.6{imp}")
                        stats["icon_stroke_rules"] += 1
                        continue
                if "ui-icon" in selector and prop in ("width", "height"):
                    v = num(value)
                    if v and v < 16:
                        out.append(f"{prop}:16px{imp}")
                        stats["icon_size_rules"] += 1
                        continue
            if not out:
                continue
            key = (media, selector, tuple(out))
            if key in seen:
                continue
            seen.add(key)
            rule = selector + "{" + ";".join(out) + "}"
            typo.append(("@" + media + "{" + rule + "}") if media else rule)

    parts = ["/* Типографический порог, контраст и геометрия: сгенерировано tools/build_system_css.py */"]
    parts.append("/* Типографика: ни одного размера меньше %gpx */" % MIN_FONT_PX)
    parts += typo
    return "\n".join(parts), stats


def mobile_layer():
    """Мобильный слой: цели нажатия, признаки прокрутки, безопасные отступы."""
    return """
/* ── мобильный слой: телефон первым ─────────────────────────────── */
@media (max-width:760px){
  .app-shell,.main-content,.panel,.card{min-width:0;max-width:100%;}
  .kpi-grid,.metrics-grid,.stat-grid{grid-template-columns:1fr;}
  /* цели нажатия: компактные органы управления не меньше 44px.
     Широкие строки-кнопки не растягиваем — по ним и так попадают. */
  nav button,[role=tab],.tab,.chip,.filter-chip,.segmented button,.header-actions button,
  .bottom-nav button,.bottom-nav a,.toolbar button,.panel-head button,.view-switch button,
  .tabs button,.icon-button,.map-zoom button,.map-zoom-value,.pager button{
    min-height:44px;min-width:44px;display:inline-flex;align-items:center;justify-content:center;
  }
  /* подписи на карте: это ориентиры, а не кнопки — увеличиваем зону попадания без изменения вида */
  .map-label,.map-country,.map-pin,.map-marker{position:relative;}
  .map-label::after,.map-country::after,.map-pin::after,.map-marker::after{
    content:"";position:absolute;inset:-11px;
  }
  /* видимый признак горизонтальной прокрутки вместо «обрезанного» вида */
  .capacity-grid,.chart-shell,.panel:has(> table),.table-scroll{
    overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:thin;
    background-image:linear-gradient(to right,rgba(6,35,29,.06),rgba(6,35,29,0) 24px),
                     linear-gradient(to left,rgba(6,35,29,.06),rgba(6,35,29,0) 24px);
    background-position:left center,right center;background-repeat:no-repeat;background-size:24px 100%,24px 100%;
    background-attachment:local,local;
  }
  .capacity-row,.capacity-months{min-width:820px;}
  svg{max-width:100%;}
  .chart-shell svg{min-width:560px;}
  /* подписи в нижней навигации: на телефоне тоже не мельче 12px */
  .bottom-nav span,.bottom-nav small,.bottom-nav b,.bottom-nav strong{font-size:12px;}
  /* поля ввода: 16px предотвращает автозум на iOS */
  input,select,textarea{font-size:16px;}
  /* плотность: чуть больше воздуха в списках */
  li,.list-row,.attention-row,.health-status-rows>button{padding-top:2px;padding-bottom:2px;}
}
@media (max-width:520px){
  .kpi-grid,.metrics-grid,.stat-grid,.bento-grid,.dashboard-bento{grid-template-columns:1fr;}
  h1,.page-title{font-size:26px;}
}
"""


def numeric_layer():
    """Табличные цифры там, где числа сравнивают по разрядам, и единый язык иконок."""
    sel = (".kpi-value,.kpi-number,.metric-value,.stat-value,.amount,.money,td,th,.gantt-cell,"
           ".bar-caption,.month-label,.timeline-label,.table td,.table th,[data-numeric]")
    return f"""{sel}{{font-variant-numeric:tabular-nums;font-feature-settings:'tnum' 1,'cv05' 1;}}
h1,h2,h3,h4,h5{{font-family:var(--font-sans);letter-spacing:-.015em;}}
html,body,button,input,select,textarea{{font-family:var(--font-sans);}}
button,input,select,textarea{{font-size:13px;}}
:focus-visible{{outline:2px solid var(--data-info);outline-offset:2px;}}
@media (prefers-reduced-motion: reduce){{*{{animation-duration:.01ms !important;transition-duration:.01ms !important;}}}}

/* ── иконки: одна сетка 24×24, один штрих, один смысловой акцент ── */
.ui-icon{{width:16px;height:16px;stroke-width:1.6;transform:none;color:var(--ink-600);}}
.side-nav .ui-icon,.bottom-nav .ui-icon,.kpi-card .ui-icon,.panel-head .ui-icon,
.tab .ui-icon,.view-switch .ui-icon,.toolbar .ui-icon,.card .ui-icon{{width:20px;height:20px;}}
.ui-icon .icon-accent{{opacity:1;}}
.side-nav button.active .ui-icon{{color:currentColor;}}"""


def composition_layer():
    """Композиция: нейтральный хром, доминирующий блок, воздух.

    Цвет уходит из интерфейса и остаётся только в данных и изображениях.
    Перестановка блоков Обзора — через grid-template-areas, поэтому она
    ограничена десктопной шириной: иначе перебила бы мобильные раскладки.
    """
    return """
/* ── хром: чернила и бумага вместо кремового и зелёного ──────────── */
.sidebar{background:var(--surface);border-right:1px solid var(--line);}
.desktop-toolbar{background:var(--surface);border-bottom:1px solid var(--line-soft);}
.page-header{background:transparent;}
.side-nav button.active{background:var(--ink-950);color:#fff;}
.side-nav button.active .ui-icon{color:#fff;}
.primary-button{background:var(--ink-950);color:#fff;border-color:var(--ink-950);}
.primary-button:hover{background:var(--ink-800);border-color:var(--ink-800);}
.secondary-button{background:var(--surface);color:var(--ink-800);border-color:var(--line);}
.toolbar-alerts b,.toolbar-alerts strong{background:var(--ink-950);color:#fff;}
.demo-footer{background:transparent;border-top:1px solid var(--line-soft);color:var(--color-text-muted);}

/* ── карточки: одинаковая геометрия, крупное число, тихая подпись ── */
.kpi-grid{gap:14px;}
.kpi-card{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-md);
  box-shadow:var(--elev-1);padding:16px 18px;}
.kpi-card strong{font-size:34px;font-weight:600;letter-spacing:-.025em;line-height:1.1;}
.kpi-label{font-size:12px;font-weight:600;color:var(--color-text-muted);letter-spacing:.05em;}
.kpi-meta b{font-size:14px;}
.kpi-delta{font-size:12px;color:var(--color-text-muted);}
.kpi-signal{opacity:.9;}
.brief-decision-card{background:var(--surface);border:1px solid var(--line);}
.primary-button,.secondary-button,.brief-cta,.side-nav button.active,.bottom-nav button{background-image:none;}
.brief-cta{background:var(--ink-950);color:#fff;}
/* текст брифинга ложится на полупрозрачную бумагу: картинка видна, текст читается */
.executive-brief{background:linear-gradient(90deg,rgba(255,255,255,.95),rgba(255,255,255,.86));
  border-radius:var(--radius-md);padding:14px 16px;}
.leadership-stage-head{background-image:none;background:var(--surface);}
.panel,.card{background:var(--surface);border-color:var(--line);}

/* ── «Персонал»: сначала управление, реестр ставок — внизу и в рамке ── */
.main-content[data-view="personnel"] .view-content{display:flex;flex-direction:column;gap:16px;}
.main-content[data-view="personnel"] .view-content > div:first-child{order:9;max-height:460px;overflow:auto;
  border:1px solid var(--line);border-radius:var(--radius-md);background:var(--surface);}
.main-content[data-view="personnel"] .personnel-hero{order:1;}
.main-content[data-view="personnel"] .personnel-leadership{order:2;}
.main-content[data-view="personnel"] .personnel-insight-grid{order:3;}
.main-content[data-view="personnel"] .panel.personnel-directory{order:4;}

/* ── состав Обзора: деньги и решения первыми, декор вниз ────────── */
@media (min-width:1181px){
  .dashboard-bento{
    gap:16px;
    grid-template-areas:
      "cash cash cash cash cash cash cash cash health health health health"
      "attention attention attention attention attention attention upcoming upcoming upcoming upcoming upcoming upcoming"
      "capacity capacity capacity capacity capacity capacity capacity capacity capacity capacity capacity capacity";
  }
  .tutorial-trigger{display:none;}
  .brief-decision-card{box-shadow:none;}
}
"""


def main():
    overrides, stats = build_overrides()
    css = "\n".join([
        "/* Portfolio Pulse — системный слой v39. Сгенерировано tools/build_system_css.py, правки вносить в скрипт. */",
        font_faces(),
        token_block(),
        numeric_layer(),
        mobile_layer(),
        overrides,
        composition_layer(),
        "",
    ])
    open(OUT, "w", encoding="utf-8").write(css)
    print("Записано:", os.path.relpath(OUT, ROOT), round(len(css) / 1024, 1), "КБ")
    print("Правок типографики:", stats["size_rules"], "(из них с !important:", stats["important"], ")")
    print("Правок контраста:", stats["color_rules"])
    print("Правок скруглений:", stats["radius_rules"])
    print("Правок теней:", stats["shadow_rules"])
    print("Правок z-index:", stats["z_rules"])
    print("Иконки: штрих", stats["icon_stroke_rules"], "| размер", stats["icon_size_rules"])
    print("Тёплых кремовых фонов переведено в бумагу:", stats["bg_rules"])
    print("Зелёных и песочных градиентов снято:", stats["gradient_rules"])


if __name__ == "__main__":
    main()
