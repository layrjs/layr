import {Registerable} from '@liaison/liaison';
import {view} from '@liaison/react-integration';
import {jsx, Global} from '@emotion/core';
import {ThemeProvider, useTheme} from 'emotion-theming';
import normalize from 'emotion-normalize';
import facepaint from 'facepaint';
import MaterialDesignPalette from 'material-design-palette';
import {useWindowHeight} from '@react-hook/window-size';

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
        borderColor: this.colors.blueGrey400,
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

  @view() FullHeight({...props}) {
    const height = useWindowHeight(600);

    return <div css={{minHeight: height}} {...props} />;
  }
}
