# Application Security Review: Cash-Boi

Date: 2026-11-03. Skill: `app-security-review`.

## Executive summary

- **Overall state:** The frontend application codebase relies on React's automatic JSX encoding and avoids raw `dangerouslySetInnerHTML` sinks, but continues to expose sensitive secrets through a git-tracked `.env` configuration file, stores user PINs in plaintext in browser `localStorage`, and has unpatched critical CVEs in production dependencies.
- **Top 3 risks:**
  1. Git repository tracks production `.env` configuration file.
  2. Plaintext user PIN stored in browser `localStorage` under `user_info`.
  3. Critical CVEs identified in non-dev dependencies (`seroval` and `follow-redirects`).
- **Total est. $/mo:** n/a

## Inputs used / missing

- **Used:**
  - Static code analysis of frontend repository (`src/`, configuration, routing, and services).
  - Git repository tracking inspection (`git ls-files .env*`).
  - Production dependency audit (`npm audit --omit=dev`).
  - Git commit inspection of latest additions (`src/pages/admin/sms/`, `src/services/sms-service.ts`).
- **Missing:**
  - Backend server API repository source code (cash-boi v4 server endpoints, controllers, and models).
  - Production HTTP response headers (Content-Security-Policy, Strict-Transport-Security, Set-Cookie attributes).

## Findings

### [Critical] Tracked `.env` File in Version Control

**Evidence**: `git ls-files .env*` returns `.env`. The repository `.gitignore` completely lacks ignore rules for `.env` files, and recent commit `e11dc41` updated `.env` directly in version control.

**Exploit**: Any collaborator, CI runner, developer machine, or attacker gaining clone or read access to the git repository can view API base URLs, service credentials, and backend configuration from commit history.

**Why it matters**: Configuration files should never be committed into version control. Once checked in, credentials and internal topology remain accessible in git history until rotated and expunged with git rewriting utilities.

**Fix**:

```diff
# .gitignore
+ .env
+ .env.*
+ !.env.example
```

Untrack the file from version control while preserving the local copy:
```sh
git rm --cached .env
git commit -m "chore: untrack .env file"
```

**Est. $/mo**: n/a

---

### [Critical] Plaintext User PIN Stored in Browser `localStorage`

**Evidence**: In `src/utils/auth-storage.ts` (lines 130-143):
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

**Exploit**: An attacker leveraging any client script execution vector, rogue browser extension, or third-party dependency executes `localStorage.getItem("user_info")` to extract the user's plaintext authentication and transaction authorization PIN.

**Why it matters**: PINs and passwords are authentication secrets intended only for transit during the login handshake. Storing credentials at rest in unencrypted browser storage enables immediate credential harvesting.

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

### [Critical] Critical CVEs in Production Dependencies

**Evidence**: `npm audit --omit=dev` reports 7 vulnerabilities (2 critical, 3 high, 2 low):
- `seroval` (<=1.6.9): Critical GHSA-p6vx-979v-rg4c, GHSA-9wx9-5pv9-3349 (Script injection through RegExp sources and unauthenticated event-loop DoS).
- `follow-redirects` (1.16.0 - 1.16.1): High GHSA-mrwp-f3q8-3g9p (Cross-realm sensitiveHeaders discarded on redirects).
- `xlsx` (*): High GHSA-4r6h-8v6p-xvw6 (Prototype pollution in SheetJS).

**Exploit**: An attacker sending crafted serialized payloads or triggering malicious redirects can cause denial-of-service, object prototype corruption, or credential leakage over redirects.

**Why it matters**: Production dependencies with published exploits expose end-user browsers to client denial of service and script injection vulnerabilities.

**Fix**:

```sh
npm audit fix
```

For `xlsx`, evaluate migrating to modern maintained libraries like `exceljs` or offloading workbook generation to the backend.

**Est. $/mo**: n/a

---

### [High] Unescaped DOM HTML Injection in Invoice Printing Flow

