-- Raise content-media storage limit to 4 GB

update storage.buckets
set file_size_limit = 4294967296
where id = 'content-media';
