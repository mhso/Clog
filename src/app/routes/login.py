import flask
from mhooge_flask import routing, auth

login_page = flask.Blueprint("login", __name__)

@login_page.route("/", methods=["GET", "POST"])
def sign_in():
    if flask.request.method == "POST":
        # Login attempted.
        data = flask.request.form

        return auth.login(data, "user", "pass", "index.index", "login.html")

    # Display login form.
    return routing.make_template_context("login.html")
