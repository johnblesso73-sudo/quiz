
CREATE TABLE public.participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  registration_number TEXT NOT NULL,
  college_email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_participants_reg ON public.participants (registration_number);
CREATE INDEX idx_participants_email ON public.participants (college_email);

CREATE TABLE public.quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'published',
  question_count INTEGER NOT NULL DEFAULT 25,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_option TEXT NOT NULL CHECK (correct_option IN ('A','B','C','D')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (quiz_id, display_order)
);

CREATE TABLE public.attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  score INTEGER,
  max_score INTEGER NOT NULL DEFAULT 25,
  status TEXT NOT NULL DEFAULT 'in_progress',
  integrity_event_count INTEGER NOT NULL DEFAULT 0,
  result_token UUID NOT NULL DEFAULT gen_random_uuid(),
  client_fingerprint TEXT
);
CREATE INDEX idx_attempts_participant ON public.attempts (participant_id);
CREATE INDEX idx_attempts_started ON public.attempts (started_at DESC);
CREATE INDEX idx_attempts_status ON public.attempts (status);

CREATE TABLE public.responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id UUID NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_option TEXT CHECK (selected_option IN ('A','B','C','D')),
  is_correct BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, question_id)
);
CREATE INDEX idx_responses_attempt ON public.responses (attempt_id);

CREATE TABLE public.integrity_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id UUID NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  notification_status TEXT NOT NULL DEFAULT 'pending'
);
CREATE INDEX idx_integrity_attempt ON public.integrity_events (attempt_id);
CREATE INDEX idx_integrity_type ON public.integrity_events (event_type);
CREATE INDEX idx_integrity_time ON public.integrity_events (occurred_at DESC);

GRANT ALL ON public.participants TO service_role;
GRANT ALL ON public.quizzes TO service_role;
GRANT ALL ON public.questions TO service_role;
GRANT ALL ON public.attempts TO service_role;
GRANT ALL ON public.responses TO service_role;
GRANT ALL ON public.integrity_events TO service_role;

ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrity_events ENABLE ROW LEVEL SECURITY;

INSERT INTO public.quizzes (id, title, status, question_count)
VALUES ('11111111-1111-4111-8111-111111111111', 'Design Thinking – 25 MCQs', 'published', 25);

