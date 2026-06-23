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

insert into public.audit_logs (
  id,
  actor_user_id,
  actor_type,
  action,
  entity_type,
  entity_id,
  project_id,
  user_id,
  source,
  severity,
  visibility,
  title,
  description,
  metadata,
  created_at
)
values
  (
    '92000000-0000-0000-0000-000000000005'::uuid,
    null,
    'ai',
    'extraction_result.created',
    'extraction_result',
    '40000000-0000-0000-0000-000000000001'::uuid,
    '20000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'ai-extractor',
    'success',
    'admin',
    'Extraction result created',
    'AI extraction output is ready for human review.',
    '{"seed":true,"resultId":"40000000-0000-0000-0000-000000000001","taskId":"10000000-0000-0000-0000-000000000001","fileId":"30000000-0000-0000-0000-000000000001"}'::jsonb,
    now() - interval '14 minutes'
  ),
  (
    '92000000-0000-0000-0000-000000000006'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'user',
    'extraction_result.item_corrected',
    'extraction_result_item',
    '41000000-0000-0000-0000-000000000003'::uuid,
    '20000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'chemvault-results',
    'info',
    'admin',
    'Extraction result item corrected',
    null,
    '{"seed":true,"resultId":"40000000-0000-0000-0000-000000000001","itemType":"compound","status":"corrected"}'::jsonb,
    now() - interval '3 minutes'
  ),
  (
    '92000000-0000-0000-0000-000000000007'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'user',
    'extraction_result.export_created',
    'extraction_result_export',
    '43000000-0000-0000-0000-000000000001'::uuid,
    '20000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'chemvault-results',
    'success',
    'admin',
    'Extraction result export created',
    null,
    '{"seed":true,"resultId":"40000000-0000-0000-0000-000000000001","exportType":"json"}'::jsonb,
    now() - interval '1 minutes'
  )
on conflict (id) do nothing;

insert into public.project_files (
  id,
  project_id,
  user_id,
  storage_bucket,
  storage_path,
  original_file_name,
  file_name,
  mime_type,
  file_size,
  file_hash,
  status,
  processing_status,
  extraction_task_id,
  metadata,
  created_at
)
values
  (
    '30000000-0000-0000-0000-000000000001'::uuid,
    '20000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'project-files',
    '20000000-0000-0000-0000-000000000001/catalyst-screening.pdf',
    'catalyst-screening.pdf',
    'catalyst-screening.pdf',
    'application/pdf',
    2843312,
    'seed-sha256-catalyst-screening',
    'ready',
    'completed',
    '10000000-0000-0000-0000-000000000001'::uuid,
    '{"seed":true,"tablesExtracted":8,"compoundsDetected":14}'::jsonb,
    now() - interval '50 minutes'
  ),
  (
    '30000000-0000-0000-0000-000000000002'::uuid,
    '20000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'project-files',
    '20000000-0000-0000-0000-000000000001/malformed-table-scan.pdf',
    'malformed-table-scan.pdf',
    'malformed-table-scan.pdf',
    'application/pdf',
    1612304,
    'seed-sha256-malformed-scan',
    'failed',
    'failed',
    '10000000-0000-0000-0000-000000000002'::uuid,
    '{"seed":true,"errorMessage":"Unable to parse malformed table region."}'::jsonb,
    now() - interval '45 minutes'
  ),
  (
    '30000000-0000-0000-0000-000000000003'::uuid,
    '20000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'project-files',
    '20000000-0000-0000-0000-000000000001/reaction-yields.csv',
    'reaction-yields.csv',
    'reaction-yields.csv',
    'text/csv',
    48112,
    'seed-sha256-reaction-yields',
    'uploaded',
    'none',
    null,
    '{"seed":true,"rows":128}'::jsonb,
    now() - interval '30 minutes'
  )
on conflict (id) do nothing;

