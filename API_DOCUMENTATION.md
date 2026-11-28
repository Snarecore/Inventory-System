# Cash Boi — API Documentation ---

> Frontend wiring and implementation guidance must follow the current source
> (`src/config/api.json`, `src/services/`, and `src/hooks/`). Endpoint/backend notes
> below are reference material and should be checked against the live contract before
> being used for new code.

## 1. Frontend API architecture and backend configuration

### 1.1 Backend base URLs

The shared business API client uses `VITE_API_BASE_URL`. CMS, referral, and other
specialized integrations may use their own base URL in the corresponding service.
Keep deployment-specific values in environment configuration; endpoint paths for the
shared API are registered in `src/config/api.json`.

### 1.2 Frontend API architecture

The current frontend request path is:

```
UI component → feature React Query hook → domain service → api-service.ts → fetch
```

`api-service.ts` owns HTTP transport, authentication headers, session-expiry handling,
and consistent HTTP/network errors. Feature services own endpoint selection and
backend-specific payloads. React Query hooks own request state and cache behavior.
Components should use feature hooks rather than call the transport or build endpoint
requests themselves.

### 1.3 কোড-এ এটা কোথায়

| কাজ | ফাইল |
|---|---|
| Endpoint registry | `src/config/api.json` |
| Shared HTTP transport | `src/services/api-service.ts` |
| Feature/domain API requests | `src/services/*-service.ts` |
| Query and mutation state/cache | `src/hooks/` and feature query hooks |
| Org/branch-aware access payload | `src/utils/access-user.ts` |

Use the shared `api-service.ts` functions from a domain service; do not call `fetch`,
`postData`, or other transport functions directly from a UI component. Check existing
feature services and hooks before adding another request path.

### 1.4 Runtime URL resolution

```js
// Relative endpoint: VITE_API_BASE_URL + endpoint path
// Absolute endpoint: used as-is
```

`api-service.ts` normalizes the configured base URL and joins it with relative
endpoint paths. When an endpoint requires another host, pass the service-specific
`baseUrl` rather than rewriting the URL in a component.

---

## 2. Convention — যা প্রতিটা endpoint-এ এক

এই চারটা নিয়ম না জানলে API-টা অদ্ভুত লাগবে। **এগুলো পুরো backend জুড়ে এক।**

### 2.1 প্রায় সবকিছুই POST

Read করার endpoint-ও POST। `/get-dashboard`, `/get-sale-list`, `/get-product-list` —
সবগুলো POST, কারণ `accessUser` body-তে যায়।

**ব্যতিক্রম (GET):**
```
GET  /user-profile/phone/{phone}
GET  /business-profile/phone/{phone}
GET  /invoice-profile-setup/{phone}
GET  /profile/{phone}                      ← ছবি (binary)
GET  /get-employees/{organizationId}
GET  /employee/{employeeId}/branch-permissions
GET  /branch/{branchId}/permissions
GET  /organization/{organizationId}/permissions
GET  /get-sms-package-list
GET  /get-business-types
GET  /get-usertrack-dashboard
GET  /recent-users
GET  /user-feedback
GET  /user-feedback-by-user
GET  /public/* (cms)
DELETE /employee-branch-permissions/{id}
```

> Backend-এ HTTP method দেখে operation বোঝা নাও যেতে পারে; endpoint contract যাচাই
> করে request method নির্ধারণ করুন।

### 2.2 ব্যর্থতার ধরন ও frontend handling

Backend business failure HTTP 200 সহ আসতে পারে; response body-তে `status: "Error"`
থাকলে সেটিও failure:

```json
{ "status": "Success", "msg": "Sale inserted successfully", "...": "..." }
```
```json
{ "status": "Error", "msg": "orgId and branchId are required" }
```

`src/services/api-service.ts` non-2xx HTTP response, network error, এবং session-expiry
পরিস্থিতিতে `ApiServiceError` throw করে; HTTP response-এর `msg` / `message` অক্ষত রাখে।
HTTP 2xx response-এর business-error envelope transport নিজে reject করে না। Mutation
service-এ `assertApiSuccess(response, fallbackMessage)` ব্যবহার করে status/error
envelope-গুলো reject করুন, আর feature hook-এ user feedback দিন. Query result normalize
করার আগে endpoint response shape যাচাই করুন।

### 2.3 Response envelope

| ফিল্ড | সবসময় থাকে | মানে |
|---|---|---|
| `status` | ✅ | `"Success"` বা `"Error"` |
| `msg` | ✅ | মানুষ-পড়ার মতো বার্তা (কখনো বাংলা, কখনো ইংরেজি) |
| payload | ❌ | endpoint-ভেদে নাম আলাদা — `productsList`, `saleList`, `cashBookListDetails`… |

> **ধরাবাঁধা নাম নেই।** `get-product-list` দেয় `productsList`,
> `get-cash-bank-book-summary-details` দেয় `cashBookListDetails` + `cashBookSummary`।
> প্রতিটার আসল নাম Swagger-এর response example-এ আছে — আন্দাজ করবেন না।

### 2.4 Authorization header বাড়তি

`src/services/api-service.ts` stored token থাকলে `Authorization: Bearer <token>` header
যোগ করে। Business endpoint-এ `accessUser` body-ও লাগতে পারে; endpoint contract অনুযায়ী
`buildAccessUser()` ব্যবহার করুন।

---

## 3. `accessUser` — সবচেয়ে গুরুত্বপূর্ণ জিনিস

**itouch-এর প্রায় প্রতিটা POST body-র প্রথম ফিল্ড `accessUser`।** এটা ভুল হলে
400 পাবেন, আর error message-টা সবসময় পরিষ্কার না।

```json
{
  "accessUser": {
    "phone": "01762868864",
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "businessCode": "9917",
    "orgId": 8634,
    "branchId": 8644
  },
  "...বাকি payload": "..."
}
```

| ফিল্ড | টাইপ | বাধ্যতামূলক | কোথা থেকে আসে |
|---|---|---|---|
| `phone` | string | ✅ | login response-এর `phoneNumber` |
| `token` | string | ✅ | login response-এর `token` (JWT) |
| `businessCode` | string | ✅ | login response-এর `businessCode` |
| `orgId` | integer | ✅ **v4-এ** | login response-এর **`organizationId`** ← নাম আলাদা! |
| `branchId` | integer | ✅ **v4-এ** | login response-এর `branchId`, বা ইউজার যে branch বেছেছে |

### 3.1 ⚠️ নামের ফাঁদ: `organizationId` → `orgId`

```
login response দেয়:   organizationId: 8634
request-এ লাগে:        orgId: 8634
```

এই rename-টা `src/context/AuthContext.jsx` করে, আর `src/api/accessUser.js`-এর
`readOrgId()` সব বানান মেনে নেয় (`orgId`, `organizationId`, `org_id`, `organization_id`) —
যাতে ব্যাকএন্ড আবার নাম বদলালে login ভেঙে না পড়ে।

### 3.2 orgId / branchId না দিলে কী হয়

```json
HTTP 200
{ "status": "Error", "msg": "orgId and branchId are required" }
```

**v4-এ প্রায় প্রতিটা endpoint এটা enforce করে। v3 করত না** — তাই পুরনো কোড v3-তে
চললেও v4-এ ভাঙবে।

### 3.3 কোড-এ কীভাবে বানাবেন

**নিজে হাতে বানাবেন না।** `buildAccessUser()` ব্যবহার করুন:

