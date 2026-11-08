grant select on public.learning_sessions to authenticated;
grant select on public.learning_session_items to authenticated;
grant select on public.student_topic_mastery to authenticated;

create policy "Students can read their own learning sessions"
  on public.learning_sessions for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Students can read their own learning answers"
  on public.learning_session_items for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Students can read their own topic mastery"
  on public.student_topic_mastery for select
  to authenticated
  using ((select auth.uid()) = user_id);