INSERT INTO public.questions (quiz_id, display_order, question_text, options, correct_option) VALUES
('11111111-1111-4111-8111-111111111111', 1, 'Design Thinking is mainly a ______ approach to problem-solving.', '{"A":"Machine-centered","B":"Human-centered","C":"Finance-centered","D":"Product-centered"}', 'B'),
('11111111-1111-4111-8111-111111111111', 2, 'Which Design Thinking question helps understand the current situation and user problems?', '{"A":"What works?","B":"What wows?","C":"What is?","D":"What next?"}', 'C'),
('11111111-1111-4111-8111-111111111111', 3, 'Which question encourages designers to explore new possibilities?', '{"A":"What if?","B":"What works?","C":"What is?","D":"What fails?"}', 'A'),
('11111111-1111-4111-8111-111111111111', 4, '“What wows?” focuses mainly on creating a solution with:', '{"A":"Higher production cost","B":"Positive user experience and value","C":"More technical complexity","D":"Less user involvement"}', 'B'),
('11111111-1111-4111-8111-111111111111', 5, 'Which question is concerned with testing and implementation?', '{"A":"What is?","B":"What if?","C":"What wows?","D":"What works?"}', 'D'),
('11111111-1111-4111-8111-111111111111', 6, 'Which tool helps understand what users say, think, do, and feel?', '{"A":"Storyboard","B":"Empathy map","C":"Prototype","D":"Mind map"}', 'B'),
('11111111-1111-4111-8111-111111111111', 7, 'A user persona represents:', '{"A":"A final product","B":"A company manager","C":"A typical target user","D":"A project budget"}', 'C'),
('11111111-1111-4111-8111-111111111111', 8, 'Which tool shows the user’s experience step by step?', '{"A":"Customer journey map","B":"Observation","C":"Brainstorming","D":"Prototyping"}', 'A'),
('11111111-1111-4111-8111-111111111111', 9, 'Which method helps designers study actual user behaviour in a real environment?', '{"A":"Mind mapping","B":"Observation","C":"Storyboarding","D":"Prototyping"}', 'B'),
('11111111-1111-4111-8111-111111111111', 10, 'The main purpose of interviews in Design Thinking is to:', '{"A":"Manufacture products","B":"Collect direct information from users","C":"Advertise a solution","D":"Reduce the project budget"}', 'B'),
('11111111-1111-4111-8111-111111111111', 11, 'Which tool generates many ideas without early judgment?', '{"A":"Brainstorming","B":"User testing","C":"Customer journey mapping","D":"Observation"}', 'A'),
('11111111-1111-4111-8111-111111111111', 12, 'Mind mapping is mainly used to:', '{"A":"Build a final product","B":"Organize related ideas visually","C":"Conduct customer interviews","D":"Test a product in the market"}', 'B'),
('11111111-1111-4111-8111-111111111111', 13, 'Which tool presents a user experience as a visual sequence of events?', '{"A":"Empathy map","B":"Storyboarding","C":"Interview","D":"Survey"}', 'B'),
('11111111-1111-4111-8111-111111111111', 14, 'What is a prototype?', '{"A":"A final commercial product","B":"An early version of a solution","C":"A list of user complaints","D":"A marketing plan"}', 'B'),
('11111111-1111-4111-8111-111111111111', 15, 'Why is user testing conducted?', '{"A":"To evaluate a solution with real users","B":"To eliminate all creative ideas","C":"To avoid feedback","D":"To begin advertising immediately"}', 'A'),
('11111111-1111-4111-8111-111111111111', 16, 'What is the first phase of the Design Thinking process?', '{"A":"Define","B":"Test","C":"Empathize","D":"Prototype"}', 'C'),
('11111111-1111-4111-8111-111111111111', 17, 'During the Define phase, designers should:', '{"A":"Identify the actual problem","B":"Manufacture the final product","C":"Advertise the product","D":"Ignore research findings"}', 'A'),
('11111111-1111-4111-8111-111111111111', 18, 'Which phase involves generating creative solutions and ideas?', '{"A":"Empathize","B":"Ideate","C":"Test","D":"Deliver"}', 'B'),
('11111111-1111-4111-8111-111111111111', 19, 'Which sequence correctly represents the main project-design process?', '{"A":"Test → Define → Empathize → Prototype → Improve","B":"Empathize → Define → Ideate → Prototype → Test → Improve","C":"Define → Deliver → Prototype → Empathize → Test","D":"Prototype → Test → Empathize → Define → Ideate"}', 'B'),
('11111111-1111-4111-8111-111111111111', 20, 'The Double Diamond model consists of Discover, Define, Develop, and:', '{"A":"Design","B":"Deliver","C":"Decide","D":"Demonstrate"}', 'B'),
('11111111-1111-4111-8111-111111111111', 21, 'Which phase of the Double Diamond model focuses on understanding users and their problems through research?', '{"A":"Discover","B":"Define","C":"Develop","D":"Deliver"}', 'A'),
('11111111-1111-4111-8111-111111111111', 22, 'Which phase of the Double Diamond model involves generating ideas and creating prototypes?', '{"A":"Discover","B":"Define","C":"Develop","D":"Deliver"}', 'C'),
('11111111-1111-4111-8111-111111111111', 23, 'What does the Design Thinking principle “Defer Judgment” mean?', '{"A":"Reject ideas quickly","B":"Avoid testing ideas","C":"Do not immediately reject ideas during brainstorming","D":"Choose the first idea generated"}', 'C'),
('11111111-1111-4111-8111-111111111111', 24, 'What does “Fail Fast and Learn” encourage designers to do?', '{"A":"Avoid creating prototypes","B":"Learn from small failures during prototyping","C":"Stop the project after one failure","D":"Ignore user feedback"}', 'B'),
('11111111-1111-4111-8111-111111111111', 25, 'Which feature would improve safety and visibility in a school backpack?', '{"A":"Heavy metal frame","B":"Reflective safety elements","C":"Fewer compartments","D":"Fixed and non-adjustable straps"}', 'B');
