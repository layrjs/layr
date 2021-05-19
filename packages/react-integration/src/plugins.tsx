import {Navigator, normalizeURL} from '@layr/navigator';
import {BrowserNavigatorLinkProps} from '@layr/browser-navigator';
import React, {useMemo, useCallback, FunctionComponent} from 'react';
import {hasOwnProperty} from 'core-helpers';

export function BrowserNavigatorPlugin() {
  return function (navigator: Navigator) {
    navigator.addAddressableMethodWrapper(function (receiver, method, params) {
      if (hasOwnProperty(method, '__isView')) {
        return React.createElement(method as FunctionComponent, params);
      } else {
        return method.call(receiver, params);
      }
    });

    navigator.addCustomRouteDecorator(function (method) {
      method.Link = function ({params, hash, ...props}) {
        const to = method.generateURL(params, {hash});

        return navigator.Link({to, ...props});
      };
    });

    Object.assign(navigator, {
      Link(props: BrowserNavigatorLinkProps) {
        const {to, className, activeClassName, style, activeStyle, ...otherProps} = props;

        if ('onClick' in props) {
          throw new Error(`The 'onClick' prop is not allowed in the 'Link' component`);
        }

        const handleClick = useCallback(
          (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
            if (!(event.shiftKey || event.ctrlKey || event.altKey || event.metaKey)) {
              event.preventDefault();

              navigator.navigate(to);
            }
          },
          [to]
        );

        const currentPath = navigator.getCurrentPath();
        const linkPath = normalizeURL(to).pathname;
        const isActive = linkPath === currentPath;

        const {actualClassName, actualStyle} = useMemo(() => {
          let actualClassName = className;
          let actualStyle = style;

          if (isActive) {
            if (activeClassName !== undefined) {
              const classes = actualClassName !== undefined ? [actualClassName] : [];
              classes.push(activeClassName);
              actualClassName = classes.join(' ');
            }

            if (activeStyle !== undefined) {
              actualStyle = {...actualStyle, ...activeStyle};
            }
          }

          return {actualClassName, actualStyle};
        }, [isActive, className, activeClassName, style, activeStyle]);

        return (
          <a
            href={to}
            onClick={handleClick}
            className={actualClassName}
            style={actualStyle}
            {...otherProps}
          />
        );
      }
    });
  };
}
