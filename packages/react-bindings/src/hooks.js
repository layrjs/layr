import {useEffect} from 'react';
import useForceUpdate from 'use-force-update';

export function useModel(model) {
  const forceUpdate = useForceUpdate();

  useEffect(function () {
    const handleChange = function () {
      forceUpdate();
    };
    model.observe(handleChange);
    return function () {
      model.unobserve(handleChange);
    };
  });
}
