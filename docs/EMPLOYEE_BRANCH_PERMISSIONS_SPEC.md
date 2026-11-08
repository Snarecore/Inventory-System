# Cash-Boi v4: Employee Branch CRUD Permissions System Specification
**Target Audience**: Web Developers, Mobile App (Flutter/React Native) Developers, Backend Engineers, DevOps  
**Version**: 1.0.0 (Senior Developer Enterprise Standard)  
**Last Updated**: 2026-11-08

---

## 1. Executive Summary & Objective

In **Cash-Boi v4 Multi-Branch Architecture**, an Employee (Staff) is assigned to one or more organization branches. Their capabilities inside each branch are governed by a **4-Tier Granular CRUD Matrix**:
- **Read (View)**: Inspect lists, view transaction details, view summaries, and print vouchers.
- **Post (Create)**: Generate new sales invoices, bills, inventory counts, or party records.
- **Update (Edit)**: Edit existing records, update status, adjust line items or prices.
- **Delete (Revoke)**: Void, cancel, or delete records.

### Single Source of Truth
Web Admin and Cash-Boi Mobile App share the exact same backend database and REST APIs. Any permission granted or revoked on Web takes effect immediately for the mobile application.

```
┌────────────────────────┐         ┌────────────────────────┐
│  Web Admin Panel (React)│         │ Mobile App (Flutter/RN)│
└───────────┬────────────┘         └───────────┬────────────┘
            │                                  │
            ▼                                  ▼
      (Admin Grants)                     (Staff Login)
            │                                  │
            └───────────► [REST API] ◄─────────┘
                               │
                               ▼
                   ┌────────────────────────┐
                   │   Central Database     │
                   │ employee_branch_       │
                   │ permissions            │
                   └────────────────────────┘
```

---

## 2. Database Schema (MySQL / PostgreSQL)

### Table: `employee_branch_permissions`

```sql
CREATE TABLE IF NOT EXISTS `employee_branch_permissions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `employee_id` BIGINT UNSIGNED NOT NULL,
  `branch_id` BIGINT UNSIGNED NOT NULL,
  `primary` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = Primary Branch, 0 = Secondary',
  `can_view` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Read/View access (canView)',
  `can_edit` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Create/Update/Edit access (canEdit)',
  `granted_by` BIGINT UNSIGNED NULL COMMENT 'Admin User ID who assigned permissions',
  `permissions` JSON NULL COMMENT 'Array of permission keys e.g. ["sales:read", "sales:update"]',
  `role` VARCHAR(50) NOT NULL DEFAULT 'EMPLOYEE',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = Active, 0 = Suspended',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_employee_branch` (`employee_id`, `branch_id`),
  KEY `idx_org_branch` (`organization_id`, `branch_id`),
  KEY `idx_employee` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 3. Standard Permission Keys

Each permission key follows the universal standard format: `{module}:{action}`

### Modules:
1. `sales` (POS Billing, Sales Invoices, Returns, Settlements)
2. `purchase` (Purchase Bills, Supplier Invoices, Goods Receive, Purchase Returns)
3. `inventory` (Products, Stock Adjustments, Warehouses, Low Stock)
4. `parties` (Customer & Supplier Directories, Ledgers, Balances)
5. `accounts` (Khatabook, Banking, MFS, Cash Closing, Expense/Income)
6. `reports` (Daily Sales, Profit/Loss, Tax/VAT, Audit)

### Actions:
- `read`
- `create` (post)
- `update`
- `delete`

### Examples:
- View & Edit Sales only: `["sales:read", "sales:update"]`
- Cashier POS Operator: `["sales:read", "sales:create", "parties:read", "parties:create", "reports:read"]`
- Auditor / Read Only: `["sales:read", "purchase:read", "inventory:read", "parties:read", "accounts:read", "reports:read"]`

---

## 4. REST API Contract

### 4.1 Save/Assign Branch Permission (Web Admin)
* **Endpoint**: `POST /employee-branch-permissions`
* **Access**: Super Admin / Organization Owner only
* **Request Body**:
```json
{
  "organizationId": 26875,
  "employeeId": 6,
  "branchId": 15,
  "primary": true,
  "canView": true,
  "canEdit": true,
  "grantedBy": 27514,
  "permissions": [
    "sales:read",
    "sales:create",
    "sales:update",
    "parties:read",
    "parties:update"
  ],
  "active": true,
  "accessUser": {
    "orgId": 26875,
    "branchId": 15,
    "userRole": "ADMIN"
  }
}
```
* **Success Response (HTTP 200)**:
```json
{
  "status": "Success",
  "msg": "Branch permission assigned successfully",
  "id": 101,
  "employeeId": 6,
  "branchId": 15,
  "primary": true,
  "canView": true,
  "canEdit": true,
  "grantedBy": 27514,
  "permissions": [
    "sales:read",
    "sales:create",
    "sales:update",
    "parties:read",
    "parties:update"
  ]
}
```

---

### 4.2 Fetch Employee Branch Permissions (Web & Mobile)
* **Endpoint**: `GET /employee/{employeeId}/branch-permissions`
* **Success Response (HTTP 200)**:
```json
{
  "status": "Success",
  "data": [
    {
      "id": 101,
      "employeeId": 6,
      "branchId": 15,
      "branchName": "Main Branch",
      "branchCode": "MB-01",
      "primary": true,
      "canView": true,
      "canEdit": true,
      "grantedBy": 27514,
      "permissions": [
        "sales:read",
        "sales:create",
        "sales:update",
        "parties:read",
        "parties:update"
      ],
      "active": true
    }
  ]
}
```

