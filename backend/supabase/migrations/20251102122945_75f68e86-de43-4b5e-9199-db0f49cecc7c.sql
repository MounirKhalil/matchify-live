-- Add categories column to job_postings table
ALTER TABLE job_postings 
ADD COLUMN categories text[] DEFAULT '{}';

-- Add index for better performance when filtering by categories
CREATE INDEX idx_job_postings_categories ON job_postings USING GIN(categories);