insert into public.file_events (
  id,
  file_id,
  project_id,
  user_id,
  event_type,
  title,
  description,
  severity,
  metadata,
  created_at
)
values
  (
    '93000000-0000-0000-0000-000000000001'::uuid,
    '30000000-0000-0000-0000-000000000001'::uuid,
    '20000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'file.uploaded',
    'File uploaded',
    'catalyst-screening.pdf was uploaded successfully.',
    'success',
    '{"seed":true,"fileName":"catalyst-screening.pdf"}'::jsonb,
    now() - interval '50 minutes'
  ),
  (
    '93000000-0000-0000-0000-000000000002'::uuid,
    '30000000-0000-0000-0000-000000000001'::uuid,
    '20000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'file.processing_queued',
    'File processing queued',
    'catalyst-screening.pdf was added to the processing queue.',
    'info',
    '{"seed":true,"extractionTaskId":"10000000-0000-0000-0000-000000000001","processingStatus":"queued"}'::jsonb,
    now() - interval '44 minutes'
  ),
  (
    '93000000-0000-0000-0000-000000000003'::uuid,
    '30000000-0000-0000-0000-000000000001'::uuid,
    '20000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'file.extraction_started',
    'File extraction started',
    'ChemVault AI is extracting scientific data from catalyst-screening.pdf.',
    'info',
    '{"seed":true,"extractionTaskId":"10000000-0000-0000-0000-000000000001","processingStatus":"extracting"}'::jsonb,
    now() - interval '32 minutes'
  ),
  (
    '93000000-0000-0000-0000-000000000004'::uuid,
    '30000000-0000-0000-0000-000000000001'::uuid,
    '20000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'file.validation_started',
    'File validation started',
    'ChemVault is validating extracted data from catalyst-screening.pdf.',
    'info',
    '{"seed":true,"extractionTaskId":"10000000-0000-0000-0000-000000000001","processingStatus":"validating"}'::jsonb,
    now() - interval '22 minutes'
  ),
  (
    '93000000-0000-0000-0000-000000000005'::uuid,
    '30000000-0000-0000-0000-000000000001'::uuid,
    '20000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'file.processing_completed',
    'File processing completed',
    'catalyst-screening.pdf is ready for review.',
    'success',
    '{"seed":true,"extractionTaskId":"10000000-0000-0000-0000-000000000001","processingStatus":"completed"}'::jsonb,
    now() - interval '15 minutes'
  ),
  (
    '93000000-0000-0000-0000-000000000006'::uuid,
    '30000000-0000-0000-0000-000000000002'::uuid,
    '20000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'file.processing_failed',
    'File processing failed',
    'ChemVault could not process malformed-table-scan.pdf.',
    'error',
    '{"seed":true,"extractionTaskId":"10000000-0000-0000-0000-000000000002","errorMessage":"Unable to parse malformed table region."}'::jsonb,
    now() - interval '12 minutes'
  ),
  (
    '93000000-0000-0000-0000-000000000007'::uuid,
    '30000000-0000-0000-0000-000000000003'::uuid,
    '20000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'file.uploaded',
    'File uploaded',
    'reaction-yields.csv was uploaded successfully.',
    'success',
    '{"seed":true,"fileName":"reaction-yields.csv"}'::jsonb,
    now() - interval '30 minutes'
  )
on conflict (id) do nothing;

insert into public.extraction_results (
  id,
  task_id,
  file_id,
  project_id,
  user_id,
  status,
  result_type,
  raw_output,
  structured_data,
  confidence_score,
  model_name,
  model_version,
  reviewed_by,
  reviewed_at,
  metadata,
  created_at
)
values (
  '40000000-0000-0000-0000-000000000001'::uuid,
  '10000000-0000-0000-0000-000000000001'::uuid,
  '30000000-0000-0000-0000-000000000001'::uuid,
  '20000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'in_review',
  'scientific_data',
  '{"seed":true,"source":"demo ai output"}'::jsonb,
  '{
    "tables":[{"caption":"Catalyst screening yields","rows":[{"catalyst":"Pd/C","yield_percent":82},{"catalyst":"NiCl2","yield_percent":61}],"confidence_score":0.91}],
    "compounds":[{"name":"4-bromoanisole","formula":"C7H7BrO","confidence_score":0.94},{"name":"phenylboronic acid","formula":"C6H7BO2","confidence_score":0.9},{"name":"biphenyl anisole product","formula":"C13H12O","confidence_score":0.78}],
    "measurements":[{"label":"Reaction temperature","value":80,"unit":"C","confidence_score":0.88},{"label":"Reaction time","value":12,"unit":"h","confidence_score":0.83}],
    "experimental_conditions":[{"label":"Solvent and base","solvent":"ethanol/water","base":"K2CO3","confidence_score":0.86}],
    "references":[{"title":"Seed catalyst screening paper","doi":"10.0000/chemvault.seed","confidence_score":0.72}]
  }'::jsonb,
  0.87,
  'chemvault-extractor-v1',
  '2026-06-23',
  '00000000-0000-0000-0000-000000000001'::uuid,
  now() - interval '4 minutes',
  '{"seed":true,"originalFileName":"catalyst-screening.pdf","tablesExtracted":1,"compoundsDetected":3}'::jsonb,
  now() - interval '14 minutes'
)
on conflict (id) do nothing;

