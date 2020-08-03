import {normalizeURL} from '@liaison/abstract-router';
import {BrowserRouter, BrowserRouterLinkProps} from '@liaison/browser-router';
import React, {useMemo, useCallback} from 'react';

export function RouterPlugin() {
  return function (router: BrowserRouter) {
    Object.assign(router, {
      Link(props: BrowserRouterLinkProps) {
        const {to, className, activeClassName, style, activeStyle, ...otherProps} = props;

        if ('onClick' in props) {
          throw new Error(`The 'onClick' prop is not allowed in the 'Link' component`);
        }

        const handleClick = useCallback(
          (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
            if (!(event.shiftKey || event.ctrlKey || event.altKey || event.metaKey)) {
              event.preventDefault();

              router.navigate(to);
            }
          },
          [to]
        );

        const currentPath = router.getCurrentPath();
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

    router.addCustomRouteDecorator(function (method) {
      method.Link = function ({params, hash, ...props}) {
        const to = method.generateURL(params, {hash});

        return router.Link({to, ...props});
      };
    });
  };
}
