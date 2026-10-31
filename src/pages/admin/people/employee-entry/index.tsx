import { useState, type ChangeEvent, type FormEvent } from "react";
import { FaBriefcase, FaIdBadge, FaUserPlus } from "react-icons/fa";
import Button from "@/components/button/Button";
import InputField from "@/components/form/TextInput";
import PageHeader from "@/components/page-header/PageHeader";
import { showErrorToast, showSuccessToast } from "@/utils/toast-utils";

type EmployeeFormValues = {
  fullName: string;
  employeeId: string;
  status: string;
  grade: string;
  designation: string;
  division: string;
  parentFunction: string;
  confirmationDate: string;
  location: string;
  bloodGroup: string;
  fatherName: string;
  motherName: string;
  religion: string;
  dateOfBirth: string;
  costCenter: string;
  maritalStatus: string;
  spouseName: string;
  email: string;
  phone: string;
  employmentType: string;
  startDate: string;
  salary: string;
  nationalId: string;
  passportId: string;
  drivingLicense: string;
  officePhone: string;
  birthCertificate: string;
  officeEmail: string;
  extensionNumber: string;
  tinNumber: string;
  presentAddress: string;
  presentHouseNo: string;
  presentVillage: string;
  presentPoliceStation: string;
  presentDistrict: string;
  presentDivision: string;
  presentPostOffice: string;
  permanentAddress: string;
  permanentHouseNo: string;
  permanentVillage: string;
  permanentPoliceStation: string;
  permanentDistrict: string;
  permanentDivision: string;
  permanentPostOffice: string;
  notes: string;
};

const initialValues: EmployeeFormValues = {
  fullName: "",
  employeeId: "",
  status: "Permanent",
  grade: "",
  designation: "",
  division: "",
  parentFunction: "",
  confirmationDate: "",
  location: "",
  bloodGroup: "",
  fatherName: "",
  motherName: "",
  religion: "",
  dateOfBirth: "",
  costCenter: "",
  maritalStatus: "",
  spouseName: "",
  email: "",
  phone: "",
  employmentType: "Full-time",
  startDate: "",
  salary: "",
  nationalId: "",
  passportId: "",
  drivingLicense: "",
  officePhone: "",
  birthCertificate: "",
  officeEmail: "",
  extensionNumber: "",
  tinNumber: "",
  presentAddress: "",
  presentHouseNo: "",
  presentVillage: "",
  presentPoliceStation: "",
  presentDistrict: "",
  presentDivision: "",
  presentPostOffice: "",
  permanentAddress: "",
  permanentHouseNo: "",
  permanentVillage: "",
  permanentPoliceStation: "",
  permanentDistrict: "",
  permanentDivision: "",
  permanentPostOffice: "",
  notes: "",
};

type EmployeeField = keyof EmployeeFormValues;
type EmployeeErrors = Partial<Record<EmployeeField, string>>;

const fieldClass =
  "ui-control w-full bg-[var(--ui-surface)] text-[var(--ui-text)]";