insert into public.extraction_result_items (
  id,
  result_id,
  item_type,
  label,
  value,
  original_value,
  confidence_score,
  status,
  reviewed_by,
  reviewed_at,
  metadata,
  created_at
)
values
  (
    '41000000-0000-0000-0000-000000000001'::uuid,
    '40000000-0000-0000-0000-000000000001'::uuid,
    'table',
    'Catalyst screening yields',
    '{"caption":"Catalyst screening yields","rows":[{"catalyst":"Pd/C","yield_percent":82},{"catalyst":"NiCl2","yield_percent":61}]}'::jsonb,
    '{"caption":"Catalyst screening yields","rows":[{"catalyst":"Pd/C","yield_percent":82},{"catalyst":"NiCl2","yield_percent":61}]}'::jsonb,
    0.91,
    'accepted',
    '00000000-0000-0000-0000-000000000001'::uuid,
    now() - interval '4 minutes',
    '{"seed":true,"page":3}'::jsonb,
    now() - interval '13 minutes'
  ),
  (
    '41000000-0000-0000-0000-000000000002'::uuid,
    '40000000-0000-0000-0000-000000000001'::uuid,
    'compound',
    '4-bromoanisole',
    '{"name":"4-bromoanisole","formula":"C7H7BrO"}'::jsonb,
    '{"name":"4-bromoanisole","formula":"C7H7BrO"}'::jsonb,
    0.94,
    'accepted',
    '00000000-0000-0000-0000-000000000001'::uuid,
    now() - interval '4 minutes',
    '{"seed":true}'::jsonb,
    now() - interval '12 minutes'
  ),
  (
    '41000000-0000-0000-0000-000000000003'::uuid,
    '40000000-0000-0000-0000-000000000001'::uuid,
    'compound',
    'phenylboronic acid',
    '{"name":"phenylboronic acid","formula":"C6H7BO2"}'::jsonb,
    '{"name":"phenylboronic acid","formula":"C6H7BO3"}'::jsonb,
    0.9,
    'corrected',
    '00000000-0000-0000-0000-000000000001'::uuid,
    now() - interval '3 minutes',
    '{"seed":true,"correction":"formula corrected"}'::jsonb,
    now() - interval '11 minutes'
  ),
  (
    '41000000-0000-0000-0000-000000000004'::uuid,
    '40000000-0000-0000-0000-000000000001'::uuid,
    'compound',
    'biphenyl anisole product',
    '{"name":"biphenyl anisole product","formula":"C13H12O"}'::jsonb,
    '{"name":"biphenyl anisole product","formula":"C13H12O"}'::jsonb,
    0.78,
    'pending',
    null,
    null,
    '{"seed":true}'::jsonb,
    now() - interval '10 minutes'
  ),
  (
    '41000000-0000-0000-0000-000000000005'::uuid,
    '40000000-0000-0000-0000-000000000001'::uuid,
    'measurement',
    'Reaction temperature',
    '{"label":"Reaction temperature","value":80,"unit":"C"}'::jsonb,
    '{"label":"Reaction temperature","value":80,"unit":"C"}'::jsonb,
    0.88,
    'accepted',
    '00000000-0000-0000-0000-000000000001'::uuid,
    now() - interval '4 minutes',
    '{"seed":true}'::jsonb,
    now() - interval '9 minutes'
  ),
  (
    '41000000-0000-0000-0000-000000000006'::uuid,
    '40000000-0000-0000-0000-000000000001'::uuid,
    'measurement',
    'Reaction time',
    '{"label":"Reaction time","value":12,"unit":"h"}'::jsonb,
    '{"label":"Reaction time","value":12,"unit":"min"}'::jsonb,
    0.83,
    'corrected',
    '00000000-0000-0000-0000-000000000001'::uuid,
    now() - interval '3 minutes',
    '{"seed":true,"correction":"unit corrected"}'::jsonb,
    now() - interval '8 minutes'
  ),
  (
    '41000000-0000-0000-0000-000000000007'::uuid,
    '40000000-0000-0000-0000-000000000001'::uuid,
    'experimental_condition',
    'Solvent and base',
    '{"label":"Solvent and base","solvent":"ethanol/water","base":"K2CO3"}'::jsonb,
    '{"label":"Solvent and base","solvent":"ethanol/water","base":"K2CO3"}'::jsonb,
    0.86,
    'rejected',
    '00000000-0000-0000-0000-000000000001'::uuid,
    now() - interval '2 minutes',
    '{"seed":true,"reason":"condition needs source verification"}'::jsonb,
    now() - interval '7 minutes'
  ),
  (
    '41000000-0000-0000-0000-000000000008'::uuid,
    '40000000-0000-0000-0000-000000000001'::uuid,
    'reference',
    'Seed catalyst screening paper',
    '{"title":"Seed catalyst screening paper","doi":"10.0000/chemvault.seed"}'::jsonb,
    '{"title":"Seed catalyst screening paper","doi":"10.0000/chemvault.seed"}'::jsonb,
    0.72,
    'pending',
    null,
    null,
    '{"seed":true}'::jsonb,
    now() - interval '6 minutes'
  )
