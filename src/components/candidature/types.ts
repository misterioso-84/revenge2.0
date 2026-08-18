export type QuestionType = "text" | "textarea" | "radio" | "checkbox" | "select" | "number";

export interface ApplicationFormField {
  id: string;
  label: string;
  description?: string;
  type: QuestionType;
  options?: string[];
  required: boolean;
  placeholder?: string;
}

export type FormVisibility = "public" | "internal_staff" | "private";
export type FormStatus = "open" | "closed" | "draft";

export interface ApplicationForm {
  id: string;
  title: string;
  description: string;
  role_target: string;
  status: FormStatus;
  visibility: FormVisibility;
  created_by: string;
  created_at: string;
  updated_at: string;
  expires_at?: string | null;
  cooldown_days?: number | null;
  time_limit_minutes?: number | null;
  reset_timestamp?: string | null;
  external_url?: string | null;
  fields: ApplicationFormField[];
  // Fine-grained private whitelist access restrictions:
  allowed_roles?: string[] | null;
  allowed_minecraft_nicknames?: string[] | null;
  allowed_telegram_handles?: string[] | null;
}

export type ApplicationStatus =
  "draft" | "expired" | "pending" | "under_review" | "accepted" | "rejected";

export interface ApplicationSubmission {
  id: string;
  form_id: string;
  user_id: string;
  citizen_id?: string | null;
  applicant_name: string;
  applicant_nickname: string;
  applicant_email?: string;
  applicant_discord?: string;
  applicant_telegram?: string | null;
  status: ApplicationStatus;
  answers: Record<string, any>;
  reviewer_id?: string | null;
  reviewer_notes?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
  started_at?: string | null;
  time_extension_minutes?: number | null;
  allow_retry?: boolean | null;
  retry_granted_by?: string | null;
  retry_granted_at?: string | null;
  application_forms?: ApplicationForm | null;
}
