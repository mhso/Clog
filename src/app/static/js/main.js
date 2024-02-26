let textSearchIndex = -1;

function getBaseURL() {
    return window.location.protocol + "//" + window.location.hostname + ":" + window.location.port + "/clog";
}

function fieldMatches(key, val, matchedFields) {
    for (let i = 0; i < matchedFields.length; i++) {
        let matched = matchedFields[i];
        if (matched[0] == "key") {
            return key == matched[1] ? 1 : 0;
        }
        else if (matched[0] == "key_val") {
            return key == matched[1] && val == matched[2] ? 2 : 0;
        }
        else if (matched[0] == "text") {
            return val.includes(matched[1]) ? 3 : 0;
        }
    }
    return 0;
}

function findMatchingKeys(key, val, fields) {
    if (typeof(val) != "object") {
        let result = fieldMatches(key, val, fields);
        
        if (fieldMatches(key, val, fields)) {
            return key
        }
    }
    for (let nextKey in val) {
        let matches = findMatchingKeys(nextKey, val[nextKey]);
    }
}

function toggleShowLogEntryResult(toggleBtn, elem) {
    let parentElem = toggleBtn.parentElement;
    let wrapper = elem.getElementsByClassName("field-child-wrapper").item(0);

    if (toggleBtn.textContent == "+") {
        toggleBtn.textContent = "-";
        toggleBtn.style.color = "red";
        toggleBtn.parentElement.removeChild(toggleBtn);
        parentElem.insertBefore(toggleBtn, wrapper);
    }
    else {
        toggleBtn.textContent = "+";
        toggleBtn.style.color = "green";
        toggleBtn.parentElement.removeChild(toggleBtn);
        parentElem.appendChild(toggleBtn);
    }


    if (wrapper.classList.contains("d-none")) {
        wrapper.classList.remove("d-none");
    }
    else {
        wrapper.classList.add("d-none");
    }
}

function createLogEntryFieldResult(header, footer) {
    let fieldElem = document.createElement("div");
    fieldElem.className = "search-result-field";
    let span = document.createElement("span");
    span.textContent = header;

    let wrapper = document.createElement("wrapper");
    wrapper.className = "field-child-wrapper d-none";

    let btn = document.createElement("span");
    btn.textContent = "+";
    btn.style.color = "green";
    btn.className = "expand-field-btn";
    btn.onclick = function() {
        toggleShowLogEntryResult(btn, fieldElem);
    };

    let footerElem = document.createElement("span")
    footerElem.textContent = footer;

    fieldElem.appendChild(span);
    fieldElem.appendChild(wrapper);
    fieldElem.appendChild(footerElem);
    fieldElem.appendChild(btn);

    return fieldElem;
}

function populateLogEntryElem(entry, depth) {
    let elem = document.createElement("div");
    elem.style.marginLeft = (depth * 10) + "px";

    if (Array.isArray(entry)) {
        entry.forEach((val) => {
            let fieldElem = createLogEntryFieldResult("[", "]");
            let wrapper = fieldElem.getElementsByClassName("field-child-wrapper").item(0);
            wrapper.appendChild(populateLogEntryElem(val, depth + 1));
            elem.appendChild(fieldElem);
        });
    }
    else if (entry != null && typeof(entry) == "object") {
        for (let key in entry) {
            let fieldElem = createLogEntryFieldResult(`${key}: {`, "}");
            let wrapper = fieldElem.getElementsByClassName("field-child-wrapper").item(0);
            wrapper.appendChild(populateLogEntryElem(entry[key], depth + 1));
            elem.appendChild(fieldElem);
        }
    }
    else {
        let valueElem = document.createElement("div");
        valueElem.className = "search-result-value";
        valueElem.innerHTML = entry == null ? "null" : entry;
        elem.appendChild(valueElem);
    }
    return elem;
}

function createSearchResultEntry(data, fields, index) {
    let elem = document.createElement("div");
    elem.classList = "log-result-wrapper";

    let color = index % 2 == 0 ? "#2b2b2b" : "#1c1c1c";
    elem.style.backgroundColor = color;

    let header = document.createElement("div");
    header.textContent = data["entry"]["message"];
    header.className = "log-result-text";

    data["entry"]["raw_text"] = data["text"];

    let body = populateLogEntryElem(data["entry"], 0);
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

    resultsWrapper.classList.remove("d-none");
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
            dataType: "json",
            method: "GET",
        }
    ).fail(function() {
        loadingIcon.classList.add("d-none");
        searchError.classList.remove("d-none");
    }).done(function(response) {
        loadingIcon.classList.add("d-none");
        let results = response["results"];
        if (results.length == 0) {
            noResultsPlaceholder.classList.remove("d-none");
        }
        else {
            resultEntriesWrapper.innerHTML = "";
            resultEntriesWrapper.classList.remove("d-none");
            let matchedFields = response["fields"];
            response["results"].forEach(function(entry, index) {
                let elem = createSearchResultEntry(entry, matchedFields, index);
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