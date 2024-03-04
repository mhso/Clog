from datetime import datetime
from core.search import parse_query
from core.log_database import LogDatabase

database = LogDatabase("intfar")

query = "Our kill OR Their kill"

ctes, fields = parse_query(query, "log")

for result in database.search("log", ctes):
    print(datetime.fromtimestamp(result[2]))
    print(result[1])

print(fields)
