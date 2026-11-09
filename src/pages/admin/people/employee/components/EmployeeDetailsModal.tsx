import React from "react";
import { useNavigate } from "react-router-dom";
import { Modal, Button } from "@/components/common";
import type { EmployeeItem } from "@/types/employee.types";
import { isEmployeeActive } from "@/services/employee-service";
import {
  FaUserTie,
  FaPhoneAlt,
  FaEnvelope,
  FaIdCard,
  FaBuilding,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaMobileAlt,
  FaShieldAlt,
  FaEdit,
  FaNotesMedical,
} from "react-icons/fa";

interface EmployeeDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: EmployeeItem | null;
  onOpenBranchPermissions?: (employee: EmployeeItem) => void;
}

export const EmployeeDetailsModal: React.FC<EmployeeDetailsModalProps> = ({
  isOpen,
  onClose,
  employee,
  onOpenBranchPermissions,
}) => {
  const navigate = useNavigate();

  if (!isOpen || !employee) return null;

  const empId = employee.id || (employee as any)?.employeeId;
  const initial = (employee.fullName || "E").charAt(0).toUpperCase();
  const isActive = isEmployeeActive(employee);

  const handleEdit = () => {
    onClose();
    navigate("/admin/employee-entry", { state: { employee } });
  };

  const handlePermissions = () => {
    onClose();
    if (onOpenBranchPermissions) {
      onOpenBranchPermissions(employee);
    } else {
      navigate(`/admin/settings/roles?employeeId=${empId}`);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--primary-color-light,#e0f2fe)] text-[var(--primary-color,#009fe3)] flex items-center justify-center text-lg font-bold">
            {initial}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 leading-tight">
                {employee.fullName}
              </h3>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  isActive
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                }`}
              >
                {isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="text-xs text-gray-500 font-mono mt-0.5">
              Code: {employee.employeeCode || `EMP-${empId}`} • {employee.designation || "Staff"}
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1 py-1 text-xs">
        {/* Section 1: Professional Details */}
        <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/40 space-y-3">
          <div className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200 text-xs">
            <FaUserTie className="text-[var(--primary-color,#009fe3)]" />
            <span>Professional & Employment Details</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-gray-400 block text-[11px]">Designation</span>
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                {employee.designation || "—"}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block text-[11px]">Department</span>
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                {employee.department || "—"}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block text-[11px]">Employment Type</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {employee.employmentType || "FULL_TIME"}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block text-[11px]">Role</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {employee.role || "EMPLOYEE"}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block text-[11px]">Work Location</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {employee.workLocation || "—"}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block text-[11px]">Joining Date</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {employee.dateOfJoining ? String(employee.dateOfJoining).slice(0, 10) : "—"}
              </span>
            </div>
            {employee.dateOfLeaving && (
              <div>
                <span className="text-gray-400 block text-[11px]">Leaving Date</span>
                <span className="font-semibold text-rose-600">
                  {String(employee.dateOfLeaving).slice(0, 10)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Contact & Personal Details */}
        <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/40 space-y-3">
          <div className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200 text-xs">
            <FaPhoneAlt className="text-emerald-600" />
            <span>Contact & Personal Information</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-gray-400 block text-[11px]">Primary Phone</span>
              <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">
                {employee.phoneNumber || "—"}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block text-[11px]">Alternate Phone</span>
              <span className="font-mono font-medium text-gray-800 dark:text-gray-200">
                {employee.altPhoneNumber || "—"}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block text-[11px]">Email Address</span>
              <span className="font-medium text-gray-800 dark:text-gray-200 truncate block">
                {employee.email || "—"}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block text-[11px]">National ID (NID)</span>
              <span className="font-mono font-medium text-gray-800 dark:text-gray-200">
                {employee.nationalId || "—"}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block text-[11px]">Date of Birth</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {employee.dateOfBirth ? String(employee.dateOfBirth).slice(0, 10) : "—"}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block text-[11px]">Gender</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {employee.gender || "—"}
              </span>
            </div>
            <div className="col-span-2 sm:col-span-3">
              <span className="text-gray-400 block text-[11px]">Address</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {[employee.address, employee.city, employee.state, employee.postalCode, employee.country]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: App Access & Payroll */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* App Access */}
          <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/40 space-y-2.5">
            <div className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200 text-xs">
              <FaMobileAlt className="text-indigo-600" />
              <span>Cash-Boi App Access</span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-[11px]">Status</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                    employee.hasAppAccess
                      ? "bg-blue-50 text-[var(--primary-color,#009fe3)] dark:bg-blue-950/60 dark:text-blue-300"
                      : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  {employee.hasAppAccess ? "App Access Enabled" : "Access Disabled"}
                </span>
              </div>
              {employee.hasAppAccess && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-[11px]">Login Username</span>
                    <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
                      {employee.appUsername || employee.phoneNumber}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-[11px]">Security PIN</span>
                    <span className="font-mono text-gray-500">•••• (4-digit PIN set)</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Payroll & Banking */}
          <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/40 space-y-2.5">
            <div className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200 text-xs">
              <FaMoneyBillWave className="text-emerald-600" />
              <span>Payroll & Bank Details</span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-[11px]">Present Salary</span>
                <span className="font-bold font-mono text-gray-900 dark:text-gray-100">
                  {Number(employee.presentSalary || 0).toLocaleString()} {employee.salaryCurrency || "BDT"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-[11px]">Pay Frequency</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {employee.payFrequency || "MONTHLY"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-[11px]">Bank Name</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {employee.bankName || "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-[11px]">Bank Account</span>
                <span className="font-mono font-medium text-gray-800 dark:text-gray-200">
                  {employee.bankAccountNumber || "—"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Emergency Contact & Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Emergency Contact */}
          <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/40 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200 text-xs">
              <FaShieldAlt className="text-purple-600" />
              <span>Emergency Contact</span>
            </div>
            <div className="text-xs space-y-1">
              <div>
                <span className="text-gray-400 block text-[11px]">Contact Name</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {employee.emergencyContactName || "—"}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="text-gray-400 block text-[11px]">Relation</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {employee.emergencyContactRelation || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Phone</span>
                  <span className="font-mono font-medium text-gray-800 dark:text-gray-200">
                    {employee.emergencyContactPhone || "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/40 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200 text-xs">
              <FaNotesMedical className="text-blue-600" />
              <span>Administrative Notes</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 italic">
              {employee.notes || "No notes recorded for this employee."}
            </p>
          </div>
        </div>
      </div>

      {/* Modal Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700 mt-2">
        <Button
          label="Branch Access"
          variant="secondary"
          onClick={handlePermissions}
          icon={<FaBuilding className="text-xs text-[var(--primary-color,#009fe3)]" />}
          buttonClass="!text-xs !py-1.5 cursor-pointer"
        />

        <div className="flex items-center gap-2">
          <Button
            label="Close"
            variant="secondary"
            onClick={onClose}
            buttonClass="!text-xs !py-1.5 cursor-pointer"
          />
          <Button
            label="Edit Profile"
            variant="primary"
            onClick={handleEdit}
            icon={<FaEdit className="text-xs" />}
            buttonClass="!text-xs !py-1.5 !text-white cursor-pointer"
          />
        </div>
      </div>
    </Modal>
  );
};

export default EmployeeDetailsModal;
