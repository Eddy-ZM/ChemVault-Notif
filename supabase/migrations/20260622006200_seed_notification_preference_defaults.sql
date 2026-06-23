insert into public.notification_preference_defaults (
  category,
  channel,
  enabled,
  description
) values
  ('task_updates','in_app', true, 'Updates while AI tasks are running.'),
  ('task_updates','web_push', false, 'Updates while AI tasks are running.'),
  ('task_completed','in_app', true, 'Notifications when a task finishes successfully.'),
  ('task_completed','web_push', true, 'Notifications when a task finishes successfully.'),
  ('task_failed','in_app', true, 'Notifications when a task fails or needs attention.'),
  ('task_failed','web_push', true, 'Notifications when a task fails or needs attention.'),
  ('project_messages','in_app', true, 'Messages from project conversations.'),
  ('project_messages','web_push', true, 'Messages from project conversations.'),
  ('admin_announcements','in_app', true, 'Announcements from ChemVault admins.'),
  ('admin_announcements','web_push', true, 'Announcements from ChemVault admins.'),
  ('system_alerts','in_app', true, 'Important platform updates and maintenance notices.'),
  ('system_alerts','web_push', true, 'Important platform updates and maintenance notices.'),
  ('security','in_app', true, 'Account and security-related notifications.'),
  ('security','web_push', true, 'Account and security-related notifications.'),
  ('billing','in_app', true, 'Subscription and payment-related notifications.'),
  ('billing','web_push', true, 'Subscription and payment-related notifications.'),
  ('marketing','in_app', true, 'Product updates, feature launches, and promotional messages.'),
  ('marketing','web_push', false, 'Product updates, feature launches, and promotional messages.')
on conflict (category, channel) do nothing;
