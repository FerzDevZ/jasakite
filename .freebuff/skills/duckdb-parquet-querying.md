# DuckDB Direct Parquet Query

`SELECT country, SUM(amount) FROM read_parquet('s3://bucket/*.parquet') GROUP BY country;`
Zero-copy columnar execution at C++ speed.