on conflict (id) do nothing;

insert into public.extraction_result_reviews (
  id,
  result_id,
  reviewer_id,
  action,
  comment,
  changes,
  created_at
)
values
  (
    '42000000-0000-0000-0000-000000000001'::uuid,
    '40000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'review_started',
    'Started demo review.',
    '{"seed":true,"status":"in_review"}'::jsonb,
    now() - interval '4 minutes'
  ),
  (
    '42000000-0000-0000-0000-000000000002'::uuid,
    '40000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'item_corrected',
    'Corrected formula and unit fields.',
    '{"seed":true,"itemIds":["41000000-0000-0000-0000-000000000003","41000000-0000-0000-0000-000000000006"]}'::jsonb,
    now() - interval '3 minutes'
  ),
  (
    '42000000-0000-0000-0000-000000000003'::uuid,
    '40000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'item_rejected',
    'Condition requires source verification.',
    '{"seed":true,"itemId":"41000000-0000-0000-0000-000000000007"}'::jsonb,
    now() - interval '2 minutes'
  )
on conflict (id) do nothing;

insert into public.extraction_result_exports (
  id,
  result_id,
  user_id,
  export_type,
  status,
  metadata,
  created_at
)
values (
  '43000000-0000-0000-0000-000000000001'::uuid,
  '40000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'json',
  'created',
  '{"seed":true,"delivery":"inline","fileName":"chemvault-result-seed.json","contentType":"application/json"}'::jsonb,
  now() - interval '1 minutes'
)
on conflict (id) do nothing;

update public.extraction_results
set
  status = 'approved',
  extraction_summary = 'Demo extraction result with compounds, measurements, HPLC calibration data, method conditions, and a reviewed approved dataset.',
  approved_at = coalesce(approved_at, now() - interval '1 minutes'),
  reviewed_by = coalesce(reviewed_by, '00000000-0000-0000-0000-000000000001'::uuid),
  reviewed_at = coalesce(reviewed_at, now() - interval '4 minutes')
where id = '40000000-0000-0000-0000-000000000001'::uuid;

