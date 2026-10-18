"""Add (or replace) a TXT record in an OVH zone (paulasquin.com by default), e.g. GitHub's domain verification.

    bws-env run ovh -- uv run -q --with ovh python -I tools/ovh_txt.py _github-pages-challenge-paulasquin <value> [zone]
"""
import os
import sys

import ovh

sub, value = sys.argv[1], sys.argv[2].strip().strip('"')
z = sys.argv[3] if len(sys.argv) > 3 else "paulasquin.com"
c = ovh.Client(endpoint=os.environ["OVH_ENDPOINT"], application_key=os.environ["OVH_APPLICATION_KEY"],
               application_secret=os.environ["OVH_APPLICATION_SECRET"], consumer_key=os.environ["OVH_CONSUMER_KEY"])
for rid in c.get(f"/domain/zone/{z}/record", fieldType="TXT", subDomain=sub):
    c.delete(f"/domain/zone/{z}/record/{rid}")
    print("replaced previous", sub, "TXT")
c.post(f"/domain/zone/{z}/record", fieldType="TXT", subDomain=sub, target=value, ttl=60)
c.post(f"/domain/zone/{z}/refresh")
print(f"{sub}.{z} TXT {value!r} — zone refreshed")
