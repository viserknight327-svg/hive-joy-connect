ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banner_url text,
  ADD COLUMN IF NOT EXISTS link_url text,
  ADD COLUMN IF NOT EXISTS about text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS accent text NOT NULL DEFAULT 'honey',
  ADD COLUMN IF NOT EXISTS pinned_video_id uuid;

CREATE TABLE IF NOT EXISTS public.saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  folder text NOT NULL DEFAULT 'Saved',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, video_id, folder)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saves TO authenticated;
GRANT ALL ON public.saves TO service_role;
ALTER TABLE public.saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own saves" ON public.saves FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, code)
);
GRANT SELECT, INSERT ON public.user_achievements TO authenticated;
GRANT SELECT ON public.user_achievements TO anon;
GRANT ALL ON public.user_achievements TO service_role;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "achievements readable" ON public.user_achievements FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "earn own achievements" ON public.user_achievements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.daily_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day date NOT NULL UNIQUE,
  prompt text NOT NULL,
  tag text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.daily_challenges TO authenticated, anon;
GRANT ALL ON public.daily_challenges TO service_role;
ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "challenges readable" ON public.daily_challenges FOR SELECT TO authenticated, anon USING (true);

CREATE TABLE IF NOT EXISTS public.challenge_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.daily_challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id uuid REFERENCES public.videos(id) ON DELETE SET NULL,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.challenge_entries TO authenticated;
GRANT ALL ON public.challenge_entries TO service_role;
ALTER TABLE public.challenge_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "entries readable" ON public.challenge_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "own entries write" ON public.challenge_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own entries delete" ON public.challenge_entries FOR DELETE TO authenticated USING (auth.uid() = user_id);

INSERT INTO public.daily_challenges (day, prompt, tag) VALUES
  (CURRENT_DATE, 'Share a clip hyping up someone who deserves it.', 'kindnesschallenge'),
  (CURRENT_DATE + 1, 'Show one tiny thing that made your day better.', 'tinyjoy'),
  (CURRENT_DATE + 2, 'Teach the hive a 30-second skill.', 'teachthehive'),
  (CURRENT_DATE + 3, 'Duet a creator with under 100 followers and cheer them on.', 'liftup'),
  (CURRENT_DATE + 4, 'Post your best wholesome fail.', 'wholesomefail')
ON CONFLICT (day) DO NOTHING;