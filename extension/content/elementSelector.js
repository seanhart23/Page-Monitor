let selectionModeActive = false;
let highlightedElement = null;
let selectionFlyout = null;

chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {
        if (
            message.type ===
            "START_ELEMENT_SELECTION"
        ) {
            startElementSelection();
        }

        if (
            message.type ===
            "HIGHLIGHT_MONITORED_ELEMENT"
        ) {
            const result =
                highlightMonitoredElement(
                    message.selector
                );

            sendResponse(result);

            return false;
        }

        if (
            message.type ===
            "VALIDATE_SELECTOR"
        ) {
            sendResponse(
                validateSelector(
                    message.selector
                )
            );

            return false;
        }
    }
);

function startElementSelection() {
    if (selectionModeActive) {
        return;
    }

    selectionModeActive = true;

    addPickerStyles();
    createSelectionFlyout();

    document.addEventListener(
        "mouseover",
        handleMouseOver,
        true
    );

    document.addEventListener(
        "mouseout",
        handleMouseOut,
        true
    );

    document.addEventListener(
        "click",
        handleElementClick,
        true
    );

    document.addEventListener(
        "keydown",
        handleKeyDown,
        true
    );

    document.body.style.cursor =
        "crosshair";
}

function handleMouseOver(event) {
    if (!selectionModeActive) {
        return;
    }

    const element = event.target;

    if (!(element instanceof HTMLElement)) {
        return;
    }

    /*
     * Never allow the extension's own UI
     * to become the selected element.
     */
    if (
        element.id ===
        "spm-element-selection-flyout"
    ) {
        return;
    }

    highlightedElement?.classList.remove(
        "spm-element-highlight"
    );

    highlightedElement = element;

    highlightedElement.classList.add(
        "spm-element-highlight"
    );

    updateSelectionFlyout(element);
}

function handleMouseOut(event) {
    if (!selectionModeActive) {
        return;
    }

    const element = event.target;

    if (!(element instanceof HTMLElement)) {
        return;
    }

    element.classList.remove(
        "spm-element-highlight"
    );

    /*
     * Avoid hiding the flyout when moving
     * between children inside the same element.
     */
    const relatedTarget =
        event.relatedTarget;

    if (
        relatedTarget instanceof Node &&
        element.contains(relatedTarget)
    ) {
        return;
    }

    hideSelectionFlyout();
}

function createSelectionFlyout() {
    selectionFlyout?.remove();

    selectionFlyout =
        document.createElement("div");

    selectionFlyout.id =
        "spm-element-selection-flyout";

    selectionFlyout.setAttribute(
        "role",
        "tooltip"
    );

    selectionFlyout.setAttribute(
        "aria-hidden",
        "true"
    );

    document.documentElement.appendChild(
        selectionFlyout
    );
}

function updateSelectionFlyout(element) {
    if (!selectionFlyout) {
        return;
    }

    const elementText =
        getElementText(element);

    const tagName =
        element.tagName.toLowerCase();

    const previewText =
        truncateText(
            elementText,
            160
        );

    selectionFlyout.replaceChildren();

    const typeLabel =
        document.createElement("div");

    typeLabel.className =
        "spm-selection-flyout__type";

    typeLabel.textContent =
        `<${tagName}>`;

    const preview =
        document.createElement("div");

    preview.className =
        "spm-selection-flyout__text";

    preview.textContent =
        previewText ||
        getElementFallbackDescription(
            element
        );

    selectionFlyout.append(
        typeLabel,
        preview
    );

    selectionFlyout.style.display =
        "block";

    selectionFlyout.setAttribute(
        "aria-hidden",
        "false"
    );

    positionSelectionFlyout(element);
}

function positionSelectionFlyout(element) {
    if (!selectionFlyout) {
        return;
    }

    const elementRect =
        element.getBoundingClientRect();

    const spacing = 8;
    const viewportPadding = 8;

    /*
     * Start below the selected element so
     * the flyout's dimensions can be measured.
     */
    selectionFlyout.style.top =
        `${elementRect.bottom + spacing}px`;

    selectionFlyout.style.left =
        `${elementRect.left}px`;

    const flyoutRect =
        selectionFlyout.getBoundingClientRect();

    let top =
        elementRect.bottom + spacing;

    let left =
        elementRect.left;

    /*
     * Move above the highlighted element
     * when there is not enough room below.
     */
    if (
        top + flyoutRect.height >
        window.innerHeight -
            viewportPadding
    ) {
        top =
            elementRect.top -
            flyoutRect.height -
            spacing;
    }

    /*
     * Keep the flyout inside the right
     * side of the viewport.
     */
    if (
        left + flyoutRect.width >
        window.innerWidth -
            viewportPadding
    ) {
        left =
            window.innerWidth -
            flyoutRect.width -
            viewportPadding;
    }

    /*
     * Keep the flyout inside the left and
     * top sides of the viewport.
     */
    left = Math.max(
        viewportPadding,
        left
    );

    top = Math.max(
        viewportPadding,
        top
    );

    selectionFlyout.style.left =
        `${left}px`;

    selectionFlyout.style.top =
        `${top}px`;
}

