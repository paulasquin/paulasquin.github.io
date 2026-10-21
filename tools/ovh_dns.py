"""Point paulasquin.com (apex + www, and me. where the site lives) at GitHub Pages in the OVH zone.

Removes OVH's placeholder markers (apex -> www redirect, "site en construction" page),
points www and me at paulasquin.github.io. and adds the GitHub Pages A/AAAA records on the apex.
MX and the other subdomains are left untouched. Idempotent.

    bws-env run ovh -- uv run -q --with ovh python -I tools/ovh_dns.py
"""
import os

import ovh

c = ovh.Client(endpoint=os.environ["OVH_ENDPOINT"], application_key=os.environ["OVH_APPLICATION_KEY"],
               application_secret=os.environ["OVH_APPLICATION_SECRET"], consumer_key=os.environ["OVH_CONSUMER_KEY"])
z = "paulasquin.com"
recs = {rid: c.get(f"/domain/zone/{z}/record/{rid}") for rid in c.get(f"/domain/zone/{z}/record")}

for rid, r in recs.items():
    t = r["target"].strip('"')
    if r["fieldType"] == "TXT" and ((r["subDomain"] == "" and t == "1|www.paulasquin.com") or (r["subDomain"] == "www" and t in ("3|welcome", "l|fr"))):
        c.delete(f"/domain/zone/{z}/record/{rid}")
        print("deleted", r["subDomain"] or "@", "TXT", t)
    if r["subDomain"] == "www" and r["fieldType"] == "CNAME" and r["target"] != "paulasquin.github.io.":
        c.put(f"/domain/zone/{z}/record/{rid}", target="paulasquin.github.io.", ttl=3600)
        print("www CNAME -> paulasquin.github.io.")

have = {(r["subDomain"], r["fieldType"], r["target"]) for r in recs.values()}
if ("me", "CNAME", "paulasquin.github.io.") not in have:
    c.post(f"/domain/zone/{z}/record", fieldType="CNAME", subDomain="me", target="paulasquin.github.io.", ttl=3600)
    print("me CNAME -> paulasquin.github.io.")
for kind, ips in (("A", ["185.199.108.153", "185.199.109.153", "185.199.110.153", "185.199.111.153"]),
                  ("AAAA", ["2606:50c0:8000::153", "2606:50c0:8001::153", "2606:50c0:8002::153", "2606:50c0:8003::153"])):
    for ip in ips:
        if ("", kind, ip) not in have:
            c.post(f"/domain/zone/{z}/record", fieldType=kind, subDomain="", target=ip, ttl=3600)
            print(kind, ip)

c.post(f"/domain/zone/{z}/refresh")
print("zone refreshed")