insert into public.result_items (
  id,
  result_id,
  item_type,
  label,
  value,
  confidence_score,
  page_number,
  source_location,
  status,
  reviewer_note,
  created_at
)
values
  (
    '44000000-0000-0000-0000-000000000001'::uuid,
    '40000000-0000-0000-0000-000000000001'::uuid,
    'compound',
    'Aspirin',
    '{"name":"Aspirin","formula":"C9H8O4","cas":"50-78-2"}'::jsonb,
    0.93,
    2,
    '{"page":2,"section":"compound list"}'::jsonb,
    'accepted',
    null,
    now() - interval '13 minutes'
  ),
  (
    '44000000-0000-0000-0000-000000000002'::uuid,
    '40000000-0000-0000-0000-000000000001'::uuid,
    'measurement',
    'Melting point',
    '{"property":"melting point","value":"135-136","unit":"C"}'::jsonb,
    0.82,
    4,
    '{"page":4,"table":"physical properties"}'::jsonb,
    'corrected',
    'Corrected the unit from K to C.',
    now() - interval '10 minutes'
  ),
  (
    '44000000-0000-0000-0000-000000000003'::uuid,
    '40000000-0000-0000-0000-000000000001'::uuid,
    'table',
    'HPLC calibration data',
    '{"caption":"HPLC calibration data","rows":[{"concentration_mg_ml":0.1,"area":2042},{"concentration_mg_ml":0.5,"area":10112}]}'::jsonb,
    0.91,
    5,
    '{"page":5,"tableIndex":1}'::jsonb,
    'accepted',
    null,
    now() - interval '9 minutes'
  ),
  (
    '44000000-0000-0000-0000-000000000004'::uuid,
    '40000000-0000-0000-0000-000000000001'::uuid,
    'condition',
    'Solvent ethanol',
    '{"solvent":"ethanol","temperature_c":25,"duration_min":30}'::jsonb,
    0.87,
    3,
    '{"page":3,"paragraph":2}'::jsonb,
    'accepted',
    null,
    now() - interval '8 minutes'
  ),
  (
    '44000000-0000-0000-0000-000000000005'::uuid,
    '40000000-0000-0000-0000-000000000001'::uuid,
    'method',
    'HPLC method',
    '{"instrument":"HPLC","column":"C18","mobile_phase":"water/acetonitrile","flow_ml_min":1}'::jsonb,
    0.89,
    5,
    '{"page":5,"method":"HPLC"}'::jsonb,
    'accepted',
    null,
    now() - interval '7 minutes'
  ),
  (
    '44000000-0000-0000-0000-000000000006'::uuid,
    '40000000-0000-0000-0000-000000000001'::uuid,
    'compound',
    'Low-confidence impurity',
    '{"name":"Unknown impurity","formula":null,"note":"weak OCR region"}'::jsonb,
    0.42,
    6,
    '{"page":6,"region":"low contrast chromatogram"}'::jsonb,
    'rejected',
    'Rejected due to weak source evidence.',
    now() - interval '6 minutes'
  ),
  (
    '44000000-0000-0000-0000-000000000007'::uuid,
    '40000000-0000-0000-0000-000000000001'::uuid,
    'citation',
    'Seed catalyst screening paper',
    '{"title":"Seed catalyst screening paper","doi":"10.0000/chemvault.seed"}'::jsonb,
    0.72,
    1,
    '{"page":1,"section":"references"}'::jsonb,
    'accepted',
    null,
    now() - interval '5 minutes'
  )
on conflict (id) do nothing;

insert into public.result_reviews (
  id,
  result_id,
  reviewer_id,
  action,
  note,
  metadata,
  created_at
)
values
  (
    '45000000-0000-0000-0000-000000000001'::uuid,
    '40000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'started_review',
    'Started demo human review.',
    '{"seed":true,"status":"in_review"}'::jsonb,
    now() - interval '4 minutes'
  ),
  (
    '45000000-0000-0000-0000-000000000002'::uuid,
    '40000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'item_corrected',
    'Corrected melting point unit.',
    '{"seed":true,"itemId":"44000000-0000-0000-0000-000000000002"}'::jsonb,
    now() - interval '3 minutes'
  ),
  (
    '45000000-0000-0000-0000-000000000003'::uuid,
    '40000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'approved',
    'Approved seed dataset for review workflow testing.',
    '{"seed":true,"datasetId":"46000000-0000-0000-0000-000000000001"}'::jsonb,
    now() - interval '1 minutes'
  )
on conflict (id) do nothing;

insert into public.result_corrections (
  id,
  result_id,
  result_item_id,
  corrected_by,
  field_path,
  old_value,
  new_value,
  reason,
  created_at
)
values (
  '45500000-0000-0000-0000-000000000001'::uuid,
  '40000000-0000-0000-0000-000000000001'::uuid,
  '44000000-0000-0000-0000-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'value.unit',
  '"K"'::jsonb,
  '"C"'::jsonb,
  'Fixed unit from K to C.',
  now() - interval '3 minutes'
)
on conflict (id) do nothing;

insert into public.approved_datasets (
  id,
  result_id,
  project_id,
  file_id,
  user_id,
  title,
  description,
  data,
  schema_version,
  created_at
)
values (
  '46000000-0000-0000-0000-000000000001'::uuid,
  '40000000-0000-0000-0000-000000000001'::uuid,
  '20000000-0000-0000-0000-000000000001'::uuid,
  '30000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Approved dataset: catalyst-screening.pdf',
  'Seed approved dataset for human-in-the-loop validation.',
  '{"compounds":[{"name":"Aspirin","formula":"C9H8O4"}],"measurements":[{"property":"melting point","value":"135-136","unit":"C"}],"methods":[{"instrument":"HPLC","column":"C18"}]}'::jsonb,
  '1.0',
  now() - interval '1 minutes'
)
on conflict (id) do nothing;

insert into public.conversations (
  id,
  type,
  project_id,
  title
)
values (
  '50000000-0000-0000-0000-000000000001'::uuid,
  'project',
  '20000000-0000-0000-0000-000000000001'::uuid,
  'AI Paper Extraction Project'
)
on conflict (id) do nothing;