function hideSelectionFlyout() {
    if (!selectionFlyout) {
        return;
    }

    selectionFlyout.style.display =
        "none";

    selectionFlyout.setAttribute(
        "aria-hidden",
        "true"
    );
}

function removeSelectionFlyout() {
    selectionFlyout?.remove();
    selectionFlyout = null;
}

function truncateText(
    value,
    maxLength = 160
) {
    if (!value) {
        return "";
    }

    if (
        value.length <= maxLength
    ) {
        return value;
    }

    return `${value.slice(
        0,
        maxLength
    )}…`;
}

function getElementFallbackDescription(
    element
) {
    if (
        element instanceof
        HTMLImageElement
    ) {
        return "Image";
    }

    if (
        element instanceof
        HTMLInputElement
    ) {
        return element.type
            ? `${element.type} input`
            : "Input field";
    }

    if (
        element instanceof
        HTMLButtonElement
    ) {
        return "Button";
    }

    if (
        element instanceof
        HTMLAnchorElement
    ) {
        return "Link";
    }

    return "No text content";
}

function getElementText(element) {
    if (
        element instanceof
            HTMLInputElement ||
        element instanceof
            HTMLTextAreaElement
    ) {
        return normalizeText(
            element.value ||
            element.placeholder ||
            element.getAttribute(
                "aria-label"
            ) ||
            ""
        );
    }

    if (
        element instanceof
        HTMLImageElement
    ) {
        return normalizeText(
            element.alt ||
            element.getAttribute(
                "aria-label"
            ) ||
            ""
        );
    }

    return normalizeText(
        element.innerText ||
        element.textContent ||
        element.getAttribute(
            "aria-label"
        ) ||
        element.getAttribute(
            "title"
        ) ||
        ""
    );
}

function handleElementClick(event) {
    if (!selectionModeActive) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const element = event.target;

    if (
        !(element instanceof HTMLElement)
    ) {
        return;
    }

    if (
        element.closest(
            "#spm-element-selection-flyout"
        )
    ) {
        return;
    }

    const selector =
        generateSelector(element);

    if (!selector) {
        console.error(
            "Could not generate selector",
            element
        );

        return;
    }

    let matchedElement = null;

    try {
        matchedElement =
            document.querySelector(
                selector
            );
    } catch (error) {
        console.error(
            "Generated invalid selector:",
            {
                selector,
                error
            }
        );

        return;
    }

    if (matchedElement !== element) {
        console.error(
            "Generated selector did not resolve to selected element:",
            {
                selector,
                selectedElement:
                    element,
                matchedElement
            }
        );

        return;
    }

    const selectedElement = {
        selector,
        text:
            getElementText(element),
        tagName:
            element.tagName.toLowerCase()
    };

    chrome.runtime.sendMessage({
        type: "ELEMENT_SELECTED",
        payload: selectedElement
    });

    stopElementSelection();

    document.querySelector(
        "YOUR_SELECTOR_HERE"
    );
}

function handleKeyDown(event) {
    if (event.key === "Escape") {
        stopElementSelection();
    }
}

function stopElementSelection() {
    selectionModeActive = false;

    document.removeEventListener(
        "mouseover",
        handleMouseOver,
        true
    );

    document.removeEventListener(
        "mouseout",
        handleMouseOut,
        true
    );

    document.removeEventListener(
        "click",
        handleElementClick,
        true
    );

    document.removeEventListener(
        "keydown",
        handleKeyDown,
        true
    );

    highlightedElement?.classList.remove(
        "spm-element-highlight"
    );

    highlightedElement = null;

    document.body.style.cursor = "";

    removeSelectionFlyout();

    document
        .getElementById(
            "spm-element-picker-styles"
        )
        ?.remove();
}

