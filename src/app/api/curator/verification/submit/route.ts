import { appendCuratorVerificationSubmission } from "@/lib/curator/verification-store";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ message: "Expected a multipart form payload" }, { status: 400 });
  }

  const errors: Record<string, string> = {};
  const text = (key: string) => String(form.get(key) ?? "").trim();

  if (!text("fullName")) errors.fullName = "Full name is required.";
  if (!EMAIL_PATTERN.test(text("email"))) errors.email = "A valid email is required.";
  if (!text("specialization")) errors.specialization = "Specialization is required.";

  const documents = form.getAll("documents").filter((d): d is File => d instanceof File);
  if (documents.length === 0) {
    errors.documents = "At least one verification document is required.";
  } else if (documents.some((d) => !ACCEPTED_TYPES.includes(d.type) || d.size > MAX_FILE_SIZE)) {
    errors.documents = "Documents must be PDF, JPEG, PNG or WEBP files under 10 MB.";
  }

  if (Object.keys(errors).length > 0) {
    return Response.json({ message: "Please fix the highlighted fields.", errors }, { status: 400 });
  }

  const submittedAt = new Date().toISOString();
  const record = {
    id: `${Date.now()}`,
    status: "pending" as const,
    submittedAt,
    fullName: text("fullName"),
    specialization: text("specialization"),
  };

  // Persist the submission so `/api/curator/verification/status` can show it in
  // the curator's history.
  await appendCuratorVerificationSubmission(record);

  return Response.json(
    { id: record.id, status: record.status, submittedAt: record.submittedAt },
    { status: 201 },
  );
}