insert into public.conversation_members (
  conversation_id,
  user_id,
  role
)
values
  (
    '50000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'owner'
  ),
  (
    '50000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    'admin'
  )
on conflict (conversation_id, user_id) do nothing;

insert into public.messages (
  id,
  conversation_id,
  sender_id,
  sender_type,
  body,
  metadata,
  created_at
)
values
  (
    '60000000-0000-0000-0000-000000000001'::uuid,
    '50000000-0000-0000-0000-000000000001'::uuid,
    null,
    'system',
    'Project conversation created.',
    '{"seed":true,"projectId":"20000000-0000-0000-0000-000000000001","notificationTitle":"Project conversation created"}'::jsonb,
    now() - interval '25 minutes'
  ),
  (
    '60000000-0000-0000-0000-000000000002'::uuid,
    '50000000-0000-0000-0000-000000000001'::uuid,
    null,
    'task',
    'AI extraction started.',
    '{"seed":true,"projectId":"20000000-0000-0000-0000-000000000001","taskId":"10000000-0000-0000-0000-000000000001","status":"processing","progress":25,"notificationTitle":"AI extraction started"}'::jsonb,
    now() - interval '20 minutes'
  ),
  (
    '60000000-0000-0000-0000-000000000003'::uuid,
    '50000000-0000-0000-0000-000000000001'::uuid,
    null,
    'task',
    '8 tables detected.',
    '{"seed":true,"projectId":"20000000-0000-0000-0000-000000000001","taskId":"10000000-0000-0000-0000-000000000001","tablesDetected":8,"status":"extracting","progress":55,"notificationTitle":"Extraction tables detected"}'::jsonb,
    now() - interval '15 minutes'
  ),
  (
    '60000000-0000-0000-0000-000000000004'::uuid,
    '50000000-0000-0000-0000-000000000001'::uuid,
    null,
    'task',
    'Validation completed.',
    '{"seed":true,"projectId":"20000000-0000-0000-0000-000000000001","taskId":"10000000-0000-0000-0000-000000000001","status":"validating","progress":85,"notificationTitle":"Validation completed"}'::jsonb,
    now() - interval '10 minutes'
  ),
  (
    '60000000-0000-0000-0000-000000000005'::uuid,
    '50000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    'admin',
    'I reviewed the extraction result.',
    '{"seed":true,"projectId":"20000000-0000-0000-0000-000000000001"}'::jsonb,
    now() - interval '5 minutes'
  ),
  (
    '60000000-0000-0000-0000-000000000006'::uuid,
    '50000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'user',
    'Can we rerun this with stricter validation?',
    '{"seed":true,"projectId":"20000000-0000-0000-0000-000000000001"}'::jsonb,
    now()
  )
on conflict (id) do nothing;

insert into public.user_segments (
  id,
  name,
  description,
  type,
  criteria,
  created_by
)
values (
  '70000000-0000-0000-0000-000000000001'::uuid,
  'AI extraction reviewers',
  'Development segment for admins reviewing AI extraction notifications.',
  'manual',
  '{"seed":true}'::jsonb,
  '00000000-0000-0000-0000-000000000001'::uuid
)
on conflict (id) do nothing;

insert into public.user_segment_members (
  segment_id,
  user_id,
  added_by
)
values
  (
    '70000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid
  ),
  (
    '70000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid
  )
on conflict (segment_id, user_id) do nothing;

insert into public.broadcasts (
  id,
  title,
  body,
  type,
  source,
  link,
  target_type,
  target_payload,
  status,
  created_by
)
values (
  '80000000-0000-0000-0000-000000000001'::uuid,
  'AI extraction review window',
  'New extraction results are ready for review in the ChemVault workspace.',
  'system',
  'admin',
  '/notifications',
  'segment',
  '{"segmentId":"70000000-0000-0000-0000-000000000001","pushPreviewAllowed":false}'::jsonb,
  'draft',
  '00000000-0000-0000-0000-000000000001'::uuid
)
on conflict (id) do nothing;

insert into public.broadcast_audit_logs (
  broadcast_id,
  actor_id,
  action,
  metadata
)
values (
  '80000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'seed_created',
  '{"seed":true}'::jsonb
)
on conflict do nothing;

