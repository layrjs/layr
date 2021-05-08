import {Component} from '@layr/component';
import {useEffect} from 'react';
import {view, RootView} from '@layr/react-integration';
import {isInternalURL} from '@layr/browser-router';
import {jsx, Global} from '@emotion/core';
import {ThemeProvider, useTheme} from 'emotion-theming';
import normalize from 'emotion-normalize';
import facepaint from 'facepaint';
// @ts-ignore
import * as MaterialDesignPalette from 'material-design-palette';
import {useWindowHeight} from '@react-hook/window-size';
import marked from 'marked';
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

export class UI extends Component {
  @view() static Root({children}: {children: React.ReactNode}) {
    return (
      <RootView>
        <ThemeProvider theme={this.getTheme()}>
          <Global styles={this.globalStyles} />
          {children}
        </ThemeProvider>
      </RootView>
    );
  }

  static colors = MaterialDesignPalette.colors;

  static _theme: any;

  static getTheme() {
    if (!this._theme) {
      const rootTheme = {
        textColor: this.colors.blueGrey50,
        backgroundColor: this.colors.blueGrey900,
        primaryColor: this.colors.lightBlue500,
        textOnPrimaryColor: this.colors.white,
        secondaryColor: this.colors.pinkA200,
        textOnSecondaryColor: this.colors.white,
        tertiaryColor: this.colors.limeA700,
        textOnTertiaryColor: this.colors.black,
        fontSize: '16px',
        lineHeight: 1.6,
        borderColor: this.colors.blueGrey500,
        borderWidth: '1px',
        borderRadius: '.25rem',
        highlighted: {
          textColor: this.colors.white,
          primaryColor: this.colors.lightBlue300,
          secondaryColor: this.colors.pinkA100,
          tertiaryColor: this.colors.limeA200,
          backgroundColor: this.colors.blueGrey800,
          borderColor: this.colors.blueGrey300
        },
        muted: {
          textColor: this.colors.blueGrey200,
          primaryColor: this.colors.lightBlue800,
          secondaryColor: this.colors.pink800,
          textOnSecondaryColor: this.colors.blueGrey50,
          backgroundColor: this.colors.blueGrey900,
          borderColor: this.colors.blueGrey500
        },
        small: {
          fontSize: '85%',
          lineHeight: 1.3,
          borderRadius: '.2rem'
        },
        large: {
          fontSize: '120%',
          borderRadius: '.3rem'
        }
      };

      const theme = {
        ...rootTheme,
        link: {
          ...rootTheme,
          decoration: 'none',
          highlighted: {
            ...rootTheme.highlighted,
            decoration: 'underline'
          }
        },
        button: {
          ...rootTheme,
          xPadding: '1rem',
          yPadding: '.5rem',
          small: {
            ...rootTheme.small,
            xPadding: '.5rem',
            yPadding: '.25rem'
          },
          large: {
            ...rootTheme.large,
            xPadding: '1.25rem',
            yPadding: '.75rem'
          }
        },
        input: {
          ...rootTheme,
          lineHeight: rootTheme.small.lineHeight,
          xPadding: '.75rem',
          yPadding: '.5rem',
          highlighted: {
            ...rootTheme.highlighted,
            borderColor: rootTheme.primaryColor
          },
          small: {
            ...rootTheme.small,
            xPadding: '.5rem',
            yPadding: '.25rem'
          },
          large: {
            ...rootTheme.large,
            xPadding: '1rem',
            yPadding: '.75rem'
          }
        }
      };

      this._theme = theme;
    }

    return this._theme;
  }

  static useTheme() {
    return useTheme<any>();
  }

