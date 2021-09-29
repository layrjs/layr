import {Component, assertIsComponentClass, ensureComponentClass} from '@layr/component';
import type {ComponentClient} from '@layr/component-client';
import {hasOwnProperty, isPlainObject, PlainObject} from 'core-helpers';

export class ExecutionQueue {
  _componentClient: ComponentClient;

  constructor(componentClient: ComponentClient) {
    this._componentClient = componentClient;
  }

  registerRootComponent(rootComponent: typeof Component) {
    assertIsComponentClass(rootComponent);

    const register = (component: typeof Component | Component) => {
      for (const method of component.getMethods()) {
        const name = method.getName();
        const queueing = method.getQueueing();

        if (!queueing) {
          continue;
        }

        const orignalMethod: (...args: any[]) => any = (component as any)[name];

        if (hasOwnProperty(orignalMethod, '__queued')) {
          throw new Error(`Method already registered to an execution queue (${method.describe()})`);
        }

        const executionQueue = this;

        const backgroundMethod = async function (
          this: typeof Component | Component,
          ...args: any[]
        ) {
          const [firstArgument, ...otherArguments] = args;

          if (
            isPlainObject(firstArgument) &&
            hasOwnProperty(firstArgument, '__callOriginalMethod')
          ) {
            await orignalMethod.call(this, ...otherArguments);
            return;
          }

          const query = {
            '<=': this,
            [`${name}=>`]: {'()': [{__callOriginalMethod: true}, ...args]}
          };

          const rootComponent = ensureComponentClass(this);

          await executionQueue.send(query, {rootComponent});
        };

        Object.defineProperty(backgroundMethod, '__queued', {value: true});

        (component as any)[name] = backgroundMethod;
      }
    };

    for (const component of rootComponent.traverseComponents()) {
      if (!component.isEmbedded()) {
        register(component);
        register(component.prototype);
      }
    }
  }

  async send(query: PlainObject, options: {rootComponent?: typeof Component} = {}) {
    const {rootComponent} = options;

    await this._componentClient.send(query, {rootComponent});
  }
}
