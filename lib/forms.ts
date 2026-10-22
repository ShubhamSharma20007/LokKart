export type FormState = {
  ok: boolean;
  message?: string;
  ref?: string;
  errors: Record<string, string>;
  values: Record<string, string>;
};

export const initialState: FormState = { ok: false, errors: {}, values: {} };

export type Rule = {
  label: string;
  required?: boolean;
  email?: boolean;
  phone?: boolean;
  gst?: boolean;
  pincode?: boolean;
  positive?: boolean;
};

export function validate(fd: FormData, rules: Record<string, Rule>): FormState {
  const values: Record<string, string> = {};
  const errors: Record<string, string> = {};

  for (const [key, r] of Object.entries(rules)) {
    let v = String(fd.get(key) ?? "").trim();
    if (r.gst) v = v.toUpperCase();
    values[key] = v;

    if (!v) {
      if (r.required) errors[key] = `${r.label} is required`;
      continue;
    }
    if (r.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) errors[key] = "Enter a valid email address";
    if (r.phone) {
      let d = v.replace(/\D/g, "");
      if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
      if (!/^[6-9]\d{9}$/.test(d)) errors[key] = "Enter a 10-digit Indian mobile number";
    }
    if (r.gst && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v)) errors[key] = "Enter a valid 15-character GSTIN";
    if (r.pincode && !/^[1-9]\d{5}$/.test(v)) errors[key] = "Enter a 6-digit pincode";
    if (r.positive && !(Number(v) > 0)) errors[key] = `${r.label} must be more than 0`;
  }
  return { ok: Object.keys(errors).length === 0, errors, values };
}