function addPickerStyles() {
    if (
        document.getElementById(
            "spm-element-picker-styles"
        )
    ) {
        return;
    }

    const style =
        document.createElement("style");

    style.id =
        "spm-element-picker-styles";

    style.textContent = `
        .spm-element-highlight {
            outline: 2px solid #2563eb !important;
            outline-offset: 2px !important;
            cursor: crosshair !important;
        }

        #spm-element-selection-flyout {
            position: fixed !important;
            z-index: 2147483647 !important;

            display: none;
            width: max-content;
            max-width: 300px;

            padding: 9px 11px !important;

            border: 1px solid rgba(
                255,
                255,
                255,
                0.16
            ) !important;

            border-radius: 8px !important;

            background:
                rgba(
                    15,
                    23,
                    42,
                    0.96
                ) !important;

            color: #ffffff !important;

            box-shadow:
                0 8px 24px
                rgba(
                    15,
                    23,
                    42,
                    0.3
                ) !important;

            font-family:
                -apple-system,
                BlinkMacSystemFont,
                "Segoe UI",
                sans-serif !important;

            font-size: 12px !important;
            font-weight: 400 !important;
            line-height: 1.4 !important;

            text-align: left !important;
            white-space: normal !important;
            overflow-wrap: anywhere !important;

            pointer-events: none !important;
            box-sizing: border-box !important;
        }

        #spm-element-selection-flyout
        .spm-selection-flyout__type {
            margin: 0 0 3px !important;

            color: #93c5fd !important;

            font-family:
                ui-monospace,
                SFMono-Regular,
                Menlo,
                Monaco,
                Consolas,
                monospace !important;

            font-size: 10px !important;
            font-weight: 600 !important;
            line-height: 1.3 !important;
        }

        #spm-element-selection-flyout
        .spm-selection-flyout__text {
            margin: 0 !important;
            color: #ffffff !important;
            font-size: 12px !important;
            line-height: 1.4 !important;
        }
    `;

    document.head.appendChild(style);
}

function normalizeText(value) {
    return String(value || "")
        .replace(/\s+/g, " ")
        .trim();
}
function generateSelector(element) {
    if (!(element instanceof HTMLElement)) {
        return "";
    }

    /*
     * Prefer attributes commonly intended
     * for identifying elements.
     */
    const preferredAttributes = [
        "data-testid",
        "data-test",
        "data-qa",
        "data-cy"
    ];

    for (
        const attribute of
        preferredAttributes
    ) {
        const value =
            element.getAttribute(
                attribute
            );

        if (!value) {
            continue;
        }

        const selector =
            `[${attribute}="${CSS.escape(
                value
            )}"]`;

        if (isUniqueSelector(selector)) {
            return selector;
        }
    }

    /*
     * Use the ID only when it looks stable.
     * Random application-generated IDs are
     * often different after a reload.
     */
    if (
        element.id &&
        isStableSelectorToken(
            element.id
        )
    ) {
        const selector =
            `#${CSS.escape(element.id)}`;

        if (isUniqueSelector(selector)) {
            return selector;
        }
    }

    /*
     * Try stable element attributes.
     */
    const attributeSelectors =
        buildAttributeSelectors(
            element
        );

    for (
        const selector of
        attributeSelectors
    ) {
        if (isUniqueSelector(selector)) {
            return selector;
        }
    }

    /*
     * Build a path from the selected
     * element toward the document root.
     */
    const parts = [];
    let current = element;

    while (
        current &&
        current instanceof HTMLElement &&
        current !== document.body &&
        current !== document.documentElement
    ) {
        const part =
            buildSelectorPart(current);

        parts.unshift(part);

        const selector =
            parts.join(" > ");

        if (isUniqueSelector(selector)) {
            return selector;
        }

        current =
            current.parentElement;
    }

    /*
     * Final fallback, including body.
     */
    if (parts.length > 0) {
        return `body > ${parts.join(
            " > "
        )}`;
    }

    return "";
}

function buildSelectorPart(element) {
    const tagName =
        element.tagName.toLowerCase();

    /*
     * Prefer a stable ID on any parent
     * encountered while building the path.
     */
    if (
        element.id &&
        isStableSelectorToken(
            element.id
        )
    ) {
        return `#${CSS.escape(
            element.id
        )}`;
    }

    let selector = tagName;

    const stableClasses = [
        ...element.classList
    ]
        .filter(
            className =>
                !className.startsWith(
                    "spm-"
                )
        )
        .filter(
            isStableSelectorToken
        )
        .slice(0, 2);

    if (stableClasses.length > 0) {
        selector += stableClasses
            .map(
                className =>
                    `.${CSS.escape(
                        className
                    )}`
            )
            .join("");
    }

    const parent =
        element.parentElement;

    if (!parent) {
        return selector;
    }

    /*
     * Check whether the tag and stable
     * classes already identify this element
     * among its siblings.
     */
    let siblingMatches = [];

    try {
        siblingMatches = [
            ...parent.children
        ].filter(
            sibling =>
                sibling.matches(selector)
        );
    } catch {
        siblingMatches = [];
    }

    if (
        siblingMatches.length === 1
    ) {
        return selector;
    }

    /*
     * nth-of-type is used only as a fallback.
     */
    const sameTagSiblings = [
        ...parent.children
    ].filter(
        sibling =>
            sibling.tagName ===
            element.tagName
    );

    if (
        sameTagSiblings.length > 1
    ) {
        const index =
            sameTagSiblings.indexOf(
                element
            ) + 1;

        selector +=
            `:nth-of-type(${index})`;
    }

    return selector;
}