```js
import { buildAccessUser } from "../api/accessUser";

const payload = {
  accessUser: buildAccessUser(),   // localStorage থেকে সব ভরে দেয়
  startDate: "2026-09-01",
  endDate:   "2026-09-30",
};
```

এটা `localStorage`-এর `user_info` blob থেকে পড়ে, না পেলে আলগা key
(`phone`, `token`, `businessCode`) দেখে, আর `branchId` নেয় active branch থেকে।

> **দুই স্তরের সুরক্ষা:** `src/api/api.js`-এর request interceptor **আবারও**
> `buildAccessUser()` চালায় যেকোনো body-র উপর যাতে `accessUser` আছে। তাই পুরনো
> call site বা inline payload-ও org/branch পেয়ে যায়। আপনি explicit যা দেবেন সেটাই টিকবে।

### 3.4 `withBranchScope()` — যখন accessUser যথেষ্ট না

কিছু endpoint `accessUser` থেকে id পড়ে **না**। যাচাই করা উদাহরণ:

```
POST /insert-product   → accessUser.branchId সেট থাকার পরেও
                         400 {"status":"Error","msg":"branchId is required"}
                         কারণ এটা product অবজেক্টের ভিতরে branchId চায়
```

তাই nested payload-এ `withBranchScope()` ব্যবহার করুন:

```js
import { withBranchScope } from "../api/accessUser";

await api.post("/insert-product", {
  accessUser: buildAccessUser(),
  product: withBranchScope({ name, buy_price, sell_price, ... }),
  //        └─ orgId + branchId স্ট্যাম্প করে দেয়
});
```

---

## 4. Authentication flow — পুরো যাত্রা

```
┌──────────────────────────────────────────────────────────────┐
│ 1. POST /user-login                                           │
│    { authentication: { phone_number, password },              │
│      fcm_token, login_version }                               │
│    ← এটাই একমাত্র endpoint যেখানে accessUser যায় না           │
└───────────────────────┬──────────────────────────────────────┘
                        │ response
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ 2. AuthContext (src/context/AuthContext.jsx)                  │
│    • organizationId → orgId  (নাম বদলায়)                      │
│    • localStorage["user_info"] = পুরো blob                    │
│    • localStorage["token"], ["phone"], ["businessCode"]       │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. branches.length > 1 ?                                      │
│    হ্যাঁ → BranchSelectModal দেখাও (বাধ্যতামূলক)              │
│           setActiveBranchId() + markBranchChosen()             │
│    না  → login-এর default branchId-ই চলবে                     │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ 4. এরপর প্রতিটা কল: buildAccessUser() → accessUser            │
└──────────────────────────────────────────────────────────────┘
```

### 4.1 Login request

```http
POST /user-login
Content-Type: application/json
```
```json
{
  "authentication": { "phone_number": "01762868864", "password": "steps123" },
  "fcm_token": "abcd1234xyz",
  "login_version": "1.0.1"
}
```

> `businessCode` / `orgId` / `branchId` **পাঠাতে হয় না** — এগুলো login থেকে *আসে*।

### 4.2 Login response (v4 — লাইভ যাচাই করা)

```json
{
  "status": "Success",
  "msg": "Login successful",
  "phoneNumber": "01762868864",
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "fullName": "সাকিব",
  "accountType": "Business",
  "businessName": "Ma Telecom",
  "businessAddress": null,
  "businessType": "grocery_shop",
  "profileUrl": "http://itouch.stepserp.com/cash-boi-v4/api/profile/01762868864",
  "businessCode": "9917",
  "userRole": "ADMIN",
  "isInventory": "YES",
  "userId": 8943,
  "organizationId": 8634,
  "branchId": 8644,
  "branchType": "MULTIPLE",
  "branches": [
    { "branchId": 8644,  "name": "Ma Telecom",   "code": "MAIN-8634", "address": null,  "phone": "01762868864", "primary": true  },
    { "branchId": 13459, "name": "Ahsan vai UUL","code": "ghh",       "address": "ggg", "phone": "01845995858", "primary": false }
  ]
}
```

ব্যর্থ হলে:
```json
{ "status": "Error", "msg": "Invalid phone number or password" }
```

### 4.3 Multi-branch — যে অংশটা ভুল করা সহজ

* `branchType: "MULTIPLE"` মানে একই org-এ একাধিক branch, ইউজার switch করতে পারবে।
* **`branches[]`-এ login-এর default `branchId` নাও থাকতে পারে** — উপরের উদাহরণে
  আছে, কিন্তু সব অ্যাকাউন্টে না। তাই default-কে list-এর সদস্য ধরে নেবেন না।
* পছন্দ **`localStorage`-এ** রাখা হয় (শুধু React state-এ না), কারণ
  `buildAccessUser()` React-এর বাইরে থেকেও (axios interceptor) ডাকা হয়।

> **⚠️ login-এর `branches[]`-এ নিষ্ক্রিয় branch-ও থাকে।** 2026-08-27-এ যাচাই:
> `active:false` থাকা branch 14428 তবু `/user-login`-এ এসেছিল, আর login payload-এ
> `active` ফ্ল্যাগই নেই। **শুধু `/get-branch-list` `active` দেয়।** তাই branch picker
> `src/api/branches.js` দিয়ে refresh করে নিষ্ক্রিয়গুলো বাদ দেয়। নিজে branch list
> দেখালে একই কাজ করুন, নইলে ইউজার বন্ধ branch বেছে ফেলবে।

| localStorage key | মানে |
|---|---|
| `user_info` | পুরো login response (normalise করা) |
| `active_branch_id` | এখন যে branch-এ কাজ হচ্ছে |
| `branch_choice_made` | ইউজার আসলেই বেছেছে কিনা (default accept নাকি না — পার্থক্য করার জন্য) |
| `token`, `phone`, `businessCode` | fallback আলগা key |

সহায়ক function (সব `src/api/accessUser.js`-এ):

```js
getBranches()            // branches[] normalise করে দেয়
getDefaultBranchId()     // login যেটা দিয়েছিল
getActiveBranchId()      // এখন যেটায় কাজ হচ্ছে (saved choice valid হলে সেটা)
setActiveBranchId(id)    // switch
isMultiBranch()          // branchType === "MULTIPLE" || branches.length > 1
isBranchChoicePending()  // মাল্টি-ব্রাঞ্চ, কিন্তু এখনো বাছেনি → modal দেখাও
```

### 4.4 Token expiry

HTTP **401** এলে `src/api/api.js`-এর response interceptor `localStorage` থেকে
`token` আর `user` মুছে দেয়। refresh-token নেই — আবার login করতে হবে।

---

## 5. Endpoint Reference — কোনটা কোথায় কাজ করে

প্রতিটা টেবিলে:
**Endpoint** → **`src/api/auth.js`-এর function** → **যে স্ক্রিন থেকে ডাকা হয়**।

পূর্ণ request/response body **Swagger-এ** আছে: `http://localhost:7677/api-docs/`

---

### 5.1 Auth & Profile

