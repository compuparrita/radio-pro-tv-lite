export interface HelpStep {
    number: number;
    text: string;
}

export interface HelpSection {
    title: string;
    steps: HelpStep[];
}

export interface HelpDocument {
    title: string;
    subtitle: string;
    introduction: string;
    sections: HelpSection[];
}

/** Parses the small, semantic Markdown subset used by human-written help pages. */
export function parseHelpMarkdown(markdown: string): HelpDocument {
    const document: HelpDocument = {
        title: '',
        subtitle: '',
        introduction: '',
        sections: [],
    };

    let currentSection: HelpSection | undefined;

    for (const rawLine of markdown.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line) continue;

        if (line.startsWith('### ')) {
            currentSection = { title: line.slice(4).trim(), steps: [] };
            document.sections.push(currentSection);
            continue;
        }

        if (line.startsWith('## ')) {
            document.subtitle = line.slice(3).trim();
            continue;
        }

        if (line.startsWith('# ')) {
            document.title = line.slice(2).trim();
            continue;
        }

        const stepMatch = line.match(/^(\d+)\.\s+(.+)$/);
        if (stepMatch && currentSection) {
            currentSection.steps.push({ number: Number(stepMatch[1]), text: stepMatch[2] });
            continue;
        }

        if (!document.introduction) document.introduction = line;
    }

    return document;
}
