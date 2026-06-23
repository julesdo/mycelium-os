{
    'name': 'Mycelium Fleet Sync',
    'version': '16.0.1.0.0',
    'summary': 'Import fleet costs from Mycelium Fleet OS into Odoo accounting',
    'description': """
Mycelium Fleet Sync
===================
Automatically imports fleet costs (leasing, fuel, maintenance, IK expenses)
from Mycelium Fleet OS into Odoo accounting entries.

Features:
- Scheduled import via Mycelium public API
- Maps Mycelium categories to Odoo journal accounts
- Idempotent (won't create duplicate entries)
- Configurable per-company settings

Setup:
1. Install the module
2. Go to Accounting > Configuration > Mycelium Settings
3. Enter your Mycelium API key (myc_live_...)
4. Configure account mappings per category
5. Run a manual sync or wait for the scheduled cron
    """,
    'category': 'Accounting/Accounting',
    'author': 'Mycelium Fleet OS',
    'website': 'https://mycelium.fr',
    'license': 'LGPL-3',
    'depends': ['account', 'fleet'],
    'data': [
        'security/ir.model.access.csv',
        'data/cron.xml',
        'views/config_view.xml',
        'views/menu.xml',
    ],
    'installable': True,
    'auto_install': False,
    'application': False,
}