| Endpoint | M | Function (`auth.js`) | কোথায় ব্যবহার হয় |
|---|---|---|---|
| `/user-login` | POST | `loginUser()` | `pages/Login.jsx` → `context/AuthContext.jsx` |
| `/authorization-check-user` | POST | `authorizationCheckUser()` | `pages/Login.jsx` — ফোন নম্বর আছে কিনা দেখে |
| `/user-profile/phone/{phone}` | GET | `getUserProfile()` | `pages/SubscribePage.jsx` |
| `/business-profile/phone/{phone}` | GET | `getBusinessProfile()` | ইনভয়েস হেডার |
| `/invoice-profile-setup/{phone}` | GET | `getInvoiceProfileSetup()` | `inventory/sales/InvoicePage.jsx` — ইনভয়েসে কোন ফিল্ড দেখাবে |
| `/profile/{phone}` | GET | `getUserProfileImage()` | প্রোফাইল ছবি (**binary, JSON না**) |

> ⚠️ `/authorization-check-user` **Swagger-এ নেই** কিন্তু কোড এটা কল করে। §8 দেখুন।

---

### 5.2 Party — কাস্টমার ও সাপ্লায়ার

| Endpoint | M | Function | কোথায় |
|---|---|---|---|
| `/get-party-info-list` | POST | `getPartyInfoList()` | `CustomerSupplierList.jsx`, বিক্রি/ক্রয় স্ক্রিনের dropdown |
| `/insert-party-info` | POST | `insertPartyInfo()` | `AddParty.jsx` |
| `/party-info-update` | POST | `updatePartyInfo()` | `AddParty.jsx` (edit mode) |

কাস্টমার আর সাপ্লায়ার **একই টেবিলে** — `type` ফিল্ড দিয়ে আলাদা (`CUSTOMER` / `SUPPLIER`)।

---

### 5.3 Product

| Endpoint | M | Function | কোথায় |
|---|---|---|---|
| `/get-product-list` | POST | `getProductList()` | `inventory/product/ProductList.jsx`, বিক্রি/ক্রয় স্ক্রিন |
| `/insert-product` | POST | `insertProduct()` | `inventory/product/AddProduct.jsx` |

> ⚠️ **`/insert-product` `accessUser.branchId` পড়ে না।** `product` অবজেক্টের
> ভিতরে `branchId` লাগে — `withBranchScope(product)` ব্যবহার করুন (§3.4)।

`/get-product-list` response key: **`productsList`**

---

### 5.4 Sales — বিক্রি

| Endpoint | M | Function | কোথায় |
|---|---|---|---|
| `/insert-sales` | POST | `insertSales()` | `inventory/sales/AddSalesPage.jsx`, `SalesConfirm.jsx` |
| `/update-sales` | POST | `updateSales()` | `inventory/report/UpdateSaleReport.jsx` |
| `/get-sale-list` | POST | `getSaleList()` | `inventory/sales/SalesList.jsx`, `Dashboard.jsx` |
| `/get-sale-transaction-report` | POST | `getSaleTransactionReport()` | `inventory/report/SalesReport.jsx` |
| `/get-sales-and-return` | POST | `getSalesAndReturn()` | `SalesList.jsx`, `SalesReturnList.jsx`, `Dashboard.jsx` |

#### `/insert-sales` — সবচেয়ে জটিল payload

```json
{
  "accessUser": { "...": "§3 দেখুন" },
  "invoiceNo": "INV-20260827-0001",
  "customerId": "101",
  "customerName": "Karim Traders",
  "customerPhone": "01911222333",
  "customerAddress": "Mirpur, Dhaka",
  "salesDate": "2026-08-27",

  "totalAmount": 3000,        // ডিসকাউন্ট/ভ্যাটের আগের মোট
  "discount": 0,
  "vat": 0,
  "delivery_charge": 0,
  "grandTotal": 3000,
  "paidAmount": 3000,
  "dueAmount": 0,

  "paymentType": "CASH",      // CASH | CREDIT
  "status": "Paid",           // Paid | Pending | PARTIAL
  "osType": "WEB",
  "note": "",

  "cashReceived": 3000,       // টাকা কীভাবে এলো তার ভাগ
  "cardReceived": 0,
  "mfsReceived": 0,

  "mfsId": null, "mfsName": null, "mfsMethod": null, "mfsPhone": null,
  "bankId": null, "bankName": null, "accountNo": null, "bankAccountName": null,

  "customerPaid": 3000,
  "returnAmount": 0,          // ভাংতি ফেরত — বিক্রি-ফেরত নয়!

  "salesDetails": [
    { "productId": "1201", "productCode": "P-0007", "productName": "চাল ৫০ কেজি",
      "unit": "pcs", "quantity": 2, "sellPrice": 1500, "discount": 0,
      "total": 3000, "status": "PENDING", "advenType": "SALE",
      "vat": 0, "delivery_charge": 0 }
  ]
}
```

**নিয়ম যেগুলো ভুল করা সহজ:**

| নিয়ম | বিস্তারিত |
|---|---|
| `paymentType: "CREDIT"` | `cashReceived`/`cardReceived`/`mfsReceived` সব **0**, আর `dueAmount = grandTotal` |
| `paymentType: "CASH"` | টাকার ভাগ তিনটা ভরতে হবে, যোগফল = `paidAmount` |
| MFS-এ নিলে | `mfsId`, `mfsName`, `mfsMethod`, `mfsPhone` ভরুন |
| কার্ড/ব্যাংকে নিলে | `bankId`, `bankName`, `accountNo`, `bankAccountName` ভরুন |
| `returnAmount` | কাস্টমারকে দেওয়া **ভাংতি** (`customerPaid - grandTotal`), বিক্রি-ফেরত নয় |
| লাইনের `total` | `quantity × sellPrice + quantity × vat − discount` |

> **⚠️ v4-এর জানা bug:** `get-sale-list` এখনো **CREDIT/unpaid বিক্রি বাদ দিয়ে দেয়**।
> বকেয়াসহ পুরো তালিকা দরকার হলে `/get-sales-and-return` ব্যবহার করুন।

---

### 5.5 Sales Return — বিক্রি ফেরত

| Endpoint | M | Function | কোথায় |
|---|---|---|---|
| `/insert-sales-return` | POST | `insertSalesReturn()` | `inventory/sale-return/SalesReturnProcess.jsx` |
| `/get-sales-and-return` | POST | `getSalesAndReturn()` | `SalesReturnList.jsx` |

ফেরতের লাইনে `returnReason` থাকে (`wrong_order`, `damaged`…), আর `refundAmount`
কাস্টমারকে কত ফেরত গেল।

---

### 5.6 Purchase — ক্রয়

| Endpoint | M | Function | কোথায় |
|---|---|---|---|
| `/insert-purchases` | POST | `insertPurchases()` | `inventory/purchase/AddPurchasePage.jsx` |
| `/update-purchases` | POST | `updatePurchases()` | `inventory/report/UpdatePurchaseReport.jsx` |
| `/get-purchase-list` | POST | `getPurchaseList()` | `inventory/report/PurchaseReport.jsx` |
| `/get-purchase-challan-settings` | POST | `getPurchaseChallanSettings()` | `inventory/PurchaseChallanSettings.jsx` |
| `/insert-or-update-purchase-challan-settings` | POST | `insertOrUpdatePurchaseChallanSettings()` | ঐ একই স্ক্রিন |

Sales-এর মতোই, তবে:
* লাইন array-র নাম **`purchaseDetails`** (sales-এ `salesDetails`)
* দাম **`buyPrice`** (sales-এ `sellPrice`)
* `advenType: "PURCHASE"`
* কাস্টমারের বদলে `supplierId` / `supplierName` / `supplierPhone` / `supplierAddress`

