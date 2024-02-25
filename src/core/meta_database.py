from mhooge_flask.database import SQLiteDatabase
from sqlite3 import IntegrityError

class MetaDatabase(SQLiteDatabase):
    def __init__(self):
        super().__init__("../resources/databases/meta.db", "../resources/meta.sql", True)

    def get_projects(self):
        with self:
            return self.execute_query(
                "SELECT id, log_path FROM projects"
            ).fetchall()

    def add_project(self, project_id, log_path):
        with self:
            try:
                self.execute_query(
                    "INSERT INTO projects (id, log_path) VALUES (?, ?)",
                    project_id, log_path
                )
                return True
            except IntegrityError:
                return False
