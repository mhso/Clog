from argparse import ArgumentParser
import os

from mhooge_flask.query_db import query_or_repl

from core.log_database import LogDatabase
from core.meta_database import MetaDatabase

parser = ArgumentParser()

parser.add_argument("-db", "--database", default="meta", type=str)
parser.add_argument("--query", default=None, type=str, nargs="+")
parser.add_argument("--raw", action="store_true")
parser.add_argument("--print", action="store_true")

args = parser.parse_args()

if args.database == "meta":
    database = MetaDatabase()
elif not os.path.exists(f"../resources/databases/{args.database}.db"):
    print(f"Database '{args.database}' does not appear to be valid.")
    exit(0)
else:
    database = LogDatabase(args.database)

query_or_repl(database, args.query, args.raw, args.print)
