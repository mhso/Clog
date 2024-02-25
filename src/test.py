from core.search import parse_query
from core.log_database import LogDatabase

database = LogDatabase("intfar")

query = "extra.game"

ctes = parse_query(query, "log")

for result in database.search("log", ctes):
    print(result[1])