চালান সেটিংস = ক্রয়ের ফর্মে কোন ফিল্ডগুলো দেখাবে (challan ref no, গাড়ির নম্বর,
ড্রাইভারের নাম ইত্যাদি) — সব boolean।

---

### 5.7 Collection — কাস্টমারের বকেয়া আদায়

| Endpoint | M | Function | কোথায় |
|---|---|---|---|
| `/customers-due` | POST | `customersDue()` | `Dashboard.jsx`, `collection/AddCollection.jsx` |
| `/customer-invoices-due` | POST | `customerInvoicesDue()` | `AddCollection.jsx` — এক কাস্টমারের বকেয়া ইনভয়েস |
| `/insert-collection` | POST | `insertCollection()` | `collection/AddCollection.jsx` |
| `/get-collection-report` | POST | `getCollectionReport()` | `inventory/report/CollectionReport.jsx` |

আদায়ের প্রবাহ:
```
customers-due            → কার কত বকেয়া
customer-invoices-due    → ওই কাস্টমারের কোন কোন ইনভয়েস বাকি
insert-collection        → কোন ইনভয়েসে কত জমা হলো (collectionDetails[])
```

`insert-collection`-এ `paymentMode` অনুযায়ী nested object লাগে:
`"CASH"` → কিছু না · `"MFS"` → `mfsDetails{}` · `"Bank"` → `bankDetails{}`

> **তারিখের ফরম্যাট সাবধান:** `/get-collection-report` আর `/get-payment-report`
> **`DD-MM-YYYY`** নেয়, কিন্তু `/get-sale-transaction-report` নেয় **`YYYY-MM-DD`**।
> এটা backend-এর অসঙ্গতি — Swagger-এ প্রতিটার example দেখে নিন।

---

### 5.8 Payment — সাপ্লায়ারকে পরিশোধ

| Endpoint | M | Function | কোথায় |
|---|---|---|---|
| `/purchases-due` | POST | `purchaseDue()` | `Dashboard.jsx`, `payment/PaymentList.jsx` |
| `/purchases-invoices-due` | POST | `purchasesInvoicesDue()` | `payment/AddPayment.jsx` |
| `/insert-payment` | POST | `insertPayment()` | `payment/AddPayment.jsx` |
| `/get-payment-report` | POST | `getPaymentReport()` | `inventory/report/PaymentReport.jsx` |

Collection-এর আয়নার প্রতিবিম্ব — শুধু কাস্টমারের বদলে সাপ্লায়ার,
আর টাকা **যায়** (আসে না)।

---

### 5.9 Category — ইনকাম/এক্সপেন্স/ক্যাশ ক্যাটাগরি

| Endpoint | M | Function | কোথায় |
|---|---|---|---|
| `/get-category-list` | POST | `getCategoryInfoList()` | `Category.jsx`, `Income.jsx`, `Expense.jsx` |
| `/insert-category-info` | POST | `insertCategoryInfo()` | `Category.jsx` |
| `/update-category-info` | POST | `updateCategoryInfo()` | `Category.jsx` |
| `/update-category-status` | POST | `updateCategoryStatus()` | `Category.jsx` — Active/Inactive toggle |

`categoryType`: `Income` · `Expense` · `Cash`

---

### 5.10 Bank

| Endpoint | M | Function | কোথায় |
|---|---|---|---|
| `/get-bank-info-list` | POST | `getBankInfoList()` | `BankList.jsx`, `Dashboard.jsx`, `Income.jsx`, `Expense.jsx` |
| `/get-bank-name-list` | POST | `getBankNameList()` | `AddBankAccount.jsx` — ব্যাংকের নামের dropdown |
| `/insert-bank-account` | POST | `insertBankAccount()` | `AddBankAccount.jsx` |

> **দুইটা আলাদা জিনিস:** `get-bank-name-list` = দেশের ব্যাংকগুলোর **master list**
> (AB Bank, DBBL…)। `get-bank-info-list` = **এই ব্যবসার খোলা অ্যাকাউন্টগুলো**, ব্যালেন্সসহ।

---

### 5.11 MFS — bKash / Nagad / Rocket

| Endpoint | M | Function | কোথায় |
|---|---|---|---|
| `/mfs-user-list` | POST | `getMfsUserList()` | `MFSList.jsx`, `Dashboard.jsx` |
| `/insert-mfs-user` | POST | `insertMfsUser()` | `AddMFS.jsx` |
| `/mfs-user-update` | POST | `updateMfsUser()` | `MFSList.jsx` |

---

### 5.12 Finance — ইনকাম, এক্সপেন্স, ট্রান্সফার, ড্যাশবোর্ড

| Endpoint | M | Function | কোথায় |
|---|---|---|---|
| `/insert-financial-transaction` | POST | `insertFinancialTransaction()` | `Income.jsx`, `Expense.jsx`, `Transfer.jsx` |
| `/get-financial-transaction` | POST | `getFinancialTransaction()` | `Transactions.jsx` |
| `/get-expense-summary-details` | POST | `getExpenseSummaryDetails()` | এক্সপেন্স ড্রিলডাউন |
| `/get-dashboard` | POST | `getDashboard()` | `Dashboard.jsx`, `Income.jsx`, `Expense.jsx` |
| `/get-cash-balance-info` | POST | `getCashBalanceInfo()` | `Dashboard.jsx`, `AddSalesPage.jsx`, `AddPurchasePage.jsx` |
| `/get-cash-bank-book-summary-details` | POST | — | `AddSalesPage.jsx` |
| `/customer-ledger` | POST | `customerLedgerReport()` | `inventory/report/CustomerLedgerReport.jsx` |
| `/purchase-ledger` | POST | `purchaseLedgerReport()` | `inventory/report/PurchaseLedgerReport.jsx` |

`insert-financial-transaction`-এর `type`:
```
INCOME    → টাকা আসছে      (categoryId = Income ক্যাটাগরি)
EXPENSE   → টাকা যাচ্ছে     (categoryId = Expense ক্যাটাগরি)
TRANSFER  → এক অ্যাকাউন্ট থেকে অন্যটায় (fromAccount + toAccount লাগে)
```

> ⚠️ `/get-financial-transaction` আর `/get-expense-summary-details`
> **Swagger-এ নেই** কিন্তু কোড কল করে। §8 দেখুন।

---

### 5.13 Branch — মাল্টি-ব্রাঞ্চ

| Endpoint | M | Function | কোথায় |
|---|---|---|---|
| `/get-branch-list` | POST | `getBranchList()` | `AuthContext.jsx`, `BranchSelectModal.jsx`, `branch/BranchList.jsx` |
| `/insert-branch` | POST | `insertBranch()` | `branch/AddBranch.jsx` |
| `/update-branch` | POST | `updateBranch()` | `branch/AddBranch.jsx` (edit) |

---

### 5.14 Employee ও Permission

| Endpoint | M | Function |
|---|---|---|
| `/insert-employees` | POST | `insertEmployee()` |
| `/update-employees/{id}` | POST | `updateEmployee(id, payload)` |
| `/get-employees/{organizationId}` | GET | `getEmployees(orgId)` |
| `/employee-branch-permissions` | POST | `createEmployeeBranchPermission()` |
| `/employee-branch-permissions/{id}/update` | POST | `updateEmployeeBranchPermission(id, …)` |
| `/employee-branch-permissions/{id}` | DELETE | `deleteEmployeeBranchPermission(id)` |
| `/employee/{employeeId}/branch-permissions` | GET | `getEmployeeBranchPermissions()` |
| `/branch/{branchId}/permissions` | GET | — |
| `/organization/{organizationId}/permissions` | GET | `getOrganizationPermissions()` |