  static globalStyles(theme: any): any {
    return [
      normalize,
      {
        'html': {
          fontSize: theme.fontSize,
          boxSizing: 'border-box'
        },
        '*, *::before, *::after': {
          boxSizing: 'inherit'
        },
        'body': {
          fontFamily: "'Open Sans', sans-serif",
          lineHeight: theme.lineHeight,
          color: theme.textColor,
          backgroundColor: theme.backgroundColor
        },
        'p': {
          marginTop: '1rem',
          marginBottom: '1rem'
        },
        'h1, h2, h3, h4, h5, h6': {
          marginBottom: '1rem',
          fontWeight: '600',
          lineHeight: theme.small.lineHeight,
          color: theme.highlighted.textColor
        },
        'h1': {marginTop: '3.052rem', fontSize: '3.052rem'},
        'h2': {marginTop: '2.441rem', fontSize: '2.441rem'},
        'h3': {marginTop: '1.953rem', fontSize: '1.953rem'},
        'h4': {marginTop: '1.563rem', fontSize: '1.563rem'},
        'h5': {marginTop: '1.25rem', fontSize: '1.25rem'},
        'h6': {marginTop: '1rem', fontSize: '1rem'},
        'hr': {
          marginTop: '1.5rem',
          marginBottom: '1.5rem',
          border: 0,
          borderTop: `${theme.borderWidth} solid ${theme.borderColor}`
        },
        'ol, ul, dl': {
          marginTop: 0,
          marginBottom: '1rem'
        },
        'ol ol, ul ul, ol ul, ul ol': {
          marginBottom: 0
        },
        'li': {
          marginTop: '.5rem'
        },
        'a': {
          color: theme.link.primaryColor,
          textDecoration: theme.link.decoration
        },
        'a:hover': {
          color: theme.link.highlighted.primaryColor,
          textDecoration: theme.link.highlighted.decoration
        },
        'a:focus': {
          outline: 'none'
        },
        'small': {
          fontSize: theme.small.fontSize
        },
        'table': {
          display: 'block',
          width: '100%',
          overflow: 'auto',
          marginTop: '1.5rem',
          marginBottom: '1.5rem',
          borderSpacing: 0,
          borderCollapse: 'collapse',
          borderColor: theme.borderColor
        },
        'table tr': {
          borderTop: `${theme.borderWidth} solid ${theme.borderColor}`
        },
        'table th, table td': {
          padding: '.3rem .6rem',
          border: `${theme.borderWidth} solid ${theme.borderColor}`
        },
        'table th': {
          fontWeight: '600'
        },
        'blockquote': {
          margin: '1.5rem 0',
          paddingLeft: '1rem',
          color: theme.muted.textColor,
          borderLeft: `3px solid ${theme.borderColor}`
        },
        'code, pre': {
          fontFamily: "Menlo, Consolas, 'Liberation Mono', monospace"
        },
        'pre': {
          display: 'table',
          tableLayout: 'fixed',
          width: '100%',
          marginTop: '1.1rem',
          marginBottom: '1.1rem',
          padding: '.4rem .65rem .5rem .65rem',
          fontSize: '.85rem',
          color: theme.highlighted.textColor,
          backgroundColor: theme.highlighted.backgroundColor,
          borderRadius: 3
        },
        'code': {
          padding: '.15rem .15rem',
          fontSize: '90%',
          wordBreak: 'break-word',
          overflowWrap: 'anywhere',
          color: theme.highlighted.textColor,
          backgroundColor: theme.highlighted.backgroundColor,
          borderRadius: 3
        },
        'h1 code, h2 code, h3 code, h4 code, h5 code, h6 code': {
          fontSize: '100%'
        },
        'a code': {
          color: theme.link.primaryColor
        },
        'pre code': {
          display: 'table-cell !important',
          overflowX: 'auto',
          padding: 0,
          fontSize: 'inherit',
          wordBreak: 'normal',
          overflowWrap: 'normal',
          color: 'inherit',
          backgroundColor: 'transparent',
          borderRadius: 0
        },
        'pre + h5': {
          marginTop: '1.6rem'
        },
        '.badge': {
          display: 'inline-block',
          color: theme.highlighted.textColor,
          backgroundColor: theme.highlighted.backgroundColor,
          padding: '.25rem .4rem .3rem .4rem',
          fontSize: '.7rem',
          fontWeight: 600,
          letterSpacing: 0.3,
          textTransform: 'uppercase',
          lineHeight: 1,
          textAlign: 'center',
          whiteSpace: 'nowrap',
          verticalAlign: 'middle',
          borderRadius: '.25rem'
        },
        '.badge-primary': {
          color: theme.textOnPrimaryColor,
          backgroundColor: theme.primaryColor
        },
        '.badge-secondary': {
          color: theme.textOnSecondaryColor,
          backgroundColor: theme.secondaryColor
        },
        '.badge-tertiary': {
          color: theme.textOnTertiaryColor,
          backgroundColor: theme.tertiaryColor
        },
        '.badge-outline': {
          color: theme.muted.textColor,
          backgroundColor: 'inherit',
          borderWidth: 1,
          borderStyle: 'solid',
          borderColor: theme.muted.textColor
        },
        '.badge-primary-outline': {
          color: theme.highlighted.primaryColor,
          backgroundColor: 'inherit',
          borderWidth: 1,
          borderStyle: 'solid',
          borderColor: theme.highlighted.primaryColor
        },
        '.badge-secondary-outline': {
          color: theme.highlighted.secondaryColor,
          backgroundColor: 'inherit',
          borderWidth: 1,
          borderStyle: 'solid',
          borderColor: theme.highlighted.secondaryColor
        },
        '.badge-tertiary-outline': {
          color: theme.tertiaryColor,
          backgroundColor: 'inherit',
          borderWidth: 1,
          borderStyle: 'solid',
          borderColor: theme.tertiaryColor
        },
        'h1 .anchor': {
          display: 'none'
        },
        'h1:hover .anchor': {
          display: 'inline'
        },
        'h2 .anchor': {
          display: 'none'
        },
        'h2:hover .anchor': {
          display: 'inline'
        },
        'h3 .anchor': {
          display: 'none'
        },
        'h3:hover .anchor': {
          display: 'inline'
        },
        'h4 .anchor': {
          display: 'none'
        },
        'h4:hover .anchor': {
          display: 'inline'
        },
        'h5 .anchor': {
          display: 'none'
        },
        'h5:hover .anchor': {
          display: 'inline'
        },
        'h6 .anchor': {
          display: 'none'
        },
        'h6:hover .anchor': {
          display: 'inline'
        },
        '.anchor': {
          float: 'left',
          width: 20,
          marginLeft: -20,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' version='1.1' width='16' height='16' aria-hidden='true'%3E%3Cpath fill='%23888' d='M7.775 3.275a.75.75 0 001.06 1.06l1.25-1.25a2 2 0 112.83 2.83l-2.5 2.5a2 2 0 01-2.83 0 .75.75 0 00-1.06 1.06 3.5 3.5 0 004.95 0l2.5-2.5a3.5 3.5 0 00-4.95-4.95l-1.25 1.25zm-4.69 9.64a2 2 0 010-2.83l2.5-2.5a2 2 0 012.83 0 .75.75 0 001.06-1.06 3.5 3.5 0 00-4.95 0l-2.5 2.5a3.5 3.5 0 004.95 4.95l1.25-1.25a.75.75 0 00-1.06-1.06l-1.25 1.25a2 2 0 01-2.83 0z'%3E%3C/path%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 4px center'
        },
        '.anchor:hover': {
          textDecoration: 'none'
        },
        '.hljs-comment, .hljs-quote': {
          color: theme.muted.textColor,
          fontStyle: 'italic'
        },
        '.hljs-doctag, .hljs-formula': {
          color: theme.tertiaryColor
        },
        '.hljs-keyword': {
          color: theme.secondaryColor
        },
        '.hljs-section, .hljs-name, .hljs-selector-tag, .hljs-deletion, .hljs-subst': {
          color: theme.textColor
        },
        '.hljs-tag': {
          color: theme.primaryColor
        },
        '.hljs-tag .hljs-name': {
          color: theme.primaryColor
        },
        '.hljs-literal': {
          color: theme.tertiaryColor
        },
        '.hljs-string, .hljs-regexp, .hljs-addition, .hljs-attribute, .hljs-meta-string': {
          color: theme.tertiaryColor
        },
        '.hljs-built_in': {
          color: theme.secondaryColor
        },
        '.hljs-class .hljs-title': {
          color: theme.textColor
        },
        '.hljs-attr': {
          color: theme.secondaryColor
        },
        '.hljs-variable, .hljs-template-variable, .hljs-type, .hljs-selector-class, .hljs-selector-attr, .hljs-selector-pseudo, .hljs-number': {
          color: theme.tertiaryColor
        },
        '.hljs-symbol, .hljs-bullet, .hljs-link, .hljs-meta, .hljs-selector-id': {
          color: theme.primaryColor
        },
        '.hljs-emphasis': {
          fontStyle: 'italic'
        },
        '.hljs-strong': {
          fontWeight: 'bold'
        },
        '.hljs-link': {
          textDecoration: 'underline'
        }
      }
    ];
  }

