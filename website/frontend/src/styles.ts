import {useTheme, Theme} from '@emotion/react';
import memoize from 'lodash/memoize';

export function getGlobalStyles(theme: Theme) {
  return {
    // === Header anchors ===

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

    // === Code blocks ===

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
      color: theme.colors.text,
      backgroundColor: theme.colors.background.highlighted,
      borderRadius: 3
    },
    'code': {
      padding: '.15rem .15rem',
      fontSize: '90%',
      wordBreak: 'break-word',
      overflowWrap: 'anywhere',
      color: theme.colors.text,
      backgroundColor: theme.colors.background.highlighted,
      borderRadius: 3
    },
    'h1 code, h2 code, h3 code, h4 code, h5 code, h6 code': {
      fontSize: '100%'
    },
    'a code': {
      color: theme.colors.primary.normal
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
    '.hljs-comment, .hljs-quote': {
      color: theme.colors.text.muted,
      fontStyle: 'italic'
    },
    '.hljs-doctag, .hljs-formula': {
      color: theme.colors.tertiary.normal
    },
    '.hljs-keyword': {
      color: theme.colors.secondary.normal
    },
    '.hljs-section, .hljs-name, .hljs-selector-tag, .hljs-deletion, .hljs-subst': {
      color: theme.colors.text.normal
    },
    '.hljs-tag': {
      color: theme.colors.primary.normal
    },
    '.hljs-tag .hljs-name': {
      color: theme.colors.primary.normal
    },
    '.hljs-literal': {
      color: theme.colors.tertiary.normal
    },
    '.hljs-string, .hljs-regexp, .hljs-addition, .hljs-attribute, .hljs-meta-string': {
      color: theme.colors.tertiary.normal
    },
    '.hljs-built_in': {
      color: theme.colors.secondary.normal
    },
    '.hljs-class .hljs-title': {
      color: theme.colors.text.normal
    },
    '.hljs-attr': {
      color: theme.colors.secondary.normal
    },
    '.hljs-variable, .hljs-template-variable, .hljs-type, .hljs-selector-class, .hljs-selector-attr, .hljs-selector-pseudo, .hljs-number': {
      color: theme.colors.tertiary.normal
    },
    '.hljs-symbol, .hljs-bullet, .hljs-link, .hljs-meta, .hljs-selector-id': {
      color: theme.colors.primary.normal
    },
    '.hljs-emphasis': {
      fontStyle: 'italic'
    },
    '.hljs-strong': {
      fontWeight: 'bold'
    },
    '.hljs-link': {
      textDecoration: 'underline'
    },

    // === Badges ===

    '.badge': {
      display: 'inline-block',
      color: theme.colors.text,
      backgroundColor: theme.colors.background.highlighted,
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
      color: theme.colors.primary.textOnNormal,
      backgroundColor: theme.colors.primary.normal
    },
    '.badge-secondary': {
      color: theme.colors.secondary.textOnNormal,
      backgroundColor: theme.colors.secondary.normal
    },
    '.badge-tertiary': {
      color: theme.colors.tertiary.textOnNormal,
      backgroundColor: theme.colors.tertiary.normal
    },
    '.badge-outline': {
      color: theme.colors.text.muted,
      backgroundColor: 'inherit',
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: theme.colors.text.muted
    },
    '.badge-primary-outline': {
      color: theme.colors.primary.highlighted,
      backgroundColor: 'inherit',
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: theme.colors.primary.highlighted
    },
    '.badge-secondary-outline': {
      color: theme.colors.secondary.highlighted,
      backgroundColor: 'inherit',
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: theme.colors.secondary.highlighted
    },
    '.badge-tertiary-outline': {
      color: theme.colors.tertiary.normal,
      backgroundColor: 'inherit',
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: theme.colors.tertiary.normal
    }
  };
}

const getStyles = memoize(function getStyles(theme: Theme) {
  return {
    unstyledList: {paddingLeft: 0, listStyle: 'none'},

    hiddenLink: {
      'color': 'inherit',
      ':hover': {color: 'inherit'}
    },

    menuItemLink: {
      'color': theme.colors.primary.normal,
      'cursor': 'pointer',
      ':hover': {
        color: theme.colors.primary.highlighted,
        textDecoration: 'none'
      }
    }
  };
});

export function useStyles() {
  return getStyles(useTheme());
}
