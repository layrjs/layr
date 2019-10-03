import React, {useEffect, useState} from 'react';

import {useForceUpdate} from './hooks';

export function ReactRouterPlugin() {
  return function (router) {
    Object.assign(router, {
      use() {
        const [isReady, setIsReady] = useState(false);

        const forceUpdate = useForceUpdate();

        useEffect(() => {
          router.$observe(forceUpdate);

          setIsReady(true);

          return function () {
            router.$unobserve(forceUpdate);
          };
        }, []);

        return isReady;
      },

      // eslint-disable-next-line react/prop-types
      Link({href, onClick, className, style, activeClassName, activeStyle, ...props}) {
        if (onClick) {
          throw new Error(`'onClick' attribute is not allowed`);
        }

        const handleClick = event => {
          if (!(event.shiftKey || event.ctrlKey || event.altKey || event.metaKey)) {
            event.preventDefault();
            router.navigate(href);
          }
        };

        const isActive = router.location.pathname === href;

        if (isActive) {
          if (activeClassName) {
            const classes = className ? [className] : [];
            classes.push(activeClassName);
            className = classes.join(' ');
          }

          if (activeStyle) {
            style = {...style, ...activeStyle};
          }
        }

        return (
          <a href={href} onClick={handleClick} className={className} style={style} {...props} />
        );
      }
    });

    router.addCustomRouteDecorator(function (func) {
      func.Link = function ({params, ...props}) {
        const href = func.getPath(params);
        return router.Link({href, ...props});
      };
    });
  };
}