  static styles = {
    noMargins: {
      marginTop: 0,
      marginRight: 0,
      marginBottom: 0,
      marginLeft: 0
    },
    minimumLineHeight: {lineHeight: 1},
    inlineBlock: {display: 'inline-block'},
    centeredPage: {maxWidth: '1280px', margin: '0 auto'},
    unstyledList: {paddingLeft: 0, listStyle: 'none'}
  };

  static _responsive: facepaint.DynamicStyleFunction;

  static get responsive() {
    if (!this._responsive) {
      this._responsive = facepaint([
        '@media(max-width: 991px)',
        '@media(max-width: 767px)',
        '@media(max-width: 479px)'
      ]);
    }
    return this._responsive;
  }

  @view() static Button({
    primary = false,
    secondary = false,
    tertiary = false,
    small = false,
    large = false,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    primary?: boolean;
    secondary?: boolean;
    tertiary?: boolean;
    small?: boolean;
    large?: boolean;
  }) {
    const theme = this.useTheme();

    let textColor;
    let backgroundColor;
    let borderColor;
    let highlightedBackgroundColor;
    let highlightedBorderColor;
    if (primary) {
      textColor = theme.button.textOnPrimaryColor;
      backgroundColor = theme.button.primaryColor;
      borderColor = backgroundColor;
      highlightedBackgroundColor = theme.button.highlighted.primaryColor;
      highlightedBorderColor = highlightedBackgroundColor;
    } else if (secondary) {
      textColor = theme.button.textOnSecondaryColor;
      backgroundColor = theme.button.secondaryColor;
      borderColor = backgroundColor;
      highlightedBackgroundColor = theme.button.highlighted.secondaryColor;
      highlightedBorderColor = highlightedBackgroundColor;
    } else if (tertiary) {
      textColor = theme.button.textOnTertiaryColor;
      backgroundColor = theme.button.tertiaryColor;
      borderColor = backgroundColor;
      highlightedBackgroundColor = theme.button.highlighted.tertiaryColor;
      highlightedBorderColor = highlightedBackgroundColor;
    } else {
      textColor = theme.button.textColor;
      borderColor = theme.button.borderColor;
      highlightedBackgroundColor = theme.button.highlighted.backgroundColor;
      highlightedBorderColor = theme.button.highlighted.borderColor;
    }

    let xPadding;
    let yPadding;
    let fontSize;
    let borderRadius;
    if (small) {
      xPadding = theme.button.small.xPadding;
      yPadding = theme.button.small.yPadding;
      fontSize = theme.button.small.fontSize;
      borderRadius = theme.button.small.borderRadius;
    } else if (large) {
      xPadding = theme.button.large.xPadding;
      yPadding = theme.button.large.yPadding;
      fontSize = theme.button.large.fontSize;
      borderRadius = theme.button.large.borderRadius;
    } else {
      xPadding = theme.button.xPadding;
      yPadding = theme.button.yPadding;
      fontSize = theme.button.fontSize;
      borderRadius = theme.button.borderRadius;
    }

    let css: any = {
      display: 'inline-block',
      paddingTop: yPadding,
      paddingRight: xPadding,
      paddingBottom: yPadding,
      paddingLeft: xPadding,
      fontSize,
      fontWeight: 'normal',
      lineHeight: theme.small.lineHeight,
      textAlign: 'center',
      whiteSpace: 'nowrap',
      verticalAlign: 'middle',
      color: textColor,
      backgroundColor,
      borderWidth: theme.borderWidth,
      borderStyle: 'solid',
      borderColor,
      borderRadius,
      outline: 'none',
      transition: 'all .2s ease-in-out',
      cursor: 'pointer',
      userSelect: 'none'
    };

    if (!props.disabled) {
      css = {
        ...css,
        ':hover': {
          backgroundColor: highlightedBackgroundColor,
          borderColor: highlightedBorderColor
        }
      };
    } else {
      css = {
        ...css,
        'cursor': 'not-allowed',
        'opacity': 0.5,
        ':hover': {}
      };
    }

    return <button css={css} {...props} />;
  }

