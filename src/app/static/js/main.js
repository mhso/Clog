let textSearchIndex = -1;

function getBaseURL() {
    return window.location.protocol + "//" + window.location.hostname + ":" + window.location.port + "/clog";
}

function fieldMatches(key, val, matchedFields) {
    let matchClass = "field-matches-search";

    for (let i = 0; i < matchedFields.length; i++) {
        let matchType = matchedFields[i][0];
        let matchedKey = matchedFields[i][1];
        let matchedVal = matchedFields[i][2];

        if (key != null && val != null && typeof(val) != "string") {
            return "no-matches";
        }

        if (matchType == "key" && key != null && key == matchedKey) {
            return matchClass;
        }
        else if (matchType == "key_val" && key != null && val != null && key == matchedKey && val == matchedVal) {
            return matchClass;
        }
        else if (matchType == "key_val" && val != null && val == matchedVal) {
            return matchClass;
        }
        else if (matchType == "text" && key != null && key.includes(matchedKey)) {
            return matchClass;
        }
        else if (matchType == "text" && val != null && val.includes(matchedVal)) {
            return matchClass;
        }
    }
    return "no-matches";
}

function toggleShowLogEntryResult(toggleBtn, dotDotDotElem, wrapperElem) {
    let parentElem = toggleBtn.parentElement;
    let wrapper = wrapperElem.getElementsByClassName("field-child-wrapper").item(0);

    if (toggleBtn.textContent == "+") {
        toggleBtn.textContent = "-";
        toggleBtn.style.marginLeft = "19px";
        toggleBtn.style.color = "red";
        toggleBtn.parentElement.removeChild(toggleBtn);
        parentElem.insertBefore(toggleBtn, wrapper);
        dotDotDotElem.textContent = "";
    }
    else {
        toggleBtn.textContent = "+";
        toggleBtn.style.color = "green";
        toggleBtn.style.marginLeft = "10px";
        toggleBtn.parentElement.removeChild(toggleBtn);
        parentElem.appendChild(toggleBtn);
        dotDotDotElem.textContent = "...";
    }

    if (wrapper.classList.contains("d-none")) {
        wrapper.classList.remove("d-none");
    }
    else {
        wrapper.classList.add("d-none");
    }
}

function createLogEntryFieldResult(header, footer, matchClass) {
    let fieldElem = document.createElement("div");
    fieldElem.classList.add("search-result-field")
    fieldElem.classList.add(matchClass);
    let span = document.createElement("span");
    span.textContent = header;

    let wrapper = document.createElement("wrapper");
    wrapper.className = "field-child-wrapper";
    if (matchClass == "no-matches") {
        wrapper.classList.add("d-none");
    }

    let dotDotDotSpan = document.createElement("span");
    dotDotDotSpan.className = "dot-dot-dot";
    dotDotDotSpan.textContent = matchClass == "no-matches" ? "" : "...";

    let btn = document.createElement("span");
    btn.textContent = matchClass == "no-matches" ? "+" : "-";
    btn.style.color = matchClass == "no-matches" ? "green" : "red";
    btn.className = "expand-field-btn";
    btn.onclick = function() {
        toggleShowLogEntryResult(btn, dotDotDotSpan, fieldElem);
    };

    let footerElem = document.createElement("span")
    footerElem.textContent = footer;

    fieldElem.appendChild(span);
    fieldElem.append(dotDotDotSpan);
    if (matchClass == "no-matches") {
        fieldElem.appendChild(wrapper);
        fieldElem.appendChild(footerElem);
        fieldElem.appendChild(btn);
    }
    else {
        fieldElem.appendChild(btn);
        fieldElem.appendChild(wrapper);
        fieldElem.appendChild(footerElem);
    }

    return fieldElem;
}

function populateFieldWrapper(entry, val, fields, depth) {
    let wrapper = entry.getElementsByClassName("field-child-wrapper").item(0);
    wrapper.appendChild(populateLogEntryElem(val, fields, depth + 1));
    if (wrapper.textContent == "") {
        for (let i = 0; i < entry.children.length; i++) {
            let child = entry.children[i];
            if (child.classList.contains("expand-field-btn") || child.classList.contains("dot-dot-dot")) {
                // If this field  has no children, remove the ability to expand the field
                entry.removeChild(child);
                i--;
            }
        }
    }
}

