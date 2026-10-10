# 🛒 Cash-Boi ERP — Trade & Purchase Architecture Documentation

This document serves as the complete technical and API specification reference for the **Trade / Purchase Management System**, **Supplier Accounting**, **Multi-Payment Gateways (Cash, Bank, MFS, Credit)**, and **Stock & Inventory Adjustments**.

---

## 📑 Table of Contents
1. [Authentication & `accessUser` Structure](#1-authentication--accessuser-structure)
2. [Purchase Management APIs](#2-purchase-management-apis)
   - [Get Purchases List (`POST /get-purchase-list`)](#21-get-purchases-list-post-get-purchase-list)
   - [Insert New Purchase (`POST /insert-purchases`)](#22-insert-new-purchase-post-insert-purchases)
   - [Update Purchase / Return (`POST /update-purchases`)](#23-update-purchase--return-post-update-purchases)
   - [Delete Purchase (`POST /delete-purchases`)](#24-delete-purchase-post-delete-purchases)
3. [Purchase Challan & Logistics Settings](#3-purchase-challan--logistics-settings)
   - [Get Challan Settings (`POST /get-purchase-challan-settings`)](#31-get-challan-settings-post-get-purchase-challan-settings)
   - [Save Challan Settings (`POST /save-purchase-challan-settings`)](#32-save-challan-settings-post-save-purchase-challan-settings)
4. [Supplier & Party Information APIs](#4-supplier--party-information-apis)
   - [Get Suppliers List (`POST /get-party-info-list`)](#41-get-suppliers-list-post-get-party-info-list)
   - [Create Supplier (`POST /insert-party-info`)](#42-create-supplier-post-insert-party-info)
5. [Products & Inventory Stock APIs](#5-products--inventory-stock-apis)
   - [Get Products List (`POST /get-product-list`)](#51-get-products-list-post-get-product-list)
   - [Insert / Update Product (`POST /insert-product`)](#52-insert--update-product-post-insert-product)
6. [Payment Channels & Accounts (Cash, Bank, MFS)](#6-payment-channels--accounts-cash-bank-mfs)
   - [Bank Accounts List (`POST /get-bank-info-list`)](#61-bank-accounts-list-post-get-bank-info-list)
   - [MFS User Accounts List (`POST /mfs-user-list`)](#62-mfs-user-accounts-list-post-mfs-user-list)
   - [Cash Balance Information (`POST /get-cash-balance-info`)](#63-cash-balance-information-post-get-cash-balance-info)
7. [Financial Ledger & Double-Entry Posting](#7-financial-ledger--double-entry-posting)
   - [Insert Financial Transaction (`POST /insert-financial-transaction`)](#71-insert-financial-transaction-post-insert-financial-transaction)
8. [Purchase Return & Stock Reversal Rules](#8-purchase-return--stock-reversal-rules)
9. [Sales Return Management APIs](#9-sales-return-management-apis)
   - [Insert Sales Return (`POST /insert-sales-return`)](#91-insert-sales-return-post-insert-sales-return)
   - [Get Sales & Return History (`POST /get-sales-and-return`)](#92-get-sales--return-history-post-get-sales-and-return)
10. [Purchase Return vs Sales Return Comparison](#10-purchase-return-vs-sales-return-comparison)

---

## 1. Authentication & `accessUser` Structure

Every API request payload sent to the backend ERP system must include the `accessUser` authentication object:

```json
{
  "accessUser": {
    "phone": "017XXXXXXXX",
    "token": "YOUR_JWT_OR_AUTH_TOKEN",
    "businessCode": "1001",
    "orgId": "8634",
    "branchId": "14430"
  }
}
```

- **`phone`**: The registered mobile number of the authenticated user.
- **`token`**: Active session token stored in browser `localStorage`.
- **`businessCode`**: Numeric identifier for the business entity (e.g., `1001`).
- **`orgId` & `branchId`**: Current organization and branch scope.

---

## 2. Purchase Management APIs

### 2.1 Get Purchases List (`POST /get-purchase-list`)
Fetches all historical purchase orders and purchase invoices for the current branch.

- **URL**: `POST /get-purchase-list`
- **Request Body**:
```json
{
  "accessUser": {
    "phone": "017XXXXXXXX",
    "token": "...",
    "businessCode": "1001"
  },
  "startDate": "2026-10-01",
  "endDate": "2026-10-08"
}
```

- **Response Structure**:
```json
{
  "status": "Success",
  "data": [
    {
      "id": "28488",
      "purchaseId": "28488",
      "invoiceNo": "28488-20261008094844615",
      "orderNo": "28488",
      "purchaseDate": "2026-10-08",
      "supplierId": "105",
      "supplierName": "Rahim Tech Supplies",
      "supplierPhone": "01711223344",
      "supplierAddress": "IDB Bhaban, Dhaka",
      "totalAmount": 134808.00,
      "discount": 0.00,
      "vat": 0.00,
      "deliveryCharge": 0.00,
      "grandTotal": 134808.00,
      "paidAmount": 134808.00,
      "dueAmount": 0.00,
      "paymentType": "CASH",
      "status": "PAID",
      "osType": "WEB",
      "details": [
        {
          "id": "1001",
          "productId": "501",
          "productCode": "P-1001",
          "productName": "Dell Core i5 Laptop",
          "unit": "pcs",
          "quantity": 3,
          "buyPrice": 30000.00,
          "discount": 0,
          "vat": 0,
          "total": 90000.00
        }
      ]
    }
  ]
}
```

---

### 2.2 Insert New Purchase (`POST /insert-purchases`)
Records a new purchase order / invoice from a supplier into the ERP database.

- **URL**: `POST /insert-purchases`
- **Request Body**:
```json
{
  "accessUser": {
    "phone": "017XXXXXXXX",
    "token": "...",
    "businessCode": "1001",
    "orgId": "8634",
    "branchId": "14430"
  },
  "invoiceNo": "1001-20261008120001",
  "purchaseDate": "2026-10-08",
  "supplierId": "105",
  "supplierName": "Rahim Tech Supplies",
  "supplierPhone": "01711223344",
  "supplierAddress": "IDB Bhaban, Dhaka",
  "challanRefNo": "CH-88910",
  "challanDate": "2026-10-08",
  "vatChallan": null,
  "vatChallanDate": null,
  "vehicleNumber": "DHAKA-METRO-KA-1122",
  "driverName": "Rafiqul Islam",
  "driverPhone": "01799887766",
  "transportCost": 1200.00,
  "totalAmount": 125000.00,
  "discount": 5000.00,
  "vat": 0.00,
  "grandTotal": 121200.00,
  "paidAmount": 121200.00,
  "dueAmount": 0.00,
  "paymentType": "CASH",
  "status": "PAID",
  "note": "Goods received in good condition",
  "osType": "WEB",
  "addedBy": "017XXXXXXXX",
  "purchaseDetails": [
    {
      "productId": "501",
      "productCode": "P-1001",
      "productName": "Dell Core i5 Laptop",
      "unit": "pcs",
      "quantity": 2,
      "buyPrice": 45000.00,
      "discount": 0,
      "total": 90000.00,
      "vat": 0,
      "delivery_charge": 0,
      "status": "PENDING",
      "advenType": "PURCHASE"
    }
  ]
}
```

---

### 2.3 Update Purchase / Return (`POST /update-purchases`)
Used for modifying existing purchase quantities, adjusting costs, or **returning purchased items** to suppliers.

- **URL**: `POST /update-purchases`
- **Behavior**:
  - The backend queries existing detail rows for `invoiceNo`.
  - Computes the stock reversal: $\text{Current Stock} = \text{Current Stock} - \text{Old Purchased Quantity}$.
  - Adds the new quantity: $\text{Final Stock} = \text{Current Stock} + \text{New Quantity}$.
  - Automatically updates supplier due balances.
- **Request Body**:
```json
{
  "accessUser": {
    "phone": "017XXXXXXXX",
    "token": "...",
    "businessCode": "1001"
  },
  "id": "28488",
  "purchaseId": "28488",
  "invoiceNo": "28488-20261008094844615",
  "supplierName": "Rahim Tech Supplies",
  "supplierPhone": "01711223344",
  "supplierAddress": "IDB Bhaban, Dhaka",
  "purchaseDate": "2026-10-08",
  "totalAmount": 134808.00,
  "discount": 0.00,
  "grandTotal": 134808.00,
  "paidAmount": 134808.00,
  "dueAmount": 0.00,
  "paymentType": "CASH",
  "status": "COMPLETED",
  "note": "Updated quantities",
  "vat": 0.00,
  "deliveryCharge": 0.00,
  "osType": "WEB",
  "details": [
    {
      "productId": "501",
      "productCode": "P-1001",
      "productName": "Dell Core i5 Laptop",
      "quantity": 3,
      "buyPrice": 30000.00,
      "discount": 0,
      "total": 90000.00,
      "vat": 0,
      "delivery_charge": 0
    }
  ]
}
```

---

### 2.4 Delete Purchase (`POST /delete-purchases`)
Permanently removes a purchase record and rolls back the added inventory stock.

- **URL**: `POST /delete-purchases`
- **Request Body**:
```json
{
  "accessUser": {
    "phone": "017XXXXXXXX",
    "token": "...",
    "businessCode": "1001"
  },
  "id": "28488",
  "purchaseId": "28488",
  "invoiceNo": "28488-20261008094844615"
}
```

---

## 3. Purchase Challan & Logistics Settings

Controls which optional delivery and transport fields are active for purchases (e.g. Challan No, Vehicle No, Driver Info, VAT Challan).

### 3.1 Get Challan Settings (`POST /get-purchase-challan-settings`)
- **URL**: `POST /get-purchase-challan-settings`
- **Response**:
```json
{
  "status": "Success",
  "data": {
    "showChallanRefNo": true,
    "showChallanDate": true,
    "showVatChallan": false,
    "showVatChallanDate": false,
    "vehicleNumber": true,
    "capacityCft": true,
    "driverName": true,
    "driverPhone": true,
    "remarks": true,
    "attachments": true
  }
}
```

### 3.2 Save Challan Settings (`POST /save-purchase-challan-settings`)
- **URL**: `POST /save-purchase-challan-settings`

---

## 4. Supplier & Party Information APIs

### 4.1 Get Suppliers List (`POST /get-party-info-list`)
- **URL**: `POST /get-party-info-list`
- **Filters**: Items where `type` contains `"SUPPLIER"`.

### 4.2 Create Supplier (`POST /insert-party-info`)
- **URL**: `POST /insert-party-info`
- **Key Fields**: `name`, `phone`, `address`, `type: "SUPPLIER"`, `openingBalance`.

---

## 5. Products & Inventory Stock APIs

### 5.1 Get Products List (`POST /get-product-list`)
- **URL**: `POST /get-product-list`
- **Response**: Returns list of products with `quantity` (live current stock), `buy_price`, `sell_price`, `pcode`, `barcode`, `unit`.

### 5.2 Insert / Update Product (`POST /insert-product`)
- **URL**: `POST /insert-product`
- **Payload Rules**:
  - `is_decimal`: `"Yes"` or `"No"` (string varchar(3)).
  - `status`: `"Active"` or `"Inactive"`.
  - For edits: Include `id`, `product_id`, `operation: "update"`.

---

## 6. Payment Channels & Accounts (Cash, Bank, MFS)

### 6.1 Bank Accounts List (`POST /get-bank-info-list`)
- **URL**: `POST /get-bank-info-list`
- **Returns**: Registered commercial bank accounts (`bankName`, `accountNo`, `branchName`, `currentBalance`).

### 6.2 MFS User Accounts List (`POST /mfs-user-list`)
- **URL**: `POST /mfs-user-list`
- **Returns**: Registered Mobile Financial Services accounts (`mfsName`: bKash / Nagad / Rocket, `mobileNo`, `currentBalance`).

### 6.3 Cash Balance Information (`POST /get-cash-balance-info`)
- **URL**: `POST /get-cash-balance-info`
- **Returns**: Live cash-in-hand balance for the active branch.

---

## 7. Financial Ledger & Double-Entry Posting

### 7.1 Insert Financial Transaction (`POST /insert-financial-transaction`)
When a purchase is paid via **Cash**, **Bank**, or **MFS**, an `EXPENSE` transaction is posted to sync the financial ledger.

- **URL**: `POST /insert-financial-transaction`
- **Request Body**:
```json
{
  "accessUser": {
    "phone": "017XXXXXXXX",
    "token": "...",
    "businessCode": "1001"
  },
  "type": "EXPENSE",
  "paymentType": "CASH",
  "amount": 121200.00,
  "collectionAmount": 121200.00,
  "dueAmount": 0.00,
  "head": "Purchase",
  "categoryId": "105",
  "items": "Dell Core i5 Laptop, Logitech Mouse",
  "billRef": "1001-20261008120001",
  "refNo": "1001-20261008120001",
  "date": "2026-10-08",
  "notes": "Purchase payment settled"
}
```

---

## 8. Purchase Return & Stock Reversal Rules

1. **No Separate Return Endpoint**: There is no `/insert-purchase-return`. All returns and adjustments are handled via `POST /update-purchases`.
2. **Stock Verification Before Reverse**:
   - If an invoice is edited and a product quantity is reduced, the backend validates that $\text{Current Stock} \ge \text{Reduction Amount}$.
   - If current stock is less than the quantity being reversed, the backend responds with `"Stock corrupted during reverse!"`.
3. **Due Balance Adjustment**:
   - If a purchase was on credit, reducing items automatically decreases `dueAmount`.
   - If a purchase was already paid in cash, reducing items creates a refundable or credited balance with the supplier.

---

## 9. Sales Return Management APIs

### 9.1 Insert Sales Return (`POST /insert-sales-return`)
Handles customer returns for products sold on previous invoices. Adjusts inventory stock upward, recalculates invoice dues or issues cash refunds.

- **URL**: `POST /insert-sales-return`
- **Method**: `POST`
- **Request Body**:
```json
{
  "accessUser": {
    "phone": "017XXXXXXXX",
    "token": "YOUR_AUTH_TOKEN",
    "businessCode": "1001",
    "orgId": "8634",
    "branchId": "14430"
  },
  "invoiceNo": "INV-20261008-001",
  "returnDate": "2026-10-08",
  "customerId": "204",
  "customerName": "Kamal Hossain",
  "customerPhone": "01812345678",
  "returnTotalAmount": 1500.00,
  "refundAmount": 1500.00,
  "paymentType": "CASH",
  "note": "Customer returned unopened goods",
  "returnDetails": [
    {
      "productId": "501",
      "productCode": "P-1001",
      "productName": "Dell Core i5 Laptop",
      "unit": "pcs",
      "returnQuantity": 1,
      "sellPrice": 1500.00,
      "total": 1500.00
    }
  ]
}
```
- **Backend Effects**:
  - Live stock of each returned item is automatically incremented in inventory (`Stock Re-added`).
  - Generates a unique `returnNo`.
  - Deducts revenue and updates customer ledger/cash balance.

---

### 9.2 Get Sales & Return History (`POST /get-sales-and-return`)
Fetches all sales invoices with enriched return details (`hasReturn`, `returnNo`, `returnGrandTotal`, `returnRefundAmount`, and line-level `returnDetails`).

> [!NOTE]
> Use `POST /get-sales-and-return` instead of `POST /get-sale-list` when displaying return history, sales return reports, or processing item returns, because `POST /get-sale-list` returns 0 for `returnAmount`.

- **URL**: `POST /get-sales-and-return`
- **Method**: `POST`
- **Request Body**:
```json
{
  "accessUser": {
    "phone": "017XXXXXXXX",
    "token": "YOUR_AUTH_TOKEN",
    "businessCode": "1001"
  },
  "startDate": "2026-10-01",
  "endDate": "2026-10-08"
}
```
- **Response Structure**:
```json
{
  "status": "Success",
  "data": [
    {
      "id": "1052",
      "invoiceNo": "INV-20261008-001",
      "saleDate": "2026-10-08",
      "customerName": "Kamal Hossain",
      "customerPhone": "01812345678",
      "grandTotal": 15000.00,
      "paidAmount": 15000.00,
      "dueAmount": 0.00,
      "hasReturn": true,
      "returnNo": "RET-20261008-001",
      "returnGrandTotal": 1500.00,
      "returnRefundAmount": 1500.00,
      "returnDetails": [
        {
          "productId": "501",
          "productName": "Dell Core i5 Laptop",
          "returnQuantity": 1,
          "sellPrice": 1500.00,
          "total": 1500.00
        }
      ],
      "details": [
        {
          "productId": "501",
          "productName": "Dell Core i5 Laptop",
          "quantity": 10,
          "sellPrice": 1500.00,
          "total": 15000.00
        }
      ]
    }
  ]
}
```

---

## 10. Purchase Return vs Sales Return Comparison

| Feature | Purchase Return (সাপ্লায়ার রিটার্ন) | Sales Return (কাস্টমার রিটার্ন) |
| :--- | :--- | :--- |
| **Dedicated Insert API** | ❌ কোনো আলাদা API নেই | ✅ `POST /insert-sales-return` |
| **Execution Method** | `POST /update-purchases` (ইনভয়েস এডিট করে কোয়ান্টিটি কমানো) | `POST /insert-sales-return` (আলাদা রিটার্ন এন্ট্রি) |
| **Stock Impact** | স্টক থেকে পণ্য **কমে যায়** ($\text{Stock} \downarrow$) | স্টক-এ পণ্য **যোগ হয়** ($\text{Stock} \uparrow$) |
| **List / Report API** | `POST /get-purchase-list` | `POST /get-sales-and-return` |
| **Stock Reversal Guard** | $\text{Current Stock} \ge \text{Old Purchased Quantity}$ নাহলে `"Stock corrupted during reverse!"` এরর দেয় | কাস্টমার যা কিনেছিল তার চেয়ে বেশি রিটার্ন নেওয়া যায় না |
| **Ledger Effect** | সাপ্লায়ারের পাওনা/বাকি কমে অথবা অ্যাডভান্স জমা হয় | কাস্টমারকে ক্যাশ ফেরত/রিফান্ড অথবা তার ডিউ কমে |