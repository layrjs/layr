import React, {useEffect} from 'react';

import {useForceUpdate} from './hooks';

export function ReactRouterPlugin() {
  return function (router) {
    Object.assign(router, {
      use() {
        const forceUpdate = useForceUpdate();

        useEffect(() => {
          const handler = () => {
            forceUpdate();
          };

          router.observe(handler);

          return function () {
            router.unobserve(handler);
          };
        }, []);

        return router;
      },

      Link(props) {
        // eslint-disable-next-line react/prop-types
        if (props.onClick) {
          throw new Error(`'onClick' attribute is not allowed`);
        }

        const handleClick = event => {
          if (!(event.shiftKey || event.ctrlKey || event.altKey || event.metaKey)) {
            event.preventDefault();
            router.navigate(event.target.href);
          }
        };

        return <a {...props} onClick={handleClick} />;
      }
    });
  };
}