---

### 4.3 Update Branch Permission
* **Endpoint**: `POST /employee-branch-permissions/{id}/update`
* **Request Body**:
```json
{
  "employeeId": 12,
  "branchId": 33,
  "permissions": [
    "sales:read"
  ],
  "active": true
}
```

---

### 4.4 Revoke/Delete Branch Permission
* **Endpoint**: `DELETE /employee-branch-permissions/{id}`
* **Success Response (HTTP 200)**:
```json
{
  "status": "Success",
  "msg": "Branch permission removed successfully"
}
```

---

## 5. Mobile App (Flutter / React Native) Integration Guide

### Step 1: Authentication (`POST /user-login`)
The employee enters their **Mobile Phone Number** and **4-digit numeric PIN**:
```json
{
  "authentication": {
    "phone_number": "01712345671",
    "password": "1234"
  }
}
```
Login response provides the user session, token, and permitted branches.

### Step 2: Load Branch Permissions
Upon branch selection, the Mobile App calls:
`GET /employee/{employeeId}/branch-permissions`
Save the permissions array for the active branch in secure local storage:
- **Flutter**: `SharedPreferences` or `flutter_secure_storage`
- **React Native**: `AsyncStorage` or `react-native-mmkv`

### Step 3: Implement Mobile Permission Checker
#### Flutter (Dart) Example:
```dart
class AppPermissionService {
  static List<String> _permissions = [];

  static void setActiveBranchPermissions(List<String> perms) {
    _permissions = perms;
  }

  static bool hasPermission(String module, String action) {
    // Admin always has all permissions
    if (AuthSession.isAdmin) return true;

    final target = "$module:$action";
    return _permissions.contains(target) || _permissions.contains("*");
  }

  static bool canRead(String module) => hasPermission(module, "read");
  static bool canCreate(String module) => hasPermission(module, "create");
  static bool canUpdate(String module) => hasPermission(module, "update");
  static bool canDelete(String module) => hasPermission(module, "delete");
}
```

#### Flutter UI Button Guard:
```dart
// Floating Action Button for New Sale
Widget buildNewSaleButton(BuildContext context) {
  if (!AppPermissionService.canCreate("sales")) {
    return const SizedBox.shrink(); // Hidden when permission is not granted
  }

  return FloatingActionButton.extended(
    onPressed: () => Navigator.pushNamed(context, '/pos-entry'),
    icon: const Icon(Icons.add),
    label: const Text("New Sale"),
  );
}

// Invoice Edit & Delete Options
Widget buildInvoiceActions(InvoiceItem invoice) {
  return PopupMenuButton<String>(
    itemBuilder: (context) => [
      if (AppPermissionService.canRead("sales"))
        const PopupMenuItem(value: "view", child: Text("View Invoice")),
      if (AppPermissionService.canUpdate("sales"))
        const PopupMenuItem(value: "edit", child: Text("Edit Invoice")),
      if (AppPermissionService.canDelete("sales"))
        const PopupMenuItem(value: "delete", child: Text("Void / Cancel")),
    ],
    onSelected: (value) => handleAction(value, invoice),
  );
}
```

---

## 6. Backend API Middleware Guard (Zero-Trust Security)

Frontends (Web & Mobile) hide unauthorized buttons for a clean UX, but the **Backend must reject unauthorized API calls with HTTP 403**:

```javascript
// Express.js / Node.js Middleware Example
async function requirePermission(module, action) {
  return async (req, res, next) => {
    const user = req.user;
    if (user.role === 'ADMIN' || user.role === 'OWNER') {
      return next();
    }

    const branchId = req.body.branchId || req.headers['x-branch-id'];
    const [row] = await db.query(
      `SELECT permissions FROM employee_branch_permissions 
       WHERE employee_id = ? AND branch_id = ? AND is_active = 1`,
      [user.employeeId, branchId]
    );

    if (!row) {
      return res.status(403).json({
        status: "Error",
        msg: "Access Denied: You do not have access to this branch."
      });
    }

    const perms = Array.isArray(row.permissions) 
      ? row.permissions 
      : JSON.parse(row.permissions || '[]');

    const target = `${module}:${action}`;
    if (!perms.includes(target)) {
      return res.status(403).json({
        status: "Error",
        msg: `Permission Denied: [${action}] is not permitted on [${module}] in this branch.`
      });
    }

    next();
  };
}
```

---

## 7. Web Application Implementation Checklist

- [x] **Branch CRUD Permissions Matrix Modal** (`BranchPermissionModal.tsx`): Row-level, column-level, presets, and individual action toggling.
- [x] **Strict Deny-by-Default Fallback**: Non-admins receive empty permissions `[]` unless explicitly granted.
- [x] **Local Storage Synchronization**: Cached under `cb_emp_branch_permissions_${employeeId}` and `cb_branch_perms_${branchId}`.
- [x] **Operational UI Button Guards**:
  - `Sales`: `+ New Sale` guarded with `canCreate("sales")`, Table Edit guarded with `canUpdate("sales")`.
  - `Purchases`: `+ New Purchase` guarded with `canCreate("purchase")`, Table Edit guarded with `canUpdate("purchase")`.
  - `Parties`: `+ Add Party` guarded with `canCreate("parties")`, Table Edit & Status toggle guarded with `canUpdate("parties")`.
  - Direct route access protected in `CreateSalePage` and `CreatePurchasePage`.