স্ক্রিন: `pages/employee/*`

> এখানেই **DELETE** আর **GET** আছে — তাই `api/proxy.js` method pass-through করে,
> POST-এ জোর করে না। নইলে production-এ 405 হতো।

---

### 5.15 SMS ও bKash

| Endpoint | M | Function | কোথায় |
|---|---|---|---|
| `/get-sms-package-list` | GET | `getSmsPackageList()` | `SmsPackageList.jsx` |
| `/bkash/create` | POST | `getBkashPaymentCreated()` | `SubscribePage.jsx` |

---

### 5.16 CMS (public) — আলাদা backend

এগুলো `src/api.js`-এ, `src/api/auth.js`-এ **না**। Base: `CMS_API_BASE`।

| Endpoint | M | কোথায় |
|---|---|---|
| `/public/app-user/exists?mobile=…` | GET | `Login.jsx` — এই নম্বরে অ্যাকাউন্ট আছে? |
| `/public/otp/send` | POST | `Login.jsx` — OTP পাঠাও |
| `/public/pricing?type=BUSINESS` | GET | `Packages.jsx`, `AuthContext.jsx` |
| `/public/user-subscription?userId=…` | GET | `SubscribePage.jsx` |
| `/payment/initiate` | POST | `SubscribeConfirmation.jsx` |

ব্যবহার:
```js
import { publicApi, CASHBOI_CMS_PATHS, CASHBOI_CMS_API_BASE, API } from "../api";

await publicApi.checkAppUserByMobile("01762868864");
await publicApi.sendOtp({ mobile: "01762868864" });
```

> **মনে রাখবেন:** cms ব্রাউজার থেকে সরাসরি কল করা যায় **না** —
> `Origin` header থাকলেই 403। সবসময় `CMS_API_BASE` দিয়ে যান (§1.2)।

---

## 6. মোট হিসাব — কোথায় কী আছে

```
ওয়েব অ্যাপ ব্যবহার করে (Swagger + v4 Postman)       69  ← §5, সবগুলো যাচাই করা
ব্যাকএন্ডে আছে কিন্তু ওয়েব ব্যবহার করে না           71  ← §7.A–7.P, যাচাই করা নেই
অন্য প্রোডাক্টের (iTouch) — ব্যবহার করবেন না          7  ← §7.Q
                                                   ────
এই ডকে মোট                                         147
```

**দুইটা সেট পুরোপুরি মেলে না** — এটা জেনে রাখা দরকার:

```
আপনার Postman collection-এ    ~132 request (~120 unique endpoint)
         │
         ├── ওয়েব অ্যাপও ব্যবহার করে              ~50   ← দুই সোর্সেই আছে
         ├── শুধু collection-এ                     ~70   ← §7
         └── (Swagger-এ আছে, collection-এ নেই)     ~19   ← নিচে
```

Swagger-এ আছে কিন্তু **আপনার collection-এ নেই** এমন ~১৯টা — বেশিরভাগ
branch-permission আর cms-এর endpoint:

```
/get-bank-info-list                      /get-business-types
/get-employees/{organizationId}          /get-sms-package-list
/employee/{employeeId}/branch-permissions
/branch/{branchId}/permissions           /organization/{organizationId}/permissions
/employee-branch-permissions/{id}/update /employee-branch-permissions/{id}  (DELETE)
/get-usertrack-dashboard                 /recent-users
/user-feedback (GET+POST)                /user-feedback-by-user
/profile/{phone}                         /public/app-user/exists
/public/otp/send                         /public/pricing
/public/user-subscription                /payment/initiate
```

> **মানে:** কোনো একটা সোর্সকেই "সম্পূর্ণ" ধরে নেওয়া যাবে না। **ওয়েবের জন্য
> Swagger**, **মোবাইল/নতুন ফিচারের জন্য Postman** — আর দুই জায়গাতেই না থাকলে
> ব্যাকএন্ড টিমকে জিজ্ঞেস করুন।

---

## 7. Backend-only endpoints — Postman-এ আছে, Swagger-এ নেই

> এগুলো আপনার দেওয়া `Cash Boi.postman_collection.json` থেকে।
> **ওয়েব অ্যাপ এগুলো কল করে না** — বেশিরভাগই মোবাইল অ্যাপের ফিচার।
>
> **⚠️ এগুলোর কোনোটাই লাইভ v4-এ যাচাই করা নেই।** Collection-এর অনেক request
> `localhost:8080`-এ পয়েন্ট করা, মানে dev মেশিনে পরীক্ষা করা হয়েছিল।
> ব্যবহার করার আগে ব্যাকএন্ড টিমের সাথে confirm করুন যে এগুলো
> `/cash-boi-v4/api`-তে deploy করা আছে।

### 7.A খাতা (Ledger / Khatabook) — ধার-দেনার হিসাব

মোবাইল অ্যাপের একটা পুরো ফিচার। ওয়েবে এখনো নেই।

| Endpoint | M | কাজ |
|---|---|---|
| `/ledger/person/save` | POST | নতুন ব্যক্তি যোগ (opening দেনা/পাওনাসহ) |
| `/ledger/person/list` | POST | ব্যক্তির তালিকা |
| `/ledger/person/delete` | POST | ব্যক্তি মুছে ফেলা |
| `/ledger/transaction/create` | POST | লেনদেন যোগ |
| `/ledger/transaction/update` | POST | লেনদেন এডিট |
| `/ledger/transaction/list` | POST | লেনদেনের তালিকা (`personId` দিলে একজনের) |
| `/ledger/transaction/delete` | POST | লেনদেন মুছে ফেলা |

```json
// POST /ledger/person/save
{
  "accessUser": { "...": "" },
  "name": "Rahim Uddin", "phone": "01812345678",
  "address": "Mirpur, Dhaka", "email": "rahim@example.com",
  "type": "CUSTOMER", "tag": "regular", "status": "Active",
  "openingDena": 5000,      // আমি তাকে যত দেনা
  "openingPona": 1500,      // সে আমাকে যত পাওনা
  "openingDate": "2026-07-27"
}
```
```json
// POST /ledger/transaction/create
{
  "accessUser": { "...": "" },
  "personId": 2839,
  "transactionType": "PABO",   // PABO | DIBO | OPENING_PONA | OPENING_DENA
  "paymentType": "CASH",       // CASH | BANK | MFS
  "amount": 500.0,
  "note": "",
  "refNo": "TXN-1788065864067",
  "bankAccountNo": "4848855"   // paymentType=BANK হলে
}
```

> **শব্দগুলো:** `PABO` = পাবো (সে আমাকে দেবে) · `DIBO` = দিবো (আমি তাকে দেবো)।
> `OPENING_*` = শুরুর ব্যালেন্স এন্ট্রি।

### 7.B কোটেশন (Quotation)

| Endpoint | M | কাজ |
|---|---|---|
| `/save-quotation` | POST | নতুন কোটেশন |
| `/update-quotation` | POST | এডিট (`id` লাগে) |
| `/view-quotation` | POST | তালিকা |
| `/delete-quotation` | POST | মুছে ফেলা (`id`) |

