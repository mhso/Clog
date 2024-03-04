import json
from pathlib import Path
from time import sleep
from core.meta_database import MetaDatabase
from core.log_database import LogDatabase

from mhooge_flask.logging import logger

def ingest_new_lines(log_id: str, log_paths: list[str], database: LogDatabase):
    latest_entry = database.get_latest_entry(log_id)
    curr_line = 0
    entries_to_save = []

    for log_path in log_paths:
        with open(log_path, "r", encoding="utf-8") as fp:
            for line in fp:
                curr_line += 1

                try:
                    log_entry = json.loads(line)
                except json.JSONDecodeError:
                    continue

                timestamp = log_entry.get("record", {}).get("time", {}).get("timestamp")
                if timestamp is None or (latest_entry is not None and timestamp < latest_entry):
                    continue

                text = log_entry["text"]
                del log_entry["record"]["time"]

                entry = json.dumps(log_entry["record"])

                entries_to_save.append((text, timestamp, entry))

    if entries_to_save != []:
        logger.info(f"Inserting {len(entries_to_save)} log entries from log file '{log_id}'")
        database.add_log_entries(log_id, entries_to_save)

def find_log_files(project_path: str) -> dict[str, list[str]]:
    log_files = []
    for path in Path(project_path).glob("*.log"):
        log_files.append((path.name.split(".")[0], path.absolute(), path.stat().st_mtime))

    log_files.sort(key=lambda x: x[2])

    log_files_dict = {}
    for log_id, log_path, _ in log_files:
        if log_id not in log_files_dict:
            log_files_dict[log_id] = []

        log_files_dict[log_id].append(log_path)

    return log_files_dict

def run_ingest(stop_event):
    meta_database = MetaDatabase()
    databases: dict[str, LogDatabase] = {}
    time_between_ingesting = 60

    logger.info("Starting ingest process.")

    while not stop_event.is_set():
        for project_id, log_path in meta_database.get_projects():
            if project_id not in databases: # New project has been added on the website
                databases[project_id] = LogDatabase(project_id)

            database = databases[project_id]
            log_files = find_log_files(log_path)
            for log_id in log_files:
                if not database.log_table_exists(log_id): # First time we see this log file
                    logger.info(f"Creating new table for project '{project_id}', log file '{log_id}'")
                    database.create_log_table(log_id)

                ingest_new_lines(log_id, log_files[log_id], database)

        # Sleep for a minute or until main process signals an abort
        time_slept = 0
        sleep_interval = 0.1
        while time_slept < time_between_ingesting and not stop_event.is_set():
            sleep(sleep_interval)
            time_slept += sleep_interval

    logger.info("Stopping ingest process...")
