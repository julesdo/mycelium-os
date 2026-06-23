import requests
import logging
from odoo import models, fields, api
from odoo.exceptions import UserError

_logger = logging.getLogger(__name__)

MYCELIUM_API_BASE = 'https://YOUR_APP.convex.site/api/v1'

CATEGORY_LABEL = {
    'LEASING': 'Leasing/Location',
    'CARBURANT': 'Carburant',
    'ENTRETIEN': 'Entretien',
    'ASSURANCE': 'Assurance',
    'TAXES': 'Taxes (TVS)',
    'SINISTRE': 'Sinistre',
    'PARKING': 'Parking',
    'TELEPEAGE': 'Télépéage',
    'AUTRE': 'Autre',
    'IK': 'Indemnités kilométriques',
}


class MyceliumSettings(models.TransientModel):
    _name = 'mycelium.settings'
    _description = 'Mycelium Fleet OS Settings'
    _inherit = 'res.config.settings'

    mycelium_api_key = fields.Char(
        string='Mycelium API Key',
        config_parameter='mycelium.api_key',
        # SECURITY NOTE: Odoo stores ir.config_parameter values in plaintext in the
        # PostgreSQL database. Restrict DB access (pg_hba.conf) and rotate the API key
        # regularly from Mycelium Settings > Développeurs > Clés API.
        help='API key starting with myc_live_...'
    )
    mycelium_api_base = fields.Char(
        string='Mycelium API URL',
        config_parameter='mycelium.api_base',
        default=MYCELIUM_API_BASE,
        help='Base URL for Mycelium API (e.g. https://yourapp.convex.site/api/v1)'
    )
    mycelium_journal_id = fields.Many2one(
        'account.journal',
        string='Journal comptable',
        config_parameter='mycelium.journal_id',
        help='Odoo journal to use for imported costs'
    )
    mycelium_last_sync = fields.Datetime(
        string='Last sync',
        config_parameter='mycelium.last_sync',
        readonly=True
    )


class MyceliumCategoryMapping(models.Model):
    _name = 'mycelium.category.mapping'
    _description = 'Mycelium Category → Odoo Account Mapping'

    company_id = fields.Many2one('res.company', required=True, default=lambda s: s.env.company)
    mycelium_category = fields.Selection(
        [(k, v) for k, v in CATEGORY_LABEL.items()],
        string='Mycelium Category',
        required=True
    )
    account_id = fields.Many2one('account.account', string='Odoo Account', required=True)
    analytic_account_id = fields.Many2one('account.analytic.account', string='Analytic Account')

    _sql_constraints = [
        ('unique_company_category', 'unique(company_id, mycelium_category)',
         'A mapping for this category already exists for this company.')
    ]


class MyceliumSync(models.Model):
    _name = 'mycelium.sync'
    _description = 'Mycelium Sync Log'

    cost_id = fields.Char(string='Mycelium Cost ID', index=True)
    move_id = fields.Many2one('account.move', string='Journal Entry')
    company_id = fields.Many2one('res.company', required=True, default=lambda s: s.env.company)
    synced_at = fields.Datetime(string='Synced At', default=fields.Datetime.now)
    category = fields.Char(string='Category')
    amount = fields.Float(string='Amount')

    _sql_constraints = [
        ('unique_cost_id', 'unique(cost_id, company_id)',
         'This Mycelium cost has already been imported.')
    ]

    @api.model
    def _get_api_headers(self):
        api_key = self.env['ir.config_parameter'].sudo().get_param('mycelium.api_key')
        if not api_key:
            raise UserError('Mycelium API key not configured. Go to Accounting > Configuration > Mycelium Settings.')
        return {'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'}

    @api.model
    def _get_api_base(self):
        return (
            self.env['ir.config_parameter'].sudo().get_param('mycelium.api_base')
            or MYCELIUM_API_BASE
        )

    @api.model
    def sync_costs(self):
        """Fetch costs from Mycelium API and create journal entries."""
        headers = self._get_api_headers()
        base = self._get_api_base()
        company = self.env.company

        try:
            resp = requests.get(
                f'{base}/costs',
                headers=headers,
                params={'limit': 200},
                timeout=30
            )
            resp.raise_for_status()
        except Exception as e:
            _logger.error('Mycelium API error: %s', e)
            return False

        costs = resp.json().get('data', [])
        if not costs:
            return True

        journal_id = int(self.env['ir.config_parameter'].sudo().get_param('mycelium.journal_id') or 0)
        journal = self.env['account.journal'].browse(journal_id) if journal_id else None
        if not journal or not journal.exists():
            journal = self.env['account.journal'].search([
                ('type', '=', 'purchase'),
                ('company_id', '=', company.id)
            ], limit=1)
        if not journal:
            _logger.warning('No purchase journal found for Mycelium sync')
            return False

        for cost in costs:
            cost_id = cost.get('id')
            if not cost_id:
                continue
            if self.search_count([('cost_id', '=', cost_id), ('company_id', '=', company.id)]):
                continue  # idempotent

            mapping = self.env['mycelium.category.mapping'].search([
                ('company_id', '=', company.id),
                ('mycelium_category', '=', cost.get('category'))
            ], limit=1)

            if not mapping:
                _logger.warning('No mapping for category %s — skipping cost %s', cost.get('category'), cost_id)
                continue

            date = fields.Date.from_string(
                cost.get('date', '')[:10] if isinstance(cost.get('date'), str)
                else fields.Date.today()
            )
            label = f"Mycelium — {CATEGORY_LABEL.get(cost.get('category', ''), cost.get('category', ''))} — {cost.get('description', '')}"

            move_vals = {
                'journal_id': journal.id,
                'date': date,
                'ref': f"mycelium:{cost_id}",
                'company_id': company.id,
                'line_ids': [(0, 0, {
                    'account_id': mapping.account_id.id,
                    'analytic_account_id': mapping.analytic_account_id.id if mapping.analytic_account_id else False,
                    'name': label,
                    'debit': cost.get('amount', 0),
                    'credit': 0,
                })],
            }

            try:
                move = self.env['account.move'].create(move_vals)
                self.create({
                    'cost_id': cost_id,
                    'move_id': move.id,
                    'company_id': company.id,
                    'category': cost.get('category'),
                    'amount': cost.get('amount', 0),
                })
                _logger.info('Imported Mycelium cost %s as journal entry %s', cost_id, move.name)
            except Exception as e:
                _logger.error('Failed to create journal entry for cost %s: %s', cost_id, e)

        self.env['ir.config_parameter'].sudo().set_param(
            'mycelium.last_sync',
            fields.Datetime.now().isoformat()
        )
        return True
