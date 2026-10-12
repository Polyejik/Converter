#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Набор иконок Portfolio Pulse: единая сетка 24×24, один штрих, один акцент.

Что делает скрипт:
 1) заменяет в бандле assets/app-v38.js словарь иконок компонента O на новую
    редакцию — все 26 иконок нарисованы по одним правилам;
 2) убирает vectorEffect:"non-scaling-stroke" (из-за него штрих не масштабировался
    и на 12 px выглядел слишком жирным);
 3) исправляет подмену: иконка lock раньше рисовала часы, теперь это замок.

Правила набора:
  • холст 24×24, содержимое в поле 3,5–20,5 (оптическая зона 17 px);
  • круги-контейнеры радиусом 8 (ровно 4–20), головы радиусом 3;
  • штрих 1,6, круглые концы и стыки, без заливок;
  • ровно один смысловой акцент на иконку, класс icon-accent;
  • прямоугольники со скруглением 2 (мелкие) и 2,5 (контейнеры).

Запуск: python3 tools/build_icons.py  (сначала — архивная копия бандла)
"""
import os, re, json, shutil, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUNDLE = os.path.join(ROOT, "assets", "app-v38.js")

# ── новая редакция: имя → список фигур ──────────────────────────────
# фигура: ("path", d) | ("circle", cx, cy, r, accent) | ("rect", x, y, w, h, rx, accent)
ICONS = {
    "pulse": [
        ("path", "M3.5 12.2h3.4l2.4-6.2 4.1 11.8 2.3-5.6h3.6"),
        ("circle", 20.1, 12.2, 1.7, True),
    ],
    "grid": [
        ("rect", 3.5, 3.5, 6.5, 6.5, 2, False),
        ("rect", 14, 3.5, 6.5, 6.5, 2, False),
        ("rect", 3.5, 14, 6.5, 6.5, 2, False),
        ("rect", 14, 14, 6.5, 6.5, 2, True),
    ],
    "folder": [
        ("path", "M3.5 7.6h5.9l1.9-2.4h9.2v13.6H3.5z"),
        ("path", "M3.5 9.6h17", True),
    ],
    "inbox": [
        ("rect", 3.5, 4.5, 17, 15, 2.5, False),
        ("path", "M3.5 13.6h4.6l2.1 2.4h3.6l2.1-2.4h4.6", True),
    ],
    "timeline": [
        ("path", "M6 3.5v17"),
        ("circle", 6, 8.4, 2.3, True),
        ("circle", 6, 15.6, 2.3, False),
        ("path", "M10.4 8.4h9.6M10.4 15.6h6.6"),
    ],
    "people": [
        ("circle", 8.7, 8.2, 3.1, False),
        ("circle", 17, 9.5, 2.4, False),
        ("path", "M3.2 20.2c.3-3.8 2.1-5.9 5.5-5.9s5.2 2.1 5.5 5.9M15.6 15.3c2.9.3 4.6 1.9 4.9 4.9", True),
    ],
    "invoice": [
        ("path", "M6 3.5h12v17l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4z"),
        ("path", "M9 8.2h6M9 12.2h6"),
        ("path", "M9 16.4h3.6", True),
    ],
    "wallet": [
        ("rect", 3.5, 6.8, 17, 13.2, 2.5, False),
        ("path", "M3.5 9.6h13.2a3.4 3.4 0 0 1 0 6.8H3.5", True),
    ],
    "search": [
        ("circle", 10.6, 10.6, 6.4, False),
        ("path", "m15.4 15.4 4.6 4.6", True),
    ],
    "plus": [("path", "M12 4.2v15.6M4.2 12h15.6")],
    "arrow": [("path", "M4 12h15M14.3 6.6 19.7 12l-5.4 5.4")],
    "check": [("path", "m4.5 12.3 4.7 4.7L19.5 7.2")],
    "alert": [
        ("path", "M10.4 4.3 3.9 15.9A1.9 1.9 0 0 0 5.6 19h12.8a1.9 1.9 0 0 0 1.7-3.1L13.6 4.3a1.9 1.9 0 0 0-3.2 0Z"),
        ("path", "M12 9.2v3.6"),
        ("circle", 12, 15.9, 1.2, True),
    ],
    "clock": [
        ("circle", 12, 12, 8, False),
        ("path", "M12 7.3v5l3.4 2.1", True),
    ],
    "globe": [
        ("circle", 12, 12, 8, False),
        ("path", "M4 12h16M12 4c2.6 3.1 2.6 12.9 0 16M12 4c-2.6 3.1-2.6 12.9 0 16", True),
    ],
    "close": [("path", "M6.2 6.2 17.8 17.8M17.8 6.2 6.2 17.8")],
    "download": [
        ("path", "M12 3.5v11.4M7.4 10.4 12 15l4.6-4.6"),
        ("path", "M4.2 19.8h15.6", True),
    ],
    "settings": [
        ("path", "M4 7.6h16M4 16.4h16"),
        ("circle", 9.2, 7.6, 2.2, True),
        ("circle", 15.4, 16.4, 2.2, False),
    ],
    "lock": [
        ("path", "M7.5 10.5h9a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z"),
        ("path", "M9 10.5V7.8a3 3 0 0 1 6 0v2.7", True),
    ],
    "unlock": [
        ("path", "M7.5 10.5h9a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z"),
        ("path", "M9 10.5V7.8a3 3 0 0 1 5.6-1.5", True),
    ],
    "chevron": [("path", "m8.4 9.4 3.6 3.6 3.6-3.6")],
    "calendar": [
        ("rect", 3.5, 5, 17, 15.5, 2.5, False),
        ("path", "M8 3.5v3M16 3.5v3M3.5 10h17", False),
        ("circle", 16.2, 15.4, 1.3, True),
    ],
    "edit": [
        ("path", "m4.4 19.8 4.4-1L18.6 9a2.2 2.2 0 0 0-3.1-3.1L5.7 15.6z"),
        ("path", "m14.3 7.1 2.9 2.9", True),
    ],
    "undo": [
        ("path", "M9.2 7.6 4.8 12l4.4 4.4"),
        ("path", "M5.2 12h7.6a6.2 6.2 0 0 1 6.2 6.2", True),
    ],
    "link": [
        ("path", "m9.4 14.6-2.2 2.2a3.3 3.3 0 0 1-4.7-4.7l3.1-3.1a3.3 3.3 0 0 1 4.7 0M14.6 9.4l2.2-2.2a3.3 3.3 0 0 1 4.7 4.7l-3.1 3.1a3.3 3.3 0 0 1-4.7 0"),
        ("path", "m9.2 14.8 6.4-6.4", True),
    ],
    "parallel": [
        ("path", "M5 7.4h14M5 16.6h14"),
        ("path", "m8.2 4.4-3 3 3 3M15.8 13.6l3 3-3 3", True),
    ],
}


def fmt_num(v):
    return f"{v:g}"


def render_icon(name, shapes):
    parts = []
    for s in shapes:
        if s[0] == "path":
            d, accent = s[1], (s[2] if len(s) > 2 else False)
            attrs = f'd:"{d}"' if not accent else f'className:"icon-accent",d:"{d}"'
            parts.append(f'(0,l.jsx)("path",{{{attrs}}})')
        elif s[0] == "circle":
            cx, cy, r, accent = s[1], s[2], s[3], s[4]
            cls = 'className:"icon-accent",' if accent else ""
            parts.append(f'(0,l.jsx)("circle",{{{cls}cx:"{fmt_num(cx)}",cy:"{fmt_num(cy)}",r:"{fmt_num(r)}"}})')
        elif s[0] == "rect":
            x, y, w, h, rx, accent = s[1:]
            cls = 'className:"icon-accent",' if accent else ""
            parts.append(f'(0,l.jsx)("rect",{{{cls}x:"{fmt_num(x)}",y:"{fmt_num(y)}",width:"{fmt_num(w)}",height:"{fmt_num(h)}",rx:"{fmt_num(rx)}"}})')
    body = ",".join(parts)
    if len(parts) == 1:
        return f'{name}:(0,l.jsx)(l.Fragment,{{children:{parts[0]}}})'
    return f'{name}:(0,l.jsxs)(l.Fragment,{{children:[{body}]}})'


def main():
    src = open(BUNDLE, encoding="utf-8").read()

    # ── резервная копия бандла ──────────────────────────────────────
    stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M")
    backup = os.path.join(ROOT, "assets", f"app-v38.backup-{stamp}.js")
    if not os.path.exists(backup):
        shutil.copy2(BUNDLE, backup)
        print("резервная копия:", os.path.relpath(backup, ROOT))

    # ── находим словарь иконок внутри компонента O ──────────────────
    anchor = src.find("function O({name:e,size:t=18})")
    if anchor < 0:
        raise SystemExit("не найден компонент иконок")
    ch = src.find("children:{", anchor)
    start = ch + len("children:")
    depth, j = 0, start
    while j < len(src):
        if src[j] == "{":
            depth += 1
        elif src[j] == "}":
            depth -= 1
            if depth == 0:
                break
        j += 1
    old_map = src[start:j + 1]
    old_names = [n for n in re.findall(r"(?:^|\{|,)\s*([a-zA-Z][\w]*):\(0,l\.jsx", old_map) if n != "children"]
    print("в бандле иконок:", len(old_names), sorted(old_names))

    # ── сверяем состав, чтобы ничего не потерять ────────────────────
    missing = [n for n in old_names if n not in ICONS]
    extra = [n for n in ICONS if n not in old_names]
    if missing or extra:
        raise SystemExit(f"состав не совпадает. нет в наборе: {missing}; лишние: {extra}")

    new_map = "{" + ",".join(render_icon(n, ICONS[n]) for n in old_names) + "}"
    out = src[:start] + new_map + src[j + 1:]

    # ── штрих должен масштабироваться вместе с иконкой ──────────────
    before = out.count('vectorEffect:"non-scaling-stroke"')
    out = out.replace(',vectorEffect:"non-scaling-stroke"', "")
    out = out.replace('vectorEffect:"non-scaling-stroke",', "")
    print("снят non-scaling-stroke:", before, "→", out.count('vectorEffect:"non-scaling-stroke"'))
    print("толщина штриха в компоненте:", re.search(r"strokeWidth:([\d.]+)", out).group(1))

    open(BUNDLE, "w", encoding="utf-8").write(out)
    print("иконок заменено:", len(old_names), "| бандл:", round(os.path.getsize(BUNDLE) / 1024), "КБ")

    # ── отчёт для проверки ─────────────────────────────────────────
    report = {n: {"shapes": len(ICONS[n]), "accent": any((len(s) > 2 and s[-1] is True) for s in ICONS[n])}
              for n in old_names}
    json.dump(report, open(os.path.join(ROOT, "tools", "icons-report.json"), "w"), ensure_ascii=False, indent=1)
    no_accent = [n for n, v in report.items() if not v["accent"]]
    print("без смыслового акцента (норма для знаков действия):", no_accent)


if __name__ == "__main__":
    main()