function populateLogEntryElem(entry, fields, depth) {
    let elem = document.createElement("div");
    elem.style.marginLeft = (depth * 10) + "px";

    if (depth == 0) {
        elem.classList.add("top-level-search-result-field");
    }

    let fieldsAtDepth = [];
    for (let i = 0; i < fields.length; i++) {
        let matchedKey = fields[i][1].split(".");
        if (matchedKey.length <= depth) {
            matchedKey = null;
        }
        else {
            matchedKey = matchedKey[depth];
        }
        let matchedVal = fields[i].length == 3 ? fields[i][2] : null;
        fieldsAtDepth.push([fields[i][0], matchedKey, matchedVal]);
    }

    if (Array.isArray(entry)) {
        entry.forEach((val) => {
            let className = fieldMatches(val, null, fieldsAtDepth);
            let fieldElem = createLogEntryFieldResult("[", "]", className);
            populateFieldWrapper(fieldElem, val, fields, depth);
            elem.appendChild(fieldElem);
        });
    }
    else if (entry != null && typeof(entry) == "object") {
        for (let key in entry) {
            let val = entry[key];
            let className = fieldMatches(key, val, fieldsAtDepth);
            if (className == "no-matches") {
                className = fieldMatches(key, null, fieldsAtDepth);
            }

            let fieldElem = createLogEntryFieldResult(`${key}: {`, "}", className);
            populateFieldWrapper(fieldElem, val, fields, depth);
            if (fieldElem.querySelector(".field-child-wrapper .field-matches-search") != null) {
                fieldElem.classList.add("field-matches-search");
            }
            elem.appendChild(fieldElem);
        }
    }
    else {
        let valueElem = document.createElement("div");
        valueElem.innerHTML = entry == null ? "null" : entry;
        valueElem.className = "field-value-elem";
        valueElem.classList.add(fieldMatches(null, entry, fieldsAtDepth));
        elem.appendChild(valueElem);
    }

    return elem;
}

function createSearchResultEntry(data, fields, index) {
    let elem = document.createElement("div");
    elem.classList = "log-result-wrapper";

    let mainColor = index % 2 == 0 ? "#2b2b2b" : "#1c1c1c";
    elem.style.backgroundColor = mainColor;

    let header = document.createElement("div");
    header.textContent = data["entry"]["message"];
    let headerColor = index % 2 == 0 ? "#4f4f4f" : "#363636";
    header.className = "log-result-text";
    header.style.backgroundColor = headerColor;

    data["entry"]["raw_text"] = data["text"];

    let body = populateLogEntryElem(data["entry"], fields, 0);

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
            try {
                response["results"].forEach(function(entry, index) {
                    let elem = createSearchResultEntry(entry, matchedFields, index);
                    resultEntriesWrapper.appendChild(elem);
                });
            }
            catch (error) {
                searchError.classList.remove("d-none");
                console.error(error);
            }
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
    let suggestionsWrapper = document.getElementById("text-search-suggestions");
    let split = event.target.value.split(" ");

    let prevWords = "";
    if (split.length > 1) {
        prevWords = split.slice(0, -1).join(" ") + " ";
    }

    if (event.key == "Tab" || event.key == "Enter") {
        event.preventDefault();

        let highlightedElem = document.getElementsByClassName("highlighted-search-suggestion");
        if (event.key == "Enter" && suggestionsWrapper.classList.contains("d-none")) {
            search(projectId, logId);
        }
        else if (event.key == "Tab") {
            if (highlightedElem.length == 1) {
                event.target.value = prevWords + highlightedElem.item(0).textContent;
                suggestionsWrapper.classList.add("d-none");
            }
            else {
                event.target.value = prevWords + suggestionsWrapper.children[0].textContent;
            }
        }
    }
    else if (event.key == "ArrowDown" || event.key == "ArrowUp") {
        event.preventDefault();

        let prevHighlightedElem = document.getElementsByClassName("highlighted-search-suggestion");
        if (prevHighlightedElem.length > 0) {
            prevHighlightedElem.item(0).classList.remove("highlighted-search-suggestion");
        }

        if (event.key == "ArrowDown") {
            textSearchIndex += 1;
            if (textSearchIndex >= suggestionsWrapper.children.length) {
                textSearchIndex = suggestionsWrapper.children.length - 1;
            }
        }
        else {
            textSearchIndex -= 1;
            if (textSearchIndex < 0) {
                textSearchIndex = 0;
            }
        }

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