insert into public.project_activity_events (
  id,
  project_id,
  actor_user_id,
  actor_type,
  event_type,
  entity_type,
  entity_id,
  title,
  description,
  visibility,
  severity,
  metadata,
  created_at
)
values
  (
    '91000000-0000-0000-0000-000000000001'::uuid,
    '20000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'user',
    'project.created',
    'project',
    '20000000-0000-0000-0000-000000000001'::uuid,
    'Project created',
    'AI Paper Extraction Project workspace was created.',
    'project',
    'info',
    '{"seed":true}'::jsonb,
    now() - interval '60 minutes'
  ),
  (
    '91000000-0000-0000-0000-000000000002'::uuid,
    '20000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'user',
    'file.uploaded',
    'file',
    '30000000-0000-0000-0000-000000000001'::uuid,
    'File uploaded',
    'catalyst-screening.pdf was added to the project.',
    'project',
    'success',
    '{"seed":true,"fileName":"catalyst-screening.pdf"}'::jsonb,
    now() - interval '50 minutes'
  ),
  (
    '91000000-0000-0000-0000-000000000003'::uuid,
    '20000000-0000-0000-0000-000000000001'::uuid,
    null,
    'ai',
    'extraction.status_changed',
    'extraction_task',
    '10000000-0000-0000-0000-000000000001'::uuid,
    'AI extraction queued',
    'Document extraction was queued.',
    'project',
    'info',
    '{"seed":true,"status":"queued","progress":10}'::jsonb,
    now() - interval '45 minutes'
  ),
  (
    '91000000-0000-0000-0000-000000000004'::uuid,
    '20000000-0000-0000-0000-000000000001'::uuid,
    null,
    'ai',
    'extraction.status_changed',
    'extraction_task',
    '10000000-0000-0000-0000-000000000001'::uuid,
    'AI extraction started',
    'AI task started processing this document.',
    'project',
    'info',
    '{"seed":true,"status":"processing","progress":25}'::jsonb,
    now() - interval '40 minutes'
  ),
  (
    '91000000-0000-0000-0000-000000000005'::uuid,
    '20000000-0000-0000-0000-000000000001'::uuid,
    null,
    'ai',
    'extraction.status_changed',
    'extraction_task',
    '10000000-0000-0000-0000-000000000001'::uuid,
    '8 tables detected',
    'AI found 8 structured tables for review.',
    'project',
    'info',
    '{"seed":true,"tablesDetected":8,"status":"extracting","progress":55}'::jsonb,
    now() - interval '30 minutes'
  ),
  (
    '91000000-0000-0000-0000-000000000006'::uuid,
    '20000000-0000-0000-0000-000000000001'::uuid,
    null,
    'ai',
    'extraction.status_changed',
    'extraction_task',
    '10000000-0000-0000-0000-000000000001'::uuid,
    'Validation completed',
    'Extracted values passed validation checks.',
    'project',
    'success',
    '{"seed":true,"status":"validating","progress":85}'::jsonb,
    now() - interval '20 minutes'
  ),
  (
    '91000000-0000-0000-0000-000000000007'::uuid,
    '20000000-0000-0000-0000-000000000001'::uuid,
    null,
    'ai',
    'extraction.completed',
    'extraction_task',
    '10000000-0000-0000-0000-000000000001'::uuid,
    'Extraction completed',
    'Structured scientific data is ready for review.',
    'project',
    'success',
    '{"seed":true,"status":"completed","progress":100}'::jsonb,
    now() - interval '15 minutes'
  ),
  (
    '91000000-0000-0000-0000-000000000008'::uuid,
    '20000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'user',
    'message.created',
    'message',
    '60000000-0000-0000-0000-000000000006'::uuid,
    'User message added',
    null,
    'project',
    'info',
    '{"seed":true,"messageId":"60000000-0000-0000-0000-000000000006"}'::jsonb,
    now() - interval '10 minutes'
  ),
  (
    '91000000-0000-0000-0000-000000000009'::uuid,
    '20000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    'admin',
    'message.created',
    'message',
    '60000000-0000-0000-0000-000000000005'::uuid,
    'Admin message added',
    null,
    'project',
    'info',
    '{"seed":true,"messageId":"60000000-0000-0000-0000-000000000005"}'::jsonb,
    now() - interval '5 minutes'
  ),
  (
    '91000000-0000-0000-0000-000000000010'::uuid,
    '20000000-0000-0000-0000-000000000001'::uuid,
    null,
    'system',
    'notification.created',
    'notification',
    null,
    'Notification sent',
    'A project notification was sent to project members.',
    'project',
    'info',
    '{"seed":true,"source":"ai-extractor"}'::jsonb,
    now() - interval '2 minutes'
  )
