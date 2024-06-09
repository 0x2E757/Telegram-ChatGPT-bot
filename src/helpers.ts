const unsafeCharsMap: Record<string, string | undefined> = {
    '\\': '\\\\',
    '#': '\\#',
    '=': '\\=',
    '-': '\\-',
    '*': '\\*',
    '_': '\\_',
    '|': '\\|',
    '[': '\\[',
    ']': '\\]',
    '{': '\\{',
    '}': '\\}',
    '(': '\\(',
    ')': '\\)',
    '>': '\\>',
    '.': '\\.',
    '!': '\\!',
    '~': '\\~',
    '+': '\\+',
    '`': '\\`',
    '"': '\\"',
};

export function escapeUnsafeChars(text: string) {
    let result = "";
    for (const char of text)
        result += unsafeCharsMap[char] ?? char;
    return result;
}

function parseMarkdownLevel2(text: string, level: number = 1) {
    const heap: [ReturnType<typeof crypto.randomUUID>, string][] = [];
    const bold1Regex = /\\\*\\\*(?!\\\*)(.+?)\\\*\\\*/gs;
    const bold2Regex = /\\\_\\\_(?!\\\_)(.+?)\\\_\\\_/gs;
    const italic1Regex = /\\\*(?!\\\*)(.+?)\\\*/gs;
    const italic2Regex = /\\\_(?!\\\_)(.+?)\\\_/gs;
    const strikeRegex = /\\~\\~(?!\\~)(.+?)\\~\\~/gs;
    const underlineRegex = /\\<u\\>(.+?)\\<\/u\\>/gs;

    text = text.replace(bold1Regex, (match, group) => {
        const key = crypto.randomUUID();
        const value = '*' + parseMarkdownLevel2(group, level + 1) + '*';
        heap.push([key, value]);
        return key;
    });

    text = text.replace(bold2Regex, (match, group) => {
        const key = crypto.randomUUID();
        const value = '*' + parseMarkdownLevel2(group, level + 1) + '*';
        heap.push([key, value]);
        return key;
    });

    text = text.replace(italic1Regex, (match, group) => {
        const key = crypto.randomUUID();
        const value = '_' + parseMarkdownLevel2(group, level + 1) + '_';
        heap.push([key, value]);
        return key;
    });

    text = text.replace(italic2Regex, (match, group) => {
        const key = crypto.randomUUID();
        const value = '_' + parseMarkdownLevel2(group, level + 1) + '_';
        heap.push([key, value]);
        return key;
    });

    text = text.replace(strikeRegex, (match, group) => {
        const key = crypto.randomUUID();
        const value = '~' + parseMarkdownLevel2(group, level + 1) + '~';
        heap.push([key, value]);
        return key;
    });

    text = text.replace(underlineRegex, (match, group) => {
        const key = crypto.randomUUID();
        const value = '__' + parseMarkdownLevel2(group, level + 1) + '__';
        heap.push([key, value]);
        return key;
    });

    // Reverse to expand recursive
    for (let index = heap.length - 1; index >= 0; index -= 1) {
        const [key, value] = heap[index];
        text = text.replaceAll(key, value);
    }

    return text;
}

function parseMarkdownLevel1(text: string) {
    const heap: [ReturnType<typeof crypto.randomUUID>, string][] = [];
    const codeRegex = /\\`\\`\\`(.+?)\\`\\`\\`/gs;
    const monospaceRegex = /\\`(.+?)\\`/gs;
    const linkRegex = /\\\[(.+?)\\\]\\\((.+?)\\\)/gs;

    text = text.replace(codeRegex, (match, group) => {
        const key = crypto.randomUUID();
        const value = '```' + group + '```';
        heap.push([key, value]);
        return key;
    });

    text = text.replace(monospaceRegex, (match, group) => {
        const key = crypto.randomUUID();
        const value = '`' + group + '`';
        heap.push([key, value]);
        return key;
    });

    text = text.replace(linkRegex, (match, group1, group2) => {
        const key = crypto.randomUUID();
        const value = '[' + parseMarkdownLevel2(group1) + '](' + group2 + ')';
        heap.push([key, value]);
        return key;
    });

    text = parseMarkdownLevel2(text);

    // Reverse to expand recursive
    for (let index = heap.length - 1; index >= 0; index -= 1) {
        const [key, value] = heap[index];
        text = text.replaceAll(key, value);
    }

    return text;
}

export function parseMarkdownToMarkdownV2(text: string) {
    const escapedText = escapeUnsafeChars(text);
    return parseMarkdownLevel1(escapedText);
}
