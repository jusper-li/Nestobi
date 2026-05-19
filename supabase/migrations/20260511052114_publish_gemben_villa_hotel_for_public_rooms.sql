/*
  # Publish Gemben Villa for public room listings

  The public /rooms page joins tbl_rooms to hotels. Hotel rows are visible to
  anonymous visitors only when hotels.is_active = true, so inactive hotels cause
  room cards to fall back to generic location text.
*/

UPDATE hotels
SET is_active = true,
    updated_at = now()
WHERE id = 'df73db6c-6151-402a-8cf8-4c2036468aed'
   OR name IN (
     U&'\6839\672C\5BB6\6C11\5BBFVilla',
     U&'\6839\672C\5BB6\6C11\5BBF by Kei.Caf\00E9'
   );
