from datetime import datetime
import json

import flask

from mhooge_flask.routing import make_template_context, make_text_response, make_json_response
from mhooge_flask.auth import get_user_details

from core.meta_database import MetaDatabase
from core.log_database import LogDatabase
from core.search import parse_query

page = flask.Blueprint("index", __name__)

@page.route("/")
def index(**project_args):
    if get_user_details() is None:
        return flask.redirect(flask.url_for("login.sign_in"))

    meta_database: MetaDatabase = flask.current_app.config["DATABASE"]
    projects = [x[0] for x in meta_database.get_projects()]

    if "active_project" not in project_args:
        return flask.redirect(flask.url_for("index.project", project_id=projects[0]))

    template_args = {"projects": projects}
    template_args.update(project_args)

    return make_template_context("index.html", 200, **template_args)

@page.route("/<project_id>")
def project(project_id, **project_args):
    if get_user_details() is None:
        return flask.redirect(flask.url_for("login.sign_in"))

    log_database = LogDatabase(project_id)
    log_files = log_database.get_log_files()

    if "active_logfile" not in project_args:
        return flask.redirect(flask.url_for("index.logfile", project_id=project_id, log_id=log_files[0]))

    return index(active_project=project_id, log_files=log_files, **project_args)

@page.route("/<project_id>/<log_id>")
def logfile(project_id, log_id):
    if get_user_details() is None:
        return flask.redirect(flask.url_for("login.sign_in"))

    log_database = LogDatabase(project_id)
    fields = log_database.get_fields(log_id)

    return project(project_id, active_logfile=log_id, log_fields=fields)

@page.route("/<project_id>/<log_id>/search")
def search(project_id, log_id):
    if get_user_details() is None:
        return make_json_response({"results": []}, 401)

    log_database = LogDatabase(project_id)

    results = []

    query = flask.request.args.get("query")
    sql, fields = parse_query(query, log_id)

    results = log_database.search(log_id, sql)

    def format_row(row):
        return {
            "text": row[0].replace("\n", "<br>"),
            "entry": json.loads(row[1]),
            "date": datetime.fromtimestamp(row[2]).strftime("%Y-%m-%d %H:%M:%S")
        }

    json_response = {
        "results": list(map(format_row, results)),
        "fields": fields
    }

    return make_json_response(json_response, 200)

@page.route("/add", methods=["POST"])
def add_project():
    if get_user_details() is None:
        return make_text_response("Unathorized Access.", 401)

    data = flask.request.form

    meta_database: MetaDatabase = flask.current_app.config["DATABASE"]
    meta_database.add_project(data["project_id"], data["log_path"])

    return flask.redirect(flask.url_for("index.index"))