গঠন `insert-sales`-এর মতো, তবে লাইন array-র নাম **`quotationDetails`**,
আর দাম **`unitPrice`**। বাড়তি: `termsAndConditions`, `signatureName`,
`signatureDesignation`, `localId` (মোবাইলের offline id)।

### 7.C ওয়ার্ক অর্ডার (Work Order)

| Endpoint | M |
|---|---|
| `/save-work-order` | POST |
| `/update-work-order` | POST |
| `/view-work-order` | POST |
| `/delete-work-order` | POST |

কোটেশনের সাপ্লায়ার-সংস্করণ। লাইন array **`workOrderDetails`**,
কাস্টমারের বদলে `supplierId`/`supplierName`/`supplierPhone`,
বাড়তি `orderDate` + `deliveryDate`।

### 7.D বাজারের লিস্ট (Bazar)

| Endpoint | M |
|---|---|
| `/insert-bazar` | POST |
| `/update-bazar` | POST |
| `/view-bazar-list` | POST |
| `/delete-bazar` | POST |

ব্যক্তিগত বাজার-খরচের তালিকা (inventory-র সাথে সম্পর্ক নেই)।
`items[]`-এ `productName`, `amount`, `qty`, `unit`, `childRefNo`।

### 7.E স্টক ও ইনভেন্টরি

| Endpoint | M | কাজ |
|---|---|---|
| `/stock-adjustments-save` | POST | স্টক কমানো/বাড়ানো (`adjustmentType: "IN"\|"OUT"`, `items[]`) |
| `/get-adjust-report` | POST | অ্যাডজাস্টমেন্ট রিপোর্ট (`fromDate`/`toDate`) |
| `/get-purchase-and-return-list` | POST | ক্রয় + ক্রয়-ফেরত একসাথে |

### 7.F বাজেট

| Endpoint | M | কাজ |
|---|---|---|
| `/insert-budget-info` | POST | মাসিক বাজেট (`items[]`-এ `yearmonth: "202601"`, `categoryId`, `amount`) |
| `/get-budget-list` | POST | বাজেটের তালিকা |

### 7.G ক্যাটাগরি — বাড়তি

| Endpoint | M | কাজ |
|---|---|---|
| `/insert-sub-category-info` | POST | সাব-ক্যাটাগরি |
| `/get-income-summary-details` | POST | ইনকাম ড্রিলডাউন (`get-expense-summary-details`-এর জোড়া) |

### 7.H অথেন্টিকেশন, OTP, পাসওয়ার্ড

| Endpoint | M | কাজ |
|---|---|---|
| `/otp-send` | POST | `{ "phone": "01988000842" }` |
| `/otp-verify` | POST | `{ "phone", "otp" }` |
| `/otp-verification` | POST | OTP যাচাইয়ের ফল লগ করা |
| `/user-registition` | POST | **নতুন অ্যাকাউন্ট খোলা** (বানান ভুলটা ব্যাকএন্ডেই আছে) |
| `/reset-password` | POST | `currentPassword` + `newPassword` + `confirmPassword` |
| `/password-change` | POST | উপরেরটার আরেক রূপ (`current_password` snake_case) |
| `/forget-password` | POST | OTP-র পর নতুন পাসওয়ার্ড |
| `/pin-set` | POST | অ্যাপ খোলার PIN |
| `/user-profile/show-pin` | POST | PIN দেখা |
| `/authorization-check` | POST | ফোন নম্বর আছে কিনা |
| `/authorization-check-profile` | POST | প্রোফাইলসহ চেক |

> **`/user-registition`** ওয়েবে নেই — ওয়েবে শুধু login আছে, রেজিস্ট্রেশন
> মোবাইল অ্যাপে। নতুন ইউজার তৈরি করতে চাইলে এটাই লাগবে।

### 7.I প্রোফাইল ও ব্যবসা (লেখার দিক)

Swagger-এ এগুলোর শুধু **পড়ার** (GET) রূপ আছে। লেখার রূপ:

| Endpoint | M | কাজ |
|---|---|---|
| `/user-profile` | POST | ইউজার প্রোফাইল **সেভ** |
| `/update-profile` | POST | নাম/ইমেইল/ব্যবসার তথ্য আপডেট |
| `/business-profile-save` | POST | ব্যবসার প্রোফাইল সেভ (TIN, BIN, trade license…) |
| `/get-businesses-profile` | POST | `{ phone, businessCode }` দিয়ে পড়া |
| `/update-bussiness` | POST | ব্যবসার তথ্য আপডেট (**বানান `bussiness`** — ব্যাকএন্ডেই ভুল) |
| `/invoice-profile-setup-save` | POST | ইনভয়েসে কোন ফিল্ড দেখাবে (সব boolean) |
| `/business-logo-upload` | POST | **multipart/form-data** — `phone` + `file` |

### 7.J সেটিংস ও কনফিগ

| Endpoint | M | কাজ |
|---|---|---|
| `/save-app-settings` | POST | ভাষা, থিম, কারেন্সি, ডেট ফরম্যাট, নোটিফিকেশন |
| `/get-app-settings` | POST | ঐগুলো পড়া |
| `/save-user-config` | POST | **পারমিশন নীতি** — backdate entry/edit, delete, print, export, কত দিন পর্যন্ত |
| `/get-user-config` | POST | ঐগুলো পড়া |
| `/app-more-settings/{accountType}` | GET | `PERSONAL` / `BUSINESS` ভেদে মেনু |
| `/inventory-on-off` | POST | `{ addedBy, isInventory: "YES"\|"NO" }` — ইনভেন্টরি মডিউল চালু/বন্ধ |
| `/branch-data-delete` | POST | ⚠️ **ধ্বংসাত্মক** — branch-এর ডেটা মুছে ফেলে, প্রতিটা টেবিলের জন্য boolean |
| `/admin/backfill-default-categories` | POST | অ্যাডমিন maintenance |

> ⚠️ **`/branch-data-delete` খুব সাবধানে।** `cash_delete`, `sales_delete`,
> `product_delete` … প্রতিটা `true` দিলে ওই ডেটা চলে যায়। undo নেই।

### 7.K স্টাফ (employee-র পুরনো রূপ)

| Endpoint | M |
|---|---|
| `/insert-staff` | POST |
| `/get-staff-list` | POST |

> **`/insert-employees` আর `/insert-staff` আলাদা দুইটা জিনিস।** নতুন কোডে
> `/insert-employees` ব্যবহার করুন — ওটাই v4-এ branch-permission মডেলের সাথে যুক্ত।

### 7.L লেনদেন এডিট ও ডিলিট

| Endpoint | M | কাজ |
|---|---|---|
| `/update-financial-transaction` | POST | income/expense/transfer এডিট (`transactionId` লাগে) |
| `/delete-transaction` | POST | `{ isDelete: "Y", billRefNo }` |
| `/update-bank-account` | POST | ব্যাংক অ্যাকাউন্ট এডিট (`bankId`) |
| `/mfs-user-status-update` | POST | MFS অ্যাকাউন্ট Active/Inactive |
| `/get-receipt-payment` | POST | রসিদ ও পেমেন্টের একত্রিত রিপোর্ট |

> **ওয়েব অ্যাপে এখন income/expense এডিট বা ডিলিট করার উপায় নেই** —
> `/update-financial-transaction` আর `/delete-transaction` যোগ করলে হয়ে যাবে।

### 7.M SMS ও সাবস্ক্রিপশন

