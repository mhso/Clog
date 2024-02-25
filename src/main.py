from argparse import ArgumentParser
from multiprocessing import Process, Event
import json
from time import sleep

from mhooge_flask.logging import logger
from mhooge_flask import init, auth
from mhooge_flask.init import Route
from mhooge_flask.restartable import restartable

from core.meta_database import MetaDatabase
from core.ingest import run_ingest

class DummyEvent:
    def is_set(self):
        return False

def run_site():
    routes = [
        Route("index", "page"),
        Route("login", "login_page", "login"),
    ]

    database = MetaDatabase()
    app_name = "clog"

    # Create Flask app.
    web_app = init.create_app(
        app_name,
        "/clog/",
        routes,
        database,
    )

    if database.get_user_id("admin") is None:
        # Create admin user, if database has just been created.
        password = json.load(open("app/static/secret.json"))["clog_password"]
        user_id = auth.generate_user_id()
        hashed_password = auth.get_hashed_password(password)
        database.create_user(user_id, "admin", hashed_password)

    ports_file = "../../flask_ports.json"

    logger.info("Starting Flask web app.")

    init.run_app(web_app, app_name, ports_file)

@restartable
def run_all():
    # Start ingest process
    stop_event = Event()
    ingest_process = Process(target=run_ingest, args=(stop_event,))
    ingest_process.start()

    try:
        # Start Flask
        run_site()

    except KeyboardInterrupt:
        logger.info("Stopping Flask web app...")

    except Exception:
        logger.error("Error occured during Flask server execution.")

    finally:
        stop_event.set()

        while ingest_process.is_alive():
            sleep(0.25)

if __name__ == "__main__":
    parser = ArgumentParser()

    parser.add_argument("-t", "--task", choices=("site", "ingest", "both"), default="both")

    args = parser.parse_args()

    if args.task == "site":
        run_site()
    elif args.task == "ingest":
        run_ingest(DummyEvent())
    else:
        run_all()