  @view() static Input({
    small = false,
    large = false,
    ...props
  }: React.InputHTMLAttributes<HTMLInputElement> & {
    small?: boolean;
    large?: boolean;
  }) {
    const theme = this.useTheme();

    let xPadding;
    let yPadding;
    let fontSize;
    let borderRadius;
    if (small) {
      xPadding = theme.input.small.xPadding;
      yPadding = theme.input.small.yPadding;
      fontSize = theme.input.small.fontSize;
      borderRadius = theme.input.small.borderRadius;
    } else if (large) {
      xPadding = theme.input.large.xPadding;
      yPadding = theme.input.large.yPadding;
      fontSize = theme.input.large.fontSize;
      borderRadius = theme.input.large.borderRadius;
    } else {
      xPadding = theme.input.xPadding;
      yPadding = theme.input.yPadding;
      fontSize = theme.input.fontSize;
      borderRadius = theme.input.borderRadius;
    }

    let css: any = {
      'paddingTop': yPadding,
      'paddingRight': xPadding,
      'paddingBottom': yPadding,
      'paddingLeft': xPadding,
      fontSize,
      'lineHeight': theme.input.lineHeight,
      'color': theme.input.textColor,
      'backgroundColor': theme.input.backgroundColor,
      'borderWidth': theme.input.borderWidth,
      'borderStyle': 'solid',
      'borderColor': theme.input.borderColor,
      borderRadius,
      'outline': 'none',
      'boxShadow': 'none',
      'transition': 'border-color ease-in-out .15s',
      ':focus': {
        borderColor: theme.input.highlighted.borderColor
      },
      '::placeholder': {
        color: theme.input.muted.textColor,
        opacity: 1
      }
    };

    if (props.disabled) {
      css = {
        ...css,
        cursor: 'not-allowed',
        opacity: 0.5
      };
    }

    return <input css={css} {...props} />;
  }

