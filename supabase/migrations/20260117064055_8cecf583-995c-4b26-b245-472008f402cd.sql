-- Create cron job to check and award season rewards daily at midnight
SELECT cron.schedule(
  'award-season-rewards-daily',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ibhvjdnucfmdfmlmnlif.supabase.co/functions/v1/award-season-rewards',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImliaHZqZG51Y2ZtZGZtbG1ubGlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MTA3OTcsImV4cCI6MjA4MTk4Njc5N30.4yiNraibZJrcE4l-45EfpGMlf1V4EjQLnmIfHra91is"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);