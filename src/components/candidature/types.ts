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

export type FormVisibility = "public" | "internal_staff";
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
  fields: ApplicationFormField[];
}

export type ApplicationStatus = "pending" | "under_review" | "accepted" | "rejected";

export interface ApplicationSubmission {
  id: string;
  form_id: string;
  user_id: string;
  citizen_id?: string | null;
  applicant_name: string;
  applicant_nickname: string;
  applicant_email?: string;
  applicant_discord?: string;
  status: ApplicationStatus;
  answers: Record<string, any>;
  reviewer_id?: string | null;
  reviewer_notes?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
  application_forms?: ApplicationForm | null;
}
