import { z } from "zod";

export const OPTION_KEYS = ["A", "B", "C", "D"] as const;
export type OptionKey = (typeof OPTION_KEYS)[number];

export const QUIZ_TITLE = "Design Thinking – 25 MCQs";
export const QUIZ_QUESTION_COUNT = 25;
export const QUIZ_MAX_SCORE = 25;
export const ESTIMATED_MINUTES = 15;

export const registrationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: "Please enter your full name (min 2 characters)." })
    .max(100, { message: "Name must be under 100 characters." }),
  registrationNumber: z
    .string()
    .trim()
    .min(3, { message: "Registration number is required." })
    .max(50, { message: "Registration number must be under 50 characters." })
    .regex(/^[A-Za-z0-9\-/]+$/, {
      message: "Use letters, numbers, hyphens or slashes only.",
    }),
  collegeEmail: z
    .string()
    .trim()
    .min(5, { message: "College email is required." })
    .max(255, { message: "Email must be under 255 characters." })
    .email({ message: "Enter a valid email address." }),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;

export const attemptCredentialsSchema = z.object({
  attemptId: z.string().uuid(),
  token: z.string().uuid(),
});

export const submitSchema = attemptCredentialsSchema.extend({
  answers: z.record(z.string().uuid(), z.enum(OPTION_KEYS)).default({}),
});

export const INTEGRITY_EVENT_TYPES = [
  "screenshot_key",
  "copy_attempt",
  "cut_attempt",
  "context_menu",
  "print_attempt",
  "visibility_hidden",
  "window_blur",
  "devtools_shortcut",
] as const;

export const integrityEventSchema = attemptCredentialsSchema.extend({
  eventType: z.enum(INTEGRITY_EVENT_TYPES),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
});

export const CAUGHT_MESSAGE = "YOU GOT CAUGHT IN 4K";

export type PublicQuestion = {
  id: string;
  displayOrder: number;
  questionText: string;
  options: Record<OptionKey, string>;
};

export type AttemptSession = {
  attemptId: string;
  token: string;
  participantName: string;
};

export type QuizResult = {
  attemptId: string;
  participantName: string;
  score: number;
  maxScore: number;
  percentage: number;
  submittedAt: string;
  integrityEventCount: number;
};
