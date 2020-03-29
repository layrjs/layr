import React, {useMemo, useCallback} from 'react';
import ow from 'ow';

export function RouterPlugin() {
  return function(router) {
    Object.assign(router, {
      Link(props = {}) {
        ow(
          props,
          'props',
          ow.object.partialShape({
            to: ow.string.nonEmpty,
            className: ow.optional.string.nonEmpty,
            activeClassName: ow.optional.string.nonEmpty,
            style: ow.optional.object,
            activeStyle: ow.optional.object
          })
        );

        // eslint-disable-next-line react/prop-types
        const {to, onClick, className, activeClassName, style, activeStyle, ...otherProps} = props;

        if (onClick !== undefined) {
          throw new Error(`The 'onClick' attribute is not allowed`);
        }

        const handleClick = useCallback(
          event => {
            if (!(event.shiftKey || event.ctrlKey || event.altKey || event.metaKey)) {
              event.preventDefault();

              router.navigate(to);
            }
          },
          [to]
        );

        const isActive = router._getCurrentURL().pathname === to;

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

    router.addCustomRouteDecorator(function(method) {
      method.Link = function({params, ...props}) {
        const to = method.generateURL(params);

        return router.Link({to, ...props});
      };
    });
  };
}
