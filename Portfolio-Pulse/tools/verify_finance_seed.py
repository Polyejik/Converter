#!/usr/bin/env python3
"""Generate/apply twice and save actual local D1 SQL evidence; fail on violations."""
import hashlib
import json
import subprocess
from build_finance_seed import BASE, OUT, ROOT, main, query

QUERIES = {
 'counts': "SELECT (SELECT COUNT(*) FROM invoices WHERE tenant_id='demo') invoices,(SELECT COUNT(*) FROM receipts WHERE tenant_id='demo') receipts,(SELECT COUNT(*) FROM time_entries WHERE tenant_id='demo') time_entries;",
 'division_sums': "SELECT p.division,COUNT(*) projects,SUM(p.contract_amount_usd) contract_usd,SUM((SELECT SUM(i.amount_usd) FROM invoices i WHERE i.tenant_id=p.tenant_id AND i.project_id=p.id)) invoice_usd,SUM((SELECT SUM(CASE r.kind WHEN 'refund' THEN -r.amount_usd ELSE r.amount_usd END) FROM receipts r JOIN invoices i ON i.tenant_id=r.tenant_id AND i.id=r.invoice_id WHERE i.tenant_id=p.tenant_id AND i.project_id=p.id)) net_receipt_usd,SUM((SELECT SUM(t.hours) FROM time_entries t WHERE t.tenant_id=p.tenant_id AND t.project_id=p.id)) hours FROM projects p WHERE p.tenant_id='demo' GROUP BY p.division ORDER BY p.division;",
 'financial_totals': "SELECT (SELECT SUM(contract_amount_usd) FROM projects WHERE tenant_id='demo') contracts,(SELECT SUM(amount_usd) FROM invoices WHERE tenant_id='demo') invoices,(SELECT SUM(CASE kind WHEN 'refund' THEN -amount_usd ELSE amount_usd END) FROM receipts WHERE tenant_id='demo') net_receipts,100.0*(SELECT SUM(CASE kind WHEN 'refund' THEN -amount_usd ELSE amount_usd END) FROM receipts WHERE tenant_id='demo')/(SELECT SUM(amount_usd) FROM invoices WHERE tenant_id='demo') receipt_pct,(SELECT COUNT(*) FROM receipts WHERE tenant_id='demo' AND kind='refund') refunds;",
 'foreign_keys': 'PRAGMA foreign_key_check;',
 'orphans': "SELECT (SELECT COUNT(*) FROM invoices i WHERE NOT EXISTS(SELECT 1 FROM projects p WHERE p.tenant_id=i.tenant_id AND p.id=i.project_id)) invoice_projects,(SELECT COUNT(*) FROM receipts r WHERE NOT EXISTS(SELECT 1 FROM invoices i WHERE i.tenant_id=r.tenant_id AND i.id=r.invoice_id)) receipt_invoices,(SELECT COUNT(*) FROM time_entries t WHERE t.project_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM projects p WHERE p.tenant_id=t.tenant_id AND p.id=t.project_id)) time_projects,(SELECT COUNT(*) FROM time_entries t WHERE NOT EXISTS(SELECT 1 FROM users u WHERE u.tenant_id=t.tenant_id AND u.id=t.user_id)) time_users;",
 'nonpositive_amounts': "SELECT (SELECT COUNT(*) FROM invoices WHERE amount_usd<=0) invoices,(SELECT COUNT(*) FROM receipts WHERE amount_usd<=0) receipts;",
 'invoice_counts_ranges': "SELECT p.id,COUNT(i.id) invoices,MIN(i.amount_usd) min_usd,MAX(i.amount_usd) max_usd,SUM(i.amount_usd) invoice_total,p.contract_amount_usd contract FROM projects p LEFT JOIN invoices i ON i.tenant_id=p.tenant_id AND i.project_id=p.id WHERE p.tenant_id='demo' GROUP BY p.id ORDER BY p.id;",
 'weekly_staff_totals': "SELECT user_id,week_start,SUM(hours) hours FROM time_entries WHERE tenant_id='demo' GROUP BY user_id,week_start ORDER BY user_id,week_start;",
 'activity_validity': "SELECT COUNT(*) invalid FROM time_entries WHERE activity NOT IN ('administration','coordination','technical','report_processing','client_meetings','economic','pto','vacation') OR (activity IN ('pto','vacation') AND project_id IS NOT NULL);",
 'assigned_only': "SELECT COUNT(*) invalid FROM time_entries t WHERE t.tenant_id='demo' AND (NOT EXISTS(SELECT 1 FROM project_members m WHERE m.tenant_id=t.tenant_id AND m.project_id=t.project_id AND m.user_id=t.user_id) OR NOT EXISTS(SELECT 1 FROM staff_profiles s JOIN users u ON u.tenant_id=s.tenant_id AND u.id=s.user_id WHERE s.tenant_id=t.tenant_id AND s.user_id=t.user_id AND u.role='specialist'));",
 'project_staff_weeks': "SELECT project_id,COUNT(DISTINCT user_id) specialists,COUNT(DISTINCT week_start) weeks FROM time_entries WHERE tenant_id='demo' GROUP BY project_id ORDER BY project_id;",
 'weeks': "SELECT DISTINCT week_start FROM time_entries WHERE tenant_id='demo' ORDER BY week_start;",
 'activity_counts': "SELECT activity,COUNT(*) entries FROM time_entries WHERE tenant_id='demo' GROUP BY activity ORDER BY activity;"
}


