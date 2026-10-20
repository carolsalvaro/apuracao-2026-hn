"""Prevent accidental remote load tests while Netlify approval is pending.
This record documents a reviewed written approval; it is not a substitute for it.
Only update it after the actual Support response and approved scope are reviewed.
"""
import datetime,json,pathlib
PREVIEW='https://deploy-preview-1--stupendous-muffin-2438f0.netlify.app'
def require_netlify_approval():
    path=pathlib.Path(__file__).resolve().parent.parent/'config/netlify-load-authorization.json'
    try:
        record=json.loads(path.read_text())
        until=datetime.datetime.fromisoformat(str(record.get('validUntil')).replace('Z','+00:00'))
        approved=(record.get('approved') is True and record.get('previewUrl')==PREVIEW
                  and isinstance(record.get('supportReference'),str) and record['supportReference'].strip()
                  and until.tzinfo is not None and until>datetime.datetime.now(datetime.timezone.utc))
    except (OSError,ValueError,TypeError,AttributeError):approved=False
    if not approved:
        raise SystemExit('SUSPENSO: teste remoto de carga exige autorização escrita prévia da Netlify, escopo revisado e registro válido em config/netlify-load-authorization.json. Nenhuma requisição foi iniciada.')
