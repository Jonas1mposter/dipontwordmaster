-- Add Math Vocabulary Badges
INSERT INTO badges (id, name, description, icon, category, rarity) VALUES
  (gen_random_uuid(), '数学启蒙', '完成第一个数学词汇学习', 'Calculator', 'math', 'common'),
  (gen_random_uuid(), '数学新手', '累计学习50个数学词汇', 'SquareFunction', 'math', 'rare'),
  (gen_random_uuid(), '数学达人', '累计学习100个数学词汇', 'Pi', 'math', 'epic'),
  (gen_random_uuid(), '数学大师', '累计掌握全部数学词汇', 'Sigma', 'math', 'legendary');

-- Add Science Vocabulary Badges
INSERT INTO badges (id, name, description, icon, category, rarity) VALUES
  (gen_random_uuid(), '科学启蒙', '完成第一个科学词汇学习', 'Atom', 'science', 'common'),
  (gen_random_uuid(), '科学新手', '累计学习100个科学词汇', 'Microscope', 'science', 'rare'),
  (gen_random_uuid(), '科学探索者', '累计学习300个科学词汇', 'FlaskConical', 'science', 'epic'),
  (gen_random_uuid(), '科学先锋', '累计学习500个科学词汇', 'Dna', 'science', 'legendary'),
  (gen_random_uuid(), '科学大师', '累计掌握全部科学词汇', 'Orbit', 'science', 'mythology');

-- Add Subject Master badges for completing all in a subject
INSERT INTO badges (id, name, description, icon, category, rarity) VALUES
  (gen_random_uuid(), '生物学家', '掌握全部生物(Biology)词汇', 'Leaf', 'science', 'legendary'),
  (gen_random_uuid(), '化学家', '掌握全部化学(Chemistry)词汇', 'TestTubes', 'science', 'legendary'),
  (gen_random_uuid(), '物理学家', '掌握全部物理(Physics)词汇', 'Zap', 'science', 'legendary');