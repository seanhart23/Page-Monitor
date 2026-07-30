import "dotenv/config";

export function normalizePageText(value = "") {
    return String(value)
        .replace(/\u00a0/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

export function limitStoredContent(content = "") {
    const safeContent = String(content);

    if (safeContent.length <= process.env.MAX_STORED_CONTENT_LENGTH) {
        return safeContent;
    }

    return safeContent.slice(0, process.env.MAX_STORED_CONTENT_LENGTH);
}

export function createChangePreview(previousContent, currentContent, options = {}) {
    const {
        maxWords = process.env.DEFAULT_PREVIEW_WORDS,
        contextWords = process.env.DEFAULT_CONTEXT_WORDS
    } = options;

    const normalizedPrevious = normalizePageText(previousContent);
    const normalizedCurrent = normalizePageText(currentContent);

    if (!normalizedPrevious && !normalizedCurrent) {
        return createEmptyPreview();
    }

    if (normalizedPrevious === normalizedCurrent) {
        return createEmptyPreview();
    }

    const previousWords = splitIntoWords(normalizedPrevious);

    const currentWords = splitIntoWords(normalizedCurrent);

    let startIndex = 0;

    while (
        startIndex < previousWords.length &&
        startIndex < currentWords.length &&
        previousWords[startIndex] ===
            currentWords[startIndex]
    ) {
        startIndex += 1;
    }

    let previousEndIndex = previousWords.length - 1;
    let currentEndIndex = currentWords.length - 1;

    while (
        previousEndIndex >= startIndex &&
        currentEndIndex >= startIndex &&
        previousWords[previousEndIndex] ===
            currentWords[currentEndIndex]
    ) {
        previousEndIndex -= 1;
        currentEndIndex -= 1;
    }

    const removedWords = previousWords.slice(startIndex, previousEndIndex + 1);
    const addedWords = currentWords.slice(startIndex, currentEndIndex + 1);
    const beforeContextWords = currentWords.slice(Math.max(0, startIndex - contextWords), startIndex);
    const afterContextWords = currentWords.slice(currentEndIndex + 1, currentEndIndex + 1 + contextWords);

    return {
        changed: true,

        changeType: determineChangeType(
            removedWords,
            addedWords
        ),

        summary: createSummary(
            removedWords.length,
            addedWords.length
        ),

        removedText: truncateWords(
            removedWords,
            maxWords
        ),

        addedText: truncateWords(
            addedWords,
            maxWords
        ),

        beforeContext:
            beforeContextWords.join(" "),

        afterContext:
            afterContextWords.join(" "),

        removedWordCount:
            removedWords.length,

        addedWordCount:
            addedWords.length,

        wasTruncated:
            removedWords.length > maxWords ||
            addedWords.length > maxWords
    };
}

function splitIntoWords(content) {
    if (!content) {
        return [];
    }

    return content.split(" ");
}

function truncateWords(words, maxWords) {
    if (!words.length) {
        return "";
    }

    const visibleWords = words.slice(0, maxWords);
    const wasTruncated = words.length > maxWords;

    return `${visibleWords.join(" ")}${ wasTruncated ? "…" : ""}`;
}

function determineChangeType(removedWords, addedWords) {
    if (
        removedWords.length > 0 &&
        addedWords.length > 0
    ) {
        return "modified";
    }

    if (addedWords.length > 0) {
        return "added";
    }

    if (removedWords.length > 0) {
        return "removed";
    }

    return "none";
}

function createSummary(removedWordCount, addedWordCount) {
    if (
        removedWordCount > 0 &&
        addedWordCount > 0
    ) {
        return (
            `Removed ${removedWordCount} ` +
            `word${pluralize(removedWordCount)} ` +
            `and added ${addedWordCount} ` +
            `word${pluralize(addedWordCount)}`
        );
    }

    if (addedWordCount > 0) {
        return (
            `Added ${addedWordCount} ` +
            `word${pluralize(addedWordCount)}`
        );
    }

    if (removedWordCount > 0) {
        return (
            `Removed ${removedWordCount} ` +
            `word${pluralize(removedWordCount)}`
        );
    }

    return "No text changes detected";
}

function pluralize(count) {
    return count === 1 ? "" : "s";
}

function createEmptyPreview() {
    return {
        changed: false,
        changeType: "none",
        summary: "No text changes detected",
        removedText: "",
        addedText: "",
        beforeContext: "",
        afterContext: "",
        removedWordCount: 0,
        addedWordCount: 0,
        wasTruncated: false
    };
}