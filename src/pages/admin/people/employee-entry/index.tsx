import { useState, useEffect, type ChangeEvent, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaBriefcase, FaIdBadge, FaPhoneAlt, FaMobileAlt, FaMoneyBillWave, FaShieldAlt, FaList } from "react-icons/fa";
import Button from "@/components/button/Button";
import InputField from "@/components/form/TextInput";
import PageHeader from "@/components/page-header/PageHeader";
import { showErrorToast, showSuccessToast } from "@/utils/toast-utils";
import { useInsertEmployeeMutation, useUpdateEmployeeMutation } from "@/hooks/useEmployeeQueries";
import type { EmployeeInsertPayload, EmployeeItem } from "@/types/employee.types";

type EmployeeFormValues = {
  fullName: string;
  employeeCode: string;
  gender: string;
  dateOfBirth: string;
  nationalId: string;
  email: string;
  phoneNumber: string;
  altPhoneNumber: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  role: string;
  designation: string;
  department: string;
  employmentType: string;
  dateOfJoining: string;
  dateOfLeaving: string;
  workLocation: string;
  presentSalary: string;
  salaryCurrency: string;
  payFrequency: string;
  bankAccountNumber: string;
  bankName: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  hasAppAccess: boolean;
  appUsername: string;
  appPassword: string;
  notes: string;
};

const initialValues: EmployeeFormValues = {
  fullName: "",
  employeeCode: "",
  gender: "Male",
  dateOfBirth: "",
  nationalId: "",
  email: "",
  phoneNumber: "",
  altPhoneNumber: "",
  address: "",
  city: "Dhaka",
  state: "Dhaka",
  country: "Bangladesh",
  postalCode: "1207",
  role: "EMPLOYEE",
  designation: "",
  department: "",
  employmentType: "FULL_TIME",
  dateOfJoining: new Date().toISOString().slice(0, 10),
  dateOfLeaving: "",
  workLocation: "Dhaka Office",
  presentSalary: "50000.00",
  salaryCurrency: "BDT",
  payFrequency: "MONTHLY",
  bankAccountNumber: "",
  bankName: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  emergencyContactRelation: "Father",
  hasAppAccess: false,
  appUsername: "",
  appPassword: "",
  notes: "",
};

type EmployeeField = keyof EmployeeFormValues;
type EmployeeErrors = Partial<Record<EmployeeField, string>>;

const fieldClass =
  "ui-control w-full bg-[var(--ui-surface)] text-[var(--ui-text)]";

