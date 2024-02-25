let textSearchIndex = -1;

function getBaseURL() {
    return window.location.protocol + "//" + window.location.hostname + ":" + window.location.port + "/clog";
}

function createSearchResultEntry(data, index) {
    let elem = document.createElement("div");
    elem.classList = "log-result-wrapper";

    let color = index % 2 == 0 ? "#2b2b2b" : "#1c1c1c";
    elem.style.backgroundColor = color;

    let header = document.createElement("div");
    header.textContent = data["text"];
    header.className = "log-result-text";

    let body = document.createElement("div");
    body.textContent = data["entry"];
    body.className = "log-result-body";

    let footer = document.createElement("div");
    footer.textContent = data["date"];
    footer.className = "log-result-footer";

    elem.appendChild(header);
    elem.appendChild(body);
    elem.appendChild(footer);

    return elem;
}

function search(projectId, logId) {
    let url = `${getBaseURL()}/${projectId}/${logId}/search`;

    let fieldListWrappers = document.getElementsByClassName("log-fields-wrapper");
    for (let i = 0; i < fieldListWrappers.length; i++) {
        let wrapper = fieldListWrappers.item(i);
        let list = wrapper.getElementsByClassName("log-fields-list").item(0);
        let toggleBtn = wrapper.getElementsByClassName("show-fields-btn").item(0);
        if (!list.classList.contains("d-none")) {
            toggleShowFields(toggleBtn, wrapper.id);
        }
    }

    let resultsWrapper = document.getElementById("search-results-wrapper");
    let noResultsPlaceholder = document.getElementById("no-results-placeholder");
    let resultEntriesWrapper = document.getElementById("search-results-list");
    let searchError = document.getElementById("search-error");
    let loadingIcon = document.getElementById("search-results-loading");

    [resultsWrapper, noResultsPlaceholder, resultEntriesWrapper, searchError].forEach((elem) => {
        if (!elem.classList.contains("d-none")) {
            elem.classList.add("d-none");
        }
    });

    if (loadingIcon.classList.contains("d-none")) {
        loadingIcon.classList.remove("d-none");
    }

    let textSearch = document.getElementById("text-search").value;

    let searchParams = {}
    if (textSearch != "") {
        searchParams["query"] = textSearch;
    }

    $.ajax(
        url,
        {
            data: searchParams,
            dataType: "json"
        }
    ).fail(function() {
        loadingIcon.classList.add("d-none");
        searchError.classList.remove("d-none");
    }).done(function(response) {
        loadingIcon.classList.add("d-none");
        let results = response["results"];
        resultsWrapper.classList.remove("d-none");
        if (results.length == 0) {
            noResultsPlaceholder.classList.remove("d-none");
        }
        else {
            resultEntriesWrapper.innerHTML = "";
            resultEntriesWrapper.classList.remove("d-none");
            response["results"].forEach(function(entry, index) {
                let elem = createSearchResultEntry(entry, index);
                resultEntriesWrapper.appendChild(elem);
            });
        }
    });
}

function showAddProject() {
    document.getElementById('add-project-wrapper').classList.remove('d-none');
}

function cancelAddProject(event) {
    event.preventDefault();
    document.getElementById('add-project-wrapper').classList.add('d-none');
}

function toggleShowFields(toggleBtn, fieldWrapper) {
    if (toggleBtn.textContent == "+") {
        toggleBtn.textContent = "-";
    }
    else {
        toggleBtn.textContent = "+";
    }

    let wrapper = document.getElementById(fieldWrapper);
    let listWrapper = wrapper.getElementsByClassName("log-fields-list").item(0);

    if (listWrapper.classList.contains("d-none")) {
        listWrapper.classList.remove("d-none");
    }
    else {
        listWrapper.classList.add("d-none");
    }
}

function toggleAllFields(event) {
    let checked = event.target.checked;
    let fieldWrappers = document.getElementsByClassName("log-field-entry included-field");
    for (let i = 0; i < fieldWrappers.length; i++) {
        let check = fieldWrappers.item(i).getElementsByTagName("input").item(0);
        check.checked = checked;
    }
}

function toggleSelectedField(event, allCheckedId) {
    let checked = event.target.checked;
    let allChecked = document.getElementById(allCheckedId);

    if (checked) {
        let fieldWrappers = document.getElementsByClassName("log-field-entry included-field");
        let anyUnchecked = false;
        for (let i = 0; i < fieldWrappers.length; i++) {
            let check = fieldWrappers.item(i).getElementsByTagName("input").item(0);

            if (!check.checked) {
                anyUnchecked = true;
                break
            }
        }

        if (!anyUnchecked) {
            allChecked.checked = true;
        }
    }
    else {
        allChecked.checked = false;
    }
}

function createTextSearchSuggestion(field) {
    let elem = document.createElement("div");
    elem.textContent = field;

    return elem;
}

function findTextSearchSuggestions(fields, text) {
    let matches = []
    fields.forEach((data) => {
        let field = data["name"];
        let count = data["count"];
        if (field.includes(text)) {
            matches.push([field, parseInt(count)])
        }
    });
    matches.sort((a, b) => a[1] - b[1]);

    return matches.map((v) => v[0]);
}

function textSearchPress(event, projectId, logId) {
    if (event.key == 'Enter') {
        search(projectId, logId);
        return;
    }

    let suggestionsWrapper = document.getElementById("text-search-suggestions");
    let split = event.target.value.split(" ");

    let prevWords = "";
    if (split.length > 1) {
        prevWords = split.slice(0, -1).join(" ") + " ";
    }

    if (event.key == "Tab") {
        event.preventDefault();

        event.target.value = prevWords + suggestionsWrapper.children[0].textContent;
        suggestionsWrapper.classList.add("d-none");
    }
    else if (event.key == "ArrowDown") {
        event.preventDefault();

        let prevHighlightedElem = document.getElementsByClassName("highlighted-search-suggestion");
        if (prevHighlightedElem.length > 0) {
            prevHighlightedElem.item(0).classList.remove("highlighted-search-suggestion");
        }

        textSearchIndex += 1;

        let selectedSuggestion = suggestionsWrapper.children[textSearchIndex];
        selectedSuggestion.classList.add("highlighted-search-suggestion");

        event.target.value = prevWords + selectedSuggestion.textContent;
    }
}

function textSearchInput(event, fields) {
    textSearchIndex = -1;

    let prevHighlightedElem = document.getElementsByClassName("highlighted-search-suggestion");
    if (prevHighlightedElem.length > 0) {
        prevHighlightedElem.item(0).classList.remove("highlighted-search-suggestion");
    }

    let suggestionsWrapper = document.getElementById("text-search-suggestions");
    let split = event.target.value.split(" ");

    suggestionsWrapper.innerHTML = "";

    let text = split[split.length-1];

    if (text == "") {
        suggestionsWrapper.classList.add("d-none");
        return;
    }

    let matchingFields = findTextSearchSuggestions(fields, text);
    if (matchingFields.length == 0) {
        suggestionsWrapper.classList.add("d-none");
        return;
    }

    suggestionsWrapper.classList.remove("d-none");

    matchingFields.forEach((field) => {
        let elem = createTextSearchSuggestion(field);
        suggestionsWrapper.appendChild(elem);
    });
}