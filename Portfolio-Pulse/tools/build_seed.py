#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Наполнение базы MVP данными, которые уже есть в самом приложении.

Источник — assets/app-v38.js: там лежит демонстрационный набор (30 проектов,
40 специалистов по дисциплинам и правила распределения по дивизионам).
Скрипт не придумывает данные: он переносит в базу ровно то, что показывает
интерфейс, и воспроизводит те же правила ротации дивизионов и офисов.

Коды проектов и денежные суммы генерируются приложением в браузере, поэтому
в базу не пишутся: финансовые числа — отдельное решение (считать в базе
или подтягивать из приложения).

Запуск:  python3 tools/build_seed.py
Результат: api/seed/0001_demo.sql
"""
import os, re, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUNDLE = os.path.join(ROOT, "assets", "app-v38.js")
OUT = os.path.join(ROOT, "api", "seed", "0001_demo.sql")

TENANT = "demo"
TENANT_NAME = "Portfolio Pulse — демонстрационный контур"
CEO_NAME = "J. Craig Ruhs"          # подписан в интерфейсе как CEO
DIVISIONS = [("international", "Международный"), ("americas", "Америки"), ("advisory", "Консультационный")]
DIVISION_ORDER = ["international", "americas", "advisory"]
OFFICES = [("Houston", "United States"), ("London", "United Kingdom"),
           ("Almaty", "Kazakhstan"), ("Dubai", "United Arab Emirates")]


def q(v):
    if v is None:
        return "NULL"
    if isinstance(v, (int, float)):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"


def unwrap(pos, text):
    """Разбирает массив, в который вложена позиция pos."""
    start = text.rfind("[[", 0, pos)
    if start < 0:
        return None
    depth, i = 0, start
    while i < len(text):
        if text[i] == "[":
            depth += 1
        elif text[i] == "]":
            depth -= 1
            if depth == 0:
                break
        i += 1
    return json.loads(text[start:i + 1])


def grab_names(text, var):
    """Возвращает список имён из объявления вида: var=["Имя","Имя"];"""
    m = re.search(re.escape(var) + r"\s*=\s*(\[[^\]]*\])", text)
    if not m:
        raise SystemExit("не найден список имён: " + var)
    raw = m.group(1)
    # в бандле имена записаны escape-последовательностями вида \xF1 — в JSON так нельзя
    raw = re.sub(r"\\x([0-9A-Fa-f]{2})", r"\\u00\1", raw)
    return json.loads(raw)


def main():
    text = open(BUNDLE, encoding="utf-8", errors="ignore").read()

    # 1. проекты: [название, страна, дисциплина]
    projects = unwrap(text.find("Falcon Ridge"), text)
    if not projects or len(projects) < 20:
        raise SystemExit("не удалось разобрать список проектов")

    # 2. специалисты: дисциплина → имена (как в исходнике: kd)
    kd_src = re.search(r"kd\s*=\s*\[(.*?)\]\s*,\s*ce\s*=", text, re.S)
    if not kd_src:
        raise SystemExit("не найдена структура дисциплин kd")
    disciplines = re.findall(r'\[\s*"([a-z]+)"\s*,\s*([A-Za-z0-9_$]+)\s*\]', kd_src.group(1))
    if not disciplines:
        raise SystemExit("не удалось сопоставить дисциплины и списки имён")

    people = []
    for a, (disc, var) in enumerate(disciplines):
        for i, name in enumerate(grab_names(text, var)):
            office, country = OFFICES[(i + a) % len(OFFICES)]
            people.append({
                "id": f"{disc}-{i + 1}",
                "name": name,
                "discipline": disc,
                "division": DIVISION_ORDER[(i + a) % 3],
                "capacity": 90 if i % 7 == 0 else 100,
                "office": office,
                "country": country,
            })

    # 3. правило дивизионов для проектов — то же, что в приложении (K8)
    def project_division(index):
        if index % 5 == 0:
            return "advisory"
        if index % 3 == 0:
            return "americas"
        return "international"

    lines = [
        "-- Наполнение демонстрационного контура. Сгенерировано tools/build_seed.py.",
        "-- Данные взяты из assets/app-v38.js: те же 30 проектов и 40 специалистов, что в интерфейсе.",
        f"INSERT OR REPLACE INTO tenants(id, name) VALUES ({q(TENANT)}, {q(TENANT_NAME)});",
    ]
    for code, name in DIVISIONS:
        lines.append(f"INSERT OR REPLACE INTO divisions(tenant_id, code, name) VALUES ({q(TENANT)}, {q(code)}, {q(name)});")

    # CEO + специалисты
    lines.append(f"INSERT OR REPLACE INTO users(id, tenant_id, email, name, role, active) "
                 f"VALUES ('ceo-1', {q(TENANT)}, 'ceo@demo.local', {q(CEO_NAME)}, 'ceo', 1);")
    for p in people:
        email = p["id"] + "@demo.local"
        lines.append(f"INSERT OR REPLACE INTO users(id, tenant_id, email, name, role, active) "
                     f"VALUES ({q(p['id'])}, {q(TENANT)}, {q(email)}, {q(p['name'])}, 'specialist', 1);")
    for p in people:
        lines.append(f"INSERT OR REPLACE INTO staff_profiles(tenant_id, user_id, discipline, division, office, country, capacity_pct, hourly_rate_usd) "
                     f"VALUES ({q(TENANT)}, {q(p['id'])}, {q(p['discipline'])}, {q(p['division'])}, {q(p['office'])}, {q(p['country'])}, {p['capacity']}, 0);")

    # проекты + назначения
    for idx, (name, country, disc) in enumerate(projects, start=1):
        pid = f"p{idx:03d}"
        code = f"P-{idx:03d}"
        division = project_division(idx)
        coordinator = people[idx % len(people)]["id"]
        lines.append(
            "INSERT OR REPLACE INTO projects(id, tenant_id, code, client, name, active, division, country, discipline, "
            f"coordinator_id, contract_amount_usd, version, updated_at) VALUES ("
            f"{q(pid)}, {q(TENANT)}, {q(code)}, {q(name)}, {q(name)}, 1, {q(division)}, {q(country)}, {q(disc)}, "
            f"{q(coordinator)}, 0, 1, datetime('now'));")
        members = {coordinator}
        for k in range(3):
            members.add(people[(idx + k * 7) % len(people)]["id"])
        for m in sorted(members):
            lines.append(f"INSERT OR REPLACE INTO project_members(tenant_id, project_id, user_id) "
                         f"VALUES ({q(TENANT)}, {q(pid)}, {q(m)});")

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, "w", encoding="utf-8").write("\n".join(lines) + "\n")
    print("Записано:", os.path.relpath(OUT, ROOT), round(os.path.getsize(OUT) / 1024, 1), "КБ")
    print(f"Проектов: {len(projects)} | специалистов: {len(people)} | дисциплин: {len(disciplines)}")
    from collections import Counter
    print("Проекты по дивизионам:", dict(Counter(project_division(i) for i in range(1, len(projects) + 1))))
    print("Люди по дисциплинам:", dict(Counter(p['discipline'] for p in people)))


if __name__ == "__main__":
    main()
