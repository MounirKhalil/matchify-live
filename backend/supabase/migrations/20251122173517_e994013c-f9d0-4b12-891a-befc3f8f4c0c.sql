-- Delete specified candidate profiles and their auth users
DO $$
DECLARE
  users_to_delete uuid[] := ARRAY[
    '6add974b-1eda-400a-92ac-d69f18548d4b'::uuid,  -- Jihad Mobarak
    '63db1d5d-7a14-4602-a1a7-549092db5709'::uuid,  -- Jihad Mobarak (duplicate)
    '6ec1d932-4143-49fc-a877-f3be0a588848'::uuid,  -- Ali Assaad
    '6a09217a-3883-470a-8673-bf39b0ab6052'::uuid,  -- Mariam Ayoub
    '9e1bd469-2ace-4e36-ad0c-6c45045cbd21'::uuid,  -- Test1 Test1
    '0ea848fe-c586-4af7-9187-4a95da17392f'::uuid   -- Aya Khalil
  ];
  user_id_item uuid;
BEGIN
  FOREACH user_id_item IN ARRAY users_to_delete
  LOOP
    -- Delete from candidate_profiles
    DELETE FROM public.candidate_profiles WHERE user_id = user_id_item;
    
    -- Delete from user_roles
    DELETE FROM public.user_roles WHERE user_id = user_id_item;
    
    -- Delete from auth.users
    DELETE FROM auth.users WHERE id = user_id_item;
  END LOOP;
END $$;