export default function EmployeeEntryPage() {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<EmployeeErrors>({});

  const updateField =
    (field: keyof EmployeeFormValues) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setValues((current) => ({ ...current, [field]: event.target.value }));
      setErrors((current) => ({ ...current, [field]: undefined }));
    };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: EmployeeErrors = {};
    const requiredFields: EmployeeField[] = [
      "fullName",
      "employeeId",
      "email",
      "phone",
      "designation",
      "division",
      "startDate",
    ];

    requiredFields.forEach((field) => {
      if (!values[field].trim()) {
        nextErrors[field] = "This field is required.";
      }
    });
    if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (values.salary && Number(values.salary) < 0) {
      nextErrors.salary = "Salary cannot be negative.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      showErrorToast("Please check the highlighted fields.");
      return;
    }
    showSuccessToast("Form validated - demo only, no employee data was saved.");
  };

  const handleReset = () => {
    setValues(initialValues);
    setErrors({});
  };

  return (
    <div className="min-h-full bg-[var(--ui-surface-muted)] px-4 py-5 text-[var(--ui-text)] sm:px-6 lg:px-8">
      <div className="ui-page mx-auto w-full space-y-5">
        <PageHeader
          headerTitle="Employee entry"
          headerDescription="Create an employee profile and preview your active theme."
        />

        <div className="grid items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <section className="overflow-hidden rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] shadow-[var(--ui-shadow-card)]">
              <div className="h-24 bg-[var(--primary-color)]" />
              <div className="px-5 pb-5">
                <div className="-mt-10 flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-[var(--ui-surface)] bg-[var(--primary-color-light)] text-3xl font-bold text-[var(--primary-color)] shadow-sm">
                  {values.fullName.trim().charAt(0).toUpperCase() || (
                    <FaUserPlus aria-hidden="true" className="text-xl" />
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
                    {values.status}
                  </span>
                  <span className="rounded-full border border-[var(--ui-border)] bg-[var(--ui-surface-muted)] px-3 py-1 text-xs font-medium text-[var(--ui-text-muted)]">
                    {values.employmentType}
                  </span>
                </div>
                <div className="mt-5 space-y-3 border-t border-[var(--ui-border)] pt-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[var(--ui-text-muted)]">Employee ID</span>
                    <span className="font-medium">{values.employeeId || "Not set"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[var(--ui-text-muted)]">Division</span>
                    <span className="font-medium">{values.division || "Not set"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[var(--ui-text-muted)]">Start date</span>
                    <span className="font-medium">{values.startDate || "Not set"}</span>
                  </div>
                </div>
              </div>
            </section>

            <div className="rounded-2xl border border-[var(--primary-color-muted)] bg-[var(--primary-color-light)] p-4">
              <div className="flex items-center gap-2 font-semibold text-[var(--primary-color-dark)]">
                <FaBriefcase aria-hidden="true" />
                Theme preview
              </div>
              <p className="mt-2 text-sm text-[var(--ui-text-muted)]">
                Fields, cards, and buttons follow your current appearance settings. This demo does not save employee data.
              </p>
            </div>
          </aside>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <section className="rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-5 shadow-[var(--ui-shadow-card)] sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-color-light)] text-[var(--primary-color)]">
                  <FaIdBadge aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-semibold">Personal information</h2>
                  <p className="text-xs text-[var(--ui-text-muted)]">Identity and contact details</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InputField
                  label="Full name"
                  name="fullName"
                  value={values.fullName}
                  placeholder="e.g. Alex Morgan"
                  required
                  error={errors.fullName}
                  onChange={updateField("fullName")}
                />
                <InputField
                  label="Employee ID"
                  name="employeeId"
                  value={values.employeeId}
                  placeholder="e.g. EMP-001"
                  required
                  error={errors.employeeId}
                  onChange={updateField("employeeId")}
                />
                <InputField
                  label="Email address"
                  name="email"
                  type="email"
                  value={values.email}
                  placeholder="alex@company.com"
                  required
                  error={errors.email}
                  onChange={updateField("email")}
                />
                <InputField
                  label="Phone number"
                  name="phone"
                  type="tel"
                  value={values.phone}
                  placeholder="+880 1XXX-XXXXXX"
                  required
                  error={errors.phone}
                  onChange={updateField("phone")}
                />
                <div className="ui-field">
                  <label className="ui-label" htmlFor="status">Employee status</label>
                  <select id="status" name="status" value={values.status} onChange={updateField("status")} className={fieldClass}>
                    <option>Permanent</option>
                    <option>Probation</option>
                    <option>Contract</option>
                    <option>Temporary</option>
                  </select>
                </div>
                <InputField label="Grade" name="grade" value={values.grade} placeholder="e.g. M16" onChange={updateField("grade")} />
                <InputField
                  label="Designation"
                  name="designation"
                  value={values.designation}
                  placeholder="e.g. Executive"
                  required
                  error={errors.designation}
                  onChange={updateField("designation")}
                />
                <InputField label="Division" name="division" value={values.division} placeholder="e.g. Factory Administration" onChange={updateField("division")} />
                <InputField label="Parent function" name="parentFunction" value={values.parentFunction} placeholder="e.g. HR Management" onChange={updateField("parentFunction")} />
                <InputField
                  label="Joining date"
                  name="startDate"
                  type="date"
                  value={values.startDate}
                  required
                  error={errors.startDate}
                  onChange={updateField("startDate")}
                />
                <InputField label="Confirmation date" name="confirmationDate" type="date" value={values.confirmationDate} onChange={updateField("confirmationDate")} />
                <InputField label="Location" name="location" value={values.location} placeholder="e.g. Factory" onChange={updateField("location")} />
                <div className="ui-field">
                  <label className="ui-label" htmlFor="bloodGroup">Blood group</label>
                  <select id="bloodGroup" name="bloodGroup" value={values.bloodGroup} onChange={updateField("bloodGroup")} className={fieldClass}>
                    <option value="">Select blood group</option>
                    <option>A+</option><option>A-</option><option>B+</option><option>B-</option>
                    <option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
                  </select>
                </div>
                <InputField label="Father's name" name="fatherName" value={values.fatherName} onChange={updateField("fatherName")} />
                <InputField label="Mother's name" name="motherName" value={values.motherName} onChange={updateField("motherName")} />
                <InputField label="Religion" name="religion" value={values.religion} onChange={updateField("religion")} />
                <InputField label="Date of birth" name="dateOfBirth" type="date" value={values.dateOfBirth} onChange={updateField("dateOfBirth")} />
                <InputField label="Cost center" name="costCenter" value={values.costCenter} placeholder="e.g. M10016001" onChange={updateField("costCenter")} />
                <div className="ui-field">
                  <label className="ui-label" htmlFor="maritalStatus">Marital status</label>
                  <select id="maritalStatus" name="maritalStatus" value={values.maritalStatus} onChange={updateField("maritalStatus")} className={fieldClass}>
                    <option value="">Select status</option>
                    <option>Single</option><option>Married</option><option>Divorced</option><option>Widowed</option>
                  </select>
                </div>
                {values.maritalStatus === "Married" && (
                  <InputField label="Spouse name" name="spouseName" value={values.spouseName} onChange={updateField("spouseName")} />
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-5 shadow-[var(--ui-shadow-card)] sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--ui-success-light)] text-[var(--ui-success-dark)]">
                  <FaUserPlus aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-semibold">Contact & identification</h2>
                  <p className="text-xs text-[var(--ui-text-muted)]">Personal and office contact details</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InputField label="National ID" name="nationalId" value={values.nationalId} onChange={updateField("nationalId")} />
                <InputField label="Passport ID" name="passportId" value={values.passportId} onChange={updateField("passportId")} />
                <InputField label="Driving license" name="drivingLicense" value={values.drivingLicense} onChange={updateField("drivingLicense")} />
                <InputField label="Birth certificate" name="birthCertificate" value={values.birthCertificate} onChange={updateField("birthCertificate")} />
                <InputField label="Office phone" name="officePhone" type="tel" value={values.officePhone} onChange={updateField("officePhone")} />
                <InputField label="Office email" name="officeEmail" type="email" value={values.officeEmail} onChange={updateField("officeEmail")} />
                <InputField label="Extension number" name="extensionNumber" value={values.extensionNumber} onChange={updateField("extensionNumber")} />
                <InputField label="TIN number" name="tinNumber" value={values.tinNumber} onChange={updateField("tinNumber")} />
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-5 shadow-[var(--ui-shadow-card)] sm:p-6">
              <div className="mb-5">
                <h2 className="font-semibold">Present address</h2>
                <p className="text-xs text-[var(--ui-text-muted)]">Where the employee currently lives</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="ui-field sm:col-span-2">
                  <label className="ui-label" htmlFor="presentAddress">Full address</label>
                  <textarea id="presentAddress" name="presentAddress" value={values.presentAddress} onChange={updateField("presentAddress")} rows={2} placeholder="House, road, area, and other address details" className={`${fieldClass} h-auto py-2.5`} />
                </div>
                <InputField label="House no." name="presentHouseNo" value={values.presentHouseNo} onChange={updateField("presentHouseNo")} />
                <InputField label="Village / area" name="presentVillage" value={values.presentVillage} onChange={updateField("presentVillage")} />
                <InputField label="Police station" name="presentPoliceStation" value={values.presentPoliceStation} onChange={updateField("presentPoliceStation")} />
                <InputField label="Post office" name="presentPostOffice" value={values.presentPostOffice} onChange={updateField("presentPostOffice")} />
                <InputField label="District" name="presentDistrict" value={values.presentDistrict} onChange={updateField("presentDistrict")} />
                <InputField label="Division" name="presentDivision" value={values.presentDivision} onChange={updateField("presentDivision")} />
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-5 shadow-[var(--ui-shadow-card)] sm:p-6">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Permanent address</h2>
                  <p className="text-xs text-[var(--ui-text-muted)]">Registered or home address</p>
                </div>
                <button
                  type="button"
                  className="text-xs font-semibold text-[var(--primary-color)] hover:underline"
                  onClick={() => setValues((current) => ({
                    ...current,
                    permanentAddress: current.presentAddress,
                    permanentHouseNo: current.presentHouseNo,
                    permanentVillage: current.presentVillage,
                    permanentPoliceStation: current.presentPoliceStation,
                    permanentDistrict: current.presentDistrict,
                    permanentDivision: current.presentDivision,
                    permanentPostOffice: current.presentPostOffice,
                  }))}
                >
                  Copy present address
                </button>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="ui-field sm:col-span-2">
                  <label className="ui-label" htmlFor="permanentAddress">Full address</label>
                  <textarea id="permanentAddress" name="permanentAddress" value={values.permanentAddress} onChange={updateField("permanentAddress")} rows={2} placeholder="House, road, area, and other address details" className={`${fieldClass} h-auto py-2.5`} />
                </div>
                <InputField label="House no." name="permanentHouseNo" value={values.permanentHouseNo} onChange={updateField("permanentHouseNo")} />
                <InputField label="Village / area" name="permanentVillage" value={values.permanentVillage} onChange={updateField("permanentVillage")} />
                <InputField label="Police station" name="permanentPoliceStation" value={values.permanentPoliceStation} onChange={updateField("permanentPoliceStation")} />
                <InputField label="Post office" name="permanentPostOffice" value={values.permanentPostOffice} onChange={updateField("permanentPostOffice")} />
                <InputField label="District" name="permanentDistrict" value={values.permanentDistrict} onChange={updateField("permanentDistrict")} />
                <InputField label="Division" name="permanentDivision" value={values.permanentDivision} onChange={updateField("permanentDivision")} />
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-5 shadow-[var(--ui-shadow-card)] sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-color-light)] text-[var(--primary-color)]">
                  <FaBriefcase aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-semibold">Work arrangement</h2>
                  <p className="text-xs text-[var(--ui-text-muted)]">Optional payroll preview fields</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="ui-field">
                  <label className="ui-label" htmlFor="employmentType">Employment type</label>
                  <select id="employmentType" name="employmentType" value={values.employmentType} onChange={updateField("employmentType")} className={fieldClass}>
                    <option>Full-time</option><option>Part-time</option><option>Contract</option><option>Intern</option>
                  </select>
                </div>
                <InputField label="Monthly salary" name="salary" type="number" min="0" step="0.01" value={values.salary} placeholder="0.00" error={errors.salary} onChange={updateField("salary")} />
                <div className="ui-field sm:col-span-2">
                  <label className="ui-label" htmlFor="notes">Notes</label>
                  <textarea id="notes" name="notes" value={values.notes} onChange={updateField("notes")} placeholder="Optional notes about this employee" rows={3} className={`${fieldClass} h-auto py-2.5`} />
                </div>
              </div>
            </section>

            <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
              <Button label="Reset form" variant="secondary" onClick={handleReset} />
              <Button label="Validate demo form" variant="primary" type="submit" />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
