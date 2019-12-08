import {Registerable} from '@liaison/liaison';
import {useEffect} from 'react';
import {view} from '@liaison/react-integration';
import {jsx, Global} from '@emotion/core';
import {ThemeProvider, useTheme} from 'emotion-theming';
import normalize from 'emotion-normalize';
import facepaint from 'facepaint';
import MaterialDesignPalette from 'material-design-palette';
import {useWindowHeight} from '@react-hook/window-size';
import marked from 'marked';
import highlightJS from 'highlight.js/lib/highlight';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import DOMPurify from 'dompurify';

highlightJS.registerLanguage('javascript', javascript);
highlightJS.registerLanguage('json', json);

/** @jsx jsx */

export class UI extends Registerable() {
  Root = ({children}) => (
    <ThemeProvider theme={this.getTheme()}>
      <Global styles={this.globalStyles} />
      {children}
    </ThemeProvider>
  );

  colors = MaterialDesignPalette.colors;

  getTheme() {
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
        lineHeight: 1.5,
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
          backgroundColor: this.colors.blueGrey900,
          borderColor: this.colors.blueGrey500
        },
        small: {
          fontSize: '80%',
          lineHeight: 1.25,
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
        }
      };

      this._theme = theme;
    }

    return this._theme;
  }

  useTheme() {
    return useTheme();
  }

  globalStyles = theme => [
    normalize,
    {
      html: {
        fontSize: theme.fontSize,
        boxSizing: 'border-box'
      },
      '*, *::before, *::after': {
        boxSizing: 'inherit'
      },
      body: {
        fontFamily: 'system-ui, sans-serif',
        lineHeight: theme.lineHeight,
        color: theme.textColor,
        backgroundColor: theme.backgroundColor
      },
      p: {
        marginTop: '1rem',
        marginBottom: '1rem'
      },
      'h1, h2, h3, h4, h5, h6': {
        marginTop: '1.25rem',
        marginBottom: '1.25rem',
        fontWeight: '500',
        lineHeight: theme.small.lineHeight,
        color: theme.highlighted.textColor
      },
      h1: {fontSize: '2.488rem'},
      h2: {fontSize: '2.074rem'},
      h3: {fontSize: '1.728rem'},
      h4: {fontSize: '1.44rem'},
      h5: {fontSize: '1.2rem'},
      h6: {fontSize: '1rem'},
      hr: {
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
      a: {
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
      small: {
        fontSize: theme.small.fontSize
      },
      table: {
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
        fontWeight: '500'
      },
      blockquote: {
        margin: '1.5rem 0',
        paddingLeft: '1rem',
        color: theme.muted.textColor,
        borderLeft: `3px solid ${theme.borderColor}`
      },
      'code, pre': {
        fontFamily: "Menlo, Consolas, 'Liberation Mono', monospace"
      },
      pre: {
        display: 'table',
        tableLayout: 'fixed',
        width: '100%',
        marginTop: '1rem',
        marginBottom: '1rem',
        padding: '.25rem .5rem',
        fontSize: '.85rem',
        color: theme.highlighted.textColor,
        backgroundColor: theme.highlighted.backgroundColor
      },
      code: {
        padding: '.15rem .15rem',
        fontSize: '.85rem',
        color: theme.highlighted.textColor,
        backgroundColor: theme.highlighted.backgroundColor
      },
      'pre code': {
        display: 'table-cell !important',
        overflowX: 'auto',
        padding: 0,
        fontSize: 'inherit',
        color: 'inherit',
        backgroundColor: 'transparent',
        borderRadius: 0
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
      '.hljs-attr, .hljs-variable, .hljs-template-variable, .hljs-type, .hljs-selector-class, .hljs-selector-attr, .hljs-selector-pseudo, .hljs-number': {
        color: theme.textColor
      },
      '.hljs-symbol, .hljs-bullet, .hljs-link, .hljs-meta, .hljs-selector-id': {
        color: theme.tertiaryColor
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

  styles = {
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

  get responsive() {
    if (!this._responsive) {
      this._responsive = facepaint(['@media(max-width: 600px)']);
    }
    return this._responsive;
  }

  @view() Button({primary, secondary, tertiary, small, large, ...props}) {
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
      backgroundColor = theme.button.backgroundColor;
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

    let css = {
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
        cursor: 'not-allowed',
        opacity: 0.5,
        ':hover': {}
      };
    }

    return <button css={css} {...props} />;
  }

  useAnchor() {
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

  @view() FullHeight({...props}) {
    const height = useWindowHeight(600);

    return <div css={{minHeight: height}} {...props} />;
  }

  @view() Markdown({children}) {
    const html = DOMPurify.sanitize(
      marked(children, {
        highlight: (code, language) => {
          return highlightJS.highlight(language, code).value;
        }
      })
    );

    return <div dangerouslySetInnerHTML={{__html: html}} />;
  }
}