def snapshot():
    statements = [f'SELECT * FROM {t} ORDER BY tenant_id,id;' for t in ('invoices','receipts','time_entries','projects')]
    statements.append('SELECT COUNT(*) audit_rows FROM audit;')
    return query(' '.join(statements))


def unrelated():
    statements = [f"SELECT * FROM {t} WHERE id NOT LIKE 'finance-v1:%' ORDER BY tenant_id,id;" for t in ('invoices','receipts','time_entries')]
    statements += [f'SELECT * FROM {t} ORDER BY tenant_id,user_id;' for t in ('staff_profiles',)]
    statements += ['SELECT * FROM project_members ORDER BY tenant_id,project_id,user_id;', 'SELECT * FROM users ORDER BY tenant_id,id;', "SELECT * FROM projects WHERE tenant_id<>'demo' ORDER BY tenant_id,id;"]
    return query(' '.join(statements))


def apply():
    result = subprocess.run(BASE + ['--file=api/seed/0002_finance.sql', '--json'], cwd=ROOT, check=True, capture_output=True, text=True)
    output = json.loads(result.stdout)
    assert all(x.get('success') for x in output), output
    return output


def verify():
    evidence = {}
    try:
        before = unrelated()
        main()
        first_bytes = OUT.read_bytes()
        evidence['first_application'] = apply()
        first = snapshot()
        main()
        assert first_bytes == OUT.read_bytes(), 'generation changed bytes'
        evidence['generation_sha256'] = hashlib.sha256(first_bytes).hexdigest()
        evidence['repeat_generation_identical'] = True
        evidence['second_application'] = apply()
        second = snapshot()
        assert first == second, 'repeat application changed rows, versions or audit count'
        assert before == unrelated(), 'unrelated rows changed'
        evidence['repeat_application_identical'] = True
        evidence['unrelated_rows_preserved'] = True
        evidence['checks'] = {}
        for name, sql in QUERIES.items():
            evidence['checks'][name] = {'sql': sql, 'output': query(sql)[0]}
        checks = {name: x['output'] for name, x in evidence['checks'].items()}
        assert checks['foreign_keys'] == []
        for name in ('orphans','nonpositive_amounts','activity_validity','assigned_only'):
            assert all(v == 0 for row in checks[name] for v in row.values()), name
        totals = checks['financial_totals'][0]
        assert 15000000 <= totals['contracts'] <= 20000000
        assert totals['contracts'] == totals['invoices']
        assert 55 <= totals['receipt_pct'] <= 70
        assert 1 <= totals['refunds'] <= 2
        assert len(checks['invoice_counts_ranges']) == 30
        assert all(3 <= r['invoices'] <= 6 and 80000 <= r['min_usd'] <= r['max_usd'] <= 900000 and r['invoice_total'] == r['contract'] for r in checks['invoice_counts_ranges'])
        assert len(checks['weekly_staff_totals']) == 40 * 8
        assert all(20 <= r['hours'] <= 45 for r in checks['weekly_staff_totals'])
        assert len(checks['project_staff_weeks']) == 30
        assert all(2 <= r['specialists'] <= 4 and r['weeks'] == 8 for r in checks['project_staff_weeks'])
        assert [r['week_start'] for r in checks['weeks']] == ['2026-01-05','2026-01-12','2026-01-19','2026-01-26','2026-02-02','2026-02-09','2026-02-16','2026-02-23']
        evidence['passed'] = True
        print(json.dumps({'counts': checks['counts'], 'totals': checks['financial_totals'], 'passed': True}, indent=2))
    except Exception as exc:
        evidence['passed'] = False
        evidence['error'] = repr(exc)
        raise
    finally:
        (ROOT / 'tools/finance_seed_verification.json').write_text(json.dumps(evidence, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    verify()