| Endpoint | M | কাজ |
|---|---|---|
| `/send-sms-request` | POST | কাস্টমারকে বকেয়ার SMS (`type: "Customer-Dues"`) |
| `/insert-sms-purchase` | POST | SMS প্যাকেজ কেনা |
| `/get-subscription-plans` | GET | প্ল্যানের তালিকা (cms-এর `/public/pricing`-এর itouch সংস্করণ) |
| `http://bulksmsbd.net/api/smsapi` | POST | **বাইরের SMS গেটওয়ে** — আপনার অ্যাপ থেকে ডাকবেন না |

### 7.N ফাইল আপলোড

| Endpoint | M | কাজ |
|---|---|---|
| `/upload` | POST | multipart — `username`, `phoneNumber`, `user`, `file` |
| `/get-image` | POST | `accessUser` দিয়ে ছবি ফেরত |
| `/api/files/upload` | POST | নতুন রূপ — `file`, `category`, `fileRefNo`, `userName`, `subCategory` |

### 7.O ইউজার অ্যাক্টিভিটি

| Endpoint | M | কাজ |
|---|---|---|
| `/user-activity-save` | POST | স্ক্রিন খোলা / বাটন চাপা ট্র্যাক করা (analytics) |

### 7.P CMS — বাড়তি

| Endpoint | M | কাজ |
|---|---|---|
| `/public/force-logout/check?userId=` | GET | অ্যাডমিন কি লগআউট করতে বলেছে? |
| `/public/force-logout/{id}/ack?userId=` | POST | লগআউট হয়েছে — জানানো |
| `/public/notices?userId=&page=&size=` | GET | নোটিশের তালিকা |
| `/public/notices/{id}/read?userId=` | POST | পড়া হিসেবে চিহ্নিত |
| `/cms/api/trial/request` | POST | ট্রায়াল চাওয়া (`userId`, `packageId`, `cycleCode`) |

### 7.Q ⛔ এগুলো Cash Boi-এর না — ব্যবহার করবেন না

Collection-এ আছে, কিন্তু host `http://103.209.43.65:4141/web/itouch/api/` —
এটা **iTouch** নামে আলাদা প্রোডাক্ট (ব্যক্তিগত তথ্য ব্যবস্থাপনা):

```
/insert-passport        /passport-list
/insert-family-member   /family-member-list
/insert-document-info   /get-document-info
```

এছাড়া `/insert-party` (host itouch) — Cash Boi-তে `/insert-party-info` ব্যবহার করুন।

---

## 8. ⚠️ জানা অসঙ্গতি (drift) — ঠিক করা দরকার

এই তিনটা endpoint **কোড কল করে কিন্তু Swagger-এ নেই।** মানে Swagger-কে
সম্পূর্ণ সত্য ধরে নেওয়া যাবে না যতক্ষণ না এগুলো যোগ হয়:

| Endpoint | কোথায় কল হয় | Postman-এ আছে? |
|---|---|---|
| `/authorization-check-user` | `src/api/auth.js:22` → `pages/Login.jsx` | ✅ হ্যাঁ |
| `/get-financial-transaction` | `src/api/auth.js:217` → `pages/Transactions.jsx` | ✅ হ্যাঁ |
| `/get-expense-summary-details` | `src/api/auth.js:212` | ✅ হ্যাঁ |

**করণীয়:** তিনটাই `public/api-docs/openapi.yaml`-এ যোগ করুন
(request/response Postman collection-এ আছে)। তাহলে Swagger আবার ১০০% সত্য হবে।

নিজে যাচাই করার কমান্ড:

```bash
# কোড যে endpoint ডাকে
grep -rhoE 'api\.(post|get)\("/[a-zA-Z0-9/_-]+' --include=*.js --include=*.jsx src/ \
  | sed -E 's/.*"\///' | sort -u > /tmp/called.txt

# Swagger-এ যা documented
grep -oE '^  /[a-zA-Z0-9/_{}-]+' public/api-docs/openapi.yaml \
  | sed 's|^  /||' | sort -u > /tmp/spec.txt

comm -23 /tmp/called.txt /tmp/spec.txt   # কল হয় কিন্তু documented না
```

### 8.1 অন্যান্য জানা সমস্যা

| সমস্যা | বিস্তারিত |
|---|---|
| **sales list CREDIT বাদ দেয়** | v4-এর `/get-sale-list` বকেয়া বিক্রি দেখায় না। `/get-sales-and-return` ব্যবহার করুন |
| **তারিখের ফরম্যাট মেশানো** | কিছু endpoint `DD-MM-YYYY`, কিছু `YYYY-MM-DD`। Swagger-এর example দেখে নিন |
| **`status` ফিল্ডে case মিশ্রিত** | `"Paid"`, `"PENDING"`, `"Pending"` — সব আসে। তুলনার আগে lowercase করুন |
| **বানান ভুল ব্যাকএন্ডেই** | `user-registition`, `update-bussiness`, `advenType` — ঠিক করবেন না, ব্যাকএন্ড এভাবেই চায় |
| **v3 vs v4** | v3 (`/cash-boi/api`) org/branch দেয় না ও enforce করে না। v4 দুটোই করে |

---

## 9. নতুন endpoint যোগ করার নিয়ম

ধরুন `/get-income-summary-details` যোগ করবেন (§7.G)।

### ধাপ ১ — Postman-এ বা curl-এ আগে পরীক্ষা করুন

```bash
curl -s -X POST https://itouch.stepserp.com/cash-boi-v4/api/get-income-summary-details \
  -H 'Content-Type: application/json' \
  -d '{
    "accessUser": {
      "phone":"01988000842","token":"<আসল JWT>",
      "businessCode":"8258","orgId":7013,"branchId":7023
    },
    "startDate":"2026-09-01","endDate":"2026-09-15","categoryId":""
  }' | python3 -m json.tool
```

`status: "Error"` এলে `msg` পড়ুন — সাধারণত `orgId`/`branchId` বা তারিখের ফরম্যাট।

### ধাপ ২ — `src/config/api.json` ও domain service আপডেট করুন

```js
// Add the endpoint to the appropriate section in src/config/api.json.
// In a feature service:
export const getIncomeSummaryDetails = (payload) =>
  postData({ url: apiConfig.finance.incomeSummaryDetailsUrl, body: payload });
```

Service functions own endpoint calls and backend payload/response contracts. Use
`assertApiSuccess` for mutation responses where a business-error envelope must reject.

### ধাপ ৩ — React Query hook ও UI-তে ব্যবহার করুন

```js
export const useIncomeSummaryDetailsQuery = (payload) =>
  useQuery({
    queryKey: [incomeSummaryDetailsQueryKey, payload],
    queryFn: () => getIncomeSummaryDetails(payload),
  });
```

The component consumes the query or mutation hook. Keep request state, cache
invalidation, and user feedback in the feature hook; keep UI markup and business
payload construction in their existing owners unless the service contract requires it.

### ধাপ ৪ — Swagger-এ documented করুন ⚠️ বাদ দেবেন না

`public/api-docs/openapi.yaml`-এ যোগ করুন। প্যাটার্ন:

