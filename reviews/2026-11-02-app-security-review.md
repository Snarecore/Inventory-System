# Application Security Review: Cash-Boi

Date: 2026-11-02. Skill: `app-security-review`.

## Executive summary

- **Overall state:** The frontend SPA codebase benefits from React's default JSX output escaping and avoids raw HTML injection sinks (`dangerouslySetInnerHTML`), but exhibits critical credential exposure risks including a git-tracked `.env` file and plaintext user PIN storage in browser `localStorage`.
- **Top 3 risks:**
  1. Production `.env` file tracked in version control repository.
  2. Plaintext user PIN stored in browser `localStorage` under `user_info`.
  3. Direct DOM interpolation via `innerHTML` into `printWindow.document.write` in invoice printing.
- **Total est. $/mo:** n/a

## Inputs used / missing

- **Used:**
  - Full static code analysis of repository (`src/`, configuration, routing, and utilities).
  - Git file tracking inspection (`git ls-files`).
  - `npm audit --omit=dev` runtime vulnerability scan on lockfile.
- **Missing:**
  - Backend API repository source code (cash-boi v4 server endpoints, controllers, and database models).
  - Runtime execution logs and production server HTTP response headers (Content-Security-Policy, Strict-Transport-Security, Set-Cookie attributes).

## Findings

### [Critical] Tracked `.env` File in Version Control

**Evidence**: `git ls-files .env*` returns `.env`. The repository `.gitignore` file (lines 1-25) contains rules for logs, `node_modules`, and editor settings, but completely lacks ignore patterns for `.env` files.

**Exploit**: Any collaborator, CI/CD runner, compromised developer machine, or third party with clone access to the git repository can read the tracked `.env` file and retrieve environment variables and API endpoint secrets.

**Why it matters**: Environment configuration files often contain sensitive API host configurations, service keys, or environment secrets. Once committed into git history, credentials are permanently recorded until rotated and stripped with history rewriting tools.

**Fix**:

```diff
# .gitignore
+ .env
+ .env.*
+ !.env.example
```

Remove the file from tracking while preserving the local copy:
```sh
git rm --cached .env
git commit -m "chore: stop tracking .env file"
```

**Est. $/mo**: n/a

---

### [Critical] Plaintext User PIN Stored in Browser `localStorage`

