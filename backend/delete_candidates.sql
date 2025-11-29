-- Delete specified candidates

DELETE FROM candidate_profiles 
WHERE (name = 'Mohammad' AND family_name = 'Jawad')
   OR (name = 'Jawad' AND family_name = 'Marji')
   OR (name = 'hadi' AND family_name = 'soueid')
   OR (name = 'Ghadi' AND family_name = 'Fakhri');