function buildAttributeSelectors(
    element
) {
    const tagName =
        element.tagName.toLowerCase();

    const selectors = [];

    const name =
        element.getAttribute("name");

    if (name) {
        selectors.push(
            `${tagName}[name="${CSS.escape(
                name
            )}"]`
        );
    }

    const ariaLabel =
        element.getAttribute(
            "aria-label"
        );

    if (ariaLabel) {
        selectors.push(
            `${tagName}[aria-label="${CSS.escape(
                ariaLabel
            )}"]`
        );
    }

    const role =
        element.getAttribute("role");

    if (role) {
        selectors.push(
            `${tagName}[role="${CSS.escape(
                role
            )}"]`
        );
    }

    const type =
        element.getAttribute("type");

    if (type) {
        selectors.push(
            `${tagName}[type="${CSS.escape(
                type
            )}"]`
        );
    }

    return selectors;
}

function isStableSelectorToken(
    value
) {
    if (!value) {
        return false;
    }

    /*
     * Reject extremely long tokens.
     */
    if (value.length > 60) {
        return false;
    }

    /*
     * Reject strings that are mostly
     * numbers or look like generated hashes.
     */
    if (/^\d+$/.test(value)) {
        return false;
    }

    if (
        /^[a-f0-9]{8,}$/i.test(value)
    ) {
        return false;
    }

    /*
     * Reject UUID-like values.
     */
    if (
        /^[a-f0-9]{8}-[a-f0-9-]{20,}$/i.test(
            value
        )
    ) {
        return false;
    }

    /*
     * Reject class names commonly generated
     * by CSS modules or component libraries.
     */
    if (
        /(^|[-_])css[-_]?[a-z0-9]+$/i.test(
            value
        )
    ) {
        return false;
    }

    if (
        /[a-zA-Z]+_[a-zA-Z]+__[a-zA-Z0-9_-]{5,}/.test(
            value
        )
    ) {
        return false;
    }

    return true;
}

function isUniqueSelector(selector) {
    if (!selector) {
        return false;
    }

    try {
        return (
            document.querySelectorAll(
                selector
            ).length === 1
        );
    } catch {
        return false;
    }
}

function highlightMonitoredElement(
    selector
) {
    if (!selector) {
        return {
            success: false,
            message:
                "No selector was provided."
        };
    }

    let target;

    try {
        target =
            document.querySelector(
                selector
            );
    } catch {
        return {
            success: false,
            message:
                "The saved selector is invalid."
        };
    }

    if (!target) {
        return {
            success: false,
            message:
                "The monitored element was not found."
        };
    }

    target.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest"
    });

    const previousOutline =
        target.style.outline;

    const previousOutlineOffset =
        target.style.outlineOffset;

    const previousBoxShadow =
        target.style.boxShadow;

    const previousTransition =
        target.style.transition;

    target.style.transition =
        "outline 150ms ease, box-shadow 150ms ease";

    target.style.outline =
        "4px solid #2563eb";

    target.style.outlineOffset =
        "4px";

    target.style.boxShadow =
        "0 0 0 8px rgba(37, 99, 235, 0.2)";

    setTimeout(() => {
        target.style.outline =
            previousOutline;

        target.style.outlineOffset =
            previousOutlineOffset;

        target.style.boxShadow =
            previousBoxShadow;

        target.style.transition =
            previousTransition;
    }, 2500);

    return {
        success: true
    };
}

function validateSelector(selector) {
    if (!selector) {
        return {
            valid: false,
            message:
                "No element selector was provided."
        };
    }

    try {
        const element =
            document.querySelector(
                selector
            );

        if (!element) {
            return {
                valid: false,
                message:
                    "The selected element is no longer on this page."
            };
        }

        return {
            valid: true,
            tagName:
                element.tagName.toLowerCase(),
            text:
                getElementText(element)
        };
    } catch {
        return {
            valid: false,
            message:
                "The selected element has an invalid selector."
        };
    }
}