-- Raise content-media storage limit to 1 GB (was 200 MB)

update storage.buckets
set file_size_limit = 1073741824
where id = 'content-media';