**Evidence**: In [src/utils/auth-storage.ts](file:///c:/webens/Cash-Boi/src/utils/auth-storage.ts#L130-L143):
```ts
const userInfo: UserInfo = {
    phone: data.phoneNumber,
    phoneNumber: data.phoneNumber,
    token: data.token,
    pin: data.pin,
    ...
};
setUserInfo(userInfo, rememberMe);
```
where `setUserInfo` invokes `localStorage.setItem("user_info", JSON.stringify(info))`.

**Exploit**: An attacker leveraging an XSS flaw, an untrusted third-party NPM package, or a rogue browser extension on the user's browser runs `localStorage.getItem("user_info")` or `sessionStorage.getItem("user_info")` to harvest the user's plaintext login/transaction PIN directly.

**Why it matters**: PINs are strictly secret credentials intended only for transient authentication verification. Storing credentials at rest in unencrypted browser storage compromises account security and transaction authorization.

**Fix**:

```diff
--- a/src/utils/auth-storage.ts
+++ b/src/utils/auth-storage.ts
@@ -131,7 +131,6 @@ export function saveLoginSession(data: LoginSuccessResponse, rememberMe = true):
         phone: data.phoneNumber,
         phoneNumber: data.phoneNumber,
         token: data.token,
-        pin: data.pin,
         fullName: data.fullName,
         businessName: data.businessName,
```

**Est. $/mo**: n/a

---

### [High] Unescaped DOM HTML Injection in Invoice Printing Flow

**Evidence**: In [src/components/invoice/TradeInvoiceModal.tsx](file:///c:/webens/Cash-Boi/src/components/invoice/TradeInvoiceModal.tsx#L186-L245):
```ts
const printContent = printRef.current.innerHTML;
const printWindow = window.open("", "_blank", "width=880,height=960");
...
printWindow.document.write(`
  <!DOCTYPE html>
  <html>
    ...
    <body>
      ${printContent}
    </body>
  </html>
`);
```

**Exploit**: When viewing and printing an invoice with party details, notes, product descriptions, or return remarks containing crafted HTML/script sequences, reading `printRef.current.innerHTML` and interpolating it into `printWindow.document.write` renders and executes the markup in a new document context under the origin.

**Why it matters**: Injecting unsanitized innerHTML directly into a new window document bypasses React's virtual DOM escaping guarantees and creates an execution path for stored cross-site scripting (XSS).

**Fix**:
Use a dedicated `@media print` CSS stylesheet with `window.print()` directly on the active document instead of popup `document.write(innerHTML)`, or sanitize the extracted HTML using an allow-list sanitizer before writing:

```diff
--- a/src/components/invoice/TradeInvoiceModal.tsx
+++ b/src/components/invoice/TradeInvoiceModal.tsx
@@ -188,7 +188,7 @@ export const TradeInvoiceModal: React.FC<TradeInvoiceModalProps> = ({
     const printWindow = window.open("", "_blank", "width=880,height=960");
     if (!printWindow) {
       window.print();
       return;
     }
+    // Prefer native document printing via hidden iframe or window.print() with @media print
```

**Est. $/mo**: n/a

---

### [High] Insecure Role and Scope Defaulting (`role || "admin"`, `orgId: 1`)

**Evidence**: 
1. In [src/utils/auth-storage.ts](file:///c:/webens/Cash-Boi/src/utils/auth-storage.ts#L28):
```ts
return {
    id: parsed.id || "",
    name: parsed.name || "",
    email: parsed.email || "",
    role: parsed.role || "admin"
};
```
2. In [src/utils/access-user.ts](file:///c:/webens/Cash-Boi/src/utils/access-user.ts#L20-L22):
```ts
const orgId = rawOrg !== undefined && rawOrg !== null && !isNaN(Number(rawOrg)) ? Number(rawOrg) : 1;
const branchId = rawBranch !== undefined && rawBranch !== null && !isNaN(Number(rawBranch)) ? Number(rawBranch) : 1;
```

**Exploit**: If a session payload is parsed with a missing or null role, the client code automatically assigns `role: "admin"` to the session user object, granting immediate administrative UI access. Similarly, missing organization IDs default to `1`, causing requests to target organization 1's records.

**Why it matters**: Fallback to high-privilege defaults violates the fail-closed security principle. If role or tenancy identifiers are absent, authentication must fail and reject access.

**Fix**:

```diff
--- a/src/utils/auth-storage.ts
+++ b/src/utils/auth-storage.ts
@@ -25,7 +25,7 @@ export function getStoredUser(): User | null {
             id: parsed.id || "",
             name: parsed.name || "",
             email: parsed.email || "",
-            role: parsed.role || "admin"
+            role: parsed.role || "user"
         };
```

**Est. $/mo**: n/a

---

### [Medium] Known Vulnerabilities in Runtime Dependency `xlsx`

**Evidence**: `npm audit --omit=dev` reports 7 vulnerabilities across the dependency tree, including `xlsx@*` (used in [src/utils/excel-export.ts](file:///c:/webens/Cash-Boi/src/utils/excel-export.ts#L1)):
- GHSA-4r6h-8v6p-xvw6 (Prototype Pollution in sheetJS)
- GHSA-5pgg-2g8v-p4x9 (Regular Expression Denial of Service)

**Exploit**: While Cash-Boi currently invokes `json_to_sheet` and `writeFile` for client-side exporting rather than parsing untrusted files, the package is unmaintained on the public npm registry and carries unfixed vulnerabilities.

**Why it matters**: Unmaintained libraries containing prototype pollution bugs pose persistent supply-chain risks and fail automated security audits.

**Fix**:
Migrate spreadsheet exports to modern, actively maintained libraries such as `exceljs` or `write-excel-file`.

**Est. $/mo**: n/a

## Worth hardening

- **Token Storage Strategy**: Migrate access tokens from `localStorage` / `sessionStorage` to `HttpOnly`, `Secure`, `SameSite=Lax` cookies set by the backend server to immunize the application against token theft via XSS.
- **Fail-Closed API Response Handling**: `src/services/api-service.ts` returns `{ error: true }` objects on HTTP failures rather than rejecting the promise. Centralize error throwing or Result typing so callers cannot accidentally treat failed API mutations as successful executions.
- **Content Security Policy (CSP)**: Configure web server / CDN response headers (`Content-Security-Policy: default-src 'self'; script-src 'self' ...`) to prevent execution of unauthorized scripts and restriction of outbound network connections.

## Reviewed, found clean

- **Raw HTML Sinks**: No usages of React's `dangerouslySetInnerHTML`, `v-html`, or `eval()` inside client application components.
- **Secret Keys in Source**: No hardcoded API private keys, AWS access keys, or bearer tokens found in source code files (`src/**`).
- **CSRF Risk**: Application communicates via stateless JSON REST APIs authenticating requests with `Authorization: Bearer <token>` headers, preventing cross-site form post forgery.

## Commands for you to run

Untrack the `.env` file and enforce ignore rules:
```sh
git rm --cached .env
git add .gitignore
git commit -m "fix(security): untrack .env and update gitignore"
```

Audit non-dev dependencies for any newly reported advisories:
```sh
npm audit --omit=dev
```

---

Reviewed with RayStack by Harun R. Rayhan. For a hands-on audit: https://harun.dev/consultation
