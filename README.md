# Design Scholar

Build the attached Modern Quiz Website as a polished, modern 3D academic quiz experience. Treat the attached Product Requirements Document as the authoritative product specification and use its Appendix A quiz content/answer key exactly as supplied. Create a full-stack TypeScript app with Tailwind/shadcn and a secure backend/database architecture. IMPORTANT: the source PDF has some OCR-corrupted numeric placeholders, but Appendix A contains 25 questions and the answer-key mapping is for 25 questions; use 25 as the configured quiz count and max score.

VISUAL DIRECTION: Make it feel premium, futuristic, modern and distinctly 3D—not a generic flat form. Use a dark high-contrast neutral base with one electric indigo/violet accent, layered glassmorphism cards, soft volumetric gradients, subtle grid/noise, floating 3D geometric elements, depth shadows, perspective transforms, tasteful parallax/hover tilt, smooth spring-like transitions, animated progress, and polished micro-interactions. Keep decoration restrained enough for academic focus. Responsive on mobile/tablet/desktop. Use accessible contrast, visible labels, keyboard navigation, focus states, reduced-motion support, and never let visual effects interfere with usability.

FLOW: exactly three primary participant pages/states: (1) Welcome/Registration, (2) Quiz, (3) Result.
PAGE 1: Hero/welcome section with quiz title “Design Thinking – 25 MCQs”, concise instructions, estimated duration, privacy notice, and a premium 3D registration card. Required fields: Name, Registration Number, College Email ID. Validate client + server, trim values, reject empty name, validate email, reasonable max lengths. Show a live participant identity card saying “Welcome, {name}” before Start Quiz. Start Quiz disabled until valid. Footer credit exactly/substantially: “Website created by JohnBlesso, ROSHAN, Srinaath.”
PAGE 2: Quiz. Exactly 25 single-choice MCQs, four options A-D, stable numbering. Show participant name, “Question X of 25”, prominent animated progress bar, answered/unanswered state, and polished 3D question card. Prefer one-question-at-a-time navigation with Previous/Next and a final Submit Quiz action, while preserving answers during navigation. Include a compact question navigator/overview for desktop and mobile-friendly alternative. Warn before submission if unanswered; recommended policy is allow submit and treat unanswered as incorrect unless configured otherwise. Disable ordinary text selection/copy/context-menu/print shortcuts for question content while preserving keyboard and assistive technology behavior. Implement browser-available integrity signals: PrintScreen key where exposed, loss of page focus, visibility changes, suspicious copy attempts, etc. On supported screenshot-related signal show a warning overlay/toast containing “YOU GOT CAUGHT IN K”, record timestamped integrity event, associate with participant/attempt, and let participant continue; never claim OS screenshot detection is guaranteed, never auto-submit or erase answers. Do not collect webcam, microphone, screen recording, browsing history, or unrelated device data.
SECURITY: Correct answers, answer explanations, scoring metadata and answer key MUST NOT be sent to the browser before submission. Questions/options only on quiz load. Server-side grading against the authoritative mapping. Ignore client-provided score/correctness. Prevent duplicate submission and ensure refresh of result does not create another attempt/change score. Protect result access and rate-limit submissions.
PAGE 3: Strong centered 3D result card with participant name, score as X/25, percentage, completion message, optional attempt ID, and prominent instruction: “Please take a screenshot of this result for your records.” Do not expose answer key unless explicitly enabled.
DATA MODEL: Participant(id,name,registrationNumber,collegeEmail,createdAt); Quiz(id,title,status,questionCount,createdAt,updatedAt); Question(id,quizId,displayOrder,questionText,options,correctOption server-only,isActive); Attempt(id,participantId,quizId,startedAt,submittedAt,score,maxScore,status,integrityEventCount); Response(id,attemptId,questionId,selectedOption,isCorrect server-derived); IntegrityEvent(id,attemptId,participantId,eventType,occurredAt,metadata,notificationStatus). Add appropriate indexes/uniqueness.
ADMIN FOUNDATION: If a full admin dashboard is practical, include a protected admin area for viewing attempts, filtering by name/registration/email/score/date/event type and CSV export, but do not let it compromise answer secrecy. If admin authentication/credentials are not configured, keep the route protected and show a clear configuration state rather than insecure public access.
EMAIL: Architect integrity-event notification through a backend transactional email integration only; never expose credentials in frontend. Store notification status, avoid duplicates, tolerate temporary email failure. Since monitoring recipient/sender/college domain are not supplied in the PRD, make these configurable environment/settings values and do not invent real addresses.
QUIZ CONTENT: Use the 25 Design Thinking MCQs and options from the attached PDF exactly, including the wording and capitalization as provided. Use the authoritative answer mapping from Appendix A: 1-B, 2-C, 3-A, 4-B, 5-D, 6-B, 7-C, 8-A, 9-B, 10-B, 11-A, 12-B, 13-B, 14-B, 15-A, 16-C, 17-A, 18-B, 19-B, 20-B, 21-A, 22-C, 23-C, 24-B, 25-B. Keep correctOption server-only. Validate all 25 questions have exactly four options.
IMPLEMENTATION: Use Supabase/Postgres if available through Lovable for persistence. Seed the quiz and questions securely. Use server-side functions/endpoints for starting attempts, loading public questions, submitting answers, scoring, recording integrity events. Ensure no answer key appears in frontend bundle, public configuration, localStorage, or network response before submission. Include loading/error/retry states and graceful temporary network failure recovery. Add a testable architecture and sanity checks for 0/25 and 25/25 scoring and duplicate submissions.

Do not merely create a visual mockup: implement the actual working registration → quiz → secure submission → result flow. Make the final UI feel like a high-end 2026 3D product while preserving the PRD's academic, accessibility, security, and privacy requirements. The product requirements PDF is already attached in this conversation; use it as the source of truth for quiz content.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ab337d3b-d4bf-4e53-9aa7-38e38484a804).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
