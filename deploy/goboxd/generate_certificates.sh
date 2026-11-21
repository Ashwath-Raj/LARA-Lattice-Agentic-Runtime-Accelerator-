#!/usr/bin/env bash
# ==============================================================================
# LARA × goboxd: Private PKI & mTLS Certificate Generator
# ==============================================================================
# Generates:
# 1. Internal Root CA (Certificate Authority)
# 2. Server Certificate with SAN (DNS:goboxd.internal, IP:127.0.0.1)
# 3. Client Certificate for LARA Cloud Run Client Authentication
# ==============================================================================

set -euo pipefail

OUT_DIR="${1:-./certs}"
DAYS=365
mkdir -p "${OUT_DIR}"

echo "Generating Internal Root CA..."
openssl req -x509 -new -nodes \
    -keyout "${OUT_DIR}/lara-internal-ca.key" \
    -out "${OUT_DIR}/lara-internal-ca.crt" \
    -days "${DAYS}" \
    -subj "/CN=LARA-Internal-Root-CA/O=LARA-Security/OU=Staging"

echo "Generating Server Key & CSR..."
openssl req -new -nodes \
    -keyout "${OUT_DIR}/goboxd-server.key" \
    -out "${OUT_DIR}/goboxd-server.csr" \
    -subj "/CN=goboxd.internal/O=LARA-Security/OU=Sandbox"

cat <<EOF > "${OUT_DIR}/server_ext.cnf"
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = goboxd.internal
DNS.2 = localhost
IP.1 = 127.0.0.1
EOF

echo "Signing Server Certificate with Root CA..."
openssl x509 -req \
    -in "${OUT_DIR}/goboxd-server.csr" \
    -CA "${OUT_DIR}/lara-internal-ca.crt" \
    -CAkey "${OUT_DIR}/lara-internal-ca.key" \
    -CAcreateserial \
    -out "${OUT_DIR}/goboxd-server.crt" \
    -days "${DAYS}" \
    -extfile "${OUT_DIR}/server_ext.cnf"

echo "Generating Client Key & CSR..."
openssl req -new -nodes \
    -keyout "${OUT_DIR}/lara-client.key" \
    -out "${OUT_DIR}/lara-client.csr" \
    -subj "/CN=lara-runtime-client/O=LARA-Security/OU=Runtime"

cat <<EOF > "${OUT_DIR}/client_ext.cnf"
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = clientAuth
EOF

echo "Signing Client Certificate with Root CA..."
openssl x509 -req \
    -in "${OUT_DIR}/lara-client.csr" \
    -CA "${OUT_DIR}/lara-internal-ca.crt" \
    -CAkey "${OUT_DIR}/lara-internal-ca.key" \
    -CAcreateserial \
    -out "${OUT_DIR}/lara-client.crt" \
    -days "${DAYS}" \
    -extfile "${OUT_DIR}/client_ext.cnf"

# Cleanup CSR and config files
rm -f "${OUT_DIR}/goboxd-server.csr" "${OUT_DIR}/lara-client.csr" "${OUT_DIR}/server_ext.cnf" "${OUT_DIR}/client_ext.cnf" "${OUT_DIR}/lara-internal-ca.srl"

chmod 600 "${OUT_DIR}/"*.key
chmod 644 "${OUT_DIR}/"*.crt

echo "PKI generation complete in ${OUT_DIR}:"
ls -la "${OUT_DIR}"