```yaml
  /get-income-summary-details:
    post:
      tags: [Finance]
      summary: ইনকামের বিস্তারিত
      description: |
        **কল হয়:** `pages/Income.jsx` → `getIncomeSummaryDetails()` (src/api/auth.js)
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [accessUser, startDate, endDate]
              properties:
                accessUser: { $ref: '#/components/schemas/AccessUser' }
                startDate: { type: string, example: "2026-09-01" }
                endDate:   { type: string, example: "2026-09-15" }
                categoryId: { type: string, example: "" }
      responses:
        "200":
          description: ...
          content:
            application/json:
              example:
                status: "Success"
                # ← ধাপ ১-এর আসল response এখানে পেস্ট করুন
```

> **`**কল হয়:**` লাইনটা লিখতে ভুলবেন না।** এটাই এই spec-কে বাকি সব API doc
> থেকে আলাদা করে — পরের ডেভেলপার endpoint দেখে সরাসরি কোডে পৌঁছাতে পারে।

সংরক্ষণ করলেই refresh-এ দেখা যাবে — spec প্রতি request-এ নতুন করে render হয়।

### ধাপ ৫ — production proxy চেক করুন

`api/proxy.js` endpoint নাম pass-through করে, তাই সাধারণত কিছু করতে হয় না।
তবে:
* method **GET/DELETE** হলে body যাবে না — ঠিক আছে
* endpoint-এ `..` থাকলে `isSafeEndpoint()` আটকাবে

---

## 10. সমস্যা সমাধান (Troubleshooting)

| লক্ষণ | কারণ | সমাধান |
|---|---|---|
| `{"status":"Error","msg":"orgId and branchId are required"}` | `accessUser`-এ id নেই | `buildAccessUser()` ব্যবহার করুন। login কি `organizationId` দিয়েছে চেক করুন |
| `{"status":"Error","msg":"branchId is required"}` অথচ accessUser-এ আছে | endpoint nested object-এ id চায় | `withBranchScope(payload)` (§3.4) |
| HTTP **400**, সোজা `catch`-এ গেল | কিছু endpoint 400 দিয়ে refusal জানায় | `apiErrorMessage(err, fallback)` দিয়ে আসল `msg` দেখান (§2.2) |
| `NonUniqueResultException` | একই ফোনে দুইটা party row | duplicate party মার্জ করুন (§2.2) |
| branch picker-এ বন্ধ branch দেখাচ্ছে | login-এর `branches[]` নিষ্ক্রিয়গুলোও দেয় | `/get-branch-list` দিয়ে refresh করুন (§4.3) |
| `403 Invalid CORS request` | cms-কে সরাসরি কল করছেন | `CMS_API_BASE` দিয়ে যান (§1.2) |
| `405 Method not allowed` (production-এ, dev-এ ঠিক) | proxy method পাঠায়নি | `api/proxy.js`-এর `ALLOWED_METHODS` দেখুন |
| `[config] VITE_API_BASE_URL is missing` | `.env.local` নেই/অসম্পূর্ণ | `cp .env.example .env.local` → ভরুন → `./scripts/stop.sh && ./scripts/run.sh` |
| লগইন হয়, কিন্তু সব কল 400 | v3 backend (org/branch দেয় না) | `.env.local`-এ `/cash-boi-v4/api` দিন |
| ড্যাশবোর্ড সেভের পর আপডেট হয় না | write detect হয়নি | endpoint নামে `insert`/`update` আছে? (§2.1) |
| 401 → হঠাৎ লগআউট | token expire | আবার login — refresh token নেই |
| বকেয়া বিক্রি তালিকায় নেই | v4-এর `get-sale-list` bug | `/get-sales-and-return` ব্যবহার করুন |

---

## 11. দ্রুত শুরু (Quick Start)

```bash
# ১. সেটআপ
cp .env.example .env.local      # তিনটা URL ভরুন
npm install

# ২. চালান
./scripts/run.sh                # অথবা: npm run dev

# ৩. খুলুন
#    অ্যাপ    → http://localhost:7677
#    Swagger → http://localhost:7677/api-docs/
```

### একনজরে ফাইলগুলো

```
src/
├── config.js              ← সব backend URL-এর একমাত্র জায়গা
├── api-prefixes.js        ← dev proxy prefix
├── api.js                 ← cashboi-cms (OTP, pricing, subscription)
├── api/
│   ├── api.js             ← axios instance + interceptor  ★ এখান থেকে পড়া শুরু করুন
│   ├── accessUser.js      ← accessUser + branch state     ★ তারপর এটা
│   ├── auth.js            ← itouch-এর সব function         ★ তারপর এটা
│   ├── balances.js        ← ক্যাশ + ব্যাংক + MFS — তিন ব্যালেন্স এক জায়গায়
│   ├── branches.js        ← branch list "সৎ" রাখে (নিষ্ক্রিয়গুলো বাদ দেয়)
│   ├── employees.js       ← employee payload shaping (reportingManagerId=0 ফাঁদ)
│   ├── financialTransaction.js ← income/expense/transfer পোস্টের একমাত্র জায়গা
│   ├── openingBalance.js  ← opening balance বনাম আসল বিক্রি/ক্রয় আলাদা করে
│   ├── saleInvoice.js     ← get-sales-and-return row → ইনভয়েস স্ক্রিনের আকার
│   ├── pricing.js         ← /public/pricing ক্যাশিং (ওটা ২–৭ সেকেন্ড নেয়)
│   └── errorMessage.js    ← rejected call-এর ভিতর থেকে ব্যাকএন্ডের বার্তা টানে ★
├── context/AuthContext.jsx  ← login response normalise + সংরক্ষণ
└── pages/                   ← স্ক্রিন

api/                        ← Vercel serverless (production proxy)
├── proxy.js                ← itouch
├── cms/[...path].js        ← cashboi-cms
└── _cors.js                ← origin policy + isSafeEndpoint()

public/api-docs/openapi.yaml ← Swagger spec (template)
scripts/api-docs-spec.js     ← .env.local থেকে server list বসায়
```

### পড়ার ক্রম (নতুন ডেভেলপারের জন্য)

```
1. এই ডকের §1–§4          আর্কিটেকচার, convention, accessUser, auth flow
2. src/config.js            URL কোথা থেকে আসে
3. src/api/api.js           প্রতিটা কলের সাথে কী হয়
4. src/api/accessUser.js    accessUser + branch
5. src/api/auth.js          সব endpoint এক জায়গায়
6. Swagger UI               যে endpoint নিয়ে কাজ করবেন তার body
7. একটা পেজ, যেমন           pages/inventory/sales/AddSalesPage.jsx
                            (সবচেয়ে জটিলটা — সব প্যাটার্ন একসাথে দেখা যায়)
```

---

## 12. রেফারেন্স

| কী | কোথায় |
|---|---|
| **Swagger UI (লাইভ)** | `http://localhost:7677/api-docs/` |
| Swagger spec | `public/api-docs/openapi.yaml` |
| Postman — ওয়েব অ্যাপের ৬৯টা | `cash-boi-v4.postman_collection.json` |
| Postman — ব্যাকএন্ডের পুরোটা | `Cash Boi.postman_collection.json` (আপনার দেওয়া) |
| ব্যাকএন্ড টিমের নিজের নোট | `apiall.md` |
| CORS সমস্যা | `JAVA_SPRINGBOOT_CORS_FIX.md`, `BACKEND_CORS_REQUIRED.md` |
| ডিপ্লয়মেন্ট | `DEPLOYMENT.md`, `DEPLOYMENT_CHECKLIST.md` |

---

*সর্বশেষ যাচাই: 2026-10-01 · backend: `cash-boi-v4` · spec: ৬৯ endpoint · Postman: ~১৩০ request*
