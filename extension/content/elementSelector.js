let selectionModeActive = false;
let highlightedElement = null;

chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "START_ELEMENT_SELECTION") {
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
});

function startElementSelection() {
    if (selectionModeActive) {
        return;
    }

    selectionModeActive = true;

    document.addEventListener("mouseover", handleMouseOver, true);
    document.addEventListener("mouseout", handleMouseOut, true);
    document.addEventListener("click", handleElementClick, true);
    document.addEventListener("keydown", handleKeyDown, true);

    document.body.style.cursor = "crosshair";

    addPickerStyles();
}

function handleMouseOver(event) {
    if (!selectionModeActive) {
        return;
    }

    const element = event.target;

    if (!(element instanceof HTMLElement)) {
        return;
    }

    highlightedElement?.classList.remove(
        "spm-element-highlight"
    );

    highlightedElement = element;

    highlightedElement.classList.add(
        "spm-element-highlight"
    );
}

function handleMouseOut(event) {
    const element = event.target;

    if (!(element instanceof HTMLElement)) {
        return;
    }

    element.classList.remove(
        "spm-element-highlight"
    );
}

function getElementText(element) {
    if (
        element instanceof HTMLInputElement ||
        element instanceof HTMLTextAreaElement
    ) {
        return normalizeText(
            element.value ||
            element.placeholder ||
            ""
        );
    }

    if (element instanceof HTMLImageElement) {
        return normalizeText(
            element.alt ||
            element.getAttribute("aria-label") ||
            ""
        );
    }

    return normalizeText(
        element.innerText ||
        element.textContent ||
        element.getAttribute("aria-label") ||
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

    if (!(element instanceof HTMLElement)) {
        return;
    }

    const selector = generateSelector(element);

    const selectedElement = {
        selector,
        text: getElementText(element),
        tagName: element.tagName.toLowerCase()
    };

    console.log("Selected element:", selectedElement);

    chrome.runtime.sendMessage({
        type: "ELEMENT_SELECTED",
        payload: selectedElement
    });

    stopElementSelection();
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

    document
        .getElementById("spm-element-picker-styles")
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

    const style = document.createElement("style");

    style.id = "spm-element-picker-styles";

    style.textContent = `
    .spm-element-highlight {
      outline: 2px solid #2563eb !important;
      outline-offset: 2px !important;
      cursor: crosshair !important;
    }
  `;

    document.head.appendChild(style);
}

function normalizeText(value) {
    return value
        .replace(/\s+/g, " ")
        .trim();
}

function generateSelector(element) {
    if (element.id) {
        return `#${CSS.escape(element.id)}`;
    }

    const parts = [];
    let current = element;

    while (
        current &&
        current instanceof HTMLElement &&
        current !== document.body
    ) {
        let selector =
            current.tagName.toLowerCase();

        const usableClasses = [
            ...current.classList
        ]
            .filter(
                className =>
                    !className.startsWith("spm-")
            )
            .slice(0, 2);

        if (usableClasses.length > 0) {
            selector += usableClasses
                .map(
                    className =>
                        `.${CSS.escape(className)}`
                )
                .join("");
        }

        const parent = current.parentElement;

        if (parent) {
            const sameTagSiblings = [
                ...parent.children
            ].filter(
                sibling =>
                    sibling.tagName ===
                    current.tagName
            );

            if (sameTagSiblings.length > 1) {
                const index =
                    sameTagSiblings.indexOf(current) +
                    1;

                selector += `:nth-of-type(${index})`;
            }
        }

        parts.unshift(selector);

        const fullSelector = parts.join(" > ");

        try {
            if (
                document.querySelectorAll(
                    fullSelector
                ).length === 1
            ) {
                return fullSelector;
            }
        } catch {
            // Continue building a longer selector.
        }

        current = parent;
    }

    return parts.join(" > ");
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
            document.querySelector(selector);
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
      document.querySelector(selector);

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
        extractElementPreviewText(
          element
        )
    };
  } catch {
    return {
      valid: false,
      message:
        "The selected element has an invalid selector."
    };
  }
}