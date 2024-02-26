from core.search import parse_query
from core.log_database import LogDatabase

database = LogDatabase("intfar")

query = "extra.event = game_over"

ctes, fields = parse_query(query, "log")

for result in database.search("log", ctes):
    print(result[1])

print(fields)
