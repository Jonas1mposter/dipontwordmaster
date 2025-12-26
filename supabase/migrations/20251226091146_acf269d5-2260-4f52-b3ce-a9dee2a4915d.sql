-- Create beta tester badge (red legendary/mythology quality)
INSERT INTO public.badges (name, icon, description, rarity, category)
VALUES (
  '内测先驱',
  '🔥',
  '狄邦单词通内测用户，感谢您的支持！',
  'legendary',
  'special'
);

-- Create beta tester name card (red gradient for mythology quality)
INSERT INTO public.name_cards (name, icon, description, background_gradient, rarity, category)
VALUES (
  '内测先驱',
  '🔥',
  '狄邦单词通内测用户，感谢您的支持！',
  'linear-gradient(135deg, #dc2626 0%, #b91c1c 25%, #991b1b 50%, #7f1d1d 75%, #450a0a 100%)',
  'legendary',
  'special'
);

-- Award the beta badge to all existing users
INSERT INTO public.user_badges (profile_id, badge_id)
SELECT p.id, b.id
FROM public.profiles p
CROSS JOIN public.badges b
WHERE b.name = '内测先驱'
ON CONFLICT DO NOTHING;

-- Award the beta name card to all existing users
INSERT INTO public.user_name_cards (profile_id, name_card_id)
SELECT p.id, nc.id
FROM public.profiles p
CROSS JOIN public.name_cards nc
WHERE nc.name = '内测先驱'
ON CONFLICT DO NOTHING;