export default function EmployeeEntryPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const editEmployee = location.state?.employee as EmployeeItem | undefined;
  const editId = editEmployee?.id || (editEmployee as any)?.employeeId;
  const isEditMode = Boolean(editId);

  const getFormValuesFromEmployee = (emp: EmployeeItem): EmployeeFormValues => ({
    fullName: emp.fullName || "",
    employeeCode: emp.employeeCode || "",
    gender: emp.gender || "Male",
    dateOfBirth: emp.dateOfBirth ? String(emp.dateOfBirth).slice(0, 10) : "",
    nationalId: emp.nationalId || "",
    email: emp.email || "",
    phoneNumber: emp.phoneNumber || "",
    altPhoneNumber: emp.altPhoneNumber || "",
    address: emp.address || "",
    city: emp.city || "Dhaka",
    state: emp.state || "Dhaka",
    country: emp.country || "Bangladesh",
    postalCode: emp.postalCode || "1207",
    role: emp.role || "EMPLOYEE",
    designation: emp.designation || "",
    department: emp.department || "",
    employmentType: emp.employmentType || "FULL_TIME",
    dateOfJoining: emp.dateOfJoining ? String(emp.dateOfJoining).slice(0, 10) : new Date().toISOString().slice(0, 10),
    dateOfLeaving: emp.dateOfLeaving ? String(emp.dateOfLeaving).slice(0, 10) : "",
    workLocation: emp.workLocation || "Dhaka Office",
    presentSalary: emp.presentSalary !== undefined && emp.presentSalary !== null ? String(emp.presentSalary) : "50000.00",
    salaryCurrency: emp.salaryCurrency || "BDT",
    payFrequency: emp.payFrequency || "MONTHLY",
    bankAccountNumber: emp.bankAccountNumber || "",
    bankName: emp.bankName || "",
    emergencyContactName: emp.emergencyContactName || "",
    emergencyContactPhone: emp.emergencyContactPhone || "",
    emergencyContactRelation: emp.emergencyContactRelation || "Father",
    hasAppAccess: Boolean(emp.hasAppAccess),
    appUsername: emp.appUsername || emp.phoneNumber || "",
    appPassword: emp.appPassword || "",
    notes: emp.notes || "",
  });

  const [values, setValues] = useState<EmployeeFormValues>(() => {
    if (editEmployee) {
      return getFormValuesFromEmployee(editEmployee);
    }
    return initialValues;
  });

  const [errors, setErrors] = useState<EmployeeErrors>({});

  useEffect(() => {
    if (editEmployee) {
      setValues(getFormValuesFromEmployee(editEmployee));
    }
  }, [editEmployee]);

  const insertMutation = useInsertEmployeeMutation({
    onSuccess: () => {
      showSuccessToast("Employee created successfully!");
      navigate("/admin/employees");
    },
  });

  const updateMutation = useUpdateEmployeeMutation({
    onSuccess: () => {
      showSuccessToast("Employee updated successfully!");
      navigate("/admin/employees");
    },
  });

  const updateField =
    (field: keyof EmployeeFormValues) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const val = event.target.value;
      setValues((current) => {
        const next = { ...current, [field]: val };

        // If phone number changes and App Access is enabled, auto-fill appUsername
        if (field === "phoneNumber" && next.hasAppAccess) {
          next.appUsername = val;
        }

        return next;
      });
      setErrors((current) => ({ ...current, [field]: undefined }));
    };

  const handleAppAccessToggle = (checked: boolean) => {
    setValues((current) => ({
      ...current,
      hasAppAccess: checked,
      appUsername: checked ? current.appUsername || current.phoneNumber || "" : "",
      appPassword: checked ? current.appPassword || "" : "",
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: EmployeeErrors = {};

    // Validate required fields
    if (!values.fullName.trim()) nextErrors.fullName = "Full name is required.";
    if (!values.employeeCode.trim()) nextErrors.employeeCode = "Employee code is required.";
    if (!values.phoneNumber.trim()) nextErrors.phoneNumber = "Phone number is required.";
    if (!values.designation.trim()) nextErrors.designation = "Designation is required.";
    if (!values.department.trim()) nextErrors.department = "Department is required.";
    if (!values.dateOfJoining.trim()) nextErrors.dateOfJoining = "Date of joining is required.";

    if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (values.presentSalary && Number(values.presentSalary) < 0) {
      nextErrors.presentSalary = "Salary cannot be negative.";
    }

    // App Access validation: username (phone number) and 4-digit numeric PIN
    if (values.hasAppAccess) {
      if (!values.appUsername.trim()) {
        nextErrors.appUsername = "Login phone number is required.";
      }
      if (!values.appPassword.trim()) {
        nextErrors.appPassword = "4-digit PIN is required.";
      } else if (values.appPassword.length !== 4) {
        nextErrors.appPassword = "PIN must be exactly 4 digits.";
      }
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      showErrorToast("Please check the highlighted fields.");
      return;
    }

    // Split fullName into firstName and lastName
    const nameParts = values.fullName.trim().split(" ");
    const firstName = nameParts[0] || values.fullName.trim();
    const lastName = nameParts.slice(1).join(" ") || "";

    // Exact payload matching the 38 keys
    const payload: Partial<EmployeeInsertPayload> = {
      employeeCode: values.employeeCode.trim(),
      fullName: values.fullName.trim(),
      firstName,
      lastName,
      gender: values.gender || "Male",
      dateOfBirth: values.dateOfBirth || undefined,
      nationalId: values.nationalId.trim() || undefined,
      email: values.email.trim() || undefined,
      phoneNumber: values.phoneNumber.trim(),
      altPhoneNumber: values.altPhoneNumber.trim() || undefined,
      address: values.address.trim() || undefined,
      city: values.city.trim() || "Dhaka",
      state: values.state.trim() || "Dhaka",
      country: values.country.trim() || "Bangladesh",
      postalCode: values.postalCode.trim() || undefined,
      role: values.role.trim() || "EMPLOYEE",
      designation: values.designation.trim(),
      department: values.department.trim(),
      employmentType: values.employmentType || "FULL_TIME",
      dateOfJoining: values.dateOfJoining || new Date().toISOString().slice(0, 10),
      dateOfLeaving: values.dateOfLeaving || null,
      reportingManagerId: null,
      workLocation: values.workLocation.trim() || "Dhaka Office",
      presentSalary: Number(values.presentSalary || 0),
      salaryCurrency: values.salaryCurrency || "BDT",
      payFrequency: values.payFrequency || "MONTHLY",
      bankAccountNumber: values.bankAccountNumber.trim() || undefined,
      bankName: values.bankName.trim() || undefined,
      emergencyContactName: values.emergencyContactName.trim() || undefined,
      emergencyContactPhone: values.emergencyContactPhone.trim() || undefined,
      emergencyContactRelation: values.emergencyContactRelation.trim() || undefined,
      hasAppAccess: Boolean(values.hasAppAccess),
      appUsername: values.hasAppAccess ? values.appUsername.trim() || values.phoneNumber.trim() : undefined,
      appPassword: values.hasAppAccess ? values.appPassword.trim() : undefined,
      profilePhotoUrl: null,
      notes: values.notes.trim() || undefined,
    };

    if (isEditMode && editId) {
      updateMutation.mutate({ id: Number(editId), data: payload });
    } else {
      insertMutation.mutate(payload);
    }
  };

  const handleReset = () => {
    if (isEditMode && editEmployee) {
      setValues(getFormValuesFromEmployee(editEmployee));
    } else {
      setValues(initialValues);
    }
    setErrors({});
  };

  const isPending = insertMutation.isPending || updateMutation.isPending;

  return (
    <div className="min-h-full bg-[var(--ui-surface-muted)] px-4 py-5 text-[var(--ui-text)] sm:px-6 lg:px-8">
      <div className="ui-page mx-auto w-full space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <PageHeader
            headerTitle={isEditMode ? `Edit Employee: ${values.fullName || values.employeeCode}` : "Employee entry"}
            headerDescription={
              isEditMode
                ? "Update staff information, payroll, work role, and app login credentials."
                : "Create and register an employee profile with work role, payroll, and app access."
            }
          />
          <Button
            label="View Employee List"
            variant="secondary"
            onClick={() => navigate("/admin/employees")}
            icon={<FaList className="text-xs" />}
            className="self-start sm:self-auto cursor-pointer"
          />
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          {/* Left Aside Profile Preview Card */}
          <aside className="space-y-4">
            <section className="overflow-hidden rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] shadow-[var(--ui-shadow-card)]">
              <div className="h-24 bg-[var(--primary-color)]" />
              <div className="px-5 pb-5">
                <div className="-mt-10 flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-[var(--ui-surface)] bg-[var(--primary-color-light)] text-3xl font-bold text-[var(--primary-color)] shadow-sm">
                  {values.fullName.trim().charAt(0).toUpperCase() || (
                    <FaIdBadge aria-hidden="true" className="text-xl" />
                  )}
                </div>
                <p className="mt-4 text-lg font-bold">
                  {values.fullName.trim() || "New employee"}
                </p>
                <p className="mt-1 text-sm text-[var(--ui-text-muted)]">
                  {values.designation || "Designation"}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full border border-[var(--ui-success-border)] bg-[var(--ui-success-light)] px-3 py-1 text-xs font-semibold text-[var(--ui-success-dark)]">
                    {values.department || "Employee"}
                  </span>
                  <span className="rounded-full border border-[var(--ui-border)] bg-[var(--ui-surface-muted)] px-3 py-1 text-xs font-medium text-[var(--ui-text-muted)]">
                    {values.employmentType === "FULL_TIME"
                      ? "Full-time"
                      : values.employmentType === "PART_TIME"
                      ? "Part-time"
                      : values.employmentType === "CONTRACT"
                      ? "Contract"
                      : values.employmentType}
                  </span>
                </div>
                <div className="mt-5 space-y-3 border-t border-[var(--ui-border)] pt-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[var(--ui-text-muted)]">Employee Code</span>
                    <span className="font-medium font-mono">{values.employeeCode || "Not set"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[var(--ui-text-muted)]">Department</span>
                    <span className="font-medium">{values.department || "Not set"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[var(--ui-text-muted)]">Work Location</span>
                    <span className="font-medium">{values.workLocation || "Not set"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[var(--ui-text-muted)]">Joining Date</span>
                    <span className="font-medium">{values.dateOfJoining || "Not set"}</span>
                  </div>
                  {values.dateOfLeaving && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[var(--ui-text-muted)]">Leaving Date</span>
                      <span className="font-medium text-rose-600">{values.dateOfLeaving}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[var(--ui-text-muted)]">App Access</span>
                    <span
                      className={`font-semibold text-xs ${
                        values.hasAppAccess ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400"
                      }`}
                    >
                      {values.hasAppAccess ? "Enabled (PIN set)" : "Disabled"}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <div className="rounded-2xl border border-[var(--primary-color-muted)] bg-[var(--primary-color-light)] p-4">
              <div className="flex items-center gap-2 font-semibold text-[var(--primary-color-dark)]">
                <FaBriefcase aria-hidden="true" />
                Employee profile rules
              </div>
              <p className="mt-2 text-sm text-[var(--ui-text-muted)]">
                Required fields are marked with *. When App Access is enabled, login username automatically matches the employee's phone number with a 4-digit numeric PIN.
              </p>
            </div>
          </aside>

          {/* Right Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Section 1: Professional & Employment Information */}
            <section className="rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-5 shadow-[var(--ui-shadow-card)] sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-color-light)] text-[var(--primary-color)]">
                  <FaIdBadge aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-semibold">Professional information</h2>
                  <p className="text-xs text-[var(--ui-text-muted)]">Role, designation, and employment details</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InputField
                  label="Full name *"
                  name="fullName"
                  value={values.fullName}
                  placeholder="e.g. Rahat Ahmed"
                  required
                  error={errors.fullName}
                  onChange={updateField("fullName")}
                />
                <InputField
                  label="Employee code *"
                  name="employeeCode"
                  value={values.employeeCode}
                  placeholder="e.g. EMP-321"
                  required
                  error={errors.employeeCode}
                  onChange={updateField("employeeCode")}
                />
                <InputField
                  label="Designation *"
                  name="designation"
                  value={values.designation}
                  placeholder="e.g. Software Engineer"
                  required
                  error={errors.designation}
                  onChange={updateField("designation")}
                />
                <InputField
                  label="Department *"
                  name="department"
                  value={values.department}
                  placeholder="e.g. IT, Sales"
                  required
                  error={errors.department}
                  onChange={updateField("department")}
                />
                <div className="ui-field">
                  <label className="ui-label" htmlFor="employmentType">Employment type</label>
                  <select
                    id="employmentType"
                    name="employmentType"
                    value={values.employmentType}
                    onChange={updateField("employmentType")}
                    className={fieldClass}
                  >
                    <option value="FULL_TIME">Full Time</option>
                    <option value="PART_TIME">Part Time</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="INTERN">Intern</option>
                  </select>
                </div>
                <div className="ui-field">
                  <label className="ui-label" htmlFor="gender">Gender</label>
                  <select
                    id="gender"
                    name="gender"
                    value={values.gender}
                    onChange={updateField("gender")}
                    className={fieldClass}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <InputField
                  label="Date of joining *"
                  name="dateOfJoining"
                  type="date"
                  value={values.dateOfJoining}
                  required
                  error={errors.dateOfJoining}
                  onChange={updateField("dateOfJoining")}
                />
                <InputField
                  label="Date of birth"
                  name="dateOfBirth"
                  type="date"
                  value={values.dateOfBirth}
                  onChange={updateField("dateOfBirth")}
                />
                <InputField
                  label="Date of leaving"
                  name="dateOfLeaving"
                  type="date"
                  value={values.dateOfLeaving}
                  onChange={updateField("dateOfLeaving")}
                />
                <InputField
                  label="Work location"
                  name="workLocation"
                  value={values.workLocation}
                  placeholder="e.g. Dhaka Office"
                  onChange={updateField("workLocation")}
                />
                <InputField
                  label="Role"
                  name="role"
                  value={values.role}
                  placeholder="e.g. EMPLOYEE"
                  onChange={updateField("role")}
                />
              </div>
            </section>

            {/* Section 2: Contact & Address Information */}
            <section className="rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-5 shadow-[var(--ui-shadow-card)] sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                  <FaPhoneAlt aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-semibold">Contact & address information</h2>
                  <p className="text-xs text-[var(--ui-text-muted)]">Personal contact details and residential address</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InputField
                  label="Phone number *"
                  name="phoneNumber"
                  type="tel"
                  value={values.phoneNumber}
                  placeholder="e.g. 01712345671"
                  required
                  error={errors.phoneNumber}
                  onChange={updateField("phoneNumber")}
                />
                <InputField
                  label="Alternate phone"
                  name="altPhoneNumber"
                  type="tel"
                  value={values.altPhoneNumber}
                  placeholder="e.g. 01812345678"
                  onChange={updateField("altPhoneNumber")}
                />
                <InputField
                  label="Email address"
                  name="email"
                  type="email"
                  value={values.email}
                  placeholder="employee@example.com"
                  error={errors.email}
                  onChange={updateField("email")}
                />
                <InputField
                  label="National ID (NID)"
                  name="nationalId"
                  value={values.nationalId}
                  placeholder="e.g. 1234567890123"
                  onChange={updateField("nationalId")}
                />
                <div className="ui-field sm:col-span-2">
                  <label className="ui-label" htmlFor="address">Address</label>
                  <textarea
                    id="address"
                    name="address"
                    value={values.address}
                    onChange={updateField("address")}
                    rows={2}
                    placeholder="e.g. Dhaka, Bangladesh"
                    className={`${fieldClass} h-auto py-2.5`}
                  />
                </div>
                <InputField
                  label="City"
                  name="city"
                  value={values.city}
                  placeholder="e.g. Dhaka"
                  onChange={updateField("city")}
                />
                <InputField
                  label="State / Province"
                  name="state"
                  value={values.state}
                  placeholder="e.g. Dhaka"
                  onChange={updateField("state")}
                />
                <InputField
                  label="Country"
                  name="country"
                  value={values.country}
                  placeholder="e.g. Bangladesh"
                  onChange={updateField("country")}
                />
                <InputField
                  label="Postal code"
                  name="postalCode"
                  value={values.postalCode}
                  placeholder="e.g. 1207"
                  onChange={updateField("postalCode")}
                />
              </div>
            </section>

            {/* Section 3: Cash-Boi App Access (Login Phone & 4-Digit PIN) */}
            <section className="rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-5 shadow-[var(--ui-shadow-card)] sm:p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                    <FaMobileAlt aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="font-semibold">Cash-Boi App Access</h2>
                    <p className="text-xs text-[var(--ui-text-muted)]">
                      Enable mobile application login access for this employee
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={values.hasAppAccess}
                    onChange={(e) => handleAppAccessToggle(e.target.checked)}
                    className="h-4 w-4 rounded text-[var(--primary-color)] focus:ring-[var(--primary-color)]"
                  />
                  <span className="text-xs font-semibold">Enable App Access</span>
                </label>
              </div>

              {values.hasAppAccess ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2 border-t border-[var(--ui-border)]">
                  <div>
                    <InputField
                      label="App Login Phone Number *"
                      name="appUsername"
                      value={values.appUsername || values.phoneNumber}
                      placeholder="01712345671"
                      required
                      error={errors.appUsername}
                      onChange={updateField("appUsername")}
                    />
                    <p className="mt-1 text-[11px] text-[var(--ui-text-muted)]">
                      The employee logs into the Cash-Boi mobile app using this phone number.
                    </p>
                  </div>

                  <div>
                    <InputField
                      label="4-Digit App PIN *"
                      name="appPassword"
                      type="password"
                      value={values.appPassword}
                      placeholder="e.g. 1234"
                      maxLength={4}
                      required
                      error={errors.appPassword}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/\D/g, "").slice(0, 4);
                        setValues((prev) => ({ ...prev, appPassword: clean }));
                        setErrors((prev) => ({ ...prev, appPassword: undefined }));
                      }}
                    />
                    <p className="mt-1 text-[11px] text-[var(--ui-text-muted)]">
                      4-digit numeric login PIN for mobile app authentication.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[var(--ui-text-muted)] italic">
                  Check "Enable App Access" above to assign an app login phone number and 4-digit PIN.
                </p>
              )}
            </section>

            {/* Section 4: Payroll & Banking Details */}
            <section className="rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-5 shadow-[var(--ui-shadow-card)] sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                  <FaMoneyBillWave aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-semibold">Payroll & bank details</h2>
                  <p className="text-xs text-[var(--ui-text-muted)]">Salary, currency, frequency and banking information</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InputField
                  label="Present salary"
                  name="presentSalary"
                  type="number"
                  min="0"
                  step="0.01"
                  value={values.presentSalary}
                  placeholder="50000.00"
                  error={errors.presentSalary}
                  onChange={updateField("presentSalary")}
                />
                <InputField
                  label="Salary currency"
                  name="salaryCurrency"
                  value={values.salaryCurrency}
                  placeholder="BDT"
                  onChange={updateField("salaryCurrency")}
                />
                <div className="ui-field">
                  <label className="ui-label" htmlFor="payFrequency">Pay frequency</label>
                  <select
                    id="payFrequency"
                    name="payFrequency"
                    value={values.payFrequency}
                    onChange={updateField("payFrequency")}
                    className={fieldClass}
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="DAILY">Daily</option>
                  </select>
                </div>
                <InputField
                  label="Bank account number"
                  name="bankAccountNumber"
                  value={values.bankAccountNumber}
                  placeholder="e.g. 1234567890"
                  onChange={updateField("bankAccountNumber")}
                />
                <InputField
                  label="Bank name"
                  name="bankName"
                  value={values.bankName}
                  placeholder="e.g. Dutch-Bangla Bank"
                  onChange={updateField("bankName")}
                />
              </div>
            </section>

            {/* Section 5: Emergency Contact & Notes */}
            <section className="rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-5 shadow-[var(--ui-shadow-card)] sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                  <FaShieldAlt aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-semibold">Emergency contact & notes</h2>
                  <p className="text-xs text-[var(--ui-text-muted)]">Emergency contact person and administrative notes</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InputField
                  label="Emergency contact name"
                  name="emergencyContactName"
                  value={values.emergencyContactName}
                  placeholder="e.g. Abdul Karim"
                  onChange={updateField("emergencyContactName")}
                />
                <InputField
                  label="Emergency contact phone"
                  name="emergencyContactPhone"
                  type="tel"
                  value={values.emergencyContactPhone}
                  placeholder="e.g. 01912345678"
                  onChange={updateField("emergencyContactPhone")}
                />
                <InputField
                  label="Relationship"
                  name="emergencyContactRelation"
                  value={values.emergencyContactRelation}
                  placeholder="e.g. Father, Spouse, Brother"
                  onChange={updateField("emergencyContactRelation")}
                />
                <div className="ui-field sm:col-span-2">
                  <label className="ui-label" htmlFor="notes">Notes</label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={values.notes}
                    onChange={updateField("notes")}
                    placeholder="e.g. New employee"
                    rows={3}
                    className={`${fieldClass} h-auto py-2.5`}
                  />
                </div>
              </div>
            </section>

            {/* Bottom Buttons */}
            <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row pb-6">
              <Button
                label={isEditMode ? "Cancel / Reset" : "Reset form"}
                variant="secondary"
                onClick={handleReset}
                disabled={isPending}
              />
              <Button
                label={
                  isEditMode
                    ? updateMutation.isPending
                      ? "Updating employee..."
                      : "Update Employee"
                    : insertMutation.isPending
                    ? "Saving employee..."
                    : "Save Employee"
                }
                variant="primary"
                type="submit"
                disabled={isPending}
              />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
