
-- First, delete orphaned candidate profiles (fake data with non-existent user_ids)
DELETE FROM candidate_profiles
WHERE NOT EXISTS (
    SELECT 1 FROM auth.users WHERE auth.users.id = candidate_profiles.user_id
);

-- Delete orphaned recruiter profiles
DELETE FROM recruiter_profiles
WHERE NOT EXISTS (
    SELECT 1 FROM auth.users WHERE auth.users.id = recruiter_profiles.user_id
);

-- Now add proper foreign key constraints
-- candidate_profiles.user_id should reference auth.users(id)
ALTER TABLE candidate_profiles
ADD CONSTRAINT candidate_profiles_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- recruiter_profiles.user_id should reference auth.users(id)
ALTER TABLE recruiter_profiles
ADD CONSTRAINT recruiter_profiles_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- user_roles.user_id should reference auth.users(id)
ALTER TABLE user_roles
ADD CONSTRAINT user_roles_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_user_id ON candidate_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_recruiter_profiles_user_id ON recruiter_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
