-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Insert 10 achievements/badges
INSERT INTO badges (id, name, description, icon, category, rarity) VALUES
  (gen_random_uuid(), '初出茅庐', '完成第一次单词学习', '🌱', 'learning', 'common'),
  (gen_random_uuid(), '词汇新秀', '累计学习100个单词', '📚', 'learning', 'common'),
  (gen_random_uuid(), '词海探险家', '累计学习500个单词', '🗺️', 'learning', 'rare'),
  (gen_random_uuid(), '单词大师', '累计学习1000个单词', '🎓', 'learning', 'epic'),
  (gen_random_uuid(), '首战告捷', '赢得第一场排位赛', '⚔️', 'battle', 'common'),
  (gen_random_uuid(), '连胜新星', '连续赢得3场排位赛', '⭐', 'battle', 'rare'),
  (gen_random_uuid(), '不败战神', '连续赢得10场排位赛', '👑', 'battle', 'legendary'),
  (gen_random_uuid(), '坚持不懈', '保持7天连续学习', '🔥', 'streak', 'rare'),
  (gen_random_uuid(), '学霸之路', '保持30天连续学习', '💎', 'streak', 'epic'),
  (gen_random_uuid(), '完美主义者', '在一场比赛中答对全部题目', '🏆', 'battle', 'legendary')
ON CONFLICT DO NOTHING;