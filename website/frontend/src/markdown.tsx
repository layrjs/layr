import {isInternalURL} from '@layr/browser-navigator';
import {jsx} from '@emotion/react';
import {marked} from 'marked';
// @ts-ignore
import highlightJS from 'highlight.js/lib/core';
// @ts-ignore
import typescript from 'highlight.js/lib/languages/typescript';
// @ts-ignore
import json from 'highlight.js/lib/languages/json';
// @ts-ignore
import xml from 'highlight.js/lib/languages/xml';
// @ts-ignore
import bash from 'highlight.js/lib/languages/bash';
import DOMPurify from 'dompurify';

highlightJS.registerLanguage('typescript', typescript);
highlightJS.registerLanguage('json', json);
highlightJS.registerLanguage('html', xml);
highlightJS.registerLanguage('bash', bash);

export function Markdown({languageFilter, children}: {languageFilter?: string; children: string}) {
  let html = marked(children, {
    highlight: (code, language) => {
      if (languageFilter !== undefined) {
        const matches = code.match(/^\/\/ (\w+)\n\n/);

        if (matches !== null) {
          const languageSpecifier = matches[1].toLocaleLowerCase();

          if (languageSpecifier !== languageFilter) {
            return ''; // The code must be filtered out
          }

          code = code.slice(matches[0].length); // Remove the language specifier from the code
        }
      }

      if (language === '') {
        language = 'ts'; // Use TS as default
      }

      if (language === 'js') {
        language = 'ts'; // Always highlight JS as TS
      }

      return highlightJS.highlight(code, {language}).value;
    }
  });

  if (languageFilter !== undefined) {
    // Finish removing the filtered out languages
    html = html.replace(/<pre><code( class="language-\w+")?>\s?<\/code><\/pre>\n/g, '');

    // Handle the '<if language>' tags
    html = html.replace(
      /<!-- <if language="(\w+)"> -->([^]*?)<!-- <\/if> -->/g,
      (_, language, content) => {
        return language === languageFilter ? content : '';
      }
    );
  }

  html = DOMPurify.sanitize(html, {ADD_TAGS: ['badge']});

  // Handle badge tag
  html = html.replace(/<badge(?: type="([\w-]+)")?>([\w ]+)<\/badge>/g, (_, type, name) => {
    return `<span class='badge${type !== undefined ? ` badge-${type}` : ''}'>${name}</span>`;
  });

  // Handle custom header id
  // Replace: <h4 id="creation-creation">Creation {#creation}</h4>
  // With: <h4 id="creation">Creation</h4>
  html = html.replace(/<h\d id="([\w-]+)">.+\{\#([\w-]+)\}<\/h\d>/g, (match, currentId, newId) => {
    match = match.replace(` id="${currentId}">`, ` id="${newId}">`);
    match = match.replace(` {#${newId}}<`, `<`);
    return match;
  });

  html = html.replace(/<h\d id="([\w-]+)">/g, (match, id) => {
    match += `<a href="#${id}" class="anchor" aria-hidden="true">&nbsp;</a>`;
    return match;
  });

  if (process.env.NODE_ENV === 'development') {
    const localURL = new URL(window.location.href).origin;
    html = html.replace(/https:\/\/layrjs.com/g, localURL);
  }

  // Handle link clicks
  // Replace: <a href="target">text</a>
  // With: <a href="target" onclick="...">text</a>
  html = html.replace(/<a href="([^"]+)">.*?<\/a>/g, (match, url) => {
    if (isInternalURL(url)) {
      const onClick = `document.body.dispatchEvent(new CustomEvent('layrNavigatorNavigate', {detail: {url: '${url}'}})); return false;`;
      match = match.replace(`<a href="${url}">`, `<a href="${url}" onclick="${onClick}">`);
    }

    return match;
  });

  return <div dangerouslySetInnerHTML={{__html: html}} />;
}

export function InlineMarkdown({children: markdown}: {children: string}) {
  markdown = markdown.replace(/\n/g, '  \n');

  let html = marked.parseInline(markdown);

  html = DOMPurify.sanitize(html);

  return <span dangerouslySetInnerHTML={{__html: html}} />;
}
