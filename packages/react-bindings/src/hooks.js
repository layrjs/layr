import {useEffect} from 'react';
import useForceUpdate from 'use-force-update';

export function useModel(model) {
  const forceUpdate = useForceUpdate();

  useEffect(
    function () {
      let deferredForceUpdate = false;
      const deferForceUpdate = function () {
        if (!deferredForceUpdate) {
          deferredForceUpdate = true;
          setTimeout(function () {
            deferredForceUpdate = false;
            forceUpdate();
          }, 10);
        }
      };

      model.observe(deferForceUpdate);

      return function () {
        model.unobserve(deferForceUpdate);
      };
    },
    [model, forceUpdate]
  );
}