on conflict (id) do nothing;

insert into public.project_activity_events (
  id,
  project_id,
  actor_user_id,
  actor_type,
  event_type,
  entity_type,
  entity_id,
  title,
  description,
  visibility,
  severity,
  metadata,
  created_at
)
values
  (
    '91000000-0000-0000-0000-000000000011'::uuid,
    '20000000-0000-0000-0000-000000000001'::uuid,
    null,
    'ai',
    'extraction_result.created',
    'extraction_result',
    '40000000-0000-0000-0000-000000000001'::uuid,
    'Extraction result ready for review',
    'ChemVault has prepared extracted data for human review.',
    'project',
    'success',
    '{"seed":true,"resultId":"40000000-0000-0000-0000-000000000001"}'::jsonb,
    now() - interval '14 minutes'
  ),
  (
    '91000000-0000-0000-0000-000000000012'::uuid,
    '20000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'user',
    'extraction_result.item_corrected',
    'extraction_result_item',
    '41000000-0000-0000-0000-000000000003'::uuid,
    'Result item corrected',
    'A compound formula was corrected during human review.',
    'project',
    'info',
    '{"seed":true,"resultId":"40000000-0000-0000-0000-000000000001","itemType":"compound"}'::jsonb,
    now() - interval '3 minutes'
  ),
  (
    '91000000-0000-0000-0000-000000000013'::uuid,
    '20000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'user',
    'extraction_result.item_rejected',
    'extraction_result_item',
    '41000000-0000-0000-0000-000000000007'::uuid,
    'Result item rejected',
    'An experimental condition needs source verification.',
    'project',
    'warning',
    '{"seed":true,"resultId":"40000000-0000-0000-0000-000000000001","itemType":"experimental_condition"}'::jsonb,
    now() - interval '2 minutes'
  ),
  (
    '91000000-0000-0000-0000-000000000014'::uuid,
    '20000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'user',
    'extraction_result.export_created',
    'extraction_result_export',
    '43000000-0000-0000-0000-000000000001'::uuid,
    'Result exported',
    'A reviewed extraction result export was created.',
    'project',
    'success',
    '{"seed":true,"resultId":"40000000-0000-0000-0000-000000000001","exportType":"json"}'::jsonb,
    now() - interval '1 minutes'
  )
on conflict (id) do nothing;

insert into public.audit_logs (
  id,
  actor_user_id,
  actor_type,
  action,
  entity_type,
  entity_id,
  project_id,
  user_id,
  source,
  severity,
  visibility,
  title,
  description,
  metadata,
  created_at
)
values
  (
    '92000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'admin',
    'api_key.created',
    'service_api_key',
    null,
    null,
    null,
    'admin',
    'info',
    'admin',
    'API key created',
    'ai-extractor API key created.',
    '{"seed":true,"serviceName":"ai-extractor","scopes":["notifications:create","tasks:update","messages:create"],"allowedSources":["ai-extractor"],"keyPrefix":"cv_test_seed..."}'::jsonb,
    now() - interval '35 minutes'
  ),
  (
    '92000000-0000-0000-0000-000000000002'::uuid,
    null,
    'service',
    'webhook.received',
    'webhook_event',
    null,
    '20000000-0000-0000-0000-000000000001'::uuid,
    null,
    'ai-extractor',
    'info',
    'admin',
    'Webhook received',
    'ai-extractor submitted task.status_changed.',
    '{"seed":true,"eventType":"task.status_changed","idempotencyKey":"seed-task-completed"}'::jsonb,
    now() - interval '25 minutes'
  ),
  (
    '92000000-0000-0000-0000-000000000003'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'admin',
    'broadcast.sent',
    'broadcast',
    '80000000-0000-0000-0000-000000000001'::uuid,
    null,
    null,
    'admin',
    'success',
    'admin',
    'Broadcast sent',
    'AI extraction review window',
    '{"seed":true,"recipientCount":2,"sentCount":2,"failedCount":0}'::jsonb,
    now() - interval '12 minutes'
  ),
  (
    '92000000-0000-0000-0000-000000000004'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'user',
    'user.preference_updated',
    'user_notification_preferences',
    null,
    null,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'settings',
    'info',
    'admin',
    'Notification preference updated',
    null,
    '{"seed":true,"category":"task_completed","channel":"web_push","enabled":false}'::jsonb,
    now() - interval '6 minutes'
  )
on conflict (id) do nothing;