  @view() static Select({
    small = false,
    large = false,
    ...props
  }: React.SelectHTMLAttributes<HTMLSelectElement> & {
    small?: boolean;
    large?: boolean;
  }) {
    const theme = this.useTheme();

    let paddingLeft;
    let paddingRight;
    let yPadding;
    let fontSize;
    let borderRadius;
    let backgroundPosition;
    if (small) {
      paddingLeft = theme.input.small.xPadding;
      paddingRight = '20px';
      yPadding = theme.input.small.yPadding;
      fontSize = theme.input.small.fontSize;
      borderRadius = theme.input.small.borderRadius;
      backgroundPosition = 'right 6px center';
    } else if (large) {
      paddingLeft = theme.input.large.xPadding;
      paddingRight = '24px';
      yPadding = theme.input.large.yPadding;
      fontSize = theme.input.large.fontSize;
      borderRadius = theme.input.large.borderRadius;
      backgroundPosition = 'right 8px center';
    } else {
      paddingLeft = theme.input.xPadding;
      paddingRight = '24px';
      yPadding = theme.input.yPadding;
      fontSize = theme.input.fontSize;
      borderRadius = theme.input.borderRadius;
      backgroundPosition = 'right 8px center';
    }

    let css: any = {
      'paddingTop': yPadding,
      paddingRight,
      'paddingBottom': yPadding,
      paddingLeft,
      fontSize,
      'lineHeight': theme.input.lineHeight,
      'color': theme.input.textColor,
      'backgroundColor': theme.input.backgroundColor,
      'borderWidth': theme.input.borderWidth,
      'borderStyle': 'solid',
      'borderColor': theme.input.borderColor,
      borderRadius,
      'outline': 'none',
      'boxShadow': 'none',
      'transition': 'border-color ease-in-out .15s',
      'verticalAlign': 'middle',
      'backgroundImage':
        "url(\"data:image/svg+xml;charset=utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 5'%3E%3Cpath fill='%23888' d='M2 0L0 2h4zm0 5L0 3h4z'/%3E%3C/svg%3E\")",
      'backgroundRepeat': 'no-repeat',
      backgroundPosition,
      'backgroundSize': '8px 10px',
      'MozAppearance': 'none',
      'WebkitAppearance': 'none',
      ':focus': {
        borderColor: theme.input.highlighted.borderColor
      }
    };

    if (props.disabled) {
      css = {
        ...css,
        cursor: 'not-allowed',
        opacity: 0.5
      };
    }

    return <select css={css} {...props} />;
  }

  static useAnchor() {
    useEffect(() => {
      const hash = window.location.hash;
      if (!hash) {
        return;
      }

      const id = hash.slice(1);

      const element = document.getElementById(id);
      if (!element) {
        return;
      }

      element.scrollIntoView();
    }, []);
  }

  @view() static FullHeight({...props}) {
    const height = useWindowHeight({initialHeight: 600});

    return <div css={{minHeight: height}} {...props} />;
  }

  @view() static Markdown({languageFilter, children}: {languageFilter?: string; children: string}) {
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
    html = html.replace(
      /<h\d id="([\w-]+)">.+\{\#([\w-]+)\}<\/h\d>/g,
      (match, currentId, newId) => {
        match = match.replace(` id="${currentId}">`, ` id="${newId}">`);
        match = match.replace(` {#${newId}}<`, `<`);
        return match;
      }
    );

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
        const onClick = `document.body.dispatchEvent(new CustomEvent('layrRouterNavigate', {detail: {url: '${url}'}})); return false;`;
        match = match.replace(`<a href="${url}">`, `<a href="${url}" onclick="${onClick}">`);
      }

      return match;
    });

    return <div dangerouslySetInnerHTML={{__html: html}} />;
  }

  @view() static InlineMarkdown({children: markdown}: {children: string}) {
    markdown = markdown.replace(/\n/g, '  \n');

    let html = (marked as any).parseInline(markdown);

    html = DOMPurify.sanitize(html);

    return <span dangerouslySetInnerHTML={{__html: html}} />;
  }
}
