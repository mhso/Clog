from mhooge_flask.database import SQLiteDatabase

def _decode_key(key):
    parts = []
    split = key.split(".")

    for part in split[1:]:
        if part.startswith('"'):
            part = part[1:]
        if part.endswith('"'):
            part = part[:-1]

        parts.append(part)

    return ".".join(parts)

class LogDatabase(SQLiteDatabase):
    def __init__(self, project_name):
        super().__init__(f"../resources/databases/{project_name}.db", "../resources/log.sql")

    def log_table_exists(self, log_id):
        with self:
            return self.execute_query(
                """
                SELECT name
                FROM sqlite_schema
                WHERE type = 'table'
                    AND name = ?
                """,
                log_id
            ).fetchone() is not None

    def create_log_table(self, log_id):
        with self:
            self.execute_query(
                f"""
                CREATE TABLE IF NOT EXISTS {log_id} (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    message NVARCHAR NOT NULL,
                    timestamp REAL NOT NULL,
                    entry NVARCHAR NOT NULL
                )
                """
            )

            # Create indexes
            self.execute_query(
                f"""
                CREATE INDEX IF NOT EXISTS text_index
                ON {log_id} (message)
                """
            )
            self.execute_query(
                f"""
                CREATE INDEX IF NOT EXISTS timestamp_index
                ON {log_id} (timestamp)
                """
            )

    def get_log_files(self):
        with self:
            return [
                x[0] for x in self.execute_query(
                    """
                    SELECT name
                    FROM sqlite_schema
                    WHERE type ='table' AND name NOT LIKE 'sqlite_%'
                    """
                )
            ]

    def get_entry_count(self, log_id: str):
        with self:
            return self.execute_query(f"SELECT COUNT(*) FROM {log_id}").fetchone()[0]

    def add_log_entries(self, log_id: str, entries: list[tuple]):
        with self:
            self.execute_query(
                f"INSERT INTO {log_id} (message, timestamp, entry) VALUES (?, ?, ?)",
                *entries
            )

    def get_fields(self, log_id) -> list[tuple[str, int]]:
        with self:
            fields = []
            result = self.execute_query(
                f"""
                SELECT
                    DISTINCT fullkey,
                    COUNT(*)
                FROM
                    {log_id},
                    json_tree({log_id}.entry)
                WHERE entry IS NOT NULL
                    AND type NOT IN ('object', 'array')
                GROUP BY fullkey
                ORDER BY COUNT(*) DESC
                """
            )
            for row in result:
                key = _decode_key(row[0])
                if key.count(".") > 3:
                    continue

                fields.append({"name": key, "count": row[1]})

            return fields

    def search(self, log_id, unions: list[list[str]] = None) -> list[str]:
        if unions == "":
            query = f"""
                SELECT
                    message,
                    entry,
                    timestamp
                FROM
                    {log_id},
                    json_each({log_id}.entry)
                ORDER BY timestamp DESC
            """
        else:
            ctes = []
            for joins in unions:
                ctes.extend(joins)

            query = ",".join(ctes)
            order_by_col = None
            conditions = 1

            for joins in unions:
                if conditions > 1:
                    query += "\nUNION"

                query += f"""
                    SELECT
                        cond_{conditions}.message,
                        cond_{conditions}.entry,
                        cond_{conditions}.timestamp
                    FROM cond_{conditions}
                """

                order_by_col = f"cond_{conditions}.timestamp"

                conditions += 1

                join_sql = ""
                for _ in range(len(joins) - 1):
                    cte_1 = f"cond_{conditions - 1}"
                    cte_2 = f"cond_{conditions}"
                    join_sql += f"\nINNER JOIN {cte_2} ON {cte_2}.id = {cte_1}.id"

                    conditions += 1

                query += join_sql

            query += f"\nORDER BY {order_by_col} DESC"

            print(query)

        with self:
            # results = []
            # for message, entry, timestamp in self.execute_query(query, *params):
            #     if fields is None:
            #         entry[]

            return self.execute_query(query).fetchall()