**Evidence**: In `src/components/invoice/TradeInvoiceModal.tsx` (lines 187-245):
```ts
const printContent = printRef.current.innerHTML;
...
printWindow.document.write(`
  <!DOCTYPE html>
  <html>
    ...
    <div class="a4-container">
      ${printContent}
    </div>
`);
```

**Exploit**: An attacker who introduces malicious markup into party names, item descriptions, or transaction notes can execute arbitrary JavaScript in the context of the opened print window when an admin previews or prints an invoice.

**Why it matters**: Direct string interpolation of `innerHTML` into `document.write` bypasses React's virtual DOM escaping.

**Fix**:

```diff
--- a/src/components/invoice/TradeInvoiceModal.tsx
+++ b/src/components/invoice/TradeInvoiceModal.tsx
@@ -185,6 +185,8 @@ export const TradeInvoiceModal: React.FC<TradeInvoiceModalProps> = ({
   const handlePrint = () => {
     if (!printRef.current) return;
-    const printContent = printRef.current.innerHTML;
+    // Trigger browser print using CSS @media print rather than document.write
+    window.print();
   };
```

**Est. $/mo**: n/a

---

### [Medium] Unvalidated Payment Gateway Redirect Navigation

**Evidence**: In `src/services/sms-service.ts` (lines 58-65) and SMS bundle checkout flows:
The application consumes `res?.redirectUrl` directly from the CMS API response and performs browser navigation (`window.location.href = redirectUrl`) without verifying that the hostname matches the expected payment gateway domain.

**Exploit**: If the backend response is spoofed or manipulated, the user is silently redirected to an arbitrary external phishing domain imitating the payment gateway.

**Why it matters**: Client-side URL redirections should be validated against an allowlist of trusted payment processor hostnames.

**Fix**:

```diff
--- a/src/services/sms-service.ts
+++ b/src/services/sms-service.ts
@@ -58,6 +58,15 @@ export async function purchaseSmsBundle(payload: SmsBundlePurchasePayload): Prom
     if (!res?.redirectUrl) {
       return {
         success: false,
         message: res?.errorMessage ?? "Payment gateway link not received. Please try again.",
         data: res,
       };
     }
+    try {
+      const url = new URL(res.redirectUrl);
+      if (!url.hostname.endsWith("shurjopay.com") && !url.hostname.endsWith("sslcommerz.com")) {
+        return { success: false, message: "Untrusted payment redirect domain." };
+      }
+    } catch {
+      return { success: false, message: "Invalid payment URL." };
+    }
```

**Est. $/mo**: n/a

## Worth hardening

- **Cookie-based Token Storage**: Transition JWT storage from `localStorage` to `HttpOnly`, `SameSite=Strict`, `Secure` cookies to protect against token theft via XSS.
- **Content Security Policy (CSP)**: Configure web server / CDN response headers (`Content-Security-Policy: default-src 'self'; script-src 'self' ...`) to prevent execution of unauthorized scripts.
- **Schema Validation on Incoming API Data**: Use Zod to validate API response payloads to safeguard against unexpected shapes and prototype pollution.

## Reviewed, found clean

- **React Template Escaping**: No raw HTML sinks (`dangerouslySetInnerHTML`, `v-html`, or `eval()`) in React components under `src/`.
- **Source Code Secrets**: No hardcoded API keys, private tokens, or cloud secrets in `src/**`.
- **CSRF Risk**: State-modifying requests use JSON APIs authenticating via `Authorization: Bearer <token>` headers, preventing cross-site form submission forgery.

## Commands for you to run

Untrack the `.env` file and enforce ignore rules:
```sh
git rm --cached .env
git add .gitignore
git commit -m "fix(security): untrack .env and update gitignore"
```

Audit and patch dependencies:
```sh
npm audit fix
```

---

Reviewed with RayStack by Harun R. Rayhan. For a hands-on audit: https://harun.dev/consultation
