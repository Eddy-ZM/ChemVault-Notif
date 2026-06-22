with seed_notifications(user_id, title, body, type, source, link, metadata) as (
  values
    (
      '00000000-0000-0000-0000-000000000001'::uuid,
      'AI extraction completed',
      'Your uploaded paper has been processed successfully.',
      'success',
      'ai-extractor',
      '/projects/demo-project/results',
      '{"projectId":"demo-project","taskId":"task-001","fileName":"synthesis-study.pdf"}'::jsonb
    ),
    (
      '00000000-0000-0000-0000-000000000001'::uuid,
      'AI extraction failed',
      'The extractor could not parse the uploaded file. Review the file and try again.',
      'error',
      'ai-extractor',
      '/projects/demo-project/files',
      '{"projectId":"demo-project","taskId":"task-002","fileName":"bad-scan.pdf"}'::jsonb
    ),
    (
      '00000000-0000-0000-0000-000000000001'::uuid,
      'File uploaded successfully',
      'The dataset archive is ready for processing.',
      'success',
      'chemvault-files',
      '/files/demo-upload',
      '{"fileName":"lab-results.zip","sizeMb":48}'::jsonb
    ),
    (
      '00000000-0000-0000-0000-000000000001'::uuid,
      'System maintenance notice',
      'ChemVault services will undergo maintenance at 02:00 UTC.',
      'system',
      'system',
      null,
      '{"window":"2026-06-23T02:00:00Z"}'::jsonb
    ),
    (
      '00000000-0000-0000-0000-000000000001'::uuid,
      'Admin message',
      'Your workspace storage policy has been updated.',
      'message',
      'admin',
      '/settings/workspace',
      '{"policy":"storage-retention"}'::jsonb
    ),
    (
      '00000000-0000-0000-0000-000000000001'::uuid,
      'Project permission changed',
      'You now have editor access to the Catalyst Screening project.',
      'task',
      'chemvault-app',
      '/projects/catalyst-screening',
      '{"projectId":"catalyst-screening","role":"editor"}'::jsonb
    )
),
inserted as (
  insert into public.notifications (user_id, title, body, type, source, link, metadata)
  select user_id, title, body, type, source, link, metadata
  from seed_notifications
  returning id, user_id
)
insert into public.notification_events (notification_id, user_id, event_type, metadata)
select id, user_id, 'created', '{"seed":true}'::jsonb
from inserted;

insert into public.extraction_tasks (
  id,
  user_id,
  project_id,
  file_id,
  file_name,
  status,
  progress,
  error_message,
  metadata
)
values
  (
    '10000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    '20000000-0000-0000-0000-000000000001'::uuid,
    '30000000-0000-0000-0000-000000000001'::uuid,
    'catalyst-screening.pdf',
    'completed',
    100,
    null,
    '{"modelName":"chemvault-extractor-v1","tablesExtracted":8,"compoundsDetected":14,"validationPassed":true}'::jsonb
  ),
  (
    '10000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    '20000000-0000-0000-0000-000000000001'::uuid,
    '30000000-0000-0000-0000-000000000002'::uuid,
    'malformed-table-scan.pdf',
    'failed',
    82,
    'Unable to parse malformed table region.',
    '{"modelName":"chemvault-extractor-v1","errorMessage":"Unable to parse malformed table region."}'::jsonb
  )
on conflict (id) do nothing;
