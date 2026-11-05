import type { FeatureGroup, PricingPackage } from "@/types";

/**
 * Extracts 5 key plan highlights dynamically from the API featureGroups matrix
 * for a specific package based on its index and capabilities.
 */
export function extractPackageHighlights(
  pkg: PricingPackage,
  index: number,
  featureGroups?: FeatureGroup[] | null
): string[] {
  if (!featureGroups || featureGroups.length === 0) {
    return getFallbackHighlights(pkg.code);
  }

  // Create quick lookup map for feature values
  const featureMap: Record<string, string[]> = {};
  for (const group of featureGroups) {
    if (!group.items) continue;
    for (const item of group.items) {
      if (item.feature && Array.isArray(item.values)) {
        featureMap[item.feature.trim()] = item.values;
      }
    }
  }

  const getVal = (name: string): string => {
    const arr = featureMap[name];
    if (!arr || index < 0 || index >= arr.length) return "";
    return String(arr[index] || "").trim();
  };

  const highlights: string[] = [];

  // 1. Monthly Sales Invoices
  const inv = getVal("Monthly Sales Invoice");
  if (inv === "Unlimited") {
    highlights.push("Unlimited Sales Invoices");
  } else if (Number(inv)) {
    highlights.push(`${Number(inv).toLocaleString()} Sales Invoices / mo`);
  } else if (inv && inv !== "N") {
    highlights.push(`${inv} Sales Invoices / mo`);
  }

  // 2. Bank & MFS Accounts
  const bank = getVal("Bank Account Management");
  const mfs = getVal("MFS (Mobile Banking) Management");
  if (bank === "1 Account" && mfs === "1 Account") {
    highlights.push("1 Bank & 1 MFS Account");
  } else if (bank === "Multiple" && mfs === "Multiple") {
    highlights.push("Multiple Bank & MFS Accounts");
  } else if (bank === "Multiple") {
    highlights.push("Multiple Bank Accounts");
  } else if (bank && bank !== "N") {
    highlights.push(`${bank} Bank Account`);
  }

  // 3. Branches & Multi-User / Inventory
  const branch = getVal("Branch Integration");
  const users = getVal("User Management");
  if (branch === "Unlimited") {
    highlights.push("Unlimited Store Branches");
  } else if (branch && branch !== "N") {
    const userCount = users === "5*" ? "5" : users && users !== "Single" ? users : "";
    if (userCount) {
      highlights.push(`Up to ${branch} Branches & ${userCount} Users`);
    } else {
      highlights.push(`Up to ${branch} Store Branches`);
    }
  } else if (getVal("Stock/Inventory Management") === "Y") {
    highlights.push("Stock & Inventory Tracking");
  }

  // 4. Advanced Modules: Web Version, POS, CRM, Cloud Backup, HR/Payroll
  const web = getVal("Web Version");
  const crm = getVal("Customer Relationship Management (CRM)");
  const backup = getVal("Cloud Backup");
  const hr = getVal("HR - Human Resource Management");

  if (hr && hr !== "N") {
    highlights.push("HR, Payroll & Attendance");
  } else if (web === "Y") {
    highlights.push(crm === "Y" ? "Full Web Version & POS / CRM" : "Full Web Version & POS");
  } else if (backup === "Y") {
    highlights.push("Cloud Data Backup");
  } else if (getVal("Cash Book Report") === "Y") {
    highlights.push("Daily Cash Book & Reports");
  }

  // 5. Support Level or MIS Reports
  const support = getVal("Support");
  const training = getVal("Online Training");
  if (support === "Dedicated") {
    highlights.push("Dedicated Account Manager");
  } else if (support === "Priority") {
    highlights.push("Priority 24/7 Support");
  } else if (support === "Regular" || training === "Y") {
    highlights.push("Regular Support & Training");
  } else if (support && support !== "N") {
    highlights.push(`${support} Support`);
  }

  // If we still need items to reach 5, pick other active capabilities
  if (highlights.length < 5) {
    if (getVal("MIS Reports") === "Y" && !highlights.some((h) => h.includes("MIS"))) {
      highlights.push("Advanced MIS & Analytics");
    }
  }
  if (highlights.length < 5) {
    if (getVal("Cloud Backup") === "Y" && !highlights.some((h) => h.includes("Backup"))) {
      highlights.push("Cloud Data Backup");
    }
  }
  if (highlights.length < 5) {
    if (getVal("Daily Cash Book & Reports") === "Y" || getVal("Cash Book Report") === "Y") {
      if (!highlights.some((h) => h.includes("Cash Book"))) {
        highlights.push("Daily Cash Book & Reports");
      }
    }
  }

  return highlights.slice(0, 5);
}

/**
 * Fallback highlights if featureGroups is unavailable or loading
 */
function getFallbackHighlights(code: string): string[] {
  const upper = String(code || "").toUpperCase();
  switch (upper) {
    case "FREE":
      return [
        "60 Sales Invoices / mo",
        "1 Bank & 1 MFS Account",
        "Stock & Inventory Tracking",
        "Daily Cash Book & Reports",
        "Limited Support",
      ];
    case "BASIC":
      return [
        "400 Sales Invoices / mo",
        "Multiple Bank & MFS Accounts",
        "Stock & Inventory Tracking",
        "Cloud Data Backup",
        "Regular Support & Training",
      ];
    case "PREMIUM":
      return [
        "1,000 Sales Invoices / mo",
        "Multiple Bank & MFS Accounts",
        "Up to 3 Branches & 5 Users",
        "Full Web Version & POS / CRM",
        "Priority 24/7 Support",
      ];
    case "CUSTOM":
      return [
        "Unlimited Sales Invoices",
        "Multiple Bank Accounts",
        "Unlimited Store Branches",
        "HR, Payroll & Attendance",
        "Dedicated Account Manager",
      ];
    default:
      return [
        "Core sales management",
        "Financial accounts",
        "Reports & statements",
        "Cloud infrastructure",
        "Customer support",
      ];
  }
}
