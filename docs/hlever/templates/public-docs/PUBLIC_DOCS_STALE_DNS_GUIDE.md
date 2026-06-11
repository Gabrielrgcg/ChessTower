# Stale Public Docs and DNS Separation

Static public docs can be stale while the runtime is healthy. Keep the incidents separate.

## Diagnose

```bash
curl -I "$PUBLIC_SITE_URL/"
curl -I "$PUBLIC_SITE_URL/notes/"
curl -I "$PUBLIC_SITE_URL/security.txt"
nslookup docs.<game-domain>
nslookup www.docs.<game-domain>
```

Compare against runtime:

```bash
curl -I "$RUNTIME_URL/healthz"
curl -I "$RUNTIME_URL/api/release"
```

## Treat As Public Docs Incident When

- runtime `/healthz` and `/api/release` are correct
- docs pages serve an old build
- docs DNS points to the wrong host
- legal/security files are missing from docs only

## Treat As Runtime Incident When

- runtime probes fail
- player shell is stale or serving the wrong build
- runtime redirects docs traffic incorrectly
- maintenance blocks operator surfaces
