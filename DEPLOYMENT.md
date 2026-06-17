# OpsDash Deployment Guide

## Vercel Deployment with PostgreSQL (DigitalOcean or Self-Hosted)

This guide explains how to deploy OpsDash to Vercel with a PostgreSQL database using proper SSL/TLS certificate validation.

## Environment Variables

You must set the following environment variables in your Vercel project:

### 1. DATABASE_URL (Required)
Your PostgreSQL connection string. Do NOT include `sslmode` parameter - SSL is controlled via the `ssl` config object in Node.js code.

**Format:**
```
postgresql://username:password@host:port/database
```

**Example (DigitalOcean):**
```
postgresql://doadmin:your-password@db-postgresql-blr1-25361-do-user-26687505-0.h.db.ondigitalocean.com:25060/defaultdb
```

**Note:** Do NOT append `?sslmode=require` - the application handles SSL via environment variables.

### 2. PG_CA_CERT (Required for SSL)
The full PEM content of your PostgreSQL CA certificate for SSL validation.

**How to get your CA certificate:**

For DigitalOcean Managed Databases:
1. Go to your Managed Databases dashboard
2. Select your PostgreSQL cluster
3. Download the CA certificate file
4. Open the `.crt` file and copy the entire content (including `-----BEGIN CERTIFICATE-----` and `-----END CERTIFICATE-----`)

**How to set in Vercel:**
1. Go to your Vercel project settings
2. Navigate to Environment Variables
3. Click "Add New"
4. Name: `PG_CA_CERT`
5. Value: Paste the entire certificate content (multiline PEM is supported)

**Formats accepted:**
- Raw PEM with actual newlines (copy-paste from certificate file directly)
- PEM with escaped newlines (`\n` sequences will be converted automatically)

### 3. PG_CA_CERT_PATH (Alternative for Self-Hosted)
If running on your own server, you can specify a file path to the CA certificate instead of an environment variable.

**Format:**
```
/path/to/ca-cert.pem
```

**Note:** Either `PG_CA_CERT` or `PG_CA_CERT_PATH` is required in production. `PG_CA_CERT` takes precedence if both are set.

### 4. JWT_SECRET (Required)
A random secret string used to sign JWT authentication tokens.

**Generate a secure secret:**
```bash
openssl rand -base64 32
```

**Minimum:** 32 characters
**Recommended:** 64+ characters

## Database Schema

The application uses the following PostgreSQL schema:

```sql
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL DEFAULT '',
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  license_start DATE NOT NULL,
  license_end DATE NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
```

The schema is automatically created on first login attempt via the `/api/auth/login` endpoint.

## Creating the First Admin User

Since the database auto-initializes on first request, you can create an admin via the signup page:

1. Navigate to `/signup`
2. Enter your details (name, email, password)
3. Submit the form
4. Your account is created as pending approval

Alternatively, create an admin directly via SQL (after tables are created):

```sql
-- Hash "Admin@123456" with bcryptjs (rounds: 12)
-- Hash value: $2a$12$veryLongHashValueHere
INSERT INTO users (name, email, password_hash, role, status, license_start, license_end, created_at, updated_at)
VALUES (
  'Admin',
  'admin@opsdash.local',
  '$2a$12$veryLongHashValueHere',
  'admin',
  'approved',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '30 days',
  NOW(),
  NOW()
);
```

To generate a bcryptjs hash for a password, use Node.js:
```javascript
const bcrypt = require('bcryptjs');
const password = 'Admin@123456';
const hash = bcrypt.hashSync(password, 12);
console.log(hash);
```

## Runtime Configuration

All database-accessing API routes use `export const runtime = "nodejs"` to ensure they run on Node.js Runtime (not Edge Runtime) for proper TLS/SSL certificate handling.

Configured routes:
- `/api/auth/login`
- `/api/auth/signup`
- `/api/auth/me`
- `/api/auth/logout`
- `/api/admin/users`
- `/api/admin/users/[id]`
- `/api/admin/bulk-create`

## SSL/TLS Certificate Handling

The application implements robust SSL certificate validation:

**Production Mode:**
- Requires `PG_CA_CERT` or `PG_CA_CERT_PATH` environment variable
- Validates certificate chain with `rejectUnauthorized: true`
- Connection fails if certificate validation fails

**Development Mode:**
- If neither CA cert variable is set and `NODE_ENV === "development"`
- Allows self-signed certificates with `rejectUnauthorized: false`

**Key Logic:**
```typescript
if (pgCaCert) {
  // Use CA cert from env var
  sslConfig = { ca: caContent, rejectUnauthorized: true }
} else if (pgCaCertPath) {
  // Use CA cert from file
  sslConfig = { ca: fsReadFileSync(pgCaCertPath), rejectUnauthorized: true }
} else if (isDevelopment) {
  // Dev mode: allow self-signed
  sslConfig = { rejectUnauthorized: false }
} else {
  // Prod mode: error
  throw new Error('Certificate required')
}
```

## Network Configuration

### DigitalOcean Trusted Sources

For DigitalOcean Managed Databases, configure Trusted Sources to allow Vercel:

1. Go to your DigitalOcean cluster settings
2. Under "Connection Details", click "Trusted Sources"
3. Add Vercel's IP ranges (or set to "Allow All" temporarily for testing)

Vercel IP ranges: https://vercel.com/docs/concepts/edge-network/regions-and-edge-middleware

## Troubleshooting

### "self-signed certificate in certificate chain"
- Verify `PG_CA_CERT` environment variable is set correctly
- Check that the certificate content is complete (includes `-----BEGIN/END CERTIFICATE-----`)
- Ensure certificate hasn't been truncated in Vercel dashboard
- Try copying the certificate again from your database provider

### "ECONNREFUSED" or "Database connection failed"
- Verify `DATABASE_URL` is correct
- Check database server is running and accessible
- For DigitalOcean: ensure Vercel's IP is added to Trusted Sources
- Verify firewall/security rules allow outbound connections

### "Email already registered" on signup
- Tables were successfully created
- Try logging in instead, or use a different email for signup

### Blank page or 502 error
- Check Vercel Deployment logs
- Verify all three env vars are set correctly
- Wait 30 seconds for deployment to fully initialize

## Support

For issues, check:
1. Server logs in Vercel Deployments tab
2. Build logs in Vercel Build Output
3. Ensure all environment variables are set in Vercel project settings
