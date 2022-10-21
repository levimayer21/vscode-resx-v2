// @ts-check

// Script run within the webview itself.
(function () {

    // Get a reference to the VS Code webview api.
    // We use this API to post messages back to our extension.

    // @ts-ignore
    const vscode = acquireVsCodeApi();

    const notesContainer = /** @type {HTMLElement} */ (document.querySelector('tbody'));

    const errorContainer = document.createElement('div');
    document.body.appendChild(errorContainer);
    errorContainer.className = 'error';
    errorContainer.style.display = 'none';
    
    /**
     * Render the document in the webview.
     */
    let inputEvent = () => {
        saveResXRows();
    };

    let saveResXRows = () => {
        let obj = {};
        let a = notesContainer.querySelectorAll('tr');
        for (let rule of a) {
            let areas = rule.querySelectorAll('textarea');
            if (areas.length && areas[0].value && areas[1].value) {
                obj[areas[0].value] = {
                    value: areas[1].value,
                    comment: areas[2].value
                };
            }
        }
        vscode.setState({ text: JSON.stringify(obj) });
        vscode.postMessage({
            type: 'update',
            json: JSON.stringify(obj)
        });
    };

    let deleteEvent = (/** @type {HTMLTableRowElement} */ self) => {
        self.remove();
        saveResXRows();
    };
    // @ts-ignore
    document.querySelector('.plus').addEventListener('click', () => {
        const element = document.createElement('tr');
        notesContainer.appendChild(element);

        const name = fillResXRow(null);
        name.focus();
        element.scrollIntoView();
    });

    /**
     * @param {string | undefined} [_name]
     * @param {Object | undefined} json
     */
    function fillResXRow(json, _name) {
        /** @type {{value,comment} | null} */
        let rule = null;
        
        if (_name)
        {
            rule = json[_name];
        }

        const element = document.createElement('tr');
        notesContainer.appendChild(element);

        const name = createCellForInput(_name);

        const value = createCellForInput(rule?.value);

        const comment = createCellForInput(rule?.comment);

        const drop = document.createElement('td');
        drop.innerHTML = '&times;';
        drop.onclick = () => deleteEvent(element);
        element.append(name, value, comment, drop);
        return name;
    }

    function createCellForInput(/** @type {string | undefined} **/ text) {
        let newCell = document.createElement('td');
        const _newCellInput = document.createElement('textarea');
        _newCellInput.addEventListener("focusin", handleFocusInForTextArea);
        _newCellInput.addEventListener("input", handleInputForTextArea);
        _newCellInput.addEventListener("focusout", handleFocusOutForTextArea);
        _newCellInput.addEventListener("focusout", inputEvent);
        newCell.appendChild(_newCellInput);
        _newCellInput.value = text ?? '';

        return newCell;
    }

    function handleFocusInForTextArea(ev)
    {
        handleInputForTextArea(ev);
    }

    function handleInputForTextArea(ev) {
        if (ev.target instanceof HTMLTextAreaElement)
        {
            setTextAreaHeightToMatchText(ev.target);
        }
    }

    function setTextAreaHeightToMatchText(textArea) {
        let cell = textArea.closest("td");

        cell.style.height = 0;
        cell.style.height = (textArea.scrollHeight) + "px";
    }

    function handleFocusOutForTextArea(ev) {
        if (ev.target instanceof HTMLTextAreaElement)
        {
            ev.target.closest("td").style.height = null;
        }
    }
    
    function updateContent(/** @type {string} */ text) {
        let json;
        try {
            json = JSON.parse(text);
            json = sortResXJSON(json);
        } catch {
            notesContainer.style.display = 'none';
            errorContainer.innerText = 'Error: Document is not valid resx';
            errorContainer.style.display = '';
            return;
        }
        notesContainer.style.display = '';
        errorContainer.style.display = 'none';

        // Render the scratches
        notesContainer.innerHTML = '';
        for (const _name in json || []) {
            fillResXRow(json, _name);
        }

    }

    function sortResXJSON(/** @type {Object} **/ json) {
        return Object.keys(json)
                .sort()
                .reduce((accumulator, key) => {
                    accumulator[key] = json[key];
                
                    return accumulator;
                }, {});
    }

    // Handle messages sent from the extension to the webview
    window.addEventListener('message', event => {
        const message = event.data; // The json data that the extension sent
        switch (message.type) {
            case 'update':
                const text = message.text;
                if (text !== vscode.getState()?.text) {
                    // Update our webview's content
                    updateContent(text);
                }
                // Then persist state information.
                // This state is returned in the call to `vscode.getState` below when a webview is reloaded.
                vscode.setState({ text });

                return;
        }
    });

    // Webviews are normally torn down when not visible and re-created when they become visible again.
    // State lets us save information across these re-loads
    const state = vscode.getState();
    if (state) {
        updateContent(state.text);
    }
}());
